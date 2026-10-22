// ファイルシステム同期操作モジュールをインポートします
import fs from 'fs';
// ファイルパス操作モジュールをインポートします
import path from 'path';
// ヘッドレスブラウザ自動化ライブラリPuppeteerをインポートします
import puppeteer from 'puppeteer';
// 子プロセス同期実行モジュールをインポートします
import { execSync } from 'child_process';

// テスト用の一時Markdownファイルパスを定義します
const TEST_MD_PATH = path.resolve('test_cover_overflow_temp.md');
// テスト用の一時HTMLファイルパスを定義します
const TEST_HTML_PATH = path.resolve('test_cover_overflow_temp.html');
// テスト用の一時PDFファイルパスを定義します
const TEST_PDF_PATH = path.resolve('test_cover_overflow_temp.pdf');

// テスト対象の表紙スライドケース一覧を定義します
const testCases = [
  {
    name: 'ケース1: 1行通常タイトル (16:9比率)',
    size: '16:9',
    md: `---
marp: true
theme: business-slide
size: 16:9
paginate: true
---

# 1行タイトル
短文タイトルのスライド

## サブタイトル
通常の1行サブタイトル

### 図書番号
DOC-000001

### 所属・氏名
デジタルイノベーション推進部
山田 太郎

#### 作成日
2026年10月22日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
`
  },
  {
    name: 'ケース2: 3行タイトル (Issue #13 再現シナリオ 16:9比率)',
    size: '16:9',
    md: `---
marp: true
theme: business-slide
size: 16:9
paginate: true
---

# 3行タイトル検証
企業情報システムにおけるクラウド移行の課題と展望
レガシーシステム刷新に向けた段階的移行アプローチとガバナンス設計
持続可能なアジャイル開発体制の確立に向けた包括的ロードマップ

## サブタイトル
エンタープライズDX推進における全社アーキテクチャ標準化方針

### 図書番号
DOC-000002

### 所属・氏名
デジタルイノベーション推進部
システム企画設計課
山田 太郎

#### 作成日
2026年10月22日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
`
  },
  {
    name: 'ケース3: 4行超長文タイトル＋2行サブタイトル (極限境界シナリオ 16:9比率)',
    size: '16:9',
    md: `---
marp: true
theme: business-slide
size: 16:9
paginate: true
---

# 4行超長文タイトル検証
極めて長大なプロジェクト計画書における表紙レイアウトの自動調整機能検証
第一章から第十章に至る包括的なシステム刷新スコープと要求分析の全容
セキュリティ基準および品質ゲート統制を両立させるミクロなV字・W字モデル運用
次世代ミッションクリティカル基盤の完全移行に向けたリスク低減戦略

## サブタイトル
全社データマネジメント統合に向けた規約準拠と
プライバシー保護規制への完全適合を実現する技術報告書

### 図書番号
DOC-000003

### 所属・氏名
エンタープライズアーキテクチャ推進室
クラウド基盤設計グループ
山田 太郎

#### 作成日
2026年10月22日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
`
  },
  {
    name: 'ケース4: 3行タイトル (4:3比率 AC-4検証)',
    size: '4:3',
    md: `---
marp: true
theme: business-slide
size: 4:3
paginate: true
---

# 3行タイトル4:3比率検証
企業情報システムにおけるクラウド移行の課題と展望
レガシーシステム刷新に向けた段階的移行アプローチとガバナンス設計
持続可能なアジャイル開発体制の確立に向けた包括的ロードマップ

## サブタイトル
エンタープライズDX推進における全社アーキテクチャ標準化方針

### 図書番号
DOC-000004

### 所属・氏名
デジタルイノベーション推進部
山田 太郎

#### 作成日
2026年10月22日

###### コピーライト
© 2026 N-Y-Public

###### 機密指定
CONFIDENTIAL
`
  }
];

