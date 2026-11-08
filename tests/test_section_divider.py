#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""中見出しスライド（セクションディバイダー）および章別目次機能の自動検証テスト。

対象テストID:
  - TEST-UT-006: 4種類の中見出しパターン（title-only, title-and-pages, all-chapters, all-chapters-and-pages）およびアンカーリンク生成の単体テスト
  - TEST-ST-012: 中見出しスライド描画および章別目次モード（toc-chapters-only）の総合検証テスト
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# JSONデータのパースおよびシリアライズ用モジュールをインポートします
import json
# OS環境変数操作用モジュールをインポートします
import os
# 正規表現モジュールをインポートします
import re
# 外部プロセス実行モジュールをインポートします
import subprocess
# システムモジュールをインポートします
import sys
# 一時ファイルおよびディレクトリ生成モジュールをインポートします
import tempfile
# 単体テストフレームワークをインポートします
import unittest
# ファイルパス操作クラスをインポートします
from pathlib import Path

# リポジトリのルートパスを解決します
REPO_ROOT = Path(__file__).resolve().parents[1]


# @test TEST-UT-006
# 中見出しスライド解決関数の単体テストクラスです
class TestSectionDividerUnit(unittest.TestCase):
    """FN-SRV-009 resolveSectionDividerSlide の4パターン出力およびリンク構造を検証する単体テスト。"""

    # Node.js を介して resolveSectionDividerSlide を実行するヘルパーメソッドです
    def _run_resolve_divider(self, divider_data: dict) -> dict:
        # 入力データをJSON文字列化します
        json_input = json.dumps(divider_data, ensure_ascii=False)
        # Node実行用スクリプト文字列を構築します
        node_code = f"""
import {{ resolveSectionDividerSlide }} from './build/index.js';
const input = {json_input};
const result = resolveSectionDividerSlide(input);
process.stdout.write(JSON.stringify(result) + '\\n');
"""
        # 子プロセスの環境変数を設定します（CHROME_PATHを明示して高速化します）
        env = os.environ.copy()
        # Chromium実行パスを指定します
        env["CHROME_PATH"] = "/usr/bin/chromium"
        # Nodeプロセスを実行して標準出力を取得します
        proc = subprocess.run(
            # 実行引数リストです
            ["node", "--input-type=module", "-e", node_code],
            # 作業ディレクトリをリポジトリルートに設定します
            cwd=str(REPO_ROOT),
            # 出力をキャプチャします
            capture_output=True,
            # テキスト形式で取得します
            text=True,
            # 環境変数を注入します
            env=env,
        )
        # 終了コードが0であることを検証します
        self.assertEqual(proc.returncode, 0, f"Node execution failed: {proc.stderr}")
        # 標準出力をJSONとしてパースして返却します
        return json.loads(proc.stdout.strip())

    # AC-1: title-only パターンの単体テストです
    def test_pattern_title_only(self) -> None:
        """title-only パターンで章タイトルのみが出力され他要素が含まれないことを検証します。"""
        # 入力パラメータを定義します
        input_data = {
            # パターン種別です
            "pattern": "title-only",
            # 章タイトルです
            "chapterTitle": "第1章 プロジェクト概要",
        }
        # 関数を実行して結果を取得します
        res = self._run_resolve_divider(input_data)
        # 基本クラスが含まれることを検証します
        self.assertIn("section-divider", res["classes"])
        # パターン専用クラスが含まれることを検証します
        self.assertIn("pattern-title-only", res["classes"])
        # テーマ共通のh1-h6隠蔽を回避したdiv要素の章タイトルが含まれることを検証します
        self.assertIn('<div class="chapter-title">第1章 プロジェクト概要</div>', res["bodyContent"])
        # ページ一覧コンテナが含まれないことを検証します
        self.assertNotIn("chapter-pages-list", res["bodyContent"])
        # 全章一覧コンテナが含まれないことを検証します
        self.assertNotIn("all-chapters-list", res["bodyContent"])

    # AC-2: title-and-pages パターンの単体テストです
    def test_pattern_title_and_pages(self) -> None:
        """title-and-pages パターンでページ一覧およびアンカーリンクが正しくHTML生成されることを検証します。"""
        # 入力パラメータを定義します
        input_data = {
            # パターン種別です
            "pattern": "title-and-pages",
            # 章タイトルです
            "chapterTitle": "第2章 方式設計",
            # 章内ページ一覧です
            "chapterPages": [
                # 1ページ目の定義です
                {"title": "システム全体構成", "pageNumber": 5},
                # 2ページ目の定義です
                {"title": "インターフェース仕様", "pageNumber": 6},
                # ページ番号未指定の定義です
                {"title": "補足資料"},
            ],
        }
        # 関数を実行して結果を取得します
        res = self._run_resolve_divider(input_data)
        # クラス指定を検証します
        self.assertIn("pattern-title-and-pages", res["classes"])
        # テーマ共通のh1-h6隠蔽を回避したdiv要素の章タイトルが含まれることを検証します
        self.assertIn('<div class="chapter-title">第2章 方式設計</div>', res["bodyContent"])
        # ページ一覧リストタグが含まれることを検証します
        self.assertIn('<ul class="chapter-pages-list">', res["bodyContent"])
        # ページアンカーリンク1がHTMLタグとして生成されていることを検証します
        self.assertIn('<li><a href="#5">システム全体構成</a></li>', res["bodyContent"])
        # ページアンカーリンク2がHTMLタグとして生成されていることを検証します
        self.assertIn('<li><a href="#6">インターフェース仕様</a></li>', res["bodyContent"])
        # リンクなしタイトルがliタグとして生成されていることを検証します
        self.assertIn("<li>補足資料</li>", res["bodyContent"])
        # 生のMarkdown記法が混入していないことを検証します
        self.assertNotIn("[システム全体構成](#5)", res["bodyContent"])

    # AC-3: all-chapters パターンの単体テストです
    def test_pattern_all_chapters(self) -> None:
        """all-chapters パターンでカレント章が太字、他章が薄色（dim）で表示されることを検証します。"""
        # 入力パラメータを定義します
        input_data = {
            # パターン種別です
            "pattern": "all-chapters",
            # 章タイトルです
            "chapterTitle": "第2章 方式設計",
            # 全章一覧です
            "allChapters": [
                # 第1章です
                "第1章 要件定義",
                # 第2章です
                "第2章 方式設計",
                # 第3章です
                "第3章 詳細設計",
            ],
            # カレント章インデックスです
            "currentChapterIndex": 1,
        }
        # 関数を実行して結果を取得します
        res = self._run_resolve_divider(input_data)
        # クラス指定を検証します
        self.assertIn("pattern-all-chapters", res["classes"])
        # カレント章の太字強調を検証します
        self.assertIn('<li class="active-chapter"><strong>第2章 方式設計</strong></li>', res["bodyContent"])
        # 第1章の薄色表示を検証します
        self.assertIn('<li class="dim">第1章 要件定義</li>', res["bodyContent"])
        # 第3章の薄色表示を検証します
        self.assertIn('<li class="dim">第3章 詳細設計</li>', res["bodyContent"])

    # AC-4: all-chapters-and-pages パターンの単体テストです
    def test_pattern_all_chapters_and_pages(self) -> None:
        """all-chapters-and-pages パターンで全章一覧とカレント章配下のページリンクがHTML生成されることを検証します。"""
        # 入力パラメータを定義します
        input_data = {
            # パターン種別です
            "pattern": "all-chapters-and-pages",
            # 章タイトルです
            "chapterTitle": "第2章 方式設計",
            # 全章一覧です
            "allChapters": [
                # 第1章です
                "第1章 要件定義",
                # 第2章です
                "第2章 方式設計",
            ],
            # カレント章インデックスです
            "currentChapterIndex": 1,
            # カレント章配下のページ一覧です
            "chapterPages": [
                # ページ1です
                {"title": "アーキテクチャ概要", "pageNumber": 7},
                # ページ2です
                {"title": "コンポーネント図", "pageNumber": 8},
            ],
        }
        # 関数を実行して結果を取得します
        res = self._run_resolve_divider(input_data)
        # クラス指定を検証します
        self.assertIn("pattern-all-chapters-and-pages", res["classes"])
        # カレント章の太字強調タグを検証します
        self.assertIn('<li class="active-chapter">', res["bodyContent"])
        self.assertIn('<strong>第2章 方式設計</strong>', res["bodyContent"])
        # 他章の薄色表示を検証します
        self.assertIn('<li class="dim">第1章 要件定義</li>', res["bodyContent"])
        # カレント章配下のアンカーリンク1がHTMLタグとして生成されていることを検証します
        self.assertIn('<li><a href="#7">アーキテクチャ概要</a></li>', res["bodyContent"])
        # カレント章配下のアンカーリンク2がHTMLタグとして生成されていることを検証します
        self.assertIn('<li><a href="#8">コンポーネント図</a></li>', res["bodyContent"])
        # 生のMarkdown記法が混入していないことを検証します
        self.assertNotIn("[アーキテクチャ概要](#7)", res["bodyContent"])


