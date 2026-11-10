const DATA_KEY = "expenses.data";
const THEME_KEY = "expenses.theme";

const TREE = [
  ["Home", ["Mortgage", "Rent", "Property taxes", "HOA/Condo fees", "Home insurance premiums", "Renters insurance premiums", "Home improvement & maintenance", "Household services (cleaning & lawn care)", "Appliances", "Furniture, decor & supplies", "Home equity line credit (HELOC) payment", "Storage Unit", "General housing expenses"]],
  ["Healthcare", ["Health insurance premiums", "Medicare insurance premiums", "Medicare supplemental (Medigap) insurance premiums", "Medical out-of-pocket costs", "Dental, vision, and hearing insurance premiums", "Dental, vision, and hearing out-of-pocket costs", "Long-term care insurance premiums", "Life insurance premiums", "Disability insurance premiums"]],
  ["Bills & utilities", ["Heating, electric & gas", "Water, sewer & sanitation", "Phone, internet, cable & security", "General utility expenses"]],
  ["Food", ["Groceries", "Restaurants, convenience & coffee", "Alcoholic beverages"]],
  ["Auto & transport", ["Auto purchase, loan, or lease", "Auto insurance premiums", "Gas, fuel & charging", "Parts & auto services", "Auto registration, fees & taxes", "Parking, garages & tolls", "Taxi & rideshare", "Public transit", "Rentals", "Other commuting expenses"]],
  ["Personal care", ["Products & supplements", "Services (hair, nails, beauty)", "Spa & massage", "Gym & sports equipment", "Dry cleaning & laundry", "Hobbies", "General personal expenses", "General recreation expenses", "Miscellaneous/other"]],
  ["Family care", ["Support of children or grandchildren", "Childcare & daycare", "Children's clothing, supplies & toys", "Children's activities & lessons", "Allowance & pocket money", "Elderly care", "Alimony & child support", "General family care expenses"]],
  ["Travel & vacation", ["Flights, trains & buses", "Lodging", "Cruises", "Activities & excursions", "Travel agencies", "General travel expenses"]],
  ["Entertainment", ["Streaming & subscriptions", "Concerts, sports, events & attractions", "Movies, music, books & games", "Celebrations", "Fun money", "General entertainment expenses"]],
  ["Shopping", ["Clothing & accessories", "Electronics & software", "General merchandise", "Buy now pay later & personal loan payment"]],
  ["Charity & gifts", ["Charity", "Gifts"]],
  ["Pets", ["Food & supplies", "Grooming", "Veterinary", "Boarding & daycare"]],
  ["Business & services", ["Professional (legal, accounting & services)", "Shipping & handling", "Other insurance premiums"]],
  ["Cash & ATM", ["Checks & ATM", "Online payment service"]],
  ["Fees & charges", ["Bank & service fees", "Finance charges"]],
  ["Custom expenses", ["Custom expense 1", "Custom expense 2", "Custom expense 3", "Custom expense 4", "Custom expense 5", "Custom expense 6"], true]
];

function slug(value) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const CATEGORIES = TREE.map(([name, subs, custom]) => {
  const id = slug(name);
  return {
    id,
    name,
    subs: subs.map((subName, index) => ({
      id: id + "-" + (index + 1) + "-" + slug(subName),
      name: subName,
      custom: Boolean(custom)
    }))
  };
});

const SUB_COUNT = CATEGORIES.reduce((count, category) => count + category.subs.length, 0);
const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const catList = document.getElementById("catList");
const subList = document.getElementById("subList");
const detailTitle = document.getElementById("detailTitle");
const detailMonthly = document.getElementById("detailMonthly");
const detailAnnual = document.getElementById("detailAnnual");
const statMonthly = document.getElementById("statMonthly");
const statAnnual = document.getElementById("statAnnual");
const statEssential = document.getElementById("statEssential");
const statOther = document.getElementById("statOther");
const statFilled = document.getElementById("statFilled");
const essentialShare = document.getElementById("essentialShare");
const essentialBar = document.getElementById("essentialBar");
const themeBtn = document.getElementById("themeBtn");
const SUB_IDS = new Set(CATEGORIES.flatMap((category) => category.subs.map((sub) => sub.id)));
const CUSTOM_IDS = new Set(CATEGORIES.flatMap((category) => category.subs.filter((sub) => sub.custom).map((sub) => sub.id)));

