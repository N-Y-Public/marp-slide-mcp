---
pbi_id: "PBI-013"
title: "MCP経由およびMarp CLIでのPDF出力時に末尾に必ず白紙ページが出力される不具合の修正"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-FNC-004", "REQ-NFR-001"]
related_mod_ids: ["MOD-SRV-001", "MOD-ENG-001"]
related_test_ids: ["TEST-ST-009"]
---

# [PBI-013] MCP経由およびMarp CLIでのPDF出力時に末尾に必ず白紙ページが出力される不具合の修正

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 本MCPサーバーまたはMarp CLIを利用してスライドデッキを作成し、PDF出力（`export_to_pdf` または `generate_slide_deck`）を行うプレゼンテーション作成者
- **〜したい (I want to):** スライドデッキをPDF出力した際、定義したスライド枚数（表紙＋通常スライド群）と生成されたPDFの総ページ数が完全に一致し、末尾に不要な真っ白の白紙ページが出力されないようにしたい
- **なぜなら (So that):** 最終ページに白紙が存在するとプレゼンテーション資料として不完全であり、印刷時や共有時に不要な白紙ページ削除の手間が発生し、資料品質およびツール信頼性を大きく損なうため（Issue #16）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **原因1（Mermaid用DOM要素残存による印刷時ページ送りの誘発）の解消**:
  - `themes/vendor/marp-mermaid-loader.js` において、`document.body` 直下に一時生成される `#mermaid-workspace` および外部ライブラリ `mermaid.min.js` が生成するツールチップ要素 `.mermaidTooltip` がスライドコンテナ（`<div class="marpit">` 等）の外側に残存することにより、Chromiumの `@media print` 印刷エンジンがスライド全ページの描画後に追加ブロックとして解釈し、不要な白紙ページを生成していた。
  - `themes/business-slide-theme.css` に `@media print { #mermaid-workspace, .mermaidTooltip { display: none !important; } }` を追加し、印刷レンダリングエンジンに対して完全に不可視・レイアウト非算出とする。
  - `themes/vendor/marp-mermaid-loader.js` 側でもレンダリング完了後（`render()` 完了時）に `workspace.remove()` によるDOM完全除去、および `.mermaidTooltip` に対する `display = 'none'` を明示的に適用する多層防御を施す。
- **原因2（表紙のみのスライドデッキ生成時における余分な区切り線の抑止）の解消**:
  - `src/index.ts` の `generateMarpMarkdown()` において、`deck.titleSlide` の直後に無条件で `\n---\n` が出力されており、通常スライドが0枚（`deck.normalSlides.length === 0`）の場合に末尾改ページ記号として解釈され白紙ページが出力される問題を防止するため、`if (deck.normalSlides.length > 0)` の条件分岐を追加する。
- **検証テスト（`TEST-ST-009`）の作成と自動回帰検証**:
  - Mermaid図を含むスライド（4スライド）を出力した際に正確に4ページのPDFが生成されること。
  - Mermaid図を含まないスライドを出力した際に正確に指定枚数のPDFが生成されること。
  - 表紙のみ（通常スライド0枚）のスライドデッキを出力した際に正確に1ページのPDFが生成されること。
  - 既存の公式サンプルスライド（`slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md`）のPDF出力ページ数が正確にスライド枚数（17ページ）と一致すること。

### 2.2 やらないこと (Out of Scope)
- Mermaidダイアグラム自体の描画ロジック・テーマ配色・SVGスタイルの変更。
- Marp CLI自体の内部印刷パイプラインやChromiumコマンドライン引数の変更。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-UT-002`, `TEST-ST-002`, `TEST-ST-009`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given Mermaidダイアグラムを含むスライドデッキ（N枚）において、When MCPツール `export_to_pdf` または Marp CLI でPDFを出力したとき、Then 生成されたPDFの総ページ数が正確にNページであり、最終ページに白紙ページが存在しないこと。（実測値: 4スライド → 4ページ）
- [x] **AC-2:** Given Mermaidダイアグラムを含まない通常スライドデッキ（N枚）において、When PDFを出力したとき、Then 生成されたPDFの総ページ数が正確にNページであること。（実測値: 3スライド → 3ページ）
- [x] **AC-3:** Given 表紙スライドのみ（通常スライド0枚）で構成されるスライドデッキにおいて、When `generateMarpMarkdown()` を通してMarkdownを生成しPDF出力したとき、Then 末尾に余剰な `---` が出力されず、生成されたPDFの総ページ数が正確に1ページであること。（実測値: 1スライド → 1ページ、末尾区切り線なし）
- [x] **AC-4:** Given 既存のサンプルスライド（`slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md`）において、When `npm run build:pdf` を実行したとき、Then 全スライドが正常に描画され、余分な白紙ページが発生せず、既存テストおよび `verify_rtm.py` がエラー0件で通過すること。（実測値: 17セクション → 17ページ完全一致、TEST-ST-001〜009全件PASS）

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - `docs/templates/02_functional_requirements.md` / `docs/01_requirements/01_requirements_specification.md`（`REQ-F-003` / `REQ-FNC-001`）
  - `docs/templates/03_non_functional_requirements.md`（`REQ-NFR-001`）
  - `docs/templates/05_software_design.md` / `docs/03_detail_design/03_program_specification.md`（`MOD-001`, `MOD-002` / `MOD-SRV-001`, `MOD-THM-001`, `MOD-MMD-001`）
- **DB/外部IF変更の有無:** MCPツールの外部インターフェース（引数・戻り値スキーマ）の変更なし。`themes/business-slide-theme.css`、`themes/vendor/marp-mermaid-loader.js`、`src/index.ts` の内部ロジック修正。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-003`, `REQ-NFR-001`
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-002`
- **追加・更新したテストID:** `TEST-UT-002`, `TEST-ST-002`, `TEST-ST-009`
