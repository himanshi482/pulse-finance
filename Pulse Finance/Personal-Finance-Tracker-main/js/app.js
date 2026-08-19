const themeLink = document.createElement('link');
themeLink.rel = 'stylesheet';
themeLink.href = '../green-theme.css';
document.head.appendChild(themeLink);

const categories = {
  expense: ['Food & dining', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Gift', 'Other'],
};

// Global in-memory state synchronized with MySQL API
let state = {
  budget: 0,
  transactions: [],
  budgets: {},
  user: null,
};

const $ = (s) => document.querySelector(s);
const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// API Helper with JWT Header
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('pulse_token');
  if (!token) {
    window.location.href = '../login.html';
    throw new Error('Unauthorized');
  }

  options.headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_user');
    localStorage.removeItem('isLoggedIn');
    window.location.href = '../login.html';
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API Request failed');
  }
  return data;
}

// Initialize user and load data from MySQL REST API
async function initApp() {
  const token = localStorage.getItem('pulse_token');
  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  try {
    // 1. Fetch user profile
    const profileData = await apiFetch('/api/auth/me');
    state.user = profileData.user;
    state.budget = profileData.user.overall_budget || 0;

    // Display user badge & welcome header
    const userBadge = $('#userBadge');
    if (userBadge && state.user) {
      userBadge.textContent = `👤 ${state.user.fullname}`;
    }
    const welcomeUserName = $('#welcomeUserName');
    if (welcomeUserName && state.user) {
      const firstName = state.user.fullname.split(' ')[0];
      welcomeUserName.textContent = `, ${firstName}`;
    }


    // 2. Fetch budgets
    const budgetData = await apiFetch('/api/budgets');
    state.budget = budgetData.overall_budget || 0;
    state.budgets = budgetData.budgets || {};

    // 3. Fetch transactions
    const txData = await apiFetch('/api/transactions');
    state.transactions = txData.transactions || [];

    setCategories();
    render();
  } catch (err) {
    console.error('Initialization error:', err);
    toast(err.message || 'Failed to load data');
  }
}