const state = loadState();

function sanitizeAdded(raw) {
  const added = {};
  if (!raw || typeof raw !== "object") return added;
  for (const category of CATEGORIES) {
    const list = raw[category.id];
    if (!Array.isArray(list)) continue;
    const seen = new Set();
    const items = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String(item.id || "");
      if (!id.startsWith(category.id + "-x-") || seen.has(id) || SUB_IDS.has(id)) continue;
      seen.add(id);
      items.push({ id, name: String(item.name || "").trim().slice(0, 80) });
    }
    if (items.length) added[category.id] = items;
  }
  return added;
}

function loadState() {
  const fresh = { selected: CATEGORIES[0].id, amounts: {}, essential: {}, names: {}, added: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
    if (!saved || typeof saved !== "object") return fresh;
    const selected = CATEGORIES.some((category) => category.id === saved.selected)
      ? saved.selected
      : fresh.selected;
    return {
      selected,
      amounts: saved.amounts && typeof saved.amounts === "object" ? saved.amounts : {},
      essential: saved.essential && typeof saved.essential === "object" ? saved.essential : {},
      names: saved.names && typeof saved.names === "object" ? saved.names : {},
      added: sanitizeAdded(saved.added)
    };
  } catch {
    return fresh;
  }
}

function saveState() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

function budgetFile() {
  return {
    app: "expenses",
    version: 1,
    savedAt: new Date().toISOString(),
    selected: state.selected,
    amounts: state.amounts,
    essential: state.essential,
    names: state.names,
    added: state.added
  };
}

function isKnownSub(id) {
  if (SUB_IDS.has(id)) return true;
  return Object.values(state.added).some((list) => list.some((item) => item.id === id));
}

function categorySubs(category) {
  const extra = state.added[category.id] || [];
  return category.subs.concat(extra.map((item) => ({
    id: item.id,
    name: item.name && item.name.trim() ? item.name.trim() : "New subcategory",
    custom: true,
    added: true,
    draft: item.name || ""
  })));
}

function subCount() {
  return CATEGORIES.reduce((count, category) => count + categorySubs(category).length, 0);
}

function applyBudgetFile(data) {
  if (!data || data.app !== "expenses" || typeof data !== "object") {
    throw new Error("This file is not an expense budget.");
  }
  state.added = sanitizeAdded(data.added);
  const amounts = {};
  const essential = {};
  const names = {};
  if (data.amounts && typeof data.amounts === "object") {
    for (const [id, value] of Object.entries(data.amounts)) {
      if (!isKnownSub(id)) continue;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      amounts[id] = Math.min(99999999.99, Math.round(amount * 100) / 100);
    }
  }
  if (data.essential && typeof data.essential === "object") {
    for (const [id, value] of Object.entries(data.essential)) {
      if (isKnownSub(id) && value) essential[id] = true;
    }
  }
  if (data.names && typeof data.names === "object") {
    for (const [id, value] of Object.entries(data.names)) {
      if (!CUSTOM_IDS.has(id)) continue;
      const name = String(value).trim().slice(0, 80);
      if (name) names[id] = name;
    }
  }
  state.amounts = amounts;
  state.essential = essential;
  state.names = names;
  state.selected = CATEGORIES.some((category) => category.id === data.selected)
    ? data.selected
    : CATEGORIES[0].id;
  saveState();
  renderCategories();
  renderDetail();
  paintTotals();
}

