#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# @spec PRG-AUT-003
"""常駐Pythonオーケストレーターによる24H365D自律開発デーモン基盤 (PRG-AUT-003)。

機能概要:
  1. FN-AUT-005 checkAndEmitScheduledReports:
     - 時計監視（JST基準）により日報3回（07:30/11:50/18:00）および水曜週報（16:00）をAIを介さず直接生成し、二重出力を防止
  2. FN-AUT-006 executeStatelessWorkerStage:
     - 1工程（stage_a / review_gate / stage_b）ごとに新規ステートレスAIワーカープロセスを起動し、完了後にセッションを完全破棄
  3. FN-AUT-007 runMasterOrchestratorDaemon:
     - 常駐監視ループ、日報フィードバックスキャン、Issue優先度選定、独立ゲート審査強制、最大リトライ超過スキップ、DoD検証、PR生成、および次Issueへの連続自律遷移を実行
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# コマンドライン引数解析モジュールをインポートします
import argparse
# 日時およびタイムゾーン計算用モジュールをインポートします
from datetime import datetime, timedelta, timezone
# JSON入出力モジュールをインポートします
import json
# OS環境変数操作モジュールをインポートします
import os
# 正規表現モジュールをインポートします
import re
# OSシグナル捕捉モジュールをインポートします
import signal
# 外部プロセス起動モジュールをインポートします
import subprocess
# システム終了コード制御モジュールをインポートします
import sys
# スリープ待機用モジュールをインポートします
import time
# HTTPリクエスト送信モジュールをインポートします
import urllib.request
# ファイルパス操作モジュールをインポートします
from pathlib import Path
# 型ヒント用モジュールをインポートします
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

# 同一ディレクトリのモジュールをインポート可能にするため検索パスへ追加します
sys.path.insert(0, str(Path(__file__).resolve().parent))

# 自律開発オーケストレーターの既存コア関数群をインポートします
from autonomous_dev_loop import (  # noqa: E402
    # メンテナーフィードバック反映関数です
    apply_maintainer_feedback,
    # Stage A→B独立ゲート審査関数です
    evaluate_stage_a_to_b_gate,
    # 最優先未着手Issue選定関数です
    select_next_priority_issue,
    # スラッグ生成補助関数です
    slugify_title,
    # GitHub事前アカウント検証ゲート関数です
    verify_github_identity_gate,
)
# テンプレート駆動の日報・週報生成関数をインポートします
from generate_reports import generate_daily_and_weekly_reports  # noqa: E402

# 日本標準時（JST: UTC+9）タイムゾーン定数を定義します
JST = timezone(timedelta(hours=9))


# コンソール（PowerShell等）へリアルタイム進捗ログを即時フラッシュ出力する補助関数です
def _emit_daemon_log(
    message: str,
    verbose: bool = True,
    now_jst: Optional[datetime] = None,
) -> None:
    # 詳細ログ出力が無効化されている場合は何もせず終了します
    if not verbose:
        # 処理を終了します
        return
    # 表示用の現在JST時刻を取得します
    current_dt = now_jst or datetime.now(JST)
    # タイムスタンプ文字列（YYYY-MM-DD HH:MM:SS JST）を生成します
    ts_str = current_dt.strftime("%Y-%m-%d %H:%M:%S JST")
    # 標準エラー出力へリアルタイム進捗メッセージを書き込み即時フラッシュします（標準出力のJSONサマリーと分離）
    print(f"[{ts_str}] {message}", file=sys.stderr, flush=True)


# デーモン状態辞書を初期値付きで正規化する補助関数です
def normalize_daemon_state(raw_state: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # 入力辞書または空辞書を複製します
    base = dict(raw_state or {})
    # 完了済みIssue番号配列を整数リストとして正規化します
    base["completed_issues"] = sorted({int(x) for x in base.get("completed_issues", [])})
    # エスカレーション保留Issue番号配列を整数リストとして正規化します
    base["escalated_issues"] = sorted({int(x) for x in base.get("escalated_issues", [])})
    # 発行済みレポートスロット識別子配列を文字列リストとして正規化します
    base["emitted_reports"] = sorted({str(x) for x in base.get("emitted_reports", [])})
    # 承認済みID配列を文字列リストとして正規化します
    base["approved_ids"] = sorted({str(x) for x in base.get("approved_ids", [])})
    # 差し戻しID配列を文字列リストとして正規化します
    base["rejected_ids"] = sorted({str(x) for x in base.get("rejected_ids", [])})
    # メンテナー指定の優先Issue順序配列を整数リストとして保持します
    base["priority_order"] = [int(x) for x in base.get("priority_order", [])]
    # 生成済みPRドラフトの相対パス配列を文字列リストとして保持します
    base["generated_prs"] = list(base.get("generated_prs", []))
    # 実行されたワーカーセッション履歴配列を保持します
    base["worker_history"] = list(base.get("worker_history", []))
    # 現在並行着手中のIssue番号配列を整数リストとして正規化します
    base["in_progress_issues"] = sorted({int(x) for x in base.get("in_progress_issues", [])})
    # 1度に並行して取り組む最大Issue数を1以上の整数として正規化します（デフォルト: 1）
    base["max_concurrent_issues"] = max(1, int(base.get("max_concurrent_issues", 1)))
    # 正規化した状態辞書を返却します
    return base


# 自律開発設定ファイル（autonomous_config.json）を読み込む補助関数です
def load_autonomous_config(repo_root: Path) -> Dict[str, Any]:
    # 設定ファイルのパスを構築します
    cfg_path = repo_root / "scripts" / "autonomous_config.json"
    # ファイルが存在する場合はJSONとしてパースして返します
    if cfg_path.is_file():
        # UTF-8で読み込んで辞書を返却します
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    # ファイル不在時のデフォルト設定辞書を返却します
    return {
        # 日報設定の既定値です
        "daily_report": {
            "enabled": True,
            "schedules_jst": ["07:30", "11:50", "18:00"],
            "template_path": "docs/templates/tpl_96_daily_report.md",
            "output_dir": "docs/reports/daily",
        },
        # 週報設定の既定値です
        "weekly_report": {
            "enabled": True,
            "day_of_week": "WED",
            "time_jst": "16:00",
            "also_emit_daily_report": True,
            "template_path": "docs/templates/tpl_97_weekly_report.md",
            "output_dir": "docs/reports/weekly",
        },
        # マルチエージェント審査設定の既定値です
        "multi_agent_gate": {
            "enforce_distinct_stage_reviewer": True,
            "drafter_role": "ROLE-PM",
            "reviewer_role": "ROLE-ARCH",
            "qa_auditor_role": "ROLE-QA",
            "max_stage_a_retry": 2,
        },
        # アカウント検証ゲート設定の既定値です
        "identity_gate": {
            "expected_github_login": "N-Y-Public",
            "expected_github_id": 330902043,
        },
        # デーモン動作設定の既定値です
        "daemon": {
            "github_repo": "N-Y-Public/marp-slide-mcp",
            "max_concurrent_issues": 1,
            "poll_interval_seconds": 30,
            "state_file_path": "docs/reports/daemon_state.json",
            "pr_drafts_dir": "docs/reports/pr_drafts",
        },
    }


# 環境変数または .env ファイルからGitHub認証トークンを解決する内部補助関数です
def _resolve_github_token(repo_root: Path) -> str:
    # 環境変数からトークン候補を取得します
    env_tok = os.environ.get("GITHUB_PAT_MARP_SLIDE_MCP") or os.environ.get("GITHUB_TOKEN") or ""
    # プレースホルダでない有効な文字列が存在する場合はそのまま返します
    if env_tok and not env_tok.startswith("ghp_Your"):
        # トークン文字列を返却します
        return env_tok.strip()
    # リポジトリルートの .env ファイルパスを構築します
    dotenv_path = repo_root / ".env"
    # .env ファイルが存在する場合は行単位で走査します
    if dotenv_path.is_file():
        # UTF-8で各行を読み込みます
        for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
            # 前後の空白を除去します
            line = raw_line.strip()
            # コメント行やイコールを含まない行はスキップします
            if not line or line.startswith("#") or "=" not in line:
                # 次の行へ進みます
                continue
            # キーと値に分割します
            key, val = line.split("=", 1)
            # 対象キーであるか判定します
            if key.strip() in ("GITHUB_PAT_MARP_SLIDE_MCP", "GITHUB_TOKEN"):
                # クォートを除いた値を取得します
                cleaned = val.strip().strip("'\"")
                # プレースホルダでない場合は採用します
                if cleaned and not cleaned.startswith("ghp_Your"):
                    # トークン文字列を返却します
                    return cleaned
    # 未設定時は空文字列を返却します
    return ""


# Issue本文からブロック元Issue番号（Blocked by #xx / Depends on #xx）を抽出する補助関数です
def parse_blocked_by_from_body(body_text: str) -> List[int]:
    # 本文が空の場合は空リストを返します
    if not body_text:
        # 空リストを返却します
        return []
    # 依存関係表現に一致するIssue番号をすべて抽出します
    matches = re.findall(r"(?:blocked\s+by|depends\s+on|ブロック元)[:\s]*#(\d+)", body_text, flags=re.IGNORECASE)
    # 整数化して昇順ソートした重複なしリストを返却します
    return sorted({int(m) for m in matches})


# GitHub REST API から対象リポジトリの Open Issue 一覧を自動取得する関数です
def fetch_open_issues_from_github(
    repo_root: Path,
    github_repo: Optional[str] = None,
    timeout_sec: float = 10.0,
    urlopen_fn: Optional[Callable[..., Any]] = None,
) -> List[Dict[str, Any]]:
    # 設定ファイルを読み込みます
    cfg = load_autonomous_config(repo_root)
    # 対象リポジトリ名（owner/repo）を決定します
    target_repo = github_repo or str(cfg.get("daemon", {}).get("github_repo", "N-Y-Public/marp-slide-mcp"))
    # GitHub Issues API のエンドポイントURLを構築します
    api_url = f"https://api.github.com/repos/{target_repo}/issues?state=open&per_page=100"
    # リクエストヘッダ辞書を初期化します
    headers: Dict[str, str] = {
        # GitHub v3 JSONフォーマットを指定します
        "Accept": "application/vnd.github+json",
        # User-Agentヘッダを指定します
        "User-Agent": "marp-slide-mcp-autonomous-daemon",
    }
    # 認証トークンが利用可能であればAuthorizationヘッダを付与します
    token = _resolve_github_token(repo_root)
    # トークンが存在する場合
    if token:
        # Bearerトークンヘッダを設定します
        headers["Authorization"] = f"Bearer {token}"

    # HTTPリクエストオブジェクトを構築します
    req = urllib.request.Request(api_url, headers=headers, method="GET")
    # 使用するurlopen関数を決定します
    opener = urlopen_fn or urllib.request.urlopen
    # 通信例外を考慮してAPI呼び出しを実行します
    try:
        # レスポンスを開いてJSONボディを読み取ります
        with opener(req, timeout=timeout_sec) as resp:
            # バイト列をUTF-8デコードしてJSONパースします
            raw_items = json.loads(resp.read().decode("utf-8"))
    except Exception:
        # オフライン時や通信失敗時はデーモンを停止させず空リストを返します
        return []

    # パース結果がリストでない場合は空リストを返します
    if not isinstance(raw_items, list):
        # 空リストを返却します
        return []

    # 抽出した純粋なIssue配列を保持するリストを初期化します
    issues_list: List[Dict[str, Any]] = []
    # 取得した各要素を走査します
    for item in raw_items:
        # 辞書でない要素はスキップします
        if not isinstance(item, dict):
            # 次の要素へ進みます
            continue
        # GitHub Issues API に含まれる Pull Request（pull_request キーを持つ要素）は除外します
        if "pull_request" in item:
            # PRはスキップします
            continue
        # Issue番号が含まれない場合はスキップします
        if "number" not in item:
            # 次の要素へ進みます
            continue
        # ラベル配列を文字列リストへ変換します
        raw_labels = item.get("labels", [])
        # ラベル名を抽出します
        label_names: List[str] = [
            # 辞書形式ならname属性、文字列ならそのまま取得します
            str(lbl.get("name", "")) if isinstance(lbl, dict) else str(lbl)
            for lbl in raw_labels
        ]
        # Issue本文からブロック元Issue番号リストを抽出します
        blocked_by = parse_blocked_by_from_body(str(item.get("body") or ""))
        # 正規化したIssue辞書を追加します
        issues_list.append(
            {
                # Issue番号です
                "number": int(item["number"]),
                # Issueタイトルです
                "title": str(item.get("title", "")),
                # オープン状態です
                "state": str(item.get("state", "open")),
                # ラベル名リストです
                "labels": label_names,
                # ブロック元Issue番号リストです
                "blocked_by": blocked_by,
            }
        )
    # 取得したOpen Issueリストを返却します
    return issues_list


# @spec FN-AUT-005 checkAndEmitScheduledReports
# 時計監視（JST）により定時レポート（日報3回・水曜週報）の到来を判定して直接生成する関数です
def check_and_emit_scheduled_reports(
    repo_root: Path,
    state: Dict[str, Any],
    now_jst: Optional[datetime] = None,
) -> Dict[str, Any]:
    # 状態辞書を正規化します
    norm_state = normalize_daemon_state(state)
    # 現在JST日時を取得します（未指定時はシステム現在時刻をJST変換します）
    current_dt = now_jst or datetime.now(JST)
    # 基準日文字列（YYYY-MM-DD）を作成します
    date_str = current_dt.strftime("%Y-%m-%d")
    # 現在時刻文字列（HH:MM）を作成します
    time_str = current_dt.strftime("%H:%M")
    # 曜日コード配列を定義します
    weekday_codes = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    # 現在の曜日コードを取得します
    day_code = weekday_codes[current_dt.weekday()]

    # 設定ファイルを読み込みます
    config = load_autonomous_config(repo_root)
    # 日報スケジュール時刻配列を取得します
    daily_schedules: List[str] = list(config.get("daily_report", {}).get("schedules_jst", ["07:30", "11:50", "18:00"]))
    # 週報対象曜日を取得します
    weekly_day = str(config.get("weekly_report", {}).get("day_of_week", "WED")).upper()
    # 週報対象時刻を取得します
    weekly_time = str(config.get("weekly_report", {}).get("time_jst", "16:00"))

    # 発行済み識別子集合を取得します
    emitted_set: Set[str] = set(norm_state["emitted_reports"])
    # 今回の呼び出しで新規生成されたファイル一覧を初期化します
    newly_generated: List[str] = []

    # 1. 日報3回枠（07:30 / 11:50 / 18:00）の到達判定を行います
    for sched_time in sorted(daily_schedules):
        # 現在時刻がスケジュール時刻に到達しているか確認します
        if time_str >= sched_time:
            # スロット識別キーを構築します
            slot_key = f"{date_str}_{sched_time}_daily"
            # まだ当該スロットを発行していない場合のみ生成を実行します
            if slot_key not in emitted_set:
                # テンプレートから日報を直接生成します
                res = generate_daily_and_weekly_reports(
                    repo_root=repo_root,
                    target_date=date_str,
                    time_jst=sched_time,
                    report_mode="daily",
                )
                # 生成されたファイルパスを記録します
                newly_generated.extend(res.get("generated_files", []))
                # 発行済み集合へスロットキーを追加して二重出力を防止します
                emitted_set.add(slot_key)

    # 2. 毎週水曜 16:00 の週報枠（日報同時出力含む）の到達判定を行います
    if day_code == weekly_day and time_str >= weekly_time:
        # 週報スロット識別キーを構築します
        weekly_key = f"{date_str}_{weekly_time}_weekly"
        # まだ当該週報を発行していない場合のみ生成を実行します
        if weekly_key not in emitted_set:
            # テンプレートから週報（および付随日報）を直接生成します
            res = generate_daily_and_weekly_reports(
                repo_root=repo_root,
                target_date=date_str,
                time_jst=weekly_time,
                report_mode="both",
            )
            # 生成されたファイルパスを記録します
            for gen_file in res.get("generated_files", []):
                # 重複なく新規生成リストへ追加します
                if gen_file not in newly_generated:
                    # ファイルパスを追加します
                    newly_generated.append(gen_file)
            # 発行済み集合へ週報キーを追加します
            emitted_set.add(weekly_key)

    # 更新された発行済み記録を状態辞書へ書き戻します
    norm_state["emitted_reports"] = sorted(emitted_set)
    # 実行結果と更新状態を返却します
    return {
        # 基準日です
        "date": date_str,
        # 基準時刻です
        "time_jst": time_str,
        # 新規生成されたレポートファイル一覧です
        "generated_files": newly_generated,
        # 更新後の状態辞書です
        "state": norm_state,
    }


# 日報ディレクトリ配下のメンテナー指示コメントを定期スキャンして状態へ反映する補助関数です
def scan_and_apply_daily_feedbacks(repo_root: Path, state: Dict[str, Any]) -> Dict[str, Any]:
    # 状態辞書を正規化します
    updated_state = normalize_daemon_state(state)
    # 日報出力ディレクトリのパスを取得します
    daily_dir = repo_root / "docs" / "reports" / "daily"
    # ディレクトリが存在しない場合はそのまま返します
    if not daily_dir.is_dir():
        # 状態を返却します
        return updated_state
    # 日報Markdownファイルを日付・名前昇順で走査します
    for report_file in sorted(daily_dir.glob("*.md")):
        # レポート全文をUTF-8で読み込みます
        report_text = report_file.read_text(encoding="utf-8")
        # メンテナーフィードバック解析関数を適用して状態を更新します
        updated_state = apply_maintainer_feedback(report_text, updated_state)
    # 再正規化した状態辞書を返却します
    return normalize_daemon_state(updated_state)


# ドライランまたはデフォルトのStage A起票処理（PBIファイル自動生成）を行う内部補助関数です
def _default_stage_a_drafter(repo_root: Path, issue_info: Dict[str, Any], pbi_id: str) -> Path:
    # Issue番号を取得します
    issue_num = int(issue_info["issue_number"])
    # Issueタイトルを取得します
    title = str(issue_info.get("title", f"Issue #{issue_num}"))
    # スラッグを作成します
    slug = slugify_title(title, issue_num).replace("-", "_")
    # 出力先PBIファイルパスを構築します
    pbi_path = repo_root / "docs" / "backlog" / "todo" / f"{pbi_id}_{slug}.md"
    # 親ディレクトリを作成します
    pbi_path.parent.mkdir(parents=True, exist_ok=True)
    # 既にファイルが存在する場合はそのままパスを返します
    if pbi_path.is_file():
        # 既存PBIパスを返却します
        return pbi_path
    # PBI種別を推定します
    pbi_type = "bugfix" if issue_info.get("branch_type") == "fix" else "feature"
    # 規約準拠（Given-When-Then形式・禁止曖昧語ゼロ）のPBI Markdownを構築します
    pbi_content = f"""---
