# DevVault Config And Runbook

## 1. 主要環境変数
- `SCM_PROVIDER`
- `GITLAB_URL`
- `GITLAB_TOKEN`
- `GITHUB_URL`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `LANCEDB_PATH`
- `EMBEDDING_MODEL`
- `ANSWER_MODE`
- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_MODEL`
- `INGEST_SINCE`

詳細は `.env.example` を参照。

## 2. 初期セットアップ
```bash
npm install
cp .env.example .env
npm run build
npm test
```

## 3. バッチ取り込み
GitLab:
```bash
npm run ingest -- --provider gitlab --project-id 123 --since 2024-01-01
```

GitHub:
```bash
npm run ingest -- --provider github --project-id web --since 2024-01-01
```

## 4. 差分取り込み
```bash
npm run ingest -- --provider gitlab --project-id 123 --incremental
```

`--incremental` は既存 index の最新 `updated_at` を基準に `since` を決める。

## 5. 検索
```bash
npm run search -- --query "ログインの500エラー対応"
```

## 6. 運用メモ
- `ANSWER_MODE=extractive` は検索結果ベースの簡易回答、`ANSWER_MODE=llm` は LLM 回答
- `ANSWER_MODE=llm` では `LLM_API_KEY` が必須
- GitLab ingest では `GITLAB_TOKEN`、GitHub ingest では `GITHUB_TOKEN` と `GITHUB_OWNER` が必要
- GitHub の `projectId` は数値ではなく repo 名文字列を使う
