// @test TEST-ST-009
// ファイルシステム操作モジュールをインポートします
import fs from 'fs';
// ファイルパス解決モジュールをインポートします
import path from 'path';
// ストリーム解凍モジュールをインポートします
import zlib from 'zlib';
// 子プロセス生成モジュールをインポートします
import { fork, execSync } from 'child_process';

// PDFファイルから正確なページ数を解析・取得する関数を定義します
function countPdfPages(pdfPath) {
  // 指定されたPDFファイルをバイナリバッファとして読み込みます
  const buf = fs.readFileSync(pdfPath);
  // バイナリをLatin-1文字列としてデコードします
  const rawText = buf.toString('latin1');
  // 解凍されたすべてのストリーム文字列を格納する配列を初期化します
  const decompressedStreams = [];
  // PDFストリームオブジェクトを抽出する正規表現を定義します
  const objRegex = /(\d+)\s+0\s+obj\r?\n<<([\s\S]*?)>>\r?\nstream\r?\n/g;
  // 正規表現のマッチ結果変数を初期化します
  let match = null;
  // すべてのストリームオブジェクトを走査します
  while ((match = objRegex.exec(rawText)) !== null) {
    // オブジェクト辞書文字列を取得します
    const dictStr = match[2];
    // ストリームデータの開始オフセットを計算します
    const startOffset = match.index + match[0].length;
    // 対応するendstreamの位置を特定します
    const endOffset = rawText.indexOf('endstream', startOffset);
    // endstreamが存在しない場合はスキップします
    if (endOffset === -1) continue;
    // スライスの終端オフセットを調整します
    let sliceEnd = endOffset;
    // 終端直前の改行文字LFを除去します
    if (rawText[sliceEnd - 1] === '\n') sliceEnd--;
    // 終端直前の改行文字CRを除去します
    if (rawText[sliceEnd - 1] === '\r') sliceEnd--;
    // ストリームのバイナリデータを切り出します
    const streamSlice = buf.subarray(startOffset, sliceEnd);
    // FlateDecode圧縮されているか判定します
    if (dictStr.includes('/FlateDecode')) {
      // 解凍処理を試みます
      try {
        // zlibでDeflateストリームを解凍して配列に追加します
        decompressedStreams.push(zlib.inflateSync(streamSlice).toString('latin1'));
      // 解凍エラー時は無視して次へ進みます
      } catch (e) {}
    }
  }
  // 生テキストと解凍された全ストリームテキストを結合します
  const allText = rawText + '\n' + decompressedStreams.join('\n');
  // ページオブジェクト（/Type /Page、Pagesは除外）の出現数を集計します
  const pages = allText.match(/\/Type\s*\/Page\b/g) || [];
  // 検出されたページ数を返却します
  return pages.length;
}

// 本Worktree専用のMCPクライアントクラスを定義します
class WorktreeMcpClient {
  // コンストラクタで子プロセスの起動とリクエストマップを初期化します
  constructor(serverPath) {
    // サーバーのスクリプトパスを保持します
    this.serverPath = serverPath;
    // 子プロセス参照を初期化します
    this.process = null;
    // リクエストIDカウンタを初期化します
    this.requestId = 1;
    // 応答待機中のPromiseハンドラーマップを初期化します
    this.pending = new Map();
    // 受信バッファ文字列を初期化します
    this.buffer = '';
  }

  // MCPサーバープロセスを起動してStdio通信を開始するメソッドです
  async start() {
    // プロセスの起動Promiseを返却します
    return new Promise((resolve, reject) => {
      // forkで独立したNodeプロセスとしてMCPサーバーを起動します
      this.process = fork(this.serverPath, [], {
        // 標準入出力をパイプ接続し、stderrを継承します
        stdio: ['pipe', 'pipe', 'inherit', 'ipc'],
        // 環境変数にヘッドレスChromium用の変数を付与します
        env: { ...process.env, CHROME_NO_SANDBOX: '1' },
      });

      // 標準出力からデータを受信したときの処理を定義します
      this.process.stdout.on('data', (data) => {
        // 受信データをバッファに追加します
        this.buffer += data.toString('utf8');
        // 改行で分割して行単位で処理します
        const lines = this.buffer.split('\n');
        // 最後の不完全な行をバッファに残します
        this.buffer = lines.pop() || '';
        // 各行をJSON-RPCメッセージとして解析します
        for (const line of lines) {
          // 空行はスキップします
          if (!line.trim()) continue;
          // JSONパースを試みます
          try {
            // メッセージオブジェクトをパースします
            const msg = JSON.parse(line);
            // 待機中のリクエストが存在するか確認します
            if (msg.id && this.pending.has(msg.id)) {
              // 対応するPromiseのresolve関数を取り出します
              const { resolve: reqResolve, reject: reqReject } = this.pending.get(msg.id);
              // マップから削除します
              this.pending.delete(msg.id);
              // エラー応答の場合はrejectします
              if (msg.error) {
                // エラー内容を返します
                reqReject(new Error(msg.error.message || 'MCP Error'));
              // 正常応答の場合はresultをresolveします
              } else {
                // 結果を返します
                reqResolve(msg.result);
              }
            }
          // パース失敗時は標準ログに出力します
          } catch (e) {
            // パースエラーを出力します
            console.error('[MCP Client] JSONパース失敗:', e, line);
          }
        }
      });

      // プロセス終了時のハンドラーを登録します
      this.process.on('exit', (code) => {
        // 異常終了時は待機中の全Promiseをエラー終了させます
        if (code !== 0) {
          // 残存リクエストを拒否します
          for (const { reject: reqReject } of this.pending.values()) {
            // プロセス異常終了エラーを返します
            reqReject(new Error(`MCPサーバーがコード ${code} で終了しました`));
          }
          // マップをクリアします
          this.pending.clear();
        }
      });

      // 起動完了として即座にresolveします
      resolve();
    });
  }

