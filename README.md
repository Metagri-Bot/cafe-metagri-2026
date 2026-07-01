# cafe-metagri-2026

カフェMetagri 2026 LPの静的サイトです。

## Pages

- `index.html`: LP全体ハブ
- `co-creators.html`: 共創者募集ページ
- `support.html`: クラファン企画・支援者応募・リターン紹介ページ
- `day-guide.html`: 実施当日の案内の準備ページ
- `report.html`: 実施後の事後報告の準備ページ
- `terms.html`: 販売規約の準備ページ

## Local preview

```bash
python -m http.server 5177
```

Then open:

```text
http://127.0.0.1:5177/
```

## Vercel preview

Use Vercel Dev when testing API routes:

```bash
vercel dev
```

## Airtable integration

Crowdfunding application data is planned to live in Airtable. The public site should not call Airtable directly because the Airtable token must stay server-side.

The prepared endpoint is:

```text
/api/crowdfunding-summary
```

See [docs/airtable-vercel-plan.md](./docs/airtable-vercel-plan.md) and [.env.example](./.env.example).
