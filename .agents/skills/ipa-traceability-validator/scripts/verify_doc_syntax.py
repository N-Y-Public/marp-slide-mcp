#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""設計図書 記述構文検査器 (PRG-DOC-001)。

機能概要:
  docs/ 配下の設計図書のうち、Frontmatter に doc_standard キーを持つ図書だけを対象に、
  03_documentation_standard.md と 04_id_numbering_rules.md の規約への適合を検査する。
  違反は固有のエラーコード付きで報告し、1件以上で終了コード1を返す。
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# コマンドライン引数解析モジュールをインポートします
import argparse
# JSON出力用モジュールをインポートします
import json
# 正規表現モジュールをインポートします
import re
# 終了コード制御用モジュールをインポートします
import sys
# パス操作用モジュールをインポートします
from pathlib import Path
# 型ヒント用の型をインポートします
from typing import Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------------------
# 定数の定義
# ---------------------------------------------------------------------------
# Frontmatter の必須キー（9種）を定義します
FM_KEYS = ["id", "title", "doc_type", "version", "status", "date", "author", "doc_standard", "tags"]
# doc_type に使用できる値の集合を定義します
DOC_TYPES = {"charter", "standard", "requirements", "basic_design", "detail_design", "test", "traceability", "template", "index"}
# status に使用できる値の集合を定義します
STATUSES = {"Draft", "Review", "Approved", "Deprecated"}
# 第1章の固定見出し（レベルと本文）の一覧を定義します
CH1_HEADINGS = [(1, "1 本書の位置づけ"), (2, "1.1 目的"), (2, "1.2 記述対象"), (2, "1.3 記述対象外と参照先"), (2, "1.4 改版履歴")]
# 図書階層コードの集合を定義します
TIERS = {"IDX", "GOV", "REQ", "BD", "DD", "TST", "RTM"}
# 固定の副種別を持つID種別と、その副種別集合を定義します
FIXED_SUB: Dict[str, Set[str]] = {
    # 要件IDの副種別を定義します
    "REQ": {"BIZ", "FNC", "NFR", "CON"},
    # データ形式IDの副種別を定義します
    "DAT": {"DBT", "FIL", "TYP"},
    # テストケースIDの副種別を定義します
    "TEST": {"UT", "IT", "ST"},
    # テスト結果IDの副種別を定義します
    "TRS": {"UT", "IT", "ST"},
    # 図書IDの副種別を定義します
    "DOC": TIERS,
    # 雛形IDの副種別を定義します
    "TPL": TIERS,
}
# 副種別を持たないID種別の集合を定義します
NO_SUB = {"PBI", "ADR", "FNC", "SCR", "TRN", "ASM"}
# 分類コード台帳の分類コードを副種別に使うID種別の集合を定義します
LEDGER_KINDS = {"EXT", "ERR", "MOD", "CLS", "INT", "PRG", "FN"}
# ID種別ごとの定義元図書階層を定義します
OWNER_TIERS: Dict[str, Set[str]] = {
    # 要件IDは要件定義書で定義します
    "REQ": {"REQ"},
    # 方式判断記録・機能・外部I/F・エラーは基本設計で定義します
    "ADR": {"BD"}, "FNC": {"BD"}, "EXT": {"BD"}, "ERR": {"BD"},
    # 画面・遷移・モジュール・クラス・内部I/F・プログラム・関数・データ形式は詳細設計で定義します
    "SCR": {"DD"}, "TRN": {"DD"}, "MOD": {"DD"}, "CLS": {"DD"}, "INT": {"DD"}, "PRG": {"DD"}, "FN": {"DD"}, "DAT": {"DD"},
    # テストケース・テスト結果はテスト図書で定義します
    "TEST": {"TST"}, "TRS": {"TST"},
    # 図書IDは索引で定義します
    "DOC": {"IDX"},
}
# 検査から除外する、ID形式に見えるが規約対象外の語を定義します
IGNORED_IDS = {"SHA-256", "SHA-384", "SHA-512", "AES-256", "ECMA-376"}
# ID形式の正規表現（種別・副種別・連番・子ID接尾辞）を定義します
ID_PATTERN = re.compile(r"(?<![A-Za-z0-9-])([A-Z]{2,5})(?:-([A-Z]{2,4}))?-(\d{3,4})((?:-(?:AC|IN|OUT|F|R|C)\d{2})*)(?![A-Za-z0-9-])")
# ホスト絶対パスの正規表現（文字列連結でソース内の直書きを避ける）を定義します
PATH_PATTERN = re.compile("(?:/Us" + "ers/|/ho" + "me/[A-Za-z]|(?<![A-Za-z0-9_])[A-Za-z]:" + r"\\[A-Za-z0-9_.-]{2,}\\" + ")")
# Obsidianリンクの正規表現を定義します（テーブル内のエスケープ \| にも対応）
WIKILINK_PATTERN = re.compile(r"\[\[([^\]|#]*)(?:#([^\]|\\]*))?(?:\\?\|[^\]]*)?\]\]")
# docs内図書へのMarkdown相対リンクの正規表現を定義します
MDLINK_PATTERN = re.compile(r"\]\((?!https?://|mailto:|#)[^)\s]*\.md(?:#[^)]*)?\)")
# インラインコードの正規表現を定義します
INLINE_CODE_PATTERN = re.compile(r"`[^`]*`")
# 検査対象外とするdocs直下のサブディレクトリ名の集合を定義します
EXCLUDED_DIRS = {"backlog", "legacy"}


