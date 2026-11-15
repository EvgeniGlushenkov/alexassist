const formatNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const formatChange = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

function formatYearChange(value) {
  return formatChange.format(value).replace('-', '−') + '%';
}

const chart = document.querySelector('#market-chart');
const marketSource = document.querySelector('#market-source');
const metricButtons = [...document.querySelectorAll('[data-metric]')];
const periods = [...document.querySelectorAll('#market-table tbody tr')].map((row) => ({
  month: row.dataset.month,
  short: row.dataset.short,
  volume: Number(row.dataset.volume),
  change: Number(row.dataset.change),
  source: row.querySelector('a').href,
}));

let activeMetric = 'volume';
let activePeriod = periods.length - 1;

const points = periods.map((period, index) => {
  const button = document.createElement('button');
  button.className = 'chart-point';
  button.type = 'button';

  const column = document.createElement('span');
  column.className = 'chart-column';
  column.setAttribute('aria-hidden', 'true');
  const bar = document.createElement('span');
  bar.className = 'chart-bar';
  column.append(bar);

  const month = document.createElement('span');
  month.className = 'chart-month';
  month.textContent = period.short;
  month.setAttribute('aria-hidden', 'true');
  button.append(column, month);
  button.addEventListener('click', () => {
    activePeriod = index;
    updateMarket();
  });
  chart.append(button);
  return button;
});

function updateMarket() {
  const volumeMode = activeMetric === 'volume';
  const lower = volumeMode ? 0 : -25;
  const upper = volumeMode ? 145 : 35;
  const range = upper - lower;
  chart.style.setProperty('--baseline', String(upper / range));
  periods.forEach((period, index) => {
    const value = period[activeMetric];
    const label = volumeMode ? formatNumber.format(value) + ' тыс. автомобилей' : formatYearChange(value) + ' год к году';
    const button = points[index];
    button.style.setProperty('--bottom', ((Math.min(value, 0) - lower) / range * 100) + '%');
    button.style.setProperty('--height', (Math.abs(value) / range * 100) + '%');
    button.classList.toggle('negative', value < 0);
    button.setAttribute('aria-label', period.month + ', ' + label);
    button.setAttribute('aria-pressed', String(index === activePeriod));
    button.title = period.month + ' · ' + label;
  });

  const period = periods[activePeriod];
  document.querySelector('#market-value').textContent = volumeMode
    ? formatNumber.format(period.volume) + ' тыс.'
    : formatYearChange(period.change);
  document.querySelector('#market-period').textContent = period.month + ' 2026';

  const comparison = document.querySelector('#market-change');
  comparison.textContent = volumeMode
    ? formatYearChange(period.change) + ' г/г'
    : formatNumber.format(period.volume) + ' тыс. шт.';
  comparison.classList.toggle('positive', volumeMode && period.change > 0);
  marketSource.href = period.source;
  marketSource.textContent = 'Источник · ' + period.month.toLowerCase() + ' ↗';

  metricButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.metric === activeMetric));
  });
}

metricButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeMetric = button.dataset.metric;
    updateMarket();
  });
});
updateMarket();
chart.hidden = false;
document.querySelector('.chart-switch').hidden = false;

const filterButtons = [...document.querySelectorAll('[data-evidence]')];
const evidence = [...document.querySelectorAll('[data-kind]')];
const filterStatus = document.querySelector('#filter-status');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.evidence;
    evidence.forEach((item) => { item.hidden = kind !== 'all' && kind !== item.dataset.kind; });
    filterButtons.forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    filterStatus.textContent = 'Показаны: ' + button.textContent.toLowerCase() + '.';
  });
});
document.querySelector('.filter').hidden = false;

const form = document.querySelector('#renewal-form');
const { expired, renewed, target } = form.elements;
const result = document.querySelector('#renewal-result');
const instructions = result.textContent;
const example = document.querySelector('[data-example]');

function calculateRenewals() {
  const expiredCount = expired.valueAsNumber;
  const renewedCount = renewed.valueAsNumber;
  if (renewedCount > expiredCount) {
    renewed.setCustomValidity('Число продлений не может превышать число истёкших подписок.');
    renewed.reportValidity();
    return;
  }
  const goal = target.valueAsNumber;
  const share = renewedCount / expiredCount * 100;
  const gap = Math.max(0, goal - share);
  const remaining = Math.max(0, Math.ceil(expiredCount * (goal / 100) - 1e-8) - renewedCount);
  const formattedGap = gap > 0 && gap < 0.05 ? 'менее 0,1' : formatNumber.format(gap);
  const summary = gap > 0
    ? 'Разрыв ' + formattedGap + ' п. п. До цели при той же базе нужно ещё продлений: ' + remaining + '.'
    : 'Цель достигнута.';
  result.textContent = 'Доля продлений ' + formatNumber.format(share) + '%. ' + summary;
}

form.addEventListener('input', () => {
  renewed.setCustomValidity('');
  result.textContent = instructions;
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  calculateRenewals();
});
example.addEventListener('click', () => {
  expired.value = '100';
  renewed.value = '60';
  target.value = '70';
  renewed.setCustomValidity('');
  calculateRenewals();
  result.textContent = 'Пример. ' + result.textContent;
});
example.hidden = false;
form.querySelector('[type="submit"]').disabled = false;

const print = document.querySelector('[data-print]');
const disclosures = [...document.querySelectorAll('details')];
let previouslyClosed = [];
window.addEventListener('beforeprint', () => {
  previouslyClosed = disclosures.filter((details) => !details.open);
  previouslyClosed.forEach((details) => { details.open = true; });
});
window.addEventListener('afterprint', () => {
  previouslyClosed.forEach((details) => { details.open = false; });
  previouslyClosed = [];
});
print.addEventListener('click', () => window.print());
print.hidden = false;
