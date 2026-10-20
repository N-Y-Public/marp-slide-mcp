---
pbi_id: "PBI-004"
title: "目次（TOC）自動生成機能における複数ページ分割・ページ番号シフト不整合の修正"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-002", "REQ-NFR-003"]
related_mod_ids: ["MOD-001", "MOD-002"]
related_test_ids: ["TEST-UT-002", "TEST-IT-001", "TEST-ST-001"]
---

# [PBI-004] 目次（TOC）自動生成機能における複数ページ分割・ページ番号シフト不整合の修正

> 関連 GitHub Issue: [#7 - fix: 目次の自動生成機能が動かない](https://github.com/N-Y-Public/marp-slide-mcp/issues/7)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** スライド作成者およびAIエージェント（VS Code GitHub Copilot / Claude / Antigravity 等）
- **〜したい (I want to):** 表紙込みで17ページ以上（目次項目が1ページの上限12件を超える多数ページ）のスライドデッキを作成し、MCP経由またはMarp CLIでPDF/HTMLを出力した際、目次の2ページ目以降（`目次 (続き)`）が独立したスライドページとして自動生成され、全スライドの表題とページ番号が欠落・ズレなく目次に表示されるようにしたい
- **なぜなら (So that):** 現状の実装では以下の原因により目次2ページ目以降が出力されず、後半ページの目次項目が消失・ページ番号が不一致となる重大な不具合（Issue #7）が発生しているため：
  1. **Marpit コアルール実行順序の不整合（直接原因）**: `marp.config.js` の `marp_toc` プラグインが `md.core.ruler.push('marp_toc', ...)` によりパイプライン末尾（`marpit_inline_svg`・`marpit_directives_apply`・`marpit_header_and_footer`・`marpit_collect` の**後**）に登録されている。そのため、複数の `<section class="toc">` トークンに分割置換しても、すでに単一の `<svg data-marpit-svg><foreignObject>` コンテナ内に閉じ込められており、2ページ目以降の目次が独立したスライド（SVGページ）として生成されず画面外へ切り捨てられる。
  2. **後続スライドのページ番号・アンカーID属性の未更新**: `marpit_directives_apply` 実行後にトークンメタデータ（`marpitSlide` / `marpitSlideTotal`）のみを加算しているため、レンダリングされるHTML属性（`id`, `data-marpit-pagination`, `data-marpit-pagination-total`）に目次増加分のページシフト（`+(totalAddedSlides - 1)`）が反映されない。
  3. **MCP経由での目次スライド生成時のフッター保持・クラス補完**: MCP（`generate_slide_deck` 等）から生成された目次スライドに含まれる `###### コピーライト`・`###### 機密指定` トークンが `marp_toc` 置換時に消失するほか、AIエージェントが `pageTitle: "目次"` で本文空のスライドを作成した際に `toc` クラス指定を忘れるケースがある。

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- **`marp.config.js` (`MOD-002` / `MOD-ENG-001`) の修正**:
  1. `marp_toc` ルールの登録位置を `md.core.ruler.after('marpit_directives_parse', 'marp_toc', ...)`（`marpit_inline_svg` および `marpit_directives_apply` の**前**）へ変更し、`state.inlineMode` 時は即時リターンするガードを追加する。
  2. 目次チャンク（1スライド最大12項目: `ITEMS_PER_SLIDE = 12`）ごとに生成する `marpit_slide_open` / `marpit_slide_close` トークンに `meta.marpitSlideElement = 1` / `-1`、`meta.marpitDirectives`（ディープコピー）、および正しい `id` 属性（`String(slideNumber)`）を設定し、後続の `marpit_inline_svg`・`marpit_directives_apply`・`marpit_header_and_footer`・`marpit_collect` が各目次ページを正規の独立スライドとして処理できるようにする。
  3. 元の目次スライド内に存在するフッター用見出しアンカー（`h6` コピーライト・機密指定および直後の段落トークン）やヘッダー/フッタートークンを抽出し、分割生成されたすべての目次スライドへ複製引き継ぎする。
  4. 目次スライドより後ろの全後続スライドの `marpit_slide_open` / `marpit_slide_close` について、`meta.marpitSlide`・`meta.marpitSlideTotal` および `id` 属性を `+(totalAddedSlides - 1)` シフトさせ、目次内のページ番号・アンカーリンク（`#N`）と実スライドのページ番号表示（`data-marpit-pagination`）を100%一致させる。
- **`src/index.ts` (`MOD-001` / `MOD-SRV-001`) の改善**:
  1. `resolveSlideContent` において、`pageTitle` が `"目次"`（または `"Table of Contents"`）であり、かつ本文（`bodyContent`, `twoColumns`, `imageGrid`）が空で `classes` に `"toc"` が未指定の場合、自動的に `"toc"` クラスを補完して目次自動生成が確実に発動するようにする。
- **設計書差分更新および回帰テスト (`TEST-*`)・RTM (`verify_rtm.py`) 検証**:
  1. 詳細設計書（`docs/03_detail_design/02_internal_interface_specification.md`, `03_program_specification.md`, `docs/templates/05_software_design.md`）の `marp_toc` フック位置・トークン制御仕様を補正する。
  2. 17ページ以上（例: 表紙1枚＋目次＋通常スライド15枚＝目次2ページ分割で計18ページ）および3ページ目次分割（25項目以上）のテストケースを検証し、`verify_rtm.py` でトレーサビリティ断絶0件を確認する。

### やらないこと (Out of Scope)
- 1スライドあたりの目次最大項目数（`ITEMS_PER_SLIDE = 12`）の閾値変更（既存要件 `REQ-FNC-004-04` の12項目/ページ基準を維持）
- 目次スライドのCSSデザイン（ドットリーダーやフォントサイズ計算式）の大幅な変更

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 表紙込みで17枚以上（目次対象となる通常スライドが13枚以上、例: 15枚）のスライドデッキ, When Marpエンジン（`marp_toc`）およびMCPの `generate_slide_deck` / `export_to_pdf` でHTML・PDFを生成した時, Then 12項目ごとに独立した `<svg data-marpit-svg>`（PDFページ）として目次2ページ目（`目次 (続き)`）以降が自動生成され、全スライド項目が1件も欠落せず目次に表示されること
- [x] **AC-2:** Given 目次が2ページ以上に自動分割されたスライドデッキ, When レンダリングされたHTML/PDFの各スライド要素を検証した時, Then 目次内の各リンク（`href="#N"`）および表示ページ番号（`.toc-page`）と、遷移先スライドの `id="N"` およびフッターページ番号（`data-marpit-pagination="N"` / `data-marpit-pagination-total`）が全ページで100%一致すること
- [x] **AC-3:** Given ヘッダーロゴ（`header` ディレクティブ）およびフッター（`###### コピーライト`、`###### 機密指定`）が設定されたスライドデッキ, When 目次が複数ページに自動分割された時, Then 分割された1ページ目・2ページ目以降のすべての目次スライドにヘッダーロゴ・コピーライト・機密指定が欠落なく描画されること
- [x] **AC-4:** Given AIエージェントがMCPツール `generate_slide_deck` を呼び出す際, When `pageTitle: "目次"` かつ本文空のスライドを `classes` 未指定で渡した時（または `classes: ["toc"]` を明示指定した時）, Then 自動で `<!-- _class: toc -->` が適用され、複数ページ目次自動生成が正常に動作すること
- [x] **AC-5:** Given 既存の12項目以下のスライドデッキ（`slides/D01-000001_Marpの使い方/` 等）, When Docker環境内で `npm run build`、`npm run build:pdf`、および `verify_rtm.py` を実行した時, Then ビルドエラー0件・回帰不具合0件・RTMトレーサビリティ断絶0件（Exit Code `0`）で完了すること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - 要件定義: `REQ-F-002` / `REQ-FNC-004`（`REQ-FNC-004-04` 複数ページ自動分割）、`REQ-NFR-003` / `REQ-NFR-MNT-01`
  - 詳細設計: `MOD-002` / `MOD-ENG-001`（`marp.config.js` 内の `INT-ENG-002: marp_toc`）、`MOD-001` / `MOD-SRV-001`（`src/index.ts` 内の `INT-FN-001: resolveSlideContent`）
- **DB/外部IF変更の有無:** なし（MCPツールの外部I/Fスキーマに対する破壊的変更なし）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-002`, `REQ-NFR-003`（正本: `REQ-FNC-004`）
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-002`（正本: `MOD-ENG-001`, `MOD-SRV-001` / `02_internal_interface_specification.md`, `03_program_specification.md`, `05_software_design.md`）
- **追加・更新したテストID:** `TEST-UT-002`, `TEST-IT-001`, `TEST-ST-001`
