#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""IPA共通フレーム2013 × PBI駆動アジャイル 要件追跡マトリクス (RTM) 双方向整合性検証スクリプト。

機能概要:
  1. docs/templates/ 配下のIPA標準テンプレート一式における PBI / REQ / MOD / TEST IDの双方向追跡検査
  2. docs/backlog/{todo,in_progress,done}/ 配下のPBIファイル構文およびRTMとの整合性検査
  3. docs/ 配下のプロジェクト正本設計図書における PBI / REQ-FNC / MOD / PRG の整合性検査
  4. .agents/ 配下のスキル (SKILL.md Frontmatter)・ルール・MCP設定 (mcp_config.json) の構文検査
  5. 任意指定ファイル (--req-file, --design-file, --test-file, --rtm-file) のカスタムRTM検査
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
# 型ヒント定義用のコレクション型をインポートします
from typing import Dict, List, Optional, Set, Tuple

# ---------------------------------------------------------------------------
# 定数・正規表現パターンの定義
# ---------------------------------------------------------------------------
# プロダクトバックログアイテムID（PBI-000, PBI-001 等）を抽出する正規表現です
PAT_PBI = re.compile(r"\bPBI-\d{3}\b")
# テンプレート標準の要件ID（REQ-F-001, REQ-NFR-001 等）を抽出する正規表現です
PAT_TPL_REQ = re.compile(r"\bREQ-(?:F|NFR)-\d{3}\b")
# テンプレート標準のモジュールID（MOD-001 等）を抽出する正規表現です
PAT_TPL_MOD = re.compile(r"\bMOD-\d{3}\b")
# テンプレート標準のテストID（TEST-UT-001, TEST-IT-001, TEST-ST-001 等）を抽出する正規表現です
PAT_TPL_TEST = re.compile(r"\bTEST-(?:UT|IT|ST)-\d{3}\b")

# プロジェクト正本設計書の機能要件ID（REQ-FNC-001 等）を抽出する正規表現です
PAT_DOC_REQ = re.compile(r"\bREQ-FNC-\d{3}\b")
# プロジェクト正本設計書のサブシステムモジュールID（MOD-SRV-001 等）を抽出する正規表現です
PAT_DOC_MOD = re.compile(r"\bMOD-[A-Z]{3}-\d{3}\b")
# プロジェクト正本設計書のプログラム仕様ID（PRG-SRV-001 等）を抽出する正規表現です
PAT_DOC_PRG = re.compile(r"\bPRG-[A-Z]{3}-\d{3}\b")


# Markdownのテーブル行（| ... |）からIDを抽出する補助関数を定義します
def extract_table_defined_ids(text: str, pattern: re.Pattern) -> Set[str]:
    # 抽出されたIDを格納する集合を初期化します
    found_ids: Set[str] = set()
    # テキストを改行単位で走査します
    for line in text.splitlines():
        # 前後の空白を除去した行文字列を取得します
        stripped = line.strip()
        # パイプ記号で始まるMarkdownテーブル行のみを対象とします
        if stripped.startswith("|"):
            # テーブルの行全体から該当パターンのIDを検索します
            matches = pattern.findall(stripped)
            # 見つかったすべてのIDを集合へ追加します
            for match in matches:
                # ID文字列を集合に登録します
                found_ids.add(match)
    # 抽出された一意なID集合を返却します
    return found_ids


