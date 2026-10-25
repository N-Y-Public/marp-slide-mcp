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
marp-slide-mcp/
├─ README.md                     # 本ドキュメント
├─ LICENSE                       # ライセンス
├─ package.json                  # ビルドスクリプト・依存関係定義
├─ package-lock.json             # 依存関係ロックファイル
├─ tsconfig.json                 # TypeScript 設定ファイル
├─ marp.config.js                # 目次自動生成・静的リサイズ対応カスタムエンジン
├─ docker-compose.yml            # 開発コンテナ環境定義
├─ dev.ps1 / dev.sh              # 開発コンテナ管理・実行スクリプト
├─ .devcontainer/                # Dev Container 定義（Node 22 / Chromium / Noto CJK）
├─ .agents/                      # AI エージェント用 Skill 定義（marp-slides）
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

### 1. VS Code による執筆（プレビュー環境の準備）

1. [VS Code](https://code.visualstudio.com/) をインストールします。
2. 拡張機能マーケットプレイスから **Marp for VS Code**（`marp-team.marp-vscode`）をインストールします。
3. VS Code のワークスペース設定またはユーザー設定（`settings.json`）にテーマを登録します：

```json
{
  "markdown.marp.themes": [
    "./themes/business-slide-theme.css"
  ],
  "markdown.marp.enableHtml": true
}
```

4. `slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md` を開き、右上のプレビューボタン（または `Ctrl+K V` / `Cmd+K V`）を押すと、リアルタイムにビジネスデザインが適用されたプレビューが表示されます。

---

### 2. 環境に応じたビルド・実行方法

本リポジトリは、**「Docker 環境（推奨）」** と **「Docker が使えない環境（ホストローカル実行）」** の双方に対応しています。

#### 2.1 【推奨】Docker 環境による実行
> [!TIP]
> **なぜ Docker が推奨なのか？**  
> Marp の PDF 出力は Chromium のレンダリングエンジンを利用します。Docker コンテナ内（Debian Bookworm + Headless Chromium + `fonts-noto-cjk`）でビルドすることで、Windows / macOS / Linux 間の**フォントレンダリング差分や文字幅のズレを完全に排除し、ピクセルパーフェクトなスライドを出力**できます。

```bash
# 依存パッケージのインストール
docker compose run --rm app npm install

# MCP サーバーの TypeScript ビルド
docker compose run --rm app npm run build

# 全スライドの PDF 一括ビルド
docker compose run --rm app npm run build:pdf

# 全スライドのネイティブ編集可能 PPTX 一括ビルド
docker compose run --rm app npm run build:pptx-custom

# ※ Windows PowerShell の場合は .\dev.ps1、Linux/macOS の場合は ./dev.sh も利用可能です：
# .\dev.ps1 run npm run build:pdf
```

#### 2.2 【企業の社内環境等】Docker が使えない環境での対応方法
企業のセキュリティポリシーや PC の権限制約により Docker Desktop が利用できない環境でも、ホストマシンのランタイムを用いて完全動作させることができます。

##### ① 前提要件・必要ランタイム
- **Node.js**: `v22.x LTS`（または互換の v20+）
- **Google Chrome** または **Chromium**: インストール済みであること（PDF 出力および PPTX 変換時にヘッドレスブラウザとして使用）
- **Python**: `3.10+`（ネイティブ PPTX 変換を利用する場合のみ必要）
- **日本語フォント**: OS 標準の日本語フォント（Windows: Meiryo / Yu Gothic、macOS: Hiragino Sans、Linux: `fonts-noto-cjk`）

##### ② セットアップ手順
```bash
# 1. リポジトリ直下で依存パッケージをインストール
npm install

# 2. （任意: PPTX変換を利用する場合）Python依存パッケージをインストール
pip install -r pptx_converter/requirements.txt
# または直接インストール:
pip install python-pptx

# 3. MCP サーバーをビルド
npm run build
```

> [!NOTE]
> **Chrome パスの手動指定（必要な場合のみ）**  
> Chrome が標準以外のパスにインストールされている環境では、環境変数 `CHROME_PATH` または `PUPPETEER_EXECUTABLE_PATH` に Chrome の実行ファイル絶対パスを指定してください：
> ```bash
> # Windows (PowerShell) の例:
> $env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
> # Linux / macOS の例:
> export CHROME_PATH="/usr/bin/google-chrome"
> ```

##### ③ ローカル環境でのビルド実行
```bash
# 全スライドの PDF 出力
npm run build:pdf

# 全スライドの編集可能 PPTX 出力
npm run build:pptx-custom
```

---

### 3. MCP を利用しない手動 PDF・PPTX エクスポート手順（トークン消費ゼロ）

スライド Markdown の誤字脱字・数値を手修正した場合など、**「わざわざ生成 AI / MCP を呼び出して API トークンを消費したくない」** 場合、MCP が内部で利用しているツール群（Marp CLI + カスタムエンジン `marp.config.js`、`pptx_converter/convert.js`）と同じパイプラインを手動で直接実行できます。

#### 3.1 特定のスライド単体を指定して出力するコマンド

##### 【Docker 環境の場合】
```bash
# 1. 特定のスライドのみ PDF 出力（--allow-local-files と --no-stdin を必ず付与）
docker compose run --rm app npx @marp-team/marp-cli --config-file marp.config.js --pdf slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md -o slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf --allow-local-files --no-stdin

# 2. 特定のスライドのみ編集可能 PPTX 出力
docker compose run --rm app node pptx_converter/convert.js slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pptx
```

##### 【Docker レス（ローカル環境）の場合】
```bash
# 1. 特定のスライドのみ PDF 出力
npx @marp-team/marp-cli --config-file marp.config.js --pdf slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md -o slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf --allow-local-files

# 2. 特定のスライドのみ編集可能 PPTX 出力
node pptx_converter/convert.js slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pptx
```

#### 3.2 VS Code 拡張機能（Marp for VS Code）からの GUI エクスポート
CLI を使わずに GUI 操作だけでワンクリック出力することも可能です：
1. 対象のスライド Markdown（`slides/.../*.md`）を VS Code で開きます。
2. コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）を開き、`Marp: Export slide deck` を選択します。
3. エクスポート形式で `pdf`（または `pptx`）を選択し、保存先を指定します。

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
@import '../../themes/business-slide-theme.css';
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

### 6. スライド内要素の10段階サイズ微調整クラス (`table-1`〜`10`, `text-1`〜`10` 等)

各スライド先頭にクラス（`<!-- _class: ... -->`）を指定することで、表や本文テキスト、Mermaid図、画像、コードブロックの大きさを10段階で滑らかに手動微調整できます。  
タイトルや主張クラス（`claim-1`〜`claim-8`）と同じく、**「1」が最大（標準・余裕）**であり、数字が増えるにつれて段階的に縮小され、**「10」は従来の最小限界値よりもさらに2段階小さい極小サイズ**まで情報量の多いスライドを収めることができます。

| 対象要素 | クラス名（1〜10段階） | エイリアス | 調整内容（1が最大、10が極小） | 従来の互換クラス |
| :--- | :--- | :--- | :--- | :--- |
| **表 (Table)** | `table-1` 〜 `table-10` | — | 表フォントサイズ (26pt 〜 6pt)・セル余白・行間 | `table-xl`〜`table-xxs`, `table-sm`, `table-xs` |
| **本文 (Text / Body)** | `text-1` 〜 `text-10` | `body-1` 〜 `body-10` | 本文文字倍率 `--txt-scale` (1.0 〜 0.35) | `roomy`, `dense`, `denser`, `densest` |
| **Mermaid図** | `mermaid-1` 〜 `mermaid-10` | — | 図の最大高さ (100% 〜 28%) | `mermaid-sm` (4相当), `mermaid-xs` (7相当) |
| **画像 (Image)** | `img-1` 〜 `img-10` | `image-1` 〜 `image-10` | 単一画像の最大高さ (100% 〜 20%) | — |
| **コードブロック** | `code-1` 〜 `code-10` | — | コードフォントサイズ (18pt 〜 5pt) | `code-lg`, `code-sm`, `code-xs`, `code-xxs` |
| **主張・表題** | `claim-1` 〜 `claim-8`<br>`title-1` 〜 `title-3` | — | 背景帯や表題の行数・文字数に応じた段階縮小 | — |

#### 複数クラスの併用指定例
同一スライド内で複数の要素（本文と表、または本文と図など）を個別に微調整したい場合、半角スペース区切りで自由に併用できます：

```markdown
---
<!-- _class: text-3 table-5 -->
# 業績分析

## 主要指標の推移

#### 本文
本文テキストは段階3（scale 0.84）に縮小され、表は段階5（13.5pt）に美しく収まります。

| 年度 | 売上高 | 営業利益 |
| :--- | :--- | :--- |
| 2024 | 100億円 | 15億円 |
```

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

### 2. クライアント設定と外部プロジェクトからの汎用利用

本 MCP サーバーは、本リポジトリ専用のスライド作成ツールとしてだけでなく、**「PC 内の共通スライド生成エンジン」として、他の任意のリポジトリ（Web アプリケーション、業務システム、仕様書リポジトリ等）から汎用的に呼び出す**ことが可能です。

本リポジトリを PC 上の共通ディレクトリ（例: `~/tools/marp-slide-mcp` や `C:\tools\marp-slide-mcp` 等）に配置してビルド（`npm run build`）しておけば、どのプロジェクトを開いているときでも、AI アシスタントを通じてスライドの生成・編集・高精度 PDF 出力を行えます。

#### 2.1 AI クライアントへの登録

##### ① VS Code での設定（推奨: GitHub Copilot, Cline, Roo Code, Claude Code 等）

VS Code を利用する場合、**「作業中リポジトリ内限定で利用する方式（Workspace設定）」** と、**「ユーザーがアクセスできる全リポジトリから共通利用する方式（User設定）」** の2通りから選択できます。

###### (a) ワークスペース設定（特定リポジトリ内限定で利用する場合）
作業中プロジェクトのルートディレクトリに `.vscode/mcp.json` を作成し、以下を記述します：

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
- **適用範囲**: このワークスペース（フォルダ）を開いているときのみ MCP ツールが有効になります。プロジェクトごとに使用するツールを分離したい場合に最適です。

###### (b) ユーザー設定（全リポジトリ・どのプロジェクトからでも利用する場合）
VS Code のグローバルユーザー設定用 `mcp.json` に本サーバーを登録します：
- **Windows**: `%APPDATA%\Code\User\mcp.json`
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Linux**: `~/.config/Code/User/mcp.json`

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

**【ステップバイステップ設定手順】**
1. 本リポジトリを PC 上の共通ツールディレクトリ（例: `C:\tools\marp-slide-mcp` や `~/tools/marp-slide-mcp` 等）にクローンし、リポジトリ直下でビルドを実行します：
   ```bash
   npm install && npm run build
   ```
2. 上記 OS 別のパスにある `mcp.json` をテキストエディタまたは VS Code で開きます（ファイルが存在しない場合は新規作成してください）。
3. 上記の JSON 定義を追記し、`<本リポジトリの絶対パス>` をクローン先の絶対パス（例: `C:/tools/marp-slide-mcp`）に置き換えて保存します。
4. VS Code を再起動（またはコマンドパレットから `Developer: Reload Window` を実行）します。
5. どのフォルダやプロジェクトを開いている時でも、チャットから自然言語で「スライドを作成して」と指示すれば、本ツールの各 MCP ツール（`generate_slide_deck` 等）が自動認識されて呼び出されます。

> [!WARNING]
> **【重要】スコープ選択の指針と「別リポジトリ・古いMCPが参照される罠」の回避**  
> ユーザー設定（グローバル設定）に本リポジトリのパスを登録すると、どのフォルダを開いていてもスライドを作成できる利便性がある反面、**Git Worktree や別のディレクトリで本ツール自体（テーマ・MCPコード）を開発・改修する場合に、エディタやAIがグローバル設定の固定パスを優先してしまい、作業中リポジトリではなく古い別リポジトリの MCP を参照してしまう問題**が発生します。  
> - **スライド作成の利用のみ**: ユーザー設定（全プロジェクト共通）で PC 内の安定版パスを登録。  
> - **本ツール自体の開発・改修・Worktree利用時**: 必ずプロジェクトごとの **ワークスペース設定（`.vscode/mcp.json`）** を使用し、作業中ディレクトリ自身の `build/index.js` を指すように設定してください。

##### ② Cursor での設定（プロジェクト別、またはグローバル）
作業中プロジェクトのルートに `.cursor/mcp.json` を配置するか、Cursor の設定（Settings > Features > MCP）から登録します：

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

##### ③ Claude Desktop での設定（全プロジェクト共通）
Claude Desktop の設定ファイル（`claude_desktop_config.json`）の `mcpServers` に本サーバーを登録します：
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

##### ④ Docker 経由での実行（ホスト側に Node.js / Chromium を構築しない場合）
```json
{
  "mcpServers": {
    "marp-slide-mcp": {
      "command": "docker",
      "args": [
        "compose",
        "-f", "<本リポジトリの絶対パス>/docker-compose.yml",
        "run", "--rm", "-T", "app",
        "node", "build/index.js"
      ]
    }
  }
}
```

#### 2.3 GitHub MCP 連携と PAT 完全分離アーキテクチャ

本リポジトリは、GitHub MCP サーバー（`ghcr.io/github/github-mcp-server`）を利用した Issue/PR の自動管理に対応しています。
ホスト側のグローバル設定に依存した常駐コンテナによる PAT 混線や誤起票を防ぐため、**リポジトリ単位の PAT 完全分離 ＆ 揮発性ワンショット実行** を採用しています。

##### ① PAT（パーソナルアクセストークン）の設定方法

用途に合わせて以下のいずれかの方式を選択できます（`.gitignore` により `.env` は Git 管理外のため安全です）：

1. **推奨方式（環境変数直読み・ディスク非保存）**:
   OS（Windows / Linux / macOS）のユーザー環境変数に、本リポジトリ専用の環境変数を設定します：
   ```bash
   # Windows (PowerShell) の場合
   [Environment]::SetEnvironmentVariable('GITHUB_PAT_MARP_SLIDE_MCP', 'ghp_your_token', 'User')

   # Linux / macOS (bash / zsh) の場合
   export GITHUB_PAT_MARP_SLIDE_MCP="ghp_your_token"
   ```
   - **メリット**: ディスク上に平文トークンを一切保存せず、別プロジェクトの PAT とも変数名レベルで物理的に分離されます。

2. **OSS クローン方式（.env ファイル利用）**:
   リポジトリ直下のテンプレートから `.env` を作成して設定します：
   ```bash
   cp .env.example .env
   # .env 内の GITHUB_PERSONAL_ACCESS_TOKEN にトークンを記述
   ```

##### ② 安全装置（Pre-Execution Identity Gate）
本リポジトリの開発 AI エージェントには、GitHub への外部書き込み操作（Issue/PR 作成、コメント等）を行う直前に、必ず `get_me` ツールを実行して認証ユーザー名を機械照合する安全装置が組み込まれています。

- **メンテナー環境（デフォルト動作）**:
  環境変数が未指定の場合、誤コミットや意図しない個人アカウント混入を防止するため、リポジトリメンテナー名義（`login === "N-Y-Public"`, `id === 330902043`）と自動照合されます。不一致時や未認証時は直ちに処理を中断（ABORT）します。
- **外部コントリビューター・クローン環境での利用**:
  第三者が自身の PAT を設定して開発・操作を行う場合は、環境変数 `EXPECTED_GITHUB_LOGIN`（および任意で `EXPECTED_GITHUB_ID`）に**ご自身の GitHub ユーザー名**を設定してください。AI エージェントは指定されたアカウント名と照合を行い、特定アカウント名を強制されることなく、安全装置の保護のもとで自立して開発へ参加できます（詳細は [CONTRIBUTING.md](CONTRIBUTING.md) 参照）。
  ```bash
  # Windows (PowerShell) の場合
  [Environment]::SetEnvironmentVariable('EXPECTED_GITHUB_LOGIN', 'your-github-username', 'User')

  # Linux / macOS (bash / zsh) の場合
  export EXPECTED_GITHUB_LOGIN="your-github-username"
  ```

> [!TIP]
> 外部プロジェクトのパスから直接ファイルを読み書きしたい場合は、ホストの Node.js による直接実行（① または ②）を推奨します。Docker 経由の場合はコンテナ外のファイルパスにアクセスできないため、MCP サーバー内蔵の `fileId` による管理をご利用ください。

#### 2.2 外部プロジェクトでの運用 Tips と成果物の扱い

1. **成果物（PDF・HTML）の取り込み**:
   - `generate_slide_deck` 等で新規作成されたスライド一式は、MCP サーバーの配置ディレクトリ配下（`slides/<fileId>/`）に出力され、チャット上で絶対パスが返却されます。
   - 完成したプレゼン資料（`.pdf` や `.html`）を作業中プロジェクトに取り込みたい場合は、AI に「**生成された PDF をこのプロジェクトの docs/ にコピーして**」と指示してご活用ください。
   > [!NOTE]
   > 生成される Markdown は本リポジトリのテーマ（`themes/business-slide-theme.css`）への相対参照（`../../themes/...`）を含むため、Markdown 単体を作業プロジェクトにコピーして Marp プレビューを開くとスタイルが崩れる場合があります。スライドの追加・修正・再ビルドは、本 MCP ツール（`update_slide`, `insert_slide` 等）経由で行うことを推奨します。

2. **既存スライドの再出力と直接変換（export_to_pdf）**:
   - 本 MCP ツールで過去に作成したスライドは、発行された `fileId` を指定することで、いつでも最新の PDF/HTML を再出力可能です。
   - 作業中プロジェクト内の既存 Markdown を直接 PDF 化したい場合は、以下の条件を満たす必要があります：
     - **Node.js ローカル実行**: MCP サーバーがホストマシンの Node.js で起動していること（Docker 実行時はホスト側の別ディレクトリへのアクセスが制限されます）。
     - **テーマ・構文準拠**: Markdown のフロントマターに `theme: business-slide` が指定され、かつ本テーマのアンカー構文（`# ページタイトル`, `## ページ主張` 等）に準拠していること。
     - 例: `export_to_pdf(markdownPath: "/path/to/my-project/docs/presentation.md")`

### 3. 提供されるツール一覧

本 MCP サーバーは以下の 7 つのツールを提供します：

| ツール名 | 説明 | 主要引数 |
| :--- | :--- | :--- |
| `generate_slide_deck` | テーマとレイアウト規約に準拠した Marp スライド Markdown および PDF を一括新規作成します。 | `titleSlide`, `normalSlides`, `size`, `themeColor`, `logoPath`, `filenamePrefix` |
| `get_slide_deck` | 既存のスライド構成（各ページ番号、タイトル、主張、本文、クラス、バナー設定等）を取得します。 | `fileId` |
| `insert_slide` | 指定したページ番号の直後に新しいスライドを1枚挿入し、PDF/HTMLを再ビルドします。 | `fileId`, `insertAfterPage`, `newSlide` |
| `update_slide` | 指定したページ番号のスライド内容を更新し、PDF/HTMLを再ビルドします。 | `fileId`, `targetPageNumber`, `updatedSlide` |
| `delete_slide` | 指定したページ番号のスライドを削除し、PDF/HTMLを再ビルドします。 | `fileId`, `targetPageNumber` |
| `update_deck_settings` | デッキ全体の設定（比率、ロゴ、バナー、テーマカラー、表紙情報）を更新します。 | `fileId`, `size`, `logoPath`, `banner`, `themeColor`, `titleSlide` |
| `export_to_pdf` | 指定したスライドIDまたはMarkdownファイルからPDF（およびHTML）を出力します。 | `fileId`, `markdownPath` |

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
