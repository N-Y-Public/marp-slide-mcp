#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# @spec FN-DOC-001 verifyRtm
"""IPA共通フレーム2013 × PBI駆動アジャイル 要件追跡マトリクス (RTM) & 構文検証ツール。

機能概要:
  1. docs/05_traceability/01_traceability_matrix.md における PBI / REQ / MOD / FN / TEST IDの双方向追跡検査
  2. docs/backlog/{todo,in_progress,done}/ 配下のPBIファイル構文およびRTMとの整合性検査
  3. ソースコード (@spec) およびテストコード (@test) の追跡タグ整合性検査
  4. docs/ 配下の設計図書記述構文検査 (verify_doc_syntax.py 呼び出し)
  5. .agents/ 配下のスキル・ルール・MCP設定の構文検査
  6. 任意指定ファイル (--req-file, --design-file, --test-file, --rtm-file) のカスタムRTM検査
"""

# ---------------------------------------------------------------------------
# 標準ライブラリのインポート
# ---------------------------------------------------------------------------
# コマンドライン引数解析モジュールをインポートします
import argparse
# JSON構造データの解析・出力モジュールをインポートします
import json
# 正規表現マッチングモジュールをインポートします
import re
# システム終了コードおよび標準入出力制御モジュールをインポートします
import sys
# ファイルパス操作用のオブジェクト指向パスモジュールをインポートします
from pathlib import Path
# 同一ディレクトリの構文検査器を動的に読み込むためのモジュールをインポートします
import importlib.util
# 型ヒント定義用のコレクション型をインポートします
from typing import Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------------------
# 定数・正規表現パターンの定義
# ---------------------------------------------------------------------------
# プロダクトバックログアイテムID（PBI-001, PBI-018 等）を抽出する正規表現です
PAT_PBI = re.compile(r"\bPBI-\d{3}\b")
# 機能要件・非機能要件ID（REQ-FNC-001, REQ-NFR-001, 旧REQ-F-001 等）を抽出する正規表現です
PAT_REQ = re.compile(r"\bREQ-(?:FNC|NFR|F)-\d{3}\b")
# サブシステムモジュールID（MOD-SRV-001, 旧MOD-001, MOD-THEME-001 等）を抽出する正規表現です
PAT_MOD = re.compile(r"\bMOD-(?:[A-Z0-9]+(?:-[A-Z0-9]+)*)\b")
# プログラム仕様ID（PRG-SRV-001 等）を抽出する正規表現です
PAT_PRG = re.compile(r"\bPRG-[A-Z]{3}-\d{3}\b")
# 関数仕様ID（FN-SRV-001 等）を抽出する正規表現です
PAT_FN = re.compile(r"\bFN-[A-Z]{3}-\d{3}\b")
# テストケースID（TEST-UT-001, TEST-IT-001, TEST-ST-001 等）を抽出する正規表現です
PAT_TEST = re.compile(r"\bTEST-(?:UT|IT|ST)-\d{3}\b")
# ソースコード内の @spec タグを抽出する正規表現です
PAT_TAG_SPEC = re.compile(r"@spec\s+([A-Za-z0-9_-]+)")
# テストコード内の @test タグを抽出する正規表現です
PAT_TAG_TEST = re.compile(r"@test\s+(TEST-(?:UT|IT|ST)-\d{3})")


# テキスト全体から指定パターンのIDを一意に抽出する補助関数です
def extract_ids(text: str, pattern: re.Pattern) -> Set[str]:
    # 見つかったすべてのIDを集合として返却します
    return set(pattern.findall(text))


# 正本要件追跡マトリクス（01_traceability_matrix.md）のテーブル行を解析する関数です
def parse_project_rtm(rtm_text: str) -> Dict[str, Dict[str, Set[str]]]:
    # 要件IDをキーとし、紐付くPBI・MOD・FN・TESTの集合を保持する辞書を初期化します
    mapping: Dict[str, Dict[str, Set[str]]] = {}
    # RTMテキストを行単位で走査します
    for line in rtm_text.splitlines():
        # 前後の空白を除去します
        stripped = line.strip()
        # Markdownテーブル行でない場合はスキップします
        if not stripped.startswith("|"):
            # 次の行へ進みます
            continue
        # 行内の要件IDを抽出します
        reqs_in_row = PAT_REQ.findall(stripped)
        # 要件IDが含まれないヘッダー行や区切り行はスキップします
        if not reqs_in_row:
            # 次の行へ進みます
            continue
        # 行内のPBI IDを抽出します
        pbis_in_row = set(PAT_PBI.findall(stripped))
        # 行内のモジュールIDを抽出します
        mods_in_row = set(PAT_MOD.findall(stripped))
        # 行内のプログラムIDを抽出します
        prgs_in_row = set(PAT_PRG.findall(stripped))
        # 行内の関数IDを抽出します
        fns_in_row = set(PAT_FN.findall(stripped))
        # 行内のテストIDを抽出します
        tests_in_row = set(PAT_TEST.findall(stripped))
        # 行内の各要件IDに対して紐付け情報をマージします
        for req_id in reqs_in_row:
            # 未登録要件IDのエントリを初期化します
            if req_id not in mapping:
                # 空集合辞書を作成します
                mapping[req_id] = {"pbis": set(), "mods": set(), "prgs": set(), "fns": set(), "tests": set()}
            # PBI ID集合を統合します
            mapping[req_id]["pbis"].update(pbis_in_row)
            # モジュールID集合を統合します
            mapping[req_id]["mods"].update(mods_in_row)
            # プログラムID集合を統合します
            mapping[req_id]["prgs"].update(prgs_in_row)
            # 関数ID集合を統合します
            mapping[req_id]["fns"].update(fns_in_row)
            # テストID集合を統合します
            mapping[req_id]["tests"].update(tests_in_row)
    # 構築したマッピング辞書を返却します
    return mapping


