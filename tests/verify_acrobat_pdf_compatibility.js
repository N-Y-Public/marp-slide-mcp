// ファイルシステム同期操作モジュールをインポートします
import fs from 'fs';
// ファイルパス操作モジュールをインポートします
import path from 'path';
// Deflate/FlateDecode圧縮ストリーム解凍モジュールをインポートします
import zlib from 'zlib';
// 子プロセス同期実行モジュールをインポートします
import { execSync } from 'child_process';

// サンプルスライドのPDFファイルパスを定義します
const SAMPLE_PDF_PATH = path.resolve('slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf');
// 16:9比率テスト用の一時Markdownファイルパスを定義します
const TEMP_16_9_MD_PATH = path.resolve('test_acrobat_16_9_temp.md');
// 16:9比率テスト用の一時PDFファイルパスを定義します
const TEMP_16_9_PDF_PATH = path.resolve('test_acrobat_16_9_temp.pdf');
// MCPツールexport_to_pdf検証用の一時Markdownファイルパスを定義します
const TEMP_MCP_MD_PATH = path.resolve('test_acrobat_mcp_temp.md');
// MCPツールexport_to_pdf検証用の一時PDFファイルパスを定義します
const TEMP_MCP_PDF_PATH = path.resolve('test_acrobat_mcp_temp.pdf');
// MCPツールexport_to_pdf検証用の一時HTMLファイルパスを定義します
const TEMP_MCP_HTML_PATH = path.resolve('test_acrobat_mcp_temp.html');