# RTM（要件追跡表）のテーブル行を解析し、REQごとのPBI・MOD・TESTの紐付け辞書を構築する関数です
def parse_rtm_rows(rtm_text: str, req_pattern: re.Pattern, mod_pattern: re.Pattern, target_pattern: re.Pattern) -> Dict[str, Dict[str, Set[str]]]:
    # 要件IDをキーとし、紐付くPBI集合・MOD集合・TEST/PRG集合を保持する辞書を初期化します
    mapping: Dict[str, Dict[str, Set[str]]] = {}
    # RTMテキストを1行ずつ走査します
    for line in rtm_text.splitlines():
        # 前後の空白を除去します
        stripped = line.strip()
        # Markdownテーブル行でない場合はスキップします
        if not stripped.startswith("|"):
            # 次の行へ進みます
            continue
        # 行内に含まれる要件IDをすべて抽出します
        reqs_in_row = req_pattern.findall(stripped)
        # 要件IDが含まれないヘッダー行や区切り行はスキップします
        if not reqs_in_row:
            # 次の行へ進みます
            continue
        # 同じ行内に含まれるPBI IDをすべて抽出します
        pbis_in_row = set(PAT_PBI.findall(stripped))
        # 同じ行内に含まれるモジュールIDをすべて抽出します
        mods_in_row = set(mod_pattern.findall(stripped))
        # 同じ行内に含まれるテストID（またはPRG ID）をすべて抽出します
        targets_in_row = set(target_pattern.findall(stripped))
        # 行内の各要件IDに対して紐付け情報をマージします
        for req_id in reqs_in_row:
            # 未登録の要件IDであれば辞書エントリを初期化します
            if req_id not in mapping:
                # pbis・mods・targetsの空集合を持つ辞書を作成します
                mapping[req_id] = {"pbis": set(), "mods": set(), "targets": set()}
            # 抽出されたPBI ID集合を統合します
            mapping[req_id]["pbis"].update(pbis_in_row)
            # 抽出されたモジュールID集合を統合します
            mapping[req_id]["mods"].update(mods_in_row)
            # 抽出されたテスト/ターゲットID集合を統合します
            mapping[req_id]["targets"].update(targets_in_row)
    # 構築したRTMマッピング辞書を返却します
    return mapping


# PBI管理ディレクトリおよびPBIファイルの構文・トレーサビリティを検証する関数です
def verify_pbi_backlog(repo_root: Path, rtm_map: Dict[str, Dict[str, Set[str]]], defined_reqs: Set[str], defined_mods: Set[str], defined_tests: Set[str]) -> Tuple[List[str], int]:
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
            # 必須Markdownセクション（## 1. 〜 ## 5.）が存在するか確認します
            for sec_num in range(1, 6):
                # セクション見出しが存在しない場合はエラーを記録します
                if not re.search(rf"^## {sec_num}\.\s+", content, re.MULTILINE):
                    # セクション欠落エラーを追加します
                    errors.append(f"[PBI-SEC-ERR] {pbi_file.relative_to(repo_root)} に必須セクション '## {sec_num}.' がありません。")
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
            pbi_reqs = set(PAT_TPL_REQ.findall(req_line.group(1))) if req_line else set()
            # PBI内で参照されているMOD集合を取得します
            pbi_mods = set(PAT_TPL_MOD.findall(mod_line.group(1))) if mod_line else set()
            # PBI内で参照されているTEST集合を取得します
            pbi_tests = set(PAT_TPL_TEST.findall(test_line.group(1))) if test_line else set()
            # PBIが参照するREQがテンプレート要件定義書に実在するか検査します
            for r_id in sorted(pbi_reqs - defined_reqs):
                # 未定義REQ参照エラーを追加します
                errors.append(f"[PBI-DANGLING-REQ] {pbi_id} が未定義の要件ID {r_id} を参照しています。")
            # PBIが参照するMODが詳細設計書に実在するか検査します
            for m_id in sorted(pbi_mods - defined_mods):
                # 未定義MOD参照エラーを追加します
                errors.append(f"[PBI-DANGLING-MOD] {pbi_id} が未定義のモジュールID {m_id} を参照しています。")
            # PBIが参照するTESTがテスト仕様書に実在するか検査します
            for t_id in sorted(pbi_tests - defined_tests):
                # 未定義TEST参照エラーを追加します
                errors.append(f"[PBI-DANGLING-TEST] {pbi_id} が未定義のテストID {t_id} を参照しています。")
            # ステータスが done の場合は関連IDがすべて埋まりRTMに反映されているか検査します
            if pbi_status == "done":
                # いずれかの関連IDリストが空であればエラーとします
                if not (pbi_reqs and pbi_mods and pbi_tests):
                    # 完了PBIのID未記録エラーを追加します
                    errors.append(f"[PBI-DONE-INCOMPLETE] 完了PBI {pbi_id} の related_req_ids / related_mod_ids / related_test_ids が未記入です。")
                # 関連する各REQ行のRTMに当該PBI IDが記録されているか確認します
                for r_id in sorted(pbi_reqs):
                    # RTMの対象REQ行にPBI IDが含まれていない場合はエラーとします
                    if r_id not in rtm_map or pbi_id not in rtm_map[r_id]["pbis"]:
                        # RTM未反映エラーを追加します
                        errors.append(f"[PBI-RTM-UNTRACED] 完了PBI {pbi_id} がRTMの要件 {r_id} 行に記録されていません。")

    # RTM内で参照されている全PBI ID（初期ベースライン PBI-000 を除く）が実在するか検査します
    rtm_pbis: Set[str] = set()
    # RTMの全行マッピングからPBI IDを収集します
    for entry in rtm_map.values():
        # PBI集合を統合します
        rtm_pbis.update(entry["pbis"])
    # PBI-000（初期構築ベースライン）を除いた未定義PBI参照を検査します
    for dangling_pbi in sorted((rtm_pbis - {"PBI-000"}) - defined_pbis):
        # 未定義PBI参照エラーを追加します
        errors.append(f"[RTM-DANGLING-PBI] RTMが docs/backlog/ に存在しないPBI ID {dangling_pbi} を参照しています。")

    # エラーリストと検証済みPBIファイル数を返却します
    return errors, pbi_count


