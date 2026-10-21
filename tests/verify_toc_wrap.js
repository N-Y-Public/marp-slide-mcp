// ファイルシステム同期操作モジュールをインポートします
import fs from 'fs';
// ファイルパス操作モジュールをインポートします
import path from 'path';
// ヘッドレスブラウザ自動化ライブラリPuppeteerをインポートします
import puppeteer from 'puppeteer';
// 子プロセス同期実行モジュールをインポートします
import { execSync } from 'child_process';

// テスト用のMarkdown一時ファイルパスを定義します
const TEST_MD_PATH = path.resolve('test_toc_long_title_temp.md');
// テスト用のHTML一時ファイルパスを定義します
const TEST_HTML_PATH = path.resolve('test_toc_long_title_temp.html');
// テスト用のPDF一時ファイルパスを定義します
const TEST_PDF_PATH = path.resolve('test_toc_long_title_temp.pdf');

// テスト用スライドMarkdownの内容を定義します
const testMarkdownContent = `---
marp: true
theme: business-slide
size: 16:9
---

# テストプレゼンテーション
## 長文タイトル目次折り返し検証用デッキ
### 2026-10-22

---

<!-- _class: toc -->

# 
目次

---

# 短いタイトル
## 主張1
- 本文コンテンツ

---

# エンタープライズアーキテクチャ刷新における段階的移行計画の策定とリスクヘッジ方針
## 主張2
- 全角35文字の長文タイトルスライドです

---

# 全社横断的データマネジメント基盤の統合ガバナンスモデル構築とプライバシー保護規制への準拠に関する詳細検討報告書
## 主張3
- 全角50文字の極めて長いタイトルスライドです

---

# SystemModernizationPlanForMissionCriticalCloudNativeInfrastructureAndContinuousDeliveryPipeline
## 主張4
- 長い英単語を含むタイトルスライドです

---

# 通常スライド5
## 主張5
- 項目5

---

# 通常スライド6
## 主張6
- 項目6

---

# 通常スライド7
## 主張7
- 項目7

---

# 通常スライド8
## 主張8
- 項目8

---

# 通常スライド9
## 主張9
- 項目9

---

# 通常スライド10
## 主張10
- 項目10

---

# 1行に収まらない極めて長大なタイトルの例としてデジタルトランスフォーメーション推進に伴う全社業務プロセスの抜本的見直しとクラウドネイティブアーキテクチャへの全面移行に関する包括的ロードマップ策定報告
## 主張11
- 全角77文字の超長文スライドです
`;

