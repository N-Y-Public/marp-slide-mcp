---
id: TPL-TST-SPC-006
title: テスト仕様書兼成績書 (Test Specification & Report)
version: 1.0.0
status: Draft
date: 2026-10-17
author: N-Y-Public
tags:
  - template
  - ipa
  - testing
  - qa
  - v-model
---

# テスト仕様書兼成績書 (Test Specification & Report)

> **テンプレート利用ガイド**: 本ドキュメントは、IPA共通フレーム2013（SLCP-JCF2013）およびV字/W字モデルに準拠した単体テスト（UT）・結合テスト（IT）・総合テスト（ST）の仕様書兼成績書雛形である。`ipa-qa-engineer` スキルを用いて、すべてのテストケース（`TEST-*`）を上流の要件ID（`REQ-*`）およびモジュールID（`MOD-*`）に紐付け、観測可能な合否判定基準と定量サマリーを記録すること。

---

## レビュアー向けサマリ
- **前版からの差分**: 初版作成
- **人間（承認者）が判断すべきポイント（3〜5点）**:
  1. テストケース一覧が正常系・境界値・準正常系（エラーコード一覧全行）・異常系（未定義エラー受け皿）を網羅しているか
  2. 合否判定基準（Expected Result）がすべて主観を排した観測可能な事実・数値で記述されているか
  3. 冒頭の「数値サマリー表」において消化率100%・未解決Must/Critical不具合0件を達成しているか
- **影響するQ-ID・基準ID**: `Q-03`（トレーサビリティ断絶0件）、`Q-05`（初回不合格率）、`Q-06`（不具合密度・エラー空間閉鎖）
- **承認に必要な最小読解セット**: 「1. 数値サマリー表（必須）」「2. テストケース一覧と合否判定基準」

---

## 1. 数値サマリー表（QCDゲート転記元・必須）

> [!IMPORTANT]
> 「テスト合格」等の定性表現のみの報告は無効とする。必ず以下の定量サマリー表に計画値と実測値を記録すること。

| 指標項目 | 計画値 (Target) | 実測値 (Actual) | 差分 / 判定 | 備考・対応QCD基準 |
| :--- | :--- | :--- | :---: | :--- |
| **総テストケース数（実施 / 総数）** | 10 / 10 件 | 10 / 10 件 | 0 件 (PASS) | 単体3件・結合3件・総合4件 |
| **合格 / 不合格 / スキップ件数** | 合格 10 / 不合格 0 / スキップ 0 | 合格 10 / 不合格 0 / スキップ 0 | PASS | Critical / Must 残存 0件 (`Q-02`) |
| **テスト消化率** | 100.0% | 100.0% | 0.0% (PASS) | `D-01`（完了定義 0/100原則） |
| **トレーサビリティ断絶件数** | 0 件 | 0 件 | 0 件 (PASS) | `verify_rtm.py` 検証済 (`Q-03`) |
| **エラーコード網羅率** | 100.0% (5/5 行) | 100.0% (5/5 行) | 0.0% (PASS) | `ERR-VAL-001`〜`ERR-SYS-999` (`Q-06`) |
| **PII・ローカル絶対パス混入数** | 0 件 | 0 件 | 0 件 (PASS) | セキュリティ監査基準 (`Q-09`) |

---

## 2. テストケース一覧と合否判定基準 (`TEST-xxx` 採番正本)

### 2.1 単体テスト仕様 (Unit Test: `TEST-UT-xxx` ← 詳細設計書 `05_software_design.md` 検証)

