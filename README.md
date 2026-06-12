# 部品・修理 依頼ボード

「これ見積作って〜」「この部品使ったで〜」を登録して、対応したかどうかをみんなで共有するWebアプリです。
データは **Googleスプレッドシート** に保存されるので、シートを直接見たり編集したりもできます。

- 種別: 見積依頼 / 使用報告
- ステータス: 未対応 → 対応中 → 済(済になると赤いハンコが押されます)
- ログイン不要(URLを知っている人だけで使う想定)

## 構成

- Next.js (App Router) / Vercel にデプロイ
- Google Sheets API(サービスアカウント)でシートに読み書き

## セットアップ手順

### 1. スプレッドシートを用意する

1. Googleスプレッドシートを新規作成
2. URLの `https://docs.google.com/spreadsheets/d/【ここ】/edit` の部分が **SHEET_ID**

シート名やヘッダーは後で自動作成されるので、空のままでOKです。

### 2. Google Cloud でサービスアカウントを作る

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成
2. 「APIとサービス」→「ライブラリ」で **Google Sheets API** を有効化
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
4. 作成したサービスアカウントを開き、「キー」タブ →「鍵を追加」→「JSON」でキーをダウンロード
5. JSONの中の `client_email` と `private_key` を控える

### 3. シートをサービスアカウントに共有する

スプレッドシートの「共有」から、サービスアカウントのメールアドレス
(`xxxx@xxxx.iam.gserviceaccount.com`)を **編集者** として追加。
これを忘れると読み書きできません。

### 4. GitHub に push

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/あなたのアカウント/buhin-tracker.git
git push -u origin main
```

### 5. Vercel にデプロイ

1. [Vercel](https://vercel.com/) で「Add New Project」→ GitHubリポジトリを選択
2. Environment Variables に以下を設定:

| 変数名 | 値 |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントのメールアドレス |
| `GOOGLE_PRIVATE_KEY` | JSONの `private_key` の値をそのまま(`\n` 含めて全部) |
| `SHEET_ID` | スプレッドシートのID |

3. Deploy!

### 6. シートを初期化する

デプロイ後、ブラウザで一度だけ以下にアクセス:

```
https://あなたのアプリ.vercel.app/api/init
```

「依頼一覧」シートとヘッダー行が自動で作成されます。これで完成!

## ローカルで動かす場合

```bash
cp .env.example .env.local
# .env.local に各値を記入
npm install
npm run dev
```

http://localhost:3000 で開き、最初に http://localhost:3000/api/init に一度アクセスしてください。

## シートの列構成

| ID | 受付日 | 依頼者 | 種別 | 部品名 | 数量 | 使う場所・設備 | メモ | ステータス | 対応者 | 更新日時 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

シート側で直接ステータスを書き換えても、アプリに反映されます(未対応 / 対応中 / 済 のいずれかで記入)。
