// Model Context Protocol (MCP) SDK からサーバー本体クラスをインポートします
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// 標準入出力（stdio）を使用したトランスポート層をインポートします
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// データスキーマ定義およびバリデーション用のZodライブラリをインポートします
import { z } from "zod";
// 非同期ファイルシステム操作モジュールをインポートします
import * as fs from "fs/promises";
// ファイルパス操作モジュールをインポートします
import * as path from "path";
// ユニークID生成用の暗号化モジュールをインポートします
import crypto from "crypto";
// ESモジュールにおけるURLとファイルパスの相互変換関数をインポートします
import { fileURLToPath } from "url";
// Marp Coreライブラリ（Markdownからスライドを生成するエンジン）をインポートします
import { Marp } from "@marp-team/marp-core";
// ヘッドレスブラウザ制御用のPuppeteerをインポートします
import puppeteer from "puppeteer";
// Marpのカスタムエンジン設定をインポートします
// @ts-ignore
import marpConfig from "../marp.config.js";

// Marp CLI および Headless Chromium のサンドボックス制約回避フラグを確実に有効化します
if (!process.env.CHROME_NO_SANDBOX) {
  // 環境変数 CHROME_NO_SANDBOX を 1 に設定します
  process.env.CHROME_NO_SANDBOX = "1";
}

// CHROME_PATH が未設定の場合は Puppeteer のブラウザパスまたはシステム Chromium を自動補完します
if (!process.env.CHROME_PATH) {
  // Puppeteer 内蔵のブラウザパス取得を試みます
  try {
    // 実行可能ブラウザパスを取得します
    const pPath = puppeteer.executablePath();
    // 同期ファイルシステムモジュールをインポートします
    const fsSync = await import("fs");
    // パスが存在するか確認します
    if (fsSync.existsSync(pPath)) {
      // 環境変数 CHROME_PATH に設定します
      process.env.CHROME_PATH = pPath;
    }
  // 例外時は握りつぶして次の候補を探索します
  } catch (e) {}

  // 未設定の場合、Linux 環境（Docker Dev Container等）の Chromium パスを探索します
  if (!process.env.CHROME_PATH) {
    // キャッシュディレクトリの走査を試みます
    try {
      // 同期ファイルシステムモジュールをインポートします
      const fsSync = await import("fs");
      // Puppeteer のキャッシュベースディレクトリパスです
      const cacheBase = "/home/node/.cache/puppeteer/chrome";
      // ディレクトリが存在する場合
      if (fsSync.existsSync(cacheBase)) {
        // 保存されているバージョン一覧を取得します
        const versions = fsSync.readdirSync(cacheBase);
        // 各バージョンディレクトリを走査します
        for (const v of versions) {
          // Chrome 実行バイナリのパス候補を構築します
          const candidate = path.join(cacheBase, v, "chrome-linux64", "chrome");
          // 候補ファイルが存在する場合
          if (fsSync.existsSync(candidate)) {
            // 環境変数 CHROME_PATH に設定します
            process.env.CHROME_PATH = candidate;
            // 探索ループを終了します
            break;
          }
        }
      }
      // システム標準の Chromium パスが存在する場合はそれをフォールバックとして採用します
      if (!process.env.CHROME_PATH && process.platform === "linux" && fsSync.existsSync("/usr/bin/chromium")) {
        // 環境変数 CHROME_PATH に設定します
        process.env.CHROME_PATH = "/usr/bin/chromium";
      }
    // 探索失敗時は例外をキャッチします
    } catch (e) {}
  }
}

// 現在の実行ファイルパスを取得します
const __filename = fileURLToPath(import.meta.url);
// 現在の実行ディレクトリパスを取得します
const __dirname = path.dirname(__filename);
// プロジェクトルートディレクトリの絶対パスを解決します
const ROOT_DIR = path.resolve(__dirname, "..");
// スライド成果物を保存するベースディレクトリパス（slides/）です
const SLIDES_DIR = path.join(ROOT_DIR, "slides");
// 生成されたスライド成果物を保存する出力ディレクトリパスです（互換性維持用）
const OUTPUT_DIR = path.join(ROOT_DIR, "output");

// 出力先ディレクトリが存在しない場合に自動生成する関数です
async function ensureOutputDir(dirPath: string = SLIDES_DIR) {
  // ディレクトリ作成を試みます
  try {
    // 再帰的にディレクトリを作成します
    await fs.mkdir(dirPath, { recursive: true });
  // 既に存在する場合などの例外を安全に処理します
  } catch (e) {}
}

// 表紙（タイトルスライド）のデータ構造スキーマを定義します
const TitleSlideSchema = z.object({
  // メインタイトル（36pt）の文字列です
  mainTitle: z.string().describe("メインタイトル（36pt）"),
  // サブタイトル（20pt）の文字列です
  subTitle: z.string().describe("サブタイトル（20pt）"),
  // 資料の図書番号または管理番号です
  bookNo: z.string().describe("図書番号"),
  // 発表者の所属・氏名・制作元等の情報です
  author: z.string().describe("所属・氏名・制作元等"),
  // 資料の作成日（任意）です
  date: z.string().optional().describe("作成日・日付（任意）"),
  // 著作権・コピーライト表記です（デフォルト値: © 2026 N-Y-Public）
  copyright: z.string().default("© 2026 N-Y-Public").describe("コピーライト"),
  // 資料の機密区分です（デフォルト値: CONFIDENTIAL）
  confidentiality: z.string().default("CONFIDENTIAL").describe("機密指定"),
});

