---
id: DOC-DD-003
title: プログラム仕様書
doc_type: detail_design
version: 1.5.0
status: Approved
date: 2026-11-09
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - detail-design
  - program-specification
  - algorithm
  - implementation
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」を構成する各プログラムファイルの詳細処理論理、アルゴリズム、制御構造、および例外処理仕様を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- 入出力の形式: [[06_data_structure_specification#2 データ構造|データ構造]]、[[05_file_format_specification#2 ファイル形式|ファイル形式]]
- モジュール構成: [[01_software_structure_design#2 モジュール構成|モジュール構成]]
- 外部I/F仕様: [[03_external_interface_specification#2 外部インターフェース|外部インターフェース]]
- 内部I/F仕様: [[02_internal_interface_specification#2 内部インターフェース|内部インターフェース]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 初版作成（DOC-GOV-003およびDOC-GOV-004準拠） |
| 1.1.0 | 2026-11-04 | PBI-014 | PPTX変換スクリプト（PRG-PPT-001）詳細処理論理およびexportToPptx（FN-SRV-008）の追加 |
| 1.2.0 | 2026-11-07 | PBI-019 | 自律開発オーケストレーター（PRG-AUT-001）および日報・週報テンプレート生成ツール（PRG-AUT-002）の追加 |
| 1.3.0 | 2026-11-08 | PBI-020 | 中見出しスライド解決処理（FN-SRV-009）の追加 |
| 1.4.0 | 2026-11-08 | PBI-021 | 中見出しスライドのHTMLセマンティックタグ直接出力および生Markdown露出根絶論理の追加 |
| 1.5.0 | 2026-11-09 | PBI-022 | 常駐Pythonオーケストレーターデーモン（PRG-AUT-003, FN-AUT-005, FN-AUT-006, FN-AUT-007）の追加 |

# 2 プログラム

## 2.1 PRG-SRV-001 MCPサーバー本体
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.1 MOD-SRV-001 MCPサービスモジュール|MOD-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `src/index.ts` |
| 所属モジュール | `MOD-SRV-001` |

### 2.1.1 FN-SRV-001 resolveChromiumPath
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| なし | - | 引数なし | - | - |

#### 2.1.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-001-OUT01` | 解決済みパス | 検出したChromium実行バイナリの絶対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.1.3 処理論理
1. 環境変数 `CHROME_PATH` が設定されているか確認する。設定されている場合はその値を採用する。
2. Puppeteerの `puppeteer.executablePath()` が指す実行ファイルが存在するか確認する。
3. Linux環境のPuppeteerキャッシュ（ユーザーディレクトリ配下の `.cache/puppeteer/chrome`）を走査する。
4. システム標準パス（`/usr/bin/chromium` または `/usr/bin/google-chrome`）の存在を確認する。
5. 検出できたパスを返却する。未検出の場合は未設定のまま終了する。

#### 2.1.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 実行バイナリ未検出 | `ERR-ENV-004` | 未解決状態で終了し実行時エラーとする |

### 2.1.2 FN-SRV-002 generateSlideDeck
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-002-IN01` | スライド定義 | スライドデッキの全構造データ | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

#### 2.1.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-002-OUT01` | 生成結果情報 | 生成したファイルのパスと確認メッセージ | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.2.3 処理論理
1. 入力パラメータをZodスキーマ（`SlideDeckSchema`）で検証する。
2. ファイル名接頭辞が未指定の場合は日時UUID形式で採番する。
3. 出力ディレクトリ（`slides/<filename>/`）を作成する。
4. `generateMarpMarkdown` を呼出し、Marp互換Markdownテキストを生成する。
5. 生成したテキストを `<filename>.md` として保存し、同時に `<filename>.json` を保存する。
6. 生成結果メッセージを返却する。

#### 2.1.2.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| パラメータ検証違反 | `ERR-VAL-001` | スキーマ検証エラーメッセージを返却する |
| ディレクトリ作成失敗 | `ERR-SYS-001` | ファイルシステムエラーを返却する |

### 2.1.3 FN-SRV-003 getSlideDeck
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.3.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-003-IN01` | ファイルパス | 読込対象スライドMarkdownの相対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.3.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-003-OUT01` | スライド構造データ | 解析されたスライド構成データ | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

#### 2.1.3.3 処理論理
1. 指定ファイルの存在を確認し、非同期で読み込む。
2. `parseMarpMarkdown` を呼出し、フロントマターとスライド単位のMarkdownブロックを抽出する。
3. 各スライドのタイトル、主張、本文を抽出し構造化オブジェクトとして返却する。

#### 2.1.3.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 対象ファイル不在 | `ERR-NOT-001` | ファイル不在エラーメッセージを返却する |
| パース失敗 | `ERR-VAL-001` | 構文解析エラーを返却する |

### 2.1.4 FN-SRV-004 insertSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.4.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-004-IN01` | ファイルパス | 対象スライドファイルの相対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-004-IN02` | 挿入位置インデックス | スライドを挿入する1始まりの位置 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-004-IN03` | スライドデータ | 挿入するスライドの構成定義 | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] |

#### 2.1.4.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-004-OUT01` | 処理結果メッセージ | 挿入完了通知メッセージ | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.4.3 処理論理
1. 対象ファイルを読み込み、スライド境界で分割する。
2. 指定インデックスの妥当性を検証する（表紙位置への不当操作を防止）。
3. 指定位置に新規スライドのMarkdownテキストを挿入する。
4. ファイルを再結合してアトミックに書き戻す。

#### 2.1.4.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| インデックス範囲外 | `ERR-VAL-002` | 不正位置エラーメッセージを返却する |
| 書込失敗 | `ERR-SYS-001` | ファイル書込エラーを返却する |

### 2.1.5 FN-SRV-005 updateSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.5.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-005-IN01` | ファイルパス | 対象スライドファイルの相対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-005-IN02` | 更新位置インデックス | 更新対象のスライド位置 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-005-IN03` | スライドデータ | 更新後のスライド構成定義 | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] |

#### 2.1.5.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-005-OUT01` | 処理結果メッセージ | 更新完了通知メッセージ | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.5.3 処理論理
1. 対象ファイルを読み込み、スライド境界で分割する。
2. 指定インデックスが存在するか確認する。
3. 対象スライドを指定データから生成した新しいMarkdownで置換する。
4. ファイルを再結合してアトミックに書き戻す。

#### 2.1.5.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| インデックス範囲外 | `ERR-VAL-002` | 存在しないスライド位置エラーを返却する |
| 書込失敗 | `ERR-SYS-001` | ファイル書込エラーを返却する |

### 2.1.6 FN-SRV-006 deleteSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.6.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-006-IN01` | ファイルパス | 対象スライドファイルの相対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-006-IN02` | 削除位置インデックス | 削除対象のスライド位置 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.6.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-006-OUT01` | 処理結果メッセージ | 削除完了通知メッセージ | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.6.3 処理論理
1. 対象ファイルを読み込み、スライド境界で分割する。
2. 指定インデックスを検証する（表紙の削除は不可）。
3. 指定位置のスライドを配列から除去する。
4. ファイルを再結合してアトミックに書き戻す。

#### 2.1.6.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 表紙削除指定または範囲外 | `ERR-VAL-002` | 削除不可位置エラーを返却する |
| 書込失敗 | `ERR-SYS-001` | ファイル書込エラーを返却する |

### 2.1.7 FN-SRV-007 exportToPdf
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.7.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-007-IN01` | 入力ファイルパス | 対象スライドMarkdownの相対パス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-007-IN02` | 出力ファイルパス | 出力先PDFの相対パス | 任意 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.7.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-007-OUT01` | 出力先情報 | 生成されたPDFファイルのパス情報 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.7.3 処理論理
1. 入力Markdownファイルの存在を確認する。
2. 出力パスが未指定の場合、拡張子を `.pdf` に変換したパスを設定する。
3. Marp CLIプロセスを起動し、PDF変換処理を実行する。
4. 処理成功時は生成ファイルのパスを返却する。

#### 2.1.7.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 入力ファイル不在 | `ERR-NOT-001` | 不在エラーメッセージを返却する |
| レンダリング失敗 | `ERR-SYS-001` | 未定義エラーとして例外を通知する |

### 2.1.8 FN-SRV-008 exportToPptx
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.8.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-008-IN01` | スライドID | 対象スライドの識別子 | 任意 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-SRV-008-IN02` | Markdownファイルパス | 変換元Markdownの相対パス | 任意 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.8.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-008-OUT01` | 出力先情報 | 生成されたPPTXファイルのパス情報 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.8.3 処理論理
1. `fileId` または `markdownPath` から対象Markdownファイルの存在を確認する。
2. 出力パスが未指定の場合、拡張子を `.pptx` に変換したパスを設定する。
3. PPTX変換スクリプト（`pptx_converter/convert.js`）を実行する。
4. 処理成功時は生成PPTXファイルのパス情報を返却する。

#### 2.1.8.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 対象ファイル不在 | `ERR-NOT-002` | 対象不在エラーメッセージを返却する |
| 変換失敗 | `ERR-SYS-999` | 例外エラーメッセージを返却する |

### 2.1.9 FN-SRV-009 resolveSectionDividerSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.1 PRG-SRV-001 MCPサーバー本体|PRG-SRV-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.1.9.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-009-IN01` | 中見出し定義 | 中見出しパターン・タイトル・章構成情報 | 必須 | [[06_data_structure_specification#2.10 DAT-TYP-010 SectionDivider|DAT-TYP-010]] |

#### 2.1.9.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-SRV-009-OUT01` | 解決後コンテンツ | 中見出し用Markdown本文およびクラスディレクティブ | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.1.9.3 処理論理
1. 中見出しパターン（`title-only`, `title-and-pages`, `all-chapters`, `all-chapters-and-pages`）を判定する。
2. HTMLブロック内にMarkdown構文を混在させることによるテキスト未パース（生Markdown露出）を防止するため、純粋なセマンティックHTML（`<ul>`, `<li>`, `<a>`）を生成する。
3. `title-only`: テーマ共通のh1-h6隠蔽ルールを回避するため `<div class="chapter-header-main"><div class="chapter-title">章タイトル</div></div>` を出力する。
4. `title-and-pages`: 章タイトル（`<div class="chapter-header-main"><div class="chapter-title">章タイトル</div></div>`）と、属するページタイトル一覧（`<ul class="chapter-pages-list"><li><a href="#スライド番号">タイトル</a></li></ul>`）をセマンティックHTMLで出力する。
5. `all-chapters`: 全章タイトル一覧（`<ul class="all-chapters-list">`）を出力し、カレント章を `<li class="active-chapter"><strong>章タイトル</strong></li>`、他章を `<li class="dim">章タイトル</li>` で出力する。
6. `all-chapters-and-pages`: 全章タイトル一覧（カレント太字、他章 `.dim`）に加え、カレント章の子リストとして属するページタイトル一覧（`<ul class="chapter-pages-list"><li><a href="#スライド番号">タイトル</a></li></ul>`）を出力する。
7. `section-divider` クラスおよび `pattern-{pattern}` クラスをクラス配列に付与する。

#### 2.1.9.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 不正なパターン指定 | `ERR-VAL-001` | バリデーションエラーとして処理を中断する |

## 2.2 PRG-ENG-001 カスタムMarpエンジン
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.2 MOD-ENG-001 カスタムMarpエンジン|MOD-ENG-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `marp.config.js` |
| 所属モジュール | `MOD-ENG-001` |

### 2.2.1 FN-ENG-001 marpTocPlugin
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.2 PRG-ENG-001 カスタムMarpエンジン|PRG-ENG-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.2.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-ENG-001-IN01` | MarkdownItインスタンス | Markdownパーサーのインスタンス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.2.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| なし | - | プラグイン登録による副作用のみ | - | - |

#### 2.2.1.3 処理論理
1. トークン列を走査し、スライド境界および見出しトークンを検出する。
2. 目次スライド（クラス名 `toc`）が存在する場合、収集した見出し情報を整形して目次トークンを注入する。
3. 見出し件数が12件を超える場合は複数スライドへ自動分割する。
4. 分割枚数に応じて後続スライドのページ番号属性をシフト補正する。

#### 2.2.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| トークン走査失敗 | `ERR-SYS-001` | 未定義エラーとして変更を加えずに終了する |

### 2.2.2 FN-ENG-002 tableCodeResizePlugin
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.2 PRG-ENG-001 カスタムMarpエンジン|PRG-ENG-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.2.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-ENG-002-IN01` | MarkdownItインスタンス | Markdownパーサーのインスタンス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.2.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| なし | - | プラグイン登録による副作用のみ | - | - |

#### 2.2.2.3 処理論理
1. スライドディレクティブのクラス指定を検査する。
2. 手動クラス（`table-1` から `table-10`、または `code-1` から `code-10`）が指定されている場合は自動計算スタイルの注入を抑止する。
3. 手動クラスが存在しない場合のみ、行数および文字数に応じた縮小スタイルをインライン注入する。

#### 2.2.2.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| スタイル注入失敗 | `ERR-SYS-001` | 未定義エラーとして通常スタイルで処理を継続する |

## 2.3 PRG-PPT-001 PPTX変換スクリプト
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.3 MOD-PPT-001 PPTXカスタムコンバーター|MOD-PPT-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `pptx_converter/convert.js` |
| 所属モジュール | `MOD-PPT-001` |

### 2.3.1 FN-PPT-001 convertToPptx
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.3 PRG-PPT-001 PPTX変換スクリプト|PRG-PPT-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.3.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-PPT-001-IN01` | 入力ファイルパス | 変換元Markdownのパス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-PPT-001-IN02` | 出力ファイルパス | 出力先PPTXのパス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.3.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-PPT-001-OUT01` | 終了コード | 実行結果を表す数値（成功時0） | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.3.1.3 処理論理
1. 入力MarkdownからMarp CLI（`--config-file marp.config.js` 付き）を用いて目次生成・自動リサイズ適用済みの中間HTMLを生成する。
2. ヘッドレスChromiumを起動し、中間HTMLのDOM構造および要素の描画位置・フォント属性を等倍（4:3=`960x720`, 16:9=`1280x720`）で走査する。
3. DOM Rangeによるテキストグリフ実寸計測（`getTightTextRect`）とメイリオ文字幅推定（`estimateMeiryoSingleLineWidth`）を行い、余白マージンを一致させる。
4. 箇条書き・表セル・コードブロック・複数行文章に対し、`estimateWrappedLinesCount` および `getNextSiblingTopBoundaryPx` による2次元フォントサイズ厳密計算を実行し、直下要素やコンテナ高さを超えないよう反復調整する。
5. 取得した要素群をPptxGenJSオブジェクト（スライドマスター、テキストボックス、ネイティブ表、オートシェイプ、画像、Mermaid分解シェイプ）へ変換し配置する。
6. 数式要素が存在する場合は `FN-PPT-002 injectOfficeMath` を実行してOffice MathMLへ変換し、PPTXファイルを保存して中間HTMLを削除する。

#### 2.3.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 入力ファイル不在 | `ERR-NOT-001` | 終了コード1で終了する |
| レンダリング失敗 | `ERR-SYS-001` | 終了コード1で終了する |

### 2.3.2 FN-PPT-002 injectOfficeMath
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.3 PRG-PPT-001 PPTX変換スクリプト|PRG-PPT-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.3.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-PPT-002-IN01` | 対象PPTXパス | 変換対象PPTXファイルパス | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |
| `FN-PPT-002-IN02` | 数式マップ | プレースホルダと数式定義の対応辞書 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.3.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-PPT-002-OUT01` | 注入完了真偽値 | 数式置換完了状態 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.3.2.3 処理論理
1. PPTXアーカイブを展開し、スライドXMLファイル（`ppt/slides/slide*.xml`）を走査する。
2. 数式トークンプレースホルダを検出し、対応するOffice MathML（`<a14:m><m:oMathPara><m:oMath>...`）構造に置換する。
3. アーカイブを再圧縮して保存する。

#### 2.3.2.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| アーカイブ破損時 | `ERR-SYS-999` | 例外を通知し処理を中断する |

## 2.4 PRG-THM-001 ビジネステーマスタイル
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.4 MOD-THM-001 ビジネステーマスタイル|MOD-THM-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `themes/business-slide-theme.css` |
| 所属モジュール | `MOD-THM-001` |

### 2.4.1 スタイル定義仕様
#### 2.4.1.1 CSS変数およびカスケード構造
1. 基底テーマカラーは `--primary-color: var(--theme-color, #1f497d)` を定義する。
2. 会話吹き出し背景は `color-mix(in srgb, var(--primary-color) 40%, white)` を定義する。
3. 表紙バナーはマスクレスベクターSVGをData URIとして定義する。

#### 2.4.1.2 見出しアンカー駆動の配置ルール
1. スライド内見出し要素（`h1` から `h6`）は `visibility: hidden` で非表示化する。
2. 見出し直後の要素（`h1 ~ p`, `h2 ~ p`）を絶対配置によりタイトルおよび主張欄として描画する。

#### 2.4.1.3 PDF互換性保護仕様
1. スライド全面グラデーション背景を廃止し、単色白背景およびボックスシャドウによる下部帯描画を適用する。
2. TrueTypeフォント優先指定および合成太字抑止（`font-synthesis: none`）によりType3フォントの発生を抑止する。
3. 印刷メディア（`@media print`）において作業用DOMおよびツールチップを非表示化し、不要な白紙ページの出力を抑止する。

## 2.5 PRG-SKL-001 GitHub運用支援スキル
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.6 MOD-SKL-001 GitHub運用支援スキル体系|MOD-SKL-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `.agents/skills/github-workflows/SKILL.md` |
| 所属モジュール | `MOD-SKL-001` |

### 2.5.1 スキル処理手順仕様
#### 2.5.1.1 ブランチ命名検証論理
1. `git branch --show-current` を実行して現在のブランチ名を取得する。
2. 正規表現 `^(feat|fix|docs|refactor|test|chore)/[^/]+/issue-\d+/[a-z0-9-]+$` への適合性を検証する。
3. 不一致が検知された場合、Issue番号および作業種別から規約準拠ブランチ名を導出し、`git branch -m` で是正する。

#### 2.5.1.2 Issueドラフト生成論理
1. 機能要望ドラフト作成時、利用者ペルソナ（Who）と背景課題（Why）を個別構造で整理する。
2. 提案仕様（What）および検討済み代替案（Alternative）を記述する。

## 2.6 PRG-DOC-001 設計図書構文検査器
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.7 MOD-DOC-001 設計図書規約・構文検査モジュール|MOD-DOC-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `.agents/skills/ipa-traceability-validator/scripts/verify_doc_syntax.py` |
| 所属モジュール | `MOD-DOC-001` |

### 2.6.1 FN-DOC-001 verifyDocSyntax
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.6 PRG-DOC-001 設計図書構文検査器|PRG-DOC-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.6.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-DOC-001-IN01` | 検査対象パス | 走査対象ディレクトリまたはファイルパス | 任意 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.6.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-DOC-001-OUT01` | 終了コード | 検査成否を示す数値（違反0件時0、違反時1） | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.6.1.3 処理論理
1. 指定パス配下の対象Markdownファイルを走査する。
2. 各ファイルに対してFrontmatter、見出し番号体系、第1章固定構造、ID一意性と所有権、Obsidianリンク、禁止語、ホスト絶対パスの7系統を検査する。
3. 違反を検出した場合はファイル名、行番号、エラーコード、詳細理由を出力する。
4. 全ファイルの検査完了後、結果集計を出力し終了コードを返却する。

#### 2.6.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 入力パス不在 | `ERR-NOT-001` | 終了コード2で終了する |
| ファイル読込不可 | `ERR-SYS-001` | 終了コード2で終了する |

## 2.7 PRG-AUT-001 自律開発オーケストレーター
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.8 MOD-AUT-001 24H365D自律開発統制・レポーティングモジュール|MOD-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `scripts/autonomous_dev_loop.py` |
| 所属モジュール | `MOD-AUT-001` |

### 2.7.1 FN-AUT-001 selectNextPriorityIssue
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.7 PRG-AUT-001 自律開発オーケストレーター|PRG-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.7.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-001-IN01` | Issue候補配列 | 未対応Issueおよび優先度ラベル・依存関係情報の配列 | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.7.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-001-OUT01` | 最優先Issue情報 | 選定されたIssue番号、規約準拠ブランチ名、優先度スコア | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.7.1.3 処理論理
1. 入力された未対応Issue配列から、未完了の別Issueによってブロックされている（`blocked_by` が空でない）項目を除外する。
2. メンテナー指示による優先度オーバーライドが存在する場合は最優先スコアを付与する。
3. ラベル優先度（`priority:high` > `bugfix` > `feature` > `enhancement`）およびIssue番号昇順でソートする。
4. 先頭のIssueを選定し、`{type}/antigravity-2.0/issue-{number}/{slug}` 形式の規約準拠ブランチ名を導出して返却する。

#### 2.7.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 着手可能なIssueが0件 | `ERR-NOT-002` | 着手可能タスクなしとして空結果を返し正常待機する |

### 2.7.2 FN-AUT-002 evaluateStageAToBGate
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.7 PRG-AUT-001 自律開発オーケストレーター|PRG-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.7.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-002-IN01` | PBIファイルパス | 審査対象のPBIドラフトパス | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |
| `FN-AUT-002-IN02` | エージェント識別子ペア | 起票エージェントIDおよび審査エージェントID | 必須 | [[06_data_structure_specification#2.8 DAT-TYP-008 StageGateReviewResult|DAT-TYP-008]] |

#### 2.7.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-002-OUT01` | ゲート審査結果 | 判定結果（`PASS` / `REJECT` / `ESCALATE`）と違反リスト | 必須 | [[06_data_structure_specification#2.8 DAT-TYP-008 StageGateReviewResult|DAT-TYP-008]] |

#### 2.7.2.3 処理論理
1. 起票エージェントID（`drafter_agent_id`）と審査エージェントID（`reviewer_agent_id`）を比較し、同一または空である場合は自己承認違反として直ちに `REJECT`（`ERR-VAL-005`）を返す。
2. PBIファイルのYAML Frontmatter必須キーおよび5章構造（`### 2.1 やること (In Scope)`, `### 2.2 やらないこと (Out of Scope)` 含む）を検査する。
3. 受け入れ基準（AC）がすべて `Given` / `When` / `Then` を含み、かつ禁止曖昧語を含まないことを検査する。
4. 個人実名、ホスト絶対パス、およびハングル文字コード（`U+AC00`〜`U+D7A3`）の混入がないことを検査する。
5. 未解決の仮定マーカー（`【仮定: ASM-`）が残存しメンテナー未承認の場合は `ESCALATE`、構文・AC違反がある場合は `REJECT`、全基準適合時は `PASS` を返す。

#### 2.7.2.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 同一エージェントによる自己審査 | `ERR-VAL-005` | 審査結果を `REJECT` としStage Bへの移行を遮断する |

### 2.7.3 FN-AUT-003 applyMaintainerFeedback
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.7 PRG-AUT-001 自律開発オーケストレーター|PRG-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.7.3.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-003-IN01` | 日報またはコメント文字列 | メンテナー指示コメントを含むテキスト | 必須 | [[05_file_format_specification#2.6 DAT-FIL-006 AutonomousReportMarkdownFile|DAT-FIL-006]] |

#### 2.7.3.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-003-OUT01` | 反映済み状態辞書 | 承認済みID、差し戻しID、優先度リストを持つ状態オブジェクト | 必須 | [[06_data_structure_specification#2 データ構造|データ構造]] |

#### 2.7.3.3 処理論理
1. 入力テキストから `[APPROVE: <ID>]`、`[REJECT: <ID>]`、`[PRIORITY: <Issueリスト>]` ディレクティブを正規表現で抽出する。
2. 抽出した承認・差し戻し・優先度変更を状態管理データへマージし、永続化して返却する。

#### 2.7.3.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 不正フォーマットのタグ | `ERR-VAL-001` | 無効タグをスキップし既存状態を維持する |

## 2.8 PRG-AUT-002 日報・週報テンプレート生成ツール
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.8 MOD-AUT-001 24H365D自律開発統制・レポーティングモジュール|MOD-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `scripts/generate_reports.py` |
| 所属モジュール | `MOD-AUT-001` |

### 2.8.1 FN-AUT-004 generateDailyAndWeeklyReports
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.8 PRG-AUT-002 日報・週報テンプレート生成ツール|PRG-AUT-002]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.8.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-004-IN01` | スケジュール・実行日時パラメータ | 実行モード（日報3回枠：`07:30`, `11:50`, `18:00` / 週報枠：水曜 `16:00`） | 必須 | [[06_data_structure_specification#2.9 DAT-TYP-009 ReportScheduleConfig|DAT-TYP-009]] |

#### 2.8.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-004-OUT01` | 生成ファイルパス配列 | 出力された日報および週報のファイルパスリスト | 必須 | [[05_file_format_specification#2.6 DAT-FIL-006 AutonomousReportMarkdownFile|DAT-FIL-006]] |

#### 2.8.1.3 処理論理
1. 設定ファイル（`scripts/autonomous_config.json`）から日報スケジュール（`07:30`, `11:50`, `18:00` JST）および週報スケジュール（`WED` `16:00` JST）を読み込む。
2. 日報生成時は正本テンプレート `docs/templates/tpl_96_daily_report.md` を読み込み、バックログ状態・Stage A→B独立審査結果・品質ゲート実測値・エスカレーション事項を埋め込んで `docs/reports/daily/YYYY-MM-DD_{morning|midday|evening}.md` に出力する。
3. 指定日時が水曜日 `16:00`（または明示的な週報生成指定時）の場合は、日報に加えて正本テンプレート `docs/templates/tpl_97_weekly_report.md` を読み込み、プロジェクトとりまとめ（上司層）向けに「課題または先週からの宿題」「実施した解決策」「結果・定量的効果」「新たな宿題事項と完了期限」「上位マネジメントへの相談・エスカレーション事項」を構造化して `docs/reports/weekly/YYYY-Wnn_weekly_report.md` に出力する。

#### 2.8.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 正本テンプレート不在 | `ERR-NOT-002` | エラーメッセージを出力し終了コード1で終了する |

## 2.9 PRG-AUT-003 常駐Pythonオーケストレーターデーモン
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[01_software_structure_design#2.8 MOD-AUT-001 24H365D自律開発統制・レポーティングモジュール|MOD-AUT-001]] |
| 状態 | Approved |
| 後継ID | なし |
| 実装ファイル | `scripts/autonomous_daemon.py` |
| 所属モジュール | `MOD-AUT-001` |

### 2.9.1 FN-AUT-005 checkAndEmitScheduledReports
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.9 PRG-AUT-003 常駐Pythonオーケストレーターデーモン|PRG-AUT-003]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.9.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-005-IN01` | 基準日時・状態データ | JST現在日時、リポジトリルート、および発行済みスロット記録を持つ状態辞書 | 必須 | [[06_data_structure_specification#2.11 DAT-TYP-011 DaemonStateConfig|DAT-TYP-011]] |

#### 2.9.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-005-OUT01` | 生成レポート結果 | 当該チェックで新規生成されたレポートファイル一覧および更新後の発行済み記録 | 必須 | [[05_file_format_specification#2.6 DAT-FIL-006 AutonomousReportMarkdownFile|DAT-FIL-006]] |

#### 2.9.1.3 処理論理
1. JST現在時刻（`HH:MM`）および日付（`YYYY-MM-DD`）・曜日を取得する。
2. 設定ファイルの日報スケジュール（`07:30`, `11:50`, `18:00`）および週報スケジュール（水曜 `16:00`）と照合し、到達している対象スロットを特定する。
3. 状態辞書の `emitted_reports` を確認し、当該日付・スロットが未発行である場合のみ `generate_daily_and_weekly_reports` を呼び出してレポートを出力する。
4. 発行完了したスロット識別子を `emitted_reports` に記録し、同一スロットの重複生成を防止する。

#### 2.9.1.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| レポートテンプレート不在 | `ERR-NOT-002` | エラーをログ記録しデーモンループを停止せず次処理へ進む |

### 2.9.2 FN-AUT-006 executeStatelessWorkerStage
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.9 PRG-AUT-003 常駐Pythonオーケストレーターデーモン|PRG-AUT-003]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.9.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-006-IN01` | 工程・ワーカー実行設定 | 実行対象工程（`stage_a` / `review_gate` / `stage_b`）、対象Issue情報、およびエージェントロールID | 必須 | [[06_data_structure_specification#2.11 DAT-TYP-011 DaemonStateConfig|DAT-TYP-011]] |

#### 2.9.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-006-OUT01` | ワーカー実行結果 | 独立ワーカーセッションの終了コード、生成PBIパス、および標準出力ログ | 必須 | [[06_data_structure_specification#2.11 DAT-TYP-011 DaemonStateConfig|DAT-TYP-011]] |

#### 2.9.2.3 処理論理
1. 対象工程（`stage_a` 起票、`review_gate` 独立審査、`stage_b` 実装）に対応するプロンプトおよびコマンドテンプレートを構築する。
2. 新規サブプロセス（`agy` CLI / SDK または設定済みワーカーコマンド）を独立セッションとして起動し、完了まで待機する。
3. 工程完了後にサブプロセスを終了させてコンテキストを完全に破棄し、実行結果（終了コード・出力パス）を返却する。

#### 2.9.2.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| ワーカープロセス異常終了またはタイムアウト | `ERR-SYS-999` | 失敗ステータスとエラーログを返却し呼び出し元でリトライまたは保留遷移を行う |

### 2.9.3 FN-AUT-007 runMasterOrchestratorDaemon
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | [[#2.9 PRG-AUT-003 常駐Pythonオーケストレーターデーモン|PRG-AUT-003]] |
| 状態 | Approved |
| 後継ID | なし |

#### 2.9.3.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-007-IN01` | デーモン実行オプション | リポジトリルート、Issueリスト、状態ファイルパス、最大反復回数、およびスリープ間隔 | 必須 | [[06_data_structure_specification#2.11 DAT-TYP-011 DaemonStateConfig|DAT-TYP-011]] |

#### 2.9.3.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `FN-AUT-007-OUT01` | デーモン稼働結果辞書 | 総サイクル数、完了Issue番号リスト、保留Issue番号リスト、発行レポート配列、および生成PRドラフト配列 | 必須 | [[06_data_structure_specification#2.11 DAT-TYP-011 DaemonStateConfig|DAT-TYP-011]] |

#### 2.9.3.3 処理論理
1. `SIGINT` および `SIGTERM` シグナルハンドラを登録し、常駐ループ（`while not stop_requested`）を開始する。
2. `checkAndEmitScheduledReports`（`FN-AUT-005`）を実行し、定時レポート（日報3回・水曜週報）の到達スロットがあれば即時生成する。
3. `docs/reports/daily/` 配下の日報ファイルを走査し、`apply_maintainer_feedback`（`FN-AUT-003`）によりメンテナーの非同期指示タグを状態データへ反映する。
4. `--issues-json` が未指定の場合は GitHub REST API（`/repos/{owner}/{repo}/issues?state=open`）を自動照会して Open Issue 一覧を取得し（Pull Request を除外し本文から依存関係を抽出）、同時並行Issue上限（デフォルト `max_concurrent_issues = 1`）を確認した上で、完了済み（`completed_issues`）およびエスカレーション保留中（`escalated_issues`）を除いた未対応Issueから `select_next_priority_issue`（`FN-AUT-001`）で最優先Issueを1件選定する。
5. 最優先Issueに対して `executeStatelessWorkerStage`（`FN-AUT-006`）で Stage A ワーカーを起動し、続けて起票者（`ROLE-PM`）とは異なる独立審査者（`ROLE-ARCH`）で `evaluate_stage_a_to_b_gate`（`FN-AUT-002`）を実行する。
6. 審査結果が `REJECT` の場合は最大リトライ回数（2回）まで Stage A を再実行し、超過時または `ESCALATE` 時は当該Issueを `escalated_issues` に記録して次サイクルで別Issueへ自動遷移する。
7. 審査結果が `PASS` の場合は Stage B ワーカーを新規セッションで起動し、完了後に DoD 検証（ビルド・テスト・`verify_rtm.py`）および `verify_github_identity_gate` を実行する。
8. DoD 合格時は `.github/pull_request_template.md` 準拠のPRドラフトを生成して当該Issueを `completed_issues` に記録し、停止せず次の未対応Issueのサイクルへ遷移する。

#### 2.9.3.4 異常系
| 条件 | エラーコード | 動作 |
| :--- | :--- | :--- |
| 同一エージェントによる自己審査またはアカウント不一致 | `ERR-VAL-005` | Stage B移行またはPR発行を遮断し保留リストへ記録して次Issueへ進む |
| DoD検証失敗 | `ERR-SYS-999` | PR発行を行わず失敗理由を状態ファイルに記録して次Issueへ進む |
