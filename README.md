# devvault

GitLab MR / Issue ナレッジベース向けのPhase 1実装です。

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
npm run search -- --query "ログインの500エラー対応"
```

## 注意

- Embeddingは `EMBEDDING_MOCK=true` で軽量モードに切り替え可能です（テスト推奨）。
- LanceDB操作は `data/lancedb` に保存します。
