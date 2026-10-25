#!/usr/bin/env node
// ワークツリー内 MCP サーバー直接動作検証スクリプト (TEST-ST-007) です
// 子プロセス生成モジュールをインポートします
import { spawn } from "child_process";
// パス操作モジュールをインポートします
import * as path from "path";
// ファイルシステムモジュールをインポートします
import * as fs from "fs";
// URLとパスの相互変換関数をインポートします
import { fileURLToPath } from "url";

// 現在の実行ファイルパスを解決します
const __filename = fileURLToPath(import.meta.url);
// 現在の実行ディレクトリパスを解決します
const __dirname = path.dirname(__filename);
// リポジトリルートディレクトリを解決します
const REPO_ROOT = path.resolve(__dirname, "..");
// 本ワークツリーのMCPサーバービルド成果物パスを解決します
const SERVER_PATH = path.join(REPO_ROOT, "build", "index.js");

// 開始バナーを表示します
console.log("=== 本ワークツリー MCP サーバー直接検証 (TEST-ST-007) 開始 ===");
// リポジトリルートパスを表示します
console.log("Repo Root:", REPO_ROOT);
// サーバーファイルパスを表示します
console.log("Server Path:", SERVER_PATH);

// ビルド成果物の存在を確認します
if (!fs.existsSync(SERVER_PATH)) {
  // 不在の場合はエラーを出力します
  console.error("❌ エラー: build/index.js が存在しません。先に npm run build を実行してください。");
  // プロセスを異常終了します
  process.exit(1);
}

// MCPサーバープロセスを起動します
const mcp = spawn("node", [SERVER_PATH], {
  // 作業ディレクトリをリポジトリルートに指定します
  cwd: REPO_ROOT,
  // 必要な環境変数を注入します
  env: {
    // 既存の環境変数を展開します
    ...process.env,
    // 本番モードを指定します
    NODE_ENV: "production",
    // サンドボックス解除を指定します
    CHROME_NO_SANDBOX: "1",
  },
  // 標準入出力パイプを設定します
  stdio: ["pipe", "pipe", "inherit"],
});

// 受信バッファを初期化します
let buffer = "";
// 保留中のリクエスト応答待ちマップを初期化します
const pendingRequests = new Map();
// リクエストIDカウンタを初期化します
let requestId = 1;

// 標準出力データ受信ハンドラーを登録します
mcp.stdout.on("data", (data) => {
  // バッファに受信文字列を追加します
  buffer += data.toString();
  // 改行区切りで行配列に分割します
  const lines = buffer.split("\n");
  // 最後の未完行をバッファに戻します
  buffer = lines.pop() || "";

  // 各行を走査します
  for (const line of lines) {
    // 空白を除去します
    const trimmed = line.trim();
    // 空行はスキップします
    if (!trimmed) continue;
    // JSONパースを試みます
    try {
      // JSONオブジェクトに変換します
      const msg = JSON.parse(trimmed);
      // 応答待ちリクエストが存在するか確認します
      if (msg.id && pendingRequests.has(msg.id)) {
        // マップから解決関数を取得します
        const { resolve } = pendingRequests.get(msg.id);
        // マップからエントリを削除します
        pendingRequests.delete(msg.id);
        // Promiseを解決します
        resolve(msg);
      }
    // パースエラー時は例外を握りつぶします
    } catch (e) {
      // 診断行として無視します
    }
  }
});

// JSON-RPCリクエスト送信関数を定義します
function sendRequest(method, params = {}) {
  // 一意なリクエストIDを取得します
  const id = requestId++;
  // 送信ペイロード文字列を構築します
  const payload = JSON.stringify({
    // プロトコルバージョンです
    jsonrpc: "2.0",
    // リクエストIDです
    id,
    // メソッド名です
    method,
    // パラメータです
    params,
  }) + "\n";

  // Promiseを返却します
  return new Promise((resolve, reject) => {
    // 応答待ちマップに登録します
    pendingRequests.set(id, { resolve, reject });
    // 標準入力へ書き込みます
    mcp.stdin.write(payload);
  });
}

// 非同期検証メイン関数を定義します
async function run() {
  // 例外処理ブロックを開始します
  try {
    // ステップ1の開始ログを出力します
    console.log("\n[1/3] MCP Initialize リクエスト送信...");
    // initializeリクエストを送信します
    const initRes = await sendRequest("initialize", {
      // プロトコルバージョンです
      protocolVersion: "2024-11-05",
      // 機能定義です
      capabilities: {},
      // クライアント情報です
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    // 結果を出力します
    console.log("  Initialize 応答:", initRes.result ? "成功" : "失敗");

    // ステップ2の開始ログを出力します
    console.log("\n[2/3] Tools/List リクエスト送信...");
    // ツール一覧取得リクエストを送信します
    const toolsRes = await sendRequest("tools/list", {});
    // ツール一覧配列を取得します
    const tools = toolsRes.result?.tools || [];
    // 公開ツール数を出力します
    console.log(`  公開ツール数: ${tools.length} 件`);
    // ツール名配列を抽出します
    const toolNames = tools.map((t) => t.name);
    // ツール名一覧を出力します
    console.log("  ツール一覧:", toolNames.join(", "));

    // 必須ツール名一覧を定義します
    const expectedTools = [
      "generate_slide_deck",
      "get_slide_deck",
      "insert_slide",
      "update_slide",
      "delete_slide",
      "update_deck_settings",
      "export_to_pdf",
    ];

    // 全必須ツールが含まれるか検査します
    for (const exp of expectedTools) {
      // 不足ツールを検知します
      if (!toolNames.includes(exp)) {
        // 不足エラーをスローします
        throw new Error(`必須ツール ${exp} が公開されていません。`);
      }
    }
    // 検査合格ログを出力します
    console.log("  ✅ 全必須ツール (7種) の公開を確認");

    // ステップ3の開始ログを出力します
    console.log("\n[3/3] export_to_pdf ツール実行テスト (本ワークツリーのスライド)...");
    // export_to_pdfツール呼び出しを送信します
    const exportRes = await sendRequest("tools/call", {
      // ツール名です
      name: "export_to_pdf",
      // 引数オブジェクトです
      arguments: {
        // Markdownファイル相対パスです
        markdownPath: "slides/D01-000001_Marpの使い方/D01-000001_Marpの使い方.md",
      },
    });

    // ツールエラー判定を検査します
    if (exportRes.error || exportRes.result?.isError) {
      // 実行失敗例外をスローします
      throw new Error(`export_to_pdf 実行失敗: ${JSON.stringify(exportRes)}`);
    }

    // 実行成功ログを出力します
    console.log("  ✅ export_to_pdf 実行成功:", exportRes.result?.content?.[0]?.text);

    // 完了区切り線を出力します
    console.log("\n========================================================");
    // 合格ログを出力します
    console.log("🎉 本ワークツリー MCP サーバー直接検証 (TEST-ST-007): PASS");
    // 終了区切り線を出力します
    console.log("========================================================");

    // MCPプロセスを停止します
    mcp.kill();
    // 正常終了します
    process.exit(0);
  // 例外捕捉ブロックです
  } catch (err) {
    // エラーログを出力します
    console.error("❌ 検証失敗:", err.message);
    // MCPプロセスを停止します
    mcp.kill();
    // 異常終了します
    process.exit(1);
  }
}

// 検証処理を開始します
run();
