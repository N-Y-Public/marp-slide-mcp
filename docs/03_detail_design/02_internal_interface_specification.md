---
id: DOC-DD-002
title: 内部I/F仕様書
doc_type: detail_design
version: 1.1.0
status: Approved
date: 2026-11-04
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - detail-design
  - internal-interface
  - typescript
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」の各モジュール内部で呼び出される関数やメソッドのインターフェース仕様を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- モジュール間の物理構造と依存関係: [[01_software_structure_design#1 本書の位置づけ|ソフトウェア構造設計書]]
- 各関数の処理ロジック詳細: [[03_program_specification#1 本書の位置づけ|プログラム仕様書]]
- データ構造の型定義: [[06_data_structure_specification#1 本書の位置づけ|データ構造仕様書]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 規約 DOC-GOV-003 準拠への再編および意味／形式仕様の分離 |
| 1.1.0 | 2026-11-04 | PBI-014 | PPTX変換およびOffice MathML数式注入I/F（INT-PPT-002）の追加 |

# 2 内部インターフェース

## 2.1 INT-SRV-001 resolveSlideContent
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-SRV-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 通常スライドデータからレイアウトクラスの補完とMarkdown本文の結合を行う |
| 提供元 | `MOD-SRV-001` (`src/index.ts`) |
| 利用元 | `MOD-SRV-001` |

### 2.1.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-001-IN01` | スライドデータ | 通常スライド構造化データ | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] |

### 2.1.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-001-OUT01` | 解決後コンテンツ | 本文文字列とクラス配列 | 必須 | [[06_data_structure_specification#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003-F04]] |

### 2.1.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| スライドスキーマ検証違反時 | `ERR-VAL-001` |

## 2.2 INT-SRV-002 generateMarpMarkdown
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-SRV-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | スライドデッキ全体から完全なMarp Markdownテキストを生成する |
| 提供元 | `MOD-SRV-001` (`src/index.ts`) |
| 利用元 | `MOD-SRV-001` |

### 2.2.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-002-IN01` | デッキデータ | デッキ全体の構造化データ | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

### 2.2.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-002-OUT01` | Markdownテキスト | 生成されたMarp Markdown文字列 | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |

### 2.2.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| スキーマ検証違反時 | `ERR-VAL-001` |

## 2.3 INT-SRV-003 parseMarpMarkdown
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-SRV-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 既存Markdownテキストからフロントマターとスライド生要素を抽出する |
| 提供元 | `MOD-SRV-001` (`src/index.ts`) |
| 利用元 | `MOD-SRV-001` |

### 2.3.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-003-IN01` | Markdown入力 | 解析対象Markdown文字列 | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |

### 2.3.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-SRV-003-OUT01` | パース結果 | フロントマター辞書およびスライド配列 | 必須 | [[06_data_structure_specification#2.1 DAT-TYP-001 SlideDeck|DAT-TYP-001]] |

### 2.3.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| フロントマター構文解析失敗時 | `ERR-VAL-001` |

## 2.4 INT-ENG-001 marpEnginePlugin
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-ENG-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | Marp Coreインスタンスに対して目次自動生成プラグインを登録する |
| 提供元 | `MOD-ENG-001` (`marp.config.js`) |
| 利用元 | Marp CLI |

### 2.4.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-ENG-001-IN01` | エンジンオプション | Marp Core生成オプション | 必須 | なし |

### 2.4.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-ENG-001-OUT01` | カスタムMarp | プラグイン登録済みMarpインスタンス | 必須 | なし |

### 2.4.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| プラグイン初期化例外時 | `ERR-SYS-999` |

## 2.5 INT-PPT-001 domStyleExtraction
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-PPT-001` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | Puppeteerブラウザコンテキスト内でDOM座標とスタイルを計測・抽出する |
| 提供元 | `MOD-PPT-001` (`pptx_converter/convert.js`) |
| 利用元 | `MOD-PPT-001` |

### 2.5.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-PPT-001-IN01` | 中間HTMLパス | 描画対象一時HTMLパス | 必須 | [[05_file_format_specification#2.1 DAT-FIL-001 MarpMarkdownFile|DAT-FIL-001]] |

### 2.5.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-PPT-001-OUT01` | 計測済みノード配列 | DOM矩形と計算済みスタイルオブジェクト配列 | 必須 | なし |

### 2.5.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| ブラウザプロセス起動失敗時 | `ERR-ENV-004` |

## 2.6 INT-PPT-002 injectOfficeMath
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | `MOD-PPT-002` |
| 状態 | Approved |
| 後継ID | なし |
| 目的 | 生成されたPPTXアーカイブ内のDrawingML数式プレースホルダをOffice MathMLへ置換・注入する |
| 提供元 | `MOD-PPT-002` (`pptx_converter/omml.js`) |
| 利用元 | `MOD-PPT-001` (`pptx_converter/convert.js`) |

### 2.6.1 入力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-PPT-002-IN01` | PPTXパス | 変換対象PPTXファイルパス | 必須 | なし |
| `INT-PPT-002-IN02` | 数式辞書 | プレースホルダとMathML/LaTeX対応辞書 | 必須 | なし |

### 2.6.2 出力項目
| 項目ID | 名称 | 意味・意図 | 必須 | 形式参照 |
| :--- | :--- | :--- | :--- | :--- |
| `INT-PPT-002-OUT01` | 処理結果 | 数式注入完了真偽値 | 必須 | なし |

### 2.6.3 例外
| 発生条件 | 送出エラーコード |
| :--- | :--- |
| アーカイブ破損・XML不正時 | `ERR-SYS-999` |
