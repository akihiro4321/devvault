# GEMINI.md

このリポジトリは GitLab MR データを対象にした RAG パイプライン基盤（Phase 1）です。

- Runtime: Node.js 20+, TypeScript (ESM)
- Embedding: Transformers.js (`Xenova/multilingual-e5-small`)
- Vector DB: LanceDB (`vectordb`)
- Retrieval: Vector + BM25 + RRF
- Generation: AI SDK

主要コマンド:

```bash
npm install
npm run build
npm test
npm run ingest -- --project-id 123 --since 2024-01-01
npm run search -- --query "ログインの500エラー対応"
```