# @test TEST-ST-012
# 中見出しスライドおよび章別目次モードの総合検証テストクラスです
class TestSectionDividerSystem(unittest.TestCase):
    """Marp CLIによるスライドレンダリングおよび章別目次（toc-chapters-only）の総合動作を検証します。"""

    # AC-5: 章別目次スライドの抽出動作とMarp描画を検証します
    def test_section_divider_and_toc_chapters_only(self) -> None:
        """toc-chapters-only 指定時に中見出しスライドのタイトルのみが目次に抽出されることを検証します。"""
        # テスト用スライドMarkdownを定義します
        markdown_text = """---
marp: true
theme: business-slide
size: 16:9
paginate: true
---

# タイトル
テストプレゼンテーション

## サブタイトル
中見出し機能総合検証デッキ

### 図書番号
TEST-DOC-001

### 所属・氏名・制作元等
ROLE-QA

---

<!-- _class: toc toc-chapters-only -->

# ページタイトル
目次

---

<!-- _class: section-divider pattern-title-only -->

# ページタイトル
第1章 要件定義

#### 本文
<div class="chapter-header-main">
  <h2 class="chapter-title">第1章 要件定義</h2>
</div>

---

# ページタイトル
要件定義の詳細内容

#### 本文
- 通常スライドの本文コンテンツです

---

<!-- _class: section-divider pattern-title-only -->

# ページタイトル
第2章 方式設計

#### 本文
<div class="chapter-header-main">
  <h2 class="chapter-title">第2章 方式設計</h2>
</div>

---

# ページタイトル
方式設計の詳細内容

#### 本文
- アーキテクチャの本文コンテンツです
"""
        # 一時ディレクトリを作成して検証を実行します
        with tempfile.TemporaryDirectory() as tmp_dir:
            # 一時Markdownファイルのパスを設定します
            tmp_md = Path(tmp_dir) / "test_deck.md"
            # 一時HTML出力ファイルのパスを設定します
            tmp_html = Path(tmp_dir) / "test_deck.html"
            # Markdownファイルを書き込みます
            tmp_md.write_text(markdown_text, encoding="utf-8")

            # Marp CLI 実行用コマンドを構築します
            marp_cmd = [
                # Node実行コマンドです
                "npx",
                # Marp CLI パッケージ名です
                "@marp-team/marp-cli",
                # 入力Markdownパスです
                str(tmp_md),
                # 設定ファイル指定です
                "--config-file",
                str(REPO_ROOT / "marp.config.js"),
                # テーマCSS指定です
                "--theme-set",
                str(REPO_ROOT / "themes" / "business-slide-theme.css"),
                # HTML出力指定です
                "--html",
                # 出力ファイルパスです
                "--output",
                str(tmp_html),
                # 標準入力待機無効化フラグです
                "--no-stdin",
            ]
            # 環境変数を準備します
            env = os.environ.copy()
            # Chromiumパスを設定します
            env["CHROME_PATH"] = "/usr/bin/chromium"

            # Marp CLI を実行します
            proc = subprocess.run(
                # コマンド引数です
                marp_cmd,
                # 作業ディレクトリです
                cwd=str(REPO_ROOT),
                # 出力をキャプチャします
                capture_output=True,
                # テキストモードです
                text=True,
                # 環境変数です
                env=env,
            )
            # Marp CLI が正常終了したことを検証します
            self.assertEqual(proc.returncode, 0, f"Marp CLI execution failed: {proc.stderr}")
            # 出力HTMLファイルが存在することを検証します
            self.assertTrue(tmp_html.exists(), "Output HTML file does not exist")

            # 生成されたHTMLコンテンツを読み込みます
            html_content = tmp_html.read_text(encoding="utf-8")

            # 目次スライド（toc toc-chapters-only）セクションを検証します
            self.assertIn("toc toc-chapters-only", html_content)
            # 中見出し「第1章 要件定義」が目次項目として抽出されていることを検証します
            self.assertIn("第1章 要件定義", html_content)
            # 中見出し「第2章 方式設計」が目次項目として抽出されていることを検証します
            self.assertIn("第2章 方式設計", html_content)
            # 通常スライドのタイトル「要件定義の詳細内容」が目次項目に含まれないことを検証します
            # （toc-chapters-only では通常スライドタイトルは目次から除外されます）
            # 目次内のリンクラベルとして存在しないことを確認します
            toc_section_match = re.search(r'<section[^>]*class="[^"]*toc[^"]*"[^>]*>([\s\S]*?)</section>', html_content)
            # 目次セクションが存在することを検証します
            self.assertIsNotNone(toc_section_match, "TOC section not found in HTML output")
            # 目次セクションのHTML文字列を取得します
            toc_html = toc_section_match.group(1)
            # 目次内に第1章の中見出しが含まれることを検証します
            self.assertIn("第1章 要件定義", toc_html)
            # 目次内に第2章の中見出しが含まれることを検証します
            self.assertIn("第2章 方式設計", toc_html)
            # 目次内に通常スライドのタイトルが含まれないことを検証します
            self.assertNotIn("要件定義の詳細内容", toc_html)
            # 目次内に通常スライドのタイトル2が含まれないことを検証します
            self.assertNotIn("方式設計の詳細内容", toc_html)