# 正本設計図書群におけるID整合性と双方向トレーサビリティを検証する関数です
def verify_project_docs_rtm(repo_root: Path) -> Tuple[List[str], Dict[str, int], Dict[str, Set[str]]]:
    # エラーメッセージのリストを初期化します
    errors: List[str] = []
    # 各正本設計図書のパスを定義します
    req_path = repo_root / "docs" / "01_requirements" / "01_requirements_specification.md"
    # ソフトウェア構造設計書のパスを設定します
    mod_path = repo_root / "docs" / "03_detail_design" / "01_software_structure_design.md"
    # プログラム仕様書のパスを設定します
    prg_path = repo_root / "docs" / "03_detail_design" / "03_program_specification.md"
    # テスト仕様書のパスを設定します
    test_path = repo_root / "docs" / "04_test" / "01_test_specification.md"
    # 要件追跡マトリクスのパスを設定します
    rtm_path = repo_root / "docs" / "05_traceability" / "01_traceability_matrix.md"

    # 正本ファイル群の存在を確認します
    required_docs = [req_path, mod_path, prg_path, test_path, rtm_path]
    # 各ファイルが存在するか走査します
    for doc in required_docs:
        # ファイルが存在しない場合
        if not doc.is_file():
            # ファイル欠落エラーを追加します
            errors.append(f"[DOC-MISSING] 正本設計図書が存在しません: {doc.relative_to(repo_root)}")

    # 欠落がある場合は処理を中断して返却します
    if errors:
        # 空の統計情報とともにエラーリストを返します
        return errors, {"doc_req_count": 0, "doc_mod_count": 0, "doc_fn_count": 0, "doc_test_count": 0}, {}

    # 各正本図書のテキストを読み込みます
    req_text = req_path.read_text(encoding="utf-8")
    # 構造設計書テキストを読み込みます
    mod_text = mod_path.read_text(encoding="utf-8")
    # プログラム仕様書テキストを読み込みます
    prg_text = prg_path.read_text(encoding="utf-8")
    # テスト仕様書テキストを読み込みます
    test_text = test_path.read_text(encoding="utf-8")
    # 要件追跡マトリクステキストを読み込みます
    rtm_text = rtm_path.read_text(encoding="utf-8")

    # 定義元から各ID集合を抽出します
    defined_reqs = extract_ids(req_text, PAT_REQ)
    # モジュールID集合を抽出します
    defined_mods = extract_ids(mod_text, PAT_MOD)
    # プログラムID集合を抽出します
    defined_prgs = extract_ids(prg_text, PAT_PRG)
    # 関数ID集合を抽出します
    defined_fns = extract_ids(prg_text, PAT_FN)
    # テストID集合を抽出します
    defined_tests = extract_ids(test_text, PAT_TEST)

    # RTMテーブルをパースします
    rtm_map = parse_project_rtm(rtm_text)

    # 1. 前方追跡検査: 全要件がRTMに登録され、PBI・MOD・TESTに紐付いているか
    for req_id in sorted(defined_reqs):
        # 要件がRTMに存在しない場合
        if req_id not in rtm_map:
            # 未登録エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} が 01_traceability_matrix.md に登録されていません。")
            # 次の要件へ進みます
            continue
        # PBIが紐付いていない場合
        if not rtm_map[req_id]["pbis"]:
            # PBI未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} に対応する PBI が割り当てられていません。")
        # モジュールが紐付いていない場合
        if not rtm_map[req_id]["mods"]:
            # モジュール未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} に対応するモジュール (MOD-*) が割り当てられていません。")
        # テストが紐付いていない場合
        if not rtm_map[req_id]["tests"]:
            # テスト未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} を検証するテスト (TEST-*) が割り当てられていません。")

    # 2. 後方追跡検査: RTM内のIDが正本に実在するか
    rtm_all_reqs = set(rtm_map.keys())
    # RTM内の全モジュールIDを収集します
    rtm_all_mods: Set[str] = set()
    # RTM内の全テストIDを収集します
    rtm_all_tests: Set[str] = set()
    # RTM内の全関数IDを収集します
    rtm_all_fns: Set[str] = set()
    # 各要件のエントリを走査します
    for entry in rtm_map.values():
        # モジュールIDを統合します
        rtm_all_mods.update(entry["mods"])
        # テストIDを統合します
        rtm_all_tests.update(entry["tests"])
        # 関数IDを統合します
        rtm_all_fns.update(entry["fns"])

    # 未定義要件参照を検査します
    for dangling_req in sorted(rtm_all_reqs - defined_reqs):
        # 未定義要件エラーを追加します
        errors.append(f"[RTM-DANGLING-REQ] RTMが未定義の要件ID {dangling_req} を参照しています。")
    # 未定義モジュール参照を検査します
    for dangling_mod in sorted(rtm_all_mods - defined_mods):
        # 未定義モジュールエラーを追加します
        errors.append(f"[RTM-DANGLING-MOD] RTMが未定義のモジュールID {dangling_mod} を参照しています。")
    # 未定義テスト参照を検査します
    for dangling_test in sorted(rtm_all_tests - defined_tests):
        # 未定義テストエラーを追加します
        errors.append(f"[RTM-DANGLING-TEST] RTMが未定義のテストID {dangling_test} を参照しています。")
    # 未定義関数参照を検査します
    for dangling_fn in sorted(rtm_all_fns - defined_fns):
        # 未定義関数エラーを追加します
        errors.append(f"[RTM-DANGLING-FN] RTMが未定義の関数ID {dangling_fn} を参照しています。")

    # 3. 孤立モジュール・孤立テスト検査
    for orphan_mod in sorted(defined_mods - rtm_all_mods):
        # 孤立モジュールエラーを追加します
        errors.append(f"[RTM-ORPHAN-MOD] モジュール {orphan_mod} がRTM内のどの要件にも紐付いていません。")
    # 孤立テストを検査します
    for orphan_test in sorted(defined_tests - rtm_all_tests):
        # 孤立テストエラーを追加します
        errors.append(f"[RTM-ORPHAN-TEST] テストケース {orphan_test} がRTM内のどの要件にも紐付いていません。")

    # 統計情報をまとめます
    stats = {
        "doc_req_count": len(defined_reqs),
        "doc_mod_count": len(defined_mods),
        "doc_fn_count": len(defined_fns),
        "doc_test_count": len(defined_tests),
    }
    # 定義集合辞書を作成します
    defined_sets = {
        "reqs": defined_reqs,
        "mods": defined_mods,
        "prgs": defined_prgs,
        "fns": defined_fns,
        "tests": defined_tests,
    }
    # エラーと統計および定義集合を返却します
    return errors, stats, defined_sets


