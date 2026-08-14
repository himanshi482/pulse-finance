const themeLink=document.createElement('link');themeLink.rel='stylesheet';themeLink.href='../green-theme.css';document.head.appendChild(themeLink);
const key='pulse-tracker-v2';const categories={expense:['Food & dining','Transport','Shopping','Bills','Health','Entertainment','Other'],income:['Salary','Freelance','Gift','Other']};
let state=JSON.parse(localStorage.getItem(key))||{budget:0,transactions:[],budgets:{},budgetMonth:''};
const $=s=>document.querySelector(s);const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);const save=()=>localStorage.setItem(key,JSON.stringify(state));

function currentMonthKey(){return `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;}
function ensureBudgetMonth(){
  const monthKey = currentMonthKey();
  if (!state.budgetMonth) {
    state.budgetMonth = monthKey;
    save();
    return;
  }
  if (state.budgetMonth !== monthKey) {
    state.budgets = {};
    state.budgetMonth = monthKey;
    save();
  }
}

ensureBudgetMonth();
function setCategories(){const type=$('#typeInput').value;$('#categoryInput').innerHTML=categories[type].map(x=>`<option>${x}</option>`).join('')}function totals(){const income=state.transactions.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);const expense=state.transactions.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0);return{income,expense,balance:state.budget+income-expense}}
function render(){const {income,expense,balance}=totals();const used=state.budget?Math.max(0,Math.round(expense/state.budget*100)):0;$('#incomeValue').textContent=money(income);$('#expenseValue').textContent=money(expense);$('#balanceValue').textContent=money(balance);$('#usedValue').textContent=`${used}%`;$('#progressBar').style.width=`${Math.min(used,100)}%`;$('#balanceNote').textContent=state.budget?`${money(Math.abs(balance))} ${balance>=0?'remaining':'over budget'}`:'Add a budget to get started';$('#expenseNote').textContent=expense?`${money(expense)} recorded so far`:'No expenses yet';$('#budgetInput').value=state.budget||'';renderBars();renderList()}
function renderBars(){const spent=state.transactions.filter(x=>x.type==='expense');const grouped=spent.reduce((a,x)=>{a[x.category]=(a[x.category]||0)+x.amount;return a},{});const max=Math.max(...Object.values(grouped),1);const entries=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);$('#categoryBars').innerHTML=entries.length?entries.slice(0,4).map(([name,value])=>`<div class="bar-row"><div class="bar-label"><span>${name}</span><strong>${money(value)}</strong></div><div class="bar"><span style="width:${value/max*100}%"></span></div></div>`).join(''):'<div class="empty-state">Your category breakdown will appear here.</div>';if(entries.length){$('#insightTitle').textContent=`${entries[0][0]} is on top.`;$('#insightText').textContent=`You have spent ${money(entries[0][1])} in this category. Small adjustments can make a difference.`}}
function renderList(){const q=$('#searchInput').value.toLowerCase(),filter=$('#filterInput').value;const rows=state.transactions.filter(x=>(filter==='all'||x.type===filter)&&(`${x.description} ${x.category}`.toLowerCase().includes(q))).sort((a,b)=>new Date(b.date)-new Date(a.date));$('#transactionList').innerHTML=rows.length?rows.map(x=>`<article class="transaction ${x.type}"><span class="transaction-icon">${x.type==='income'?'↗':'↘'}</span><div><strong>${escapeHtml(x.description)}</strong><small>${x.category} · ${new Date(x.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</small></div><span class="transaction-amount">${x.type==='income'?'+':'-'} ${money(x.amount)}</span><button class="delete-transaction" data-id="${x.id}" aria-label="Delete transaction">×</button></article>`).join(''):'<div class="list-empty">No transactions found. Add your first record above.</div>'}
function escapeHtml(value){return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
$('#dateInput').value=new Date().toISOString().split('T')[0];setCategories();render();$('#typeInput').addEventListener('change',setCategories);$('#budgetInput').addEventListener('change',e=>{state.budget=Math.max(0,Number(e.target.value)||0);save();render();toast('Monthly budget updated')});$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();state.transactions.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),description:$('#descriptionInput').value.trim(),amount:Number($('#amountInput').value),type:$('#typeInput').value,category:$('#categoryInput').value,date:$('#dateInput').value});save();e.target.reset();$('#dateInput').value=new Date().toISOString().split('T')[0];setCategories();render();toast('Transaction added')});$('#searchInput').addEventListener('input',renderList);$('#filterInput').addEventListener('change',renderList);$('#transactionList').addEventListener('click',e=>{const id=e.target.dataset.id;if(!id)return;state.transactions=state.transactions.filter(x=>x.id!==id);save();render();toast('Transaction removed')});$('#clearButton').addEventListener('click',()=>{if(confirm('Delete your budget and all transactions?')){state={budget:0,transactions:[],budgets:{},budgetMonth:currentMonthKey()};save();render();toast('All data cleared')}});$('#exportButton').addEventListener('click',()=>{if(!state.transactions.length)return toast('Add transactions before exporting');const csv=['Date,Description,Type,Category,Amount',...state.transactions.map(x=>`${x.date},"${x.description.replace(/"/g,'""')}",${x.type},"${x.category}",${x.amount}`)].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='pulse-transactions.csv';a.click();URL.revokeObjectURL(a.href);toast('CSV export started')});

// Render upcoming bills: expenses with dates within the next 30 days
function renderUpcomingBills(){
  const today = new Date();
  today.setHours(0,0,0,0);
  const in30 = new Date(); in30.setDate(in30.getDate()+30); in30.setHours(23,59,59,999);
  const upcoming = state.transactions.filter(x => {
    if (x.type !== 'expense') return false;
    const d = new Date(x.date + 'T00:00:00');
    return d >= today && d <= in30;
  }).sort((a,b)=>new Date(a.date)-new Date(b.date));

  const container = document.getElementById('upcomingBillsList');
  if(!container) return;
  if(!upcoming.length){
    container.innerHTML = '<div class="empty-state">No upcoming bills found.</div>';
    return;
  }
  container.innerHTML = upcoming.map(x => `
    <div class="bill-row">
      <div>
        <strong>${escapeHtml(x.description)}</strong>
        <small>${x.category} · ${new Date(x.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</small>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="bill-amount">- ${money(x.amount)}</div>
        <button class="bill-pay" data-id="${x.id}" aria-label="Mark ${escapeHtml(x.description)} as paid">Mark as paid</button>
      </div>
    </div>
  `).join('');
}

// --- Budgets: render and interaction (per-category monthly budgets stored in state.budgets)
function monthRange(){
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0,0,0,0);
  const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
  end.setHours(23,59,59,999);
  return {start, end};
}

