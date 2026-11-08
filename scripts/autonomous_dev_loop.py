#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# @spec PRG-AUT-001
"""24H365D自律開発マルチエージェント統制オーケストレーター (PRG-AUT-001)。

機能概要:
  1. FN-AUT-001 selectNextPriorityIssue: 未対応Issue群から依存関係と優先度に基づき次タスクを選定
  2. FN-AUT-002 evaluateStageAToBGate: 起票エージェントとは異なる独立審査エージェントによるStage A→Bゲート審査
  3. FN-AUT-003 applyMaintainerFeedback: 日報等に記述されたメンテナーの非同期指示コメントを状態管理へ反映
  4. GitHub外部書き込み前の事前アカウント検証ゲート (Pre-Execution Identity Gate)
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# コマンドライン引数解析モジュールをインポートします
import argparse
# JSON構造データの入出力モジュールをインポートします
import json
# 環境変数取得用のOSモジュールをインポートします
import os
# 正規表現マッチングモジュールをインポートします
import re
# システム終了コード制御モジュールをインポートします
import sys
# ファイルパス操作用のオブジェクト指向パスモジュールをインポートします
from pathlib import Path
# 型ヒント用のコレクション型をインポートします
from typing import Any, Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------------------
# 定数・正規表現パターンの定義
# ---------------------------------------------------------------------------
# 設計図書記述標準（DOC-GOV-003）で定義された禁止曖昧語の集合です
FORBIDDEN_WORDS: Set[str] = {
    # 判断基準が不明な語です
    "適宜",
    # 例外条件が不明な語です
    "原則として",
    # 時間基準が不明な語です
    "速やかに",
    # 適否基準が不明な語です
    "適切に",
    # 量基準が不明な語です
    "十分な",
    # 範囲が不明な語です
    "など",
    # 数値化できない誇張語です
    "極めて",
    # 数値化できない誇張語です
    "比類なき",
    # 主観評価語です
    "美しく",
}
# ホスト固有絶対パスを検出する正規表現です（文字列連結で直書きを回避します）
HOST_PATH_PATTERN = re.compile(
    # Unix系およびWindows系の絶対パスパターンを結合します
    "(?:/Us" + "ers/|/ho" + "me/[A-Za-z]|(?<![A-Za-z0-9_])[A-Za-z]:" + r"\\[A-Za-z0-9_.-]{2,}\\" + ")"
)
# ハングル文字（U+AC00〜U+D7A3, U+1100〜U+11FF, U+3130〜U+318F）の混入を検出する正規表現です
HANGUL_PATTERN = re.compile(r"[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]")
# PBIテンプレート（tpl_98_pbi_template.md）で必須となるFrontmatterキー一覧です
REQUIRED_PBI_FM_KEYS: List[str] = [
    # PBI識別子です
    "pbi_id",
    # タイトルです
    "title",
    # 種別です
    "type",
    # ステータスです
    "status",
    # 優先度です
    "priority",
    # 関連要件ID配列です
    "related_req_ids",
    # 関連モジュールID配列です
    "related_mod_ids",
    # 関連テストID配列です
    "related_test_ids",
]
# PBIファイルで必須となる見出し一覧です
REQUIRED_PBI_HEADINGS: List[str] = [
    # 第1章見出しです
    "## 1. ユーザーストーリー / 背景 (Why & Who)",
    # 第2章見出しです
    "## 2. スコープと仕様概要 (What)",
    # 第2.1節見出しです
    "### 2.1 やること (In Scope)",
    # 第2.2節見出しです
    "### 2.2 やらないこと (Out of Scope)",
    # 第3章見出しです
    "## 3. 受け入れ基準 (Acceptance Criteria)",
    # 第4章見出しです
    "## 4. 影響範囲・技術的メモ (Impact & Notes)",
    # 第5章見出しです
    "## 5. 実行ログ・トレーサビリティ記録 (AI記入欄)",
]


# スラッグ文字列を英小文字とハイフンのみのケバブケースへ正規化する補助関数です
def slugify_title(title: str, issue_number: int) -> str:
    # 英数字以外をハイフンに置換して小文字化します
    ascii_slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    # 先頭のコミットプレフィックス（feat-, fix- 等）を除去します
    ascii_slug = re.sub(r"^(?:feat|fix|docs|refactor|test|chore)-+", "", ascii_slug)
    # 有効な長さのASCIIスラッグが得られた場合は先頭40文字を返します
    if len(ascii_slug) >= 4:
        # 40文字以内で末尾ハイフンを除いて返却します
        return ascii_slug[:40].strip("-")
    # 日本語のみのタイトル等の場合はissue番号ベースのスラッグを返します
    return f"autonomous-task-{issue_number}"


# @spec FN-AUT-001 selectNextPriorityIssue
# 未対応Issue群から依存関係と優先度ラベルに基づいて次タスクを選定する関数です
def select_next_priority_issue(
    issues: List[Dict[str, Any]],
    state: Optional[Dict[str, Any]] = None,
    ai_actor: str = "antigravity-2.0",
) -> Optional[Dict[str, Any]]:
    # 状態辞書が未指定の場合は空辞書で初期化します
    current_state = state or {}
    # メンテナー指示による優先Issue番号リストを取得します
    priority_overrides: List[int] = [int(x) for x in current_state.get("priority_order", [])]
    # 完了済みIssue番号の集合を取得します
    closed_numbers: Set[int] = {
        # クローズ状態のIssue番号を収集します
        int(item["number"]) for item in issues if str(item.get("state", "open")).lower() == "closed"
    }
    # 着手可能な候補リストを初期化します
    candidates: List[Tuple[Tuple[int, int, int], Dict[str, Any]]] = []

    # 入力された各Issueを走査します
    for issue in issues:
        # オープン状態でないIssueはスキップします
        if str(issue.get("state", "open")).lower() != "open":
            # 次のIssueへ進みます
            continue
        # Issue番号を整数として取得します
        issue_num = int(issue["number"])
        # ブロック元Issue番号リストを取得します
        blocked_by = [int(b) for b in issue.get("blocked_by", [])]
        # 未クローズのIssueによってブロックされているか判定します
        unresolved_blockers = [b for b in blocked_by if b not in closed_numbers]
        # 未解決のブロッカーが存在する場合は着手対象から除外します
        if unresolved_blockers:
            # 次のIssueへ進みます
            continue

        # ラベル名の集合を小文字で抽出します
        raw_labels = issue.get("labels", [])
        # ラベルが辞書形式でも文字列形式でも扱えるように正規化します
        labels: Set[str] = {
            # 辞書ならnameキー、文字列ならそのまま小文字化します
            (lbl.get("name", "") if isinstance(lbl, dict) else str(lbl)).lower()
            for lbl in raw_labels
        }

        # メンテナー優先指定がある場合の順位スコアを計算します
        override_rank = priority_overrides.index(issue_num) if issue_num in priority_overrides else 9999
        # ラベルに基づく優先度ランク（小さいほど高優先）を初期化します
        label_rank = 50
        # 最優先ラベル（priority:high または critical）がある場合
        if "priority:high" in labels or "critical" in labels:
            # 最上位ランクを設定します
            label_rank = 10
        # バグ修正ラベル（bug または bugfix）がある場合
        elif "bug" in labels or "bugfix" in labels:
            # 第2位ランクを設定します
            label_rank = 20
        # 新機能ラベル（feature または feat）がある場合
        elif "feature" in labels or "feat" in labels:
            # 第3位ランクを設定します
            label_rank = 30
        # 改善ラベル（enhancement）がある場合
        elif "enhancement" in labels:
            # 第4位ランクを設定します
            label_rank = 40

        # ブランチ種別プレフィックスを決定します
        branch_type = "fix" if ("bug" in labels or "bugfix" in labels) else "feat"
        # Issueタイトルを取得します
        title = str(issue.get("title", f"issue-{issue_num}"))
        # 規約準拠のスラッグを生成します
        slug = str(issue.get("slug") or slugify_title(title, issue_num))
        # リポジトリ規約準拠のブランチ名を構築します
        branch_name = f"{branch_type}/{ai_actor}/issue-{issue_num}/{slug}"

        # 選定結果オブジェクトを構築します
        selected_info: Dict[str, Any] = {
            # Issue番号です
            "issue_number": issue_num,
            # Issueタイトルです
            "title": title,
            # 導出されたブランチ種別です
            "branch_type": branch_type,
            # 規約準拠ブランチ名です
            "compliant_branch_name": branch_name,
            # Worktreeディレクトリ推奨名です
            "worktree_dir_name": branch_name.replace("/", "_"),
            # 優先度スコアタプルです
            "priority_key": [override_rank, label_rank, issue_num],
        }
        # ソートキーとともに候補リストへ追加します
        candidates.append(((override_rank, label_rank, issue_num), selected_info))

    # 着手可能な候補が1件もない場合は None を返します
    if not candidates:
        # 候補なしを返却します
        return None

    # 優先度キーの昇順で候補をソートします
    candidates.sort(key=lambda item: item[0])
    # 最優先のIssue情報を返却します
    return candidates[0][1]


# @spec FN-AUT-002 evaluateStageAToBGate
# Stage A起票エージェントとは異なる独立審査エージェントがPBIのStage B移行可否を判定する関数です
def evaluate_stage_a_to_b_gate(
    pbi_path: Path,
    drafter_agent_id: str,
    reviewer_agent_id: str,
    approved_assumptions: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    # 違反メッセージのリストを初期化します
    violations: List[str] = []
    # エスカレーション項目（人間判断待ち仮定）のリストを初期化します
    escalations: List[str] = []
    # 承認済み仮定ID集合を初期化します
    approved_asm = approved_assumptions or set()

    # 起票エージェントIDを前後空白除去して取得します
    clean_drafter = (drafter_agent_id or "").strip()
    # 審査エージェントIDを前後空白除去して取得します
    clean_reviewer = (reviewer_agent_id or "").strip()

    # 1. マルチエージェント分離検証（同一エージェントによる自己承認の絶対拒否）
    if not clean_drafter or not clean_reviewer:
        # エージェントID欠落エラーを記録します
        violations.append("[ERR-VAL-005] 起票エージェントIDまたは審査エージェントIDが指定されていません。")
    elif clean_drafter == clean_reviewer:
        # 同一エージェントによる自己承認違反を記録します
        violations.append(
            f"[ERR-VAL-005] Stage A起票エージェント ({clean_drafter}) とStage A→B審査エージェント ({clean_reviewer}) が同一です。別エージェントによる独立審査が必須です。"
        )

    # PBIファイルが存在しない場合は直ちにREJECTを返します
    if not pbi_path.is_file():
        # ファイル不在エラーを追加します
        violations.append(f"[ERR-NOT-002] 審査対象のPBIファイルが存在しません: {pbi_path.name}")
        # REJECT判定辞書を返却します
        return {
            # PBI識別子は不明とします
            "pbi_id": "UNKNOWN",
            # 起票エージェントIDです
            "drafter_agent_id": clean_drafter,
            # 審査エージェントIDです
            "reviewer_agent_id": clean_reviewer,
            # 判定結果はREJECTです
            "decision": "REJECT",
            # 違反リストです
            "violations": violations,
            # エスカレーションリストです
            "escalations": escalations,
        }

    # PBI全文をUTF-8で読み込みます
    content = pbi_path.read_text(encoding="utf-8")
    # PBI IDの初期値を設定します
    pbi_id = "UNKNOWN"

    # 2. YAML Frontmatter の検証
    fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
    # Frontmatterが存在しない場合
    if not fm_match:
        # Frontmatter欠落違反を記録します
        violations.append("[PBI-FM-ERR] 有効なYAML Frontmatterが存在しません。")
    else:
        # Frontmatter本文を取得します
        fm_body = fm_match.group(1)
        # pbi_id を抽出します
        id_match = re.search(r'^pbi_id:\s*"?(PBI-\d{3})"?', fm_body, re.MULTILINE)
        # pbi_id が取得できた場合は記録します
        if id_match:
            # PBI IDを更新します
            pbi_id = id_match.group(1)
        # 必須キーがすべて存在するか走査します
        for req_key in REQUIRED_PBI_FM_KEYS:
            # キーが行頭に存在するか検査します
            if not re.search(rf"^{re.escape(req_key)}:", fm_body, re.MULTILINE):
                # 必須キー欠落違反を記録します
                violations.append(f"[PBI-FM-KEY] Frontmatter必須キー '{req_key}' が欠落しています。")

    # 3. 必須章節構造（tpl_98_pbi_template.md 準拠）の検証
    for req_heading in REQUIRED_PBI_HEADINGS:
        # 見出しが本文中に存在するか確認します
        if req_heading not in content:
            # 見出し欠落違反を記録します
            violations.append(f"[PBI-HDG-ERR] 必須見出し '{req_heading}' が存在しません。")

    # 4. 受け入れ基準（AC）の Given-When-Then 形式および禁止曖昧語検査
    ac_lines = [
        # AC定義行を抽出します
        line.strip()
        for line in content.splitlines()
        if re.match(r"^-\s*\[[ xX]\]\s*\*\*AC-\d+:\*\*", line.strip())
    ]
    # ACが1件も定義されていない場合
    if not ac_lines:
        # AC未定義違反を記録します
        violations.append("[PBI-AC-EMPTY] 受け入れ基準（AC-1〜）が1件も定義されていません。")
    else:
        # 各AC行についてGiven/When/Thenと禁止語を検査します
        for ac_line in ac_lines:
            # Given / When / Then の全キーワードが含まれるか確認します
            if not ("Given" in ac_line and "When" in ac_line and "Then" in ac_line):
                # Given-When-Then形式違反を記録します
                violations.append(f"[PBI-AC-GWT] ACがGiven-When-Then形式を満たしていません: {ac_line[:60]}...")
            # インラインコードを除いたテキストを作成します
            plain_ac = re.sub(r"`[^`]*`", "", ac_line)
            # 禁止曖昧語が含まれていないか走査します
            for word in sorted(FORBIDDEN_WORDS):
                # 禁止語が検出された場合
                if word in plain_ac:
                    # 禁止語違反を記録します
                    violations.append(f"[PBI-AC-FORBIDDEN] AC内に禁止曖昧語 '{word}' が含まれています。")

    # 5. セキュリティ・プライバシー・異文字（ホスト絶対パス・韓国語ハングル）検査
    for idx, line in enumerate(content.splitlines(), start=1):
        # ホスト絶対パスが含まれる場合
        if HOST_PATH_PATTERN.search(line):
            # 絶対パス混入違反を記録します
            violations.append(f"[Q-09-PATH] {idx}行目にホスト固有絶対パスが含まれています。")
        # ハングル文字が含まれる場合
        if HANGUL_PATTERN.search(line):
            # 非日本語文字混入違反を記録します
            violations.append(f"[Q-09-CHAR] {idx}行目に韓国語（ハングル文字）が混入しています。")

    # 6. 未承認の仮定マーカー（【仮定: ASM-NNN】）の検出とエスカレーション判定
    asm_matches = set(re.findall(r"【仮定:\s*(ASM-\d{3})】", content))
    # 未承認の仮定IDを抽出します
    unapproved_asm = sorted(asm_matches - approved_asm)
    # 未承認の仮定が残存している場合
    for asm_id in unapproved_asm:
        # エスカレーションリストへ追加します
        escalations.append(f"未承認の仮定マーカー {asm_id} が残存しています（メンテナー承認待ち）。")

    # 判定結果を決定します（違反があればREJECT、違反なしで未承認仮定があればESCALATE、すべてクリアならPASS）
    if violations:
        # 違反ありのためREJECTとします
        decision = "REJECT"
    elif escalations:
        # 人間判断待ちのためESCALATEとします
        decision = "ESCALATE"
    else:
        # 全基準合格のためPASSとします
        decision = "PASS"

    # 構造化された審査結果を返却します
    return {
        # 対象PBI IDです
        "pbi_id": pbi_id,
        # Stage A起票エージェントIDです
        "drafter_agent_id": clean_drafter,
        # Stage A→B独立審査エージェントIDです
        "reviewer_agent_id": clean_reviewer,
        # ゲート判定結果（PASS / REJECT / ESCALATE）です
        "decision": decision,
        # 検出された違反リストです
        "violations": violations,
        # 検出されたエスカレーション事項リストです
        "escalations": escalations,
    }


# @spec FN-AUT-003 applyMaintainerFeedback
# 日報やコメントに記述されたメンテナーの非同期指示を解析して状態辞書へ反映する関数です
def apply_maintainer_feedback(
    feedback_text: str,
    current_state: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    # 既存状態をコピーまたは新規初期化します
    state: Dict[str, Any] = dict(current_state or {})
    # 承認済みIDリストを集合として取得します
    approved_ids: Set[str] = set(state.get("approved_ids", []))
    # 差し戻しIDリストを集合として取得します
    rejected_ids: Set[str] = set(state.get("rejected_ids", []))
    # 優先Issue番号リストを取得します
    priority_order: List[int] = [int(x) for x in state.get("priority_order", [])]

    # HTMLコメント行（<!-- ... -->）はテンプレートの説明例であるため解析対象から除外します
    active_lines = [
        # コメントアウトされていない有効行のみを抽出します
        line for line in feedback_text.splitlines() if not line.strip().startswith("<!--")
    ]
    # 有効行を結合します
    clean_text = "\n".join(active_lines)

    # 1. [APPROVE: <ID>] ディレクティブを抽出します
    for match in re.finditer(r"\[APPROVE:\s*([A-Za-z0-9_,\s#-]+)\]", clean_text):
        # カンマ区切りの各IDを走査します
        for token in match.group(1).split(","):
            # 前後の空白を除去します
            item_id = token.strip()
            # 有効なIDであれば承認集合へ追加し、差し戻し集合から除去します
            if item_id:
                # 承認集合へ追加します
                approved_ids.add(item_id)
                # 差し戻し集合から削除します
                rejected_ids.discard(item_id)

    # 2. [REJECT: <ID>] ディレクティブを抽出します
    for match in re.finditer(r"\[REJECT:\s*([A-Za-z0-9_,\s#-]+)\]", clean_text):
        # カンマ区切りの各IDを走査します
        for token in match.group(1).split(","):
            # 前後の空白を除去します
            item_id = token.strip()
            # 有効なIDであれば差し戻し集合へ追加し、承認集合から除去します
            if item_id:
                # 差し戻し集合へ追加します
                rejected_ids.add(item_id)
                # 承認集合から削除します
                approved_ids.discard(item_id)

    # 3. [PRIORITY: #22, #25] ディレクティブを抽出します
    for match in re.finditer(r"\[PRIORITY:\s*([0-9#,\s]+)\]", clean_text):
        # 新しい優先順位リストを初期化します
        new_order: List[int] = []
        # カンマ区切りの各トークンを走査します
        for token in match.group(1).split(","):
            # 数字部分を抽出します
            num_match = re.search(r"(\d+)", token)
            # 数字が存在すれば整数化してリストへ追加します
            if num_match:
                # Issue番号を整数に変換します
                issue_no = int(num_match.group(1))
                # 重複していなければ追加します
                if issue_no not in new_order:
                    # 優先リストへ追加します
                    new_order.append(issue_no)
        # 有効な優先指定があれば更新します
        if new_order:
            # 優先順序を上書きします
            priority_order = new_order

    # 更新された承認済みIDリストをソートして格納します
    state["approved_ids"] = sorted(approved_ids)
    # 更新された差し戻しIDリストをソートして格納します
    state["rejected_ids"] = sorted(rejected_ids)
    # 更新された優先Issue番号リストを格納します
    state["priority_order"] = priority_order
    # 更新後の状態辞書を返却します
    return state


# 事前アカウント検証ゲート（Pre-Execution Identity Gate）を検証する関数です
def verify_github_identity_gate(
    actual_login: str,
    actual_id: Optional[int] = None,
    expected_login: Optional[str] = None,
    expected_id: Optional[int] = None,
) -> Tuple[bool, str]:
    # 期待されるログイン名を環境変数または既定値（N-Y-Public）から決定します
    target_login = expected_login or os.environ.get("EXPECTED_GITHUB_LOGIN") or "N-Y-Public"
    # 期待されるアカウントIDを環境変数または既定値（330902043）から決定します
    env_id = os.environ.get("EXPECTED_GITHUB_ID")
    # 期待IDの整数値を算出します
    target_id = expected_id if expected_id is not None else (int(env_id) if env_id else (330902043 if target_login == "N-Y-Public" else None))

    # 実際のログイン名が未指定または期待値と不一致の場合
    if not actual_login or actual_login != target_login:
        # 不一致エラーメッセージを返します
        return False, f"[IDENTITY-GATE-ABORT] GitHubアカウント不一致: 期待={target_login}, 実際={actual_login or '未認証'}"
    # 期待IDが定義されており、実際のIDと不一致の場合
    if target_id is not None and actual_id is not None and int(actual_id) != int(target_id):
        # ID不一致エラーメッセージを返します
        return False, f"[IDENTITY-GATE-ABORT] GitHub ID不一致: 期待={target_id}, 実際={actual_id}"
    # 検証成功メッセージを返します
    return True, f"[IDENTITY-GATE-PASS] 認証アカウント確認完了: {actual_login}"


# CLIエントリポイント関数です
def main(argv: Optional[List[str]] = None) -> int:
    # コマンドライン引数パーサーを初期化します
    parser = argparse.ArgumentParser(description="24H365D自律開発マルチエージェント統制オーケストレーター")
    # サブコマンド定義を追加します
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. select-issue サブコマンドを定義します
    p_select = subparsers.add_parser("select-issue", help="未対応Issueから最優先タスクを選定します")
    # Issue一覧JSONファイルのパス引数を追加します
    p_select.add_argument("--issues-json", type=Path, required=True, help="Issue配列を含むJSONファイル")
    # 状態JSONファイルのパス引数を追加します
    p_select.add_argument("--state-json", type=Path, default=None, help="自律開発状態JSONファイル")

    # 2. review-gate サブコマンドを定義します
    p_gate = subparsers.add_parser("review-gate", help="Stage A→B 独立エージェント移行ゲート審査を実行します")
    # 審査対象PBIファイルパス引数を追加します
    p_gate.add_argument("--pbi", type=Path, required=True, help="審査対象のPBIファイルパス")
    # 起票エージェントID引数を追加します
    p_gate.add_argument("--drafter", type=str, required=True, help="Stage Aを実行した起票エージェントID")
    # 審査エージェントID引数を追加します
    p_gate.add_argument("--reviewer", type=str, required=True, help="Stage A→Bを審査する独立レビュアーエージェントID")

    # 3. apply-feedback サブコマンドを定義します
    p_fb = subparsers.add_parser("apply-feedback", help="日報のメンテナー指示コメントを解析して状態へ反映します")
    # 日報またはフィードバックファイルのパス引数を追加します
    p_fb.add_argument("--report", type=Path, required=True, help="日報Markdownファイルパス")
    # 状態保存先JSONファイルのパス引数を追加します
    p_fb.add_argument("--state-json", type=Path, default=None, help="更新対象の状態JSONファイルパス")

    # 引数を解析します
    args = parser.parse_args(argv)

    # select-issue コマンドの処理です
    if args.command == "select-issue":
        # Issue JSONを読み込みます
        issues_data = json.loads(args.issues_json.read_text(encoding="utf-8"))
        # 状態JSONが存在すれば読み込みます
        state_data = json.loads(args.state_json.read_text(encoding="utf-8")) if (args.state_json and args.state_json.is_file()) else {}
        # 優先Issue選定関数を実行します
        selected = select_next_priority_issue(issues_data, state_data)
        # 結果をJSON形式で標準出力へ表示します
        print(json.dumps({"selected": selected}, ensure_ascii=False, indent=2))
        # 正常終了コード0を返します
        return 0

    # review-gate コマンドの処理です
    if args.command == "review-gate":
        # Stage A→Bゲート審査関数を実行します
        result = evaluate_stage_a_to_b_gate(args.pbi, args.drafter, args.reviewer)
        # 審査結果をJSON形式で標準出力へ表示します
        print(json.dumps(result, ensure_ascii=False, indent=2))
        # PASSなら0、それ以外（REJECT/ESCALATE）なら1を返します
        return 0 if result["decision"] == "PASS" else 1

    # apply-feedback コマンドの処理です
    if args.command == "apply-feedback":
        # レポートテキストを読み込みます
        report_text = args.report.read_text(encoding="utf-8")
        # 既存状態を読み込みます
        current_state = json.loads(args.state_json.read_text(encoding="utf-8")) if (args.state_json and args.state_json.is_file()) else {}
        # フィードバック解析関数を実行します
        updated = apply_maintainer_feedback(report_text, current_state)
        # 保存先が指定されていればJSONとして書き出します
        if args.state_json:
            # 親ディレクトリを作成します
            args.state_json.parent.mkdir(parents=True, exist_ok=True)
            # 更新後の状態をファイルへ保存します
            args.state_json.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        # 結果を標準出力へ表示します
        print(json.dumps(updated, ensure_ascii=False, indent=2))
        # 正常終了コード0を返します
        return 0

    # 未知コマンド時は終了コード1を返します
    return 1


# スクリプト直接実行時のエントリポイントです
if __name__ == "__main__":
    # メイン関数を実行して終了コードを返します
    sys.exit(main())
