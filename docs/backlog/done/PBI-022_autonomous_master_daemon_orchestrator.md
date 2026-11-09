---
pbi_id: "PBI-022"
title: "常駐Pythonオーケストレーターによる真の24H365D自律開発ループ基盤の実装"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-FNC-013", "REQ-NFR-008"]
related_mod_ids: ["MOD-AUT-001"]
related_test_ids: ["TEST-UT-008", "TEST-ST-014"]
---

# [PBI-022] 常駐Pythonオーケストレーターによる真の24H365D自律開発ループ基盤の実装

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 本リポジトリの運用・保守を行うメンテナー、およびローカル環境で24H365D自律開発運用を実施するコントリビューター
- **〜したい (I want to):** 単一チャットセッション内の `/goal` 依存から脱却し、決定論的な常駐Pythonオーケストレーター（Master Orchestrator Daemon）を「主」として稼働させ、定時レポート（07:30 / 11:50 / 18:00 JST 日報・水曜16:00 JST 週報）の時計監視自動出力、メンテナー指示タグの定期スキャン反映、および1工程（Stage A起票 → 独立審査 → Stage B実装）ごとに独立したステートレスAIワーカーセッション（`agy` CLI / SDK または設定コマンド）を起動・破棄して次Issueへ自動遷移する真の24H365D自律開発ループ基盤を実装したい
- **なぜなら (So that):** 単一チャットスレッドでの1Issue完了停止問題、複数タスク消化に伴うコンテキストウィンドウ肥大化による推論劣化、同一セッション内での起票・審査コンテキスト混在による自己承認リスク、およびAI思考待機による定時レポートの遅延・不達を構造的に解消するため（Issue #25）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **1. 常駐監視デーモンループ (`scripts/autonomous_daemon.py` および `scripts/autonomous_dev_loop.py run-daemon`)**:
  - ホストまたはDockerコンテナ内で常駐稼働（メインループ）し、外部停止シグナル（`SIGINT` / `SIGTERM`）または指定反復上限（テスト・ドライラン用の `--max-iterations` / `--once`）に達するまで監視・自律実行を継続する。
  - 二重起動を防止するロックファイルまたは状態管理機構（`state.json`）を備える。
- **2. 定時レポート（日報3回・水曜週報）の決定論的自動生成**:
  - AIを介さず、Pythonの時計監視（JST基準）により指定時刻（朝刊 `07:30`、昼刊 `11:50`、夕刊 `18:00`、および毎週水曜 `16:00` の週報＋日報）を判定し、`scripts/generate_reports.py`（`generate_daily_and_weekly_reports`）を直接呼び出して `docs/reports/` 配下へ出力する。
  - 同一日付・同一スロットの重複生成を防止する発行済み記録（`emitted_reports`）を状態管理ファイルに保持する。
- **3. 非同期フィードバック（メンテナー指示）の定期スキャンと自動反映**:
  - `docs/reports/daily/` 配下の日報に追記された指示タグ（`[APPROVE: ...]`, `[REJECT: ...]`, `[PRIORITY: #xxx]`）を定期スキャンし、`apply_maintainer_feedback` により承認状態および優先度キューを状態管理ファイルへ即時反映する。
- **4. タスク単位のステートレスAIワーカー呼び出し・GitHub Issue自動ポーリング・単一Issue並行度統制**:
  - `--issues-json` 未指定時（デフォルト）は、毎サイクルで GitHub REST API（`https://api.github.com/repos/N-Y-Public/marp-slide-mcp/issues?state=open&per_page=100`）を自動照会して Open Issue 一覧を取得する（Pull Request は自動除外し、本文の `Blocked by #xx` / `Depends on #xx` から依存関係を解析する。`--issues-json` 指定時はローカルJSONをオーバーライド使用する）。
  - 1度に並行して取り組むIssue数の上限（`max_concurrent_issues` / `--max-concurrent-issues`）のデフォルト値を `1` とし、進行中Issue（`in_progress_issues`）が上限に達している間は新規Issueの並行着手を抑止し、1件ずつ直列で完遂する。
  - 未着手Issueを `select_next_priority_issue` で選定し、1工程（① Stage A PBI起票ワーカー → ② Stage A→B 独立審査ワーカー → ③ Stage B 設計・実装・テストワーカー）ごとに新規プロセス（`agy` CLI / SDK または `autonomous_config.json` で定義されたワーカーコマンドテンプレート／ドライランアダプター）を起動し、工程完了ごとにプロセス・セッションを完全に破棄する。
