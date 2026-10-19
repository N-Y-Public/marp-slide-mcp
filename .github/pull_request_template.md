## 1. 関連Issue / PBI
- 関連 Issue: #
- 関連 PBI: `docs/backlog/{in_progress|done}/PBI-xxx_*.md`

## 2. 変更概要 (Summary of Changes)
<!-- 何を変更したのか、簡潔に記載してください。 -->
- 

## 3. 変更種別 (Type of Change)
- [ ] `feat`: 新機能の追加
- [ ] `fix`: バグ修正
- [ ] `docs`: ドキュメント・設計書の更新
- [ ] `refactor`: リファクタリング（機能変更なし）
- [ ] `test`: テストコード・テスト仕様の追加/修正
- [ ] `chore`: ビルド設定・依存関係・ツールの更新

## 4. 検証内容・エビデンス (Verification)
<!-- 実施した検証コマンドと結果を記載してください。 -->
- [ ] TypeScript ビルド検証: `docker compose run --rm app npm run build` (エラー0件)
- [ ] PDF 出力検証 (スライド変更時): `docker compose run --rm app npm run build:pdf`
- [ ] RTM トレーサビリティ検証 (設計・実装変更時): `docker compose run --rm app python3 .agents/skills/ipa-traceability-validator/scripts/verify_rtm.py` (断絶0件)

## 5. コントリビューター確認事項 (Contributor Checklist)
- [ ] **プライバシー保護**: コミット履歴や変更差分にホスト固有の絶対パス（`/home/...`, `C:\path\to\...` 等）が含まれていないこと
- [ ] **機密保護**: APIキー、パーソナルアクセストークン（PAT）、パスワード等の機密情報が含まれていないこと
- [ ] **コーディング規約**: すべての新規・修正コードに「全行直上平易コメント」が付与されていること（`docs/00_project_charter/02_coding_standards.md` 準拠）
- [ ] **Living Documentation**: 影響する設計書（`docs/`）の差分更新が完了していること
- [ ] **Git Author**: 適切なGitコミッター名・メールアドレス（プライバシー保護目的の場合はGitHubのnoreplyメール推奨）が設定されていること