// PDFバイナリからオブジェクト一覧・辞書・解凍済みストリームを抽出する関数を定義します
function analyzePdfBuffer(pdfBuffer) {
  // PDF全体をLatin-1文字列として取得しバイナリ位置を保持します
  const rawText = pdfBuffer.toString('latin1');
  // 解凍されたすべてのストリームテキストを格納する配列を初期化します
  const decompressedStreams = [];
  // PDFオブジェクトの開始からendobjまでを非貪欲に走査する正規表現を定義します
  const objRegex = /(\d+)\s+0\s+obj\r?\n<<([\s\S]*?)>>\r?\nstream\r?\n/g;
  // ストリーム一致結果を格納する変数を初期化します
  let streamMatch = null;
  // 各ストリームオブジェクトを順番に検査します
  while ((streamMatch = objRegex.exec(rawText)) !== null) {
    // オブジェクト番号を取得します
    const objNum = parseInt(streamMatch[1], 10);
    // オブジェクト辞書文字列を取得します
    const dictStr = streamMatch[2];
    // ストリーム本体の開始バイト位置を算出します
    const startOffset = streamMatch.index + streamMatch[0].length;
    // 対応するendstreamの位置を検索します
    const endOffset = rawText.indexOf('endstream', startOffset);
    // endstreamが見つからない場合はスキップします
    if (endOffset === -1) continue;
    // 末尾の改行コードを除いたストリーム終端位置を調整します
    let sliceEnd = endOffset;
    // 終端直前がLFの場合は1バイト戻します
    if (rawText[sliceEnd - 1] === '\n') sliceEnd--;
    // さらにその直前がCRの場合は1バイト戻します
    if (rawText[sliceEnd - 1] === '\r') sliceEnd--;
    // ストリームのバイナリスライスを切り出します
    const streamSlice = pdfBuffer.subarray(startOffset, sliceEnd);
    // FlateDecodeフィルターが指定されているか判定します
    if (dictStr.includes('/FlateDecode')) {
      // FlateDecode圧縮データの解凍を試みます
      try {
        // zlib.inflateSyncでストリームを解凍します
        const inflated = zlib.inflateSync(streamSlice).toString('latin1');
        // 解凍されたテキストを配列に追加します
        decompressedStreams.push({ objNum, dictStr, content: inflated });
      // 解凍失敗時は無視して次のストリームへ進みます
      } catch (e) {}
    }
  }
  // 生テキストと解凍されたObject Stream等の全テキストを結合して検索対象とします
  const combinedPdfText = rawText + '\n' + decompressedStreams.map((s) => s.content).join('\n');
  // PatternType 2またはShadingType 2の出現回数を集計します
  const shadingMatches = combinedPdfText.match(/\/PatternType\s+2|\/ShadingType\s+2/g) || [];
  // FunctionType 4または/TR転送関数の出現回数を集計します
  const trMatches = combinedPdfText.match(/\/FunctionType\s+4|\/TR\s+\d+\s+0\s+R/g) || [];
  // SMaskソフトマスク参照の出現回数を集計します
  const smaskMatches = combinedPdfText.match(/\/SMask\s+\d+\s+0\s+R/g) || [];
  // Subtype Type3フォントの出現回数を集計します
  const type3Matches = combinedPdfText.match(/\/Subtype\s*\/Type3\b/g) || [];
  // Subtype CIDFontType2（TrueTypeアウトライン）フォントの出現回数を集計します
  const cidType2Matches = combinedPdfText.match(/\/Subtype\s*\/CIDFontType2\b/g) || [];
  // FontBBox定義をすべて抽出する正規表現を定義します
  const bboxRegex = /\/FontBBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/g;
  // 反転したFontBBox（lly > ury）のリストを初期化します
  const invertedBBoxes = [];
  // 正常なFontBBox（lly <= ury）のリストを初期化します
  const validBBoxes = [];
  // 正規表現の一致結果を格納する変数を初期化します
  let bboxMatch = null;
  // すべてのFontBBox定義を走査します
  while ((bboxMatch = bboxRegex.exec(combinedPdfText)) !== null) {
    // 左下Y座標（lly）を数値に変換します
    const lly = parseFloat(bboxMatch[2]);
    // 右上Y座標（ury）を数値に変換します
    const ury = parseFloat(bboxMatch[4]);
    // llyがuryより大きい（上下反転している）か判定します
    if (lly > ury) {
      // 反転FontBBoxとしてリストに記録します
      invertedBBoxes.push(bboxMatch[0]);
    // 正常なFontBBoxの場合
    } else {
      // 正常FontBBoxとしてリストに記録します
      validBBoxes.push(bboxMatch[0]);
    }
  }
  // フッター帯の単色パス描画オペレータ（inset box-shadowによる760/720パスまたは680矩形）が含まれるストリーム数を数えます
  const footerRectStreams = decompressedStreams.filter((s) => /0\s+760\s+m[\s\S]*?(960|1280)\s+760\s+l|0\s+680\s+(960|1280)\s+40\s+re/.test(s.content));
  // スライド全面の単色白背景矩形（1 1 1 rg ... 0 0 960/1280 720 re f）が含まれるストリーム数を数えます
  const whiteBgStreams = decompressedStreams.filter((s) => /1\s+1\s+1\s+rg[\s\S]*?0\s+0\s+(960|1280|720)\s+(720|540)\s+re\s*f/.test(s.content));
  // 集計結果オブジェクトを返却します
  return {
    // PatternType 2 / ShadingType 2 の件数です
    shadingCount: shadingMatches.length,
    // FunctionType 4 / TR 転送関数の件数です
    trCount: trMatches.length,
    // SMask ソフトマスクの件数です
    smaskCount: smaskMatches.length,
    // Subtype Type3 フォントの総件数です
    type3Count: type3Matches.length,
    // Subtype CIDFontType2 フォントの総件数です
    cidType2Count: cidType2Matches.length,
    // 反転 FontBBox の件数です
    invertedBBoxCount: invertedBBoxes.length,
    // 正常 FontBBox の件数です
    validBBoxCount: validBBoxes.length,
    // フッター単色パス/矩形ストリームの件数です
    footerRectStreamCount: footerRectStreams.length,
    // 全面白背景単色矩形ストリームの件数です
    whiteBgStreamCount: whiteBgStreams.length
  };
}

// 本ワークツリーのビルド済みMCPサーバー（build/index.js）を直接インポートしてexport_to_pdfを実行する関数を定義します
async function runWorktreeMcpExportToPdf(mdPath) {
  // ワークツリー内のビルド済みMCPサーバーモジュール（build/index.js）を動的インポートします
  const { server } = await import('../build/index.js');
  // 登録済みツール辞書からexport_to_pdfツール定義を取得します
  const exportTool = server._registeredTools['export_to_pdf'];
  // 実行ハンドラ関数（handlerまたはcallback）を取得します
  const fn = exportTool && (exportTool.handler || exportTool.callback);
  // ツールが存在しない場合はエラーをスローします
  if (typeof fn !== 'function') {
    // 例外を投げて知らせます
    throw new Error('build/index.js 内に export_to_pdf ツールが見つかりません');
  }
  // ワークツリーのexport_to_pdfハンドラを直接実行して結果を返却します
  return await fn({ markdownPath: mdPath }, {});
}

