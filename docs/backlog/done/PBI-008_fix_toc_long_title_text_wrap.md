---
pbi_id: "PBI-008"
title: "目次（TOC）スライドにおける長文タイトルの自動折り返し・見切れ防止"
type: "bugfix" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-002", "REQ-FNC-004"]
related_mod_ids: ["MOD-002", "MOD-THEME-001"]
related_test_ids: ["TEST-UT-002", "TEST-IT-001", "TEST-ST-001"]
---

# [PBI-008] 目次（TOC）スライドにおける長文タイトルの自動折り返し・見切れ防止

> 関連 GitHub Issue: [#10 - fix: 目次に記載の文字列が長い場合に入りきらない](https://github.com/N-Y-Public/marp-slide-mcp/issues/10)

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** スライド作成者およびAIエージェント（Antigravity / Claude / VS Code等）
- **〜したい (I want to):** スライドのページタイトル（表題）が長い場合（全角25文字以上など）であっても、目次スライド上でタイトル文字列が見切れ（省略記号 `...`）ずに自動で複数行に折り返され、全文が確実に読める状態でドットリーダー線とページ番号が整然と表示されるようにしたい
- **なぜなら (So that):** 現状の `themes/business-slide-theme.css` では、目次リンク（`section.toc>ul>li.toc-item>p>a`）に `white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;` が指定されており、一定長を超えるタイトルが `...` で強制的に切り捨てられてしまい、スライドの正確な章立て・アジェンダが閲覧者に伝わらないため。

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- **`themes/business-slide-theme.css` (`MOD-THEME-001`) の修正**:
  1. 目次タイトルリンク（`section.toc>ul>li.toc-item>p>a`, `section.toc>ol>li.toc-item>p>a`）の折り返し許可設定:
     - `white-space: normal !important;`
     - `overflow-wrap: anywhere !important;`（および `word-break: break-word !important;`）
     - `overflow: visible !important;`
     - `text-overflow: clip !important;`
  2. 複数行折り返し時のレイアウト・フォントサイズ・行間最適化:
     - Flexboxコンテナ（`li.toc-item>p`）内におけるベースラインおよびドットリーダー線（`::after`）の配置調整（タイトルの最終行の右側にドットリーダー線とページ番号が自然に続くように調整）。
     - 長文タイトル時のフォントサイズ（`clamp` 計算式）および行送り（`line-height`）の調整（複数行になっても行間が広がりすぎず、読みやすい行間を維持）。
     - ドットリーダー線（`p:after`）およびページ番号（`.toc-page`）がスライド右端からはみ出さないための `max-width` / `min-width` / `flex-shrink` 制御。
  3. 12項目配置時の垂直スペース・オーバーフロー防止調整:
     - 複数項目が2行に折り返された場合でも、スライド下部のフッター帯（680px〜）を突き破らないよう、`margin-bottom` やパディング等の余白を微調整。
- **`marp.config.js` (`MOD-ENG-001` / `MOD-002`) の必要に応じた調整**:
  - 目次生成ロジックにおける `--char-count` やCSS変数の調整（必要に応じて）。
- **設計書差分更新・回帰テスト (`TEST-*`)・RTM (`verify_rtm.py`) 検証**:
  - 要件定義書（`docs/01_requirements/01_requirements_specification.md`）への `REQ-FNC-004-05` 追記。
  - 詳細設計書（`docs/03_detail_design/02_internal_interface_specification.md`, `03_program_specification.md`, `docs/templates/05_software_design.md`）の更新。
  - 長文タイトル（日本語長文・英単語混在長文）を含むテストスライドのビルド検証・PDF生成検証。
  - `verify_rtm.py` によるRTM双方向断絶0件の確認。

### やらないこと (Out of Scope)
- 目次スライド以外の通常スライドタイトル折り返し仕様の大幅変更
- 1スライドあたりの目次最大項目数（`ITEMS_PER_SLIDE = 12`）の変更（12項目基準を維持）

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given 全角30文字以上の長文タイトルを持つ通常スライドが存在するスライドデッキ, When Marp CLIまたはMCPツールでHTML/PDFをレンダリングした時, Then 目次スライド上でタイトル文字列が見切れず（`...` にならず）自動で複数行に折り返され、タイトル全文が表示されること
- [x] **AC-2:** Given 長文タイトルが複数行に折り返された目次項目, When 目次レイアウトを検証した時, Then タイトルの最終行の右側にドットリーダー線（`border-bottom: 3px dotted`）が描画され、その右端にページ番号（`span.toc-page`）が重なりや見切れなく正しく配置されること
- [x] **AC-3:** Given 既存の1行に収まる通常のタイトルを持つ目次項目, When レンダリングした時, Then 従来通り1行で表示され、ドットリーダー線とページ番号が正しいベースライン位置で整然と描画されること
- [x] **AC-4:** Given 複数項目が長文で折り返された目次スライド, When スライド全体の描画範囲を検証した時, Then 目次リストがスライド下部のフッター帯（680px〜720px）に重ならず、スライド表示領域内に収まること
- [x] **AC-5:** Given 修正後のリポジトリ, When Docker環境内で `npm run build`、`npm run build:pdf`、および `verify_rtm.py` を実行した時, Then ビルドエラー0件、既存スライドのPDF出力成功、RTMトレーサビリティ断絶0件で完了すること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:**
  - 要件定義: `REQ-F-002` / `REQ-FNC-004` (目次自動生成機能)
  - 詳細設計: `themes/business-slide-theme.css` (`MOD-THEME-001`), `marp.config.js` (`MOD-ENG-001` / `MOD-002`)
- **DB/外部IF変更の有無:** なし（MCPツールの外部I/Fスキーマへの変更なし）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-002`, `REQ-FNC-004`
- **追加・更新した設計書/モジュールID:** `MOD-002`, `MOD-THEME-001`
- **追加・更新したテストID:** `TEST-UT-002`, `TEST-IT-001`, `TEST-ST-001`
