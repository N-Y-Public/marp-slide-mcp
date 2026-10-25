---
id: TPL-REQ-NFR-003
title: 非機能要件定義書 — IPA非機能要求グレード準拠 (Non-Functional Requirements Specification)
version: 1.0.0
status: Draft
date: 2026-10-17
author: N-Y-Public
tags:
  - template
  - ipa
  - requirements
  - non-functional-requirements
---

# 非機能要件定義書 — IPA非機能要求グレード準拠 (Non-Functional Requirements Specification)

> **テンプレート利用ガイド**: 本ドキュメントは、**IPA「非機能要求グレード」6大項目**（1.可用性、2.性能・拡張性、3.運用・保守性、4.移行性、5.セキュリティ、6.システム環境・エコロジー）に準拠した非機能要件定義書の標準雛形である。すべての項目に「要求値・根拠・検証基準」の3点セットを明記し、空欄（TBD）を残さないこと。

---

## レビュアー向けサマリ
- **前版からの差分**: 初版作成
- **人間（承認者）が判断すべきポイント（3〜5点）**:
  1. 性能目標値（PDF/PPTX生成の完了時間上限）が実運用で許容できる水準か
  2. セキュリティ要件（PII・ホスト絶対パス完全排除、パストラバーサル防止）がOSS公開基準を満たすか
  3. 保守性要件（全行直上平易コメント規則、Docker完全再現性）の強制レベルが妥当か
- **影響するQ-ID・基準ID**: `Q-07`（性能実測値）、`Q-09`（セキュリティ・PII保護）、`Q-10`（規約準拠）
- **承認に必要な最小読解セット**: 「1. IPA非機能要求グレード6大項目一覧」「2. セキュリティ・プライバシー詳細要件」

---

## 1. IPA非機能要求グレード 6大項目定義テーブル (`REQ-NFR-xxx`)

| 要件ID | 大分類 (IPA 6大項目) | 中分類 | 要件内容・目標数値（要求レベル） | 設定根拠 | 検証基準・確認手段 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-NFR-001** | **1. 可用性**<br>(Availability) | 障害時継続性・フォールバック | Chromiumバイナリパス（`CHROME_PATH`）が未指定の場合でも4段階の自動探索により解決し、さらにMarp CLI非対話実行時のstdin待機デッドロック防止（`--no-stdin`）およびサンドボックス解除（`CHROME_NO_SANDBOX=1`）により変換停止を防止すること。 | 環境差異や非対話パイプ実行によるビルドハングを防ぐため（PBI-007合意） | `CHROME_PATH` 未指定状態およびDocker内でのPDF/PPTXビルド成功確認（`TEST-ST-001`, `TEST-IT-006`） |
| **REQ-NFR-002** | **2. 性能・拡張性**<br>(Performance & Scalability) | レスポンス・処理時間 | 20ページ規模のスライドデッキにおいて、PDF生成処理が **30秒以内**、ネイティブPPTX変換処理が **60秒以内**（p95）に完了すること。 | 対話型AIエージェントからの呼び出しでタイムアウトしない上限値 | Dockerコンテナ内でのベンチマーク計測（`TEST-ST-002`） |
| **REQ-NFR-003** | **3. 運用・保守性**<br>(Operability & Maintainability) | 保守容易性・可読性 | 全TypeScript/JavaScript/CSSソースコードにおいて **「全行直上平易コメント規則」** を100%適用し、入力検証にZodスキーマを用いて不正入力時の原因特定を即座に行えること。 | `docs/00_project_charter/02_coding_standards.md` 規定 | コードレビューおよび異常系JSON投入テスト（`TEST-UT-001`） |
| **REQ-NFR-004** | **4. 移行性**<br>(Migration) | 資産ポータビリティ | 生成成果物は標準Markdown（`.md`）、PDF（`.pdf`）、OfficeオープンXML（`.pptx`）の3形式で出力可能とし、特定SaaSへのベンダーロックインを発生させないこと。 | プロジェクト憲章のオープン＆ロックインフリー原則 | 生成された `.md`, `.pdf`, `.pptx` の互換性検証（`TEST-ST-002`） |
| **REQ-NFR-005** | **5. セキュリティ**<br>(Security) | 機密保護・PII排除・入力検証 | リポジトリおよび生成ログ内に個人実名、ホスト固有の絶対パス（`/Users/...`, `C:\path\to\...` 等）、秘密鍵・`.env` を **0件** とし、`.githooks/pre-commit` で機械的に遮断すること。 | OSS公開リポジトリのプライバシー保護最優先事項（Q-09） | 静的テキストスキャンおよびGitフック検証（`TEST-ST-003`） |
| **REQ-NFR-006** | **6. システム環境・エコロジー**<br>(System Environment) | 移植性・環境再現性・代替環境適応性 | Docker Dev Container（Node.js 22 LTS + Chromium + `fonts-noto-cjk`）上でOSに依存せず100%同一のビルド結果が得られるとともに、企業ポリシー等でDockerが使用できない環境においてもホスト上のNode 22・Chrome・Python 3により直接ビルドおよび変換が可能であること。 | `AGENTS.md` 第1項 Docker環境限定実行原則およびDockerレス環境での導入性担保（Issue #14対応） | Docker Compose経由およびローカル環境でのビルド・変換一貫性テスト（`TEST-ST-001`, `TEST-IT-006`, `TEST-ST-007`） |

