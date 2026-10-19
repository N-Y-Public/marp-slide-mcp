---
pbi_id: "PBI-003"
title: "業界標準GitHubテンプレート（Issue/PR）の導入とブランチ運用スキルの整備"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-001", "REQ-NFR-005"]
related_mod_ids: ["MOD-001"]
related_test_ids: ["TEST-IT-003", "TEST-ST-004"]
---

# [PBI-003] 業界標準GitHubテンプレート（Issue/PR）の導入とブランチ運用スキルの整備

> 関連 GitHub Issue: [#2 - feat: 業界標準GitHubテンプレート（Issue/PR）の導入とブランチ運用スキルの整備](https://github.com/N-Y-Public/marp-slide-mcp/issues/2)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 公開OSS（marp-slide-mcp）のコントリビューター（外部開発者およびAIエージェント）
- **〜したい (I want to):** 業界標準に準拠したGitHub Issue/PRテンプレートを利用し、統一されたブランチ命名規則およびエージェント運用スキル（`github-workflows`）を活用したい
- **なぜなら (So that):** 
  - 外部コントリビューターが各自のGitHubアカウントで正しくクレジットを受けながら安全に開発参加できるようにするため（特定アカウント名の強制排除）
  - 人間とAIの双方が高品質かつ再現性の高いIssue起票・PR作成を均一に行い、OSSとしてのプライバシー保護（ホスト絶対パス・機密漏洩の防止）とガバナンスを自動担保するため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **GitHub 標準テンプレート（GitHub Issue Forms & PR Template）の整備**:
   - `.github/ISSUE_TEMPLATE/bug_report.yml`: バグ報告用フォーム（環境情報、再現手順、ログ）
   - `.github/ISSUE_TEMPLATE/feature_request.yml`: 機能追加・改善提案用フォーム（背景、提案、代替案）
   - `.github/ISSUE_TEMPLATE/documentation.yml`: ドキュメント改善用フォーム
   - `.github/ISSUE_TEMPLATE/config.yml`: 空Issue防止（`blank_issues_enabled: false`）および案内設定
   - `.github/pull_request_template.md`: PR標準テンプレート（関連Issue、変更概要、検証内容、機密・ホスト絶対パス除外チェックリスト。外部コントリビューターに特定アカウント名を強要せず、各自のクレジットを尊重）
2. **2層分離されたブランチ運用・コントリビューション規約の明文化**:
   - 命名規則: `{作業種別}/{各自のアカウント名またはAI名}/issue-{issue番号}/{作業説明ケバブケース}`
     - 外部コントリビューター例: `feat/alice/issue-2/github-standard-templates`
     - メンテナー環境（AIエージェント）例: `feat/antigravity-2.0/issue-2/github-standard-templates`
   - `CONTRIBUTING.md` の新設（各自のGitHubアカウント／noreplyメール推奨の案内、Docker開発手順、ブランチ規則）
   - `docs/00_project_charter/02_coding_standards.md` への参照追記
3. **AI エージェント用配布スキル（Agent Skill）の整備**:
   - `.agents/skills/github-workflows/SKILL.md` の新設
     - Issue起票時のテンプレート読み込みとドラフト自動作成
     - 定義されたブランチ命名規則の自動適用
     - Git Author / noreplyメール推奨の自動確認とPR文面生成
4. **IPAミクロ工程（要件差分・方式設計差分・詳細設計差分・実装・テスト・RTM検証）の完遂**:
   - `verify_rtm.py` によるトレーサビリティ断絶 0 件の達成

### やらないこと (Out of Scope)
- 外部コントリビューターに対してリポジトリメンテナーの特定アカウント名（`N-Y-Public`）を強制すること（各コントリビューター自身の真正性・クレジットを100%尊重）
- GitHub リポジトリ設定画面での外部 Webhook 連携やサードパーティBotの直接セットアップ
- GitHub Actions CIワークフローの新規作成（既存のDocker運用ルールを優先）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given GitHubリポジトリの `.github/ISSUE_TEMPLATE/` 配下, When コントリビューターがIssue作成画面を開いた時, Then `bug_report.yml`, `feature_request.yml`, `documentation.yml` の各フォームが選択肢として提示され、かつ空Issueの作成が無効化（`blank_issues_enabled: false`）されていること
- [x] **AC-2:** Given Pull Requestを作成する環境, When `.github/pull_request_template.md` が読み込まれた時, Then 関連Issue番号、変更概要、検証内容、およびホスト絶対パス・機密除外チェックリストが含まれ、特定のAuthor名を強要していないこと
- [x] **AC-3:** Given 開発作業を開始するコントリビューターまたはAI, When ブランチを作成する時, Then `{作業種別}/{アカウントまたはAI名}/issue-{issue番号}/{説明}` の命名規則が `CONTRIBUTING.md` に定義されており、各自のアカウント名に応じた準拠ブランチ名が導出できること
- [x] **AC-4:** Given `.agents/skills/github-workflows/SKILL.md` が配備された状態, When エージェントがIssue起票・ブランチ命名・PR作成を行う時, Then テンプレートに準拠したテキストが生成され、Git設定（noreplyメール推奨等）の確認手順が提供されること
- [x] **AC-5:** Given 上記の設計・実装・テストが完了した状態, When `verify_rtm.py` を実行した時, Then `PBI-003` ↔ `REQ-*` ↔ `MOD-*` ↔ `TEST-*` の双方向追跡性が断絶0件で成立し、テスト仕様書およびRTMが整合していること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - 要件: `REQ-FNC-009`（新規: GitHub標準運用・エージェントスキル支援機能）
  - 方式設計: `EXT-DOC-001`（GitHub Issue/PRテンプレート・貢献規約）
  - 詳細設計: `MOD-SKL-001`（エージェント運用スキルおよびテンプレート群）
- **DB/外部IF変更の有無:** DB変更なし。外部ファイル構成として `.github/` および `.agents/skills/github-workflows/` が追加。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-009`
- **追加・更新した設計書/モジュールID:** `EXT-DOC-001` / `MOD-SKL-001` / `PRG-SKL-001`
- **追加・更新したテストID:** `TEST-IT-003`, `TEST-ST-004`
- **検証実績 (Pass Criteria):**
  - AC-1: `.github/ISSUE_TEMPLATE/` 配下に `bug_report.yml`, `feature_request.yml`, `documentation.yml`, `config.yml`（`blank_issues_enabled: false`）を作成・検証完了。
  - AC-2: `.github/pull_request_template.md` を作成し、外部コントリビューターへの特定名強要を排除しつつ機密・絶対パス排除の確認項目を装備。
  - AC-3: `CONTRIBUTING.md` および `docs/00_project_charter/02_coding_standards.md` にブランチ命名フォーマットと2層分離を明記。
  - AC-4: `.agents/skills/github-workflows/SKILL.md` を作成し、Issue Forms読み込み・ブランチ命名・PR生成・Git設定確認の支援手順を整備。
  - AC-5: Docker環境内テストおよび `verify_rtm.py` によるトレーサビリティ検証完了。
