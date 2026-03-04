# gitlab-mr-knowledge-base Documentation

## 目的
GitLab MRデータ（Description / Discussion / Diff）を対象に、検索と出典付き回答を提供するRAG基盤の説明です。

## ドキュメント構成
- [01-system-overview.md](./01-system-overview.md): システム全体像とデータフロー
- [02-data-model.md](./02-data-model.md): 型・スキーマ設計
- [03-ingestion.md](./03-ingestion.md): GitLab取得とチャンキング
- [04-embedding-and-indexing.md](./04-embedding-and-indexing.md): Embeddingとインデックス化
- [05-retrieval.md](./05-retrieval.md): ハイブリッド検索とフィルタ
- [06-generation.md](./06-generation.md): プロンプト生成と回答生成
- [07-interfaces.md](./07-interfaces.md): CLI/APIインターフェース
- [08-config-and-runbook.md](./08-config-and-runbook.md): 環境変数と運用手順
- [09-testing.md](./09-testing.md): テスト戦略と実行方法

## クイックスタート
```bash
npm install
cp .env.example .env
npm run build
npm test
```
