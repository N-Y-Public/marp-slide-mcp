---
id: DOC-INDEX-001
title: marp-slide-mcp (Marp スライド作成環境) 設計図書体系
version: 1.0.0
status: Approved
date: 2026-10-05
author: N-Y-Public
tags:
  - index
  - architecture
  - documentation
  - hub
  - obsidian
---

# marp-slide-mcp (Marp スライド作成環境) 設計図書体系

本ディレクトリ（`docs/`）は、「**marp-slide-mcp (Marp スライド作成環境)**」におけるすべての要件、基本設計、詳細設計、実装アルゴリズム、および開発ガバナンス規則を網羅的に形式知化した設計図書体系である。

IPA（情報処理推進機構）のシステム開発標準仕様書体系に準拠し、**Obsidian によるハイパーリンク閲覧**、および **将来の AI エージェントによる自律的 CI/CD（自動テスト生成・保守開発）** を想定した完全モジュール化・高機械可読性構造を採用している。

---

## 1. 設計図書体系マップ (Documentation Hierarchy)

```mermaid
graph TD
    classDef charter fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef req fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef basic fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef detail fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef hub fill:#eceff1,stroke:#455a64,stroke-width:3px;

    INDEX[docs/README.md<br>設計図書統合インデックス]:::hub

    subgraph L0 ["00. プロジェクト憲章レベル"]
        PC1[01_project_charter.md<br>プロジェクト憲章]:::charter
        PC2[02_coding_standards.md<br>コーディング規約]:::charter
    end

    subgraph L1 ["01. 要件定義レベル"]
        REQ1[01_requirements_specification.md<br>要件定義書]:::req
    end

    subgraph L2 ["02. 基本設計レベル"]
        BD1[01_functional_specification.md<br>機能仕様書]:::basic
        BD2[02_external_interface_specification.md<br>外部I/F仕様書]:::basic
    end

    subgraph L3 ["03. 詳細設計レベル"]
        DD1[01_architectural_design.md<br>構造設計書]:::detail
        DD2[02_internal_interface_specification.md<br>内部I/F仕様書]:::detail
        DD3[03_program_specification.md<br>プログラム仕様書]:::detail
    end

    INDEX --> PC1
    INDEX --> PC2
    INDEX --> REQ1
    INDEX --> BD1
    INDEX --> BD2
    INDEX --> DD1
    INDEX --> DD2
    INDEX --> DD3

    PC1 -.理念・制約.-> REQ1
    PC2 -.実装標準.-> DD3
    REQ1 ==> BD1
    REQ1 ==> BD2
    BD1 ==> DD1
    BD2 ==> DD2
    DD1 ==> DD3
    DD2 ==> DD3
```

---

## 2. 図書一覧および概要

| 階層 / 分類 | ドキュメント名 | 文書ID | 概要・対象読者 |
| :--- | :--- | :--- | :--- |
| **統合ハブ** | [`README.md`](README.md) | `DOC-INDEX-001` | 本設計図書全体のナビゲーション、全体マップ、およびトレーサビリティマトリクス |
| **00. 憲章** | [`00_project_charter/01_project_charter.md`](00_project_charter/01_project_charter.md) | `DOC-PC-001` | プロジェクトの背景・意義、目的・ゴール、スコープ、成功基準、SaaS制限ライセンス戦略 |
| **00. 規約** | [`00_project_charter/02_coding_standards.md`](00_project_charter/02_coding_standards.md) | `DOC-PC-002` | Google TypeScript準拠標準、および【全行直上平易コメント】の厳格な記述規則 |
| **01. 要件** | [`01_requirements/01_requirements_specification.md`](01_requirements/01_requirements_specification.md) | `DOC-REQ-001` | 業務要件、機能要件（`REQ-FNC-001`〜`007`）、非機能要件（IPAグレード）、制約条件 |
| **02. 基本** | [`02_basic_design/01_functional_specification.md`](02_basic_design/01_functional_specification.md) | `DOC-BD-001` | 5層アーキテクチャ、機能詳細（`FNC-xxx`）、スライド画面・レイアウト仕様（`LAY-xxx`） |
| **02. 基本** | [`02_basic_design/02_external_interface_specification.md`](02_basic_design/02_external_interface_specification.md) | `DOC-BD-002` | MCP Tools（7種）、CLIコマンド、Puppeteer/PptxGenJS連携、AI設定仕様 |
| **03. 詳細** | [`03_detail_design/01_architectural_design.md`](03_detail_design/01_architectural_design.md) | `DOC-DD-001` | モジュール構造（`MOD-xxx`）、データモデル（`SlideDeck` 等）、実行ライフサイクル |
| **03. 詳細** | [`03_detail_design/02_internal_interface_specification.md`](03_detail_design/02_internal_interface_specification.md) | `DOC-DD-002` | 内部関数シグネチャ（`INT-FN-xxx`）、Marpエンジン拡張API、DOM解析仕様 |
| **03. 詳細** | [`03_detail_design/03_program_specification.md`](03_detail_design/03_program_specification.md) | `DOC-DD-003` | `index.ts`, `marp.config.js`, `convert.js`, `theme.css` 各プログラムのアルゴリズム詳細 |