# 規約表（指定見出し章の表の第1列に書かれたバッククォート付き語）を読み出す関数です
def read_rule_table(path: Path, heading_keyword: str) -> Optional[Set[str]]:
    # 規約図書が存在しない場合は取得不能として None を返します
    if not path.is_file():
        # 取得不能を返却します
        return None
    # 集計結果の集合を初期化します
    values: Set[str] = set()
    # 対象章の内部かどうかのフラグを初期化します
    in_section = False
    # コードブロック内かどうかのフラグを初期化します
    in_fence = False
    # 図書を1行ずつ走査します
    for line in path.read_text(encoding="utf-8").splitlines():
        # フェンス行ならフラグを反転して次の行へ進みます
        if line.lstrip().startswith(("```", "~~~")):
            # フェンス状態を反転します
            in_fence = not in_fence
            # 次の行へ進みます
            continue
        # コードブロック内の行は無視します
        if in_fence:
            # 次の行へ進みます
            continue
        # 見出し行ならば対象章の内外を更新します
        if re.match(r"^#{1,6} ", line):
            # 見出しに指定キーワードを含むかで章の内外を判定します
            in_section = heading_keyword in line
            # 次の行へ進みます
            continue
        # 対象章内の表の行のみ処理します
        if in_section and line.startswith("|"):
            # 第1列の文字列を取り出します
            first_cell = line.strip().strip("|").split("|")[0].strip()
            # バッククォートで囲まれた語であれば集合へ追加します
            matched = re.fullmatch(r"`([^`]+)`", first_cell)
            # 一致した場合のみ登録します
            if matched:
                # 語を集合へ追加します
                values.add(matched.group(1))
    # 集計結果を返却します
    return values


# Frontmatter を解析し、キー辞書と本文開始行番号（0始まり）を返す関数です
def parse_frontmatter(lines: List[str]) -> Tuple[Dict[str, str], int]:
    # 先頭が区切り線でなければ Frontmatter なしとして返します
    if not lines or lines[0].strip() != "---":
        # 空辞書と本文開始位置0を返却します
        return {}, 0
    # 終端の区切り線を探索します
    for end in range(1, len(lines)):
        # 終端の区切り線が見つかった場合の処理です
        if lines[end].strip() == "---":
            # キーと値の辞書を初期化します
            data: Dict[str, str] = {}
            # Frontmatter内の各行を走査します
            for row in lines[1:end]:
                # トップレベルの「キー: 値」形式の行を判定します
                matched = re.match(r"^([A-Za-z_]+):\s*(.*)$", row)
                # 一致した場合のみ辞書へ登録します
                if matched:
                    # 値の前後の引用符と空白を除去して登録します
                    data[matched.group(1)] = matched.group(2).strip().strip('"').strip("'")
            # 辞書と本文開始位置を返却します
            return data, end + 1
    # 終端が見つからない場合は Frontmatter なしとして返します
    return {}, 0