| テストID | 対応要件ID | 対象モジュールID | 観点区分 | 確認項目・テスト手順（Given / When） | 合否判定基準（Then: 観測可能な期待結果） | 判定 |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **TEST-UT-001** | `REQ-F-001`<br>`REQ-NFR-003` | `MOD-001` | 正常系・境界値・準正常系 | 1. 有効な `SlideDeck` データを `generateMarpMarkdown` に渡す。<br>2. タイトル60文字・主張250文字の境界値および必須欠落データをZodスキーマに入力する。 | 1. `#`〜`######` の見出しアンカー構造を持つMarp Markdown文字列が返却されること。<br>2. 境界値データは通過し、必須欠落時は `ERR-VAL-001` 相当の検証エラーメッセージが返却され例外クラッシュしないこと。 | PASS |
| **TEST-UT-002** | `REQ-F-002` | `MOD-002` | 正常系・境界値 | 1. `<!-- _class: toc -->` を含む12項目（計14ページ）および13項目以上（表紙込み17ページ以上）のスライドトークン列を `marp_toc` プラグインに入力する。<br>2. 表・コード・Mermaid・画像の各CSSリサイズルールを適用する。 | 1. 12項目以下は1ページ、13項目以上は12項目ごとに独立した `<svg data-marpit-svg>` スライドページ（`目次 (続き)`）として分割生成され、ヘッダーロゴ・`h6` フッター保持および `#N` リンクと後続スライドの `id="N"` / `data-marpit-pagination="N"` が100%一致すること。<br>2. 各要素が本文領域内（下部フッター40pxより上）に収まること。 | PASS |
| **TEST-UT-003** | `REQ-F-003` | `MOD-003` | 正常系・異常系 | 1. `pptx_converter/convert.js` の座標変換ロジックに96DPI基準のDOM矩形座標を入力する。<br>2. 変換終了時の中間HTMLファイルの有無を確認する。 | 1. ピクセル値が正確なPowerPointインチ単位へ変換され、テキスト・テーブル・図形オブジェクトが生成されること。<br>2. 正常終了時・例外発生時ともに一時ファイル（`*_temp.html`）が削除されていること。 | PASS |

---

### 2.2 結合テスト仕様 (Integration Test: `TEST-IT-xxx` ← 方式設計書 `04_system_architecture.md` 検証)

| テストID | 対応要件ID | 対象モジュールID | 観点区分 | 確認項目・テスト手順（Given / When） | 合否判定基準（Then: 観測可能な期待結果） | 判定 |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **TEST-IT-001** | `REQ-F-001`<br>`REQ-F-002` | `MOD-001`<br>`MOD-002` | 正常系<br>(I/F連携) | 1. MCPツール `generate_slide_deck` → `insert_slide` → `update_slide` → `get_slide_deck` を順に呼び出し、`MOD-001` と `MOD-002`（Marpエンジン・テーマ）の連携を実行する。<br>2. `pageTitle: "目次"`（本文空・`classes` 未指定）を含む17ページ以上のデッキを生成し、複数ページ目次とPDF出力を検証する。 | 1. 各操作後にMarkdownファイルとPDFが再生成され、`get_slide_deck` の返却JSON内のページ数・タイトル・主張が更新内容と100%一致すること。<br>2. 自動で `<!-- _class: toc -->` が付与され、出力PDF/HTMLにおいて目次2ページ目（`目次 (続き)`）が独立ページとして出力されること。 | PASS |
| **TEST-IT-002** | `REQ-F-001`<br>`REQ-F-003`<br>`REQ-NFR-001` | `MOD-001`<br>`MOD-003` | 準正常系・異常系<br>(エラー空間閉鎖) | 外部I/Fエラーコード一覧の全パターン（`ERR-VAL-001` 型不正、`ERR-NOT-002` 存在しないfileId、`ERR-RNG-003` 範囲外ページ番号、`ERR-ENV-004` ブラウザ探索、`ERR-SYS-999` 未定義エラー受け皿）を入力する。 | すべてのケースでMCPサーバープロセスが異常終了せず、定義されたエラーメッセージ（`isError: true`）または終了コードが返却されること。 | PASS |
| **TEST-IT-003** | `REQ-F-001` | `MOD-001` | 正常系<br>(テンプレート構文・PR整合) | 1. `.github/ISSUE_TEMPLATE/*.yml` の構文妥当性および `blank_issues_enabled: false` を検証する。<br>2. `.github/pull_request_template.md` に関連Issue、検証内容、機密除外チェックリストが含まれ、特定のAuthor名を強要していないことを確認する。 | 1. 各YAMLが有効な構文を持ち、必須項目が定義されていること。<br>2. PRテンプレートが標準項目を満たし、コントリビューター自身のクレジットを尊重していること。 | PASS |

