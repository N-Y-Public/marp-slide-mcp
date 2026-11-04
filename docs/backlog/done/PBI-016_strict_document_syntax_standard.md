---
pbi_id: "PBI-016"
title: "設計図書体系・厳格記述構文・ID附番規則の策定（Issue #21）"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-FNC-010", "REQ-NFR-007"]
related_mod_ids: ["MOD-DOC-001"]
related_test_ids: ["TEST-UT-004", "TEST-ST-010"]
---

# [PBI-016] 設計図書体系・厳格記述構文・ID附番規則の策定（Issue #21）

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 本リポジトリの設計図書を追記・削除する生成AIエージェント（`ipa-*` スキル群）、およびその成果物を全文読了して承認するメンテナー（`ROLE-PM` / `ROLE-ARCH`）
- **〜したい (I want to):** `docs/` 配下の各設計図書について、「どの図書に・どの見出し構造で・どのID体系で・どの書式で何を書くか」を一意に決める厳格な記述構文を定め、他プロジェクトにも転用できる汎用的な図書体系として確立したい。
- **なぜなら (So that):** 生成AIが何回・どこに追記や削除を行っても、同一の構造・同一の品質の仕様書に収束させ、要件からコードの関数・テスト結果までのトレーサビリティを機械検証可能な状態に保つため。

### 1.1 現状分析（As-Is・実測値）
PBI起票時点（commit `a6241ee`）の `docs/`（`backlog/` を除く）を機械走査した結果は以下のとおり。

| No. | 観点 | 実測された問題 | Issue #21 原則との対応 |
| :---: | :--- | :--- | :--- |
| F-1 | 図書体系の二重化 | `docs/templates/`（雛形を名乗りつつ実データを保持: `REQ-F-001`〜`003`, `MOD-001`〜`003`, `TEST-*` 18件）と正本 `docs/01`〜`03`（`REQ-FNC-001`〜`009`, `MOD-SRV-001` 等）が同一対象を別ID体系で並行記述している。PBI-010 は `REQ-F-002` と `REQ-FNC-002` を同時参照している。 | 重複禁止 / トレーサビリティ |
| F-2 | ID体系の乱立 | 接頭辞パターンが40種以上（例: `MOD-001` / `MOD-SRV-001` / `MOD-THEME-001`、`INT-FN-001` / `INT-ENG-001` / `INT-DOM-001`、`REQ-NF-` / `REQ-NFR-` / `NFR-SEC-`）。附番規則を定めた図書が存在しない。 | ID附番規則の明示 |
| F-3 | 見出し番号の欠落・重複 | 番号なしの見出し（H2〜H6）が34件（例: `### REQ-FNC-001: ...`, `#### 内部関数インターフェース一覧`, `#### ① ワークスペース設定`）。外部I/F仕様書では `### 5.3` が2回出現。 | 全Heading階層への章節項番号 |
| F-4 | リンク形式の混在 | Obsidian形式 `[[...]]` 49件と Markdown相対リンク `[..](...md)` 18件が混在。末尾の「関連設計図書への参照リンク」章が全図書で重複記載されている。 | Obsidian形式リンク / 重複禁止 |
| F-5 | 入出力の意味と形式の混在 | `SlideDeck` 等のデータ構造が構造設計書（`MOD-DAT-001`）、テンプレート05のER図、外部I/F仕様書のZod記述に分散し、意味（用途）と形式（型・桁・値域）が同一表に混在している。DB・ファイル・変数構造体の形式仕様書が存在しない。 | 意味仕様と形式仕様の分離 |
| F-6 | テスト図書の不在 | 正本体系（`docs/01`〜`03`）にテスト仕様書・テスト成績書が存在せず、テスト結果にIDが附番されていない。 | 要件→コード→テスト結果の追跡 |
| F-7 | 冗長・装飾的記述 | `docs/README.md` に「技術ポートフォリオとしてのハイライト」「比類なき」等、設計図書の記述対象外の宣伝的記述がある。 | 必要十分かつ簡潔 |
| F-8 | 仮定IDと品質ゲートIDの衝突 | 仮定マーカー `【仮定: Q-xxx】` と品質ゲート基準 `Q-01`〜`Q-11` が同じ接頭辞 `Q-` を共有している。 | ID一意性 |

## 2. スコープと仕様概要 (What)