- **5. 独立レビュアーによる Stage A→B 移行ゲートの物理的強制**:
  - Stage Aを実行した起票エージェント（`pbi-drafter-agent` / `ROLE-PM`）とは完全に別の独立セッションおよび別エージェントID（`stage-gate-reviewer-agent` / `ROLE-ARCH`）で `evaluate_stage_a_to_b_gate` を実行する。
  - `PASS` の場合のみ Stage B へ移行し、`REJECT` 時は最大リトライ回数（既定2回）まで再起票を試行し、上限到達または `ESCALATE` 時は保留（人間判断待ち）として記録して次の未着手Issueへ自動遷移する。
- **6. 自動DoD検査・Pull Request発行・次Issueへの自律遷移**:
  - Stage B完了後、Pythonオーケストレーター側で `npm run build`、単体・システムテスト、および `verify_rtm.py`（RTM断絶0件・Exit Code `0`）のDoD（Definition of Done）検証を実行する。
  - DoD合格時、事前アカウント検証ゲート（`verify_github_identity_gate`）を通過した上で `.github/pull_request_template.md` 準拠のPRドラフト生成（またはPR起票コマンド実行）を行い、該当Issueを完了済みとして記録し、停止することなく次の未対応Issueの選定サイクルへ自動遷移する。
- **7. 運用取扱説明書スライドおよびPDFの更新 (`slides/D01-000002_24H365D自律開発運用取扱説明書`)**:
  - 常駐Pythonオーケストレーター方式（`autonomous_daemon.py` / `run-daemon`）に合わせて `D01-000002_24H365D自律開発運用取扱説明書.md` を更新し、Dockerコンテナ内で `D01-000002_24H365D自律開発運用取扱説明書.pdf` を再生成する。