---

### 2.3 総合テスト仕様 (System Test: `TEST-ST-xxx` ← 要件定義書 `02`/`03` 検証)

| テストID | 対応要件ID | 対象モジュールID | 観点区分 | 確認項目・テスト手順（Given / When） | 合否判定基準（Then: 観測可能な期待結果） | 判定 |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **TEST-ST-001** | `REQ-F-001`<br>`REQ-F-002`<br>`REQ-NFR-001`<br>`REQ-NFR-006` | `MOD-001`<br>`MOD-002` | 業務シナリオ・環境再現性 | Dockerコンテナ環境（`docker compose run --rm app`）にて `npm run build` および `npm run build:pdf` を一気通貫で実行する。 | TypeScriptコンパイルおよびMarp PDFビルドが終了コード `0` で完了し、日本語（Noto CJK）を含むPDFが崩れなく出力されること。 | PASS |
| **TEST-ST-002** | `REQ-F-003`<br>`REQ-NFR-002`<br>`REQ-NFR-004` | `MOD-002`<br>`MOD-003` | 性能・移行性 | Dockerコンテナ環境にて `npm run build:pptx` を実行し、処理時間および生成された `.pdf` / `.pptx` ファイルの構造を検証する。 | PDF生成が30秒以内、PPTX変換が60秒以内に終了コード `0` で完了し、有効な `.pptx` ファイルが生成されること。 | PASS |
| **TEST-ST-003** | `REQ-NFR-003`<br>`REQ-NFR-005` | `MOD-001`<br>`MOD-002`<br>`MOD-003` | セキュリティ・保守性・RTM監査 | 1. 全ソースコードの「全行直上平易コメント規則」準拠を検査する。<br>2. リポジトリ内の実名・ホスト絶対パス混入スキャンおよび `verify_rtm.py` を実行する。 | 1. コメント規則違反が0件であること。<br>2. 実名・ホスト絶対パス混入が0件であり、`verify_rtm.py` が断絶0件（Exit Code `0`）で完了すること。 | PASS |
| **TEST-ST-004** | `REQ-NFR-005` | `MOD-001` | 規約・スキル・プライバシー監査 | 1. `CONTRIBUTING.md` およびコーディング規約にブランチ命名規則と2層分離が明文化されているか検証する。<br>2. `.agents/skills/github-workflows/SKILL.md` のFrontmatter構文を検査する。 | 1. ブランチ命名フォーマットと各自のクレジット尊重が明記されていること。<br>2. スキル定義エラーが0件であること。 | PASS |

---

## 3. テスト実行環境・回帰テスト選択ルール

### 3.1 テスト実行コマンド標準（Dockerコンテナ内実行必須）
```bash
# 1. TypeScript ビルド検証 (MOD-001)
docker compose run --rm app npm run build

# 2. スライド PDF 出力検証 (MOD-002)
docker compose run --rm app npm run build:pdf

# 3. ネイティブ PPTX 出力検証 (MOD-003)
docker compose run --rm app npm run build:pptx

# 4. 要件トレーサビリティ (RTM) 完全性検証 (Q-03)
docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py
```

### 3.2 改修時の回帰テスト選択マトリクス
| 変更対象ファイル / モジュール | 必須再実行テスト (`Must`) | 隣接回帰テスト (`Adjacent`) | フル回帰格上げ条件 |
| :--- | :--- | :--- | :--- |
| `src/index.ts` (`MOD-001`) | `TEST-UT-001`, `TEST-IT-001`, `TEST-IT-002` | `TEST-ST-001`, `TEST-ST-003` | スキーマ定義変更時 |
| `marp.config.js` / `themes/*` (`MOD-002`) | `TEST-UT-002`, `TEST-ST-001` | `TEST-IT-001`, `TEST-ST-002` | 共通CSS変数・アンカー変更時 |
| `pptx_converter/convert.js` (`MOD-003`) | `TEST-UT-003`, `TEST-ST-002` | `TEST-IT-002`, `TEST-ST-003` | Puppeteer / PptxGenJS更新時 |