# テンプレート群（docs/templates/）およびPBIの双方向トレーサビリティを検証する関数です
def verify_templates_rtm(repo_root: Path) -> Tuple[List[str], Dict[str, int]]:
    # 検出された不整合・エラーメッセージのリストを初期化します
    errors: List[str] = []
    # テンプレートディレクトリのパスを設定します
    tpl_dir = repo_root / "docs" / "templates"
    # 必須テンプレート8ファイル（PBIテンプレート 98 を含む）のパス辞書を定義します
    required_files = {
        "pbi_tpl_98": tpl_dir / "98_pbi_template.md",
        "biz_req": tpl_dir / "01_business_requirements.md",
        "func_req": tpl_dir / "02_functional_requirements.md",
        "nfr_req": tpl_dir / "03_non_functional_requirements.md",
        "sys_arch": tpl_dir / "04_system_architecture.md",
        "sw_design": tpl_dir / "05_software_design.md",
        "test_spec": tpl_dir / "06_test_specification.md",
        "rtm": tpl_dir / "99_traceability_matrix.md",
    }

    # 必須テンプレートファイルの存在チェックを行います
    for key, path in required_files.items():
        # ファイルが存在しない場合はエラーリストに追加します
        if not path.is_file():
            # 不足しているファイルの相対パスをエラーとして記録します
            errors.append(f"[TPL-MISSING] 必須テンプレートが存在しません: {path.relative_to(repo_root)}")

    # 必須ファイルが1つでも欠けている場合は以降の解析を中断して返却します
    if errors:
        # 空の統計情報とともにエラーリストを返します
        return errors, {"pbi_count": 0, "req_count": 0, "mod_count": 0, "test_count": 0}

    # 機能要件定義書のテキストをUTF-8で読み込みます
    func_text = required_files["func_req"].read_text(encoding="utf-8")
    # 非機能要件定義書のテキストをUTF-8で読み込みます
    nfr_text = required_files["nfr_req"].read_text(encoding="utf-8")
    # ソフトウェア詳細設計書のテキストをUTF-8で読み込みます
    sw_text = required_files["sw_design"].read_text(encoding="utf-8")
    # テスト仕様書のテキストをUTF-8で読み込みます
    test_text = required_files["test_spec"].read_text(encoding="utf-8")
    # 要件追跡表（RTM）のテキストをUTF-8で読み込みます
    rtm_text = required_files["rtm"].read_text(encoding="utf-8")

    # RTMに PBI_ID カラムが定義されているか確認します
    if "PBI_ID" not in rtm_text:
        # PBI_IDカラム欠落エラーを追加します
        errors.append("[RTM-SCHEMA-ERR] 99_traceability_matrix.md に PBI_ID カラムが定義されていません。")

    # 要件定義書（02, 03）で定義されている全REQ IDを抽出します
    defined_reqs = extract_table_defined_ids(func_text, PAT_TPL_REQ) | extract_table_defined_ids(nfr_text, PAT_TPL_REQ)
    # ソフトウェア設計書（05）で定義されている全MOD IDを抽出します
    defined_mods = extract_table_defined_ids(sw_text, PAT_TPL_MOD)
    # テスト仕様書（06）で定義されている全TEST IDを抽出します
    defined_tests = extract_table_defined_ids(test_text, PAT_TPL_TEST)

    # RTM（99）のテーブル行からREQ -> PBI / MOD / TESTのマッピングを解析します
    rtm_map = parse_rtm_rows(rtm_text, PAT_TPL_REQ, PAT_TPL_MOD, PAT_TPL_TEST)

    # 1. 前方追跡検査（すべての定義済みREQがRTMに存在し、PBI・MOD・TESTに紐付いているか）
    for req_id in sorted(defined_reqs):
        # RTMに要件ID自体が存在しない場合をチェックします
        if req_id not in rtm_map:
            # 未追跡要件エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} が 99_traceability_matrix.md に登録されていません。")
            # 次の要件IDへ進みます
            continue
        # 要件に紐付くPBI IDが空である場合をチェックします
        if not rtm_map[req_id]["pbis"]:
            # PBI未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} に対応する PBI_ID (PBI-*) が割り当てられていません。")
        # 要件に紐付くモジュールIDが空である場合をチェックします
        if not rtm_map[req_id]["mods"]:
            # モジュール未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} に対応するモジュール (MOD-*) が割り当てられていません。")
        # 要件に紐付くテストIDが空である場合をチェックします
        if not rtm_map[req_id]["targets"]:
            # テスト未割当エラーを追加します
            errors.append(f"[RTM-FORWARD-ERR] 要件 {req_id} を検証するテストケース (TEST-*) が割り当てられていません。")

    # 2. 後方追跡検査（RTM内で参照されているREQ/MOD/TESTが各定義元文書に実在するか）
    # RTM内で参照されている全REQ集合を取得します
    rtm_reqs = set(rtm_map.keys())
    # RTM内で参照されている全MOD集合を集計します
    rtm_mods: Set[str] = set()
    # RTM内で参照されている全TEST集合を集計します
    rtm_tests: Set[str] = set()
    # 各要件のマッピングからMODとTESTを収集します
    for entry in rtm_map.values():
        # モジュールID集合を追加します
        rtm_mods.update(entry["mods"])
        # テストID集合を追加します
        rtm_tests.update(entry["targets"])

    # RTMにあるが要件定義書に存在しない未定義REQを検査します
    for dangling_req in sorted(rtm_reqs - defined_reqs):
        # 未定義REQ参照エラーを記録します
        errors.append(f"[RTM-DANGLING-REQ] RTMが未定義の要件ID {dangling_req} を参照しています。")

    # RTMにあるがソフトウェア設計書に存在しない未定義MODを検査します
    for dangling_mod in sorted(rtm_mods - defined_mods):
        # 未定義MOD参照エラーを記録します
        errors.append(f"[RTM-DANGLING-MOD] RTMが未定義のモジュールID {dangling_mod} を参照しています。")

    # RTMにあるがテスト仕様書に存在しない未定義TESTを検査します
    for dangling_test in sorted(rtm_tests - defined_tests):
        # 未定義TEST参照エラーを記録します
        errors.append(f"[RTM-DANGLING-TEST] RTMが未定義のテストID {dangling_test} を参照しています。")

    # 3. 孤立モジュール・孤立テストの検査（定義されているがRTMで一度も使われていないID）
    for orphan_mod in sorted(defined_mods - rtm_mods):
        # 孤立モジュールエラーを記録します
        errors.append(f"[RTM-ORPHAN-MOD] モジュール {orphan_mod} がRTM内のどの要件にも紐付いていません。")

    # テスト仕様書で定義されているがRTMに存在しないテストIDを検査します
    for orphan_test in sorted(defined_tests - rtm_tests):
        # 孤立テストエラーを記録します
        errors.append(f"[RTM-ORPHAN-TEST] テストケース {orphan_test} がRTM内のどの要件にも紐付いていません。")

    # 4. PBIバックログディレクトリおよびPBIファイルの整合性を検証します
    pbi_errors, pbi_count = verify_pbi_backlog(repo_root, rtm_map, defined_reqs, defined_mods, defined_tests)
    # PBI検証エラーをリストへ統合します
    errors.extend(pbi_errors)

    # 集計統計情報を辞書にまとめます
    stats = {
        "pbi_count": pbi_count,
        "req_count": len(defined_reqs),
        "mod_count": len(defined_mods),
        "test_count": len(defined_tests),
    }
    # エラーリストと統計情報を返却します
    return errors, stats


