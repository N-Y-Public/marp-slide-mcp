# Theme & Layout Guidelines (`themes/business-slide-theme.css`)

This document details the mechanics, structural mappings, sizing rules, and CSS classes for the Marp corporate consulting theme.

---

## 1. The Heading Anchor Mechanism

In `business-slide-theme.css` (and compatible corporate themes in `themes/`), Markdown headings (`#`, `##`, `###`, `####`, `#####`, `######`) are styled with `display: none` or treated purely as semantic position anchors.

```markdown
<!-- CORRECT -->
# ページタイトル
2026年度 下期事業計画と重点戦略

<!-- INCORRECT (Heading text will not be visible) -->
# 2026年度 下期事業計画と重点戦略
```

Always place the actual title or content on the **line immediately following** the anchor.

---

## 2. Slide Structure Specification

### Title Slide (Page 1)

Only page 1 receives the title slide layout automatically.

```markdown
# タイトル
メインタイトル（推奨: 全角15文字/行 × 2行まで、36pt相当）

## サブタイトル
サブタイトル（推奨: 全角30文字/行 × 2行まで、20pt相当）

### 図書番号
DOC-2026-X123

### 所属・氏名・制作元等
オープンソース推進部 / 担当 太郎

#### 作成日
2026年9月1日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
```

### Content Slides (Page 2 onwards)

```markdown
---
<!-- _class: optional-class-name -->

# ページタイトル
市場トレンドと競合動向の分析

## ページ主張
- 国内市場規模は今後5年間で年平均 12.5% の持続的成長が見込まれる
- 特にSaaS型ソリューションとAI連携機能の需要が全体の7割を牽引している

### 主張補足タイトル
主要セグメント別 市場規模推移予測（2024〜2030年）

#### 本文
- **エンタープライズ領域**
  - 大手製造業を中心にDX投資が加速
  - セキュリティ基準の厳格化に伴いオンプレミスからの移行需要が急増
- **SMB（中堅・中小企業）領域**
  - 導入コスト低減とノーコード化が進展
  - パートナー経由の販売チャネル拡大が普及の鍵

##### 図表出典
出所: 〇〇総研「国内IT市場動向白書2026」

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
```

---

## 3. Aspect Ratio & Dimensions (4:3 vs 16:9)

The theme seamlessly supports both `4:3` and `16:9` ratios via the frontmatter `size` directive:

| Ratio | Frontmatter | Dimensions | Body Effective Area (Normal) | Body Area (`wide-content`) |
| :--- | :--- | :--- | :--- | :--- |
| **4:3** (Default) | `size: 4:3` | 960px × 720px | 880px × 440px | 880px × 550px |
| **16:9** (Widescreen)| `size: 16:9` | 1280px × 720px | 1200px × 440px | 1200px × 550px |

When `size: 16:9` is specified in MCP `generate_slide_deck` or `update_deck_settings`, all grid columns, title bars, banner widths, and font scalings adjust automatically.

---

## 4. CSS Classes Quick Reference

Slide-level classes can be applied via the `classes` array in MCP payloads (or `<!-- _class: ... -->` in Markdown):

### Layout Classes
- **`wide-content`**: Expands the body area to fill the space usually occupied by the claim band (height expanded to ~550px). Use for large diagrams, wide tables, or rich dashboards where a separate claim band is unnecessary.
- **`columns-2`**: Activates a 2-column layout. When using MCP `twoColumns`, this class and markdown indentation are applied automatically.
- **`images-2` / `images-3` / `images-4`**: Multi-column image grids with aspect ratio preservation and centered captions. When using MCP `imageGrid`, this is applied automatically.
- **`conversation-content`**: Renders unordered list items as styled chat bubble cards (ideal for customer interview quotes or persona dialogues).
- **`toc`**: Formats 2-level nested bullet lists as a clean multi-column Table of Contents.

### Size Adjustment Classes (Automatic & Manual Override)
- **Tables**: `table-sm`, `table-md`, `table-lg`
- **Code Blocks**: `code-sm`, `code-md`, `code-lg`
- **Mermaid Diagrams**: `mermaid-sm`, `mermaid-md`, `mermaid-lg`
- **Claim / Message Band**: `claim-1` through `claim-8` (adjusts message font size according to line count)
- **Page Titles**: `title-1`, `title-2`, `title-3` (for multi-line titles)
- **Chart / Figure Titles**: `fig-1`, `fig-2`, `fig-3`

---

## 5. Theme Customization (`:root` variables)

The theme color and banner image can be customized per presentation:

```css
:root {
  /* Primary theme color (affects claim borders, accents, table headers) */
  --primary-color: #1f497d;

  /* Title banner image (Web URL, relative path, Base64 Data URI, or 'none') */
  --banner-image: url('../themes/banner.svg');
}
```

In MCP tools, simply pass `themeColor: "#1f497d"` and `banner: "url(...)"` (or `"none"`).

---

## 6. Theme Discovery & Portability

The repository's core theme resides in `themes/business-slide-theme.css`.

Agents and scripts should determine the active theme dynamically:
1. Inspect the `themes/` directory for the primary `.css` file.
2. In Markdown frontmatter, use `theme: business-slide`.
3. In the `<style>` block, import `@import '../themes/business-slide-theme.css';`.

---

## 7. Standalone Markdown Boilerplate (Direct Authoring)

When generating Markdown directly (e.g. without the MCP server), use this complete boilerplate:

```markdown
---
marp: true
theme: business-slide
size: 16:9
paginate: true
header: '![](../slides/N-Y-Public_Logo.jpg)'
---

<style>
@import '../themes/business-slide-theme.css';

:root {
  --primary-color: #1f497d;
}
</style>

<script defer src="../themes/vendor/mermaid.min.js"></script>
<script defer src="../themes/vendor/marp-mermaid-loader.js"></script>

# タイトル
プレゼンテーション タイトル

## サブタイトル
サブタイトル・概要

### 図書番号
DOC-2026-001

### 所属・氏名・制作元等
企画推進部 / 担当者

#### 作成日
2026年9月1日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL

---

# ページタイトル
主要な課題と解決アプローチ

## ページ主張
- 業務プロセスの可視化と自動化により、リードタイムを従来の半分に短縮する

### 主張補足タイトル
アプローチの全体概要

#### 本文
- **現状の分析**
  - 各工程で手作業による転記作業が発生
  - データの一元管理が未達
- **解決方針**
  - API連携による自動同期
  - ダッシュボードによるリアルタイムモニタリング

##### 図表出典
社内業務調査レポート2026

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
```
