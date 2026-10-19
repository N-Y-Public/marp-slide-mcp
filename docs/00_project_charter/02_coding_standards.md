---
id: DOC-PC-002
title: コーディング規約 (Coding Standards)
version: 1.0.0
status: Approved
date: 2026-10-05
author: N-Y-Public
tags:
  - coding-standards
  - typescript
  - css
  - marp
  - governance
---

# コーディング規約 (Coding Standards)

本ドキュメントは、「**marp-slide-mcp (Marp スライド作成環境)**」において開発・保守されるすべてのソースコード（TypeScript, JavaScript, CSS, Markdown, Shell Script）に対する統一的な記述規範を定める。

---

## 1. 規約の目的と基本理念

1. **AI協調開発における解釈精度の最大化**:
   LLM（AIエージェント）がソースコードを読み取り、自律的に機能拡張やデバッグを行う際、曖昧な実装や文脈の欠落はハルシネーションの原因となる。極めて明瞭なコード構造と徹底した日本語コメントにより、AIとのペアプログラミング精度を極大化する。
2. **初見参入者（転職評価者・共同開発者）に対する可読性の担保**:
   本プロジェクトを閲覧する技術責任者・採用担当者・コントリビューターが、コードベースの全体像と個々の処理意図を即座に把握できるようにする。
3. **長期保守性と高信頼性の確立**:
   型安全性、徹底したエラーハンドリング、副作用の局所化により、リグレッションを防止する。

---

## 2. 業界標準デファクトスタンダードの準拠

本プロジェクトでは、車輪の再発明を避け、世界的な業界標準スタイルを全面的に採用する：

| 対象技術 | 準拠規格・デファクトスタンダード | 採用ツール / コンパイラ設定 |
| :--- | :--- | :--- |
| **TypeScript** | [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) | TypeScript 5.5+, `strict: true`, ES2022 |
| **JavaScript** | ECMAScript 2022+ (Strict Mode) | Pure ES Modules (`"type": "module"`) |
| **CSS** | CSS3 / W3C Working Draft (CSS Nesting, `color-mix`) | PostCSS / Marp Core スタイル仕様 |
| **Markdown** | CommonMark / GitHub Flavored Markdown (GFM) | Marpit Directive 体系 |
| **I/F定義** | Model Context Protocol (MCP) Specification v1.0 | `@modelcontextprotocol/sdk` + `zod` |

---

## 3. 【最重要規則】各行直上の平易な日本語コメント規則

本プロジェクトにおいて**最も厳格に遵守される固有規則**であり、例外なくすべてのソースコードに適用される。

### 3.1 規則の定義
> **「実行コードおよび宣言のすべての行に対して、その直上の行に平易な日本語による説明コメント（`// ...`）を付与しなければならない。」**

### 3.2 制定の理由
1. **行単位の意図の明文化**: 「何をしているか（What）」だけでなく「なぜその処理が必要なのか（Why）」が各行に明記されることで、初見の開発者が迷わず理解できる。
2. **AIパース時の文脈アンカー**: LLMがコード断片（chunk）を取得した際、行直上のコメントが強力なコンテキスト情報となり、誤った修正やロジック破壊を防止できる。
3. **仕様書との双方向トレーサビリティ**: ソースコードそのものが詳細プログラム仕様書の役割を果たし、ドキュメントの陳腐化を防ぐ。

### 3.3 良い例 (Good) vs 悪い例 (Bad)

#### TypeScript / JavaScript の場合
```typescript
// [Good] すべての処理行の直上に平易で明確な日本語コメントが存在する
// Puppeteer 内蔵のブラウザパス取得を試みます
try {
  // 実行可能ブラウザパスを取得します
  const pPath = puppeteer.executablePath();
  // 同期ファイルシステムモジュールをインポートします
  const fsSync = await import("fs");
  // パスが実際に存在するか確認します
  if (fsSync.existsSync(pPath)) {
    // 環境変数 CHROME_PATH に設定します
    process.env.CHROME_PATH = pPath;
  }
// 例外時は握りつぶして次の候補を探索します
} catch (e) {}
```

