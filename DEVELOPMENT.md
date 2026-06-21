# 開発コマンド

このプロジェクトでは、Vite+ の `vp` CLI を使って依存関係や各ワークスペースのタスクを管理します。コマンドは、特記がない限りリポジトリのルートで実行してください。

## 前提

- Node.js 24 以上
- `vp` コマンドが利用できること

```bash
# 依存関係をインストール・更新する
vp install
```

リモートの変更を取り込んだ後は、最初に `vp install` を実行してください。

## 開発サーバー

以下のコマンドは終了するまでプロセスが動き続けます。フロントエンドと Worker を連携させる場合は、それぞれ別のターミナルで起動します。

```bash
# フロントエンド（website）
vp run dev

# Cloudflare Worker
vp run worker#dev

# Storybook（ポート 6006）
vp run website#storybook
```

フロントエンドは `/api` と `/parties` を Worker にプロキシします。接続先の既定値は `http://localhost:8787` です。変更する場合は `VITE_WORKER_ORIGIN` を指定します。

```bash
VITE_WORKER_ORIGIN=http://localhost:8788 vp run dev
```

## 検証

実装後は、基本的に `ready` を実行します。フォーマット、共有パッケージのビルド、Lint・型チェック、テスト、全ワークスペースのビルドを順番に行います。

```bash
# 一括検証
vp run ready

# 個別に検証する場合
vp check
vp test
vp run -r test
vp run -r build
```

## ビルド

```bash
# 全ワークスペース
vp run -r build

# 個別ワークスペース
vp run website#build
vp run worker#build
vp run schema#build
vp run game#build
vp run db#build
vp run utils#build

# Storybook の静的ビルド
vp run website#build-storybook
```

`worker#build` は `wrangler deploy --dry-run` を使うため、実際のデプロイは行いません。

## パッケージ開発

共有パッケージを監視しながらビルドする場合に使用します。

```bash
vp run schema#dev
vp run game#dev
vp run db#dev
vp run utils#dev
```

## ワークスペース指定の書式

```bash
# 特定ワークスペースのスクリプト
vp run <workspace>#<script>

# 全ワークスペースにある同名スクリプト
vp run -r <script>
```

例:

```bash
vp run game#test
vp run worker#check
```

利用可能なコマンドやオプションを確認するには、次を実行します。

```bash
vp help
vp run --help
```
