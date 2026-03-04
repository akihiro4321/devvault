# AGENTS.md

## プロジェクト概要

GitLab MR / Discussion / Diff を収集し、チャンキング・Embedding・インデックス化・検索・回答生成まで行う RAG 基盤。

## 実装方針

- TypeScript ESM、strictモード
- オフライン実行を重視し、Embeddingはローカル優先
- 検索はハイブリッド（Vector + BM25 + RRF）
- 回答は必ず出典（MR番号/作者/URL）を明記

## CLI

- `scripts/ingest.ts`: GitLab から取得してインデックス作成
- `scripts/search-cli.ts`: 検索および回答生成
