// ヘッドレスブラウザ（Chromium）を自動操作するためのPuppeteerライブラリを読み込みます
import puppeteer from 'puppeteer';
// PowerPoint（.pptx）ファイルをプログラムから生成するためのPptxGenJSライブラリを読み込みます
import PptxGenJS from 'pptxgenjs';
// Marp CLIをNode.jsプロセス内で直接実行するためのmarpCli関数を読み込みます
import { marpCli } from '@marp-team/marp-cli';
// ファイルパスの結合や拡張子の抽出などを安全に行うための標準pathモジュールを読み込みます
import path from 'path';
// ファイルの存在確認や読み書きを行うための標準ファイルシステム（fs）モジュールを読み込みます
import fs from 'fs';
// ESモジュール環境で現在のスクリプトファイルパスを解決するためのfileURLToPath関数を読み込みます
import { fileURLToPath } from 'url';
// 生成後のPPTXファイルへネイティブOffice MathML（<a14:m><m:oMathPara><m:oMath>）を注入する補助関数を読み込みます
import { injectOfficeMathIntoPptx } from './omml.js';

// ==============================================================================
// 設定値および引数の初期化
// ==============================================================================

// 現在のスクリプトファイルの絶対パスを取得します
const __filename = fileURLToPath(import.meta.url);
// 現在のスクリプトが配置されているディレクトリのパスを取得します
const __dirname = path.dirname(__filename);
// リポジトリのルートディレクトリパスを解決します
const ROOT_DIR = path.resolve(__dirname, '..');

// 変換対象となるMarkdownファイルのパスを取得します（第1引数、未指定時はデフォルトの使い方スライド）
const INPUT_MD = process.argv[2] || 'slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md';
// 入力ファイルが存在するディレクトリのパスを取得します
const INPUT_DIR = path.dirname(INPUT_MD);
// 入力ファイル名から拡張子（.md）を除いた基本名を取得します
const BASE_NAME = path.basename(INPUT_MD, path.extname(INPUT_MD));
// Marpによって一時的に生成される中間HTMLファイルのパスを組み立てます
const TEMP_HTML = path.join(INPUT_DIR, `${BASE_NAME}_temp.html`);
// 出力先となるPowerPointファイル（.pptx）のパスを取得します（第2引数、未指定時は入力と同階層に出力）
const OUTPUT_PPTX = process.argv[3] || path.join(INPUT_DIR, `${BASE_NAME}.pptx`);

// スライドの描画に使用するテーマCSSファイルの相対パスを定義します
const THEME_CSS = path.join(ROOT_DIR, 'themes', 'business-slide-theme.css');
// Marpカスタムエンジン設定ファイル（TOC生成・テーブル/コード自動縮小プラグイン）のパスを定義します
const MARP_CONFIG = path.join(ROOT_DIR, 'marp.config.js');

// ==============================================================================
// 画面解像度および単位変換用の定数定義
// ==============================================================================

// 4:3スライドの基準画面横幅（ピクセル単位）を定義します
const SCREEN_WIDTH = 960;
// 4:3スライドの基準画面縦幅（ピクセル単位）を定義します
const SCREEN_HEIGHT = 720;
// ピクセル（px）からPowerPointが使用するインチ（inch）単位へ変換するための倍率です（96DPI基準）
const PX_TO_INCH = 1 / 96;
// ピクセル（px）からフォントサイズ等で使用するポイント（pt）単位へ変換するための倍率です（72/96 = 0.75）
const PX_TO_PT = 0.75;

// ==============================================================================
// 画像パスおよびSVG解決の補助関数
// ==============================================================================

// ブラウザから取得した画像URL（file://, data:, 相対パス等）をローカルファイルパスまたはData URIへ正規化する関数です
function resolveLocalOrDataImage(rawSrc, baseDir) {
    // ソース文字列が空の場合はnullを返します
    if (!rawSrc) {
        // 無効値としてnullを返却します
        return null;
    }
    // Data URI形式またはWeb URL形式の場合はそのままオブジェクトとして返します
    if (rawSrc.startsWith('data:')) {
        // Data URIとして返却します
        return { isData: true, value: rawSrc };
    }
    // HTTP/HTTPSの外部画像URLであるか判定します
    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
        // リモートパスとして返却します
        return { isData: false, isRemote: true, value: rawSrc };
    }

    // 作業用のパス文字列を初期化します
    let filePath = rawSrc;
    // file:// プロトコルプレフィックスが付与されている場合は除去してURLデコードします
    if (filePath.startsWith('file://')) {
        // プレフィックスを削除しデコードします
        filePath = decodeURIComponent(filePath.slice(7));
        // Windows環境で先頭にスラッシュが残る場合（例: /C:/...）は補正します
        if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(filePath)) {
            // 先頭のスラッシュを除去します
            filePath = filePath.slice(1);
        }
    }

    // パス区切り文字を現在のOS標準に合わせて正規化します
    const absCandidate = path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
    // 候補パスが存在するか確認します
    if (fs.existsSync(absCandidate)) {
        // 存在する絶対パスを返却します
        return { isData: false, isRemote: false, value: absCandidate };
    }

    // カレントワーキングディレクトリ基準での解決を試みます
    const cwdCandidate = path.resolve(process.cwd(), filePath);
    // 存在するか確認します
    if (fs.existsSync(cwdCandidate)) {
        // 存在するパスを返却します
        return { isData: false, isRemote: false, value: cwdCandidate };
    }

    // リポジトリルート基準での解決を試みます
    const rootCandidate = path.resolve(ROOT_DIR, filePath);
    // 存在するか確認します
    if (fs.existsSync(rootCandidate)) {
        // 存在するパスを返却します
        return { isData: false, isRemote: false, value: rootCandidate };
    }

    // どの候補にも存在しない場合はnullを返します
    return null;
}

