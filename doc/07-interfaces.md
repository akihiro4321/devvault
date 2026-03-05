# DevVault Interfaces

## 1. Public API
`src/index.ts`:
- `ingest({ projectId, since })`
- `search({ query, ... })`
- `ask(question)`

## 2. CLI
- `scripts/ingest.ts`
  - `--project-id`
  - `--since`
  - `--incremental`
- `scripts/search-cli.ts`
  - `--query` でワンショット
  - 引数なしで対話モード

## 3. 実行例
```bash
npm run ingest -- --project-id 123 --since 2024-01-01
npm run search -- --query "ログインの500エラー対応"
```