# 既存プロジェクト正本設計図書（docs/README.md 等）のトレーサビリティを検証する関数です
def verify_project_docs_rtm(repo_root: Path) -> Tuple[List[str], Dict[str, int]]:
    # 検出されたエラーリストを初期化します
    errors: List[str] = []
    # 正本要件定義書のパスを設定します
    req_doc = repo_root / "docs" / "01_requirements" / "01_requirements_specification.md"
    # 正本構造設計書のパスを設定します
    arch_doc = repo_root / "docs" / "03_detail_design" / "01_architectural_design.md"
    # 正本統合インデックス（RTM含む）のパスを設定します
    index_doc = repo_root / "docs" / "README.md"

    # いずれかの正本が存在しない場合はスキップ統計を返します
    if not (req_doc.is_file() and arch_doc.is_file() and index_doc.is_file()):
        # ファイル不在エラーを追加します
        errors.append("[DOC-MISSING] docs/ 配下の正本設計図書（要件定義書・構造設計書・README.md）が不足しています。")
        # 空の統計を返します
        return errors, {"doc_req_count": 0, "doc_mod_count": 0, "doc_prg_count": 0}

    # 各正本設計書をUTF-8で読み込みます
    req_text = req_doc.read_text(encoding="utf-8")
    # 構造設計書をUTF-8で読み込みます
    arch_text = arch_doc.read_text(encoding="utf-8")
    # 統合インデックスをUTF-8で読み込みます
    index_text = index_doc.read_text(encoding="utf-8")

    # 要件定義書内のREQ-FNC-xxxを抽出します
    doc_reqs = extract_table_defined_ids(req_text, PAT_DOC_REQ)
    # 構造設計書内のMOD-xxx-xxxを抽出します
    doc_mods = extract_table_defined_ids(arch_text, PAT_DOC_MOD)
    # 統合インデックス内のPRG-xxx-xxxを抽出します
    doc_prgs = extract_table_defined_ids(index_text, PAT_DOC_PRG)

    # docs/README.md 内のトレーサビリティマトリクスに記載されたREQ-FNC-xxxを抽出します
    traced_reqs = extract_table_defined_ids(index_text, PAT_DOC_REQ)
    # docs/README.md 内のトレーサビリティマトリクスに記載されたMOD-xxx-xxxを抽出します
    traced_mods = extract_table_defined_ids(index_text, PAT_DOC_MOD)

    # 未追跡のREQ-FNCがないか検証します
    for missing_req in sorted(doc_reqs - traced_reqs):
        # 未追跡エラーを追加します
        errors.append(f"[DOC-RTM-ERR] 正本要件 {missing_req} が docs/README.md のマトリクスに存在しません。")

    # 未追跡のMODがないか検証します
    for missing_mod in sorted(doc_mods - traced_mods):
        # 未追跡エラーを追加します
        errors.append(f"[DOC-RTM-ERR] 正本モジュール {missing_mod} が docs/README.md のマトリクスに存在しません。")

    # 統計情報を構築します
    stats = {
        "doc_req_count": len(doc_reqs),
        "doc_mod_count": len(doc_mods),
        "doc_prg_count": len(doc_prgs),
    }
    # エラーリストと統計情報を返却します
    return errors, stats


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
    defined_reqs = extract_table_defined_ids(req_file.read_text(encoding="utf-8"), pat_req)
    # 設計書からMOD ID集合を抽出します
    defined_mods = extract_table_defined_ids(design_file.read_text(encoding="utf-8"), pat_mod)
    # テスト仕様書からTEST ID集合を抽出します
    defined_tests = extract_table_defined_ids(test_file.read_text(encoding="utf-8"), pat_test)
    # RTMファイルを解析します
    rtm_map = parse_rtm_rows(rtm_file.read_text(encoding="utf-8"), pat_req, pat_mod, pat_test)

    # 定義済みREQの前方追跡を検証します
    for req_id in sorted(defined_reqs):
        # RTMに未登録の場合をチェックします
        if req_id not in rtm_map:
            # エラーを追加します
            errors.append(f"[CUSTOM-RTM-ERR] 要件 {req_id} がRTMに存在しません。")
            # 次の要件へ進みます
            continue
        # MODまたはTESTが欠落している場合をチェックします
        if not rtm_map[req_id]["mods"] or not rtm_map[req_id]["targets"]:
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
    parser = argparse.ArgumentParser(description="IPA共通フレーム2013 × PBI駆動アジャイル 要件追跡マトリクス (RTM) & 設定検証ツール")
    # 検査モード選択オプションを追加します
    parser.add_argument("--mode", choices=["all", "templates", "docs", "custom"], default="all", help="検証対象モード (デフォルト: all)")
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

    # all または templates モードの場合にテンプレート・PBI RTM検証を実行します
    if args.mode in ("all", "templates"):
        # テンプレートRTM検証を呼び出します
        t_errors, t_stats = verify_templates_rtm(repo_root)
        # エラーリストへ追加します
        all_errors.extend(t_errors)
        # 統計辞書へ追加します
        summary_stats.update(t_stats)

    # all または docs モードの場合に正本設計図書RTM検証を実行します
    if args.mode in ("all", "docs"):
        # 正本設計図書RTM検証を呼び出します
        d_errors, d_stats = verify_project_docs_rtm(repo_root)
        # エラーリストへ追加します
        all_errors.extend(d_errors)
        # 統計辞書へ追加します
        summary_stats.update(d_stats)

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
        # テンプレート・PBI統計がある場合は表示します
        if "req_count" in summary_stats:
            # テンプレートのPBI/REQ/MOD/TEST件数を表示します
            print(f" [Templates RTM] PBI: {summary_stats.get('pbi_count', 0)} | REQ: {summary_stats['req_count']} | MOD: {summary_stats['mod_count']} | TEST: {summary_stats['test_count']}")
        # 正本設計図書統計がある場合は表示します
        if "doc_req_count" in summary_stats:
            # 正本設計図書のREQ/MOD/PRG件数を表示します
            print(f" [Project Docs ] REQ-FNC: {summary_stats['doc_req_count']} | MOD: {summary_stats['doc_mod_count']} | PRG: {summary_stats['doc_prg_count']}")
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
