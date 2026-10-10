// ヘッドレスブラウザ（Chromium）を自動操作するためのPuppeteerライブラリを読み込みます
import puppeteer from 'puppeteer';
// PowerPoint（.pptx）ファイルをプログラムから生成するためのPptxGenJSライブラリを読み込みます
import PptxGenJS from 'pptxgenjs';
// コマンドライン（CLI）コマンドを同期的に実行するための標準child_processモジュールを読み込みます
import { execSync } from 'child_process';
// ファイルパスの結合や拡張子の抽出などを安全に行うための標準pathモジュールを読み込みます
import path from 'path';
// ファイルの存在確認や読み書きを行うための標準ファイルシステム（fs）モジュールを読み込みます
import fs from 'fs';

// ==============================================================================
// 設定値および引数の初期化
// ==============================================================================

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
const THEME_CSS = 'themes/business-slide-theme.css';

// ==============================================================================
// 画面解像度および単位変換用の定数定義
// ==============================================================================

// 4:3スライドの基準画面横幅（ピクセル単位）を定義します
const SCREEN_WIDTH = 960;
// 4:3スライドの基準画面縦幅（ピクセル単位）を定義します
const SCREEN_HEIGHT = 720;
// ピクセル（px）からPowerPointが使用するインチ（inch）単位へ変換するための倍率です（96DPI基準）
const PX_TO_INCH = 1 / 96;

