# Airtable x Vercel 拡張方針

## 方針

クラファンの申し込み・支援データは Airtable を正とし、LP上の支援総額や支援者数は Vercel Functions 経由で表示します。

ブラウザから Airtable に直接アクセスしない理由:

- Airtable Personal Access Token を公開できないため
- 支援者情報やメールアドレスなどの個人情報をクライアントに出さないため
- 表示用に集計済みの数値だけ返す方が安全なため

## 追加済みの受け皿

- `/api/crowdfunding-summary`
  - Airtable環境変数が未設定の場合は、`configured: false` のJSONを返す
  - 環境変数を設定すると、Airtableのレコードを100件ずつページングして集計する
- `assets/crowdfunding-summary.js`
  - LP側で支援総額・支援者数を表示するためのクライアントスクリプト
- `.env.example`
  - Vercelに設定する環境変数の雛形

## 想定するAirtableフィールド

| 用途 | 環境変数 | 既定値 |
|---|---|---|
| 支援金額 | `AIRTABLE_AMOUNT_FIELD` | `支援金額` |
| ステータス | `AIRTABLE_STATUS_FIELD` | `ステータス` |
| 集計対象ステータス | `AIRTABLE_CONFIRMED_STATUS` | `入金済み` |
| リターン名 | `AIRTABLE_RETURN_FIELD` | `リターン` |

## Vercelに設定する必須環境変数

```text
AIRTABLE_TOKEN
AIRTABLE_BASE_ID
AIRTABLE_TABLE_NAME
```

任意:

```text
AIRTABLE_VIEW_NAME
AIRTABLE_AMOUNT_FIELD
AIRTABLE_STATUS_FIELD
AIRTABLE_CONFIRMED_STATUS
AIRTABLE_RETURN_FIELD
```

## 公開ページへの反映案

支援ページを本実装するときに、次のようなHTMLを置くと自動表示できます。

```html
<section data-crowdfunding-summary>
  <p>現在の支援総額: <strong data-total-amount>--</strong></p>
  <p>支援者数: <strong data-supporter-count>--</strong></p>
  <p data-summary-status>読み込み中...</p>
</section>
<script src="/assets/crowdfunding-summary.js" defer></script>
```

## 今後の拡張

1. 支援ページに支援総額・支援者数・リターン別件数を表示
2. Airtableの「公開可否」フィールドを見て、支援者名・応援コメントだけ表示
3. 管理用APIを分け、支援者一覧や未入金一覧は認証付きで表示
4. 当日案内ページと連動し、来場時間帯やアレルギー確認を反映
5. 実施後レポートに支援総額、来場者数、SNS投稿数を自動反映

## 参考

- Airtable Web API: https://www.airtable.com/developers/web/api/introduction
- Airtable Personal Access Tokens: https://www.airtable.com/developers/web/guides/personal-access-tokens
- Vercel Functions: https://vercel.com/docs/functions
