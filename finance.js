(function (root) {
  'use strict';
  const defaults = Object.freeze({ initial: 500, monthly: 50, rate: 5, years: 10, inflation: 3, taxRate: 15.4 });
  const limits = { initial: [0, 1000000], monthly: [0, 1000000], rate: [-30, 30], years: [1, 50], inflation: [0, 30], taxRate: [0, 100] };
  function validate(values) {
    values = { ...values, inflation: values.inflation === undefined ? defaults.inflation : values.inflation, taxRate: values.taxRate === undefined ? defaults.taxRate : values.taxRate };
    for (const [key, [min, max]] of Object.entries(limits)) {
      if (!Number.isFinite(values[key]) || values[key] < min || values[key] > max) {
        const message = key === 'rate' ? '연 수익률은 -30%부터 30%까지 입력해 주세요.' : key === 'years' ? '투자 기간은 1년부터 50년까지 입력해 주세요.' : key === 'inflation' ? '물가상승률은 0%부터 30%까지 입력해 주세요.' : key === 'taxRate' ? '세율은 0%부터 100%까지 입력해 주세요.' : '투자금은 0만원부터 100억원까지 입력해 주세요.';
        const error = new Error(message); error.field = key; throw error;
      }
    }
    if (!Number.isInteger(values.years)) { const error = new Error('투자 기간은 정수로 입력해 주세요.'); error.field = 'years'; throw error; }
    return values;
  }
  function snapshot(balance, principal, year, values) {
    const gainMan = balance - principal;
    const taxMan = Math.max(0, gainMan) * values.taxRate / 100;
    const afterTaxMan = balance - taxMan;
    return { year, principalMan: principal, futureMan: balance, gainMan, taxMan, afterTaxMan, afterTaxGainMan: gainMan - taxMan, realMan: afterTaxMan / Math.pow(1 + values.inflation / 100, year) };
  }
  function simulate(values) {
    values = validate(values);
    const months = values.years * 12, monthlyRate = values.rate / 1200;
    let balance = values.initial;
    const yearly = [];
    for (let month = 1; month <= months; month++) {
      balance = balance * (1 + monthlyRate) + values.monthly;
      if (month % 12 === 0) {
        const principal = values.initial + values.monthly * month;
        yearly.push(snapshot(balance, principal, month / 12, values));
      }
    }
    const principal = values.initial + values.monthly * months;
    return { ...snapshot(balance, principal, values.years, values), inflationPercent: values.inflation, taxRatePercent: values.taxRate, yearly };
  }
  root.HubFinance = Object.freeze({ defaults, validate, simulate });
})(typeof window !== 'undefined' ? window : globalThis);
