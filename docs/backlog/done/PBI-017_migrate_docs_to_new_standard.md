---
pbi_id: "PBI-017"
title: "既存正本図書の新体系への移行（Issue #21 後続）"
type: "enhancement" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-007"]
related_mod_ids: ["MOD-DOC-001"]
related_test_ids: ["TEST-ST-010"]
---

# [PBI-017] 既存正本図書の新体系への移行（Issue #21 後続）

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 設計図書を追記・削除する生成AIエージェントと、承認するメンテナー
- **〜したい (I want to):** `docs/01`〜`03` の既存図書を、19図書の新体系・章節項番号・新ID体系へ再編したい。
- **なぜなら (So that):** PBI-016 で策定した設計図書記述規約を、既存の図書と検査・運用の全体へ適用し、新旧の体系の併存を解消するため。

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
1. 既存図書を新ファイル構成へ再編し、全図書に doc_standard を付与する。LAY-* は画面仕様書の SCR-* へ移管する。
2. 画面仕様書・データ構造仕様書・ファイル形式仕様書・テスト仕様書・テスト成績書・追跡表の実体を作成する。
3. 新旧ID対応表を作成し、REQ-F-*→REQ-FNC-*、MOD-001→MOD-*-NNN 等を統一する。
4. README.md を全面改稿し、追跡表を DOC-RTM-001 のみに置く。

#### 2.1.1 新旧ID対応表
| 旧ID | 新ID | 名称・概要 |
| :--- | :--- | :--- |
| `REQ-F-001` | `REQ-FNC-001` | ビジネス標準テーマ提供機能 |
| `REQ-F-002` | `REQ-FNC-002` | 自律的要素リサイズ機能 |
| `REQ-F-003` | `REQ-FNC-005` | ネイティブPPTX変換機能 |
| `REQ-NFR-001` | `REQ-NFR-001` | 可用性・信頼性（Chromium探索・非対話ハング防止） |
| `REQ-NFR-002` | `REQ-NFR-002` | 性能・拡張性（PDF 30秒 / PPTX 60秒以内） |
| `REQ-NFR-003` | `REQ-NFR-003` | 運用・保守性（全行直上平易コメント・Zod検証） |
| `REQ-NFR-004` | `REQ-NFR-004` | 移行性（Markdown/PDF/PPTXオープン出力） |
| `REQ-NFR-005` | `REQ-NFR-005` | セキュリティ・プライバシー（PII・絶対パス完全排除） |
| `REQ-NFR-006` | `REQ-NFR-006` | システム環境・互換性（Docker Dev Container・Acrobat互換） |
| `REQ-NFR-007` | `REQ-NFR-007` | 設計図書の記述一貫性・追跡性 |
| `MOD-001` | `MOD-SRV-001` | MCPサービスモジュール (`src/index.ts`) |
| `MOD-002` | `MOD-ENG-001` / `MOD-THM-001` | カスタムMarpエンジン / ビジネステーマスタイル |
| `MOD-003` | `MOD-PPT-001` | PPTXカスタムコンバーター (`pptx_converter/convert.js`) |
| `MOD-004` | `MOD-DOC-001` | 設計図書規約・構文検査モジュール (`verify_doc_syntax.py`) |
| `LAY-001` | `SCR-001` | 表紙スライド画面仕様 |
| `LAY-002` | `SCR-002` | 通常スライド画面仕様 |
| `LAY-003` | `SCR-003` | 目次スライド画面仕様 |
| `LAY-004` | `SCR-004` | 2段組スライド画面仕様 |
| `LAY-005` | `SCR-005` | 画像並列スライド画面仕様 |
| `LAY-006` | `SCR-006` | 会話タイムラインスライド画面仕様 |
| `LAY-007` | `SCR-007` | ワイドコンテンツスライド画面仕様 |

### 2.2 やらないこと (Out of Scope)
- PBI-016 で確定した規約（`DOC-GOV-003` / `DOC-GOV-004`）の内容変更
- ソースコードおよびテストコード内の追跡タグ `@spec` / `@test` の付与（PBI-018にて実施）

## 3. 受け入れ基準 (Acceptance Criteria)
- [x] **AC-1:** Given 移行後の `docs/` で, When `verify_doc_syntax.py` を実行したとき, Then 全図書が検査対象となり違反0件で終了コード0となること。
- [x] **AC-2:** Given 新旧ID対応表がある状態で, When 旧IDを全文検索したとき, Then 対応表以外に旧IDが残らないこと。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `docs/` 配下の全図書
- **DB/外部IF変更の有無:** なし
- **起票元:** PBI-016 の「やらないこと」（Issue #21）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-001`〜`REQ-FNC-010`, `REQ-NFR-001`〜`REQ-NFR-007`
- **追加・更新した設計書/モジュールID:** `DOC-GOV-001`, `DOC-GOV-002`, `DOC-REQ-001`, `DOC-BD-001`, `DOC-BD-002`, `DOC-BD-003`, `DOC-DD-001`, `DOC-DD-002`, `DOC-DD-003`, `DOC-DD-005`, `DOC-DD-006`, `DOC-DD-007`, `DOC-TST-001`, `DOC-TST-002`, `DOC-RTM-001`, `DOC-IDX-001`
- **追加・更新したテストID:** `TEST-UT-001`〜`004`, `TEST-IT-001`〜`006`, `TEST-ST-001`〜`010`
