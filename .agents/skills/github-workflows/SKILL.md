---
name: github-workflows
description: Automate GitHub Issue drafting, branch naming convention enforcement, and PR template generation for OSS development with multi-tier identity protection.
---

# GitHub 運用支援スキル (`github-workflows`)

本スキルは、`marp-slide-mcp` リポジトリにおいて、コントリビューター（外部開発者およびAIエージェント）が**業界標準のGitHubワークフロー（Issue起票・ブランチ命名・PR作成）**を円滑かつ規約準拠で実行するための運用支援スキルである。

---

## 1. コア設計理念（2層分離アイデンティティ統制）

1. **外部コントリビューターの権利・クレジットの尊重**:
   - 外部開発者がコントリビュートする際、特定の固定アカウント名（メンテナーのアカウント等）を強制することは一切行わない。
   - 各自のGitHubアカウントおよびメールアドレス（プライバシー保護目的でGitHub noreplyメール推奨）でのコミットを完全サポートする。
2. **メンテナー環境（AIエージェント）の内部防衛**:
   - メンテナー環境で動作する自律AIエージェントが作業を行う場合は、プライベートな実名や個人メールアドレスの漏洩を防止するため、公開専用アカウント（`N-Y-Public` / noreplyメール）を安全に適用する。

---

## 2. ワークフロー機能一覧

### 2.1 Issue 起票ドラフト生成
コントリビューターまたはAIがIssueを起票する際、`.github/ISSUE_TEMPLATE/` 配下の公式Issue Formsを読み込み、適切なドラフトMarkdownを自動生成する。

- **バグ報告**: `bug_report.yml` の構造に沿って、問題概要、再現手順、期待される挙動、動作環境、ログ（マスク済み）を整理。
- **機能要望**: `feature_request.yml` の構造に沿って、Why & Who（背景と課題）、What（提案機能）、代替案を整理。
- **ドキュメント改善**: `documentation.yml` の構造に沿って、対象文書と改善内容を整理。

### 2.2 ブランチ命名規則の自動導出
作業対象のIssue番号と作業種別に基づき、リポジトリ統一のブランチ名を自動生成する。

#### フォーマット
```text
{作業種別}/{アカウント名またはAI名}/issue-{issue番号}/{作業説明ケバブケース}
```

| 構成要素 | 説明 | 指定例 |
| :--- | :--- | :--- |
| **作業種別 (`type`)** | コミット種別に対応 | `feat`, `fix`, `docs`, `refactor`, `test`, `chore` |
| **アカウント/AI名** | 各自のGitHubアカウント名、またはAI識別子 | `alice`, `bob`, `antigravity-2.0` |
| **issue番号** | 関連するGitHub Issue番号 | `issue-2`, `issue-10` |
| **作業説明** | ハイフン区切りの英語小文字（ケバブケース） | `github-standard-templates` |

#### ブランチ作成コマンド例
```bash
# 外部開発者（Aliceさん）が Issue #2 の機能追加ブランチを作成する場合
git checkout -b feat/alice/issue-2/github-standard-templates

# メンテナー環境のAIエージェントが作業する場合
git checkout -b feat/antigravity-2.0/issue-2/github-standard-templates
```

### 2.3 Git Author 設定確認（プライバシー保護）
コミット前にGitのユーザー設定を確認し、プライベートな個人メールの露出を防ぐ案内を提供する。

```bash
# 現在のコミッター設定を確認
git config user.name
git config user.email

# プライバシー保護のための GitHub noreply メール設定（推奨）
# ※ <id>+<username> は GitHub Settings -> Emails -> "Keep my email addresses private" で確認できます
git config user.email "<id>+<username>@users.noreply.github.com"
```

### 2.4 Pull Request ドラフト自動生成
作業完了後、`.github/pull_request_template.md` の全セクションを満たすPR文面を自動生成する。

