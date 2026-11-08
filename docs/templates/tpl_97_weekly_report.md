---
report_id: "{{REPORT_ID}}"
report_type: "weekly"
year_week: "{{YEAR_WEEK}}"
period: "{{PERIOD}}"
schedule_day_jst: "WED"
schedule_time_jst: "16:00"
target_audience: "ROLE-PROJECT-DIRECTOR"
generated_by: "report-generator-agent"
---

# 週次プロジェクト進捗報告 ({{YEAR_WEEK}}: {{PERIOD}})

## 1. エグゼクティブサマリー (今週の総括)
- **全体ステータス:** **{{OVERALL_HEALTH}}**
- **今週の要約:**
  - {{EXECUTIVE_SUMMARY}}

## 2. 先週からの宿題・課題と今週の解決結果 (Issues, Actions & Outcomes)
> 「何が課題または先週からの宿題で、どのような解決を行い、結果がどうなったか」の一覧です。

| No. | 課題または先週からの宿題 (What was the Issue / Homework) | 実施した解決策・アプローチ (Action Taken) | 結果・定量的効果 (Outcome & Impact) | 完了状態 |
| :---: | :--- | :--- | :--- | :---: |
{{WEEKLY_OUTCOME_ROWS}}

## 3. 新たな宿題事項と完了期限 (New Homework & Next Milestones)
> 今週新たに発生した宿題事項、および次週以降に「いつまでに何を完了させるか」のコミットメント一覧です。

| No. | 新たな宿題事項・次週の取組内容 (What Needs to be Done Next) | 発生背景・目的 (Why) | 担当 | 完了期限 (Deadline) | 優先度 |
| :---: | :--- | :--- | :--- | :---: | :---: |
{{NEW_HOMEWORK_ROWS}}

## 4. プロジェクト健全性・主要指標推移 (Project Health Metrics)
| 指標項目 | 先週時点 | 今週実績 (増減) | 状態・評価 |
| :--- | :---: | :---: | :--- |
| **解決済み課題（完了PBI）累計** | {{PREV_DONE_COUNT}}件 | **{{CURR_DONE_COUNT}}件 ({{DIFF_DONE_COUNT}})** | 計画通り消化 |
| **進行中・未解決の宿題残数** | {{PREV_OPEN_COUNT}}件 | **{{CURR_OPEN_COUNT}}件** | {{QUEUE_EVALUATION}} |
| **品質基準適合率（自動テスト・RTM整合性）** | 100% | **{{QUALITY_RATE}}** | 重大不具合・手戻り 0件 |

## 5. 上位マネジメントへの相談・エスカレーション事項 (Escalations to Management)
- **判断・支援依頼事項:** {{MANAGEMENT_ESCALATION}}
