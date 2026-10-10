# Marp ビジネススライド作成環境 (Marp Business Theme)

Markdown から洗練されたビジネス標準デザインのプレゼンテーション資料を生成するためのテンプレートリポジトリです。
独自テーマ `themes/business-slide-theme.css` が適用され、決められた見出し構成で記述するだけでレイアウトが自動的に整います。表・コードブロック・画像・Mermaid 図は内容量に応じて自動的に縮小されるため、枠からのはみ出しを意識せずに執筆できます。

---

## 特長

- **決められた記法で書くだけ**: 見出しタグ（`#` 〜 `######`）に役割（スライドタイトル、主張、本文等）が割り当てられており、自然な執筆フローで美しいスライドが完成。
- **はみ出し防止の自動リサイズ**: 表やコードブロックの文字量、画像の大きさに応じて自動的に最適なフォントサイズや縮小率に調整。
- **多彩なレイアウト**: 通常スライド、2段組（左右比較）、画像横並び（2〜4枚）、会話タイムライン形式、ワイドコンテンツに対応。
- **テーマカラーのカスタマイズ**: CSS変数またはユーティリティクラス（`theme-corporate-blue` など）を指定するだけで全体のカラーパレットを一括変更可能。
- **ネイティブ PPTX 変換**: Puppeteer と PptxGenJS を連携させたカスタムコンバーターにより、テキストやシェイプを編集可能な PowerPoint オブジェクトとして出力可能。
- **AI連携（MCP サーバー）**: Model Context Protocol (MCP) に対応したサーバーを内包しており、Claude Desktop や Cursor 等の AI アシスタントから自然言語でスライドの生成・編集・PDF出力が可能。

---

## ディレクトリ構成

```
oss/main/
├─ README.md                     # 本ドキュメント
├─ LICENSE                       # ライセンス
├─ package.json                  # ビルドスクリプト・依存関係定義
├─ tsconfig.json                 # TypeScript 設定ファイル
├─ marp.config.js                # 目次自動生成・静的リサイズ対応カスタムエンジン
├─ docs/                         # IPA標準準拠・Obsidian対応 設計図書体系
│  ├─ README.md                  # 設計図書統合インデックス & トレーサビリティ
│  ├─ 00_project_charter/        # プロジェクト憲章・コーディング規約
│  ├─ 01_requirements/           # 要件定義書
│  ├─ 02_basic_design/           # 機能仕様書・外部I/F仕様書
│  └─ 03_detail_design/          # 構造設計書・内部I/F仕様書・プログラム仕様書
├─ src/                          # MCP サーバー TypeScript ソースコード
│  └─ index.ts                   # MCP サーバー本体
├─ prompts/                      # AI プロンプトテンプレート
│  └─ mcp_slide_generator.md     # スライド自動生成用プロンプト
├─ pptx_converter/
│  └─ convert.js                 # PowerPoint（.pptx）カスタム変換スクリプト
├─ themes/
│  ├─ business-slide-theme.css   # 本体テーマCSS（レイアウト＋自動リサイズ）
│  ├─ theme-colors.css           # カラーパレット定義（コーポレートブルー等）
│  ├─ banner.svg                 # 表紙用サンプルバナー
│  └─ vendor/                    # シンタックスハイライト・Mermaid関連スクリプト
├─ templates/                    # 各ページ用 Markdown テンプレート
│  ├─ スライドタイトル_テンプレ.md
│  ├─ スライド通常ページ_テンプレ.md
│  ├─ スライド通常_会話形式_テンプレ.md
│  ├─ スライドワイドコンテンツ_テンプレ.md
│  ├─ スライド2段組_テンプレ.md
│  └─ スライド画像並列_テンプレ.md
└─ slides/                               # スライド配置ディレクトリ
   ├─ D01-000001_Marpの使い方/           # 資料ごとの専用ディレクトリ
   │  ├─ D01-000001_Marpの使い方.md     # 使い方スライド原本
   │  ├─ D01-000001_Marpの使い方.pdf
   │  ├─ D01-000001_Marpの使い方.pptx
   │  ├─ banner.svg                      # 資料固有バナー
   │  └─ N-Y-Public_Logo.jpg             # ヘッダーロゴ
   └─ ...
```

---

## クイックスタート

### 1. VS Code による執筆（推奨）

