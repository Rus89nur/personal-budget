/**
 * Расчёт зарплаты по формулам листа «ЗП» из Numbers Бюджет_2026.
 * Редактируется только оклад; коэффициенты и доли — как в таблице.
 */
(() => {
  const DEFAULT_OKLAD = 85536;

  /** Фиксированные ставки с листа ЗП */
  const RATES = {
    regionalCoeff: 0.7, // районный коэффициент 70%
    northernBonus: 0.8, // северная надбавка 80%
    highAchievement: 0.1, // надбавка за высокие достижения 10%
    monthlyBonus: 0.495, // премия по итогам работы за месяц
    incentive: 0.15, // поощрительная 15%
    tax: 0.13, // НДФЛ
    advancePct: 46, // доля аванса
    salaryPct: 54, // доля ЗП
    uplift: 0.02, // колонка D: +2%
  };

  function roundMoney(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function roundRuble(n) {
    return Math.round(Number(n) || 0);
  }

  /**
   * Полный расчёт от оклада (колонка C листа ЗП + производные).
   * Порядок как в таблице: сначала премии от оклада, затем надбавки.
   */
  function calculateFromOklad(okladRaw) {
    const oklad = Number(okladRaw) || 0;
    const {
      regionalCoeff: rk,
      northernBonus: sn,
      highAchievement: ha,
      monthlyBonus: mb,
      incentive: inc,
      tax,
      advancePct,
      salaryPct,
      uplift,
    } = RATES;

    // C6, C7, C8, C9
    const highAchievementAmt = oklad * ha;
    const monthlyBonusAmt = oklad * mb;
    const incentiveAmt = oklad * inc;
    const timePay = oklad;

    // C2, C3 — районный/северная от премии (C7)
    const regionalOnBonus = monthlyBonusAmt * rk;
    const northernOnBonus = monthlyBonusAmt * sn;

    // C4, C5 — районный/северная от (оклад + поощрительная + высокие достижения)
    const baseForAllowances = oklad + incentiveAmt + highAchievementAmt;
    const regionalAmt = baseForAllowances * rk;
    const northernAmt = baseForAllowances * sn;

    // C10 = SUM(C2:C9)
    const grossTaxable =
      regionalOnBonus +
      northernOnBonus +
      regionalAmt +
      northernAmt +
      highAchievementAmt +
      monthlyBonusAmt +
      incentiveAmt +
      timePay;

    // C11 = C10 − C10×0.13
    const net = grossTaxable * (1 - tax);

    const advance = (net * advancePct) / 100;
    const salary = (net * salaryPct) / 100;

    const withUplift = (v) => v + v * uplift;

    return {
      oklad: roundMoney(oklad),
      rates: { ...RATES },
      lines: [
        {
          key: "oklad",
          label: "Оклад",
          rate: null,
          amount: roundMoney(oklad),
          amountUplift: roundMoney(withUplift(oklad)),
          editable: true,
        },
        {
          key: "regionalOnBonus",
          label: "Районный коэффициент (премия)",
          rate: rk,
          amount: roundMoney(regionalOnBonus),
          amountUplift: roundMoney(withUplift(regionalOnBonus)),
        },
        {
          key: "northernOnBonus",
          label: "Северная надбавка (премия)",
          rate: sn,
          amount: roundMoney(northernOnBonus),
          amountUplift: roundMoney(withUplift(northernOnBonus)),
        },
        {
          key: "regional",
          label: "Районный коэффициент",
          rate: rk,
          amount: roundMoney(regionalAmt),
          amountUplift: roundMoney(withUplift(regionalAmt)),
        },
        {
          key: "northern",
          label: "Северная надбавка",
          rate: sn,
          amount: roundMoney(northernAmt),
          amountUplift: roundMoney(withUplift(northernAmt)),
        },
        {
          key: "highAchievement",
          label: "Надбавка за высокие достижения",
          rate: ha,
          amount: roundMoney(highAchievementAmt),
          amountUplift: roundMoney(withUplift(highAchievementAmt)),
        },
        {
          key: "monthlyBonus",
          label: "Премия по итогам работы за месяц",
          rate: mb,
          amount: roundMoney(monthlyBonusAmt),
          amountUplift: roundMoney(withUplift(monthlyBonusAmt)),
        },
        {
          key: "incentive",
          label: "Поощрительная",
          rate: inc,
          amount: roundMoney(incentiveAmt),
          amountUplift: roundMoney(withUplift(incentiveAmt)),
        },
        {
          key: "timePay",
          label: "Повременная оплата",
          rate: null,
          amount: roundMoney(timePay),
          amountUplift: roundMoney(withUplift(timePay)),
        },
      ],
      grossTaxable: roundMoney(grossTaxable),
      grossTaxableUplift: roundMoney(withUplift(grossTaxable)),
      net: roundMoney(net),
      netUplift: roundMoney(withUplift(net)),
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
