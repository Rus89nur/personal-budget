/**
 * Зарплата от оклада.
 * Районный коэффициент — 70% оклада, северная надбавка — 80%,
 * оплата по окладу — полный оклад. Облагаемый доход — их сумма,
 * на руки — после НДФЛ 13%.
 */
(() => {
  const DEFAULT_OKLAD = 85536;

  const RATES = {
    regionalCoeff: 0.7,
    northernBonus: 0.8,
    tax: 0.13,
    advancePct: 46,
    salaryPct: 54,
  };

  function roundMoney(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function roundRuble(n) {
    return Math.round(Number(n) || 0);
  }

  /**
   * Оклад — единственная вводимая сумма.
   * Надбавки считаются от него, облагаемый доход — сумма трёх строк.
   */
  function calculateFromOklad(okladRaw) {
    const oklad = Number(okladRaw) || 0;
    const { regionalCoeff, northernBonus, tax, advancePct, salaryPct } = RATES;

    const basePay = oklad;
    const regionalAmt = oklad * regionalCoeff;
    const northernAmt = oklad * northernBonus;
    const grossTaxable = regionalAmt + northernAmt + basePay;
    const net = grossTaxable * (1 - tax);

    const advance = (net * advancePct) / 100;
    const salary = (net * salaryPct) / 100;

    return {
      oklad: roundMoney(oklad),
      rates: { ...RATES },
      lines: [
        {
          key: "regional",
          label: "Районный коэффициент",
          rate: regionalCoeff,
          amount: roundMoney(regionalAmt),
        },
        {
          key: "northern",
          label: "Северная надбавка",
          rate: northernBonus,
          amount: roundMoney(northernAmt),
        },
        {
          key: "basePay",
          label: "Оплата по окладу",
          rate: null,
          amount: roundMoney(basePay),
          editable: true,
        },
      ],
      grossTaxable: roundMoney(grossTaxable),
      net: roundMoney(net),
      advancePct,
      salaryPct,
      advance: roundRuble(advance),
      salary: roundRuble(salary),
      advanceExact: roundMoney(advance),
      salaryExact: roundMoney(salary),
    };
  }

  /**
   * Доля отработанных дней: работаю / всего.
   * Если дней нет — полный месяц (1).
   */
  function workFactor(workdays) {
    const total = Number(workdays?.total);
    const worked = Number(workdays?.worked);
    if (!Number.isFinite(total) || total <= 0) return 1;
    if (!Number.isFinite(worked) || worked < 0) return 1;
    return Math.min(1, Math.max(0, worked / total));
  }

  function scalePay(calc, factor) {
    const f = Number.isFinite(factor) ? factor : 1;
    return {
      advance: roundRuble(calc.advanceExact * f),
      salary: roundRuble(calc.salaryExact * f),
      net: roundRuble(calc.net * f),
      factor: f,
    };
  }

  window.BudgetSalary = {
    DEFAULT_OKLAD,
    RATES,
    calculateFromOklad,
    workFactor,
    scalePay,
    roundRuble,
    roundMoney,
  };
})();
