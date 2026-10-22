---
pbi_id: "PBI-009"
title: "表紙タイトル・サブタイトルの複数行表示における下部要素はみ出し防止と自動余白・フォントサイズ縮小調整"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-001", "REQ-NFR-001"]
related_mod_ids: ["MOD-002"]
related_test_ids: ["TEST-ST-005"]
---

# [PBI-009] 表紙タイトル・サブタイトルの複数行表示における下部要素はみ出し防止と自動余白・フォントサイズ縮小調整

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** Marpスライドの作成者および閲覧者
- **〜したい (I want to):** 表紙（タイトルスライド）においてタイトルやサブタイトルが3行以上の複数行になった場合でも、所属・氏名や作成日などの下部メタ情報がスライド下端からはみ出さず、タイトル領域内で美しく整然と表示されるようにしたい
- **なぜなら (So that):** 企業向けプレゼンテーション等で長大な文書タイトルや詳細なサブタイトルを指定した際、スライド高さ（720px）の制限によって重要な発表者情報や作成日が画面外へ脱落・欠落する事故を防ぎ、視認性と信頼性の高いスライドを維持するため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- 表紙スライド（`section[data-marpit-pagination="1"]`）における下部要素（図書番号、所属・氏名、作成日）の配置構造を改善し、スライド下部の安全領域（フッター帯の手前）に安定配置（絶対配置固定等）する。
- タイトルおよびサブタイトルの利用可能領域（バナー下 y=100px 〜 下部メタ情報上端 y=500px）を有効活用し、タイトルが複数行化した場合の上部余白（`margin-top`）を柔軟に調整する。
- タイトルとサブタイトルの余白（間隔）を詰め、さらに行数に応じてフォントサイズおよび行間（`line-height`）を段階的に縮小（36pt → 28pt → 24pt 等）させる適応ルールをテーマCSS（`themes/business-slide-theme.css`）に導入する。
- 1行タイトル、2行タイトル、3行以上（4行含む）の長文タイトル、および長文サブタイトルが混在するケースを検証する自動テスト仕様（`TEST-ST-005`）を作成し、Dockerコンテナ内での回帰検証を完了させる。

### やらないこと (Out of Scope)
- 2ページ目以降の通常コンテンツスライド（`section:not([data-marpit-pagination="1"])`）の見出し仕様変更（表紙スライド固有の修正に限定）。
- 表紙フッター帯（コピーライト・機密指定）の既存デザイン・色調の変更。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-ST-005`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 表紙タイトルが3行以上（改行あり）で記述されたスライドにおいて、When Marp CLIまたはMCPによりHTML/PDFへ変換したとき、Then 所属・氏名（`h3:last-of-type+*`）および作成日（`h4+*`）の下端がスライド高さ（720px）およびフッター帯境界（680px）の手前（≦ 680px）に完全に収まり、ページ外へはみ出さないこと。
- [x] **AC-2:** Given 表紙タイトルが3行以上記述されたスライドにおいて、When レンダリング結果を検証したとき、Then タイトル要素のフォントサイズがデフォルト（36pt）から縮小（28pt以下）され、タイトルとサブタイトル、および所属・氏名が視覚的に重複・重畳しないこと。
- [x] **AC-3:** Given 表紙タイトルが1行の通常スライドにおいて、When レンダリング結果を検証したとき、Then 既存のレイアウト（36ptタイトル、適切な上部余白、所属・作成日の定位置表示）が維持され、既存外観に対するデグレが発生しないこと。
- [x] **AC-4:** Given 4:3比率および16:9比率の双方向のスライドにおいて、When 複数行タイトル表紙を出力したとき、Then 図書番号、所属・氏名、作成日がフッター帯および左右マージンに準拠した所定位置に正しく配置されること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** 
  - `docs/01_requirements/01_requirements_specification.md`（`REQ-F-001`, `REQ-FNC-001`）
  - `docs/02_basic_design/` / `docs/templates/04_system_architecture.md`
  - `docs/03_detail_design/` / `docs/templates/05_software_design.md`（`MOD-002` スタイルシート仕様）
- **DB/外部IF変更の有無:** 外部API/DBの変更なし。`themes/business-slide-theme.css` のCSS規則の拡張および自動テスト `tests/verify_cover_title_overflow.js` の追加。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** REQ-F-001, REQ-NFR-001
- **追加・更新した設計書/モジュールID:** MOD-002
- **追加・更新したテストID:** TEST-ST-005
- **検証実績 (実測値):**
  - ケース1 (1行 16:9): タイトル 48px(36pt), bottom=282.39px, 所属 bottom=635.00px ≦ 680px, 作成日 bottom=670.00px ≦ 680px (AC-1, AC-3 PASS)
  - ケース2 (3行 16:9): タイトル 32px(24pt), bottom=260.17px, サブ top=280.17px, 所属 top=545.42px, bottom=635.00px ≦ 680px (AC-1, AC-2 PASS)
  - ケース3 (4行 16:9): タイトル 26.67px(20pt), bottom=242.69px, サブ top=262.69px, 所属 top=545.42px, bottom=635.00px ≦ 680px (AC-1, AC-2 PASS)
  - ケース4 (3行 4:3): タイトル 32px(24pt), bottom=336.95px, サブ top=356.95px, 所属 top=575.28px, bottom=635.00px ≦ 680px (AC-1, AC-2, AC-4 PASS)