# 各行がフェンスドコードブロック内かどうかのフラグ列を返す関数です
def compute_fence_flags(lines: List[str], start: int) -> List[bool]:
    # 全行分のフラグを False で初期化します
    flags = [False] * len(lines)
    # コードブロック内かどうかの状態を初期化します
    in_fence = False
    # 本文開始行以降を走査します
    for idx in range(start, len(lines)):
        # フェンス行の場合の処理です
        if lines[idx].lstrip().startswith(("```", "~~~")):
            # フェンス行自体もコード扱いにします
            flags[idx] = True
            # フェンス状態を反転します
            in_fence = not in_fence
        else:
            # 通常行は現在のフェンス状態を記録します
            flags[idx] = in_fence
    # フラグ列を返却します
    return flags


# 図書の見出し本文（番号付き文字列）の一覧を返す関数です
def list_headings(path: Path) -> List[str]:
    # 図書を行に分割します
    lines = path.read_text(encoding="utf-8").splitlines()
    # 本文開始位置を取得します
    _, start = parse_frontmatter(lines)
    # コードブロック内判定を取得します
    flags = compute_fence_flags(lines, start)
    # 見出し本文を格納するリストを初期化します
    result: List[str] = []
    # 本文行を走査します
    for idx in range(start, len(lines)):
        # コードブロック外の見出し行を判定します
        matched = re.match(r"^#{1,6} (.*)$", lines[idx])
        # 見出し行であれば本文を追加します
        if matched and not flags[idx]:
            # 見出し本文を追加します
            result.append(matched.group(1).strip())
    # 見出し一覧を返却します
    return result


# ID文字列が種別・副種別の規約に適合するか判定し、不適合の理由を返す関数です
def judge_id(match: "re.Match[str]", ledger: Set[str]) -> Optional[str]:
    # ID全体の文字列を取得します
    full = match.group(0)
    # 規約対象外の語であれば適合として扱います
    if full in IGNORED_IDS:
        # 問題なしを返却します
        return None
    # 種別と副種別を取得します
    kind, sub = match.group(1), match.group(2)
    # 副種別を持たない種別の判定です
    if kind in NO_SUB:
        # 副種別が付いていれば不適合です
        return f"種別 {kind} は副種別を持たない" if sub else None
    # 固定副種別を持つ種別の判定です
    if kind in FIXED_SUB:
        # 副種別が許可集合に含まれなければ不適合です
        return None if sub in FIXED_SUB[kind] else f"種別 {kind} の副種別 '{sub}' は未登録"
    # 分類コード台帳を使う種別の判定です
    if kind in LEDGER_KINDS:
        # 分類コードが台帳に登録済みであれば適合です
        return None if sub in ledger else f"種別 {kind} の分類コード '{sub}' は台帳に未登録"
    # 上記以外は未登録の種別として不適合です
    return f"種別 '{kind}' は未登録"


