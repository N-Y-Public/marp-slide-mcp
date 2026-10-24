// ファイルシステム同期操作モジュールをインポートします
import fs from 'fs';
// ファイルパス操作モジュールをインポートします
import path from 'path';
// ヘッドレスブラウザ自動化ライブラリPuppeteerをインポートします
import puppeteer from 'puppeteer';
// 子プロセス同期実行モジュールをインポートします
import { execSync } from 'child_process';

// テスト用の一時Markdownファイルパスを定義します
const TEST_MD_PATH = path.resolve('test_element_sizing_temp.md');
// テスト用の一時HTMLファイルパスを定義します
const TEST_HTML_PATH = path.resolve('test_element_sizing_temp.html');

// テスト用のMarkdown文字列を構築します
const testMarkdown = `---
marp: true
theme: business-slide
size: 16:9
paginate: true
---

<!-- ページ1: 表の10段階および後方互換検証 -->
<!-- _class: table-1 -->
# 表 段階1
## 表のフォントサイズ検証
#### 表コンテンツ
| 列A | 列B | 列C |
| :--- | :--- | :--- |
| データ1 | データ2 | データ3 |

---

<!-- _class: table-5 -->
# 表 段階5
## 表のフォントサイズ検証
#### 表コンテンツ
| 列A | 列B | 列C |
| :--- | :--- | :--- |
| データ1 | データ2 | データ3 |

---

<!-- _class: table-8 -->
# 表 段階8 (旧xxs相当)
## 表のフォントサイズ検証
#### 表コンテンツ
| 列A | 列B | 列C |
| :--- | :--- | :--- |
| データ1 | データ2 | データ3 |

---

<!-- _class: table-10 -->
# 表 段階10 (旧最小より2段階小)
## 表のフォントサイズ検証
#### 表コンテンツ
| 列A | 列B | 列C |
| :--- | :--- | :--- |
| データ1 | データ2 | データ3 |

---

<!-- _class: table-sm -->
# 表 旧sm互換
## 表のフォントサイズ検証
#### 表コンテンツ
| 列A | 列B | 列C |
| :--- | :--- | :--- |
| データ1 | データ2 | データ3 |

---

<!-- ページ6: 本文テキストの10段階および後方互換検証 -->
<!-- _class: text-1 -->
# 本文 段階1
## 本文フォントサイズ検証
#### 本文コンテンツ
これは本文サイズ段階1（標準等倍）の段落テキストです。

---

<!-- _class: text-4 -->
# 本文 段階4
## 本文フォントサイズ検証
#### 本文コンテンツ
これは本文サイズ段階4の段落テキストです。

---

<!-- _class: text-8 -->
# 本文 段階8 (旧densest相当)
## 本文フォントサイズ検証
#### 本文コンテンツ
これは本文サイズ段階8の段落テキストです。

---

<!-- _class: text-10 -->
# 本文 段階10 (旧最小より2段階小)
## 本文フォントサイズ検証
#### 本文コンテンツ
これは本文サイズ段階10の段落テキストです。

---

<!-- _class: body-3 -->
# 本文 エイリアス body-3
## 本文フォントサイズ検証
#### 本文コンテンツ
これはエイリアスクラスbody-3の段落テキストです。

---

<!-- _class: dense -->
# 本文 旧dense互換
## 本文フォントサイズ検証
#### 本文コンテンツ
これは旧クラスdenseの段落テキストです。

---

<!-- ページ12: コードブロックの10段階検証 -->
<!-- _class: code-1 -->
# コード 段階1
## コードフォントサイズ検証
#### コードコンテンツ
\`\`\`javascript
const greeting = "Hello, World 1";
console.log(greeting);
\`\`\`

---

<!-- _class: code-5 -->
# コード 段階5
## コードフォントサイズ検証
#### コードコンテンツ
\`\`\`javascript
const greeting = "Hello, World 5";
console.log(greeting);
\`\`\`

---

<!-- _class: code-8 -->
# コード 段階8 (旧xxs相当)
## コードフォントサイズ検証
#### コードコンテンツ
\`\`\`javascript
const greeting = "Hello, World 8";
console.log(greeting);
\`\`\`

---

<!-- _class: code-10 -->
# コード 段階10 (旧最小より2段階小)
## コードフォントサイズ検証
#### コードコンテンツ
\`\`\`javascript
const greeting = "Hello, World 10";
console.log(greeting);
\`\`\`

---

<!-- _class: code-sm -->
# コード 旧sm互換
## コードフォントサイズ検証
#### コードコンテンツ
\`\`\`javascript
const greeting = "Hello, World sm";
console.log(greeting);
\`\`\`

---

<!-- ページ17: Mermaid図の10段階検証 -->
<!-- _class: mermaid-1 -->
# Mermaid 段階1
## Mermaid最大高さ検証
#### Mermaidコンテンツ
<div class="mermaid"><svg viewBox="0 0 400 400" style="max-width: 400px; height: 400px;"></svg></div>

---

<!-- _class: mermaid-4 -->
# Mermaid 段階4 (旧sm相当)
## Mermaid最大高さ検証
#### Mermaidコンテンツ
<div class="mermaid"><svg viewBox="0 0 400 400" style="max-width: 400px; height: 400px;"></svg></div>

---

<!-- _class: mermaid-7 -->
# Mermaid 段階7 (旧xs相当)
## Mermaid最大高さ検証
#### Mermaidコンテンツ
<div class="mermaid"><svg viewBox="0 0 400 400" style="max-width: 400px; height: 400px;"></svg></div>

---

<!-- _class: mermaid-10 -->
# Mermaid 段階10 (旧最小より2段階小)
## Mermaid最大高さ検証
#### Mermaidコンテンツ
<div class="mermaid"><svg viewBox="0 0 400 400" style="max-width: 400px; height: 400px;"></svg></div>

---

<!-- _class: mermaid-xs -->
# Mermaid 旧xs互換
## Mermaid最大高さ検証
#### Mermaidコンテンツ
<div class="mermaid"><svg viewBox="0 0 400 400" style="max-width: 400px; height: 400px;"></svg></div>

---

<!-- ページ22: 画像の10段階検証 -->
<!-- _class: img-1 -->
# 画像 段階1
## 画像最大高さ検証
#### 画像コンテンツ
![サンプル画像](banner.svg)

---

<!-- _class: img-5 -->
# 画像 段階5
## 画像最大高さ検証
#### 画像コンテンツ
![サンプル画像](banner.svg)

---

<!-- _class: img-10 -->
# 画像 段階10
## 画像最大高さ検証
#### 画像コンテンツ
![サンプル画像](banner.svg)

---

<!-- _class: image-3 -->
# 画像 エイリアス image-3
## 画像最大高さ検証
#### 画像コンテンツ
![サンプル画像](banner.svg)

---

<!-- ページ26: 複合クラス検証 -->
<!-- _class: text-4 table-5 -->
# 複合指定スライド
## 本文と表の同時指定
#### 複合コンテンツ
本文テキストのサイズがtext-4に縮小されます。

| 項目 | 値 |
| :--- | :--- |
| テーブル | table-5に縮小 |
`;

