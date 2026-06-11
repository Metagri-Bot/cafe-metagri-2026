(async function () {
  const root = document.querySelector("[data-crowdfunding-summary]");
  if (!root) return;

  const amount = root.querySelector("[data-total-amount]");
  const supporters = root.querySelector("[data-supporter-count]");
  const status = root.querySelector("[data-summary-status]");

  try {
    const response = await fetch("/api/crowdfunding-summary");
    const data = await response.json();

    if (amount) {
      amount.textContent = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
      }).format(data.totalAmount || 0);
    }

    if (supporters) {
      supporters.textContent = `${data.supporterCount || 0}人`;
    }

    if (status) {
      status.textContent = data.configured
        ? `Airtableと連動中・最終更新 ${new Date(data.updatedAt).toLocaleString("ja-JP")}`
        : "Airtable連携は未設定です。環境変数の設定後に自動集計へ切り替わります。";
    }
  } catch (error) {
    if (status) status.textContent = "支援状況の読み込みに失敗しました。";
  }
})();