### 2.1 やること (In Scope)
本PBIの成果物は「規約（ルールの正本）」「雛形（図書別構造の正本）」「検査器（規約の機械強制）」の3点である。規約と雛形の役割を分離し、同じ規則を2か所に書かない。

#### 2.1.1 方針A: 図書体系の再定義（汎用・プロジェクト非依存）
以下の図書体系を標準として規約化する。プロジェクト固有の内容を持たないため、ディレクトリごと他プロジェクトへ転用できる構成とする。

| 階層 | ファイル（標準名） | 文書ID | 記述対象（これ以外は書かない） | 定義するID種別 |
| :--- | :--- | :--- | :--- | :--- |
| 索引 | `README.md` | `DOC-IDX-001` | 図書一覧、図書間の参照関係図、閲覧方法 | `DOC` |
| 00 統制 | `00_project_charter/01_project_charter.md` | `DOC-GOV-001` | 背景、目的、スコープ、成功基準、体制 | — |
| 00 統制 | `00_project_charter/02_coding_standards.md` | `DOC-GOV-002` | 実装言語別の記述規約、コード内IDタグ規約 | — |
| 00 統制 | `00_project_charter/03_documentation_standard.md`（**新設**） | `DOC-GOV-003` | 図書体系、図書別記述責務、共通記述構文、リンク規約、文体規約 | — |
| 00 統制 | `00_project_charter/04_id_numbering_rules.md`（**新設**） | `DOC-GOV-004` | 全ID種別の書式・定義元図書・附番手順・廃止手順 | — |
| 01 要件 | `01_requirements/01_requirements_specification.md` | `DOC-REQ-001` | 業務要件、機能要件と受入基準、非機能要件、制約 | `REQ-BIZ` `REQ-FNC` `REQ-NFR` `REQ-CON` |
| 02 基本設計 | `02_basic_design/01_system_architecture.md` | `DOC-BD-001` | システム構成、実行環境、方式判断記録（ADR） | `ADR` |
| 02 基本設計 | `02_basic_design/02_functional_specification.md` | `DOC-BD-002` | 機能の振る舞い、業務フロー、機能単位の状態遷移（画面は書かない） | `FNC` |
| 02 基本設計 | `02_basic_design/03_external_interface_specification.md` | `DOC-BD-003` | 外部I/Fの目的・入出力の**意味**・エラー体系 | `EXT` `ERR` |
| 03 詳細設計 | `03_detail_design/01_software_structure_design.md` | `DOC-DD-001` | モジュール・コンポーネント・クラスの構成と依存関係 | `MOD` `CLS` |
| 03 詳細設計 | `03_detail_design/02_internal_interface_specification.md` | `DOC-DD-002` | モジュール間I/Fの目的・入出力の**意味** | `INT` |
| 03 詳細設計 | `03_detail_design/03_program_specification.md` | `DOC-DD-003` | プログラム（ファイル単位）と関数の処理論理・入出力の**意味** | `PRG` `FN` |
| 03 詳細設計（形式） | `03_detail_design/04_database_specification.md`（**新設**） | `DOC-DD-004` | テーブル・カラム・制約・索引の**形式** | `DAT-DBT` |
| 03 詳細設計（形式） | `03_detail_design/05_file_format_specification.md`（**新設**） | `DOC-DD-005` | 入出力・設定ファイルの**形式**（構文、文字コード、改行、必須キー） | `DAT-FIL` |
| 03 詳細設計（形式） | `03_detail_design/06_data_structure_specification.md`（**新設**） | `DOC-DD-006` | 変数・構造体・型・スキーマの**形式**（型、桁、値域、既定値、必須性） | `DAT-TYP` |
| 03 詳細設計（画面） | `03_detail_design/07_screen_specification.md`（**新設**・Issue #21 追加指示） | `DOC-DD-007` | 画面の見た目（レイアウト・寸法・部品配置・表示状態）と画面間の遷移関係。本PJでは「画面」をスライドレイアウトおよびMCPクライアント上の操作画面と定義する | `SCR` `TRN` |
| 04 テスト | `04_test/01_test_specification.md`（**新設**） | `DOC-TST-001` | テストケース、前提、手順、期待結果、合否基準 | `TEST-UT` `TEST-IT` `TEST-ST` |
| 04 テスト | `04_test/02_test_report.md`（**新設**） | `DOC-TST-002` | テスト実行結果、数値サマリー、不具合記録 | `TRS` |
| 05 追跡 | `05_traceability/01_traceability_matrix.md`（**新設**） | `DOC-RTM-001` | 要件〜テスト結果の追跡表（唯一の正本） | — |
| 雛形 | `templates/tpl_<上記ファイル名>.md` | `TPL-<文書IDの種別部>-NNN` | 上記各図書の空の章構造（プロジェクト固有データ0件） | — |
| バックログ | `backlog/{todo,in_progress,done}/PBI-NNN_<slug>.md` | — | 個別変更要求 | `PBI` |

