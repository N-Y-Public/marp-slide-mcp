---
id: DOC-BD-003
title: 外部I/F仕様書
doc_type: basic_design
version: 1.1.0
status: Approved
date: 2026-11-07
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - basic-design
  - external-interface
  - mcp
  - cli
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」が外部システム、AIクライアント、および開発者に対して提供する外部インターフェースの意味仕様とエラー体系を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- システム要件: [[01_requirements_specification#1 本書の位置づけ|要件定義書]]
- 各機能の振る舞い: [[02_functional_specification#1 本書の位置づけ|機能仕様書]]
- 入出力データの型・桁・スキーマ形式: [[06_data_structure_specification#1 本書の位置づけ|データ構造仕様書]]
- 生成・設定ファイルの構文形式: [[05_file_format_specification#1 本書の位置づけ|ファイル形式仕様書]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 規約 DOC-GOV-003 準拠への再編および意味／形式仕様の分離 |
| 1.1.0 | 2026-11-07 | PBI-019 | 24H365D自律開発統制CLI（EXT-CLI-003）および日報・週報生成CLI（EXT-CLI-004）の追加 |

# 2 外部インターフェース

## 2.1 EXT-MCP-001 generate_slide_deck
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 構造化されたスライドデッキ情報からMarp Markdownを生成する |
| 前提条件 | Stdio JSON-RPC 2.0 接続が確立していること |

### 2.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-001-IN01` | スライドデッキ入力 | デッキ全体の構造化データ | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

### 2.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-001-OUT01` | 生成結果レスポンス | ファイルパスと生成完了メッセージ | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.2 EXT-MCP-002 get_slide_deck
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 指定したファイルIDのスライドデッキ構造を取得する |
| 前提条件 | 対象ファイルが `slides/` 配下に存在すること |

### 2.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-002-IN01` | ファイルID | 取得対象スライドデッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |

### 2.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-002-OUT01` | 構造化デッキデータ | 解析されたスライドデッキ全体データ | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

## 2.3 EXT-MCP-003 insert_slide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 既存デッキの指定位置に新規通常スライドを挿入する |
| 前提条件 | 対象デッキが存在すること |

### 2.3.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-003-IN01` | ファイルID | 対象デッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |
| `EXT-MCP-003-IN02` | 挿入位置 | 挿入先のページ番号（2以上） | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003-F01]] |
| `EXT-MCP-003-IN03` | スライドデータ | 挿入する通常スライドデータ | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] |

### 2.3.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-003-OUT01` | 実行結果レスポンス | 更新後総ページ数とメッセージ | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.4 EXT-MCP-004 update_slide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 既存デッキの指定スライド内容を更新する |
| 前提条件 | 指定ページが存在すること |

### 2.4.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-004-IN01` | ファイルID | 対象デッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |
| `EXT-MCP-004-IN02` | ページ番号 | 更新対象のページ番号 | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003-F01]] |
| `EXT-MCP-004-IN03` | スライドデータ | 更新後のスライドデータ | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] |

### 2.4.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-004-OUT01` | 実行結果レスポンス | 更新完了メッセージ | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.5 EXT-MCP-005 delete_slide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 既存デッキから指定ページを削除する |
| 前提条件 | 指定ページが存在し、表紙以外のスライドであること |

### 2.5.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-005-IN01` | ファイルID | 対象デッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |
| `EXT-MCP-005-IN02` | ページ番号 | 削除対象のページ番号（2以上） | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003-F01]] |

### 2.5.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-005-OUT01` | 実行結果レスポンス | 削除後総ページ数とメッセージ | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.6 EXT-MCP-006 update_deck_settings
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | デッキ全体設定（サイズ、テーマ色、ロゴ等）を更新する |
| 前提条件 | 対象デッキが存在すること |

### 2.6.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-006-IN01` | ファイルID | 対象デッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |
| `EXT-MCP-006-IN02` | デッキ設定 | 変更後のデッキ全体設定 | 必須 | [[06_data_structure_specification#2.6 DAT-TYP-006 DeckSettings|DAT-TYP-006]] |

### 2.6.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-006-OUT01` | 実行結果レスポンス | 設定変更完了メッセージ | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.7 EXT-MCP-007 export_to_pdf
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-006` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 指定したスライドデッキのPDFファイルを出力する |
| 前提条件 | 対象Markdownファイルが存在すること |

### 2.7.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-007-IN01` | ファイルID | 対象デッキの識別子 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001-F01]] |

### 2.7.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-007-OUT01` | 出力結果 | 生成されたPDFファイルパス | 必須 | [[05_file_format_specification#2.2 DAT-FIL-002 PdfOutputFile|DAT-FIL-002]] |

## 2.8 EXT-MCP-008 github_pre_execution_identity_gate
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-008` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | GitHub外部書き込み操作の直前に実行アカウントを照合する |
| 前提条件 | GitHub MCPサーバーが利用可能であること |

### 2.8.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-008-IN01` | なし | パラメータなし | 必須 | なし |