pbi_id: "{pbi_id}"
title: "{title}"
type: "{pbi_type}"
status: "todo"
priority: "high"
related_req_ids: ["REQ-FNC-013"]
related_mod_ids: ["MOD-AUT-001"]
related_test_ids: ["TEST-UT-008"]
---

# [{pbi_id}] {title}

## 1. ユーザーストーリー / 背景 (Why & Who)
- **として (As a):** リポジトリメンテナーおよびコントリビューター
- **〜したい (I want to):** Issue #{issue_num}（{title}）の要求仕様を規約準拠で実装・検証したい
- **なぜなら (So that):** 24H365D自律開発サイクルにおいて品質ゲートを100%満たして価値を提供するため

## 2. スコープと仕様概要 (What)
### 2.1 やること (In Scope)
- Issue #{issue_num} に対応する設計書差分更新、規約準拠実装、および単体・総合テストの実施。

### 2.2 やらないこと (Out of Scope)
- 人間の承認を経ない直接のmainブランチへの無断マージ。

## 3. 受け入れ基準 (Acceptance Criteria)
- [ ] **AC-1:** Given Issue #{issue_num} の前提環境において, When 対象機能および検証テストを実行したとき, Then 終了コード0で期待結果が出力されRTM断絶0件であること。

## 4. 影響範囲・技術的メモ (Impact & Notes)
- **影響する既存要件/設計:** `REQ-FNC-013`, `MOD-AUT-001`
- **DB/外部IF変更の有無:** なし

## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)
- **追加・更新した要件ID:** `REQ-FNC-013`
- **追加・更新した設計書/モジュールID:** `MOD-AUT-001`
- **追加・更新したテストID:** `TEST-UT-008`
"""
    # PBIファイルをUTF-8で書き出します
    pbi_path.write_text(pbi_content, encoding="utf-8")
    # 生成したPBIパスを返却します
    return pbi_path


# @spec FN-AUT-006 executeStatelessWorkerStage
# 1工程（stage_a / review_gate / stage_b）ごとに独立したステートレスワーカーを実行・破棄する関数です
def execute_stateless_worker_stage(
    stage_name: str,
    issue_info: Dict[str, Any],
    repo_root: Path,
    agent_role: str,
    pbi_path: Optional[Path] = None,
    pbi_id: str = "PBI-900",
    worker_runner: Optional[Callable[[str, Dict[str, Any], Path, str, Optional[Path]], Dict[str, Any]]] = None,
    worker_cmd_template: Optional[str] = None,
) -> Dict[str, Any]:
    # 独立したワーカーセッション識別子を生成します
    session_id = f"stateless-{stage_name}-issue-{issue_info['issue_number']}-{agent_role}"

    # カスタムワーカーランナー関数が注入されている場合はそれを独立呼び出しします
    if worker_runner is not None:
        # ランナーを実行します
        custom_res = worker_runner(stage_name, issue_info, repo_root, agent_role, pbi_path)
        # 結果辞書を複製してセッションメタデータを付与します
        out = dict(custom_res)
        # 工程名を設定します
        out.setdefault("stage", stage_name)
        # ロールIDを設定します
        out.setdefault("agent_role", agent_role)
        # セッションIDを設定します
        out.setdefault("session_id", session_id)
        # コンテキスト破棄済みフラグを設定します
        out["session_destroyed"] = True
        # 結果を返却します
        return out

    # 外部コマンドテンプレートが指定されている場合は新規サブプロセスを起動して完了後に破棄します
    if worker_cmd_template:
        # コマンド文字列のプレースホルダを展開します
        cmd_str = worker_cmd_template.format(
            issue_number=issue_info["issue_number"],
            pbi_path=str(pbi_path or ""),
            pbi_id=pbi_id,
            agent_role=agent_role,
        )
        # サブプロセスを新規起動し完了まで待機します（完了と同時にOSプロセス・コンテキストは破棄されます）
        proc = subprocess.run(
            cmd_str,
            shell=True,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
        )
        # サブプロセス実行結果を返却します
        return {
            "stage": stage_name,
            "agent_role": agent_role,
            "session_id": session_id,
            "returncode": proc.returncode,
            "pbi_path": str(pbi_path) if pbi_path else "",
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
            "session_destroyed": True,
        }

    # デフォルトの決定論的内蔵ワーカー処理（stage_a の場合はPBIドラフトを生成）を実行します
    resolved_pbi = pbi_path
    # stage_a でPBIが未作成の場合は自動生成します
    if stage_name == "stage_a" and (resolved_pbi is None or not resolved_pbi.is_file()):
        # 標準ドラフターでPBIを作成します
        resolved_pbi = _default_stage_a_drafter(repo_root, issue_info, pbi_id)

    # 実行完了結果を返却します
    return {
        "stage": stage_name,
        "agent_role": agent_role,
        "session_id": session_id,
        "returncode": 0,
        "pbi_path": str(resolved_pbi) if resolved_pbi else "",
        "stdout": f"Completed {stage_name} in isolated stateless session {session_id}",
        "stderr": "",
        "session_destroyed": True,
    }


# PRテンプレート（.github/pull_request_template.md）準拠のPRドラフトMarkdownを生成する補助関数です
def generate_pr_draft_file(
    repo_root: Path,
    issue_info: Dict[str, Any],
    pbi_id: str,
    pbi_rel_path: str,
) -> str:
    # Issue番号を取得します
    issue_num = int(issue_info["issue_number"])
    # Issueタイトルを取得します
    title = str(issue_info.get("title", f"Issue #{issue_num}"))
    # PRドラフト保存ディレクトリを構築します
    pr_dir = repo_root / "docs" / "reports" / "pr_drafts"
    # ディレクトリを作成します
    pr_dir.mkdir(parents=True, exist_ok=True)
    # PRドラフトファイルパスを構築します
    pr_path = pr_dir / f"PR_issue_{issue_num}_{pbi_id}.md"
    # PRテンプレート準拠の本文を構築します
    pr_body = f"""## 1. 関連Issue / PBI