function fileStamp() {
  const date = new Date();
  const part = (value) => String(value).padStart(2, "0");
  return date.getFullYear() + "-" + part(date.getMonth() + 1) + "-" + part(date.getDate());
}

function note(message) {
  subtitle.textContent = message;
  window.clearTimeout(note.timer);
  note.timer = window.setTimeout(() => {
    subtitle.textContent = view === "dashboard"
      ? "Graphical view of the full budget"
      : "Monthly budget by category and subcategory";
  }, 2400);
}

function saveLocalFile() {
  const blob = new Blob([JSON.stringify(budgetFile(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses-" + fileStamp() + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  note("Saved expenses-" + fileStamp() + ".json");
}

function openLocalFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyBudgetFile(JSON.parse(String(reader.result)));
      note("Opened " + file.name);
    } catch (error) {
      const invalid = error instanceof SyntaxError;
      note(invalid ? "That file is not an expense budget." : (error && error.message) || "Could not open that file.");
    }
  };
  reader.onerror = () => note("Could not read that file.");
  reader.readAsText(file);
}

function money(amount) {
  return moneyFormat.format(amount || 0);
}

function parseAmount(raw) {
  const cleaned = String(raw).replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const normalized = parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : parts[0];
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(99999999.99, Math.round(amount * 100) / 100);
}

function amountText(amount) {
  if (!amount) return "";
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
  return rounded.toFixed(2);
}

function categoryById(id) {
  return CATEGORIES.find((category) => category.id === id) || CATEGORIES[0];
}

function displayName(sub) {
  if (!sub.custom) return sub.name;
  const custom = state.names[sub.id];
  return custom && custom.trim() ? custom.trim() : sub.name;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function compute() {
  const byCategory = {};
  let monthly = 0;
  let essential = 0;
  let filled = 0;
  for (const category of CATEGORIES) {
    let sum = 0;
    for (const sub of categorySubs(category)) {
      const amount = Number(state.amounts[sub.id]) || 0;
      sum += amount;
      if (amount > 0) filled += 1;
      if (state.essential[sub.id]) essential += amount;
    }
    byCategory[category.id] = sum;
    monthly += sum;
  }
  return {
    monthly,
    annual: monthly * 12,
    essential,
    other: monthly - essential,
    filled,
    byCategory
  };
}

function paintTotals() {
  const totals = compute();
  statMonthly.textContent = money(totals.monthly);
  statAnnual.textContent = money(totals.annual);
  statEssential.textContent = money(totals.essential);
  statOther.textContent = money(totals.other);
  statOther.classList.toggle("discretionary", totals.other > 0);
  statFilled.textContent = totals.filled + " / " + subCount();
  const share = totals.monthly > 0 ? Math.round((totals.essential / totals.monthly) * 100) : 0;
  essentialShare.textContent = share + "%";
  essentialBar.style.width = share + "%";

  for (const category of CATEGORIES) {
    const amount = totals.byCategory[category.id] || 0;
    const node = catList.querySelector('[data-cat-amount="' + category.id + '"]');
    if (!node) continue;
    node.textContent = money(amount);
    node.classList.toggle("has-value", amount > 0);
  }

  const selected = categoryById(state.selected);
  const selectedMonthly = totals.byCategory[selected.id] || 0;
  detailMonthly.textContent = money(selectedMonthly);
  detailAnnual.textContent = money(selectedMonthly * 12) + " / yr";
  for (const sub of categorySubs(selected)) {
    const annual = (Number(state.amounts[sub.id]) || 0) * 12;
    const node = subList.querySelector('[data-annual="' + sub.id + '"]');
    if (!node) continue;
    node.textContent = annual ? money(annual) : "";
    node.classList.toggle("has-value", annual > 0);
  }
  if (view === "dashboard") renderDashboard();
}

function renderCategories() {
  catList.style.gridTemplateRows = "repeat(" + CATEGORIES.length + ", minmax(0, 1fr))";
  catList.innerHTML = CATEGORIES.map((category) => {
    const active = category.id === state.selected ? " active" : "";
    const pressed = category.id === state.selected ? "true" : "false";
    return (
      '<button type="button" class="cat' + active + '" data-cat="' + category.id + '" aria-pressed="' + pressed + '">' +
        '<span class="cat-name">' + escapeHtml(category.name) + "</span>" +
        '<span class="cat-amt" data-cat-amount="' + category.id + '">$0</span>' +
      "</button>"
    );
  }).join("");
}

function renderDetail() {
  const category = categoryById(state.selected);
  detailTitle.textContent = category.name;
  subList.innerHTML = categorySubs(category).map((sub) => {
    const amount = Number(state.amounts[sub.id]) || 0;
    const essential = Boolean(state.essential[sub.id]);
    const name = displayName(sub);
    const nameCell = sub.added
      ? '<div class="added-name"><input class="input name-input" data-added-name="' + sub.id + '" value="' + escapeHtml(sub.draft) + '" placeholder="New subcategory" aria-label="Subcategory name" maxlength="80" />' +
          '<button type="button" class="sub-remove" data-remove="' + sub.id + '" title="Remove subcategory" aria-label="Remove ' + escapeHtml(name) + '">×</button></div>'
      : sub.custom
      ? '<input class="input name-input" data-name="' + sub.id + '" value="' + escapeHtml(state.names[sub.id] || "") + '" placeholder="' + escapeHtml(sub.name) + '" aria-label="Custom subcategory name" maxlength="80" />'
      : '<div class="sub-name" title="' + escapeHtml(sub.name) + '">' + escapeHtml(sub.name) + "</div>";
    return (
      '<article class="sub' + (essential ? " is-essential" : "") + '">' +
        nameCell +
        '<div class="sub-controls">' +
          '<label class="money"><span aria-hidden="true">$</span>' +
            '<input class="input" data-amount="' + sub.id + '" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="' + escapeHtml(name) + ' monthly amount" value="' + amountText(amount) + '" />' +
          "</label>" +
          '<span class="annual' + (amount ? " has-value" : "") + '" data-annual="' + sub.id + '" title="Annual">' + (amount ? money(amount * 12) : "") + "</span>" +
          '<label class="ess-label">Ess' +
            '<input class="ess" type="checkbox" data-essential="' + sub.id + '"' + (essential ? " checked" : "") + ' aria-label="Essential: ' + escapeHtml(name) + '" />' +
          "</label>" +
        "</div>" +
      "</article>"
    );
  }).join("");
}

function selectCategory(id) {
  if (!CATEGORIES.some((category) => category.id === id) || id === state.selected) return;
  state.selected = id;
  saveState();
  for (const button of catList.querySelectorAll(".cat")) {
    const active = button.dataset.cat === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  renderDetail();
  paintTotals();
}

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  const label = next === "light" ? "Switch to dark mode" : "Switch to light mode";
  themeBtn.title = label;
  themeBtn.setAttribute("aria-label", label);
  themeBtn.setAttribute("aria-pressed", next === "light" ? "true" : "false");
  if (view === "dashboard") renderDashboard();
}

const PALETTE = ["#3b9eff", "#3dd68c", "#ffb454", "#8b7dff", "#f07178", "#5ec8d8", "#e08ad4", "#9ccc65", "#ff8a65", "#7e9cff", "#4db6ac", "#ffd54f", "#ba68c8", "#90a4ae", "#ef9a9a", "#81c784"];
const budgetView = document.getElementById("budgetView");
const dashView = document.getElementById("dashView");
const dashDonut = document.getElementById("dashDonut");
const dashSplit = document.getElementById("dashSplit");
const dashBars = document.getElementById("dashBars");
const printReport = document.getElementById("printReport");
const printBtn = document.getElementById("printBtn");
const budgetTab = document.getElementById("budgetTab");
const dashTab = document.getElementById("dashTab");
const subtitle = document.getElementById("subtitle");
let view = "budget";

function polar(cx, cy, radius, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function arcPath(cx, cy, radius, start, end) {
  const sweep = (end - start + 360) % 360;
  const [sx, sy] = polar(cx, cy, radius, start);
  const [ex, ey] = polar(cx, cy, radius, end);
  const large = sweep > 180 ? 1 : 0;
  return "M " + sx.toFixed(2) + " " + sy.toFixed(2) + " A " + radius + " " + radius + " 0 " + large + " 1 " + ex.toFixed(2) + " " + ey.toFixed(2);
}

function breakdown() {
  return CATEGORIES.map((category, index) => {
    let monthly = 0;
    let essential = 0;
    const lines = [];
    for (const sub of categorySubs(category)) {
      const amount = Number(state.amounts[sub.id]) || 0;
      if (amount <= 0) continue;
      const isEssential = Boolean(state.essential[sub.id]);
      monthly += amount;
      if (isEssential) essential += amount;
      lines.push({ name: displayName(sub), amount, essential: isEssential });
    }
    return {
      id: category.id,
      name: category.name,
      color: PALETTE[index % PALETTE.length],
      monthly,
      essential,
      annual: monthly * 12,
      lines
    };
  });
}

function renderDashboard() {
  const rows = breakdown();
  const totals = compute();
  const active = rows.filter((row) => row.monthly > 0);
  const max = active.reduce((peak, row) => Math.max(peak, row.monthly), 0);
  const track = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#2a3544";
  let angle = -90;
  const slices = active.map((row) => {
    const sweep = totals.monthly ? (row.monthly / totals.monthly) * 360 : 0;
    let path = "";
    if (sweep >= 359.9) {
      path = '<circle cx="58" cy="58" r="34" fill="none" stroke="' + row.color + '" stroke-width="14" />';
    } else if (sweep > 0.4) {
      path = '<path d="' + arcPath(58, 58, 34, angle, angle + sweep - 0.4) + '" fill="none" stroke="' + row.color + '" stroke-width="14" />';
    }
    angle += sweep;
    return path;
  }).join("");
  const ring = active.length
    ? slices
    : '<circle cx="58" cy="58" r="34" fill="none" stroke="' + track + '" stroke-width="14" />';
  dashDonut.innerHTML =
    '<svg viewBox="0 0 116 116" role="img" aria-label="Share of monthly expenses by category">' + ring + "</svg>" +
    '<div class="donut-label"><strong>' + money(totals.monthly) + "</strong><span>" + (active.length ? "monthly" : "no amounts") + "</span></div>";

  const essentialPct = totals.monthly ? Math.round((totals.essential / totals.monthly) * 100) : 0;
  const otherPct = totals.monthly ? 100 - essentialPct : 0;
  dashSplit.innerHTML =
    '<div class="split-row"><span>Essential</span><strong class="ok">' + money(totals.essential) + "</strong></div>" +
    '<div class="split-track" aria-hidden="true">' +
      '<i style="width:' + essentialPct + '%;background:var(--green)"></i>' +
      '<i style="width:' + otherPct + '%;background:var(--yellow)"></i>' +
    "</div>" +
    '<div class="split-row"><span>Discretionary</span><strong class="discretionary">' + money(totals.other) + "</strong></div>";

  dashBars.style.gridTemplateRows = "repeat(" + rows.length + ", minmax(0, 1fr))";
  dashBars.innerHTML = rows.map((row) => {
    const width = max > 0 ? Math.max(row.monthly > 0 ? 2 : 0, (row.monthly / max) * 100) : 0;
    const share = totals.monthly ? Math.round((row.monthly / totals.monthly) * 100) : 0;
    return (
      '<div class="bar-row' + (row.monthly > 0 ? "" : " is-empty") + '">' +
        '<span class="bar-swatch" style="background:' + row.color + '"></span>' +
        '<span class="bar-name" title="' + escapeHtml(row.name) + '">' + escapeHtml(row.name) + "</span>" +
        '<span class="bar-track"><span class="bar-fill" style="width:' + width.toFixed(1) + "%;background:" + row.color + '"></span></span>' +
        '<span class="bar-amt">' + money(row.monthly) + "</span>" +
        '<span class="bar-pct">' + share + "%</span>" +
      "</div>"
    );
  }).join("");
}

function renderPrintReport() {
  const rows = breakdown();
  const totals = compute();
  const dated = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const summary = rows.map((row) => {
    const share = totals.monthly ? Math.round((row.monthly / totals.monthly) * 100) : 0;
    return "<tr><td>" + escapeHtml(row.name) + "</td><td class=\"num\">" + money(row.monthly) + "</td><td class=\"num\">" + money(row.annual) + "</td><td class=\"num\">" + money(row.essential) + "</td><td class=\"num\">" + share + "%</td></tr>";
  }).join("");
  const lines = rows.flatMap((row) => row.lines.map((line) =>
    "<tr><td>" + escapeHtml(row.name) + "</td><td>" + escapeHtml(line.name) + "</td><td>" + (line.essential ? "Yes" : "") + "</td><td class=\"num\">" + money(line.amount) + "</td><td class=\"num\">" + money(line.amount * 12) + "</td></tr>"
  )).join("");
  printReport.innerHTML =
    "<h2>Expense report</h2>" +
    "<p>" + escapeHtml(dated) + ". Monthly " + money(totals.monthly) + " · Annual " + money(totals.annual) + " · Essential " + money(totals.essential) + " · Discretionary " + money(totals.other) + ".</p>" +
    "<h2>Categories</h2>" +
    "<table class=\"print-table\"><thead><tr><th>Category</th><th class=\"num\">Monthly</th><th class=\"num\">Annual</th><th class=\"num\">Essential</th><th class=\"num\">Share</th></tr></thead><tbody>" +
    summary +
    "</tbody><tfoot><tr><td>Total</td><td class=\"num\">" + money(totals.monthly) + "</td><td class=\"num\">" + money(totals.annual) + "</td><td class=\"num\">" + money(totals.essential) + "</td><td class=\"num\">100%</td></tr></tfoot></table>" +
    "<h2>Line items</h2>" +
    (lines
      ? "<table class=\"print-table\"><thead><tr><th>Category</th><th>Subcategory</th><th>Essential</th><th class=\"num\">Monthly</th><th class=\"num\">Annual</th></tr></thead><tbody>" + lines + "</tbody></table>"
      : "<p>No amounts entered.</p>");
}

function showView(next) {
  window.clearTimeout(note.timer);
  view = next === "dashboard" ? "dashboard" : "budget";
  const dashboard = view === "dashboard";
  budgetView.hidden = dashboard;
  dashView.hidden = !dashboard;
  printBtn.hidden = !dashboard;
  budgetTab.classList.toggle("active", !dashboard);
  dashTab.classList.toggle("active", dashboard);
  budgetTab.setAttribute("aria-selected", dashboard ? "false" : "true");
  dashTab.setAttribute("aria-selected", dashboard ? "true" : "false");
  subtitle.textContent = dashboard
    ? "Graphical view of the full budget"
    : "Monthly budget by category and subcategory";
  if (dashboard) renderDashboard();
}

catList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cat]");
  if (button) selectCategory(button.dataset.cat);
});

