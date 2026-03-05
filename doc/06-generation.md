# DevVault Generation

## 1. プロンプト生成
`src/generation/prompt-builder.ts`:
- 検索チャンクを列挙
- source_type / MR番号 / author / 日時 / URL / text を明示
- 「検索結果のみに基づく回答」をsystem指示

## 2. 回答生成
`src/generation/answer-generator.ts`:
- `LLM_API_KEY` がある場合: `ai` の `streamText()` を利用
- キー未設定または失敗時: フォールバック回答
  - 要約
  - 出典（`MR !iid @author URL`）

## 3. 出力方針
- 出典付き
- 検索結果外の情報を極力含めない
- 該当なしを正直に返す
