---
pbi_id: "PBI-007"
title: "Dockerコンテナ環境における Headless Chromium 起動ハングの是正（Marp CLI Puppeteer引数伝播および非対話標準入力遮断）"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-001", "REQ-NFR-006"]
related_mod_ids: ["MOD-001", "MOD-002"]
related_test_ids: ["TEST-IT-006"]
---

# [PBI-007] Dockerコンテナ環境における Headless Chromium 起動ハングの是正（Marp CLI Puppeteer引数伝播および非対話標準入力遮断）

> 関連 GitHub Issue: [#9 - fix: Dockerコンテナ内での npm run build:pdf 実行時に Chromium が待機状態（ハング）となる問題の是正](https://github.com/N-Y-Public/marp-slide-mcp/issues/9)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** Dockerコンテナ環境（`docker compose run --rm app`）でスライド開発・ビルドを行う開発者および自律AIエージェント
- **〜したい (I want to):** スライドPDF/PPTX出力コマンド（`npm run build:pdf`、`npm run build:pptx` 等）を実行した際に、Headless ChromiumやMarp CLIが待機状態（ハング）に陥ることなく、迅速かつ確実に終了コード0でPDF/PPTXファイルが生成・出力されるようにしたい
- **なぜなら (So that):** 
  - 現状、Dockerコンテナ環境（非対話・パイプ接続されたstdin環境）において `npm run build:pdf` を実行すると、Marp CLI の `cliInterface` がデフォルトで `stdin: true` を設定しているため、入力ファイル名が明示されている場合であっても stdin からの入力を EOF まで待ち続けてハングする事象が発生する。
  - さらに、コンテナ内の非rootユーザー（`node`）環境では Linux カーネルのサンドボックス制約が存在し、Marp CLI の Puppeteer 起動時に `--no-sandbox` が伝播されないと Chromium の起動失敗やハングを招くリスクがある。
  - これらの複合要因を根本から是正し、開発者やAIエージェントがDocker環境で安定してスライド変換パイプラインを実行できるようにするため。

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **Marp CLI 非対話標準入力待機の遮断 (`--no-stdin`)**:
   - `package.json` のビルドスクリプト（`build:pdf`, `build:pptx`, `pdf`, `pptx`）に `--no-stdin` フラグを追加し、Docker Compose や CI などの非対話パイプ環境下で Marp CLI が stdin 入力待ち（`get-stdin`）でハングするのを防止する。
2. **Marp CLI 向け Puppeteer サンドボックス解除環境変数の配備 (`CHROME_NO_SANDBOX=1`)**:
   - `docker-compose.yml` の `environment` および `.devcontainer/Dockerfile` の `ENV` に `CHROME_NO_SANDBOX=1` を明示設定。
   - `src/index.ts` の `renderMarkdownToHtmlAndPdf` / `runMarpCliSafe` 呼び出し時にも `process.env.CHROME_NO_SANDBOX = "1"` を保証。
   - Marp CLI が内部で起動する Puppeteer/Chromium に対し、確実に `--no-sandbox` および `--disable-setuid-sandbox` 引数が渡されるようにする。
3. **マスター設計書の差分更新（Living Documentation）**:
   - 非機能要件書（`docs/templates/03_non_functional_requirements.md` の `REQ-NFR-001` / `REQ-NFR-006`）
   - 基本設計書（`docs/02_basic_design/`）
   - 詳細設計書（`docs/templates/05_software_design.md` の `MOD-001` / `MOD-002`）
   - テスト仕様書（`docs/templates/06_test_specification.md` の `TEST-IT-006`）
   - 要件追跡マトリクス（`docs/README.md` および `docs/templates/99_traceability_matrix.md`）
4. **検証とテスト実行**:
   - Dockerコンテナ内で `npm run build:pdf` および `npm run build:pptx` を実行し、ハングすることなく正常終了（終了コード0）することを確認。
   - `verify_rtm.py` によるトレーサビリティ検証を実行し、断絶0件を達成。

### やらないこと (Out of Scope)
- `@marp-team/marp-cli` 自体のアップストリーム npm パッケージコードの直接改変（OSSの利用規約・環境変数・CLI引数および設定ファイルによる解決とする）。
- GitHub へのリモートプッシュおよびPR自動オープン（ユーザーの承認・指示に基づく）。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given Dockerコンテナ環境（`docker compose run --rm app`）, When `npm run build:pdf` を実行した時, Then Marp CLI が stdin 待機でハングすることなく、約30秒以内に `slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf` が正常に出力され、終了コード0で完了すること
- [x] **AC-2:** Given Dockerコンテナ環境（`docker compose run --rm app`）, When `npm run build:pptx` を実行した時, Then Marp CLI がハングすることなく、正常に PPTX ファイルが出力されて終了コード0で完了すること
- [x] **AC-3:** Given `docker-compose.yml`, `.devcontainer/Dockerfile`, `package.json`, When 環境設定およびスクリプト定義を確認した時, Then `CHROME_NO_SANDBOX=1` および `--no-stdin` が適切に配備され、非対話実行環境における Headless Chromium の起動安定性が担保されていること

## 4. 曖昧さ検出と仮定管理 (Assumption Management)
- **【未定義】**: なし。Issue #9の現象および原因調査により、Marp CLIの `get-stdin` 待機機構と Puppeteer `--no-sandbox` 伝播の仕組みを完全特定。
- **【多義】**: なし。
- **【暗黙】**: Docker Compose の `run` コマンドがデフォルトで stdin パイプを開く仕様と、Marp CLI の `cliInterface` がデフォルトで `stdin: true` を前提としている暗黙の仕様衝突を明文化。
- **【矛盾】**: なし。

## 5. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-NFR-001`, `REQ-NFR-006`, `MOD-001`, `MOD-002`
- **DB/外部IF変更の有無:** DB変更なし。外部CLIスクリプト引数に `--no-stdin` を付加。

## 6. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-NFR-001`, `REQ-NFR-006`
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-002`
- **追加・更新したテストID:** `TEST-IT-006`