```typescript
// [Bad] コメントがない、または複数行に対して1行の曖昧なコメントしかない
try {
  const pPath = puppeteer.executablePath();
  const fsSync = await import("fs");
  if (fsSync.existsSync(pPath)) {
    process.env.CHROME_PATH = pPath;
  }
} catch (e) {}
```

#### CSS の場合
```css
/* [Good] セレクタおよび各プロパティの直上に意図が明記されている */
/* 目次リスト（ul）のレイアウト設定 */
section.toc > ul {
  /* リストマーカー（黒丸）を非表示にします */
  list-style: none;
  /* 親スライドの左端から 50px の位置に配置します */
  left: 50px !important;
  /* スライド幅から左右マージン 100px を引いた幅に設定します */
  width: calc(100% - 100px) !important;
}
```

---

## 4. 言語別コーディング標準

### 4.1 TypeScript / JavaScript (ESM)
1. **モジュール形式**:
   - 完全に **ES Modules (`import` / `export`)** を使用すること。`require()` や `module.exports` の混在は厳禁。
2. **型定義の徹底**:
   - 原則として `any` 型の使用を禁止する。不明な外部入力には `unknown` を用い、Zod スキーマで型を絞り込む。
   - インターフェースや型エイリアスには、Zod による推論型（`z.infer<typeof Schema>`）を積極的に活用する。
3. **非同期処理**:
   - コールバック関数による非同期処理は禁止し、`async` / `await` に統一する。
   - `fs/promises` を標準で使用し、イベントループをブロックしない。
4. **不変性 (Immutability)**:
   - 変数宣言は `const` を基本とし、再代入が必要な場合のみ `let` を使用する。`var` は使用禁止。
   - 配列やオブジェクトの操作は、スプレッド構文（`[...arr]`, `{ ...obj }`）等を用いたイミュータブル操作を推奨する。

### 4.2 CSS / Marp テーマ
1. **変数駆動設計 (CSS Custom Properties)**:
   - 色、余白、フォントサイズ等の設定値は、ハードコードせず `:root` で定義された CSS 変数（例: `--primary-color`, `--bubble-bg-color`）を参照すること。
   - 新規カラーバリエーションは `color-mix()` 関数やクラスセレクタ（`section.theme-xxx`）を用いて定義する。
2. **Marp特有の階層構造の維持**:
   - スライドのルート要素は `section` である。
   - 見出しアンカー（`h1`〜`h6`）は画面上非表示（`visibility: hidden` 等）とし、直後の兄弟要素（`h1 ~ p` 等）に対してレイアウトスタイルを適用するアンカー駆動ルールを崩さないこと。
3. **サイズ指定**:
   - フォントサイズは印刷・プロジェクター視認性を考慮し `pt` 単位（基本本文は `18pt`、タイトルは `36pt` 等）。
   - レイアウト余白や幅は `px` または `%`, `calc()` で明示的に指定する。

### 4.3 Markdown / スライド記述
1. **アンカー見出しルールの遵守**:
   - `slides/` 内の Markdown は、規定された見出し記法（表紙: `#` タイトル, `##` サブタイトル / 通常: `#` ページタイトル, `##` 主張, `###` 図表タイトル, `####` 本文, `#####` 出典, `######` コピーライト・機密）を厳守する。
2. **共通ディレクティブ**:
   - フロントマターには `marp: true`, `theme: business-slide`, `size: 4:3` (または `16:9`), `paginate: true` を明記する。
   - `header` ディレクティブ（ヘッダーロゴ・テキスト等）は**任意（オプショナル）**である。利用者の用途や組織のロゴ画像等（例: `header: '![](logo.png)'`）に柔軟に変更でき、ヘッダーが不要な場合は記述を省略（未記述）可能とする。

