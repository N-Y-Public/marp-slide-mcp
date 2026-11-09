#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""24H365D自律開発統制・日報（1日3回）・週報（毎週水曜16:00）テンプレート生成および常駐マスターデーモンの自動検証テスト。

対象テストID:
  - TEST-UT-005: Issue優先度選定、Stage A→B別エージェント審査ゲート、非同期フィードバック解析の単体テスト
  - TEST-ST-011: 日報3枠（07:30/11:50/18:00）および毎週水曜16:00週報テンプレート生成・異文字混入ゼロの総合テスト
  - TEST-UT-008: 常駐マスターオーケストレーターの時計監視レポート、日報指示スキャン、独立ワーカー・審査、最大リトライ超過スキップの単体テスト
  - TEST-ST-014: 常駐マスターオーケストレーターによる複数Issue連続消化・PR生成・取扱説明書スライドPDF整合の総合テスト
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# 日時およびタイムゾーン生成用モジュールをインポートします
from datetime import datetime, timedelta, timezone
# JSON形式データの検証用モジュールをインポートします
import json
# 正規表現モジュールをインポートします
import re
# サブプロセス実行モジュールをインポートします
import subprocess
# モジュール検索パス追加用のsysモジュールをインポートします
import sys
# 一時ディレクトリ生成モジュールをインポートします
import tempfile
# Python標準の単体テストフレームワークをインポートします
import unittest
# ファイルパス操作モジュールをインポートします
from pathlib import Path
# 型ヒント用モジュールをインポートします
from typing import Any, Dict, Optional

# リポジトリルートパスを解決します
REPO_ROOT = Path(__file__).resolve().parents[1]
# scriptsディレクトリをモジュール検索パスへ追加します
sys.path.insert(0, str(REPO_ROOT / "scripts"))

# 常駐マスターオーケストレーターデーモンの検査対象関数群をインポートします
from autonomous_daemon import (  # noqa: E402
    # 日本標準時タイムゾーン定数です
    JST,
    # 時計監視による定時レポート自動生成関数です
    check_and_emit_scheduled_reports,
    # デーモン1サイクル実行関数です
    execute_master_daemon_cycle,
    # ステートレスワーカー単一工程実行関数です
    execute_stateless_worker_stage,
    # GitHub REST APIからのOpen Issue自動取得関数です
    fetch_open_issues_from_github,
    # 常駐オーケストレーターデーモンメインループ関数です
    run_master_orchestrator_daemon,
)
# 自律開発オーケストレーターの検査対象関数群をインポートします
from autonomous_dev_loop import (  # noqa: E402
    # メンテナーフィードバック反映関数です
    apply_maintainer_feedback,
    # Stage A→Bゲート審査関数です
    evaluate_stage_a_to_b_gate,
    # 優先Issue選定関数です
    select_next_priority_issue,
    # GitHub事前アカウント検証ゲート関数です
    verify_github_identity_gate,
)
# 日報・週報テンプレート生成関数をインポートします
from generate_reports import generate_daily_and_weekly_reports  # noqa: E402


