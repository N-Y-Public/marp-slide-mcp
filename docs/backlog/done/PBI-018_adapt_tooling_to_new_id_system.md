---
pbi_id: "PBI-018"
title: "検査・運用の新体系対応とコード追跡タグの付与（Issue #21 後続）"
type: "enhancement" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-NFR-007"]
related_mod_ids: ["MOD-DOC-001"]
related_test_ids: ["TEST-ST-010"]
---

# [PBI-018] 検査・運用の新体系対応とコード追跡タグの付与（Issue #21 後続）

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** 設計図書を追記・削除する生成AIエージェントと、承認するメンテナー
- **〜したい (I want to):** `verify_rtm.py` と運用スキルを新ID体系へ対応させ、コードの関数まで追跡したい。
- **なぜなら (So that):** PBI-016 で策定した設計図書記述規約を、既存の図書と検査・運用の全体へ適用し、新旧の体系の併存を解消するため。

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
1. verify_rtm.py を新ID体系へ対応させ、コード追跡タグ検査を追加する。
2. PBI雛形を新構文へ移行し、既存PBIの書式を移行する。
3. ソースコードへ @spec / @test タグを付与し、機械検査する。
4. 仮定マーカー Q-xxx を ASM-NNN へ一括置換する。
5. ipa-* スキル本文を新体系へ全面改訂する。
6. docs/legacy/ の旧テンプレート群を完全削除する。

### 2.2 やらないこと (Out of Scope)
- PBI-016 で確定した規約（`DOC-GOV-003` / `DOC-GOV-004`）の内容変更

## 3. 受け入れ基準 (Acceptance Criteria)
- [x] **AC-1:** Given 新ID体系の図書とコードがある状態で, When `verify_rtm.py` を実行したとき, Then 要件から関数・テスト結果までの断絶が0件で終了コード0となること。
- [x] **AC-2:** Given 実装済みの全関数があるとき, When `@spec` タグを機械検索したとき, Then 全関数が `FN-*` の定義に対応していること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `docs/` 配下の全図書、`.agents/skills/`、`verify_rtm.py`
- **DB/外部IF変更の有無:** なし
- **起票元:** PBI-016 の「やらないこと」（Issue #21）

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-NFR-007`
- **追加・更新した設計書/モジュールID:** `MOD-DOC-001`, `PRG-DOC-001`, `FN-DOC-001`, `FN-SRV-001`〜`FN-SRV-007`, `FN-ENG-001`〜`FN-ENG-002`, `FN-PPT-001`
- **追加・更新したテストID:** `TEST-ST-010`, `TEST-UT-004`
