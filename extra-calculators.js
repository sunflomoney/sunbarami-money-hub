(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const numeric = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
  const integer = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
  const quantity = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 6 });
  const won = value => (value < -0.5 ? '−' : '') + integer.format(Math.round(Math.abs(value))) + '원';
  const percent = value => value === null ? '현재가 0 · 계산 불가' : (Math.abs(value) < 0.005 ? '0.00' : value.toFixed(2)) + '%';
  const set = (id, text, negative = false) => { $(id).textContent = text; $(id).classList.toggle('loss', negative); };
  function cell(tag, text, negative = false) { const el = document.createElement(tag); el.textContent = text; if (tag === 'th') el.scope = 'row'; if (negative) el.className = 'loss'; return el; }
  function clearError(panel, error) { $(error).hidden = true; $(panel).querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid')); }
  function fail(panel, error, cause, selector, tables) {
    $(error).textContent = cause.message; $(error).hidden = false;
    if (cause.field) $(cause.field)?.setAttribute('aria-invalid', 'true');
    $(panel).querySelectorAll(selector).forEach(el => { el.textContent = '—'; el.classList.remove('loss'); });
    tables.forEach(id => $(id).replaceChildren());
  }
  const titles = {
    investment: [['매달 모으면,','얼마가 될까?'],'현재 투자금과 매달 넣을 금액을 바꾸면 결과가 바로 달라집니다.'],
    loan: [['미리 갚으면,','얼마나 아낄까?'],'월 납입액과 남은 이자를 비교하고, 조기상환으로 아끼는 금액을 확인하세요.'],
    stock: [['더 사면,','평단은 얼마일까?'],'평단가와 추가 투자금을 계산하고, 매수 전후 손익을 비교하세요.']
  };
  const tabs = Array.from(document.querySelectorAll('.calculator-tabs [role="tab"]'));
  function activate(tab) {
    tabs.forEach(t => { const active = t === tab; t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; $(t.getAttribute('aria-controls')).hidden = !active; });
    const key = tab.id.slice(4), [lines, description] = titles[key];
    $('calc-title').replaceChildren(document.createTextNode(lines[0]), document.createElement('br'), document.createTextNode(lines[1]));
    document.querySelector('.calculator-intro .panel-desc').textContent = description;
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next = event.key === 'ArrowRight' ? (index+1)%tabs.length : event.key === 'ArrowLeft' ? (index+tabs.length-1)%tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : -1;
      if (next >= 0) { event.preventDefault(); activate(tabs[next]); tabs[next].focus(); }
    });
  });
  document.querySelectorAll('[data-calculator-target]').forEach(link => {
    link.addEventListener('click', () => {
      const tab = $('tab-' + link.dataset.calculatorTarget);
      if (!tabs.includes(tab)) return;
      activate(tab);
      requestAnimationFrame(() => tab.focus({ preventScroll: true }));
    });
  });
  function updateLoan() {
    clearError('loan-workspace','loan-error');
    const balloon = $('loan-method').value === 'balloon';
    $('loan-strategy').querySelector('option[value="term"]').disabled = balloon;
    if (balloon) $('loan-strategy').value = 'payment';
    try {
      const result = window.HubCalculators.loan({ principal:numeric('loan-principal')*10000, rate:numeric('loan-rate'), months:numeric('loan-months'), extra:numeric('loan-extra')*10000, fee:numeric('loan-fee'), method:$('loan-method').value, strategy:$('loan-strategy').value });
      set('loan-net-saved',won(result.netSaved),result.netSaved < -0.5);
      for (const [side,data] of [['before',result.before],['after',result.after]]) {
        set('loan-first-'+side,won(data.first));set('loan-last-'+side,won(data.last));set('loan-interest-'+side,won(data.interest));set('loan-term-'+side,data.months+'개월');
      }
      $('loan-summary').textContent = '지금 갚을 원금 '+won(result.extra)+' · 중도상환수수료 '+won(result.fee)+' · 단축 기간 '+result.monthsSaved+'개월';
      const rows = document.createDocumentFragment();
      result.before.rows.forEach((before,i) => { const after=result.after.rows[i];const row=document.createElement('tr');row.append(cell('th',before.month+'개월'),cell('td',integer.format(Math.round(before.payment))),cell('td',integer.format(Math.round(after?.payment||0))),cell('td',integer.format(Math.round(after?.balance||0))));rows.append(row); });
      $('loan-rows').replaceChildren(rows);
    } catch (cause) { fail('loan-workspace','loan-error',cause,'[data-loan-result]',['loan-rows']);$('loan-summary').textContent=''; }
  }
  $('loan-workspace').querySelectorAll('input,select').forEach(input=>input.addEventListener('input',updateLoan));
  $('reset-loan').addEventListener('click',()=>{for(const [id,value] of Object.entries({'loan-principal':10000,'loan-rate':4,'loan-months':120,'loan-method':'annuity','loan-extra':1000,'loan-fee':0,'loan-strategy':'payment'}))$(id).value=String(value);updateLoan();});
  let lastStockMode = 'quantity';
  function money(value, price = false) {
    const dollar=$('stock-currency').value==='USD';
    const formatted=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:price?6:(dollar?2:0)}).format(Math.abs(value));
    return (value < -0.0000001 ? '−' : '') + (dollar?'$':'') + formatted + (dollar?'':'원');
  }
  function stockValues() { return {oldPrice:numeric('stock-price'),quantity:numeric('stock-quantity'),current:numeric('stock-current'),buyPrice:numeric('stock-buy-price'),order:numeric('stock-order'),mode:$('stock-mode').value,fractional:$('stock-fractional').checked}; }
  function updateTarget(values) {
    $('stock-target').removeAttribute('aria-invalid');
    if ($('stock-target').value.trim()==='') { $('stock-target-result').textContent='원하는 평단가를 입력해 보세요.';return; }
    try {
      const result=window.HubCalculators.target(values,numeric('stock-target'));
      $('stock-target-result').textContent=result.impossible?'이 매수가로 도달할 수 없는 목표입니다. 목표 평단을 추가 매수가보다 높게 입력해 주세요.':result.tooLarge?'필요 수량이 계산 범위를 초과합니다. 목표 평단을 확인해 주세요.':result.quantity===0?'기존 평단이 이미 목표 이하입니다.':'기존 보유분 기준 추가 '+quantity.format(result.quantity)+'주 · 필요 금액 '+money(result.amount)+' · 도달 평단 '+money(result.average,true);
    } catch(cause) { $('stock-target-result').textContent=cause.message;$('stock-target').setAttribute('aria-invalid','true'); }
  }
  function updateStock() {
    clearError('stock-workspace','stock-error');
    const mode=$('stock-mode').value, dollar=$('stock-currency').value==='USD',fractional=$('stock-fractional').checked;
    document.querySelectorAll('.stock-unit').forEach(el=>el.textContent=dollar?'USD':'원');
    $('stock-order-label').textContent=mode==='amount'?'추가 투자금액':'추가 매수 수량';$('stock-order-unit').textContent=mode==='amount'?(dollar?'USD':'원'):'주';
    $('stock-order').step=mode==='amount'||fractional?'any':'1';$('stock-quantity').step=fractional?'any':'1';
    try {
      const values=stockValues(),result=window.HubCalculators.average(values);
      set('stock-average',money(result.averagePrice,true));
      $('stock-summary').textContent='추가 '+quantity.format(result.additionalQuantity)+'주 · 투입금 '+money(result.spent)+(mode==='amount'?' · 남는 금액 '+money(result.remaining):'');
      const rows=document.createDocumentFragment();
      for (const [label,key,formatter] of [['평균 매입가','average',v=>money(v,true)],['보유 수량','quantity',v=>quantity.format(v)+'주'],['총투입금','cost',money],['평가손익','pnl',money],['수익률','returnPercent',percent],['본전까지 상승률','recoveryPercent',percent]]) {
        const row=document.createElement('tr');row.append(cell('th',label),cell('td',formatter(result.before[key]),['pnl','returnPercent'].includes(key)&&result.before[key]<0),cell('td',formatter(result.after[key]),['pnl','returnPercent'].includes(key)&&result.after[key]<0));rows.append(row);
      }
      $('stock-comparison').replaceChildren(rows);
      const scenarios=document.createDocumentFragment();
      result.scenarios.forEach(s=>{const row=document.createElement('tr');row.append(cell('th',(s.change===0?'현재':(s.change>0?'+':'')+s.change+'%')+' · '+money(s.price,true)),cell('td',money(s.before),s.before<0),cell('td',money(s.after),s.after<0));scenarios.append(row);});
      $('stock-scenarios').replaceChildren(scenarios);updateTarget(values);
    } catch(cause) { fail('stock-workspace','stock-error',cause,'[data-stock-result]',['stock-comparison','stock-scenarios']);$('stock-summary').textContent='';$('stock-target-result').textContent='기본 입력값을 확인해 주세요.'; }
  }
  $('stock-mode').addEventListener('change',()=>{const old=numeric('stock-order'),price=numeric('stock-buy-price');if(Number.isFinite(old)&&Number.isFinite(price)&&price>0)$('stock-order').value=String(lastStockMode==='quantity'?old*price:($('stock-fractional').checked?old/price:Math.floor(old/price)));lastStockMode=$('stock-mode').value;updateStock();});
  $('stock-workspace').querySelectorAll('input,select').forEach(input=>input.addEventListener('input',updateStock));
  $('reset-stock').addEventListener('click',()=>{for(const [id,value] of Object.entries({'stock-currency':'KRW','stock-price':100000,'stock-quantity':10,'stock-current':80000,'stock-buy-price':80000,'stock-mode':'quantity','stock-order':10,'stock-target':85000}))$(id).value=String(value);$('stock-fractional').checked=false;lastStockMode='quantity';updateStock();});
  updateLoan();updateStock();
})();