# PBI管理ディレクトリおよびPBIファイルの構文・トレーサビリティを検証する関数です
def verify_pbi_backlog(repo_root: Path, rtm_text: str, defined_sets: Dict[str, Set[str]]) -> Tuple[List[str], int]:
    # 検出されたPBI関連エラーのリストを初期化します
    errors: List[str] = []
    # 検証済みPBIファイル数を保持するカウンタを初期化します
    pbi_count = 0
    # バックログルートディレクトリのパスを設定します
    backlog_dir = repo_root / "docs" / "backlog"
    # 状態別の必須サブディレクトリと許容ステータスの対応辞書を定義します
    status_dirs = {"todo": {"todo"}, "in_progress": {"designing", "implementing", "testing"}, "done": {"done"}}
    # バックログ内で定義が確認された全PBI IDの集合を初期化します
    defined_pbis: Set[str] = set()
    # RTM内の全PBI IDを抽出します
    rtm_pbis = set(PAT_PBI.findall(rtm_text))

    # 定義済みID集合を取得します
    valid_reqs = defined_sets.get("reqs", set())
    # 定義済みMOD集合（新旧含む）を取得します
    valid_mods = defined_sets.get("mods", set()) | {"MOD-001", "MOD-002", "MOD-003", "MOD-004", "MOD-THEME-001"}
    # 定義済みTEST集合を取得します
    valid_tests = defined_sets.get("tests", set())

    # 各サブディレクトリの存在と配下のPBIファイルを走査します
    for sub_name, allowed_statuses in status_dirs.items():
        # サブディレクトリのフルパスを構築します
        sub_dir = backlog_dir / sub_name
        # サブディレクトリが存在しない場合はエラーを記録します
        if not sub_dir.is_dir():
            # ディレクトリ不在エラーを追加します
            errors.append(f"[PBI-DIR-MISSING] PBI管理ディレクトリが存在しません: {sub_dir.relative_to(repo_root)}")
            # 次のサブディレクトリへ進みます
            continue
        # サブディレクトリ内のPBI Markdownファイルをソート順で走査します
        for pbi_file in sorted(sub_dir.glob("PBI-*.md")):
            # 検証済みPBIファイル数をインクリメントします
            pbi_count += 1
            # PBIファイルのテキストをUTF-8で読み込みます
            content = pbi_file.read_text(encoding="utf-8")
            # 先頭のYAML Frontmatterブロックを正規表現で抽出します
            fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
            # Frontmatterが存在しない場合はエラーを記録します
            if not fm_match:
                # Frontmatter欠落エラーを追加します
                errors.append(f"[PBI-FM-ERR] {pbi_file.relative_to(repo_root)} に有効なYAML Frontmatterがありません。")
                # 次のファイルへ進みます
                continue
            # Frontmatter本文を取得します
            fm_body = fm_match.group(1)
            # pbi_id フィールドを抽出します
            id_match = re.search(r'^pbi_id:\s*"?(PBI-\d{3})"?', fm_body, re.MULTILINE)
            # type フィールドを抽出します
            type_match = re.search(r'^type:\s*"?(feature|enhancement|bugfix)"?', fm_body, re.MULTILINE)
            # status フィールドを抽出します
            status_match = re.search(r'^status:\s*"?(todo|designing|implementing|testing|done)"?', fm_body, re.MULTILINE)
            # priority フィールドを抽出します
            prio_match = re.search(r'^priority:\s*"?(high|medium|low)"?', fm_body, re.MULTILINE)
            # 必須メタデータのいずれかが欠落している場合はエラーを記録します
            if not (id_match and type_match and status_match and prio_match):
                # メタデータ不正エラーを追加します
                errors.append(f"[PBI-META-ERR] {pbi_file.relative_to(repo_root)} のFrontmatter必須項目 (pbi_id/type/status/priority) が不正です。")
                # 次のファイルへ進みます
                continue
            # 抽出したPBI ID文字列を取得します
            pbi_id = id_match.group(1)
            # 抽出したステータス文字列を取得します
            pbi_status = status_match.group(1)
            # 定義済みPBI集合へ追加します
            defined_pbis.add(pbi_id)
            # 配置ディレクトリとstatusフィールドが整合しているか確認します
            if pbi_status not in allowed_statuses:
                # ステータス不整合エラーを追加します
                errors.append(f"[PBI-STATUS-ERR] {pbi_file.relative_to(repo_root)} の status '{pbi_status}' が配置先 '{sub_name}/' と一致しません。")
            # 必須Markdownセクション（1〜5）が存在するか確認します
            for sec_num in range(1, 6):
                # 見出しパターン（## 1. または ## 1 または # 1 または ## 1.1 等）を検査します
                if not re.search(rf"^(?:##|#)\s+{sec_num}(?:\.|\s+)", content, re.MULTILINE):
                    # セクション欠落エラーを追加します
                    errors.append(f"[PBI-SEC-ERR] {pbi_file.relative_to(repo_root)} に必須セクション {sec_num} がありません。")
            # セクション2の必須サブ見出し（2.1 やること (In Scope)）が存在するか確認します
            if not re.search(r"^###\s+2\.1\s+やること\s+\(In Scope\)", content, re.MULTILINE):
                # スコープ見出し2.1欠落エラーを追加します
                errors.append(f"[PBI-SCOPE-ERR] {pbi_file.relative_to(repo_root)} に必須見出し '### 2.1 やること (In Scope)' がありません。")
            # セクション2の必須サブ見出し（2.2 やらないこと (Out of Scope)）が存在するか確認します
            if not re.search(r"^###\s+2\.2\s+やらないこと\s+\(Out of Scope\)", content, re.MULTILINE):
                # スコープ見出し2.2欠落エラーを追加します
                errors.append(f"[PBI-SCOPE-ERR] {pbi_file.relative_to(repo_root)} に必須見出し '### 2.2 やらないこと (Out of Scope)' がありません。")
            # 受け入れ基準（AC-1 等）のGiven-When-Then記述が存在するか確認します
            if not re.search(r"-\s*\[[ xX]\]\s*\*\*AC-\d+:\*\*\s*Given\s+.+When\s+.+Then\s+", content):
                # AC形式不正エラーを追加します
                errors.append(f"[PBI-AC-ERR] {pbi_file.relative_to(repo_root)} に Given-When-Then 形式の受け入れ基準 (AC) がありません。")
            # Frontmatter内の related_req_ids 行からREQ IDを抽出します
            req_line = re.search(r"^related_req_ids:\s*\[([^\]]*)\]", fm_body, re.MULTILINE)
            # Frontmatter内の related_mod_ids 行からMOD IDを抽出します
            mod_line = re.search(r"^related_mod_ids:\s*\[([^\]]*)\]", fm_body, re.MULTILINE)
            # Frontmatter内の related_test_ids 行からTEST IDを抽出します
            test_line = re.search(r"^related_test_ids:\s*\[([^\]]*)\]", fm_body, re.MULTILINE)
            # PBI内で参照されているREQ集合を取得します
            pbi_reqs = set(PAT_REQ.findall(req_line.group(1))) if req_line else set()
            # PBI内で参照されているMOD集合を取得します
            pbi_mods = set(PAT_MOD.findall(mod_line.group(1))) if mod_line else set()
            # PBI内で参照されているTEST集合を取得します
            pbi_tests = set(PAT_TEST.findall(test_line.group(1))) if test_line else set()

            # PBIが参照するREQが正本要件定義書に実在するか検査します
            for r_id in sorted(pbi_reqs - valid_reqs):
                # 未定義REQ参照エラーを追加します
                errors.append(f"[PBI-DANGLING-REQ] {pbi_id} が未定義の要件ID {r_id} を参照しています。")
            # PBIが参照するMODが構造設計書に実在するか検査します
            for m_id in sorted(pbi_mods - valid_mods):
                # 未定義MOD参照エラーを追加します
                errors.append(f"[PBI-DANGLING-MOD] {pbi_id} が未定義のモジュールID {m_id} を参照しています。")
            # PBIが参照するTESTがテスト仕様書に実在するか検査します
            for t_id in sorted(pbi_tests - valid_tests):
                # 未定義TEST参照エラーを追加します
                errors.append(f"[PBI-DANGLING-TEST] {pbi_id} が未定義のテストID {t_id} を参照しています。")

            # ステータスが done の場合は関連IDがすべて埋まりRTMに反映されているか検査します
            if pbi_status == "done":
                # いずれかの関連IDリストが空であればエラーとします
                if not (pbi_reqs and pbi_mods and pbi_tests):
                    # 完了PBIのID未記録エラーを追加します
                    errors.append(f"[PBI-DONE-INCOMPLETE] 完了PBI {pbi_id} の related_req_ids / related_mod_ids / related_test_ids が未記入です。")
                # RTM全体に当該PBI IDが記録されているか確認します
                if pbi_id not in rtm_pbis:
                    # RTM未反映エラーを追加します
                    errors.append(f"[PBI-RTM-UNTRACED] 完了PBI {pbi_id} が 01_traceability_matrix.md に記録されていません。")

    # RTM内で参照されている全PBI ID（初期ベースライン PBI-000 を除く）が実在するか検査します
    for dangling_pbi in sorted((rtm_pbis - {"PBI-000"}) - defined_pbis):
        # 未定義PBI参照エラーを追加します
        errors.append(f"[RTM-DANGLING-PBI] RTMが docs/backlog/ に存在しないPBI ID {dangling_pbi} を参照しています。")

    # エラーリストと検証済みPBIファイル数を返却します
    return errors, pbi_count


