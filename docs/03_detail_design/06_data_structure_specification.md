---
id: DOC-DD-006
title: データ構造仕様書
doc_type: detail_design
version: 1.0.0
status: Approved
date: 2026-11-04
author: N-Y-Public
doc_standard: DOC-GOV-003@1.0.0
tags:
  - detail-design
  - data-structure
  - types
---

# 1 本書の位置づけ

## 1.1 目的
「marp-slide-mcp」で使用される共通データ構造、変数、およびTypeScript型定義の形式仕様を定める。

## 1.2 記述対象
記述対象は [[03_documentation_standard#2.1 図書一覧|図書一覧]] の本書の行に従う。

## 1.3 記述対象外と参照先
- 入出力の意味・意図: [[03_external_interface_specification#1 本書の位置づけ|外部I/F仕様書]]、[[02_internal_interface_specification#1 本書の位置づけ|内部I/F仕様書]]
- ファイル構文形式: [[05_file_format_specification#1 本書の位置づけ|ファイル形式仕様書]]

## 1.4 改版履歴
| 版 | 日付 | 起因PBI | 変更概要 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-11-04 | PBI-016 | 初版作成（意味仕様と形式仕様の分離） |

# 2 データ構造

## 2.1 DAT-TYP-001 SlideDeck
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.1.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-001-F01` | ファイル識別子 | `filenamePrefix` | `string` | 1〜100 | `^[A-Za-z0-9_-]+$` | `DOC-YYYYMMDD-UUID` | 任意 |
| `DAT-TYP-001-F02` | スライドサイズ | `size` | `string` | 3〜4 | `'4:3'` または `'16:9'` | `'4:3'` | 任意 |
| `DAT-TYP-001-F03` | プライマリカラー | `themeColor` | `string` | 7 | `^#[0-9a-fA-F]{6}$` | `'#1f497d'` | 任意 |
| `DAT-TYP-001-F04` | ロゴ画像パス | `logoPath` | `string` | 1〜255 | 相対パス | なし | 任意 |
| `DAT-TYP-001-F05` | 表紙バナー画像 | `banner` | `string` | 1〜255 | `'none'` またはパス | なし | 任意 |
| `DAT-TYP-001-F06` | 表紙スライド | `titleSlide` | `TitleSlide` | 1 | [[#2.2 DAT-TYP-002 TitleSlide|DAT-TYP-002]] | なし | 必須 |
| `DAT-TYP-001-F07` | 通常スライド配列 | `normalSlides` | `NormalSlide[]` | 0〜200 | [[#2.3 DAT-TYP-003 NormalSlide|DAT-TYP-003]] の配列 | `[]` | 必須 |

## 2.2 DAT-TYP-002 TitleSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.2.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-002-F01` | メインタイトル | `mainTitle` | `string` | 1〜100 | 改行可 | なし | 必須 |
| `DAT-TYP-002-F02` | サブタイトル | `subTitle` | `string` | 1〜150 | 改行可 | なし | 必須 |
| `DAT-TYP-002-F03` | 図書番号 | `bookNo` | `string` | 1〜50 | `^[A-Za-z0-9_-]+$` | なし | 必須 |
| `DAT-TYP-002-F04` | 作成者所属 | `author` | `string` | 1〜100 | 個人実名禁止 | なし | 必須 |
| `DAT-TYP-002-F05` | 作成日 | `date` | `string` | 10 | `^\d{4}-\d{2}-\d{2}$` | 現在日 | 任意 |
| `DAT-TYP-002-F06` | コピーライト | `copyright` | `string` | 1〜100 | 単行文字列 | `'© 2026 N-Y-Public'` | 任意 |
| `DAT-TYP-002-F07` | 機密指定表記 | `confidentiality` | `string` | 1〜50 | `'CONFIDENTIAL'` または任意文字列 | `'CONFIDENTIAL'` | 任意 |

## 2.3 DAT-TYP-003 NormalSlide
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.3.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-003-F01` | スライドタイトル | `pageTitle` | `string` | 1〜60 | 単行文字列 | なし | 必須 |
| `DAT-TYP-003-F02` | 主張メッセージ | `claim` | `string` | 0〜250 | 1スライド1メッセージ | なし | 任意 |
| `DAT-TYP-003-F03` | 図表タイトル | `chartTitle` | `string` | 0〜60 | 単行文字列 | なし | 任意 |
| `DAT-TYP-003-F04` | 本文Markdown | `bodyContent` | `string` | 0〜2000 | Markdownテキスト | なし | 任意 |
| `DAT-TYP-003-F05` | 2段組構造 | `twoColumns` | `TwoColumns` | 1 | [[#2.4 DAT-TYP-004 TwoColumns|DAT-TYP-004]] | なし | 任意 |
| `DAT-TYP-003-F06` | 画像並列配列 | `imageGrid` | `ImageGridItem[]` | 2〜4 | [[#2.5 DAT-TYP-005 ImageGridItem|DAT-TYP-005]] の配列 | なし | 任意 |
| `DAT-TYP-003-F07` | 出典・脚注 | `source` | `string` | 0〜100 | 単行文字列 | なし | 任意 |
| `DAT-TYP-003-F08` | スタイルクラス群 | `classes` | `string[]` | 0〜10 | 登録済みクラス名配列 | `[]` | 任意 |

## 2.4 DAT-TYP-004 TwoColumns
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.4.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-004-F01` | 左カラム内容 | `leftContent` | `string` | 1〜1000 | Markdownテキスト | なし | 必須 |
| `DAT-TYP-004-F02` | 右カラム内容 | `rightContent` | `string` | 1〜1000 | Markdownテキスト | なし | 必須 |

## 2.5 DAT-TYP-005 ImageGridItem
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.5.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-005-F01` | 画像パス | `imagePath` | `string` | 1〜255 | ファイル相対パスまたはURL | なし | 必須 |
| `DAT-TYP-005-F02` | キャプション | `caption` | `string` | 0〜100 | 太字キャプション文字列 | なし | 任意 |
| `DAT-TYP-005-F03` | 代替テキスト | `alt` | `string` | 0〜100 | アクセシビリティテキスト | なし | 任意 |

## 2.6 DAT-TYP-006 DeckSettings
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.6.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-006-F01` | スライドサイズ | `size` | `string` | 3〜4 | `'4:3'` または `'16:9'` | なし | 任意 |
| `DAT-TYP-006-F02` | プライマリカラー | `themeColor` | `string` | 7 | `^#[0-9a-fA-F]{6}$` | なし | 任意 |
| `DAT-TYP-006-F03` | ロゴ画像パス | `logoPath` | `string` | 1〜255 | 相対パス | なし | 任意 |
| `DAT-TYP-006-F04` | 表紙バナー画像 | `banner` | `string` | 1〜255 | `'none'` またはパス | なし | 任意 |

## 2.7 DAT-TYP-007 McpToolResponse
| 項目 | 内容 |
| :--- | :--- |
| 上位ID | なし |
| 状態 | Approved |
| 後継ID | なし |
| 実装上の宣言位置 | `src/index.ts` |

### 2.7.1 フィールド
| フィールドID | 論理名 | 物理名 | 型 | 桁・長さ | 値域・書式 | 既定値 | 必須 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DAT-TYP-007-F01` | コンテンツ配列 | `content` | `object[]` | 1〜10 | `{ type: 'text', text: string }` | なし | 必須 |
| `DAT-TYP-007-F02` | エラーフラグ | `isError` | `boolean` | 1 | `true` または `false` | `false` | 任意 |