  // JSON-RPCリクエストを送信してレスポンスを待機するメソッドです
  async request(method, params = {}) {
    // リクエストIDを採番します
    const id = this.requestId++;
    // JSON-RPCメッセージオブジェクトを構築します
    const message = { jsonrpc: '2.0', id, method, params };
    // 送信Promiseを返却します
    return new Promise((resolve, reject) => {
      // 応答待機マップにハンドラーを登録します
      this.pending.set(id, { resolve, reject });
      // 標準入力へ改行区切りでJSONを書き込みます
      this.process.stdin.write(JSON.stringify(message) + '\n');
    });
  }

  // MCPツールを呼び出すメソッドです
  async callTool(name, args = {}) {
    // tools/callメソッドでリクエストを送信します
    const res = await this.request('tools/call', { name, arguments: args });
    // レスポンスを返却します
    return res;
  }

  // サーバープロセスを安全に終了するメソッドです
  stop() {
    // プロセスが存在する場合はシグナルを送信して終了します
    if (this.process) {
      // プロセスを終了します
      this.process.kill();
      // 参照を解放します
      this.process = null;
    }
  }
}

// テスト実行メイン関数を定義します
async function runTests() {
  // テスト開始ヘッダーを出力します
  console.log('========================================================================');
  // テスト名称を出力します
  console.log(' TEST-ST-009: PDF出力時における末尾余剰白紙ページ抑止自動検証テスト');
  // テスト開始ヘッダー区切りを出力します
  console.log('========================================================================');

  // MCPサーバーのビルド成果物パスを設定します
  const serverPath = path.resolve('build/index.js');
  // サーバー成果物が存在するか確認します
  if (!fs.existsSync(serverPath)) {
    // ビルド不在エラーを出力して終了します
    console.error('エラー: build/index.js が存在しません。先に npm run build を実行してください。');
    // 終了コード1で終了します
    process.exit(1);
  }

  // MCPクライアントを初期化します
  const client = new WorktreeMcpClient(serverPath);
  // サーバーを起動します
  await client.start();
  // 起動完了ログを出力します
  console.log('[OK] Worktree内MCPサーバープロセス起動成功');

  // テスト結果カウント変数を初期化します
  let passedCount = 0;
  // テスト総数を定義します
  const totalTests = 4;

  // テスト実行ブロックを開始します
  try {
    // -------------------------------------------------------------------------
    // Test Case 1: Mermaid図を含むスライドデッキ (4スライド → 4ページ)
    // -------------------------------------------------------------------------
    console.log('\n--- Case 1: Mermaid図を含むスライドデッキのPDF検証 (AC-1) ---');
    // サンプルペイロードファイルを読み込みます
    const samplePayloadPath = path.resolve('.agents/skills/marp-slides/examples/sample_deck_payload.json');
    // JSONをパースします
    const samplePayload = JSON.parse(fs.readFileSync(samplePayloadPath, 'utf8'));
    // 固有のプレフィックスを設定します
    samplePayload.filenamePrefix = 'test-st009-mermaid';
    // MCP経由でスライドデッキを生成します
    const resCase1 = await client.callTool('generate_slide_deck', samplePayload);
    // 生成結果テキストを取得します
    const textCase1 = resCase1.content[0].text;
    // PDFパスを抽出します
    const pdfMatchCase1 = textCase1.match(/PDF:\s*(.+)/);
    // PDFパスが取得できない場合はエラーとします
    if (!pdfMatchCase1) throw new Error('Case 1 のPDFパスが取得できませんでした: ' + textCase1);
    // 相対パスを絶対パスへ解決します
    const pdfPathCase1 = path.resolve(pdfMatchCase1[1].trim());
    // PDFのページ数をカウントします
    const pagesCase1 = countPdfPages(pdfPathCase1);
    // 期待スライド数を計算します（表紙1 + 通常3 = 4）
    const expectedPagesCase1 = 1 + samplePayload.normalSlides.length;
    // ページ数の一致を検証します
    console.log(`  -> 期待ページ数: ${expectedPagesCase1}, 実測ページ数: ${pagesCase1}`);
    // ページ数が完全一致するか判定します
    if (pagesCase1 === expectedPagesCase1) {
      // 合格ログを出力します
      console.log('  [PASS] Case 1 合格: Mermaid図ありスライドで末尾白紙ページが発生せず正確に4ページ');
      // カウントをインクリメントします
      passedCount++;
    // 不一致の場合
    } else {
      // 不合格ログを出力します
      console.error(`  [FAIL] Case 1 不合格: 期待 ${expectedPagesCase1} ページに対し実測 ${pagesCase1} ページ`);
    }

    // -------------------------------------------------------------------------
    // Test Case 2: Mermaid図を含まない通常スライドデッキ (3スライド → 3ページ)
    // -------------------------------------------------------------------------
    console.log('\n--- Case 2: Mermaid図なしスライドデッキのPDF検証 (AC-2) ---');
    // Mermaidなしペイロードを構築します
    const payloadCase2 = {
      filenamePrefix: 'test-st009-nomermaid',
      titleSlide: {
        mainTitle: '通常スライドデッキ検証',
        subTitle: 'Mermaidなしの安定描画テスト',
        bookNo: 'TEST-DOC-002',
        author: 'N-Y-Public',
        date: '2026-10-26'
      },
      normalSlides: [
        {
          pageTitle: '第1章: 概要',
          claim: 'テキストスライドが余剰ページなく出力されること',
          bodyContent: '- 項目1: 標準テキスト\n- 項目2: リスト表示'
        },
        {
          pageTitle: '第2章: まとめ',
          claim: '全スライドが正しくレンダリングされること',
          bodyContent: '- 結論: ページ数の完全一致'
        }
      ]
    };
    // スライドデッキを生成します
    const resCase2 = await client.callTool('generate_slide_deck', payloadCase2);
    // PDFパスを抽出します
    const pdfMatchCase2 = resCase2.content[0].text.match(/PDF:\s*(.+)/);
    // PDFパスを解決します
    const pdfPathCase2 = path.resolve(pdfMatchCase2[1].trim());
    // ページ数をカウントします
    const pagesCase2 = countPdfPages(pdfPathCase2);
    // 期待ページ数を算出します（表紙1 + 通常2 = 3）
    const expectedPagesCase2 = 3;
    // ページ数の一致を検証します
    console.log(`  -> 期待ページ数: ${expectedPagesCase2}, 実測ページ数: ${pagesCase2}`);
    // 判定します
    if (pagesCase2 === expectedPagesCase2) {
      // 合格ログを出力します
      console.log('  [PASS] Case 2 合格: Mermaidなしスライドで正確に3ページ');
      // カウントをインクリメントします
      passedCount++;
    // 不一致の場合
    } else {
      // 不合格ログを出力します
      console.error(`  [FAIL] Case 2 不合格: 期待 ${expectedPagesCase2} ページに対し実測 ${pagesCase2} ページ`);
    }

    // -------------------------------------------------------------------------
    // Test Case 3: 表紙のみスライドデッキ (1スライド → 1ページ)
    // -------------------------------------------------------------------------
    console.log('\n--- Case 3: 表紙のみスライドデッキのPDF検証 (AC-3) ---');
    // 表紙のみのペイロードを構築します
    const payloadCase3 = {
      filenamePrefix: 'test-st009-titleonly',
      titleSlide: {
        mainTitle: '単一表紙スライドデッキ',
        subTitle: '通常スライド0枚時の余剰改ページ抑止テスト',
        bookNo: 'TEST-DOC-003',
        author: 'N-Y-Public',
        date: '2026-10-26'
      },
      normalSlides: []
    };
    // スライドデッキを生成します
    const resCase3 = await client.callTool('generate_slide_deck', payloadCase3);
    // MarkdownパスおよびPDFパスを抽出します
    const mdMatchCase3 = resCase3.content[0].text.match(/Markdown:\s*(.+)/);
    // PDFパスを抽出します
    const pdfMatchCase3 = resCase3.content[0].text.match(/PDF:\s*(.+)/);
    // Markdownテキストを読み込みます
    const mdContentCase3 = fs.readFileSync(path.resolve(mdMatchCase3[1].trim()), 'utf8');
    // 表紙直後に不要な --- が付与されていないか検査します
    const hasTrailingDivider = mdContentCase3.trimEnd().endsWith('---');
    // PDFパスを解決します
    const pdfPathCase3 = path.resolve(pdfMatchCase3[1].trim());
    // ページ数をカウントします
    const pagesCase3 = countPdfPages(pdfPathCase3);
    // 期待ページ数は1です
    const expectedPagesCase3 = 1;
    // 検査結果を出力します
    console.log(`  -> Markdown末尾の余剰区切り線存在: ${hasTrailingDivider}`);
    // ページ数を出力します
    console.log(`  -> 期待ページ数: ${expectedPagesCase3}, 実測ページ数: ${pagesCase3}`);
    // 判定します
    if (pagesCase3 === expectedPagesCase3 && !hasTrailingDivider) {
      // 合格ログを出力します
      console.log('  [PASS] Case 3 合格: 表紙のみデッキで余剰区切り線がなく正確に1ページ');
      // カウントをインクリメントします
      passedCount++;
    // 不一致の場合
    } else {
      // 不合格ログを出力します
      console.error(`  [FAIL] Case 3 不合格: 期待 ${expectedPagesCase3} ページ (末尾---なし) に対し 実測 ${pagesCase3} ページ (末尾---: ${hasTrailingDivider})`);
    }

    // -------------------------------------------------------------------------
    // Test Case 4: 公式サンプルスライドのPDF検証 (17スライド → 17ページ)
    // -------------------------------------------------------------------------
    console.log('\n--- Case 4: 公式サンプルスライドのPDF検証 (AC-4) ---');
    // サンプルMarkdownのパスを定義します
    const sampleMdPath = 'slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md';
    // サンプルPDFのパスを定義します
    const samplePdfPath = 'slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.pdf';
    // サンプルHTMLのパスを定義します
    const sampleHtmlPath = 'slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.html';
    // Marp CLIでテーマを指定してサンプルスライドのHTMLを出力します
    execSync(`npx @marp-team/marp-cli "${sampleMdPath}" --theme-set themes/business-slide-theme.css --html --allow-local-files -o "${sampleHtmlPath}" --no-stdin`, { stdio: 'pipe' });
    // Marp CLIでテーマを指定してサンプルスライドのPDFを出力します
    execSync(`npm run build:pdf`, { stdio: 'pipe' });
    // HTMLテキストを読み込みます
    const sampleHtmlText = fs.readFileSync(sampleHtmlPath, 'utf8');
    // HTML内の全スライドセクション（sectionタグ）の数を集計します（目次2分割含む）
    const htmlSections = (sampleHtmlText.match(/<section\b/g) || []).length;
    // PDFのページ数をカウントします
    const pagesCase4 = countPdfPages(samplePdfPath);
    // 期待スライド数はHTMLセクション数（19ページ）です
    const expectedPagesCase4 = htmlSections;
    // 検査結果を出力します
    console.log(`  -> HTMLセクション数（目次分割含む）: ${expectedPagesCase4}, PDFページ数: ${pagesCase4}`);
    // 判定します
    if (pagesCase4 === expectedPagesCase4 && pagesCase4 >= 17) {
      // 合格ログを出力します
      console.log(`  [PASS] Case 4 合格: 公式サンプルスライドの全スライドが正確に${pagesCase4}ページで描画されPDFページ数と一致`);
      // カウントをインクリメントします
      passedCount++;
    // 不一致の場合
    } else {
      // 不合格ログを出力します
      console.error(`  [FAIL] Case 4 不合格: 期待 ${expectedPagesCase4} ページに対し実測 ${pagesCase4} ページ`);
    }

  // 終了処理を実行します
  } finally {
    // MCPクライアントプロセスを停止します
    client.stop();
  }

  // 総合結果を出力します
  console.log('\n========================================================================');
  // 集計結果を出力します
  console.log(` RESULT: ${passedCount === totalTests ? 'PASS' : 'FAIL'} (${passedCount}/${totalTests} テスト合格)`);
  // 終了ヘッダー区切りを出力します
  console.log('========================================================================');

  // 全テスト合格でない場合は終了コード1で終了します
  if (passedCount !== totalTests) {
    // 異常終了します
    process.exit(1);
  }
}

// スクリプトのエントリーポイントを実行します
runTests().catch((err) => {
  // 未捕捉例外を出力します
  console.error('テスト実行致命的エラー:', err);
  // 異常終了します
  process.exit(1);
});
