# IPA共通フレーム2013（SLCP-JCF2013）× PBI駆動アジャイル 工程統制・品質ゲートルール (`ipa-process-gate`)

本ルールは、`claude-code-project-pack` の開発統制標準（V字/W字モデル・QCD基準・仮定管理・生成と検証の分離）を **「1つのPBI（Product Backlog Item）を正確に消化するためのミクロな品質保証サイクル（ミニ・ウォーターフォール）」** として再定義し、プロジェクト全体をPBI駆動アジャイルで高速かつ高品質に回すためのプロセス憲法である。

---

## 1. マクロはアジャイル、ミクロはIPA準拠（PBI駆動V字/W字モデル統制）

1. **PBI起点の原則**:
   - すべての機能追加（`feature`）・仕様改善（`enhancement`）・バグ修正（`bugfix`）は、定型構文のPBIファイル（`docs/backlog/{todo,in_progress,done}/PBI-xxx*.md`、雛形: `docs/templates/98_pbi_template.md`）を起点として開始する。
2. **ドキュメントの差分更新（Living Documentation）**:
   - PBIごとにゼロから別個の設計書を作るのではなく、既存のマスター設計書（要件定義書、方式設計書、詳細設計書、テスト仕様書、要件追跡マトリクス）に対して、**PBI単位で差分をインクリメンタルに追記・更新**する。
3. **1つのPBI内部におけるミクロ工程順序**:
   - `ipa-pbi-orchestrator` の統制下において、1つのPBIは以下の工程を順序通りに通過しなければならない（無断スキップ・逆行・黙認越境を厳禁とする）。

| 順序 | 工程名称 | 担当スキル | 必須成果物（差分更新対象テンプレート / 正本配置先） | 次工程移行ゲート条件（Exit Criteria） |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **PBI起票・解析**<br>(Backlog Item) | `ipa-pbi-orchestrator` | ・`docs/templates/98_pbi_template.md`<br>（実体: `docs/backlog/todo/PBI-xxx*.md`） | ・Why/WhatおよびGiven-When-Then形式のACが定義済み<br>・PBI種別（`feature` / `enhancement` / `bugfix`）が確定済み |
| **1** | **要件定義（差分）**<br>(Requirements Diff) | `ipa-requirements-analyst` | ・`docs/templates/01`〜`03_*.md`<br>（実体: `docs/01_requirements/`） | ・対象PBIに対応する `REQ-F-xxx`（または `REQ-FNC-xxx`）が採番・差分追記済み<br>・PBIの `related_req_ids` に記録済み |
| **2** | **方式設計（差分）**<br>(Architecture Diff) | `ipa-system-architect` | ・`docs/templates/04_system_architecture.md`<br>（実体: `docs/02_basic_design/`） | ・影響する構成図・外部I/F仕様・エラーコード一覧（最終行「上記以外（未定義エラー）」受け皿含む）の差分更新済み（※`bugfix`時はスキップ可） |
| **3** | **詳細設計（差分）**<br>(Detail Design Diff) | `ipa-detail-designer` | ・`docs/templates/05_software_design.md`<br>（実体: `docs/03_detail_design/`） | ・影響するデータモデル・モジュール（`MOD-xxx`）・関数仕様・単体テスト観点の差分更新が完了し、PBIの `related_mod_ids` に記録済み |
| **4** | **実装・単体検証**<br>(Implementation) | `ipa-detail-designer`<br>（実装フェーズ） | ・`src/`, `pptx_converter/`, `themes/`, `marp.config.js` | ・詳細設計書の差分仕様と100%一致<br>・`docs/00_project_charter/02_coding_standards.md`（**全行直上平易コメント規則**）100%遵守<br>・Dockerコンテナ内ビルド（`npm run build`）エラー0件 |
| **5** | **テスト・RTM更新**<br>(QA & Traceability) | `ipa-qa-engineer`<br>`ipa-traceability-validator` | ・`docs/templates/06_test_specification.md`<br>・`docs/templates/99_traceability_matrix.md`<br>（実体: `docs/README.md` / `docs/backlog/done/`） | ・PBIの全ACを検証する `TEST-*` が差分追記・実行済み<br>・`verify_rtm.py` による `PBI` ↔ `REQ` ↔ `MOD` ↔ `TEST` の双方向断絶 **0件**<br>・PBIステータスが `done` に更新され `done/` へ移動済み |