# @test TEST-UT-007
# 中見出しHTMLアンカーリンク直接生成・生Markdown露出防止単体テストクラスです
class TestSectionDividerHtmlLinksUnit(unittest.TestCase):
    """PBI-021: resolveSectionDividerSlide における生Markdown露出根絶と完全なHTMLタグ出力を検証する単体テスト。"""

    # Node.js を介して resolveSectionDividerSlide を実行するヘルパーメソッドです
    def _run_resolve_divider(self, divider_data: dict) -> dict:
        # 入力データをJSONシリアライズします
        json_input = json.dumps(divider_data, ensure_ascii=False)
        # Node実行用スクリプト文字列を定義します
        node_code = f"""
import {{ resolveSectionDividerSlide }} from './build/index.js';
const input = {json_input};
const result = resolveSectionDividerSlide(input);
process.stdout.write(JSON.stringify(result) + '\\n');
"""
        # プロセス実行時の環境変数辞書を複製します
        env = os.environ.copy()
        # Nodeプロセスを実行して標準出力を取得します
        proc = subprocess.run(
            # コマンド引数配列です
            ["node", "--input-type=module", "-e", node_code],
            # カレントディレクトリを作業リポジトリルートに指定します
            cwd=str(REPO_ROOT),
            # 出力をキャプチャします
            capture_output=True,
            # 文字列モードで取得します
            text=True,
            # 環境変数を渡します
            env=env,
        )
        # 終了コード0を検証します
        self.assertEqual(proc.returncode, 0, f"Node execution failed: {proc.stderr}")
        # 結果JSONをパースして返却します
        return json.loads(proc.stdout.strip())

    # AC-3: ページリンクのHTMLタグ直接出力を検証します
    def test_semantic_html_anchor_links(self) -> None:
        """ページ一覧のリンクが生Markdown記法ではなく完全なaタグとして生成されることを検証します。"""
        # 入力パラメータを定義します
        input_data = {
            # パターン種別です
            "pattern": "title-and-pages",
            # 章タイトルです
            "chapterTitle": "第2章 設計とアンカーリンク仕様",
            # ページ一覧です
            "chapterPages": [
                # ページ1です
                {"title": "データ構造とZodスキーマ定義", "pageNumber": 6},
                # ページ2です
                {"title": "ページ内アンカーリンクの動作仕様", "pageNumber": 7},
            ],
        }
        # 関数を実行します
        res = self._run_resolve_divider(input_data)
        # 生のMarkdown角括弧リンク構文が混入していないことを検証します
        self.assertNotIn("[データ構造とZodスキーマ定義](#6)", res["bodyContent"])
        # 生のMarkdown角括弧リンク構文2が混入していないことを検証します
        self.assertNotIn("[ページ内アンカーリンクの動作仕様](#7)", res["bodyContent"])
        # HTMLのアンカータグ1が生成されていることを検証します
        self.assertIn('<a href="#6">データ構造とZodスキーマ定義</a>', res["bodyContent"])
        # HTMLのアンカータグ2が生成されていることを検証します
        self.assertIn('<a href="#7">ページ内アンカーリンクの動作仕様</a>', res["bodyContent"])
        # リストタグで包まれていることを検証します
        self.assertIn('<ul class="chapter-pages-list">', res["bodyContent"])


