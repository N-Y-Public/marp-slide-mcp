---
id: DOC-TST-002
title: テスト成績書
doc_type: test
version: 1.4.0
status: Approved
date: 2026-11-09
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - test
  - test-report
  - qcd
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」における各テストケースの実行結果、定量的数値サマリー、および不具合記録を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- テストケース仕様: [[01_test_specification#2 テストケース|テストケース]]
- 要件追跡状況: [[01_traceability_matrix#2 追跡表|要件追跡マトリクス]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 初版作成（DOC-GOV-003およびDOC-GOV-004準拠） |
| 1.1.0 | 2026-11-07 | PBI-019 | TEST-UT-005およびTEST-ST-011の実行結果（TRS-UT-005-R01, TRS-ST-011-R01）追加 |
| 1.2.0 | 2026-11-08 | PBI-020 | TEST-UT-006およびTEST-ST-012の実行結果（TRS-UT-006-R01, TRS-ST-012-R01）追加 |
| 1.3.0 | 2026-11-08 | PBI-021 | TEST-UT-007およびTEST-ST-013の実行結果（TRS-UT-007-R01, TRS-ST-013-R01）追加 |
| 1.4.0 | 2026-11-09 | PBI-022 | TEST-UT-008およびTEST-ST-014の実行結果（TRS-UT-008-R01, TRS-ST-014-R01）追加 |

# 2 数値サマリー

## 2.1 サマリー表
| 指標 | 計画値 | 実測値 | 判定 |
| :--- | :--- | :--- | :--- |
| 総テストケース数 | 28 | 28 | 合格（PASS） |
| 合格件数 | 28 | 28 | 合格（PASS） |
| 不合格件数 | 0 | 0 | 合格（PASS） |
| トレーサビリティ断絶件数 | 0 | 0 | 合格（PASS） |

# 3 実行結果

## 3.1 結果表
| 結果ID | 対象テストID | 実行日 | 判定 | 実測値 | 不具合参照 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TRS-UT-001-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-001]] | 2026-11-04 | PASS | Zod検証・マークダウン生成正常終了 | なし |
| `TRS-UT-002-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-002]] | 2026-11-04 | PASS | 目次分割・ページ番号補正正常終了 | なし |
| `TRS-UT-003-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-003]] | 2026-11-04 | PASS | 座標変換・中間ファイル削除正常終了 | なし |
| `TRS-UT-004-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-004]] | 2026-11-04 | PASS | 構文検査9項目正常終了（9 passed） | なし |
| `TRS-UT-005-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-005]] | 2026-11-07 | PASS | Issue選定・別エージェント審査・フィードバック反映正常終了 | なし |
| `TRS-UT-006-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-006]] | 2026-11-08 | PASS | 4種の中見出しパターン・アンカーリンク生成正常終了 | なし |
| `TRS-UT-007-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-007]] | 2026-11-08 | PASS | ページ一覧HTMLアンカーリンク直接生成・生Markdown露出防止正常終了 | なし |
| `TRS-UT-008-R01` | [[01_test_specification#2.1 単体テスト\|TEST-UT-008]] | 2026-11-09 | PASS | 疑似時計定刻判定・重複防止・コメント解析・自己承認拒否・リトライ上限退避正常終了 | なし |
| `TRS-IT-001-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-001]] | 2026-11-04 | PASS | MCPツール連携正常終了 | なし |
| `TRS-IT-002-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-002]] | 2026-11-04 | PASS | エラーコード全網羅・プロセス正常維持 | なし |
| `TRS-IT-003-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-003]] | 2026-11-04 | PASS | Issueテンプレート構文検証正常終了 | なし |
| `TRS-IT-004-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-004]] | 2026-11-04 | PASS | 事前アカウント検証遮断正常終了 | なし |
| `TRS-IT-005-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-005]] | 2026-11-04 | PASS | ブランチ名自動是正正常終了 | なし |
| `TRS-IT-006-R01` | [[01_test_specification#2.2 結合テスト\|TEST-IT-006]] | 2026-11-04 | PASS | 非対話ビルド正常終了（デッドロック0件） | なし |
| `TRS-ST-001-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-001]] | 2026-11-04 | PASS | TypeScriptビルドおよびPDF出力正常終了 | なし |
| `TRS-ST-002-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-002]] | 2026-11-04 | PASS | PPTX変換正常終了（60秒以内） | なし |
| `TRS-ST-003-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-003]] | 2026-11-04 | PASS | コメント規約・PII・RTM断絶0件 | なし |
| `TRS-ST-004-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-004]] | 2026-11-04 | PASS | スキル構文および規約整合正常終了 | なし |
| `TRS-ST-005-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-005]] | 2026-11-04 | PASS | 表紙タイトルはみ出し防止正常終了 | なし |
| `TRS-ST-006-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-006]] | 2026-11-04 | PASS | 10段階リサイズ・後方互換性正常終了 | なし |
| `TRS-ST-007-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-007]] | 2026-11-04 | PASS | 設定手順および手動出力正常終了 | なし |
| `TRS-ST-008-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-008]] | 2026-11-04 | PASS | Acrobat互換・Type3フォント0件正常終了 | なし |
| `TRS-ST-009-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-009]] | 2026-11-04 | PASS | 余剰白紙ページ抑止正常終了（0件） | なし |
| `TRS-ST-010-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-010]] | 2026-11-04 | PASS | 規約適合全図書違反0件正常終了 | なし |
| `TRS-ST-011-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-011]] | 2026-11-07 | PASS | 日報3枠（07:30/11:50/18:00）および水曜16:00週報テンプレ生成正常終了 | なし |
| `TRS-ST-012-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-012]] | 2026-11-08 | PASS | 中見出し描画および章別目次抽出（toc-chapters-only）正常終了 | なし |
| `TRS-ST-013-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-013]] | 2026-11-08 | PASS | 4:3比率ビルド・フッター絶対配置・通常ヘッダー非表示・章題名大見出し正常終了 | なし |
| `TRS-ST-014-R01` | [[01_test_specification#2.3 総合テスト\|TEST-ST-014]] | 2026-11-09 | PASS | 複数Issue連続消化・独立ワーカー実行・PRドラフト出力・取扱説明書PDF出力正常終了 | なし |

# 4 不具合記録

## 4.1 不具合一覧
| 不具合 | 内容 | 重大度 | 対処 |
| :--- | :--- | :--- | :--- |
| なし | 重大不具合（Must/Critical）の残存は存在しない | なし | 該当事項なし |
