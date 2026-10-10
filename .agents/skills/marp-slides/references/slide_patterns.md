# Slide Design Patterns & Best Practices

This document provides reusable JSON structural patterns for the `marp-slide-mcp` tools.

---

## Pattern 1: 2-Column Comparison (`twoColumns`)

Used for As-Is vs To-Be comparisons, architecture vs implementation, or contrasting alternatives.

```json
{
  "pageTitle": "現行課題と目指すべき姿の比較",
  "claim": "個別最適化されたサイロ型システムから、全社統合API基盤への移行により運用負荷を半減させる",
  "chartTitle": "システムアーキテクチャの変革ロードマップ",
  "twoColumns": {
    "leftContent": "### As-Is（現状の課題）\n- 各事業部でデータベースが分散・サイロ化\n- バッチ連携中心でリアルタイム連携が不可\n- 保守運用要員が分散し属人化が深刻",
    "rightContent": "### To-Be（目指すべき姿）\n- **統合データレイク & イベント駆動基盤**\n- **REST / GraphQL APIによるリアルタイム連携**\n- **IaC & CI/CD自動化による共通プラットフォーム化**"
  },
  "source": "出所: ITアーキテクチャ刷新検討会 調査資料"
}
```

---

## Pattern 2: Multi-Image Grid (`imageGrid`)

Used for comparing multiple visual assets, UI mockups, or analytical charts side-by-side with captions.

```json
{
  "pageTitle": "主要KPIの推移と改善実績",
  "claim": "新規施策導入後、アクティブユーザー率とコンバージョン率が前年同期比で大幅に伸長",
  "chartTitle": "月次主要指標の推移グラフ（2025Q1〜2026Q2）",
  "imageGrid": [
    {
      "imagePath": "../slides/sample.svg",
      "caption": "MAU（月間アクティブユーザー数）推移",
      "alt": "MAU推移グラフ"
    },
    {
      "imagePath": "../slides/normal_page_demo.svg",
      "caption": "CVR（有料プラン転換率）推移",
      "alt": "CVR推移グラフ"
    }
  ],
  "source": "出所: マーケティング分析ダッシュボード集計値"
}
```

---

## Pattern 3: Mermaid Diagrams (`mermaid-sm`)

Used for system workflows, state machines, sequence diagrams, and architecture flows.

```json
{
  "pageTitle": "自動化パイプラインの全体フロー",
  "claim": "イベントトリガーからデプロイ・通知までを完全自律化し、リードタイムを90%削減",
  "chartTitle": "CI/CD & MCP エージェント連携フロー",
  "classes": ["mermaid-sm"],
  "bodyContent": "```mermaid\nflowchart LR\n    User([ユーザー要求]) --> Agent[Antigravity エージェント]\n    Agent --> MCP[Marp MCP サーバー]\n    MCP --> Engine[Marp CLI / Puppeteer]\n    Engine --> Output[(PDF / HTML / MD)]\n    Output --> Notify[ユーザー完了通知]\n```",
  "source": "作成: 開発チーム技術仕様書"
}
```

---

## Pattern 4: Structured Data Table (`table-sm`)

Used for multi-dimensional comparison matrices, evaluation criteria, or schedules.

```json
{
  "pageTitle": "ソリューション比較評価",
  "claim": "機能要件、セキュリティ、コストの総合評価において、プランBが最適と判断",
  "chartTitle": "選定候補ツールの機能・コスト比較マトリクス",
  "classes": ["table-sm"],
  "bodyContent": "| 評価項目 | 従来手法 (Plan A) | 提案手法 (Plan B) | 外部SaaS (Plan C) |\n| :--- | :--- | :--- | :--- |\n| **導入初期費用** | 低（既存資産流用） | 中（基盤構築） | 高（初期ライセンス） |\n| **運用月額コスト** | 高（人的工数依存） | **極小（自動化）** | 中（サブスクリプション） |\n| **セキュリティ** | △（個別管理） | **◎（統制ポリシー適用）** | ○（クラウド標準） |\n| **カスタマイズ性** | ×（レガシー制約） | **◎（OSSベース拡張）** | △（API制約） |",
  "source": "出所: ベンダー選定委員会 評価結果"
}
```

---

## Pattern 5: Wide Content Deep Dive (`wide-content`)

Used when you need maximum vertical space for complex diagrams or detailed data without a claim band.

```json
{
  "pageTitle": "データモデリング ER図詳細",
  "claim": " ",
  "chartTitle": "エンティティ関係図（受注・在庫・決済ドメイン）",
  "classes": ["wide-content", "mermaid-sm"],
  "bodyContent": "```mermaid\nerDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ ORDER_ITEM : contains\n    PRODUCT ||--o{ ORDER_ITEM : ordered_in\n    ORDER ||--|| PAYMENT : paid_by\n```"
}
```

---

## Pattern 6: Conversation / Voice of Customer (`conversation-content`)

Used for stakeholder interviews, customer feedback quotes, or persona debates.

```json
{
  "pageTitle": "ユーザーインタビューから得られた示唆",
  "claim": "操作性の複雑さと処理速度の遅延が、既存ユーザーの最大の離脱要因となっている",
  "chartTitle": "利用部門からの主なフィードバック抜粋",
  "classes": ["conversation-content"],
  "bodyContent": "- **営業企画部 A氏**\n  初期設定の手順が多すぎて、新入社員への教育コストが非常に重い。\n- **情報システム部 B氏**\n  ログの追跡性が低く、障害発生時の原因究明に丸一日かかってしまう。\n- **経営企画部 C氏**\n  リアルタイムに集計データが閲覧できず、月次報告の準備に時間が取られている。"
}
```
