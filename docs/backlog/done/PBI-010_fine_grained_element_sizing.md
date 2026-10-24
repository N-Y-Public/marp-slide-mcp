---
pbi_id: "PBI-010"
title: "スライド内要素（本文・表・Mermaid図・画像・コード）のサイズ調整クラス10段階細粒度化と統一数字命名体系の導入"
type: "feature" # feature | enhancement | bugfix
status: "done" # todo | designing | implementing | testing | done
priority: "high" # high | medium | low
related_req_ids: ["REQ-F-002", "REQ-FNC-002", "REQ-FNC-003"]
related_mod_ids: ["MOD-002"]
related_test_ids: ["TEST-ST-006"]
---

# [PBI-010] スライド内要素（本文・表・Mermaid図・画像・コード）のサイズ調整クラス10段階細粒度化と統一数字命名体系の導入

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** Marpスライドの作成者（コンサルタント、エンジニア、発表者）
- **〜したい (I want to):** 本文、表、Mermaid図、画像、コードブロック等のスライド内要素に対して、全要素共通の数字クラス（例: `{要素名}-1`〜`10`）を指定し、10段階の滑らかな刻み幅（従来の最小値よりもさらに2段階小さい極小サイズまで含む）でサイズ・縮小率を手動微調整できるようにしたい。
- **なぜなら (So that):** 
  - 現状のサイズ指定クラス（表: `.table-sm`/`.table-xs` 等のTシャツサイズ、本文: `.dense`/`.denser` 等の英単語、Mermaid: `.mermaid-sm`/`.mermaid-xs` のみ、画像: 手動クラスなし）は要素ごとに命名体系が異なり覚える認知的負荷が高い。
  - また、リサイズ段階の刻みが荒いため（表が少しはみ出るので1段階小さくすると小さくなりすぎる、Mermaidが2段階しかない等）、スライドのコンテンツ量に合わせた美しく読みやすいレイアウト調整が困難であったため。
  - さらに、情報量の非常に多いスライドでも収め切れるよう、従来の最小限界よりもさらに2段階小さいサイズ（極小サイズ）を要求されるケースがあるため。

## 2. スコープと仕様概要 (What)
### やること (In Scope)
1. **全主要要素に対する統一数字クラス命名体系（10段階）の導入 (`themes/business-slide-theme.css`)**:
   - タイトルクラス（`title-1`〜`3`, `claim-1`〜`8`, `fig-1`〜`3`）と規則を統一した `{要素名}-{1〜10}` の統一ナンバリング体系を定義する。
   - `1` を最大（標準・余裕）、数字が増えるほど縮小し、`10` を従来の最小限界よりもさらに2段階小さい極小サイズとする。
   - **表（Table）**: `table-1` 〜 `table-10`
     - 1〜8: 26pt 〜 8pt（旧 xxs 相当）
     - 9: 7pt（従来の最小 8pt より1段階小さい）
     - 10: 6pt（従来の最小 8pt よりさらに2段階小さい）
   - **本文テキスト（Text / Body）**: `text-1` 〜 `text-10`（エイリアス: `body-1` 〜 `body-10`）
     - 1〜8: scale 1.0 〜 0.50（旧 densest 相当）
     - 9: scale 0.42（従来の最小 0.50 より1段階小さい）
     - 10: scale 0.35（従来の最小 0.50 よりさらに2段階小さい）
   - **Mermaid図（Mermaid）**: `mermaid-1` 〜 `mermaid-10`
     - 1〜7: 100% 〜 55%（旧 mermaid-xs 相当）
     - 8: 48%
     - 9: 38%（従来の最小 55% より1段階小さい）
     - 10: 28%（従来の最小 55% よりさらに2段階小さい）
   - **画像（Image / Img）**: `img-1` 〜 `img-10`（エイリアス: `image-1` 〜 `image-10`）
     - 1〜8: 100% 〜 35%
     - 9: 28%
     - 10: 20%
   - **コードブロック（Code）**: `code-1` 〜 `code-10`
     - 1〜8: 18pt 〜 7pt（旧 xxs 相当）
     - 9: 6pt（従来の最小 7pt より1段階小さい）
     - 10: 5pt（従来の最小 7pt よりさらに2段階小さい）
2. **既存クラスとの後方互換性（エイリアス）の完全維持**:
   - 既存の `table-xl`, `table-lg`, `table-md`, `table-sm`, `table-xs`, `table-xxs`
   - 既存の `roomy`, `dense`, `denser`, `densest`
   - 既存の `mermaid-sm`, `mermaid-xs`
   - 既存の `code-lg`, `code-sm`, `code-xs`, `code-xxs`
   - これらを新しい数字体系の対応する段階へマッピング（または維持）し、既存スライドの表示崩れを防ぐ。
3. **MCPサーバー・ドキュメント・プロンプトの更新**:
   - `src/index.ts` の `NormalSlideSchema` における `classes` 説明文を更新。
   - `prompts/mcp_slide_generator.md`、IPA設計書（`docs/01_requirements/`, `docs/02_basic_design/`, `docs/03_detail_design/`）の記述を更新。
4. **自動検証テストの追加 (`TEST-ST-006`)**:
   - Docker環境で実行可能な回帰・表示検証スクリプトを作成し、各数字クラス（1〜10）が正しく要素のスタイル（フォントサイズや高さ）に反映され、10が旧最小値より2段階小さくなっていることを機械検証する。

