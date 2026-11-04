---
pbi_id: "PBI-015"
title: "機能要望IssueテンプレートにおけるWhyとWhoの入力枠分離"
type: "enhancement" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "medium" # high | medium | low
related_req_ids: ["REQ-FNC-009", "REQ-NFR-005"]
related_mod_ids: ["MOD-SKL-001"]
related_test_ids: ["TEST-IT-005"]
---

# [PBI-015] 機能要望IssueテンプレートにおけるWhyとWhoの入力枠分離

> 関連 GitHub Issue: [#20 - docs: 機能追加の要望IssueのテンプレについてWhyとWhoが一緒の枠になっているのを分離](https://github.com/N-Y-Public/marp-slide-mcp/issues/20)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** `marp-slide-mcp` リポジトリに機能要望や改善提案を起票するコントリビューター（外部開発者およびAIエージェント）
- **〜したい (I want to):** GitHub Issue の機能要望フォーム（`feature_request.yml`）において、「誰のための機能か（Who）」と「なぜ必要なのか・どのような課題があるのか（Why）」を独立した専用の入力枠にそれぞれ記入できるようにしたい
- **なぜなら (So that):** 
  - 現状のテンプレートでは「関連する課題・背景 (Why & Who)」として1つのテキストエリア枠にまとめられており、対象ユーザー（Who）または課題背景（Why）のいずれかが記入漏れしやすくなっている
  - PBI（Product Backlog Item）駆動アジャイル開発では「As a [Who], I want [What], So that [Why]」のユーザーストーリー構造が品質・スコープ定義の基盤となるため、起票時点でWhoとWhyを明確に分離して収集することで、PBI起票時の曖昧さ排除と仕様化の精度・速度を大幅に向上させるため
  - ※なお先行ブランチ `feat/antigravity-2.0/issue-19/complete-pptx-export` にて `PBI-014`（ネイティブPPTX変換）が定義されているため、図書類・バックログのコンフリクトを回避すべく本PBIを `PBI-015` として採番・管理する

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
1. **GitHub Issue フォーム（`feature_request.yml`）の入力枠分離**:
   - 既存の「関連する課題・背景 (Why & Who)」（id: `problem`）を以下の2つの独立した入力枠に分割：
     - **Who枠**:
       - `id`: `who`
       - `label`: `対象ユーザー・アクター (Who)`
       - `description`: `この機能は誰のためのものですか？ どのような立場のユーザーが使用しますか？`
       - `placeholder`: `例: スライド作成者、登壇者、AIエージェントと協調して発表資料を作成するコンサルタント`
       - `validations.required`: `true`
     - **Why枠**:
       - `id`: `problem` (既存の互換性を考慮)
       - `label`: `関連する課題・背景 (Why)`
       - `description`: `現在どのような課題や不便がありますか？ なぜこの機能や変更が必要ですか？`
       - `placeholder`: `例: 発表者用ノート（Speaker Notes）をMarkdown内に記述しても、PDF/PPTX出力時に保持されず手作業での再入力が発生してしまう。`
       - `validations.required`: `true`
   - 入力項目の順序を「Who（対象ユーザー）」→「Why（課題・背景）」→「What（提案解決策）」の論理的順序に配置。
2. **AIエージェント運用スキル（`github-workflows`）の整合性更新**:
   - `.agents/skills/github-workflows/SKILL.md` の機能要望起票説明において、WhoとWhyの個別抽出・整理に対応する記述へ更新。
3. **マスター設計書の差分更新（Living Documentation）**:
   - 要件定義書（`docs/01_requirements/01_requirements_specification.md` の `REQ-FNC-009`）への差分追記
   - 詳細設計書（`docs/03_detail_design/01_subsystems/skills/MOD-SKL-001.md` 等）の差分更新
   - テスト仕様書（`docs/templates/06_test_specification.md` の `TEST-IT-003`）のテストケース追加
   - 要件追跡マトリクス（`docs/README.md` および `docs/templates/99_traceability_matrix.md`）の整合性確認
4. **検証とRTM監査**:
   - `verify_rtm.py` による双方向トレーサビリティ断絶 0 件の維持。
   - `npm run build` によるビルドエラー 0 件の確認。

### 2.2 やらないこと (Out of Scope)
- `bug_report.yml` や `documentation.yml` のフォーム構造変更（今回は `feature_request.yml` のみが対象）
- 外部IssueやPRへの自動書き込み（手動・ローカル検証に留める）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given GitHubリポジトリの `.github/ISSUE_TEMPLATE/feature_request.yml`, When コントリビューターが機能要望Issue作成画面を開いた時, Then 「対象ユーザー・アクター (Who)」と「関連する課題・背景 (Why)」が別々のテキストエリア枠として表示され、双方が必須入力（`required: true`）となっていること
- [x] **AC-2:** Given `.github/ISSUE_TEMPLATE/feature_request.yml`, When フォームの各項目を確認した時, Then 提示順序が「Who（対象ユーザー）」→「Why（課題・背景）」→「What（提案する解決策）」の論理的フローになっており、それぞれ適切な説明文およびプレースホルダーが設定されていること
- [x] **AC-3:** Given `.agents/skills/github-workflows/SKILL.md`, When コントリビューターまたはAIが機能要望起票ガイドを参照した時, Then Who（対象ユーザー）、Why（背景・課題）、What（提案機能）を独立して整理・案内する記述に改定されていること
- [x] **AC-4:** Given マスター設計書群およびテンプレート群, When 本改善（PBI-015）の差分更新を行った時, Then `REQ-FNC-009` / `MOD-SKL-001` / `TEST-IT-003` 間のトレーサビリティが担保され、`verify_rtm.py` の検査で断絶 0 件（PASS）となること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - 要件: `REQ-FNC-009`（GitHub標準運用・エージェントスキル支援機能）
  - 方式設計: `EXT-DOC-001`（GitHub Issue/PRテンプレート・貢献規約）
  - 詳細設計: `MOD-SKL-001`（エージェント運用スキルおよびテンプレート群）
- **DB/外部IF変更の有無:** DB変更なし。`.github/ISSUE_TEMPLATE/feature_request.yml` のフォームフィールド変更。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-009`（マスター）, `REQ-F-001`, `REQ-NFR-005`（テンプレート標準）
- **追加・更新した設計書/モジュールID:** `EXT-DOC-001`, `MOD-SKL-001`, `PRG-SKL-001`
- **追加・更新したテストID:** `TEST-IT-003`
- **検証実績 (Pass Criteria):**
  - AC-1 & AC-2: `.github/ISSUE_TEMPLATE/feature_request.yml` にてWho（対象ユーザー）とWhy（課題・背景）を独立テキストエリア（`required: true`）へ分割し、Who → Why → What 順で配置完了。
  - AC-3: `.agents/skills/github-workflows/SKILL.md` の機能要望起票ガイドを更新し、Who/Why/What/代替案の個別整理手順を反映。
  - AC-4: マスター設計書およびテンプレート標準設計書、RTM（`docs/README.md`, `docs/templates/99_traceability_matrix.md`）の差分更新完了。`verify_rtm.py` で断絶0件（PASS）、Docker内ビルド（`npm run build`, `npm run build:pdf`）正常完了。
  - 先行ブランチ `feat/antigravity-2.0/issue-19/complete-pptx-export` の `PBI-014` との重複・コンフリクトを回避し、`PBI-015` として整合完了。