- **記述責務の排他性**: 各図書は上表「記述対象」列の内容のみを書く。他図書の責務に属する内容を説明上参照したい場合は、本文に転記せず、正本図書の該当見出しへObsidian形式リンクを張る（方針D）。
- **画面仕様書（`DOC-DD-007`）**: 画面の見た目と画面間遷移のみを書く。画面部品に表示するデータの型・桁・値域は書かず `DAT-*` を参照する。画面から呼び出す機能の振る舞いは書かず `FNC` / `EXT` を参照する。`SCR` は機能仕様書ではなく本書で定義する。
- **形式仕様書の参照関係**: `DOC-DD-004`〜`006` は形式のみを定義し、`DOC-BD-003`（外部I/F）、`DOC-DD-002`（内部I/F）、`DOC-DD-003`（プログラム）から参照される（方針F）。
- **該当なし図書の扱い**: プロジェクトに該当しない図書（本PJの `DOC-DD-004` DB仕様書）は作成せず、`README.md` の図書一覧に「該当なし」と理由を1行で記載する。【仮定: Q-105】
- **README/RTMの重複解消**: 追跡表は `DOC-RTM-001` のみに置き、`README.md` からは削除する。各図書末尾の「関連設計図書への参照リンク」章は廃止し、各図書の第1章「本書の位置づけ」に関連図書リンクを集約する。

#### 2.1.2 方針B: 共通記述構文（全図書・全雛形に適用）
`DOC-GOV-003` に以下を規定する。

1. **YAML Frontmatter（必須キー）**: `id`（文書ID）、`title`、`doc_type`（`charter` / `standard` / `requirements` / `basic_design` / `detail_design` / `test` / `traceability` / `template`）、`version`（SemVer `X.Y.Z`）、`status`（`Draft` / `Review` / `Approved` / `Deprecated`）、`date`（`YYYY-MM-DD`）、`author`（ロールIDまたは `N-Y-Public`）、`doc_standard`（準拠する規約版。例: `DOC-GOV-003@1.0.0`）、`tags`。
2. **見出しと章節項番号**:
   - 見出しレベル n（`#` の個数）の見出しは、n 個の番号をピリオドで連結した番号を必ず持つ。書式は `^#{n} \d+(\.\d+){n-1} <見出し文字列>$`（例: `# 1 本書の位置づけ`、`## 1.1 目的`、`#### 1.1.1.1 hogehoge`）。番号末尾にピリオドを付けない。番号と見出し文字列の間は半角スペース1個とする。
   - Issue記載例（`#### 1.1.1.1`）に従い、H1 を第1階層（章）として使用し、文書タイトルは Frontmatter の `title` のみに記載する。【仮定: Q-102】
   - 番号は各階層で1から始まる連番とし、欠番・重複・階層飛ばし（H2 の直下に H4）を禁止する。番号なしの見出し、丸数字（①等）による擬似見出しを禁止する。
   - フェンスドコードブロック内の `#` 行は見出しとして扱わない（現行テスト仕様書の bash コメントが見出し誤認される問題への対処）。
