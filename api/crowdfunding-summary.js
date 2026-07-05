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
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + numberFromValue(item), 0);
  }
  if (typeof value === "string") {
    const parsed = Number(value.normalize("NFKC").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function fieldValue(fields, fieldNames) {
  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
      return fields[fieldName];
    }
  }
  return undefined;
}

function amountFromPlan(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value || "");
  const parsed = numberFromValue(text);
  if (parsed > 0) return parsed;

  const planAmounts = [
    ["ちょい応援プラン", 1000],
    ["応援コメント掲載プラン", 3000],
    ["カフェ参加プラン", 6000],
    ["共創参加プラン", 10000],
    ["農家スポンサー", 24000],
    ["ライトスポンサー", 30000],
  ];
  const match = planAmounts.find(([planName]) => text.includes(planName));
  return match ? match[1] : 0;
}

function amountFromRecord(record, config) {
  const fields = record.fields || {};
  const amountFieldNames = uniqueValues([
    ...config.amountFields,
    ...Object.keys(fields).filter((fieldName) => fieldName.includes("金額")),
  ]);

  for (const fieldName of amountFieldNames) {
    const amount = numberFromValue(fields[fieldName]);
    if (amount > 0) return amount;
  }

  return amountFromPlan(fieldValue(fields, config.returnFields));
}

function getConfig() {
  return {
    token: process.env.AIRTABLE_TOKEN,
    baseId: process.env.AIRTABLE_BASE_ID || "appeC3wuX1TgSbeIJ",
    tableIdOrName:
      process.env.AIRTABLE_TABLE_ID ||
      process.env.AIRTABLE_TABLE_NAME ||
      "tbldzMcpUicXBxhrV",
    viewIdOrName:
      process.env.AIRTABLE_VIEW_ID ||
      process.env.AIRTABLE_VIEW_NAME ||
      "viwLq1zNN8QJzVhoG",
    amountFields: uniqueValues([process.env.AIRTABLE_AMOUNT_FIELD, "支援金額", "金額"]),
    statusFields: uniqueValues([process.env.AIRTABLE_STATUS_FIELD, "申込ステータス", "ステータス"]),
    confirmedStatus: process.env.AIRTABLE_CONFIRMED_STATUS || "支援確定",
    returnFields: uniqueValues([process.env.AIRTABLE_RETURN_FIELD, "支援プラン", "リターン"]),
  };
}

async function fetchAirtableRecords(config) {
  const records = [];
  let offset;

  do {
    const url = new URL(`${AIRTABLE_API_BASE}/${config.baseId}/${encodeURIComponent(config.tableIdOrName)}`);
    url.searchParams.set("pageSize", "100");
    if (config.viewIdOrName) url.searchParams.set("view", config.viewIdOrName);
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
    const value = fieldValue(record.fields || {}, config.statusFields);
    if (!config.statusFields.length || !config.confirmedStatus) return true;
    if (Array.isArray(value)) return value.includes(config.confirmedStatus);
    return String(value || "").trim() === config.confirmedStatus;
  });

  const totalAmount = confirmed.reduce((sum, record) => {
    return sum + amountFromRecord(record, config);
  }, 0);

  const returns = {};
  for (const record of confirmed) {
    const value = fieldValue(record.fields || {}, config.returnFields) || "未分類";
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
  const required = ["token", "baseId", "tableIdOrName"].filter((key) => !config[key]);

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