# @test TEST-UT-005
# 24H365D自律開発オーケストレーターの単体テストクラスです
class TestAutonomousDevOrchestratorUnit(unittest.TestCase):
    # AC-1: 依存関係と優先度ラベルに基づくIssue選定の検証メソッドです
    def test_select_next_priority_issue_and_branch_naming(self) -> None:
        # テスト用の未対応Issue配列を定義します
        issues = [
            # 高優先だがIssue #20にブロックされているIssue #15です
            {
                "number": 15,
                "title": "Blocked high priority task",
                "state": "open",
                "labels": ["priority:high", "feature"],
                "blocked_by": [20],
            },
            # 通常の機能追加Issue #22です
            {
                "number": 22,
                "title": "feat: 24H365D自律開発が行えるようになりたい。",
                "state": "open",
                "labels": ["feature"],
                "blocked_by": [],
            },
            # ブロックされていない高優先バグ修正Issue #25です
            {
                "number": 25,
                "title": "fix: urgent layout bug",
                "state": "open",
                "labels": ["priority:high", "bugfix"],
                "blocked_by": [],
            },
        ]
        # 優先Issue選定を実行します
        selected = select_next_priority_issue(issues)
        # 選定結果がNoneでないことを確認します
        self.assertIsNotNone(selected)
        # ブロックされていない最高優先のIssue #25が選ばれることを確認します
        self.assertEqual(selected["issue_number"], 25)
        # 規約準拠ブランチ名（fix/antigravity-2.0/issue-25/...）が生成されることを確認します
        self.assertRegex(
            selected["compliant_branch_name"],
            r"^(feat|fix|docs|refactor|test|chore)/[^/]+/issue-\d+/[a-z0-9-]+$",
        )

    # AC-1: Stage A→B移行ゲートにおける同一エージェント自己承認の拒否と別エージェント審査の検証メソッドです
    def test_stage_a_to_b_multi_agent_gate_enforcement(self) -> None:
        # 実在するPBI-019ファイルのパスを取得します
        pbi_path = REPO_ROOT / "docs" / "backlog" / "in_progress" / "PBI-019_24h_autonomous_development_system.md"
        # もし完了移動後の場合はdone配下のパスを参照します
        if not pbi_path.is_file():
            # doneディレクトリのパスを設定します
            pbi_path = REPO_ROOT / "docs" / "backlog" / "done" / "PBI-019_24h_autonomous_development_system.md"

        # 1. 同一エージェントIDによる自己承認を試みた場合（必ずREJECTになること）
        self_review = evaluate_stage_a_to_b_gate(
            pbi_path=pbi_path,
            drafter_agent_id="pbi-drafter-agent",
            reviewer_agent_id="pbi-drafter-agent",
        )
        # 判定結果がREJECTであることを確認します
        self.assertEqual(self_review["decision"], "REJECT")
        # エラーコード ERR-VAL-005 が含まれることを確認します
        self.assertTrue(any("ERR-VAL-005" in v for v in self_review["violations"]))

        # 2. 異なる独立レビュアーエージェントIDで審査した場合（PASSになること）
        distinct_review = evaluate_stage_a_to_b_gate(
            pbi_path=pbi_path,
            drafter_agent_id="pbi-drafter-agent",
            reviewer_agent_id="stage-gate-reviewer-agent",
        )
        # 判定結果がPASSであることを確認します
        self.assertEqual(distinct_review["decision"], "PASS")
        # 違反件数が0件であることを確認します
        self.assertEqual(len(distinct_review["violations"]), 0)

    # AC-3 & AC-4: メンテナーコメント解析および事前アカウント検証ゲートの検証メソッドです
    def test_apply_maintainer_feedback_and_identity_gate(self) -> None:
        # 日報内のメンテナーコメント記入テキストを模擬します
        sample_report_text = """
<!-- 例: [APPROVE: PBI-999] コメント行は無視されること -->
- **メンテナー指示:** [APPROVE: ASM-001, PBI-019] [REJECT: PBI-020] [PRIORITY: #22, #15]
"""
        # フィードバック解析を実行します
        state = apply_maintainer_feedback(sample_report_text, {"approved_ids": ["PBI-020"]})
        # HTMLコメント内のPBI-999は含まれず、ASM-001とPBI-019が承認されていることを確認します
        self.assertEqual(state["approved_ids"], ["ASM-001", "PBI-019"])
        # PBI-020が差し戻しリストへ移動していることを確認します
        self.assertEqual(state["rejected_ids"], ["PBI-020"])
        # 優先順序が [22, 15] に更新されていることを確認します
        self.assertEqual(state["priority_order"], [22, 15])

        # 正当なメンテナーアカウント（N-Y-Public / 330902043）の検証がPASSすることを確認します
        ok, _ = verify_github_identity_gate("N-Y-Public", 330902043, "N-Y-Public", 330902043)
        # 検証結果がTrueであることを確認します
        self.assertTrue(ok)
        # 不正な別アカウントの場合は即座にFalse（ABORT）になることを確認します
        ng, msg = verify_github_identity_gate("unverified-user", 12345, "N-Y-Public", 330902043)
        # 検証結果がFalseであることを確認します
        self.assertFalse(ng)
        # ABORTメッセージが含まれることを確認します
        self.assertIn("IDENTITY-GATE-ABORT", msg)