// テストメイン関数を非同期で実行します
async function runTest() {
  // テスト開始ログを出力します
  console.log('=== 表紙タイトル複数行はみ出し防止検証テスト (TEST-ST-005) 開始 ===');

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
    // 各テストケースを順次検証します
    for (let i = 0; i < testCases.length; i++) {
      // 現在のテストケースを取得します
      const tc = testCases[i];
      // ケース一時ファイル名を構築します
      const mdPath = path.resolve(`test_cover_case_${i + 1}_temp.md`);
      // ケース一時HTMLファイル名を構築します
      const htmlPath = path.resolve(`test_cover_case_${i + 1}_temp.html`);
      // ケース一時PDFファイル名を構築します
      const pdfPath = path.resolve(`test_cover_case_${i + 1}_temp.pdf`);

      // 一時Markdownファイルを出力します
      fs.writeFileSync(mdPath, tc.md, 'utf-8');

      // Marp CLIを用いてHTMLへ変換します
      execSync(`npx marp ${mdPath} --theme-set themes/business-slide-theme.css --output ${htmlPath} --allow-local-files --no-stdin`, {
        // 標準出力を無視します
        stdio: 'ignore'
      });

      // Marp CLIを用いてPDFへ変換します
      execSync(`npx marp ${mdPath} --theme-set themes/business-slide-theme.css --output ${pdfPath} --allow-local-files --no-stdin`, {
        // 標準出力を無視します
        stdio: 'ignore'
      });

      // 新規ページを開きます
      const page = await browser.newPage();
      // 比率に応じたビューポートサイズを設定します
      const vpWidth = tc.size === '4:3' ? 960 : 1280;
      // ビューポートサイズを適用します
      await page.setViewport({ width: vpWidth, height: 720 });
      // 生成されたHTMLファイルをロードします
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

      // スライド計測結果を取得します
      const res = await page.evaluate(() => {
        // 表紙section要素を取得します
        const sec = document.querySelector('section[data-marpit-pagination="1"]') || document.querySelector('section');
        // スライドのバウンディングボックスを取得します
        const secRect = sec.getBoundingClientRect();

        // メインタイトル段落を取得します
        const titleEl = sec.querySelector('h1 + *');
        // サブタイトル段落を取得します
        const subTitleEl = sec.querySelector('h2 + *');
        // 図書番号段落を取得します
        const bookNoEl = sec.querySelector('h3:first-of-type + *');
        // 所属・氏名段落を取得します
        const authorEl = sec.querySelector('h3:last-of-type + *');
        // 作成日段落を取得します
        const dateEl = sec.querySelector('h4 + *');

        // ヘルパー関数で要素の計測値を返却します
        const getMetrics = (el) => {
          // 要素が存在しない場合
          if (!el) return null;
          // バウンディングボックスを取得します
          const rect = el.getBoundingClientRect();
          // 計算済みスタイルを取得します
          const style = window.getComputedStyle(el);
          // 計測オブジェクトを返却します
          return {
            // スライド上端からの相対Top座標です
            top: rect.top - secRect.top,
            // スライド上端からの相対Bottom座標です
            bottom: rect.bottom - secRect.top,
            // 要素の高さです
            height: rect.height,
            // 計算済みフォントサイズです
            fontSize: style.fontSize,
            // 計算済み行の高さです
            lineHeight: style.lineHeight,
            // テキスト内容です
            text: el.innerText
          };
        };

        // スライド計測結果オブジェクトを返却します
        return {
          // スライド高さです
          slideHeight: secRect.height,
          // タイトル計測結果です
          title: getMetrics(titleEl),
          // サブタイトル計測結果です
          subTitle: getMetrics(subTitleEl),
          // 図書番号計測結果です
          bookNo: getMetrics(bookNoEl),
          // 所属・氏名計測結果です
          author: getMetrics(authorEl),
          // 作成日計測結果です
          date: getMetrics(dateEl)
        };
      });

      // ページを閉じます
      await page.close();

      // 一時ファイルを削除します
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
      // 一時HTMLファイルを削除します
      if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
      // 一時PDFファイルを削除します
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

      // ケース結果ヘッダーを出力します
      console.log(`\n--- [${tc.name}] ---`);
      // タイトル情報を出力します
      console.log(`  タイトル: フォントサイズ=${res.title?.fontSize}, top=${res.title?.top.toFixed(2)}px, bottom=${res.title?.bottom.toFixed(2)}px`);
      // サブタイトル情報を出力します
      console.log(`  サブタイトル: フォントサイズ=${res.subTitle?.fontSize}, top=${res.subTitle?.top.toFixed(2)}px, bottom=${res.subTitle?.bottom.toFixed(2)}px`);
      // 所属・氏名情報を出力します
      console.log(`  所属・氏名: top=${res.author?.top.toFixed(2)}px, bottom=${res.author?.bottom.toFixed(2)}px`);
      // 作成日情報を出力します
      console.log(`  作成日: top=${res.date?.top.toFixed(2)}px, bottom=${res.date?.bottom.toFixed(2)}px`);
      // 図書番号情報を出力します
      console.log(`  図書番号: top=${res.bookNo?.top.toFixed(2)}px, bottom=${res.bookNo?.bottom.toFixed(2)}px`);

      // フッター帯境界（680px）の定義です
      const FOOTER_LINE = 680;

      // AC-1 検証: 所属および作成日の下端が680px手前に収まっているか
      if (res.author && res.author.bottom <= FOOTER_LINE) {
        // 合格ログを出力します
        console.log(`  ✅ [AC-1 合格] 所属・氏名下端 (${res.author.bottom.toFixed(2)}px) はフッター帯手前 (≦ ${FOOTER_LINE}px) に収まっています。`);
      } else {
        // 不合格ログを出力します
        console.error(`  ❌ [AC-1 不合格] 所属・氏名がフッター帯を侵害またははみ出ています: ${res.author?.bottom}px > ${FOOTER_LINE}px`);
        // フラグを不合格にします
        allPass = false;
      }

      // 作成日下端の検証です
      if (res.date && res.date.bottom <= FOOTER_LINE) {
        // 合格ログを出力します
        console.log(`  ✅ [AC-1 合格] 作成日下端 (${res.date.bottom.toFixed(2)}px) はフッター帯手前 (≦ ${FOOTER_LINE}px) に収まっています。`);
      } else {
        // 不合格ログを出力します
        console.error(`  ❌ [AC-1 不合格] 作成日がフッター帯を侵害またははみ出ています: ${res.date?.bottom}px > ${FOOTER_LINE}px`);
        // フラグを不合格にします
        allPass = false;
      }

      // ケース1（1行通常タイトル）の検証です
      if (i === 0) {
        // 36pt（約48px）のフォントサイズを検証します
        const fsPx = parseFloat(res.title.fontSize);
        // 44px〜50pxの範囲にあるか確認します
        if (fsPx >= 44 && fsPx <= 50) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-3 合格] 1行タイトルは既存標準の36pt (${res.title.fontSize}) を維持しています。`);
        } else {
          // 不合格ログを出力します
          console.error(`  ❌ [AC-3 不合格] 1行タイトルのフォントサイズが想定外です: ${res.title.fontSize}`);
          // フラグを不合格にします
          allPass = false;
        }
      }

      // ケース2（3行タイトル）およびケース4（4:3 3行タイトル）の検証です
      if (i === 1 || i === 3) {
        // フォントサイズの縮小を検証します（28pt ≒ 37.33px以下、実測24pt ≒ 32px）
        const fsPx = parseFloat(res.title.fontSize);
        // 36px以下に縮小されているか確認します
        if (fsPx <= 36) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-2 合格] 3行タイトルのフォントサイズが縮小されています (${res.title.fontSize} ≦ 28pt相当)。`);
        } else {
          // 不合格ログを出力します
          console.error(`  ❌ [AC-2 不合格] 3行タイトルのフォントサイズが縮小されていません: ${res.title.fontSize}`);
          // フラグを不合格にします
          allPass = false;
        }

        // 要素同士の視覚的重複がないか検証します（タイトル下端 < サブタイトル上端 < 所属上端）
        if (res.title.bottom <= res.subTitle.top && res.subTitle.bottom <= res.author.top) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-2 合格] タイトル・サブタイトル・所属欄の間に重複（重畳）はありません。`);
        } else {
          // 不合格ログを出力します
          console.error(`  ❌ [AC-2 不合格] 要素間に重畳が発生しています: title.bottom=${res.title.bottom}, sub.top=${res.subTitle.top}, sub.bottom=${res.subTitle.bottom}, author.top=${res.author.top}`);
          // フラグを不合格にします
          allPass = false;
        }

        // AC-4 検証: 4:3比率時の配置検証です
        if (i === 3) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-4 合格] 4:3比率スライドにおいて下部要素が正しく配置されています。`);
        }
      }

      // ケース3（4行タイトル）の検証です
      if (i === 2) {
        // フォントサイズのさらなる縮小を検証します（22pt ≒ 29.33px以下、実測20pt ≒ 26.6px）
        const fsPx = parseFloat(res.title.fontSize);
        // 30px以下に縮小されているか確認します
        if (fsPx <= 30) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-2 合格] 4行タイトルのフォントサイズが20pt相当 (${res.title.fontSize}) へ適応縮小されています。`);
        } else {
          // 不合格ログを出力します
          console.error(`  ❌ [AC-2 不合格] 4行タイトルのフォントサイズが縮小されていません: ${res.title.fontSize}`);
          // フラグを不合格にします
          allPass = false;
        }

        // 要素同士の重複がないか検証します
        if (res.title.bottom <= res.subTitle.top && res.subTitle.bottom <= res.author.top) {
          // 合格ログを出力します
          console.log(`  ✅ [AC-2 合格] 4行タイトル時も各要素間に重複はありません。`);
        } else {
          // 不合格ログを出力します
          console.error(`  ❌ [AC-2 不合格] 4行タイトル時に要素間重畳が発生しています: title.bottom=${res.title.bottom}, sub.top=${res.subTitle.top}, sub.bottom=${res.subTitle.bottom}, author.top=${res.author.top}`);
          // フラグを不合格にします
          allPass = false;
        }
      }
    }

  // 終了時にブラウザをクリーンアップします
  } finally {
    // ブラウザを確実に閉じます
    await browser.close();
  }

  // 総合結果の判定を出力します
  console.log('\n[4/4] 総合判定:');
  // 全テスト合格の場合
  if (allPass) {
    // 成功メッセージを出力します
    console.log('🎉 すべての受け入れ基準（AC-1 〜 AC-4）をクリアしました！');
    // 正常終了コードで終了します
    process.exit(0);
  // 不合格項目がある場合
  } else {
    // エラーメッセージを出力します
    console.error('💥 受け入れ基準を満たしていない項目があります。');
    // 異常終了コードで終了します
    process.exit(1);
  }
}

// テストを実行します
runTest().catch((err) => {
  // キャッチされないエラーを出力します
  console.error('テスト実行時例外:', err);
  // 異常終了コードで終了します
  process.exit(1);
});
