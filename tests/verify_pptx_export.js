// ファイルシステム同期操作モジュールをインポートします
import fs from 'fs';
// ファイルパス操作モジュールをインポートします
import path from 'path';
// 子プロセス同期実行モジュールをインポートします
import { execFileSync } from 'child_process';
// PPTX（ZIPアーカイブ）展開・検査用のJSZipライブラリをインポートします
import JSZip from 'jszip';
// ビルド済みMCPサーバーインスタンスをインポートします
import { server } from '../build/index.js';

// 公式ガイドスライドのMarkdownパスを定義します
const OFFICIAL_MD_PATH = path.resolve('slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md');
// 公式ガイドスライドのPPTXパスを定義します
const OFFICIAL_PPTX_PATH = path.resolve('slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pptx');
// ホストOS側でPowerPointがファイルを開いてロックしている場合でも検証できるよう一時出力パスを定義します
const OFFICIAL_VERIFY_PPTX_PATH = path.resolve('slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方_verify_temp.pptx');
// 16:9全機能網羅テスト用の一時Markdownパスを定義します
const TEST_MD_PATH = path.resolve('slides/D01-000001_Marpの使い方/test_pptx_all_features_temp.md');
// 16:9全機能網羅テスト用の一時PPTXパスを定義します
const TEST_PPTX_PATH = path.resolve('slides/D01-000001_Marpの使い方/test_pptx_all_features_temp.pptx');
// 16:9全機能網羅テスト用の中間HTMLパスを定義します
const TEST_TEMP_HTML_PATH = path.resolve('slides/D01-000001_Marpの使い方/test_pptx_all_features_temp_temp.html');

// 16:9比率・全コンポーネント（2段組、画像グリッド、表、コード、会話、Mermaid全図形、数式）網羅のテスト用Markdownを定義します
const testMarkdownContent = `---
marp: true
theme: business-slide
size: 16:9
paginate: true
header: "![](N-Y-Public_Logo.jpg)"
---

<style>
@import '../../themes/business-slide-theme.css';
:root {
  --banner-image: url('banner.svg');
}
</style>

<script defer src="../../themes/vendor/mermaid.min.js"></script>
<script defer src="../../themes/vendor/marp-mermaid-loader.js"></script>

# タイトル
PPTXネイティブ変換・全要素検証スライド

## サブタイトル
～16:9比率・数式OMML・Mermaid図形分解・2段組・会話レイアウト統合テスト～

### 図書番号
図書番号：TEST-PPTX-019

### 所属・氏名
品質保証部
自動検証グループ
ROLE-QA

#### 作成日
2026-10-26

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL

---

<!-- _class: toc -->

# 目次

---

<!-- _class: columns-2 -->

# ページタイトル
2段組レイアウト・箇条書き階層・ネイティブ数式（OMML）の検証

## ページ主張
- インライン数式 $E = mc^2$ とブロック数式をPowerPointネイティブ数式（Office MathML）へ変換
  - 2段組カラムと多階層リスト・インライン装飾も個別編集可能なテキストとして配置

### 主張補足タイトル
左右2カラム構成と2次方程式の解の公式・総和記号のネイティブ数式変換

#### 本文
- **左カラム見出し：箇条書きとインライン数式**
  - 第1階層の箇条書きアイテムと **太字装飾** および \`inline_code\`
    - 第2階層のネストされた箇条書きアイテム（インライン数式 $a^2 + b^2 = c^2$ を含む）
  - 番号付きリストの検証:
    1. 手順1：Markdownの記述
    2. 手順2：ネイティブPPTXへの変換

- **右カラム見出し：ブロック数式（分数・平方根・総和）**
  $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
  $$S_n = \\sum_{i=1}^{n} x_i^2$$

##### 図表出典
図表出典：数式・2段組変換テスト仕様

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL

---

<!-- _class: images-3 table-sm code-sm -->

# ページタイトル
画像横並びグリッド・ネイティブ表・シンタックスハイライトコードの検証

## ページ主張
- 複数画像のグリッド配置、セル単位で編集可能な表、色分けを維持したコードブロックを出力

### 主張補足タイトル
画像3枚並列（images-3）・テーブル・コードブロックの複合配置

#### 本文
- ![バナー1](banner.svg)
  **キャプション1**

- ![バナー2](banner.svg)
  **キャプション2**

- ![バナー3](banner.svg)
  **キャプション3**

| コンポーネント | 出力形式 | 編集可否 |
| :--- | :---: | :--- |
| **データテーブル** | \`PptxGenJS addTable\` | セル・罫線とも編集可能 |
| **コードブロック** | 色付きテキストラン | テキスト・フォント編集可能 |

\`\`\`javascript
// サンプルコード
const result = items.map((x) => x * 2);
console.log(result);
\`\`\`

##### 図表出典
図表出典：複合コンポーネント検証仕様

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL

---

<!-- _class: conversation-content -->

# ページタイトル
会話レイアウト（conversation-content）とシルエットアイコンの検証

## ページ主張
- 明示的なアイコン画像とデフォルトの人物シルエットアイコン・吹き出し図形を出力

### 主張補足タイトル
タイムライン対話形式のネイティブ図形・画像変換

#### 本文
- ![質問者](N-Y-Public_Logo.jpg) **質問者** アイコン画像を指定した発言はどのように変換されますか？
- **回答者（シルエット）** アイコン画像を省略した場合でも、CSSのマスク画像から人物シルエットアイコンが自動生成されてPowerPoint上に配置されます！

##### 図表出典
図表出典：会話レイアウト検証仕様

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL

---

<!-- _class: wide-content mermaid-sm -->

# ページタイトル
ワイドレイアウト（wide-content）とMermaid全図形プリミティブ分解の検証

##

### 主張補足タイトル
矩形・角丸・ひし形・円・円柱（DB）・矢印コネクタのネイティブシェイプ出力

#### 本文
\`\`\`mermaid
graph LR
    Start((開始)) --> Input[データ入力]
    Input --> Check{妥当性判定}
    Check -->|OK| Store[(DB保存)]
    Check -->|NG| Retry(再試行処理)
\`\`\`

##### 図表出典
図表出典：Mermaidネイティブシェイプ変換仕様

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
`;

