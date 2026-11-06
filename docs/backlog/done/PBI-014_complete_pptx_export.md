---
pbi_id: "PBI-014"
title: "PDFと同一レイアウトかつ要素単位で編集可能なネイティブ.pptx出力機能の完成（表・Mermaid・会話・コード・数式・スライドマスター対応）"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-FNC-005", "REQ-NFR-002", "REQ-NFR-004"]
related_mod_ids: ["MOD-SRV-001", "MOD-PPT-001"]
related_test_ids: ["TEST-UT-003", "TEST-IT-002", "TEST-ST-002", "TEST-ST-010"]
---

# [PBI-014] PDFと同一レイアウトかつ要素単位で編集可能なネイティブ.pptx出力機能の完成（表・Mermaid・会話・コード・数式・スライドマスター対応）

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 企業にてMarpスライドを作成する担当者
- **〜したい (I want to):** PDFと全く同一の見た目・レイアウトを維持したまま、タイトル・主張・図表タイトル・本文（文章・表・画像・会話アイコン・吹き出し・Mermaid図・コードブロック・数式等）が細切れにならず、文字化けなくPowerPoint上で個別に編集可能な `.pptx` ファイルを出力したい
- **なぜなら (So that):** 企業内でプレゼンテーション資料を共有・二次編集する際には `.pptx` 形式が不可欠であり、Acrobat Readerの有料変換機能に頼らず本リポジトリの無料機能だけで実務品質のPowerPoint資料を完結させるため（Issue #19）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **Marp設定・レンダリングパイプラインの完全同期 (`MOD-003`)**:
  - `pptx_converter/convert.js` における中間HTML生成時に `--config-file marp.config.js` を確実に適用し、自動目次生成（`marp_toc`）および静的自動リサイズ（`auto_resize_static`）をPDF出力時と100%一致させる。
  - PuppeteerでのDOM計測時に、MarpのSVG/foreignObjectラッパーやビューポートスケーリングに左右されないスライド基準座標系（4:3時は `960x720`、16:9時は `1280x720`）で正確なBoundingBoxと計算済みスタイルを取得する。
  - DOM `Range.getClientRects()` による実際の文字描画外接矩形（Tight Text Rect）計測と、Linux（`IPAPGothic`）〜Windows PowerPoint（`Meiryo`）間のフォント文字幅補正（`estimateMeiryoSingleLineWidth`）および `margin: 0` を組み合わせ、テキストボックス枠を実描画文字サイズに密着させる。
- **全スライド構成要素のネイティブ編集可能オブジェクト変換と細切れ防止 (`MOD-003`)**:
  - **表紙（タイトルスライド）**: バナー画像（SVG/Data URI/ファイル）、メインタイトル、サブタイトル、図書番号（右端アンカー `nativeW - 50` 基準のタイト右寄せ配置）、所属・氏名、作成日、ヘッダーロゴ、フッター帯・コピーライト・機密区分をPDFと同一座標・フォント・色で個別テキストボックス/画像として配置する。
  - **見出し・主張領域**: ページタイトル（H1直後要素＋下線）、ページ主張（H2直後要素＋ネイビー背景ボックス）、図表補足タイトル（H3直後要素・中央アンカー基準タイト枠）をそれぞれ1つのまとまった編集可能シェイプ/テキストボックスとして出力する。
  - **目次 (`section.toc`)**: タイトル（CSS通りの非太字ウェイト・メイリオ幅補正による1行維持）、破線リーダー、ページ番号（幅60px固定・`wrap: false` による2桁数字の縦折れ防止）を重なりなく整然と配置する。
  - **本文テキスト・箇条書き・2段組 (`columns-2`)・画像グリッド (`images-2`〜`4`)**: 段落や箇条書きリストが1文字・1単語ごとに細切れになることを防ぎ、意味のあるブロック単位（カラム単位・リスト単位）の編集可能テキストボックスおよびキャプション付き画像として配置する。
  - **表 (`<table>`)**: 従来のプレーンテキスト結合を廃止し、PptxGenJSのネイティブ表（`slide.addTable`）を用いてセル単位のテキスト・背景色・文字色・太字・罫線・列幅/行高を保持した編集可能なPowerPointテーブルとして出力する。
  - **コードブロック (`<pre><code>`)**: シンタックスハイライト色および改行・インデントを維持した単一の編集可能テキストボックス（背景色・枠線付き、文字化けなし）として出力する。
  - **会話レイアウト (`conversation-content`)**: 発言者アバター（`<img>` 指定時および未指定時のデフォルトシルエット `#bbbbbb` 背景＋白人物アイコンの双方を80x80角丸CanvasでPNG Data URIへラスタライズ）、発言者名ラベル（1行固定）、吹き出し図形（編集可能な図形＋テキスト）を正確に配置する。
  - **Mermaid図 (`div.mermaid > svg`)**: Mermaidが生成したSVGのノード（矩形・角丸・ひし形・円・円柱等）、エッジ（矢印・接続線）、ラベルテキストを解析し、PowerPoint上で編集可能な図形・テキスト要素としてPDFと同一配置で出力する。
  - **数式（KaTeX / MathJax `$...$` / `$$...$$`）の文字化け防止とPowerPointネイティブ数式（Office MathML `<m:oMath>`）対応**:
    - KaTeXの `.katex-mathml` と `.katex-html` の二重テキスト抽出による文字化け・重複出力を排除する。
    - 数式要素をLaTeX/MathML/MathJax ASTからOffice Open XML Math（`<a14:m><m:oMathPara><m:oMath>...`）へ変換して `.pptx` 内のDrawingMLへ埋め込み、PowerPointの「数式」挿入時と同等のネイティブ数式オブジェクトとして編集可能にする。