3. **全図書共通の第1章**: `# 1 本書の位置づけ` とし、`## 1.1 目的`、`## 1.2 記述対象`、`## 1.3 記述対象外と参照先`（他図書へのリンク一覧）、`## 1.4 改版履歴`（列: 版 / 日付 / 起因PBI / 変更概要）を固定で持つ。
4. **ID定義の記法（定義は1か所・参照はリンク）**:
   - **見出し定義型**（`REQ-BIZ`, `REQ-FNC`, `REQ-NFR`, `REQ-CON`, `ADR`, `FNC`, `SCR`, `TRN`, `EXT`, `MOD`, `CLS`, `INT`, `PRG`, `FN`, `DAT-*`）: 定義元図書の見出し `<番号> <ID> <名称>`（例: `## 3.2 REQ-FNC-002 自律的要素リサイズ機能`）で定義し、直下に種別ごとに固定された「属性表」（列: 項目 / 内容）を置く。属性表には必ず `上位ID`（追跡元）と `状態` を含める。
   - **表定義型**（受入基準 `-ACnn`、入出力項目 `-INnn`/`-OUTnn`、フィールド `-Fnn`、`ERR`、`TEST-*`、`TRS`）: 定義元図書の所定の表の第1列で定義する。
   - 一覧表（ID・名称の再掲のみの表）は作成しない。全体把握は見出しアウトライン（Obsidian のアウトラインペイン）で行う。
5. **文体・簡潔性規約**: 常体（である調）、1文1事項、数値は単位付き、図は Mermaid のみ。曖昧語（「適宜」「原則として」「速やかに」「適切に」「十分な」「など」。助詞「等」は文脈依存のため対象外）と装飾的形容（「極めて」「比類なき」「美しく」等）を禁止語リストとして定義する。未確定事項は `【仮定: ASM-NNN】`、未記入箇所は `【TBD】` マーカーで示す。

#### 2.1.3 方針C: ID附番規則（`DOC-GOV-004`）
- **書式**: `<種別>-<連番3桁>` または `<種別>-<分類>-<連番3桁>`。種別・分類は英大文字2〜4文字。連番はゼロ埋め3桁で、999を超えた場合のみ4桁とする。子IDは親IDに接尾辞を付ける（受入基準 `-AC01`、入力項目 `-IN01`、出力項目 `-OUT01`、フィールド `-F01`、テスト実行結果 `-R01`）。
- **一意性と不変性**: IDはリポジトリ全体で一意とし、一度附番したIDの意味変更・再利用を禁止する。廃止時は定義を削除せず `状態: Deprecated` と後継IDを属性表に記載する。附番は定義元図書内の既存最大値+1とする。
- **ID種別一覧（標準案）**:

| 対象 | 書式 | 例 | 定義元図書 | 上位ID（追跡元） |
| :--- | :--- | :--- | :--- | :--- |
| 図書 | `DOC-<階層>-NNN` | `DOC-DD-006` | `README.md` | — |
| 雛形 | `TPL-<階層>-NNN` | `TPL-DD-006` | 各雛形 Frontmatter | `DOC` |
| バックログ項目 | `PBI-NNN` | `PBI-016` | `backlog/` | — |
| 業務要件 | `REQ-BIZ-NNN` | `REQ-BIZ-001` | `DOC-REQ-001` | — |
| 機能要件 | `REQ-FNC-NNN` | `REQ-FNC-002` | `DOC-REQ-001` | `REQ-BIZ` |
| 受入基準 | `<REQ-FNC ID>-ACnn` | `REQ-FNC-002-AC01` | `DOC-REQ-001` | 親ID |
| 非機能要件 | `REQ-NFR-NNN` | `REQ-NFR-005` | `DOC-REQ-001` | `REQ-BIZ` |
| 制約事項 | `REQ-CON-NNN` | `REQ-CON-001` | `DOC-REQ-001` | — |
| 方式判断記録 | `ADR-NNN` | `ADR-001` | `DOC-BD-001` | `REQ-*` |
| 機能 | `FNC-NNN` | `FNC-004` | `DOC-BD-002` | `REQ-FNC` |
| 画面 | `SCR-NNN` | `SCR-001`（旧 `LAY-001`） | `DOC-DD-007` | `FNC` |
| 画面部品 | `<SCR ID>-Cnn` | `SCR-001-C01` | `DOC-DD-007` | 親ID |
| 画面遷移 | `TRN-NNN` | `TRN-001` | `DOC-DD-007` | `SCR`（遷移元） |
| 外部I/F | `EXT-<分類>-NNN` | `EXT-MCP-001` | `DOC-BD-003` | `FNC` |
| 入出力項目 | `<I/F・関数ID>-INnn` / `-OUTnn` | `EXT-MCP-001-IN01` | 親I/Fの定義元 | 親ID |
| エラーコード | `ERR-<分類>-NNN` | `ERR-VAL-001` | `DOC-BD-003` | `EXT` |
| モジュール | `MOD-<分類>-NNN` | `MOD-SRV-001` | `DOC-DD-001` | `FNC` |
| クラス | `CLS-<分類>-NNN` | `CLS-PPT-001` | `DOC-DD-001` | `MOD` |
| 内部I/F | `INT-<分類>-NNN` | `INT-SRV-001` | `DOC-DD-002` | `MOD` |
| プログラム | `PRG-<分類>-NNN` | `PRG-SRV-001` | `DOC-DD-003` | `MOD` |
| 関数・メソッド | `FN-<分類>-NNN` | `FN-SRV-001` | `DOC-DD-003` | `PRG` / `INT` / `EXT` |
| DBテーブル | `DAT-DBT-NNN` | `DAT-DBT-001` | `DOC-DD-004` | — |
| ファイル形式 | `DAT-FIL-NNN` | `DAT-FIL-001` | `DOC-DD-005` | — |
| 変数・構造体・型 | `DAT-TYP-NNN` | `DAT-TYP-001`（`SlideDeck`） | `DOC-DD-006` | — |
| フィールド | `<DAT ID>-Fnn` | `DAT-TYP-001-F01` | 親DATの定義元 | 親ID |
| テストケース | `TEST-<UT/IT/ST>-NNN` | `TEST-UT-004` | `DOC-TST-001` | `FN` / `INT` / `REQ-FNC-*-ACnn` |
| テスト実行結果 | `TRS-<UT/IT/ST>-NNN-Rnn` | `TRS-UT-004-R01` | `DOC-TST-002` | `TEST` |
| 仮定 | `ASM-NNN` | `ASM-001` | 発生図書 | — |

