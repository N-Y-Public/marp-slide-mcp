---
pbi_id: "PBI-001"
title: "通常スライドへのスピーカーノート（発表者ノート）任意付与・取得機能の改善"
type: "enhancement" # feature | enhancement | bugfix
status: "todo" # todo | designing | implementing | testing | done
priority: "medium" # high | medium | low
related_req_ids: ["REQ-F-001"] # 例: ["REQ-F-001", "REQ-NF-002"]
related_mod_ids: ["MOD-001"] # 例: ["MOD-001"]
related_test_ids: ["TEST-UT-001", "TEST-IT-001"] # 例: ["TEST-001"]
---

# [PBI-001] 通常スライドへのスピーカーノート（発表者ノート）任意付与・取得機能の改善

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** AIエージェントまたはプレゼンテーション作成者
- **〜したい (I want to):** 通常スライド（`NormalSlide`）の生成・更新時に任意のスピーカーノート（`speakerNotes`）を指定し、Marp標準のHTMLコメント記法（`<!-- ... -->`）として末尾に出力・再取得したい
- **なぜなら (So that):** スライド紙面の情報密度（ワンスライド・ワンメッセージ原則）を維持したまま、口頭補足説明や想定問答スクリプトを同一Markdown正本内で一元管理できるため

## 2. スコープと仕様概要 (What)
### やること (In Scope)
- `NormalSlideSchema`（`src/index.ts` / `MOD-001`）にオプショナル項目 `speakerNotes`（文字列・最大1,000文字）を追加する
- `generateMarpMarkdown` において、`speakerNotes` が指定されている場合はスライド末尾に `<!-- [内容] -->`（Marpディレクティブと衝突しないノートコメント）を出力する
- `parseMarpMarkdown` / `get_slide_deck` において、ディレクティブ以外のHTMLコメントから `speakerNotes` を復元してJSONレスポンスに含める

### やらないこと (Out of Scope)
- 表紙スライド（`TitleSlide`）および自動生成目次スライド（`toc`）へのスピーカーノート付与
- PDFおよびPPTX出力時におけるスピーカーノート専用印刷レイアウトの新規追加

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-xxx`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [ ] **AC-1:** Given MCPサーバーが稼働している状態, When `generate_slide_deck` または `update_slide` に1,000文字以内の `speakerNotes` を含む通常スライドデータを渡して実行した時, Then 生成されるMarkdownの対象スライド末尾に `<!-- ... -->` 形式でノートが追記され、`get_slide_deck` で同一の `speakerNotes` 文字列が取得できること
- [ ] **AC-2:** Given MCPサーバーが稼働している状態, When `speakerNotes` を省略（`undefined`）して通常スライドを生成・更新した時, Then 既存のスライド構造と100%後方互換のMarkdownが生成され、余分な空コメントが出力されないこと
- [ ] **AC-3:** Given 通常スライドの入力データ検証時, When `speakerNotes` に1,001文字以上（境界値超過）またはHTMLコメント終端記号（`-->`）を含む不正文字列を指定した時, Then プロセスが異常終了せず、Zodバリデーションエラー（`ERR-VAL-001`）またはサニタイズ処理により安全に制御されること

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-F-001`（構造化スライドデッキ生成・編集機能）、`MOD-001`（`src/index.ts` 内の `NormalSlideSchema`, `generateMarpMarkdown`, `parseMarpMarkdown`）
- **DB/外部IF変更の有無:** 外部I/F（`EXT-MCP-001` `generate_slide_deck`, `EXT-MCP-003` `insert_slide`, `EXT-MCP-004` `update_slide`）の入力スキーマに任意フィールド `speakerNotes?: string` を追加（既存呼び出しに対する破壊的変更なし）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-F-001`（予定）
- **追加・更新した設計書/モジュールID:** `02_functional_requirements.md`, `05_software_design.md` / `MOD-001`（予定）
- **追加・更新したテストID:** `TEST-UT-001`, `TEST-IT-001`（予定）