function currentMonthKey() {
  return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

function setCategories() {
  const typeSelect = $('#typeInput');
  const catSelect = $('#categoryInput');
  if (!typeSelect || !catSelect) return;
  const type = typeSelect.value || 'expense';
  const list = categories[type] || categories.expense;
  catSelect.innerHTML = list.map((x) => `<option value="${x}">${x}</option>`).join('');
}

function totals() {
  const income = state.transactions.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const expense = state.transactions.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
  return { income, expense, balance: state.budget + income - expense };
}

function render() {
  setCategories();
  const { income, expense, balance } = totals();
  const used = state.budget ? Math.max(0, Math.round((expense / state.budget) * 100)) : 0;

  $('#incomeValue').textContent = money(income);
  $('#expenseValue').textContent = money(expense);

  $('#balanceValue').textContent = money(balance);
  $('#usedValue').textContent = `${used}%`;
  $('#progressBar').style.width = `${Math.min(used, 100)}%`;
  $('#balanceNote').textContent = state.budget
    ? `${money(Math.abs(balance))} ${balance >= 0 ? 'remaining' : 'over budget'}`
    : 'Add a budget to get started';
  $('#expenseNote').textContent = expense ? `${money(expense)} recorded so far` : 'No expenses yet';
  $('#budgetInput').value = state.budget || '';

  updateBudgetGoalWidget(used, expense, balance);
  renderBars();
  renderList();
  renderUpcomingBills();
  renderBudgets();
  renderReports();
}

function updateBudgetGoalWidget(used, expense, balance) {
  const fill = document.getElementById('doughnutFill');
  const pctText = document.getElementById('doughnutPctText');
  const daysBadge = document.getElementById('daysUnderBudgetBadge');
  const topCatBadge = document.getElementById('topCatBadge');

  if (!fill || !pctText) return;

  const circumference = 471.24;
  const clampedPct = Math.min(Math.max(used, 0), 100);
  const offset = circumference * (1 - (clampedPct / 100));

  fill.style.strokeDashoffset = offset;
  fill.style.stroke = used > 100 ? '#d9534f' : '#1c563d';

  pctText.textContent = `${used}%`;

  // Compute days under budget
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = Math.max(1, now.getDate());
  
  let daysUnder = daysInMonth;
  if (state.budget > 0) {
    const dailyBudget = state.budget / daysInMonth;
    const avgDailySpent = expense / currentDay;
    if (avgDailySpent > dailyBudget) {
      const remBudget = Math.max(0, state.budget - expense);
      const safeDays = Math.floor(remBudget / (dailyBudget || 1));
      daysUnder = Math.min(daysInMonth, (currentDay - 1) + safeDays);
    }
  } else {
    daysUnder = 0;
  }

  if (daysBadge) {
    daysBadge.innerHTML = `
      <div class="badge-icon check">✓</div>
      <div class="badge-info">
        <strong>${daysUnder} days</strong>
        <small>under budget</small>
      </div>
    `;
  }

  // Compute top category / spending highlight
  const spentTx = state.transactions.filter((x) => x.type === 'expense');
  const catMap = spentTx.reduce((acc, x) => {
    acc[x.category] = (acc[x.category] || 0) + x.amount;
    return acc;
  }, {});

  let topCat = 'No expenses';
  let topAmt = 0;
  Object.entries(catMap).forEach(([c, amt]) => {
    if (amt > topAmt) {
      topAmt = amt;
      topCat = c;
    }
  });

  const catIcons = {
    'Food & dining': '☕',
    Transport: '🚗',
    Shopping: '🛒',
    Bills: '📄',
    Health: '💊',
    Entertainment: '🎬',
    Other: '💸',
  };

  const icon = catIcons[topCat] || '☕';
  const labelText = topCat === 'No expenses' ? 'no spending yet' : `${topCat.toLowerCase()} this month`;

  if (topCatBadge) {
    topCatBadge.innerHTML = `
      <div class="badge-icon coffee">${icon}</div>
      <div class="badge-info">
        <strong>${money(topAmt)}</strong>
        <small>${escapeHtml(labelText)}</small>
      </div>
    `;
  }
}


function renderBars() {
  const spent = state.transactions.filter((x) => x.type === 'expense');
  const grouped = spent.reduce((a, x) => {
    a[x.category] = (a[x.category] || 0) + x.amount;
    return a;
  }, {});
  const max = Math.max(...Object.values(grouped), 1);
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  $('#categoryBars').innerHTML = entries.length
    ? entries
        .slice(0, 4)
        .map(
          ([name, value]) =>
            `<div class="bar-row"><div class="bar-label"><span>${name}</span><strong>${money(
              value
            )}</strong></div><div class="bar"><span style="width:${(value / max) * 100}%"></span></div></div>`
        )
        .join('')
    : '<div class="empty-state">Your category breakdown will appear here.</div>';

  if (entries.length) {
    $('#insightTitle').textContent = `${entries[0][0]} is on top.`;
    $('#insightText').textContent = `You have spent ${money(
      entries[0][1]
    )} in this category. Small adjustments can make a difference.`;
  }
}

function renderList() {
  const q = ($('#searchInput')?.value || '').toLowerCase();
  const filter = $('#filterInput')?.value || 'all';
  const rows = state.transactions
    .filter((x) => (filter === 'all' || x.type === filter) && `${x.description} ${x.category}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const dB = b.date ? new Date(b.date.includes('T') ? b.date : b.date + 'T00:00:00').getTime() : 0;
      const dA = a.date ? new Date(a.date.includes('T') ? a.date : a.date + 'T00:00:00').getTime() : 0;
      return dB - dA;
    });

  $('#transactionList').innerHTML = rows.length
    ? rows
        .map(
          (x) =>
            `<article class="transaction ${x.type}"><span class="transaction-icon">${
              x.type === 'income' ? '↗' : '↘'
            }</span><div><strong>${escapeHtml(x.description)}</strong><small>${x.category} · ${new Date(
              (x.date || '').includes('T') ? x.date : (x.date || '') + 'T00:00:00'
            ).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}</small></div><span class="transaction-amount">${x.type === 'income' ? '+' : '-'} ${money(
              x.amount
            )}</span><button class="delete-transaction" data-id="${x.id}" aria-label="Delete transaction">×</button></article>`
        )
        .join('')
    : '<div class="list-empty">No transactions found. Add your first record above.</div>';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function toast(m) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// Initial setup
$('#dateInput').value = new Date().toISOString().split('T')[0];
setCategories();

// Event handlers
$('#typeInput').addEventListener('change', setCategories);

// Update overall budget
$('#budgetInput').addEventListener('input', (e) => {
  state.budget = Math.max(0, Number(e.target.value) || 0);
  const { expense, balance } = totals();
  const used = state.budget ? Math.max(0, Math.round((expense / state.budget) * 100)) : 0;
  $('#usedValue').textContent = `${used}%`;
  $('#progressBar').style.width = `${Math.min(used, 100)}%`;
  updateBudgetGoalWidget(used, expense, balance);
});

$('#budgetInput').addEventListener('change', async (e) => {
  const val = Math.max(0, Number(e.target.value) || 0);
  try {
    await apiFetch('/api/budgets/overall', {
      method: 'PUT',
      body: JSON.stringify({ budget: val }),
    });
    state.budget = val;
    render();
    toast('Monthly budget updated');
  } catch (err) {
    toast('Failed to update budget');
  }
});

// Add new transaction
const transactionForm = $('#transactionForm');
if (transactionForm) {
  transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descInput = $('#descriptionInput');
    const amtInput = $('#amountInput');
    const typeInput = $('#typeInput');
    const catInput = $('#categoryInput');
    const dateInput = $('#dateInput');

    const desc = descInput ? descInput.value.trim() : '';
    const amt = amtInput ? Number(amtInput.value) : NaN;
    const typeVal = typeInput ? typeInput.value : 'expense';
    const catVal = catInput ? catInput.value : 'Other';
    let dateVal = dateInput ? dateInput.value : '';
    if (!dateVal) {
      dateVal = new Date().toISOString().split('T')[0];
    }

    if (!desc || isNaN(amt) || amt <= 0) {
      toast('Please enter a valid description and positive amount.');
      return;
    }

    const newTx = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString() + Math.random().toString(36).substring(2, 7)),
      description: desc,
      amount: amt,
      type: typeVal,
      category: catVal || 'Other',
      date: dateVal,
    };

    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(newTx),
      });

      // Re-fetch fresh transactions list directly from MySQL DB
      const txData = await apiFetch('/api/transactions');
      state.transactions = txData.transactions || [];

      e.target.reset();
      const resetDateInput = $('#dateInput');
      if (resetDateInput) resetDateInput.value = new Date().toISOString().split('T')[0];
      setCategories();
      render();
      toast('Transaction added successfully!');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      toast(err.message || 'Failed to add transaction');
    }
  });
}


$('#searchInput').addEventListener('input', renderList);
$('#filterInput').addEventListener('change', renderList);

// Delete transaction
$('#transactionList').addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  try {
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    state.transactions = state.transactions.filter((x) => x.id !== id);
    render();
    toast('Transaction removed');
  } catch (err) {
    toast('Failed to delete transaction');
  }
});

// Clear all data
$('#clearButton').addEventListener('click', async () => {
  if (confirm('Delete your budget and all transactions?')) {
    try {
      await apiFetch('/api/transactions', { method: 'DELETE' });
      await apiFetch('/api/budgets/reset', { method: 'POST' });
      state.budget = 0;
      state.transactions = [];
      state.budgets = {};
      render();
      toast('All data cleared');
    } catch (err) {
      toast('Failed to clear data');
    }
  }
});

// Logout handler
const logoutBtn = $('#logoutButton');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('pulse_token');
    localStorage.removeItem('pulse_user');
    localStorage.removeItem('isLoggedIn');
    window.location.href = '../login.html';
  });
}

// Export CSV
$('#exportButton').addEventListener('click', () => {
  if (!state.transactions.length) return toast('Add transactions before exporting');
  const csv = [
    'Date,Description,Type,Category,Amount',
    ...state.transactions.map((x) => `${x.date},"${x.description.replace(/"/g, '""')}",${x.type},"${x.category}",${x.amount}`),
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'pulse-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV export started');
});

