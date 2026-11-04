---
name: ipa-traceability-validator
description: >-
  Validate bidirectional requirement traceability (PBI-* <-> REQ-* <-> MOD-* <-> TEST-*) across IPA design
  documents, backlog PBIs, and templates using the automated verification script (verify_rtm.py). Use at phase
  gates, after updating requirements/design/test specifications for a PBI, or before committing changes.
---

# IPA 要件追跡性（トレーサビリティ）検証スキル (`ipa-traceability-validator`)

本スキルは、**IPA共通フレーム2013（SLCP-JCF2013）** および `claude-code-project-pack` の品質基準 **Q-03（トレーサビリティ断絶 0件）** を機械的に担保するため、プロダクトバックログ（`PBI-*`）、要件定義（`REQ-*`）、モジュール設計（`MOD-*`）、テスト仕様（`TEST-*`）、および要件追跡マトリクス（RTM）の双方向整合性を**差分更新（Living Documentation）**・検証する手順を定める。

> **基本信条**: 「トレーサビリティマトリクスはそのまま監査証跡（Audit Trail）になる。『どのPBIで追加・変更されたか不明な変更』『実装されない要件』『根拠なきモジュール』『テストされない要件』を機械検査でゼロにする。」

---

## 0. PBI駆動・差分更新モード（Living Documentation 標準動作）

1. **RTMへの `PBI_ID` カラム差分反映**:
   - 指定された `PBI-xxx` の完了時、`docs/05_traceability/01_traceability_matrix.md`（および `docs/README.md`）の該当要件行の `PBI` カラムに `PBI-xxx` を追記・更新し、どのPBIによってどの要件（`REQ-*`）・モジュール（`MOD-*`）・テスト（`TEST-*`）が追加・変更されたかを記録する。
2. **PBIファイルとRTMの双方向整合性検証**:
   - `verify_rtm.py` を実行し、`docs/backlog/{todo,in_progress,done}/` 内のPBI定義と `01_traceability_matrix.md` の `PBI` ↔ `REQ-*` ↔ `MOD-*` ↔ `TEST-*` に断絶がないことを機械検査する。

---

## 1. 参照・更新対象ドキュメントおよびスクリプト

### 検証スクリプト（自動検査エンジン）
- **RTM整合性検査スクリプト**: `@[.agents/skills/ipa-traceability-validator/scripts/verify_rtm.py](./scripts/verify_rtm.py)`

### PBIバックログおよび参照・更新テンプレート
- **PBI管理ディレクトリ**: `docs/backlog/todo/`, `docs/backlog/in_progress/`, `docs/backlog/done/`
- **PBIテンプレート**: `@[docs/templates/tpl_98_pbi_template.md](../../../docs/templates/tpl_98_pbi_template.md)`
- **要件追跡マトリクス (RTM) テンプレート**: `@[docs/templates/tpl_01_traceability_matrix.md](../../../docs/templates/tpl_01_traceability_matrix.md)`
- **要件定義テンプレート**: `@[docs/templates/tpl_01_requirements_specification.md](../../../docs/templates/tpl_01_requirements_specification.md)`
- **ソフトウェア構造設計テンプレート**: `@[docs/templates/tpl_01_software_structure_design.md](../../../docs/templates/tpl_01_software_structure_design.md)`
- **テスト仕様書テンプレート**: `@[docs/templates/tpl_01_test_specification.md](../../../docs/templates/tpl_01_test_specification.md)`

### 本リポジトリの正本設計図書（検査対象）
- **設計図書統合インデックス**: `@[docs/README.md](../../../docs/README.md)`
- **要件追跡マトリクス（正本）**: `@[docs/05_traceability/01_traceability_matrix.md](../../../docs/05_traceability/01_traceability_matrix.md)`
- **要件定義書**: `@[docs/01_requirements/01_requirements_specification.md](../../../docs/01_requirements/01_requirements_specification.md)`
- **基本設計書群**:
  - `@[docs/02_basic_design/01_system_architecture_design.md](../../../docs/02_basic_design/01_system_architecture_design.md)`
  - `@[docs/02_basic_design/02_functional_specification.md](../../../docs/02_basic_design/02_functional_specification.md)`
  - `@[docs/02_basic_design/03_external_interface_specification.md](../../../docs/02_basic_design/03_external_interface_specification.md)`
- **詳細設計書群**:
  - `@[docs/03_detail_design/01_software_structure_design.md](../../../docs/03_detail_design/01_software_structure_design.md)`
  - `@[docs/03_detail_design/02_internal_interface_specification.md](../../../docs/03_detail_design/02_internal_interface_specification.md)`
  - `@[docs/03_detail_design/03_program_specification.md](../../../docs/03_detail_design/03_program_specification.md)`
  - `@[docs/03_detail_design/06_data_structure_specification.md](../../../docs/03_detail_design/06_data_structure_specification.md)`
  - `@[docs/03_detail_design/07_screen_specification.md](../../../docs/03_detail_design/07_screen_specification.md)`
- **テスト層**:
  - `@[docs/04_test/01_test_specification.md](../../../docs/04_test/01_test_specification.md)`
  - `@[docs/04_test/02_test_report.md](../../../docs/04_test/02_test_report.md)`
