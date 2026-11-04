---
id: DOC-GOV-002
title: コーディング規約
doc_type: standard
version: 1.0.0
status: Approved
date: 2026-11-04
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - coding-standards
  - typescript
  - css
  - marp
  - governance
---

# 1 本書の位置づけ

## 1.1 目的
本プロジェクトで開発および保守される全ソースコードに対する統一的な記述規範を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- 図書体系および共通記述構文: [[03_documentation_standard#1 本書の位置づけ|設計図書記述標準]]
- ID体系およびコード内追跡タグ規則: [[04_id_numbering_rules#4.3 ソースコードへの追跡タグ|ID附番規則]]
- プログラム仕様: [[03_program_specification#1 本書の位置づけ|プログラム仕様書]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 規約 DOC-GOV-003 準拠への再編 |

# 2 共通規約

## 2.1 命名規則
| 識別子種別 | 規則 | 例 |
| :--- | :--- | :--- |
| ファイル名 (TS/JS) | `kebab-case` または `camelCase` | `index.ts`, `convert.js` |
| ファイル名 (CSS) | `kebab-case` | `business-slide-theme.css` |
| クラス名・型名 | `PascalCase` | `McpServer`, `SlideDeck` |
| 関数名・メソッド名 | `camelCase`（動詞開始） | `generateMarpMarkdown` |
| 変数名・引数名 | `camelCase` | `pageTitle`, `leftContent` |
| 定数名 (グローバル) | `UPPER_SNAKE_CASE` | `ROOT_DIR`, `SLIDES_DIR` |
| CSSクラス名 | `kebab-case` | `.columns-2`, `.table-1` |
| CSSカスタムプロパティ | `--kebab-case` | `--primary-color` |
| MCPツール名 | `snake_case` | `generate_slide_deck` |
| Gitブランチ名 | `{種別}/{アカウントまたはAI名}/issue-{番号}/{説明}` | `feat/antigravity-2.0/issue-2/github-standard-templates` |
| Worktreeディレクトリ名 | `{種別}_{アカウントまたはAI名}_issue-{番号}_{説明}` | `fix_antigravity-2.0_issue-8_worktree-branch-naming-compliance` |

## 2.2 コメント規則
1. **全行直上平易コメント規則**:
   実行コードおよび宣言の全行に対して、その直上の行に平易な日本語による説明コメント（`// ...` または `/* ... */`）を付与する。
2. **意図の明文化**:
   処理の内容だけでなく理由を記載する。
3. **記述例**:
```typescript
// 実行可能ブラウザパスを取得します
const pPath = puppeteer.executablePath();
// パスが実際に存在するか確認します
if (fsSync.existsSync(pPath)) {
  // 環境変数 CHROME_PATH に設定します
  process.env.CHROME_PATH = pPath;
}
```

## 2.3 エラー処理
1. 外部からの入力データはバリデーションを行い、不正値に対してはエラーメッセージを返却する。
2. 環境差分に対して多重のフォールバック機構を設ける。
3. `try-catch` 節において、意図的な握りつぶしを除き、エラー内容を記録する。

# 3 言語別規約

## 3.1 TypeScriptおよびJavaScript
1. **モジュール形式**:
   ES Modules（`import` / `export`）を使用する。
2. **型定義**:
   `any` 型の使用を禁止する。未確定の外部入力には `unknown` を用い、Zodスキーマで型を検証する。
3. **非同期処理**:
   `async` / `await` を使用する。
4. **不変性**:
   変数宣言は `const` を基本とし、再代入が必要な場合のみ `let` を使用する。

## 3.2 CSS
1. **変数駆動設計**:
   色、余白、フォントサイズ等の設定値は、ハードコードせず `:root` で定義されたCSS変数を参照する。
2. **Marp特有の階層構造の維持**:
   スライドのルート要素は `section` とする。
3. **サイズ単位**:
   フォントサイズは `pt` 単位、レイアウト余白や幅は `px` または `%`、`calc()` を使用する。

## 3.3 Markdown
1. **見出しアンカー規則の遵守**:
   表紙（`#` タイトル、`##` サブタイトル）、通常スライド（`#` ページタイトル、`##` 主張、`###` 図表タイトル、`####` 本文、`#####` 出典、`######` コピーライト）の見出し構造に従う。
2. **共通ディレクティブ**:
   フロントマターに `marp: true`, `theme: business-slide`, `size: 4:3`（または `16:9`）, `paginate: true` を指定する。

# 4 追跡タグの記載

## 4.1 タグの書式と位置
1. 関数・クラス・プログラムの実装箇所の直上コメントに `@spec <ID>` を記載する。
2. テストコードのテスト単位の直上コメントに `@test <ID>` を記載する。
3. 追跡タグの記述詳細は [[04_id_numbering_rules#4.3 ソースコードへの追跡タグ|ソースコードへの追跡タグ]] に従う。
