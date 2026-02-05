const STORAGE_KEY = "expenseflow_expenses_v1";
const BUDGET_KEY = "expenseflow_budget_v1";

function loadExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultExpenses();
  try {
    const arr = JSON.parse(raw);
    return arr.map(e => ({ ...e, amount: Number(e.amount) }));
  } catch {
    return defaultExpenses();
  }
}

function saveExpenses(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadBudget() {
  const raw = localStorage.getItem(BUDGET_KEY);
  if (!raw) return 10000;
  return Number(raw);
}

function saveBudget(value) {
  localStorage.setItem(BUDGET_KEY, String(value));
}

function defaultExpenses() {
  return [
    { title: "Fruits", category: "Food & Dining", date: "2026-01-24", amount: 200, description: "12 bananas and 4 apples" },
    { title: "Biryani", category: "Food & Dining", date: "2026-01-24", amount: 190, description: "1 single pack" },
    { title: "Netflix", category: "Subscriptions", date: "2026-01-23", amount: 149, description: "1 month plan" },
    { title: "Dolo 650", category: "Health", date: "2026-01-23", amount: 69, description: "" },
    { title: "Rapido", category: "Transportation", date: "2026-01-23", amount: 140, description: "To college" },
    { title: "Bike", category: "Travel", date: "2026-01-22", amount: 120, description: "Taxi" },
    { title: "Shirts", category: "Shopping", date: "2026-01-21", amount: 1269, description: "2 jackets" },
    { title: "Vegitable", category: "Food & Dining", date: "2026-01-20", amount: 250, description: "1kg tomato, 1kg potato" },
    { title: "Milk", category: "Food & Dining", date: "2026-01-20", amount: 50, description: "" },
    { title: "Movie", category: "Entertainment", date: "2026-01-15", amount: 849, description: "3 tickets" },
    { title: "Car toys", category: "Gifts & Donations", date: "2026-01-14", amount: 450, description: "" }
  ];
}

function formatDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n) {
  if (!Number.isFinite(n)) n = 0;
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysAgo(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const diff = (today - d) / (1000 * 60 * 60 * 24);
  return diff;
}

let expenses = loadExpenses();
let currentPeriod = 7;
let budget = loadBudget();

let categoryChart, dailyChart, monthlyChart, predictionChart;

function filterByPeriod(list, period) {
  if (period === "all") return list;
  const n = Number(period);
  return list.filter(e => daysAgo(e.date) <= n);
}

function filterThisMonth(list) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return list.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

function createRow(e, index) {
  const row = document.createElement("div");
  row.className = "table-row";
  row.dataset.index = index;
  row.innerHTML = `
    <div>${e.title}</div>
    <div>${e.category}</div>
    <div>${formatDate(e.date)}</div>
    <div>${formatMoney(e.amount)}</div>
    <div><button class="delete-btn">Delete</button></div>
  `;
  
  const deleteBtn = row.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this expense?')) {
      expenses.splice(index, 1);
      saveExpenses(expenses);
      renderAll();
    }
  });
  
  return row;
}

function groupByCategory(list) {
  const map = {};
  list.forEach(e => {
    map[e.category] = (map[e.category] || 0) + e.amount;
  });
  return map;
}

