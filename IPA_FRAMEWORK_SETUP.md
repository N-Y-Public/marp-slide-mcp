# IPA共通フレーム2013（SLCP-JCF2013）準拠開発基盤 導入・運用ガイド (`IPA_FRAMEWORK_SETUP.md`)

> **関連GitHub Issue**: [#4 feat: Issue起点PBI駆動型アジャイル開発とIPA品質保証サイクルのハイブリッド統合基盤の導入](https://github.com/N-Y-Public/marp-slide-mcp/issues/4)

本ドキュメントは、`CT-masato-hino/claude-code-project-pack` で定義されている「IPA共通フレーム2013（SLCP-JCF2013）に準拠した開発統制・サブエージェント群・QCD品質基準」を解析し、**Antigravity 2.0** の標準アーキテクチャ（`AGENTS.md`, `.agents/rules/`, `.agents/skills/`, `.agents/mcp_config.json`, `docs/templates/`）へ最適化して導入した結果をまとめたセットアップ・運用ガイドである。

---

## 1. 作業結果サマリー

### 1.1 参照元（`claude-code-project-pack`）から移植・最適化した中核仕組み

| 参照元の仕組み (`claude-code-project-pack`) | Antigravity 2.0 での実装先 | 移植・最適化の内容 |
| :--- | :--- | :--- |
| **憲法・全体統制 (`CLAUDE.md.template`)** | `AGENTS.md` / `GEMINI.md` | 既存のDocker環境限定実行ルール・OSSプライバシー保護ルールを維持したまま、第4章としてIPA共通フレーム2013 × PBI駆動アジャイルのハイブリッド工程統制・QCDゲート・スキルカタログを統合。 |
| **PBI駆動オーケストレーション（ハイブリッド統合）** | `ipa-pbi-orchestrator`<br>`docs/backlog/{todo,in_progress,done}/`<br>`98_pbi_template.md` | 「マクロはPBI駆動アジャイル、ミクロはIPA準拠（ミニ・ウォーターフォール）」として再定義。1つのPBIを起点に要件・設計の差分更新（Living Documentation）から実装・テスト・RTM更新までを一気通貫で自動実行。 |
| **工程順序統制・PBIゲート (`leader.md` / `deliverables-catalog.md`)** | `.agents/rules/ipa-process-gate.md` | **「実装コードの変更は、対象となる `PBI-xxx.md` が存在し、かつそのPBIに対応する詳細設計書の差分更新が完了している場合のみ許可する」** というPBI駆動ゲートおよび種別テーラリング（`feature` / `enhancement` / `bugfix`）を明文化。 |
| **曖昧さ4分類検出・仮定管理 (`assumption-management.md`)** | `.agents/rules/ipa-process-gate.md`<br>`ipa-requirements-analyst` | 【未定義】【多義】【暗黙】【矛盾】の4分類検出、推奨案付き質問形式、未確定箇所への `【仮定: Q-xxx】` マーカー埋め込みルールを実装。 |
| **エラー空間の閉鎖 (`api-designer.md` / `test-planning`)** | `ipa-system-architect`<br>`04_system_architecture.md` | 外部I/Fエラーコード一覧において準正常系を全行採番し、最終行に受け皿「上記以外（未定義エラー: `ERR-SYS-999`）」を必須化。 |
| **生成と検証の分離・定量判定 (`qcd-standards.md`)** | `ipa-qa-engineer`<br>`06_test_specification.md` | 数値サマリー表（計画/実測/消化率/断絶数）のない定性合否宣言を無効化し、PBIの受入基準（AC）を直接インプットとするテスト仕様差分策定を標準化。 |
| **PBI対応トレーサビリティ機械監査 (`Q-03` / `audit_pack.py`)** | `ipa-traceability-validator`<br>`scripts/verify_rtm.py` | `PBI-*` ↔ `REQ-*` ↔ `MOD-*` ↔ `TEST-*` の双方向整合性、`docs/backlog/` 内のPBI構文・ステータス整合、および `.agents/` 構成ファイルの構文を自動検査するPythonスクリプトを実装。 |

---

## 2. 配備されたディレクトリ・ファイル構成

```text
.
├── AGENTS.md                                # 全社・プロジェクト標準の統制方針（Docker原則 + PBI駆動IPA統制）
├── GEMINI.md                                # AGENTS.md と同期されたワークスペースルール
├── IPA_FRAMEWORK_SETUP.md                   # 本セットアップ・運用ガイド
├── .agents/
│   ├── rules/
│   │   └── ipa-process-gate.md              # PBI駆動工程ゲート・差分更新・テーラリングルール
│   ├── skills/
│   │   ├── ipa-pbi-orchestrator/            # 【司令塔】1つのPBIを起点に全IPAスキルを直列実行するスキル
│   │   │   └── SKILL.md
│   │   ├── ipa-requirements-analyst/        # 要件定義（PBIからの差分追記・業務/機能/非機能）担当スキル
│   │   │   └── SKILL.md
│   │   ├── ipa-system-architect/            # 方式設計（構成・外部IF差分・エラー空間閉鎖）担当スキル
│   │   │   └── SKILL.md
│   │   ├── ipa-detail-designer/             # 詳細設計（ER図・MOD採番・内部ロジック差分・実装統制）担当スキル
│   │   │   └── SKILL.md
│   │   ├── ipa-qa-engineer/                 # 単体/結合/総合テスト仕様差分策定・品質監査スキル
│   │   │   └── SKILL.md
│   │   ├── ipa-traceability-validator/      # PBI/REQ/MOD/TESTの双方向追跡性検証スキル
│   │   │   ├── SKILL.md
│   │   │   └── scripts/verify_rtm.py        # PBI構文・ID整合性・Antigravity構文を検査する自動化スクリプト
│   │   └── marp-slides/                     # 既存のMarpビジネススライド生成スキル（共存）
│   │       └── SKILL.md
│   └── mcp_config.json                      # ドキュメント・スライド操作用MCP構成定義
└── docs/
    ├── README.md                            # 設計図書統合インデックス & 完全RTM（PBI_IDカラム対応済）
    ├── backlog/                             # PBI（プロダクトバックログアイテム）管理ディレクトリ
    │   ├── todo/                            # 未着手PBI（status: "todo"）
    │   │   └── PBI-001_sample.md            # サンプルPBI（スピーカーノート任意付与・取得機能の改善）
    │   ├── in_progress/                     # 進行中PBI（status: "designing" | "implementing" | "testing"）
    │   └── done/                            # 完了・RTM監査通過済みPBI（status: "done"）
    ├── templates/                           # IPA共通フレーム2013 × PBI駆動 設計書Markdown雛形一式
    │   ├── 98_pbi_template.md               # PBI定義標準テンプレート（YAML Frontmatter + 5セクション構文）
    │   ├── 01_business_requirements.md      # 業務要件定義（背景、目的、システム化範囲、業務フロー）
    │   ├── 02_functional_requirements.md    # 機能要件一覧（一意の REQ-F-xxx 採番テーブル・AC付き）
    │   ├── 03_non_functional_requirements.md# 非機能要件グレード（IPA 6大項目：可用性・性能・保守・移行・Sec・環境）
    │   ├── 04_system_architecture.md        # システム方式設計（Mermaid構成図、基盤環境、外部I/F・エラー表）
    │   ├── 05_software_design.md            # ソフトウェア方式・詳細設計（ER図、MOD-xxx一覧、入出力仕様）
    │   ├── 06_test_specification.md         # テスト仕様書兼成績書（数値サマリー、対応REQ/MOD、合否判定基準）
    │   └── 99_traceability_matrix.md        # 要件追跡表（PBI ↔ REQ ↔ MOD ↔ TEST の双方向対応マトリクス）
    ├── 00_project_charter/                  # プロジェクト憲章・コーディング規約（全行直上平易コメント規則）
    ├── 01_requirements/                     # プロジェクト正本：要件定義書
    ├── 02_basic_design/                     # プロジェクト正本：機能仕様書・外部I/F仕様書
    └── 03_detail_design/                    # プロジェクト正本：構造設計書・内部I/F仕様書・プログラム仕様書
```

---

## 3. スキル一覧とテンプレート対応表

| スキル名 | 対応する役割・IPA工程 | 動作モード（Living Documentation） | 参照・更新対象テンプレート (`docs/templates/`) |
| :--- | :--- | :--- | :--- |
| **`ipa-pbi-orchestrator`** | **PBI駆動オーケストレーター**<br>（全体司令塔・テーラリング） | `PBI-xxx.md` を解析し、種別（`feature` / `enhancement` / `bugfix`）に応じてStep 1〜5を直列実行しステータスと配置先を遷移させる | ・`98_pbi_template.md`<br>・`docs/backlog/{todo,in_progress,done}/` |
| **`ipa-requirements-analyst`** | 要件定義プロセス<br>（業務・機能・非機能） | PBIのWhy/What/ACをマスター要件定義書へ差分追記し、`related_req_ids` をPBIに記録 | ・`01_business_requirements.md`<br>・`02_functional_requirements.md`<br>・`03_non_functional_requirements.md` |
| **`ipa-system-architect`** | システム方式設計プロセス<br>（基本設計・外部設計） | 影響する構成・外部I/F・エラーコード一覧をマスター方式設計書へ差分追記（`bugfix`時はスキップ可） | ・`04_system_architecture.md`<br>・`05_software_design.md`（方式部） |
| **`ipa-detail-designer`** | ソフトウェア詳細設計・実装<br>（内部設計・製造） | データモデル・モジュール（`MOD-*`）・内部ロジックを差分更新し、`related_mod_ids` 記録後に規約準拠実装 | ・`05_software_design.md`<br>・`docs/00_project_charter/02_coding_standards.md` |
| **`ipa-qa-engineer`** | 単体・結合・総合テスト<br>および品質保証プロセス | PBIの受入基準（AC）を網羅する `TEST-*` を差分追記・Docker内実行し、`related_test_ids` を記録 | ・`06_test_specification.md` |
| **`ipa-traceability-validator`** | 監査・追跡性検証プロセス<br>（工程ゲート Q-03） | RTMの `PBI_ID` カラムを更新し、`verify_rtm.py` で `PBI ↔ REQ ↔ MOD ↔ TEST` の完全性を機械検証 | ・`99_traceability_matrix.md`<br>・`scripts/verify_rtm.py` |

---

## 4. 開発実行コマンド例（Docker環境限定）

本リポジトリのルール（`AGENTS.md` 第1項）に基づき、すべての検証・ビルドコマンドは **Docker Compose 経由でコンテナ内実行** します。

### 4.1 トレーサビリティ検証 & PBI/Antigravity構文監査 (`verify_rtm.py`)
```bash
# 全体検証（PBIバックログ + テンプレートRTM + 正本設計書RTM + .agents/スキル・ルール構文検査）
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py

# テンプレート（docs/templates/）とPBIバックログの双方向トレーサビリティのみを検証
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py --mode templates

# Markdown形式の監査レポートを出力
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py --format markdown

# JSON形式の監査結果を出力（CI連携用）
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py --format json
```

### 4.2 TypeScriptビルド・スライド出力検証
```bash
# TypeScript (MCPサーバー) のコンパイル検証
docker compose run --rm app npm run build

# Marp スライド PDF 出力検証
docker compose run --rm app npm run build:pdf

# ネイティブ編集可能 PPTX 出力検証
docker compose run --rm app npm run build:pptx
```

---

## 5. PBI駆動アジャイル開発の運用フロー（PBIの書き方・AI実行指示コマンド例）

### 5.1 ハイブリッド設計思想（マクロはアジャイル、ミクロはIPA準拠）
1. **PBI起点の開発統制**:
   - 機能追加・仕様変更・バグ修正はすべて定型構文のPBIファイル（`docs/backlog/todo/PBI-xxx_*.md`）を起点として開始します。
2. **ドキュメントの差分更新（Living Documentation）**:
   - PBIごとに毎回ゼロから巨大な設計書を作るのではなく、既存のマスター設計書（要件定義書、方式設計書、詳細設計書、テスト仕様書、RTM）に対してPBI単位で**差分を追記・更新**します。
3. **PBI種別（`type`）に応じたテーラリング（軽量化ゲート）**:
   - `feature`（新機能）: 全工程（要件追加 → 方式・詳細設計差分更新 → 実装 → 単体/結合/総合テスト → RTM更新）を実施。
   - `enhancement`（改善）: 影響する設計書の差分更新 → 実装 → テスト → RTM更新を実施。
   - `bugfix`（バグ修正）: 原因特定・詳細設計との乖離確認 → 修正実装 → 回帰テスト追加 → RTM更新を実施（方式設計等はスキップ可）。

### 5.2 PBIファイルの書き方（`docs/templates/98_pbi_template.md`）
PBIファイルは、機械可読性とAIの解釈精度を最大化するため、**YAML Frontmatter + 厳密な5つのMarkdownセクション**で記述します（サンプル: [`docs/backlog/todo/PBI-001_sample.md`](docs/backlog/todo/PBI-001_sample.md)）：

- **YAML Frontmatter**:
  - `pbi_id`: `"PBI-001"` 形式の一意ID
  - `title`: PBIの簡潔なタイトル
  - `type`: `"feature"` | `"enhancement"` | `"bugfix"`
  - `status`: `"todo"`（未着手）→ `"designing"`（設計中）→ `"implementing"`（実装中）→ `"testing"`（テスト中）→ `"done"`（完了）
  - `priority`: `"high"` | `"medium"` | `"low"`
  - `related_req_ids`, `related_mod_ids`, `related_test_ids`: 関連する `REQ-*`, `MOD-*`, `TEST-*` の配列（AIが各工程で自動記録・更新）
- **必須Markdownセクション（`## 1.` 〜 `## 5.`）**:
  1. `## 1. ユーザーストーリー / 背景 (Why & Who)`（As a / I want to / So that）
  2. `## 2. スコープと仕様概要 (What)`（In Scope / Out of Scope）
  3. `## 3. 受け入れ基準 (Acceptance Criteria)`（`- [ ] **AC-1:** Given ..., When ..., Then ...` 形式）
  4. `## 4. 影響範囲・技術的メモ (Impact & Notes)`
  5. `## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)`

### 5.3 日常のアジャイル開発ワークフローとAIへの実行指示コマンド例

普段の開発は、以下のシンプルな4ステップで完結します：

#### ステップ1: 人間が GitHub Issue を起票する（または要望を整理する）

#### ステップ2: Antigravity に PBI の作成を指示する
```text
Issue #xxx に対応せよ
```
（または要望を直接伝える場合：）
```text
通常スライドに発表者ノート（speakerNotes）を付与・取得できるようにしたい。PBIを作成して確認を求めよ。
```
- **AIの動作**: `docs/templates/98_pbi_template.md` に従い、`docs/backlog/todo/PBI-xxx_*.md`（Why / What / Given-When-Then形式のAC）を作成し、人間に内容確認を求めます。

#### ステップ3: PBI確認後、Antigravity に設計〜実装〜テストの一気通貫実行を指示する
```text
問題ない。設計・実装・テストまで完了させよ。
```
（特定のPBIファイルを指定して実行させる場合：）
```text
docs/backlog/todo/PBI-001_sample.md について、ipa-pbi-orchestrator スキルに従い設計・実装・テスト・RTM更新まで完了させよ。
```
- **AIの動作（`ipa-pbi-orchestrator` による自動パイプライン）**:
  1. **Input解析**: `PBI-xxx.md` のステータスを `designing` に更新し、`docs/backlog/in_progress/` へ移動。
  2. **Step 1 (要件反映)**: `ipa-requirements-analyst` によりマスター要件定義書を差分更新し、`REQ-*` をPBIに記録。
  3. **Step 2 (設計差分反映)**: `ipa-system-architect` / `ipa-detail-designer` によりマスター設計書を差分更新し、`MOD-*` をPBIに記録。
  4. **Step 3 (実装)**: ステータスを `implementing` に更新し、「全行直上平易コメント規則」を遵守してコードを実装、Docker内で `npm run build` を検証。
  5. **Step 4 (テスト・検証)**: ステータスを `testing` に更新し、`ipa-qa-engineer` により全ACを検証する `TEST-*` を作成・実行。
  6. **Step 5 (RTM更新と完了)**: `99_traceability_matrix.md` の `PBI_ID` カラムを更新し、Docker内で `verify_rtm.py` を実行して追跡性断絶 `0件` を確認後、ステータスを `done` に変更して `docs/backlog/done/` へ移動。

#### ステップ4: 人間が変更差分（またはプルリクエスト）をレビューする
- 変更されたマスター設計書の差分、ソースコード、テスト結果、および `docs/backlog/done/PBI-xxx.md` のトレーサビリティ記録を確認します。

---

## 6. 検証結果エビデンス（導入・拡張時実行記録）

Dockerコンテナ内での検証スクリプトおよびTypeScriptビルド実行結果：

- **`verify_rtm.py` 実行結果**:
  - テンプレート＆PBI RTM検査: `PBI: 1件` (`PBI-001_sample.md` + 初期ベースライン `PBI-000`), `REQ: 9件` (`REQ-F-001`〜`003`, `REQ-NFR-001`〜`006`), `MOD: 3件` (`MOD-001`〜`003`), `TEST: 8件` (`TEST-UT-001`〜`003`, `TEST-IT-001`〜`002`, `TEST-ST-001`〜`003`) → **PBI↔REQ↔MOD↔TEST 双方向追跡率 100%（断絶 0件）**
  - プロジェクト正本設計図書検査: `REQ-FNC: 7件`, `MOD: 4件`, `PRG: 4件` → **完全一致（断絶 0件）**
  - Antigravity 2.0 構成ファイル検査: `.agents/rules/ipa-process-gate.md`, `.agents/skills/*/SKILL.md` (全7スキル: `ipa-pbi-orchestrator` 追加済), `.agents/mcp_config.json` → **構文エラー 0件**
  - 終了コード: `0 (PASS)`

---

## 7. Antigravity 2.0 Worktree 連携統制と IDE でのシームレス確認手順

### 7.1 なぜブランチ重複エラーが発生するのか
Git の Worktree 機構では、「1つのブランチは同時に2つ以上の作業ディレクトリ（Worktree）でチェックアウトできない」という排他ロック仕様があります。
Antigravity 2.0 はタスクごとに独立した Worktree（`.../worktrees/<repo>/<branch>`）を作成して開発を行うため、タスク完了時にエージェントが作業ツリーのブランチを保持したままだと、Antigravity IDE（メインリポジトリ / DevContainer）側で当該ブランチへ `git checkout` しようとした際に以下のエラーが発生します：

```text
fatal: '<branch>' is already used by worktree at '...'
```

### 7.2 解決策：タスク完了プロトコル（HEAD のデタッチ）
`AGENTS.md` / `GEMINI.md` 第5章に規定された **タスク完了プロトコル** により、エージェントはコミット完了後に必ず自身の Worktree をデタッチ（`git checkout --detach`）します。
これにより：
- コミット内容やブランチの実体は完全に維持されたまま、ブランチ名の排他ロックのみが即座に解放されます。
- Antigravity IDE（DevContainer / ホスト環境）側で、一切のエラーなしに目的のブランチをシームレスに `git checkout <branch>` して確認できます。

### 7.3 過去の未デタッチ Worktree を一括解放するコマンド
もし過去のタスクによってブランチがロックされた Worktree が残っている場合は、以下のコマンドで一括解放できます：

```powershell
# Windows (PowerShell):
.\dev.ps1 unlock-worktrees

# Linux / Mac / WSL (Bash):
./dev.sh unlock-worktrees
```

