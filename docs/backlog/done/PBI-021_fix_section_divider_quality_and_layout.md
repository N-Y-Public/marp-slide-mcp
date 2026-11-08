---
pbi_id: "PBI-021"
title: "中見出しスライドの表示位置・機密表示配置・リンクHTML化・4:3比率適用の品質是正"
type: "bugfix"
status: "done"
priority: "high"
related_req_ids: ["REQ-FNC-012"]
related_mod_ids: ["MOD-SRV-001", "MOD-ENG-001"]
related_test_ids: ["TEST-UT-007", "TEST-ST-013"]
---

# [PBI-021] 中見出しスライドの表示位置・機密表示配置・リンクHTML化・4:3比率適用の品質是正

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** スライド資料の読者および作成者
- **〜したい (I want to):** 中見出しスライドにおいて、①機密指定区分（CONFIDENTIAL）やコピーライトがスライド最下部フッター帯に正しく配置され、②通常スライド左上の不要なヘッダータイトルが消去されて章題名がスライド中央の適正な位置に大きく表示され、③ページ一覧のリンクが生Markdown文字列ではなくクリック可能なHTMLアンカーリンクとしてレンダリングされ、④サンプルスライドが標準の4:3比率でレイアウトされるように是正したい
- **なぜなら (So that):** PBI-020で追加された中見出しスライド機能において、CSSセレクタの競合による機密表示の浮遊、章題名の左上配置と本文中央の空白化、HTMLタグ内Markdown混在による生リンク露出、16:9比率でのサンプル作成といった品質不具合が存在し、ビジネススライドとしての実用性を損なっていたため（Issue #17 フィードバック）

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- **機密指定区分・フッター配置の是正 (`themes/business-slide-theme.css`)**:
  - `section.section-divider > h4 ~ *` の乱暴なセレクタ適用を廃止し、`h6`（コピーライト・機密指定）およびその直後コンテンツが通常スライドと同様に最下部フッター帯（`bottom: 12px`, `bottom: 8px`）に絶対配置されるようにCSSを修正する。
- **章題名表示位置の是正および通常ヘッダー非表示化 (`themes/business-slide-theme.css`, `src/index.ts`)**:
  - `section.section-divider` において、通常スライド左上のヘッダータイトル（`section:not([data-marpit-pagination="1"])>h1~*`）を完全に非表示（`display: none !important;`）化する。
  - 章題名（`.chapter-title`）をスライドメイン領域の垂直中央に配置し、大見出しフォント（32pt〜36pt）、太字、テーマカラーアクセントライン付きの洗練されたタイポグラフィとしてスタイリングする。
- **ページ一覧リンクのHTML化・生Markdown露出の根絶 (`src/index.ts`)**:
  - `resolveSectionDividerSlide` において、`<div>` 内にMarkdown構文（`- [タイトル](#ページ)`）を混入させるのを廃止し、純粋なセマンティックHTML（`<ul class="chapter-pages-list"><li><a href="#ページ">タイトル</a></li></ul>`、`<ul class="all-chapters-list">...</ul>`）を出力する方式へ改修する。これによりMarkdownパーサーの未解釈による生テキスト露出を100%防止する。
- **ショウケーススライドの4:3比率化 (`slides/D01-000003_中見出しスライドサンプル/`)**:
  - サンプルスライド（`D01-000003_中見出しスライドサンプル.md`）のフロントマターを `size: 4:3`（960px × 720px）に更新し、全12スライドが4:3画面比率で美しく収まるように調整する。
  - 4:3比率のHTMLおよびPDFを再エクスポートする。
- **回帰テストおよび品質ゲート検査**:
  - `tests/test_section_divider.py` に上記ACを自動検証する単体・総合テストを追加する。
  - `verify_rtm.py` および `verify_doc_syntax.py` による追跡性・文書規約検査をパスさせる。

### 2.2 やらないこと (Out of Scope)
- 表紙スライド（Page 1）のスタイル変更
- 既存の通常スライド（`NormalSlideSchema`）の基本レイアウト破壊

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 中見出しスライド（4パターン全て）, When HTML/PDFレンダリングされた時, Then コピーライト（左下）および機密指定区分（右下・赤字）が通常スライドと同一の最下部フッター帯の絶対位置に正しく配置され、本文領域内に浮遊しないこと。
- [x] **AC-2:** Given 中見出しスライド（4パターン全て）, When HTML/PDFレンダリングされた時, Then 通常スライド左上のヘッダータイトル（h1コンテンツ）は完全に非表示となり、章題名（`chapterTitle`）がスライド本文メイン領域の垂直中央に適正なフォントサイズ（32pt以上・太字・アクセント装飾）で配置されること。
- [x] **AC-3:** Given `title-and-pages` または `all-chapters-and-pages` パターンの中見出しスライド, When ページ一覧がレンダリングされた時, Then 生のMarkdown記法（`-[タイトル](#ページ)`）として露出せず、完全にクリッカブルなHTMLアンカーリンク（`<a href="#ページ">`）としてレンダリングされること。
- [x] **AC-4:** Given 中見出しショウケーススライド（`D01-000003_中見出しスライドサンプル`）, When Marpビルドが実行された時, Then `size: 4:3`（960px × 720px）でレイアウト崩れなくPDFおよびHTMLが正常に出力されること。
- [x] **AC-5:** Given 修正後の全成果物, When Docker環境で `npm run build`、単体・総合テスト、および `verify_rtm.py` を実行した時, Then コンパイルエラー0件、テスト全件合格、および `PBI-021` ↔ `REQ-FNC-012` ↔ `MOD-SRV-001` / `MOD-ENG-001` ↔ `TEST-UT-007` / `TEST-ST-013` の追跡性断絶0件（Exit Code 0）を達成すること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-FNC-012`, `FNC-012`, `MOD-SRV-001` (`src/index.ts`), `themes/business-slide-theme.css`, `slides/D01-000003_中見出しスライドサンプル/`
- **DB/外部IF変更の有無:** なし（既存Zodスキーマへの破壊的変更なし、内部レンダリングHTMLおよびCSSの品質是正）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-012`
- **追加・更新した設計書/モジュールID:** `MOD-SRV-001`, `MOD-ENG-001`, `FN-SRV-009`, `DAT-TYP-010`
- **追加・更新したテストID:** `TEST-UT-007`, `TEST-ST-013`

