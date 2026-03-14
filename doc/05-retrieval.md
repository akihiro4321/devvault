# DevVault Retrieval

## 1. 検索エンジン
`src/retrieval/search.ts` の `SearchEngine.hybridSearch()` が中心です。

処理手順:
1. フィルタ適用
2. クエリ embedding
3. ベクトル類似度ランキング（コサイン）
4. キーワードランキング（BM25）
5. RRF で統合し上位 N 件を返却

## 2. Retrieval シーケンス
```mermaid
sequenceDiagram
  autonumber
  participant Caller as search()/ask()
  participant Engine as SearchEngine
  participant Indexer
  participant Filter as applyFilters
  participant Embedder
  participant Vector as cosineSimilarity
  participant BM25 as BM25 scorer
  participant RRF as rerankWithRRF

  Caller->>Engine: hybridSearch(request)
  Engine->>Indexer: readAll()
  Indexer-->>Engine: DocumentChunk[]
  Engine->>Filter: applyFilters(all, request.filters)
  Filter-->>Engine: filtered chunks
  Engine->>Embedder: embed(request.query, true)
  Embedder-->>Engine: query vector
  par vector ranking
    Engine->>Vector: cosineSimilarity(query, chunk.vector)
    Vector-->>Engine: vectorRanked
  and bm25 ranking
    Engine->>BM25: tokenize + scoreBM25()
    BM25-->>Engine: bm25Ranked
  end
  Engine->>RRF: rerankWithRRF(merged, weights)
  RRF-->>Caller: RankedChunk[]
```

## 3. フィルタ
`src/retrieval/filter-builder.ts`:
- 対応: `sourceTypes`, `createdAfter`, `author`, `filePathLike`, `targetBranch`, `projectId`
- `buildWhereClause()` は説明用 SQL 文字列
- `applyFilters()` は実際の絞り込み
- `projectId` は `number | string` の両方を扱える

## 4. Re-ranking
`src/retrieval/reranker.ts`:
- Reciprocal Rank Fusion を実装
- デフォルト重み: vector `0.7`, bm25 `0.3`
- vector と BM25 の両方で上位に来る chunk を強く評価する

## 5. コードリーディングの観点
- 検索経路は `readAll()` で sidecar 全件を読む前提なので、DB クエリ最適化ではなく in-memory 計算が中心になる。
- `vectorRanked` と `bm25Ranked` は別々に topK を切ってからマージするため、どこで候補集合が縮むかを追うと挙動を理解しやすい。
- クエリ embedding だけ `isQuery=true` で `query: ` prefix が付く点は、ingest 時の埋め込みと対になる。