### やらないこと (Out of Scope)
- タイトルや主張（`title-1`〜`3`, `claim-1`〜`8`）自体の既存の動作仕様の変更。
- スライドの2段組（`columns-2`）や画像並列（`images-2`等）などのマクロな構造レイアウト枠組みの変更。

## 3. 受け入れ基準 (Acceptance Criteria)
> テスト仕様書（`TEST-ST-006`）の直接のインプットとなる条件をGiven-When-Then形式で記述する。
- [x] **AC-1:** Given スライドに表が含まれている場合、When `<!-- _class: table-1 -->` から `<!-- _class: table-10 -->` までの各クラスを適用したとき、Then 表のフォントサイズが段階的（26pt〜6pt）に滑らかに縮小適用され、`table-10` は従来の最小値 `table-xxs` (8pt) より2段階小さい 6pt であること。
- [x] **AC-2:** Given スライドに本文テキストが含まれている場合、When `<!-- _class: text-1 -->`（または `body-1`）から `text-10`（`body-10`）を適用したとき、Then 本文フォントサイズ（`--txt-scale`）が 1.0 から 0.35 まで段階的に滑らかに縮小適用され、`text-10` は従来の最小値 `densest` (0.50) より2段階小さい 0.35 であること。
- [x] **AC-3:** Given スライドにMermaidダイアグラムが含まれている場合、When `<!-- _class: mermaid-1 -->` から `<!-- _class: mermaid-10 -->` を適用したとき、Then Mermaid図の最大高さが 100% から段階的に滑らかに縮小適用され、`mermaid-10` は従来の最小値 `mermaid-xs` (55%) より2段階小さい 28% であること。
- [x] **AC-4:** Given スライドに単一画像が含まれている場合、When `<!-- _class: img-1 -->`（または `image-1`）から `img-10`（`image-10`）を適用したとき、Then 画像の最大高さが 100% から 20% まで段階的に制限・縮小適用されること。
- [x] **AC-5:** Given スライドにコードブロックが含まれている場合、When `<!-- _class: code-1 -->` から `<!-- _class: code-10 -->` を適用したとき、Then コードフォントサイズが段階的に滑らかに縮小適用され、`code-10` は従来の最小値 `code-xxs` (7pt) より2段階小さい 5pt であること。
- [x] **AC-6:** Given 既存のクラス名（`table-sm`, `table-xs`, `dense`, `mermaid-sm`, `code-sm` 等）が指定されたスライドにおいて、When レンダリングを実行したとき、Then 既存と同等のスタイルが適用され、表示崩れが発生しないこと。
- [x] **AC-7:** Given 1つのスライドに複数の異なる要素（例: 本文と表、または本文とMermaid）が存在する場合、When `<!-- _class: text-4 table-5 -->` のように複数クラスを指定したとき、Then 各要素のスタイルが互いに干渉することなく独立して適用されること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** 
  - `docs/01_requirements/01_requirements_specification.md` (`REQ-F-002`, `REQ-FNC-002`, `REQ-FNC-003`)
  - `docs/02_basic_design/` (`01_functional_specification.md`, `02_external_interface_specification.md`)
  - `docs/03_detail_design/` (`MOD-002` テーマCSS仕様)
  - `prompts/mcp_slide_generator.md`
  - `src/index.ts` (スキーマコメント・型定義説明)
- **DB/外部IF変更の有無:** 外部API/DB変更なし。CSSクラス定義の追加とMCPパラメータ解説文の更新。

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** REQ-F-002, REQ-FNC-002, REQ-FNC-003
- **追加・更新した設計書/モジュールID:** MOD-002
- **追加・更新したテストID:** TEST-ST-006
- **検証実績 (実測値):**
  - AC-1 (表): `table-1`=18.67px(26pt) > `table-5`=18.00px(13.5pt) > `table-8`=10.67px(8pt) > `table-10`=8.00px(6pt ≦ 8.5px) (PASS)
  - AC-2 (本文): `text-1`=24.00px(scale 1.0) > `text-4`=18.24px(0.76) > `text-8`=12.00px(0.50) > `text-10`=8.40px(0.35 ≦ 9.0px), `body-3`=20.16px(0.84) (PASS)
  - AC-3 (Mermaid): `mermaid-1`=440.00px(100%) > `mermaid-4`=330.00px(75%) > `mermaid-7`=242.00px(55%) > `mermaid-10`=123.20px(28% ≦ 130px) (PASS)
  - AC-4 (画像): `img-1`=440.00px(100%) > `img-5`=264.00px(60%) > `img-10`=88.00px(20% ≦ 100px), `image-3`=352.00px(80%) (PASS)
  - AC-5 (コード): `code-1`=24.00px(18pt) > `code-5`=14.67px(11pt) > `code-8`=9.33px(7pt) > `code-10`=6.67px(5pt ≦ 7.0px) (PASS)
  - AC-6 (後方互換性): `table-sm`=18.00px, `dense`=18.24px, `code-sm`=14.67px, `mermaid-xs`=242.00px (PASS)
  - AC-7 (複合指定): `text-4 table-5` 複合スライドにおいて 本文=18.24px (`text-4` 一致), 表=13.68px (`table-5` 18px × 0.76 一致) (PASS) 