### 2.8.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-MCP-008-OUT01` | ユーザー情報 | 認証中ユーザー名とID | 必須 | [[06_data_structure_specification#2.7 DAT-TYP-007 McpToolResponse|DAT-TYP-007]] |

## 2.9 EXT-CLI-001 marp_cli_pdf
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | コマンドラインからMarp CLIを用いてPDFを出力する |
| 前提条件 | Dockerコンテナ内またはNode.js実行環境が整備されていること |

### 2.9.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-001-IN01` | Markdown引数 | 変換元Markdownファイルパス | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |

### 2.9.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-001-OUT01` | PDFファイル | 生成されたPDFバイナリファイル | 必須 | [[05_file_format_specification#2.2 DAT-FIL-002 PdfOutputFile|DAT-FIL-002]] |

## 2.10 EXT-CLI-002 custom_pptx_converter
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-005` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | コマンドラインからネイティブPowerPoint変換を実行する |
| 前提条件 | 対象MarkdownおよびPuppeteer実行環境が存在すること |

### 2.10.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-002-IN01` | 入力ファイルパス | 変換元Markdownパス | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |
| `EXT-CLI-002-IN02` | 出力ファイルパス | 変換先PPTXパス | 必須 | [[05_file_format_specification#2.3 DAT-FIL-003 PptxOutputFile|DAT-FIL-003]] |

### 2.10.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-002-OUT01` | PPTXファイル | 編集可能なネイティブPowerPointファイル | 必須 | [[05_file_format_specification#2.3 DAT-FIL-003 PptxOutputFile|DAT-FIL-003]] |

## 2.11 EXT-CLI-003 autonomous_dev_loop
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-011` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | Issue優先度選定、Stage A→B独立エージェントゲート審査、およびメンテナーフィードバック反映を実行する |
| 前提条件 | Dockerコンテナ内のPython 3実行環境および自律開発設定ファイルが存在すること |

### 2.11.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-003-IN01` | 実行サブコマンド | 実行する制御コマンド（`select-issue`, `review-gate`, `apply-feedback`） | 必須 | [[05_file_format_specification#2.5 DAT-FIL-005 AutonomousConfigFile|DAT-FIL-005]] |
| `EXT-CLI-003-IN02` | 審査エージェント識別子 | Stage A起票エージェントおよびStage A→B審査エージェントの識別子 | 任意 | [[06_data_structure_specification#2.8 DAT-TYP-008 StageGateReviewResult|DAT-TYP-008]] |

### 2.11.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-003-OUT01` | オーケストレーション結果 | 選定されたIssue情報、Stage A→Bゲート判定結果、またはフィードバック反映結果JSON | 必須 | [[06_data_structure_specification#2.8 DAT-TYP-008 StageGateReviewResult|DAT-TYP-008]] |

## 2.12 EXT-CLI-004 generate_reports
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `FNC-011` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 指定日時または時間枠に基づき、テンプレートからメンテナー向け日報（1日3回）およびプロジェクトとりまとめ向け週報（毎週水曜16:00）を生成する |
| 前提条件 | 日報テンプレート（`tpl_96_daily_report.md`）および週報テンプレート（`tpl_97_weekly_report.md`）が存在すること |

### 2.12.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-004-IN01` | レポート種別・日時指定 | 生成対象種別（`daily`, `weekly`, `auto`）および基準日時（JST） | 必須 | [[06_data_structure_specification#2.9 DAT-TYP-009 ReportScheduleConfig|DAT-TYP-009]] |

### 2.12.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `EXT-CLI-004-OUT01` | レポートファイル群 | 生成された日報Markdownおよび週報Markdownのパス情報 | 必須 | [[05_file_format_specification#2.6 DAT-FIL-006 AutonomousReportMarkdownFile|DAT-FIL-006]] |

# 3 エラー体系

## 3.1 エラーコード表
| エラーコード | 名称 | 発生条件 | 利用者への表示 | 対象I/F |
| :--- | :--- | :--- | :--- | :--- |
| `ERR-VAL-001` | 入力検証エラー | Zodスキーマ検証失敗、必須項目欠落 | バリデーション詳細メッセージ | 全MCPツール |
| `ERR-NOT-002` | リソース不在エラー | 指定されたファイルIDまたはスライドが存在しない | 対象ファイルが見つかりません | 全MCPツール |
| `ERR-RNG-003` | 範囲外エラー | ページ番号がスライド総数を超過または2未満 | ページ番号が範囲外です | `insert_slide`, `update_slide`, `delete_slide` |
| `ERR-ENV-004` | 環境実行エラー | Chromiumバイナリの探索失敗 | ブラウザ実行環境が見つかりません | `export_to_pdf`, `EXT-CLI-002` |
| `ERR-VAL-005` | 自己承認・ゲート審査違反エラー | Stage A起票エージェントとStage A→B審査エージェントが同一、またはPBI審査基準不適合 | 独立レビュアーによるゲート審査要件を満たしていません | `EXT-CLI-003` |
| `ERR-SYS-999` | 上記以外（未定義エラー） | 上記のいずれにも該当しない想定外の例外 | 内部エラーが発生しました | 全I/F |
