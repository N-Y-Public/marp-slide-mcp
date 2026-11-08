---
report_id: "{{REPORT_ID}}"
report_type: "daily"
date: "{{DATE}}"
slot: "{{SLOT}}"
schedule_time_jst: "{{SCHEDULE_TIME_JST}}"
target_audience: "ROLE-MAINTAINER"
generated_by: "report-generator-agent"
---

# 自律開発日報 ({{DATE}} [{{SLOT_LABEL}} / {{SCHEDULE_TIME_JST}} JST])

## 1. ハイライト・サマリー (Executive Summary)
- **稼働ステータス:** {{SYSTEM_STATUS}}
- **直近完了PBI数:** {{COMPLETED_COUNT}}件（完了PBI: {{COMPLETED_PBI_LIST}}）
- **現在進行中のPBI数:** {{IN_PROGRESS_COUNT}}件（Stage A審査・設計実装中: {{IN_PROGRESS_PBI_LIST}}）
- **未着手バックログ残数:** {{TODO_COUNT}}件
- **品質ゲート状態:** ビルド: `{{BUILD_STATUS}}` | テスト合格: `{{TEST_SUMMARY}}` | RTM断絶: `{{RTM_BREAKS}}件`

## 2. メンテナーへの確認・判断依頼事項 (Action Required / Escalations)
> メンテナーの意思決定が必要な事項です。セクション5のコメント欄または対象Issue/PRへ指示コマンド（`[APPROVE: ASM-xxx]`, `[REJECT: PBI-xxx]`, `[PRIORITY: #xx]`）を記載してください。

| 管理ID | 対象Issue / PBI | 種別 | 内容・背景 | AI推奨案 | 状態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
{{ESCALATION_ROWS}}

## 3. 自律開発実績・マルチエージェント審査記録 (Completed & In-Progress Tasks)
### 3.1 完了したタスク (Stage B 完了・RTM監査合格済み)
| PBI ID | タイトル | Stage A→B 独立審査結果 | QA/RTM 監査結果 | 状態 |
| :--- | :--- | :--- | :--- | :--- |
{{COMPLETED_TASK_ROWS}}

### 3.2 進行中・ゲート審査中のタスク (In Progress / Gate Review)
| PBI ID | 現在のフェーズ | 起票エージェント | 独立ゲート審査エージェント | 審査・実行ステータス |
| :--- | :--- | :--- | :--- | :--- |
{{IN_PROGRESS_TASK_ROWS}}

## 4. 次回ループの着手予定キュー (Upcoming Queue)
{{UPCOMING_QUEUE_LINES}}

## 5. メンテナーコメント記入欄 (Maintainer Feedback)
<!-- メンテナー記入欄: 以下のコマンドを次回自律ループで自動解析します -->
<!-- 例: [APPROVE: PBI-019] Stage B移行および提案仕様を承認する -->
<!-- 例: [REJECT: PBI-019] AC-2の条件を再定義せよ -->
<!-- 例: [PRIORITY: #22, #25] Issue #22を最優先で着手せよ -->
- **メンテナー指示:** {{MAINTAINER_FEEDBACK}}
