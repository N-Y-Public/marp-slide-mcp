---
pbi_id: "PBI-019"
title: "24H365D自律開発マルチエージェント統制と日報（1日3回）・週報（毎週水曜16:00）テンプレート機構の構築"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-FNC-011", "REQ-NFR-008"]
related_mod_ids: ["MOD-AUT-001"]
related_test_ids: ["TEST-UT-005", "TEST-ST-011"]
---

# [PBI-019] 24H365D自律開発マルチエージェント統制と日報（1日3回）・週報（毎週水曜16:00）テンプレート機構の構築

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 本OSSリポジトリを限られた時間でボランティア・メンテナンスするメンテナー、およびプロジェクトとりまとめ（上位マネジメント）
- **〜したい (I want to):** 人間がIssueごとに手動で都度指示を出したり優先度を判断したりしなくても、複数の自律AIエージェント（起票エージェントと独立したゲート審査エージェント等）が役割分担して未着手Issueの優先度判定・PBI起票・独立ゲート審査・設計・実装・テスト・PR準備までを24H365D自律遂行し、メンテナー向けには1日3回（07:30 / 11:50 / 18:00）の日報をテンプレートから生成し、プロジェクトとりまとめ（上司層）向けには週1回（毎週水曜 16:00）に「課題/先週の宿題・解決策・結果・新たな宿題と期限」が一目でわかる週報をテンプレートから生成する仕組みを構築したい
- **なぜなら (So that):** 人間とAIが同期的・常時接続で作業する必要をなくし、Stage A→Stage B移行時にも別エージェントによる厳格な相互牽制（生成と検証の分離）を効かせながら安全に開発を進め、メンテナーおよびプロジェクトとりまとめ双方がそれぞれの粒度で非同期に状況把握・意思決定できるようにするため（Issue #22）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **マルチエージェント分離統制による24H365D自律開発オーケストレーション (`scripts/autonomous_dev_loop.py`)**:
  - **Issue自動走査・優先度キュー解析**:
    - GitHub Issue一覧（またはローカルバックログ/モック入力）から未対応Issueを走査し、ラベル（`priority:high`, `bugfix`, `feature`）および依存関係（`blocked_by`, `blocking`）に基づき着手順序を自動決定する。
  - **Stage A 起票エージェント (`pbi-drafter-agent` / `ROLE-PM`) と Stage A→B 独立ゲート審査エージェント (`stage-gate-reviewer-agent` / `ROLE-ARCH`) の分離**:
    - Stage Aを実行した起票エージェントとは異なる独立したレビュアーエージェントが、起票された `PBI-xxx.md` のフォーマット準拠性、Given-When-Then形式ACの検証可能性、曖昧語排除、スコープ妥当性を厳格審査し、`PASS` / `REJECT`（最大2回差し戻し） / `ESCALATE`（人間判断待ちとして日報へ計上し次Issueへ移行）を判定するゲート機構を実装する。
  - **Stage B 設計・実装エージェント (`ROLE-DEV`) と 独立QA・RTM監査エージェント (`ROLE-QA`) の分離**:
    - Stage A→Bゲートで `PASS` したPBIのみを対象に、要件・設計差分更新〜実装〜Docker内ビルド〜テスト実行〜 `verify_rtm.py` 双方向追跡監査を実行する。
- **日報テンプレート (`docs/templates/tpl_96_daily_report.md`) と1日3回（07:30 / 11:50 / 18:00 JST）の自動生成機構 (`scripts/generate_reports.py`)**:
  - 対象読者をリポジトリメンテナー（`ROLE-MAINTAINER`）とし、1日3回（`07:30` 朝刊 / `11:50` 昼刊 / `18:00` 夕刊）のスケジュール設定に基づき、`docs/templates/tpl_96_daily_report.md` から `docs/reports/daily/YYYY-MM-DD_{morning|midday|evening}.md` を生成する。
  - 完了PBI、Stage A→B審査状況、品質ゲート実測値（ビルド・テスト合格数・RTM断絶0件）、メンテナーへの判断依頼事項（`ASM-NNN` 等）、およびメンテナーコメント記入欄（`[APPROVE: ...]`, `[REJECT: ...]`, `[PRIORITY: ...]`）を備える。
