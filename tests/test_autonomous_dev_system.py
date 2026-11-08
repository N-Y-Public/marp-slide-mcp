#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""24H365D自律開発統制・日報（1日3回）・週報（毎週水曜16:00）テンプレート生成の自動検証テスト。

対象テストID:
  - TEST-UT-005: Issue優先度選定、Stage A→B別エージェント審査ゲート、非同期フィードバック解析の単体テスト
  - TEST-ST-011: 日報3枠（07:30/11:50/18:00）および毎週水曜16:00週報テンプレート生成・異文字混入ゼロの総合テスト
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# JSON形式データの検証用モジュールをインポートします
import json
# 正規表現モジュールをインポートします
import re
# モジュール検索パス追加用のsysモジュールをインポートします
import sys
# 一時ディレクトリ生成モジュールをインポートします
import tempfile
# Python標準の単体テストフレームワークをインポートします
import unittest
# ファイルパス操作モジュールをインポートします
from pathlib import Path

# リポジトリルートパスを解決します
REPO_ROOT = Path(__file__).resolve().parents[1]
# scriptsディレクトリをモジュール検索パスへ追加します
sys.path.insert(0, str(REPO_ROOT / "scripts"))

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


# テストスクリプト直接実行時のエントリポイントです
if __name__ == "__main__":
    # unittestメインランナーを実行します
    unittest.main()