// Render upcoming bills
function renderUpcomingBills() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  in30.setHours(23, 59, 59, 999);
  const upcoming = state.transactions
    .filter((x) => {
      if (x.type !== 'expense') return false;
      const d = new Date(x.date + 'T00:00:00');
      return d >= today && d <= in30;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const container = document.getElementById('upcomingBillsList');
  if (!container) return;
  if (!upcoming.length) {
    container.innerHTML = '<div class="empty-state">No upcoming bills found.</div>';
    return;
  }
  container.innerHTML = upcoming
    .map(
      (x) => `
    <div class="bill-row">
      <div>
        <strong>${escapeHtml(x.description)}</strong>
        <small>${x.category} · ${new Date(x.date + 'T00:00:00').toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })}</small>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="bill-amount">- ${money(x.amount)}</div>
        ${
          x.is_paid
            ? `<span style="background:#dff5db;color:#1c563d;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">✓ Paid</span>`
            : `<button class="bill-pay" data-id="${x.id}" aria-label="Mark ${escapeHtml(x.description)} as paid">Mark as paid</button>`
        }
      </div>
    </div>
  `
    )
    .join('');
}

// Handle "Mark as paid" clicks inside upcoming bills
const upcomingContainer = document.getElementById('upcomingBillsList');
if (upcomingContainer) {
  upcomingContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('.bill-pay');
    if (!btn) return;
    const id = btn.dataset.id;
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;

    try {
      await apiFetch(`/api/transactions/${id}/pay`, { method: 'PUT' });
      tx.is_paid = true;
      render();
      toast(`Marked "${tx.description}" as Paid`);
    } catch (err) {
      toast('Failed to mark as paid');
    }
  });
}