### 1.4 PBI種別（`type`）に応じたテーラリング（軽量化ゲート）
- **`feature`（新機能）**: 全工程（要件追加 → 方式・詳細設計更新 → 実装 → 単体/結合/総合テスト → RTM更新）を実施。
- **`enhancement`（改善）**: 影響する設計書の差分更新 → 実装 → テスト → RTM更新を実施。
- **`bugfix`（バグ修正）**: 原因特定・詳細設計との乖離確認 → 修正実装 → 回帰テスト追加 → RTM更新を実施（方式設計等はスキップ可）。

---

## 2. 【最重要】PBI駆動・実装前設計書差分レビュー強制ルール（PBI Pre-Implementation Gate）

> [!CAUTION]
> **実装コードの変更は、対象となる `PBI-xxx.md` が存在し、かつそのPBIに対応する詳細設計書の差分更新が完了している場合のみ許可する。**

1. **実装着手の絶対前提条件**:
   - 対象となる `PBI-xxx.md` が `docs/backlog/` に存在し、対応する要件ID（`REQ-*`）およびモジュールID（`MOD-*`）がPBIのFrontmatter（`related_req_ids`, `related_mod_ids`）とマスター設計書（`docs/01_requirements/`〜`docs/03_detail_design/` または `docs/templates/`）に差分反映済みであること。
   - 入出力データ構造（Zodスキーマ / TypeScript型定義）、正常系・準正常系・異常系（未定義エラーの受け皿）の振る舞いが詳細設計書に明文化されていること。

2. **PBI・設計書差分不在時の強制差し戻しアクション**:
   - ユーザーから直接コード変更を指示された場合であっても、対応する `PBI-xxx.md` または詳細設計書の差分更新が完了していない場合は、**直ちにソースコード編集を行ってはならない**。
   - 先に `PBI-xxx.md` の起票および上流〜下流の設計書差分更新（要件定義 → 方式設計 → 詳細設計の差分）を実施してから実装へ進むこと。

3. **越境ルール（Boundary-Crossing Control）**:
   - 宣言された現在工程の外の作業（例：PBI合意前のコード変更、実装中の要件スコープ変更）を行う必要がある場合は、**黙って越境することを禁ずる**。
   - 必ず作業着手前に「現在の工程は［工程Y］ですが、［工程X］の作業へ越境しますか？」とユーザーに確認し、承認と越境理由をPBIまたはコミット履歴に残すこと（**越えるのは可、黙って越えるのが不可**）。

---

## 3. 迂回不能な4大ガードレール（Guardrails）

1. **データモデル・スキーマの統制**:
   - 主要データモデル（`SlideDeck`, `NormalSlideSchema` 等）やファイル構造の変更は、必ず `ipa-detail-designer` により影響範囲（参照する全MCPツール・コンバーター・テーマ）を機械的に列挙し、設計書を差分更新してから実装する。
2. **アーキテクチャ・新規依存パッケージ審査**:
   - 新規NPMパッケージや新しい設計パターンの導入は、`ipa-system-architect` の審査（既存標準機能で実現できない証明、ライセンス適合性、保守容易性、撤退容易性）を通過しなければならない。既存機構で実現可能な場合は原則却下とする。
3. **セキュリティ・プライバシー統制（Q-09）**:
   - ファイルパス操作（パストラバーサル防止）、外部プロセス起動、コマンド引数処理に触れる変更はセキュリティ観点を必須とする。
   - 成果物・PBI・設計書・テストエビデンス・コミット履歴への**個人実名およびホストOS固有絶対パス（`/Users/...`, `C:\path\to\...` 等）の混入は0件**でなければならない。
   - **事前アカウント検証ゲート（Pre-Execution Identity Gate）**: GitHub MCPツール等を用いた外部書き込み操作（Issue/PR作成、コメント、プッシュ等）を行う際は、必ず事前に `get_me` を実行して `login === "N-Y-Public"` (ID: 330902043) を機械検証すること。不一致時は直ちに処理を中断し、未検証アカウントでの外部発信を物理的に阻止すること。
