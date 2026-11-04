#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""設計図書構文検査器 (verify_doc_syntax.py) の単体・体系検査テスト (TEST-UT-004 / TEST-ST-010)。

実行方法: docker compose run --rm app python3 -m unittest tests.test_verify_doc_syntax -v
"""

# 標準ライブラリのインポートです
import importlib.util
# 一時ディレクトリ作成用モジュールをインポートします
import tempfile
# 単体テストフレームワークをインポートします
import unittest
# 出現回数集計用クラスをインポートします
from collections import Counter
# パス操作用クラスをインポートします
from pathlib import Path

# リポジトリルートのパスを解決します
REPO_ROOT = Path(__file__).resolve().parents[1]
# 検査器スクリプトのパスを組み立てます
SCRIPT_PATH = REPO_ROOT / ".agents" / "skills" / "ipa-traceability-validator" / "scripts" / "verify_doc_syntax.py"
# RTM検査スクリプトのパスを組み立てます
RTM_SCRIPT_PATH = REPO_ROOT / ".agents" / "skills" / "ipa-traceability-validator" / "scripts" / "verify_rtm.py"
# 検査器をモジュールとして読み込む仕様を作成します
SPEC = importlib.util.spec_from_file_location("verify_doc_syntax", SCRIPT_PATH)
# モジュールオブジェクトを生成します
MODULE = importlib.util.module_from_spec(SPEC)
# 検査器モジュールを実行して読み込みます
SPEC.loader.exec_module(MODULE)
# RTM検査器をモジュールとして読み込む仕様を作成します
RTM_SPEC = importlib.util.spec_from_file_location("verify_rtm", RTM_SCRIPT_PATH)
# RTMモジュールオブジェクトを生成します
RTM_MODULE = importlib.util.module_from_spec(RTM_SPEC)
# RTMモジュールを実行して読み込みます
RTM_SPEC.loader.exec_module(RTM_MODULE)

# 規約適合のFrontmatterを返す文字列を定義します
FRONT = "---\nid: DOC-REQ-001\ntitle: 検査用\ndoc_type: requirements\nversion: 1.0.0\nstatus: Draft\ndate: 2026-11-04\nauthor: N-Y-Public\ndoc_standard: DOC-GOV-003@1.0.0\ntags:\n  - test\n---\n\n"
# 第1章の固定構造を返す文字列を定義します
CHAPTER1 = "# 1 本書の位置づけ\n## 1.1 目的\nx\n## 1.2 記述対象\nx\n## 1.3 記述対象外と参照先\nx\n## 1.4 改版履歴\nx\n"
# ホスト絶対パスの文字列を、ソース内に直書きせず連結で作ります
HOST_PATH = "/Us" + "ers/someone/work"


# 検査用図書を一時ディレクトリへ書き出して検査結果を返す補助関数です
def run_check(files):
    # 一時ディレクトリを作成します
    with tempfile.TemporaryDirectory() as tmp:
        # docsルートのパスを組み立てます
        root = Path(tmp)
        # 各図書を書き出します
        for rel, text in files.items():
            # 出力先パスを組み立てます
            target = root / rel
            # 親ディレクトリを作成します
            target.parent.mkdir(parents=True, exist_ok=True)
            # 図書をUTF-8で書き出します
            target.write_text(text, encoding="utf-8")
        # 規約図書は実リポジトリのものを使って検査します
        return MODULE.check_docs(root, REPO_ROOT / "docs")


# 検査器のテストケースクラスを定義します
class VerifyDocSyntaxTest(unittest.TestCase):
    # @test TEST-UT-004 AC-4: 9種の違反が固有コードで1件ずつ検出されること
    def test_nine_violations_detected(self):
        # 違反を1種類ずつ含む図書本文を組み立てます
        body = (
            # 第2章の見出しと、各見出し違反を並べます
            "# 2 違反集\n## 2.1 番号なし違反\n## 番号なしの見出し\n## 2.3 重複番号違反\n## 2.3 重複番号の二重\n"
            # 階層飛ばしの見出しを並べます
            "## 2.5 階層飛ばし\n#### 2.5.1.1 飛ばし見出し\n## 2.6 その他の違反\n"
            # 未登録ID接頭辞と、ID二重定義を並べます
            "ZZZ-001 は未登録の接頭辞である。\n| REQ-FNC-001 | a |\n| REQ-FNC-001 | b |\n"
            # 解決不能リンクと相対Markdownリンクを並べます
            "[[no_such_file#1 x|y]]\n[bad](../other.md)\n"
            # 禁止語とホスト絶対パスを並べます
            "適宜 調整する。\n" + HOST_PATH + "\n"
        )
        # 検査を実行します
        errors, _ = run_check({"01_requirements/01_requirements_specification.md": FRONT + CHAPTER1 + body})
        # エラーコードの出現回数を集計します
        counts = Counter(e[1 : e.index("]")] for e in errors)
        # 期待する9種のコードを1件ずつ定義します
        expected = {c: 1 for c in ["HDG-FORMAT", "HDG-SKIP", "HDG-SEQ", "ID-PREFIX", "ID-DUP", "LNK-UNRESOLVED", "LNK-MDREL", "WRD-FORBIDDEN", "PII-PATH"]}
        # 期待どおりであることを検証します
        self.assertEqual(dict(counts), expected, errors)

    # @test TEST-UT-004 AC-5: コードブロック内は検査対象外であること
    def test_fenced_code_is_ignored(self):
        # コードブロック内に違反に見える行を含む図書本文を組み立てます
        body = "# 2 コード例\n```text\n# comment\n[[no_such_file]]\n適宜\nZZZ-001\n```\n"
        # 検査を実行します
        errors, stats = run_check({"01_requirements/01_requirements_specification.md": FRONT + CHAPTER1 + body})
        # 違反が0件で、対象図書が1件であることを検証します
        self.assertEqual((errors, stats["doc_syntax_files"]), ([], 1))

    # @test TEST-UT-004 段階適用: doc_standard を持たない図書は対象外であること
    def test_document_without_doc_standard_is_skipped(self):
        # 規約に適合しない図書を作成します
        text = "---\nid: DOC-REQ-001\n---\n\n## 番号なし\n適宜\n"
        # 検査を実行します
        errors, stats = run_check({"01_requirements/01_requirements_specification.md": text})
        # 違反0件・対象図書0件であることを検証します
        self.assertEqual((errors, stats["doc_syntax_files"]), ([], 0))

    # @test TEST-UT-004 定義元図書の違反が検出されること
    def test_id_owner_violation(self):
        # 要件IDを基本設計の図書で定義する本文を組み立てます
        text = FRONT.replace("DOC-REQ-001", "DOC-BD-002") + CHAPTER1 + "# 2 定義\n| REQ-FNC-002 | a |\n"
        # 検査を実行します
        errors, _ = run_check({"02_basic_design/02_functional_specification.md": text})
        # ID-OWNERのみが1件検出されることを検証します
        self.assertEqual([e[1 : e.index("]")] for e in errors], ["ID-OWNER"])

    # @test TEST-ST-010 AC-3: 実リポジトリの対象図書（標準2件+雛形19件）が違反0件であること
    def test_repository_docs_conform(self):
        # 実リポジトリのdocsを検査します
        errors, stats = MODULE.check_docs(REPO_ROOT / "docs", REPO_ROOT / "docs")
        # 違反0件であることを検証します
        self.assertEqual(errors, [])
        # 雛形19件、標準2件、正本設計図書16件の計37件が対象であることを検証します
        self.assertEqual(stats["doc_syntax_files"], 37)

    # @test TEST-ST-010 AC-3: 雛形が全19図書分+PBIテンプレートそろい、画面仕様書雛形が必須構造を持つこと
    def test_templates_complete(self):
        # 雛形ファイルの一覧を取得します
        templates = sorted((REPO_ROOT / "docs" / "templates").glob("tpl_*.md"))
        # 雛形が設計図書19件+PBIテンプレート1件の計20件であることを検証します
        self.assertEqual(len(templates), 20)
        # PBIテンプレートが存在することを検証します
        self.assertTrue((REPO_ROOT / "docs" / "templates" / "tpl_98_pbi_template.md").is_file())
        # 画面仕様書雛形の見出し一覧を取得します
        headings = MODULE.list_headings(REPO_ROOT / "docs" / "templates" / "tpl_07_screen_specification.md")
        # 画面遷移図・遷移定義・見た目・画面部品の見出しが存在することを検証します
        for needed in ["2.1 画面遷移図", "2.2 画面遷移定義", "3.1.1 画面の見た目", "3.1.2 画面部品", "3.1.3 表示状態"]:
            # 必須見出しの存在を検証します
            self.assertIn(needed, [h for h in headings if h.startswith(needed.split(" ")[0] + " ")])

    # @test TEST-ST-010 AC-1/AC-2: 規約図書に必須の章とID種別28種が記載されていること
    def test_standard_contents(self):
        # 設計図書記述標準の見出し一覧を取得します
        std = MODULE.list_headings(REPO_ROOT / "docs" / "00_project_charter" / "03_documentation_standard.md")
        # 必須の章が存在することを検証します
        for needed in ["2.1 図書一覧", "3.1 Frontmatter", "3.2 見出しと章節項番号", "3.3 第1章の固定構造", "3.4 ID定義の記法", "3.5 文体規約", "3.6 禁止語リスト", "4.1 Obsidianリンクの書式", "5.1 意味仕様", "5.2 形式仕様", "5.3 画面仕様との関係"]:
            # 必須見出しの存在を検証します
            self.assertIn(needed, std)
        # ID附番規則の本文を読み込みます
        rules = (REPO_ROOT / "docs" / "00_project_charter" / "04_id_numbering_rules.md").read_text(encoding="utf-8").splitlines()
        # 「ID種別と定義元図書」章の表の行数を数えます
        rows = 0
        # 章の内部かどうかを初期化します
        inside = False
        # 本文を走査します
        for line in rules:
            # 見出し行では章の内外を更新します
            if line.startswith("#"):
                # 対象章の見出しかを判定します
                inside = "ID種別と定義元図書" in line
            # 対象章の表のデータ行を数えます（ヘッダーと区切り行を除く）
            elif inside and line.startswith("|") and not line.startswith("| 対象") and not line.startswith("| :"):
                # 行数を加算します
                rows += 1
        # ID種別が28種であることを検証します
        self.assertEqual(rows, 28)

    # @test TEST-ST-010 AC-7: 追加ファイルにホスト絶対パスが含まれないこと
    def test_no_host_path_in_added_files(self):
        # 検査対象の追加ファイル群を列挙します
        targets = list((REPO_ROOT / "docs" / "templates").glob("tpl_*.md")) + [
            # 規約図書2件を追加します
            REPO_ROOT / "docs" / "00_project_charter" / "03_documentation_standard.md",
            REPO_ROOT / "docs" / "00_project_charter" / "04_id_numbering_rules.md",
            # 検査器とテストを追加します
            SCRIPT_PATH,
            RTM_SCRIPT_PATH,
            Path(__file__),
        ]
        # 各ファイルを検査します
        for target in targets:
            # ホスト絶対パスの出現がないことを検証します
            self.assertIsNone(MODULE.PATH_PATTERN.search(target.read_text(encoding="utf-8")), target.name)

    # @test TEST-UT-004 終了コード: 違反なしで0、違反ありで1であること
    def test_exit_codes(self):
        # 一時ディレクトリを作成します
        with tempfile.TemporaryDirectory() as tmp:
            # 適合図書を書き出します
            (Path(tmp) / "a.md").write_text(FRONT + CHAPTER1, encoding="utf-8")
            # 違反なしの終了コードを検証します
            self.assertEqual(MODULE.main(["--docs-root", tmp, "--rules-root", str(REPO_ROOT / "docs")]), 0)
            # 違反図書を書き出します
            (Path(tmp) / "b.md").write_text(FRONT + CHAPTER1 + "## 番号なし\n", encoding="utf-8")
            # 違反ありの終了コードを検証します
            self.assertEqual(MODULE.main(["--docs-root", tmp, "--rules-root", str(REPO_ROOT / "docs")]), 1)

    # @test TEST-ST-010 AC-1/AC-2: verify_rtm が終了コード0・全関数実装検証合格であること
    def test_verify_rtm_full(self):
        # verify_rtm の main 関数を実行します
        code = RTM_MODULE.main(["--mode", "all", "--format", "json"])
        # 終了コード0であることを検証します
        self.assertEqual(code, 0)


# スクリプトとして実行された場合にテストを開始します
if __name__ == "__main__":
    # テストを実行します
    unittest.main()