// 検証項目ごとの合否結果を記録する配列を初期化します
const results = [];

// 検証項目を評価して記録するヘルパー関数を定義します
function assertCheck(id, description, condition, detail = '') {
  // 合否判定を文字列化します
  const status = condition ? 'PASS' : 'FAIL';
  // 結果オブジェクトを配列へ追加します
  results.push({ id, description, status, detail });
  // 合格時はチェックマーク付きログを出力します
  if (condition) {
    // 合格ログを出力します
    console.log(`  ✅ [${id}] PASS: ${description}${detail ? ` (${detail})` : ''}`);
  // 不合格時はエラーマーク付きログを出力します
  } else {
    // 不合格ログを出力します
    console.error(`  ❌ [${id}] FAIL: ${description}${detail ? ` (${detail})` : ''}`);
  }
}

// PPTXファイルをJSZipで読み込み、スライドXML群とマスターXML群を展開するヘルパー関数を定義します
async function inspectPptxArchive(pptxPath) {
  // PPTXファイルのバイナリデータを読み込みます
  const buffer = fs.readFileSync(pptxPath);
  // JSZipでアーカイブを展開します
  const zip = await JSZip.loadAsync(buffer);
  // presentation.xml のテキストを取得します
  const presentationXml = await zip.file('ppt/presentation.xml').async('string');
  // ppt/slides/slideN.xml に一致するスライドXMLファイル一覧を抽出します
  const rawSlideFiles = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  // スライド番号の昇順でファイル一覧をソートします
  const slideFiles = rawSlideFiles.sort((a, b) => parseInt(a.match(/slide(\d+)\.xml/)[1], 10) - parseInt(b.match(/slide(\d+)\.xml/)[1], 10));
  // 各スライドのXML文字列配列を読み込みます
  const slidesXml = [];
  // スライドファイルを順次走査します
  for (const sf of slideFiles) {
    // XMLテキストを非同期で取得して配列へ追加します
    slidesXml.push(await zip.file(sf).async('string'));
  }
  // スライドマスターおよびカスタムスライドレイアウトXMLファイル一覧を取得します
  const masterFiles = Object.keys(zip.files).filter((k) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(k));
  // 各スライドマスター・レイアウトのXML文字列配列を読み込みます
  const masterXmls = [];
  // レイアウトファイルを順次走査します
  for (const mf of masterFiles) {
    // XMLテキストを非同期で取得して配列へ追加します
    masterXmls.push(await zip.file(mf).async('string'));
  }
  // メディアファイル一覧を取得します
  const mediaFiles = Object.keys(zip.files).filter((k) => k.startsWith('ppt/media/'));
  // 展開した構造データを返却します
  return { zip, presentationXml, slideFiles, slidesXml, masterFiles, masterXmls, mediaFiles };
}