---

## 3. 完全トレーサビリティマトリクス (Traceability Matrix)

要件から基本設計、詳細設計、実装コードに至るまでの完全なトレーサビリティを以下に示す。

| 要件ID (`REQ`) | 基本設計 機能ID (`FNC`) | 外部I/F (`EXT`) | モジュールID (`MOD`) | 内部I/F (`INT`) | プログラムID (`PRG`) | 主要実装ソースコード |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-FNC-001`<br>(ビジネス標準テーマ) | `FNC-001`<br>(スライドスタイリング) | — | `MOD-THM-001` | — | `PRG-THM-001` | `themes/business-slide-theme.css`<br>`themes/theme-colors.css` |
| `REQ-FNC-002`<br>(自律要素リサイズ) | `FNC-002`<br>(自動リサイズ機構) | — | `MOD-THM-001`<br>`MOD-ENG-001` | — | `PRG-THM-001`<br>`PRG-ENG-001` | `themes/business-slide-theme.css`<br>`marp.config.js` |
| `REQ-FNC-003`<br>(構造化レイアウト) | `FNC-003`<br>(2段組/画像/会話) | `EXT-MCP-001` | `MOD-THM-001`<br>`MOD-SRV-001` | `INT-FN-001` | `PRG-THM-001`<br>`PRG-SRV-001` | `themes/business-slide-theme.css`<br>`src/index.ts` |
| `REQ-FNC-004`<br>(目次完全自動生成) | `FNC-004`<br>(目次プラグイン) | — | `MOD-ENG-001` | `INT-ENG-001`<br>`INT-ENG-002` | `PRG-ENG-001` | `marp.config.js` (`marp_toc`) |
| `REQ-FNC-005`<br>(ネイティブPPTX変換) | `FNC-005`<br>(DOM解析変換) | `EXT-CLI-002`<br>`EXT-LIB-002`<br>`EXT-LIB-003` | `MOD-PPT-001` | `INT-DOM-001`<br>`INT-DOM-002`<br>`INT-DOM-003` | `PRG-PPT-001` | `pptx_converter/convert.js` |
| `REQ-FNC-006`<br>(MCPサーバー連携) | `FNC-006`<br>(スライド操作API) | `EXT-MCP-001`〜<br>`EXT-MCP-007` | `MOD-SRV-001` | `INT-FN-001`〜<br>`INT-FN-005` | `PRG-SRV-001` | `src/index.ts` |
| `REQ-FNC-007`<br>(AI協調プロンプト) | `FNC-007`<br>(MBBプロンプト&Skill) | `EXT-CFG-002` | — | — | — | `.agents/skills/marp-slides/`<br>`prompts/mcp_slide_generator.md` |

---

## 4. Obsidian 閲覧ガイド

本設計図書群は、知識管理ツール **[Obsidian](https://obsidian.md/)** の機能を最大限に活かせるよう設計されている。

1. **グラフビュー (Graph View) の活用**:
   - 各ドキュメントは `[[<ドキュメント名>]]` 形式の内部リンクで密結合されており、Obsidianのグラフビューを開くことでシステム全体の論理構造と関連性を視覚的に俯瞰可能。
2. **YAML Frontmatter によるメタデータ検索**:
   - すべてのファイル冒頭に `id`, `title`, `version`, `status`, `tags` が記載されており、Obsidianの検索機能や Dataview プラグインによってタグ（`#requirements`, `#basic-design`, `#mcp` 等）ごとの絞り込みが可能。
3. **Mermaid ダイアグラムのネイティブ表示**:
   - アーキテクチャ図、データモデル（ER図）、シーケンス図、フローチャートが Obsidian 上で直接美しくレンダリングされる。

---

## 5. 将来的な AI / CI/CD 連携への寄与

- **機械可読な仕様書構造**:
  - 見出し、表、コードブロック、Zodスキーマ、型定義が構造化されているため、AIエージェント（LLM）が仕様書をコンテキストとして直接読み取り、新規機能の追加や単体テストコードの自動生成を行うことが極めて容易。
- **リグレッション防止**:
  - 各機能の「振る舞い」「引数」「戻り値」「境界値」が厳密に定義されているため、CIパイプラインで自動テストを実行する際の正解定義（オラクル）としてそのまま機能する。

---

## 6. 技術ポートフォリオとしてのハイライト

1. **ビジネス課題に対する深い洞察とアーキテクチャ設計**:
   - 単なるツール作成にとどまらず、「従来PowerPointの手作業の非効率」と「Markdownスライドのデザイン制約」という二律背反を解消する高度なアーキテクチャ（見出しアンカー、DOM計測PPTX変換、MCP統合）を具現化。
2. **IPA標準に準拠したプロフェッショナルな文書化能力**:
   - エンタープライズ開発現場で通用する「共通フレーム（SLCP-JCF）」に準拠し、初見の開発者や採用担当者にも設計意図が明瞭に伝わるドキュメント体系を構築。
3. **比類なきコード品質と保守性へのこだわり**:
   - ソースコード全行に対する「直上平易コメント規則」の徹底、Zodによる実行時型安全性、多段階Chromium探索など、堅牢なプロダクション品質を担保。