# 1つの図書を検査し、エラー一覧とID定義一覧を返す関数です
def check_file(path: Path, rel: str, stems: Dict[str, Path], forbidden: Set[str], ledger: Set[str]) -> Tuple[List[str], List[Tuple[str, int]]]:
    # エラーメッセージのリストを初期化します
    errors: List[str] = []
    # ID定義（ID, 行番号）のリストを初期化します
    defs: List[Tuple[str, int]] = []
    # 図書を行に分割します
    lines = path.read_text(encoding="utf-8").splitlines()
    # Frontmatterと本文開始位置を取得します
    fm, start = parse_frontmatter(lines)
    # コードブロック内判定を取得します
    flags = compute_fence_flags(lines, start)

    # 必須キーの存在を検査します
    for key in FM_KEYS:
        # キーが欠落していればエラーとします
        if key not in fm:
            # 欠落エラーを追加します
            errors.append(f"[FM-MISSING] {rel}:1 Frontmatter必須キー '{key}' がありません。")
    # versionの書式を検査します
    if "version" in fm and not re.fullmatch(r"\d+\.\d+\.\d+", fm["version"]):
        # 書式エラーを追加します
        errors.append(f"[FM-VALUE] {rel}:1 version '{fm['version']}' がSemVer形式ではありません。")
    # statusの値を検査します
    if "status" in fm and fm["status"] not in STATUSES:
        # 値エラーを追加します
        errors.append(f"[FM-VALUE] {rel}:1 status '{fm['status']}' は許可値ではありません。")
    # dateの書式を検査します
    if "date" in fm and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", fm["date"]):
        # 書式エラーを追加します
        errors.append(f"[FM-VALUE] {rel}:1 date '{fm['date']}' がYYYY-MM-DD形式ではありません。")
    # doc_typeの値を検査します
    if "doc_type" in fm and fm["doc_type"] not in DOC_TYPES:
        # 値エラーを追加します
        errors.append(f"[FM-VALUE] {rel}:1 doc_type '{fm['doc_type']}' は許可値ではありません。")

    # 図書階層コードを図書IDから取得します
    tier_match = re.match(r"^(?:DOC|TPL)-([A-Z]+)-\d+", fm.get("id", ""))
    # 階層コード（取得できなければ空文字）を設定します
    tier = tier_match.group(1) if tier_match else ""
    # 見出し番号カウンタを初期化します
    counters: List[int] = []
    # 直前の見出しレベルを初期化します
    prev_level = 0
    # 検出した見出し（レベル, 本文）の一覧を初期化します
    seen_headings: List[Tuple[int, str]] = []

    # 本文行を1行ずつ走査します
    for idx in range(start, len(lines)):
        # 行文字列を取得します
        line = lines[idx]
        # 行番号（1始まり）を取得します
        lineno = idx + 1
        # ホスト絶対パスはコードブロック内も含めて検査します
        if PATH_PATTERN.search(line):
            # 絶対パスエラーを追加します
            errors.append(f"[PII-PATH] {rel}:{lineno} ホスト絶対パスが含まれています。")
        # コードブロック内の行は以降の検査から除外します
        if flags[idx]:
            # 次の行へ進みます
            continue
        # 見出し行かどうかを判定します
        head = re.match(r"^(#{1,6}) (.*)$", line)
        # 見出し行の検査処理です
        if head:
            # 見出しレベルを取得します
            level = len(head.group(1))
            # 見出し本文を取得します
            text = head.group(2).strip()
            # 見出しの記録へ追加します
            seen_headings.append((level, text))
            # 番号書式に適合するか判定します
            num_match = re.match(r"^(\d+(?:\.\d+){%d}) (\S.*)$" % (level - 1), text)
            # 解析済み番号リストを取得します（書式不正なら空）
            nums = [int(n) for n in num_match.group(1).split(".")] if num_match else []
            # 書式不正の場合の処理です
            if not num_match:
                # 書式エラーを追加します
                errors.append(f"[HDG-FORMAT] {rel}:{lineno} 見出しが章節項番号の書式に適合しません: {text}")
            # 階層飛ばしの場合の処理です
            if level > prev_level + 1:
                # 階層飛ばしエラーを追加します
                errors.append(f"[HDG-SKIP] {rel}:{lineno} 見出しレベルが直前から2段以上深くなっています: {text}")
                # 番号が解析できれば実番号、できなければ補完値でカウンタを更新します
                counters = nums if nums else counters + [1] * (level - len(counters))
            else:
                # 期待番号（直前の同階層+1、親が進んだ場合は1）を計算します
                expected = counters[: level - 1] + [(counters[level - 1] + 1) if len(counters) >= level else 1]
                # 書式適合かつ期待番号と不一致なら連番エラーとします
                if nums and nums != expected:
                    # 連番エラーを追加します
                    errors.append(f"[HDG-SEQ] {rel}:{lineno} 見出し番号が連番ではありません（期待 {'.'.join(map(str, expected))}）: {text}")
                # 違反の波及を避けるため期待番号をカウンタとして採用します
                counters = expected
            # 直前の見出しレベルを更新します
            prev_level = level
            # 見出しによるID定義を判定します（番号の後ろの先頭語）
            def_match = re.match(r"^\d+(?:\.\d+)*\s+[`*]*" + ID_PATTERN.pattern, text)
            # 見出し定義型のIDがあれば定義として記録します
            if def_match:
                # 定義されたID文字列を取り出します
                defs.append((re.search(ID_PATTERN, text).group(0), lineno))
        else:
            # 表の第1列によるID定義を判定します
            row_match = re.match(r"^\|\s*[*`]*" + ID_PATTERN.pattern + r"[*`]*\s*\|", line)
            # 表定義型のIDがあれば定義として記録します
            if row_match:
                # 定義されたID文字列を取り出します
                defs.append((re.search(ID_PATTERN, line).group(0), lineno))

        # インラインコードを除いた行を作成します
        plain = INLINE_CODE_PATTERN.sub("", line)
        # ID形式の文字列を走査して規約適合を検査します
        for id_match in ID_PATTERN.finditer(line):
            # 不適合の理由を判定します
            reason = judge_id(id_match, ledger)
            # 不適合であればエラーとします
            if reason:
                # ID書式エラーを追加します
                errors.append(f"[ID-PREFIX] {rel}:{lineno} {id_match.group(0)}: {reason}")
        # Obsidianリンクを走査して実在を検査します
        for link in WIKILINK_PATTERN.finditer(plain):
            # リンク先ファイル名（空なら同一図書、テーブル内エスケープ由来の末尾バックスラッシュを除去）を取得します
            target_stem = link.group(1).strip().rstrip("\\").strip()
            # リンク先見出しを取得します（テーブル内エスケープ由来の末尾バックスラッシュを除去）
            target_heading = (link.group(2) or "").strip().rstrip("\\").strip()
            # リンク先ファイルのパスを解決します
            target_path = path if not target_stem else stems.get(target_stem)
            # ファイルが解決できない場合の処理です
            if target_path is None:
                # 未解決エラーを追加します
                errors.append(f"[LNK-UNRESOLVED] {rel}:{lineno} リンク先ファイル '{target_stem}' が存在しません。")
            # 見出し指定があり、見出しが実在しない場合の処理です
            elif target_heading and target_heading not in list_headings(target_path):
                # 未解決エラーを追加します
                errors.append(f"[LNK-UNRESOLVED] {rel}:{lineno} リンク先見出し '{target_heading}' が {target_path.name} に存在しません。")
        # docs内図書へのMarkdown相対リンクを検査します
        if MDLINK_PATTERN.search(plain):
            # 相対リンクエラーを追加します
            errors.append(f"[LNK-MDREL] {rel}:{lineno} docs内図書へのMarkdown相対リンクは禁止です。")
        # 禁止語を検査します
        for word in sorted(forbidden):
            # 禁止語が含まれていればエラーとします
            if word in plain:
                # 禁止語エラーを追加します
                errors.append(f"[WRD-FORBIDDEN] {rel}:{lineno} 禁止語 '{word}' が含まれています。")

    # 第1章の固定見出しを検査します
    for level, text in CH1_HEADINGS:
        # 固定見出しが存在しなければエラーとします
        if (level, text) not in seen_headings:
            # 第1章欠落エラーを追加します
            errors.append(f"[CH1-MISSING] {rel}:1 第1章の固定見出し '{'#' * level} {text}' がありません。")

    # 定義元図書の違反を検査します
    for def_id, lineno in defs:
        # ID種別（接頭辞）を取得します
        kind = def_id.split("-")[0]
        # 定義元階層が規定されている種別で、図書階層が一致しなければエラーとします
        if kind in OWNER_TIERS and tier not in OWNER_TIERS[kind]:
            # 定義元違反エラーを追加します
            errors.append(f"[ID-OWNER] {rel}:{lineno} {def_id} は階層 {sorted(OWNER_TIERS[kind])} の図書で定義する必要があります。")
    # エラーとID定義を返却します
    return errors, defs