// ==============================================================================
// メイン変換処理関数
// ==============================================================================
async function main() {
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

    // --------------------------------------------------------------------------
    // 1. Marp CLIを使用してMarkdownを中間HTMLへレンダリング
    // --------------------------------------------------------------------------
    // 画像やフォントの読み込みを許可したMarp HTML出力コマンド文字列を組み立てます
    const cmd = `npx marp "${INPUT_MD}" --html --allow-local-files --theme-set "${THEME_CSS}" -o "${TEMP_HTML}"`;
    // Marp実行開始の進捗ログを出力します
    console.log(`Running Marp generation...`);
    // コマンド実行時の例外をキャッチするためのtry-catchブロックを開始します
    try {
        // 同期的にMarp CLIコマンドを実行してHTMLファイルを生成します
        execSync(cmd);
    // コマンド実行に失敗した場合のエラーハンドリングです
    } catch (e) {
        // 失敗理由をコンソールに出力します
        console.error('Failed to generate HTML:', e);
        // プロセスを終了します
        process.exit(1);
    }

    // --------------------------------------------------------------------------
    // 2. Puppeteer（Chromiumブラウザ）を起動してレイアウト解析
    // --------------------------------------------------------------------------
    // 環境変数にChromeパスが指定されているか確認します
    let chromePath = process.env.CHROME_PATH || '';
    // 指定がない場合はPuppeteer付属の実行ファイルパス取得を試みます
    if (!chromePath) {
        // 例外発生に備えてtryブロックで囲みます
        try {
            // Puppeteerのデフォルト実行可能パスを取得します
            const pPath = puppeteer.executablePath();
            // パスが存在していればそれを採用します
            if (fs.existsSync(pPath)) chromePath = pPath;
        // エラー時は無視してフォールバック探索へ進みます
        } catch (e) {}
    }
    // それでも見つからない場合、コンテナ内の標準キャッシュディレクトリを探索します
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
    }

    // Puppeteerの起動オプションを設定します（Dockerサンドボックス対応）
    const launchOpts = {
        // 新しいヘッドレスモードで起動します
        headless: "new",
        // ルート実行やコンテナ内でのセキュリティ制限を回避する起動引数です
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
    };
    // Chromeバイナリパスが特定できている場合はオプションに指定します
    if (chromePath) {
        // 実行ファイルパスを上書き設定します
        launchOpts.executablePath = chromePath;
    }

    // 設定したオプションでヘッドレスブラウザを起動します
    const browser = await puppeteer.launch(launchOpts);
    // 新しいブラウザタブ（ページ）を開きます
    const page = await browser.newPage();
    // ブラウザ内部のコンソールログをNode.js側の標準出力に転送します
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // ブラウザの表示領域（ビューポート）を基準サイズ（960x720）に設定します
    await page.setViewport({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

    // 一時HTMLファイルの絶対パスを解決します
    const htmlPath = path.resolve(TEMP_HTML);
    // HTML読み込み開始ログを出力します
    console.log(`Loading HTML for analysis...`);
    // ファイルURL形式でHTMLをブラウザに読み込み、ネットワーク通信が完了するまで待機します
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // --------------------------------------------------------------------------
    // 3. ブラウザ内DOMからスライド各要素の座標・スタイル・テキストを抽出
    // --------------------------------------------------------------------------
    // ブラウザコンテキスト内でJavaScript関数を実行し、評価結果を受け取ります
    const slidesData = await page.evaluate(() => {
        // Marpのスライド1枚1枚に対応する <section> タグをすべて取得します
        const slides = document.querySelectorAll('section');
        // 全スライドの解析結果を格納する配列です
        const data = [];

        // RGB形式のカラー文字列（例: rgb(255, 0, 0)）を16進数HEX（FF0000）に変換する補助関数です
        const rgbToHex = (rgb) => {
            // 透明や未設定の場合はnullを返却します
            if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
            // 数字部分（R, G, B）を正規表現で抽出します
            const res = rgb.match(/\d+/g);
            // 有効なRGB値が取得できない場合はnullを返します
            if (!res || res.length < 3) return null;
            // 2桁の16進数大文字文字列に変換して連結します
            return res.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
        };

        // DOM要素の座標、サイズ、計算済みスタイルを取得する補助関数です
        const getMetrics = (el, slideRect, type = 'text') => {
            // スライド基準での要素の境界矩形（BoundingBox）を取得します
            const rect = el.getBoundingClientRect();
            // 要素のブラウザ計算済みCSSスタイルを取得します
            const style = window.getComputedStyle(el);

            // 非表示の要素（display:none, visibility:hidden, opacity:0）はスキップします
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null;
            // 幅または高さが0の要素はスキップします
            if (rect.width === 0 || rect.height === 0) return null;

            // リスト要素（ul/ol）タグであるか判定します
            const isListTag = el.tagName === 'UL' || el.tagName === 'OL';
            // 子要素にリストを持っているか判定します
            const hasListChild = el.querySelector('ul, ol') !== null;
            // 抽出するテキストを保持する変数です
            let text = '';

            // リスト構造を含む要素の場合、箇条書きの階層構造を保持したテキストを構築します
            if (isListTag || hasListChild) {
                // 再帰的にリストノードを走査してインデント付きテキストを組み立てる関数です
                const buildListText = (node, level) => {
                    // 構築中のテキストバッファです
                    let res = '';
                    // 子要素を配列に変換して走査します
                    Array.from(node.children).forEach(child => {
                        // リスト項目（li）タグの場合
                        if (child.tagName === 'LI') {
                            // インデント階層に応じたスペース文字列を作成します
                            const indent = '  '.repeat(level);
                            // このリスト項目自身のテキストを保持する変数です
                            let liOwnText = '';
                            // 目次項目クラスを持っているか判定します
                            let isTocItem = child.classList.contains('toc-item');
                            
                            // 目次項目の段落タグを取得します
                            const pTag = child.querySelector('p');
                            // 目次項目の特殊フォーマット処理です
                            if (isTocItem && pTag) {
                                // リンクノード（タイトル）を取得します
                                const titleNode = pTag.querySelector('a');
                                // ページ番号ノードを取得します
                                const pageNode = pTag.querySelector('.toc-page');
                                // 両方が存在する場合、リーダー線（ドット）を挟んで成形します
                                if (titleNode && pageNode) {
                                    // タイトル文字列を取得します
                                    const titleStr = titleNode.textContent.trim();
                                    // ページ番号文字列を取得します
                                    const pageStr = pageNode.textContent.trim();
                                    // 文字数に応じたリーダー線のドット数を計算します
                                    const dotCount = Math.max(3, 45 - titleStr.length * 2); 
                                    // タイトル、リーダー線、ページ番号を連結します
                                    liOwnText = titleStr + ' ' + '・'.repeat(dotCount) + ' ' + pageStr;
                                // 通常のテキストとして取得します
                                } else {
                                    // 空白を正規化してトリムします
                                    liOwnText = pTag.textContent.replace(/\s+/g, ' ').trim();
                                }
                            // 通常のリスト項目の場合
                            } else {
                                // 子ノードを走査してテキストノードを収集します
                                Array.from(child.childNodes).forEach(n => {
                                    // テキストノード（nodeType: 3）の場合
                                    if (n.nodeType === 3) {
                                        // テキストを連結します
                                        liOwnText += n.textContent;
                                    // ネストされたリスト以外の要素（strong, span等）の場合
                                    } else if (n.nodeType === 1 && n.tagName !== 'UL' && n.tagName !== 'OL') {
                                        // その要素のテキストを連結します
                                        liOwnText += n.textContent;
                                    }
                                });
                                // 余分な空白を除去します
                                liOwnText = liOwnText.replace(/\s+/g, ' ').trim();
                            }

                            // テキストが存在すれば、インデントと箇条書き記号を付与して追加します
                            if (liOwnText) res += indent + '- ' + liOwnText + '\n';

                            // さらに子階層のネストリストが存在する場合、再帰的に処理します
                            const nested = child.querySelector('ul, ol');
                            // ネストリストがあればインデント階層を1つ上げて追加します
                            if (nested) res += buildListText(nested, level + 1);
                        }
                    });
                    // 完成した階層テキストを返却します
                    return res;
                };

                // リストタグ自身であれば直接構築します
                if (isListTag) {
                    // リストテキストを生成します
                    text = buildListText(el, 0);
                // コンテナ要素（h2内のリスト等）の場合
                } else {
                    // 子ノードを走査してテキストとリストを結合します
                    Array.from(el.childNodes).forEach(node => {
                        // テキストノードの場合
                        if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                            // テキストを改行付きで追加します
                            text += node.textContent.trim() + '\n';
                        // リスト要素の場合
                        } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                            // リストテキストを生成して追加します
                            text += buildListText(node, 0);
                        // その他の要素の場合
                        } else if (node.nodeType === 1) {
                            // テキストコンテンツを取得します
                            const t = node.textContent ? node.textContent.replace(/\s+/g, ' ').trim() : '';
                            // 空でなければ追加します
                            if (t) text += t + '\n';
                        }
                    });
                }
            // リスト以外の通常要素の場合
            } else {
                // innerTextまたはtextContentからテキストを取得します
                text = el.innerText && el.innerText.trim().length > 0 ? el.innerText : el.textContent;
            }

            // コードブロック要素であるかを判定します
            const isCode = el.tagName === 'PRE';
            // コードブロック以外でテキストが空の場合はスキップ対象とします
            if (!isCode && (!text || text.trim().length === 0)) return null;

            // 収集した要素情報をオブジェクトにまとめて返却します
            return {
                // 要素の種別（text, block, conversation-bubbleなど）
                type,
                // 小文字化したHTMLタグ名
                tag: el.tagName.toLowerCase(),
                // 抽出したテキスト本文
                text: text,
                // スライド左上を原点とするX座標（px）
                x: rect.left - slideRect.left,
                // スライド左上を原点とするY座標（px）
                y: rect.top - slideRect.top,
                // 要素の幅（px）
                w: rect.width,
                // 要素の高さ（px）
                h: rect.height,
                // 前景文字色（HEX形式）
                color: rgbToHex(style.color) || '000000',
                // 背景色（HEX形式）
                bgColor: rgbToHex(style.backgroundColor),
                // フォントサイズ（px数値）
                fontSize: parseFloat(style.fontSize),
                // フォントの太さ（normal, bold, 700など）
                fontWeight: style.fontWeight,
                // テキストの水平揃え（left, center, right）
                textAlign: style.textAlign,
                // 重なり順序（z-index）
                zIndex: style.zIndex === 'auto' ? 0 : parseInt(style.zIndex),
                // リスト要素かどうかのフラグ
                isList: el.tagName === 'UL' || el.tagName === 'OL' || el.querySelector('ul, ol') !== null,
                // コードブロックかどうかのフラグ
                isCode: isCode
            };
        };

        // スライドのCSS背景SVG画像から矩形シェイプを抽出する関数です
        const getBackgroundShapes = (slide) => {
            // スライドの計算済みスタイルを取得します
            const style = window.getComputedStyle(slide);
            // 背景画像プロパティの値を取得します
            const bgImage = style.backgroundImage;
            // 抽出したシェイプを格納する配列です
            const shapes = [];

            // Base64エンコードされたSVGデータURLであるか判定します
            if (bgImage && bgImage.startsWith('url("data:image/svg+xml;base64,')) {
                // パース処理中の例外に備えます
                try {
                    // Base64文字列部分を正規表現で抽出します
                    const base64 = bgImage.match(/base64,([^"]+)/)[1];
                    // Base64をデコードしてSVG XML文字列に戻します
                    const svgStr = atob(base64);
                    // DOMParserインスタンスを生成します
                    const parser = new DOMParser();
                    // SVG文字列をXMLドキュメントとしてパースします
                    const doc = parser.parseFromString(svgStr, 'image/svg+xml');

                    // SVG内部のすべての <rect> タグ（カラー帯など）を取得します
                    const rects = doc.querySelectorAll('rect');
                    // 各矩形要素を走査します
                    rects.forEach(rect => {
                        // 塗りつぶし色を取得します
                        const fill = rect.getAttribute('fill') || '#000000';
                        // X座標を取得します
                        const x = parseFloat(rect.getAttribute('x') || 0);
                        // Y座標を取得します
                        const y = parseFloat(rect.getAttribute('y') || 0);
                        // 幅を取得します
                        const width = parseFloat(rect.getAttribute('width') || 0);
                        // 高さを取得します
                        const height = parseFloat(rect.getAttribute('height') || 0);

                        // HEXカラー文字列から # を除去します
                        let color = fill.replace('#', '');
                        // rgb形式の場合はHEXに変換します
                        if (fill.startsWith('rgb')) {
                            // 変換関数を実行します
                            color = rgbToHex(fill) || '000000';
                        }

                        // 抽出したシェイプ情報を配列に追加します
                        shapes.push({
                            // 図形タイプをrectに指定します
                            type: 'rect',
                            // X座標
                            x: x,
                            // Y座標
                            y: y,
                            // 横幅
                            w: width,
                            // 高さ
                            h: height,
                            // カラーコード
                            color: color
                        });
                    });
                // エラー時はログを出力します
                } catch (e) {
                    // パース失敗エラーを出力します
                    console.error('Failed to parse background SVG:', e);
                }
            }
            // 抽出したシェイプ配列を返します
            return shapes;
        };

        // スライド全体共通の背景シェイプを保持する配列です
        const globalShapes = [];

        // 検出されたすべてのスライド（section）を順番に解析します
        slides.forEach((slide, idx) => {
            // スライド自体の位置・サイズ矩形を取得します
            const slideRect = slide.getBoundingClientRect();
            // このスライドの情報を保持するオブジェクトを初期化します
            const slideObj = {
                // スライド番号（1始まり）
                index: idx + 1,
                // 表紙バナーが存在するかどうかのフラグ
                hasBanner: false,
                // スライド内の全要素を格納する配列
                elements: []
            };

            // スライド解析の開始ログを出力します
            console.log(`Analyzing Slide ${idx + 1}...`);

            // --- コンテンツ自動縮小（Auto-Resizing）処理 ---
            // 本文領域（h4以降、フッター手前）のDOM要素群を取得する関数です
            const getBodyElements = (s) => {
                // 本文要素を格納する配列です
                const bodyElements = [];
                // 本文エリア内にあるかどうかのフラグです
                let isBody = false;
                // スライド直下の子要素を順番に確認します
                for (const child of s.children) {
                    // タグ名を小文字で取得します
                    const tag = child.tagName.toLowerCase();
                    // h4（本文開始の見出し）に達したら本文フラグを有効化します
                    if (tag === 'h4') {
                        // フラグを立てます
                        isBody = true;
                        // h4自体は本文コンテナではないためスキップします
                        continue;
                    }
                    // 他の見出しやヘッダー・フッターに達したら本文エリア終了とみなします
                    if (['h1', 'h2', 'h3', 'h5', 'h6', 'header', 'footer'].includes(tag)) {
                        // フラグを倒します
                        isBody = false;
                    }
                    // 本文フラグが立っている間の要素を配列に追加します
                    if (isBody) {
                        // 要素を追加します
                        bodyElements.push(child);
                    }
                }
                // 本文要素配列を返却します
                return bodyElements;
            };

            // 要素にテキストの折り返しスタイルを強制適用する関数です
            const applyWrappingStyles = (elements) => {
                // 各本文要素に対してスタイルを設定します
                elements.forEach(el => {
                    // 長い単語でも境界で改行するように設定します
                    el.style.setProperty('word-wrap', 'break-word', 'important');
                    // 日本語・英単語問わず文字単位で折り返す設定です
                    el.style.setProperty('word-break', 'break-all', 'important');
                    // コードブロック（pre）タグの場合は改行を維持して折り返します
                    if (el.tagName.toLowerCase() === 'pre') {
                        // プリフォーマットを維持した折り返しを設定します
                        el.style.setProperty('white-space', 'pre-wrap', 'important');
                    }
                    // 子孫要素すべてに対しても同様の折り返しスタイルを設定します
                    el.querySelectorAll('*').forEach(desc => {
                        // 単語境界での折り返し
                        desc.style.setProperty('word-wrap', 'break-word', 'important');
                        // 文字単位での強制折り返し
                        desc.style.setProperty('word-break', 'break-all', 'important');
                        // 内部のpre/codeタグに対する折り返し設定
                        if (desc.tagName.toLowerCase() === 'pre' || desc.tagName.toLowerCase() === 'code') {
                            // pre-wrapを指定します
                            desc.style.setProperty('white-space', 'pre-wrap', 'important');
                        }
                    });
                });
            };

            // 要素がスライドの許容表示領域をはみ出しているかチェックする関数です
            const checkOverflow = (elements, sRect) => {
                // スライド下端の許容限界Y座標です（フッター領域を除外）
                const MAX_BOTTOM = sRect.height - 50;
                // スライド右端の許容限界X座標です（余白を除外）
                const MAX_RIGHT = sRect.width - 40;
                // はみ出し判定フラグを初期化します
                let overflowed = false;

                // 各要素の境界矩形を判定します
                for (const el of elements) {
                    // 要素の矩形を取得します
                    const rect = el.getBoundingClientRect();
                    // スライド基準の下端Y座標を計算します
                    const bottom = rect.bottom - sRect.top;
                    // スライド基準の右端X座標を計算します
                    const right = rect.right - sRect.left;

                    // サイズが0の要素は判定対象外とします
                    if (rect.width === 0 || rect.height === 0) continue;

                    // 下端または右端が限界値を超えている場合はみ出しと判定します
                    if (bottom > MAX_BOTTOM || right > MAX_RIGHT) {
                        // フラグを立てます
                        overflowed = true;
                        // ループを抜けます
                        break;
                    }
                }
                // 判定結果を返します
                return overflowed;
            };

            // 本文要素群を抽出します
            const bodyElements = getBodyElements(slide);
            // 本文要素が存在する場合に自動リサイズを実行します
            if (bodyElements.length > 0) {
                // 折り返し用CSSスタイルを適用します
                applyWrappingStyles(bodyElements);

                // 本文が利用可能な横幅を計算します（左右余白各40pxを除外）
                const availableWidth = slideRect.width - 80;
                // 本文が利用可能な高さを計算します（ワイドレイアウトなら550px、通常なら440px）
                const availableHeight = slide.classList.contains('wide-content') ? 550 : 440;

                // スケーリング計算の基準とするため、初期スタイルをキャッシュします
                const originalStyles = bodyElements.map(el => {
                    // 要素の計算済みスタイルを取得します
                    const style = window.getComputedStyle(el);
                    // キャッシュオブジェクトを返します
                    return {
                        // 要素への参照
                        element: el,
                        // 初期のフォントサイズ（px）
                        fontSize: parseFloat(style.fontSize) || 24,
                        // 要素内の画像・SVGリストを抽出します
                        images: Array.from(el.querySelectorAll('img, svg')).concat(
                            // 要素自身がimgまたはsvgであれば配列に含めます
                            ['img', 'svg'].includes(el.tagName.toLowerCase()) ? [el] : []
                        ),
                        // 要素内のテーブルリストを抽出します
                        tables: Array.from(el.querySelectorAll('table')).concat(
                            // 要素自身がtableであれば配列に含めます
                            el.tagName.toLowerCase() === 'table' ? [el] : []
                        )
                    };
                });

                // スケーリング係数の初期値を100%（1.0）とします
                let scaleFactor = 1.0;
                // 縮小限界のスケール係数（30%）を定義します
                const minScaleFactor = 0.3;
                // 縮小ループのステップ刻み幅（2%）を定義します
                const step = 0.02;

                // はみ出しが解消されるか、最小スケールに達するまで縮小を試みます
                while (scaleFactor >= minScaleFactor) {
                    // 現在のスケールで領域内に収まっているか検査します
                    const overflow = checkOverflow(bodyElements, slideRect);
                    // 収まった場合はループを終了します
                    if (!overflow) {
                        // リサイズ成功のログを出力します
                        console.log(`  Slide ${idx + 1}: Content auto-resized successfully with scaleFactor = ${scaleFactor}`);
                        // ループを抜けます
                        break;
                    }

                    // スケール係数を1ステップ減らします
                    scaleFactor -= step;

                    // 新しいスケール係数をもとに各要素のサイズ・フォントサイズを縮小適用します
                    originalStyles.forEach(item => {
                        // 新しいフォントサイズ（px）を計算します
                        const newFs = item.fontSize * scaleFactor;
                        // フォントサイズをスタイルとして適用します
                        item.element.style.setProperty('font-size', `${newFs}px`, 'important');

                        // 子要素のインラインフォントサイズも連動して縮小します
                        item.element.querySelectorAll('*').forEach(child => {
                            // 子要素にスタイルが設定されている場合
                            if (child.style.fontSize) {
                                // 元のサイズを取得または保存します
                                const origFs = parseFloat(child.dataset.originalFontSize) || parseFloat(child.style.fontSize);
                                // 初回時に元サイズをdata属性へ記録します
                                if (!child.dataset.originalFontSize) {
                                    // 記録します
                                    child.dataset.originalFontSize = origFs;
                                }
                                // 縮小サイズを適用します
                                child.style.setProperty('font-size', `${origFs * scaleFactor}px`, 'important');
                            }
                        });

                        // 画像やSVGの最大サイズを制限します
                        item.images.forEach(img => {
                            // 最大横幅を制限します
                            img.style.setProperty('max-width', `${availableWidth * scaleFactor}px`, 'important');
                            // 最大縦幅を制限します
                            img.style.setProperty('max-height', `${availableHeight * scaleFactor}px`, 'important');
                            // アスペクト比を維持するためのauto指定
                            img.style.setProperty('width', 'auto', 'important');
                            // 高さをauto指定
                            img.style.setProperty('height', 'auto', 'important');
                            // 画像の比率保持フィット設定
                            img.style.setProperty('object-fit', 'contain', 'important');
                        });

                        // 表（table）の最大サイズを制限します
                        item.tables.forEach(tbl => {
                            // 表の最大幅を制限します
                            tbl.style.setProperty('max-width', `${availableWidth * scaleFactor}px`, 'important');
                            // 幅を100%に指定します
                            tbl.style.setProperty('width', '100%', 'important');
                        });
                    });
                }

                // 最小スケールまで縮小しても収まらなかった場合の警告を出力します
                if (scaleFactor < minScaleFactor) {
                    // 警告メッセージを出力します
                    console.warn(`  Slide ${idx + 1}: Content still overflows at minimum scale factor (${minScaleFactor})`);
                }
            }

            // 初回スライド走査時に背景図形を抽出し、共通シェイプとして保存します
            if (globalShapes.length === 0) {
                // 背景シェイプを取得します
                const bgShapes = getBackgroundShapes(slide);
                // シェイプが存在すれば配列に追加します
                if (bgShapes.length > 0) {
                    // 共通シェイプ配列へ格納します
                    globalShapes.push(...bgShapes);
                    // 検出ログを表示します
                    console.log(`  Found Background Shapes: ${bgShapes.length}`);
                }
            }

            // スライドが1ページ目（タイトルスライド）かどうかを判定します
            const isTitleSlide = slide.getAttribute('data-marpit-pagination') === '1';

            // タイトルスライド専用の背景バナー画像（::before疑似要素）を検出します
            if (isTitleSlide) {
                // ::before 疑似要素の計算済みスタイルを取得します
                const beforeStyle = window.getComputedStyle(slide, '::before');
                // 背景画像URLを取得します
                const bgImage = beforeStyle ? beforeStyle.backgroundImage : '';
                // 背景画像が指定されている場合
                if (bgImage && bgImage !== 'none') {
                    // バナー所持フラグを立てます
                    slideObj.hasBanner = true;
                    // url(...) 形式から画像パス文字列を抽出します
                    const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                    // パスが抽出できた場合
                    if (match && match[1]) {
                        // バナーパスを保存します
                        slideObj.bannerSrc = match[1];
                    }
                // バナーがない場合
                } else {
                    // フラグをfalseにします
                    slideObj.hasBanner = false;
                }
            }

            // スライド内のすべての子要素を走査してPowerPointオブジェクト用のデータを収集します
            const children = Array.from(slide.children);
            // 直近の見出しタグ（h1〜h6）を追跡する変数です
            let currentHeaderTag = null;

            // 各子要素をチェックします
            children.forEach(child => {
                // タグ名を小文字で取得します
                const tag = child.tagName.toLowerCase();

                // ヘッダー（ロゴやヘッダーテキスト）の処理
                if (tag === 'header') {
                    // 内部のロゴ画像 <img> を確認します
                    const img = child.querySelector('img');
                    // ロゴ画像が存在する場合
                    if (img) {
                        // ロゴの矩形を取得します
                        const rect = img.getBoundingClientRect();
                        // 画像オブジェクトとしてスライド要素リストに追加します
                        slideObj.elements.push({
                            // タイプをimageに設定
                            type: 'image',
                            // サブタイプとしてヘッダーロゴを指定
                            subtype: 'header-logo',
                            // 画像ソースURL
                            src: img.src,
                            // X座標
                            x: rect.left - slideRect.left,
                            // Y座標
                            y: rect.top - slideRect.top,
                            // 右端X座標
                            right: rect.right - slideRect.left,
                            // 横幅
                            w: rect.width,
                            // 縦幅
                            h: rect.height,
                            // 自然解像度の幅
                            naturalW: img.naturalWidth,
                            // 自然解像度の高さ
                            naturalH: img.naturalHeight,
                            // 最前面に表示するための高いz-index
                            zIndex: 100
                        });
                        // 検出ログを出力します
                        console.log(`  Found Logo: ${img.src} (Natural: ${img.naturalWidth}x${img.naturalHeight})`);
                        // ヘッダー処理を完了して抜けます
                        return;
                    }

                    // テキスト形式のヘッダーの場合
                    const metrics = getMetrics(child, slideRect, 'text');
                    // メトリクスが取得できた場合
                    if (metrics) {
                        // 要素リストに追加します
                        slideObj.elements.push(metrics);
                        // 検出ログを出力します
                        console.log(`  Found Header Text: ${metrics.text}`);
                    }
                    // 抜けます
                    return;
                }

                // フッター要素の処理
                if (tag === 'footer') {
                    // フッターのメトリクスを取得します
                    const metrics = getMetrics(child, slideRect, 'text');
                    // 取得できた場合
                    if (metrics) {
                        // 要素リストに追加します
                        slideObj.elements.push(metrics);
                        // 検出ログを出力します
                        console.log(`  Found Footer: ${metrics.text}`);
                    }
                    // 抜けます
                    return;
                }

                // 見出しタグ（h1〜h6）自体の検出
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                    // 現在の見出しタグを更新します
                    currentHeaderTag = tag;
                    // 見出し自体はこの後のブロック評価で追加するため一旦リターンします
                    return;
                }

                // 見出し配下のコンテンツ要素の評価
                if (currentHeaderTag) {
                    // スクリプトやスタイル等の不要タグは除外します
                    if (['script', 'style', 'meta'].includes(tag)) return;

                    // 会話形式スライド（conversation-content）の吹き出し特殊処理
                    if (slide.classList.contains('conversation-content') && (tag === 'ul' || tag === 'ol')) {
                        // 各発言項目（li）を走査します
                        Array.from(child.children).forEach((li) => {
                            // liタグの場合
                            if (li.tagName === 'LI') {
                                // 吹き出しテキストのメトリクスを取得します
                                const liMetrics = getMetrics(li, slideRect, 'conversation-bubble');
                                // メトリクスが取得できた場合
                                if (liMetrics) {
                                    // スタイルを取得します
                                    const style = window.getComputedStyle(li);
                                    // 背景色を設定します
                                    liMetrics.bgColor = rgbToHex(style.backgroundColor);
                                    // 文字色を設定します
                                    liMetrics.color = rgbToHex(style.color);
                                    // 角丸の半径を取得します
                                    liMetrics.borderRadius = parseInt(style.borderRadius) || 15;
                                    // リストフラグを無効化します（吹き出しとして描画するため）
                                    liMetrics.isList = false;
                                    
                                    // 発言者名（strongタグ）を抽出します
                                    const nameStrong = li.querySelector('strong:first-of-type');
                                    // 発言者名が存在する場合
                                    if (nameStrong) {
                                        // 名前テキストを取得します
                                        const nameText = nameStrong.textContent.trim();
                                        // 名前の矩形を取得します
                                        const strongRect = nameStrong.getBoundingClientRect();
                                        // 名前のスタイルを取得します
                                        const nameStyle = window.getComputedStyle(nameStrong);
                                        // 名前表示用の独立したテキスト要素を追加します
                                        slideObj.elements.push({
                                            // タイプをtextに指定
                                            type: 'text',
                                            // 名前文字列
                                            text: nameText,
                                            // X座標
                                            x: strongRect.left - slideRect.left,
                                            // Y座標
                                            y: strongRect.top - slideRect.top,
                                            // 横幅
                                            w: strongRect.width,
                                            // 縦幅
                                            h: strongRect.height,
                                            // 文字色
                                            color: rgbToHex(nameStyle.color) || '555555',
                                            // フォントサイズ
                                            fontSize: parseFloat(nameStyle.fontSize) || 10,
                                            // 揃え位置
                                            textAlign: nameStyle.textAlign || 'center',
                                            // z-index
                                            zIndex: 20
                                        });
                                        // 吹き出し本文から重複する名前文字列を削除します
                                        liMetrics.text = liMetrics.text.replace(nameText, '').trim();
                                    }
                                    
                                    // リストの箇条書きハイフンを除去します
                                    liMetrics.text = liMetrics.text.replace(/^-\s*/, '').trim();

                                    // 吹き出し要素をスライドに追加します
                                    slideObj.elements.push(liMetrics);
                                }
                                
                                // アバター画像（img）を抽出します
                                const img = li.querySelector('img');
                                // 画像が存在する場合
                                if (img) {
                                    // 画像の矩形を取得します
                                    const imgRect = img.getBoundingClientRect();
                                    // 画像要素として追加します
                                    slideObj.elements.push({
                                        // タイプ
                                        type: 'image',
                                        // 画像URL
                                        src: img.src,
                                        // X座標
                                        x: imgRect.left - slideRect.left,
                                        // Y座標
                                        y: imgRect.top - slideRect.top,
                                        // 幅
                                        w: imgRect.width,
                                        // 高さ
                                        h: imgRect.height,
                                        // z-index
                                        zIndex: 10
                                    });
                                }
                            }
                        });
                        // 通常ブロック抽出処理をスキップして抜けます
                        return;
                    }

                    // 通常ブロック要素としてのメトリクスを取得します
                    const metrics = getMetrics(child, slideRect, 'block');
                    // テキストが存在しない要素の場合（画像のみ・SVGのみ等）
                    if (!metrics) {
                        // 内部に含まれる画像 <img> を走査します
                        const imgs = child.querySelectorAll('img');
                        // 各画像をチェックします
                        imgs.forEach(img => {
                            // 矩形を取得します
                            const imgRect = img.getBoundingClientRect();
                            // スタイルを取得します
                            const imgStyle = window.getComputedStyle(img);
                            // 非表示画像は除外します
                            if (imgStyle.display === 'none' || imgStyle.visibility === 'hidden') return;

                            // 画像要素を追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'image',
                                // 画像パス
                                src: img.src,
                                // X座標
                                x: imgRect.left - slideRect.left,
                                // Y座標
                                y: imgRect.top - slideRect.top,
                                // 幅
                                w: imgRect.width,
                                // 高さ
                                h: imgRect.height,
                                // z-index
                                zIndex: 1
                            });
                            // ログを出力します
                            console.log(`  Found Image in block: ${img.src}`);
                        });

                        // 内部に含まれるインラインSVG（Mermaid図等）を走査します
                        const svgs = child.querySelectorAll('svg');
                        // 各SVGを処理します
                        svgs.forEach(svg => {
                            // ヘッダーや背景用のSVGは除外します
                            if (svg.closest('header, footer') || svg.classList.contains('background')) return;

                            // 矩形を取得します
                            const svgRect = svg.getBoundingClientRect();
                            // スタイルを取得します
                            const svgStyle = window.getComputedStyle(svg);
                            // 非表示SVGは除外します
                            if (svgStyle.display === 'none' || svgStyle.visibility === 'hidden') return;

                            // SVGノードをXML文字列にシリアライズします
                            const svgString = new XMLSerializer().serializeToString(svg);
                            // Data URI形式（Base64）にエンコードします
                            const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

                            // 画像要素としてSVGを追加します
                            slideObj.elements.push({
                                // タイプ
                                type: 'image',
                                // Base64データ
                                src: svgBase64,
                                // X座標
                                x: svgRect.left - slideRect.left,
                                // Y座標
                                y: svgRect.top - slideRect.top,
                                // 幅
                                w: svgRect.width,
                                // 高さ
                                h: svgRect.height,
                                // z-index
                                zIndex: 1
                            });
                            // ログを出力します
                            console.log(`  Found Inline SVG in block: inline svg`);
                        });
                        // 抜けます
                        return;
                    }

                    // 現在の見出しタグをメトリクスに付与します
                    metrics.tag = currentHeaderTag;

                    // 検出要素のログを出力します
                    console.log(`  Found Element: ${metrics.type} (${metrics.tag}) text="${metrics.text.substring(0, 20)}..." color=${metrics.color}`);

                    // スライド要素配列へ追加します
                    slideObj.elements.push(metrics);
                }
            });

            // 解析完了したスライドオブジェクトを全体の配列に追加します
            data.push(slideObj);
        });

        // スライドの画面解像度のデフォルト横幅（4:3: 960px）を定義します
        let slideWidth = 960;
        // スライドの画面解像度のデフォルト縦幅（4:3: 720px）を定義します
        let slideHeight = 720;
        // スライドが存在する場合、実際の要素サイズから正確な解像度を判定します
        if (slides.length > 0) {
            // 最初のスライドの矩形を取得します
            const firstRect = slides[0].getBoundingClientRect();
            // 幅が有効であれば四捨五入して採用します
            if (firstRect.width > 0) slideWidth = Math.round(firstRect.width);
            // 高さが有効であれば採用します
            if (firstRect.height > 0) slideHeight = Math.round(firstRect.height);
        }
        // アスペクト比が16:9（1280px以上）であるかを判定します
        const is169 = (slideWidth / slideHeight > 1.5) || slideWidth >= 1200;

        // ブラウザ評価の結果をJSONオブジェクトとして返却します
        return {
            // 解析済みスライドデータのディープコピー
            slides: JSON.parse(JSON.stringify(data)),
            // 共通背景図形シェイプ
            bgShapes: globalShapes,
            // 判定されたスライド横幅
            slideWidth,
            // 判定されたスライド縦幅
            slideHeight,
            // 16:9比率判定フラグ
            is169
        };
    });

    // 解析が完了したためヘッドレスブラウザを閉じます
    await browser.close();

    // --------------------------------------------------------------------------
    // 4. PptxGenJS を使用してネイティブPowerPointスライドを構築
    // --------------------------------------------------------------------------
    // PowerPointプレゼンテーション作成インスタンスを生成します
    const pres = new PptxGenJS();
    // 16:9比率であるかを決定します
    const is169 = slidesData.is169 || (slidesData.slideWidth && slidesData.slideWidth > 1100);
    // スライドのターゲット横幅（px）を決定します
    const targetWidth = slidesData.slideWidth || (is169 ? 1280 : 960);
    // スライドのターゲット縦幅（px）を決定します
    const targetHeight = slidesData.slideHeight || 720;

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

    // マスタースライド用の背景図形配列を初期化します
    const bgObjects = [];

    // 抽出された背景シェイプ（カラー帯など）を編集可能な図形オブジェクトとして追加します
    if (slidesData.bgShapes) {
        // 各シェイプを走査します
        slidesData.bgShapes.forEach(shape => {
            // 矩形（rect）タイプの場合
            if (shape.type === 'rect') {
                // インチ単位に変換して背景オブジェクト配列に追加します
                bgObjects.push({
                    // 矩形定義
                    rect: {
                        // X座標（inch）
                        x: shape.x * PX_TO_INCH,
                        // Y座標（inch）
                        y: shape.y * PX_TO_INCH,
                        // 横幅（inch）
                        w: shape.w * PX_TO_INCH,
                        // 縦幅（inch）
                        h: shape.h * PX_TO_INCH,
                        // 塗りつぶしカラー
                        fill: { color: shape.color }
                    }
                });
            }
        });
    }

    // ページ番号の配置X座標を計算します（右端から約60px内側）
    const slideNumberX = (targetWidth - 60) * PX_TO_INCH;
    // スライドマスター（MASTER_SLIDE）を定義して背景図形とページ番号を設定します
    pres.defineSlideMaster({
        // マスターの名前
        title: 'MASTER_SLIDE',
        // 背景色（白）
        background: { color: 'FFFFFF' },
        // 共通背景図形
        objects: bgObjects,
        // ページ番号の表示位置・フォント設定
        slideNumber: { x: slideNumberX, y: 7.2, color: 'FFFFFF', fontSize: 12, align: 'right' }
    });

    // データ検証ログを出力します
    console.log("slidesData evaluated successfully, type:", typeof slidesData);
    // スライドデータが正常に取得できているか確認します
    if (!slidesData || !slidesData.slides) {
        // 取得失敗エラーを出力します
        console.error("slidesData or slidesData.slides is undefined! Full object:", slidesData);
        // プロセスを終了します
        process.exit(1);
    }

    // 各スライドごとにPowerPointページを生成して要素を配置します
    slidesData.slides.forEach(slideData => {
        // マスタースライドを適用した新しいスライドを追加します
        const slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });

        // タイトルスライドでバナーが存在する場合の配置処理
        if (slideData.hasBanner) {
            // デフォルトのバナーSVGファイルパスです
            const defaultBannerPath = 'themes/banner.svg';
            // バナーのソースパスまたはData URIを取得します
            let bannerPath = slideData.bannerSrc;
            // ローカルfileプロトコルURLであるか判定します
            if (bannerPath && bannerPath.startsWith('file://')) {
                // fileプロトコルプレフィックスを除去してデコードします
                bannerPath = decodeURIComponent(bannerPath.slice(7));
                // Windows環境でのドライブレター先頭スラッシュを補正します
                if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(bannerPath)) {
                    // 先頭のスラッシュを削除します
                    bannerPath = bannerPath.slice(1);
                }
            }
            // Data URI形式のバナー画像の場合
            if (bannerPath && bannerPath.startsWith('data:')) {
                // 画像をスライド上端に配置します
                slide.addImage({
                    // Base64データ
                    data: bannerPath,
                    // X座標
                    x: 0,
                    // Y座標
                    y: 0,
                    // 幅（スライド全幅）
                    w: targetWidth * PX_TO_INCH,
                    // 高さ（100px）
                    h: 100 * PX_TO_INCH
                });
            // ローカルファイルパスのバナーが存在する場合
            } else if (bannerPath && fs.existsSync(bannerPath)) {
                // ファイルパスから画像を追加します
                slide.addImage({
                    // パス
                    path: bannerPath,
                    // X座標
                    x: 0,
                    // Y座標
                    y: 0,
                    // 幅
                    w: targetWidth * PX_TO_INCH,
                    // 高さ
                    h: 100 * PX_TO_INCH
                });
            // デフォルトバナーファイルが存在する場合
            } else if (fs.existsSync(defaultBannerPath)) {
                // デフォルトバナーを追加します
                slide.addImage({
                    // パス
                    path: defaultBannerPath,
                    // X座標
                    x: 0,
                    // Y座標
                    y: 0,
                    // 幅
                    w: targetWidth * PX_TO_INCH,
                    // 高さ
                    h: 100 * PX_TO_INCH
                });
            // バナーが見つからない場合
            } else {
                // 警告ログを出力します
                console.warn(`Warning: Banner image not found. Skipping banner.`);
            }
        }

        // 要素をz-indexの昇順でソートし、背面から前面へ順番に描画します
        slideData.elements.sort((a, b) => a.zIndex - b.zIndex);

        // スライド内の各要素を描画します
        slideData.elements.forEach(el => {
            // X座標をインチ単位に変換します
            let x = el.x * PX_TO_INCH;
            // Y座標をインチ単位に変換します
            let y = el.y * PX_TO_INCH;
            // 幅をインチ単位に変換します
            let w = el.w * PX_TO_INCH;
            // 高さをインチ単位に変換します
            let h = el.h * PX_TO_INCH;
            // 右端X座標が存在する場合はインチに変換します
            const right = el.right ? el.right * PX_TO_INCH : null;

            // デバッグログを出力します
            console.log('DEBUG element: Tag=', el.tag, 'Text=', el.text ? el.text.substring(0, 50).replace(/\n/g, '\\n') : 'null', 'isList=', el.isList, 'Y_px=', el.y);

            // 画像要素の処理
            if (el.type === 'image') {
                // 画像パスを取得します
                let imagePath = el.src;
                // リモート画像またはData URIであるか判定します
                const isRemote = imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:');

                // ローカルファイルパスの場合の正規化処理
                if (!isRemote) {
                    // file:// プロトコルプレフィックスを除去します
                    if (imagePath.startsWith('file://')) {
                        // デコードしてプレフィックスを削除します
                        imagePath = decodeURIComponent(imagePath.slice(7));
                    }

                    // Windows環境でのドライブレター先頭スラッシュを補正します
                    if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(imagePath)) {
                        // 先頭のスラッシュを削除します
                        imagePath = imagePath.slice(1);
                    }

                    // パス区切り文字を正規化します
                    imagePath = imagePath.replace(/\\/g, '/');
                    // 絶対パスに解決します
                    imagePath = path.resolve(imagePath);

                    // パスが存在しない場合のフォールバック探索です
                    if (!fs.existsSync(imagePath)) {
                        // 警告を出力します
                        console.warn(`Warning: Image not found at ${imagePath}`);
                        // カレントディレクトリからの相対パスで再試行します
                        const relToCwd = path.resolve(process.cwd(), imagePath);
                        // 存在すればそちらを採用します
                        if (fs.existsSync(relToCwd)) {
                            // パスを更新します
                            imagePath = relToCwd;
                        }
                    }
                }

                // アスペクト比（縦横比）変数を初期化します
                let aspectRatio = null;

                // ヘッダーロゴの場合、Puppeteerから取得した解像度で比率を計算します
                if (el.subtype === 'header-logo' && el.naturalW && el.naturalH) {
                    // 比率を算出します
                    aspectRatio = el.naturalW / el.naturalH;
                }

                // 比率が未確定でSVGファイルの場合、ファイル内からviewBoxまたはwidth/height属性を直接解析します
                if (!isRemote && !aspectRatio && el.subtype === 'header-logo' && imagePath.toLowerCase().endsWith('.svg') && fs.existsSync(imagePath)) {
                    // 例外に備えます
                    try {
                        // SVGファイルの中身を読み込みます
                        const svgContent = fs.readFileSync(imagePath, 'utf8');
                        // viewBox属性を検索します
                        const viewBoxMatch = svgContent.match(/viewBox=["']\s*([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s*["']/);
                        // viewBoxが見つかった場合
                        if (viewBoxMatch) {
                            // 幅を取得します
                            const vw = parseFloat(viewBoxMatch[3]);
                            // 高さを取得します
                            const vh = parseFloat(viewBoxMatch[4]);
                            // 高さが0でなければ比率を算出します
                            if (vh > 0) {
                                // 比率を設定します
                                aspectRatio = vw / vh;
                                // ログを出力します
                                console.log(`[SVG Parsing] Using viewBox: ${vw}x${vh} (Ratio: ${aspectRatio})`);
                            }
                        }

                        // viewBoxがない場合はwidth/height属性から比率を取得します
                        if (!aspectRatio) {
                            // width属性を検索します
                            const wMatch = svgContent.match(/width=["']([\d\.]+)["']/);
                            // height属性を検索します
                            const hMatch = svgContent.match(/height=["']([\d\.]+)["']/);
                            // 両方存在する場合
                            if (wMatch && hMatch) {
                                // 幅を取得します
                                const dw = parseFloat(wMatch[1]);
                                // 高さを取得します
                                const dh = parseFloat(hMatch[1]);
                                // 高さが有効であれば比率を算出します
                                if (dh > 0) {
                                    // 比率を設定します
                                    aspectRatio = dw / dh;
                                    // ログを出力します
                                    console.log(`[SVG Parsing] Using width/height attributes: ${dw}x${dh} (Ratio: ${aspectRatio})`);
                                }
                            }
                        }
                    // エラー時はログを出力します
                    } catch (e) {
                        // パース失敗ログを出力します
                        console.error('Error parsing SVG:', e);
                    }
                }

                // アスペクト比が判明している場合のサイズ・位置補正
                if (aspectRatio) {
                    // 高さが未取得（0）の場合、CSS標準の最大高さ50px（約0.52インチ）を強制適用します
                    if (h < 0.01) {
                        // 高さを50px分に設定します
                        h = 50 * PX_TO_INCH;
                        // 補正ログを出力します
                        console.log(`[Logo Adjustment] Height was 0, forced to 50px (${h.toFixed(2)} inch)`);
                    }

                    // アスペクト比を保って横幅を再計算します
                    w = h * aspectRatio;

                    // 右寄せ指定がある場合、右端位置を固定してX座標を逆算します
                    if (right !== null) {
                        // X座標を計算します
                        x = right - w;
                        // ログを出力します
                        console.log(`[Logo Adjustment] Recalculated Position: Right=${right.toFixed(2)}, X=${x.toFixed(2)}, W=${w.toFixed(2)}`);
                    }

                    // タイトルスライドか通常スライドかに応じてY座標を調整します
                    if (slideData.hasBanner) {
                        // タイトルスライドの場合: 下端から50pxの位置に配置します
                        const bottomMargin = 50 * PX_TO_INCH;
                        // ページ下端からのY座標を算出します
                        y = 7.5 - bottomMargin - h;
                        // ログを出力します
                        console.log(`[Logo Adjustment] Title Slide Y: ${y.toFixed(2)} (Bottom: 50px)`);
                    // 通常スライドの場合
                    } else {
                        // 通常スライドの場合: 上端から5pxの位置に配置します
                        y = 5 * PX_TO_INCH;
                        // ログを出力します
                        console.log(`[Logo Adjustment] Normal Slide Y: ${y.toFixed(2)} (Top: 5px)`);
                    }
                }

                // スライドに画像オブジェクトを追加配置します
                slide.addImage({
                    // 画像ファイルパスまたはData URL
                    path: imagePath,
                    // X座標
                    x,
                    // Y座標
                    y,
                    // 横幅
                    w,
                    // 縦幅
                    h
                });
            // 会話吹き出し要素の処理
            } else if (el.type === 'conversation-bubble') {
                // 左側発言か右側発言かをX座標から判定します（4.0インチ未満なら左）
                const isOdd = x < 4.0;
                
                // SVG吹き出しのピクセル幅を計算します
                const svgW = w * 96;
                // SVG吹き出しのピクセル高さを計算します（最小50px）
                const svgH = h * 96 > 50 ? h * 96 : 50;
                // 吹き出しの角丸半径
                const r = 15;
                // 吹き出しのしっぽ（突起）の横幅
                const tw = 15;
                // 吹き出しのしっぽの縦幅
                const th = 20;
                // しっぽのY開始位置
                const ty = 20;
                // 背景色（HEX）
                const bgColors = el.bgColor || '#FFFFFF';

                // 左右の向きに応じた吹き出しSVG文字列を構築します
                let svgStr;
                // 左側発言の場合
                if (isOdd) {
                    // 左にしっぽが付いたSVGを作成します
                    svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
                        <rect x="${tw}" y="0" width="${svgW - tw}" height="${svgH}" rx="${r}" fill="${bgColors}" />
                        <polygon points="${tw},${ty} 0,${ty} ${tw},${ty + th}" fill="${bgColors}" />
                    </svg>`;
                // 右側発言の場合
                } else {
                    // 右にしっぽが付いたSVGを作成します
                    svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
                        <rect x="0" y="0" width="${svgW - tw}" height="${svgH}" rx="${r}" fill="${bgColors}" />
                        <polygon points="${svgW - tw},${ty} ${svgW},${ty} ${svgW - tw},${ty + th}" fill="${bgColors}" />
                    </svg>`;
                }
                
                // SVGをBase64データURIにエンコードします
                const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from(svgStr).toString('base64');
                
                // 吹き出しの背景SVG画像をスライドに追加します
                slide.addImage({
                    // 画像データ
                    data: svgBase64,
                    // X座標
                    x: x,
                    // Y座標
                    y: y,
                    // 横幅
                    w: w,
                    // 縦幅
                    h: svgH / 96.0
                });

                // 吹き出し内部の編集可能テキストボックスオプションを設定します
                const bubbleOpts = {
                    // しっぽの幅を考慮したX座標
                    x: isOdd ? x + (tw / 96.0) : x, 
                    // Y座標
                    y: y, 
                    // しっぽを除いた有効横幅
                    w: w - (tw / 96.0), 
                    // 高さ
                    h: svgH / 96.0,
                    // 文字色
                    color: el.color || '000000',
                    // フォントサイズ（pt）
                    fontSize: el.fontSize * 0.75,
                    // フォント名
                    fontFace: 'Meiryo',
                    // 垂直方向中央揃え
                    valign: 'middle',
                    // 水平方向揃え
                    align: el.textAlign || 'left',
                    // 内側余白（パディング）
                    margin: [10, 15, 10, 15],
                    // 折り返しを有効化
                    wrap: true,
                    // テキストボックスフラグ
                    isTextBox: true
                };
                // 吹き出しテキストをスライドに追加します
                slide.addText(el.text, bubbleOpts);
            // 通常テキストおよびブロック要素の処理
            } else {
                // 基本のテキスト配置オプションを定義します
                const opts = {
                    // X座標
                    x,
                    // Y座標
                    y,
                    // 幅
                    w,
                    // 高さ
                    h,
                    // 文字色
                    color: el.color,
                    // 背景色（存在する場合のみ設定）
                    fill: el.bgColor ? { color: el.bgColor } : undefined,
                    // フォントサイズ（pt）
                    fontSize: el.fontSize * 0.75,
                    // フォント名
                    fontFace: 'Meiryo',
                    // 太字判定
                    bold: el.fontWeight === 'bold' || parseInt(el.fontWeight) >= 700,
                    // 水平揃え
                    align: el.textAlign,
                    // 垂直上揃え
                    valign: 'top',
                    // 自動折り返し
                    wrap: true
                };

                // 余分な空行や前後の空白を除去する補助関数です
                const cleanText = (txt) => {
                    // 正規表現でクリーンアップします
                    return txt ? txt.replace(/\n\s*\n/g, '\n').replace(/^\s+|\s+$/g, '') : '';
                };

                // テキスト本文の初期値を設定します
                let textBody = el.text;
                // オプションのシャローコピーを作成します
                let textOpts = { ...opts };

                // h2（ページ主張・メッセージ帯）の特別フォーマット処理
                if (el.tag === 'h2') {
                    // 垂直中央揃えにします
                    textOpts.valign = 'middle';
                    // 段落前の余白を0にします
                    textOpts.paraSpaceBefore = 0;
                    // 行間を設定します
                    textOpts.lineSpacing = 18;

                    // フォントサイズの上限を20ptに制限します
                    if (textOpts.fontSize > 20) textOpts.fontSize = 20;

                    // 本文をクリーンアップします
                    let rawText = cleanText(el.text);

                    // リストマーカーの欠けを防ぐため、左側インセット余白（0.6インチ）を追加します
                    textOpts.inset = [0.1, 0.1, 0.1, 0.6];

                    // 箇条書きリストを含む場合、リスト構造オブジェクトへ変換します
                    if (rawText.includes('\n- ') || rawText.startsWith('- ') || rawText.includes('\n* ') || rawText.startsWith('* ')) {
                        // リスト個別の行間設定を有効にするためグローバル設定を削除します
                        delete textOpts.lineSpacing;

                        // 行単位で分割します
                        const lines = rawText.split('\n');
                        // 各行をPowerPointリスト項目オブジェクトへマッピングします
                        textBody = lines.map(line => {
                            // 先頭スペース数からインデント階層（2スペース=1レベル）を算出します
                            const leadingSpaces = line.match(/^\s*/)[0].length;
                            // 階層レベルを計算します
                            const indentLevel = Math.floor(leadingSpaces / 2);

                            // トリムした文字列を取得します
                            const trimmed = line.trim();
                            // リスト項目記号で始まる場合
                            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                                // 記号を取り除いた本文を取得します
                                const cleanLine = trimmed.replace(/^[-*]\s+/, '');
                                // リスト項目オブジェクトを返します
                                return {
                                    // テキスト
                                    text: cleanLine,
                                    // オプション
                                    options: {
                                        // 箇条書きマーカーを有効化
                                        bullet: true,
                                        // 改行
                                        breakLine: true,
                                        // インデント深さ
                                        indentLevel: indentLevel,
                                        // 文字色
                                        color: textOpts.color,
                                        // 行間倍率
                                        lineSpacingMultiple: 1.0
                                    }
                                };
                            }
                            // リスト以外の通常行
                            return { text: line, options: { breakLine: true, color: textOpts.color } };
                        });
                    // 通常文字列の場合
                    } else {
                        // クリーンアップ済みテキストをそのまま採用します
                        textBody = rawText;
                    }
                }

                // フッターテキスト（footer, h5, h6）または表紙のh3（図書番号・氏名）の折り返し防止処理
                if (el.tag === 'footer' || el.tag === 'h6' || el.tag === 'h5' || (el.tag === 'h3' && slideData.hasBanner)) {
                    // フォントサイズを11ptに設定します
                    textOpts.fontSize = 11;
                    // 表紙のh3の場合は元の比率を維持します
                    if (el.tag === 'h3') textOpts.fontSize = el.fontSize * 0.75;

                    // 予期せぬ改行を防ぐため、幅に3インチのバッファを追加します
                    const addedWidth = 3.0;
                    // 幅を拡張します
                    textOpts.w += addedWidth;

                    // 右揃えの場合は拡張分だけ左へシフトして右端位置を固定します
                    if (textOpts.align === 'right') {
                        // X座標を減算します
                        textOpts.x -= addedWidth;
                    // 中央揃えの場合は半分の幅だけ左へシフトします
                    } else if (textOpts.align === 'center') {
                        // X座標を調整します
                        textOpts.x -= addedWidth / 2.0;
                    }
                }

                // h2以外の通常の箇条書きリスト（ul/ol）の処理
                if (el.isList && el.tag !== 'h2' && typeof el.text === 'string') {
                    // リストマーカー用の左インデント余白（約28px）を追加します
                    const listPadding = 0.3 * PX_TO_INCH;
                    // X座標を右へシフトします
                    textOpts.x += listPadding;
                    // 幅からパディング分を差し引きます
                    textOpts.w -= listPadding;

                    // 行単位で分割します
                    const lines = el.text.split('\n');
                    // 各行をPowerPointリストオブジェクトへマッピングします
                    textBody = lines.map(line => {
                        // 先頭スペース数からインデント深さを計算します
                        const leadingSpaces = line.match(/^\s*/)[0].length;
                        // インデントレベルを取得します
                        const indentLevel = Math.floor(leadingSpaces / 2);

                        // トリムします
                        const trimmed = line.trim();
                        // マーカー文字を除去します
                        const cleanLine = trimmed.replace(/^[-*]\s+/, '');

                        // リスト項目定義を返します
                        return {
                            // 本文
                            text: cleanLine,
                            // オプション
                            options: {
                                // マーカー
                                bullet: true,
                                // 改行
                                breakLine: true,
                                // インデント階層
                                indentLevel: indentLevel,
                                // 文字色
                                color: textOpts.color,
                                // 行間
                                lineSpacingMultiple: 1.0
                            }
                        };
                    });
                    // 親オプションのbulletプロパティを念のため削除します
                    delete textOpts.bullet;
                }

                // コードブロック要素（pre/code）の特別処理
                if (el.isCode) {
                    // 等幅フォント（Consolas）を設定します
                    textOpts.fontFace = 'Consolas';
                    // フォントサイズを最大10ptに調整します
                    textOpts.fontSize = Math.min(10, el.fontSize * 0.75);
                    // 背景色が未設定なら薄いグレーを設定します
                    if (!textOpts.fill) {
                        // 薄いグレーの背景色
                        textOpts.fill = { color: 'F5F5F5' };
                    }
                    // 文字色と背景色が同色の場合は文字色を黒に補正します
                    if (textOpts.color === 'FFFFFF' && textOpts.fill.color === 'FFFFFF') {
                        // 黒に設定
                        textOpts.color = '000000';
                    }
                }

                // スライドにテキストボックスを追加します
                slide.addText(textBody, textOpts);
            }
        });
    });

    // --------------------------------------------------------------------------
    // 5. PowerPointファイル（.pptx）の書き込み・保存
    // --------------------------------------------------------------------------
    // ファイル保存時の例外をキャッチします
    try {
        // 指定されたパスへPowerPointファイルを書き込みます
        await pres.writeFile({ fileName: OUTPUT_PPTX });
        // 成功ログを出力します
        console.log(`Success! PPTX saved to: ${OUTPUT_PPTX}`);
    // 保存失敗時
    } catch (e) {
        // エラー内容を出力します
        console.error('Error saving PPTX:', e);
    }
}

// メイン関数を実行して変換処理を開始します
main();