# @test TEST-ST-013
# 中見出しスライド品質是正（フッター配置・通常ヘッダー非表示・章題名大見出し・4:3比率）総合検証テストクラスです
class TestSectionDividerLayoutQuality(unittest.TestCase):
    """PBI-021: 中見出しスライドの4:3比率描画、フッター絶対配置、通常ヘッダー非表示、章題名大見出しを検証する総合テスト。"""

    # ショウケーススライドのHTMLエクスポート成果物を検証します
    def test_showcase_slide_4_3_and_layout_quality(self) -> None:
        """ショウケーススライド（D01-000003）の4:3比率、フッター配置、ヘッダー非表示、生リンク根絶を検証します。"""
        # ショウケースHTMLファイルのパスを解決します
        html_path = REPO_ROOT / "slides" / "D01-000003_中見出しスライドサンプル" / "D01-000003_中見出しスライドサンプル.html"
        # ファイルが存在することを検証します
        self.assertTrue(html_path.exists(), f"Showcase HTML file not found: {html_path}")
        # HTMLテキストを読み込みます
        content = html_path.read_text(encoding="utf-8")

        # 1. 4:3画面比率（960x720）が適用されていることを検証します
        self.assertIn('viewBox="0 0 960 720"', content)
        # 4:3のdata-size属性が存在することを検証します
        self.assertIn('data-size="4:3"', content)

        # 2. 中見出しスライドセクション（section.section-divider）のCSSスタイル定義を検証します
        # 通常スライド左上ヘッダータイトルの非表示化ルール（h1/marp-h1）が存在することを検証します
        self.assertTrue(
            "section.section-divider>:is(h1,marp-h1)" in content or "section.section-divider > h1" in content,
            "Heading hide rule for section-divider not found in HTML"
        )
        # 章タイトルの大見出しスタイル（34pt以上）が存在することを検証します
        self.assertIn("font-size:34pt", content)
        # 章タイトルのアクセントバー描画スタイルが存在することを検証します
        self.assertIn("border-left:10px solid", content)

        # 3. フッター（機密表示およびコピーライト）の絶対配置ルールが存在することを検証します
        # コピーライトの絶対配置（bottom: 12px）ルールを検証します
        self.assertIn("bottom:12px", content)
        # 機密表示の絶対配置（bottom: 8px）ルールを検証します
        self.assertIn("bottom:8px", content)
        # 機密表示の右配置（right: 70px）ルールを検証します
        self.assertIn("right:70px", content)

        # 4. 生のMarkdownリンク記法（[テキスト](#ページ)）がHTML本文に残存していないことを検証します
        self.assertNotIn("](#6)", content)
        self.assertNotIn("](#7)", content)
        self.assertNotIn("](#11)", content)
        self.assertNotIn("](#12)", content)

        # 5. 正しいHTMLリンクタグが存在することを検証します
        self.assertIn('<a href="#6">データ構造とZodスキーマ定義</a>', content)
        self.assertIn('<a href="#7">ページ内アンカーリンクの動作仕様</a>', content)
        self.assertIn('<a href="#11">章別目次モード（toc-chapters-only）の仕組み</a>', content)
        self.assertIn('<a href="#12">まとめと今後の展望</a>', content)

        # 6. title-onlyおよびtitle-and-pagesの中見出し章タイトルが確実に表示されていることを検証します
        self.assertIn('<div class="chapter-title">第1章 中見出し機能の概要</div>', content)
        self.assertIn('<div class="chapter-title">第2章 設計とアンカーリンク仕様</div>', content)


# スクリプト直接実行時のエントリーポイントです
if __name__ == "__main__":
    # 単体テストを実行します
    unittest.main()
