---
pbi_id: "PBI-012"
title: "企業環境のAdobe Acrobat Reader / Acrobatにおける出力PDFの文字・画像の白飛び（非表示）不具合の修正"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-003", "REQ-NFR-001", "REQ-NFR-006"]
related_mod_ids: ["MOD-001", "MOD-002"]
related_test_ids: ["TEST-UT-002", "TEST-IT-002", "TEST-ST-002", "TEST-ST-008"]
---

# [PBI-012] 企業環境のAdobe Acrobat Reader / Acrobatにおける出力PDFの文字・画像の白飛び（非表示）不具合の修正

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 企業環境でMarpスライドからPDFを出力し、メール（Outlook等）添付で社内外へ共有するプレゼンテーション作成者および閲覧者
- **〜したい (I want to):** 本MCPサーバーおよびMarp CLIで出力したPDFを、企業環境のAdobe Acrobat Reader / Adobe Acrobat（新UI・旧UI、保護ビュー有効環境、アクセシビリティ色置換設定環境、Windows/Linux生成の双方）で開いた際に、すべての文字や画像が白飛びせず正常に視認できるようにしたい
- **なぜなら (So that):** PDF内にテキストや画像データ自体が存在していても、閲覧者のAdobe Acrobat環境設定やPDF内部のグラデーション・透過マスク・Type3フォント構造に起因して文字や図表が真っ白になり読めなくなる重大な共有障害（Issue #18）を根絶するため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- **原因1（全面 `linear-gradient` によるPDF `PatternType 2` / `ShadingType 2` 背景と色置換・透過合成不整合）の解消**:
  - `themes/business-slide-theme.css` の `section` に指定されている全面 `background: linear-gradient(to bottom, #ffffff 0px, #ffffff 680px, var(--primary-color) 680px, var(--primary-color) 720px)` を廃止し、単色背景（`background-color: #ffffff`）＋下部フッター帯の単色矩形描画（`box-shadow: inset 0 -40px 0 0 var(--primary-color)`）に変更することで、PDFのページ全面が `PatternType 2`（`ShadingType 2` 軸方向シェーディング）で覆われる構造を排除する。
  - 明示的な印刷色維持指定（`-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-scheme: light !important;`）を付与する。
- **原因2（複雑透過マスク `SMask`・ネスト透過グループの排除）の解消**:
  - 表紙バナーSVG（`themes/business-slide-theme.css` 内の `--banner-image` Data URI および `slides/D01-000001_Marpの使い方/banner.svg`）で使用されている `<mask id="mask-light">` / `<mask id="mask-dark">`（PDF変換時に `/TR` 転送関数付きソフトマスク `SMask` と多重 `/Transparency` グループを生成しAcrobatの保護ビューやGPU描画で白飛びを誘発する構造）を、`fill-opacity` のみを用いたマスクレスSVG構造へ置換する。
  - 会話吹き出し（`.conversation-content`）の `box-shadow`（PDF内でDeviceGray JPEGの `SMask` XObjectを生成）を `box-shadow: none !important;` に変更する。
- **原因3（OpenType/CFF フォントおよび合成太字 Faux Bold に起因する反転 `FontBBox` を持つ `Type3` フォント埋め込みの回避）の解消**:
  - Chromium（Skia PDFバックエンド）がOpenType/CFF形式（`Noto Sans CJK JP`）の埋め込み時や、Boldウェイトを持たないフォント（`IPAPGothic` 等）に対する合成太字（Faux Bold）描画時に、不正な反転バウンディングボックス（`/FontBBox [ 35 120 988 -880 ]` 等、`lly > ury`）を持つ大量の `/Subtype /Type3` フォントへフォールバックしAcrobatで文字が非表示になる問題を防ぐため、TrueTypeアウトライン（`CIDFontType2`）として埋め込まれるフォント優先リスト（`'Meiryo', 'BIZ UDGothic', 'Yu Gothic', 'IPAPGothic', 'IPAGothic', 'DejaVu Sans', sans-serif`）と `font-synthesis: none !important` を `themes/business-slide-theme.css` および `themes/vendor/marp-mermaid-loader.js` に導入する。
