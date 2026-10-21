---
pbi_id: "PBI-006"
title: "Google Antigravity 2.0 Worktree連携におけるブランチ命名規約の自動是正プロトコルおよび初期化統制の整備"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-005"]
related_mod_ids: ["MOD-001"]
related_test_ids: ["TEST-IT-005"]
---

# [PBI-006] Google Antigravity 2.0 Worktree連携におけるブランチ命名規約の自動是正プロトコルおよび初期化統制の整備

> 関連 GitHub Issue: [#8 - fix: Google Antigravity 2.0 において Worktreeを使用した開発を開始した際、自動採番のbranch名が規約違反となる](https://github.com/N-Y-Public/marp-slide-mcp/issues/8)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** Google Antigravity 2.0 を使用して開発を行う開発者および自律AIエージェント
- **〜したい (I want to):** Antigravity 2.0 で「Worktree」を選択してセッションを開始（例: `Issue #8 に対応せよ`）した際に、自動採番される一時的なWorktree名やブランチ名がリポジトリ統一のブランチ命名規約（`{種別}/{アカウント名またはAI名}/issue-{issue番号}/{作業説明ケバブケース}`）に反している状態を、エージェントがタスク開始時（PBI着手・初期化フェーズ）に即座に検知・自動是正（`git branch -m`）し、一貫して規約準拠のブランチおよびファイルシステム安全なWorktree名で開発を進行できるようにしたい
- **なぜなら (So that):** 
  - 現状、Antigravity 2.0 のWorktree作成機能はユーザーの初期プロンプトから簡易スラッグ（`resolve_issue_eight` 等のフラットなsnake_case）を自動採番してブランチを作成するため、リポジトリのブランチ規約に違反してしまう
  - これまでタスク完了プロトコル（コミット一元化・HEADデタッチ・ユーザー案内）は定義されていたが、タスク開始時プロトコル（Task Initiation Protocol）やWorktreeブランチ是正手順が `AGENTS.md` / `GEMINI.md` / `.agents/rules/ipa-process-gate.md` / `.agents/skills/github-workflows/` に欠落しており、ユーザーが手動でブランチ不整合を指摘・是正指示しなければならなかった（Issue #7 における再発および Issue #8 起票原因）
  - リポジトリのガバナンスと自動化品質を担保し、人間・AI双方がブランチ命名規約違反を起こさずにシームレスに開発を完遂できるようにするため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **タスク開始時プロトコル（Task Initiation Protocol）の策定・明文化**:
   - `AGENTS.md`, `GEMINI.md`, `.agents/rules/ipa-process-gate.md`, `.agents/skills/github-workflows/SKILL.md`, `.agents/skills/ipa-pbi-orchestrator/SKILL.md` に「タスク開始時・Worktreeブランチ自動是正ルール」を新設。
   - エージェントはセッション開始時（PBI起票前またはStep 0直前）、必ず現在のブランチ名（`git branch --show-current`）を検査する。
   - 現在のブランチ名がリポジトリ規約 `{type}/{author}/issue-{number}/{description}` に適合しない場合（`resolve_issue_eight` 等の一時的自動採番名を含む）、Issue情報と作業種別に基づき規約準拠の正式ブランチ名（例: `fix/antigravity-2.0/issue-8/worktree-branch-naming-compliance`）を自動導出し、直ちに `git branch -m <compliant_branch_name>` を実行して是正する。
2. **Worktree ディレクトリ命名規約の標準化**:
   - Gitブランチ名（`/` を含む階層構造）とファイルシステム（`/` がパス区切り文字となる制約）の差異を吸収するため、Worktreeディレクトリ命名規約を `{type}_{author}_issue-{number}_{description}`（`/` を `_` に置換したフラット形式）として `CONTRIBUTING.md` および設計書に定義。
3. **マスター設計書の差分更新（Living Documentation）**:
   - 要件定義書（`docs/01_requirements/01_requirements_specification.md` の `REQ-FNC-009-04`）
   - 基本設計書（`docs/02_basic_design/`）
   - 詳細設計書（`docs/03_detail_design/` の `MOD-SKL-001` / `PRG-SKL-001`）
   - テスト仕様書（`docs/templates/06_test_specification.md` の `TEST-IT-005`）
   - 要件追跡マトリクス（`docs/README.md` および `docs/templates/99_traceability_matrix.md`）
4. **本セッション自身のブランチ名是正および検証**:
   - 現在の `resolve_issue_eight` ブランチを規約準拠ブランチ名 `fix/antigravity-2.0/issue-8/worktree-branch-naming-compliance` へ是正。
   - Dockerコンテナ内ビルド検証（`npm run build`）およびRTM監査スクリプト（`verify_rtm.py`）を実行し、断絶0件を達成。

### やらないこと (Out of Scope)
- Google Antigravity 2.0 アプリケーション本体のバイナリ（`language_server.exe` / `Antigravity.exe`）の直接改変（OSSリポジトリのスコープ外であり、エージェント統制ルールおよびプロトコルによって完全解決する）
- GitHub へのリモートプッシュおよびPR自動オープン（ユーザーの指示に基づく）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given Antigravity 2.0 が Worktree セッション開始時に規約外の一時的ブランチ名（例: `resolve_issue_eight`）を自動生成した時, When AIエージェントがタスク開始時プロトコル（Task Initiation Protocol）を実行した際, Then 直ちに `{type}/{author}/issue-{issue_number}/{description}` に準拠した正式ブランチ名を自動導出し、`git branch -m` を実行して規約準拠ブランチへ是正すること
- [x] **AC-2:** Given `AGENTS.md`, `GEMINI.md`, `ipa-process-gate.md`, `ipa-pbi-orchestrator`, `github-workflows` の各統制文書, When 開発者がタスクライフサイクル規定を確認した時, Then タスク開始時（ブランチ自動検査・是正）からタスク完了時（コミット一元化・Worktree排他ロック解除 `git checkout --detach`・確認手順案内）までの一貫したプロトコルが明文化されていること
- [x] **AC-3:** Given `CONTRIBUTING.md` および `docs/00_project_charter/02_coding_standards.md`, When コントリビューターがWorktree運用とブランチ命名規約を参照した時, Then ブランチ命名フォーマットに加え、ファイルシステム安全なWorktreeディレクトリ命名規約（`/` を `_` に置換）およびエージェントの自動是正挙動が明確に理解できること
- [x] **AC-4:** Given 上記の設計差分・実装・テスト仕様が完了した状態, When Docker環境内で `npm run build` および `python3 verify_rtm.py` を実行した時, Then ビルドエラー0件、かつ `PBI-006` ↔ `REQ-NFR-005` ↔ `MOD-001` ↔ `TEST-IT-005` の双方向トレーサビリティ断絶が0件（Exit Code `0`）で完了すること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-NFR-005`, `REQ-FNC-009`, `MOD-001`, `MOD-SKL-001`, `PRG-SKL-001`
- **DB/外部IF変更の有無:** DB変更なし。エージェントガバナンス規則、スキル定義、設計文書の差分更新。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-NFR-005`, `REQ-FNC-009-04`
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-SKL-001`, `PRG-SKL-001`
- **追加・更新したテストID:** `TEST-IT-005`
- **検証実績 (Pass Criteria):**
  - AC-1: 現在のWorktreeセッションにおいて `resolve_issue_eight` から `fix/antigravity-2.0/issue-8/worktree-branch-naming-compliance` への改名を `git branch -m` により実行・確認完了。
  - AC-2: `AGENTS.md` / `GEMINI.md`（第5.1節）、`ipa-process-gate.md`（第1.1節）、`github-workflows/SKILL.md`（第2.6節）、`ipa-pbi-orchestrator/SKILL.md`（Stage A）にタスク開始時プロトコル（Task Initiation Protocol）を完全配備。
  - AC-3: `CONTRIBUTING.md`（第2.1節、第2.2節）および `docs/00_project_charter/02_coding_standards.md` にWorktreeディレクトリ安全命名規則（`/` を `_` に置換）およびAntigravity 2.0ブランチ自動是正の解説を明文化。
  - AC-4: Dockerコンテナ内TypeScriptコンパイル（`npm run build`）エラー0件、および `verify_rtm.py` によるRTM追跡性監査（断絶0件、構文エラー0件）に完全合格。