- **週報テンプレート (`docs/templates/tpl_97_weekly_report.md`) と毎週水曜 16:00 JST の自動生成機構 (`scripts/generate_reports.py`)**:
  - 対象読者をプロジェクトとりまとめ・上位マネジメント（`ROLE-PROJECT-DIRECTOR`）とし、毎週水曜日 `16:00` JST に日報と併せて `docs/templates/tpl_97_weekly_report.md` から `docs/reports/weekly/YYYY-Wnn_weekly_report.md` を生成する。
  - コード細部や内部関数名は排除し、**「①何が課題または先週からの宿題だったか」「②どのような解決を行ったか」「③結果がどうだったか（定量的効果）」「④新たな宿題事項はいつまでの何なのか（期限と担当）」**および「上位マネジメントへの相談・エスカレーション事項」が一目でわかる表構成とする。
- **非同期フィードバック解析・スケジュール設定管理 (`scripts/autonomous_config.json`)**:
  - 日報の3回スケジュール（`07:30`, `11:50`, `18:00`）、週報のスケジュール（`WED`, `16:00`）、マルチエージェント審査強制フラグを設定ファイルで一元管理する。
  - 日報に記入されたメンテナーコメントを解析し、次回自律ループの優先度キューや承認ステータスへ反映する。
- **迂回不能な安全弁（ガードレール）の統合**:
  - 外部GitHub操作前の `Pre-Execution Identity Gate`（`N-Y-Public` / ID: `330902043`）強制検証。
  - 個人実名・ホスト固有絶対パス・非日本語文字混入ゼロ検証（Q-09）。
  - `verify_rtm.py`（Exit Code `0`）合格を完了の必須条件とする安全設計。

