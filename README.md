# devvault

GitLab MR と GitHub PR を取り込めるナレッジベース向けの Phase 1 実装です。

## どのような場面で使うか

DevVault は、過去の MR / PR とレビュー議論を横断検索し、出典付きで再利用したいときに使います。典型的なユースケースは次のとおりです。

- 障害対応の再確認: たとえば「ログイン画面の 500 エラーに以前どう対処したか」を過去の MR / PR から探す。
- レビュー履歴の参照: 特定ファイルや実装パターンに対して、過去にどんな指摘や修正が入ったかを確認する。
- 実装判断の根拠確認: コメントや diff を含めて、なぜその変更になったかを追う。
- オンボーディング支援: 新しく参加したメンバーが、過去の変更経緯をコードレビュー単位で読み解く。
- 類似変更の探索: 新規実装前に、似た変更が既にないかを検索して再利用候補を探す。

## セットアップ

```bash
npm install
cp .env.example .env
npm run build
npm test
```

## 使い始める順番

DevVault は、検索前に対象 MR / PR を取り込んでインデックスを作る必要があります。基本の順番は次のとおりです。

### 1. 接続先とモードを設定する

`.env` に利用する provider と認証情報を設定します。

- GitLab を使う場合: `SCM_PROVIDER=gitlab`, `GITLAB_URL`, `GITLAB_TOKEN`
- GitHub を使う場合: `SCM_PROVIDER=github`, `GITHUB_URL`, `GITHUB_TOKEN`, `GITHUB_OWNER`
- 回答モードを変える場合: `ANSWER_MODE=extractive|llm`
- `llm` を使う場合: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`

### 2. 初回取り込みを実行する

まず検索対象となる MR / PR を ingest します。これをやらないと検索できません。

GitLab:
```bash
npm run ingest -- --provider gitlab --project-id 123 --since 2024-01-01
```

GitHub:
```bash
npm run ingest -- --provider github --project-id web --since 2024-01-01
```

この処理で、MR / PR の説明、discussion、diff がチャンク化され、embedding 付きで `data/lancedb/_chunks.json` に保存されます。

### 3. 検索して過去事例を探す

取り込み完了後に検索できます。

```bash
npm run search -- --query "ログインの500エラー対応"
```

`scripts/search-cli.ts` は検索結果一覧と回答をまとめて表示します。

### 4. 継続運用では差分取り込みを使う

初回取り込み後は、毎回フル取り込みするのではなく incremental ingest を使うのが基本です。

```bash
npm run ingest -- --provider gitlab --project-id 123 --incremental
```

`--incremental` は既存 index の最新 `updated_at` を基準に `since` を決めて、更新分を取り込みます。

### 5. 必要に応じて回答モードを切り替える

- `ANSWER_MODE=extractive`: 検索結果をそのまま要約して返す。まずはこのモードで検索品質を確認するのが安全です。
- `ANSWER_MODE=llm`: 検索結果をプロンプト化して LLM に回答させる。出典付きの自然文回答が必要な場合に使います。

## 実行例

```bash
npm run ingest -- --project-id 123 --since 2024-01-01
npm run ingest -- --provider github --project-id web --since 2024-01-01
npm run ingest -- --provider gitlab --project-id 123 --incremental
npm run search -- --query "ログインの500エラー対応"
```

## 注意

- Embedding は実モデル前提です。テスト用モックはアプリ本体ではなくテスト側で差し込みます。
- LanceDB操作は `data/lancedb` に保存します。
- 検索前に ingest が必要です。`data/lancedb/_chunks.json` が存在しない状態では `npm run search` は失敗します。
- GitHub 取り込みは `GITHUB_OWNER` と `--project-id <repo>` の組み合わせで対象リポジトリを指定します。
- `ANSWER_MODE=extractive` では検索結果ベースの簡易回答、`ANSWER_MODE=llm` では LLM 回答を返します。`llm` では `LLM_API_KEY` が必須です。