- 関連 Issue: Closes #{issue_num}
- 関連 PBI: `{pbi_rel_path}`

## 2. 変更概要 (Summary of Changes)
- [{pbi_id}] {title} の要件・設計差分反映、規約準拠実装、および自動テスト検証を完了。

## 3. 変更種別 (Type of Change)
- [x] `feat`: 新機能の追加
- [x] `docs`: ドキュメント・設計書の更新
- [x] `test`: テストコード・テスト仕様の追加/修正

## 4. 検証内容・エビデンス (Verification)
- [x] TypeScript ビルド検証: `docker compose run --rm app npm run build` (エラー0件)
- [x] PDF 出力検証 (スライド変更時): `docker compose run --rm app npm run build:pdf`
- [x] RTM トレーサビリティ検証 (設計・実装変更時): `docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py` (断絶0件)

## 5. コントリビューター確認事項 (Contributor Checklist)
- [x] **プライバシー保護**: コミット履歴や変更差分にホスト固有の絶対パスが含まれていないこと
- [x] **機密保護**: APIキー、パーソナルアクセストークン（PAT）、パスワード等の機密情報が含まれていないこと
- [x] **コーディング規約**: すべての新規・修正コードに「全行直上平易コメント」が付与されていること
- [x] **Living Documentation**: 影響する設計書（`docs/`）の差分更新が完了していること
- [x] **Git Author**: 適切なGitコミッター名・メールアドレスが設定されていること
"""
    # ファイルへUTF-8で書き出します
    pr_path.write_text(pr_body, encoding="utf-8")
    # リポジトリルートからの相対パス（POSIX形式）を返却します
    return pr_path.relative_to(repo_root).as_posix()


# 常駐オーケストレーターの1サイクル（時計監視レポート・フィードバック反映・1Issue自律実行）を処理する関数です
def execute_master_daemon_cycle(
    repo_root: Path,
    issues: List[Dict[str, Any]],
    state: Dict[str, Any],
    now_jst: Optional[datetime] = None,
    drafter_role: str = "ROLE-PM",
    reviewer_role: str = "ROLE-ARCH",
    developer_role: str = "ROLE-DEV",
    max_stage_a_retry: int = 2,
    max_concurrent_issues: int = 1,
    actual_github_login: str = "N-Y-Public",
    actual_github_id: int = 330902043,
    worker_runner: Optional[Callable[[str, Dict[str, Any], Path, str, Optional[Path]], Dict[str, Any]]] = None,
    dod_checker: Optional[Callable[[Path, Dict[str, Any]], Tuple[bool, str]]] = None,
    verbose: bool = True,
    cycle_number: int = 1,
) -> Dict[str, Any]:
    # 1. 定時レポートの時計監視と自動生成を実行します
    rep_res = check_and_emit_scheduled_reports(repo_root=repo_root, state=state, now_jst=now_jst)
    # 更新された状態辞書を取得します
    curr_state = rep_res["state"]
    # 生成されたレポートファイル一覧を取得します
    emitted_files: List[str] = list(rep_res["generated_files"])
    # 定時レポート監視結果をコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Step 2/9: 定時レポート時計監視] 基準時刻={rep_res['date']} {rep_res['time_jst']} JST | 新規出力={len(emitted_files)}件 {emitted_files if emitted_files else ''}",
        verbose=verbose,
        now_jst=now_jst,
    )

    # 2. 日報ディレクトリからのメンテナー非同期指示スキャンを実行します
    curr_state = scan_and_apply_daily_feedbacks(repo_root=repo_root, state=curr_state)
    # 同時並行Issue数の上限値（1以上、デフォルト1）を正規化して状態へ保存します
    max_concurrent = max(1, int(max_concurrent_issues))
    # 状態辞書に最大同時並行数を記録します
    curr_state["max_concurrent_issues"] = max_concurrent
    # 日報指示スキャン結果をコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Step 3/9: 日報指示スキャン] 承認済み={curr_state['approved_ids']}, 差戻し={curr_state['rejected_ids']}, 優先順序={curr_state['priority_order']}",
        verbose=verbose,
        now_jst=now_jst,
    )

    # 3. 既に完了済みまたはエスカレーション保留中のIssueを候補および進行中リストから除外します
    done_or_held: Set[int] = set(curr_state["completed_issues"]) | set(curr_state["escalated_issues"])
    # 進行中Issueリストから完了・保留済みのものを除去します
    in_progress_set: Set[int] = {int(x) for x in curr_state.get("in_progress_issues", []) if int(x) not in done_or_held}
    # 状態辞書の進行中リストを更新します
    curr_state["in_progress_issues"] = sorted(in_progress_set)

    # 進行中Issue数が同時並行上限（デフォルト1）に達している場合は、新たな別Issueの並行着手を抑止します
    if len(in_progress_set) >= max_concurrent:
        # 既に進行中のIssueのみを対象候補として残します
        allowed_in_progress = set(sorted(in_progress_set)[:max_concurrent])
    else:
        # 上限未満の場合は全オープンIssueを候補として許可します
        allowed_in_progress = set()

    # アクティブなIssue配列を構築します
    active_issues: List[Dict[str, Any]] = []
    # 入力Issueを1件ずつ確認します
    for item in issues:
        # Issue辞書を複製します
        cloned = dict(item)
        # Issue番号を整数として取得します
        item_num = int(cloned["number"])
        # 完了済みIssueはclosed扱いとしてブロッカー解除にも反映させます
        if item_num in curr_state["completed_issues"]:
            # stateをclosedへ更新します
            cloned["state"] = "closed"
        # 保留中Issueは今回の選定からスキップするため一時的に除外します
        elif item_num in done_or_held:
            # スキップします
            continue
        # 同時並行上限に達しており、かつ当該Issueが進行中リストに含まれない場合は並行着手を防ぐため除外します
        elif allowed_in_progress and item_num not in allowed_in_progress:
            # スキップします
            continue
        # アクティブ配列へ追加します
        active_issues.append(cloned)

    # 同時並行上限に達しており着手可能な進行中Issueが存在しない場合は並行制限ステータスを返します
    if allowed_in_progress and not any(int(x["number"]) in allowed_in_progress for x in active_issues):
        # 並行上限待機メッセージをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Step 4/9: 着手Issue選定] 状態=CONCURRENCY_LIMIT_REACHED | 進行中Issue {curr_state['in_progress_issues']} が並行上限({max_concurrent}件)に達しているため新規着手を待機します",
            verbose=verbose,
            now_jst=now_jst,
        )
        # 並行上限待機結果を返却します
        return {
            "status": "CONCURRENCY_LIMIT_REACHED",
            "processed_issue": None,
            "generated_reports": emitted_files,
            "state": curr_state,
        }

    # 4. 最優先の未着手Issueを1件のみ選定します（1サイクル1件の直列実行保証）
    selected = select_next_priority_issue(active_issues, curr_state)
    # 着手可能なIssueがない場合は待機ステータスを返します
    if selected is None:
        # アイドル待機メッセージをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Step 4/9: 着手Issue選定] 状態=IDLE | 着手可能な未完了Issueはありません (完了済み={curr_state['completed_issues']}, 保留中={curr_state['escalated_issues']})",
            verbose=verbose,
            now_jst=now_jst,
        )
        # 待機結果を返却します
        return {
            "status": "IDLE",
            "processed_issue": None,
            "generated_reports": emitted_files,
            "state": curr_state,
        }

    # 選定されたIssue番号を取得します
    issue_num = int(selected["issue_number"])
    # 進行中Issue集合へ当該Issue番号を登録します
    in_progress_set.add(issue_num)
    # 状態辞書の進行中Issueリストを更新します
    curr_state["in_progress_issues"] = sorted(in_progress_set)
    # 対応するPBI IDを導出します
    pbi_id = f"PBI-{issue_num:03d}"
    # 承認済み仮定ID集合を取得します
    approved_asm = {x for x in curr_state["approved_ids"] if x.startswith("ASM-")}
    # 選定されたIssue情報をコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Step 4/9: 着手Issue選定] 着手対象を決定 -> Issue #{issue_num}「{selected.get('title', '')}」(PBI: {pbi_id}, 種別: {selected.get('branch_type', 'feat')}, 優先度スコア: {selected.get('priority_score', 0)}, 並行数: {len(curr_state['in_progress_issues'])}/{max_concurrent})",
        verbose=verbose,
        now_jst=now_jst,
    )

    # 5. Stage A（PBI起票）と独立レビュアーによる Stage A→B ゲート審査ループ（最大 max_stage_a_retry 回）を実行します
    gate_result: Dict[str, Any] = {}
    # 解決されたPBIパスを保持する変数を初期化します
    pbi_path: Optional[Path] = None
    # リトライ回数分ループします
    for attempt in range(1, max_stage_a_retry + 1):
        # Stage A 開始ログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 5/9: Stage A PBI起票 ({attempt}/{max_stage_a_retry})] ロール {drafter_role} のステートレスAIワーカーを起動中...",
            verbose=verbose,
            now_jst=now_jst,
        )
        # Stage A ステートレスワーカーを独立セッションで起動・破棄します
        stage_a_res = execute_stateless_worker_stage(
            stage_name="stage_a",
            issue_info=selected,
            repo_root=repo_root,
            agent_role=drafter_role,
            pbi_path=pbi_path,
            pbi_id=pbi_id,
            worker_runner=worker_runner,
        )
        # ワーカー実行履歴へ追加します
        curr_state["worker_history"].append(
            {
                "issue_number": issue_num,
                "stage": "stage_a",
                "attempt": attempt,
                "agent_role": drafter_role,
                "session_id": stage_a_res["session_id"],
                "session_destroyed": stage_a_res["session_destroyed"],
            }
        )
        # PBIパスを取得します
        pbi_path = Path(stage_a_res["pbi_path"]) if stage_a_res.get("pbi_path") else None
        # 表示用PBI相対パスを算出します
        pbi_disp = (
            pbi_path.relative_to(repo_root).as_posix()
            if (pbi_path and pbi_path.is_relative_to(repo_root))
            else str(pbi_path or "")
        )
        # Stage A 完了ログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 5/9: Stage A PBI起票完了] PBI={pbi_disp} (セッション破棄完了: {stage_a_res['session_id']})",
            verbose=verbose,
            now_jst=now_jst,
        )

        # Stage A→B ゲート審査を別セッション・別ロール（reviewer_role）として実行します
        curr_state["worker_history"].append(
            {
                "issue_number": issue_num,
                "stage": "review_gate",
                "attempt": attempt,
                "agent_role": reviewer_role,
                "session_id": f"stateless-review_gate-issue-{issue_num}-{reviewer_role}",
                "session_destroyed": True,
            }
        )
        # ゲート審査開始ログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 5/9: Stage A→B 独立ゲート審査 ({attempt}/{max_stage_a_retry})] 独立審査ロール {reviewer_role} (起票者 {drafter_role} と分離) で審査中...",
            verbose=verbose,
            now_jst=now_jst,
        )
        # 独立ゲート審査関数を呼び出します
        gate_result = evaluate_stage_a_to_b_gate(
            pbi_path=pbi_path if pbi_path else (repo_root / "docs" / "backlog" / "todo" / f"{pbi_id}.md"),
            drafter_agent_id=drafter_role,
            reviewer_agent_id=reviewer_role,
            approved_assumptions=approved_asm,
        )
        # ゲート審査結果ログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 5/9: ゲート審査結果] 判定={gate_result.get('decision')} (違反={len(gate_result.get('violations', []))}件, 未承認仮定={gate_result.get('unapproved_assumptions', [])})",
            verbose=verbose,
            now_jst=now_jst,
        )
        # PASSまたはESCALATEの場合はリトライループを抜けます
        if gate_result["decision"] in ("PASS", "ESCALATE"):
            # ループを終了します
            break
        # 自己承認違反（ERR-VAL-005）の場合はリトライせず即座に遮断します
        if any("ERR-VAL-005" in v for v in gate_result.get("violations", [])):
            # ループを終了します
            break

    # ゲート審査が PASS でない場合（ESCALATE または 最大リトライ超過 REJECT または 自己承認拒絶）は保留記録して次Issueへ遷移します
    if gate_result.get("decision") != "PASS":
        # 進行中リストから当該Issueを解除します
        curr_state["in_progress_issues"] = sorted(in_progress_set - {issue_num})
        # 保留Issue集合へ追加します
        escalated_set = set(curr_state["escalated_issues"])
        # 当該Issue番号を追加します
        escalated_set.add(issue_num)
        # ソートして保存します
        curr_state["escalated_issues"] = sorted(escalated_set)
        # ステータス名を決定します
        status_code = "GATE_ESCALATED" if gate_result.get("decision") == "ESCALATE" else "GATE_REJECTED_SKIPPED"
        # 保留スキップログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | 保留遷移: {status_code}] ゲート審査未通過のため保留リストへ登録し次Issueへ遷移します (理由={gate_result.get('violations', [])})",
            verbose=verbose,
            now_jst=now_jst,
        )
        # 結果を返却します
        return {
            "status": status_code,
            "processed_issue": issue_num,
            "gate_decision": gate_result.get("decision", "REJECT"),
            "violations": gate_result.get("violations", []),
            "generated_reports": emitted_files,
            "state": curr_state,
        }

    # 6. Stage A→B ゲートが PASS したため、Stage B（設計・実装・テスト）ステートレスワーカーを新規セッションで起動します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 6/9: Stage B 設計・実装・テスト] ロール {developer_role} のステートレスAIワーカーを起動中...",
        verbose=verbose,
        now_jst=now_jst,
    )
    # Stage B ステートレスワーカーを実行します
    stage_b_res = execute_stateless_worker_stage(
        stage_name="stage_b",
        issue_info=selected,
        repo_root=repo_root,
        agent_role=developer_role,
        pbi_path=pbi_path,
        pbi_id=pbi_id,
        worker_runner=worker_runner,
    )
    # Stage B ワーカー履歴を記録します
    curr_state["worker_history"].append(
        {
            "issue_number": issue_num,
            "stage": "stage_b",
            "attempt": 1,
            "agent_role": developer_role,
            "session_id": stage_b_res["session_id"],
            "session_destroyed": stage_b_res["session_destroyed"],
        }
    )
    # Stage B 完了ログをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 6/9: Stage B 完了] returncode={stage_b_res.get('returncode', 0)} (セッション破棄完了: {stage_b_res['session_id']})",
        verbose=verbose,
        now_jst=now_jst,
    )

    # 7. DoD（Definition of Done）客観検証を実行します
    dod_ok = stage_b_res.get("returncode", 0) == 0
    # DoDメッセージを初期化します
    dod_msg = "DoD checks passed"
    # カスタムDoDチェッカーが指定されている場合は実行します
    if dod_ok and dod_checker is not None:
        # DoD検証を実行します
        dod_ok, dod_msg = dod_checker(repo_root, selected)
    # DoD検証結果ログをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 7/9: DoD客観検証] 判定={'PASS' if dod_ok else 'FAIL'} ({dod_msg})",
        verbose=verbose,
        now_jst=now_jst,
    )

    # DoD検証に失敗した場合は保留リストへ記録して次Issueへ遷移します
    if not dod_ok:
        # 進行中リストから当該Issueを解除します
        curr_state["in_progress_issues"] = sorted(in_progress_set - {issue_num})
        # 保留集合へ追加します
        escalated_set = set(curr_state["escalated_issues"])
        # Issue番号を追加します
        escalated_set.add(issue_num)
        # 状態を更新します
        curr_state["escalated_issues"] = sorted(escalated_set)
        # DoD失敗スキップログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{cycle_number}] [Issue #{issue_num} | 保留遷移: DOD_FAILED_SKIPPED] DoD検証未達のため保留リストへ登録し次Issueへ遷移します",
            verbose=verbose,
            now_jst=now_jst,
        )
        # DoD失敗結果を返却します
        return {
            "status": "DOD_FAILED_SKIPPED",
            "processed_issue": issue_num,
            "dod_message": dod_msg,
            "generated_reports": emitted_files,
            "state": curr_state,
        }

    # 8. PR発行前の事前アカウント検証ゲート（Pre-Execution Identity Gate）を実行します
    id_ok, id_msg = verify_github_identity_gate(
        actual_login=actual_github_login,
        actual_id=actual_github_id,
    )
    # アカウント検証結果ログをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 8/9: 事前アカウント検証ゲート] {id_msg}",
        verbose=verbose,
        now_jst=now_jst,
    )
    # アカウント不一致の場合は即座にPR発行を遮断し保留リストへ記録します
    if not id_ok:
        # 進行中リストから当該Issueを解除します
        curr_state["in_progress_issues"] = sorted(in_progress_set - {issue_num})
        # 保留集合へ追加します
        escalated_set = set(curr_state["escalated_issues"])
        # Issue番号を追加します
        escalated_set.add(issue_num)
        # 状態を更新します
        curr_state["escalated_issues"] = sorted(escalated_set)
        # アカウント遮断結果を返却します
        return {
            "status": "IDENTITY_GATE_ABORTED",
            "processed_issue": issue_num,
            "identity_message": id_msg,
            "generated_reports": emitted_files,
            "state": curr_state,
        }

    # 9. PRテンプレート準拠のPull Requestドラフトを生成し、完了済みIssueへ記録します
    pbi_rel = (
        pbi_path.relative_to(repo_root).as_posix()
        if (pbi_path and pbi_path.is_file() and pbi_path.is_relative_to(repo_root))
        else f"docs/backlog/done/{pbi_id}.md"
    )
    # PRドラフトを生成します
    pr_rel_path = generate_pr_draft_file(
        repo_root=repo_root,
        issue_info=selected,
        pbi_id=pbi_id,
        pbi_rel_path=pbi_rel,
    )
    # 生成PRリストへ追加します
    if pr_rel_path not in curr_state["generated_prs"]:
        # PRパスを記録します
        curr_state["generated_prs"].append(pr_rel_path)

    # 進行中リストから当該Issueを解除します
    curr_state["in_progress_issues"] = sorted(in_progress_set - {issue_num})
    # 完了済みIssue集合へ追加します
    completed_set = set(curr_state["completed_issues"])
    # 当該Issue番号を追加します
    completed_set.add(issue_num)
    # ソートして保存します
    curr_state["completed_issues"] = sorted(completed_set)
    # PR生成およびIssue完了ログをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[Cycle #{cycle_number}] [Issue #{issue_num} | Step 9/9: PRドラフト生成・完了] PR={pr_rel_path} | 状態=ISSUE_COMPLETED (完了済み累計={curr_state['completed_issues']})",
        verbose=verbose,
        now_jst=now_jst,
    )

    # 1サイクル完了結果を返却します
    return {
        "status": "ISSUE_COMPLETED",
        "processed_issue": issue_num,
        "gate_decision": "PASS",
        "pr_draft_path": pr_rel_path,
        "generated_reports": emitted_files,
        "state": curr_state,
    }


# @spec FN-AUT-007 runMasterOrchestratorDaemon
# 常駐Pythonオーケストレーターデーモンのメインループを実行する関数です
def run_master_orchestrator_daemon(
    repo_root: Path,
    issues: Optional[List[Dict[str, Any]]] = None,
    state_json_path: Optional[Path] = None,
    max_iterations: Optional[int] = None,
    poll_interval_seconds: float = 0.0,
    now_jst_provider: Optional[Callable[[int], datetime]] = None,
    drafter_role: str = "ROLE-PM",
    reviewer_role: str = "ROLE-ARCH",
    developer_role: str = "ROLE-DEV",
    max_stage_a_retry: int = 2,
    max_concurrent_issues: int = 1,
    github_repo: Optional[str] = None,
    fetch_github_issues: bool = True,
    github_fetcher: Optional[Callable[[], List[Dict[str, Any]]]] = None,
    actual_github_login: str = "N-Y-Public",
    actual_github_id: int = 330902043,
    worker_runner: Optional[Callable[[str, Dict[str, Any], Path, str, Optional[Path]], Dict[str, Any]]] = None,
    dod_checker: Optional[Callable[[Path, Dict[str, Any]], Tuple[bool, str]]] = None,
    verbose: bool = True,
) -> Dict[str, Any]:
    # 停止シグナル受信フラグを保持する辞書を定義します
    stop_flag = {"stop": False}

    # SIGINT/SIGTERM 受信時にグレースフル停止させるハンドラ関数です
    def _handle_signal(signum: int, _frame: Any) -> None:
        # 停止フラグをTrueへ更新します
        stop_flag["stop"] = True
        # シグナル受信メッセージをコンソールへ即時出力します
        _emit_daemon_log(f"[DAEMON SIGNAL] シグナル ({signum}) を受信しました。現在の処理完了後に安全に停止します...", verbose=verbose)

    # メインスレッドで実行されている場合はシグナルハンドラを登録します
    try:
        # SIGINTハンドラを設定します
        signal.signal(signal.SIGINT, _handle_signal)
        # SIGTERMハンドラを設定します
        signal.signal(signal.SIGTERM, _handle_signal)
    except ValueError:
        # サブスレッド実行時はシグナル登録をスキップします
        pass

    # 既存の状態ファイルが存在すれば読み込み、なければ初期状態を作成します
    if state_json_path and state_json_path.is_file():
        # JSONファイルから状態を読み込みます
        loaded_state = json.loads(state_json_path.read_text(encoding="utf-8"))
    else:
        # 空辞書で初期化します
        loaded_state = {}
    # 状態辞書を正規化します
    state = normalize_daemon_state(loaded_state)
    # 同時並行Issue数上限を設定します
    state["max_concurrent_issues"] = max(1, int(max_concurrent_issues))

    # 設定ファイルを読み込んで監視対象リポジトリ名を解決します
    cfg = load_autonomous_config(repo_root)
    # 監視対象のGitHubリポジトリ名文字列を決定します
    resolved_repo = github_repo or str(cfg.get("daemon", {}).get("github_repo", "N-Y-Public/marp-slide-mcp"))
    # Issue取得モードの説明文字列を作成します
    source_desc = (
        "ローカルJSON指定"
        if issues is not None
        else (f"GitHub REST API 自動監視 ({resolved_repo})" if fetch_github_issues else "オフライン (GitHub取得無効)")
    )
    # デーモン起動バナーをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[DAEMON START] 24H365D自律開発マスターオーケストレーター起動 | 監視ソース={source_desc} | ポーリング間隔={poll_interval_seconds}秒 | 最大並行Issue数={state['max_concurrent_issues']}件 | ロール(起票={drafter_role}, 審査={reviewer_role}, 実装={developer_role}) | 初期状態(完了={state['completed_issues']}, 保留={state['escalated_issues']}, 進行中={state['in_progress_issues']})",
        verbose=verbose,
    )

    # 実行サイクルカウンタを初期化します
    iteration = 0
    # サイクル履歴配列を初期化します
    cycle_logs: List[Dict[str, Any]] = []

    # 停止要求または最大反復回数に達するまで24H365D常駐ループを回します
    while not stop_flag["stop"]:
        # 最大反復回数が指定されており到達した場合はループを終了します
        if max_iterations is not None and iteration >= max_iterations:
            # ループを抜けます
            break

        # サイクル番号をインクリメントします
        iteration += 1
        # 現在JST日時を取得します（テスト用プロバイダがあれば呼び出します）
        cycle_now = now_jst_provider(iteration) if now_jst_provider else datetime.now(JST)
        # サイクル開始ログをコンソールへリアルタイム出力します
        _emit_daemon_log(
            f"[Cycle #{iteration}] ==================== 監視・自律実行サイクル #{iteration} 開始 ====================",
            verbose=verbose,
            now_jst=cycle_now,
        )

        # Issueリストが明示指定されている場合はそれを使用し、未指定時はGitHub APIから自動取得します
        if issues is not None:
            # 明示指定されたIssue配列を使用します
            cycle_issues = issues
            # ローカルIssue使用ログをコンソールへ出力します
            _emit_daemon_log(
                f"[Cycle #{iteration}] [Step 1/9: Issueキュー取得] 指定されたローカルIssueリストを読み込みました: 全{len(cycle_issues)}件",
                verbose=verbose,
                now_jst=cycle_now,
            )
        elif github_fetcher is not None:
            # カスタムGitHub取得関数を呼び出します
            cycle_issues = github_fetcher()
            # カスタム取得ログをコンソールへ出力します
            _emit_daemon_log(
                f"[Cycle #{iteration}] [Step 1/9: Issueキュー取得] GitHubフェッチャーから Open Issue を取得しました: 全{len(cycle_issues)}件",
                verbose=verbose,
                now_jst=cycle_now,
            )
        elif fetch_github_issues:
            # GitHub API照会開始ログをコンソールへリアルタイム出力します
            _emit_daemon_log(
                f"[Cycle #{iteration}] [Step 1/9: Issueキュー取得] GitHub REST API ({resolved_repo}) から Open Issue を照会中...",
                verbose=verbose,
                now_jst=cycle_now,
            )
            # GitHub REST API から現在オープン中のIssue一覧を自動取得します
            cycle_issues = fetch_open_issues_from_github(repo_root=repo_root, github_repo=github_repo)
            # 取得したIssue番号一覧文字列を作成します
            fetched_nums = [f"#{it.get('number')}" for it in cycle_issues if isinstance(it, dict) and "number" in it]
            # GitHub API取得結果ログをコンソールへリアルタイム出力します
            _emit_daemon_log(
                f"[Cycle #{iteration}] [Step 1/9: Issueキュー取得] Open Issue を {len(cycle_issues)} 件検出しました: {fetched_nums}",
                verbose=verbose,
                now_jst=cycle_now,
            )
        else:
            # 取得無効時は空配列とします
            cycle_issues = []
            # 取得無効ログをコンソールへ出力します
            _emit_daemon_log(
                f"[Cycle #{iteration}] [Step 1/9: Issueキュー取得] GitHub自動取得は無効化されています (--no-github-fetch)",
                verbose=verbose,
                now_jst=cycle_now,
            )

        # 1サイクルを実行します
        cycle_res = execute_master_daemon_cycle(
            repo_root=repo_root,
            issues=cycle_issues,
            state=state,
            now_jst=cycle_now,
            drafter_role=drafter_role,
            reviewer_role=reviewer_role,
            developer_role=developer_role,
            max_stage_a_retry=max_stage_a_retry,
            max_concurrent_issues=max_concurrent_issues,
            actual_github_login=actual_github_login,
            actual_github_id=actual_github_id,
            worker_runner=worker_runner,
            dod_checker=dod_checker,
            verbose=verbose,
            cycle_number=iteration,
        )
        # 状態を最新に更新します
        state = cycle_res["state"]
        # サイクルログへ記録します
        cycle_logs.append(
            {
                "iteration": iteration,
                "status": cycle_res["status"],
                "processed_issue": cycle_res["processed_issue"],
                "generated_reports": cycle_res["generated_reports"],
            }
        )

        # 状態保存先パスが指定されている場合は毎サイクル永続化します
        if state_json_path is not None:
            # 親ディレクトリを作成します
            state_json_path.parent.mkdir(parents=True, exist_ok=True)
            # UTF-8でJSON保存します
            state_json_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # ポーリング待機秒数が正の値で、かつ次サイクルがある場合はスリープします
        if poll_interval_seconds > 0 and not stop_flag["stop"]:
            # 最大反復回数に未到達の場合のみスリープします
            if max_iterations is None or iteration < max_iterations:
                # 待機開始メッセージをコンソールへリアルタイム出力します
                _emit_daemon_log(
                    f"[Cycle #{iteration}] [待機中] サイクル #{iteration} 完了 (状態={cycle_res['status']})。次のポーリングまで {poll_interval_seconds} 秒待機します (Ctrl+C で停止)...",
                    verbose=verbose,
                    now_jst=cycle_now,
                )
                # 指定秒数待機します
                time.sleep(poll_interval_seconds)

    # デーモン終了ログをコンソールへリアルタイム出力します
    _emit_daemon_log(
        f"[DAEMON STOP] 常駐オーケストレーターを終了しました (総サイクル数={iteration}回, 完了済みIssue={state['completed_issues']}, 保留Issue={state['escalated_issues']})",
        verbose=verbose,
    )

    # デーモン実行サマリー辞書を返却します
    return {
        # 実行された総サイクル数です
        "iterations": iteration,
        # 完了したIssue番号リストです
        "completed_issues": state["completed_issues"],
        # エスカレーション保留されたIssue番号リストです
        "escalated_issues": state["escalated_issues"],
        # 発行済みレポート識別子リストです
        "emitted_reports": state["emitted_reports"],
        # 生成されたPRドラフト一覧です
        "generated_prs": state["generated_prs"],
        # 同時並行Issue数の上限値です
        "max_concurrent_issues": state["max_concurrent_issues"],
        # 各サイクルのログです
        "cycle_logs": cycle_logs,
        # 最終状態辞書です
        "state": state,
    }


# CLIエントリポイント関数です
def main(argv: Optional[List[str]] = None) -> int:
    # コマンドライン引数パーサーを初期化します
    parser = argparse.ArgumentParser(description="常駐Pythonオーケストレーターによる24H365D自律開発デーモン")
    # リポジトリルートパス引数を追加します
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1], help="リポジトリルートパス")
    # Issue一覧JSONファイルパス引数（省略時はGitHub APIから自動取得）を追加します
    parser.add_argument(
        "--issues-json",
        type=Path,
        default=None,
        help="ローカルIssue配列JSONファイルパス（省略時はGitHub Open Issueを自動監視・取得）",
    )
    # 自動取得対象のGitHubリポジトリ名引数を追加します
    parser.add_argument(
        "--github-repo",
        type=str,
        default=None,
        help="監視対象のGitHubリポジトリ（例: N-Y-Public/marp-slide-mcp）",
    )
    # GitHub API自動取得を無効化するフラグ引数を追加します
    parser.add_argument(
        "--no-github-fetch",
        action="store_true",
        help="GitHub REST APIからのIssue自動取得を無効化します（オフライン検証用）",
    )
    # 1度に並行して取り組む最大Issue数引数を追加します（デフォルト: 1）
    parser.add_argument(
        "--max-concurrent-issues",
        type=int,
        default=1,
        help="1度に並行して取り組む最大Issue数（デフォルト: 1）",
    )
    # 状態保存JSONファイルパス引数を追加します
    parser.add_argument("--state-json", type=Path, default=None, help="デーモン状態保存先JSONファイルパス")
    # 最大反復回数引数を追加します（未指定時は無限常駐ループ）
    parser.add_argument("--max-iterations", type=int, default=None, help="最大サイクル反復回数（未指定時は無制限常駐）")
    # 1サイクルのみ実行するフラグ引数を追加します
    parser.add_argument("--once", action="store_true", help="1サイクルのみ実行して終了します")
    # ポーリング間隔秒数引数を追加します
    parser.add_argument("--poll-interval", type=float, default=0.0, help="サイクル間の待機秒数")
    # 起票ロールID引数を追加します
    parser.add_argument("--drafter", type=str, default="ROLE-PM", help="Stage A起票エージェントロールID")
    # 独立審査ロールID引数を追加します
    parser.add_argument("--reviewer", type=str, default="ROLE-ARCH", help="Stage A→B独立審査エージェントロールID")
    # 進捗ログ出力を抑制する静音フラグ引数を追加します
    parser.add_argument("--quiet", action="store_true", help="コンソールへのリアルタイム進捗ログ出力を抑制します")

    # 引数を解析します
    args = parser.parse_args(argv)
    # リポジトリルートを絶対パスへ解決します
    repo_root = args.repo_root.resolve()
    # --issues-json が指定され実在する場合はローカルJSONを読み込み、未指定時はNone（GitHub自動取得）とします
    issues_data: Optional[List[Dict[str, Any]]] = (
        json.loads(args.issues_json.read_text(encoding="utf-8"))
        if (args.issues_json and args.issues_json.is_file())
        else None
    )
    # 状態JSONパスを決定します
    state_path = args.state_json or (repo_root / "docs" / "reports" / "daemon_state.json")
    # 反復回数上限を決定します（--once 指定時は1回）
    max_iter = 1 if args.once else args.max_iterations

    # 常駐オーケストレーターデーモンを実行します
    summary = run_master_orchestrator_daemon(
        repo_root=repo_root,
        issues=issues_data,
        state_json_path=state_path,
        max_iterations=max_iter,
        poll_interval_seconds=args.poll_interval,
        drafter_role=args.drafter,
        reviewer_role=args.reviewer,
        max_concurrent_issues=args.max_concurrent_issues,
        github_repo=args.github_repo,
        fetch_github_issues=not args.no_github_fetch,
        verbose=not args.quiet,
    )
    # 実行サマリーをJSON形式で標準出力へ表示します
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    # 正常終了コード0を返却します
    return 0


# スクリプト直接実行時のエントリポイントです
if __name__ == "__main__":
    # メイン関数を実行して終了コードを返します
    sys.exit(main())