// 2段組（左右2カラム）レイアウト用のデータスキーマを定義します
const TwoColumnContentSchema = z.object({
  // 左カラムに配置するMarkdownコンテンツです
  leftContent: z.string().describe("左カラムのMarkdownコンテンツ（テキスト、箇条書き、Mermaid図、コードブロック等）"),
  // 右カラムに配置するMarkdownコンテンツです
  rightContent: z.string().describe("右カラムのMarkdownコンテンツ（テキスト、箇条書き、Mermaid図、コードブロック等）"),
});

// 画像横並びグリッドレイアウト用の画像単体スキーマを定義します
const ImageGridItemSchema = z.object({
  // 画像ファイルの相対/絶対パスまたはWeb URLです
  imagePath: z.string().describe("画像ファイルのパスまたはURL（例: '../slides/sample.svg'）"),
  // 画像の下部に表示するキャプションテキスト（任意）です
  caption: z.string().optional().describe("画像下部に表示するタイトル/キャプション"),
  // 画像の代替テキスト（アクセシビリティ対応）です
  alt: z.string().optional().describe("画像の代替テキスト"),
});

// 2枚目以降の通常コンテンツスライドのデータスキーマを定義します
const NormalSlideSchema = z.object({
  // ページタイトル（最大60文字）です
  pageTitle: z.string().max(60).describe("ページタイトル（60文字以内）"),
  // スライドの主要な主張（グレー帯部分、最大250文字）です
  claim: z.string().max(250).default(" ").describe("ページ主張（250文字以内。箇条書きも可。wide-content時は空文字または省略可）"),
  // 主張の補足タイトルまたは図表タイトル（最大60文字）です
  chartTitle: z.string().max(60).default(" ").describe("主張補足タイトル / 図表タイトル（60文字以内）"),
  // 本文Markdownコンテンツです（直接記述する場合に使用）
  bodyContent: z.string().max(1500).optional().describe("本文（直接Markdownを記述する場合。twoColumnsやimageGridを指定する場合は省略可）"),
  // 2段組レイアウト用の構造化コンテンツです
  twoColumns: TwoColumnContentSchema.optional().describe("2段組レイアウト用の構造化コンテンツ（指定時は自動でcolumns-2クラスと2カラムMarkdownが適用されます）"),
  // 画像横並びレイアウト用の画像配列です
  imageGrid: z.array(ImageGridItemSchema).optional().describe("画像横並びレイアウト用の画像配列（指定時は自動でimages-Nクラスと画像Markdownが適用されます）"),
  // 図表の出典や脚注情報（任意）です
  source: z.string().optional().describe("図表出典（任意）"),
  // 著作権・コピーライト表記です（デフォルト値: © 2026 N-Y-Public）
  copyright: z.string().default("© 2026 N-Y-Public").describe("コピーライト"),
  // 機密区分表記です（デフォルト値: CONFIDENTIAL）
  confidentiality: z.string().default("CONFIDENTIAL").describe("機密指定"),
  // スライドに適用するカスタムCSSクラス配列です
  classes: z.array(z.string()).optional().describe(
    "適用するCSSクラス配列。例: ['wide-content', 'table-4', 'text-3']\n" +
    "レイアウト: 'wide-content', 'conversation-content', 'toc', 'columns-2' (2段組), 'images-2' (画像2枚並列), 'images-3' (画像3枚並列)\n" +
    "サイズ調整（1〜10段階。1が最大・標準、数字が大きいほど縮小、10が極小）: 'table-1'〜'table-10', 'text-1'〜'text-10', 'mermaid-1'〜'mermaid-10', 'img-1'〜'img-10', 'code-1'〜'code-10', 'claim-1'〜'claim-8' 等（従来の 'table-sm', 'dense' 等も互換維持）"
  ),
});

// スライドデッキ全体（表紙＋通常スライド群）のデータスキーマを定義します
const SlideDeckSchema = z.object({
  // スライドのアスペクト比（4:3 または 16:9、デフォルトは 4:3）です
  size: z.enum(["4:3", "16:9"]).default("4:3").optional().describe("スライドの比率（'4:3' または '16:9'。デフォルトは '4:3'）"),
  // 全ページ共通のヘッダーロゴ画像パスです
  logoPath: z.string().optional().describe("ヘッダーロゴ画像のパス"),
  // 表紙バナー画像（URL、相対パス、Base64 Data URI、または 'none'）です
  banner: z.string().optional().describe("表紙バナー画像の指定（Web URL、相対パス、Base64 Data URI、または 'none' でバナー非表示）"),
  // 全体のテーマカラー（例: '#1f497d', '#2e7d32'）です
  themeColor: z.string().optional().describe("スライドのテーマカラー（例: '#1f497d', '#2e7d32'）"),
  // 表紙スライドのデータです
  titleSlide: TitleSlideSchema,
  // 2枚目以降の通常スライド配列です
  normalSlides: z.array(NormalSlideSchema),
});

