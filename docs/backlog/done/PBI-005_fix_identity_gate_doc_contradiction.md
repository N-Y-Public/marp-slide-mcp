---
pbi_id: "PBI-005"
title: "README.md と CONTRIBUTING.md における事前アカウント検証ゲート仕様の矛盾是正および動的化"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-005"]
related_mod_ids: ["MOD-001"]
related_test_ids: ["TEST-IT-004"]
---

# [PBI-005] README.md と CONTRIBUTING.md における事前アカウント検証ゲート仕様の矛盾是正および動的化

> 関連 GitHub Issue: [#6 - fix(security/docs): README.md の Pre-Execution Identity Gate 記述と CONTRIBUTING.md の矛盾是正](https://github.com/N-Y-Public/marp-slide-mcp/issues/6)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 公開OSS（marp-slide-mcp）の外部コントリビューター、クローン利用者、および自律AIエージェント
- **〜したい (I want to):** `README.md` と `CONTRIBUTING.md` の間で生じているアカウント検証仕様（Pre-Execution Identity Gate）の記述・仕様矛盾を解消し、メンテナー環境（`N-Y-Public`）と外部環境（各自のGitHubアカウント）の双方が安全に動作できる動的検証アーキテクチャを利用したい
- **なぜなら (So that):** 
  - 外部開発者が各自のPATとアカウントで安心して開発に参加でき、特定アカウント名の強制や誤認を排除するため
  - メンテナー環境（本番ワークスペース）における個人アカウント誤爆・情報漏洩防止（Q-09）の防衛機構を100%維持するため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **`README.md` の記述是正**:
   - 2.3節「GitHub MCP 連携と PAT 完全分離アーキテクチャ」の「② 安全装置（Pre-Execution Identity Gate）」の記述を外部クローン手順から切り離し、「メンテナー環境におけるデフォルト動作」として位置づけを是正。
   - 外部利用者が自身のPATで開発・操作する場合は、環境変数 `EXPECTED_GITHUB_LOGIN`（任意で `EXPECTED_GITHUB_ID`）を設定することで、自身のアカウント名に対する安全装置として機能する旨を明記。
2. **安全装置（Pre-Execution Identity Gate）の動的化アーキテクチャ**:
   - 行動規範・ルール（`AGENTS.md` / `GEMINI.md` / `.agents/rules/ipa-process-gate.md` / `.agents/skills/github-workflows/SKILL.md`）の検証基準を改定：
     - 期待されるアカウント名: `EXPECTED_GITHUB_LOGIN`（未設定時はメンテナーデフォルト `N-Y-Public`）
     - 期待されるアカウントID: `EXPECTED_GITHUB_ID`（指定時のみ検証、未指定かつアカウント名がデフォルト `N-Y-Public` の場合は `330902043`）
     - 照合判定: `login === EXPECTED_GITHUB_LOGIN`。不一致時は直ちに外部書き込み処理を中断（ABORT）。
3. **マスター設計書の差分更新（Living Documentation）**:
   - 要件定義書（`docs/01_requirements/01_requirements_specification.md` の `REQ-FNC-008-04`）
   - 基本設計書（`docs/02_basic_design/`）
   - 詳細設計書（`docs/03_detail_design/01_architectural_design.md`）
   - 要件追跡マトリクス（`docs/README.md` および `docs/templates/99_traceability_matrix.md`）
4. **動作検証・回帰テスト**:
   - テスト仕様書（`docs/templates/06_test_specification.md`）への追記
   - `verify_rtm.py` による自動検査（断絶0件）

### やらないこと (Out of Scope)
- 安全装置（Pre-Execution Identity Gate）自体の廃止・全削除（アカウント誤爆防止のため必須防衛機構として存続）
- GitHub への push / PR 自動提出（ユーザー指示「プッシュはまだ行うな」を厳守）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 第三者が `README.md` の Docker 設定手順を閲覧した時, When 安全装置の仕様を確認した際, Then `CONTRIBUTING.md` の各自アカウント利用規約と矛盾せず、自身の環境での利用手順が明確に理解できること
- [x] **AC-2:** Given 外部コントリビューターが自身のアカウントで開発を行う環境, When AI エージェントが安全装置（`get_me` 照合）を実行した時, Then メンテナーの固定名義（`N-Y-Public`）を強制されずに環境変数 `EXPECTED_GITHUB_LOGIN` に基づく自身のアカウントとして検証・動作可能であること
- [x] **AC-3:** Given メンテナー環境（本番ワークスペース／環境変数未指定時）, When AI エージェントが操作した時, Then デフォルトとして従来通り `N-Y-Public` (ID: 330902043) への安全照合が担保され、個人アカウントの誤コミット・漏洩が防止されること
- [x] **AC-4:** Given AIエージェントが事前アカウント検証において期待アカウントと一致しない（または取得失敗した）場合, When 外部書き込み処理（Issue/PR作成等）を試みた時, Then 直ちに処理を中断（ABORT）し、アカウント不一致の警告を報告すること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-FNC-008-04`, `REQ-FNC-009-02`, `MOD-INF-001`, `MOD-SKL-001`
- **DB/外部IF変更の有無:** なし（環境変数 `EXPECTED_GITHUB_LOGIN` / `EXPECTED_GITHUB_ID` の動的参照仕様追加）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-008-04`, `REQ-FNC-009-02`, `REQ-NFR-005`
- **追加・更新した設計書/モジュールID:** `docs/01_requirements_specification.md`, `docs/01_functional_specification.md`, `docs/02_external_interface_specification.md`, `docs/01_architectural_design.md` (`MOD-INF-001`, `MOD-SKL-001`, `MOD-001`)
- **追加・更新したテストID:** `TEST-IT-004`
- **検証実績 (Pass Criteria):**
  - AC-1: `README.md` 2.3節「② 安全装置」の記述是正および `CONTRIBUTING.md` 3.3節の整合を確認（矛盾0件）。
  - AC-2: `AGENTS.md`, `GEMINI.md`, `ipa-process-gate.md`, `github-workflows/SKILL.md` において `process.env.EXPECTED_GITHUB_LOGIN` に基づく自律的照合ロジックの定義を確認。
  - AC-3: 環境変数未指定時にメンテナーデフォルト名義（`N-Y-Public` / ID: `330902043`）が厳格適用されるフォールバック動作を確認。
  - AC-4: 不一致時・APIエラー時の直時中断（ABORT）防衛プロトコルの明文化を確認。
  - Dockerコンテナ内ビルド検証: `docker compose run --rm app npm run build`（エラー0件、PASS）。
  - RTM監査: `verify_rtm.py`（トレーサビリティ断絶0件、構文エラー0件、PASS）。 
