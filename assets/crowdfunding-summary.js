(async function () {
  const root = document.querySelector("[data-crowdfunding-summary]");
  const supportFormUrl = document.querySelector("[data-support-form-url]")?.getAttribute("data-support-form-url") || "";

  document.querySelectorAll(".js-support-cta[data-plan]").forEach((button) => {
    const buttonFormUrl = button.getAttribute("data-form-url") || "";
    if (buttonFormUrl) {
      button.href = buttonFormUrl;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      return;
    }

    if (supportFormUrl) {
      const url = new URL(supportFormUrl, window.location.href);
      url.searchParams.set("prefill_プラン", button.getAttribute("data-plan"));
      button.href = url.toString();
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      return;
    }

    button.textContent = "支援受付は近日開始します";
    button.classList.add("cta-disabled");
    button.setAttribute("aria-disabled", "true");
    button.removeAttribute("href");
  });

  if (!root) return;

  const amount = root.querySelector("[data-total-amount]");
  const supporters = root.querySelector("[data-supporter-count]");
  const status = root.querySelector("[data-summary-status]");
  const progressFill = root.querySelector("[data-progress-fill]");
  const progressPercent = root.querySelector("[data-progress-percent]");
  const progressTrack = root.querySelector(".progress-track");
  const goalAmount = Number(root.getAttribute("data-goal-amount")) || 0;

  function updateProgress(data) {
    if (!goalAmount) return;
    const percent = Math.min(100, Math.round(((data.totalAmount || 0) / goalAmount) * 100));
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(percent));
  }

  function updateReturnSlots(data) {
    const breakdown = data.returnBreakdown || {};
    document.querySelectorAll("[data-return-name]").forEach((element) => {
      const name = element.getAttribute("data-return-name");
      const capacity = Number(element.getAttribute("data-capacity")) || 0;
      if (!capacity) {
        element.textContent = "";
        return;
      }

      const used = breakdown[name] || 0;
      const remaining = Math.max(0, capacity - used);
      element.innerHTML = remaining > 0
        ? `残り <strong>${remaining}名</strong>`
        : "<strong>満枠御礼</strong>";
    });
  }

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

    updateProgress(data);
    updateReturnSlots(data);
  } catch (error) {
    if (status) status.textContent = "支援状況の読み込みに失敗しました。";
    document.querySelectorAll("[data-return-name]").forEach((element) => {
      element.textContent = "";
    });
  }
})();