# @spec FN-DOC-001 verifyDocSyntax
# 規約図書を読み込んで docs 配下の対象図書全体を検査する関数です
def check_docs(docs_root: Path, rules_root: Path) -> Tuple[List[str], Dict[str, int]]:
    # エラーリストを初期化します
    errors: List[str] = []
    # 禁止語を規約図書から読み込みます
    forbidden = read_rule_table(rules_root / "00_project_charter" / "03_documentation_standard.md", "禁止語リスト")
    # 分類コード台帳を規約図書から読み込みます
    ledger = read_rule_table(rules_root / "00_project_charter" / "04_id_numbering_rules.md", "分類コード台帳")
    # いずれかが取得できない場合は規約不在エラーとして返します
    if forbidden is None or ledger is None:
        # 規約不在エラーを返却します
        return ["[RULE-MISSING] 03_documentation_standard.md または 04_id_numbering_rules.md の規約表を読み込めません。"], {"doc_syntax_files": 0}
    # 全図書のファイル名（拡張子なし）から実パスへの索引を作成します
    stems = {p.stem: p for p in sorted(docs_root.rglob("*.md"))}
    # 対象図書の件数を初期化します
    count = 0
    # 全図書横断のID定義記録（ID→場所）を初期化します
    seen: Dict[str, str] = {}
    # docs配下の全Markdownを走査します
    for path in sorted(docs_root.rglob("*.md")):
        # 検査対象外ディレクトリ配下はスキップします
        if EXCLUDED_DIRS & set(path.relative_to(docs_root).parts):
            # 次の図書へ進みます
            continue
        # 図書の先頭行を読み込みます
        head_lines = path.read_text(encoding="utf-8").splitlines()
        # Frontmatterを解析します
        fm, _ = parse_frontmatter(head_lines)
        # doc_standard を持たない図書は対象外とします
        if "doc_standard" not in fm:
            # 次の図書へ進みます
            continue
        # 対象図書数を加算します
        count += 1
        # 表示用の相対パスを作成します
        rel = path.relative_to(docs_root).as_posix()
        # 図書を検査します
        file_errors, defs = check_file(path, rel, stems, forbidden, ledger)
        # 図書内のエラーを集約します
        errors.extend(file_errors)
        # ID定義の二重定義を検査します
        for def_id, lineno in defs:
            # 既に定義済みであれば二重定義エラーとします
            if def_id in seen:
                # 二重定義エラーを追加します
                errors.append(f"[ID-DUP] {rel}:{lineno} {def_id} は {seen[def_id]} で既に定義されています。")
            else:
                # 初出のIDは定義場所を記録します
                seen[def_id] = f"{rel}:{lineno}"
    # エラーと統計を返却します
    return errors, {"doc_syntax_files": count}


