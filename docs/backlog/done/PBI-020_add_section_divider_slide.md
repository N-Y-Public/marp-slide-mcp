---
pbi_id: "PBI-020"
title: "中見出し（セクションディバイダー）スライド生成および章別目次モードの追加"
type: "feature"
status: "done"
priority: "high"
related_req_ids: ["REQ-FNC-012"]
related_mod_ids: ["MOD-SRV-001", "MOD-ENG-001"]
related_test_ids: ["TEST-UT-006", "TEST-ST-012"]
---

# [PBI-020] 中見出し（セクションディバイダー）スライド生成および章別目次モードの追加

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 大量のページが存在するスライド資料を作成するスライド作者
- **〜したい (I want to):** 複数ページをまとめて1つの章として区切るため、章の開始位置に4種類の中見出し（セクションディバイダー）スライドを挿入し、目次において中見出し章タイトルのみを抽出表示する章別目次モードを利用したい
- **なぜなら (So that):** 長大なスライド資料であっても全体の構成と現在地を聴衆へ明瞭に提示でき、特定ページへのハイパーリンク遷移も可能にすることでプレゼンテーションの可読性と操作性を高めるため（Issue #17）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **中見出しスライドデータモデルの追加 (`SectionDividerSlideSchema`)**:
  - `NormalSlideSchema` または新規スキーマとして中見出し定義を追加し、MCPツール（`generate_slide_deck`, `insert_slide`, `update_slide`）から指定可能にする。
  - 4種類のレイアウトパターン（`pattern: "title-only" | "title-and-pages" | "all-chapters" | "all-chapters-and-pages"`）をサポートする。
    1. `title-only`: 当該章のタイトルのみが中央左寄せに大きく記述されるタイプ。
    2. `title-and-pages`: 当該章のタイトルと、当該章に属するページタイトル一覧がインデント1段階下の小さめフォントで箇条書きされるタイプ。
    3. `all-chapters`: 全章のタイトル一覧が箇条書きされ、当該章のタイトルは太字強調、他章は標準の太さかつ薄い色で表示されるタイプ。
    4. `all-chapters-and-pages`: 全章のタイトル一覧（当該章太字、他章薄い色）に加え、当該章の下に属するページタイトル一覧がインデント1段階下・小さめ文字で箇条書きされるタイプ。
- **ハイパーリンク遷移機能**:
  - 中見出しスライド内の「当該章に属するページタイトル」要素に、対象スライドページへのMarkdownアンカーリンク（`[タイトル](#ページ番号)`）を自動付与する。
- **専用レイアウトスタイル (`themes/business-slide-theme.css`)**:
  - 中見出し専用CSSクラス `section-divider` を新設し、左寄せ・垂直中央（上下中央）配置、不要なヘッダー主張バーや図表タイトルの非表示化、他章タイトルの薄色表示（`.dim` クラス）を定義する。
- **章別目次モード (`marp.config.js`)**:
  - 自動生成目次プラグインにおいて、全通常スライドではなく中見出しページに記載された章タイトルとページ番号のみを抽出して目次を構築する `chapterTocMode`（`classes: ["toc", "toc-chapters-only"]` 等）を追加する。

### 2.2 やらないこと (Out of Scope)
- 表紙スライド（`TitleSlide`）の中見出し化
- PowerPoint（PPTX）への独自アニメーション付与（静的シェイプおよびテキスト出力として対応）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given スライドデッキ生成の入力データ, When 4種類のパターン（`title-only`, `title-and-pages`, `all-chapters`, `all-chapters-and-pages`）のいずれかを指定した中見出しスライドデータを与えて `generate_slide_deck` または `generateMarpMarkdown` を実行した時, Then 指定されたパターンに応じたクラスディレクティブ（`<!-- _class: section-divider ... -->`）と章見出しMarkdownが生成され、不要な主張バーや図表タイトルが出力されないこと。
- [x] **AC-2:** Given `title-and-pages` または `all-chapters-and-pages` パターンの中見出しスライドデータ, When 該当章に属するページタイトル一覧が指定されている時, Then 生成されたMarkdown内のページタイトル要素が該当ページ番号へのMarkdownリンク（`[タイトル](#スライド番号)`）としてレンダリングされること。
- [x] **AC-3:** Given `all-chapters` または `all-chapters-and-pages` パターンの中見出しスライドデータ, When 全章タイトル一覧とカレント章が指定されている時, Then カレント章タイトルは太字（`**...**`）でマークアップされ、他章タイトルは薄色クラス（`.dim` クラス）で区別して出力されること。
- [x] **AC-4:** Given スライドデッキ内に中見出しスライドおよび `toc-chapters-only` クラスが指定された目次スライドが存在する時, When Marpカスタムエンジン（`marp.config.js`）によりHTMLまたはPDF変換が実行された時, Then 目次一覧に中見出しスライドの章タイトルとページ番号のみが抽出されて表示されること。
- [x] **AC-5:** Given 中見出しスライド機能の設計・実装・テスト成果物, When Dockerコンテナ環境において `npm run build`、単体テスト、総合テスト、および `verify_rtm.py` を実行した時, Then コンパイルエラー0件、テスト全件合格、および `PBI-020` ↔ `REQ-FNC-012` ↔ `MOD-SRV-001` / `MOD-ENG-001` ↔ `TEST-UT-006` / `TEST-ST-012` の追跡性断絶0件（Exit Code 0）を達成すること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-FNC-012`（新規）, `MOD-SRV-001`（`src/index.ts`）, `MOD-ENG-001`（`marp.config.js`）, `themes/business-slide-theme.css`
- **DB/外部IF変更の有無:** 外部I/F（`EXT-MCP-001`, `EXT-MCP-003`, `EXT-MCP-004`）の入力スキーマに `sectionDivider?: SectionDividerSchema` を追加（オプショナル項目のため既存スライド定義への破壊的変更なし）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-012`
- **追加・更新した設計書/モジュールID:** `MOD-SRV-001`, `MOD-ENG-001`, `FN-SRV-009`, `FN-ENG-001`, `DAT-TYP-010`
- **追加・更新したテストID:** `TEST-UT-006`, `TEST-ST-012`