# ソースコード内の @spec タグおよびテストコード内の @test タグの整合性を検証する関数です
def verify_code_trace_tags(repo_root: Path, defined_sets: Dict[str, Set[str]]) -> Tuple[List[str], Dict[str, int]]:
    # エラーメッセージのリストを初期化します
    errors: List[str] = []
    # 検出された @spec タグの集合を初期化します
    found_specs: Set[str] = set()
    # 検出された @test タグの集合を初期化します
    found_tests: Set[str] = set()

    # 有効な仕様ID（関数仕様およびモジュール・プログラム仕様）を構築します
    valid_spec_ids = defined_sets.get("fns", set()) | defined_sets.get("mods", set()) | defined_sets.get("prgs", set())
    # 有効なテストIDを構築します
    valid_test_ids = defined_sets.get("tests", set())
    # 必須検査対象の関数仕様ID集合を取得します
    defined_fns = defined_sets.get("fns", set())

    # 1. ソースコード走査対象ファイルの探索
    src_patterns = ["src/**/*.ts", "marp.config.js", "pptx_converter/**/*.js", "scripts/**/*.py", ".agents/skills/ipa-traceability-validator/scripts/*.py"]
    # 走査対象ソースファイルのリストを初期化します
    source_files: List[Path] = []
    # 各パターンに合致するファイルを収集します
    for pat in src_patterns:
        # パス一覧を取得します
        source_files.extend(repo_root.glob(pat))

    # 各ソースファイルを検査します
    for s_file in sorted(set(source_files)):
        # ファイル内容をUTF-8で読み込みます
        text = s_file.read_text(encoding="utf-8")
        # @spec タグを抽出します
        specs = PAT_TAG_SPEC.findall(text)
        # 各specタグを検査します
        for sp in specs:
            # 見つかったタグ集合に追加します
            found_specs.add(sp)
            # 有効な仕様IDに含まれない場合はエラーとします
            if sp not in valid_spec_ids:
                # 未定義仕様タグエラーを追加します
                errors.append(f"[TAG-DANGLING-SPEC] {s_file.relative_to(repo_root)} の @spec {sp} は正本仕様書に定義されていません。")

    # 2. 定義済み関数（FN-*）がすべてソースコード内に実装されているか（AC-2）検査します
    for missing_fn in sorted(defined_fns - found_specs):
        # 実装欠落エラーを追加します
        errors.append(f"[TAG-UNIMPLEMENTED-FN] プログラム仕様書の関数 {missing_fn} に対する @spec タグがソースコードに存在しません。")

    # 3. テストコード走査対象ファイルの探索
    test_patterns = ["tests/**/*.py", "tests/**/*.js"]
    # 走査対象テストファイルのリストを初期化します
    test_files: List[Path] = []
    # 各パターンに合致するファイルを収集します
    for pat in test_patterns:
        # パス一覧を取得します
        test_files.extend(repo_root.glob(pat))

    # 各テストファイルを検査します
    for t_file in sorted(set(test_files)):
        # ファイル内容をUTF-8で読み込みます
        text = t_file.read_text(encoding="utf-8")
        # @test タグを抽出します
        tests = PAT_TAG_TEST.findall(text)
        # 各testタグを検査します
        for tt in tests:
            # 見つかったテストタグ集合に追加します
            found_tests.add(tt)
            # 有効なテストIDに含まれない場合はエラーとします
            if tt not in valid_test_ids:
                # 未定義テストタグエラーを追加します
                errors.append(f"[TAG-DANGLING-TEST] {t_file.relative_to(repo_root)} の @test {tt} はテスト仕様書に定義されていません。")

    # 統計情報をまとめます
    stats = {
        "tagged_specs": len(found_specs),
        "tagged_tests": len(found_tests),
        "verified_fns": len(defined_fns & found_specs),
    }
    # エラーリストと統計情報を返却します
    return errors, stats


