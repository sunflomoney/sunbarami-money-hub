const categories = Array.isArray(window.HUB_DATA) ? window.HUB_DATA : [];
const grid = document.getElementById('category-grid');
const search = document.getElementById('search');
const select = document.getElementById('category-filter');
const status = document.getElementById('filter-status');
const empty = document.getElementById('empty-state');
const expanded = new Set();
const countPosts = categories.reduce((sum, category) => sum + category.posts.length, 0);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function postItem(post) {
  const li = el('li');
  const link = el('a');
  const url = new URL(post.url);
  if (url.protocol !== 'https:' || url.hostname !== 'blog.naver.com') return li;
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', post.title + ' 새 창에서 읽기');
  const title = el('span', '', post.title);
  if (post.date) title.append(el('small', 'post-date', post.date));
  if (post.warn) title.append(el('small', 'post-warning', '제도·조건은 최신 정보 확인'));
  link.append(title);
  li.append(link);
  return li;
}
function renderCategories() {
  const term = search.value.trim().toLocaleLowerCase('ko-KR');
  const chosen = select.value;
  const fragment = document.createDocumentFragment();
  let shown = 0, matched = 0;
  for (const category of categories) {
    if (chosen !== 'all' && chosen !== String(category.id)) continue;
    const categoryMatches = (category.name + ' ' + category.subtitle).toLocaleLowerCase('ko-KR').includes(term);
    const posts = term && !categoryMatches ? category.posts.filter(post => post.title.toLocaleLowerCase('ko-KR').includes(term)) : category.posts;
    if (term && !categoryMatches && posts.length === 0) continue;
    shown++;
    matched += posts.length;
    const card = el('article', 'category-card');
    card.id = 'category-' + category.id;
    const head = el('div', 'card-head');
    head.append(el('span', 'card-number', String(category.id).padStart(2, '0')), el('span', 'card-count', category.posts.length + '편'));
    const overview = el('div', 'category-overview');
    overview.append(head, el('h3', '', category.name), el('p', 'card-sub', category.subtitle), el('p', 'card-intro', category.intro));
    card.append(overview);
    const list = el('ul', 'post-list');
    list.id = 'posts-' + category.id;
    const visible = term || expanded.has(category.id) ? posts : posts.slice(0, 2);
    visible.forEach(post => list.append(postItem(post)));
    card.append(list);
    if (!term && posts.length > 2) {
      const button = el('button', 'more-button', expanded.has(category.id) ? '글 접기' : '나머지 ' + (posts.length - 2) + '편 보기');
      button.id = 'expand-' + category.id;
      button.type = 'button';
      button.setAttribute('aria-expanded', String(expanded.has(category.id)));
      button.setAttribute('aria-controls', list.id);
      button.addEventListener('click', () => {
        if (expanded.has(category.id)) expanded.delete(category.id); else expanded.add(category.id);
        renderCategories();
        document.getElementById(button.id)?.focus({preventScroll:true});
        if (!expanded.has(category.id)) document.getElementById(card.id)?.scrollIntoView({block:'nearest'});
      });
      card.append(button);
    }
    fragment.append(card);
  }
  grid.replaceChildren(fragment);
  empty.hidden = shown !== 0;
  status.textContent = term || chosen !== 'all' ? shown + '개 주제 · ' + matched + '편의 글' : categories.length + '개 주제 · ' + countPosts + '편의 글';
}
for (const category of categories) {
  const option = el('option', '', String(category.id).padStart(2, '0') + ' · ' + category.name);
  option.value = String(category.id);
  select.append(option);
}
search.addEventListener('input', renderCategories);
const quickSearch = document.getElementById('quick-search');
function quickFind() {
  search.value = quickSearch.value;
  select.value = 'all';
  renderCategories();
  document.getElementById('explore').scrollIntoView({behavior:'smooth', block:'start'});
  search.focus({preventScroll:true});
}
document.getElementById('quick-find').addEventListener('click', quickFind);
quickSearch.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); quickFind(); } });
select.addEventListener('change', renderCategories);
document.getElementById('reset-search').addEventListener('click', () => {search.value=''; select.value='all'; renderCategories(); search.focus()});
document.querySelectorAll('a[href^="#category-"]').forEach(link => link.addEventListener('click', event => {
  const id = link.getAttribute('href').slice(1);
  if (search.value || select.value !== 'all') {
    event.preventDefault();
    search.value = ''; select.value = 'all'; renderCategories();
    history.replaceState(null, '', '#' + id);
    document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
  }
}));
renderCategories();