- **分類コード台帳**: `<分類>` は `DOC-GOV-004` 内の分類コード台帳（例: `SRV`=MCPサーバー、`ENG`=Marpエンジン、`PPT`=PPTX変換、`THM`=テーマ、`INF`=基盤、`SKL`=スキル、`MCP`/`CLI`/`LIB`/`CFG`/`DOC`=外部I/F分類）に登録済みのコードのみ使用できる。他プロジェクトは台帳のみを差し替えて転用する。
- **コードへの追跡（要件→関数）**: 関数・クラス・プログラムの実装箇所の直上コメントに `@spec <ID>`（例: `// @spec FN-SRV-001`）、テストコードに `@test <TEST ID>` を記載する規則を `DOC-GOV-004` に定義し、`DOC-GOV-002` からリンクする。
- **品質ゲートIDとの分離**: 品質ゲート基準（`Q-01`〜`Q-11`, `D-01`）は統制IDとして現行維持し、仮定マーカーは `ASM-NNN` に改める。【仮定: Q-104】

#### 2.1.4 方針D: リンク規約（Obsidian形式）
- 図書間参照は `[[<ファイル名（拡張子なし）>#<見出し全文>|<表示文字列>]]` とする（例: `[[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]]`）。同一図書内参照は `[[#<見出し全文>|<表示文字列>]]` とする。
- 表定義型IDへの参照は、その表を含む見出しへリンクし、表示文字列をIDとする（例: `[[03_external_interface_specification#4.2 エラーコード一覧|ERR-VAL-001]]`）。
- Obsidian はファイル名（basename）でリンクを解決するため、`docs/` 配下のファイル名を全体で一意とする。雛形は `tpl_` 接頭辞で正本と区別する。
- `docs/` 内図書への Markdown相対リンク `[..](...md)` を禁止する。外部URLは Markdownリンク、ソースコードはバッククォート付きリポジトリ相対パス（例: `` `src/index.ts` ``）で記載する。
- 見出し番号の変更でリンクが切れるため、リンク先（ファイル・見出し）の実在を検査器で全件検査する（方針G）。

#### 2.1.5 方針E: 図書別記述構文（雛形を正本とする）
- 図書ごとの章構造・属性表の列定義・表定義型の列定義は、`docs/templates/tpl_*.md` の各雛形を唯一の正本とする。`DOC-GOV-003` には雛形へのリンクのみを置き、章構造を再掲しない。
- 雛形は全見出しに番号を持ち、プロジェクト固有の値を含まない（記入箇所は `【TBD】`）。
- 雛形は2.1.1の表の全図書分（19図書。`README.md` を含み、`backlog` を除く）を用意する。【仮定: Q-103】