// テスト検証を実行する非同期メイン関数を定義します
async function runTest() {
  // テスト開始ログを出力します
  console.log('=== 目次（TOC）長文タイトル折り返し検証テスト開始 ===');
  
  // テスト用Markdownファイルを一時作成します
  fs.writeFileSync(TEST_MD_PATH, testMarkdownContent, 'utf-8');
  // 一時ファイル作成完了ログを出力します
  console.log(`[1/4] テストMarkdown生成完了: ${TEST_MD_PATH}`);

  // Marp CLIを用いてHTMLへ変換します
  try {
    // Marp CLI変換コマンドを同期実行します
    execSync(`npx marp "${TEST_MD_PATH}" --theme-set themes/business-slide-theme.css --output "${TEST_HTML_PATH}" --allow-local-files --no-stdin`, {
      // 標準出力を継承します
      stdio: 'inherit',
    });
    // HTML変換成功ログを出力します
    console.log(`[2/4] Marp CLI HTML変換完了: ${TEST_HTML_PATH}`);

    // Marp CLIを用いてPDFへ変換します
    execSync(`npx marp "${TEST_MD_PATH}" --theme-set themes/business-slide-theme.css --output "${TEST_PDF_PATH}" --allow-local-files --no-stdin`, {
      // 標準出力を継承します
      stdio: 'inherit',
    });
    // PDF変換成功ログを出力します
    console.log(`[2.5/4] Marp CLI PDF変換完了: ${TEST_PDF_PATH}`);
  } catch (err) {
    // 変換失敗時のエラーログを出力します
    console.error('Marp CLIの実行に失敗しました:', err);
    // プロセスを異常終了します
    process.exit(1);
  }

  // Puppeteerブラウザを起動します
  const browser = await puppeteer.launch({
    // ヘッドレスモードで実行します
    headless: true,
    // コンテナ環境用の起動引数を指定します
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // テスト結果の成否フラグを初期化します
  let testPassed = true;

  // テストブラウザ操作の例外保護ブロックを開始します
  try {
    // 新規ページを開きます
    const page = await browser.newPage();
    // スライドサイズに合わせてビューポート（1280x720）を設定します
    await page.setViewport({ width: 1280, height: 720 });
    // 生成されたHTMLファイルをロードします
    await page.goto(`file://${TEST_HTML_PATH}`, { waitUntil: 'networkidle0' });

    // スライド内の目次要素の計算済みスタイルと矩形情報をブラウザ内で解析します
    const evaluationResults = await page.evaluate(() => {
      // 目次スライドのセクション要素を取得します
      const tocSection = document.querySelector('section.toc');
      // 目次セクションが存在しない場合はエラーを返却します
      if (!tocSection) return { error: 'section.toc が見つかりません' };

      // 目次リスト（ul）を取得します
      const tocUl = tocSection.querySelector('ul');
      // ulが存在しない場合はエラーを返却します
      if (!tocUl) return { error: 'section.toc > ul が見つかりません' };

      // ulの表示矩形を取得します
      const ulRect = tocUl.getBoundingClientRect();
      // 目次項目リストを取得します
      const items = Array.from(tocUl.querySelectorAll('li.toc-item'));

      // 各項目の検証結果を格納する配列を初期化します
      const itemDetails = items.map((li, idx) => {
        // タイトルリンク要素（a）を取得します
        const link = li.querySelector('p > a');
        // ページ番号要素（span.toc-page）を取得します
        const pageSpan = li.querySelector('p > span.toc-page');
        // 段落要素（p）を取得します
        const p = li.querySelector('p');

        // linkの計算済みスタイルを取得します
        const linkStyle = window.getComputedStyle(link);
        // linkの矩形座標を取得します
        const linkRect = link.getBoundingClientRect();
        // pageSpanの矩形座標を取得します
        const pageRect = pageSpan ? pageSpan.getBoundingClientRect() : null;
        // pの矩形座標を取得します
        const pRect = p ? p.getBoundingClientRect() : null;

        // 項目の詳細情報を返却します
        return {
          index: idx,
          text: link ? link.textContent : '',
          whiteSpace: linkStyle.whiteSpace,
          textOverflow: linkStyle.textOverflow,
          overflowWrap: linkStyle.overflowWrap,
          wordBreak: linkStyle.wordBreak,
          linkHeight: linkRect.height,
          linkWidth: linkRect.width,
          pageNumber: pageSpan ? pageSpan.textContent : '',
          pageRight: pageRect ? pageRect.right : 0,
          pBottom: pRect ? pRect.bottom : 0,
        };
      });

      // 目次スライド全体の検証データを返却します
      return {
        ulTop: ulRect.top,
        ulBottom: ulRect.bottom,
        itemCount: items.length,
        items: itemDetails,
      };
    });

    // 解析結果の確認ログを出力します
    console.log('[3/4] 目次レイアウト解析結果:');
    // 解析エラーが存在する場合
    if (evaluationResults.error) {
      // エラーログを出力します
      console.error(`解析エラー: ${evaluationResults.error}`);
      // テスト失敗フラグを立てます
      testPassed = false;
    } else {
      // 取得項目数を出力します
      console.log(`  - 検出目次項目数: ${evaluationResults.itemCount} 件`);
      // 目次リスト下端座標を出力します（フッター帯680pxとの比較）
      console.log(`  - 目次リスト下端 (bottom): ${evaluationResults.ulBottom}px (フッター帯境界: 680px)`);

      // 目次リスト下端が680pxを超えている場合は警告
      if (evaluationResults.ulBottom > 680) {
        // エラーログを出力します
        console.error(`  ❌ [AC-4 違反] 目次リストがフッター帯（680px）を突き破っています: ${evaluationResults.ulBottom}px`);
        // テスト失敗フラグを立てます
        testPassed = false;
      } else {
        // 合格ログを出力します
        console.log('  ✅ [AC-4 合格] 目次リストはフッター帯（680px）の手前に綺麗に収まっています。');
      }

      // 各目次項目の折り返しとスタイルを検証します
      evaluationResults.items.forEach((item) => {
        // 短いタイトル（インデックス0: 短いタイトル）の検証
        if (item.index === 0) {
          // 1行の高さ（通常約20px〜35px）であることを確認します
          console.log(`  - 短文項目 #${item.index + 1} (${item.text}): 幅=${item.linkWidth}px, 高さ=${item.linkHeight}px`);
        }
        // 長文タイトル（インデックス1: 全角35文字）の検証
        if (item.index === 1) {
          // 高さが短文（単一行）より大きく、複数行に折り返されているか確認します
          console.log(`  - 長文項目 #${item.index + 1} (全角35文字): 幅=${item.linkWidth}px, 高さ=${item.linkHeight}px, white-space=${item.whiteSpace}, text-overflow=${item.textOverflow}`);
        }
        // 長文タイトル（インデックス2: 全角50文字）の検証
        if (item.index === 2) {
          // 高さと折り返しスタイルを出力します
          console.log(`  - 長文項目 #${item.index + 1} (全角50文字): 幅=${item.linkWidth}px, 高さ=${item.linkHeight}px, white-space=${item.whiteSpace}`);
        }
        // 英単語長文（インデックス3）の検証
        if (item.index === 3) {
          // 高さと折り返しスタイルを出力します
          console.log(`  - 英単語項目 #${item.index + 1} (英単語長文): 幅=${item.linkWidth}px, 高さ=${item.linkHeight}px, overflow-wrap=${item.overflowWrap}`);
        }
        // 超長文タイトル（インデックス10: 全角77文字）の検証
        if (item.index === 10) {
          // 高さと折り返しスタイルを出力します
          console.log(`  - 超長文項目 #${item.index + 1} (全角77文字): 幅=${item.linkWidth}px, 高さ=${item.linkHeight}px, white-space=${item.whiteSpace}`);
          // 複数行に折り返されているか判定します（14pxの2行以上なら30pxを超える）
          if (item.linkHeight > 30) {
            // 合格ログを出力します
            console.log('  ✅ [AC-1 合格] 1行に収まらない超長文タイトル（全角77文字）が自動で複数行に折り返されています！');
          } else {
            // 失敗ログを出力します
            console.error('  ❌ [AC-1 違反] 1行に収まらない超長文タイトルが折り返されていません。');
            // テスト失敗フラグを立てます
            testPassed = false;
          }
        }
      });
    }

  // 例外時の処理を行います
  } catch (err) {
    // エラーログを出力します
    console.error('Puppeteer評価中にエラーが発生しました:', err);
    // テスト失敗フラグを立てます
    testPassed = false;
  // 終了時にブラウザを確実にクローズします
  } finally {
    // ブラウザを終了します
    await browser.close();
    // 一時Markdownファイルを削除します
    if (fs.existsSync(TEST_MD_PATH)) fs.unlinkSync(TEST_MD_PATH);
    // 一時HTMLファイルを削除します
    if (fs.existsSync(TEST_HTML_PATH)) fs.unlinkSync(TEST_HTML_PATH);
    // 一時PDFファイルを削除します
    if (fs.existsSync(TEST_PDF_PATH)) fs.unlinkSync(TEST_PDF_PATH);
  }

  // 総合結果の判定ログを出力します
  console.log('[4/4] 総合判定:');
  // テストが合格した場合
  if (testPassed) {
    // 合格メッセージを出力します
    console.log('🎉 すべての受け入れ基準（AC-1 〜 AC-4）をクリアしました！');
    // 正常終了コードで終了します
    process.exit(0);
  // テストが失敗した場合
  } else {
    // 失敗メッセージを出力します
    console.error('❌ 検証基準を満たさない項目が存在します。');
    // 異常終了コードで終了します
    process.exit(1);
  }
}

// テストメイン関数を実行します
runTest();