1. [VS Code](https://code.visualstudio.com/) をインストールします。
2. 拡張機能マーケットプレイスから **Marp for VS Code**（`marp-team.marp-vscode`）をインストールします。
3. VS Code の設定（`settings.json`）にテーマを登録します：

```json
{
  "markdown.marp.themes": [
    "./themes/business-slide-theme.css"
  ],
  "markdown.marp.enableHtml": true
}
```

4. `slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md` を開き、右上のプレビューボタン（または `Ctrl+K V`）を押すと、リアルタイムにデザインが適用されたプレビューが表示されます。

---

### 2. コマンドライン（CLI）によるビルド

依存関係をインストールします：

```bash
npm install
```

#### PDF の出力
```bash
npm run build:pdf
```
`slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf` が生成されます。

#### 高機能 PPTX の出力（推奨）
テキストやシェイプが編集可能なネイティブ PowerPoint ファイルを出力します：
```bash
npm run build:pptx-custom
```
`slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pptx` が生成されます。

---

## スライドの基本構造

各スライドのフロントマター（先頭部分）には以下を記述します：

```markdown
---
marp: true
theme: business-slide
size: 4:3
paginate: true
header: '![](N-Y-Public_Logo.jpg)'
---

<style>
@import '../themes/business-slide-theme.css';
</style>
```

### 見出しアンカーの役割

| 見出し記法 | 表紙スライド（1ページ目） | 通常スライド（2ページ目以降） |
| :--- | :--- | :--- |
| `#` (h1) | **メインタイトル** (36pt・左寄せ) | **ページタイトル** (上端) |
| `##` (h2) | **サブタイトル** (20pt・グレー) | **ページ主張 / メッセージ** (カラー帯内) |
| `###` (h3) 1つ目 | **図書番号** (14pt・右寄せ) | **主張補足 / 図表タイトル** (帯下・中央寄せ) |
| `###` (h3) 2つ目 | **所属・氏名** (16pt・左寄せ) | — |
| `####` (h4) | **作成日** (14pt) | **本文 / メインコンテンツ** (テキスト・表・図など) |
| `#####` (h5) | — | **図表出典 / 脚注** (右下・11pt) |
| `######` (h6) 1つ目 | **コピーライト** (左下・白文字) | **コピーライト** (左下・白文字) |
| `######` (h6) 2つ目 | **機密指定** (右下・赤文字) | **機密指定** (右下・赤文字) |

---

## 主なレイアウトクラス

### 1. 目次スライド (`<!-- _class: toc -->`)
```markdown
---
<!-- _class: toc -->
# 目次
```
スライド内の `h1` 見出しを自動収集し、ページ番号付きのクリック可能な目次を生成します。

### 2. 2段組レイアウト (`<!-- _class: columns-2 -->`)
```markdown
---
<!-- _class: columns-2 -->
# 2段組レイアウト

## 左右に並べて比較・対比する際のメッセージ

### 左右の比較

#### 本文

- <!-- 左カラム -->
  - **左側の論点**
    - 従来の運用課題

- <!-- 右カラム -->
  - **右側の論点**
    - 新規システムの効果
```

### 3. 画像横並びレイアウト (`<!-- _class: images-2 -->` 〜 `images-4`)
```markdown
---
<!-- _class: images-2 -->
# 画像横並びレイアウト

## 複数画像の比較

### グラフ比較

#### 本文

- ![グラフA](sample.svg)
  **月次推移**

- ![グラフB](normal_page_demo.svg)
  **満足度推移**
```

### 4. 会話形式レイアウト (`<!-- _class: conversation-content -->`)
```markdown
---
<!-- _class: conversation-content -->
# 会話形式レイアウト

## タイムライン形式の対話

### 利用イメージ

#### 本文

- ![Aさん](https://placehold.co/80) **ユーザーA** こんにちは！
- ![Bさん](https://placehold.co/80) **システムB** やあ、元気ですか？
- **名無し** アイコン画像なしでも自動でシルエットが表示されます。
```

### 5. ワイドコンテンツ (`<!-- _class: wide-content -->`)
H2のグレー背景帯を非表示にし、画面幅と高さを広く使用します。

---

## テーマカラーの変更

スライドの `<style>` タグ内で `--primary-color` を上書きするか、用意されたクラスを使用します。

```markdown
<!-- クラスで変更する場合 -->
<!-- _class: theme-corporate-blue -->
```

利用可能なカラー：
- `theme-corporate-blue`: コーポレート・ブルー (`#1f497d`)
- `theme-deep-navy`: ディープ・ネイビー (`#002060`)
- `theme-emerald-green`: エメラルド・グリーン (`#2e7d32`)
- `theme-forest-teal`: フォレスト・ティール (`#00695c`)
- `theme-wine-red`: ワインレッド (`#881b34`)
- `theme-charcoal-gray`: チャコール・グレー (`#424242`)
- `theme-warm-amber`: ウォーム・アンバー (`#b26a00`)

---

## MCP (Model Context Protocol) サーバーによる AI 連携

本リポジトリには、Anthropic の Model Context Protocol (MCP) に準拠したスライド操作用サーバー（`src/index.ts`）が含まれています。Claude Desktop や Cursor、Antigravity などの AI クライアントと連携させることで、AI との対話を通じてスライドの作成・要素編集・PDF出力を行えます。

### 1. MCP サーバーのビルド

TypeScript ソースコードをビルドして実行可能な JavaScript を生成します：

```bash
npm run build
```
ビルドが成功すると、`build/index.js` が生成されます。

### 2. クライアント設定（例: Claude Desktop）

Claude Desktop の設定ファイル（`claude_desktop_config.json`）の `mcpServers` に本サーバーを登録します。

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "marp-slide-mcp": {
      "command": "node",
      "args": ["<本リポジトリの絶対パス>/build/index.js"]
    }
  }
}
```

### 3. 提供されるツール一覧

本 MCP サーバーは以下の 7 つのツールを提供します：

| ツール名 | 説明 | 主要引数 |
| :--- | :--- | :--- |
| `generate_slide_deck` | テーマとレイアウト規約に準拠した Marp スライド Markdown を一括新規作成します。 | `filename`, `title`, `slides` (配列: layout, title, message, body等), `primaryColor` |
| `get_slide_deck` | 既存のスライド Markdown を読み込み、フロントマターや各スライド要素を解析して返します。 | `filePath` |
| `insert_slide` | 指定したスライドファイルの特定インデックス位置に新しいスライドを挿入します。 | `filePath`, `index`, `slide` (オブジェクト) |
| `update_slide` | 指定したインデックスのスライド内容（タイトル、メッセージ、本文等）を更新します。 | `filePath`, `index`, `slide` (オブジェクト) |
| `delete_slide` | 指定したインデックスのスライドを削除します。 | `filePath`, `index` |
| `update_deck_settings` | デッキ全体の設定（テーマカラー `--primary-color`、比率 `size`、表紙バナー等）を更新します。 | `filePath`, `primaryColor`, `size`, `bannerImage` |
| `export_to_pdf` | Marp CLI を内部で呼び出して、指定したスライド Markdown を PDF に変換・出力します。 | `filePath`, `outputPath` (任意) |

### 4. AI プロンプトテンプレート

`prompts/mcp_slide_generator.md` に、本テーマのアンカー構文やレイアウトルール（`#`〜`######` のアンカー構造、推奨文字数、クラス指定）に準拠した高品質なスライドを AI（LLM）に生成させるための指示プロンプトが格納されています。
Deep Research や長文ドキュメントをプレゼン資料に変換する際、AI クライアントのプロンプトとしてご活用ください。

