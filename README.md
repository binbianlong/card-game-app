# 大富豪リアルタイム対戦アプリ

友達数人で同じルームに入り、それぞれのスマホからリアルタイムに大富豪を遊ぶための Web アプリです。プレイヤー同士でポイントを賭け、対戦結果に応じてポイントを精算する想定です。

## コンセプト

- スマホ前提のリアルタイム大富豪
- 友達同士のプライベートルーム対戦
- ポイントを賭けたカジュアルな勝負
- Google OAuth によるログイン
- WebSocket による低遅延なゲーム進行
- ゲーム状態は Durable Objects に保持し、D1 には永続データのみ保存

## 主な機能

- Google アカウントでログイン
- 友達を招待できるルーム作成
- ルームコードまたは共有リンクで参加
- 数人でのリアルタイム対戦
- 大富豪の基本ルール
- 革命、階段、縛り、8切りなどのローカルルール拡張
- 持ちポイントの確認
- 対戦前のベット設定
- 対戦結果によるポイント精算
- 切断、再接続、スマホのスリープ復帰への対応

## 技術スタック

### Frontend

- Vite plus
- React
- TypeScript
- TanStack Router
- React Hook Form
- Tailwind CSS
- Motion
- tailwind-variants
- @use-gesture/react
- Storybook
- shadcn/ui
- Zustand
- PartySocket

### Backend

- Cloudflare Workers
- Hono
- Hono RPC
- PartyServer
- WebSocket Hibernation
- Durable Objects
- Cloudflare Rate Limiting
- Cloudflare Queues
- Zod
- Better Auth
- Google OAuth

### Database

- Cloudflare D1
- Drizzle

> D1 はユーザー、ポイント履歴、対戦履歴、ルームメタ情報などの永続化に使います。リアルタイムのゲーム状態は D1 ではなく Durable Objects に保持します。

### Test

- Vitest
- Playwright

### DevOps

- GitHub Actions
- Wrangler
- oxc

## アーキテクチャ方針

```text
Smartphone Browser
  |
  | React / TanStack Router / PartySocket
  v
Cloudflare Workers + Hono
  |
  | Hono RPC
  v
Durable Objects / PartyServer
  |
  | realtime game state
  v
WebSocket Rooms

Cloudflare D1 + Drizzle
  |
  | users / points / match history / transactions
  v
Persistent Data
```

### フロントエンド

フロントエンドはスマホでの操作を最優先に設計します。手札の選択、カードの提出、パス、場札確認、現在順位、残り枚数、ベット額、ポイント変動が小さい画面でも読み取りやすい UI を目指します。

状態管理は以下のように分けます。

- Zustand: クライアント側 UI 状態、選択中カード、モーダル状態
- PartySocket: ルーム内のリアルタイム通信
- TanStack Router: 画面遷移、認証必須ルート、ルーム URL
- React Hook Form + Zod: 入力フォームとバリデーション

### バックエンド

Hono を Workers 上で動かし、API と認証まわりを担当します。ルームごとのゲーム進行は Durable Objects と PartyServer に寄せ、WebSocket Hibernation を使って接続数とコストに配慮します。

主な責務は以下です。

- 認証、セッション管理
- ルーム作成、参加、退出
- WebSocket 接続の認可
- ゲーム進行イベントの検証
- ポイント精算イベントのキュー投入
- 対戦履歴、ポイント履歴の永続化

### ゲーム状態

ゲーム中の状態は Durable Objects に保持します。

- 山札
- プレイヤー順
- 各プレイヤーの手札
- 場札
- 現在ターン
- パス状態
- 革命状態
- 縛り状態
- ラウンド順位
- 接続状態

D1 にはリアルタイムに変化するゲーム状態を保存しません。ゲーム終了時または重要イベント時に、結果や履歴として保存します。

## データ設計の例

永続化する主なデータの候補です。

- users
- accounts
- sessions
- rooms
- matches
- match_players
- point_wallets
- point_transactions
- friendships
- invites

Better Auth の管理テーブルと、アプリ固有のポイント・対戦履歴テーブルを Drizzle で管理します。

## リアルタイムイベント例

クライアントとサーバー間のイベントは Zod で検証します。

```ts
type ClientEvent =
  | { type: "room:join"; roomId: string }
  | { type: "game:ready" }
  | { type: "game:play-cards"; cardIds: string[] }
  | { type: "game:pass" }
  | { type: "game:leave" };

type ServerEvent =
  | { type: "room:state"; payload: unknown }
  | { type: "game:started"; payload: unknown }
  | { type: "game:state"; payload: unknown }
  | { type: "game:finished"; payload: unknown }
  | { type: "error"; message: string };
```

## 想定ディレクトリ構成

```text
.
├── apps/
│   ├── web/               # React frontend
│   └── worker/            # Cloudflare Workers + Hono
├── packages/
│   ├── db/                # Drizzle schema and migrations
│   ├── schema/            # Zod schemas shared by frontend/backend
│   ├── game/              # 大富豪ルール、カード判定、順位計算
│   └── ui/                # 共通 UI components
├── e2e/                   # Playwright tests
├── .github/
│   └── workflows/
├── wrangler.toml
└── README.md
```

## 開発コマンド

このリポジトリは Vite+ を使います。Vite+ は `vp` CLI から Vite、Vitest、Oxlint、Oxfmt などをまとめて実行します。

```bash
# 依存関係のインストール
vp install

# format / lint / test / build の一括確認
vp run ready

# ワークスペース全体のテスト
vp run -r test

# ワークスペース全体のビルド
vp run -r build

# フロントエンド開発サーバー
vp run dev

# 個別スクリプトの実行
vp run <script>
```

バックエンド、Storybook、E2E、デプロイ用のコマンドは、各パッケージを追加したタイミングで `package.json` に定義します。

## 環境変数

必要になる環境変数の例です。

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
DATABASE_URL=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

Cloudflare Workers で使う値は、ローカル用の `.dev.vars` と Cloudflare 側の Secrets で管理します。

## ポイント精算の方針

ポイントはゲーム内スコアとして扱い、現金や外部決済とは結びつけません。対戦開始前にベット額を確定し、ゲーム終了後に順位とルールに応じてポイントトランザクションを作成します。

精算処理は Cloudflare Queues に流し、以下を保証する設計にします。

- 同じ対戦結果を二重精算しない
- 履歴を追跡できる
- 失敗時に再試行できる
- ポイント残高と履歴の整合性を保つ

## テスト方針

- `packages/game`: ルール判定、カード比較、革命、縛り、順位計算を Vitest で重点的に検証
- `apps/worker`: API、WebSocket イベント、認可、精算処理を Vitest で検証
- `apps/web`: 主要 UI とフォームを Storybook / Vitest で検証
- `e2e`: 複数プレイヤーの参加、カード提出、切断復帰、ゲーム終了までを Playwright で検証

## セキュリティと不正対策

- WebSocket 接続時にセッションを検証
- 手札やターンなどのゲーム状態はサーバー側で正とする
- クライアントから送られたカード提出は Durable Objects 側で検証
- Rate Limiting でルーム作成、参加、認証関連 API を保護
- ポイント精算はサーバー側イベントのみで実行
- Zod で全イベント payload を検証

## デプロイ

Cloudflare Workers へ Wrangler でデプロイします。GitHub Actions では以下を実行する想定です。

- install
- typecheck
- lint
- unit tests
- Playwright tests
- Drizzle migration check
- Wrangler deploy

## ライセンス

未定