# 設計図書の記述構文検査器 (verify_doc_syntax.py) を呼び出して構文違反を集計する関数です
def verify_doc_syntax_files(repo_root: Path) -> Tuple[List[str], Dict[str, int]]:
    # 同一ディレクトリの構文検査器のパスを組み立てます
    script = Path(__file__).resolve().parent / "verify_doc_syntax.py"
    # 構文検査器が存在しない場合はエラーとして返します
    if not script.is_file():
        # 検査器不在エラーと空の統計を返却します
        return ["[DOCSYN-MISSING] verify_doc_syntax.py が存在しません。"], {"doc_syntax_files": 0}
    # 構文検査器をモジュールとして読み込む仕様を作成します
    spec = importlib.util.spec_from_file_location("verify_doc_syntax", script)
    # モジュールオブジェクトを生成します
    module = importlib.util.module_from_spec(spec)
    # 構文検査器モジュールを実行して読み込みます
    spec.loader.exec_module(module)
    # docs配下を検査して結果をそのまま返却します
    return module.check_docs(repo_root / "docs", repo_root / "docs")


# Antigravity 2.0 用のスキル (SKILL.md)・ルール・MCP設定の構文を検証する関数です
def verify_antigravity_configs(repo_root: Path) -> Tuple[List[str], int]:
    # 構文エラーリストを初期化します
    errors: List[str] = []
    # 検証したスキル・ルールファイル数をカウントする変数を初期化します
    checked_count = 0

    # 1. .agents/rules/ipa-process-gate.md の存在とサイズ上限（24KB未満）を検査します
    gate_rule = repo_root / ".agents" / "rules" / "ipa-process-gate.md"
    # ルールファイルが存在するか確認します
    if not gate_rule.is_file():
        # ルール不在エラーを記録します
        errors.append("[AGY-RULE-ERR] .agents/rules/ipa-process-gate.md が存在しません。")
    else:
        # 検査ファイル数をインクリメントします
        checked_count += 1
        # ファイルサイズ（バイト数）を取得します
        size_bytes = gate_rule.stat().st_size
        # Antigravityのルール上限（24,000バイト）を超えていないか検証します
        if size_bytes > 24000:
            # サイズ超過エラーを記録します
            errors.append(f"[AGY-RULE-SIZE] ipa-process-gate.md が24KB上限を超えています ({size_bytes} bytes)。")

    # 2. .agents/skills/*/SKILL.md のYAML Frontmatter構文検査を行います
    skills_dir = repo_root / ".agents" / "skills"
    # 必須スキル名のリスト（PBIオーケストレーターを含む6種のIPAスキル）を定義します
    required_skills = [
        "ipa-pbi-orchestrator",
        "ipa-requirements-analyst",
        "ipa-system-architect",
        "ipa-detail-designer",
        "ipa-qa-engineer",
        "ipa-traceability-validator",
    ]
    # 各必須スキルが存在するかチェックします
    for skill_name in required_skills:
        # SKILL.md のパスを構築します
        skill_path = skills_dir / skill_name / "SKILL.md"
        # ファイルが存在しない場合はエラーを記録します
        if not skill_path.is_file():
            # 不足スキルエラーを追加します
            errors.append(f"[AGY-SKILL-MISSING] 必須スキル定義が存在しません: .agents/skills/{skill_name}/SKILL.md")

    # 存在するすべての SKILL.md に対してYAML Frontmatterを検証します
    if skills_dir.is_dir():
        # SKILL.md をソート順で走査します
        for skill_file in sorted(skills_dir.glob("*/SKILL.md")):
            # 検査ファイル数をインクリメントします
            checked_count += 1
            # ファイル内容をUTF-8で読み込みます
            content = skill_file.read_text(encoding="utf-8")
            # 先頭が --- で始まるYAML Frontmatterブロックを持つか正規表現で検査します
            fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
            # Frontmatterが存在しない場合はエラーとします
            if not fm_match:
                # Frontmatter欠落エラーを追加します
                errors.append(f"[AGY-SKILL-FM] {skill_file.relative_to(repo_root)} に有効なYAML Frontmatterがありません。")
                # 次のファイルへ進みます
                continue
            # Frontmatter本文を取得します
            fm_body = fm_match.group(1)
            # name フィールドが定義されているか確認します
            name_match = re.search(r"^name:\s*([a-z0-9-]+)\s*$", fm_body, re.MULTILINE)
            # description フィールドが定義されているか確認します
            desc_match = re.search(r"^description:\s*(.+)$", fm_body, re.MULTILINE)
            # name が不正またはディレクトリ名と不一致の場合はエラーとします
            if not name_match or name_match.group(1) != skill_file.parent.name:
                # name不一致エラーを追加します
                errors.append(f"[AGY-SKILL-NAME] {skill_file.relative_to(repo_root)} の name がディレクトリ名 ({skill_file.parent.name}) と一致しません。")
            # description が存在しない場合はエラーとします
            if not desc_match:
                # description欠落エラーを追加します
                errors.append(f"[AGY-SKILL-DESC] {skill_file.relative_to(repo_root)} に description がありません。")

    # 3. .agents/mcp_config.json のJSON構文検査を行います
    mcp_cfg = repo_root / ".agents" / "mcp_config.json"
    # ファイルが存在するか確認します
    if not mcp_cfg.is_file():
        # mcp_config.json 不在エラーを追加します
        errors.append("[AGY-MCP-MISSING] .agents/mcp_config.json が存在しません。")
    else:
        # 検査ファイル数をインクリメントします
        checked_count += 1
        # JSONとしてパース可能か検証します
        try:
            # JSONファイルを読み込みます
            mcp_data = json.loads(mcp_cfg.read_text(encoding="utf-8"))
            # mcpServers キーが辞書として存在するか確認します
            if not isinstance(mcp_data.get("mcpServers"), dict):
                # スキーマ不正エラーを追加します
                errors.append("[AGY-MCP-SCHEMA] .agents/mcp_config.json に 'mcpServers' オブジェクトがありません。")
        except Exception as exc:
            # JSONパースエラーを追加します
            errors.append(f"[AGY-MCP-JSON] .agents/mcp_config.json のJSON構文エラー: {exc}")

    # エラーリストと検査済みファイル数を返却します
    return errors, checked_count


