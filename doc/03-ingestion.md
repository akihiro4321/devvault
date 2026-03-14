# DevVault Ingestion

## 1. Provider クライアント
- `src/ingestion/gitlab-client.ts`
  - `listChangeRequests`
  - `listDiscussions`
  - `listDiffs`
- `src/ingestion/github-client.ts`
  - `listChangeRequests`
  - `listDiscussions`
  - `listDiffs`

対応済み仕様:
- Link ヘッダによるページネーション
- GitLab の `429 Retry-After` リトライ
- GitHub の `403/429` リトライ
- GitHub は `GITHUB_OWNER` + `--project-id <repo>` で対象 repo を解決

## 2. 取得オーケストレーション
`src/ingestion/fetcher.ts`:
- ChangeRequest 一覧取得後、ChangeRequest ごとに Discussion / Diff を並列取得
- `concurrency` 指定で同時実行制御
- 返り値は `FetchedChangeRequestBundle[]`

## 3. チャンキング
`src/ingestion/chunker.ts`:
- `chunkChangeRequestDescription`: 見出し / 段落ベース分割
- `chunkChangeRequestComment`: 1 コメント 1 チャンク + 前後文脈
- `chunkDiffNote`: `file:line` 付き diff コメント
- `chunkDiff`: hunk 分割。1000 行超は要約へフォールバック
- `chunkFromChangeRequestBundle`: bundle 全体を `DocumentChunk[]` へ展開
- 除外: `system note`, 絵文字のみ

## 4. E5 プレフィックス
`src/ingestion/embedder.ts` 経由で embedding 時のみ付与する。
- ドキュメント: `passage: ...`
- クエリ: `query: ...`

保存される `chunk.text` 自体にはプレフィックスを持たせない。