---

## 設計図書（IPA標準仕様書体系・Obsidian対応）

本プロジェクトの要件定義、基本設計、詳細設計、実装アルゴリズム、および開発運用ルールは、IPA（情報処理推進機構）のシステム開発仕様書体系に準拠して詳細に文書化されています。詳細は [docs/README.md](docs/README.md) をご参照ください。

- **統合ハブ**: [設計図書体系統合インデックス](docs/README.md)（全体マップ & トレーサビリティマトリクス）
- **00. プロジェクト憲章レベル**:
  - [プロジェクト憲章](docs/00_project_charter/01_project_charter.md)（背景・意義・目的・成功基準・ライセンス戦略）
  - [コーディング規約](docs/00_project_charter/02_coding_standards.md)（Google TypeScript準拠・全行直上平易コメント規則）
- **01. 要件定義レベル**:
  - [要件定義書](docs/01_requirements/01_requirements_specification.md)（業務要件・機能要件REQ-FNC・非機能要件REQ-NFR）
- **02. 基本設計レベル**:
  - [機能仕様書](docs/02_basic_design/01_functional_specification.md)（5層アーキテクチャ・機能詳細FNC・スライドレイアウト仕様LAY）
  - [外部I/F仕様書](docs/02_basic_design/02_external_interface_specification.md)（MCP Tools仕様・CLIコマンド・外部API連携仕様）
- **03. 詳細設計レベル**:
  - [構造設計書](docs/03_detail_design/01_architectural_design.md)（モジュール構成MOD・データモデルMOD-DAT・実行ライフサイクル）
  - [内部I/F仕様書](docs/03_detail_design/02_internal_interface_specification.md)（内部関数INT-FN・Marpエンジン拡張API・DOM解析仕様）
  - [プログラム仕様書](docs/03_detail_design/03_program_specification.md)（各ソースコードのアルゴリズム・処理論理PRG）

---

## ライセンス

本ソフトウェアは **SaaS提供制限付きライセンス（Source-Available）** のもとで公開されています。詳細な条文は [LICENSE](LICENSE) をご確認ください。

### 許可される利用例（OK）
- **自社・個人の業務利用**: 営業資料、提案書、受託案件の納品物など、本ソフトウェアを用いて作成したスライド成果物の商用利用。
- **環境構築・保守・サポート等のサービス提供**: クライアント企業の環境に本ソフトウェアを導入・設定し、その環境構築費用や**保守・サポート・運用支援などの対価（料金）を受け取ること**。
- **受託開発・コンサルティング**: 本ソフトウェアを組み込んだ顧客専用社内システムの受託開発や研修・トレーニングの実施。
- **ソースコードの改変・拡張**: 自社や顧客のニーズに合わせてテーマやスクリプトを自由に改変すること。

### 禁止される利用例（NG）
- **SaaS / クラウド型サービスの有料提供**:
  本ソフトウェア（またはその改変物）を自社のサーバーやクラウド環境で稼働させ（MCPサーバーやWeb API等を含む）、**一般ユーザーや企業に対して「オンラインでスライドを自動生成するサービス」として課金・有料提供（SaaS、月額サブスクリプション、API従量課金など）すること**。
  ※ SaaS形態での商用サービスを展開したい場合は、著作権者からの個別の事前書面許諾が必要です。