// スライドデッキのTypeScript型定義を推論します
type SlideDeck = z.infer<typeof SlideDeckSchema>;

// スライド本文およびクラスの解決（構造化データと直接指定の統合）を行う関数です
function resolveSlideContent(slide: z.infer<typeof NormalSlideSchema>): { bodyContent: string; classes: string[] } {
  // 指定されたクラス配列をコピーして初期化します
  let classes = slide.classes ? [...slide.classes] : [];
  // 本文文字列を取得します
  let body = slide.bodyContent || "";

  // 2段組（左右2カラム）レイアウトが指定されている場合
  if (slide.twoColumns) {
    // 2カラム用クラスが未付与であれば追加します
    if (!classes.includes("columns-2") && !classes.includes("layout-2col")) {
      // columns-2 クラスを追加します
      classes.push("columns-2");
    }
    // 左カラムの各行をインデント整形します
    const leftLines = slide.twoColumns.leftContent.trim().split("\n").map((l, idx) => idx === 0 ? l : `  ${l}`).join("\n");
    // 右カラムの各行をインデント整形します
    const rightLines = slide.twoColumns.rightContent.trim().split("\n").map((l, idx) => idx === 0 ? l : `  ${l}`).join("\n");
    // 左右カラムをMarkdownの箇条書き構造として結合します
    body = `- ${leftLines}\n\n- ${rightLines}`;
  // 画像横並びグリッドレイアウトが指定されている場合
  } else if (slide.imageGrid && slide.imageGrid.length > 0) {
    // 画像枚数をカウントします
    const count = slide.imageGrid.length;
    // 枚数に応じたCSSクラス名を決定します（2〜4枚は専用クラス、それ以外は共通行クラス）
    const imgClass = count >= 2 && count <= 4 ? `images-${count}` : "images-row";
    // 画像配置クラスが未指定であれば追加します
    if (!classes.some(c => c.startsWith("images-"))) {
      // クラス配列に追加します
      classes.push(imgClass);
    }
    // 各画像をMarkdown画像記法に整形して結合します
    body = slide.imageGrid.map(item => {
      // 代替テキストを取得します
      const alt = item.alt || "";
      // キャプションが存在する場合は太字テキストを付与します
      const cap = item.caption ? `\n  **${item.caption}**` : "";
      // 箇条書き画像構文として整形します
      return `- ![${alt}](${item.imagePath})${cap}`;
    // 段落ごとに空行で区切ります
    }).join("\n\n");
  }

  // ページタイトルの前後空白を除去して小文字化した文字列を取得します
  const normalizedTitle = slide.pageTitle.trim().toLowerCase();
  // ページタイトルが目次に該当するか判定します
  const isTocTitle = normalizedTitle === "目次" || normalizedTitle === "table of contents";
  // 本文および構造化コンテンツがすべて空であるか判定します
  const isBodyEmpty = !body.trim() && !slide.twoColumns && (!slide.imageGrid || slide.imageGrid.length === 0);
  // 目次タイトルかつ本文が空で、tocクラスが未指定の場合は自動付与します
  if (isTocTitle && isBodyEmpty && !classes.includes("toc")) {
    // 自動目次生成用のtocクラスを追加します
    classes.push("toc");
  }

  // 解決された本文とクラス配列を返却します
  return { bodyContent: body, classes };
}