# カスタム指定されたファイル群に対するRTM検査を実行する関数です
def verify_custom_files(req_file: Path, design_file: Path, test_file: Path, rtm_file: Path) -> Tuple[List[str], Dict[str, int]]:
    # エラーリストを初期化します
    errors: List[str] = []
    # 汎用要件ID正規表現を定義します
    pat_req = re.compile(r"\bREQ-[A-Z0-9-]+\b")
    # 汎用モジュールID正規表現を定義します
    pat_mod = re.compile(r"\bMOD-[A-Z0-9-]+\b")
    # 汎用テストID正規表現を定義します
    pat_test = re.compile(r"\bTEST-[A-Z0-9-]+\b")

    # 各ファイルを読み込んでID集合を抽出します
    defined_reqs = extract_ids(req_file.read_text(encoding="utf-8"), pat_req)
    # 設計書からMOD ID集合を抽出します
    defined_mods = extract_ids(design_file.read_text(encoding="utf-8"), pat_mod)
    # テスト仕様書からTEST ID集合を抽出します
    defined_tests = extract_ids(test_file.read_text(encoding="utf-8"), pat_test)
    # RTMファイルを解析します
    rtm_map = parse_project_rtm(rtm_file.read_text(encoding="utf-8"))

    # 定義済みREQの前方追跡を検証します
    for req_id in sorted(defined_reqs):
        # RTMに未登録の場合をチェックします
        if req_id not in rtm_map:
            # エラーを追加します
            errors.append(f"[CUSTOM-RTM-ERR] 要件 {req_id} がRTMに存在しません。")
            # 次の要件へ進みます
            continue
        # MODまたはTESTが欠落している場合をチェックします
        if not rtm_map[req_id]["mods"] or not rtm_map[req_id]["tests"]:
            # エラーを追加します
            errors.append(f"[CUSTOM-RTM-ERR] 要件 {req_id} の MOD または TEST 紐付けが不足しています。")

    # 統計情報を返却します
    stats = {
        "req_count": len(defined_reqs),
        "mod_count": len(defined_mods),
        "test_count": len(defined_tests),
    }
    # エラーと統計を返します
    return errors, stats


