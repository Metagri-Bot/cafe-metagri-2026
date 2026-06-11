const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

function json(statusCode, payload) {
  return Response.json(payload, {
    status: statusCode,
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}

function numberFromValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getConfig() {
  return {
    token: process.env.AIRTABLE_TOKEN,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME,
    viewName: process.env.AIRTABLE_VIEW_NAME,
    amountField: process.env.AIRTABLE_AMOUNT_FIELD || "支援金額",
    statusField: process.env.AIRTABLE_STATUS_FIELD || "ステータス",
    confirmedStatus: process.env.AIRTABLE_CONFIRMED_STATUS || "入金済み",
    returnField: process.env.AIRTABLE_RETURN_FIELD || "リターン",
  };
}

async function fetchAirtableRecords(config) {
  const records = [];
  let offset;

  do {
    const url = new URL(`${AIRTABLE_API_BASE}/${config.baseId}/${encodeURIComponent(config.tableName)}`);
    url.searchParams.set("pageSize", "100");
    if (config.viewName) url.searchParams.set("view", config.viewName);
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Airtable request failed: ${response.status} ${body}`);
    }

    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

function summarize(records, config) {
  const confirmed = records.filter((record) => {
    const value = record.fields?.[config.statusField];
    if (!config.statusField || !config.confirmedStatus) return true;
    if (Array.isArray(value)) return value.includes(config.confirmedStatus);
    return value === config.confirmedStatus;
  });

  const totalAmount = confirmed.reduce((sum, record) => {
    return sum + numberFromValue(record.fields?.[config.amountField]);
  }, 0);

  const returns = {};
  for (const record of confirmed) {
    const value = record.fields?.[config.returnField] || "未分類";
    const key = Array.isArray(value) ? value.join(", ") : String(value);
    returns[key] = (returns[key] || 0) + 1;
  }

  return {
    configured: true,
    totalAmount,
    supporterCount: confirmed.length,
    recordCount: records.length,
    returnBreakdown: returns,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const config = getConfig();
  const required = ["token", "baseId", "tableName"].filter((key) => !config[key]);

  if (required.length > 0) {
    return json(200, {
      configured: false,
      totalAmount: 0,
      supporterCount: 0,
      recordCount: 0,
      returnBreakdown: {},
      missing: required,
      message: "Airtable environment variables are not configured yet.",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const records = await fetchAirtableRecords(config);
    return json(200, summarize(records, config));
  } catch (error) {
    return json(500, {
      configured: true,
      error: "Failed to load Airtable crowdfunding summary.",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
