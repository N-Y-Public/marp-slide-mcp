---
id: DOC-DD-005
title: ファイル形式仕様書
doc_type: detail_design
version: 1.0.0
status: Approved
date: 2026-11-04
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - detail-design
  - file-format
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」が生成および読み込みを行うファイルの形式、構文、文字コード、および必須キーの仕様を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- 変数・データ構造の内部型定義: [[06_data_structure_specification#1 本書の位置づけ|データ構造仕様書]]
- 外部I/Fの入出力項目: [[03_external_interface_specification#1 本書の位置づけ|外部I/F仕様書]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 初版作成（意味仕様と形式仕様の分離） |

# 2 ファイル形式

## 2.1 DAT-FIL-001 MarpMarkdownFile
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 拡張子 | `.md` |
| 文字コード | UTF-8 |
| 改行コード | LF |
| 構文 | CommonMark / Marp Markdown |

### 2.1.1 キーまたは列
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-FIL-001-F01` | Marp有効化 | `marp` | `boolean` | 4 | `true` | `true` | 必須 |
| `DAT-FIL-001-F02` | テーマ名 | `theme` | `string` | 1〜50 | `'business-slide'` | `'business-slide'` | 必須 |
| `DAT-FIL-001-F03` | ページ番号 | `paginate` | `boolean` | 4 | `true` | `true` | 必須 |
| `DAT-FIL-001-F04` | サイズ比率 | `size` | `string` | 3〜4 | `'4:3'` または `'16:9'` | `'4:3'` | 必須 |
| `DAT-FIL-001-F05` | ヘッダー | `header` | `string` | 0〜255 | 画像またはテキスト記法 | なし | 任意 |

### 2.1.2 記述例
```markdown
---
marp: true
theme: business-slide
paginate: true
size: 4:3
---

# メインタイトル
## サブタイトル
### DOC-20261104-001
### 所属・作成者名
#### 2026-11-04
```

## 2.2 DAT-FIL-002 PdfOutputFile
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 拡張子 | `.pdf` |
| 文字コード | バイナリ |
| 改行コード | LF |
| 構文 | PDF 1.4〜1.7 仕様準拠 |

### 2.2.1 キーまたは列
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-FIL-002-F01` | フォント埋め込み | `Font` | `string` | — | TrueType CIDFontType2 | なし | 必須 |
| `DAT-FIL-002-F02` | 背景色指定 | `Background` | `string` | — | 単色DeviceRGB（#ffffff） | なし | 必須 |

### 2.2.2 記述例
バイナリ形式のため記述例は省略する。

## 2.3 DAT-FIL-003 PptxOutputFile
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 拡張子 | `.pptx` |
| 文字コード | バイナリ (ZIP圧縮XML) |
| 改行コード | CRLF / LF |
| 構文 | ECMA-376 OpenXML 仕様準拠 |

### 2.3.1 キーまたは列
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-FIL-003-F01` | スライドXML | `slide*.xml` | `XML` | — | オブジェクト別シェイプ要素 | なし | 必須 |

### 2.3.2 記述例
バイナリ形式のため記述例は省略する。

## 2.4 DAT-FIL-004 McpConfigFile
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 拡張子 | `.json` |
| 文字コード | UTF-8 |
| 改行コード | LF |
| 構文 | JSON |

### 2.4.1 キーまたは列
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-FIL-004-F01` | MCPサーバー定義 | `mcpServers` | `object` | — | サーバー名キーの辞書 | なし | 必須 |
| `DAT-FIL-004-F02` | コマンド | `command` | `string` | 1〜255 | 実行可能コマンド文字列 | なし | 必須 |
| `DAT-FIL-004-F03` | コマンド引数 | `args` | `string[]` | 0〜20 | 文字列配列 | なし | 必須 |

### 2.4.2 記述例
```json
{
  "mcpServers": {
    "marp-slide-mcp": {
      "command": "node",
      "args": ["build/index.js"]
    }
  }
}
```