#### 2.1.6 方針F: 入出力仕様の「意味」と「形式」の分離
- **意味仕様**（`DOC-BD-003` / `DOC-DD-002` / `DOC-DD-003`）: 入出力項目表の列を `項目ID` / `名称` / `意味・意図` / `必須` / `形式参照` に固定する。`形式参照` 列には `DAT-*` IDへのリンクのみを書き、型・桁・値域を書かない。
- **形式仕様**（`DOC-DD-004`〜`006`）: フィールド表の列を `フィールドID` / `論理名` / `物理名` / `型` / `桁・長さ` / `値域・書式（正規表現可）` / `既定値` / `必須` に固定する。用途・意図は書かず、利用側の意味仕様からの被参照で表現する。
- 同一データ構造が関数Aの出力かつ関数Bの入力となる場合は、両者の入出力項目表が同一 `DAT-*` IDを参照する。

#### 2.1.7 方針G: 構文検査器の新設と既存検査への統合
- `.agents/skills/ipa-traceability-validator/scripts/verify_doc_syntax.py` を新設し（Python標準ライブラリのみ・新規依存0件）、`verify_rtm.py --mode all` から呼び出す。検査項目は以下のとおり。
  1. Frontmatter必須キーの存在と値の書式
  2. 見出し番号（書式・連番・欠番・重複・階層飛ばし、コードブロック除外）
  3. 第1章固定構造の存在
  4. ID書式（`DOC-GOV-004` の種別一覧・分類コード台帳との照合）
  5. ID定義の一意性（定義元図書以外での定義、二重定義の検出）
  6. Obsidianリンクの解決（ファイル・見出しの実在）と `docs/` 内 Markdown相対リンクの検出
  7. 禁止語リストの検出
  8. ホスト絶対パスの検出（個人実名は機械判定できないため `.githooks/pre-commit` に委ね、本検査器の対象外とする）
- **段階適用**: 検査対象は Frontmatter に `doc_standard` を持つファイルに限定する。既存の正本図書（未移行）は検査対象外となり、移行PBIで `doc_standard` を付与した時点から検査対象となる。これにより本PBI単独でも `verify_rtm.py` の PASS を維持する。

#### 2.1.8 方針H: 既存データ保持テンプレートの退避
- 実データを保持している現行 `docs/templates/01`〜`06`, `99` を `docs/legacy/templates/` へ `git mv` で退避し、`verify_rtm.py` の参照パスのみを変更する（検査ロジックは変更しない）。退避ファイルは後続の移行PBIで正本へ統合した後に削除する。【仮定: Q-106】
- `docs/templates/tpl_98_pbi_template.md` は現行の `verify_rtm.py` PBI検査（`## 1.`〜`## 5.`）と結合しているため本PBIでは変更しない。

#### 2.1.9 参照箇所の更新
- `docs/README.md` の図書一覧に `DOC-GOV-003` / `DOC-GOV-004` と新雛形を追記する（全面改稿は移行PBIで実施）。
- `.agents/rules/ipa-process-gate.md`、`.agents/skills/ipa-*/SKILL.md`、`AGENTS.md` / `GEMINI.md` に「設計図書の記述は `DOC-GOV-003` / `DOC-GOV-004` に従う」旨の参照1行を追加する（`ipa-process-gate.md` の24KB上限を維持）。

