---
id: DOC-TST-001
title: テスト仕様書
doc_type: test
version: 1.4.0
status: Approved
date: 2026-11-09
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - test
  - v-model
  - test-cases
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」を構成する各機能および非機能要件を検証するための単体テスト、結合テスト、および総合テストのケース定義を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- 要件定義: [[01_requirements_specification#3 機能要件|機能要件]]、[[01_requirements_specification#4 非機能要件|非機能要件]]
- テスト結果サマリーおよび実行記録: [[02_test_report#2 数値サマリー|数値サマリー]]、[[02_test_report#3 実行結果|実行結果]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 初版作成（DOC-GOV-003およびDOC-GOV-004準拠） |
| 1.1.0 | 2026-11-07 | PBI-019 | 24H365D自律開発統制および日報・週報テンプレート生成テスト（TEST-UT-005, TEST-ST-011）の追加 |
| 1.2.0 | 2026-11-08 | PBI-020 | 中見出しスライド単体テスト（TEST-UT-006）および総合テスト（TEST-ST-012）の追加 |
| 1.3.0 | 2026-11-08 | PBI-021 | 中見出しスライド品質是正単体テスト（TEST-UT-007）および総合テスト（TEST-ST-013）の追加 |
| 1.4.0 | 2026-11-09 | PBI-022 | 常駐マスターオーケストレーターデーモン単体テスト（TEST-UT-008）および総合テスト（TEST-ST-014）の追加 |

# 2 テストケース

## 2.1 単体テスト
| テストID | 対象ID | 前提（Given） | 手順（When） | 期待結果（Then） | 上位ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-UT-001` | [[03_program_specification#2.1.2 FN-SRV-002 generateSlideDeck\|FN-SRV-002]] | 有効なSlideDeckデータおよび境界値データが準備されている | generateSlideDeckおよびZod検証を実行する | 見出しアンカー構造を持つMarp Markdown文字列が生成され必須欠落時にエラーが返却される | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-UT-002` | [[03_program_specification#2.2.1 FN-ENG-001 marpTocPlugin\|FN-ENG-001]] | 目次スライドを含むスライドトークン列が準備されている | marpTocPluginにトークン列を入力し変換する | 12項目以下は単一スライド、13項目以上は12項目ごとに分割されページ番号属性が正しく補正される | [[01_requirements_specification#3.2 REQ-FNC-002 自律的要素リサイズ機能\|REQ-FNC-002-AC01]] |
| `TEST-UT-003` | [[03_program_specification#2.3.1 FN-PPT-001 convertToPptx\|FN-PPT-001]] | 96DPI基準のDOM矩形座標情報が準備されている | convertToPptxの座標変換論理を実行する | ピクセル値が正確なPowerPointインチ単位へ変換され中間HTMLファイルが削除される | [[01_requirements_specification#3.5 REQ-FNC-005 ネイティブPPTX変換機能\|REQ-FNC-005-AC01]] |
| `TEST-UT-004` | [[03_program_specification#2.6.1 FN-DOC-001 verifyDocSyntax\|FN-DOC-001]] | 各種規約適合図書および意図的な違反を含む検査用図書が準備されている | verifyDocSyntaxを実行する | 規約適合図書は違反0件で終了コード0、違反図書は該当エラーコードで検出され終了コード1となる | [[01_requirements_specification#4.7 REQ-NFR-007 設計図書の記述一貫性・追跡性\|REQ-NFR-007]] |
| `TEST-UT-005` | [[03_program_specification#2.7.2 FN-AUT-002 evaluateStageAToBGate\|FN-AUT-002]] | 複数Issue、PBIドラフト、および同一/別エージェントIDペアが準備されている | Issue選定、Stage A→Bゲート審査、フィードバック解析を実行する | 最高優先度Issueが選定され、同一エージェントの自己承認はREJECT、独立レビュアー審査時のみPASSとなり、コメント指示が反映される | [[01_requirements_specification#3.11 REQ-FNC-011 24H365D自律開発オーケストレーション・階層別定期レポート生成機能\|REQ-FNC-011-AC01]] |
| `TEST-UT-006` | [[03_program_specification#2.1.9 FN-SRV-009 resolveSectionDividerSlide\|FN-SRV-009]] | 4種類の中見出しパターンデータおよびページ一覧が準備されている | 中見出しMarkdown解決およびアンカーリンク生成を実行する | パターンに応じたクラスディレクティブと章タイトル・太字他章薄色・ページアンカーリンクが生成される | [[01_requirements_specification#3.12 REQ-FNC-012 中見出し（セクションディバイダー）スライド生成・章別目次機能\|REQ-FNC-012-AC01]] |
| `TEST-UT-007` | [[03_program_specification#2.1.9 FN-SRV-009 resolveSectionDividerSlide\|FN-SRV-009]] | ページ一覧を含む中見出しデータが準備されている | `resolveSectionDividerSlide` を実行する | 生Markdown（`- [...]`）が混入せず、純粋なHTMLタグ（`<ul>`, `<li>`, `<a>`）としてアンカーリンクが生成される | [[01_requirements_specification#3.12 REQ-FNC-012 中見出し（セクションディバイダー）スライド生成・章別目次機能\|REQ-FNC-012-AC07]] |
| `TEST-UT-008` | [[03_program_specification#2.9.3 FN-AUT-007 runMasterOrchestratorDaemon\|FN-AUT-007]] | 疑似JST時計（07:30, 11:50, 18:00, 水曜16:00）、メンテナーコメント記入日報、GitHub Issues APIレスポンスモック、同一または別エージェント審査設定、並行上限設定が準備されている | `checkAndEmitScheduledReports`、`fetch_open_issues_from_github`、`executeStatelessWorkerStage`、および `executeMasterDaemonCycle` を実行する | 定刻でのみ重複なく日報・週報が生成され、GitHub APIからPRを除いたOpen Issueと依存関係が抽出され、並行上限1件が強制され、自己承認は `ERR-VAL-005` で拒否、上限超過時は `escalated_issues` へ退避される | [[01_requirements_specification#3.13 REQ-FNC-013 常駐Pythonオーケストレーターによる24H365D自律開発デーモン基盤機能\|REQ-FNC-013-AC01]] |

## 2.2 結合テスト
| テストID | 対象ID | 前提（Given） | 手順（When） | 期待結果（Then） | 上位ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-IT-001` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | MCPサーバーが起動可能な状態である | MCPツールを一連のシナリオ（作成、挿入、更新、取得）で連続呼び出しする | MarkdownおよびJSONキャッシュが整合して更新されスライド内容が反映される | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-IT-002` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | 不正なパラメータ群が準備されている | 範囲外インデックスや存在しないファイルIDを指定してツールを実行する | 定義済みエラーコード（ERR-VAL-001からERR-SYS-001）が返却されサーバーが異常終了しない | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-IT-003` | [[01_software_structure_design#2.6 MOD-SKL-001 GitHub運用支援スキル体系\|MOD-SKL-001]] | GitHub IssueテンプレートYAML群が配置されている | YAML構文および必須項目の定義内容を検証する | 構文エラーが0件であり機能要望でWhoとWhyが独立して定義されている | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-IT-004` | [[01_software_structure_design#2.6 MOD-SKL-001 GitHub運用支援スキル体系\|MOD-SKL-001]] | 事前アカウント検証ゲートの規約が定義されている | 期待アカウントと認証アカウントの照合論理を実行する | 一致時は外部書込が許可され、不一致または未認証時は即座に処理が遮断される | [[01_requirements_specification#4.5 REQ-NFR-005 セキュリティ・プライバシー\|REQ-NFR-005]] |
| `TEST-IT-005` | [[01_software_structure_design#2.6 MOD-SKL-001 GitHub運用支援スキル体系\|MOD-SKL-001]] | 規約外ブランチ名（resolve_issue_eight等）のセッションが開始される | タスク開始時プロトコルのブランチ名検査を実行する | 規約準拠ブランチ名が自動導出されgit branch -mで是正される | [[01_requirements_specification#4.5 REQ-NFR-005 セキュリティ・プライバシー\|REQ-NFR-005]] |
| `TEST-IT-006` | [[01_software_structure_design#2.2 MOD-ENG-001 カスタムMarpエンジン\|MOD-ENG-001]] | Dockerコンテナ実行環境が準備されている | 非対話環境でスライドPDFビルドおよびPPTXビルドを実行する | stdin入力待ちデッドロックが発生せず30秒以内に終了コード0で完了する | [[01_requirements_specification#4.1 REQ-NFR-001 可用性・信頼性\|REQ-NFR-001]] |

## 2.3 総合テスト
| テストID | 対象ID | 前提（Given） | 手順（When） | 期待結果（Then） | 上位ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-ST-001` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | Dockerコンテナ実行環境が準備されている | TypeScriptビルドおよびMarp PDF出力を実行する | 終了コード0で正常終了し日本語フォントを含むPDFが出力される | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-ST-002` | [[01_software_structure_design#2.3 MOD-PPT-001 PPTXカスタムコンバーター\|MOD-PPT-001]] | Dockerコンテナ実行環境が準備されている | PPTX変換ビルドを実行する | PDF変換が30秒以内、PPTX変換が60秒以内に完了し有効なPPTXが生成される | [[01_requirements_specification#3.5 REQ-FNC-005 ネイティブPPTX変換機能\|REQ-FNC-005-AC01]] |
| `TEST-ST-003` | [[01_software_structure_design#2.7 MOD-DOC-001 設計図書規約・構文検査モジュール\|MOD-DOC-001]] | リポジトリ全体のソースコードおよび設計図書が配置されている | コメント規約検査、実名・絶対パス混入走査、RTM検証を実行する | コメント規約違反0件、実名・ホスト絶対パス0件、トレーサビリティ断絶0件で完了する | [[01_requirements_specification#4.3 REQ-NFR-003 運用・保守性\|REQ-NFR-003]] |
| `TEST-ST-004` | [[01_software_structure_design#2.6 MOD-SKL-001 GitHub運用支援スキル体系\|MOD-SKL-001]] | CONTRIBUTINGおよびスキル定義ファイルが配置されている | ブランチ命名規則の記載およびスキル構文を検査する | 各自のクレジット尊重が明記されスキル定義エラーが0件である | [[01_requirements_specification#4.5 REQ-NFR-005 セキュリティ・プライバシー\|REQ-NFR-005]] |
| `TEST-ST-005` | [[01_software_structure_design#2.4 MOD-THM-001 ビジネステーマスタイル\|MOD-THM-001]] | 3行以上のタイトルを含むスライドMarkdownが準備されている | Marp CLIでHTMLおよびPDFを出力しレイアウト位置を計測する | 所属・氏名および作成日の下端が680px以内に収まりタイトル重複が解消される | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-ST-006` | [[01_software_structure_design#2.4 MOD-THM-001 ビジネステーマスタイル\|MOD-THM-001]] | 各種要素およびリサイズクラスを含むスライドが準備されている | Puppeteerで要素サイズを機械計測する | 10段階クラスで滑らかに縮小され既存クラスの後方互換性が維持される | [[01_requirements_specification#3.2 REQ-FNC-002 自律的要素リサイズ機能\|REQ-FNC-002-AC01]] |
| `TEST-ST-007` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | READMEおよびスライド資料が配置されている | MCP設定手順および手動出力手順の網羅性を検証する | 設定JSON構文エラー0件、手動出力が再現可能である | [[01_requirements_specification#3.1 REQ-FNC-001 ビジネス標準テーマ提供機能\|REQ-FNC-001-AC01]] |
| `TEST-ST-008` | [[01_software_structure_design#2.4 MOD-THM-001 ビジネステーマスタイル\|MOD-THM-001]] | 生成されたスライドPDFが準備されている | PDFバイナリストリームおよびフォント辞書を機械検査する | 全面グラデーション0件、SMask転送関数0件、Type3フォント0件である | [[01_requirements_specification#4.6 REQ-NFR-006 システム環境・互換性\|REQ-NFR-006]] |
| `TEST-ST-009` | [[01_software_structure_design#2.2 MOD-ENG-001 カスタムMarpエンジン\|MOD-ENG-001]] | Mermaid図を含むスライドおよび表紙のみのスライドが準備されている | PDFを出力しFlateDecodeストリームからページ数を機械検査する | 余分な白紙ページが0件でありスライド枚数とPDFページ数が完全一致する | [[01_requirements_specification#4.1 REQ-NFR-001 可用性・信頼性\|REQ-NFR-001]] |
| `TEST-ST-010` | [[01_software_structure_design#2.7 MOD-DOC-001 設計図書規約・構文検査モジュール\|MOD-DOC-001]] | docs配下の設計図書群が配置されている | verify_doc_syntax.pyおよびverify_rtm.pyを実行する | 規約対象全図書で違反0件、RTM断絶0件で終了コード0となる | [[01_requirements_specification#4.7 REQ-NFR-007 設計図書の記述一貫性・追跡性\|REQ-NFR-007]] |
| `TEST-ST-011` | [[01_software_structure_design#2.8 MOD-AUT-001 24H365D自律開発統制・レポーティングモジュール\|MOD-AUT-001]] | 日報テンプレート（tpl_96）と週報テンプレート（tpl_97）およびスケジュール設定が配置されている | 1日3回（07:30/11:50/18:00）の日報生成と水曜16:00の週報生成を実行する | メンテナー向け日報3枠およびプロジェクトとりまとめ向け週報（課題・解決・結果・新たな宿題と期限）が韓国語混入0件で生成される | [[01_requirements_specification#3.11 REQ-FNC-011 24H365D自律開発オーケストレーション・階層別定期レポート生成機能\|REQ-FNC-011-AC02]] |
| `TEST-ST-012` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | 中見出しスライドおよび章別目次スライドを含むデッキが準備されている | Dockerコンテナ内でMarpビルド・テスト検証を実行する | 中見出しスライドが正常描画され、目次に中見出しの章タイトルのみが抽出表示される | [[01_requirements_specification#3.12 REQ-FNC-012 中見出し（セクションディバイダー）スライド生成・章別目次機能\|REQ-FNC-012-AC04]] |
| `TEST-ST-013` | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール\|MOD-SRV-001]] | 中見出しスライド（4パターン全て）およびショウケースデッキ（4:3比率）が準備されている | Dockerコンテナ内でHTML/PDFビルドを実行しDOMおよびCSSレンダリングを検証する | 通常ヘッダー非表示、章題名大見出し表示、フッター帯内への機密・著作権絶対配置、生Markdown露出0件、および4:3比率での正常出力が検証される | [[01_requirements_specification#3.12 REQ-FNC-012 中見出し（セクションディバイダー）スライド生成・章別目次機能\|REQ-FNC-012-AC05]] |
| `TEST-ST-014` | [[01_software_structure_design#2.8 MOD-AUT-001 24H365D自律開発統制・レポーティングモジュール\|MOD-AUT-001]] | 複数の未対応Issue、状態ファイル、および取扱説明書スライド一式が準備されている | `runMasterOrchestratorDaemon`（または `autonomous_dev_loop.py run-daemon`）を実行し、複数Issueの連続消化および取扱説明書PDF出力を検証する | 各ステージが独立ワーカーで実行され、1件目の完了およびPRドラフト生成後に停止せず2件目のIssueへ自動遷移し、取扱説明書スライドPDFが正常出力される | [[01_requirements_specification#3.13 REQ-FNC-013 常駐Pythonオーケストレーターによる24H365D自律開発デーモン基盤機能\|REQ-FNC-013-AC03]] |

# 3 実行手順

## 3.1 実行コマンド
```bash
# 1. 単体テスト実行 (DOC-TST-001)
docker compose run --rm app python3 -m unittest discover -s tests -p "test_*.py"

# 2. 構文検査器実行
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_doc_syntax.py

# 3. 要件追跡マトリクス検証
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py

# 4. TypeScriptビルドおよびPDF出力
docker compose run --rm app npm run build
docker compose run --rm app npm run build:pdf
```