// メインの検証処理を実行する非同期関数を定義します
async function runVerification() {
  // テスト開始ヘッダーをコンソールに出力します
  console.log('=== Issue #18 Adobe Acrobat Reader / Acrobat PDF互換性・白飛び防止検証 (TEST-ST-008) ===\n');
  // 全体合否フラグをtrueで初期化します
  let allPass = true;

  // 1. サンプルスライド（4:3比率、全16ページ）のPDF内部構造を検証します
  console.log('[1/3] サンプルスライドPDF (4:3比率: D01-000001_Marpの使い方.pdf) の内部ストリーム検証...');
  // サンプルPDFが存在するか確認します
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    // 存在しない場合はMarp CLIでビルドを実行します
    execSync('npm run build:pdf', { stdio: 'inherit' });
  }
  // サンプルPDFのバイナリを読み込みます
  const sampleBuf = fs.readFileSync(SAMPLE_PDF_PATH);
  // PDF内部構造を解析します
  const sampleStats = analyzePdfBuffer(sampleBuf);
  // 解析結果のサマリを出力します
  console.log('  📊 解析結果:', JSON.stringify(sampleStats));

  // AC-1: PatternType 2 / ShadingType 2 が0件であり、単色白背景＋単色フッター矩形が出力されているか検証します
  if (sampleStats.shadingCount === 0 && sampleStats.whiteBgStreamCount >= 16 && sampleStats.footerRectStreamCount >= 16) {
    // 合格メッセージを出力します
    console.log(`  ✅ [AC-1 合格] PatternType 2 / ShadingType 2 = 0件、単色白背景ストリーム = ${sampleStats.whiteBgStreamCount}件、単色フッター矩形ストリーム = ${sampleStats.footerRectStreamCount}件`);
  } else {
    // 不合格メッセージを出力します
    console.error(`  ❌ [AC-1 不合格] Shading=${sampleStats.shadingCount}, WhiteBg=${sampleStats.whiteBgStreamCount}, FooterRect=${sampleStats.footerRectStreamCount}`);
    // 合否フラグをfalseにします
    allPass = false;
  }

  // AC-2: SVG mask由来の/TR・FunctionType 4および吹き出しドロップシャドウの/SMaskが0件であるか検証します
  if (sampleStats.trCount === 0 && sampleStats.smaskCount === 0) {
    // 合格メッセージを出力します
    console.log(`  ✅ [AC-2 合格] /TR (FunctionType 4) = 0件、/SMask = 0件（マスクレスSVGバナーおよび吹き出しシャドウ排除完了）`);
  } else {
    // 不合格メッセージを出力します
    console.error(`  ❌ [AC-2 不合格] /TR=${sampleStats.trCount}件, /SMask=${sampleStats.smaskCount}件`);
    // 合否フラグをfalseにします
    allPass = false;
  }

  // AC-3: 反転FontBBoxを持つSubtype Type3フォントが0件であり、CIDFontType2（TrueType）が埋め込まれているか検証します
  if (sampleStats.type3Count === 0 && sampleStats.invertedBBoxCount === 0 && sampleStats.cidType2Count >= 1) {
    // 合格メッセージを出力します
    console.log(`  ✅ [AC-3 合格] Subtype Type3 = 0件、反転FontBBox = 0件、Subtype CIDFontType2 (TrueType) = ${sampleStats.cidType2Count}件`);
  } else {
    // 不合格メッセージを出力します
    console.error(`  ❌ [AC-3 不合格] Type3=${sampleStats.type3Count}件, InvertedBBox=${sampleStats.invertedBBoxCount}件, CIDFontType2=${sampleStats.cidType2Count}件`);
    // 合否フラグをfalseにします
    allPass = false;
  }

  // 2. 16:9比率スライドのPDF生成と内部構造を検証します
  console.log('\n[2/3] 16:9比率スライドPDFの生成および内部ストリーム検証...');
  // 16:9比率の検証用Markdownコンテンツを行配列で定義します
  const md16x9 = [
    // Marpフロントマター開始区切りです
    '---',
    // Marpを有効化します
    'marp: true',
    // ビジネススライドテーマを指定します
    'theme: business-slide',
    // 16:9アスペクト比を指定します
    'size: 16:9',
    // ページ番号表示を有効化します
    'paginate: true',
    // Marpフロントマター終了区切りです
    '---',
    // 空行です
    '',
    // 表紙タイトル見出しです
    '# 16:9表紙タイトル',
    // 表紙タイトル本文です
    '企業環境Acrobat Reader互換性検証用スライド',
    // サブタイトル見出しです
    '## サブタイトル',
    // サブタイトル本文です
    '16:9ワイド画面における単色背景・マスクレスバナー・TrueTypeフォント埋め込み検証',
    // 図書番号見出しです
    '### 図書番号',
    // 図書番号本文です
    'DOC-1609-01',
    // 所属・氏名見出しです
    '### 所属・氏名',
    // 所属名です
    '品質保証部',
    // 氏名です
    '検証 太郎',
    // 作成日見出しです
    '#### 作成日',
    // 作成日本文です
    '2026年10月25日',
    // コピーライト見出しです
    '###### コピーライト',
    // コピーライト本文です
    '© 2026 N-Y-Public',
    // 機密指定見出しです
    '###### 機密指定',
    // 機密指定本文です
    'CONFIDENTIAL',
    // 空行です
    '',
    // スライド区切りです
    '---',
    // 空行です
    '',
    // 会話レイアウトクラス指定です
    '<!-- _class: conversation-content -->',
    // 2ページ目のタイトル見出しです
    '# 会話とコード検証',
    // 2ページ目のタイトル本文です
    '16:9スライドでの会話吹き出しとコードブロック検証',
    // ページ主張見出しです
    '## ページ主張',
    // ページ主張本文です
    '- ドロップシャドウのSMaskを生成せず鮮明に吹き出しを描画します',
    // 補足タイトル見出しです
    '### 主張補足タイトル',
    // 補足タイトル本文です
    '対話とコード例',
    // 本文見出しです
    '#### 本文',
    // 会話1行目です
    '- **担当者A** 16:9スライドでもフッター矩形（1280x40）とTrueTypeフォントが正しく出力されますか？',
    // 会話2行目です
    '- **担当者B** はい、0 680 1280 40 re f の単色矩形として出力され、Type3フォントも0件です。',
    // コードブロック開始です
    '```javascript',
    // サンプルコード1行目です
    'const status = "Acrobat Reader Compatible";',
    // サンプルコード2行目です
    'console.log(status);',
    // コードブロック終了です
    '```',
    // コピーライト見出しです
    '###### コピーライト',
    // コピーライト本文です
    '© 2026 N-Y-Public',
    // 機密指定見出しです
    '###### 機密指定',
    // 機密指定本文です
    'CONFIDENTIAL'
  // 改行で結合してMarkdown文字列にします
  ].join('\n');

  // 一時ファイルの後始末を確実に行うためtry-finallyで囲みます
  try {
    // 16:9検証用Markdownを一時ファイルに書き出します
    fs.writeFileSync(TEMP_16_9_MD_PATH, md16x9, 'utf8');
    // ローカルのMarp CLIとテーマを使用して16:9 PDFを生成します
    execSync(
      `./node_modules/.bin/marp "${TEMP_16_9_MD_PATH}" --config-file marp.config.js --theme-set themes/business-slide-theme.css --pdf --allow-local-files -o "${TEMP_16_9_PDF_PATH}"`,
      { stdio: 'pipe' }
    );
    // 生成された16:9 PDFを読み込みます
    const buf16x9 = fs.readFileSync(TEMP_16_9_PDF_PATH);
    // 16:9 PDFの内部構造を解析します
    const stats16x9 = analyzePdfBuffer(buf16x9);
    // 解析結果のサマリを出力します
    console.log('  📊 16:9 PDF解析結果:', JSON.stringify(stats16x9));

    // 16:9 PDFでもShading=0, TR=0, SMask=0, Type3=0, InvertedBBox=0, CIDFontType2>=1, FooterRect>=2か検証します
    if (
      stats16x9.shadingCount === 0 &&
      stats16x9.trCount === 0 &&
      stats16x9.smaskCount === 0 &&
      stats16x9.type3Count === 0 &&
      stats16x9.invertedBBoxCount === 0 &&
      stats16x9.cidType2Count >= 1 &&
      stats16x9.footerRectStreamCount >= 2
    ) {
      // 合格メッセージを出力します
      console.log('  ✅ [16:9 検証合格] 16:9比率でもShading/SMask/Type3が0件かつ1280x40フッター矩形・TrueType埋め込みを確認しました。');
    } else {
      // 不合格メッセージを出力します
      console.error('  ❌ [16:9 検証不合格] 16:9 PDFの内部構造が基準を満たしていません:', stats16x9);
      // 合否フラグをfalseにします
      allPass = false;
    }

    // 3. 本ワークツリーのMCPサーバー（build/index.js）の export_to_pdf ツール経由でのPDF出力を検証します
    console.log('\n[3/3] 本ワークツリーMCPサーバー (build/index.js -> export_to_pdf) 経由のPDF出力検証...');
    // MCP検証用のMarkdownファイルを書き出します
    fs.writeFileSync(TEMP_MCP_MD_PATH, md16x9, 'utf8');
    // ワークツリー内のMCPサーバーのexport_to_pdfツールを実行します
    const mcpRes = await runWorktreeMcpExportToPdf(TEMP_MCP_MD_PATH);
    // MCPレスポンスが正常かつPDFファイルが生成されたか確認します
    if (mcpRes && !mcpRes.isError && fs.existsSync(TEMP_MCP_PDF_PATH)) {
      // MCP経由で生成されたPDFを解析します
      const mcpStats = analyzePdfBuffer(fs.readFileSync(TEMP_MCP_PDF_PATH));
      // 解析結果を出力します
      console.log('  📊 MCP export_to_pdf 解析結果:', JSON.stringify(mcpStats));
      // すべての基準を満たしているか判定します
      if (
        mcpStats.shadingCount === 0 &&
        mcpStats.trCount === 0 &&
        mcpStats.smaskCount === 0 &&
        mcpStats.type3Count === 0 &&
        mcpStats.invertedBBoxCount === 0 &&
        mcpStats.cidType2Count >= 1
      ) {
        // 合格メッセージを出力します
        console.log('  ✅ [MCP export_to_pdf 合格] ワークツリー内MCPサーバー経由でもAcrobat互換PDFが正常に出力されました。');
      } else {
        // 不合格メッセージを出力します
        console.error('  ❌ [MCP export_to_pdf 不合格] PDF内部構造が基準を満たしていません:', mcpStats);
        // 合否フラグをfalseにします
        allPass = false;
      }
    } else {
      // MCP呼び出し失敗メッセージを出力します
      console.error('  ❌ [MCP export_to_pdf 不合格] MCPツール呼び出しに失敗しました:', JSON.stringify(mcpRes));
      // 合否フラグをfalseにします
      allPass = false;
    }
  // 一時ファイルを削除します
  } finally {
    // 作成された一時ファイル群を走査して削除します
    for (const f of [TEMP_16_9_MD_PATH, TEMP_16_9_PDF_PATH, TEMP_MCP_MD_PATH, TEMP_MCP_PDF_PATH, TEMP_MCP_HTML_PATH]) {
      // ファイルが存在する場合のみ削除します
      if (fs.existsSync(f)) {
        // ファイルを同期削除します
        fs.unlinkSync(f);
      }
    }
  }

  // 最終判定を出力します
  console.log('\n=== 総合判定 ===');
  // すべて合格の場合
  if (allPass) {
    // 成功メッセージを出力します
    console.log('🎉 TEST-ST-008 (AC-1 〜 AC-3 & MCP export_to_pdf) すべて合格しました！');
    // 終了コード0で終了します
    process.exit(0);
  // 不合格がある場合
  } else {
    // 失敗メッセージを出力します
    console.error('💥 一部の検証項目が不合格となりました。');
    // 終了コード1で終了します
    process.exit(1);
  }
}

// 検証処理を実行し未捕捉エラーを処理します
runVerification().catch((err) => {
  // エラー内容を出力します
  console.error('検証実行時エラー:', err);
  // 終了コード1で終了します
  process.exit(1);
});