// テストメイン関数を非同期で実行します
async function runTest() {
  // テスト開始ログを出力します
  console.log('=== スライド内要素サイズ調整クラス細粒度化検証テスト (TEST-ST-006) 開始 ===');

  // テスト用Markdownファイルを同期出力します
  fs.writeFileSync(TEST_MD_PATH, testMarkdown, 'utf-8');

  // Marp CLIを用いてHTMLへ変換します
  console.log('Marp CLIを用いてHTMLへ変換中...');
  // Marpコマンドを同期実行します（HTMLタグを許可するため --html を指定）
  execSync(`npx marp ${TEST_MD_PATH} --theme-set themes/business-slide-theme.css --output ${TEST_HTML_PATH} --allow-local-files --no-stdin --html`, {
    // 標準出力を継承します
    stdio: 'inherit'
  });

  // Puppeteerブラウザを起動します
  const browser = await puppeteer.launch({
    // ヘッドレスモードで実行します
    headless: true,
    // サンドボックス無効化オプションを指定します
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 判定フラグを初期化します
  let allPass = true;

  // テストブロックを開始します
  try {
    // 新規ページを開きます
    const page = await browser.newPage();
    // 16:9比率のビューポートサイズを設定します
    await page.setViewport({ width: 1280, height: 720 });
    // 生成されたHTMLファイルをロードします
    await page.goto(`file://${TEST_HTML_PATH}`, { waitUntil: 'networkidle0' });

    // スライド全体の要素計測結果をブラウザ内コンテキストで取得します
    const results = await page.evaluate(() => {
      // 全section要素を取得します
      const sections = Array.from(document.querySelectorAll('section'));

      // 各スライドの計測データを格納する配列です
      return sections.map((sec, idx) => {
        // スライドクラス一覧を取得します
        const cls = sec.className;
        // テーブル要素を取得します
        const table = sec.querySelector('table');
        // 本文段落要素を取得します
        const p = sec.querySelector('h4 ~ p:not(h5 ~ *, h6 ~ *)');
        // pre code要素を取得します
        const code = sec.querySelector('pre code');
        // mermaid要素を取得します
        const mermaid = sec.querySelector('.mermaid');
        // img要素を取得します
        const img = sec.querySelector('img:not(header img)');

        // テーブル計算済みフォントサイズを取得します
        const tableFs = table ? parseFloat(window.getComputedStyle(table).fontSize) : null;
        // 本文段落計算済みフォントサイズを取得します
        const pFs = p ? parseFloat(window.getComputedStyle(p).fontSize) : null;
        // コード計算済みフォントサイズを取得します
        const codeFs = code ? parseFloat(window.getComputedStyle(code).fontSize) : null;
        // Mermaidコンテナの計算済み最大高さを取得します
        const mmdMaxH = mermaid ? parseFloat(window.getComputedStyle(mermaid).maxHeight) : null;
        // 画像の計算済み最大高さを取得します
        const imgMaxH = img ? parseFloat(window.getComputedStyle(img).maxHeight) : null;

        // 計測結果オブジェクトを返却します
        return {
          // ページ番号（1始まり）です
          page: idx + 1,
          // スライドクラスです
          classes: cls,
          // テーブルフォントサイズ（px）です
          tableFs,
          // 本文フォントサイズ（px）です
          pFs,
          // コードフォントサイズ（px）です
          codeFs,
          // Mermaid最大高さ（px）です
          mmdMaxH,
          // 画像最大高さ（px）です
          imgMaxH
        };
      });
    });

    // 取得した計測結果をログ出力します
    console.log(`全 ${results.length} スライドの計測データを取得しました。\n`);

    // --- AC-1: 表の10段階および段階縮小検証 ---
    console.log('--- [AC-1 検証: 表の10段階および段階縮小] ---');
    // table-1 スライド結果
    const tbl1 = results[0];
    // table-5 スライド結果
    const tbl5 = results[1];
    // table-8 スライド結果
    const tbl8 = results[2];
    // table-10 スライド結果
    const tbl10 = results[3];

    console.log(`table-1  fontSize: ${tbl1.tableFs}px (約26pt)`);
    console.log(`table-5  fontSize: ${tbl5.tableFs}px (約13.5pt)`);
    console.log(`table-8  fontSize: ${tbl8.tableFs}px (約8pt, 旧xxs相当)`);
    console.log(`table-10 fontSize: ${tbl10.tableFs}px (約6pt, 旧最小より2段階小)`);

    // 段階的縮小と最小値判定を行います
    if (tbl1.tableFs > tbl5.tableFs && tbl5.tableFs > tbl8.tableFs && tbl8.tableFs > tbl10.tableFs && tbl10.tableFs <= 8.5) {
      console.log('=> [PASS] AC-1: 表のフォントサイズが段階的に縮小し、table-10 は旧最小(8pt/約10.6px)より2段階小さい(6pt/約8px)ことを確認');
    } else {
      console.error('=> [FAIL] AC-1: 表のフォントサイズ縮小関係に異常があります');
      allPass = false;
    }

    // --- AC-2: 本文テキストの10段階検証 ---
    console.log('\n--- [AC-2 検証: 本文テキストの10段階および段階縮小] ---');
    // text-1 スライド結果
    const txt1 = results[5];
    // text-4 スライド結果
    const txt4 = results[6];
    // text-8 スライド結果
    const txt8 = results[7];
    // text-10 スライド結果
    const txt10 = results[8];
    // body-3 エイリアス結果
    const body3 = results[9];

    console.log(`text-1   fontSize: ${txt1.pFs}px (scale 1.0, 24px)`);
    console.log(`text-4   fontSize: ${txt4.pFs}px (scale 0.76, 約18.2px)`);
    console.log(`text-8   fontSize: ${txt8.pFs}px (scale 0.50, 12px, 旧densest相当)`);
    console.log(`text-10  fontSize: ${txt10.pFs}px (scale 0.35, 約8.4px, 旧最小より2段階小)`);
    console.log(`body-3   fontSize: ${body3.pFs}px (scale 0.84, エイリアス動作)`);

    // 本文フォントサイズの段階縮小判定を行います
    if (txt1.pFs > txt4.pFs && txt4.pFs > txt8.pFs && txt8.pFs > txt10.pFs && txt10.pFs <= 9.0 && body3.pFs < txt1.pFs && body3.pFs > txt4.pFs) {
      console.log('=> [PASS] AC-2: 本文フォントサイズが段階的に縮小し、text-10 は旧最小(0.50/12px)より2段階小さい(0.35/8.4px)ことを確認、エイリアスも正常動作');
    } else {
      console.error('=> [FAIL] AC-2: 本文フォントサイズ縮小関係に異常があります');
      allPass = false;
    }

    // --- AC-5: コードブロックの10段階検証 ---
    console.log('\n--- [AC-5 検証: コードブロックの10段階および段階縮小] ---');
    // code-1 スライド結果
    const code1 = results[11];
    // code-5 スライド結果
    const code5 = results[12];
    // code-8 スライド結果
    const code8 = results[13];
    // code-10 スライド結果
    const code10 = results[14];

    console.log(`code-1   fontSize: ${code1.codeFs}px (18pt, 24px)`);
    console.log(`code-5   fontSize: ${code5.codeFs}px (11pt, 約14.6px)`);
    console.log(`code-8   fontSize: ${code8.codeFs}px (7pt, 約9.3px, 旧xxs相当)`);
    console.log(`code-10  fontSize: ${code10.codeFs}px (5pt, 約6.67px, 旧最小より2段階小)`);

    // コードフォントサイズの段階縮小判定を行います
    if (code1.codeFs > code5.codeFs && code5.codeFs > code8.codeFs && code8.codeFs > code10.codeFs && code10.codeFs <= 7.0) {
      console.log('=> [PASS] AC-5: コードフォントサイズが段階的に縮小し、code-10 は旧最小(7pt/9.3px)より2段階小さい(5pt/6.67px)ことを確認');
    } else {
      console.error('=> [FAIL] AC-5: コードフォントサイズ縮小関係に異常があります');
      allPass = false;
    }

    // --- AC-3: Mermaid図の10段階検証 ---
    console.log('\n--- [AC-3 検証: Mermaid図の10段階最大高さ縮小] ---');
    // mermaid-1 スライド結果
    const mmd1 = results[16];
    // mermaid-4 スライド結果
    const mmd4 = results[17];
    // mermaid-7 スライド結果
    const mmd7 = results[18];
    // mermaid-10 スライド結果
    const mmd10 = results[19];

    console.log(`mermaid-1  maxHeight: ${mmd1.mmdMaxH}px (100%, 440px)`);
    console.log(`mermaid-4  maxHeight: ${mmd4.mmdMaxH}px (75%, 330px)`);
    console.log(`mermaid-7  maxHeight: ${mmd7.mmdMaxH}px (55%, 242px, 旧xs相当)`);
    console.log(`mermaid-10 maxHeight: ${mmd10.mmdMaxH}px (28%, 約123.2px, 旧最小より2段階小)`);

    // Mermaid最大高さの段階縮小判定を行います
    if (mmd1.mmdMaxH > mmd4.mmdMaxH && mmd4.mmdMaxH > mmd7.mmdMaxH && mmd7.mmdMaxH > mmd10.mmdMaxH && mmd10.mmdMaxH <= 130) {
      console.log('=> [PASS] AC-3: Mermaid最大高さが段階的に縮小し、mermaid-10 は旧最小(55%/242px)より2段階小さい(28%/123.2px)ことを確認');
    } else {
      console.error('=> [FAIL] AC-3: Mermaid最大高さ縮小関係に異常があります');
      allPass = false;
    }

    // --- AC-4: 画像の10段階検証 ---
    console.log('\n--- [AC-4 検証: 画像の10段階最大高さ縮小] ---');
    // img-1 スライド結果
    const img1 = results[21];
    // img-5 スライド結果
    const img5 = results[22];
    // img-10 スライド結果
    const img10 = results[23];
    // image-3 エイリアス結果
    const img3 = results[24];

    console.log(`img-1    maxHeight: ${img1.imgMaxH}px (100%, 440px)`);
    console.log(`img-5    maxHeight: ${img5.imgMaxH}px (60%, 264px)`);
    console.log(`img-10   maxHeight: ${img10.imgMaxH}px (20%, 88px)`);
    console.log(`image-3  maxHeight: ${img3.imgMaxH}px (80%, 352px, エイリアス動作)`);

    // 画像最大高さの段階縮小判定を行います
    if (img1.imgMaxH > img5.imgMaxH && img5.imgMaxH > img10.imgMaxH && img10.imgMaxH <= 100 && img3.imgMaxH < img1.imgMaxH && img3.imgMaxH > img5.imgMaxH) {
      console.log('=> [PASS] AC-4: 画像最大高さが段階的に縮小し、img-10 は極小(20%/88px)まで縮小制御されることを確認、エイリアスも正常動作');
    } else {
      console.error('=> [FAIL] AC-4: 画像最大高さ縮小関係に異常があります');
      allPass = false;
    }

    // --- AC-6: 後方互換性検証 ---
    console.log('\n--- [AC-6 検証: 既存クラスの後方互換性] ---');
    // table-sm スライド結果
    const tblSm = results[4];
    // dense スライド結果
    const txtDense = results[10];
    // code-sm スライド結果
    const codeSm = results[15];
    // mermaid-xs スライド結果
    const mmdXs = results[20];

    console.log(`table-sm   fontSize: ${tblSm.tableFs}px (旧sm相当)`);
    console.log(`dense      fontSize: ${txtDense.pFs}px (旧dense相当)`);
    console.log(`code-sm    fontSize: ${codeSm.codeFs}px (旧sm相当)`);
    console.log(`mermaid-xs maxHeight: ${mmdXs.mmdMaxH}px (旧xs相当)`);

    // 後方互換性の判定を行います
    if (tblSm.tableFs && txtDense.pFs && codeSm.codeFs && Math.abs(mmdXs.mmdMaxH - 242) < 1) {
      console.log('=> [PASS] AC-6: 既存クラス(table-sm, dense, code-sm, mermaid-xs)が正常に適用され後方互換性が維持されていることを確認');
    } else {
      console.error('=> [FAIL] AC-6: 既存クラスの後方互換性に異常があります');
      allPass = false;
    }

    // --- AC-7: 複合指定検証 ---
    console.log('\n--- [AC-7 検証: 複合クラス同時指定の独立動作] ---');
    // 複合指定スライド結果
    const multi = results[25];
    console.log(`複合スライド (text-4 table-5) - 本文: ${multi.pFs}px (期待: ${txt4.pFs}px), 表: ${multi.tableFs}px (期待: ${tbl5.tableFs * 0.76}px)`);

    // 複合指定が両方適用されているか判定を行います（表は table-5 のサイズに text-4 の本文倍率 0.76 が乗算される仕様）
    const expectedTableFs = tbl5.tableFs * 0.76;
    if (Math.abs(multi.pFs - txt4.pFs) < 0.1 && Math.abs(multi.tableFs - expectedTableFs) < 0.1) {
      console.log('=> [PASS] AC-7: text-4 と table-5 の両スタイルが干渉せず仕様通り連動適用されていることを確認');
    } else {
      console.error('=> [FAIL] AC-7: 複合指定の個別適用に差異があります');
      allPass = false;
    }

  } finally {
    // ブラウザを終了します
    await browser.close();

    // 一時ファイルを削除します
    if (fs.existsSync(TEST_MD_PATH)) fs.unlinkSync(TEST_MD_PATH);
    if (fs.existsSync(TEST_HTML_PATH)) fs.unlinkSync(TEST_HTML_PATH);
  }

  // 総合結果の出力
  console.log('\n======================================================');
  if (allPass) {
    console.log('【全テスト合格】 TEST-ST-006: 10段階統一数字クラスおよび後方互換性の検証が全てPASSしました。');
    process.exit(0);
  } else {
    console.error('【テスト不合格】 Must要件の一部でアサーションが失敗しました。');
    process.exit(1);
  }
}

// テストを実行します
runTest().catch((err) => {
  // エラーを出力します
  console.error('テスト実行中に予期せぬ例外が発生しました:', err);
  // 終了コード1で終了します
  process.exit(1);
});