# @test TEST-ST-011
# 日報（1日3回: 07:30/11:50/18:00）・週報（毎週水曜16:00）テンプレート生成の総合テストクラスです
class TestAutonomousReportingSystem(unittest.TestCase):
    # AC-2 & AC-3: 日報3回と水曜16:00週報のテンプレート生成および韓国語混入ゼロの検証メソッドです
    def test_daily_three_slots_and_wednesday_weekly_report_generation(self) -> None:
        # ハングル文字検出用の正規表現を定義します
        hangul_re = re.compile(r"[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]")

        # 1. 正本テンプレート自体の存在とハングル文字ゼロを確認します
        daily_tpl = REPO_ROOT / "docs" / "templates" / "tpl_96_daily_report.md"
        # 週報テンプレートのパスを取得します
        weekly_tpl = REPO_ROOT / "docs" / "templates" / "tpl_97_weekly_report.md"
        # 日報テンプレートが存在することを確認します
        self.assertTrue(daily_tpl.is_file())
        # 週報テンプレートが存在することを確認します
        self.assertTrue(weekly_tpl.is_file())
        # 週報テンプレートに韓国語が1文字も含まれず正しい日本語見出しであることを確認します
        weekly_tpl_text = weekly_tpl.read_text(encoding="utf-8")
        # ハングル文字が0件であることを確認します
        self.assertIsNone(hangul_re.search(weekly_tpl_text))
        # 正しい見出し「## 5. 上位マネジメントへの相談・エスカレーション事項 (Escalations to Management)」が含まれることを確認します
        self.assertIn("## 5. 上位マネジメントへの相談・エスカレーション事項 (Escalations to Management)", weekly_tpl_text)

        # 2. 設定ファイル（scripts/autonomous_config.json）のスケジュール値を検証します
        cfg_path = REPO_ROOT / "scripts" / "autonomous_config.json"
        # 設定ファイルを読み込みます
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        # 日報スケジュールが 07:30, 11:50, 18:00 の3回であることを確認します
        self.assertEqual(cfg["daily_report"]["schedules_jst"], ["07:30", "11:50", "18:00"])
        # 週報スケジュールが毎週水曜（WED）の 16:00 であることを確認します
        self.assertEqual(cfg["weekly_report"]["day_of_week"], "WED")
        # 週報時刻が 16:00 であることを確認します
        self.assertEqual(cfg["weekly_report"]["time_jst"], "16:00")

        # 3. 一時出力環境で1日3回（07:30 / 11:50 / 18:00）の日報と水曜16:00の週報生成を検証します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時リポジトリルートを構築します
            tmp_root = Path(tmp_dir)
            # テンプレートディレクトリを作成します
            (tmp_root / "docs" / "templates").mkdir(parents=True, exist_ok=True)
            # バックログディレクトリを作成します
            (tmp_root / "docs" / "backlog" / "done").mkdir(parents=True, exist_ok=True)
            # スクリプト設定ディレクトリを作成します
            (tmp_root / "scripts").mkdir(parents=True, exist_ok=True)
            # 正本の日報テンプレートをコピーします
            (tmp_root / "docs" / "templates" / "tpl_96_daily_report.md").write_text(
                daily_tpl.read_text(encoding="utf-8"), encoding="utf-8"
            )
            # 正本の週報テンプレートをコピーします
            (tmp_root / "docs" / "templates" / "tpl_97_weekly_report.md").write_text(
                weekly_tpl.read_text(encoding="utf-8"), encoding="utf-8"
            )
            # 設定ファイルをコピーします
            (tmp_root / "scripts" / "autonomous_config.json").write_text(
                cfg_path.read_text(encoding="utf-8"), encoding="utf-8"
            )

            # 1日3回の各スロット（07:30=morning, 11:50=midday, 18:00=evening）を生成します
            expected_slots = [("07:30", "morning"), ("11:50", "midday"), ("18:00", "evening")]
            # 各スロットを走査します
            for slot_time, slot_name in expected_slots:
                # 木曜日（2026-11-05）の各時刻でauto生成を実行します
                res = generate_daily_and_weekly_reports(
                    repo_root=tmp_root,
                    target_date="2026-11-05",
                    time_jst=slot_time,
                    report_mode="auto",
                )
                # 日報が生成され、週報（水曜以外）は生成されないことを確認します
                self.assertTrue(res["daily_emitted"])
                # 週報がFalseであることを確認します
                self.assertFalse(res["weekly_emitted"])
                # 生成された日報ファイルを確認します
                daily_file = tmp_root / "docs" / "reports" / "daily" / f"2026-11-05_{slot_name}.md"
                # ファイルが実在することを確認します
                self.assertTrue(daily_file.is_file())
                # 日報の中身を読み込みます
                daily_content = daily_file.read_text(encoding="utf-8")
                # 対象読者が ROLE-MAINTAINER であることを確認します
                self.assertIn('target_audience: "ROLE-MAINTAINER"', daily_content)
                # 未置換のプレースホルダ（{{...}}）が残っていないことを確認します
                self.assertNotRegex(daily_content, r"\{\{[A-Z_]+\}\}")
                # ハングル文字が混入していないことを確認します
                self.assertIsNone(hangul_re.search(daily_content))

            # 水曜日（2026-11-04）の 16:00 で auto 生成を実行します（日報＋週報の双方が生成されること）
            wed_res = generate_daily_and_weekly_reports(
                repo_root=tmp_root,
                target_date="2026-11-04",
                time_jst="16:00",
                report_mode="auto",
            )
            # 日報が生成されたことを確認します
            self.assertTrue(wed_res["daily_emitted"])
            # 水曜16:00のため週報も同時に生成されたことを確認します
            self.assertTrue(wed_res["weekly_emitted"])
            # 週報ファイルの存在を確認します
            weekly_file = tmp_root / "docs" / "reports" / "weekly" / "2026-W45_weekly_report.md"
            # ファイルが実在することを確認します
            self.assertTrue(weekly_file.is_file())
            # 週報の中身を読み込みます
            weekly_content = weekly_file.read_text(encoding="utf-8")
            # 対象読者がプロジェクトとりまとめ（ROLE-PROJECT-DIRECTOR）であることを確認します
            self.assertIn('target_audience: "ROLE-PROJECT-DIRECTOR"', weekly_content)
            # 上司向け4要素（課題または先週からの宿題・解決策・結果・新たな宿題事項と完了期限）が含まれることを確認します
            self.assertIn("課題または先週からの宿題", weekly_content)
            self.assertIn("実施した解決策・アプローチ", weekly_content)
            self.assertIn("結果・定量的効果", weekly_content)
            self.assertIn("新たな宿題事項・次週の取組内容", weekly_content)
            self.assertIn("完了期限 (Deadline)", weekly_content)
            # 未置換のプレースホルダが残っていないことを確認します
            self.assertNotRegex(weekly_content, r"\{\{[A-Z_]+\}\}")
            # ハングル文字が混入していないことを確認します
            self.assertIsNone(hangul_re.search(weekly_content))