subList.addEventListener("input", (event) => {
  const target = event.target;
  if (target.dataset.amount) {
    state.amounts[target.dataset.amount] = parseAmount(target.value);
    saveState();
    paintTotals();
    return;
  }
  if (target.dataset.addedName || target.dataset.name) {
    if (target.dataset.addedName) {
      const list = state.added[state.selected] || [];
      const item = list.find((entry) => entry.id === target.dataset.addedName);
      if (item) item.name = target.value.slice(0, 80);
    } else {
      state.names[target.dataset.name] = target.value;
    }
    const box = target.closest(".sub").querySelector(".ess");
    const label = target.value.trim() || target.placeholder;
    if (box) box.setAttribute("aria-label", "Essential: " + label);
    const amount = target.closest(".sub").querySelector("[data-amount]");
    if (amount) amount.setAttribute("aria-label", label + " monthly amount");
    saveState();
    return;
  }
  if (target.dataset.essential) {
    state.essential[target.dataset.essential] = target.checked;
    target.closest(".sub").classList.toggle("is-essential", target.checked);
    saveState();
    paintTotals();
  }
});

subList.addEventListener("focusout", (event) => {
  const target = event.target;
  if (!target.dataset || !target.dataset.amount) return;
  target.value = amountText(Number(state.amounts[target.dataset.amount]) || 0);
});