// スライドデッキ構造化データからMarp形式のMarkdownテキストを生成する関数です
function generateMarpMarkdown(deck: SlideDeck): string {
  // ヘッダーロゴ指定がある場合はMarpのheaderディレクティブを生成します
  const headerDirective = deck.logoPath ? `\nheader: '![](${deck.logoPath})'` : "";
  
  // スタイル定義（テーマカラー & バナー）のCSSプロパティ配列を初期化します
  const rootStyles: string[] = [];
  // テーマカラーが指定されている場合
  if (deck.themeColor) {
    // --primary-color CSS変数を定義します
    rootStyles.push(`  --primary-color: ${deck.themeColor};`);
  }
  // バナー指定が存在する場合
  if (deck.banner !== undefined && deck.banner !== null) {
    // 余白を除去します
    const trimmed = deck.banner.trim();
    // none の場合はバナー非表示プロパティを設定します
    if (trimmed.toLowerCase() === "none") {
      // バナー画像をnoneに設定します
      rootStyles.push(`  --banner-image: none;`);
    // url(...) 形式または data: 形式の場合
    } else if (trimmed.startsWith("url(") || trimmed.startsWith("data:")) {
      // 既にurl()で囲まれていればそのまま、data:ならurl()で囲みます
      const bannerVal = trimmed.startsWith("url(") ? trimmed : `url('${trimmed}')`;
      // --banner-image CSS変数を設定します
      rootStyles.push(`  --banner-image: ${bannerVal};`);
    // 相対パス等の場合はurl()形式に整形して設定します
    } else {
      // --banner-image CSS変数を設定します
      rootStyles.push(`  --banner-image: url('${trimmed}');`);
    }
  }
  // カスタムスタイル定義が存在する場合は :root ブロックを構築します
  const customStyles = rootStyles.length > 0 ? `\n\n:root {\n${rootStyles.join("\n")}\n}` : "";
  // 作成日が指定されている場合は日付セクション文字列を構築します
  const dateSection = deck.titleSlide.date ? `\n#### 作成日\n${deck.titleSlide.date}\n` : "";
  // アスペクト比の値を取得します（未指定時は 4:3）
  const sizeValue = deck.size || "4:3";

  // スライド冒頭のフロントマターおよび表紙スライドMarkdownを生成します
  let md = `---
marp: true
theme: business-slide
size: ${sizeValue}
paginate: true${headerDirective}
---

<style>
@import '../../themes/business-slide-theme.css';${customStyles}
</style>

<script defer src="../../themes/vendor/mermaid.min.js"></script>
<script defer src="../../themes/vendor/marp-mermaid-loader.js"></script>

# タイトル
${deck.titleSlide.mainTitle}

## サブタイトル
${deck.titleSlide.subTitle}

### 図書番号
${deck.titleSlide.bookNo}

### 所属・氏名・制作元等
${deck.titleSlide.author}
${dateSection}
###### コピーライト
${deck.titleSlide.copyright || "© 2026 N-Y-Public"}

###### 機密指定
${deck.titleSlide.confidentiality || "CONFIDENTIAL"}

---
`;

  // 2枚目以降の通常スライドを順次Markdownに追加します
  for (let i = 0; i < deck.normalSlides.length; i++) {
    // 現在の対象スライドを取得します
    const slide = deck.normalSlides[i];
    // 本文および適用クラスを解決します
    const { bodyContent, classes } = resolveSlideContent(slide);
    // クラス指定が存在する場合
    if (classes.length > 0) {
      // Marpクラスディレクティブを挿入します
      md += `<!-- _class: ${classes.join(" ")} -->\n\n`;
    }
    // スライド各セクションのMarkdownを組み立てます
    md += `# ページタイトル
${slide.pageTitle}

## ページ主張
${slide.claim || " "}

### 主張補足タイトル
${slide.chartTitle || " "}

#### 本文
${bodyContent}

##### 図表出典
${slide.source || " "}

###### コピーライト
${slide.copyright || "© 2026 N-Y-Public"}

###### 機密指定
${slide.confidentiality || "CONFIDENTIAL"}
`;
    // 最終スライドでなければ改ページ記号（---）を挿入します
    if (i < deck.normalSlides.length - 1) {
      // 改ページ記号を追加します
      md += `\n---\n`;
    }
  }
  // 完成したMarkdownテキストを返却します
  return md;
}

// MCP stdio 通信（JSON-RPC）の保護：ログ出力を stderr にリダイレクトします
console.log = (...args: any[]) => {
  // 標準エラー出力へログを書き出します
  process.stderr.write(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n");
};
// infoログも同様に stderr へリダイレクトします
console.info = (...args: any[]) => {
  // 標準エラー出力へログを書き出します
  process.stderr.write(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ") + "\n");
};

// Marp CLI モジュールをインポートします
import { marpCli } from "@marp-team/marp-cli";

// Marp CLI 出力の安全実行ラッパー（stdout の完全保護）関数です
async function runMarpCliSafe(args: string[]): Promise<number> {
  // 元の stdout.write 関数を退避します
  const origStdoutWrite = process.stdout.write;
  // 安全な実行ブロックを開始します
  try {
    // marpCli 実行中のすべての stdout 出力を stderr にバイパスします
    process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
      // 標準エラー出力へバイパスします
      return process.stderr.write(chunk, encoding, callback);
    // 型安全のためのキャストです
    }) as any;

    // Marp CLI を実行して終了コードを返却します
    return await marpCli(args);
  // エラー発生時のハンドリングです
  } catch (err) {
    // 標準エラー出力にエラー内容を書き込みます
    process.stderr.write(`marpCli error: ${err}\n`);
    // エラーを再スローします
    throw err;
  // 処理終了時のクリーンアップです
  } finally {
    // 退避していた元の stdout.write を復元します
    process.stdout.write = origStdoutWrite;
  }
}

// Marp CLI による公式高精度 PDF/HTML 出力関数です
async function renderMarkdownToHtmlAndPdf(mdFilepath: string, htmlFilepath: string, pdfFilepath: string) {
  // marp.config.js の絶対パスを解決します
  const configPath = path.join(ROOT_DIR, "marp.config.js");
  // business-slide-theme.css の絶対パスを解決します
  const themePath = path.join(ROOT_DIR, "themes", "business-slide-theme.css");

  // 1. PDF出力 (Marp CLI を安全に実行)
  await runMarpCliSafe([
    // 入力Markdownファイルパス
    mdFilepath,
    // カスタム設定ファイル引数
    "--config-file", configPath,
    // テーマスタイルシート引数
    "--theme-set", themePath,
    // HTMLタグの許可オプション
    "--html",
    // ローカルファイルアクセスの許可オプション
    "--allow-local-files",
    // PDF出力モード指定
    "--pdf",
    // 出力先ファイルパス引数
    "--output", pdfFilepath,
    // 非対話実行時の標準入力待機を防止するオプションです
    "--no-stdin",
  ]);

  // 2. HTML出力 (Marp CLI を安全に実行)
  await runMarpCliSafe([
    // 入力Markdownファイルパス
    mdFilepath,
    // カスタム設定ファイル引数
    "--config-file", configPath,
    // テーマスタイルシート引数
    "--theme-set", themePath,
    // HTMLタグの許可オプション
    "--html",
    // ローカルファイルアクセスの許可オプション
    "--allow-local-files",
    // 出力先ファイルパス引数
    "--output", htmlFilepath,
    // 非対話実行時の標準入力待機を防止するオプションです
    "--no-stdin",
  ]);
}