# @test TEST-UT-008
# 常駐マスターオーケストレーターデーモン（PRG-AUT-003）の単体テストクラスです
class TestMasterOrchestratorDaemonUnit(unittest.TestCase):
    # テスト用の一時リポジトリ構造をセットアップする補助メソッドです
    def _setup_temp_repo(self, tmp_root: Path) -> None:
        # テンプレートディレクトリを作成します
        (tmp_root / "docs" / "templates").mkdir(parents=True, exist_ok=True)
        # バックログの各状態ディレクトリを作成します
        (tmp_root / "docs" / "backlog" / "todo").mkdir(parents=True, exist_ok=True)
        # in_progressディレクトリを作成します
        (tmp_root / "docs" / "backlog" / "in_progress").mkdir(parents=True, exist_ok=True)
        # doneディレクトリを作成します
        (tmp_root / "docs" / "backlog" / "done").mkdir(parents=True, exist_ok=True)
        # スクリプト設定ディレクトリを作成します
        (tmp_root / "scripts").mkdir(parents=True, exist_ok=True)
        # 正本の日報テンプレートをコピーします
        (tmp_root / "docs" / "templates" / "tpl_96_daily_report.md").write_text(
            (REPO_ROOT / "docs" / "templates" / "tpl_96_daily_report.md").read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        # 正本の週報テンプレートをコピーします
        (tmp_root / "docs" / "templates" / "tpl_97_weekly_report.md").write_text(
            (REPO_ROOT / "docs" / "templates" / "tpl_97_weekly_report.md").read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        # 設定ファイルをコピーします
        (tmp_root / "scripts" / "autonomous_config.json").write_text(
            (REPO_ROOT / "scripts" / "autonomous_config.json").read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    # AC-1: 時計監視（FN-AUT-005）による定時レポート自動生成および二重出力防止の検証メソッドです
    def test_clock_driven_scheduled_reports_and_deduplication(self) -> None:
        # 一時ディレクトリを作成して検証します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時ルートパスを取得します
            tmp_root = Path(tmp_dir)
            # テンプレートと設定を配置します
            self._setup_temp_repo(tmp_root)
            # 初期状態辞書を定義します
            state: Dict[str, Any] = {}

            # 1. 木曜日 07:29（朝枠未到達）では何も出力されないことを確認します
            dt_before = datetime(2026, 11, 5, 7, 29, tzinfo=JST)
            # 07:29時点でチェックを実行します
            res_before = check_and_emit_scheduled_reports(tmp_root, state, now_jst=dt_before)
            # 生成ファイルが0件であることを確認します
            self.assertEqual(res_before["generated_files"], [])
            # 状態を更新します
            state = res_before["state"]

            # 2. 木曜日 07:30（朝枠到達）で朝の日報が1件生成されることを確認します
            dt_morning = datetime(2026, 11, 5, 7, 30, tzinfo=JST)
            # 07:30時点でチェックを実行します
            res_morning = check_and_emit_scheduled_reports(tmp_root, state, now_jst=dt_morning)
            # 朝の日報が生成されたことを確認します
            self.assertEqual(res_morning["generated_files"], ["docs/reports/daily/2026-11-05_morning.md"])
            # 状態を更新します
            state = res_morning["state"]

            # 3. 同じ 07:35 に再度チェックしても二重出力されないことを確認します
            dt_morning_retry = datetime(2026, 11, 5, 7, 35, tzinfo=JST)
            # 再チェックを実行します
            res_dup = check_and_emit_scheduled_reports(tmp_root, state, now_jst=dt_morning_retry)
            # 新規生成ファイルが空であることを確認します
            self.assertEqual(res_dup["generated_files"], [])
            # 状態を更新します
            state = res_dup["state"]

            # 4. 水曜日 16:00（週報枠到達）では朝・昼の日報と16:00週報（＋付随日報）が一括生成されることを確認します
            dt_wed = datetime(2026, 11, 4, 16, 0, tzinfo=JST)
            # 水曜16:00時点でチェックを実行します
            res_wed = check_and_emit_scheduled_reports(tmp_root, state, now_jst=dt_wed)
            # 週報ファイルが生成リストに含まれることを確認します
            self.assertIn("docs/reports/weekly/2026-W45_weekly_report.md", res_wed["generated_files"])
            # 発行済み識別子に 2026-11-04_16:00_weekly が記録されていることを確認します
            self.assertIn("2026-11-04_16:00_weekly", res_wed["state"]["emitted_reports"])

    # AC-2 & AC-4: ステートレスワーカー実行、自己承認拒否（ERR-VAL-005）、および最大リトライ超過時の安全スキップ検証メソッドです
    def test_stateless_worker_self_approval_block_and_max_retry_skip(self) -> None:
        # 一時ディレクトリを作成して検証します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時ルートパスを取得します
            tmp_root = Path(tmp_dir)
            # テンプレートと設定を配置します
            self._setup_temp_repo(tmp_root)

            # 1. ステートレスワーカー単一工程（FN-AUT-006）が独立セッションIDを持ち完了後に破棄されることを確認します
            sample_issue = {
                "issue_number": 30,
                "title": "feat: stateless worker check",
                "branch_type": "feat",
                "compliant_branch_name": "feat/antigravity-2.0/issue-30/stateless-worker-check",
            }
            # stage_a ワーカーを実行します
            w_res = execute_stateless_worker_stage(
                stage_name="stage_a",
                issue_info=sample_issue,
                repo_root=tmp_root,
                agent_role="ROLE-PM",
                pbi_id="PBI-030",
            )
            # 終了コードが0であることを確認します
            self.assertEqual(w_res["returncode"], 0)
            # セッション破棄フラグがTrueであることを確認します
            self.assertTrue(w_res["session_destroyed"])
            # 生成されたPBIファイルが実在することを確認します
            self.assertTrue(Path(w_res["pbi_path"]).is_file())

            # 2. 同一ロール（ROLE-PM == ROLE-PM）で審査させた場合、ERR-VAL-005 で即座に拒絶・スキップされることを確認します
            issues_list = [
                {
                    "number": 31,
                    "title": "feat: test self approval block",
                    "state": "open",
                    "labels": ["feature"],
                    "blocked_by": [],
                }
            ]
            # 同一ロールを指定して1サイクル実行します
            self_cycle = execute_master_daemon_cycle(
                repo_root=tmp_root,
                issues=issues_list,
                state={},
                now_jst=datetime(2026, 11, 5, 6, 0, tzinfo=JST),
                drafter_role="ROLE-PM",
                reviewer_role="ROLE-PM",
            )
            # ステータスが GATE_REJECTED_SKIPPED であることを確認します
            self.assertEqual(self_cycle["status"], "GATE_REJECTED_SKIPPED")
            # 違反理由に ERR-VAL-005 が含まれることを確認します
            self.assertTrue(any("ERR-VAL-005" in v for v in self_cycle["violations"]))
            # Issue #31 が escalated_issues に退避されていることを確認します
            self.assertIn(31, self_cycle["state"]["escalated_issues"])

            # 3. 不正なPBI（禁止曖昧語を含む）を返すワーカーにより最大リトライ回数（2回）を超過した場合、安全にスキップされることを確認します
            bad_issues = [
                {
                    "number": 32,
                    "title": "feat: bad pbi retry limit check",
                    "state": "open",
                    "labels": ["feature"],
                    "blocked_by": [],
                }
            ]
            # 呼び出し回数を記録するカウンタです
            call_counter = {"stage_a_calls": 0}

            # 常に禁止語を含む不完全なPBIを生成するモックワーカー関数です
            def _bad_stage_a_worker(
                stage_name: str,
                issue_info: Dict[str, Any],
                repo_root: Path,
                agent_role: str,
                pbi_path: Optional[Path],
            ) -> Dict[str, Any]:
                # stage_a の呼び出し回数を加算します
                if stage_name == "stage_a":
                    # カウンタをインクリメントします
                    call_counter["stage_a_calls"] += 1
                # 不正なPBIパスを作成します
                bad_pbi = repo_root / "docs" / "backlog" / "todo" / "PBI-032_bad.md"
                # 親ディレクトリを作成します
                bad_pbi.parent.mkdir(parents=True, exist_ok=True)
                # Given/When/Then を欠いた不正なPBIを書き出します
                bad_pbi.write_text("# Invalid PBI without frontmatter or AC\n", encoding="utf-8")
                # 結果辞書を返却します
                return {
                    "returncode": 0,
                    "pbi_path": str(bad_pbi),
                }

            # 最大リトライ2回で1サイクル実行します
            retry_cycle = execute_master_daemon_cycle(
                repo_root=tmp_root,
                issues=bad_issues,
                state={},
                now_jst=datetime(2026, 11, 5, 6, 0, tzinfo=JST),
                drafter_role="ROLE-PM",
                reviewer_role="ROLE-ARCH",
                max_stage_a_retry=2,
                worker_runner=_bad_stage_a_worker,
            )
            # Stage A ワーカーがちょうど2回試行されたことを確認します
            self.assertEqual(call_counter["stage_a_calls"], 2)
            # ステータスが GATE_REJECTED_SKIPPED であることを確認します
            self.assertEqual(retry_cycle["status"], "GATE_REJECTED_SKIPPED")
            # Issue #32 が保留リストへ記録されたことを確認します
            self.assertIn(32, retry_cycle["state"]["escalated_issues"])

    # AC-3: GitHub REST API からの Open Issue 自動取得（PR除外・依存関係抽出）および同時並行上限1件の検証メソッドです
    def test_github_open_issues_auto_fetch_and_single_concurrency_limit(self) -> None:
        # 一時ディレクトリを作成して検証します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時ルートパスを取得します
            tmp_root = Path(tmp_dir)
            # テンプレートと設定を配置します
            self._setup_temp_repo(tmp_root)

            # 1. GitHub Issues API のレスポンスモック（Issue 2件 + Pull Request 1件）を定義します
            mock_api_payload = [
                {
                    "number": 51,
                    "title": "feat: auto fetched issue from github",
                    "state": "open",
                    "labels": [{"name": "feature"}, {"name": "priority:high"}],
                    "body": " Summary\nBlocked by #50\nDepends on #49",
                },
                {
                    "number": 52,
                    "title": "chore: pull request item returned by issues endpoint",
                    "state": "open",
                    "labels": [],
                    "pull_request": {"url": "https://api.github.com/repos/N-Y-Public/marp-slide-mcp/pulls/52"},
                },
            ]

            # urlopen のモックレスポンスクラスを定義します
            class _MockHttpResponse:
                # コンテキストマネージャ開始メソッドです
                def __enter__(self) -> "_MockHttpResponse":
                    # 自身を返却します
                    return self

                # コンテキストマネージャ終了メソッドです
                def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
                    # 何もしません
                    return None

                # レスポンスボディのバイト列を返すメソッドです
                def read(self) -> bytes:
                    # JSON文字列をUTF-8バイト列として返却します
                    return json.dumps(mock_api_payload).encode("utf-8")

            # モック urlopen 関数を定義します
            def _mock_urlopen(req: Any, timeout: float = 10.0) -> _MockHttpResponse:
                # 要求先URLにリポジトリパスが含まれることを確認します
                self.assertIn("N-Y-Public/marp-slide-mcp/issues", req.full_url)
                # モックレスポンスを返却します
                return _MockHttpResponse()

            # GitHub Open Issue 自動取得関数を実行します
            fetched = fetch_open_issues_from_github(
                repo_root=tmp_root,
                urlopen_fn=_mock_urlopen,
            )
            # Pull Request (#52) が除外され、純粋な Issue (#51) の1件のみが取得されることを確認します
            self.assertEqual(len(fetched), 1)
            # Issue番号が 51 であることを確認します
            self.assertEqual(fetched[0]["number"], 51)
            # 本文からブロック元 Issue 番号 [49, 50] が自動抽出されていることを確認します
            self.assertEqual(fetched[0]["blocked_by"], [49, 50])

            # 2. 1度に並行して取り組むIssue数の上限（デフォルト max_concurrent_issues=1）の強制を確認します
            # 既に別の Issue (#99) が in_progress_issues に存在する場合、新規 Issue (#53) に並行着手しないことを確認します
            busy_state = {"in_progress_issues": [99]}
            # 未着手の Issue #53 のみがキューにある状態を定義します
            new_issues = [
                {
                    "number": 53,
                    "title": "feat: should wait while issue 99 is in progress",
                    "state": "open",
                    "labels": ["feature"],
                    "blocked_by": [],
                }
            ]
            # デフォルト並行上限（max_concurrent_issues=1）で1サイクル実行します
            busy_cycle = execute_master_daemon_cycle(
                repo_root=tmp_root,
                issues=new_issues,
                state=busy_state,
                now_jst=datetime(2026, 11, 5, 6, 0, tzinfo=JST),
                max_concurrent_issues=1,
            )
            # 並行上限到達（CONCURRENCY_LIMIT_REACHED）となり、Issue #53 に着手しないことを確認します
            self.assertEqual(busy_cycle["status"], "CONCURRENCY_LIMIT_REACHED")
            # 処理されたIssueがNoneであることを確認します
            self.assertIsNone(busy_cycle["processed_issue"])


# @test TEST-ST-014
# 常駐マスターオーケストレーターデーモンによる複数Issue連続消化・PR生成・取扱説明書スライドPDF整合の総合テストクラスです
class TestMasterOrchestratorDaemonSystem(unittest.TestCase):
    # AC-3 & AC-5: 複数Issueのノンストップ連続消化、日報フィードバック反映、PR生成、および取扱説明書PDF出力の検証メソッドです
    def test_continuous_multi_issue_daemon_loop_and_manual_pdf(self) -> None:
        # 一時ディレクトリを作成して複数Issue連続消化を検証します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時ルートパスを取得します
            tmp_root = Path(tmp_dir)
            # テンプレートディレクトリを作成します
            (tmp_root / "docs" / "templates").mkdir(parents=True, exist_ok=True)
            # 日報ディレクトリを作成します
            (tmp_root / "docs" / "reports" / "daily").mkdir(parents=True, exist_ok=True)
            # バックログディレクトリを作成します
            (tmp_root / "docs" / "backlog" / "todo").mkdir(parents=True, exist_ok=True)
            # スクリプトディレクトリを作成します
            (tmp_root / "scripts").mkdir(parents=True, exist_ok=True)
            # 正本の日報テンプレートをコピーします
            (tmp_root / "docs" / "templates" / "tpl_96_daily_report.md").write_text(
                (REPO_ROOT / "docs" / "templates" / "tpl_96_daily_report.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            # 正本の週報テンプレートをコピーします
            (tmp_root / "docs" / "templates" / "tpl_97_weekly_report.md").write_text(
                (REPO_ROOT / "docs" / "templates" / "tpl_97_weekly_report.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            # 設定ファイルをコピーします
            (tmp_root / "scripts" / "autonomous_config.json").write_text(
                (REPO_ROOT / "scripts" / "autonomous_config.json").read_text(encoding="utf-8"),
                encoding="utf-8",
            )

            # 日報にメンテナーからの優先度変更指示（#42 を #41 より優先）と仮定承認を配置します
            feedback_file = tmp_root / "docs" / "reports" / "daily" / "2026-11-04_evening.md"
            # メンテナー指示付きの日報を書き出します
            feedback_file.write_text(
                "- **メンテナー指示:** [APPROVE: ASM-001] [PRIORITY: #42, #41]\n",
                encoding="utf-8",
            )

            # 2件の未対応Issue（#41 と #42）を用意します
            issues = [
                {
                    "number": 41,
                    "title": "feat: first task",
                    "state": "open",
                    "labels": ["feature"],
                    "blocked_by": [],
                },
                {
                    "number": 42,
                    "title": "feat: second task prioritized by maintainer",
                    "state": "open",
                    "labels": ["feature"],
                    "blocked_by": [],
                },
            ]
            # 状態永続化JSONのパスを定義します
            state_json = tmp_root / "docs" / "reports" / "daemon_state.json"

            # 3サイクル分の疑似JST時刻を提供する関数です（07:30 → 11:50 → 18:00）
            def _clock_provider(iteration: int) -> datetime:
                # サイクル番号に応じた時刻マップを定義します
                times = {
                    1: datetime(2026, 11, 5, 7, 30, tzinfo=JST),
                    2: datetime(2026, 11, 5, 11, 50, tzinfo=JST),
                    3: datetime(2026, 11, 5, 18, 0, tzinfo=JST),
                }
                # 該当時刻を返却します
                return times.get(iteration, datetime(2026, 11, 5, 18, 0, tzinfo=JST))

            # 常駐オーケストレーターデーモン（FN-AUT-007）を --issues-json 省略（github_fetcher経由の自動取得・並行上限1件）で3サイクル連続実行します
            summary = run_master_orchestrator_daemon(
                repo_root=tmp_root,
                issues=None,
                github_fetcher=lambda: issues,
                max_concurrent_issues=1,
                state_json_path=state_json,
                max_iterations=3,
                poll_interval_seconds=0.0,
                now_jst_provider=_clock_provider,
                drafter_role="ROLE-PM",
                reviewer_role="ROLE-ARCH",
                developer_role="ROLE-DEV",
            )

            # 3サイクル実行されたことを確認します
            self.assertEqual(summary["iterations"], 3)
            # 最大同時並行Issue数がデフォルトの 1 であることを確認します
            self.assertEqual(summary["max_concurrent_issues"], 1)
            # 1サイクル目でメンテナー優先指定された Issue #42 が1件だけ消化されたことを確認します
            self.assertEqual(summary["cycle_logs"][0]["processed_issue"], 42)
            # 1サイクル目のステータスが ISSUE_COMPLETED であることを確認します
            self.assertEqual(summary["cycle_logs"][0]["status"], "ISSUE_COMPLETED")
            # 停止せず自動的に2サイクル目で次の Issue #41 へ遷移・完了したことを確認します
            self.assertEqual(summary["cycle_logs"][1]["processed_issue"], 41)
            # 2サイクル目のステータスが ISSUE_COMPLETED であることを確認します
            self.assertEqual(summary["cycle_logs"][1]["status"], "ISSUE_COMPLETED")
            # 3サイクル目は全Issue完了につき IDLE 待機となることを確認します
            self.assertEqual(summary["cycle_logs"][2]["status"], "IDLE")
            # 完了済みIssueが [41, 42] であることを確認します
            self.assertEqual(summary["completed_issues"], [41, 42])
            # 2件分のPRドラフトが生成されていることを確認します
            self.assertEqual(len(summary["generated_prs"]), 2)
            # 状態JSONファイルがディスクへ永続化されていることを確認します
            self.assertTrue(state_json.is_file())
            # 各ステージのワーカーセッションがすべて session_destroyed=True で破棄されていることを確認します
            for hist in summary["state"]["worker_history"]:
                # セッション破棄フラグがTrueであることを確認します
                self.assertTrue(hist["session_destroyed"])

        # 2. CLIサブコマンド（autonomous_dev_loop.py run-daemon --once）の動作を一時ディレクトリ環境で確認します
        with tempfile.TemporaryDirectory() as cli_tmp:
            # 一時パスを取得します
            cli_root = Path(cli_tmp)
            # テンプレートディレクトリを作成します
            (cli_root / "docs" / "templates").mkdir(parents=True, exist_ok=True)
            # スクリプトディレクトリを作成します
            (cli_root / "scripts").mkdir(parents=True, exist_ok=True)
            # 日報テンプレートをコピーします
            (cli_root / "docs" / "templates" / "tpl_96_daily_report.md").write_text(
                (REPO_ROOT / "docs" / "templates" / "tpl_96_daily_report.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            # 週報テンプレートをコピーします
            (cli_root / "docs" / "templates" / "tpl_97_weekly_report.md").write_text(
                (REPO_ROOT / "docs" / "templates" / "tpl_97_weekly_report.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            # 設定ファイルをコピーします
            (cli_root / "scripts" / "autonomous_config.json").write_text(
                (REPO_ROOT / "scripts" / "autonomous_config.json").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            # 状態ファイルパスを設定します
            cli_state = cli_root / "state.json"
            # サブプロセスで run-daemon --once --no-github-fetch を実行します
            proc = subprocess.run(
                [
                    sys.executable,
                    str(REPO_ROOT / "scripts" / "autonomous_dev_loop.py"),
                    "run-daemon",
                    "--repo-root",
                    str(cli_root),
                    "--state-json",
                    str(cli_state),
                    "--no-github-fetch",
                    "--max-concurrent-issues",
                    "1",
                    "--once",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            # 終了コードが0であることを確認します
            self.assertEqual(proc.returncode, 0)
            # 標準出力のJSONがパース可能であることを確認します
            cli_out = json.loads(proc.stdout)
            # 反復回数が1であることを確認します
            self.assertEqual(cli_out["iterations"], 1)
            # 同時並行Issue数が1であることを確認します
            self.assertEqual(cli_out["max_concurrent_issues"], 1)
            # 標準エラー出力にリアルタイム進捗ログ（起動・サイクル・各Step・終了）が出力されていることを確認します
            self.assertIn("[DAEMON START]", proc.stderr)
            # サイクル番号ログが出力されていることを確認します
            self.assertIn("[Cycle #1]", proc.stderr)
            # Step 4/9 の着手Issue選定ログが出力されていることを確認します
            self.assertIn("Step 4/9: 着手Issue選定", proc.stderr)
            # デーモン停止ログが出力されていることを確認します
            self.assertIn("[DAEMON STOP]", proc.stderr)

        # 3. 取扱説明書スライドMarkdownおよびPDFが常駐マスターオーケストレーター仕様で更新・出力されていることを確認します
        manual_md = (
            REPO_ROOT
            / "slides"
            / "D01-000002_24H365D自律開発運用取扱説明書"
            / "D01-000002_24H365D自律開発運用取扱説明書.md"
        )
        # 取扱説明書PDFのパスを取得します
        manual_pdf = (
            REPO_ROOT
            / "slides"
            / "D01-000002_24H365D自律開発運用取扱説明書"
            / "D01-000002_24H365D自律開発運用取扱説明書.pdf"
        )
        # Markdownファイルが存在することを確認します
        self.assertTrue(manual_md.is_file())
        # Markdown本文を読み込みます
        md_text = manual_md.read_text(encoding="utf-8")
        # 常駐マスターオーケストレーターデーモン（autonomous_daemon.py）の記載が含まれることを確認します
        self.assertIn("autonomous_daemon.py", md_text)
        # PDFファイルが存在し、サイズが0より大きい有効なPDF（%PDF-ヘッダ）であることを確認します
        self.assertTrue(manual_pdf.is_file())
        # PDFサイズが空でないことを確認します
        self.assertGreater(manual_pdf.stat().st_size, 1000)
        # PDFバイナリ先頭が %PDF- であることを確認します
        with manual_pdf.open("rb") as f:
            # 先頭5バイトを読み込みます
            header = f.read(5)
        # PDFヘッダを確認します
        self.assertEqual(header, b"%PDF-")


# テストスクリプト直接実行時のエントリポイントです
if __name__ == "__main__":
    # unittestメインランナーを実行します
    unittest.main()
