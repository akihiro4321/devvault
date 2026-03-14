# DevVault Documentation

## 目的
GitLab MR と GitHub PR を共通の ChangeRequest モデルとして取り込み、検索と出典付き回答を提供する RAG 基盤の説明です。

## ドキュメント構成
- [01-system-overview.md](./01-system-overview.md): システム全体像とデータフロー
- [02-data-model.md](./02-data-model.md): 型・スキーマ設計
- [03-ingestion.md](./03-ingestion.md): provider 取得とチャンキング
- [04-embedding-and-indexing.md](./04-embedding-and-indexing.md): Embedding とインデックス化
- [05-retrieval.md](./05-retrieval.md): ハイブリッド検索とフィルタ
- [06-generation.md](./06-generation.md): プロンプト生成と回答生成
- [07-interfaces.md](./07-interfaces.md): CLI / API インターフェース
- [08-config-and-runbook.md](./08-config-and-runbook.md): 環境変数と運用手順
- [09-testing.md](./09-testing.md): テスト戦略と実行方法

## 読み進め方
- 全体像を掴む: `01-system-overview.md`
- 型を先に押さえる: `02-data-model.md`
- ingest 系コードを追う: `03-ingestion.md` → `04-embedding-and-indexing.md`
- ask 系コードを追う: `05-retrieval.md` → `06-generation.md`
- 実行入口と運用を確認する: `07-interfaces.md` → `08-config-and-runbook.md`
- テストを実装の索引として使う: `09-testing.md`

## クイックスタート
```bash
npm install
cp .env.example .env
npm run build
npm test
```
