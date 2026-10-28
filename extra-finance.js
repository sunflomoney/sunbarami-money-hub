(function (root) {
  'use strict';
  function number(value, min, max, field, label, integer = false) {
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      const error = new Error(label + ' 입력값을 확인해 주세요.'); error.field = field; throw error;
    }
    return value;
  }
  function quantize(value, scale, up) {
    const scaled = value * scale, nearest = Math.round(scaled);
    const adjusted = Math.abs(scaled - nearest) <= 16 * Number.EPSILON * Math.max(1, Math.abs(scaled)) ? nearest : scaled;
    return (up ? Math.ceil(adjusted) : Math.floor(adjusted)) / scale;
  }
  function quantityPrecision(value, field) {
    const rounded = Math.round(value * 1e6) / 1e6;
    if (Math.abs(value - rounded) > 16 * Number.EPSILON * Math.max(1, Math.abs(value))) {
      const error = new Error('수량은 소수점 6자리까지 입력해 주세요.'); error.field = field; throw error;
    }
  }
  function purchasableQuantity(amount, price, fractional) {
    return quantize(amount / price, fractional ? 1e6 : 1, false);
  }
  function loan(values) {
    const p = number(values.principal, 1, 1e10, 'loan-principal', '대출 잔액');
    const rate = number(values.rate, 0, 30, 'loan-rate', '연 금리') / 1200;
    const months = number(values.months, 1, 600, 'loan-months', '남은 기간 (1~600개월)', true);
    const extra = number(values.extra, 0, p, 'loan-extra', '조기상환액 (대출 잔액 이하)');
    const fee = extra * number(values.fee, 0, 10, 'loan-fee', '중도상환수수료율 (0~10%)') / 100;
    if (!['annuity', 'principal', 'balloon'].includes(values.method)) throw new Error('상환 방식을 선택해 주세요.');
    if (!['payment', 'term'].includes(values.strategy) || (values.method === 'balloon' && values.strategy === 'term')) throw new Error('상환 후 조정 방식을 확인해 주세요.');
    const payment = rate === 0 ? p / months : p * rate / -Math.expm1(-months * Math.log1p(rate));
    function schedule(balance, keepPayment) {
      if (balance === 0) return { rows: [], interest: 0, first: 0, last: 0, months: 0 };
      const original = balance;
      const amount = keepPayment ? payment : (rate === 0 ? balance / months : balance * rate / -Math.expm1(-months * Math.log1p(rate)));
      const principalPart = keepPayment ? p / months : balance / months;
      const rows = []; let interestTotal = 0;
      for (let month = 1; month <= months; month++) {
        const interest = balance * rate;
        let principal = values.method === 'balloon' ? (month === months ? balance : 0) : values.method === 'principal' ? principalPart : amount - interest;
        principal = Math.min(balance, Math.max(0, principal));
        if (month === months || balance - principal < Math.max(1e-7, original * 1e-12)) principal = balance;
        balance = Math.max(0, balance - principal);
        interestTotal += interest;
        rows.push({ month, principal, interest, payment: principal + interest, balance });
        if (balance === 0) break;
      }
      return { rows, interest: interestTotal, first: rows[0].payment, last: rows[rows.length - 1].payment, months: rows.length };
    }
    const before = schedule(p, false), after = schedule(p - extra, values.strategy === 'term');
    return { before, after, extra, fee, interestSaved: before.interest - after.interest, netSaved: before.interest - after.interest - fee, monthsSaved: before.months - after.months };
  }
  function average(values) {
    const oldPrice = number(values.oldPrice, 0.000001, 1e9, 'stock-price', '기존 평균 매입가');
    const quantity = number(values.quantity, 0.000001, 1e9, 'stock-quantity', '보유 수량', !values.fractional);
    const current = number(values.current, 0, 1e9, 'stock-current', '현재 주가');
    const buyPrice = number(values.buyPrice, 0.000001, 1e9, 'stock-buy-price', '추가 매수가');
    number(values.order, 0, values.mode === 'amount' ? 1e12 : 1e9, 'stock-order', '추가 매수 수량 또는 금액', values.mode === 'quantity' && !values.fractional);
    if (!['quantity','amount'].includes(values.mode)) throw new Error('추가 매수 방식을 선택해 주세요.');
    if (values.fractional) {
      quantityPrecision(quantity, 'stock-quantity');
      if (values.mode === 'quantity') quantityPrecision(values.order, 'stock-order');
    }
    const additionalQuantity = values.mode === 'amount' ? purchasableQuantity(values.order, buyPrice, values.fractional) : quantize(values.order, values.fractional ? 1e6 : 1, false);
    number(additionalQuantity, 0, 1e9, 'stock-order', '추가 매수 수량 (최대 10억 주)');
    const spent = additionalQuantity * buyPrice;
    const cost = oldPrice * quantity, totalCost = cost + spent, totalQuantity = quantity + additionalQuantity;
    number(totalCost, 0.000000000001, 1e15, 'stock-order', '총투입금 (최대 1,000조)');
    const averagePrice = totalCost / totalQuantity;
    function position(price, count, basis) { return { quantity: count, cost: basis, average: basis / count, pnl: price * count - basis, returnPercent: (price * count / basis - 1) * 100, recoveryPercent: price > 0 ? Math.max(0, (basis / count / price - 1) * 100) : null }; }
    return { additionalQuantity, spent, remaining: values.mode === 'amount' ? Math.max(0, values.order - spent) : 0, averagePrice, before: position(current, quantity, cost), after: position(current, totalQuantity, totalCost), scenarios: [-10,0,10].map(change => ({ change, price: current * (1 + change / 100), before: position(current * (1 + change / 100), quantity, cost).pnl, after: position(current * (1 + change / 100), totalQuantity, totalCost).pnl })) };
  }
  function target(values, targetPrice) {
    number(targetPrice, 0.000001, 1e9, 'stock-target', '목표 평단가');
    if (targetPrice >= values.oldPrice) return { quantity: 0, amount: 0, average: values.oldPrice };
    if (targetPrice <= values.buyPrice) return { impossible: true };
    const raw = values.quantity * (values.oldPrice - targetPrice) / (targetPrice - values.buyPrice);
    if (!Number.isFinite(raw) || raw > 1e9 || raw * values.buyPrice > 1e15) return { tooLarge: true };
    const quantity = quantize(raw, values.fractional ? 1e6 : 1, true);
    if (quantity > 1e9 || values.oldPrice * values.quantity + quantity * values.buyPrice > 1e15) return { tooLarge: true };
    return { quantity, amount: quantity * values.buyPrice, average: (values.oldPrice * values.quantity + quantity * values.buyPrice) / (values.quantity + quantity) };
  }
  root.HubCalculators = Object.freeze({ loan, average, target, purchasableQuantity });
})(typeof window !== 'undefined' ? window : globalThis);
