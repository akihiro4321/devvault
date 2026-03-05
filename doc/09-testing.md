# DevVault Testing

## 1. テスト構成
- `tests/chunker.test.ts`: チャンキング仕様
- `tests/filter-builder.test.ts`: フィルタ構築
- `tests/prompt-builder.test.ts`: プロンプト生成
- `tests/e2e.test.ts`: ingest→search→answer

## 2. 実行
```bash
npm test
```

## 3. 検証済み事項
- build成功: `npm run build`
- test成功: 全9テスト

## 4. 未実施の実環境検証
- 実GitLab APIに対する統合試験（認証情報が必要）
- 実LLMプロバイダへのストリーミング応答確認