### 2.2 やらないこと (Out of Scope)
- 人間の承認を経ない `main` ブランチへの直接Force PushやPRの無断自動マージ（PR作成・ドラフト出力とDoD全自動検証までを自律実行範囲とする）。
- 外部有償SaaSへの課金API接続。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 日報スケジュール（`07:30`, `11:50`, `18:00` JST）および週報スケジュール（毎週水曜 `16:00` JST）が設定された環境において、When 常駐オーケストレーターの時計監視・スケジュール判定を実行したとき、Then AIワーカーを介さず決定論的に `docs/reports/daily/` および `docs/reports/weekly/` へ該当スロットのレポートが出力され、同一スロットの二重出力が防止されること。
- [x] **AC-2:** Given `docs/reports/daily/` 配下の日報にメンテナー指示タグ（`[APPROVE: ...]`, `[REJECT: ...]`, `[PRIORITY: #xxx]`）が記入された状態において、When 常駐オーケストレーターが定期フィードバックスキャンを実行したとき、Then 状態管理データの承認ID・差し戻しID・優先Issue順序が自動更新され、次回Issue選定に即時反映されること。
- [x] **AC-3:** Given 複数の未対応Issueが存在するキュー（`--issues-json` 省略時の GitHub REST API 自動取得を含む）およびデフォルト並行上限（`max_concurrent_issues = 1`）において、When 常駐オーケストレーターが1サイクルのタスク実行（Stage A起票 → 独立審査 → Stage B実装 → DoD検証 → PR生成）を処理したとき、Then 1度に並行して取り組むIssueが1件に制限され、Stage A・審査・Stage Bがそれぞれ独立したワーカープロセス呼び出しとして分離実行され、1つのIssueが完了（または `ESCALATE` 保留）した後にプロセスを停止せず次の未対応Issueへ自動遷移すること。
- [x] **AC-4:** Given Stage Aで起票されたPBIに対するStage A→B移行ゲート審査および外部PR発行処理において、When 同一エージェントIDによる自己承認の試行または不正なGitHubアカウントでの外部操作が試行されたとき、Then ゲート審査が `REJECT`（`ERR-VAL-005`）または `IDENTITY-GATE-ABORT` として物理的に拒絶され、またStage A差し戻しが最大リトライ回数（2回）を超過した場合はエラーループに陥らず次Issueへ安全にスキップされること。
- [x] **AC-5:** Given 常駐オーケストレーター実装および設計書・テスト仕様書・RTM・運用取扱説明書スライドの差分更新が完了した状態において、When Dockerコンテナ内で `npm run build`、`npm run build:pdf`、単体・総合テスト、および `verify_rtm.py` を実行したとき、Then ビルドエラー0件、`slides/D01-000002_24H365D自律開発運用取扱説明書/D01-000002_24H365D自律開発運用取扱説明書.pdf` の正常出力、全自動テスト合格、トレーサビリティ断絶0件・設計図書構文違反0件（Exit Code `0`）であること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - `docs/01_requirements/01_requirements_specification.md`（機能要件 `REQ-FNC-013` の追加）
  - `docs/02_basic_design/01_system_architecture.md`, `02_functional_specification.md`, `03_external_interface_specification.md`（方式判断 `ADR-006`, 機能仕様 `FNC-013`, 外部I/F `EXT-CLI-005` の追加）
  - `docs/03_detail_design/01_software_structure_design.md`, `02_internal_interface_specification.md`, `03_program_specification.md`, `05_file_format_specification.md`, `06_data_structure_specification.md`（`MOD-AUT-001`, `INT-AUT-003`, `PRG-AUT-003`, `FN-AUT-005`〜`FN-AUT-007`, `DAT-FIL-005`, `DAT-TYP-011` の追加・更新）
  - `docs/04_test/01_test_specification.md`, `02_test_report.md`（`TEST-UT-008`, `TEST-ST-014` の追加）
  - `docs/05_traceability/01_traceability_matrix.md`（RTM更新）
  - `slides/D01-000002_24H365D自律開発運用取扱説明書/D01-000002_24H365D自律開発運用取扱説明書.md` および `.pdf`
- **DB/外部IF変更の有無:**
  - `scripts/autonomous_daemon.py` の新規作成および `scripts/autonomous_dev_loop.py` への `run-daemon` サブコマンド統合
  - `scripts/autonomous_config.json` へのデーモン周期・ワーカーコマンド設定・DoD検証コマンド設定の追加

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-013` (`REQ-FNC-013-AC01`〜`AC05`), `REQ-NFR-008`
- **追加・更新した設計書/モジュールID:** `ADR-006`, `FNC-013`, `EXT-CLI-005`, `MOD-AUT-001`, `INT-AUT-003`, `PRG-AUT-003`, `FN-AUT-005`, `FN-AUT-006`, `FN-AUT-007`, `DAT-FIL-005`, `DAT-TYP-011`
- **追加・更新したテストID:** `TEST-UT-008` (`TRS-UT-008-R01`), `TEST-ST-014` (`TRS-ST-014-R01`)
- **越境履歴:** 工程5完了後、メンテナー承認のもと工程1〜5へ越境し、`--issues-json` 省略時のGitHub Open Issue自動ポーリング取得および同時並行Issue数上限（デフォルト `max_concurrent_issues = 1`）統制を追記・実装・検証完了。