document.getElementById("addSubBtn").addEventListener("click", () => {
  const category = categoryById(state.selected);
  if (!state.added[category.id]) state.added[category.id] = [];
  const id = category.id + "-x-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  state.added[category.id].push({ id, name: "" });
  saveState();
  renderDetail();
  paintTotals();
  const input = subList.querySelector('[data-added-name="' + id + '"]');
  if (input) {
    input.focus();
    input.scrollIntoView({ block: "nearest" });
  }
});

subList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  const id = button.dataset.remove;
  const list = state.added[state.selected] || [];
  if (!list.some((item) => item.id === id)) return;
  if ((Number(state.amounts[id]) || 0) > 0 && !window.confirm("Remove this subcategory and its amount?")) return;
  state.added[state.selected] = list.filter((item) => item.id !== id);
  delete state.amounts[id];
  delete state.essential[id];
  saveState();
  renderDetail();
  paintTotals();
});

document.getElementById("clearCatBtn").addEventListener("click", () => {
  const category = categoryById(state.selected);
  const hasValue = categorySubs(category).some((sub) => state.amounts[sub.id] || state.essential[sub.id]);
  if (!hasValue) return;
  if (!window.confirm("Clear every amount in " + category.name + "?")) return;
  for (const sub of categorySubs(category)) {
    delete state.amounts[sub.id];
    delete state.essential[sub.id];
  }
  saveState();
  renderDetail();
  paintTotals();
});