---

## 5. 命名規則一覧

| 識別子種別 | 規則 | 例 |
| :--- | :--- | :--- |
| **ファイル名 (TS/JS)** | `kebab-case` または `camelCase` (エントリーポイントは `index.ts`) | `index.ts`, `convert.js` |
| **ファイル名 (CSS)** | `kebab-case` | `business-slide-theme.css`, `theme-colors.css` |
| **ファイル名 (MD)** | 資料番号または説明的日本語・英語 | `D01-000001_Marpの使い方.md`, `README.md` |
| **クラス名 / 型名** | `PascalCase` | `McpServer`, `SlideDeck`, `NormalSlideSchema` |
| **関数名 / メソッド名** | `camelCase` (動詞から開始) | `generateMarpMarkdown`, `resolveSlideContent` |
| **変数名 / 引数名** | `camelCase` | `pageTitle`, `leftContent`, `outputDir` |
| **定数名 (グローバル)** | `UPPER_SNAKE_CASE` | `ROOT_DIR`, `SLIDES_DIR`, `PX_TO_INCH` |
| **CSS クラス名** | `kebab-case` | `.wide-content`, `.columns-2`, `.conversation-content` |
| **CSS カスタムプロパティ** | `--kebab-case` | `--primary-color`, `--banner-image` |
| **MCP ツール名** | `snake_case` (小文字) | `generate_slide_deck`, `export_to_pdf` |
| **Git ブランチ名** | `{種別}/{アカウント名またはAI名}/issue-{番号}/{説明}` | `feat/alice/issue-2/github-standard-templates`<br>`feat/antigravity-2.0/issue-2/github-standard-templates` |

---

## 6. エラーハンドリングとロバストネス設計

1. **防御的プログラミング (Defensive Programming)**:
   - 外部からの入力データ（CLI引数、MCPツール引数、読み込みファイル内容）は必ずバリデーションを行い、不正な値に対しては明確なエラーメッセージを返す。
   - ファイルの存在確認やディレクトリ自動作成（`ensureOutputDir`）を行い、実行時例外による異常終了を防ぐ。
2. **安全なフォールバック機構**:
   - Chromiumバイナリの探索（`CHROME_PATH` → `puppeteer.executablePath()` → キャッシュディレクトリ探索 → `/usr/bin/chromium`）のように、環境差分に対して多重のフォールバック機構を設けること。
3. **例外捕捉の明示**:
   - `try-catch` 節において、意図的に握りつぶすフォールバック処理以外は、必ずエラー内容を標準エラー出力やログに出力し、原因究明を可能にすること。

---

## 7. セキュリティおよび個人情報排除規則

1. **ホスト固有パスの完全排除**:
   - Windowsホスト固有の絶対パス（`/path/to/...` や `C:\path\to\...`）や開発者個人名をソースコード、ドキュメント、コミットログに含めてはならない。
   - すべてのパス解決は `path.resolve(__dirname, "..")` 等の相対パスまたは環境変数基準で行う。
2. **シークレット・機密情報の保護**:
   - APIキー、トークン、パスワード等の認証情報をコードに直接記述しない。
   - 機密指定表記（`CONFIDENTIAL`）はスライドの表示サンプルとしてのみ使用し、実データの漏洩を起こさない。

---

## 8. 関連設計図書への参照リンク

- [[01_project_charter|プロジェクト憲章]]: プロジェクト全体の理念・目的・ライセンス
- [[01_requirements_specification|要件定義書]]: 非機能要件（保守性・品質基準）
- [[01_architectural_design|構造設計書]]: モジュール構造および設計パターン
- [[03_program_specification|プログラム仕様書]]: 各実装モジュールの詳細ロジック
- [[../README|設計図書統合インデックス]]: 設計図書体系の全体マップ
- [CONTRIBUTING.md](../../CONTRIBUTING.md): コントリビューション規約およびブランチ運用・コミットガイドライン
