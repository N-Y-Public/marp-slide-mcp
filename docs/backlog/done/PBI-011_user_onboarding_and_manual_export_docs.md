---
pbi_id: "PBI-011"
title: "ユーザーオンボーディング・利用性向上ドキュメント拡充（VS Code MCP設定・Dockerレス環境対応・手動PDF/PPTX出力手順の整備）"
type: "enhancement" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-001", "REQ-F-003", "REQ-NFR-006"]
related_mod_ids: ["MOD-001", "MOD-003"]
related_test_ids: ["TEST-ST-007"]
---

# [PBI-011] ユーザーオンボーディング・利用性向上ドキュメント拡充（VS Code MCP設定・Dockerレス環境対応・手動PDF/PPTX出力手順の整備）

> 関連 GitHub Issue:
> - [#11 - docs: VS Code 利用時のMCP設定方法を明示的に追記](https://github.com/N-Y-Public/marp-slide-mcp/issues/11)
> - [#14 - docs: Dockerが使えない環境での対応方法](https://github.com/N-Y-Public/marp-slide-mcp/issues/14)
> - [#15 - docs: MCPを利用しないで、PDF・PPTXの出力のみをMCPと同じツールで手動実行する方法の追記](https://github.com/N-Y-Public/marp-slide-mcp/issues/15)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 本リポジトリを導入・利用する開発者、コンサルタント、および社内エンジニア
- **〜したい (I want to):** 
  1. VS Code 利用時に、特定リポジトリ（ワークスペース）限定または全リポジトリ横断（ユーザー設定）の双方で迷わず MCP を設定・連携できるようにしたい（Issue #11）
  2. 企業の社内環境等の制約により Docker が利用できない場合でも、ホストマシン（Node.js / Python / Chrome）単独で環境構築・ビルド・スライド変換を行える手順を把握したい（Issue #14）
  3. スライドの微修正時などに生成AIのトークンを消費することなく、MCP内部と同一のCLI/コンバーターツールを用いて手動でPDFや編集可能PPTXを出力（全体または特定ファイル単体）できるようにしたい（Issue #15）
- **なぜなら (So that):** 
  - 現状の `README.md` および使い方スライド（`slides/D01-000001_Marpの使い方/`）は Cursor や Claude Desktop の設定例を中心に記載されており、世界的に最も普及しているエディタである VS Code での具体的な設定ステップ（Workspace設定 / User設定）が明記されていないため。
  - Docker 環境を標準・推奨とする一方で、金融機関や大企業のセキュリティポリシー等により Docker Desktop が導入できない環境でのセットアップ要件（Node 22、Chromium/Chrome、Python 3、日本語フォント）および実行方法が不足しており、導入障壁となっているため。
  - スライド Markdown の誤字脱字や微調整のたびに AI アシスタントへ再出力を要求すると無駄な API トークンと待ち時間が発生するため、内部エンジン（Marp CLI + `marp.config.js`、`pptx_converter/convert.js`）をCLIから直接叩いて素早く手動再出力する標準コマンド体系が利用者に明示されている必要があるため。

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **`README.md` のオンボーディングおよび利用ドキュメント拡充**:
   - **VS Code 利用時の MCP 設定手順の追記 (Issue #11)**:
     - ワークスペース設定（`.vscode/mcp.json`）によるリポジトリ単体利用手順。
     - ユーザー設定（グローバル設定）による全リポジトリ横断利用手順。
     - JSON設定スニペットおよび前提ビルドコマンドの明記。
     - Worktreeや別リポジトリ開発時にグローバルの古いMCPが参照されてしまう罠の回避策（注意書き）の配備。
   - **Docker が使えない環境（ホストローカル実行）での対応手順追記 (Issue #14)**:
     - 必須要件（Node.js 22 LTS、Google Chrome / Chromium、Python 3.10+ / `python-pptx`、日本語フォント環境）。
     - セットアップ手順（`npm install`、Pythonパッケージ導入、`npm run build`、パス環境変数 `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH`）。
     - Docker推奨理由（OS間フォント差異防止）とローカル実行時の注意事項の明記。
   - **MCP を使わない手動 PDF・PPTX 出力手順の追記 (Issue #15)**:
     - Docker 環境での全体出力・特定ファイル単体出力コマンド（`docker compose run --rm app ... --allow-local-files --no-stdin`）。
     - Docker レス環境（ローカル実行）での全体出力・特定ファイル単体出力コマンド（`npm run build:...`、`npx @marp-team/marp-cli ... --allow-local-files`、`node pptx_converter/convert.js ...`）。
     - VS Code 拡張機能（Marp for VS Code）からの GUI エクスポート手順。
2. **使い方スライド資料の更新と再ビルド (`slides/D01-000001_Marpの使い方/`)**:
   - `D01-000001_Marpの使い方.md` に以下のスライドページを追記・反映：
     - 「VS Code による MCP 設定と活用（2通りのスコープ）」
     - 「Dockerが使えない環境での対応（ホスト直接実行）」
     - 「トークンを消費しない手動 PDF・PPTX エクスポート」
   - Docker コンテナ内での PDF（`npm run build:pdf`）および PPTX（`npm run build:pptx-custom`）の再ビルド。
3. **IPA 設計図書（Living Documentation）の差分更新**:
   - 要件定義書（`docs/01_requirements/01_requirements_specification.md` の `REQ-FNC-005-04`, `REQ-FNC-006-08`, `REQ-NFR-POR-02` 差分）
   - 基本設計書（`docs/02_basic_design/`）
   - 詳細設計書（`docs/03_detail_design/`）
   - テンプレート一式（`docs/templates/`）
   - 要件追跡マトリクス（`docs/templates/99_traceability_matrix.md` および `docs/README.md`）
4. **検証テストの定義と実行 (`TEST-ST-007`)**:
   - `tests/verify_worktree_mcp.js` による本ワークツリー MCP サーバーの直接起動・公開ツール7種および `export_to_pdf` の Stdio JSON-RPC 動作検証（PASS）。
   - 単体スライドの直接エクスポートコマンド動作検証（PASS）。
   - `verify_rtm.py` によるトレーサビリティ完全性検証（断絶 0 件）。

### やらないこと (Out of Scope)
- MCP サーバー本体の API スキーマ（Zod）の変更（ドキュメント拡充およびスライド更新が主目的）。
- Dockerfile / docker-compose.yml 本体の破壊的変更。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-ST-007`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given VS Code ユーザーが MCP を利用したい場合, When `README.md` または使い方スライドの該当セクションを参照した時, Then リポジトリ単体（Workspace設定: `.vscode/mcp.json`）および全リポジトリ共通（User設定）の双方が正確な JSON 設定例とステップバイステップの手順で理解できること。
- [x] **AC-2:** Given 企業セキュリティ等で Docker が使用できない環境のユーザー, When ドキュメントを参照した時, Then 必要なランタイム環境（Node 22、Chrome/Chromium、Python 3、日本語フォント）と具体的なインストール・ビルド・実行手順が明瞭に定義されており、ホスト単体でスライド出力が実行可能となること。
- [x] **AC-3:** Given スライド Markdown の軽微な手動修正を行ったユーザー, When 生成AIトークンを消費せず手動出力を行いたい時, Then Docker 環境およびローカル環境の双方において、全体ビルドおよび特定ファイル単体指定による PDF / PPTX 出力コマンド（および VS Code 拡張機能利用手順）が正確に提示されていること。
- [x] **AC-4:** Given 上記の更新内容, When `slides/D01-000001_Marpの使い方/` の Markdown を更新し Docker 環境内でビルドを実行した時, Then PDF および PPTX がエラーなく再生成され、新設スライドがレイアウト崩れなく表示されること。
- [x] **AC-5:** Given すべての設計書・ドキュメント・スライドが更新された状態, When Docker 環境内で `npm run build` および `python3 verify_rtm.py` を実行した時, Then ビルドエラー 0 件、かつ `PBI-011` ↔ `REQ` ↔ `MOD` ↔ `TEST-ST-007` の双方向トレーサビリティ断絶が 0 件（Exit Code `0`）であること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-F-001`, `REQ-F-003`, `REQ-NFR-006` / `REQ-FNC-005`, `REQ-FNC-006`, `REQ-NFR-006`, `MOD-001`, `MOD-003`, `MOD-SRV-001`, `MOD-PPT-001`, `MOD-INF-001`
- **対象ドキュメント:** `README.md`, `slides/D01-000001_Marpの使い方/*`, `docs/*`
- **セキュリティ・プライバシー:** 個人実名・ホスト固有絶対パス（`/Users/...`, `C:\...` 等）の混入 0 件を徹底。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-001`, `REQ-F-003`, `REQ-NFR-006` / `REQ-FNC-005-04`, `REQ-FNC-006-08`, `REQ-NFR-POR-02`
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-003` / `MOD-SRV-001`, `MOD-PPT-001`, `MOD-INF-001`
- **追加・更新したテストID:** `TEST-ST-007`
- **検証実績 (Pass Criteria):**
  - AC-1: `README.md` およびスライド資料において、VS Code のワークスペース設定（`.vscode/mcp.json`）とユーザー設定（グローバル `mcp.json`）のステップバイステップ手順、および Worktree/別リポジトリ開発時の古い MCP 参照防止の注記を配備。
  - AC-2: Docker が使えない環境向けの Node.js 22 LTS、Google Chrome / Chromium、Python 3.10+、日本語フォントの要件とインストール・ビルド・実行手順を明記。
  - AC-3: Docker 環境およびローカル環境における手動エクスポートコマンド（PDF / PPTX、一括ビルドおよび特定ファイル指定 `--allow-local-files --no-stdin`）の動作確認を完了。
  - AC-4: `slides/D01-000001_Marpの使い方/` に新設3ページを追加し、`npm run build:pdf` および `npm run build:pptx-custom` を実行してエラー0件で再生成を完了。
  - AC-5: `node tests/verify_worktree_mcp.js` による本ワークツリー MCP サーバーの直接検証合格、および `python3 verify_rtm.py` による断絶0件合格（Exit Code 0）を確認。