function renderBudgets(){
  const container = document.getElementById('budgetsList');
  if(!container) return;
  const {start, end} = monthRange();
  const expenseTx = state.transactions.filter(t => t.type === 'expense');
  const rows = categories.expense.map(cat => {
    const budgetVal = Number(state.budgets && state.budgets[cat] ? state.budgets[cat] : 0);
    const spent = expenseTx.filter(t => t.category === cat && new Date(t.date+'T00:00:00') >= start && new Date(t.date+'T00:00:00') <= end).reduce((s,t)=>s+t.amount,0);
    const pct = budgetVal > 0 ? Math.min(100, Math.round((spent / budgetVal) * 100)) : 0;
    return {cat, budgetVal, spent, pct};
  });

  container.innerHTML = rows.map(r => `
    <div class="budget-row">
      <div class="budget-label"><strong>${escapeHtml(r.cat)}</strong><small>${money(r.spent)} spent this month</small></div>
      <div class="budget-controls">
        <input class="budget-input" data-category="${escapeHtml(r.cat)}" type="number" min="0" value="${r.budgetVal || ''}" placeholder="Set budget">
        <div class="budget-progress"><span style="width:${r.pct}%"></span></div>
      </div>
    </div>
  `).join('');
}

function renderReports(){
  const categoryChart = document.getElementById('reportCategoryChart');
  const trendChart = document.getElementById('reportTrendChart');
  if (!categoryChart || !trendChart) return;

  const expenses = state.transactions.filter(t => t.type === 'expense');
  if (!expenses.length) {
    categoryChart.innerHTML = '<div class="empty-state">No expense data available yet.</div>';
    trendChart.innerHTML = '<div class="empty-state">Add some expenses to view your trend.</div>';
    return;
  }

  const byCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCategory = Math.max(...categoryEntries.map(([, value]) => value), 1);
  categoryChart.innerHTML = categoryEntries.map(([name, value]) => `
    <div class="report-bar-row">
      <div class="report-bar-meta"><span>${escapeHtml(name)}</span><strong>${money(value)}</strong></div>
      <div class="report-bar"><span style="width:${Math.max(12, (value / maxCategory) * 100)}%"></span></div>
    </div>
  `).join('');

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
      .filter(item => {
        const itemMonth = item.date.slice(0, 7);
        return itemMonth === monthKey;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  });

  const maxTrend = Math.max(...trendValues, 1);
  trendChart.innerHTML = `
    <div class="trend-grid">
      ${trendValues.map((value, index) => `
        <div class="trend-column">
          <span class="trend-bar" style="height:${Math.max(14, (value / maxTrend) * 100)}%"></span>
          <small>${lastSixMonths[index].label}</small>
        </div>
      `).join('')}
    </div>
  `;
}

// Budget input handling (delegated)
const budgetsContainer = document.getElementById('budgetsList');
if(budgetsContainer){
  budgetsContainer.addEventListener('input', (e)=>{
    const input = e.target.closest('.budget-input');
    if(!input) return;
    const cat = input.dataset.category;
    const val = Number(input.value) || 0;
    state.budgets = state.budgets || {};
    state.budgets[cat] = val;
    save();
    render();
  });
}

// Reset budgets
const resetBtn = document.getElementById('resetBudgets');
if(resetBtn){
  resetBtn.addEventListener('click', ()=>{
    if(!confirm('Reset all budgets?')) return;
    state.budgets = {};
    save();
    render();
    toast('Budgets reset');
  });
}

// Wire quick add header button to focus the add-transaction form
const quickBtn = document.getElementById('quickAddHeader');
if(quickBtn){
  quickBtn.addEventListener('click', ()=>{
    const desc = document.getElementById('descriptionInput');
    if(desc){
      desc.focus();
      desc.scrollIntoView({behavior:'smooth', block:'center'});
      desc.classList.add('highlight');
      setTimeout(()=>desc.classList.remove('highlight'),1200);
    }
  });
}

// Handle "Mark as paid" clicks inside upcoming bills (delegation)
const upcomingContainer = document.getElementById('upcomingBillsList');
if(upcomingContainer){
  upcomingContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.bill-pay');
    if(!btn) return;
    const id = btn.dataset.id;
    const tx = state.transactions.find(t => t.id === id);
    if(!tx) return;
    // Mark as paid by setting date to today
    const today = new Date().toISOString().split('T')[0];
    tx.date = today;
    save();
    render();
    toast('Marked as paid');
  });
}

// Ensure upcoming bills refresh when rendering the dashboard
(function(){
  const originalRender = render;
  render = function(){
    originalRender();
    try{ renderUpcomingBills(); renderBudgets(); renderReports(); }catch(e){console.error(e)}
  }
})();
render();
