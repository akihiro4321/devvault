# Ingestion

## 1. GitLabクライアント
`src/ingestion/gitlab-client.ts`:
- `listMergeRequests`
- `listDiscussions`
- `listDiffs`

対応済み仕様:
- Linkヘッダによるページネーション
- `429 Retry-After` のリトライ

## 2. 取得オーケストレーション
`src/ingestion/fetcher.ts`:
- MR一覧取得後、MRごとにDiscussion/Diffを並列取得
- `concurrency` 指定で同時実行制御

## 3. チャンキング
`src/ingestion/chunker.ts`:
- `chunkMRDescription`: 見出し/段落ベース分割
- `chunkMRComment`: 1コメント1チャンク + 前後文脈
- `chunkDiffNote`: file:line付き
- `chunkDiff`: hunk分割、1000行超は要約
- 除外: `system note`, 絵文字のみ

## 4. E5プレフィックス
- ドキュメント: `passage: ...`
- クエリ: `query: ...`
