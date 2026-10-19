---
pbi_id: "PBI-002"
title: "GitHub MCP サーバーのリポジトリ別 PAT 完全分離アーキテクチャおよび事前アカウント検証ゲートの実装"
type: "enhancement" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-005"]
related_mod_ids: ["MOD-001"]
related_test_ids: ["TEST-ST-003"]
---

# [PBI-002] GitHub MCP サーバーのリポジトリ別 PAT 完全分離アーキテクチャおよび事前アカウント検証ゲートの実装

> 関連 GitHub Issue: [#5 - [Security/Architecture] リポジトリ専用 PAT 完全分離アーキテクチャおよび事前認証検証ゲートの導入](https://github.com/N-Y-Public/marp-slide-mcp/issues/5)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 公開OSS（marp-slide-mcp）の開発者およびAIエージェント
- **〜したい (I want to):** ホスト側のグローバル常駐コンテナに依存せず、本リポジトリ専用のPAT（`N-Y-Public`）を環境変数から安全・動的にロードし、GitHub操作前にアカウント一致（Pre-Execution Identity Gate）を機械検証したい
- **なぜなら (So that):** 過去セッションの常駐コンテナによるトークン混線（個人アカウント等での誤起票事故）を物理的に根絶し、第三者がクローンしてもホストを汚さず安全に利用できるOSSポータビリティを担保するため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- ホスト側グローバル設定（`~/.gemini/config/mcp_config.json`）の `github-mcp-server` 削除および古い常駐ゾンビコンテナの完全破棄（Step 1）
- `docker-compose.yml` への `github-mcp` サービス追加（`${GITHUB_PAT_MARP_SLIDE_MCP:-${GITHUB_PERSONAL_ACCESS_TOKEN:-}}` による多段フォールバック連携）（Step 2）
- リポジトリ内 `.agents/mcp_config.json` における `docker compose run --rm -T github-mcp` 動的ワンショット実行定義（Step 3）
- OSS利用者向けの `.env.example` 提供（`.env` 自体は作成不要かつGit除外）（Step 2）
- AIエージェント行動規範（`AGENTS.md` / `GEMINI.md` / `.agents/rules/`）への事前アカウント検証ゲート（`get_me` で `login === "N-Y-Public"` の機械照合）追記（Step 4）
- 動作検証（`get_me` 照合テスト、RTMトレーサビリティ検証）（Step 5）

### やらないこと (Out of Scope)
- リポジトリ内 `.env` ファイルへの平文トークンの書き込み（ユーザー環境ではホスト環境変数のみで管理）
- GitHub MCP サーバー公式イメージ自体のソースコード改変

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given ホストのユーザー環境変数に `GITHUB_PAT_MARP_SLIDE_MCP` がセットされている状態, When リポジトリローカルの MCP サーバー定義から GitHub ツール（`get_me`）を実行した時, Then トークンが正しく注入され、`login === "N-Y-Public"` (ID: 330902043) として認証されること
- [x] **AC-2:** Given リポジトリ内に `.env` ファイルが存在しない状態, When `docker compose run --rm -T github-mcp` を実行した時, Then エラーで停止することなくホスト環境変数 `GITHUB_PAT_MARP_SLIDE_MCP` がシームレスに引き継がれ、常駐ゾンビコンテナを残さず正常終了すること
- [x] **AC-3:** Given AIエージェントが GitHub 書き込み系操作（Issue作成・PR作成・コメント等）を指示された時, When 事前に `get_me` を実行した結果アカウント名が `N-Y-Public` でない（または失敗した）場合, Then 外部書き込み処理を直ちに中断し、ユーザーへ警告報告すること
- [x] **AC-4:** Given 新規環境で `git clone` された状態, When `.env.example` をコピーして `.env` を作成または `GITHUB_PERSONAL_ACCESS_TOKEN` を設定した時, Then 同一の `docker-compose.yml` 定義によりポータブルに動作すること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-FNC-008`, `REQ-NFR-SEC-02`, `MOD-INF-001`
- **外部IF変更の有無:** なし（MCP サーバー内部のツール仕様・引数は公式そのまま透過）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-008`, `REQ-NFR-SEC-02`
- **追加・更新した設計書/モジュールID:** `01_requirements_specification.md`, `01_architectural_design.md` / `MOD-INF-001`
- **追加・更新したテストID:** `TEST-SEC-001`, `TEST-IT-002`
- **検証実績 (Pass Criteria):**
  - AC-1 / AC-2: `[Environment]::GetEnvironmentVariable('GITHUB_PAT_MARP_SLIDE_MCP', 'User')` を用いて GitHub API `/user` を直接照合し、`login: N-Y-Public`, `id: 330902043` を確認。また `docker compose run --rm -T github-mcp` での MCP サーバー起動と終了時自動破棄（残存コンテナ0件）を確認。
  - AC-3: `AGENTS.md`, `GEMINI.md`, `.agents/rules/ipa-process-gate.md` に Pre-Execution Identity Gate を明文化。
  - AC-4: `.env.example` 提供および `docker-compose.yml` 多段フォールバック構文（`${GITHUB_PAT_MARP_SLIDE_MCP:-${GITHUB_PERSONAL_ACCESS_TOKEN:-}}`）動作検証完了。
