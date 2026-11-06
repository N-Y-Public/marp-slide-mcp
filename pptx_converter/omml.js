// PowerPoint（.pptx）ファイル内の数式プレースホルダーをネイティブOffice MathML（<a14:m><m:oMathPara><m:oMath>）へ変換するモジュールです
// 標準のファイルシステムモジュールを読み込みます
import fs from 'fs';
// 標準のパス操作モジュールを読み込みます
import path from 'path';
// 標準の暗号化・ハッシュ生成モジュールを読み込みます
import crypto from 'crypto';

// XML特殊文字（&, <, >, ", '）を安全にエスケープする補助関数です
function escapeXml(str) {
    // 入力が文字列でない場合は空文字列に変換します
    const s = String(str ?? '');
    // XML予約文字を実体参照へ置換して返します
    return s
        // アンパサンドを置換します
        .replace(/&/g, '&amp;')
        // 小なり記号を置換します
        .replace(/</g, '&lt;')
        // 大なり記号を置換します
        .replace(/>/g, '&gt;')
        // ダブルクォートを置換します
        .replace(/"/g, '&quot;')
        // シングルクォートを置換します
        .replace(/'/g, '&apos;');
}

// 積分や総和などの大型演算子（N-ary演算子）として判定する文字セットです
const NARY_OPERATORS = new Set(['∫', '∬', '∭', '∮', '∑', '∏', '∐', '⋃', '⋂', '⋁', '⋀']);

// 上付きバーやアクセント記号として判定する文字セットです
const ACCENT_CHARS = new Set(['¯', '‾', '−', '-', 'ˆ', '^', '˜', '~', '→', '⟶', '←', '↔', '˙', '¨']);

// 構造化MathMLノード配列をOffice MathML（OMML）XML文字列へ再帰的に変換する関数です
function convertMmlNodesToOmmlXml(nodes) {
    // ノード配列が空または不正な場合は空文字列を返します
    if (!Array.isArray(nodes) || nodes.length === 0) {
        // 空文字列を返却します
        return '';
    }
    // 生成されたOMMLタグ文字列を格納する配列です
    const parts = [];
    // ループカウンタを0で初期化します
    let i = 0;
    // ノード配列の長さを取得します
    const len = nodes.length;

    // 配列内の各ノードを順番に走査します
    while (i < len) {
        // 現在のノードを取得します
        const node = nodes[i];
        // ノードが存在しない場合は次へ進みます
        if (!node) {
            // インデックスを進めます
            i++;
            // ループを継続します
            continue;
        }
        // 小文字化したタグ名を取得します
        const tag = (node.tag || '').toLowerCase();
        // 子ノード配列を取得します
        const ch = Array.isArray(node.children) ? node.children : [];

        // 大型演算子（積分・総和等）の上下添字ノードであり、直後に被演算子ノードが続く場合のN-ary構造化処理です
        if (['msubsup', 'msub', 'msup', 'munderover', 'munder', 'mover'].includes(tag) && ch.length >= 2) {
            // 基底となる第1子ノードを取得します
            const base = ch[0];
            // 基底ノードのタグ名を取得します
            const baseTag = (base?.tag || '').toLowerCase();
            // 基底ノードのテキストを取得します
            const baseText = (base?.text || '').trim();
            // 基底が大型演算子であり、かつ次の兄弟ノード（被演算子）が存在するか確認します
            if (baseTag === 'mo' && NARY_OPERATORS.has(baseText) && i + 1 < len) {
                // 直後の被演算子ノードを取得します
                const operand = nodes[i + 1];
                // 添字配置モード（上下または右横）を決定します
                const limLoc = ['munderover', 'munder', 'mover'].includes(tag) ? 'undOvr' : 'subSup';
                // 下添字非表示フラグを決定します
                const subHide = ['msup', 'mover'].includes(tag) ? '<m:subHide m:val="1"/>' : '';
                // 上添字非表示フラグを決定します
                const supHide = ['msub', 'munder'].includes(tag) ? '<m:supHide m:val="1"/>' : '';
                // 下添字のOMML XMLを生成します
                const subXml = ['msub', 'munder', 'msubsup', 'munderover'].includes(tag) ? convertMmlNodeToOmmlXml(ch[1]) : '';
                // 上添字のOMML XMLを生成します
                const supXml = ['msup', 'mover'].includes(tag)
                    // 2要素の場合は第2要素を上添字とします
                    ? convertMmlNodeToOmmlXml(ch[1])
                    // 3要素の場合は第3要素を上添字とします
                    : (ch.length >= 3 ? convertMmlNodeToOmmlXml(ch[2]) : '');
                // 被演算子のOMML XMLを生成します
                const eXml = convertMmlNodeToOmmlXml(operand);
                // <m:nary>要素を組み立てて配列に追加します
                parts.push(
                    // N-ary開始タグとプロパティ、添字、被演算子を連結します
                    `<m:nary><m:naryPr><m:chr m:val="${escapeXml(baseText)}"/><m:limLoc m:val="${limLoc}"/>${subHide}${supHide}</m:naryPr><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup><m:e>${eXml}</m:e></m:nary>`
                );
                // 演算子と被演算子の2ノード分インデックスを進めます
                i += 2;
                // 次のループへ進みます
                continue;
            }
        }

        // 通常の単一ノード変換を実行して結果を追加します
        parts.push(convertMmlNodeToOmmlXml(node));
        // インデックスを1つ進めます
        i++;
    }

    // 結合したOMML文字列を返却します
    return parts.join('');
}

// 単一の構造化MathMLノードをOffice MathML（OMML）XML文字列へ変換する関数です
export function convertMmlNodeToOmmlXml(node) {
    // ノードが空の場合は空文字列を返します
    if (!node) {
        // 空文字列を返却します
        return '';
    }
    // タグ名を小文字で取得します
    const tag = (node.tag || '').toLowerCase();
    // テキスト文字列をトリムして取得します
    const text = (node.text || '').trim();
    // 子ノード配列を取得します
    const ch = Array.isArray(node.children) ? node.children : [];

    // コンテナ系タグ（math, mrow, mstyle, mpadded, mphantom）の場合は子要素列をそのまま変換します
    if (['math', 'mrow', 'mstyle', 'mpadded', 'mphantom'].includes(tag)) {
        // 子ノード群の変換結果を返します
        return convertMmlNodesToOmmlXml(ch);
    }

    // semanticsタグの場合はannotation以外の最初の子要素（本体式）を変換します
    if (tag === 'semantics') {
        // 注釈以外の本体ノードを探します
        const mainChild = ch.find(c => !['annotation', 'annotation-xml'].includes((c?.tag || '').toLowerCase()));
        // 本体ノードが見つかれば変換して返します
        return mainChild ? convertMmlNodeToOmmlXml(mainChild) : '';
    }

    // 注釈タグや空白タグ（annotation, mspace）は出力対象外として空文字を返します
    if (['annotation', 'annotation-xml', 'mspace'].includes(tag)) {
        // 空文字列を返却します
        return '';
    }

    // 識別子（mi）、数値（mn）、演算子（mo）の場合は数式ラン（<m:r>）を生成します
    if (['mi', 'mn', 'mo'].includes(tag)) {
        // テキストがなく子要素がある場合は子要素を変換します
        if (!text && ch.length > 0) {
            // 子要素の変換結果を返します
            return convertMmlNodesToOmmlXml(ch);
        }
        // テキストが空の場合は空文字を返します
        if (!text) {
            // 空文字列を返却します
            return '';
        }
        // 数式ランタグを生成して返します
        return `<m:r><m:t>${escapeXml(text)}</m:t></m:r>`;
    }

    // テキスト（mtext, ms）の場合は標準立体属性（<m:nor/>）付きの数式ランを生成します
    if (['mtext', 'ms'].includes(tag)) {
        // テキストがなく子要素がある場合は子要素を変換します
        if (!text && ch.length > 0) {
            // 子要素の変換結果を返します
            return convertMmlNodesToOmmlXml(ch);
        }
        // テキストが空の場合は空文字を返します
        if (!text) {
            // 空文字列を返却します
            return '';
        }
        // 立体属性付きの数式ランタグを生成して返します
        return `<m:r><m:rPr><m:nor/></m:rPr><m:t>${escapeXml(text)}</m:t></m:r>`;
    }

    // 分数（mfrac）の場合は <m:f><m:num>...</m:num><m:den>...</m:den></m:f> を生成します
    if (tag === 'mfrac') {
        // 分子（第1子要素）のOMMLを生成します
        const numXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 分母（第2子要素）のOMMLを生成します
        const denXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // 分数要素を返します
        return `<m:f><m:num>${numXml}</m:num><m:den>${denXml}</m:den></m:f>`;
    }

    // 平方根（msqrt）の場合は次数非表示（degHide=1）の <m:rad> を生成します
    if (tag === 'msqrt') {
        // 根号内部のOMMLを生成します
        const eXml = convertMmlNodesToOmmlXml(ch);
        // 平方根要素を返します
        return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${eXml}</m:e></m:rad>`;
    }

    // n乗根（mroot）の場合は次数付きの <m:rad> を生成します
    if (tag === 'mroot') {
        // 被開平数（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 次数（第2子要素）のOMMLを生成します
        const degXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // n乗根要素を返します
        return `<m:rad><m:deg>${degXml}</m:deg><m:e>${eXml}</m:e></m:rad>`;
    }

    // 上付き添字（msup）の場合は <m:sSup> を生成します
    if (tag === 'msup') {
        // 基底（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 上添字（第2子要素）のOMMLを生成します
        const supXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // 上付き添字要素を返します
        return `<m:sSup><m:e>${eXml}</m:e><m:sup>${supXml}</m:sup></m:sSup>`;
    }

    // 下付き添字（msub）の場合は <m:sSub> を生成します
    if (tag === 'msub') {
        // 基底（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 下添字（第2子要素）のOMMLを生成します
        const subXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // 下付き添字要素を返します
        return `<m:sSub><m:e>${eXml}</m:e><m:sub>${subXml}</m:sub></m:sSub>`;
    }

    // 上下同時添字（msubsup, munderover）の場合は <m:sSubSup> を生成します
    if (tag === 'msubsup' || tag === 'munderover') {
        // 基底（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 下添字（第2子要素）のOMMLを生成します
        const subXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // 上添字（第3子要素）のOMMLを生成します
        const supXml = ch.length >= 3 ? convertMmlNodeToOmmlXml(ch[2]) : '';
        // 上下添字要素を返します
        return `<m:sSubSup><m:e>${eXml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`;
    }

    // 上部装飾・極限（mover）の場合はアクセント・バーまたは <m:limUpp> を生成します
    if (tag === 'mover') {
        // 基底（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 上部要素のテキストを取得します
        const overText = ch.length >= 2 ? (ch[1]?.text || '').trim() : '';
        // 上線（バー）記号の場合
        if (['¯', '‾', '−', '-'].includes(overText)) {
            // <m:bar>要素を返します
            return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${eXml}</m:e></m:bar>`;
        }
        // ベクトル矢印やハット等のアクセント記号の場合
        if (ACCENT_CHARS.has(overText)) {
            // <m:acc>要素を返します
            return `<m:acc><m:accPr><m:chr m:val="${escapeXml(overText)}"/></m:accPr><m:e>${eXml}</m:e></m:acc>`;
        }
        // 通常の極限・上部記号の場合は <m:limUpp> を生成します
        const limXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // <m:limUpp>要素を返します
        return `<m:limUpp><m:e>${eXml}</m:e><m:lim>${limXml}</m:lim></m:limUpp>`;
    }

    // 下部装飾・極限（munder）の場合は <m:limLow> を生成します
    if (tag === 'munder') {
        // 基底（第1子要素）のOMMLを生成します
        const eXml = ch.length >= 1 ? convertMmlNodeToOmmlXml(ch[0]) : '';
        // 下部要素（第2子要素）のOMMLを生成します
        const limXml = ch.length >= 2 ? convertMmlNodeToOmmlXml(ch[1]) : '';
        // <m:limLow>要素を返します
        return `<m:limLow><m:e>${eXml}</m:e><m:lim>${limXml}</m:lim></m:limLow>`;
    }

    // 行列・配列（mtable）の場合は <m:m>（マトリクス）を生成します
    if (tag === 'mtable') {
        // 各行（mtr）を <m:mr> に変換します
        const rowsXml = ch
            // mtrタグのみ抽出します
            .filter(r => (r?.tag || '').toLowerCase() === 'mtr')
            // 各行のセル（mtd）を <m:e> に変換します
            .map(r => {
                // 行内のセル配列を取得します
                const cells = Array.isArray(r.children) ? r.children : [];
                // 各セルを変換します
                const cellsXml = cells
                    // mtdタグのみ抽出します
                    .filter(c => (c?.tag || '').toLowerCase() === 'mtd')
                    // <m:e>タグで囲みます
                    .map(c => `<m:e>${convertMmlNodesToOmmlXml(c.children || [])}</m:e>`)
                    // 結合します
                    .join('');
                // <m:mr>タグで囲んで返します
                return `<m:mr>${cellsXml}</m:mr>`;
            })
            // 全行を結合します
            .join('');
        // <m:m>要素を返します
        return `<m:m>${rowsXml}</m:m>`;
    }

    // 括弧囲み（mfenced）の場合は <m:d>（デリミタ）を生成します
    if (tag === 'mfenced') {
        // 内部要素のOMMLを生成します
        const eXml = convertMmlNodesToOmmlXml(ch);
        // <m:d>要素を返します
        return `<m:d><m:e>${eXml}</m:e></m:d>`;
    }

    // その他の未知のタグで子要素がある場合は子要素を再帰変換します
    if (ch.length > 0) {
        // 子要素群の変換結果を返します
        return convertMmlNodesToOmmlXml(ch);
    }

    // テキストのみ存在する場合は数式ランとして出力します
    if (text) {
        // 数式ラン要素を返します
        return `<m:r><m:t>${escapeXml(text)}</m:t></m:r>`;
    }

    // いずれにも該当しない場合は空文字列を返します
    return '';
}

// 構造化MathMLオブジェクトまたはフォールバックTeX文字列から完全な <a14:m> ブロックXMLを生成する関数です
export function buildOfficeMathXml(mathEntry) {
    // OMML内部のボディ文字列を初期化します
    let ommlBody = '';
    // 構造化MathMLノードツリーが存在する場合
    if (mathEntry && mathEntry.tree) {
        // ツリーからOMML XMLへ変換します
        ommlBody = convertMmlNodeToOmmlXml(mathEntry.tree);
    }
    // ツリー変換結果が空の場合はフォールバック文字列からランを生成します
    if (!ommlBody) {
        // フォールバック用の数式テキストを取得します
        const fallback = (mathEntry && (mathEntry.tex || mathEntry.text)) || ' ';
        // 単一の数式ランを構築します
        ommlBody = `<m:r><m:t>${escapeXml(fallback)}</m:t></m:r>`;
    }
    // PowerPoint 2010以降のネイティブ数式コンテナ <a14:m><m:oMathPara><m:oMath> で包んで返却します
    return `<a14:m xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"><m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${ommlBody}</m:oMath></m:oMathPara></a14:m>`;
}

// @spec FN-PPT-002 injectOfficeMath
// 生成されたPPTX（ZIP）ファイルを開き、数式プレースホルダー（__OMATH_N__）をネイティブOffice MathMLへ置換する関数です
export async function injectOfficeMathIntoPptx(pptxPath, mathMap) {
    // 変換対象の数式が存在しない場合は何もしないで終了します
    if (!mathMap || Object.keys(mathMap).length === 0) {
        // 早期リターンします
        return;
    }
    // PPTXファイルが存在しない場合は何もしないで終了します
    if (!fs.existsSync(pptxPath)) {
        // 早期リターンします
        return;
    }

    // 各プレースホルダーIDに対する置換後 <a14:m> XML文字列マップを事前構築します
    const xmlMap = {};
    // mathMapの全キーを走査します
    for (const [token, entry] of Object.entries(mathMap)) {
        // トークンに対応する <a14:m> XML文字列を生成して格納します
        xmlMap[token] = buildOfficeMathXml(entry);
    }

    // PptxGenJSの依存関係に含まれるJSZipを動的インポートしてPPTXアーカイブを操作します
    const JSZipModule = await import('jszip');
    // デフォルトエクスポートまたはモジュール本体を取得します
    const JSZip = JSZipModule.default || JSZipModule;
    // PPTXファイルのバイナリデータを読み込みます
    const pptxBuffer = fs.readFileSync(pptxPath);
    // JSZipでZIPアーカイブを展開します
    const zip = await JSZip.loadAsync(pptxBuffer);

    // スライドXMLファイル（ppt/slides/slide*.xml）のパス一覧を取得します
    const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));

    // プレースホルダーを含む <a:r>...</a:r> 要素にマッチする正規表現です
    const runRegex = /<a:r\b[^>]*>([\s\S]*?)<\/a:r>/g;
    // トークン分割用の正規表現です
    const tokenSplitRegex = /(__OMATH_\d+__)/g;

    // 各スライドXMLファイルを順番に処理します
    for (const slideFile of slideFiles) {
        // スライドXMLの内容を文字列として取得します
        const xmlContent = await zip.file(slideFile).async('string');
        // 数式プレースホルダーが含まれていない場合はスキップします
        if (!xmlContent.includes('__OMATH_')) {
            // 次のスライドへ進みます
            continue;
        }

        // <a:r>要素を走査して数式プレースホルダーを <a14:m> へ置換します
        const updatedXml = xmlContent.replace(runRegex, (fullRun, innerRun) => {
            // このランにプレースホルダーが含まれていなければそのまま返します
            if (!innerRun.includes('__OMATH_')) {
                // 元のラン文字列を維持します
                return fullRun;
            }
            // ラン属性（<a:rPr>...</a:rPr> または <a:rPr .../>）を抽出します
            const rPrMatch = innerRun.match(/<a:rPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:rPr>)/);
            // 抽出されたラン属性文字列（存在しない場合は空文字）を保持します
            const rPrXml = rPrMatch ? rPrMatch[0] : '';
            // テキスト要素（<a:t>...</a:t>）の中身を抽出します
            const tMatch = innerRun.match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/);
            // テキスト要素が見つからない場合は元のランを返します
            if (!tMatch) {
                // 元のラン文字列を維持します
                return fullRun;
            }
            // テキスト本文を取得します
            const rawText = tMatch[1];
            // プレースホルダートークンでテキストを分割します
            const segments = rawText.split(tokenSplitRegex);
            // 置換後のXML断片配列を初期化します
            const outFragments = [];

            // 分割された各セグメントを処理します
            for (const seg of segments) {
                // 空文字列セグメントはスキップします
                if (!seg) {
                    // 次へ進みます
                    continue;
                }
                // セグメントが数式プレースホルダーに一致する場合
                if (xmlMap[seg]) {
                    // 事前構築した <a14:m> XMLブロックを追加します
                    outFragments.push(xmlMap[seg]);
                // 通常のテキスト部分の場合
                } else {
                    // 元のラン属性（rPr）を引き継いだ <a:r> 要素として再構築します
                    outFragments.push(`<a:r>${rPrXml}<a:t>${seg}</a:t></a:r>`);
                }
            }

            // 置換後のXML断片を連結して返します
            return outFragments.join('');
        });

        // 更新されたXML文字列をZIPアーカイブ内に書き戻します
        zip.file(slideFile, updatedXml);
    }

    // 再構築したPPTXアーカイブをNode.jsバッファとして生成します
    const outBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    // 一時ファイルパスを生成します
    const tmpPath = `${pptxPath}.tmp.${crypto.randomBytes(4).toString('hex')}`;
    // 一時ファイルへ書き込みます
    fs.writeFileSync(tmpPath, outBuffer);
    // 元のPPTXファイルをアトミックに置き換えます
    fs.renameSync(tmpPath, pptxPath);
}
