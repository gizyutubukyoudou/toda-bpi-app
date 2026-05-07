# 火気使用届承認システム (kaiki-app)

Next.js 14 + Firebase による火気使用届デジタル承認ワークフローアプリ。

## 技術スタック

| 層 | 技術 |
|---|------|
| フロントエンド | Next.js 14 (App Router), React 18, TypeScript |
| スタイリング | Tailwind CSS, framer-motion |
| バックエンド | Firebase Functions (Node.js 20) |
| データベース | Cloud Firestore |
| 認証 | Firebase Authentication |
| ホスティング | Firebase Hosting |
| メール通知 | SendGrid |

## ローカル開発環境のセットアップ

### 1. 環境変数の設定

```bash
cp env.local.example .env.local
# .env.local を Firebase コンソールの値で埋める
```

### 2. 依存パッケージのインストール

```bash
npm install

# Cloud Functions
cd functions && npm install && cd ..
```

### 3. 開発サーバー起動

```bash
npm run dev
```

Firebase Emulator を使う場合:

```bash
firebase emulators:start
```

## Firebase の初期設定

### Firestore セキュリティルール

```bash
firebase deploy --only firestore:rules
```

### インデックス

```bash
firebase deploy --only firestore:indexes
```

### Cloud Functions デプロイ

```bash
# SendGrid API キーを設定
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set APP_URL

firebase deploy --only functions
```

### Hosting デプロイ

```bash
npm run build
firebase deploy --only hosting
```

## ディレクトリ構成

```
kaiki-app/
├── app/
│   ├── (auth)/login/          # ログイン画面
│   ├── (protected)/
│   │   ├── dashboard/         # 申請一覧
│   │   └── apply/
│   │       ├── new/           # 新規作成
│   │       └── [id]/
│   │           ├── page.tsx   # 申請詳細
│   │           ├── review/    # 承認・確認（監督/所長）
│   │           ├── reject/    # 差し戻し
│   │           └── edit/      # 修正して再提出
│   └── page.tsx               # ルートリダイレクト
├── components/
│   ├── ui/                    # AppHeader, StatusBadge
│   ├── form/                  # ApplicationForm, CheckboxRow, SectionHeader
│   └── approval/              # SimpleApprovalView, BasicInfoCard, CheckedItemsTags
├── lib/
│   ├── types.ts               # ApplicationData型, extractCheckedBySection等
│   ├── firebase.ts            # クライアントFirebase初期化
│   ├── firestore.ts           # Firestoreクライアント操作
│   └── hooks/useAuth.tsx      # 認証コンテキスト
└── functions/src/index.ts     # Cloud Functions（承認ワークフロー）
```

## ユーザーロール

| ロール | 説明 |
|--------|------|
| `contractor` | 下請け業者。申請作成・提出・差し戻し後の再提出 |
| `supervisor` | 監督（担当者）。一次確認（submitted → manager_reviewing） |
| `manager` | 所長。最終承認（manager_reviewing → approved/rejected） |

## ユーザー登録方法

Firestore の `users/{uid}` コレクションにドキュメントを作成する（管理者が手動またはAdmin SDKで作成）:

```json
{
  "uid": "firebase-auth-uid",
  "email": "user@example.com",
  "displayName": "田中 太郎",
  "role": "contractor",
  "workSiteName": "○○現場",
  "company": "株式会社○○建設",
  "createdAt": "Timestamp"
}
```
