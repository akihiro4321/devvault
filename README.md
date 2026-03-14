# devvault

GitLab MR と GitHub PR を取り込めるナレッジベース向けの Phase 1 実装です。

## セットアップ

```bash
npm install
cp .env.example .env
npm run build
npm test
```

## 実行

```bash
npm run ingest -- --project-id 123 --since 2024-01-01
npm run ingest -- --provider github --project-id web --since 2024-01-01
npm run search -- --query "ログインの500エラー対応"
```

## 注意

- Embedding は実モデル前提です。テスト用モックはアプリ本体ではなくテスト側で差し込みます。
- LanceDB操作は `data/lancedb` に保存します。
- GitHub 取り込みは `GITHUB_OWNER` と `--project-id <repo>` の組み合わせで対象リポジトリを指定します。
- `ANSWER_MODE=extractive` では検索結果ベースの簡易回答、`ANSWER_MODE=llm` では LLM 回答を返します。`llm` では `LLM_API_KEY` が必須です。