### 2.2 やらないこと (Out of Scope)
- 外部有償SaaS（有償版Jira、有償ガントチャートSaaS等）への直接課金API接続（将来の拡張に向けた設定・データ構造のみ定義）。
- 人間の承認を経ない直接のmainブランチへの未承認Force Pushや自動マージ（自律AIは作業ブランチでのPR準備・全自動検証合格までを担当し、最終マージは人間の承認下で実施）。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 複数の未対応Issue（優先度ラベルや依存関係を含む）と起票されたPBIドラフトが存在する環境において、When 自律開発オーケストレーターのIssue選定およびStage A→Bゲート審査を実行したとき、Then 依存関係でブロックされていない最高優先度Issueが選定され、かつ起票エージェント（`ROLE-PM`）とは異なる独立した審査エージェント（`ROLE-ARCH`）による審査（`PASS` / `REJECT` / `ESCALATE`）を通過したPBIのみがStage Bへ移行できること（同一エージェントによる自己承認はエラーとして拒否されること）。
- [x] **AC-2:** Given 日報テンプレート（`docs/templates/tpl_96_daily_report.md`）および1日3回（`07:30`, `11:50`, `18:00` JST）のスケジュール設定が存在する環境において、When 日報生成コマンドを各時間枠（朝刊 `07:30` / 昼刊 `11:50` / 夕刊 `18:00`）で実行したとき、Then テンプレートの全必須章（ハイライト、メンテナー判断依頼事項、完了・進行中タスクと独立審査結果、次回着手キュー、メンテナーコメント記入欄）を保持した日報Markdownが `docs/reports/daily/` 配下に生成されること。
- [x] **AC-3:** Given 週報テンプレート（`docs/templates/tpl_97_weekly_report.md`）および毎週水曜 `16:00` JST のスケジュール設定が存在する環境において、When 水曜 `16:00` のスケジュール判定または週報生成コマンドを実行したとき、Then プロジェクトとりまとめ（上司層）向けに「何が課題または先週からの宿題か」「どのような解決を行ったか」「結果がどうだったか」「新たな宿題事項はいつまでの何なのか」および「上位マネジメントへの相談・エスカレーション事項」が構造化された週報Markdownが `docs/reports/weekly/` 配下に日報と併せて生成されること。
- [x] **AC-4:** Given 日報または状態管理ファイルにメンテナーからの非同期指示コメント（`[APPROVE: ...]`, `[REJECT: ...]`, `[PRIORITY: ...]`）が記入されたとき、When 自律開発オーケストレーターがフィードバック解析を実行したとき、Then 指示内容が正確にパースされて保留中PBIの承認状態や次回着手キューの優先順位に反映され、かつGitHub外部操作前の `Pre-Execution Identity Gate` 検証が正常に機能すること。
- [x] **AC-5:** Given 新規テンプレート、スクリプト、設計書差分、およびガバナンスルールが追加されたリポジトリにおいて、When Dockerコンテナ内で `npm run build`、自動検証テスト、および `verify_rtm.py` を実行したとき、Then ビルドエラー0件、テスト全件合格、トレーサビリティ断絶0件・構文違反0件（Exit Code `0`）であること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - `docs/00_project_charter/04_id_numbering_rules.md`（分類コード `AUT` の追加）
  - `docs/01_requirements/01_requirements_specification.md`（業務要件 `REQ-BIZ-003`、機能要件 `REQ-FNC-007`、非機能要件 `REQ-NFR-006` の追加）
  - `docs/02_basic_design/01_system_architecture.md`（方式判断 `ADR-005` の追加）
  - `docs/02_basic_design/02_functional_specification.md`（機能仕様 `FNC-007` の追加）
  - `docs/02_basic_design/03_external_interface_specification.md`（CLI外部I/F `EXT-CLI-003`, `EXT-CLI-004` およびエラー定義の追加）
  - `docs/03_detail_design/01_software_structure_design.md`（モジュール `MOD-AUT-001` の追加）
  - `docs/03_detail_design/02_internal_interface_specification.md`（内部I/F `INT-AUT-001`, `INT-AUT-002` の追加）
  - `docs/03_detail_design/03_program_specification.md`（プログラム `PRG-AUT-001`, `PRG-AUT-002`、関数 `FN-AUT-001`〜`FN-AUT-004` の追加）
  - `docs/03_detail_design/05_file_format_specification.md`（設定・状態ファイル形式 `DAT-FIL-005` の追加）
  - `docs/03_detail_design/06_data_structure_specification.md`（自律統制・レポート構造体 `DAT-TYP-006`, `DAT-TYP-007` の追加）
  - `docs/04_test/01_test_specification.md` & `02_test_report.md`（`TEST-UT-005`, `TEST-ST-011` の追加と実行結果記録）
  - `docs/05_traceability/01_traceability_matrix.md`（RTM更新）
- **DB/外部IF変更の有無:**
  - `docs/templates/tpl_96_daily_report.md`（日報正本テンプレート）の新規作成
  - `docs/templates/tpl_97_weekly_report.md`（週報正本テンプレート）の新規作成
  - `scripts/autonomous_config.json`（日報07:30/11:50/18:00・週報水曜16:00・マルチエージェント統制設定）の新規作成
  - `scripts/autonomous_dev_loop.py`（マルチエージェント自律開発オーケストレーター）の新規作成
  - `scripts/generate_reports.py`（テンプレート駆動の日報・週報生成ツール）の新規作成
  - `.agents/skills/ipa-pbi-orchestrator/SKILL.md` および `.agents/rules/ipa-process-gate.md` へのマルチエージェントStage A→B審査ルール反映

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-BIZ-004`, `REQ-FNC-011` (`REQ-FNC-011-AC01`〜`AC04`), `REQ-NFR-008`
- **追加・更新した設計書/モジュールID:** `ADR-005`, `FNC-011`, `EXT-CLI-003`, `EXT-CLI-004`, `ERR-VAL-005`, `MOD-AUT-001`, `INT-AUT-001`, `INT-AUT-002`, `PRG-AUT-001`, `PRG-AUT-002`, `FN-AUT-001`, `FN-AUT-002`, `FN-AUT-003`, `FN-AUT-004`, `DAT-FIL-005`, `DAT-FIL-006`, `DAT-TYP-008`, `DAT-TYP-009`
- **追加・更新したテストID:** `TEST-UT-005` (`TRS-UT-005-R01`), `TEST-ST-011` (`TRS-ST-011-R01`)