function renderOverview() {
  const periodList = filterByPeriod(expenses, currentPeriod);
  const recentBody = document.getElementById("recentExpensesBody");
  recentBody.innerHTML = "";
  const sorted = [...periodList].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.slice(0, 5).forEach((e, i) => {
    recentBody.appendChild(createRow(e, expenses.indexOf(e)));
  });

  const total = periodList.reduce((sum, e) => sum + e.amount, 0);
  const monthList = filterThisMonth(expenses);
  const monthTotal = monthList.reduce((s, e) => s + e.amount, 0);
  const avg = periodList.length ? total / periodList.length : 0;
  const categories = new Set(periodList.map(e => e.category));

  document.getElementById("totalAmount").textContent = formatMoney(total);
  document.getElementById("totalTransactions").textContent = periodList.length;
  document.getElementById("avgAmount").textContent = formatMoney(avg);
  document.getElementById("monthAmount").textContent = formatMoney(monthTotal);
  document.getElementById("categoriesCount").textContent = categories.size;

  const label = document.getElementById("summaryPeriodLabel");
  if (currentPeriod === "all") label.textContent = "All Time Total";
  else if (currentPeriod === 7) label.textContent = "Last 7 Days Total";
  else if (currentPeriod === 30) label.textContent = "Last 30 Days Total";
  else label.textContent = `Last ${currentPeriod} Days Total`;

  renderCategoryChart(periodList);
}

function renderCategoryChart(list) {
  const grouped = groupByCategory(list);
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  const ctx = document.getElementById("categoryChartCanvas").getContext("2d");
  const currentType = document.querySelector('.chip.small.active')?.dataset.chartType || "pie";

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: currentType === "bar" ? "bar" : "pie",
    data: {
      labels,
      datasets: [{
        label: "Spending",
        data,
        backgroundColor: ["#4f46e5","#22c55e","#f97316","#ec4899","#06b6d4","#a855f7","#facc15"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: currentType === "bar" ? {
        x: { grid: { display: false } },
        y: { grid: { color: "#e5e7eb" }, ticks: { callback: v => "₹" + v } }
      } : {}
    }
  });
}

function renderDaily() {
  const list = filterByPeriod(expenses, 30);
  const byDate = {};
  list.forEach(e => {
    byDate[e.date] = (byDate[e.date] || 0) + e.amount;
  });

  const entries = Object.entries(byDate).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const totals = entries.map(e => e[1]);
  const dates = entries.map(e => formatDate(e[0]));

  const periodTotal = totals.reduce((s, v) => s + v, 0);
  const activeDays = totals.length;
  const dailyAvg = activeDays ? periodTotal / activeDays : 0;

  let highestAmount = 0, highestDate = null;
  entries.forEach(([d, amount]) => {
    if (amount > highestAmount) {
      highestAmount = amount;
      highestDate = d;
    }
  });

  document.getElementById("dailyPeriodTotal").textContent = formatMoney(periodTotal);
  document.getElementById("dailyRangeLabel").textContent = "Last 30 days";
  document.getElementById("dailyAverage").textContent = formatMoney(dailyAvg);
  document.getElementById("dailyActiveDays").textContent = activeDays + " active days";
  document.getElementById("highestDayAmount").textContent = formatMoney(highestAmount);
  document.getElementById("highestDayLabel").textContent = highestDate ? formatDate(highestDate) : "–";

  const ctx = document.getElementById("dailyChartCanvas").getContext("2d");
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Daily Spending",
        data: totals,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.15)",
        tension: 0.4,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#e5e7eb" }, ticks: { callback: v => "₹" + v } }
      }
    }
  });
}

function renderMonthly() {
  const now = new Date();
  const year = now.getFullYear();
  const yearList = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year;
  });
  const yearTotal = yearList.reduce((s, e) => s + e.amount, 0);

  const byMonth = {};
  yearList.forEach(e => {
    const d = new Date(e.date);
    const m = d.getMonth();
    byMonth[m] = (byMonth[m] || 0) + e.amount;
  });

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const labels = [];
  const values = [];
  for (let i = 0; i < 12; i++) {
    labels.push(months[i]);
    values.push(byMonth[i] || 0);
  }

  const monthsCount = Object.keys(byMonth).length || 1;
  const monthAvg = yearTotal / monthsCount;
  const thisMonthList = filterThisMonth(expenses);
  const thisMonthTotal = thisMonthList.reduce((s, e) => s + e.amount, 0);

  document.getElementById("yearTotal").textContent = formatMoney(yearTotal);
  document.getElementById("monthAverage").textContent = formatMoney(monthAvg);
  document.getElementById("thisMonthTotal").textContent = formatMoney(thisMonthTotal);

  const ctx = document.getElementById("monthlyChartCanvas").getContext("2d");
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Monthly Spending",
        data: values,
        backgroundColor: "#6366f1"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#e5e7eb" }, ticks: { callback: v => "₹" + v } }
      }
    }
  });
}