function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function renderBudgets() {
  const container = document.getElementById('budgetsList');
  if (!container) return;
  const { start, end } = monthRange();
  const expenseTx = state.transactions.filter((t) => t.type === 'expense');
  const rows = categories.expense.map((cat) => {
    const budgetVal = Number(state.budgets && state.budgets[cat] ? state.budgets[cat] : 0);
    const spent = expenseTx
      .filter((t) => t.category === cat && new Date(t.date + 'T00:00:00') >= start && new Date(t.date + 'T00:00:00') <= end)
      .reduce((s, t) => s + t.amount, 0);
    const pct = budgetVal > 0 ? Math.min(100, Math.round((spent / budgetVal) * 100)) : 0;
    return { cat, budgetVal, spent, pct };
  });

  container.innerHTML = rows
    .map(
      (r) => `
    <div class="budget-row">
      <div class="budget-label"><strong>${escapeHtml(r.cat)}</strong><small>${money(r.spent)} spent this month</small></div>
      <div class="budget-controls">
        <input class="budget-input" data-category="${escapeHtml(r.cat)}" type="number" min="0" value="${
        r.budgetVal || ''
      }" placeholder="Set budget">
        <div class="budget-progress"><span style="width:${r.pct}%"></span></div>
      </div>
    </div>
  `
    )
    .join('');
}

