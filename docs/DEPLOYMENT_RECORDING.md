# デプロイ記録の設定ガイド

**📌 このガイドは:** DORA 4指標の1つ「デプロイ頻度」を計測するための追加設定手順です。

**いつ読む？** [クイックスタートガイド](QUICK_START.md)完了後、デプロイ頻度を正確に計測したい場合。

**所要時間:** 1リポジトリあたり3分

**⚠️ 重要:** この設定は**計測対象リポジトリ側**への変更が必要です。DevSyncGAS本体のセットアップ（5分）とは別の手順です。

---

## 🎯 なぜ必要か

DevSyncGASでデプロイ頻度を計測するには、**GitHub上にデプロイ記録が必要**です。

**現在の状態:**
- ✅ リードタイム、変更障害率、MTTRは計測可能（PRベース）
- ❌ デプロイ頻度は「yearly」と表示される（記録が存在しないため）

**このガイドの対象者:**
- AWS CodeBuild、CircleCI、Jenkins等でデプロイしているが、GitHub上に記録が残らない
- GitHub ActionsでCI/CDを行っているが、Deployments APIを使っていない
- 複数の環境（production、staging）のデプロイを計測したい

### 解決策

**計測対象リポジトリ**にGitHub Actionsで**デプロイ記録ワークフロー**を追加します。

**重要:**
- ✅ **記録のみ**：実際のデプロイプロセスは変更しません
- ✅ **並行動作**：既存のCI/CDパイプラインと独立して動作
- ✅ **軽量**：数秒で完了、GitHub Actionsの無料枠で十分
- 📝 **リポジトリへの変更が必要**：各計測対象リポジトリに1ファイル追加

---

## 📋 設定方法

### ステップ1: ワークフローファイルを作成

対象リポジトリに以下のファイルを作成：

**ファイル:** `.github/workflows/record-deployment.yml`

```yaml
name: Record Deployment

on:
  push:
    branches:
      # 本番環境
      - production
      # 地域展開ブランチ（例: production-clients-region1）
      - 'production-clients-*'
      # ステージング環境
      - staging
      - 'staging-clients-*'

jobs:
  record:
    runs-on: ubuntu-latest
    steps:
      - name: Record deployment to GitHub
        uses: chrnorm/deployment-action@v2
        with:
          token: '${{ github.token }}'
          environment: ${{ github.ref_name }}
          auto-merge: false
```

### ステップ2: コミット＆プッシュ

```bash
git add .github/workflows/record-deployment.yml
git commit -m "feat: add deployment recording workflow"
git push
```

### ステップ3: 動作確認

1. `production`、`staging`、または地域展開ブランチへpush
2. GitHub Actionsタブで「Record Deployment」が実行されることを確認
3. 数分後、DevSyncGASで`debugDeploymentFrequency('your-org', 'your-repo')`を実行
4. デプロイメントデータが表示されれば成功！

---

## 🔍 動作の仕組み

### 実際の流れ

```
productionブランチへpush
    ↓
AWS CodeBuild起動（実際のデプロイ）← 従来通り
    ↓
GitHub Actions起動（記録のみ）← 新規追加
    ↓
GitHub Deployments APIへ記録
    {
      environment: "production",
      created_at: "2026-02-14T12:00:00Z",
      status: "success"
    }
    ↓
DevSyncGASがこのデータを取得 ✅
    ↓
デプロイ頻度: 0.81回/日（計測可能！）
```

### 重要な点

- ✅ **記録のみ**：実際のデプロイはAWS CodeBuildが行う（変更なし）
- ✅ **並行動作**：GitHub Actionsは記録だけなので数秒で完了
- ✅ **影響なし**：既存のCI/CDパイプラインには一切影響しない

---

## 🎯 対象ブランチの説明

ワークフローで指定したブランチ：

| ブランチパターン | 環境 | 例 |
|-----------------|------|-----|
| `production` | 本番 | production |
| `production-clients-*` | 地域展開（本番） | production-clients-region1 |
| `staging` | ステージング | staging |
| `staging-clients-*` | 地域展開（ステージング） | staging-clients-region2 |

**注意:** `master`/`main`は開発ブランチのため、対象に含めていません。

**必要に応じて調整してください。**

---

## ✅ 設定後の確認方法

### GASで診断

```javascript
debugDeploymentFrequency('your-org', 'your-repo')
```

**成功例:**
```
📦 Deployments API Data:
   ✅ Found 15 deployment(s)
      Success: 15
      Failed: 0

📊 Deployment Frequency Calculation:
   Total deploys: 15
   Period: 30 days
   Deployment frequency: 0.5000 deploys/day
   Performance Level: High
```

### GitHub CLIで確認（オプション）

```bash
gh api repos/your-org/your-repo/deployments | jq '.[0]'
```

---

## 🚨 よくある質問

### Q: 既存のデプロイプロセスに影響はありますか？

**A:** ありません。このワークフローは**記録のみ**を行い、実際のデプロイはAWS CodeBuildが従来通り実行します。

### Q: 過去のデプロイも記録されますか？

**A:** いいえ。このワークフローを追加した**以降のデプロイのみ**が記録されます。過去データは遡れません。

### Q: ブランチを追加したい場合は？

**A:** `record-deployment.yml`の`branches:`セクションにブランチ名を追加してください。

### Q: 地域ブランチが多すぎて面倒です

**A:** パターンマッチ（`production-clients-*`）を使っているので、全ての地域ブランチが自動的に対象になります。

### Q: このワークフローの実行コストは？

**A:** GitHub Actionsの無料枠内で十分です（数秒で完了）。Private repositoryの場合、月2000分まで無料です。

---

## 📚 参考資料

- [GitHub Deployments API](https://docs.github.com/en/rest/deployments/deployments)
- [chrnorm/deployment-action](https://github.com/chrnorm/deployment-action)
- [DORA Metrics Guide](https://dora.dev/guides/dora-metrics/)
