# marp-slide-mcp コントリビューションガイド (Contributing Guidelines)

`marp-slide-mcp` プロジェクトへの関心と貢献をご検討いただき、誠にありがとうございます！
本プロジェクトはオープンソースソフトウェア（OSS）として公開されており、外部コントリビューター（人間）および自律AIエージェント（Antigravity, Cursor, Claude等）による開発参加を歓迎しています。

本ガイドラインは、すべてのコントリビューターが円滑・安全に開発へ参加し、高品質なコードとドキュメントを維持するための運用ルールを定めたものです。

---

## 1. 開発環境の絶対原則（Docker環境のみ）

> [!IMPORTANT]
> **ホストマシン上で直接ビルドやテストコマンドを実行しないでください。**
> 依存関係のインストール、TypeScriptのビルド、Marp変換、テスト、および検証スクリプトは、すべて Docker コンテナ内で実行します。

### 基本コマンド一覧
```bash
# 依存関係のインストール
docker compose run --rm app npm install

# TypeScript のビルド (型チェック・コンパイル)
docker compose run --rm app npm run build

# スライド PDF エクスポート検証
docker compose run --rm app npm run build:pdf

# スライド PPTX エクスポート検証
docker compose run --rm app npm run build:pptx

# 要件追跡性 (RTM) の自動監査
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py
```
※ Windows PowerShell では `.\dev.ps1 run <command>`、Linux/macOS では `./dev.sh run <command>` もご利用いただけます。

---

## 2. ブランチ運用および命名規則

すべての作業は、該当する GitHub Issue（および PBI）と紐付けたトピックブランチを作成して実施してください。

### ブランチ命名フォーマット
```text
{作業種別}/{各自のGitHubアカウント名またはAI名}/issue-{issue番号}/{作業説明ケバブケース}
```

- **作業種別 (`type`)**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **アカウントまたはAI名**: あなたの GitHub ユーザー名（または作業を担当するAIエージェント名）
- **issue番号**: 関連する GitHub Issue の番号
- **作業説明**: ハイフン区切りの英語小文字（ケバブケース）

### 命名例
- 外部開発者（Aliceさん）による機能追加:
  `feat/alice/issue-2/github-standard-templates`
- 外部開発者（Bobさん）によるバグ修正:
  `fix/bob/issue-15/two-column-layout-overlap`
- メンテナー環境（Antigravity 2.0）による作業:
  `feat/antigravity-2.0/issue-2/github-standard-templates`

---

## 3. コミット作法・著作権・プライバシー保護

### 3.1 コミット Author と著作権の尊重
- **各自のアカウントでコミットしてください**:
  - コミットの著作権およびコントリビューターとしてのクレジットは、作業を行った各コントリビューター自身に正しく帰属します。
  - 特定のアカウント名（メンテナーのアカウント等）を強制することは一切ありません。
- **GitHub noreply メールの利用推奨（プライバシー保護）**:
  - 個人・私用のメールアドレスを公開Git履歴に残したくない場合は、GitHubが提供するプライベートメール（`<id>+<username>@users.noreply.github.com`）の設定を推奨します：
    ```bash
    git config user.name "Your GitHub Username"
    git config user.email "ID+Username@users.noreply.github.com"
    ```

### 3.2 セキュリティ・ホスト絶対パスの完全排除
- **ホスト環境固有の絶対パス混入禁止**:
  - ログ、ドキュメント、テストエビデンス、コードコメントに `/home/...` や `C:\path\to\...` などのローカル絶対パスを含めないでください。リポジトリルートからの相対パス（`./docs/...`）や `<repo>` プレースホルダーを使用してください。
- **機密情報の排除**:
  - APIキー、トークン（PAT）、パスワード、秘密鍵、`.env` ファイルを絶対にコミットしないでください。

---

## 4. PBI駆動アジャイル × IPA品質ゲート

本プロジェクトは、**PBI駆動アジャイル（マクロ）** と **IPA共通フレーム2013（SLCP-JCF2013）品質ゲート（ミクロ）** を採用しています。

1. **PBI起点の開発**:
   - 機能追加や仕様変更は、`docs/backlog/todo/PBI-xxx_*.md`（雛形: `docs/templates/98_pbi_template.md`）の作成から開始します。
2. **設計書の差分更新（Living Documentation）**:
   - ゼロから巨大な別個の設計書を作るのではなく、既存のマスター設計書（`docs/01_requirements/`, `docs/02_basic_design/`, `docs/03_detail_design/` 等）に対して差分を追記・更新します。
3. **全行直上平易コメント規則**:
   - ソースコードを変更・追加する場合は、すべての実行コード行の直上に平易な日本語コメントを記述する規則（`docs/00_project_charter/02_coding_standards.md`）を100%遵守してください。
4. **要件追跡マトリクス (RTM) の整合**:
   - 設計やコードを変更した際は、`docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py` を実行し、トレーサビリティ断絶が0件であることを確認してください。

---

## 5. Pull Request の提出手順

1. 最新の `main` ブランチから前述の命名規則に従ってトピックブランチを作成します。
2. 変更を実装し、ローカル（Docker環境）でビルドおよびテストを実行します。
   - `docker compose run --rm app npm run build`
   - `docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py`
3. 変更をコミットし、ご自身のForkまたはリポジトリへPushします。
4. GitHub上で Pull Request を作成します。
   - PRテンプレート（`.github/pull_request_template.md`）の各項目（関連Issue、変更概要、検証内容、チェックリスト）を記入してください。
5. メンテナーおよび自動CIによるレビューを受け、必要に応じて修正を行ってください。

ご不明な点があれば、お気軽に Issue を起票してお問い合わせください。
素晴らしいコントリビューションをお待ちしています！