- **サンプルスライドのPDF再生成と回帰検証**:
  - `slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md` からPDF/PPTXを再生成し、PDF内部ストリーム解析テスト（`TEST-ST-008` / `tests/verify_acrobat_pdf_compatibility.js`）によって `ShadingType 2` 全面背景・不正 `Type3` フォント・複雑 `SMask` が0件であることを機械的に検証する。

### やらないこと (Out of Scope)
- スライドの視覚的レイアウト構造（ヘッダー・クレーム帯・フッター帯・本文領域の座標配置）やブランドカラー配色の変更。
- 外部有償フォントの新規バンドル（OS標準またはオープンソースのTrueTypeフォントのみを使用）。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-UT-002`, `TEST-IT-002`, `TEST-ST-002`, `TEST-ST-008`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 標準テーマ（`business-slide-theme.css`）を適用したMarpスライドにおいて、When PDF出力（`export_to_pdf` または `npm run build:pdf`）を実行したとき、Then 生成されたPDFのコンテンツストリームにおいてスライド全面（`960x720` / `720x540`）を覆う `PatternType 2`（`ShadingType 2`）グラデーションパターンが0件であり、背景が標準の単色矩形（`re f`）およびフッター矩形として出力されること。（実測値: `ShadingType 2` = 0件、単色白背景 = 全ページ出力、単色フッター矩形 = 全16ページ出力）
- [x] **AC-2:** Given 表紙バナーおよび会話吹き出し・表を含むスライドにおいて、When PDF出力を実行したとき、Then 生成されたPDFオブジェクト内にSVG `<mask>` 由来の転送関数（`/TR`）付きソフトマスク（`/SMask`）および吹き出しドロップシャドウのグレースケールJPEGマスクが0件であり、表紙バナーと各スライド要素が欠落なく描画されること。（実測値: `/TR` (`FunctionType 4`) = 0件、`/SMask` = 0件）
- [x] **AC-3:** Given Dockerコンテナ環境（Linux Chromium）において日本語テキストを含むスライドをPDF出力したとき、Then 生成されたPDF内のフォント辞書において反転した `FontBBox`（`lly > ury`）を持つ `/Subtype /Type3` フォントが0件であり、日本語フォントが標準の `/Subtype /Type0`（`/Subtype /CIDFontType2` TrueTypeアウトライン）として埋め込まれること。（実測値: `/Subtype /Type3` = 0件、反転 `FontBBox` = 0件、`/Subtype /CIDFontType2` = 6件）
- [x] **AC-4:** Given 既存の4:3および16:9スライドデッキにおいて、When 修正後のテーマCSSでHTML/PDF/PPTXをビルドしたとき、Then 既存の目次自動生成・要素リサイズ・表紙レイアウト機能に一切のデグレが発生せず、全自動テストおよび `verify_rtm.py` がエラー0件で通過すること。（実測値: `TEST-ST-004`〜`TEST-ST-008` 全件合格、`verify_rtm.py` 断絶0件）

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - `docs/templates/02_functional_requirements.md` / `docs/01_requirements/01_requirements_specification.md`（`REQ-F-003` / `REQ-FNC-001`, `REQ-FNC-006`）
  - `docs/templates/03_non_functional_requirements.md`（`REQ-NFR-001`, `REQ-NFR-006`）
  - `docs/templates/04_system_architecture.md`
  - `docs/templates/05_software_design.md` / `docs/03_detail_design/03_program_specification.md`（`MOD-001`, `MOD-002`）
- **DB/外部IF変更の有無:** MCPツールの外部インターフェース（引数・戻り値スキーマ）の変更なし。`themes/business-slide-theme.css`、`themes/vendor/marp-mermaid-loader.js`、`slides/D01-000001_Marpの使い方/` の内部改善。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-003`, `REQ-NFR-001`, `REQ-NFR-006`
- **追加・更新した設計書/モジュールID:** `MOD-001`, `MOD-002`
- **追加・更新したテストID:** `TEST-UT-002`, `TEST-IT-002`, `TEST-ST-002`, `TEST-ST-008`
