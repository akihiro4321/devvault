# DevVault Config And Runbook

## 1. 主要環境変数
- `GITLAB_URL`
- `GITLAB_TOKEN`
- `LANCEDB_PATH`
- `EMBEDDING_MODEL`
- `EMBEDDING_MOCK`
- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_MODEL`

詳細は `.env.example` を参照。

## 2. 初期セットアップ
```bash
npm install
cp .env.example .env
npm run build
```

## 3. バッチ取り込み
```bash
npm run ingest -- --project-id 123 --since 2024-01-01
```

## 4. 検索
```bash
npm run search -- --query "ログインの500エラー対応"
```

## 5. 運用メモ
- テスト/ローカル検証時は `EMBEDDING_MOCK=true` 推奨
- 実運用で `GITLAB_TOKEN` 未設定だと ingest は失敗する