// テストスイート全体を実行する非同期メイン関数を定義します
async function runAllTests() {
  // テスト開始ヘッダーを出力します
  console.log('=== PBI-014 (.pptx出力機能の完成) 自動検証テスト開始 ===');

  // 例外保護ブロックを開始します
  try {
    // ------------------------------------------------------------
    // 1. 公式4:3スライドデッキ (D01-000001_Marpの使い方.pptx) の検証 (AC-014-01, AC-014-02, AC-014-03, AC-014-04)
    // ------------------------------------------------------------
    // 最新コードで公式PPTXを一時検証パスへ生成します
    execFileSync(process.execPath, [path.resolve('pptx_converter/convert.js'), OFFICIAL_MD_PATH, OFFICIAL_VERIFY_PPTX_PATH], { stdio: ['ignore', 'inherit', 'inherit'] });
    // ホスト側でPowerPointが開かれていなければ公式PPTXパスへも上書き反映します
    try {
      // 既存の公式PPTXが存在する場合は事前削除を試みます
      if (fs.existsSync(OFFICIAL_PPTX_PATH)) {
        // 既存ファイルを削除します
        fs.unlinkSync(OFFICIAL_PPTX_PATH);
      }
      // 生成された最新PPTXを本番パスへコピーします
      fs.copyFileSync(OFFICIAL_VERIFY_PPTX_PATH, OFFICIAL_PPTX_PATH);
    // ホストOSでファイルロック中の場合は警告のみ出して検証を継続します
    } catch (copyErr) {
      // ロック警告を出力します
      console.warn(`  [Notice] ${OFFICIAL_PPTX_PATH} is currently locked by host OS; verifying via temporary output.`);
    }
    // 生成した公式PPTXアーカイブを解析します
    const official = await inspectPptxArchive(OFFICIAL_VERIFY_PPTX_PATH);

    // 4:3スライドサイズ（cx="9144000" cy="6858000" = 10x7.5 inch）を検証します
    const is4x3Size = official.presentationXml.includes('cx="9144000"') && official.presentationXml.includes('cy="6858000"');
    // AC-014-01-A の判定を記録します
    assertCheck('AC-014-01-A', '4:3比率スライドのサイズが10x7.5インチ（9144000x6858000 EMU）であること', is4x3Size);

    // 総スライド枚数がPDFと同一の19ページであることを検証します
    assertCheck('AC-014-01-B', '公式ガイドデッキの総スライド数がPDFと一致する19枚であること', official.slidesXml.length === 19, `slides=${official.slidesXml.length}`);

    // 4種類のスライドマスターレイアウト（MASTER_TITLE, MASTER_NORMAL, MASTER_WIDE, MASTER_TOC）が定義されていることを検証します
    assertCheck('AC-014-01-C', '4種類のレイアウト別スライドマスターが登録されていること', official.masterFiles.length >= 4, `layouts=${official.masterFiles.length}`);

    // ヘッダーロゴやバナー等のメディアファイルが埋め込まれていることを検証します
    assertCheck('AC-014-01-D', 'ヘッダーロゴ・バナー・アバター画像がppt/media/に埋め込まれていること', official.mediaFiles.length >= 3, `media=${official.mediaFiles.length}`);

    // スライドマスター（slideLayouts）にフッター機密区分（赤太字・右寄せ）・コピーライトが出力され、全スライドに文字化け（制御文字混入）がないことを検証します
    const masterHasCopyrightAndConfidential = official.masterXmls.some((xml) => xml.includes('2026 N-Y-Public') && xml.includes('CONFIDENTIAL') && xml.includes('val="FF0000"') && xml.includes('algn="r"'));
    // 全スライドのXML内に不正な制御文字（ASCII 0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F）が含まれていないことを確認します
    const noControlCharsInSlides = official.slidesXml.every((xml) => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(xml));
    // AC-014-01-E の判定を記録します
    assertCheck('AC-014-01-E', 'スライドマスターに共通ヘッダー・フッター（赤太字・右寄せの機密区分含む）が出力され不正制御文字が0件であること', masterHasCopyrightAndConfidential && noControlCharsInSlides);

    // 表紙スライド（1ページ目）の図書番号テキストボックスがスライド右端（9144000 EMU）からはみ出ておらず、タイトな幅であることを検証します
    const slide1Xml = official.slidesXml[0] || '';
    // 表紙のシェイプ一覧を抽出します
    const slide1Shapes = slide1Xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
    // 図書番号シェイプを特定します
    const bookNoShape = slide1Shapes.find((s) => s.includes('図書番号：D01-000001')) || '';
    // 図書番号シェイプのX座標と幅（EMU）を抽出します
    const bookNoXMatch = bookNoShape.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
    // 幅と高さの抽出結果を取得します
    const bookNoExtMatch = bookNoShape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    // X座標（EMU）を数値化します
    const bookNoX = bookNoXMatch ? parseInt(bookNoXMatch[1], 10) : 0;
    // 幅（EMU）を数値化します
    const bookNoCx = bookNoExtMatch ? parseInt(bookNoExtMatch[1], 10) : 9999999;
    // 右端がスライド幅（9144000 EMU）以内かつタイトな幅（3500000 EMU以下）であるか判定します
    const isBookNoBounded = bookNoX > 0 && (bookNoX + bookNoCx) <= 9144000 && bookNoCx < 3500000;
    // AC-014-01-G の判定を記録します
    assertCheck('AC-014-01-G', '表紙の図書番号テキストボックスがスライド右端からはみ出さず文字幅に適合していること', isBookNoBounded, `rightEdge=${bookNoX + bookNoCx}/9144000, cx=${bookNoCx}`);

    // 公式デッキの目次スライド（2ページ目・3ページ目）に目次項目と破線リーダーおよびページ番号が出力されていることを検証します
    const tocSlide2Xml = official.slidesXml[1] || '';
    // 3ページ目の目次続きスライドXMLを取得します
    const tocSlide3Xml = official.slidesXml[2] || '';
    // 2ページ目のシェイプ一覧を取得します
    const tocShapes = tocSlide2Xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
    // 1つ目の目次タイトルシェイプを特定します
    const firstTocTitleShape = tocShapes.find((s) => s.includes('通常ページテンプレ')) || '';
    // 2桁の目次ページ番号（10ページ目）シェイプを特定します
    const twoDigitTocPageShape = tocShapes.find((s) => s.includes('>10<')) || '';
    // 2桁ページ番号の幅（cx）を取得します
    const tocPageExtMatch = twoDigitTocPageShape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    // ページ番号幅（EMU）を数値化します（60px = 571500 EMU）
    const tocPageCx = tocPageExtMatch ? parseInt(tocPageExtMatch[1], 10) : 0;
    // 目次タイトルが非太字・折り返し禁止（wrap="none"）であり、2桁ページ番号が十分な幅と折り返し禁止を持つか判定します
    const hasTocItems = firstTocTitleShape.includes('wrap="none"') && !firstTocTitleShape.includes(' b="1"') && tocPageCx >= 500000 && twoDigitTocPageShape.includes('wrap="none"') && (tocSlide2Xml.includes('prst="line"') || tocSlide2Xml.includes('prstDash')) && tocSlide3Xml.includes('目次 (続き)');
    // AC-014-02-A の判定を記録します
    assertCheck('AC-014-02-A', '目次（TOC）スライドのタイトル（非太字・1行維持）・破線リーダー・2桁ページ番号（縦折れなし）が正常に出力されていること', hasTocItems, `tocPageCx=${tocPageCx}`);

    // 公式デッキの4ページ目（通常ページテンプレ）にコードブロックとインライン数式OMMLが含まれることを検証します
    const slide4Xml = official.slidesXml[3] || '';
    // コードブロックの文字列とOMMLタグ（<a14:m ...><m:oMathPara ...><m:oMath ...>）が含まれるか判定します
    const hasSlide4CodeAndMath = slide4Xml.includes('print') && slide4Xml.includes('<a14:m ') && slide4Xml.includes('<m:oMath ');
    // AC-014-02-B の判定を記録します
    assertCheck('AC-014-02-B', '公式デッキ4ページ目にシンタックスハイライト付きコードとネイティブ数式（<m:oMath>）が出力されていること', hasSlide4CodeAndMath);

    // 公式デッキの5ページ目（会話レイアウト）に吹き出し図形と4つすべてのPNGラスタライズ済みアイコンが含まれることを検証します
    const slide5Xml = official.slidesXml[4] || '';
    // 5ページ目内の画像要素（<p:pic>）の個数を数えます（4つの会話アイコンがすべて画像として配置されていること）
    const slide5PicCount = (slide5Xml.match(/<p:pic>/g) || []).length;
    // メディアフォルダにPNG形式のアバター画像が埋め込まれていることを確認します
    const pngMediaCount = official.mediaFiles.filter((m) => m.endsWith('.png')).length;
    // 5ページ目のシェイプ一覧を取得して図表タイトル「利用イメージ」・1段目吹き出し・発言者名のタイトボックス幅を検証します
    const slide5Shapes = slide5Xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
    // 図表タイトル（h3: 利用イメージ）のシェイプを取得します
    const h3UtilShape = slide5Shapes.find((s) => s.includes('利用イメージ')) || '';
    // 図表タイトルの幅を取得します
    const h3UtilExt = h3UtilShape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    // 図表タイトル幅を数値化します
    const h3UtilCx = h3UtilExt ? parseInt(h3UtilExt[1], 10) : 9999999;
    // 1段目の1行吹き出し（「このレイアウトの仕組みはどうなっているのですか？」）のシェイプを取得します
    const bubble1Shape = slide5Shapes.find((s) => s.includes('このレイアウトの仕組みはどうなっているのですか？')) || '';
    // 1段目吹き出しの幅を取得します
    const bubble1Ext = bubble1Shape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    // 1段目吹き出し幅を数値化します（メイリオ24文字＋パディングで5200000 EMU以上あること）
    const bubble1Cx = bubble1Ext ? parseInt(bubble1Ext[1], 10) : 0;
    // 右側発言者名「Marp自動生成」のシェイプを取得します
    const marpNameShape = slide5Shapes.find((s) => s.includes('Marp自動生成')) || '';
    // 会話テキスト・吹き出し角丸矩形・三角形しっぽ・アイコン4個・タイトな見出し幅・1行吹き出し幅補正・名前折り返し禁止を満たすか判定します
    const hasSlide5Conversation = slide5Xml.includes('シルエットアイコン') && slide5Xml.includes('prst="roundRect"') && slide5Xml.includes('prst="triangle"') && slide5PicCount === 4 && pngMediaCount >= 2 && h3UtilCx < 3000000 && bubble1Cx >= 5200000 && marpNameShape.includes('wrap="none"');
    // AC-014-02-C の判定を記録します
    assertCheck('AC-014-02-C', '公式デッキ5ページ目（会話レイアウト）に4つのPNGアイコン・吹き出しが配置されテキスト枠が文字サイズに適合していること', hasSlide5Conversation, `pics=${slide5PicCount}, pngMedia=${pngMediaCount}, h3Cx=${h3UtilCx}, bubble1Cx=${bubble1Cx}`);

    // 公式デッキの7ページ目（2段組 columns-2）・8ページ目（インフォグラフィック画像解説）・9ページ目以降にネイティブテーブル（<a:tbl>）と画像が出力されていることを検証します
    const slide7Xml = official.slidesXml[6] || '';
    // 8ページ目（インフォグラフィック解説ページ）のXMLを取得します
    const slide8Xml = official.slidesXml[7] || '';
    // 9ページ目（10段階サイズ調整クラス一覧表）のXMLを取得します
    const slide9Xml = official.slidesXml[8] || '';
    // 7ページ目の2段組に左右カラム見出し・コード・ネイティブ表が含まれ、8ページ目にインフォグラフィック画像（<p:pic>）と解説リストが含まれ、9ページ目にも表が含まれるか判定します
    const hasNativeTable = slide7Xml.includes('【左カラム】') && slide7Xml.includes('【右カラム】') && slide7Xml.includes('<a:tbl>') && slide8Xml.includes('<p:pic>') && slide8Xml.includes('STEP 1') && slide9Xml.includes('<a:tbl>') && slide9Xml.includes('<a:tc>') && !slide9Xml.includes('val="010101"');
    // AC-014-02-D の判定を記録します
    assertCheck('AC-014-02-D', '2段組（columns-2）・インフォグラフィック画像解説・表（<a:tbl>）が崩れずネイティブ要素として出力されていること', hasNativeTable);

    // 公式デッキの15ページ目（Mermaidフローチャート）がネイティブ図形とコネクタ線に分解されていることを検証します
    const slide15Xml = official.slidesXml[14] || '';
    // 図形（<p:sp>）が複数存在し、ノードラベルテキストが編集可能テキストとして含まれているか判定します
    const slide15ShapeCount = (slide15Xml.match(/<p:sp>/g) || []).length;
    // ノード内の文字列と矢印定義が含まれるか確認します
    const hasMermaidShapesOfficial = slide15ShapeCount >= 8 && slide15Xml.includes('AIアシスタント') && slide15Xml.includes('marp-slide-mcp') && slide15Xml.includes('type="triangle"');
    // AC-014-03-A の判定を記録します
    assertCheck('AC-014-03-A', '公式デッキ15ページ目のMermaid図がネイティブ図形・矢印線・編集可能テキストへ分解出力されていること', hasMermaidShapesOfficial, `shapes=${slide15ShapeCount}`);

    // ------------------------------------------------------------
    // 2. 16:9全機能網羅デッキの変換・検証 (AC-014-01〜AC-014-05)
    // ------------------------------------------------------------
    // テスト用Markdownファイルを書き出します
    fs.writeFileSync(TEST_MD_PATH, testMarkdownContent, 'utf-8');

    // MCPツールの export_to_pptx ハンドラーを取得して実行します（AC-014-05 の統合検証）
    const registeredTools = server._registeredTools;
    // export_to_pptx ツールが登録されていることを確認します
    const exportPptxTool = registeredTools ? registeredTools['export_to_pptx'] : null;
    // ツール登録有無を検証します
    assertCheck('AC-014-05-A', 'MCPサーバーに export_to_pptx ツールが登録されていること', Boolean(exportPptxTool));

    // export_to_pptx ツールを呼び出して 16:9 テストデッキを PPTX へ変換します
    const mcpResult = await exportPptxTool.handler({ markdownPath: TEST_MD_PATH }, {});
    // ツール実行が成功（isError が未設定または false）し、PPTXファイルが生成されたか確認します
    const mcpSuccess = !mcpResult.isError && fs.existsSync(TEST_PPTX_PATH) && mcpResult.content[0].text.includes('PPTX出力成功');
    // AC-014-05-B の判定を記録します
    assertCheck('AC-014-05-B', 'export_to_pptx ツール実行によりPPTXが正常生成され成功レスポンスが返ること', mcpSuccess);

    // 中間HTMLファイル（*_temp.html）が正常終了後に自動削除されていることを確認します
    assertCheck('AC-014-05-C', '正常変換完了後に一時HTMLファイル（*_temp.html）が確実に削除されていること', !fs.existsSync(TEST_TEMP_HTML_PATH));

    // 生成された16:9テストPPTXアーカイブを展開して検査します
    const custom16x9 = await inspectPptxArchive(TEST_PPTX_PATH);

    // 16:9スライドサイズ（cx="12192000" cy="6858000" = 13.333x7.5 inch）を検証します
    const is16x9Size = custom16x9.presentationXml.includes('cx="12192000"') && custom16x9.presentationXml.includes('cy="6858000"');
    // AC-014-01-F の判定を記録します
    assertCheck('AC-014-01-F', '16:9比率スライドのサイズが13.333x7.5インチ（12192000x6858000 EMU）であること', is16x9Size);

    // 16:9テストデッキの3ページ目（2段組・箇条書き階層・インライン/ブロック数式）を検査します
    const testSlide3Xml = custom16x9.slidesXml[2] || '';
    // 箇条書き（<a:buChar または <a:buAutoNum）とインデントレベルが含まれるか確認します
    const hasBulletsAndNumbering = testSlide3Xml.includes('<a:buChar') && testSlide3Xml.includes('<a:buAutoNum');
    // AC-014-02-E の判定を記録します
    assertCheck('AC-014-02-E', '箇条書きリスト（<a:buChar>）および番号付きリスト（<a:buAutoNum>）がネイティブ属性で出力されていること', hasBulletsAndNumbering);

    // 3ページ目の数式が Office MathML (<a14:m ...><m:oMathPara ...><m:oMath ...>) として出力され、分数(<m:f>)・平方根(<m:rad>)・上付き(<m:sSup>)・大型演算子(<m:nary>)を含むか検証します
    const hasOmmlConstructs = testSlide3Xml.includes('<a14:m ') && testSlide3Xml.includes('<m:oMathPara ') && testSlide3Xml.includes('<m:oMath ') && testSlide3Xml.includes('<m:f>') && testSlide3Xml.includes('<m:rad>') && testSlide3Xml.includes('<m:sSup>') && testSlide3Xml.includes('<m:nary>');
    // AC-014-04-A の判定を記録します
    assertCheck('AC-014-04-A', 'インライン数式・ブロック数式がOffice MathML（<m:f>, <m:rad>, <m:sSup>, <m:nary>）として出力されていること', hasOmmlConstructs);

    // 16:9テストデッキの4ページ目（画像グリッド images-3・表・コードブロック）を検査します
    const testSlide4Xml = custom16x9.slidesXml[3] || '';
    // 画像要素が3つ以上（グリッド3枚＋ヘッダーロゴ）含まれ、キャプションとテーブルとシンタックスハイライト分割ランが含まれるか判定します
    const hasGridTableCode = (testSlide4Xml.match(/<p:pic>/g) || []).length >= 3 && testSlide4Xml.includes('キャプション1') && testSlide4Xml.includes('<a:tbl>') && testSlide4Xml.includes('items') && testSlide4Xml.includes('console');
    // AC-014-02-F の判定を記録します
    assertCheck('AC-014-02-F', '画像横並びグリッド（images-3）・キャプション・表・コードブロックが同一スライド内で崩れず出力されていること', hasGridTableCode);

    // 16:9テストデッキの6ページ目（Mermaid全図形プリミティブ：円/楕円・矩形・ひし形・円柱・角丸矩形・矢印）を検査します
    const testSlide6Xml = custom16x9.slidesXml[5] || '';
    // 各種プリセット図形（ellipse, rect, diamond, can, roundRect, line）が含まれているか判定します
    const hasAllMermaidPrimitives = testSlide6Xml.includes('prst="ellipse"') && testSlide6Xml.includes('prst="rect"') && testSlide6Xml.includes('prst="diamond"') && testSlide6Xml.includes('prst="can"') && testSlide6Xml.includes('prst="roundRect"') && testSlide6Xml.includes('prst="line"') && testSlide6Xml.includes('type="triangle"');
    // AC-014-03-B の判定を記録します
    assertCheck('AC-014-03-B', 'Mermaid図の矩形・角丸・ひし形・円・円柱（DB）・矢印コネクタがすべて対応するPowerPointプリセット図形へ変換されていること', hasAllMermaidPrimitives);

    // ------------------------------------------------------------
    // 3. 準正常系・異常系エラーハンドリング検証 (AC-014-05 / ERR-NOT-002)
    // ------------------------------------------------------------
    // 存在しない fileId を指定して export_to_pptx を呼び出します
    const errResult = await exportPptxTool.handler({ fileId: 'non_existent_deck_99999' }, {});
    // isError: true が返却され、サーバーがクラッシュしないことを確認します
    const handledMissingFile = errResult.isError === true && errResult.content[0].text.includes('PPTX出力エラー');
    // AC-014-05-D の判定を記録します
    assertCheck('AC-014-05-D', '存在しないfileId指定時にクラッシュせず isError: true とエラーメッセージを返却すること', handledMissingFile);
  // クリーンアップ処理を実行します
  } finally {
    // 公式検証用の一時PPTXファイルを削除します
    if (fs.existsSync(OFFICIAL_VERIFY_PPTX_PATH)) fs.unlinkSync(OFFICIAL_VERIFY_PPTX_PATH);
    // テスト用一時Markdownファイルを削除します
    if (fs.existsSync(TEST_MD_PATH)) fs.unlinkSync(TEST_MD_PATH);
    // テスト用一時PPTXファイルを削除します
    if (fs.existsSync(TEST_PPTX_PATH)) fs.unlinkSync(TEST_PPTX_PATH);
    // 万一残存している一時HTMLファイルがあれば削除します
    if (fs.existsSync(TEST_TEMP_HTML_PATH)) fs.unlinkSync(TEST_TEMP_HTML_PATH);
  }

  // 不合格件数を集計します
  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  // サマリーログを出力します
  console.log(`\n=== テスト結果サマリー: 合格 ${results.length - failedCount} / 総数 ${results.length} 件 (不合格 ${failedCount} 件) ===`);
  // 不合格が1件以上ある場合は終了コード1で終了します
  if (failedCount > 0) {
    // 異常終了します
    process.exit(1);
  }
  // 正常終了します
  process.exit(0);
}

// テストスイートを実行します
runAllTests();
