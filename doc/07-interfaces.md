# DevVault Interfaces

## 1. Public API
`src/index.ts`:
- `ingest({ projectId, since, provider })`
- `search({ query, ... })`
- `ask(question)`

## 2. CLI
- `scripts/ingest.ts`
  - `--project-id`
  - `--since`
  - `--provider gitlab|github`
  - `--incremental`
- `scripts/search-cli.ts`
  - `--query` でワンショット
  - 引数なしで対話モード

`src/cli.ts` の簡易 CLI でも `ingest` / `ask` を提供する。

## 3. 実行例
```bash
npm run ingest -- --project-id 123 --since 2024-01-01
npm run ingest -- --provider github --project-id web --since 2024-01-01
npm run ingest -- --provider gitlab --project-id 123 --incremental
npm run search -- --query "ログインの500エラー対応"
```