// ==============================================================================
// メイン変換処理関数
// ==============================================================================
// @spec FN-PPT-001 convertToPptx
async function main() {
    // 非対話パイプ実行時（execFile等）に標準入力ストリームが開いたまま待機するのを防ぐため即座に破棄します
    if (process.stdin && typeof process.stdin.destroy === 'function') {
        // 標準入力をクローズします
        process.stdin.destroy();
    }
    // 変換処理の開始メッセージをコンソールに出力します
    console.log(`Starting custom PPTX conversion...`);
    // 処理対象の入力Markdownファイルパスをログ表示します
    console.log(`Input: ${INPUT_MD}`);
    // 生成予定のPowerPoint出力先ファイルパスをログ表示します
    console.log(`Output: ${OUTPUT_PPTX}`);

    // 入力ファイルが実際にファイルシステム上に存在するか検証します
    if (!fs.existsSync(INPUT_MD)) {
        // 見つからない場合はエラーメッセージを標準エラー出力に表示します
        console.error(`Error: Input file ${INPUT_MD} not found.`);
        // 異常終了ステータスコード1でプロセスを終了します
        process.exit(1);
    }

    // 出力先ディレクトリが存在しない場合は再帰的に作成します
    const outDir = path.dirname(path.resolve(OUTPUT_PPTX));
    // ディレクトリの存在を確認します
    if (!fs.existsSync(outDir)) {
        // ディレクトリを作成します
        fs.mkdirSync(outDir, { recursive: true });
    }

    // ブラウザインスタンス変数をスコープ外で宣言し、finallyブロックで確実に閉じられるようにします
    let browser = null;

    // 一時HTMLファイルの残留を防ぐため、以降の処理をtry-finallyブロックで囲みます
    try {
        // ----------------------------------------------------------------------
        // 1. Marp CLIを使用してMarkdownを中間HTMLへレンダリング
        // ----------------------------------------------------------------------
        // Marp実行開始の進捗ログを出力します
        console.log(`Running Marp generation...`);
        // PDF出力時と100%同一のプラグイン（marp.config.js）およびテーマを適用してMarp CLIでHTMLを生成します
        const marpExitCode = await marpCli([
            // 入力Markdownファイルパス
            INPUT_MD,
            // カスタム設定ファイル指定オプション
            '--config-file', MARP_CONFIG,
            // 非対話実行時の標準入力待機防止オプション
            '--no-stdin',
            // HTMLタグ許可オプション
            '--html',
            // ローカルファイルアクセス許可オプション
            '--allow-local-files',
            // テーマCSS指定オプション
            '--theme-set', THEME_CSS,
            // 出力先一時HTMLファイルパス指定オプション
            '-o', TEMP_HTML
        ]);
        // Marp CLIが異常終了した場合は例外をスローします
        if (marpExitCode !== 0) {
            // エラーを生成してスローします
            throw new Error(`Marp CLI failed with exit code ${marpExitCode}`);
        }

        // ----------------------------------------------------------------------
        // 2. Puppeteer（Chromiumブラウザ）を起動してレイアウト解析
        // ----------------------------------------------------------------------
        // 環境変数にChromeパスが指定されているか確認します
        let chromePath = process.env.CHROME_PATH || '';
        // 指定がない場合はPuppeteer付属の実行ファイルパス取得を試みます
        if (!chromePath) {
            // 例外発生に備えてtryブロックで囲みます
            try {
                // Puppeteerのデフォルト実行可能パスを取得します
                const pPath = puppeteer.executablePath();
                // パスが存在していればそれを採用します
                if (fs.existsSync(pPath)) {
                    // 実行ファイルパスを設定します
                    chromePath = pPath;
                }
            // エラー時は無視してフォールバック探索へ進みます
            } catch (e) {}
        }
        // それでも見つからない場合、コンテナ内の標準キャッシュディレクトリまたはシステムChromiumを探索します
        if (!chromePath) {
            // コンテナ環境（Docker）でよく使われるPuppeteerのキャッシュパスです
            const cacheBase = '/home/node/.cache/puppeteer/chrome';
            // ディレクトリが存在するか確認します
            if (fs.existsSync(cacheBase)) {
                // インストール済みのバージョンディレクトリ一覧を取得します
                const versions = fs.readdirSync(cacheBase);
                // 各バージョンディレクトリを走査します
                for (const v of versions) {
                    // Linux版Chromeの実行可能ファイル候補パスを組み立てます
                    const candidate = path.join(cacheBase, v, 'chrome-linux64', 'chrome');
                    // 実行バイナリが存在すればそのパスを採用します
                    if (fs.existsSync(candidate)) {
                        // 採用パスを変数に格納します
                        chromePath = candidate;
                        // ループを抜けます
                        break;
                    }
                }
            }
            // システム標準のChromiumが存在する場合はフォールバックとして採用します
            if (!chromePath && fs.existsSync('/usr/bin/chromium')) {
                // システムChromiumパスを設定します
                chromePath = '/usr/bin/chromium';
            }
        }

        // Puppeteerの起動オプションを設定します（Dockerサンドボックス対応）
        const launchOpts = {
            // ヘッドレスモードで起動します
            headless: 'new',
            // ルート実行やコンテナ内でのセキュリティ制限およびfile://スキーム間のCanvas汚染（CORS制限）を回避する起動引数です
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none', '--disable-web-security', '--allow-file-access-from-files']
        };
        // Chromeバイナリパスが特定できている場合はオプションに指定します
        if (chromePath) {
            // 実行ファイルパスを上書き設定します
            launchOpts.executablePath = chromePath;
        }

        // 設定したオプションでヘッドレスブラウザを起動します
        browser = await puppeteer.launch(launchOpts);
        // 新しいブラウザタブ（ページ）を開きます
        const page = await browser.newPage();

        // 外部のダミー画像（placehold.co等）がオフライン環境やタイムアウトで失敗しないよう、インラインSVGへフォールバック応答します
        await page.setRequestInterception(true);
        // リクエストイベントハンドラを登録します
        page.on('request', req => {
            // リクエストURLを取得します
            const url = req.url();
            // placehold.co などの外部プレースホルダー画像リクエストであるか判定します
            if (url.startsWith('http://') || url.startsWith('https://')) {
                // ダミーのアバターSVG文字列を生成します
                const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="5" fill="#d9e2ef"/><circle cx="40" cy="30" r="14" fill="#1f497d"/><path d="M16 70 C16 50 64 50 64 70 Z" fill="#1f497d"/></svg>`;
                // CORS許可ヘッダー付きでSVG画像として即座に応答を返します
                req.respond({
                    // HTTPステータス200（成功）
                    status: 200,
                    // CORS制限によるCanvas汚染を防ぐヘッダーを付与します
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    // コンテンツタイプをSVGに設定
                    contentType: 'image/svg+xml',
                    // SVGボディを返却
                    body: fallbackSvg
                });
                // 処理完了のためリターンします
                return;
            }
            // ローカルファイル等のリクエストはそのまま通過させます
            req.continue();
        });

        // ブラウザの表示領域（ビューポート）を最大サイズ（1280x720）に設定します
        await page.setViewport({ width: 1280, height: SCREEN_HEIGHT });

        // 一時HTMLファイルの絶対パスを解決します
        const htmlPath = path.resolve(TEMP_HTML);
        // HTML読み込み開始ログを出力します
        console.log(`Loading HTML for analysis...`);
        // ファイルURL形式でHTMLをブラウザに読み込み、ネットワーク通信が完了するまで待機します
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

        // Mermaidダイアグラムの非同期描画（marp-mermaid-loader.js）が完了するまで待機します
        await page.waitForFunction(() => {
            // 未処理のMermaidコードブロックが残っていないか、または完了属性が付与されているか確認します
            const remaining = document.querySelectorAll(':is(pre, marp-pre):not([data-mermaid-processed]) > code.language-mermaid:not([data-mermaid-failed])');
            // 残存数が0またはdata-mermaid-done属性が存在すれば完了とみなします
            return remaining.length === 0 || document.body.hasAttribute('data-mermaid-done');
        // 最大10秒待機し、タイムアウト時はそのまま続行します
        }, { timeout: 10000 }).catch(() => {});

        // Webフォントおよびシステムフォントのロード完了を待機します
        await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());

        // ----------------------------------------------------------------------
        // 3. ブラウザ内DOMからスライド各要素の座標・スタイル・構造化データを抽出
        // ----------------------------------------------------------------------
        // ブラウザコンテキスト内でJavaScript関数を実行し、全スライドの構造化レイアウト情報を受け取ります
        const slidesData = await page.evaluate(async () => {
            // 最初にMarpのSVGラッパーのviewBoxから本来のスライド設計サイズ（960x720 または 1280x720）を取得します
            const firstSvg = document.querySelector('svg[data-marpit-svg]');
            // デフォルトのスライド幅を960pxとします
            let nativeW = 960;
            // デフォルトのスライド高さを720pxとします
            let nativeH = 720;
            // SVGのviewBox属性が存在する場合はそこから幅と高さを読み取ります
            if (firstSvg && firstSvg.getAttribute('viewBox')) {
                // viewBox文字列を空白またはカンマで分割して数値配列に変換します
                const vbParts = firstSvg.getAttribute('viewBox').trim().split(/[\s,]+/).map(Number);
                // 幅と高さが有効な数値であれば採用します
                if (vbParts.length >= 4 && vbParts[2] > 0 && vbParts[3] > 0) {
                    // 設計横幅を更新します
                    nativeW = vbParts[2];
                    // 設計縦幅を更新します
                    nativeH = vbParts[3];
                }
            }

            // Bespoke.jsの非アクティブスライド隠蔽（content-visibility:hidden）とビューポート縮小（transform）を解除し、1:1実寸でレイアウト確定させます
            const normStyle = document.createElement('style');
            // 全スライドを設計サイズ（nativeW x nativeH）のまま1:1で縦並びに表示するCSSルールを記述します
            normStyle.textContent = `
                body, html {
                    overflow: visible !important;
                    height: auto !important;
                    width: ${nativeW}px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                }
                .bespoke-marp-osc, .bespoke-progress-parent, .bespoke-marp-note {
                    display: none !important;
                }
                div#\\:\\$p, .bespoke-marp-parent {
                    position: static !important;
                    inset: auto !important;
                    width: ${nativeW}px !important;
                    height: auto !important;
                    overflow: visible !important;
                    transform: none !important;
                }
                svg.bespoke-marp-slide, svg[data-marpit-svg] {
                    content-visibility: visible !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    display: block !important;
                    position: relative !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: ${nativeW}px !important;
                    height: ${nativeH}px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    transform: none !important;
                    z-index: 1 !important;
                    pointer-events: auto !important;
                }
                svg[data-marpit-svg] > foreignObject {
                    width: ${nativeW}px !important;
                    height: ${nativeH}px !important;
                    transform: none !important;
                }
                svg[data-marpit-svg] > foreignObject > section {
                    width: ${nativeW}px !important;
                    height: ${nativeH}px !important;
                    transform: none !important;
                }
            `;
            // 正規化スタイルをheadタグへ追加します
            document.head.appendChild(normStyle);

            // スタイル変更後のレイアウト再計算とResizeObserver（marp-auto-scaling等）の完了を2フレーム待機します
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // RGB/RGBA形式およびCSS Color 4形式のカラー文字列を6桁の16進数HEX（例: '1F497D'）へ変換する補助関数です
            const rgbToHex = (rgb) => {
                // 未定義や透明の場合はnullを返します
                if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'none') {
                    // 色なしとしてnullを返却します
                    return null;
                }
                // 既に#始まりのHEX形式である場合
                if (rgb.startsWith('#')) {
                    // #を除去します
                    const clean = rgb.slice(1).trim();
                    // 3桁短縮HEX（例: #fff）の場合は6桁に展開します
                    if (clean.length === 3) {
                        // 各文字を2回繰り返して大文字化します
                        return clean.split('').map(c => c + c).join('').toUpperCase();
                    }
                    // 6桁部分を大文字化して返します
                    return clean.slice(0, 6).toUpperCase();
                }
                // CSS Color Module Level 4 の color(srgb r g b) 表記であるか判定します
                const isColorFunc = rgb.toLowerCase().includes('color(');
                // rgb(r, g, b) または rgba(r, g, b, a) または color(srgb ...) から数値配列を抽出します
                const nums = rgb.match(/[\d.]+/g);
                // RGBの3要素が揃っていない場合はnullを返します
                if (!nums || nums.length < 3) {
                    // 無効値としてnullを返却します
                    return null;
                }
                // アルファ値が0（完全透明）の場合はnullを返します
                if (nums.length >= 4 && parseFloat(nums[3]) === 0) {
                    // 透明としてnullを返却します
                    return null;
                }
                // R, G, Bの各値を0〜255の整数に丸めて2桁16進数へ変換します（color関数表記時は255倍します）
                return nums.slice(0, 3).map(v => {
                    // 文字列を浮動小数点数へ変換します
                    const val = parseFloat(v);
                    // color関数の場合は0〜1の割合値のため255倍し、通常RGB値の場合はそのまま丸めます
                    const intVal = isColorFunc ? Math.round(val * 255) : Math.round(val);
                    // 0〜255の範囲に収めて2桁の16進数大文字文字列へ変換します
                    return Math.max(0, Math.min(255, intVal)).toString(16).padStart(2, '0').toUpperCase();
                // 3つのRGBチャンネル文字列を結合して返します
                }).join('');
            };

            // 数式プレースホルダーの連番カウンターです
            let mathCounter = 0;
            // プレースホルダートークンと構造化MathMLツリーの対応マップです
            const mathMap = {};

            // MathJaxのSVG内にある <g data-mml-node="..."> または標準 <math> DOMから構造化MathMLツリーを抽出する関数です
            const extractMathTree = (containerEl) => {
                // MathJaxの path[data-c] からUnicode文字を復元する補助関数です
                const getCharFromDataC = (el) => {
                    // data-c属性値を取得します
                    const hex = el.getAttribute('data-c');
                    // 16進数コードポイントが存在すれば文字に変換します
                    if (hex) {
                        // スペース区切りの複数コードポイントにも対応します
                        return hex.trim().split(/\s+/).map(cp => String.fromCodePoint(parseInt(cp, 16))).join('');
                    }
                    // なければテキストコンテンツを返します
                    return (el.textContent || '').trim();
                };

                // 1. KaTeX等の標準 <math> 要素が存在する場合
                const mathEl = containerEl.tagName.toLowerCase() === 'math' ? containerEl : containerEl.querySelector('math');
                // <math>要素が見つかった場合
                if (mathEl) {
                    // 標準MathMLノードを再帰的にシリアライズする関数です
                    const walkStandardMml = (node) => {
                        // タグ名を小文字で取得します
                        const tag = node.tagName ? node.tagName.toLowerCase().replace(/^.*:/, '') : '';
                        // 子要素を再帰変換します
                        const children = Array.from(node.children || []).map(walkStandardMml).filter(Boolean);
                        // 子要素がない場合は自身のテキストを取得します
                        const text = children.length === 0 ? (node.textContent || '').trim() : '';
                        // ノードオブジェクトを返します
                        return { tag, text, children };
                    };
                    // TeXアノテーションが存在すれば取得します
                    const texAnn = mathEl.querySelector('annotation[encoding*="tex"]');
                    // ツリーとTeX文字列を返します
                    return {
                        // 構造化ツリー
                        tree: walkStandardMml(mathEl),
                        // フォールバックTeX
                        tex: texAnn ? texAnn.textContent.trim() : (mathEl.textContent || '').trim()
                    };
                }

                // 2. MathJaxの <g data-mml-node="math"> が存在する場合
                const mmlRoot = containerEl.getAttribute('data-mml-node') === 'math'
                    // 自身がmathノードの場合
                    ? containerEl
                    // 内部のdata-mml-node="math"を検索します
                    : containerEl.querySelector('[data-mml-node="math"]');
                // MathJaxのMMLルートが見つかった場合
                if (mmlRoot) {
                    // data-mml-node階層を再帰的に走査してMathMLツリーを構築する関数です
                    const walkMjxMml = (gNode) => {
                        // data-mml-node属性名（mi, mn, mo, mfrac, msqrt, msup, msub, msubsup, mrow等）を取得します
                        const mmlTag = gNode.getAttribute('data-mml-node');
                        // 直下または子孫のdata-mml-node要素を収集する関数です
                        const findDirectMmlChildren = (parent) => {
                            // 結果配列です
                            const res = [];
                            // 子要素を走査します
                            for (const child of parent.children) {
                                // child自身がdata-mml-nodeを持っている場合
                                if (child.hasAttribute('data-mml-node')) {
                                    // 結果配列に追加します
                                    res.push(child);
                                // ラッパー用の<g>（transformのみ等）の場合は再帰的に中を探します
                                } else if (child.tagName.toLowerCase() === 'g') {
                                    // 内部のdata-mml-node子要素を追加します
                                    res.push(...findDirectMmlChildren(child));
                                }
                            }
                            // 収集した子要素配列を返します
                            return res;
                        };

                        // TeXAtom等のラッパーノードはmrowとして扱います
                        const normalizedTag = mmlTag === 'TeXAtom' ? 'mrow' : mmlTag;
                        // 子MMLノード一覧を取得します
                        const mmlChildren = findDirectMmlChildren(gNode);
                        // 子ノードが存在する場合は再帰変換します
                        if (mmlChildren.length > 0) {
                            // 子ノード変換結果配列を作成します
                            return {
                                // 正規化したタグ名
                                tag: normalizedTag,
                                // テキストは空
                                text: '',
                                // 子ノード配列
                                children: mmlChildren.map(walkMjxMml).filter(Boolean)
                            };
                        }

                        // 葉ノード（mi, mn, mo, mtext等）の場合、内部の path[data-c] または text から文字を復元します
                        const paths = Array.from(gNode.querySelectorAll('[data-c]'));
                        // 復元された文字列です
                        let leafText = '';
                        // data-c要素が存在する場合
                        if (paths.length > 0) {
                            // 各pathのコードポイントを連結します
                            leafText = paths.map(getCharFromDataC).join('');
                        // textタグ等が存在する場合
                        } else {
                            // テキストコンテンツを取得します
                            leafText = (gNode.textContent || '').trim();
                        }
                        // 葉ノードオブジェクトを返します
                        return {
                            // 正規化したタグ名
                            tag: normalizedTag,
                            // 復元した文字
                            text: leafText,
                            // 子要素なし
                            children: []
                        };
                    };

                    // 構築したMathMLツリーを返します
                    const tree = walkMjxMml(mmlRoot);
                    // ツリーオブジェクトを返却します
                    return { tree, tex: '' };
                }

                // どちらでもない場合はテキストのみ返します
                return { tree: null, tex: (containerEl.textContent || '').trim() };
            };

            // 数式要素（mjx-container または .katex または math）を登録し、プレースホルダートークン文字列を発行する関数です
            const registerMathElement = (el) => {
                // カウンターをインクリメントします
                mathCounter += 1;
                // 一意なプレースホルダートークンを生成します
                const token = `__OMATH_${mathCounter}__`;
                // 数式ツリーを抽出します
                const extracted = extractMathTree(el);
                // マップへ保存します
                mathMap[token] = extracted;
                // トークン文字列を返します
                return token;
            };

            // 要素からインラインテキスト（数式トークン置換・<br>改行維持・太字/コード等のラン情報またはプレーン文字列）を抽出する補助関数です
            const extractCleanText = (rootEl) => {
                // ノードを再帰的に走査して文字列を組み立てます
                const walk = (node) => {
                    // テキストノード（nodeType === 3）の場合
                    if (node.nodeType === 3) {
                        // 連続する改行・空白を半角スペース1つに正規化して返します
                        return node.nodeValue.replace(/[\r\n]+/g, ' ');
                    }
                    // 要素ノード（nodeType === 1）以外の場合は空文字を返します
                    if (node.nodeType !== 1) {
                        // 空文字を返却します
                        return '';
                    }
                    // タグ名を小文字で取得します
                    const tag = node.tagName.toLowerCase();
                    // scriptやstyleタグは除外します
                    if (tag === 'script' || tag === 'style') {
                        // 空文字を返却します
                        return '';
                    }
                    // 改行タグ（<br>）の場合は改行文字を返します
                    if (tag === 'br') {
                        // 改行を返却します
                        return '\n';
                    }
                    // MathJaxコンテナ、KaTeXコンテナ、またはmathタグの場合は数式トークンへ変換します
                    if (tag === 'mjx-container' || tag === 'math' || node.classList.contains('katex')) {
                        // 登録してプレースホルダートークンを返します
                        return registerMathElement(node);
                    }
                    // KaTeXのHTML表示側（.katex-html）は親の.katexで処理済みのためスキップします
                    if (node.classList.contains('katex-html') || node.classList.contains('katex-mathml')) {
                        // 空文字を返却します
                        return '';
                    }
                    // 子ノードを順番に走査して連結します
                    let buf = '';
                    // childNodesを走査します
                    for (const child of node.childNodes) {
                        // 子ノードのテキストを追加します
                        buf += walk(child);
                    }
                    // 連結した文字列を返します
                    return buf;
                };
                // 抽出結果の前後空白をトリムして返します
                return walk(rootEl).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
            };

            // 要素の画面上の見た目（marp-auto-scaling等のSVGスケーリングを含む）に一致するフォントサイズ（px）を取得する関数です
            const getEffectiveFontSizePx = (el) => {
                // 計算済みスタイルから基本フォントサイズを取得します
                const style = window.getComputedStyle(el);
                // 数値化します
                let fs = parseFloat(style.fontSize) || 18;
                // 要素のクライアント高さとバウンディングボックス高さの比率からスケーリング倍率を検出します
                const rect = el.getBoundingClientRect();
                // offsetHeightが存在し、縮小されている場合
                if (el.offsetHeight > 4 && rect.height > 0) {
                    // スケール比を計算します
                    const scaleY = rect.height / el.offsetHeight;
                    // 明らかな縮小または拡大（0.2〜1.5倍）が掛かっている場合はフォントサイズに反映します
                    if (scaleY > 0.15 && scaleY < 0.98) {
                        // 実効フォントサイズへ補正します
                        fs = fs * scaleY;
                    }
                }
                // 計算されたフォントサイズ（px）を返します
                return fs;
            };

            // DOM Rangeを用いて要素内部で実際に描画されているテキスト文字列のタイトな外接矩形と行数を取得する関数です
            const getTightTextRect = (el) => {
                // フォールバック用に要素全体のバウンディングボックスを取得します
                const fallbackRect = el.getBoundingClientRect();
                // 例外発生に備えてtryブロックで囲みます
                try {
                    // Rangeオブジェクトを生成します
                    const range = document.createRange();
                    // 対象要素の内部コンテンツ全体を選択範囲に設定します
                    range.selectNodeContents(el);
                    // 選択範囲の外接矩形を取得します
                    const rRect = range.getBoundingClientRect();
                    // 各行のクライアント矩形一覧を取得し、有効なサイズのものだけを抽出します
                    const clientRects = Array.from(range.getClientRects()).filter(r => r.width > 0.5 && r.height > 0.5);
                    // 外接矩形の幅と高さが有効な場合
                    if (rRect.width > 0.5 && rRect.height > 0.5) {
                        // 行数を判定するため、Y座標（top）が異なる行の基準位置を格納する配列です
                        const lineTops = [];
                        // 各クライアント矩形を走査します
                        for (const cr of clientRects) {
                            // 既存の行から8px以上離れている場合は新しい行として記録します
                            if (!lineTops.some(t => Math.abs(t - cr.top) < 8)) {
                                // 行のtop座標を追加します
                                lineTops.push(cr.top);
                            }
                        }
                        // 計測したタイトな外接矩形と行数を返却します
                        return {
                            // 左端X座標
                            left: rRect.left,
                            // 上端Y座標
                            top: rRect.top,
                            // 右端X座標
                            right: rRect.right,
                            // 下端Y座標
                            bottom: rRect.bottom,
                            // テキスト実描画幅
                            width: rRect.width,
                            // テキスト実描画高さ
                            height: rRect.height,
                            // 描画行数（最低1行）
                            lineCount: Math.max(1, lineTops.length)
                        };
                    }
                // エラー時はフォールバック矩形を使用します
                } catch (e) {}
                // フォールバック矩形を返却します
                return {
                    // 左端X座標
                    left: fallbackRect.left,
                    // 上端Y座標
                    top: fallbackRect.top,
                    // 右端X座標
                    right: fallbackRect.right,
                    // 下端Y座標
                    bottom: fallbackRect.bottom,
                    // 幅
                    width: fallbackRect.width,
                    // 高さ
                    height: fallbackRect.height,
                    // 行数1
                    lineCount: 1
                };
            };

            // Windows PowerPointのメイリオ（Meiryo）フォントで描画した際の1行あたりの必要横幅（px）を推定する関数です
            const estimateMeiryoSingleLineWidth = (text, fontSizePx, isBold) => {
                // 改行で文字列を行単位に分割します
                const lines = String(text || '').split('\n');
                // 太字時は字幅が約6%広がるため補正係数を設定します
                const boldFactor = isBold ? 1.06 : 1.01;
                // 最大行幅を保持する変数を初期化します
                let maxW = 0;
                // 各行の文字幅を合計します
                for (const line of lines) {
                    // 現在の行の推定幅を初期化します
                    let lineW = 0;
                    // 行内の各文字を走査します
                    for (const ch of line) {
                        // 文字のUnicodeコードポイントを取得します
                        const code = ch.codePointAt(0) || 0;
                        // 半角ASCII文字は0.60em、全角文字（日本語かな・漢字・全角記号）は1.0emとして計算します
                        lineW += (code <= 0x007F ? 0.60 : 1.0) * fontSizePx * boldFactor;
                    }
                    // 最大幅を更新します
                    if (lineW > maxW) {
                        // 最大行幅を代入します
                        maxW = lineW;
                    }
                }
                // 端数切り上げと安全マージン（6px）を加算して返します
                return Math.ceil(maxW) + 6;
            };

            // メイリオ（Meiryo）または等幅フォント（Consolas）で指定横幅（availWidthPx）内にテキストを描画した際の折り返し総行数を厳密に推定する関数です
            const estimateWrappedLinesCount = (text, fontSizePx, availWidthPx, isBold, isMonospace = false) => {
                // 有効な横幅（最低20px）を確保します
                const safeW = Math.max(20, availWidthPx);
                // 太字時は字幅が広がるため補正係数を設定します
                const boldFactor = isBold ? 1.06 : 1.01;
                // 改行文字で行単位に分割します
                const rawLines = String(text || '').split('\n');
                // 折り返し後の総行数を初期化します
                let totalLines = 0;
                // 各論理行を走査します
                for (const line of rawLines) {
                    // 空行の場合は1行としてカウントします
                    if (line.length === 0) {
                        // 1行加算します
                        totalLines += 1;
                        // 次の行へ進みます
                        continue;
                    }
                    // 現在の行の累積幅（px）を初期化します
                    let lineW = 0;
                    // 行内の各文字を走査して幅を積算します
                    for (const ch of line) {
                        // Unicodeコードポイントを取得します
                        const code = ch.codePointAt(0) || 0;
                        // 等幅（Consolas）時はASCII 0.58em・全角1.02em、メイリオ時はASCII 0.60em・全角1.0emとして計算します
                        const emRatio = isMonospace ? (code <= 0x007F ? 0.58 : 1.02) : (code <= 0x007F ? 0.60 : 1.0);
                        // 1文字分の幅を加算します
                        lineW += emRatio * fontSizePx * boldFactor;
                    }
                    // 利用可能幅で割って折り返し行数を算出し加算します
                    totalLines += Math.max(1, Math.ceil((lineW + 4) / safeW));
                }
                // 最低1行を保証して返却します
                return Math.max(1, totalLines);
            };

            // 同一親コンテナ内で対象要素（el）の直下に配置されている次の可視ブロック要素の上端Y座標（スライド相対px）を取得する関数です
            const getNextSiblingTopBoundaryPx = (el, slide, slideRect) => {
                // デフォルトの下限境界（出典h5の上端645px、またはフッター帯手前672px）を設定します
                const hasH5 = Boolean(slide.querySelector('h5'));
                // スライド種別に応じた基本下限Y座標を決定します
                let boundaryY = (slide.getAttribute('data-marpit-pagination') === '1') ? 668 : (hasH5 ? 644 : 672);
                // 親要素が存在する場合、後続の兄弟要素の実際の描画上端を確認します
                if (el && el.parentElement) {
                    // 次の兄弟要素から走査を開始します
                    let nextEl = el.nextElementSibling;
                    // 後続要素を順番に確認します
                    while (nextEl) {
                        // タグ名を小文字で取得します
                        const nTag = nextEl.tagName.toLowerCase();
                        // 見出しアンカー（h1〜h6）自体は高さ0の非表示要素なのでスキップします
                        if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style'].includes(nTag)) {
                            // 計算済みスタイルを取得します
                            const ns = window.getComputedStyle(nextEl);
                            // 可視要素である場合
                            if (ns.display !== 'none' && ns.visibility !== 'hidden' && ns.opacity !== '0') {
                                // バウンディングボックスを取得します
                                const nr = nextEl.getBoundingClientRect();
                                // 対象要素より下側に配置されている有効な要素であれば、その上端（マージン4px手前）を境界とします
                                const elRect = el.getBoundingClientRect();
                                // 下側に位置しているか判定します
                                if (nr.height > 2 && nr.top >= elRect.top + 8) {
                                    // 次の要素の上端Y座標（スライド相対px）を計算します
                                    const nextTopY = (nr.top - slideRect.top) - 4;
                                    // 境界Y座標をより厳しい（小さい）方で更新します
                                    boundaryY = Math.min(boundaryY, nextTopY);
                                    // 直近の次要素が見つかったためループを終了します
                                    break;
                                }
                            }
                        }
                        // さらに次の兄弟要素へ進みます
                        nextEl = nextEl.nextElementSibling;
                    }
                    // 親要素がスライド自身でない場合（2段組のカラムli等）、親要素の下端も境界上限として考慮します
                    if (el.parentElement !== slide) {
                        // 親要素の矩形を取得します
                        const pr = el.parentElement.getBoundingClientRect();
                        // 親要素の下端Y座標（スライド相対px）を計算します
                        const parentBottomY = pr.bottom - slideRect.top;
                        // 境界Y座標を更新します
                        boundaryY = Math.min(boundaryY, parentBottomY);
                    }
                }
                // 算出した下限境界Y座標（px）を返却します
                return boundaryY;
            };

            // 会話アバター画像またはデフォルトシルエットアイコンをCanvas上で角丸・背景色付きのPNG Data URIへラスタライズする関数です
            const rasterizeAvatarToPngDataUrl = (avatarImg, bgHexColor) => {
                // 2倍解像度（160x160px）で鮮明に描画するためのキャンバスサイズを定義します
                const canvasSize = 160;
                // 角丸半径（80px時に5px相当＝160px時に10px）を定義します
                const radius = 10;
                // HTML5 Canvas要素を動的生成します
                const canvas = document.createElement('canvas');
                // キャンバスの横幅を設定します
                canvas.width = canvasSize;
                // キャンバスの縦幅を設定します
                canvas.height = canvasSize;
                // 2D描画コンテキストを取得します
                const ctx = canvas.getContext('2d');
                // 角丸クリッピングパスを開始します
                ctx.beginPath();
                // 左上角丸の開始点へ移動します
                ctx.moveTo(radius, 0);
                // 上辺を引きます
                ctx.lineTo(canvasSize - radius, 0);
                // 右上角丸を描画します
                ctx.quadraticCurveTo(canvasSize, 0, canvasSize, radius);
                // 右辺を引きます
                ctx.lineTo(canvasSize, canvasSize - radius);
                // 右下角丸を描画します
                ctx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize);
                // 下辺を引きます
                ctx.lineTo(radius, canvasSize);
                // 左下角丸を描画します
                ctx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius);
                // 左辺を引きます
                ctx.lineTo(0, radius);
                // 左上角丸を描画します
                ctx.quadraticCurveTo(0, 0, radius, 0);
                // パスを閉じます
                ctx.closePath();
                // 角丸領域でクリッピングします
                ctx.clip();

                // 有効なimg要素が渡され、かつ画像のロードが完了している場合
                if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
                    // 例外発生時にメインcanvasが汚染されないよう独立した試行用canvasで描画します
                    try {
                        // 試行用Canvas要素を生成します
                        const imgCanvas = document.createElement('canvas');
                        // 横幅を設定します
                        imgCanvas.width = canvasSize;
                        // 縦幅を設定します
                        imgCanvas.height = canvasSize;
                        // 2Dコンテキストを取得します
                        const imgCtx = imgCanvas.getContext('2d');
                        // 角丸パスを開始します
                        imgCtx.beginPath();
                        // 左上へ移動します
                        imgCtx.moveTo(radius, 0);
                        // 上辺を引きます
                        imgCtx.lineTo(canvasSize - radius, 0);
                        // 右上角丸を描画します
                        imgCtx.quadraticCurveTo(canvasSize, 0, canvasSize, radius);
                        // 右辺を引きます
                        imgCtx.lineTo(canvasSize, canvasSize - radius);
                        // 右下角丸を描画します
                        imgCtx.quadraticCurveTo(canvasSize, canvasSize, canvasSize - radius, canvasSize);
                        // 下辺を引きます
                        imgCtx.lineTo(radius, canvasSize);
                        // 左下角丸を描画します
                        imgCtx.quadraticCurveTo(0, canvasSize, 0, canvasSize - radius);
                        // 左辺を引きます
                        imgCtx.lineTo(0, radius);
                        // 左上角丸を描画します
                        imgCtx.quadraticCurveTo(0, 0, radius, 0);
                        // パスを閉じます
                        imgCtx.closePath();
                        // クリッピングを適用します
                        imgCtx.clip();
                        // 画像をキャンバス全体へ描画します
                        imgCtx.drawImage(avatarImg, 0, 0, canvasSize, canvasSize);
                        // PNG形式のData URIとして返却します
                        return imgCanvas.toDataURL('image/png');
                    // 描画失敗時はシルエット描画へフォールバックします
                    } catch (e) {}
                }

                // デフォルトアイコンの背景色（CSS規定値 #bbbbbb）で角丸矩形を塗りつぶします
                ctx.fillStyle = '#' + (bgHexColor || 'BBBBBB');
                // 全面を塗りつぶします
                ctx.fillRect(0, 0, canvasSize, canvasSize);
                // CSS（background-size: 70%; background-position: center bottom;）に合わせてシルエットを描画します
                const iconBoxSize = canvasSize * 0.70;
                // 水平中央のオフセットX座標を計算します
                const offsetX = (canvasSize - iconBoxSize) / 2;
                // 下端揃えのオフセットY座標を計算します
                const offsetY = canvasSize - iconBoxSize;
                // 描画状態を保存します
                ctx.save();
                // 描画原点をシルエット配置位置へ移動します
                ctx.translate(offsetX, offsetY);
                // 24x24のSVG viewBoxをiconBoxSizeへ拡大するスケールを適用します
                ctx.scale(iconBoxSize / 24, iconBoxSize / 24);
                // シルエットの塗りつぶし色を白（#ffffff）に設定します
                ctx.fillStyle = '#ffffff';
                // テーマCSSと同一の人物シルエットSVGパスを生成します
                const personPath = new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
                // パスを白色で塗りつぶします
                ctx.fill(personPath);
                // 描画状態を復元します
                ctx.restore();
                // PNG形式のData URIとして返却します
                return canvas.toDataURL('image/png');
            };

            // コンテンツ画像（<img>）のobject-fit: contain実描画領域とPowerPoint互換画像ソースを取得する補助関数です
            const getContainedImageRect = (imgEl, slideRect) => {
                // 画像要素のバウンディングボックスを取得します
                const ir = imgEl.getBoundingClientRect();
                // 自然幅（naturalWidth）を取得します（未確定時はボックス幅）
                const natW = imgEl.naturalWidth || ir.width;
                // 自然高さ（naturalHeight）を取得します（未確定時はボックス高さ）
                const natH = imgEl.naturalHeight || ir.height;
                // 縦横比を維持して収まる縮小拡大率を計算します
                const scale = (natW > 0 && natH > 0) ? Math.min(ir.width / natW, ir.height / natH) : 1;
                // 実描画幅を計算します
                const fitW = natW * scale;
                // 実描画高さを計算します
                const fitH = natH * scale;
                // 水平中央揃えの実描画X座標を計算します
                const fitX = (ir.left - slideRect.left) + ((ir.width - fitW) / 2);
                // 垂直中央揃えの実描画Y座標を計算します
                const fitY = (ir.top - slideRect.top) + ((ir.height - fitH) / 2);
                // 画像ソースURLを取得します
                let imgSrc = imgEl.src || '';
                // SVG画像または外部HTTP画像の場合はPowerPointでのリンク切れ防止のため高解像度PNG Data URIへ変換します
                if (imgSrc.toLowerCase().endsWith('.svg') || imgSrc.startsWith('data:image/svg') || imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
                    // 例外保護ブロックを開始します
                    try {
                        // 2倍解像度のCanvasを作成します
                        const c = document.createElement('canvas');
                        // キャンバス幅を設定します
                        c.width = Math.max(16, Math.round(fitW * 2));
                        // キャンバス高さを設定します
                        c.height = Math.max(16, Math.round(fitH * 2));
                        // 2Dコンテキストを取得します
                        const cctx = c.getContext('2d');
                        // 画像をキャンバスへ描画します
                        cctx.drawImage(imgEl, 0, 0, c.width, c.height);
                        // PNG Data URIへ変換します
                        imgSrc = c.toDataURL('image/png');
                    // 変換失敗時は元のソースまたはフォールバックを使用します
                    } catch (e) {
                        // アバターラスタライズ関数へフォールバックします
                        imgSrc = rasterizeAvatarToPngDataUrl(imgEl, 'FFFFFF');
                    }
                }
                // 計測した実描画座標・サイズ・画像ソースを返却します
                return { x: fitX, y: fitY, w: fitW, h: fitH, src: imgSrc };
            };

            // リスト要素（<ul> / <ol>）から階層付き箇条書きアイテム配列を抽出する関数です
            const extractListItems = (listEl, level = 0) => {
                // 結果アイテム配列を初期化します
                const items = [];
                // 番号付きリスト（ol）であるか判定します
                const isOrdered = listEl.tagName.toLowerCase() === 'ol';
                // 直下のli要素を走査します
                Array.from(listEl.children).forEach((li, idx) => {
                    // liタグ以外はスキップします
                    if (li.tagName.toLowerCase() !== 'li') {
                        // 次へ進みます
                        return;
                    }
                    // 目次アイテム（li.toc-item）の場合の特別処理です
                    if (li.classList.contains('toc-item')) {
                        // タイトルリンク要素を取得します
                        const aEl = li.querySelector('a');
                        // ページ番号要素を取得します
                        const pageEl = li.querySelector('.toc-page');
                        // 両方存在する場合
                        if (aEl && pageEl) {
                            // タイトル文字列を取得します
                            const titleStr = extractCleanText(aEl);
                            // ページ番号文字列を取得します
                            const pageStr = extractCleanText(pageEl);
                            // 項目全体の矩形を取得します
                            const liRect = li.getBoundingClientRect();
                            // タイトルの矩形を取得します
                            const aRect = aEl.getBoundingClientRect();
                            // ページ番号の矩形を取得します
                            const pRect = pageEl.getBoundingClientRect();
                            // 計算済みスタイルを取得します
                            const liStyle = window.getComputedStyle(li);
                            // フォントサイズを取得します
                            const fontPx = parseFloat(liStyle.fontSize) || 20;
                            // リーダー線領域の空き幅（px）を計算します
                            const availLeaderPx = Math.max(24, (pRect.left - aRect.right) - 16);
                            // 中黒（・）1文字あたりの幅（フォントサイズと同じ）でリーダー文字数を算出します
                            const dotCount = Math.max(2, Math.floor(availLeaderPx / fontPx));
                            // タイトル＋リーダー＋ページ番号を結合します
                            const tocText = `${titleStr}  ${'・'.repeat(dotCount)}  ${pageStr}`;
                            // リスト項目として追加します
                            items.push({
                                // テキスト本文
                                text: tocText,
                                // インデント階層
                                level: 0,
                                // 目次では先頭バレットを非表示にします
                                bullet: false,
                                // 文字色を取得します
                                color: rgbToHex(window.getComputedStyle(aEl).color) || '1F497D',
                                // フォントサイズ（px）
                                fontSize: fontPx,
                                // 太字設定
                                bold: true,
                                // 項目矩形情報
                                itemRect: { top: liRect.top, height: liRect.height }
                            });
                            // 次のliへ進みます
                            return;
                        }
                    }

                    // 通常のli要素の場合、ネストされたul/olを除いた自身のテキストを抽出します
                    const clone = li.cloneNode(true);
                    // クローンから子階層のul/olを削除します
                    clone.querySelectorAll('ul, ol').forEach(sub => sub.remove());
                    // li自身のテキスト（数式があれば登録するため実DOMの直接の子ノードから抽出）を組み立てます
                    let ownText = '';
                    // 実DOMのchildNodesを走査します
                    for (const child of li.childNodes) {
                        // 子要素がulまたはolの場合はスキップします
                        if (child.nodeType === 1 && ['ul', 'ol'].includes(child.tagName.toLowerCase())) {
                            // ネストリストは後続で再帰処理するため飛ばします
                            continue;
                        }
                        // テキストノードの場合
                        if (child.nodeType === 3) {
                            // 改行をスペースに正規化して追加します
                            ownText += child.nodeValue.replace(/[\r\n]+/g, ' ');
                        // 要素ノードの場合
                        } else if (child.nodeType === 1) {
                            // インライン要素のテキスト（数式トークン含む）を抽出して追加します
                            const tag = child.tagName.toLowerCase();
                            // 改行タグの場合
                            if (tag === 'br') {
                                // 改行を追加します
                                ownText += '\n';
                            // 数式コンテナの場合
                            } else if (tag === 'mjx-container' || tag === 'math' || child.classList.contains('katex')) {
                                // 数式を登録してトークンを追加します
                                ownText += registerMathElement(child);
                            // その他のインライン要素または段落（p）の場合
                            } else {
                                // 再帰的にクリーンテキストを抽出します
                                ownText += extractCleanText(child);
                            }
                        }
                    }
                    // 前後の空白を整えます
                    ownText = ownText.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
                    // liの計算済みスタイルを取得します
                    const liStyle = window.getComputedStyle(li);
                    // li自身のテキストが存在する場合は配列へ追加します
                    if (ownText) {
                        // 箇条書きアイテムを追加します
                        items.push({
                            // テキスト
                            text: ownText,
                            // 階層レベル
                            level,
                            // 箇条書き記号（番号付きまたは黒丸）
                            bullet: isOrdered ? { type: 'number' } : true,
                            // 文字色
                            color: rgbToHex(liStyle.color) || '000000',
                            // フォントサイズ（px）
                            fontSize: getEffectiveFontSizePx(li),
                            // 太字判定
                            bold: liStyle.fontWeight === 'bold' || parseInt(liStyle.fontWeight) >= 700
                        });
                    }

                    // 直下のネストされたul/olを走査して再帰的に追加します
                    Array.from(li.children).forEach(sub => {
                        // タグ名を確認します
                        const subTag = sub.tagName.toLowerCase();
                        // ulまたはolであれば階層を+1して再帰呼び出しします
                        if (subTag === 'ul' || subTag === 'ol') {
                            // 子リストのアイテム群を追加します
                            items.push(...extractListItems(sub, level + 1));
                        }
                    });
                });
                // 抽出したアイテム配列を返却します
                return items;
            };

            // コードブロック（<pre> / <marp-pre>）からシンタックスハイライト色を保持したテキストラン配列を抽出する関数です
            const extractCodeRuns = (preEl) => {
                // 内部のcode要素（なければpre自身）を対象とします
                const codeEl = preEl.querySelector('code') || preEl;
                // デフォルトの文字色を取得します
                const defaultColor = rgbToHex(window.getComputedStyle(codeEl).color) || '24292E';
                // ラン配列を初期化します
                const runs = [];

                // ノードを再帰走査して色付きテキストランを収集します
                const walkCode = (node, inheritedColor, inheritedBold) => {
                    // テキストノードの場合
                    if (node.nodeType === 3) {
                        // テキスト値を取得します
                        const val = node.nodeValue;
                        // 空でなければランとして追加します
                        if (val && val.length > 0) {
                            // ランオブジェクトを追加します
                            runs.push({
                                // テキスト文字列
                                text: val,
                                // 文字色
                                color: inheritedColor,
                                // 太字フラグ
                                bold: inheritedBold
                            });
                        }
                        // リターンします
                        return;
                    }
                    // 要素ノードの場合
                    if (node.nodeType === 1) {
                        // 計算済みスタイルを取得します
                        const st = window.getComputedStyle(node);
                        // 色を取得します
                        const col = rgbToHex(st.color) || inheritedColor;
                        // 太字を判定します
                        const bld = st.fontWeight === 'bold' || parseInt(st.fontWeight) >= 700 || inheritedBold;
                        // 子ノードを再帰走査します
                        for (const ch of node.childNodes) {
                            // 子ノードを処理します
                            walkCode(ch, col, bld);
                        }
                    }
                };

                // ルートcode要素から走査を開始します
                walkCode(codeEl, defaultColor, false);
                // 末尾の余分な改行をトリムします
                if (runs.length > 0) {
                    // 最後のランの末尾改行を除去します
                    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\n+$/, '');
                }
                // 抽出したラン配列を返します
                return runs;
            };

            // HTMLの <table> 要素からPptxGenJSの addTable 用の行・セル構造および寸法・スタイルを抽出する関数です
            const extractTableData = (tableEl, slideRect) => {
                // テーブル全体の矩形を取得します
                const tRect = tableEl.getBoundingClientRect();
                // 幅または高さが0の場合はnullを返します
                if (tRect.width === 0 || tRect.height === 0) {
                    // 無効としてnullを返却します
                    return null;
                }
                // テーブル内のすべての行（tr）を取得します
                const trList = Array.from(tableEl.querySelectorAll('tr'));
                // 行が存在しない場合はnullを返します
                if (trList.length === 0) {
                    // 無効としてnullを返却します
                    return null;
                }

                // 各列の横幅（px）を最初の有効な行（または各列の単一セル）から計測します
                const colWidthsPx = [];
                // 各行の高さ（px）を格納する配列です
                const rowHeightsPx = [];
                // PptxGenJS形式の二次元セル配列です
                const rows = [];

                // 1行目のセルから列幅を初期化します
                const firstRowCells = Array.from(trList[0].children).filter(c => ['th', 'td'].includes(c.tagName.toLowerCase()));
                // 各セルの幅を記録します
                firstRowCells.forEach(cell => {
                    // セルの矩形を取得します
                    const cr = cell.getBoundingClientRect();
                    // colspan属性値を取得します
                    const span = parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
                    // スパン数で均等割りした幅を追加します
                    for (let k = 0; k < span; k++) {
                        // 列幅（px）を追加します
                        colWidthsPx.push(cr.width / span);
                    }
                });

                // 各行（tr）を走査してセルデータとスタイルを抽出します
                trList.forEach(tr => {
                    // 行の矩形を取得します
                    const rRect = tr.getBoundingClientRect();
                    // 行の高さ（px）を記録します
                    rowHeightsPx.push(Math.max(16, rRect.height));
                    // この行のセル配列を初期化します
                    const rowCells = [];
                    // 行内のth/td要素を取得します
                    const cells = Array.from(tr.children).filter(c => ['th', 'td'].includes(c.tagName.toLowerCase()));

                    // 各セルを走査します
                    cells.forEach(cell => {
                        // セルのタグ名（th または td）を取得します
                        const cellTag = cell.tagName.toLowerCase();
                        // セルの計算済みスタイルを取得します
                        const cs = window.getComputedStyle(cell);
                        // 親のtrおよびtableの背景色も確認して透過時のフォールバックとします
                        const trBg = rgbToHex(window.getComputedStyle(tr).backgroundColor);
                        // セル自身の背景色を取得します（thのデフォルトはテーマ薄青色DDE5EF、tdは白FFFFFF）
                        const cellBg = rgbToHex(cs.backgroundColor) || trBg || (cellTag === 'th' ? 'DDE5EF' : 'FFFFFF');
                        // セルの文字色を取得します（thおよびtdともに通常は黒000000）
                        const cellColor = rgbToHex(cs.color) || '000000';
                        // セルのフォントサイズ（px）を取得します
                        const cellFontPx = getEffectiveFontSizePx(cell);
                        // 太字であるか判定します（thまたはfont-weight>=700）
                        const isBold = cellTag === 'th' || cs.fontWeight === 'bold' || parseInt(cs.fontWeight) >= 700;
                        // 水平揃えを取得します
                        let align = cs.textAlign || 'left';
                        // start/endをleft/rightへ正規化します
                        if (align === 'start' || align === '-webkit-auto') align = 'left';
                        // endをrightへ正規化します
                        if (align === 'end') align = 'right';
                        // 垂直揃えを取得します
                        let valign = cs.verticalAlign || 'middle';
                        // PptxGenJSのtop/middle/bottomへ正規化します
                        if (!['top', 'middle', 'bottom'].includes(valign)) valign = 'middle';

                        // 罫線色を抽出します
                        const borderTopColor = rgbToHex(cs.borderTopColor) || 'CCCCCC';
                        // 下罫線色を抽出します（thの場合はテーマカラーまたはアクセント色）
                        const borderBottomColor = rgbToHex(cs.borderBottomColor) || (cellTag === 'th' ? (slidePrimaryColor || '1F497D') : 'CCCCCC');
                        // 左罫線色を抽出します
                        const borderLeftColor = rgbToHex(cs.borderLeftColor) || 'CCCCCC';
                        // 右罫線色を抽出します
                        const borderRightColor = rgbToHex(cs.borderRightColor) || 'CCCCCC';
                        // 罫線太さ（px）をptへ変換します
                        const btPt = Math.max(0.5, (parseFloat(cs.borderTopWidth) || 1) * 0.75);
                        // 下罫線太さ（pt）です（thの場合は最低1.5pt）
                        const bbPt = Math.max(cellTag === 'th' ? 1.5 : 0.5, (parseFloat(cs.borderBottomWidth) || 1) * 0.75);
                        // 左罫線太さ（pt）です
                        const blPt = Math.max(0.5, (parseFloat(cs.borderLeftWidth) || 1) * 0.75);
                        // 右罫線太さ（pt）です
                        const brPt = Math.max(0.5, (parseFloat(cs.borderRightWidth) || 1) * 0.75);

                        // セル内のテキスト（数式トークンや<br>を含む）を抽出します
                        const cellText = extractCleanText(cell);
                        // colspan属性を取得します
                        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
                        // rowspan属性を取得します
                        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10) || 1;
                        // セルの実際の描画矩形を取得します
                        const cellRect = cell.getBoundingClientRect();
                        // セル内テキストのタイト矩形と行数を取得します
                        const cellTight = getTightTextRect(cell);
                        // 出力用のセルフォントサイズ（px）を初期化します
                        let effectiveCellFontPx = cellFontPx;
                        // セルの左右パディングを除いた有効横幅（px）を計算します
                        const availCellW = Math.max(16, cellRect.width - 10);
                        // セルの上下パディングを除いた有効縦幅（px）を計算します
                        const availCellH = Math.max(14, (cellRect.height || rRect.height) - 6);
                        // ブラウザ上で1行表示だったセルがメイリオ変換で2行に折り返されないよう幅を確認します
                        if (cellTight.lineCount <= 1 && !cellText.includes('\n') && cellRect.width > 20) {
                            // メイリオ描画時の1行必要幅を推定します
                            const meiryoCellW = estimateMeiryoSingleLineWidth(cellText, cellFontPx, isBold);
                            // メイリオ推定幅がセル有効幅を超える場合は1行に収まるようフォントサイズを微縮小します
                            if (meiryoCellW > availCellW) {
                                // 縮小後のフォントサイズを計算します
                                effectiveCellFontPx = Math.max(6.5, cellFontPx * (availCellW / meiryoCellW));
                            }
                        // 複数行表示のセルの場合、メイリオ折り返し時の総行高がセル高さを超えないよう厳密に縮小します
                        } else if (cellText && cellRect.width > 20) {
                            // セル高さに収まるまで0.5px刻みでフォントサイズを検証します
                            while (effectiveCellFontPx > 6.5) {
                                // 現在のフォントサイズでの折り返し行数を推定します
                                const wrappedLines = estimateWrappedLinesCount(cellText, effectiveCellFontPx, availCellW, isBold, false);
                                // 必要縦幅（行高1.32倍）がセル有効高さ以内であれば確定します
                                if (wrappedLines * effectiveCellFontPx * 1.32 <= availCellH + 2) {
                                    // ループを終了します
                                    break;
                                }
                                // 0.5px縮小して再検証します
                                effectiveCellFontPx -= 0.5;
                            }
                        }

                        // セルオブジェクトを構築して行配列へ追加します
                        rowCells.push({
                            // セルテキスト
                            text: cellText,
                            // セルオプション
                            options: {
                                // 背景塗りつぶし色
                                fill: { color: cellBg },
                                // 文字色
                                color: cellColor,
                                // フォントサイズ（pxからptへ変換）
                                fontSize: Math.max(5, effectiveCellFontPx * 0.75),
                                // フォントファミリー
                                fontFace: 'Meiryo',
                                // 太字フラグ
                                bold: isBold,
                                // 水平位置揃え
                                align,
                                // 垂直位置揃え
                                valign,
                                // 列結合数
                                colspan: colspan > 1 ? colspan : undefined,
                                // 行結合数
                                rowspan: rowspan > 1 ? rowspan : undefined,
                                // セル内側余白（上, 右, 下, 左 インチ）
                                margin: [0.02, 0.04, 0.02, 0.04],
                                // 上下左右の罫線定義
                                border: [
                                    // 上罫線
                                    { type: 'solid', pt: btPt, color: borderTopColor },
                                    // 右罫線
                                    { type: 'solid', pt: brPt, color: borderRightColor },
                                    // 下罫線
                                    { type: 'solid', pt: bbPt, color: borderBottomColor },
                                    // 左罫線
                                    { type: 'solid', pt: blPt, color: borderLeftColor }
                                ]
                            }
                        });
                    });

                    // 構築した行をテーブル行配列に追加します
                    rows.push(rowCells);
                });

                // 抽出したテーブル構造オブジェクトを返却します
                return {
                    // 要素タイプをtableに設定
                    type: 'table',
                    // スライド左上からのX座標（px）
                    x: tRect.left - slideRect.left,
                    // スライド左上からのY座標（px）
                    y: tRect.top - slideRect.top,
                    // テーブル横幅（px）
                    w: tRect.width,
                    // テーブル縦幅（px）
                    h: tRect.height,
                    // 二次元セルデータ
                    rows,
                    // 列幅配列（px）
                    colWidthsPx,
                    // 行高配列（px）
                    rowHeightsPx,
                    // 重なり順（z-index）
                    zIndex: 20
                };
            };

            // MermaidのSVG要素（div.mermaid > svg）を個別のネイティブPowerPoint図形・コネクタ線・テキストボックスへ分解抽出する関数です
            const extractMermaidPrimitives = (mermaidContainer, slideRect) => {
                // 内部のsvg要素を取得します
                const svg = mermaidContainer.querySelector('svg');
                // svgが存在しない場合は空配列を返します
                if (!svg) {
                    // 空配列を返却します
                    return [];
                }
                // SVG全体の画面上の矩形を取得します
                const svgRect = svg.getBoundingClientRect();
                // 幅または高さが0の場合は空配列を返します
                if (svgRect.width === 0 || svgRect.height === 0) {
                    // 空配列を返却します
                    return [];
                }

                // 分解されたプリミティブ要素群を格納する配列です
                const primitives = [];

                // 1. クラスター（subgraph等の背景枠 g.cluster）を抽出します
                svg.querySelectorAll('g.cluster').forEach(cluster => {
                    // クラスターの外枠rectを取得します
                    const rectEl = cluster.querySelector('rect');
                    // 矩形が存在する場合
                    if (rectEl) {
                        // 画面上のバウンディングボックスを取得します
                        const r = rectEl.getBoundingClientRect();
                        // スタイルを取得します
                        const st = window.getComputedStyle(rectEl);
                        // 有効なサイズがある場合
                        if (r.width > 1 && r.height > 1) {
                            // クラスター背景矩形を追加します
                            primitives.push({
                                // 図形タイプ
                                type: 'mermaid-shape',
                                // 矩形シェイプ
                                shapeType: 'rect',
                                // X座標（px）
                                x: r.left - slideRect.left,
                                // Y座標（px）
                                y: r.top - slideRect.top,
                                // 幅（px）
                                w: r.width,
                                // 高さ（px）
                                h: r.height,
                                // 塗りつぶし色
                                fillColor: rgbToHex(st.fill) || 'F8F9FA',
                                // 枠線色
                                strokeColor: rgbToHex(st.stroke) || 'CCCCCC',
                                // 枠線太さ（pt）
                                strokePt: Math.max(0.75, (parseFloat(st.strokeWidth) || 1) * 0.75),
                                // 破線判定
                                dash: st.strokeDasharray && st.strokeDasharray !== 'none' && st.strokeDasharray !== '0px',
                                // ラベルテキスト（空）
                                text: '',
                                // 背面に配置するz-index
                                zIndex: 12
                            });
                        }
                    }
                    // クラスターラベルを取得します
                    const labelEl = cluster.querySelector('.cluster-label, foreignObject, text');
                    // ラベルが存在する場合
                    if (labelEl) {
                        // ラベルテキストを取得します
                        const txt = extractCleanText(labelEl);
                        // 矩形を取得します
                        const lr = labelEl.getBoundingClientRect();
                        // テキストが存在しサイズが有効な場合
                        if (txt && lr.width > 0 && lr.height > 0) {
                            // 独立テキストボックスとして追加します
                            primitives.push({
                                // 要素タイプ
                                type: 'text',
                                // タグ種別
                                tag: 'mermaid-label',
                                // テキスト
                                text: txt,
                                // X座標
                                x: lr.left - slideRect.left - 4,
                                // Y座標
                                y: lr.top - slideRect.top - 2,
                                // 幅
                                w: lr.width + 8,
                                // 高さ
                                h: lr.height + 4,
                                // 文字色
                                color: '333333',
                                // 背景色なし
                                bgColor: null,
                                // フォントサイズ（px）
                                fontSize: 12,
                                // 太字
                                fontWeight: 'bold',
                                // 中央揃え
                                textAlign: 'center',
                                // 垂直中央
                                valign: 'middle',
                                // z-index
                                zIndex: 18
                            });
                        }
                    }
                });

                // 2. エッジ（矢印・接続線: path.flowchart-link, .edgePaths path, line.messageLine0, line.messageLine1 等）を抽出します
                const edgePaths = Array.from(svg.querySelectorAll('path.flowchart-link, g.edgePath path.path, g.edgePaths path, line[class*="messageLine"], path[class*="transition"], path.er.relationshipLine'));
                // 各エッジ要素を走査します
                edgePaths.forEach(edgeEl => {
                    // マーカー定義（defs内）のパスは除外します
                    if (edgeEl.closest('defs') || edgeEl.classList.contains('arrowMarkerPath')) {
                        // スキップします
                        return;
                    }
                    // 計算済みスタイルを取得します
                    const st = window.getComputedStyle(edgeEl);
                    // 非表示または透明なエッジはスキップします
                    if (st.display === 'none' || st.visibility === 'hidden' || st.stroke === 'none') {
                        // スキップします
                        return;
                    }

                    // 始点と終点のSVG座標を取得してスクリーン座標（スライド相対px）へ変換します
                    let startPt = null;
                    // 終点座標変数です
                    let endPt = null;
                    // SVGのCTM（座標変換行列）を取得します
                    const ctm = edgeEl.getScreenCTM();

                    // getTotalLengthが利用可能なpathまたはline要素の場合
                    if (typeof edgeEl.getTotalLength === 'function' && ctm) {
                        // 例外に備えます
                        try {
                            // パス全長を取得します
                            const totalLen = edgeEl.getTotalLength();
                            // 長さが正の場合
                            if (totalLen > 0) {
                                // 始点（距離0）のSVG座標を取得します
                                const p0 = edgeEl.getPointAtLength(0);
                                // 終点（距離totalLen）のSVG座標を取得します
                                const p1 = edgeEl.getPointAtLength(totalLen);
                                // CTMを用いてスクリーン上の座標へ変換します
                                startPt = {
                                    // 始点X（スライド相対px）
                                    x: (p0.x * ctm.a + p0.y * ctm.c + ctm.e) - slideRect.left,
                                    // 始点Y（スライド相対px）
                                    y: (p0.x * ctm.b + p0.y * ctm.d + ctm.f) - slideRect.top
                                };
                                // 終点を変換します
                                endPt = {
                                    // 終点X（スライド相対px）
                                    x: (p1.x * ctm.a + p1.y * ctm.c + ctm.e) - slideRect.left,
                                    // 終点Y（スライド相対px）
                                    y: (p1.x * ctm.b + p1.y * ctm.d + ctm.f) - slideRect.top
                                };
                            }
                        // エラー時は無視します
                        } catch (e) {}
                    }

                    // フォールバックとしてバウンディングボックスから座標を取得します
                    if (!startPt || !endPt) {
                        // 矩形を取得します
                        const er = edgeEl.getBoundingClientRect();
                        // サイズが0の場合はスキップします
                        if (er.width === 0 && er.height === 0) {
                            // スキップします
                            return;
                        }
                        // 左上を始点とします
                        startPt = { x: er.left - slideRect.left, y: er.top - slideRect.top };
                        // 右下を終点とします
                        endPt = { x: er.right - slideRect.left, y: er.bottom - slideRect.top };
                    }

                    // 終点矢印マーカーが付いているか判定します
                    const markerEnd = edgeEl.getAttribute('marker-end') || st.markerEnd || '';
                    // 始点矢印マーカーが付いているか判定します
                    const markerStart = edgeEl.getAttribute('marker-start') || st.markerStart || '';
                    // 終点矢印の有無フラグです
                    const hasEndArrow = markerEnd.includes('url(') || edgeEl.classList.contains('messageLine0') || edgeEl.classList.contains('messageLine1');
                    // 始点矢印の有無フラグです
                    const hasStartArrow = markerStart.includes('url(');
                    // 破線パターンであるか判定します
                    const isDashed = (st.strokeDasharray && st.strokeDasharray !== 'none' && st.strokeDasharray !== '0px') || edgeEl.classList.contains('edge-pattern-dashed') || edgeEl.classList.contains('edge-pattern-dotted');

                    // 線のバウンディングボックスと向き（flipH / flipV）を計算します
                    const x = Math.min(startPt.x, endPt.x);
                    // Y座標の最小値です
                    const y = Math.min(startPt.y, endPt.y);
                    // 幅（水平線の場合は0になるため最小0.5px）です
                    const w = Math.max(0.5, Math.abs(endPt.x - startPt.x));
                    // 高さ（垂直線の場合は0になるため最小0.5px）です
                    const h = Math.max(0.5, Math.abs(endPt.y - startPt.y));
                    // 始点が右側にある場合は水平反転フラグを立てます
                    const flipH = startPt.x > endPt.x;
                    // 始点が下側にある場合は垂直反転フラグを立てます
                    const flipV = startPt.y > endPt.y;

                    // エッジ線プリミティブを追加します
                    primitives.push({
                        // 要素タイプをmermaid-lineに設定
                        type: 'mermaid-line',
                        // X座標（px）
                        x,
                        // Y座標（px）
                        y,
                        // 幅（px）
                        w,
                        // 高さ（px）
                        h,
                        // 水平反転
                        flipH,
                        // 垂直反転
                        flipV,
                        // 線色（HEX）
                        strokeColor: rgbToHex(st.stroke) || '666666',
                        // 線の太さ（pt）
                        strokePt: Math.max(1.0, (parseFloat(st.strokeWidth) || 1.5) * 0.75),
                        // 破線フラグ
                        dash: isDashed,
                        // 終点矢印フラグ
                        endArrow: hasEndArrow,
                        // 始点矢印フラグ
                        startArrow: hasStartArrow,
                        // ノードの背面に配置するz-index
                        zIndex: 14
                    });
                });

                // 3. エッジラベル（矢印上のテキスト: g.edgeLabel, text.messageText 等）を抽出します
                svg.querySelectorAll('g.edgeLabel, text.messageText').forEach(labelGroup => {
                    // ラベル文字列を抽出します（改行対応）
                    const fo = labelGroup.querySelector('foreignObject');
                    // テキストを取得します
                    const txt = extractCleanText(fo || labelGroup);
                    // 空文字の場合はスキップします
                    if (!txt) {
                        // スキップします
                        return;
                    }
                    // 矩形を取得します
                    const lr = (fo || labelGroup).getBoundingClientRect();
                    // 幅または高さが0の場合はスキップします
                    if (lr.width === 0 || lr.height === 0) {
                        // スキップします
                        return;
                    }
                    // 背景rectがある場合は背景色を取得します
                    const bgRect = labelGroup.querySelector('rect.background, rect');
                    // 背景色（デフォルトは白）を取得します
                    const bgColor = bgRect ? (rgbToHex(window.getComputedStyle(bgRect).fill) || 'FFFFFF') : 'FFFFFF';
                    // 計算済みスタイルを取得します
                    const st = window.getComputedStyle(fo || labelGroup);
                    // フォントサイズを取得します
                    const fontPx = parseFloat(st.fontSize) || 12;

                    // エッジラベル用のテキストボックスを追加します
                    primitives.push({
                        // 要素タイプ
                        type: 'text',
                        // タグ種別
                        tag: 'mermaid-edge-label',
                        // ラベル文字列
                        text: txt,
                        // X座標（余白補正）
                        x: lr.left - slideRect.left - 4,
                        // Y座標
                        y: lr.top - slideRect.top - 2,
                        // 幅（折り返し防止のため少し余裕を持たせます）
                        w: Math.max(lr.width + 12, 32),
                        // 高さ
                        h: Math.max(lr.height + 4, 18),
                        // 文字色
                        color: rgbToHex(st.color) || rgbToHex(st.fill) || '333333',
                        // 背景色
                        bgColor,
                        // フォントサイズ（px）
                        fontSize: fontPx,
                        // 太字設定
                        fontWeight: 'normal',
                        // 中央揃え
                        textAlign: 'center',
                        // 垂直中央揃え
                        valign: 'middle',
                        // 線より前面に配置するz-index
                        zIndex: 16
                    });
                });

                // 4. ノード図形（g.node, g.actor, g.labelBox 等）を抽出します
                const nodeGroups = Array.from(svg.querySelectorAll('g.node, g.actor, g.note, g.stateGroup, g.classGroup'));
                // 各ノードグループを走査します
                nodeGroups.forEach(nodeGroup => {
                    // ノードの外形を表す図形要素（rect, polygon, circle, ellipse, path）を検索します
                    const shapeEl = nodeGroup.querySelector('rect.label-container, polygon.label-container, circle.label-container, ellipse.label-container, path.label-container, rect.basic, rect.actor, rect.note, rect, polygon, circle, ellipse, path');
                    // 図形要素が見つからない場合はスキップします
                    if (!shapeEl) {
                        // スキップします
                        return;
                    }
                    // 図形の画面上の矩形を取得します
                    const sr = shapeEl.getBoundingClientRect();
                    // 幅または高さが0の場合はスキップします
                    if (sr.width < 1 || sr.height < 1) {
                        // スキップします
                        return;
                    }
                    // 図形の計算済みスタイルを取得します
                    const st = window.getComputedStyle(shapeEl);
                    // 塗りつぶし色を取得します
                    const fillColor = rgbToHex(st.fill) || 'EEEEEE';
                    // 枠線色を取得します
                    const strokeColor = rgbToHex(st.stroke) || '999999';
                    // 枠線の太さ（pt）を取得します
                    const strokePt = Math.max(0.75, (parseFloat(st.strokeWidth) || 1) * 0.75);

                    // SVG要素のタグと属性からPptxGenJSのネイティブ図形種別（rect, roundRect, diamond, ellipse, can）を判定します
                    const sTag = shapeEl.tagName.toLowerCase();
                    // デフォルト図形をrectとします
                    let shapeType = 'rect';
                    // polygonタグ（ひし形分岐ノード等）の場合
                    if (sTag === 'polygon') {
                        // ひし形（diamond）に設定します
                        shapeType = 'diamond';
                    // circleまたはellipseタグ（円・楕円ノード）の場合
                    } else if (sTag === 'circle' || sTag === 'ellipse') {
                        // 楕円（ellipse）に設定します
                        shapeType = 'ellipse';
                    // pathタグ（データベース円柱ノード [(...)] 等）の場合
                    } else if (sTag === 'path') {
                        // pathのd属性に円弧（a/A）が含まれていれば円柱（can）、それ以外は角丸矩形とします
                        const dAttr = shapeEl.getAttribute('d') || '';
                        // 円柱または角丸矩形を選択します
                        shapeType = /[aA]/.test(dAttr) ? 'can' : 'roundRect';
                    // rectタグの場合、rxまたはry属性があれば角丸矩形（roundRect）とします
                    } else if (sTag === 'rect') {
                        // rx属性値を取得します
                        const rx = parseFloat(shapeEl.getAttribute('rx') || st.rx || '0');
                        // ry属性値を取得します
                        const ry = parseFloat(shapeEl.getAttribute('ry') || st.ry || '0');
                        // 角丸が指定されていればroundRectにします
                        if (rx > 1 || ry > 1) {
                            // 角丸矩形に設定します
                            shapeType = 'roundRect';
                        }
                    }

                    // ノード内のラベルテキスト（foreignObject または text）を抽出します
                    const labelEl = nodeGroup.querySelector('foreignObject, text');
                    // テキスト（<br>改行を含む）を抽出します
                    const nodeText = labelEl ? extractCleanText(labelEl) : extractCleanText(nodeGroup);
                    // ラベルの文字色とフォントサイズを取得します
                    const labelStyle = labelEl ? window.getComputedStyle(labelEl) : st;
                    // 文字色（HEX）を取得します
                    const textColor = rgbToHex(labelStyle.color) || rgbToHex(labelStyle.fill) || '000000';
                    // フォントサイズ（px）を取得します
                    const fontPx = parseFloat(labelStyle.fontSize) || 14;

                    // ノード図形プリミティブを追加します（図形内部に編集可能テキストを持たせます）
                    primitives.push({
                        // 要素タイプをmermaid-shapeに設定
                        type: 'mermaid-shape',
                        // PptxGenJS図形タイプ
                        shapeType,
                        // X座標（px）
                        x: sr.left - slideRect.left,
                        // Y座標（px）
                        y: sr.top - slideRect.top,
                        // 幅（px）
                        w: sr.width,
                        // 高さ（px）
                        h: sr.height,
                        // 塗りつぶし色
                        fillColor,
                        // 枠線色
                        strokeColor,
                        // 枠線太さ（pt）
                        strokePt,
                        // 破線フラグ
                        dash: false,
                        // ノード内テキスト
                        text: nodeText,
                        // 文字色
                        textColor,
                        // フォントサイズ（px）
                        fontSize: fontPx,
                        // 前面に配置するz-index
                        zIndex: 15
                    });
                });

                // もし特殊な図（円グラフやガントチャート等）で標準ノードが1つも抽出できなかった場合は、汎用的にrect/circle/polygon/textを抽出します
                if (primitives.length === 0) {
                    // SVG内のすべての基本図形を走査します
                    svg.querySelectorAll('rect, circle, ellipse, polygon').forEach(el => {
                        // defs内の要素は除外します
                        if (el.closest('defs')) return;
                        // 矩形を取得します
                        const r = el.getBoundingClientRect();
                        // サイズが小さすぎる場合は除外します
                        if (r.width < 2 || r.height < 2) return;
                        // スタイルを取得します
                        const st = window.getComputedStyle(el);
                        // 非表示は除外します
                        if (st.display === 'none' || st.visibility === 'hidden') return;
                        // 塗りつぶし色を取得します
                        const fillColor = rgbToHex(st.fill);
                        // 枠線色を取得します
                        const strokeColor = rgbToHex(st.stroke);
                        // どちらも透明なら除外します
                        if (!fillColor && !strokeColor) return;
                        // 図形種別を判定します
                        const tag = el.tagName.toLowerCase();
                        // 図形名を設定します
                        const shapeType = tag === 'polygon' ? 'diamond' : (tag === 'circle' || tag === 'ellipse' ? 'ellipse' : 'rect');
                        // プリミティブを追加します
                        primitives.push({
                            // タイプ
                            type: 'mermaid-shape',
                            // 図形種別
                            shapeType,
                            // X座標
                            x: r.left - slideRect.left,
                            // Y座標
                            y: r.top - slideRect.top,
                            // 幅
                            w: r.width,
                            // 高さ
                            h: r.height,
                            // 塗りつぶし色
                            fillColor: fillColor || 'EEEEEE',
                            // 枠線色
                            strokeColor: strokeColor || '999999',
                            // 枠線太さ
                            strokePt: 1,
                            // 破線フラグ
                            dash: false,
                            // テキストなし
                            text: '',
                            // z-index
                            zIndex: 15
                        });
                    });
                    // SVG内のすべてのtext要素を抽出します
                    svg.querySelectorAll('text').forEach(tEl => {
                        // defs内は除外します
                        if (tEl.closest('defs')) return;
                        // テキストを取得します
                        const txt = extractCleanText(tEl);
                        // 空ならスキップします
                        if (!txt) return;
                        // 矩形を取得します
                        const r = tEl.getBoundingClientRect();
                        // サイズ0はスキップします
                        if (r.width === 0 || r.height === 0) return;
                        // スタイルを取得します
                        const st = window.getComputedStyle(tEl);
                        // テキストプリミティブを追加します
                        primitives.push({
                            // タイプ
                            type: 'text',
                            // タグ
                            tag: 'mermaid-label',
                            // テキスト
                            text: txt,
                            // X座標
                            x: r.left - slideRect.left - 4,
                            // Y座標
                            y: r.top - slideRect.top - 2,
                            // 幅
                            w: r.width + 8,
                            // 高さ
                            h: r.height + 4,
                            // 文字色
                            color: rgbToHex(st.fill) || rgbToHex(st.color) || '000000',
                            // 背景なし
                            bgColor: null,
                            // フォントサイズ
                            fontSize: parseFloat(st.fontSize) || 12,
                            // 太さ
                            fontWeight: st.fontWeight || 'normal',
                            // 中央揃え
                            textAlign: 'center',
                            // 垂直中央
                            valign: 'middle',
                            // z-index
                            zIndex: 18
                        });
                    });
                }

                // 抽出したMermaidプリミティブ配列を返却します
                return primitives;
            };

            // 通常のブロック要素（p, ul, ol, pre, blockquote, table, div.mermaid等）を解析してスライド要素配列へ追加する関数です
            const processContentBlock = (el, headerTag, slide, slideRect, slideObj) => {
                // 要素のタグ名を小文字で取得します
                const tag = el.tagName.toLowerCase();
                // スクリプト・スタイル・リンク等の非表示メタ要素はスキップします
                if (['script', 'style', 'link', 'meta'].includes(tag)) {
                    // スキップします
                    return;
                }
                // 計算済みスタイルを取得します
                const style = window.getComputedStyle(el);
                // 非表示要素はスキップします
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    // スキップします
                    return;
                }
                // 変換前のMermaid用preタグ（data-mermaid-processed）はスキップします
                if (el.hasAttribute('data-mermaid-processed')) {
                    // スキップします
                    return;
                }

                // 1. テーブル要素（<table>）の場合、ネイティブTableオブジェクトとして抽出します
                if (tag === 'table') {
                    // テーブル構造を抽出します
                    const tblData = extractTableData(el, slideRect);
                    // 有効なテーブルデータが取得できた場合
                    if (tblData) {
                        // スライド要素リストへ追加します
                        slideObj.elements.push(tblData);
                    }
                    // 処理完了のためリターンします
                    return;
                }

                // 2. Mermaidダイアグラムコンテナ（div.mermaid）の場合、ネイティブ図形・線・テキスト群へ分解します
                if (el.classList.contains('mermaid')) {
                    // Mermaidプリミティブ群を抽出します
                    const mPrimitives = extractMermaidPrimitives(el, slideRect);
                    // スライド要素リストへ一括追加します
                    slideObj.elements.push(...mPrimitives);
                    // 処理完了のためリターンします
                    return;
                }

                // 3. コードブロック（<pre> または <marp-pre>）の場合、単一の編集可能コードボックスとして抽出します
                if (tag === 'pre' || tag === 'marp-pre') {
                    // 矩形を取得します
                    const rect = el.getBoundingClientRect();
                    // サイズが0の場合はスキップします
                    if (rect.width === 0 || rect.height === 0) return;
                    // シンタックスハイライト付きのテキストラン配列を抽出します
                    const codeRuns = extractCodeRuns(el);
                    // プレーンテキストも取得します
                    const plainCode = codeRuns.map(r => r.text).join('');
                    // 空でなければコードブロック要素として追加します
                    if (plainCode.trim().length > 0) {
                        // 枠線色を取得します
                        const borderColor = rgbToHex(style.borderTopColor) || 'DDDDDD';
                        // コードブロックのY座標（スライド相対px）を計算します
                        const codeY = rect.top - slideRect.top;
                        // 直下の兄弟要素または出典・フッター境界の上端Y座標を取得します
                        const maxBottomY = getNextSiblingTopBoundaryPx(el, slide, slideRect);
                        // 下限境界を超えないコードボックスの高さ（px）を確定します
                        const codeH = Math.max(28, Math.min(rect.height, maxBottomY - codeY));
                        // コードボックスの内側有効横幅（左右margin 10pt*2 = 約27px を除いた幅）を計算します
                        const availCodeW = Math.max(40, rect.width - 28);
                        // コードボックスの内側有効縦幅（上下margin 6pt*2 = 約16px を除いた高さ）を計算します
                        const availCodeH = Math.max(20, codeH - 16);
                        // 基準フォントサイズ（px）を取得します
                        let codeFontPx = getEffectiveFontSizePx(el);
                        // overflow: auto 等により scrollHeight がボックス高さを超えている場合は初期比率で補正します
                        if (el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0) {
                            // スクロール隠れ分を初期縮小します
                            codeFontPx = codeFontPx * (el.clientHeight / el.scrollHeight);
                        }
                        // PowerPointのConsolasフォントで折り返し行数と縦高がコードボックス内に100%収まるまで0.5px刻みで厳密に縮小します
                        while (codeFontPx > 6.5) {
                            // 現在のフォントサイズでの折り返し総行数を推定します
                            const totalCodeLines = estimateWrappedLinesCount(plainCode, codeFontPx, availCodeW, false, true);
                            // PowerPointでの必要縦幅（行高1.34倍）を計算します
                            const reqCodeH = totalCodeLines * codeFontPx * 1.34;
                            // 有効縦幅以内に収まっていればループを終了します
                            if (reqCodeH <= availCodeH) {
                                // 確定します
                                break;
                            }
                            // 0.5px縮小して再計算します
                            codeFontPx -= 0.5;
                        }
                        // コード要素を追加します
                        slideObj.elements.push({
                            // タイプをcodeに設定
                            type: 'code',
                            // 見出しタグ種別
                            tag: headerTag,
                            // プレーンテキスト
                            text: plainCode,
                            // ハイライト付きラン配列
                            codeRuns,
                            // X座標（px）
                            x: rect.left - slideRect.left,
                            // Y座標（px）
                            y: codeY,
                            // 幅（px）
                            w: rect.width,
                            // 高さ（px）
                            h: codeH,
                            // 背景色（デフォルトF8F8F8）
                            bgColor: rgbToHex(style.backgroundColor) || 'F8F8F8',
                            // 枠線色
                            borderColor,
                            // 厳密フィッティング済みの実効フォントサイズ（px）
                            fontSize: codeFontPx,
                            // z-index
                            zIndex: 20
                        });
                    }
                    // 処理完了のためリターンします
                    return;
                }

                // 4. 2段組レイアウト（section.columns-2 / layout-2col）または画像グリッド（section.images-2..4 / images-row）の本文直下リスト（section > h4 + ul）の場合
                const isImageGrid = Array.from(slide.classList).some(c => c.startsWith('images-'));
                // スライド直下のh4直後リストのみをグリッドコンテナと判定します（カラム内部のネストされたul/olは通常リストとして処理します）
                const isGridContainer = el.parentElement === slide && headerTag === 'h4' && (tag === 'ul' || tag === 'ol') && (
                    // 2段組クラスまたは画像グリッドクラスが指定されているか確認します
                    slide.classList.contains('columns-2') || slide.classList.contains('layout-2col') || isImageGrid
                );
                // グリッドコンテナに該当する場合、各カラム（> li）の内部ブロックを個別に正確な座標で抽出します
                if (isGridContainer) {
                    // 直下の各カラム（li）を走査します
                    Array.from(el.children).forEach(colLi => {
                        // liタグ以外はスキップします
                        if (colLi.tagName.toLowerCase() !== 'li') return;
                        // カラムの計算済みスタイルを取得します
                        const colStyle = window.getComputedStyle(colLi);
                        // カラムの矩形を取得します
                        const colRect = colLi.getBoundingClientRect();
                        // カラム自体に背景色や左ボーダー（columns-2の装飾枠）がある場合、背景図形を追加します
                        const colBg = rgbToHex(colStyle.backgroundColor);
                        // 左ボーダー幅を取得します
                        const colBlWidth = parseFloat(colStyle.borderLeftWidth) || 0;
                        // 左ボーダー色を取得します
                        const colBlColor = rgbToHex(colStyle.borderLeftColor);
                        // カラム背景色が存在する場合
                        if (colBg && colRect.width > 0 && colRect.height > 0) {
                            // カラム背景矩形を追加します
                            slideObj.elements.push({
                                // 図形タイプ
                                type: 'shape',
                                // 矩形
                                shapeType: 'rect',
                                // X座標
                                x: colRect.left - slideRect.left,
                                // Y座標
                                y: colRect.top - slideRect.top,
                                // 幅
                                w: colRect.width,
                                // 高さ
                                h: colRect.height,
                                // 塗りつぶし色
                                fillColor: colBg,
                                // 枠線なし
                                strokeColor: null,
                                // 背面z-index
                                zIndex: 5
                            });
                        }
                        // 左アクセントボーダーが存在する場合
                        if (colBlWidth >= 2 && colBlColor && colRect.height > 0) {
                            // 左ボーダー用の細長い矩形を追加します
                            slideObj.elements.push({
                                // 図形タイプ
                                type: 'shape',
                                // 矩形
                                shapeType: 'rect',
                                // X座標
                                x: colRect.left - slideRect.left,
                                // Y座標
                                y: colRect.top - slideRect.top,
                                // 幅（ボーダー太さ）
                                w: colBlWidth,
                                // 高さ
                                h: colRect.height,
                                // 塗りつぶし色
                                fillColor: colBlColor,
                                // 枠線なし
                                strokeColor: null,
                                // z-index
                                zIndex: 6
                            });
                        }

                        // A. 画像横並びグリッド（images-2..4 / images-row）のカラム処理です
                        if (isImageGrid) {
                            // カラム内の画像要素を取得します
                            const imgEl = colLi.querySelector('img');
                            // 画像要素が存在する場合
                            if (imgEl) {
                                // object-fit: contain 適用後の実描画領域とソースを取得します
                                const cImg = getContainedImageRect(imgEl, slideRect);
                                // サイズが有効であれば画像要素として1回だけ追加します
                                if (cImg.w > 0 && cImg.h > 0) {
                                    // 画像を追加します
                                    slideObj.elements.push({
                                        // タイプ
                                        type: 'image',
                                        // サブタイプ
                                        subtype: 'content-image',
                                        // ソースURL
                                        src: cImg.src,
                                        // X座標
                                        x: cImg.x,
                                        // Y座標
                                        y: cImg.y,
                                        // 幅
                                        w: cImg.w,
                                        // 高さ
                                        h: cImg.h,
                                        // z-index
                                        zIndex: 15
                                    });
                                }
                            }
                            // 画像下部のキャプション要素（strong, em, span）を取得します
                            const capEl = colLi.querySelector('strong, em, span');
                            // キャプション要素が存在する場合
                            if (capEl) {
                                // キャプションの矩形を取得します
                                const cr = capEl.getBoundingClientRect();
                                // スタイルを取得します
                                const cs = window.getComputedStyle(capEl);
                                // テキストを取得します
                                const capText = extractCleanText(capEl);
                                // テキストとサイズが有効な場合
                                if (capText && cr.width > 0 && cr.height > 0) {
                                    // キャプションテキストボックスを追加します
                                    slideObj.elements.push({
                                        // タイプ
                                        type: 'text',
                                        // タグ
                                        tag: 'h4',
                                        // テキスト
                                        text: capText,
                                        // X座標
                                        x: colRect.left - slideRect.left,
                                        // Y座標
                                        y: cr.top - slideRect.top,
                                        // 幅（カラム幅全体を使って中央揃えを維持）
                                        w: colRect.width,
                                        // 高さ
                                        h: Math.max(cr.height + 6, 24),
                                        // 文字色
                                        color: rgbToHex(cs.color) || '333333',
                                        // 背景色
                                        bgColor: null,
                                        // フォントサイズ
                                        fontSize: getEffectiveFontSizePx(capEl),
                                        // 太さ
                                        fontWeight: cs.fontWeight || 'bold',
                                        // 中央揃え
                                        textAlign: 'center',
                                        // 垂直中央
                                        valign: 'middle',
                                        // z-index
                                        zIndex: 20
                                    });
                                }
                            }
                            // 画像グリッドの現在のカラム処理を完了します
                            return;
                        }

                        // B. 2段組レイアウト（columns-2 / layout-2col）のカラム処理です
                        const blockTagSet = new Set(['p', 'ul', 'ol', 'pre', 'marp-pre', 'table', 'blockquote', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
                        // 連続するインラインノード群を一時保持する配列です
                        let inlineNodes = [];
                        // 蓄積されたインラインノード群を1つのテキストボックスとして出力する補助関数です
                        const flushInlineNodes = () => {
                            // インラインノードが空なら何もしません
                            if (inlineNodes.length === 0) return;
                            // 結合テキストを組み立てます
                            let combinedText = '';
                            // 最初の要素ノード（スタイル取得用）を保持する変数です
                            let firstElNode = null;
                            // 各インラインノードを走査します
                            for (const n of inlineNodes) {
                                // テキストノードの場合
                                if (n.nodeType === 3) {
                                    // 改行を空白に正規化して追加します
                                    combinedText += n.nodeValue.replace(/[\r\n]+/g, ' ');
                                // 要素ノードの場合
                                } else if (n.nodeType === 1) {
                                    // 最初の要素ノードを記録します
                                    if (!firstElNode) firstElNode = n;
                                    // タグ名を取得します
                                    const nTag = n.tagName.toLowerCase();
                                    // 改行タグの場合
                                    if (nTag === 'br') {
                                        // 改行を追加します
                                        combinedText += '\n';
                                    // 数式コンテナの場合
                                    } else if (nTag === 'mjx-container' || nTag === 'math' || n.classList.contains('katex')) {
                                        // 数式トークンを登録して追加します
                                        combinedText += registerMathElement(n) + '\n';
                                    // その他のインライン要素の場合
                                    } else {
                                        // クリーンテキストを追加します
                                        combinedText += extractCleanText(n);
                                    }
                                }
                            }
                            // 前後の空白をトリムします
                            combinedText = combinedText.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
                            // 有効なテキストが存在する場合
                            if (combinedText) {
                                // DOM Rangeを用いてインラインノード群の正確な矩形を計測します
                                const range = document.createRange();
                                // 開始位置を先頭ノードに設定します
                                range.setStartBefore(inlineNodes[0]);
                                // 終了位置を末尾ノードに設定します
                                range.setEndAfter(inlineNodes[inlineNodes.length - 1]);
                                // 計測矩形を取得します
                                const rr = range.getBoundingClientRect();
                                // スタイル参照元の要素を決定します
                                const refEl = firstElNode || colLi;
                                // スタイルを取得します
                                const refStyle = window.getComputedStyle(refEl);
                                // 実効フォントサイズ（px）を取得します
                                let inlineFs = getEffectiveFontSizePx(refEl);
                                // 太字であるか判定します
                                const inlineBold = refStyle.fontWeight === 'bold' || parseInt(refStyle.fontWeight, 10) >= 700;
                                // メイリオ推定幅を計算します
                                const inlineMeiryoW = estimateMeiryoSingleLineWidth(combinedText, inlineFs, inlineBold);
                                // 改行を含まない1行見出しでメイリオ推定幅がカラム幅を超える場合は、カラム幅に収まるようフォントサイズを縮小します
                                if (!combinedText.includes('\n') && inlineMeiryoW > colRect.width && colRect.width > 40) {
                                    // カラム幅に収まるよう比例縮小します
                                    inlineFs = Math.max(9.5, inlineFs * (colRect.width / inlineMeiryoW));
                                }
                                // 1行に収まるインライン見出し等はタイト幅にし、カラム幅を上限とします
                                const inlineW = Math.min(colRect.width, Math.max(rr.width + 8, estimateMeiryoSingleLineWidth(combinedText, inlineFs, inlineBold)));
                                // テキスト要素としてスライドへ追加します
                                slideObj.elements.push({
                                    // タイプ
                                    type: 'text',
                                    // タグ
                                    tag: 'h4',
                                    // テキスト
                                    text: combinedText,
                                    // X座標
                                    x: colRect.left - slideRect.left,
                                    // Y座標
                                    y: (rr.height > 0 ? rr.top : colRect.top) - slideRect.top,
                                    // 幅（タイト計測幅）
                                    w: inlineW,
                                    // 高さ
                                    h: Math.max(rr.height || 28, 24),
                                    // 文字色
                                    color: rgbToHex(refStyle.color) || '000000',
                                    // 背景なし
                                    bgColor: null,
                                    // フォントサイズ
                                    fontSize: inlineFs,
                                    // 太字設定
                                    fontWeight: refStyle.fontWeight,
                                    // 左揃え
                                    textAlign: refStyle.textAlign === 'center' ? 'center' : 'left',
                                    // 垂直中央揃え
                                    valign: 'middle',
                                    // 1行見出しの場合は折り返し禁止を設定します
                                    noWrap: !combinedText.includes('\n') && inlineMeiryoW <= colRect.width,
                                    // z-index
                                    zIndex: 20
                                });
                            }
                            // インラインノード配列をリセットします
                            inlineNodes = [];
                        };

                        // カラム内のすべての子ノードを順番に走査します
                        Array.from(colLi.childNodes).forEach(childNode => {
                            // 要素ノードであり、かつブロック要素または画像要素に該当する場合
                            if (childNode.nodeType === 1) {
                                // タグ名を小文字で取得します
                                const cTag = childNode.tagName.toLowerCase();
                                // marp-プレフィックスを正規化します
                                const normCTag = cTag.startsWith('marp-') ? cTag.slice(5) : cTag;
                                // 画像要素（<img>）が直接配置されている場合
                                if (normCTag === 'img') {
                                    // 先行するインラインノードを出力します
                                    flushInlineNodes();
                                    // object-fit: contain 適用後の実描画領域とソースを取得します
                                    const cImg = getContainedImageRect(childNode, slideRect);
                                    // サイズが有効な場合
                                    if (cImg.w > 0 && cImg.h > 0) {
                                        // 画像要素を追加します
                                        slideObj.elements.push({
                                            // タイプ
                                            type: 'image',
                                            // サブタイプ
                                            subtype: 'content-image',
                                            // 画像ソース
                                            src: cImg.src,
                                            // X座標
                                            x: cImg.x,
                                            // Y座標
                                            y: cImg.y,
                                            // 幅
                                            w: cImg.w,
                                            // 高さ
                                            h: cImg.h,
                                            // z-index
                                            zIndex: 15
                                        });
                                    }
                                    // 次のノードへ進みます
                                    return;
                                }
                                // ブロック要素（ul, ol, p, pre, table, div.mermaid等）の場合
                                if (blockTagSet.has(normCTag) || blockTagSet.has(cTag)) {
                                    // 先行するインラインノードを出力します
                                    flushInlineNodes();
                                    // ブロック要素を再帰処理します（親がcolLiのためul/olは通常リストとして処理されます）
                                    processContentBlock(childNode, 'h4', slide, slideRect, slideObj);
                                    // 次のノードへ進みます
                                    return;
                                }
                            }
                            // インラインノード（テキスト、strong、mjx-container等）の場合は配列へ追加します
                            inlineNodes.push(childNode);
                        });
                        // カラム末尾に残ったインラインノードを出力します
                        flushInlineNodes();
                    });
                    // グリッドコンテナ処理完了のためリターンします
                    return;
                }

                // 5. 会話形式レイアウト（section.conversation-content）のリスト（ul/ol）の場合
                if (slide.classList.contains('conversation-content') && headerTag === 'h4' && (tag === 'ul' || tag === 'ol')) {
                    // 各発言アイテム（li）を順番に走査します
                    Array.from(el.children).forEach((li, liIdx) => {
                        // liタグ以外はスキップします
                        if (li.tagName.toLowerCase() !== 'li') return;
                        // 吹き出し本体の矩形を取得します
                        const liRect = li.getBoundingClientRect();
                        // 幅または高さが0の場合はスキップします
                        if (liRect.width === 0 || liRect.height === 0) return;
                        // 計算済みスタイルを取得します
                        const liStyle = window.getComputedStyle(li);
                        // 奇数番目（1始まりで1, 3, 5... すなわちインデックス偶数）が左側発言、偶数番目が右側発言です
                        const isLeftSpeaker = (liIdx % 2 === 0);

                        // デフォルトのアイコンサイズ（80px）を定義します
                        const iconSize = 80;
                        // アバターアイコンのX座標（左発言なら吹き出し左端から100px外側、右発言なら右端から20px外側）を計算します
                        const iconX = isLeftSpeaker
                            ? (liRect.left - slideRect.left - 100)
                            : (liRect.right - slideRect.left + 20);
                        // アバターアイコンのY座標（吹き出し上端）を計算します
                        const iconY = liRect.top - slideRect.top;

                        // 発言者名（最初の <strong> タグ）を取得します
                        const nameStrong = li.querySelector('strong:first-of-type');
                        // 発言者名文字列を保持する変数です
                        let speakerName = '';
                        // 発言者名が存在する場合
                        if (nameStrong) {
                            // 名前テキストを抽出します
                            speakerName = extractCleanText(nameStrong);
                            // 名前のスタイルを取得します
                            const ns = window.getComputedStyle(nameStrong);
                            // 名前が存在する場合
                            if (speakerName) {
                                // 名前のフォントサイズ（px）を取得します
                                const nameFontPx = parseFloat(ns.fontSize) || 12;
                                // メイリオ描画時に1行で収まるタイトな名前ボックス幅を算出します
                                const nameW = Math.max(96, estimateMeiryoSingleLineWidth(speakerName, nameFontPx, true) + 12);
                                // アイコン中央（iconX + 40px）に名前ボックスの中央を揃えるX座標を算出します
                                const nameX = iconX + (iconSize / 2) - (nameW / 2);
                                // アイコン直下（中央揃え）の名前ラベル用テキストボックスを追加します
                                slideObj.elements.push({
                                    // タイプ
                                    type: 'text',
                                    // タグ
                                    tag: 'conversation-name',
                                    // テキスト
                                    text: speakerName,
                                    // X座標
                                    x: nameX,
                                    // Y座標（アイコン高さ80pxの直下84px）
                                    y: iconY + 84,
                                    // 幅
                                    w: nameW,
                                    // 高さ（20px）
                                    h: 20,
                                    // 文字色
                                    color: rgbToHex(ns.color) || '555555',
                                    // 背景透明
                                    bgColor: null,
                                    // フォントサイズ
                                    fontSize: nameFontPx,
                                    // 太字
                                    fontWeight: 'bold',
                                    // 中央揃え
                                    textAlign: 'center',
                                    // 垂直中央揃え
                                    valign: 'middle',
                                    // 1行固定ラベルのため折り返しを禁止します
                                    noWrap: true,
                                    // z-index
                                    zIndex: 25
                                });
                            }
                        }

                        // アバター画像（<img>）が存在するか確認します
                        const avatarImg = li.querySelector('img');
                        // ::before疑似要素のスタイル（デフォルトシルエットの背景色取得用）を取得します
                        const beforeStyle = window.getComputedStyle(li, '::before');
                        // デフォルトシルエットの背景色（HEX、デフォルトBBBBBB）を取得します
                        const avatarBgHex = (beforeStyle && rgbToHex(beforeStyle.backgroundColor)) || 'BBBBBB';
                        // img要素またはデフォルトシルエット（#bbbbbb背景＋白人物アイコン＋角丸5px）をCanvasでPNG Data URIへラスタライズします
                        const avatarPngDataUri = rasterizeAvatarToPngDataUrl(avatarImg, avatarBgHex);
                        // ラスタライズしたアバターアイコンを画像要素として追加します
                        slideObj.elements.push({
                            // タイプ
                            type: 'image',
                            // サブタイプ
                            subtype: avatarImg ? 'avatar' : 'avatar-default',
                            // PNG Data URI
                            src: avatarPngDataUri,
                            // X座標
                            x: iconX,
                            // Y座標
                            y: iconY,
                            // 幅
                            w: iconSize,
                            // 高さ
                            h: iconSize,
                            // z-index
                            zIndex: 22
                        });

                        // 吹き出し本文テキスト（発言者名のstrongタグを除いた内容）を抽出します
                        let bubbleText = '';
                        // liのchildNodesを走査します
                        for (const node of li.childNodes) {
                            // 発言者名strong要素自身は除外します
                            if (node === nameStrong) continue;
                            // アバターimg要素自身も除外します
                            if (node === avatarImg) continue;
                            // テキストノードの場合
                            if (node.nodeType === 3) {
                                // 改行をスペースに正規化して連結します
                                bubbleText += node.nodeValue.replace(/[\r\n]+/g, ' ');
                            // 要素ノードの場合
                            } else if (node.nodeType === 1) {
                                // pタグ等の内部にnameStrongやavatarImgが含まれている場合の処理です
                                if (node.contains(nameStrong) || node.contains(avatarImg)) {
                                    // 子ノードをさらに走査します
                                    for (const sub of node.childNodes) {
                                        // 名前と画像はスキップします
                                        if (sub === nameStrong || sub === avatarImg) continue;
                                        // テキストノードの場合
                                        if (sub.nodeType === 3) {
                                            // テキストを追加します
                                            bubbleText += sub.nodeValue.replace(/[\r\n]+/g, ' ');
                                        // 要素ノードの場合
                                        } else if (sub.nodeType === 1) {
                                            // クリーンテキストを追加します
                                            bubbleText += extractCleanText(sub);
                                        }
                                    }
                                // 名前や画像を含まない通常の要素の場合
                                } else {
                                    // 通常の要素はクリーンテキストを抽出します
                                    bubbleText += extractCleanText(node);
                                }
                            }
                        }
                        // 吹き出しテキストの前後空白をトリムします
                        bubbleText = bubbleText.trim();

                        // 吹き出しの実効フォントサイズ（px）を取得します
                        let bubbleFontPx = getEffectiveFontSizePx(li);
                        // 吹き出しの許容最大横幅（calc(85% - 100px) 相当）を計算します
                        const maxBubbleW = Math.floor((nativeW - 80) * 0.85) - 100;
                        // 吹き出しが1行表示（上下パディング30pxを含め高さがフォントサイズの3.3倍以下）であるか判定します
                        const isSingleLineBubble = liRect.height <= (bubbleFontPx * 3.3);
                        // 1行吹き出しの場合はメイリオ描画で途中改行しないよう左右パディング込みの横幅を補正します
                        const meiryoBubbleW = estimateMeiryoSingleLineWidth(bubbleText, bubbleFontPx, false) + 52;
                        // 最終的な吹き出し横幅を決定します
                        const bubbleW = isSingleLineBubble
                            ? Math.min(maxBubbleW, Math.max(liRect.width, meiryoBubbleW))
                            : liRect.width;
                        // 吹き出しの内側有効横幅（margin [8, 14, 8, 14] pt = 左右約38px を除いた幅）を計算します
                        const availBubbleW = Math.max(60, bubbleW - 40);
                        // 吹き出しの内側有効縦幅（上下約22px を除いた高さ）を計算します
                        const availBubbleH = Math.max(24, liRect.height - 20);
                        // メイリオでの折り返し行高が吹き出し高さを超えないようフォントサイズを厳密に調整します
                        while (bubbleFontPx > 9) {
                            // 現在のフォントサイズでの折り返し行数を推定します
                            const bLines = estimateWrappedLinesCount(bubbleText, bubbleFontPx, availBubbleW, false, false);
                            // 必要縦幅が吹き出し有効縦幅以内であれば確定します
                            if (bLines * bubbleFontPx * 1.35 <= availBubbleH + 4) {
                                // ループを終了します
                                break;
                            }
                            // 0.5px縮小して再検証します
                            bubbleFontPx -= 0.5;
                        }
                        // 左発言は左端固定、右発言は右端固定でX座標を算出します
                        const bubbleX = isLeftSpeaker
                            ? (liRect.left - slideRect.left)
                            : ((liRect.right - slideRect.left) - bubbleW);

                        // 吹き出し要素を追加します
                        slideObj.elements.push({
                            // タイプをconversation-bubbleに設定
                            type: 'conversation-bubble',
                            // 左側発言フラグ
                            isLeft: isLeftSpeaker,
                            // 吹き出し本文
                            text: bubbleText,
                            // X座標（px）
                            x: bubbleX,
                            // Y座標（px）
                            y: liRect.top - slideRect.top,
                            // 幅（px）
                            w: bubbleW,
                            // 高さ（px）
                            h: liRect.height,
                            // 背景色（HEX）
                            bgColor: rgbToHex(liStyle.backgroundColor) || 'DDE5EF',
                            // 文字色（HEX）
                            color: rgbToHex(liStyle.color) || '222222',
                            // フォントサイズ（px）
                            fontSize: bubbleFontPx,
                            // 水平揃え
                            textAlign: liStyle.textAlign || 'left',
                            // z-index
                            zIndex: 20
                        });
                    });
                    // 会話リスト処理完了のためリターンします
                    return;
                }

                // 6. 通常の箇条書きリスト（<ul> / <ol>）の場合
                if (tag === 'ul' || tag === 'ol') {
                    // リスト全体の矩形を取得します
                    const rect = el.getBoundingClientRect();
                    // サイズが0の場合はスキップします
                    if (rect.width === 0 || rect.height === 0) return;

                    // 目次スライド（section.toc）のリストの場合、各目次項目をタイトル・破線リーダー・ページ番号に分離して配置します
                    if (slide.classList.contains('toc')) {
                        // 目次アイテム（li）要素一覧を取得します
                        const liItems = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'li');
                        // 各目次項目を処理します
                        liItems.forEach(li => {
                            // 項目の矩形を取得します
                            const liRect = li.getBoundingClientRect();
                            // タイトルリンク要素を取得します
                            const aEl = li.querySelector('a');
                            // ページ番号要素を取得します
                            const pageEl = li.querySelector('.toc-page');
                            // タイトルとページ番号が存在する場合
                            if (aEl && pageEl) {
                                // タイトルのタイトな描画矩形と行数を取得します
                                const aTight = getTightTextRect(aEl);
                                // タイトル要素のバウンディングボックスを取得します
                                const aRect = aEl.getBoundingClientRect();
                                // タイトルのスタイルを取得します
                                const aStyle = window.getComputedStyle(aEl);
                                // ページ番号のスタイルを取得します
                                const pStyle = window.getComputedStyle(pageEl);
                                // タイトルテキストを取得します
                                const titleStr = extractCleanText(aEl);
                                // ページ番号テキストを取得します
                                const pageStr = extractCleanText(pageEl);
                                // タイトルの基準フォントサイズ（px）を取得します
                                let fontPx = parseFloat(aStyle.fontSize) || 20;
                                // タイトルの太字設定を取得します（CSS規定通り通常ウェイトを維持します）
                                const isTitleBold = aStyle.fontWeight === 'bold' || parseInt(aStyle.fontWeight, 10) >= 700;
                                // 項目のY座標（px）を計算します
                                const itemY = liRect.top - slideRect.top;
                                // 項目の高さ（px）を計算します
                                const itemH = Math.max(liRect.height, 28);

                                // ページ番号ボックスの固定幅（2桁の太字数字が絶対に縦折り返ししない60px）を定義します
                                const pageW = 60;
                                // ページ番号ボックスのX座標（右端50px余白に右端を揃える位置）を計算します
                                const pageX = nativeW - 50 - pageW;
                                // タイトルの左端X座標（基本50px）を計算します
                                const titleX = Math.max(40, aTight.left - slideRect.left);
                                // リーダー線の最小幅を確保した上でのタイトル最大許容幅を計算します
                                const maxTitleW = Math.max(120, (pageX - 36) - titleX);
                                // メイリオ描画時に1行で収まる必要幅を推定します
                                const meiryoTitleW = estimateMeiryoSingleLineWidth(titleStr, fontPx, isTitleBold);
                                // タイトルボックスの横幅を決定する変数です
                                let titleW = maxTitleW;
                                // ブラウザ上で1行表示だった目次タイトルの場合
                                if (aTight.lineCount <= 1) {
                                    // メイリオ推定幅が最大許容幅を超える場合はフォントサイズを微縮小して1行に収めます
                                    if (meiryoTitleW > maxTitleW) {
                                        // 許容幅に収まる比率でフォントサイズを縮小します
                                        fontPx = Math.max(12, fontPx * (maxTitleW / meiryoTitleW));
                                        // タイトル幅を最大許容幅に設定します
                                        titleW = maxTitleW;
                                    // メイリオ推定幅が最大許容幅以内に収まる場合
                                    } else {
                                        // ブラウザ実測幅とメイリオ推定幅の大きい方を採用して折り返しを防止します
                                        titleW = Math.min(maxTitleW, Math.max(aTight.width + 8, meiryoTitleW));
                                    }
                                // ブラウザ上でも複数行に折り返されていた超長文タイトルの場合
                                } else {
                                    // 複数行用のボックス幅を設定します
                                    titleW = Math.min(maxTitleW, Math.max(aTight.width + 12, aRect.width));
                                }

                                // 1. 目次タイトル（左揃えテキストボックス）を追加します
                                slideObj.elements.push({
                                    // タイプ
                                    type: 'text',
                                    // タグ
                                    tag: 'toc-title',
                                    // テキスト本文
                                    text: titleStr,
                                    // X座標
                                    x: titleX,
                                    // Y座標
                                    y: itemY,
                                    // 幅（メイリオ補正済み実幅）
                                    w: titleW,
                                    // 高さ
                                    h: itemH,
                                    // 文字色
                                    color: rgbToHex(aStyle.color) || '000000',
                                    // 背景透明
                                    bgColor: null,
                                    // フォントサイズ
                                    fontSize: fontPx,
                                    // フォントウェイト（CSS規定通り通常ウェイト）
                                    fontWeight: isTitleBold ? 'bold' : 'normal',
                                    // 左揃え
                                    textAlign: 'left',
                                    // 垂直中央揃え
                                    valign: 'middle',
                                    // リストフラグ
                                    isList: false,
                                    // 折り返しフラグ（1行項目は折り返し禁止）
                                    noWrap: aTight.lineCount <= 1,
                                    // z-index
                                    zIndex: 20
                                });

                                // 2. ネイティブ破線リーダー（タイトルボックス右端からページ番号左端まで）を追加します
                                const lineStartX = titleX + titleW + 10;
                                // リーダー線の終端X座標（ページ番号の左端から6px手前）を計算します
                                const lineEndX = pageX - 6;
                                // リーダー線の横幅を計算します
                                const lineW = Math.max(16, lineEndX - lineStartX);
                                // リーダー線のY座標（文字ベースライン付近）を計算します
                                const lineY = itemY + (itemH * 0.62);
                                // リーダー線シェイプを追加します
                                slideObj.elements.push({
                                    // タイプ
                                    type: 'shape',
                                    // 図形種別
                                    shapeType: 'line',
                                    // タグ
                                    tag: 'toc-leader',
                                    // X座標
                                    x: lineStartX,
                                    // Y座標
                                    y: lineY,
                                    // 幅
                                    w: lineW,
                                    // 高さ
                                    h: 0,
                                    // 枠線色（グレー）
                                    strokeColor: '999999',
                                    // 枠線太さ（pt）
                                    strokePt: 1.5,
                                    // 破線フラグ
                                    dash: true,
                                    // z-index
                                    zIndex: 15
                                });

                                // 3. ページ番号（右揃え・幅60px固定テキストボックス）を追加します
                                slideObj.elements.push({
                                    // タイプ
                                    type: 'text',
                                    // タグ
                                    tag: 'toc-page',
                                    // テキスト本文
                                    text: pageStr,
                                    // X座標
                                    x: pageX,
                                    // Y座標
                                    y: itemY,
                                    // 幅（60px固定）
                                    w: pageW,
                                    // 高さ
                                    h: itemH,
                                    // 文字色
                                    color: rgbToHex(pStyle.color) || '000000',
                                    // 背景透明
                                    bgColor: null,
                                    // フォントサイズ
                                    fontSize: parseFloat(pStyle.fontSize) || 24,
                                    // 太字
                                    fontWeight: 'bold',
                                    // 右揃え
                                    textAlign: 'right',
                                    // 垂直中央揃え
                                    valign: 'middle',
                                    // リストフラグ
                                    isList: false,
                                    // 2桁数字の縦折り返しを防止するため折り返し禁止フラグを設定します
                                    noWrap: true,
                                    // z-index
                                    zIndex: 20
                                });
                            }
                        });
                        // 目次処理完了のためリターンします
                        return;
                    }

                    // 通常のリストアイテム群を抽出します
                    const listItems = extractListItems(el, 0);
                    // アイテムが存在する場合
                    if (listItems.length > 0) {
                        // リストの基準フォントサイズ（px）を取得します
                        let listFontPx = getEffectiveFontSizePx(el);
                        // H2主張帯内のリストであるか判定します
                        const isClaimList = headerTag === 'h2';
                        // 2段組カラム等の内部に配置されたリストであるか判定します
                        const isInsideSubContainer = Boolean(el.parentElement && el.parentElement !== slide);
                        // リストの左端X座標（H2帯は20px、本文等はDOM左端）を決定します
                        const listX = isClaimList ? 20 : Math.max(0, rect.left - slideRect.left);
                        // 全リスト項目からタイトな必要横幅を計算します
                        let maxReqListW = 120;
                        // 各リスト項目を走査します
                        for (const item of listItems) {
                            // 項目のフォントサイズを取得します
                            const itemFs = item.fontSize || listFontPx;
                            // インデント階層とバレット記号分の余白（px）を加算したメイリオ推定幅を計算します
                            const estItemW = estimateMeiryoSingleLineWidth(item.text, itemFs, Boolean(item.bold)) + ((item.level || 0) * 34) + 46;
                            // 最大必要幅を更新します
                            if (estItemW > maxReqListW) {
                                // 最大値を代入します
                                maxReqListW = estItemW;
                            }
                        }
                        // 親コンテナ（2段組のカラムliまたはスライド全体）の右端に基づく最大許容幅を計算します
                        const parentRightPx = isInsideSubContainer
                            ? (el.parentElement.getBoundingClientRect().right - slideRect.left)
                            : (nativeW - 20);
                        // 親コンテナ右端を超えない最大リスト幅を算出します
                        const maxAllowedListW = Math.max(120, Math.min(nativeW - 20 - listX, parentRightPx - listX));
                        // 親領域およびスライド右余白を超えない範囲でタイトなリスト幅を算出します
                        const listW = Math.min(maxAllowedListW, Math.max(120, maxReqListW));
                        // リスト内の全li要素からタイトな上下端を取得します
                        const allLis = Array.from(el.querySelectorAll('li'));
                        // 上端Y座標を初期化します
                        let minTop = rect.top;
                        // 下端Y座標を初期化します
                        let maxBottom = rect.bottom;
                        // li要素が存在する場合
                        if (allLis.length > 0) {
                            // 各liのタイト矩形を取得します
                            const liTights = allLis.map(liNode => getTightTextRect(liNode));
                            // 最小topを計算します
                            minTop = Math.min(...liTights.map(t => t.top));
                            // 最大bottomを計算します
                            maxBottom = Math.max(...liTights.map(t => t.bottom));
                        }
                        // DOM上のタイトな高さを算出します
                        const domTightH = Math.max(maxBottom - minTop + 6, rect.height);
                        // リストの上端Y座標を決定します（H2主張帯はタイト中心基準、本文・2段組内はDOM上端基準で後続要素との重なりを防ぎます）
                        const listY = isClaimList
                            ? Math.max(66, (((minTop + maxBottom) / 2) - slideRect.top) - (domTightH / 2))
                            : Math.max(0, (minTop - slideRect.top) - 2);
                        // このリストが縦方向に使える最大下限Y座標（H2帯なら173px、それ以外は直下の兄弟要素上端またはフッター境界）を取得します
                        const maxListBottomY = isClaimList ? 173 : getNextSiblingTopBoundaryPx(el, slide, slideRect);
                        // リストに許容される最大縦幅（px）を算出します
                        const availListH = Math.max(28, isInsideSubContainer ? Math.min(domTightH + 6, maxListBottomY - listY) : (maxListBottomY - listY));

                        // 指定されたスケール倍率（scale）でPowerPoint（Meiryo）描画時のリスト総必要高さ（px）を計算する補助関数です
                        const calcListRequiredHeightPx = (scale) => {
                            // 行高倍率（H2帯は1.15倍相当の1.30、本文は1.2倍相当の1.38）を設定します
                            const lineHeightRatio = isClaimList ? 1.30 : 1.38;
                            // 累積高さを初期化します
                            let totalH = 4;
                            // 各アイテムの折り返し行高を積算します
                            for (const item of listItems) {
                                // スケール適用後のアイテムフォントサイズ（px）です
                                const fs = (item.fontSize || listFontPx) * scale;
                                // インデント階層（level）とバレット記号を除いた実質テキスト折り返し可能幅（px）です
                                const itemAvailW = Math.max(48, listW - (((item.level || 0) + 1) * 28) - 12);
                                // メイリオでの折り返し行数を推定します
                                const lines = estimateWrappedLinesCount(item.text, fs, itemAvailW, Boolean(item.bold), false);
                                // 段落高さと段落間余白を加算します
                                totalH += (lines * fs * lineHeightRatio) + 3;
                            }
                            // 合計必要高さを返します
                            return totalH;
                        };

                        // スケール倍率を1.0から開始し、PowerPoint描画時の必要高さが許容高さ（availListH）を超える場合は厳密に縮小します
                        let fontScale = 1.0;
                        // 必要高さを計算します
                        let reqListH = calcListRequiredHeightPx(fontScale);
                        // 許容高さを超えている場合、収まるまでスケールを段階的に縮小します
                        while (reqListH > availListH && listFontPx * fontScale > 8.5) {
                            // 比率に基づいて一段階縮小します
                            const ratio = Math.min(0.96, availListH / reqListH);
                            // スケールを更新します
                            fontScale = Math.max(8.5 / listFontPx, fontScale * ratio);
                            // 再計算します
                            reqListH = calcListRequiredHeightPx(fontScale);
                        }
                        // スケールが縮小された場合、リストおよび全アイテムのフォントサイズへ反映します
                        if (fontScale < 0.999) {
                            // 基準フォントサイズを更新します
                            listFontPx = Math.max(8.5, listFontPx * fontScale);
                            // 各アイテムのフォントサイズを更新します
                            listItems.forEach(item => {
                                // アイテムフォントサイズを縮小します
                                item.fontSize = Math.max(8.5, (item.fontSize || listFontPx) * fontScale);
                            });
                        }
                        // 最終的なリストボックス高さを決定します（後続要素の上端を決して超えないようにします）
                        const finalListH = Math.min(availListH, Math.max(domTightH, Math.ceil(reqListH)));

                        // リスト要素をスライドに追加します
                        slideObj.elements.push({
                            // タイプ
                            type: 'list',
                            // 見出しタグ種別（h2 または h4 等）
                            tag: headerTag,
                            // 構造化リストアイテム配列
                            listItems,
                            // X座標（px）
                            x: listX,
                            // Y座標（px）
                            y: listY,
                            // 幅（タイト幅 px）
                            w: listW,
                            // 高さ（厳密フィッティング済み高さ px）
                            h: finalListH,
                            // 代表文字色
                            color: rgbToHex(style.color) || (headerTag === 'h2' ? 'FFFFFF' : '000000'),
                            // 背景色
                            bgColor: rgbToHex(style.backgroundColor),
                            // 実効フォントサイズ（px）
                            fontSize: listFontPx,
                            // 垂直揃え（H2主張帯は中央揃え、本文・2段組内は上端揃えで重なりを防止）
                            valign: isClaimList ? 'middle' : 'top',
                            // z-index（h2は帯背景40より前面の50）
                            zIndex: headerTag === 'h2' ? 50 : 20
                        });
                    }
                    // 処理完了のためリターンします
                    return;
                }

                // 7. 段落（<p>）や引用（<blockquote>）等の内部に画像（<img>）またはインラインSVGが含まれているか確認します
                const innerImgs = Array.from(el.querySelectorAll('img'));
                // 画像が含まれている場合
                if (innerImgs.length > 0) {
                    // 各画像を抽出します
                    innerImgs.forEach(img => {
                        // 画像のスタイルを取得します
                        const is = window.getComputedStyle(img);
                        // 非表示の場合はスキップします
                        if (is.display === 'none' || is.visibility === 'hidden') return;
                        // object-fit: contain 適用後の実描画領域とソースを取得します
                        const cImg = getContainedImageRect(img, slideRect);
                        // サイズ0はスキップします
                        if (cImg.w <= 0 || cImg.h <= 0) return;
                        // 画像要素を追加します
                        slideObj.elements.push({
                            // タイプ
                            type: 'image',
                            // サブタイプ
                            subtype: 'content-image',
                            // 画像ソース
                            src: cImg.src,
                            // X座標
                            x: cImg.x,
                            // Y座標
                            y: cImg.y,
                            // 幅
                            w: cImg.w,
                            // 高さ
                            h: cImg.h,
                            // z-index
                            zIndex: 15
                        });
                    });
                }

                // 8. 通常のテキストブロック（p, blockquote, div 等）のテキスト抽出
                const cleanTxt = extractCleanText(el);
                // テキストが存在する場合
                if (cleanTxt) {
                    // 要素のバウンディングボックスを取得します
                    const rect = el.getBoundingClientRect();
                    // 実際に描画されている文字群のタイトな外接矩形と行数を取得します
                    const tightRect = getTightTextRect(el);
                    // 幅と高さが有効な場合
                    if (rect.width > 0 && rect.height > 0) {
                        // 水平揃えを正規化します
                        let align = style.textAlign || 'left';
                        // startはleftに変換します
                        if (align === 'start' || align === '-webkit-auto') align = 'left';
                        // endはrightに変換します
                        if (align === 'end') align = 'right';

                        // 引用ブロック（blockquote）等で左ボーダーがある場合は装飾線を追加します
                        const blWidth = parseFloat(style.borderLeftWidth) || 0;
                        // 左ボーダー色を取得します
                        const blColor = rgbToHex(style.borderLeftColor);
                        // 左ボーダーが太い場合
                        if (blWidth >= 2 && blColor) {
                            // ボーダー矩形を追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'shape',
                                // 矩形
                                shapeType: 'rect',
                                // X座標
                                x: rect.left - slideRect.left,
                                // Y座標
                                y: rect.top - slideRect.top,
                                // 幅
                                w: blWidth,
                                // 高さ
                                h: rect.height,
                                // 塗りつぶし色
                                fillColor: blColor,
                                // 枠線なし
                                strokeColor: null,
                                // z-index
                                zIndex: 18
                            });
                        }

                        // 実効フォントサイズ（px）を取得します
                        let fontPx = getEffectiveFontSizePx(el);
                        // 内部にstrong/b要素が含まれるか確認します
                        const strongChild = el.querySelector('strong, b');
                        // 要素全体がstrong/bで強調されているか判定します
                        const isEntirelyStrong = Boolean(strongChild && extractCleanText(strongChild).trim() === cleanTxt.trim());
                        // 太字であるか判定します
                        const isBold = isEntirelyStrong || style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700;
                        // 明示的な改行タグ（<br>）の個数を取得します
                        const brCount = el.querySelectorAll('br').length;
                        // ブラウザ上で自動折り返しが発生していたか判定します
                        const didAutoWrap = tightRect.lineCount > (brCount + 1);
                        // メイリオ描画時の1行あたり推定必要幅を算出します
                        const meiryoW = estimateMeiryoSingleLineWidth(cleanTxt, fontPx, isBold);
                        // 目標とするタイトなボックス横幅を計算します（自動折り返し無しならメイリオ推定幅、有りなら要素幅）
                        const targetBoxW = didAutoWrap
                            ? Math.max(tightRect.width + 8, rect.width)
                            : Math.max(tightRect.width + 8, meiryoW);

                        // 水平揃え（left / center / right）の基準アンカーを維持しながらボックスのX座標と幅Wを決定します
                        let boxX = Math.max(0, tightRect.left - slideRect.left);
                        // ボックス幅を初期化します
                        let boxW = targetBoxW;
                        // 右揃え要素（表紙の図書番号 h3-bookno、出典 h5 等）の場合
                        if (align === 'right') {
                            // 右端アンカー座標（スライド右端から最低10px内側）を固定します
                            const rightEdge = Math.min(nativeW - 10, Math.max(40, tightRect.right - slideRect.left));
                            // 左端余白（10px）を超えない範囲で幅を決定します
                            boxW = Math.min(rightEdge - 10, targetBoxW);
                            // 右端アンカーから左方向へボックスを展開します（右端は絶対にずれません）
                            boxX = rightEdge - boxW;
                        // 中央揃え要素（図表タイトル h3 等）の場合
                        } else if (align === 'center') {
                            // テキストの水平中心座標を固定します
                            const centerX = ((tightRect.left + tightRect.right) / 2) - slideRect.left;
                            // 左右端（15px余白）までの最大片側幅を計算します
                            const maxHalfW = Math.max(20, Math.min(centerX - 15, nativeW - 15 - centerX));
                            // 中心対称に収まる幅を決定します
                            boxW = Math.min(maxHalfW * 2, targetBoxW);
                            // 中心座標から左右均等に配置します
                            boxX = centerX - (boxW / 2);
                        // 左揃え要素（h1, h2, h4, 表紙タイトル・サブタイトル・所属氏名等）の場合
                        } else {
                            // 左端アンカー座標を固定します
                            boxX = Math.max(0, tightRect.left - slideRect.left);
                            // 通常ページのH1タイトルは右上ヘッダーロゴと重ならないよう右上限を抑えます
                            const isNormalH1 = (slide.getAttribute('data-marpit-pagination') !== '1') && headerTag === 'h1';
                            // 親コンテナ（2段組カラム等）の右端を取得します
                            const parentRight = (el.parentElement && el.parentElement !== slide)
                                ? (el.parentElement.getBoundingClientRect().right - slideRect.left)
                                : (nativeW - 15);
                            // 右端の最大許容X座標を決定します
                            const maxRightEdge = isNormalH1
                                ? Math.max(nativeW - 150, (tightRect.right - slideRect.left) + 12)
                                : Math.min(nativeW - 15, parentRight);
                            // 右上限を超えない幅を決定します
                            boxW = Math.min(Math.max(24, maxRightEdge - boxX), targetBoxW);
                        }

                        // 自動折り返ししていなかったテキストで、メイリオ推定幅がボックス上限幅を超える場合はフォントサイズを微調整して1行を維持します
                        if (!didAutoWrap && meiryoW > boxW && boxW > 40) {
                            // ボックス幅に収まるようフォントサイズを比例縮小します
                            fontPx = Math.max(9.5, fontPx * (boxW / meiryoW));
                        }

                        // 複数行テキスト（自動折り返しまたは<br>改行あり）の場合、メイリオでの折り返し行高が直下要素や許容高さを超えないよう厳密に検証します
                        const isMultiLineText = didAutoWrap || brCount > 0;
                        // 描画文字の垂直中心Y座標を計算します
                        const centerY = ((tightRect.top + tightRect.bottom) / 2) - slideRect.top;
                        // 要素のDOM上端Y座標（スライド相対px）を計算します
                        const domTopY = Math.max(0, (tightRect.top - slideRect.top) - 2);
                        // 直下の兄弟要素またはフッター境界の上端Y座標を取得します
                        const maxTextBottomY = (headerTag === 'h2') ? 174 : ((headerTag === 'h5') ? 678 : getNextSiblingTopBoundaryPx(el, slide, slideRect));
                        // 縦方向の最大許容高さを算出します
                        const maxAllowedTextH = Math.max(24, maxTextBottomY - domTopY);
                        // 複数行テキストの場合、メイリオ折り返し時の必要高さがmaxAllowedTextHおよびDOM高さを超えないよう0.5px刻みで縮小します
                        if (isMultiLineText && boxW > 40) {
                            // 目標とする縦幅上限（DOM実測高さ+10px または 直下要素までの空間 の小さい方）を設定します
                            const targetMaxH = Math.min(maxAllowedTextH, Math.max(rect.height + 10, tightRect.height + 10));
                            // 収まるまで0.5px刻みでフォントサイズを検証します
                            while (fontPx > 8.5) {
                                // メイリオでの折り返し行数を推定します
                                const wrappedLines = estimateWrappedLinesCount(cleanTxt, fontPx, boxW - 4, isBold, false);
                                // 必要縦幅（行高1.35倍）が目標上限以内であれば確定します
                                if (wrappedLines * fontPx * 1.35 <= targetMaxH) {
                                    // ループを終了します
                                    break;
                                }
                                // 0.5px縮小して再検証します
                                fontPx -= 0.5;
                            }
                        }

                        // 最終的な文字高さを計算します（メイリオの折り返し行数と行高1.35倍を考慮）
                        const finalLineCount = isMultiLineText
                            ? estimateWrappedLinesCount(cleanTxt, fontPx, boxW - 4, isBold, false)
                            : 1;
                        // ボックス高さを算出します
                        const boxH = Math.min(maxAllowedTextH, Math.max(tightRect.height + 4, Math.ceil(fontPx * 1.35 * finalLineCount)));
                        // 垂直中心を一致させたボックス上端Y座標を計算します（ただし下限境界を超えないようクランプします）
                        const boxY = Math.max(0, Math.min(maxTextBottomY - boxH, centerY - (boxH / 2)));

                        // テキスト要素を追加します
                        slideObj.elements.push({
                            // タイプ
                            type: 'text',
                            // 見出しタグ種別（h1, h2, h3, h4, h5, h6）
                            tag: headerTag,
                            // 抽出したテキスト（数式トークン含む）
                            text: cleanTxt,
                            // X座標（タイト計測 px）
                            x: boxX,
                            // Y座標（タイト計測 px）
                            y: boxY,
                            // 幅（タイト計測 px）
                            w: boxW,
                            // 高さ（タイト計測 px）
                            h: boxH,
                            // 文字色
                            color: rgbToHex(style.color) || (headerTag === 'h2' ? 'FFFFFF' : '000000'),
                            // 背景色
                            bgColor: rgbToHex(style.backgroundColor),
                            // 実効フォントサイズ（px）
                            fontSize: fontPx,
                            // フォント太さ
                            fontWeight: isBold ? 'bold' : style.fontWeight,
                            // 水平揃え
                            textAlign: align,
                            // 垂直揃え（タイトボックスの中心に配置）
                            valign: 'middle',
                            // 1行テキストの場合は不必要な折り返しを防止します
                            noWrap: (!didAutoWrap && brCount === 0),
                            // z-index（h2は帯背景より前面の50）
                            zIndex: headerTag === 'h2' ? 50 : 20
                        });
                    }
                }
            };

            // 全スライド（section要素）を取得します
            const slides = Array.from(document.querySelectorAll('section'));
            // スライド解析結果配列です
            const data = [];

            // 1枚目のスライドから基準テーマカラー（--primary-color）を取得します
            let themePrimaryColor = '1F497D';
            // スライドが存在する場合
            if (slides.length > 0) {
                // 計算済みスタイルからCSS変数を取得します
                const rawPrimary = window.getComputedStyle(slides[0]).getPropertyValue('--primary-color').trim();
                // HEXに変換します
                const hexPrimary = rgbToHex(rawPrimary);
                // 有効であれば更新します
                if (hexPrimary) {
                    // テーマカラーを設定します
                    themePrimaryColor = hexPrimary;
                }
            }

            // 各スライドを順番に走査して構成要素を抽出します
            slides.forEach((slide, idx) => {
                // スライドの境界矩形を取得します
                const slideRect = slide.getBoundingClientRect();
                // 1ページ目（表紙スライド）であるか判定します
                const isTitleSlide = slide.getAttribute('data-marpit-pagination') === '1';
                // ワイドレイアウト（wide-content）であるか判定します
                const isWideSlide = slide.classList.contains('wide-content');
                // 目次スライド（toc）であるか判定します
                const isTocSlide = slide.classList.contains('toc');
                // このスライド固有のテーマカラー（--primary-color）を取得します
                const slidePrimaryRaw = window.getComputedStyle(slide).getPropertyValue('--primary-color').trim();
                // HEX形式に変換します
                const slidePrimaryColor = rgbToHex(slidePrimaryRaw) || themePrimaryColor;

                // 使用するスライドマスター名を決定します
                let masterName = 'MASTER_NORMAL';
                // 表紙スライドの場合
                if (isTitleSlide) {
                    // 表紙マスターを指定します
                    masterName = 'MASTER_TITLE';
                // 目次スライドの場合
                } else if (isTocSlide) {
                    // 目次マスターを指定します
                    masterName = 'MASTER_TOC';
                // ワイドスライドの場合
                } else if (isWideSlide) {
                    // ワイドマスターを指定します
                    masterName = 'MASTER_WIDE';
                }

                // スライドデータオブジェクトを初期化します
                const slideObj = {
                    // スライド番号（1始まり）
                    index: idx + 1,
                    // 適用するマスター名
                    masterName,
                    // 表紙フラグ
                    isTitleSlide,
                    // ワイドフラグ
                    isWideSlide,
                    // 目次フラグ
                    isTocSlide,
                    // スライドのテーマカラー
                    primaryColor: slidePrimaryColor,
                    // ページ番号文字列（data-marpit-pagination属性値）
                    pageNumber: slide.getAttribute('data-marpit-pagination') || String(idx + 1),
                    // 表紙バナーの有無フラグ
                    hasBanner: false,
                    // バナー画像ソース
                    bannerSrc: null,
                    // 要素配列
                    elements: []
                };

                // 1. 表紙スライドのバナー画像（section[data-marpit-pagination="1"]::before）を検出します
                if (isTitleSlide) {
                    // ::before疑似要素の計算済みスタイルを取得します
                    const beforeStyle = window.getComputedStyle(slide, '::before');
                    // backgroundImageプロパティを取得します
                    const bgImage = beforeStyle ? beforeStyle.backgroundImage : '';
                    // 背景画像が有効に指定されている場合
                    if (bgImage && bgImage !== 'none') {
                        // バナーフラグを有効化します
                        slideObj.hasBanner = true;
                        // url(...) 内部の文字列を抽出します
                        const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                        // 抽出できた場合
                        if (match && match[1]) {
                            // バナーソースを保存します
                            slideObj.bannerSrc = match[1];
                        }
                    }
                }

                // 2. 通常スライドのH2主張帯背景（section::before, top:65px, height:110px）を検出して編集可能な背景シェイプとして追加します
                if (!isTitleSlide && !isWideSlide && !isTocSlide) {
                    // ::before疑似要素のスタイルを取得します
                    const beforeStyle = window.getComputedStyle(slide, '::before');
                    // contentが有効かつ高さが存在する場合
                    const beforeH = parseFloat(beforeStyle?.height || '0');
                    // H2帯が表示されている場合
                    if (beforeStyle && beforeStyle.content !== 'none' && beforeH > 10) {
                        // 帯の背景色を取得します
                        const bandColor = rgbToHex(beforeStyle.backgroundColor) || slidePrimaryColor;
                        // 帯の上端Y座標を取得します
                        const bandTop = parseFloat(beforeStyle.top) || 65;
                        // 編集可能な矩形シェイプとしてスライド要素に追加します
                        slideObj.elements.push({
                            // タイプをshapeに設定
                            type: 'shape',
                            // 矩形
                            shapeType: 'rect',
                            // X座標（0）
                            x: 0,
                            // Y座標（65px）
                            y: bandTop,
                            // 幅（スライド全幅）
                            w: nativeW,
                            // 高さ（110px）
                            h: beforeH,
                            // 塗りつぶし色
                            fillColor: bandColor,
                            // 枠線なし
                            strokeColor: null,
                            // テキスト（h2: 50）より背面のz-index（10）
                            zIndex: 10
                        });
                    }
                }

                // 3. ワイドレイアウトや目次レイアウトでH1タイトルの下線（border-bottom）が設定されている場合の抽出処理です
                if (!isTitleSlide && (isWideSlide || isTocSlide)) {
                    // ワイド時はtop:60px付近に境界線があるため、細い水平ラインシェイプを配置します
                    slideObj.elements.push({
                        // タイプをshapeに設定
                        type: 'shape',
                        // 矩形（細線）
                        shapeType: 'rect',
                        // X座標
                        x: 20,
                        // Y座標
                        y: 62,
                        // 幅
                        w: nativeW - 40,
                        // 高さ（2px）
                        h: 2,
                        // テーマカラー
                        fillColor: slidePrimaryColor,
                        // 枠線なし
                        strokeColor: null,
                        // z-index
                        zIndex: 10
                    });
                }

                // 4. スライド直下の子要素を走査してヘッダー、フッター、各見出し（h1〜h6）配下のコンテンツを抽出します
                let currentHeaderTag = null;
                // h6（フッター）の出現回数カウンターです（1つ目がコピーライト、2つ目が機密指定）
                let h6Count = 0;
                // 表紙のh3出現回数カウンターです（1つ目が図書番号、2つ目が所属・氏名）
                let titleH3Count = 0;

                // 子要素を順番に処理します
                Array.from(slide.children).forEach(child => {
                    // タグ名を小文字で取得します（Marpのカスタム要素 marp-h1 等は h1 に正規化します）
                    const rawTag = child.tagName.toLowerCase();
                    // marp-プレフィックスを除去して正規化します
                    const tag = rawTag.startsWith('marp-') ? rawTag.slice(5) : rawTag;

                    // ヘッダー要素（<header>）の処理
                    if (tag === 'header') {
                        // 内部にロゴ画像（<img>）が存在するか確認します
                        const img = child.querySelector('img');
                        // ロゴ画像が存在する場合
                        if (img) {
                            // 画像の矩形を取得します
                            const ir = img.getBoundingClientRect();
                            // ロゴ画像要素を追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'image',
                                // サブタイプをheader-logoに設定
                                subtype: 'header-logo',
                                // 画像URL
                                src: img.src,
                                // X座標（px）
                                x: ir.left - slideRect.left,
                                // Y座標（px）
                                y: ir.top - slideRect.top,
                                // 右端X座標（px）
                                right: ir.right - slideRect.left,
                                // 幅（px）
                                w: ir.width,
                                // 高さ（px）
                                h: ir.height,
                                // 自然幅
                                naturalW: img.naturalWidth,
                                // 自然高
                                naturalH: img.naturalHeight,
                                // 最前面z-index
                                zIndex: 100
                            });
                            // ヘッダー処理完了
                            return;
                        }
                        // テキストヘッダーの場合
                        const hText = extractCleanText(child);
                        // テキストが存在する場合
                        if (hText) {
                            // 矩形を取得します
                            const hr = child.getBoundingClientRect();
                            // スタイルを取得します
                            const hs = window.getComputedStyle(child);
                            // ヘッダーテキスト要素を追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'text',
                                // タグ
                                tag: 'header',
                                // テキスト
                                text: hText,
                                // X座標
                                x: hr.left - slideRect.left,
                                // Y座標
                                y: hr.top - slideRect.top,
                                // 幅
                                w: hr.width,
                                // 高さ
                                h: hr.height,
                                // 文字色
                                color: rgbToHex(hs.color) || '666666',
                                // 背景なし
                                bgColor: null,
                                // フォントサイズ
                                fontSize: parseFloat(hs.fontSize) || 12,
                                // 太さ
                                fontWeight: hs.fontWeight,
                                // 右揃え
                                textAlign: hs.textAlign || 'right',
                                // z-index
                                zIndex: 90
                            });
                        }
                        // ヘッダー処理完了
                        return;
                    }

                    // フッター要素（<footer>）の処理
                    if (tag === 'footer') {
                        // テキストを取得します
                        const fText = extractCleanText(child);
                        // テキストが存在する場合
                        if (fText) {
                            // 矩形を取得します
                            const fr = child.getBoundingClientRect();
                            // スタイルを取得します
                            const fs = window.getComputedStyle(child);
                            // フッターテキスト要素を追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'text',
                                // タグ
                                tag: 'footer',
                                // テキスト
                                text: fText,
                                // X座標
                                x: fr.left - slideRect.left,
                                // Y座標
                                y: fr.top - slideRect.top,
                                // 幅
                                w: fr.width,
                                // 高さ
                                h: fr.height,
                                // 文字色
                                color: rgbToHex(fs.color) || 'FFFFFF',
                                // 背景なし
                                bgColor: null,
                                // フォントサイズ
                                fontSize: parseFloat(fs.fontSize) || 14,
                                // 太さ
                                fontWeight: fs.fontWeight,
                                // 左揃え
                                textAlign: fs.textAlign || 'left',
                                // z-index
                                zIndex: 90
                            });
                        }
                        // フッター処理完了
                        return;
                    }

                    // 見出しアンカータグ（h1〜h6）の検出
                    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                        // 現在の見出しタグを更新します
                        currentHeaderTag = tag;
                        // h6の場合は出現回数をカウントアップします
                        if (tag === 'h6') {
                            // カウントを増やします
                            h6Count += 1;
                        }
                        // 表紙のh3の場合は出現回数をカウントアップします
                        if (isTitleSlide && tag === 'h3') {
                            // カウントを増やします
                            titleH3Count += 1;
                        }
                        // アンカー自体は非表示のため次へ進みます
                        return;
                    }

                    // 見出しアンカー配下のコンテンツ要素を処理します
                    if (currentHeaderTag) {
                        // h6（コピーライト・機密指定）の場合はサブタグ名を区別して渡します
                        let effectiveTag = currentHeaderTag;
                        // h6の1つ目はh6-copyright、2つ目はh6-confidentialとします
                        if (currentHeaderTag === 'h6') {
                            // 出現順に応じたタグ名を設定します
                            effectiveTag = h6Count === 1 ? 'h6-copyright' : 'h6-confidential';
                        // 表紙のh3の1つ目はh3-bookno、2つ目はh3-authorとします
                        } else if (isTitleSlide && currentHeaderTag === 'h3') {
                            // 出現順に応じたタグ名を設定します
                            effectiveTag = titleH3Count === 1 ? 'h3-bookno' : 'h3-author';
                        }
                        // コンテンツブロック解析関数を呼び出します
                        processContentBlock(child, effectiveTag, slide, slideRect, slideObj);
                    }
                });

                // 解析したスライドオブジェクトを結果配列へ追加します
                data.push(slideObj);
            });

            // デッキ全体から共通のコピーライトおよび機密区分テキストを検出します
            let defaultCopyright = '© 2026 N-Y-Public';
            // デフォルトの機密区分文字列を初期化します
            let defaultConfidentiality = 'CONFIDENTIAL';
            // 全スライドの要素を走査して最初に見つかったh6テキストを採用します
            for (const s of data) {
                // コピーライト要素を検索します
                const cpEl = s.elements.find(e => e.tag === 'h6-copyright' && e.text);
                // 機密指定要素を検索します
                const cfEl = s.elements.find(e => e.tag === 'h6-confidential' && e.text);
                // コピーライトが見つかれば更新します
                if (cpEl) defaultCopyright = cpEl.text;
                // 機密指定が見つかれば更新します
                if (cfEl) defaultConfidentiality = cfEl.text;
                // 両方見つかればループを終了します
                if (cpEl && cfEl) break;
            }

            // デッキ内のヘッダーロゴ情報を取得します
            let headerLogoInfo = null;
            // 全スライドを走査してヘッダーロゴを探索します
            for (const s of data) {
                // header-logoサブタイプの画像要素を検索します
                const hl = s.elements.find(e => e.subtype === 'header-logo');
                // ロゴが見つかった場合
                if (hl && hl.src) {
                    // ロゴ情報を設定します
                    headerLogoInfo = {
                        // 画像URLまたはパス
                        src: hl.src,
                        // 自然横幅
                        naturalW: hl.naturalW || 100,
                        // 自然縦幅
                        naturalH: hl.naturalH || 50
                    };
                    // 走査を終了します
                    break;
                }
            }

            // スライドマスター側でヘッダーロゴ・コピーライト・機密区分を一元管理するため、個別スライドの要素配列から除外します
            data.forEach(s => {
                // スライドマスター管理対象の要素を除外します
                s.elements = s.elements.filter(e => e.subtype !== 'header-logo' && e.tag !== 'h6-copyright' && e.tag !== 'h6-confidential');
            });

            // 16:9ワイド比率であるか判定します
            const is169 = (nativeW / nativeH > 1.5) || nativeW >= 1200;

            // ブラウザ評価結果をシリアライズしてNode.js側へ返却します
            return {
                // スライドデータ配列
                slides: JSON.parse(JSON.stringify(data)),
                // 設計横幅（px）
                slideWidth: nativeW,
                // 設計縦幅（px）
                slideHeight: nativeH,
                // 16:9フラグ
                is169,
                // 基準テーマカラー（HEX）
                themePrimaryColor,
                // デフォルトコピーライト
                defaultCopyright,
                // デフォルト機密指定
                defaultConfidentiality,
                // ヘッダーロゴ情報
                headerLogo: headerLogoInfo,
                // 数式プレースホルダーマップ
                mathMap
            };
        });

        // 解析が完了したためヘッドレスブラウザを閉じます
        await browser.close();
        // ブラウザ変数をnullにリセットします
        browser = null;

        // ----------------------------------------------------------------------
        // 4. PptxGenJS を使用してネイティブPowerPointスライドとマスターを構築
        // ----------------------------------------------------------------------
        // PowerPointプレゼンテーション作成インスタンスを生成します
        const pres = new PptxGenJS();
        // 16:9比率であるかを判定します
        const is169 = slidesData.is169;
        // ターゲット横幅（px）を取得します
        const targetWidth = slidesData.slideWidth || (is169 ? 1280 : 960);
        // ターゲット縦幅（px）を取得します
        const targetHeight = slidesData.slideHeight || 720;
        // 基準テーマカラー（HEX）を取得します
        const masterPrimaryColor = slidesData.themePrimaryColor || '1F497D';

        // 16:9比率の場合はカスタムレイアウトを登録して適用します
        if (is169) {
            // インチ単位で16:9ワイドレイアウトを定義します
            pres.defineLayout({ name: 'LAYOUT_16x9_WIDE', width: targetWidth * PX_TO_INCH, height: targetHeight * PX_TO_INCH });
            // 定義したレイアウトを指定します
            pres.layout = 'LAYOUT_16x9_WIDE';
        // 4:3比率の場合は標準の4:3レイアウトを指定します
        } else {
            // 標準4:3を指定します
            pres.layout = 'LAYOUT_4x3';
        }

        // デッキ全体のヘッダーロゴ画像を解決します
        const resolvedLogo = slidesData.headerLogo ? resolveLocalOrDataImage(slidesData.headerLogo.src, INPUT_DIR) : null;
        // ロゴのアスペクト比を計算します（デフォルト2.0）
        const logoAspect = (slidesData.headerLogo && slidesData.headerLogo.naturalH > 0)
            ? (slidesData.headerLogo.naturalW / slidesData.headerLogo.naturalH)
            : 2.0;

        // デフォルトのコピーライト文字列を取得します
        const defaultCopyright = slidesData.defaultCopyright || '© 2026 N-Y-Public';
        // デフォルトの機密区分文字列を取得します
        const defaultConfidentiality = slidesData.defaultConfidentiality || 'CONFIDENTIAL';
        // コピーライト表記のタイトなボックス横幅（px）を計算します
        const copyBoxW = Math.max(150, Math.ceil(defaultCopyright.length * 8.5) + 20);
        // 機密区分表記（19px太字）のタイトなボックス横幅（px）を計算します
        const confBoxW = Math.max(165, Math.ceil(defaultConfidentiality.length * 14.5) + 24);
        // フッター共通のコピーライトオブジェクト定義（left: 20px, bottom: 12px, 12px白文字）を作成します
        const footerCopyrightObj = {
            // テキストオブジェクト定義
            text: {
                // コピーライト文字列
                text: defaultCopyright,
                // 配置・書式オプション
                options: {
                    // 左端から20pxの位置に配置します
                    x: 20 * PX_TO_INCH,
                    // 下端から12px（高さ20px）の位置に配置します
                    y: (targetHeight - 32) * PX_TO_INCH,
                    // 文字数に応じたタイトな幅を設定します
                    w: copyBoxW * PX_TO_INCH,
                    // 高さ20pxを設定します
                    h: 20 * PX_TO_INCH,
                    // 文字色（白）
                    color: 'FFFFFF',
                    // フォントファミリー
                    fontFace: 'Meiryo',
                    // フォントサイズ（12px = 9pt）
                    fontSize: 12 * PX_TO_PT,
                    // 左揃え
                    align: 'left',
                    // 垂直中央揃え
                    valign: 'middle',
                    // 余白0
                    margin: 0
                }
            }
        };
        // フッター共通の機密区分オブジェクト定義（right: 70px, bottom: 8px, 19px赤太字）を作成します
        const footerConfidentialObj = {
            // テキストオブジェクト定義
            text: {
                // 機密区分文字列
                text: defaultConfidentiality,
                // 配置・書式オプション
                options: {
                    // 右端から70px内側にボックス右端を揃えて配置します
                    x: (targetWidth - 70 - confBoxW) * PX_TO_INCH,
                    // 下端から8px（高さ26px）の位置に配置します
                    y: (targetHeight - 34) * PX_TO_INCH,
                    // 文字数に応じたタイトな幅を設定します
                    w: confBoxW * PX_TO_INCH,
                    // 高さ26pxを設定します
                    h: 26 * PX_TO_INCH,
                    // 文字色（赤: #FF0000）
                    color: 'FF0000',
                    // フォントファミリー
                    fontFace: 'Meiryo',
                    // フォントサイズ（19px = 14.25pt）
                    fontSize: 19 * PX_TO_PT,
                    // 太字を有効化します
                    bold: true,
                    // 右揃え
                    align: 'right',
                    // 垂直中央揃え
                    valign: 'middle',
                    // 余白0
                    margin: 0
                }
            }
        };

        // 表紙用スライドマスターの共通オブジェクト配列を作成します
        const titleMasterObjects = [
            // 下部フッター帯（矩形）
            {
                // 矩形定義
                rect: {
                    // X座標0
                    x: 0,
                    // Y座標（下端から40px）
                    y: (targetHeight - 40) * PX_TO_INCH,
                    // スライド全幅
                    w: targetWidth * PX_TO_INCH,
                    // 高さ40px
                    h: 40 * PX_TO_INCH,
                    // テーマカラー塗りつぶし
                    fill: { color: masterPrimaryColor }
                }
            },
            // フッター左側のコピーライト表記
            footerCopyrightObj,
            // フッター右側の機密区分表記（赤太字）
            footerConfidentialObj
        ];

        // 表紙スライド用ヘッダーロゴ（フッター帯直上の右下）が存在する場合は追加します
        if (resolvedLogo) {
            // 表紙ロゴの高さを50pxとして計算します
            const titleLogoH = 50 * PX_TO_INCH;
            // アスペクト比から表紙ロゴの幅を算出します
            const titleLogoW = titleLogoH * logoAspect;
            // 表紙ロゴのX座標（右端から20px内側）を算出します
            const titleLogoX = (targetWidth - 20) * PX_TO_INCH - titleLogoW;
            // 表紙ロゴのY座標（下端フッター直上、下端から50px上）を算出します
            const titleLogoY = (targetHeight - 50) * PX_TO_INCH - titleLogoH;
            // 表紙マスターオブジェクト配列へ画像を追加します
            titleMasterObjects.push({
                // 画像定義
                image: {
                    // X座標
                    x: titleLogoX,
                    // Y座標
                    y: titleLogoY,
                    // 幅
                    w: titleLogoW,
                    // 高さ
                    h: titleLogoH,
                    // Data URIまたはファイルパスを設定します
                    ...(resolvedLogo.isData ? { data: resolvedLogo.value } : { path: resolvedLogo.value })
                }
            });
        }

        // 通常スライド用マスターの共通オブジェクト配列を作成します
        const normalMasterObjects = [
            // 下部フッター帯（矩形）
            {
                // 矩形定義
                rect: {
                    // X座標0
                    x: 0,
                    // Y座標（下端から40px）
                    y: (targetHeight - 40) * PX_TO_INCH,
                    // スライド全幅
                    w: targetWidth * PX_TO_INCH,
                    // 高さ40px
                    h: 40 * PX_TO_INCH,
                    // テーマカラー塗りつぶし
                    fill: { color: masterPrimaryColor }
                }
            },
            // フッター左側のコピーライト表記
            footerCopyrightObj,
            // フッター右側の機密区分表記（赤太字）
            footerConfidentialObj
        ];

        // 通常スライド用ヘッダーロゴ（右上、上端から5px）が存在する場合は追加します
        if (resolvedLogo) {
            // 通常ロゴの高さを50pxとして計算します
            const normalLogoH = 50 * PX_TO_INCH;
            // アスペクト比から通常ロゴの幅を算出します
            const normalLogoW = normalLogoH * logoAspect;
            // 通常ロゴのX座標（右端から20px内側）を算出します
            const normalLogoX = (targetWidth - 20) * PX_TO_INCH - normalLogoW;
            // 通常ロゴのY座標（上端から5px）を算出します
            const normalLogoY = 5 * PX_TO_INCH;
            // 通常マスターオブジェクト配列へ画像を追加します
            normalMasterObjects.push({
                // 画像定義
                image: {
                    // X座標
                    x: normalLogoX,
                    // Y座標
                    y: normalLogoY,
                    // 幅
                    w: normalLogoW,
                    // 高さ
                    h: normalLogoH,
                    // Data URIまたはファイルパスを設定します
                    ...(resolvedLogo.isData ? { data: resolvedLogo.value } : { path: resolvedLogo.value })
                }
            });
        }

        // ページ番号の配置座標（右端から20px内側、bottom: 11px、19px白太字）を計算します
        const slideNumCommon = {
            // X座標（右端20px内側に幅45pxで配置）
            x: (targetWidth - 20 - 45) * PX_TO_INCH,
            // Y座標（下端から34px）
            y: (targetHeight - 34) * PX_TO_INCH,
            // 幅（45px）
            w: 45 * PX_TO_INCH,
            // 高さ（26px）
            h: 26 * PX_TO_INCH,
            // 文字色（白）
            color: 'FFFFFF',
            // フォントファミリー
            fontFace: 'Meiryo',
            // フォントサイズ（19px = 14.25pt）
            fontSize: 19 * PX_TO_PT,
            // 太字を有効化します
            bold: true,
            // 右揃え
            align: 'right',
            // 余白0
            margin: 0
        };

        // 1. 表紙用スライドマスター（MASTER_TITLE）を登録します（表紙はページ番号非表示）
        pres.defineSlideMaster({
            // マスター名
            title: 'MASTER_TITLE',
            // 白背景
            background: { color: 'FFFFFF' },
            // 下部フッター帯・ロゴ・コピーライト・機密指定
            objects: titleMasterObjects
        });

        // 2. 通常スライド用マスター（MASTER_NORMAL）を登録します
        pres.defineSlideMaster({
            // マスター名
            title: 'MASTER_NORMAL',
            // 白背景
            background: { color: 'FFFFFF' },
            // 下部フッター帯・ロゴ・コピーライト・機密指定
            objects: normalMasterObjects,
            // ページ番号プレースホルダー
            slideNumber: slideNumCommon
        });

        // 3. ワイドスライド用マスター（MASTER_WIDE）を登録します
        pres.defineSlideMaster({
            // マスター名
            title: 'MASTER_WIDE',
            // 白背景
            background: { color: 'FFFFFF' },
            // 下部フッター帯・ロゴ・コピーライト・機密指定
            objects: normalMasterObjects,
            // ページ番号プレースホルダー
            slideNumber: slideNumCommon
        });

        // 4. 目次スライド用マスター（MASTER_TOC）を登録します
        pres.defineSlideMaster({
            // マスター名
            title: 'MASTER_TOC',
            // 白背景
            background: { color: 'FFFFFF' },
            // 下部フッター帯・ロゴ・コピーライト・機密指定
            objects: normalMasterObjects,
            // ページ番号プレースホルダー
            slideNumber: slideNumCommon
        });

        // 各スライドのデータを走査してPowerPointページと要素を構築します
        slidesData.slides.forEach(slideData => {
            // レイアウト種別に応じたマスタースライドを適用して新規スライドを追加します
            const slide = pres.addSlide({ masterName: slideData.masterName || 'MASTER_NORMAL' });

            // スライド個別のテーマカラーが全体マスターと異なる場合は、フッター帯を上書き配置します
            if (slideData.primaryColor && slideData.primaryColor !== masterPrimaryColor) {
                // 個別テーマカラーのフッター帯を描画します
                slide.addShape(pres.ShapeType.rect, {
                    // X座標
                    x: 0,
                    // Y座標
                    y: (targetHeight - 40) * PX_TO_INCH,
                    // 幅
                    w: targetWidth * PX_TO_INCH,
                    // 高さ
                    h: 40 * PX_TO_INCH,
                    // 個別テーマカラー塗りつぶし
                    fill: { color: slideData.primaryColor },
                    // 枠線なし
                    line: { type: 'none' }
                });
            }

            // 表紙スライドでバナー画像が存在する場合の配置処理です
            if (slideData.hasBanner) {
                // バナー画像のソースを解決します
                const resolvedBanner = resolveLocalOrDataImage(slideData.bannerSrc, INPUT_DIR)
                    // 解決できない場合はデフォルトのthemes/banner.svgを使用します
                    || resolveLocalOrDataImage('themes/banner.svg', ROOT_DIR);
                // バナー画像が有効に解決できた場合
                if (resolvedBanner) {
                    // 画像配置オプションを作成します
                    const bannerOpts = {
                        // X座標（0）
                        x: 0,
                        // Y座標（0）
                        y: 0,
                        // 幅（スライド全幅）
                        w: targetWidth * PX_TO_INCH,
                        // 高さ（100px）
                        h: 100 * PX_TO_INCH
                    };
                    // Data URIの場合
                    if (resolvedBanner.isData) {
                        // dataプロパティに設定します
                        bannerOpts.data = resolvedBanner.value;
                    // ファイルパスの場合
                    } else {
                        // pathプロパティに設定します
                        bannerOpts.path = resolvedBanner.value;
                    }
                    // スライド上端にバナー画像を追加します
                    slide.addImage(bannerOpts);
                }
            }

            // 要素をz-indexの昇順でソートし、背面（背景帯・線）から前面（テキスト・ロゴ）へ順番に描画します
            slideData.elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

            // スライド内の各要素を順番にPowerPointオブジェクトとして出力します
            slideData.elements.forEach(el => {
                // X座標をインチ単位に変換します
                let x = (el.x || 0) * PX_TO_INCH;
                // Y座標をインチ単位に変換します
                let y = (el.y || 0) * PX_TO_INCH;
                // 横幅をインチ単位に変換します
                let w = (el.w || 0) * PX_TO_INCH;
                // 縦幅をインチ単位に変換します
                let h = (el.h || 0) * PX_TO_INCH;
                // 右端座標が存在する場合はインチに変換します
                const right = el.right ? el.right * PX_TO_INCH : null;

                // --------------------------------------------------------------
                // A. 画像要素（ヘッダーロゴ、本文内画像、会話アバター）
                // --------------------------------------------------------------
                if (el.type === 'image') {
                    // 画像パスまたはData URIを解決します
                    const resolvedImg = resolveLocalOrDataImage(el.src, INPUT_DIR);
                    // 画像が見つからない場合は警告を出してスキップします
                    if (!resolvedImg) {
                        // 警告を出力します
                        console.warn(`Warning: Image not found: ${el.src}`);
                        // スキップします
                        return;
                    }

                    // ヘッダーロゴはスライドマスター側で配置されているため個別スライド上ではスキップします
                    if (el.subtype === 'header-logo') {
                        // 重複配置を防ぐためスキップします
                        return;
                    }

                    // PptxGenJSのaddImageオプションを組み立てます
                    const imgOpts = { x, y, w, h };
                    // Data URI形式の場合
                    if (resolvedImg.isData) {
                        // dataプロパティを指定します
                        imgOpts.data = resolvedImg.value;
                    // ファイルパスの場合
                    } else {
                        // pathプロパティを指定します
                        imgOpts.path = resolvedImg.value;
                    }
                    // 画像をスライドへ追加します（アバター画像の角丸5pxはCanvasラスタライズ時に適用済みです）
                    slide.addImage(imgOpts);
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // B. 汎用背景・装飾シェイプ（H2主張帯背景、カラム背景、ボーダー線等）
                // --------------------------------------------------------------
                if (el.type === 'shape') {
                    // 線シェイプ（目次リーダー線等）の場合の特別処理です
                    if (el.shapeType === 'line') {
                        // ネイティブ線シェイプ（ShapeType.line）をスライドに追加します
                        slide.addShape(pres.ShapeType.line, {
                            // X座標
                            x,
                            // Y座標
                            y,
                            // 幅
                            w,
                            // 高さ（線のため0）
                            h: 0,
                            // 線スタイル定義
                            line: {
                                // 枠線色
                                color: el.strokeColor || '999999',
                                // 枠線太さ（pt）
                                width: el.strokePt || 1.5,
                                // 破線種別
                                dashType: el.dash ? 'dash' : 'solid'
                            }
                        });
                        // 次の要素へ進みます
                        return;
                    }
                    // 図形種別を取得します
                    const shapeKind = pres.ShapeType[el.shapeType] || pres.ShapeType.rect;
                    // 図形オプションを構築します
                    const shapeOpts = {
                        // X座標
                        x,
                        // Y座標
                        y,
                        // 幅
                        w,
                        // 高さ
                        h,
                        // 塗りつぶし色
                        fill: el.fillColor ? { color: el.fillColor } : undefined,
                        // 枠線設定
                        line: el.strokeColor
                            ? { color: el.strokeColor, width: el.strokePt || 1, dashType: el.dash ? 'dash' : 'solid' }
                            : { type: 'none' }
                    };
                    // シェイプをスライドに追加します
                    slide.addShape(shapeKind, shapeOpts);
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // C. テーブル要素（ネイティブ PowerPoint Table）
                // --------------------------------------------------------------
                if (el.type === 'table') {
                    // 列幅配列（インチ単位）を計算します
                    const colW = Array.isArray(el.colWidthsPx) && el.colWidthsPx.length > 0
                        ? el.colWidthsPx.map(px => px * PX_TO_INCH)
                        : undefined;
                    // 行高配列（インチ単位）を計算します
                    const rowH = Array.isArray(el.rowHeightsPx) && el.rowHeightsPx.length > 0
                        ? el.rowHeightsPx.map(px => px * PX_TO_INCH)
                        : undefined;
                    // PptxGenJSのaddTableを呼び出して編集可能なネイティブ表を配置します
                    slide.addTable(el.rows, {
                        // X座標
                        x,
                        // Y座標
                        y,
                        // テーブル全体幅
                        w,
                        // テーブル全体高さ
                        h,
                        // 各列の幅配列
                        colW,
                        // 各行の高さ配列
                        rowH,
                        // デフォルトフォントファミリー
                        fontFace: 'Meiryo',
                        // 自動ページ分割は無効化（1スライド内に収める）
                        autoPage: false
                    });
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // D. Mermaid分解プリミティブ（ネイティブ図形ノード & 矢印コネクタ線）
                // --------------------------------------------------------------
                if (el.type === 'mermaid-shape') {
                    // PptxGenJSの図形定数を解決します
                    const shapeMap = {
                        // 矩形
                        rect: pres.ShapeType.rect,
                        // 角丸矩形
                        roundRect: pres.ShapeType.roundRect,
                        // ひし形（条件分岐）
                        diamond: pres.ShapeType.diamond,
                        // 楕円・円
                        ellipse: pres.ShapeType.ellipse,
                        // 円柱（データベース）
                        can: pres.ShapeType.can
                    };
                    // 対応するShapeTypeを取得します
                    const stType = shapeMap[el.shapeType] || pres.ShapeType.rect;
                    // 図形および内部テキストのオプションを構築します
                    const mShapeOpts = {
                        // X座標
                        x,
                        // Y座標
                        y,
                        // 幅
                        w,
                        // 高さ
                        h,
                        // 塗りつぶし色
                        fill: { color: el.fillColor || 'EEEEEE' },
                        // 枠線設定
                        line: {
                            // 枠線色
                            color: el.strokeColor || '999999',
                            // 枠線太さ（pt）
                            width: el.strokePt || 1,
                            // 破線タイプ
                            dashType: el.dash ? 'dash' : 'solid'
                        },
                        // 角丸半径（roundRect時）
                        rectRadius: el.shapeType === 'roundRect' ? 0.15 : undefined,
                        // 文字色
                        color: el.textColor || '000000',
                        // フォントファミリー
                        fontFace: 'Meiryo',
                        // フォントサイズ（pt）
                        fontSize: Math.max(6, (el.fontSize || 14) * PX_TO_PT),
                        // 水平中央揃え
                        align: 'center',
                        // 垂直中央揃え
                        valign: 'middle',
                        // 内側余白を最小化して文字切れを防止します
                        margin: [2, 4, 2, 4],
                        // 折り返しを有効化
                        wrap: true
                    };
                    // ラベルテキストが存在する場合はテキスト付きシェイプ（addText）として追加します
                    if (el.text && el.text.trim().length > 0) {
                        // 図形タイプを指定します
                        mShapeOpts.shape = stType;
                        // 編集可能なテキスト付き図形を追加します
                        slide.addText(el.text, mShapeOpts);
                    // テキストがない背景枠（subgraph等）の場合は純粋な図形（addShape）として追加します
                    } else {
                        // 図形を追加します
                        slide.addShape(stType, mShapeOpts);
                    }
                    // 次の要素へ進みます
                    return;
                }

                // Mermaidの矢印・エッジ接続線の処理です
                if (el.type === 'mermaid-line') {
                    // 線シェイプのオプションを構築します
                    const lineOpts = {
                        // X座標
                        x,
                        // Y座標
                        y,
                        // 幅
                        w,
                        // 高さ
                        h,
                        // 水平反転フラグ
                        flipH: Boolean(el.flipH),
                        // 垂直反転フラグ
                        flipV: Boolean(el.flipV),
                        // 線スタイル定義
                        line: {
                            // 線色
                            color: el.strokeColor || '666666',
                            // 線太さ（pt）
                            width: el.strokePt || 1.25,
                            // 破線タイプ
                            dashType: el.dash ? 'dash' : 'solid',
                            // 始点矢印
                            beginArrowType: el.startArrow ? 'triangle' : 'none',
                            // 終点矢印
                            endArrowType: el.endArrow ? 'triangle' : 'none'
                        }
                    };
                    // ネイティブ線シェイプ（ShapeType.line）を追加します
                    slide.addShape(pres.ShapeType.line, lineOpts);
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // E. 会話レイアウトの吹き出し（ネイティブ編集可能シェイプ + テキスト）
                // --------------------------------------------------------------
                if (el.type === 'conversation-bubble') {
                    // しっぽ（三角形）の横幅（15px分）をインチで算出します
                    const tailW = 15 * PX_TO_INCH;
                    // しっぽ（三角形）の縦幅（20px分）をインチで算出します
                    const tailH = 20 * PX_TO_INCH;
                    // しっぽの上端Y座標（吹き出し上端から18px）を算出します
                    const tailY = y + (18 * PX_TO_INCH);
                    // 吹き出しの背景色を取得します
                    const bubbleColor = el.bgColor || 'DDE5EF';

                    // 1. 吹き出しのしっぽ（二等辺三角形）をネイティブ図形として追加します
                    if (el.isLeft) {
                        // 左発言用のしっぽ（左向き・270度回転）を配置します
                        slide.addShape(pres.ShapeType.triangle, {
                            // X座標（本体左端から左へ15px、0.01インチ重ねて隙間防止）
                            x: x - tailW + 0.01,
                            // Y座標
                            y: tailY,
                            // 幅
                            w: tailW,
                            // 高さ
                            h: tailH,
                            // 270度回転して左向きにします
                            rotate: 270,
                            // 吹き出しと同色で塗りつぶします
                            fill: { color: bubbleColor },
                            // 枠線なし
                            line: { type: 'none' }
                        });
                    // 右側発言のしっぽを描画する場合
                    } else {
                        // 右発言用のしっぽ（右向き・90度回転）を配置します
                        slide.addShape(pres.ShapeType.triangle, {
                            // X座標（本体右端から右へ15px、0.01インチ重ねて隙間防止）
                            x: x + w - 0.01,
                            // Y座標
                            y: tailY,
                            // 幅
                            w: tailW,
                            // 高さ
                            h: tailH,
                            // 90度回転して右向きにします
                            rotate: 90,
                            // 吹き出しと同色で塗りつぶします
                            fill: { color: bubbleColor },
                            // 枠線なし
                            line: { type: 'none' }
                        });
                    }

                    // 2. 吹き出し本体を編集可能な角丸矩形テキストシェイプとして追加します
                    slide.addText(el.text || '', {
                        // 角丸矩形を指定します
                        shape: pres.ShapeType.roundRect,
                        // 本体X座標（シフトせずDOM計測位置そのまま）
                        x,
                        // 本体Y座標
                        y,
                        // 本体幅（DOM計測幅そのまま）
                        w,
                        // 本体高さ（最低48px確保）
                        h: Math.max(h, 48 * PX_TO_INCH),
                        // 角丸半径
                        rectRadius: 0.15,
                        // 背景塗りつぶし色
                        fill: { color: bubbleColor },
                        // 枠線なし
                        line: { type: 'none' },
                        // 文字色
                        color: el.color || '222222',
                        // フォントファミリー
                        fontFace: 'Meiryo',
                        // フォントサイズ（pt）
                        fontSize: Math.max(8, (el.fontSize || 16) * PX_TO_PT),
                        // 水平揃え
                        align: el.textAlign || 'left',
                        // 垂直中央揃え
                        valign: 'middle',
                        // 内側パディング（上, 右, 下, 左 pt）
                        margin: [8, 14, 8, 14],
                        // 自動折り返し
                        wrap: true
                    });
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // F. コードブロック（シンタックスハイライト付き編集可能テキストボックス）
                // --------------------------------------------------------------
                if (el.type === 'code') {
                    // フォントサイズ（pt）を計算します
                    const codeFontPt = Math.max(5.5, (el.fontSize || 14) * PX_TO_PT);
                    // ハイライト付きラン配列をPptxGenJSのTextProps配列へ変換します
                    const textProps = Array.isArray(el.codeRuns) && el.codeRuns.length > 0
                        ? el.codeRuns.map(r => ({
                            // テキスト断片
                            text: r.text,
                            // ラン別オプション
                            options: {
                                // 文字色
                                color: r.color || '24292E',
                                // 太字フラグ
                                bold: Boolean(r.bold),
                                // 等幅フォント
                                fontFace: 'Consolas',
                                // フォントサイズ
                                fontSize: codeFontPt
                            }
                        }))
                        : el.text;

                    // 単一の編集可能なコードボックスとして追加します
                    slide.addText(textProps, {
                        // 矩形シェイプ
                        shape: pres.ShapeType.rect,
                        // X座標
                        x,
                        // Y座標
                        y,
                        // 幅
                        w,
                        // 高さ
                        h,
                        // 背景色
                        fill: { color: el.bgColor || 'F8F8F8' },
                        // 枠線
                        line: { color: el.borderColor || 'DDDDDD', width: 0.75 },
                        // フォントファミリー
                        fontFace: 'Consolas',
                        // フォントサイズ
                        fontSize: codeFontPt,
                        // 左揃え
                        align: 'left',
                        // 上揃え
                        valign: 'top',
                        // 内側余白（pt）
                        margin: [6, 10, 6, 10],
                        // 自動折り返し
                        wrap: true
                    });
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // G. 箇条書きリスト要素（ネイティブ Bullet / Indent 構造）
                // --------------------------------------------------------------
                if (el.type === 'list' && Array.isArray(el.listItems)) {
                    // 各リストアイテムをPptxGenJSの段落オブジェクト配列へ変換します
                    const bulletParagraphs = el.listItems.map(item => ({
                        // 項目テキスト
                        text: item.text,
                        // 項目オプション
                        options: {
                            // バレット設定
                            bullet: item.bullet !== undefined ? item.bullet : true,
                            // 段落改行を有効化
                            breakLine: true,
                            // インデント階層（0始まり）
                            indentLevel: item.level || 0,
                            // 文字色
                            color: item.color || el.color || '000000',
                            // フォントサイズ（pt）
                            fontSize: Math.max(6, (item.fontSize || el.fontSize || 18) * PX_TO_PT),
                            // フォントファミリー
                            fontFace: 'Meiryo',
                            // 太字フラグ
                            bold: Boolean(item.bold),
                            // 行間倍率
                            lineSpacingMultiple: el.tag === 'h2' ? 1.15 : 1.2
                        }
                    }));

                    // H2（主張帯）内のリストか判定します
                    const isClaimList = el.tag === 'h2';
                    // リストテキストボックスをタイトな計測座標・サイズでスライドへ追加します
                    slide.addText(bulletParagraphs, {
                        // X座標（タイト計測値）
                        x,
                        // Y座標（タイト計測値）
                        y,
                        // 幅（タイト計測値）
                        w,
                        // 高さ（タイト計測値）
                        h: Math.max(h, 0.25),
                        // 塗りつぶし（H2帯背景は別シェイプで描画済みのため透明）
                        fill: (!isClaimList && el.bgColor) ? { color: el.bgColor } : undefined,
                        // 垂直揃え（タイトボックス中心合わせのため中央揃え）
                        valign: el.valign || 'middle',
                        // 左揃え
                        align: 'left',
                        // 内側余白（pt）を最小化してボックスと文字領域を一致させます
                        margin: [0, 4, 0, 8],
                        // 自動折り返し
                        wrap: true
                    });
                    // 次の要素へ進みます
                    return;
                }

                // --------------------------------------------------------------
                // H. 通常のテキスト要素（タイトルh1、主張h2、図表タイトルh3、本文段落h4、出典h5、フッターh6等）
                // --------------------------------------------------------------
                // スライドマスター側で管理するコピーライトおよび機密指定は個別要素としてはスキップします
                if (el.tag === 'h6-copyright' || el.tag === 'h6-confidential') {
                    // スキップします
                    return;
                }
                // フォントサイズ（pt）を算出します
                const fontSizePt = Math.max(6, (el.fontSize || 18) * PX_TO_PT);
                // 太字判定を行います
                const isBold = el.fontWeight === 'bold' || parseInt(el.fontWeight, 10) >= 700;
                // 垂直揃えを決定します（タイト計測ボックスに合わせて中央揃えを基本とします）
                const valign = el.valign || 'middle';

                // テキストボックスオプションを構築します（DOM Rangeタイト計測値 x, y, w, h をそのまま適用します）
                const textOpts = {
                    // X座標（タイト計測値）
                    x,
                    // Y座標（タイト計測値）
                    y,
                    // 幅（タイト計測値）
                    w,
                    // 高さ（タイト計測値）
                    h: Math.max(h, 0.20),
                    // 文字色
                    color: el.color || '000000',
                    // 背景塗りつぶし（H2テキスト自体は透明）
                    fill: (el.bgColor && el.tag !== 'h2') ? { color: el.bgColor } : undefined,
                    // フォントファミリー
                    fontFace: 'Meiryo',
                    // フォントサイズ（pt）
                    fontSize: fontSizePt,
                    // 太字フラグ
                    bold: isBold,
                    // 水平揃え
                    align: el.textAlign || 'left',
                    // 垂直揃え
                    valign,
                    // 内側余白を0にして実際の文字描画領域とテキストボックス枠を完全に一致させます
                    margin: 0,
                    // 1行固定要素は折り返しを無効化し、複数行要素は自動折り返しを有効化します
                    wrap: !el.noWrap
                };

                // スライドへテキストボックスを追加します
                slide.addText(el.text, textOpts);
            });
        });

        // ----------------------------------------------------------------------
        // 5. PowerPointファイル（.pptx）の保存およびネイティブOffice MathML注入
        // ----------------------------------------------------------------------
        // アトミック書き出し用の一時PPTXファイルパスを構築します
        const tempBuildPptx = OUTPUT_PPTX.replace(/\.pptx$/i, '') + '_build_temp.pptx';
        // PptxGenJSで一時PPTXファイルへ書き出します
        await pres.writeFile({ fileName: tempBuildPptx });
        // 数式プレースホルダーが存在する場合はOOXML後処理でネイティブ数式（<a14:m><m:oMathPara><m:oMath>）へ変換します
        if (slidesData.mathMap && Object.keys(slidesData.mathMap).length > 0) {
            // 数式注入ログを出力します
            console.log(`Injecting ${Object.keys(slidesData.mathMap).length} native Office MathML equation(s)...`);
            // OOXML数式変換を実行します
            await injectOfficeMathIntoPptx(tempBuildPptx, slidesData.mathMap);
        }
        // 本番出力先PPTXへの反映を試みます
        try {
            // 既存の出力先PPTXファイルが存在する場合は事前削除を試みます
            if (fs.existsSync(OUTPUT_PPTX)) {
                // 既存ファイルを削除します
                fs.unlinkSync(OUTPUT_PPTX);
            }
            // 一時PPTXファイルを本番出力先へコピーします
            fs.copyFileSync(tempBuildPptx, OUTPUT_PPTX);
            // 一時PPTXファイルを削除します
            fs.unlinkSync(tempBuildPptx);
            // 成功ログを出力します
            console.log(`Success! PPTX saved to: ${OUTPUT_PPTX}`);
        // ホストOS（PowerPoint等）で出力先ファイルが開かれてロックされている場合のフォールバック処理です
        } catch (writeErr) {
            // 権限・ロックエラー（EACCES / EBUSY / EPERM）であるか判定します
            if (writeErr && (writeErr.code === 'EACCES' || writeErr.code === 'EBUSY' || writeErr.code === 'EPERM')) {
                // フォールバック出力先パス（_latest.pptx）を構築します
                const fallbackPptx = OUTPUT_PPTX.replace(/\.pptx$/i, '_latest.pptx');
                // フォールバック先へコピーします
                fs.copyFileSync(tempBuildPptx, fallbackPptx);
                // 一時PPTXファイルを削除します
                fs.unlinkSync(tempBuildPptx);
                // ロック警告を出力します
                console.warn(`[Notice] Target file is currently open/locked by host OS: ${OUTPUT_PPTX}`);
                // フォールバック保存成功ログを出力します
                console.log(`Success! PPTX saved to: ${fallbackPptx}`);
            // ロック以外のファイル書き込みエラーの場合
            } else {
                // 一時PPTXファイルが残っていれば削除します
                if (fs.existsSync(tempBuildPptx)) {
                    // 一時ファイルを削除します
                    fs.unlinkSync(tempBuildPptx);
                }
                // その他のエラーは再スローします
                throw writeErr;
            }
        }
    // エラー発生時は詳細を出力して終了コード1で終了します
    } catch (err) {
        // エラーメッセージを標準エラー出力に表示します
        console.error('Failed to convert Markdown to PPTX:', err);
        // 終了コード1を設定します
        process.exitCode = 1;
    // 正常時・異常時を問わず必ずブラウザ終了と一時HTML削除を実行します
    } finally {
        // ブラウザが起動中であれば閉じます
        if (browser) {
            // 例外を握りつぶしてクローズします
            try {
                // ブラウザを終了します
                await browser.close();
            // クローズ失敗時は無視します
            } catch (e) {}
        }
        // 中間HTMLファイルが存在する場合は確実に削除します
        if (fs.existsSync(TEMP_HTML)) {
            // 例外を握りつぶして削除します
            try {
                // 一時ファイルを削除します
                fs.unlinkSync(TEMP_HTML);
            // 削除失敗時は無視します
            } catch (e) {}
        }
    }
}

// メイン関数を実行して変換処理を開始します
main();