function renderBudget() {
  const thisMonthList = filterThisMonth(expenses);
  const spent = thisMonthList.reduce((s, e) => s + e.amount, 0);
  const pct = Math.min(100, (spent / budget) * 100 || 0);

  document.getElementById("budgetTotal").textContent = formatMoney(budget);
  document.getElementById("budgetMeta").textContent = `${formatMoney(spent)} spent • ${pct >= 100 ? "Over budget" : "On track"}`;
  document.getElementById("budgetProgress").style.width = pct + "%";
}

function renderPredictions() {
  const last90 = filterByPeriod(expenses, 90);
  const total90 = last90.reduce((s, e) => s + e.amount, 0);
  const monthlyApprox = total90 / 3;
  const dailyApprox = total90 / 90;

  document.getElementById("nextMonthPredicted").textContent = formatMoney(monthlyApprox);
  document.getElementById("thisMonthProjected").textContent = formatMoney(monthlyApprox);
  document.getElementById("predictionDailyAverage").textContent = formatMoney(dailyApprox);

  const byMonth = {};
  last90.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonth[key] = (byMonth[key] || 0) + e.amount;
  });
  const entries = Object.entries(byMonth).sort();
  const labels = entries.map(([k]) => k);
  const values = entries.map(([_, v]) => v);

  const ctx = document.getElementById("predictionChartCanvas").getContext("2d");
  if (predictionChart) predictionChart.destroy();
  predictionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Spending Trend",
        data: values,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.15)",
        tension: 0.4,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#e5e7eb" }, ticks: { callback: v => "₹" + v } }
      }
    }
  });

  const chartDiv = document.getElementById("categoryPredictions");
  chartDiv.innerHTML = "";
  const catTotals = groupByCategory(last90);
  Object.entries(catTotals).forEach(([cat, total]) => {
    const avg = total / 3;
    const row = document.createElement("div");
    row.className = "prediction-row";
    row.innerHTML = `<span>${cat}</span><span>Avg: ${formatMoney(avg)} / month • Next month: ~${formatMoney(avg)}</span>`;
    chartDiv.appendChild(row);
  });
}

function renderAllExpenses(containerId, searchValue, categoryValue) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const term = (searchValue || "").toLowerCase();
  const cat = categoryValue || "";

  const filtered = expenses
    .filter(e => {
      const text = (e.title + " " + (e.description || "")).toLowerCase();
      const matchesSearch = !term || text.includes(term);
      const matchesCat = !cat || e.category === cat;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach((e, i) => {
    container.appendChild(createRow(e, expenses.indexOf(e)));
  });
}

document.querySelectorAll(".chip-group .chip[data-period]").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip-group .chip[data-period]").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentPeriod = chip.dataset.period === "all" ? "all" : Number(chip.dataset.period);
    renderOverview();
  });
});

document.querySelectorAll(".chip.small").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip.small").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderOverview();
  });
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const id = "tab-" + tab.dataset.tab;
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  });
});

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const mainView = btn.dataset.main;
    const mainTitle = document.getElementById("mainTitle");
    const tabsSection = document.getElementById("tabsSection");
    const summaryCards = document.getElementById("summaryCards");
    const filters = document.getElementById("periodFilters");
    const dashboardTabs = document.querySelectorAll(".tab-content");
    const mainAll = document.getElementById("main-all-expenses");

    if (mainView === "dashboard") {
      mainTitle.textContent = "Dashboard";
      tabsSection.style.display = "block";
      summaryCards.style.display = "flex";
      filters.style.display = "block";
      mainAll.style.display = "none";
    } else {
      mainTitle.textContent = "All Expenses";
      tabsSection.style.display = "none";
      summaryCards.style.display = "none";
      filters.style.display = "none";
      dashboardTabs.forEach(t => t.classList.remove("active"));
      mainAll.style.display = "block";
      renderAllExpenses("mainAllExpensesBody", document.getElementById("mainSearchInput").value, document.getElementById("mainCategoryFilter").value);
    }
  });
});

