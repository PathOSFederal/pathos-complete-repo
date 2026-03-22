"use strict";

const ALERT_ITEMS = [
  {
    title: "New role match: Data Analyst Intern",
    recommendation: "Apply",
    reason: "Your Python + SQL coursework is a strong match.",
  },
  {
    title: "Resume gap check for Budget Analyst",
    recommendation: "Consider",
    reason: "One requirement needs stronger examples.",
  },
  {
    title: "Heads up: Two roles expire this week",
    recommendation: "Consider",
    reason: "Deadlines are within 4 days.",
  },
  {
    title: "Long-shot role: Senior Data Scientist",
    recommendation: "Skip",
    reason: "Role expects 7+ years of experience.",
  },
];

const resolveTagClass = (value) => {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "apply") {
    return "is-apply";
  }
  if (normalized === "consider") {
    return "is-consider";
  }
  if (normalized === "skip") {
    return "is-skip";
  }
  return "";
};

const renderAlerts = () => {
  const list = document.querySelector("[data-alerts-list]");
  const count = document.querySelector("[data-alerts-count]");
  if (!list) {
    return;
  }
  list.innerHTML = "";
  ALERT_ITEMS.forEach((item) => {
    const row = document.createElement("div");
    row.className = "alerts-popover-item";
    row.setAttribute("role", "listitem");

    const title = document.createElement("div");
    title.className = "alerts-popover-item-title";
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "alerts-popover-item-meta";

    const tag = document.createElement("span");
    tag.className = `alerts-popover-item-tag ${resolveTagClass(
      item.recommendation
    )}`.trim();
    tag.textContent = item.recommendation;

    const reason = document.createElement("div");
    reason.className = "alerts-popover-item-reason";
    reason.textContent = item.reason;

    meta.appendChild(tag);
    meta.appendChild(reason);

    row.appendChild(title);
    row.appendChild(meta);

    list.appendChild(row);
  });

  if (count) {
    count.textContent = String(ALERT_ITEMS.length);
  }
};

const onReady = () => {
  renderAlerts();

  const viewAll = document.querySelector("[data-alerts-view-all]");
  if (viewAll) {
    viewAll.addEventListener("click", () => {
      if (window.alertsPopover && window.alertsPopover.viewAll) {
        window.alertsPopover.viewAll();
      }
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (window.alertsPopover && window.alertsPopover.close) {
        window.alertsPopover.close();
      }
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onReady);
} else {
  onReady();
}