- **スライドマスター・ヘッダー・フッター構造の整備 (`MOD-003`)**:
  - 各種レイアウト（表紙用・通常スライド用・ワイドコンテンツ用・目次用）に応じたスライドマスター（`defineSlideMaster`）を登録し、共通背景・下部フッター帯・ヘッダーロゴ・フッター（コピーライト・右端70px/赤太字 `#FF0000` の機密区分・ページ番号）を構造化して出力する。
- **MCPツールおよびビルドスクリプトの統合 (`MOD-001`, `package.json`)**:
  - MCPサーバー（`src/index.ts`）に `export_to_pptx` ツールを追加し、`npm run build:pptx` でも編集可能なカスタムPPTXが出力されるよう統一する。

### 2.2 やらないこと (Out of Scope)
- 外部有償APIや有償ソフトウェア（Adobe Acrobat有償版等）への依存追加。
- スライドの既存PDFデザイン（`themes/business-slide-theme.css` の視覚仕様）の破壊的変更。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 表紙、目次、通常テキスト、箇条書き、2段組、表、画像グリッド、会話レイアウト、Mermaid図、コードブロックを含むMarpスライドにおいて、When PPTX出力を実行したとき、Then タイトル・主張・図表タイトル・本文の各構成要素がラスタライズされた1枚の背景画像ではなく個別に選択・テキスト編集可能なPowerPointネイティブ要素（TextBox / Shape / Table / Image）として出力され、かつ単語や文字単位の細かすぎる分割が発生していないこと。
- [x] **AC-2:** Given 4:3（960x720）および16:9（1280x720）のスライドデッキにおいて、When PDF出力とPPTX出力の双方を実行したとき、Then 全ページ数が一致（自動目次ページ分割含む）し、各要素の配置座標・サイズ・背景色・テーマカラー・ボーダー・フォントサイズがPDFの描画位置と整合していること（画面外はみ出し・要素消失 0件、実描画文字サイズに密着したタイトなテキストボックスであること）。
- [x] **AC-3:** Given インライン数式（`$...$`）・ブロック数式（`$$...$$`）・プログラムコード・日本語を含むスライドにおいて、When PPTX出力を実行したとき、Then KaTeXの二重抽出等による文字化け・重複文字列が0件であり、数式がPowerPointネイティブ数式（Office MathML `<m:oMath>`）として `.pptx` のスライドXML内に格納されていること。
- [x] **AC-4:** Given ロゴ・コピーライト・機密区分・ページ番号を持つスライドデッキにおいて、When PPTX出力を実行したとき、Then レイアウトに応じたスライドマスターが登録され、ロゴがヘッダー領域に、右寄せ赤太字（`#FF0000`）の機密区分・権利元（コピーライト）・スライドページ番号がフッター領域に欠落なく出力されること。
- [x] **AC-5:** Given 修正後のリポジトリにおいて、When Dockerコンテナ内で `npm run build`、PPTX自動検証テスト、および `verify_rtm.py` を実行したとき、Then ビルドエラー0件、テスト全件合格、トレーサビリティ断絶0件（Exit Code `0`）であること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - `docs/01_requirements/01_requirements_specification.md` / `docs/templates/02_functional_requirements.md`（`REQ-F-003`）
  - `docs/02_basic_design/` / `docs/templates/04_system_architecture.md`（`EXT-MCP-008` / `EXT-CLI-002`）
  - `docs/03_detail_design/` / `docs/templates/05_software_design.md`（`MOD-001`, `MOD-003`）
- **DB/外部IF変更の有無:** `pptx_converter/convert.js` の全面刷新、`pptx_converter/omml.js` の新規作成、`package.json` のスクリプト整備、および `src/index.ts` におけるPPTX出力MCPツール（`export_to_pptx`）の追加。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-005`, `REQ-NFR-002`, `REQ-NFR-004`
- **追加・更新した設計書/モジュールID:** `MOD-SRV-001`, `MOD-PPT-001` (`EXT-CLI-002`, `INT-PPT-001`, `INT-PPT-002`, `PRG-PPT-001`)
- **追加・更新したテストID:** `TEST-UT-003`, `TEST-IT-002`, `TEST-ST-002`, `TEST-ST-010`
