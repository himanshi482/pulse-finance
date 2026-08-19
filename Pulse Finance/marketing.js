const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');
if (menuButton && nav) menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', open);
  menuButton.innerHTML = `<i class="fa-solid fa-${open ? 'xmark' : 'bars'}"></i>`;
});

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: 0.14 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (!entry.isIntersecting) return;
  const counter = entry.target, target = Number(counter.dataset.count), suffix = target === 86 ? '%' : target === 24 ? 'h' : '+';
  const start = performance.now();
  const update = (now) => { const progress = Math.min((now - start) / 1000, 1); counter.textContent = Math.floor(target * (1 - Math.pow(1 - progress, 3))).toLocaleString() + suffix; if (progress < 1) requestAnimationFrame(update); };
  requestAnimationFrame(update); counterObserver.unobserve(counter);
}), { threshold: 0.7 });
counters.forEach((counter) => counterObserver.observe(counter));

// Monthly spending chart initialization (uses Chart.js loaded via CDN in index.html)
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('monthly-spend-chart');
  if (!canvas || typeof window.Chart === 'undefined') return;

  // Example monthly spending data (replace with live data when available)
  const labels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const data = [4200, 3800, 5200, 4600, 5000, 4800];

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spending',
        data,
        backgroundColor: '#ff7a59',
        borderRadius: 6,
        barThickness: 14
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#666' } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#666', callback: v => '₹' + v } }
      }
    }
  });
});

// Display logged-in user's name on landing and marketing pages
document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('pulse_user');
  const token = localStorage.getItem('pulse_token');
  if (userStr && token) {
    try {
      const user = JSON.parse(userStr);
      const navActions = document.querySelector('.nav-actions');
      if (navActions && user && user.fullname) {
        navActions.innerHTML = `
          <span style="font-size:14px;font-weight:700;color:var(--green, #1c563d);display:flex;align-items:center;gap:6px;">👤 ${user.fullname}</span>
          <a class="button button-small" href="./Personal-Finance-Tracker-main/index.html">Dashboard <i class="fa-solid fa-arrow-right"></i></a>
        `;
      }
    } catch (e) {}
  }
});