4. **生成と検証の分離（Q-01 / Q-11）**:
   - 実装・設計を行った同一ステップの自己申告だけで「完了」としてはならない。必ず `ipa-qa-engineer` の観点および `ipa-traceability-validator` の検証スクリプト（`verify_rtm.py`）による客観的検査を通過させること。

---

## 4. 曖昧さ検出と仮定管理（Assumption Management）

1. **曖昧さ4分類の強制検出**:
   - **【未定義】**: 境界値、文字数上限、エラー時挙動、文字コード、デフォルト値の欠落。
   - **【多義】**: 「適宜」「原則として」「速やかに」「〜など」等の複数解釈が可能な記述。
   - **【暗黙】**: 明記されていないが実装・運用に不可欠な前提条件。
   - **【矛盾】**: 要件間、非機能要件、または既存実装仕様との衝突。
2. **仮定マーカーの埋め込み**:
   - 未確定事項を抱えたまま暫定進行する場合は、AIが勝手に仕様を捏造せず、必ず推奨案を添えてユーザーへ確認する。
   - 暫定仮定で進める合意を得た箇所には `【仮定: Q-xxx】` マーカーをPBI・設計書・テスト仕様書・コード内に埋め込み、確定時に `grep` で全件特定・解消できるようにする（仮定の多段積みは2段まで）。

---

## 5. 品質ループの停止基準と進捗定義（QCD運用原則）

1. **数値なしの合否宣言は無効**:
   - ゲート判定やテスト報告において、「問題ありません」「テスト合格」といった定性表現のみの報告を認めない。必ず「PBI-001 全ACトレース完了（断絶0件）」「単体テスト 8/8件合格（消化率100%、Must指摘0件）」のように**基準IDと実測数値**を伴って報告すること。
2. **D-01 進捗の0/100原則**:
   - PBIおよび成果物の進捗は「未完了（0%）」か「完了条件を全て満たし `verify_rtm.py` 確認済み（100%）」の二値のみで判定する。「90%完了」「ほぼ完了」は仕掛品（0%）として扱う。
3. **照合型ループと改善型ループの分離（自己増殖防止）**:
   - 工程完了ゲートに接続してよいのは**照合型基準**（Mustブロッカー0件、ビルド成功、RTM断絶0件）のみである。
   - 「より良くできる」という**改善型提案**（Should/Nits、将来のリファクタリング案）を理由に工程完了を止めてはならず、改善提案は新規PBI（`docs/backlog/todo/`）として分離記録して現在のPBIを完了させること。

---

## 6. 工程ゲート判定フォーマット（必須出力様式）

各PBIの完了時、および実装着手前の設計レビュー時には、以下のフォーマットでゲート判定を出力すること：

```markdown
## 工程ゲート判定: [対象PBI ID / 対象工程名] → [次工程名 / 完了 (DONE)]
- **判定結果**: 承認 (PASS) / 条件付き承認 (CONDITIONAL PASS) / 差し戻し (REJECT) / 要人間判断 (ESCALATE)
- **対象PBI**: `PBI-xxx` (`type: feature | enhancement | bugfix`, `status: ...`)
- **検証根拠・実測値 (QCD基準)**:
  - Q-02 (Must指摘・ビルドエラー): X件
  - Q-03 (トレーサビリティ断絶): PBI↔REQ↔MOD↔TEST 不一致 X件
  - Q-09 (PII・絶対パス・セキュリティ違反): X件
- **確認済み成果物・差分更新パス**:
  - `docs/backlog/.../PBI-xxx.md`
  - `docs/...`
- **残存する仮定 (Q-ID) / 積み残し条件**:
  - （なければ「なし」と明記）
- **次工程への実行指示**:
  - （次に実行すべきスキル・作業内容）
```