# メインエントリポイント関数を定義します
def main(argv: Optional[List[str]] = None) -> int:
    # コマンドライン引数パーサーを初期化します
    parser = argparse.ArgumentParser(description="IPA共通フレーム2013 × PBI駆動アジャイル 要件追跡マトリクス (RTM) & 構文検証ツール")
    # 検査モード選択オプションを追加します
    parser.add_argument("--mode", choices=["all", "docs", "code", "custom"], default="all", help="検証対象モード (デフォルト: all)")
    # 出力フォーマット選択オプションを追加します
    parser.add_argument("--format", choices=["text", "json", "markdown"], default="text", help="レポート出力形式 (デフォルト: text)")
    # カスタム検査用の要件ファイルパス引数を追加します
    parser.add_argument("--req-file", type=Path, help="カスタム検証用の機能要件ファイルパス")
    # カスタム検査用の設計ファイルパス引数を追加します
    parser.add_argument("--design-file", type=Path, help="カスタム検証用の詳細設計ファイルパス")
    # カスタム検査用のテスト仕様ファイルパス引数を追加します
    parser.add_argument("--test-file", type=Path, help="カスタム検証用のテスト仕様ファイルパス")
    # カスタム検査用のRTMファイルパス引数を追加します
    parser.add_argument("--rtm-file", type=Path, help="カスタム検証用のRTMファイルパス")

    # 引数を解析します
    args = parser.parse_args(argv)
    # スクリプト位置（.agents/skills/ipa-traceability-validator/scripts/verify_rtm.py）からリポジトリルートを解決します
    repo_root = Path(__file__).resolve().parents[4]

    # 全エラーを格納するリストを初期化します
    all_errors: List[str] = []
    # 全統計情報を格納する辞書を初期化します
    summary_stats: Dict[str, int] = {}

    # カスタムモードが選択された場合の処理を実行します
    if args.mode == "custom":
        # 4つのファイル引数がすべて指定されているか確認します
        if not (args.req_file and args.design_file and args.test_file and args.rtm_file):
            # 引数不足エラーを標準エラー出力に表示します
            print("エラー: --mode custom 時は --req-file, --design-file, --test-file, --rtm-file が必須です。", file=sys.stderr)
            # 終了コード2を返します
            return 2
        # カスタムファイル検証を実行します
        c_errors, c_stats = verify_custom_files(args.req_file, args.design_file, args.test_file, args.rtm_file)
        # エラーと統計を集約します
        all_errors.extend(c_errors)
        # 統計を更新します
        summary_stats.update(c_stats)

    # all または docs モードの場合に正本設計図書RTM検証を実行します
    defined_sets: Dict[str, Set[str]] = {}
    # docsまたはallモードを判定します
    if args.mode in ("all", "docs", "code"):
        # 正本設計図書RTM検証を呼び出します
        d_errors, d_stats, defined_sets = verify_project_docs_rtm(repo_root)
        # エラーリストへ追加します
        all_errors.extend(d_errors)
        # 統計辞書へ追加します
        summary_stats.update(d_stats)

    # all モードの場合に PBIバックログ検証を実行します
    if args.mode == "all":
        # RTMテキストを取得します
        rtm_doc = repo_root / "docs" / "05_traceability" / "01_traceability_matrix.md"
        # RTMテキストを読み込みます
        rtm_text = rtm_doc.read_text(encoding="utf-8") if rtm_doc.is_file() else ""
        # PBIバックログ検証を呼び出します
        p_errors, pbi_count = verify_pbi_backlog(repo_root, rtm_text, defined_sets)
        # エラーリストへ追加します
        all_errors.extend(p_errors)
        # 統計辞書へ追加します
        summary_stats["pbi_count"] = pbi_count

    # all または code モードの場合にソースコード追跡タグ検査を実行します
    if args.mode in ("all", "code"):
        # コード追跡タグ検証を呼び出します
        tag_errors, tag_stats = verify_code_trace_tags(repo_root, defined_sets)
        # エラーリストへ追加します
        all_errors.extend(tag_errors)
        # 統計辞書へ追加します
        summary_stats.update(tag_stats)

    # all または docs モードの場合に設計図書の記述構文検査を実行します
    if args.mode in ("all", "docs"):
        # 設計図書構文検査を呼び出します
        s_errors, s_stats = verify_doc_syntax_files(repo_root)
        # エラーリストへ追加します
        all_errors.extend(s_errors)
        # 統計辞書へ追加します
        summary_stats.update(s_stats)

    # all モードの場合に Antigravity 2.0 構成ファイルの構文検査を実行します
    if args.mode == "all":
        # スキル・ルール・MCP設定検査を呼び出します
        a_errors, checked_files = verify_antigravity_configs(repo_root)
        # エラーリストへ追加します
        all_errors.extend(a_errors)
        # 検査済み構成ファイル数を統計へ記録します
        summary_stats["agy_config_files"] = checked_files

    # 合否ステータス文字列を決定します
    status_str = "PASS" if not all_errors else "FAIL"

    # JSON形式での出力が指定された場合の処理です
    if args.format == "json":
        # JSONオブジェクトを構築して標準出力へ表示します
        print(json.dumps({"status": status_str, "error_count": len(all_errors), "stats": summary_stats, "errors": all_errors}, ensure_ascii=False, indent=2))
    # Markdown形式での出力が指定された場合の処理です
    elif args.format == "markdown":
        # Markdown見出しを出力します
        print("# IPA × PBI駆動アジャイル トレーサビリティ (RTM) & 構文検証レポート")
        # 総合判定を出力します
        print(f"\n- **総合判定**: `{status_str}` (不整合・エラー件数: `{len(all_errors)}` 件)")
        # 統計テーブルのヘッダーを出力します
        print("\n| 検証項目 | 検出・検証数 |")
        # テーブル区切り行を出力します
        print("| :--- | :---: |")
        # 各統計値をテーブル行として出力します
        for k, v in summary_stats.items():
            # キーと値を整形して出力します
            print(f"| `{k}` | {v} |")
        # エラーがある場合は一覧を出力します
        if all_errors:
            # エラーセクション見出しを出力します
            print("\n## 検出された不整合一覧")
            # 各エラーを箇条書きで出力します
            for err in all_errors:
                # エラー行を出力します
                print(f"- {err}")
    # デフォルトのテキスト形式で出力する場合の処理です
    else:
        # ヘッダー区切り線を出力します
        print("=" * 72)
        # タイトルを出力します
        print(" IPA Common Frame 2013 x PBI-Driven Agile Traceability (RTM) Audit Report")
        # ヘッダー区切り線を出力します
        print("=" * 72)
        # 正本設計図書統計がある場合は表示します
        if "doc_req_count" in summary_stats:
            # 正本設計図書のREQ/MOD/FN/TEST件数を表示します
            print(f" [Project RTM  ] REQ: {summary_stats['doc_req_count']} | MOD: {summary_stats['doc_mod_count']} | FN: {summary_stats['doc_fn_count']} | TEST: {summary_stats['doc_test_count']}")
        # PBI統計がある場合は表示します
        if "pbi_count" in summary_stats:
            # PBI数を表示します
            print(f" [PBI Backlog  ] Verified PBIs: {summary_stats['pbi_count']}")
        # コード追跡タグ統計がある場合は表示します
        if "tagged_specs" in summary_stats:
            # タグ数を表示します
            print(f" [Code Tags    ] @spec: {summary_stats['tagged_specs']} | @test: {summary_stats['tagged_tests']} | Verified FN Impl: {summary_stats['verified_fns']}")
        # 設計図書構文検査の対象件数がある場合は表示します
        if "doc_syntax_files" in summary_stats:
            # 構文検査の対象図書数を表示します
            print(f" [Doc Syntax   ] Verified Standard-Conforming Docs: {summary_stats['doc_syntax_files']}")
        # Antigravity構成検証件数がある場合は表示します
        if "agy_config_files" in summary_stats:
            # 検査済みスキル・ルール・MCPファイル数を表示します
            print(f" [Antigravity  ] Verified Config/Skill/Rule Files: {summary_stats['agy_config_files']}")
        # 区切り線を出力します
        print("-" * 72)
        # エラーが0件の場合の成功メッセージを表示します
        if not all_errors:
            # 成功メッセージを出力します
            print(" RESULT: PASS (0 traceability breaks, 0 PBI/config syntax errors)")
            # フッター区切り線を出力します
            print("=" * 72)
        else:
            # 失敗メッセージとエラー件数を出力します
            print(f" RESULT: FAIL ({len(all_errors)} issues detected)")
            # 各エラー詳細を出力します
            for err in all_errors:
                # エラー項目をインデント付きで表示します
                print(f"   - {err}")
            # フッター区切り線を出力します
            print("=" * 72)

    # エラーがなければ終了コード0、エラーがあれば終了コード1を返します
    return 0 if not all_errors else 1


# スクリプトが直接実行された場合にmain関数を呼び出します
if __name__ == "__main__":
    # 終了コードを渡してプロセスを終了します
    sys.exit(main())