function renderReports() {
  const categoryChart = document.getElementById('reportCategoryChart');
  const trendChart = document.getElementById('reportTrendChart');
  if (!categoryChart || !trendChart) return;

  const expenses = state.transactions.filter((t) => t.type === 'expense');
  if (!expenses.length) {
    categoryChart.innerHTML = '<div class="empty-state">No expense data available yet.</div>';
    trendChart.innerHTML = '<div class="empty-state">Add some expenses to view your trend.</div>';
    return;
  }

  const byCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const categoryEntries = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCategory = Math.max(...categoryEntries.map(([, value]) => value), 1);
  categoryChart.innerHTML = categoryEntries
    .map(
      ([name, value]) => `
    <div class="report-bar-row">
      <div class="report-bar-meta"><span>${escapeHtml(name)}</span><strong>${money(value)}</strong></div>
      <div class="report-bar"><span style="width:${Math.max(12, (value / maxCategory) * 100)}%"></span></div>
    </div>
  `
    )
    .join('');

  const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const label = date.toLocaleDateString('en-IN', { month: 'short' });
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { label, monthKey };
  });

  const trendValues = lastSixMonths.map(({ monthKey }) => {
    return expenses
      .filter((item) => {
        const itemMonth = item.date.slice(0, 7);
        return itemMonth === monthKey;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  });

  const maxTrend = Math.max(...trendValues, 1);
  trendChart.innerHTML = `
    <div class="trend-grid">
      ${trendValues
        .map(
          (value, index) => `
        <div class="trend-column">
          <span class="trend-bar" style="height:${Math.max(14, (value / maxTrend) * 100)}%"></span>
          <small>${lastSixMonths[index].label}</small>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// Category budget input handling
const budgetsContainer = document.getElementById('budgetsList');
if (budgetsContainer) {
  budgetsContainer.addEventListener('change', async (e) => {
    const input = e.target.closest('.budget-input');
    if (!input) return;
    const cat = input.dataset.category;
    const val = Number(input.value) || 0;

    try {
      await apiFetch('/api/budgets/category', {
        method: 'PUT',
        body: JSON.stringify({ category: cat, amount: val }),
      });
      state.budgets[cat] = val;
      render();
      toast(`Budget for ${cat} updated`);
    } catch (err) {
      toast('Failed to update category budget');
    }
  });
}

// Reset category budgets
const resetBtn = document.getElementById('resetBudgets');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (!confirm('Reset all category budgets?')) return;
    try {
      await apiFetch('/api/budgets/reset', { method: 'POST' });
      state.budgets = {};
      state.budget = 0;
      render();
      toast('Budgets reset');
    } catch (err) {
      toast('Failed to reset budgets');
    }
  });
}

// Render activity logs from MySQL database
async function fetchActivityLogs() {
  const container = document.getElementById('activityLogList');
  if (!container) return;

  try {
    const data = await apiFetch('/api/activity');
    const logs = data.logs || [];

    if (!logs.length) {
      container.innerHTML = '<div class="empty-state">No activity logs recorded yet.</div>';
      return;
    }

    container.innerHTML = logs
      .map(
        (log) => `
      <article class="transaction" style="border-left:3px solid var(--green, #1c563d);">
        <span class="transaction-icon">⚡</span>
        <div>
          <strong>${escapeHtml(log.action)}</strong>
          <small>${escapeHtml(log.details || '')} · ${new Date(log.created_at).toLocaleString('en-IN')}</small>
        </div>
      </article>
    `
      )
      .join('');
  } catch (err) {
    if (container) container.innerHTML = '<div class="empty-state">Failed to load activity logs.</div>';
  }
}

const refreshActivityBtn = document.getElementById('refreshActivityBtn');
if (refreshActivityBtn) {
  refreshActivityBtn.addEventListener('click', fetchActivityLogs);
}

// Start application
initApp();