---

## 2. カテゴリ別詳細仕様と運用方針

### 2.1 可用性・信頼性設計 (`REQ-NFR-001`)
- **プロセス保護**: MCPサーバー（Stdio通信）において、単一ツール呼び出しの失敗（不正なMarkdown構文やファイルI/Oエラー）がプロセス全体のクラッシュを引き起こさないよう、`try / catch` による共通エラーハンドリングで保護する。
- **一時ファイルの確実なクリーンアップ**: PDF/PPTX変換時に生成される中間HTMLファイル（`*_temp.html` 等）は、`finally` ブロックで確実に削除し、ディスク領域のリークを防止する。
- **Marp CLI 非対話実行およびブラウザサンドボックス統制 (PBI-007)**: Docker Compose や CI などの非対話パイプ環境において、Marp CLI が stdin 入力待ち（`get-stdin`）でハングすることを防ぐため、`package.json` のスクリプトに `--no-stdin` を明示する。また、コンテナ環境特有のサンドボックス制約を回避するため、環境変数 `CHROME_NO_SANDBOX=1` を Dockerfile および compose 構成に配備し、Puppeteer / Chromium 起動時引数への伝播を保証する。

### 2.2 性能・拡張性設計 (`REQ-NFR-002`)
- **スライド規模上限**: 1デッキあたり最大100ページ、目次自動分割は1ページあたり12項目を基準とし、超過時は自動的に複数目次ページへ分割する。
- **メモリ管理**: Puppeteerのブラウザインスタンスは変換処理完了ごとに `browser.close()` を確実に実行し、ゾンビプロセスを残さない。

### 2.3 運用・保守性設計 (`REQ-NFR-003`)
- **トレーサビリティ自動化**: 仕様変更時は `.agents/skills/ipa-traceability-validator/scripts/verify_rtm.py` を実行し、要件・設計・テストの断絶をCI/ローカルで即座に検知できる体制を維持する。
- **ログ出力規約**: MCPサーバーは標準出力（`stdout`）をJSON-RPCプロトコル通信専用に使用するため、診断・エラーログは必ず標準エラー出力（`stderr`）へ出力する。

### 2.4 セキュリティ・プライバシー統制 (`REQ-NFR-005`)
- **Gitアイデンティティ統制**: コミット作成者は `N-Y-Public`（`330902043+N-Y-Public@users.noreply.github.com`）に固定する。
- **パス指定の安全性**: ファイル操作時はワークスペース基準の相対パス解決を行い、意図しないシステム領域への書き込みを行わない。

### 2.5 システム環境・Dockerレス代替環境設計 (`REQ-NFR-006`)
- **Docker環境標準**: 開発・CI・公式ビルドは Dev Container（Node 22 LTS, Headless Chromium, `fonts-noto-cjk`）を基準とし、OS間差異のない安定出力を保証する。
- **Dockerレス環境対応**: 企業環境等でDockerが使用できない場合、ホストマシン環境（Node.js 22 LTS、Google Chrome / Chromium、Python 3.10+、日本語フォント）上での直接ビルド（`npm install`, `npm run build`, `npm run build:pdf`, `npm run build:pptx-custom`）を公式サポートし、手順を明文化する。

---

## 3. 非機能要件チェックリスト（ゲート確認用）

- [x] IPA非機能要求グレードの6大項目すべてに要件ID（`REQ-NFR-001`〜`006`）が定義されているか。
- [x] 「高速であること」「安全であること」等の定性表現ではなく、観測・測定可能な検証基準が設定されているか。
- [x] 各非機能要件が `99_traceability_matrix.md` を通じて方式設計（`04_system_architecture.md`）およびテスト仕様書（`06_test_specification.md`）にトレースされているか。
