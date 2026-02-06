# DevSyncGAS - タスク別フロー

開発作業の種類別に、推奨される作業フローを示します。

---

## 🆕 新機能実装

```
1. 要件確認
   → 過剰機能を実装しない（要求された機能のみ）

2. 既存パターン確認
   → Grep/Read で類似コード検索
   → 既存の実装パターンを踏襲

3. 実装
   → 必要最小限の変更
   → 抽象化・ヘルパー関数は1回限りの処理には不要

4. テスト追加
   → bun test
   → 新機能に対応するテストケース追加

5. 品質チェック
   → bun run check:all
   → 循環依存、未使用コード、型カバレッジ確認

6. レビュー実行
   → /review
   → lint/test/型チェック自動実行
```

**関連ドキュメント:**
- アーキテクチャ理解: [CLAUDE_ARCH.md](CLAUDE_ARCH.md)
- ナビゲーション: [CLAUDE_NAV.md](CLAUDE_NAV.md)

---

## 🐛 バグ修正

```
1. 再現確認
   → ログ確認: configureLogLevel('DEBUG')
   → エラーメッセージ、スタックトレース確認

2. 原因特定
   → Grep でエラーコード検索
   → src/utils/errors.ts でエラーコード確認

3. 修正
   → 最小限の変更（影響範囲を最小化）

4. テスト
   → 該当テストケース実行
   → リグレッションテスト

5. レビュー実行
   → /review
```

**関連コマンド:**
- エラー調査パターン: [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md)
- ログレベル変更: `configureLogLevel('DEBUG')`

---

## 📊 新しい指標追加

```
1. 設計
   → [ADDING_METRICS.md](docs/ADDING_METRICS.md) を参照
   → 計算ロジック、データソース、表示形式を設計

2. MetricsCalculator実装
   → src/services/metrics/ に実装
   → 既存の指標計算パターンを参考に

3. スプレッドシート出力
   → src/services/spreadsheet/ に実装
   → シート生成、データ書き込み

4. テスト追加
   → 計算ロジックのユニットテスト
   → 統合テスト

5. 検証
   → /dora-validate 実行
   → DORA公式基準との整合性確認
```

**参考実装:**
- DORA指標: [docs/DORA_METRICS.md](docs/DORA_METRICS.md)
- 拡張指標: [docs/EXTENDED_METRICS.md](docs/EXTENDED_METRICS.md)
- 指標追加手順: [docs/ADDING_METRICS.md](docs/ADDING_METRICS.md)

---

## 🔧 設定変更・トラブルシューティング

```
1. 診断ツール実行
   → checkConfig() をGASエディタで実行
   → 設定状況、エラー原因を確認

2. ドキュメント参照
   → [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
   → エラーコード別の解決方法を確認

3. エラーコード確認
   → src/utils/errors.ts
   → ErrorCode 1000-9000番台の定義確認

4. 設定変更
   → src/init.ts を更新
   → 再デプロイして initConfig() 実行
```

**トラブルシューティング:**
- 設定診断: `checkConfig()`
- 詳細ログ: `configureLogLevel('DEBUG')`
- セットアップガイド: [docs/SETUP.md](docs/SETUP.md)
- トラブルシューティング: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## 📝 PR作成前

```
1. セルフチェック実行
   → /pr-check
   → lint/test/build自動チェック

2. git操作
   → git add <files>
   → git commit -m "message"

3. 動作確認
   → bun run push
   → GASエディタで実際に関数実行

4. PR作成
   → 変更内容の要約
   → テスト結果の記載
```

**品質チェック:**
```bash
# 完了前の必須チェック
bunx tsc --noEmit && bun run lint && bun test && bun run build
```

**チェックリスト:**
- [ ] 型エラーなし: `bunx tsc --noEmit`
- [ ] Lint通過: `bun run lint`
- [ ] テスト通過: `bun test`
- [ ] ビルド成功: `bun run build`
- [ ] 未使用コードなし: `bun run check:unused`
- [ ] 循環依存なし: `bun run check:circular`
- [ ] 型カバレッジ95%以上: `bun run check:types`
- [ ] `/review` 実行済み
- [ ] 必要に応じてドキュメント更新

---

## 🔄 リファクタリング

```
1. 現状分析
   → 複雑度チェック: bun run check:all
   → [REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md) 参照

2. リファクタリング実施
   → 既存テストを通しながら段階的に変更

3. テスト確認
   → すべてのテストが通ることを確認
   → 必要に応じてテストを追加

4. 品質確認
   → 複雑度が改善されたか確認
   → 循環依存が発生していないか確認
```

**参考ドキュメント:**
- [docs/REFACTORING_GUIDE.md](docs/REFACTORING_GUIDE.md)
- [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md)

---

## 📚 ドキュメント更新

```
1. 変更内容の確認
   → 機能追加や設計変更がある場合はドキュメント更新が必要

2. 該当ドキュメントの特定
   → [CLAUDE_NAV.md](CLAUDE_NAV.md) のドキュメントマトリックスを参照

3. ドキュメント更新
   → 明確で簡潔な記述
   → 実例やコードサンプルを含める

4. クロスリファレンス確認
   → 関連ドキュメントからのリンクを確認
   → 矛盾がないか確認
```

**ドキュメント構造:**
- 概要・制約: [CLAUDE.md](CLAUDE.md)
- コマンド集: [CLAUDE_COMMANDS.md](CLAUDE_COMMANDS.md)
- タスクフロー: [CLAUDE_TASKS.md](CLAUDE_TASKS.md) (このファイル)
- ナビゲーション: [CLAUDE_NAV.md](CLAUDE_NAV.md)
- アーキテクチャ: [CLAUDE_ARCH.md](CLAUDE_ARCH.md)
- 詳細仕様: [docs/](docs/)