# メインエントリポイント関数です
def main(argv: Optional[List[str]] = None) -> int:
    # 引数パーサーを初期化します
    parser = argparse.ArgumentParser(description="設計図書 記述構文検査器")
    # 検査対象のdocsルートを指定する引数を追加します
    parser.add_argument("--docs-root", type=Path, default=Path(__file__).resolve().parents[4] / "docs", help="検査対象のdocsディレクトリ")
    # 規約図書を含むdocsルートを指定する引数を追加します
    parser.add_argument("--rules-root", type=Path, default=Path(__file__).resolve().parents[4] / "docs", help="規約図書を含むdocsディレクトリ")
    # 出力形式を指定する引数を追加します
    parser.add_argument("--format", choices=["text", "json"], default="text", help="出力形式")
    # 引数を解析します
    args = parser.parse_args(argv)
    # docsルートの存在を確認します
    if not args.docs_root.is_dir():
        # 入力異常を標準エラーへ出力します
        print(f"エラー: {args.docs_root.name} ディレクトリが存在しません。", file=sys.stderr)
        # 入出力異常の終了コードを返却します
        return 2
    # 検査を実行します
    errors, stats = check_docs(args.docs_root, args.rules_root)
    # JSON形式の出力処理です
    if args.format == "json":
        # 結果をJSONで出力します
        print(json.dumps({"status": "PASS" if not errors else "FAIL", "error_count": len(errors), "stats": stats, "errors": errors}, ensure_ascii=False, indent=2))
    else:
        # 検査対象図書数を出力します
        print(f"[verify_doc_syntax] 対象図書: {stats['doc_syntax_files']} 件")
        # 各エラーを出力します
        for err in errors:
            # エラー行を出力します
            print(err)
        # 総合判定を出力します
        print(f"RESULT: {'PASS' if not errors else 'FAIL'} ({len(errors)} violations)")
    # 違反の有無で終了コードを返却します
    return 0 if not errors else 1


# スクリプトとして実行された場合のみメイン関数を呼び出します
if __name__ == "__main__":
    # 終了コードを指定してプロセスを終了します
    sys.exit(main())