const inputs = {
  initial: document.getElementById('initial'),
  monthly: document.getElementById('monthly'),
  rate: document.getElementById('rate'),
  years: document.getElementById('years'),
  inflation: document.getElementById('inflation'),
  taxRate: document.getElementById('tax-rate')
};
const error = document.getElementById('calc-error');
const future = document.getElementById('future-value');
const invested = document.getElementById('total-invested');
const gain = document.getElementById('total-gain');
const gross = document.getElementById('gross-value');
const tax = document.getElementById('total-tax');
const real = document.getElementById('real-value');
const inflationSummary = document.getElementById('inflation-summary');
const bar = document.querySelector('.split-bar');
const number = new Intl.NumberFormat('ko-KR', {maximumFractionDigits:0});
function formatMan(value) {
  const rounded = Math.round(Math.abs(value));
  const sign = value < -0.5 ? '−' : '';
  if (rounded >= 10000) {
    const billions = Math.floor(rounded / 10000);
    const rest = rounded % 10000;
    return sign + number.format(billions) + '억' + (rest ? ' ' + number.format(rest) + '만' : '') + ' 원';
  }
  return sign + number.format(rounded) + '만 원';
}
const { defaults, validate, simulate } = window.HubFinance;
function renderResult(result) {
  error.hidden = true;
  Object.values(inputs).forEach(input => input.removeAttribute('aria-invalid'));
  future.textContent = formatMan(result.afterTaxMan);
  gross.textContent = formatMan(result.futureMan);
  tax.textContent = formatMan(result.taxMan);
  real.textContent = formatMan(result.realMan);
  inflationSummary.textContent = '연 물가상승률 ' + result.inflationPercent + '% 적용';
  invested.textContent = formatMan(result.principalMan);
  gain.textContent = formatMan(result.afterTaxGainMan);
  gain.classList.toggle('loss', result.afterTaxGainMan < 0);
  const investedShare = result.afterTaxMan > 0 ? Math.min(100, result.principalMan / result.afterTaxMan * 100) : 0;
  document.getElementById('invested-bar').style.width = investedShare + '%';
  document.getElementById('gain-bar').style.width = Math.max(0, 100-investedShare) + '%';
  bar.setAttribute('aria-label', '납입 원금 ' + formatMan(result.principalMan) + ', 세후 수익 ' + formatMan(result.afterTaxGainMan));
  const rows = document.createDocumentFragment();
  result.yearly.forEach(year => {
    const row = el('tr');
    const heading = el('th', '', year.year + '년'); heading.setAttribute('scope', 'row');
    row.append(heading, ...[year.principalMan, year.futureMan, year.taxMan, year.afterTaxMan, year.realMan].map(value => el('td', '', number.format(Math.round(value)))));
    rows.append(row);
  });
  document.getElementById('yearly-results').replaceChildren(rows);
}
function updateCalculator() {
  Object.values(inputs).forEach(input => input.removeAttribute('aria-invalid'));
  try {
    const values = {};
    for (const [key, input] of Object.entries(inputs)) values[key] = input.value.trim() === '' ? NaN : Number(input.value);
    const result = simulate(values);
    renderResult(result);
    return result;
  } catch (cause) {
    error.textContent = cause.message;
    error.hidden = false;
    if (cause.field) inputs[cause.field].setAttribute('aria-invalid', 'true');
    future.textContent = invested.textContent = gain.textContent = gross.textContent = tax.textContent = real.textContent = '—';
    inflationSummary.textContent = '입력값을 확인해 주세요.';
    gain.classList.remove('loss');
    document.getElementById('invested-bar').style.width = '0%';
    document.getElementById('gain-bar').style.width = '0%';
    bar.setAttribute('aria-label', '입력값을 확인해 주세요.');
    document.getElementById('yearly-results').replaceChildren();
    return null;
  }
}
Object.values(inputs).forEach(input => input.addEventListener('input', updateCalculator));
document.getElementById('reset-calculator').addEventListener('click', () => {
  for (const [key, value] of Object.entries(defaults)) inputs[key].value = String(value);
  updateCalculator();
});
updateCalculator();

if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'simulate_monthly_investment',
      title: '적립식 투자 계산',
      description: '적립식 투자 계산기의 세전·세후 금액, 예상 세금과 물가를 반영한 현재 가치를 갱신합니다. 금액 단위는 만원이며, 기본 물가상승률은 연 3%, 세율은 수익의 15.4%입니다.',
      inputSchema: {
        type:'object',
        properties:{
          initialMan:{type:'number',minimum:0,maximum:1000000},
          monthlyMan:{type:'number',minimum:0,maximum:1000000},
          annualRatePercent:{type:'number',minimum:-30,maximum:30},
          years:{type:'integer',minimum:1,maximum:50},
          inflationPercent:{type:'number',minimum:0,maximum:30,default:3},
          taxRatePercent:{type:'number',minimum:0,maximum:100,default:15.4}
        },
        required:['initialMan','monthlyMan','annualRatePercent','years'],
        additionalProperties:false
      },
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(params) {
        const values = validate({initial:params.initialMan,monthly:params.monthlyMan,rate:params.annualRatePercent,years:params.years,inflation:params.inflationPercent,taxRate:params.taxRatePercent});
        for (const [key, value] of Object.entries(values)) inputs[key].value = String(value);
        const result = updateCalculator();
        document.getElementById('calculator').scrollIntoView({block:'start'});
        return {futureMan:Math.round(result.futureMan),principalMan:Math.round(result.principalMan),gainMan:Math.round(result.gainMan),taxMan:Math.round(result.taxMan),afterTaxMan:Math.round(result.afterTaxMan),afterTaxGainMan:Math.round(result.afterTaxGainMan),realMan:Math.round(result.realMan),inflationPercent:result.inflationPercent,taxRatePercent:result.taxRatePercent};
      }
    })).catch(() => {});
  } catch (_) {}
}
