# AGENTS.md

## プロジェクト概要

GitLab MR / Discussion / Diff を収集し、チャンキング・Embedding・インデックス化・検索・回答生成まで行う RAG 基盤。

## プロジェクト名

DevVault

## 実装方針

- TypeScript ESM、strictモード
- オフライン実行を重視し、Embeddingはローカル優先
- 検索はハイブリッド（Vector + BM25 + RRF）
- 回答は必ず出典（MR番号/作者/URL）を明記

## コーディング規約

- ESM importを使用し、ローカルimportは`.js`拡張子を明示
- `src/index.ts`以外はdefault exportを避け、named exportを優先
- 変更時は `npm run build && npm test` を通す

## アーキテクチャ制約

- 外部通信を許可するのはLLM呼び出しのみ
- Embeddingはローカル実行を優先し、`EMBEDDING_MOCK=true` をテスト用途で利用
- `source_system` / `source_type` はPhase 2拡張（Jira/Backlog/Confluence）を前提に維持

## テスト方針

- テストはVitestで実装
- unit: chunker/filter/prompt/search
- e2e: ingest → search → ask のフルフロー
- CIでは `EMBEDDING_MOCK=true` を基本とし、実モデル検証は手動統合テストで実施

## CLI

- `scripts/ingest.ts`: GitLab から取得してインデックス作成
- `scripts/search-cli.ts`: 検索および回答生成