document.getElementById("addExpenseBtn").addEventListener("click", () => showModal("expenseModal"));
document.getElementById("setBudgetBtn").addEventListener("click", () => {
  document.getElementById("budgetInput").value = budget;
  showModal("budgetModal");
});
document.getElementById("exportBtn").addEventListener("click", () => showModal("exportModal"));

function showModal(id) { document.getElementById(id).classList.add("show"); }
function hideModal(id) { document.getElementById(id).classList.remove("show"); }

document.querySelectorAll(".close-btn, [data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.close;
    if (id) hideModal(id);
  });
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) backdrop.classList.remove("show");
  });
});

document.getElementById("expenseForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("titleInput").value.trim();
  const amount = Number(document.getElementById("amountInput").value);
  const date = document.getElementById("dateInput").value;
  const category = document.getElementById("categoryInput").value;
  const description = document.getElementById("descriptionInput").value.trim();

  if (!title || !amount || !date || !category) return;

  expenses.push({ title, amount, date, category, description });
  saveExpenses(expenses);
  document.getElementById("expenseForm").reset();
  hideModal("expenseModal");
  renderAll();
});

document.getElementById("budgetForm").addEventListener("submit", e => {
  e.preventDefault();
  const value = Number(document.getElementById("budgetInput").value);
  if (!value || value <= 0) return;
  budget = value;
  saveBudget(budget);
  hideModal("budgetModal");
  renderBudget();
});

document.getElementById("searchInput").addEventListener("input", () => {
  renderAllExpenses("allExpensesBody", document.getElementById("searchInput").value, document.getElementById("categoryFilter").value);
});
document.getElementById("categoryFilter").addEventListener("change", () => {
  renderAllExpenses("allExpensesBody", document.getElementById("searchInput").value, document.getElementById("categoryFilter").value);
});

document.getElementById("mainSearchInput").addEventListener("input", () => {
  renderAllExpenses("mainAllExpensesBody", document.getElementById("mainSearchInput").value, document.getElementById("mainCategoryFilter").value);
});
document.getElementById("mainCategoryFilter").addEventListener("change", () => {
  renderAllExpenses("mainAllExpensesBody", document.getElementById("mainSearchInput").value, document.getElementById("mainCategoryFilter").value);
});

document.getElementById("downloadCsvBtn").addEventListener("click", () => {
  const period = document.getElementById("exportPeriod").value;
  let list;
  if (period === "thisMonth") list = filterThisMonth(expenses);
  else if (period === "all") list = expenses;
  else list = filterByPeriod(expenses, Number(period));
  const csv = generateCsv(list);
  downloadCsv(csv, "expense-report.csv");
});

function generateCsv(list) {
  const header = ["Title", "Category", "Date", "Amount", "Description"];
  const rows = list.map(e => [e.title, e.category, e.date, e.amount, e.description || ""]);
  const data = [header, ...rows]
    .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return data;
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  hideModal("exportModal");
}

function renderAll() {
  renderOverview();
  renderDaily();
  renderMonthly();
  renderBudget();
  renderPredictions();
  renderAllExpenses("allExpensesBody", document.getElementById("searchInput").value, document.getElementById("categoryFilter").value);
  renderAllExpenses("mainAllExpensesBody", document.getElementById("mainSearchInput").value, document.getElementById("mainCategoryFilter").value);
}

renderAll();