document.getElementById("clearAllBtn").addEventListener("click", () => {
  const hasData = Object.values(state.amounts).some((amount) => amount > 0)
    || Object.values(state.essential).some(Boolean)
    || Object.values(state.names).some((name) => String(name).trim())
    || Object.values(state.added).some((list) => list.length);
  if (!hasData) return;
  if (!window.confirm("Clear every category, amount, and essential mark?")) return;
  state.amounts = {};
  state.essential = {};
  state.names = {};
  state.added = {};
  saveState();
  renderDetail();
  paintTotals();
});

themeBtn.addEventListener("click", () => {
  applyTheme(currentTheme() === "light" ? "dark" : "light");
});

document.getElementById("saveBtn").addEventListener("click", saveLocalFile);
document.getElementById("openBtn").addEventListener("click", () => {
  document.getElementById("openFile").click();
});
document.getElementById("openFile").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (file) openLocalFile(file);
});

budgetTab.addEventListener("click", () => showView("budget"));
dashTab.addEventListener("click", () => showView("dashboard"));
printBtn.addEventListener("click", () => {
  renderDashboard();
  renderPrintReport();
  window.print();
});
window.addEventListener("beforeprint", () => {
  renderDashboard();
  renderPrintReport();
});

applyTheme(currentTheme());
renderCategories();
renderDetail();
paintTotals();
