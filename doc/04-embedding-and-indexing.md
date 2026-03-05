# DevVault Embedding And Indexing

## 1. Embedding
`src/ingestion/embedder.ts`:
- モデル: `Xenova/multilingual-e5-small`（環境変数で変更可能）
- `embed(text)` / `embedBatch(texts)` 提供
- `EMBEDDING_MOCK=true` の場合、疑似ベクトル生成で高速テスト
- モデル実行失敗時は疑似ベクトルへフォールバック

## 2. Indexing
`src/ingestion/indexer.ts`:
- LanceDB接続・テーブル作成
- `source_id` をキーにupsert
- 永続化の安全弁として sidecar (`_chunks.json`) を併用
- `readAll()` はsidecarから全件読込

## 3. 注意点
現在の検索実装はsidecar読込ベースです。LanceDBネイティブの `hybrid_search()` 直利用は未実装です。