// JSONマスター保存とPDF/HTML再ビルド共通処理関数です
async function saveDeckAndRebuild(fileId: string, deck: SlideDeck) {
  // 資料ごとの専用ディレクトリ（slides/<fileId>/）を確保します
  const deckDir = path.join(SLIDES_DIR, fileId);
  // ディレクトリが存在しない場合は自動作成します
  await ensureOutputDir(deckDir);

  // 保存先JSONファイルパスを構築します
  const jsonFilepath = path.join(deckDir, `${fileId}.json`);
  // 保存先Markdownファイルパスを構築します
  const mdFilepath = path.join(deckDir, `${fileId}.md`);
  // 保存先PDFファイルパスを構築します
  const pdfFilepath = path.join(deckDir, `${fileId}.pdf`);
  // 保存先HTMLファイルパスを構築します
  const htmlFilepath = path.join(deckDir, `${fileId}.html`);

  // 1. JSON保存（マスターデータ）
  await fs.writeFile(jsonFilepath, JSON.stringify(deck, null, 2), "utf-8");

  // 2. Markdown生成・保存
  const markdownContent = generateMarpMarkdown(deck);
  // Markdownファイルを出力先に保存します
  await fs.writeFile(mdFilepath, markdownContent, "utf-8");

  // 3. Marp CLI による HTML / PDF 生成
  await renderMarkdownToHtmlAndPdf(mdFilepath, htmlFilepath, pdfFilepath);

  // 各種生成パス情報をオブジェクトとして返却します
  return { fileId, deckDir, jsonFilepath, mdFilepath, pdfFilepath, htmlFilepath };
}

// 保存されたJSONマスターデータからスライドデッキを読み込む関数です
async function loadDeck(fileId: string): Promise<SlideDeck> {
  // 1. 専用ディレクトリ slides/<fileId>/<fileId>.json を優先探索します
  let jsonFilepath = path.join(SLIDES_DIR, fileId, `${fileId}.json`);
  // 専用ディレクトリ内の存在確認を試みます
  try {
    // ファイルへのアクセス可否を確認します
    await fs.access(jsonFilepath);
  // 見つからない場合は従来の平坦配置へフォールバックします
  } catch {
    // 2. 従来の平坦配置 slides/<fileId>.json または output/<fileId>.json へのフォールバックパスです
    const fallbackSlides = path.join(SLIDES_DIR, `${fileId}.json`);
    // 平坦配置でのアクセス確認を試みます
    try {
      // ファイルへのアクセス可否を確認します
      await fs.access(fallbackSlides);
      // アクセス可能な場合はパスを更新します
      jsonFilepath = fallbackSlides;
    // それでも見つからない場合は従来のoutputディレクトリを参照します
    } catch {
      // outputディレクトリ配下のパスを設定します
      jsonFilepath = path.join(OUTPUT_DIR, `${fileId}.json`);
    }
  }
  // JSONファイルを非同期で読み込みます
  const data = await fs.readFile(jsonFilepath, "utf-8");
  // JSONをパースして型キャストして返却します
  return JSON.parse(data) as SlideDeck;
}

// MCPサーバーインスタンスを新規作成して初期化します
const server = new McpServer({
  // サーバーの名称を定義します
  name: "custom-marp-deck-manager",
  // サーバーのバージョン番号を定義します
  version: "1.0.0",
});

