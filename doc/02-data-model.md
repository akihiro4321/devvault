# DevVault Data Model

## 1. GitLab入力モデル
`src/types/gitlab.ts`:
- `MergeRequest`: MR本体
- `Discussion` / `Note`: スレッドとコメント
- `DiffPosition`: Diffコメント位置
- `MRDiff`: ファイル差分

## 2. 正規化チャンクモデル
`src/types/chunk.ts` の `DocumentChunk` がRAGの統一単位です。
主な項目:
- 識別: `id`, `source_id`, `source_iid`
- 検索: `vector`, `text`, `source_type`
- フィルタ: `author`, `file_path`, `created_at`, `target_branch`, `project_id`
- 出典: `web_url`, `parent_title`
- 文脈: `discussion_context`, `chunk_index`, `total_chunks`

## 3. 検索I/O
`src/types/search.ts`:
- 入力: `SearchRequest`（query、topK、filters等）
- 出力: `RankedChunk`（vectorRank/bm25Rank/score付き）
