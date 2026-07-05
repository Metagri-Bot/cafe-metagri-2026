/*
 * support-analytics.js
 * カフェMetagri 支援ページ（support.html）専用の GA4 詳細ファネル計測。
 * 送信イベント（すべて window.gtag 経由）:
 *   - support_page_view      : 支援ページ表示
 *   - support_plans_view     : 支援プラン一覧（#plans）が画面に入った
 *   - plan_impression        : 各プランカードが表示された（plan_name 付き）
 *   - support_hero_cta_click : ヒーローの「支援プランを見る」クリック
 *   - support_cta_click      : 「このプランで支援する」クリック = CV（申込フォームを開いた地点）
 * ※ GA4 管理画面で support_cta_click を「キーイベント（コンバージョン）」に登録して使う。
 */
(function () {
  "use strict";

  function track(name, params) {
    var data = params || {};
    if (typeof window.gtag === "function") {
      window.gtag("event", name, data);
    } else {
      // gtag 未ロード時のフォールバック（dataLayer に積む）
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", name, data]);
    }
  }

  function planPriceOf(cta) {
    var card = cta.closest ? cta.closest(".plan-card") : null;
    if (!card) return "";
    var priceEl = card.querySelector(".plan-price");
    if (!priceEl) return "";
    // 「1,000円上限なし」の様な補足(small)を除いた金額本体を優先取得
    var clone = priceEl.cloneNode(true);
    var small = clone.querySelector("small");
    if (small) small.remove();
    return (clone.textContent || "").trim();
  }

  function init() {
    var ctas = Array.prototype.slice.call(
      document.querySelectorAll(".js-support-cta[data-plan]")
    );

    // 1) ページ表示
    track("support_page_view", {
      page_location: window.location.href,
      plans_count: ctas.length
    });

    // 2) 支援プラン一覧の到達（#plans）
    var plansSection = document.getElementById("plans");
    if (plansSection && "IntersectionObserver" in window) {
      var plansObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            track("support_plans_view", {});
            plansObserver.disconnect();
          }
        });
      }, { threshold: 0.3 });
      plansObserver.observe(plansSection);
    }

    // 3) 各プランカードの表示（plan_impression）
    if ("IntersectionObserver" in window) {
      var seen = {};
      var cardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var card = entry.target;
          var cta = card.querySelector(".js-support-cta[data-plan]");
          var plan = cta ? cta.getAttribute("data-plan") : "";
          if (plan && !seen[plan]) {
            seen[plan] = true;
            track("plan_impression", { plan_name: plan });
          }
          cardObserver.unobserve(card);
        });
      }, { threshold: 0.5 });

      ctas.forEach(function (cta) {
        var card = cta.closest ? cta.closest(".plan-card") : null;
        if (card) cardObserver.observe(card);
      });
    }

    // 4) ヒーローCTA（「支援プランを見る」= #plans への内部リンク）
    Array.prototype.slice
      .call(document.querySelectorAll('a[href="#plans"]'))
      .forEach(function (link) {
        link.addEventListener("click", function () {
          track("support_hero_cta_click", {
            link_text: (link.textContent || "").trim()
          });
        });
      });

    // 5) CV: 「このプランで支援する」クリック（申込フォームを開いた地点）
    ctas.forEach(function (cta) {
      cta.addEventListener("click", function () {
        // 受付停止中（近日開始）のボタンはCVに数えない
        if (cta.getAttribute("aria-disabled") === "true") return;
        var plan = cta.getAttribute("data-plan") || "";
        var formUrl =
          cta.getAttribute("data-form-url") || cta.getAttribute("href") || "";
        track("support_cta_click", {
          plan_name: plan,
          plan_price: planPriceOf(cta),
          form_url: formUrl,
          outbound: true
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