### 2.2 やらないこと (Out of Scope)
以下は本PBI承認後に後続PBIとして `docs/backlog/todo/` へ起票する。【仮定: Q-101】
- **PBI-017（予定）既存正本図書の新体系移行**: `docs/01`〜`03` の新ファイル構成への再編、`DOC-DD-005`/`006`/`007`・`DOC-TST-001`/`002`・`DOC-RTM-001` の実体作成、`docs/legacy/templates/` の内容統合と削除、ID体系の統一（`REQ-F-*`→`REQ-FNC-*`、`MOD-001`→`MOD-*-NNN`、`LAY`→`SCR`（機能仕様書から画面仕様書へ移管）等の新旧ID対応表作成）、`README.md` 全面改稿。
- **PBI-018（予定）検査・運用の新体系対応**: `verify_rtm.py` の新ID体系対応とRTM自動生成（各定義の `上位ID` 属性からの生成）、PBI雛形の新構文化と既存PBIの書式移行、ソースコードへの `@spec` / `@test` タグ付与、`ipa-*` スキル本文の全面改訂、仮定マーカー `Q-xxx`→`ASM-NNN` の一括置換。
- ソースコード（`src/`, `pptx_converter/`, `themes/`, `marp.config.js`）の挙動変更。
- 完了済みPBI（`docs/backlog/done/`）の本文改変。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 本PBIの成果物がマージされた状態で, When `docs/00_project_charter/03_documentation_standard.md` を開いたとき, Then 2.1.1の図書体系表（全図書の記述対象・定義ID種別）、共通記述構文（Frontmatter必須キー9種、見出し番号書式、第1章固定構造、ID定義記法、文体・禁止語リスト）、リンク規約、意味仕様と形式仕様の分離規則がすべて記載されていること。
- [x] **AC-2:** Given 本PBIの成果物がマージされた状態で, When `docs/00_project_charter/04_id_numbering_rules.md` を開いたとき, Then 2.1.3の全ID種別（28種）について書式・例・定義元図書・上位IDが表で定義され、分類コード台帳、子ID接尾辞、一意性・不変性・廃止手順、コードタグ（`@spec` / `@test`）規則が記載されていること。
- [x] **AC-3:** Given `docs/templates/` 配下の新雛形一式に対して, When `verify_doc_syntax.py` を実行したとき, Then 19図書分の `tpl_*.md` が存在し、全見出しが番号書式に適合し、構文違反0件で終了コード0となること。
- [x] **AC-4:** Given 番号なし見出し・番号重複・階層飛ばし・未登録ID接頭辞・ID二重定義・解決不能なObsidianリンク・`docs/` 内Markdown相対リンク・禁止語・ホスト絶対パスの各違反を1件ずつ含む検査用フィクスチャに対して, When `verify_doc_syntax.py` を実行したとき, Then 9種の違反がそれぞれ固有のエラーコードで9件検出され、終了コード1となること。
- [x] **AC-5:** Given フェンスドコードブロック内に `# ` で始まる行を含み、それ以外は規約に適合する文書に対して, When `verify_doc_syntax.py` を実行したとき, Then コードブロック内の行は見出しとして扱われず、違反0件となること。
- [x] **AC-6:** Given Frontmatter に `doc_standard` を持たない既存正本図書（`docs/01`〜`03`）が未変更の状態で, When Dockerコンテナ内で `verify_rtm.py`（`--mode all`）を実行したとき, Then 既存図書は構文検査対象外として扱われ、`docs/legacy/templates/` への退避後も結果が `PASS`（終了コード0）となること。
- [x] **AC-7:** Given 本PBIで追加・変更した全ファイルに対して, When ホスト絶対パス（`/Users/`, `/home/`, `C:\`）を検査器と `.githooks/pre-commit` で機械検索したとき, Then 検出件数が0件であること。

- [x] **AC-8:** Given `docs/templates/tpl_07_screen_specification.md` を開いたとき, When 章構造を確認すると, Then 「画面遷移図（Mermaid `stateDiagram-v2`）」「画面遷移定義表（`TRN-NNN`・遷移元・遷移先・契機・条件）」「画面ごとの見た目（寸法・配置図・画面部品表 `SCR-NNN-Cnn`・表示状態）」の3要素が固定見出しとして存在し、画面部品表の型・値域列が `DAT-*` 参照のみであること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - 要件: `docs/legacy/templates/03_non_functional_requirements.md`（退避後）に `REQ-NFR-007`（設計図書の記述構文・トレーサビリティ統制）を追加予定。正本 `docs/01_requirements/01_requirements_specification.md` の非機能要件（運用・保守性）へ差分追記予定。
  - 設計: `docs/legacy/templates/05_software_design.md`（退避後）に `MOD-004`（設計図書構文検査モジュール `verify_doc_syntax.py`）を追加予定。
  - テスト: `docs/legacy/templates/06_test_specification.md`（退避後）に `TEST-UT-004`（検査器単体: AC-3〜AC-5）、`TEST-ST-010`（体系全体検査: AC-1, AC-2, AC-6, AC-7）を追加予定。
  - 統制: `.agents/rules/ipa-process-gate.md`、`.agents/skills/ipa-*/SKILL.md`、`AGENTS.md`、`GEMINI.md`、`docs/README.md`。
- **DB/外部IF変更の有無:** なし（MCPツールI/F・CLI・ソースコードの挙動変更なし）。新規NPM/Pythonパッケージ導入なし（`ipa-system-architect` 審査対象外）。
- **主要リスクと対策:**
  - 見出しに番号を含めるため、見出し番号変更時にObsidianリンクが切れる → 方針Gの全リンク解決検査で検出する。
  - GitHub上ではObsidian形式リンクがリンクとして描画されない → Issue #21 の指定によりObsidian閲覧を正とし、GitHub上はリンク文字列表示を許容する。
  - 移行完了（PBI-017）まで旧体系と新規約が併存する → `doc_standard` 有無による段階適用で検査結果の混乱を防ぐ。
- **未決事項（承認者確認待ち）:**

| 仮定ID | 内容 | 推奨案（本PBIの暫定前提） | 代替案 |
| :--- | :--- | :--- | :--- |
| `Q-101` | Issue #21 の対応範囲 | 本PBIは規約・雛形・検査器の策定に限定し、既存図書の移行（PBI-017）と検査・運用の新体系対応（PBI-018）を分割する | 1PBIで移行まで一括実施 |
| `Q-102` | H1 の用途 | H1 を章（`# 1`）に使い、文書タイトルは Frontmatter のみに記載する（Issue例 `#### 1.1.1.1` に整合） | H1 を番号なしタイトルとし、`## 1` から番号付与 |
| `Q-103` | 雛形の作成範囲 | 2.1.1の全19図書分を作成する | 新設8図書（2.1.1の「新設」行）の雛形のみ |
| `Q-104` | 仮定マーカーのID | `ASM-NNN` に変更する（`Q-01` 等のゲートIDと分離） | 現行 `Q-xxx`（3桁）を維持し桁数で区別 |
| `Q-105` | 該当なし図書 | 作成せず `README.md` に「該当なし」と理由を記載する | 第1章のみの「該当なし」図書を作成する |
| `Q-106` | 現行データ保持テンプレート | `docs/legacy/templates/` へ退避し、PBI-017で統合後に削除する | `docs/templates/` に新旧を併存させる |

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **ブランチ:** `docs/antigravity-2.0/issue-21/strict-document-syntax-standard`（Task Initiation Protocol により `resolve_issue_twenty_one` から是正済み）
- **追加・更新した要件ID:** REQ-NFR-007（旧テンプレート3層）、REQ-FNC-010（正本要件定義書）
- **追加・更新した設計書/モジュールID:** MOD-004 / MOD-DOC-001 / FNC-010 / PRG-DOC-001（画面仕様書 `DOC-DD-007` の雛形を含む）
- **追加・更新したテストID:** TEST-UT-004, TEST-ST-010
- **指示反映:** 2回目の指示により、詳細設計レベルの画面仕様書（`DOC-DD-007`、画面の見た目と画面遷移）を追加し、図書体系を18→19図書、ID種別を26→28種（画面部品 `SCR-NNN-Cnn`、画面遷移 `TRN-NNN` を追加）とした。`SCR` の定義元を機能仕様書から画面仕様書へ移管した。
- **Q-101〜Q-106:** 推奨案のとおり承認（本PBIの実装に反映済み。仮定マーカーとしては残存なし）。
- **検証実績 (実測値):**
  - AC-1/AC-2 (規約図書): 必須章11章の存在、ID種別28種を `tests/test_verify_doc_syntax.py::test_standard_contents` で確認 (PASS)
  - AC-3 (雛形・構文検査): 雛形19件、規約適合対象21図書（標準2＋雛形19）で違反0件 (PASS)
  - AC-4 (違反9種): `test_nine_violations_detected` で9種のコードが各1件検出 (PASS)
  - AC-5 (コードブロック除外): `test_fenced_code_is_ignored` 違反0件 (PASS)
  - AC-6 (段階適用・RTM): `verify_rtm.py` PASS（断絶0件。PBI 15 / REQ 10 / MOD 4 / TEST 20、正本 REQ-FNC 10 / MOD 7 / PRG 7、構文検査対象21図書） (PASS)
  - AC-7 (絶対パス): 追加ファイル群で `PII-PATH` 該当0件 (PASS)
  - AC-8 (画面仕様書雛形): 画面遷移図・遷移定義・見た目・画面部品・表示状態の見出し存在を `test_templates_complete` で確認 (PASS)
  - 単体テスト: `python3 -m unittest tests.test_verify_doc_syntax` 9/9 件合格