- 関連Issue番号（`Closes #xxx` または `Refs #xxx`）および対応PBIファイルへの相対リンク。
- 変更概要（変更理由と実装内容の箇条書き）。
- 実施した検証エビデンス（Docker内ビルド `npm run build`、RTM検査 `verify_rtm.py` の実行結果）。
- コントリビューター確認事項（ホスト絶対パス除外、機密情報除外、全行直上平易コメント規則の自己確認チェックリスト）。

### 2.5 事前アカウント検証ゲート (Pre-Execution Identity Gate)
AIエージェントがGitHubへの外部書き込み操作（Issue/PR作成、コメント等）を行う直前に、必ず `get_me` を実行して認証ユーザー名を検証する安全装置。

- **照合プロトコル**:
  - 期待ログイン名: `process.env.EXPECTED_GITHUB_LOGIN || "N-Y-Public"`
  - 期待ID: `process.env.EXPECTED_GITHUB_ID`（指定時のみ照合、未指定かつ期待ログイン名がデフォルト `N-Y-Public` の場合は `330902043`）
- **判定**: `login === EXPECTED_GITHUB_LOGIN`。不一致時または取得失敗時は即座に処理を中断（ABORT）し、外部書き込みを阻止。
- **外部環境設定**: 外部コントリビューターが自身の環境でAIエージェントにGitHub操作を行わせる場合は、環境変数 `EXPECTED_GITHUB_LOGIN` に自身のGitHubアカウント名を設定する。

### 2.6 Worktree セッション初期化およびブランチ命名自動是正 (Worktree Branch Auto-Rectification)
Google Antigravity 2.0 等の自律エージェント環境において、Worktreeを選択してセッションを開始した際、初期プロンプトから簡易スラッグ（`resolve_issue_eight` 等のフラットなsnake_case）が自動採番され、本リポジトリのブランチ命名規約に違反した状態でセッションが開始される場合がある。

AIエージェントはセッション開始時（タスク着手前・PBI起票前）、必ず以下の初期化手順を実行してブランチを是正すること：

#### 自動是正手順
1. **ブランチ検査**:
   ```bash
   git branch --show-current
   ```
2. **規約判定**:
   ブランチ名が正規表現 `^(feat|fix|docs|refactor|test|chore)/[^/]+/issue-\d+/[a-z0-9-]+$` に適合するか検証。
3. **自動是正コマンド実行**:
   不一致の場合、対象Issue番号・作業種別（バグなら `fix`、機能追加なら `feat`）・ケバブケース作業説明から正規ブランチ名（例: `fix/antigravity-2.0/issue-8/worktree-branch-naming-compliance`）を導出し、改名コマンドを実行：
   ```bash
   git branch -m {作業種別}/{アカウント名またはAI名}/issue-{issue番号}/{作業説明ケバブケース}
   ```
4. **Worktree ディレクトリ命名規約**:
   ファイルシステムにおける `/` の制約を考慮し、Worktreeディレクトリ名は `{作業種別}_{アカウント名またはAI名}_issue-{issue番号}_{作業説明ケバブケース}`（スラッシュをアンダースコアに置換）を標準形式とする。

---

## 3. エージェント自動実行ガイドライン

AIエージェントが本スキルを活用して作業を行う際は、以下の手順を遵守すること：

0. **タスク開始時のブランチ是正**:
   - セッション開始時、直ちにブランチ名が規約に合致しているか確認し、違反している場合は `git branch -m` で是正を完了してから作業を開始する。
1. **ホストパス検知と排除**:
   - 生成するIssue、PR文面、コミットログにホスト環境固有の絶対パス（`/home/...` や `C:\path\to\...` 等）が含まれていないかを機械検査する。
2. **Living Documentation 原則**:
   - コード変更を伴う作業では、必ず対応するPBI（`docs/backlog/`）および設計書（`docs/`）の差分更新を先行させる。
3. **Docker実行原則**:
   - ビルド・テスト・変換検証は必ず Docker コンテナ経由で実行し、ホスト環境にNode/Pythonの実行依存を持たない。