- **工程統制ルール**: `@[.agents/rules/ipa-process-gate.md](../../rules/ipa-process-gate.md)`

---

## 2. 検査対象ID体系と双方向追跡ルール

本スキルおよび `verify_rtm.py` は、以下のIDプレフィックスを対象として前方追跡（Forward Traceability）および後方追跡（Backward Traceability）の完全性を検証する。

| ID種別 | 正規表現パターン | 定義元（正本） | 必須追跡条件（Q-03基準） |
| :--- | :--- | :--- | :--- |
| **PBI ID (`PBI`)** | `PBI-\d{3}` | `docs/backlog/{todo,in_progress,done}/PBI-*.md`<br>（初期構築ベースラインは `PBI-000`） | すべてのRTM行に `PBI` が記録され、完了済み（`done`）PBIの `related_req_ids` / `related_mod_ids` / `related_test_ids` がRTMと完全一致すること |
| **要件ID (`REQ`)** | `REQ-(?:FNC\|NFR)-\d{3}` | `01_requirements_specification.md`<br>`docs/01_requirements/` | すべての要件がRTMに登録され、少なくとも1つの `PBI-*`, `MOD-*`（または設計要素）および `TEST-*` に紐付いていること |
| **モジュールID (`MOD`)** | `MOD-(?:[A-Z]{3}-)?\d{3}` | `01_software_structure_design.md`<br>`docs/03_detail_design/` | すべてのモジュールがRTMに登録され、根拠となる `REQ-*` に紐付いていること（孤立モジュール禁止） |
| **テストID (`TEST`)** | `TEST-(?:UT\|IT\|ST-)?\d{3}` | `01_test_specification.md`<br>`docs/04_test/` | すべてのテストケースが検証根拠となる `REQ-*`（および該当する `MOD-*`）を引用していること（根拠なきテスト禁止） |

---

## 3. 実行ワークフロー（3ステップ手順）

### Step 1: 自動検証スクリプトの実行（Dockerコンテナ内必須）
本リポジトリのルール（Docker環境限定実行）に従い、以下のコマンドで `verify_rtm.py` を実行する：

```bash
# デフォルト実行（docs/ 正本設計図書および docs/templates/ の両方を自動検査）
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py

# テンプレート群（docs/templates/）のみを対象に厳格検査する場合
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py --mode templates

# Markdown形式の監査レポートを標準出力に生成する場合
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py --format markdown
```

### Step 2: 断絶・不整合の分析と是正
`verify_rtm.py` がエラー（Exit Code `1`）または警告を出力した場合は、以下の分類に従って原因を特定し是正する：
1. **未追跡の要件（Untraced Requirement: `REQ` → `MOD`/`TEST` 欠落）**:
   - 要件定義書に存在する `REQ-*` が `01_traceability_matrix.md`（または `docs/README.md`）に存在しない、または対応する設計モジュール・テストケースが割り当てられていない。
   - **対処**: `ipa-detail-designer` で対応モジュールを設計するか、`ipa-qa-engineer` で対応テストケースを追加し、RTMを更新する。
2. **孤立モジュール（Orphan Module: `MOD` → `REQ` 欠落）**:
   - 詳細設計書で定義された `MOD-*` がどの要件IDにも紐付いていない（スコープ外の勝手な作り込みの疑い）。
   - **対処**: 根拠となる `REQ-*` に紐付けるか、不要なモジュールを削除する。
3. **未定義IDの参照（Dangling Reference）**:
   - テスト仕様書やRTMが、要件定義書や詳細設計書に実在しない `REQ-*` / `MOD-*` / `TEST-*` を参照している（採番ミス・転記ミス）。
   - **対処**: 定義元のIDと照合してタイポを修正する。

### Step 3: 要件追跡マトリクス（RTM）の更新と再検証
1. `@[docs/05_traceability/01_traceability_matrix.md](../../../docs/05_traceability/01_traceability_matrix.md)` および `@[docs/README.md](../../../docs/README.md)` のマトリクス表を最新状態に更新する。
2. 再度 `verify_rtm.py` を実行し、**断絶件数 0件（Exit Code `0`）** であることを確認してからゲート判定へ進む。

---

## 4. 完了判定チェックリスト（Definition of Done）

- [ ] `docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py` が Exit Code `0` で正常終了したか。
- [ ] 前方追跡率（`REQ` → `MOD` → `TEST` カバレッジ）が **100%** であるか。
- [ ] 後方追跡（未定義の `REQ-*` / `MOD-*` / `TEST-*` への不正参照）が **0件** であるか。
- [ ] 検査結果の数値（検査対象REQ数、MOD数、TEST数、断絶件数 0件）をゲート判定レポートに明記したか。

> **設計図書の記述規約**: 設計図書の記述は `docs/00_project_charter/03_documentation_standard.md`（`DOC-GOV-003`）と `docs/00_project_charter/04_id_numbering_rules.md`（`DOC-GOV-004`）に従い、図書別の章構造は `docs/templates/tpl_*.md` を正本とする。規約適合は `verify_doc_syntax.py`（`verify_rtm.py` から呼び出し）で機械検査する。