// 1. 新規スライドデッキ作成ツールを登録します
server.tool(
  // ツール名を指定します
  "generate_slide_deck",
  // ツールの説明文を記述します
  "スライド全体の構造化データを受け取り、新規にMarkdownとPDFを生成します。",
  // 引数パラメータのスキーマ定義です
  {
    // 表紙の入力スキーマです
    titleSlide: TitleSlideSchema.describe("表紙の情報"),
    // 2枚目以降のスライド配列スキーマです
    normalSlides: z.array(NormalSlideSchema).describe("2枚目以降の通常スライド配列"),
    // スライド比率の選択肢スキーマです
    size: z.enum(["4:3", "16:9"]).optional().describe("スライドの縦横比率（'4:3' または '16:9'。デフォルト: '4:3'）"),
    // 共通ヘッダーロゴのパススキーマです
    logoPath: z.string().optional().describe("共通ヘッダーロゴのパス（例: '../slides/N-Y-Public_Logo.jpg'）"),
    // テーマカラースキーマです
    themeColor: z.string().optional().describe("スライドのテーマカラー（HEX値またはCSS色指定。例: '#1f497d', '#2e7d32'）"),
    // ファイル名プレフィックススキーマです
    filenamePrefix: z.string().optional().describe("ファイル名プレフィックス"),
  },
  // ツールの実行ハンドラー関数です
  async ({ titleSlide, normalSlides, size, logoPath, themeColor, filenamePrefix }) => {
    // 処理ブロックを開始します
    try {
      // プレフィックスを決定します（未指定時は 'slide'）
      const prefix = filenamePrefix || "slide";
      // ランダム文字列を付与してユニークなファイルIDを生成します
      const fileId = `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
      // デッキオブジェクトを構築します
      const deck: SlideDeck = { size: size || "4:3", logoPath, themeColor, titleSlide, normalSlides };
      // マスター保存とMarpレンダリングを実行します
      const res = await saveDeckAndRebuild(fileId, deck);

      // 実行結果レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{
          // テキスト種別です
          type: "text",
          // 成功メッセージと各種成果物パスです
          text: `スライド作成成功\n\nSlide ID: ${res.fileId}\nHTML: ${res.htmlFilepath}\nPDF: ${res.pdfFilepath}\nMarkdown: ${res.mdFilepath}\nJSON: ${res.jsonFilepath}`
        }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `作成エラー: ${e.message}` }], isError: true };
    }
  }
);

// 2. スライドデッキの構成確認ツールを登録します
server.tool(
  // ツール名を指定します
  "get_slide_deck",
  // ツールの説明文を記述します
  "指定IDのスライド構成（各ページ番号、タイトル、主張、本文、クラス、バナー設定等）を取得します。",
  // 引数パラメータのスキーマ定義です
  { fileId: z.string().describe("スライドID") },
  // ツールの実行ハンドラー関数です
  async ({ fileId }) => {
    // 処理ブロックを開始します
    try {
      // 指定されたIDのデッキデータをロードします
      const deck = await loadDeck(fileId);
      // スライド全体のサマリーオブジェクトを構築します
      const summary = {
        // スライドIDです
        slideId: fileId,
        // スライド比率です
        size: deck.size || "4:3",
        // ロゴパスです
        logoPath: deck.logoPath,
        // バナー指定です
        banner: deck.banner,
        // テーマカラーです
        themeColor: deck.themeColor,
        // 総ページ数です
        totalPages: deck.normalSlides.length + 1,
        // 表紙情報です
        titleSlide: deck.titleSlide,
        // 各スライドページの構成情報です
        pages: deck.normalSlides.map((s, idx) => ({
          // ページ番号（表紙が1のため +2）
          pageNumber: idx + 2,
          // ページタイトル
          pageTitle: s.pageTitle,
          // 主張テキスト
          claim: s.claim,
          // 図表タイトル
          chartTitle: s.chartTitle,
          // 適用クラス配列
          classes: s.classes,
          // 本文コンテンツ
          bodyContent: s.bodyContent,
          // 2段組コンテンツ
          twoColumns: s.twoColumns,
          // 画像グリッド
          imageGrid: s.imageGrid,
        })),
      };
      // 整形したJSONテキストをレスポンスとして返却します
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `取得エラー: ${e.message}` }], isError: true };
    }
  }
);

// 3. 指定位置へのスライド新規挿入ツールを登録します
server.tool(
  // ツール名を指定します
  "insert_slide",
  // ツールの説明文を記述します
  "指定ページ番号の後ろに新しいスライドを1枚挿入し、PDFを再ビルドします。",
  // 引数パラメータのスキーマ定義です
  {
    // 対象スライドIDです
    fileId: z.string().describe("対象のスライドID"),
    // 挿入位置のページ番号です
    insertAfterPage: z.number().describe("何ページ目の直後に挿入するか（表紙の直後なら1）"),
    // 挿入するスライドデータです
    newSlide: NormalSlideSchema.describe("挿入するスライドデータ"),
  },
  // ツールの実行ハンドラー関数です
  async ({ fileId, insertAfterPage, newSlide }) => {
    // 処理ブロックを開始します
    try {
      // デッキデータをロードします
      const deck = await loadDeck(fileId);
      // 配列内の挿入インデックスを算出します
      const targetIndex = Math.max(0, Math.min(insertAfterPage - 1, deck.normalSlides.length));
      // スライド配列に新しいスライドを挿入します
      deck.normalSlides.splice(targetIndex, 0, newSlide);
      // マスター保存とMarp再レンダリングを実行します
      const res = await saveDeckAndRebuild(fileId, deck);

      // 完了レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{ type: "text", text: `挿入完了（全${deck.normalSlides.length + 1}ページ）\nHTML: ${res.htmlFilepath}\nPDF: ${res.pdfFilepath}` }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `挿入エラー: ${e.message}` }], isError: true };
    }
  }
);

// 4. 指定ページ内容の更新・編集ツールを登録します
server.tool(
  // ツール名を指定します
  "update_slide",
  // ツールの説明文を記述します
  "指定ページ番号のスライド内容を更新し、PDFを再ビルドします。",
  // 引数パラメータのスキーマ定義です
  {
    // 対象スライドIDです
    fileId: z.string().describe("対象のスライドID"),
    // 編集対象のページ番号です
    targetPageNumber: z.number().describe("編集対象のページ番号（2以上）"),
    // 更新後のスライドデータです
    updatedSlide: NormalSlideSchema.describe("更新後のスライドデータ"),
  },
  // ツールの実行ハンドラー関数です
  async ({ fileId, targetPageNumber, updatedSlide }) => {
    // 処理ブロックを開始します
    try {
      // デッキデータをロードします
      const deck = await loadDeck(fileId);
      // 配列のインデックス番号を算出します（ページ番号 - 2）
      const targetIndex = targetPageNumber - 2;
      // 範囲外のページ番号が指定された場合はエラーを投げます
      if (targetIndex < 0 || targetIndex >= deck.normalSlides.length) {
        // 例外をスローします
        throw new Error(`指定ページ番号 ${targetPageNumber} が存在しません。`);
      }
      // 指定インデックスのスライド内容を上書き更新します
      deck.normalSlides[targetIndex] = updatedSlide;
      // マスター保存とMarp再レンダリングを実行します
      const res = await saveDeckAndRebuild(fileId, deck);

      // 完了レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{ type: "text", text: `${targetPageNumber}ページ目を更新しました。\nHTML: ${res.htmlFilepath}\nPDF: ${res.pdfFilepath}` }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `更新エラー: ${e.message}` }], isError: true };
    }
  }
);

// 5. 指定ページのスライド削除ツールを登録します
server.tool(
  // ツール名を指定します
  "delete_slide",
  // ツールの説明文を記述します
  "指定ページ番号のスライドを削除し、PDFを再ビルドします。",
  // 引数パラメータのスキーマ定義です
  {
    // 対象スライドIDです
    fileId: z.string().describe("対象のスライドID"),
    // 削除対象のページ番号です
    targetPageNumber: z.number().describe("削除対象のページ番号（2以上）"),
  },
  // ツールの実行ハンドラー関数です
  async ({ fileId, targetPageNumber }) => {
    // 処理ブロックを開始します
    try {
      // デッキデータをロードします
      const deck = await loadDeck(fileId);
      // 配列のインデックス番号を算出します
      const targetIndex = targetPageNumber - 2;
      // 範囲外のページ番号が指定された場合はエラーを投げます
      if (targetIndex < 0 || targetIndex >= deck.normalSlides.length) {
        // 例外をスローします
        throw new Error(`指定ページ番号 ${targetPageNumber} が存在しません。`);
      }
      // 対象スライドを配列から削除します
      deck.normalSlides.splice(targetIndex, 1);
      // マスター保存とMarp再レンダリングを実行します
      const res = await saveDeckAndRebuild(fileId, deck);

      // 完了レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{ type: "text", text: `${targetPageNumber}ページ目を削除しました（全${deck.normalSlides.length + 1}ページ）。\nHTML: ${res.htmlFilepath}\nPDF: ${res.pdfFilepath}` }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `削除エラー: ${e.message}` }], isError: true };
    }
  }
);

// 6. デッキ全体設定（ロゴ・バナー・テーマカラー・表紙・比率）の更新ツールを登録します
server.tool(
  // ツール名を指定します
  "update_deck_settings",
  // ツールの説明文を記述します
  "スライドデッキ全体の設定（比率、ロゴ画像パス、表紙バナー、テーマカラー、表紙情報）を更新し、PDF/HTML/Markdownを再ビルドします。",
  // 引数パラメータのスキーマ定義です
  {
    // 対象スライドIDです
    fileId: z.string().describe("対象のスライドID"),
    // スライド比率です
    size: z.enum(["4:3", "16:9"]).optional().describe("スライドの縦横比率（'4:3' または '16:9'）"),
    // ヘッダーロゴ画像のパスです
    logoPath: z.string().optional().describe("ヘッダーロゴ画像のパス（例: '../slides/N-Y-Public_Logo.jpg'）"),
    // 表紙バナー画像です
    banner: z.string().optional().describe("表紙バナー画像の指定（Web URL、相対パス、Base64 Data URI、または 'none' でバナー非表示）"),
    // スライドのテーマカラーです
    themeColor: z.string().optional().describe("スライドのテーマカラー（例: '#1f497d'）"),
    // 表紙の情報オブジェクトです
    titleSlide: TitleSlideSchema.optional().describe("表紙の情報（更新する場合）"),
  },
  // ツールの実行ハンドラー関数です
  async ({ fileId, size, logoPath, banner, themeColor, titleSlide }) => {
    // 処理ブロックを開始します
    try {
      // デッキデータをロードします
      const deck = await loadDeck(fileId);
      // 各設定値が存在する場合のみ上書きします
      if (size !== undefined) deck.size = size;
      // ロゴパスを更新します
      if (logoPath !== undefined) deck.logoPath = logoPath;
      // バナー画像を更新します
      if (banner !== undefined) deck.banner = banner;
      // テーマカラーを更新します
      if (themeColor !== undefined) deck.themeColor = themeColor;
      // 表紙情報を更新します
      if (titleSlide !== undefined) deck.titleSlide = titleSlide;
      // マスター保存とMarp再レンダリングを実行します
      const res = await saveDeckAndRebuild(fileId, deck);

      // 完了レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{
          // テキスト種別です
          type: "text",
          // 成功メッセージと各種ファイルパスです
          text: `デッキ設定を更新しました。\nSlide ID: ${res.fileId}\nHTML: ${res.htmlFilepath}\nPDF: ${res.pdfFilepath}\nMarkdown: ${res.mdFilepath}\nJSON: ${res.jsonFilepath}`,
        }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `デッキ設定更新エラー: ${e.message}` }], isError: true };
    }
  }
);

// 7. PDF出力専用ツールを登録します
server.tool(
  // ツール名を指定します
  "export_to_pdf",
  // ツールの説明文を記述します
  "指定したスライドIDまたはMarkdownファイルからPDF（およびHTML）を出力します。",
  // 引数パラメータのスキーマ定義です
  {
    // スライドIDです（任意）
    fileId: z.string().optional().describe("スライドID（例: 'slide-c71a2252'）"),
    // Markdownファイルパスです（任意）
    markdownPath: z.string().optional().describe("Markdownファイルの相対または絶対パス（fileId未指定時に使用）"),
  },
  // ツールの実行ハンドラー関数です
  async ({ fileId, markdownPath }) => {
    // 処理ブロックを開始します
    try {
      // 出力ディレクトリを確保します
      await ensureOutputDir();
      // Markdownファイルパス変数を初期化します
      let targetMdPath = "";
      // PDFファイルパス変数を初期化します
      let targetPdfPath = "";
      // HTMLファイルパス変数を初期化します
      let targetHtmlPath = "";

      // スライドIDが指定された場合
      if (fileId) {
        // slides/<fileId>/ 配下の専用ディレクトリを優先探索します
        const deckDir = path.join(SLIDES_DIR, fileId);
        // 専用ディレクトリ配下のMarkdownパスを構築します
        targetMdPath = path.join(deckDir, `${fileId}.md`);
        // 専用ディレクトリ配下のPDF出力パスを構築します
        targetPdfPath = path.join(deckDir, `${fileId}.pdf`);
        // 専用ディレクトリ配下のHTML出力パスを構築します
        targetHtmlPath = path.join(deckDir, `${fileId}.html`);

        // 専用ディレクトリ内のMarkdown存在確認を試みます
        try {
          // Markdownファイルへのアクセス可否を確認します
          await fs.access(targetMdPath);
          // 出力先ディレクトリを確保します
          await ensureOutputDir(deckDir);
        // 存在しない場合は従来のoutputまたは平坦slidesディレクトリへフォールバックします
        } catch {
          // 従来の output/ 配下のMarkdownパスです
          const outputMd = path.join(OUTPUT_DIR, `${fileId}.md`);
          // output配下のアクセス確認を試みます
          try {
            // ファイルへのアクセス可否を確認します
            await fs.access(outputMd);
            // output配下のMarkdownパスを採用します
            targetMdPath = outputMd;
            // output配下のPDFパスを設定します
            targetPdfPath = path.join(OUTPUT_DIR, `${fileId}.pdf`);
            // output配下のHTMLパスを設定します
            targetHtmlPath = path.join(OUTPUT_DIR, `${fileId}.html`);
          // outputにも存在しない場合は平坦なslidesディレクトリを参照します
          } catch {
            // 平坦slides配下のMarkdownパスを設定します
            targetMdPath = path.join(SLIDES_DIR, `${fileId}.md`);
            // 平坦slides配下のPDFパスを設定します
            targetPdfPath = path.join(SLIDES_DIR, `${fileId}.pdf`);
            // 平坦slides配下のHTMLパスを設定します
            targetHtmlPath = path.join(SLIDES_DIR, `${fileId}.html`);
          }
        }
      // Markdownパスが直接指定された場合
      } else if (markdownPath) {
        // 絶対パスまたはROOT_DIR基準の絶対パスに解決します
        targetMdPath = path.isAbsolute(markdownPath) ? markdownPath : path.resolve(ROOT_DIR, markdownPath);
        // パスを要素分解します
        const parsed = path.parse(targetMdPath);
        // 入力Markdownと同階層にPDF出力パスを設定します
        targetPdfPath = path.join(parsed.dir, `${parsed.name}.pdf`);
        // 入力Markdownと同階層にHTML出力パスを設定します
        targetHtmlPath = path.join(parsed.dir, `${parsed.name}.html`);
      // どちらも未指定の場合はエラーを投げます
      } else {
        // 例外をスローします
        throw new Error("fileId または markdownPath のいずれかを指定してください。");
      }

      // Marp CLI によるレンダリングを実行します
      await renderMarkdownToHtmlAndPdf(targetMdPath, targetHtmlPath, targetPdfPath);

      // 完了レスポンスを返却します
      return {
        // コンテンツ配列です
        content: [{
          // テキスト種別です
          type: "text",
          // 成功メッセージと各種パスです
          text: `PDF出力成功\n\nPDF: ${targetPdfPath}\nHTML: ${targetHtmlPath}\nMarkdown: ${targetMdPath}`,
        }],
      };
    // エラーハンドリングです
    } catch (e: any) {
      // エラーレスポンスを返却します
      return { content: [{ type: "text", text: `PDF出力エラー: ${e.message}` }], isError: true };
    }
  }
);

// テストや外部モジュール連携用にサーバーインスタンスをエクスポートします
export { server };

// サーバーメイン起動関数です
async function main() {
  // 標準入出力トランスポートを作成します
  const transport = new StdioServerTransport();
  // サーバーにトランスポートを接続してリスニングを開始します
  await server.connect(transport);
}

// 直接実行された場合にサーバーを起動します
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // メイン関数を実行し、致命的エラー時はプロセスを終了します
  main().catch((err) => {
    // 標準エラー出力にエラーを出力します
    console.error("Fatal MCP Server Error:", err);
    // 異常終了ステータスでプロセスを終了します
    process.exit(1);
  });
}
