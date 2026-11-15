(() => {
  const APP_VERSION = "1.25.1";
  const STORAGE_KEY = "personal-budget-v2";
  const YEARS = [2026, 2027];
  const Salary = window.BudgetSalary;
  const COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches
    || ("ontouchstart" in window && navigator.maxTouchPoints > 0);
  const IOS_WEBKIT = /iP(ad|hone|od)/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  let bodyScrollY = 0;
  let focusScrollTimer = 0;

  const MONTHS_RU = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];

  const MONTHS_SHORT = [
    "янв", "фев", "мар", "апр", "май", "июн",
    "июл", "авг", "сен", "окт", "ноя", "дек",
  ];

  const MONTH_GENITIVE = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];

  const RENT_LINE_PRESETS = [
    { id: "rent_gaz", label: "Аренда Газовиков" },
    { id: "rent_quiet", label: "Аренда Тихий" },
    { id: "rent_garage", label: "Аренда гараж" },
  ];

  const els = {
    monthNav: document.getElementById("monthNav"),
    monthTitle: document.getElementById("monthTitle"),
    monthHint: document.getElementById("monthHint"),
    sumIncome: document.getElementById("sumIncome"),
    sumPlan: document.getElementById("sumPlan"),
    sumFact: document.getElementById("sumFact"),
    sumRemain: document.getElementById("sumRemain"),
    yearNav: document.getElementById("yearNav"),
    workTotalView: document.getElementById("workTotalView"),
    workSplitView: document.getElementById("workSplitView"),
    workPartial: document.getElementById("workPartial"),
    partialBox: document.getElementById("partialBox"),
    workFirst: document.getElementById("workFirst"),
    workSecond: document.getElementById("workSecond"),
    workVacationOn: document.getElementById("workVacationOn"),
    vacationBox: document.getElementById("vacationBox"),
    workVacation: document.getElementById("workVacation"),
    workDaily: document.getElementById("workDaily"),
    incomeBody: document.getElementById("incomeBody"),
    incomeTotal: document.getElementById("incomeTotal"),
    expenseBody: document.getElementById("expenseBody"),
    expenseHead: document.getElementById("expenseHead"),
    btnAddIncome: document.getElementById("btnAddIncome"),
    btnAddExpense: document.getElementById("btnAddExpense"),
    btnClearExpenses: document.getElementById("btnClearExpenses"),
    btnFillExpenses: document.getElementById("btnFillExpenses"),
    btnExport: document.getElementById("btnExport"),
    importFile: document.getElementById("importFile"),
    btnReset: document.getElementById("btnReset"),
    btnSettings: document.getElementById("btnSettings"),
    settingsDialog: document.getElementById("settingsDialog"),
    settingsForm: document.getElementById("settingsForm"),
    settingsOklad: document.getElementById("settingsOklad"),
    regionalAmount: document.getElementById("regionalAmount"),
    northernAmount: document.getElementById("northernAmount"),
    basePayAmount: document.getElementById("basePayAmount"),
    grossAmount: document.getElementById("grossAmount"),
    netAmount: document.getElementById("netAmount"),
    btnSettingsCancel: document.getElementById("btnSettingsCancel"),
    btnSettingsSave: document.getElementById("btnSettingsSave"),
    rentDialog: document.getElementById("rentDialog"),
    rentList: document.getElementById("rentList"),
    rentSum: document.getElementById("rentSum"),
    rentAdd: document.getElementById("rentAdd"),
    savingsHead: document.getElementById("savingsHead"),
    savingsBody: document.getElementById("savingsBody"),
    brokerIncomeHead: document.getElementById("brokerIncomeHead"),
    brokerIncomeBody: document.getElementById("brokerIncomeBody"),
    btnAddBrokerIncome: document.getElementById("btnAddBrokerIncome"),
    btnAddSavings: document.getElementById("btnAddSavings"),
    utilitiesHead: document.getElementById("utilitiesHead"),
    utilitiesBody: document.getElementById("utilitiesBody"),
    analyticsYear: document.getElementById("analyticsYear"),
    analyticsMonth: document.getElementById("analyticsMonth"),
    analyticsCharts: document.getElementById("analyticsCharts"),
    chartStage: document.getElementById("chartStage"),
    chartTip: document.getElementById("chartTip"),
  };

  let seedTemplate = null;
  let sheetBudget = null;
  let sheetSavings = null;
  let state = null;
  let settingsDraftOklad = null;
  let rentMenuKey = null;

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function monthKeys(year = state?.year || YEARS[0]) {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  }

  function monthIndex(key) {
    return Number(String(key).slice(5, 7)) - 1;
  }

  function yearOf(key) {
    return Number(String(key).slice(0, 4));
  }

  function emptyMonth() {
    return {
      workdays: { total: null, worked: null, vacation: null },
      income: [
        { id: uid("inc"), label: "ЗП", amount: 0 },
        { id: uid("inc"), label: "Аванс", amount: 0 },
        {
          id: uid("inc"),
          kind: "rent",
          label: "Аренда",
          amount: 0,
          lines: freshRentLines(),
        },
      ],
      expenses: [
        { id: uid("exp"), name: "10%", plan: null, shares: {}, sharesManual: {} },
        { id: uid("exp"), name: "Отложить", plan: 0, fact: null },
        { id: uid("exp"), name: "Жили были", plan: 0, fact: null },
        { id: uid("exp"), name: "Ипотека", plan: 0, fact: null },
        { id: uid("exp"), name: "Инет, связи", plan: 0, fact: null },
        { id: uid("exp"), name: "Комуналка", plan: 0, fact: null },
        { id: uid("exp"), name: "Покупки", plan: 0, fact: null },
        { id: uid("exp"), name: "Отдых", plan: 0, fact: null },
        { id: uid("exp"), name: "Бензин", plan: 0, fact: null },
        { id: uid("exp"), name: "Баня", plan: null, salary: 0, advance: null },
      ],
    };
  }

  function cloneSeedMonths(seed, year) {
    const months = {};
    for (const key of monthKeys(year)) {
      const src = seed?.months?.[key];
      if (!src) {
        months[key] = emptyMonth();
        continue;
      }
      months[key] = {
        workdays: {
          total: src.workdays?.total ?? null,
          worked: src.workdays?.worked ?? null,
          vacation: src.workdays?.vacation ?? null,
        },
        income: (src.income || []).map(copyIncomeRow),
        expenses: (src.expenses || [])
          .filter((row) => row && row.name && String(row.name).toLowerCase() !== "остаток")
          .map((row) => ({
            id: row.id || uid("exp"),
            name: String(row.name),
            plan: Number(row.plan) || 0,
            fact: row.fact == null || row.fact === "" ? null : Number(row.fact),
          })),
      };
    }
    return months;
  }

  function incomeColumnKey(row) {
    return shareKeyForLabel(row.label);
  }

  function shareKeyForLabel(label) {
    if (isSalaryLabel(label)) return "salary";
    if (isAdvanceLabel(label)) return "advance";
    if (isVacationLabel(label)) return "vacation";
    return `name:${String(label || "").trim().toLowerCase()}`;
  }

  function incomeColumns(month) {
    return month.income.map((row) => ({
      key: incomeColumnKey(row),
      id: row.id,
      label: row.label,
      amount: Number(row.amount) || 0,
    }));
  }

  function normalizeExpense(row) {
    if (!row.shares) {
      row.shares = {};
      row.sharesManual = {};
      const hadSalary = "salary" in row;
      if (!hadSalary && ("fact" in row || row.planManual == null)) {
        const oldPlan = Number(row.plan) || 0;
        const oldFact = row.fact == null || row.fact === "" ? null : Number(row.fact);
        row.plan = oldPlan || null;
        row.planManual = oldPlan !== 0;
        if (oldFact != null) {
          row.shares.advance = oldFact;
          row.sharesManual.advance = true;
        }
      } else if (hadSalary) {
        const salaryEmpty = row.salary == null || row.salary === "";
        const planEmpty = row.plan == null || row.plan === "";
        if (!salaryEmpty && planEmpty) {
          row.plan = Number(row.salary) || 0;
          row.planManual = row.salaryManual !== false;
        } else if (!salaryEmpty && Number(row.salary) !== 0) {
          row.shares.salary = Number(row.salary) || 0;
          row.sharesManual.salary = !!row.salaryManual;
        }
        if (row.advance != null && row.advance !== "") {
          row.shares.advance = Number(row.advance) || 0;
          row.sharesManual.advance = !!row.advanceManual;
        }
      }
      delete row.fact;
      delete row.salary;
      delete row.salaryManual;
      delete row.advance;
      delete row.advanceManual;
    }
    if (!row.sharesManual) row.sharesManual = {};
    return row;
  }

  function inheritExpenses(month, prev) {
    month.expenses.forEach(normalizeExpense);
    if (prev) prev.expenses.forEach(normalizeExpense);
  }

  function cellManual(row, key) {
    return key === "plan" ? Boolean(row.planManual) : Boolean(row.sharesManual?.[key]);
  }

  function cellValue(row, key) {
    if (!cellManual(row, key)) return null;
    const value = key === "plan" ? row.plan : row.shares?.[key];
    if (value == null || value === "" || Number(value) === 0) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function previousExpenseMonth() {
    const key = state.currentMonth;
    const year = yearOf(key);
    const index = Number(key.slice(5, 7)) - 1;
    if (index <= 0) return state.years[year - 1]?.months[`${year - 1}-12`] || null;
    return state.years[year]?.months[`${year}-${String(index).padStart(2, "0")}`] || null;
  }

  function isTitheRow(row) {
    return String(row?.name || "").trim() === "10%";
  }

  function isSetAsideRow(row) {
    return String(row?.name || "").trim().toLowerCase() === "отложить";
  }

  function setAsideMonthAmount(row) {
    normalizeExpense(row);
    const plan = cellValue(row, "plan");
    if (plan != null) return plan;
    return Object.keys(row.shares || {}).reduce((sum, key) => {
      const value = cellValue(row, key);
      return value == null ? sum : sum + value;
    }, 0);
  }

  function setAsideSoFar() {
    const year = state.year;
    const limit = state.currentMonth;
    let sum = 0;
    monthKeys(year).forEach((key) => {
      if (key > limit) return;
      const month = state.years[year]?.months[key];
      if (!month?.expenses) return;
      month.expenses.forEach((row) => {
        if (isSetAsideRow(row)) sum += setAsideMonthAmount(row);
      });
    });
    return Math.round(sum * 100) / 100;
  }

  function setAsideHintText() {
    return `С начала года ${money(setAsideSoFar())}`;
  }

  function paintSetAsideHint() {
    const hint = document.querySelector("#expenseBody .set-aside-hint");
    if (!hint) return;
    hint.textContent = setAsideHintText();
    hint.closest("tr")?.removeAttribute("title");
  }

  function titheSuggestion(key) {
    const month = activeMonth();
    if (!month) return null;
    const base = key === "plan"
      ? month.income.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
      : (incomeColumns(month).find((col) => col.key === key)?.amount || 0);
    const value = Math.round(base * 0.1);
    return value > 0 ? value : null;
  }

  function ensureTitheRow(month) {
    if (!month?.expenses) return false;
    let changed = false;
    let row = month.expenses.find(isTitheRow);
    if (!row) {
      row = { id: uid("exp"), name: "10%", plan: null, shares: {}, sharesManual: {} };
      month.expenses.unshift(row);
      return true;
    }
    const index = month.expenses.indexOf(row);
    if (index > 0) {
      month.expenses.splice(index, 1);
      month.expenses.unshift(row);
      changed = true;
    }
    return changed;
  }

  function ensureTitheStructure(target) {
    let changed = false;
    YEARS.forEach((year) => {
      Object.values(target.years?.[year]?.months || {}).forEach((month) => {
        if (ensureTitheRow(month)) changed = true;
      });
    });
    return changed;
  }

  function suggestionFor(row, key) {
    if (isTitheRow(row)) return titheSuggestion(key);
    const prev = previousExpenseMonth();
    if (!prev) return null;
    const src = prev.expenses.find(
      (item) => String(item.name).trim().toLowerCase() === String(row.name).trim().toLowerCase()
    );
    if (!src) return null;
    normalizeExpense(src);
    return cellValue(src, key);
  }

  function refreshExpenseDefaults() {
    YEARS.forEach((year) => {
      monthKeys(year).forEach((key, index) => {
        const month = state.years[year].months[key];
        const prev = index === 0
          ? state.years[year - 1]?.months[`${year - 1}-12`]
          : state.years[year].months[`${year}-${String(index).padStart(2, "0")}`];
        inheritExpenses(month, prev);
      });
    });
  }

  function currentMonthKey(year) {
    const now = new Date();
    if (now.getFullYear() === year) {
      return `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${year}-01`;
  }

  function rememberYear(year) {
    const value = Number(year);
    if (!Number.isInteger(value) || value < 2000 || value > 2100) return;
    if (!YEARS.includes(value)) YEARS.push(value);
    YEARS.sort((a, b) => a - b);
  }

  function syncYears(target) {
    Object.keys(target?.years || {}).forEach((key) => rememberYear(key));
  }

  function ensureYearData(target, year) {
    rememberYear(year);
    if (!target.years) target.years = {};
    if (!target.years[year]) target.years[year] = { months: blankYear(year) };
    monthKeys(year).forEach((key, index) => {
      if (!target.years[year].months[key]) target.years[year].months[key] = emptyMonth();
      stampWorkdays(target.years[year].months[key], year, index);
    });
  }

  function selectToday(target) {
    const now = new Date();
    const year = now.getFullYear();
    ensureYearData(target, year);
    target.year = year;
    target.months = target.years[year].months;
    target.currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function addNextYear() {
    const next = Math.max(...YEARS) + 1;
    ensureYearData(state, next);
    applySalaryToMonths(state, { silent: true });
    saveState();
    render();
  }

  function dropMonthKeys(map, year) {
    if (!map) return;
    const prefix = `${year}-`;
    Object.keys(map).forEach((key) => {
      if (String(key).startsWith(prefix)) delete map[key];
    });
  }

  function yearHasEnteredData(year) {
    const months = state.years?.[year]?.months || {};
    const monthFilled = Object.values(months).some((month) => {
      const days = month?.workdays || {};
      if (days.partialChosen || days.vacationOn || days.dailyManual) return true;
      const incomeFilled = (month?.income || []).some((row) => {
        if (row.kind === "rent") return (row.lines || []).some((line) => Number(line.amount));
        if (row.manual && Number(row.amount)) return true;
        const payroll = isSalaryLabel(row.label) || isAdvanceLabel(row.label) || isVacationLabel(row.label);
        if (payroll || isBrokerLabel(row.label)) return false;
        return Number(row.amount);
      });
      if (incomeFilled) return true;
      return (month?.expenses || []).some((row) => {
        normalizeExpense(row);
        if (row.planManual && Number(row.plan)) return true;
        if (row.fact != null && row.fact !== "" && Number(row.fact)) return true;
        return Object.entries(row.sharesManual || {}).some(([key, on]) => on && Number(row.shares?.[key]));
      });
    });
    if (monthFilled) return true;
    const prefix = `${year}-`;
    const hasKeyed = (amounts) => Object.entries(amounts || {}).some(([key, value]) => String(key).startsWith(prefix) && value != null && value !== "" && Number(value) !== 0);
    if (Object.values(state.savingsFact?.rows || {}).some(hasKeyed)) return true;
    if ((state.savingsFact?.brokerIncomes || []).some((row) => hasKeyed(row.amounts))) return true;
    return Object.values(state.utilities?.rows || {}).some(hasKeyed);
  }

  function removeFarthestYear() {
    if (YEARS.length < 2) return;
    const year = Math.max(...YEARS);
    const filled = yearHasEnteredData(year);
    const message = filled
      ? `Удалить ${year}? В этом году есть введённые данные, они пропадут.`
      : `Удалить ${year}? В этом году нет введённых данных.`;
    if (!confirm(message)) return;
    delete state.years[year];
    const index = YEARS.indexOf(year);
    if (index >= 0) YEARS.splice(index, 1);
    Object.values(state.savingsFact?.rows || {}).forEach((amounts) => dropMonthKeys(amounts, year));
    (state.savingsFact?.brokerIncomes || []).forEach((row) => dropMonthKeys(row.amounts, year));
    Object.values(state.utilities?.rows || {}).forEach((amounts) => dropMonthKeys(amounts, year));
    if (state.year === year) attachYear(state, Math.max(...YEARS));
    if (Array.isArray(analyticsYears)) {
      analyticsYears = analyticsYears.filter((item) => item !== year);
      if (!analyticsYears.length) analyticsYears = [state.year];
      keepMonthWhenOneYear();
    }
    saveState();
    render();
  }

  function stampWorkdays(month, year, index) {
    const cal = BudgetCalendar.parts(year, index);
    const prev = month.workdays || {};
    const partial = Boolean(prev.partialChosen);
    const vacationOn = Boolean(prev.vacationOn);
    month.workdays = {
      total: cal.total,
      calendarFirst: cal.first,
      calendarSecond: cal.second,
      partialChosen: partial,
      partial,
      first: partial ? Number(prev.first) || 0 : cal.first,
      second: partial ? Number(prev.second) || 0 : cal.second,
      vacationOn,
      vacation: vacationOn ? Number(prev.vacation) || 0 : Number(prev.vacation) || 0,
      dailyManual: Boolean(prev.dailyManual),
      dailyRate: prev.dailyRate == null ? null : Number(prev.dailyRate) || 0,
    };
  }

  function blankYear(year) {
    const months = {};
    monthKeys(year).forEach((key, index) => {
      months[key] = emptyMonth();
      stampWorkdays(months[key], year, index);
    });
    return months;
  }

  function attachYear(target, year) {
    target.year = year;
    if (!target.years) target.years = {};
    if (!target.years[year]) target.years[year] = { months: blankYear(year) };
    target.months = target.years[year].months;
    const keys = monthKeys(year);
    if (!keys.includes(target.currentMonth)) target.currentMonth = currentMonthKey(year);
  }

  function defaultOklad(seed) {
    const fromSeed = Number(seed?.salary?.oklad);
    if (Number.isFinite(fromSeed) && fromSeed > 0) return fromSeed;
    return Salary.DEFAULT_OKLAD;
  }

  function buildStateFromSeed(seed, seeded = true) {
    const year = YEARS.includes(Number(seed?.year)) ? Number(seed.year) : YEARS[0];
    const years = {};
    YEARS.forEach((item) => {
      years[item] = {
        months: item === 2026 ? cloneSeedMonths(seed, 2026) : blankYear(item),
      };
      monthKeys(item).forEach((key, index) => {
        if (!years[item].months[key]) years[item].months[key] = emptyMonth();
        stampWorkdays(years[item].months[key], item, index);
      });
    });
    const next = {
      version: 3,
      year,
      currentMonth: currentMonthKey(year),
      seeded,
      oklad: defaultOklad(seed),
      dailyAverage: Number(seed?.dailyAverage) || 0,
      years,
      needsPayroll: true,
      savedAt: new Date().toISOString(),
    };
    attachYear(next, year);
    selectToday(next);
    ensureRentStructure(next);
    dropKvFromDecember(next);
    ensureTitheStructure(next);
    applySheetNovemberCosts(next);
    next.savingsFact = defaultSavingsFact();
    next.utilities = defaultUtilities();
    return next;
  }

  // Вкладка «Бюджет_2026»: колонки «ЗП октябрь» и «Аванс ноябрь» — это ноябрь в приложении.
  const SHEET_NOVEMBER_COSTS = [
    { name: "отложить", plan: 141500, salary: 36468, advance: 105032 },
    { name: "жили были", plan: 60000, salary: 30000, advance: 30000 },
    { name: "ипотека", plan: 38000, salary: 38000, advance: null },
    { name: "инет, связи", plan: 2500, salary: 2500, advance: null },
    { name: "комуналка", plan: 22000, salary: 22000, advance: null },
    { name: "покупки", plan: 10000, salary: 5000, advance: 5000 },
    { name: "отдых", plan: 13000, salary: 6500, advance: 6500 },
    { name: "бензин", plan: 10000, salary: 5000, advance: 5000 },
    { name: "баня", plan: 10000, salary: 5000, advance: 5000 },
    { name: "дети", plan: 12000, salary: 6000, advance: 6000 },
    { name: "карина др", plan: 8000, salary: 8000, advance: null },
    { name: "бассей", plan: 2000, salary: null, advance: 2000 },
  ];

  // Эти суммы относятся к декабрю и были записаны в него по ошибке.
  const SHEET_DECEMBER_MISTAKE = [
    { name: "отложить", salary: null, advance: 60000 },
    { name: "жили были", salary: 30000, advance: 30000 },
    { name: "ипотека", salary: 38000, advance: null },
    { name: "инет, связи", salary: 2500, advance: null },
    { name: "комуналка", salary: 22000, advance: null },
    { name: "покупки", salary: null, advance: 5000 },
    { name: "отдых", salary: null, advance: 5000 },
    { name: "бензин", salary: 5000, advance: 5000 },
    { name: "баня", salary: 1200, advance: 5000 },
  ];

  function expenseNameKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ");
  }

  function writeCostShares(month, specs, { plans = false } = {}) {
    const byName = new Map(specs.map((row) => [row.name, row]));
    month.expenses.forEach((row) => {
      normalizeExpense(row);
      const spec = byName.get(expenseNameKey(row.name));
      if (!spec) return;
      if (plans) {
        row.plan = spec.plan;
        row.planManual = spec.plan != null;
      }
      ["salary", "advance"].forEach((key) => {
        if (spec[key] == null) {
          delete row.shares[key];
          delete row.sharesManual[key];
        } else {
          row.shares[key] = spec[key];
          row.sharesManual[key] = true;
        }
      });
    });
  }

  function undoDecemberCostMistake(month) {
    const byName = new Map(SHEET_DECEMBER_MISTAKE.map((row) => [row.name, row]));
    month.expenses.forEach((row) => {
      normalizeExpense(row);
      const spec = byName.get(expenseNameKey(row.name));
      if (!spec) return;
      ["salary", "advance"].forEach((key) => {
        const written = spec[key];
        if (written == null) return;
        if (Number(row.shares[key]) !== written) return;
        delete row.shares[key];
        delete row.sharesManual[key];
      });
    });
  }

  function applySheetBudget(target, sheet) {
    if (!sheet || target.sheetBudgetThrough === "2026-10") return false;
    const year = target.years?.[2026];
    if (!year?.months) return false;
    Object.entries(sheet).forEach(([key, spec]) => {
      const month = year.months[key];
      if (!month || !spec) return;
      const rent = (month.income || []).find(isRentRow);
      month.income = (spec.income || []).map((row, index) => ({
        id: `inc-${key}-${index}`,
        label: String(row.label || "Прочее"),
        amount: Number(row.amount) || 0,
        manual: true,
      }));
      if (rent) placeRentRow(month, rent);
      month.expenses = (spec.expenses || []).map((row, index) => {
        const shares = {};
        const sharesManual = {};
        (row.cells || []).forEach((cell) => {
          const shareKey = shareKeyForLabel(cell.label);
          shares[shareKey] = cell.amount;
          sharesManual[shareKey] = true;
        });
        return {
          id: `exp-${key}-${index}`,
          name: String(row.name || "Прочее"),
          plan: row.plan == null ? null : Number(row.plan),
          planManual: row.plan != null,
          shares,
          sharesManual,
        };
      });
    });
    ensureTitheStructure(target);
    target.sheetBudgetThrough = "2026-10";
    return true;
  }

  function applySheetSavings(target, sheet) {
    if (!sheet || target.sheetSavingsFact === "2026") return false;
    if (!target.savingsFact?.rows) return false;
    Object.entries(sheet.rows || {}).forEach(([id, amounts]) => {
      if (!amounts || typeof amounts !== "object") return;
      target.savingsFact.rows[id] = { ...amounts };
    });
    if (Array.isArray(sheet.brokerIncomes)) {
      target.savingsFact.brokerIncomes = sheet.brokerIncomes.map((row) => ({
        id: row.id,
        name: String(row.name || "Доход"),
        amounts: { ...(row.amounts || {}) },
      }));
    }
    Object.values(target.savingsFact.rows).forEach((amounts) => {
      Object.keys(amounts).forEach((key) => {
        if (String(key).startsWith("2025-")) delete amounts[key];
      });
    });
    target.sheetSavingsFact = "2026";
    return true;
  }

  function applySheetNovemberCosts(target) {
    if (target.sheetNovemberCosts === "2026-11") return false;
    const november = target.years?.[2026]?.months?.["2026-11"];
    if (!november?.expenses) return false;
    if (target.sheetNovemberCosts === true) {
      const december = target.years?.[2026]?.months?.["2026-12"];
      if (december?.expenses) undoDecemberCostMistake(december);
    }
    writeCostShares(november, SHEET_NOVEMBER_COSTS, { plans: true });
    target.sheetNovemberCosts = "2026-11";
    return true;
  }

  function loadState(seed) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildStateFromSeed(seed, true);
      const parsed = JSON.parse(raw);
      if (!parsed || (parsed.version !== 2 && parsed.version !== 3)) {
        return buildStateFromSeed(seed, true);
      }
      if (parsed.version === 2 && parsed.months) {
        parsed.years = { 2026: { months: parsed.months } };
        parsed.year = 2026;
        parsed.version = 3;
        parsed.needsPayroll = true;
      }
      if (!parsed.years) return buildStateFromSeed(seed, true);
      syncYears(parsed);
      YEARS.forEach((item) => {
        if (!parsed.years[item]) parsed.years[item] = { months: blankYear(item) };
        monthKeys(item).forEach((key, index) => {
          if (!parsed.years[item].months[key]) parsed.years[item].months[key] = emptyMonth();
          stampWorkdays(parsed.years[item].months[key], item, index);
        });
      });
      if (!Number.isFinite(Number(parsed.oklad)) || Number(parsed.oklad) <= 0) {
        parsed.oklad = defaultOklad(seed);
      }
      if (!Number.isFinite(Number(parsed.dailyAverage)) || Number(parsed.dailyAverage) < 0) {
        parsed.dailyAverage = 0;
      }
      const year = YEARS.includes(Number(parsed.year)) ? Number(parsed.year) : YEARS[0];
      attachYear(parsed, year);
      selectToday(parsed);
      return parsed;
    } catch {
      return buildStateFromSeed(seed, true);
    }
  }

  function isAdvanceLabel(label) {
    // \b не работает с кириллицей — якорим пробелом/концом строки
    return /^аванс(?=$|\s|[(\[]|[-–—])/i.test(String(label || "").trim());
  }

  function isSalaryLabel(label) {
    const text = String(label || "").trim();
    if (/^13/i.test(text)) return false;
    if (/13-?\s*я/i.test(text)) return false;
    return /^зп(?=$|\s|[(\[]|[-–—])/i.test(text);
  }

  function isVacationLabel(label) {
    return /^отпускн/i.test(String(label || "").trim());
  }

  function isPayrollLabel(label) {
    return isSalaryLabel(label) || isAdvanceLabel(label) || isVacationLabel(label);
  }

  function isKvLabel(label) {
    return /^кв$/i.test(String(label || "").trim());
  }

  function isBrokerLabel(label) {
    return /^брокер$/i.test(String(label || "").trim());
  }

  function dropKvFromDecember(target) {
    const start = monthSerial("2026-12");
    let changed = false;
    YEARS.forEach((year) => {
      monthKeys(year).forEach((key) => {
        if (monthSerial(key) < start) return;
        const month = target.years?.[year]?.months?.[key];
        if (!month) return;
        const next = (month.income || []).filter((row) => !isKvLabel(row.label));
        if (next.length !== (month.income || []).length) {
          month.income = next;
          changed = true;
        }
        (month.expenses || []).forEach((row) => {
          if (row.shares && Object.prototype.hasOwnProperty.call(row.shares, "name:кв")) {
            delete row.shares["name:кв"];
            changed = true;
          }
          if (row.sharesManual && Object.prototype.hasOwnProperty.call(row.sharesManual, "name:кв")) {
            delete row.sharesManual["name:кв"];
            changed = true;
          }
        });
      });
    });
    return changed;
  }

  function blankExpenseZeros(target) {
    let changed = false;
    YEARS.forEach((year) => {
      Object.values(target.years?.[year]?.months || {}).forEach((month) => {
        (month.expenses || []).forEach((row) => {
          normalizeExpense(row);
          if (row.plan === 0) {
            row.plan = null;
            row.planManual = false;
            changed = true;
          }
          Object.keys(row.shares || {}).forEach((key) => {
            if (Number(row.shares[key]) === 0) {
              delete row.shares[key];
              delete row.sharesManual[key];
              changed = true;
            }
          });
        });
      });
    });
    return changed;
  }

  function freshRentLines() {
    return RENT_LINE_PRESETS.map((item) => ({
      id: item.id,
      label: item.label,
      amount: 0,
      active: true,
    }));
  }

  function normalizeRentLine(line) {
    const amount = Number(line?.amount);
    return {
      id: String(line?.id || uid("rent")),
      label: String(line?.label || "Аренда").trim() || "Аренда",
      amount: Number.isFinite(amount) ? amount : 0,
      active: line?.active !== false,
    };
  }

  function cloneRentLines(lines) {
    return (lines || []).map(normalizeRentLine);
  }

  function isRentRow(row) {
    return row?.kind === "rent" || /^аренда$/i.test(String(row?.label || "").trim());
  }

  function copyIncomeRow(row) {
    const copy = {
      id: row.id || uid("inc"),
      label: String(row.label || "Прочее"),
      amount: Number(row.amount) || 0,
    };
    if (row.manual) copy.manual = true;
    if (isRentRow(row)) {
      copy.kind = "rent";
      copy.label = "Аренда";
      if (Array.isArray(row.lines)) copy.lines = cloneRentLines(row.lines);
      const paidLines = {};
      Object.entries(row.paidLines || {}).forEach(([id, on]) => {
        if (on) paidLines[id] = true;
      });
      if (Object.keys(paidLines).length) copy.paidLines = paidLines;
    }
    return copy;
  }

  function copyExpenseRow(row) {
    const source = {
      ...row,
      shares: { ...(row.shares || {}) },
      sharesManual: { ...(row.sharesManual || {}) },
    };
    normalizeExpense(source);
    const plan = source.plan == null || source.plan === "" ? null : Number(source.plan);
    return {
      id: source.id || uid("exp"),
      name: String(source.name || "Прочее"),
      plan: Number.isFinite(plan) ? plan : null,
      planManual: Boolean(source.planManual),
      shares: source.shares,
      sharesManual: source.sharesManual,
      ...(Object.keys(settledCopy(source)).length ? { settled: settledCopy(source) } : {}),
    };
  }

  function settledCopy(source) {
    const settled = {};
    Object.entries(source.settled || {}).forEach(([key, on]) => {
      if (on && cellValue(source, key) != null) settled[key] = true;
    });
    return settled;
  }

  function copyMonthState(src) {
    if (!src || typeof src !== "object") return emptyMonth();
    return {
      workdays: { ...(src.workdays || {}) },
      income: (src.income || []).map(copyIncomeRow),
      expenses: (src.expenses || [])
        .filter((row) => row && row.name && expenseNameKey(row.name) !== "остаток")
        .map(copyExpenseRow),
    };
  }

  function installImportedYear(target, year, months) {
    rememberYear(year);
    if (!target.years[year]) target.years[year] = { months: {} };
    Object.entries(months || {}).forEach(([key, month]) => {
      if (!/^\d{4}-\d{2}$/.test(key) || yearOf(key) !== year) return;
      target.years[year].months[key] = copyMonthState(month);
    });
    monthKeys(year).forEach((key, index) => {
      if (!target.years[year].months[key]) target.years[year].months[key] = emptyMonth();
      stampWorkdays(target.years[year].months[key], year, index);
    });
  }

  function rentTotal(lines) {
    return (lines || []).reduce((sum, line) => {
      if (line.active === false) return sum;
      return sum + (Number(line.amount) || 0);
    }, 0);
  }

  function syncRentRow(row) {
    row.kind = "rent";
    row.label = "Аренда";
    row.amount = rentTotal(row.lines);
    return row;
  }

  function placeRentRow(month, row) {
    const kv = month.income.findIndex((item) => /^кв$/i.test(String(item.label || "").trim()));
    if (kv >= 0) {
      month.income.splice(kv + 1, 0, row);
      return;
    }
    const at = month.income.findIndex((item) => !isPayrollLabel(item.label));
    if (at < 0) month.income.push(row);
    else month.income.splice(at, 0, row);
  }

  function ensureRentRow(month, defaults) {
    const template = defaults && defaults.length ? defaults : freshRentLines();
    let row = month.income.find(isRentRow);
    if (!row) {
      row = {
        id: uid("inc"),
        kind: "rent",
        label: "Аренда",
        amount: 0,
        lines: cloneRentLines(template),
      };
      placeRentRow(month, row);
      return syncRentRow(row);
    }
    row.kind = "rent";
    if (!Array.isArray(row.lines)) {
      row.lines = cloneRentLines(template);
      const carried = Number(row.amount) || 0;
      if (carried && carried !== rentTotal(row.lines) && row.lines[0]) {
        row.lines[0].amount = carried;
        row.lines[0].active = true;
      }
    } else {
      row.lines = cloneRentLines(row.lines);
    }
    return syncRentRow(row);
  }

  function ensureRentStructure(target) {
    let changed = false;
    if (!Array.isArray(target.rentDefaults)) {
      target.rentDefaults = freshRentLines();
      changed = true;
    } else {
      const normalized = cloneRentLines(target.rentDefaults);
      if (JSON.stringify(normalized) !== JSON.stringify(target.rentDefaults)) changed = true;
      target.rentDefaults = normalized;
    }
    YEARS.forEach((year) => {
      monthKeys(year).forEach((key) => {
        const month = target.years?.[year]?.months?.[key];
        if (!month) return;
        const existing = month.income.find(isRentRow);
        const before = existing ? JSON.stringify(existing.lines ?? null) : null;
        ensureRentRow(month, target.rentDefaults);
        const row = month.income.find(isRentRow);
        if (before !== JSON.stringify(row.lines)) changed = true;
      });
    });
    return changed;
  }

  const RENT_SAVINGS_LINES = [
    ["rent_gaz", "flat1"],
    ["rent_quiet", "flat2"],
    ["rent_garage", "garage"],
  ];

  function backfillRentFromSavings(target) {
    if (target.rentFilledFromSavings) return false;
    const saved = target.savingsFact?.rows;
    if (!saved) return false;
    let changed = false;
    YEARS.forEach((year) => {
      monthKeys(year).forEach((key) => {
        const month = target.years?.[year]?.months?.[key];
        if (!month) return;
        const row = ensureRentRow(month, target.rentDefaults);
        let monthChanged = false;
        RENT_SAVINGS_LINES.forEach(([lineId, savingsId]) => {
          const stored = Number(saved[savingsId]?.[key]);
          if (!Number.isFinite(stored) || stored === 0) return;
          const line = row.lines.find((item) => item.id === lineId);
          if (!line || Number(line.amount)) return;
          line.amount = stored;
          line.active = true;
          monthChanged = true;
        });
        if (monthChanged) {
          syncRentRow(row);
          changed = true;
        }
      });
    });
    target.rentFilledFromSavings = true;
    return changed;
  }

  function monthSerial(key) {
    return yearOf(key) * 12 + monthIndex(key);
  }

  function monthByKey(key) {
    return state.years?.[yearOf(key)]?.months?.[key] || null;
  }

  function forMonthsFrom(fromKey, fn) {
    const start = monthSerial(fromKey);
    YEARS.forEach((year) => {
      monthKeys(year).forEach((key) => {
        if (monthSerial(key) < start) return;
        const month = state.years?.[year]?.months?.[key];
        if (month) fn(month, key);
      });
    });
  }

  function rememberRentLine(line) {
    const normalized = normalizeRentLine(line);
    const found = state.rentDefaults.find((item) => item.id === normalized.id);
    if (found) {
      found.label = normalized.label;
      found.amount = normalized.amount;
      found.active = normalized.active;
      return;
    }
    state.rentDefaults.push(normalized);
  }

  function paintRentRow() {
    const row = activeMonth()?.income?.find(isRentRow);
    if (!row) return;
    const amount = document.querySelector("#incomeBody [data-rent-amount]");
    if (amount) amount.value = formatEditable(row.amount);
    refreshTotalsOnly();
  }

  function patchRentLine(fromKey, lineId, patch) {
    forMonthsFrom(fromKey, (month) => {
      const row = ensureRentRow(month, state.rentDefaults);
      let line = row.lines.find((item) => item.id === lineId);
      if (!line) {
        line = normalizeRentLine({ id: lineId, label: "Аренда", amount: 0, active: true });
        row.lines.push(line);
      }
      if (patch.label != null) line.label = String(patch.label).trim() || "Аренда";
      if (patch.amount != null) line.amount = Number(patch.amount) || 0;
      if (patch.active != null) line.active = Boolean(patch.active);
      syncRentRow(row);
    });
    const source = monthByKey(fromKey);
    const line = source && source.income.find(isRentRow)?.lines.find((item) => item.id === lineId);
    if (line) rememberRentLine(line);
    state.seeded = false;
    saveState();
    paintRentRow();
    renderSavings();
    if (els.rentDialog.open) renderRentMenu();
  }

  function addRentLine(fromKey) {
    const line = normalizeRentLine({
      id: uid("rent"),
      label: "Новая аренда",
      amount: 0,
      active: true,
    });
    forMonthsFrom(fromKey, (month) => {
      const row = ensureRentRow(month, state.rentDefaults);
      row.lines.push(normalizeRentLine(line));
      syncRentRow(row);
    });
    rememberRentLine(line);
    state.seeded = false;
    saveState();
    paintRentRow();
    renderSavings();
    renderRentMenu();
    const names = els.rentList.querySelectorAll(".name-input");
    const last = names[names.length - 1];
    if (last) {
      last.focus({ preventScroll: true });
      selectField(last);
      scrollFieldIntoView(last);
    }
  }

  function removeRentLine(fromKey, lineId) {
    forMonthsFrom(fromKey, (month) => {
      const row = month.income.find(isRentRow);
      if (!row?.lines) return;
      row.lines = row.lines.filter((item) => item.id !== lineId);
      syncRentRow(row);
    });
    state.rentDefaults = state.rentDefaults.filter((item) => item.id !== lineId);
    state.seeded = false;
    saveState();
    paintRentRow();
    renderSavings();
    renderRentMenu();
  }

  function rentPayableLines(row) {
    return (row.lines || []).filter((line) => line.active !== false && Number(line.amount));
  }

  function rentIsPaid(row) {
    const lines = rentPayableLines(row);
    return lines.length > 0 && lines.every((line) => row.paidLines?.[line.id]);
  }

  function toggleRentPaid(row) {
    const lines = rentPayableLines(row);
    if (!lines.length) return false;
    const on = !rentIsPaid(row);
    if (!row.paidLines) row.paidLines = {};
    lines.forEach((line) => {
      if (on) row.paidLines[line.id] = true;
      else delete row.paidLines[line.id];
    });
    return true;
  }

  function toggleRentLinePaid(row, lineId) {
    const line = (row.lines || []).find((item) => item.id === lineId);
    if (!line || line.active === false || !Number(line.amount)) return false;
    if (!row.paidLines) row.paidLines = {};
    if (row.paidLines[lineId]) delete row.paidLines[lineId];
    else row.paidLines[lineId] = true;
    return true;
  }

  function renderRentMenu() {
    const key = rentMenuKey || state.currentMonth;
    const month = monthByKey(key);
    if (!month) return;
    const row = ensureRentRow(month, state.rentDefaults);
    els.rentList.innerHTML = "";
    row.lines.forEach((line) => {
      const item = document.createElement("div");
      item.className = `rent-line${line.active ? "" : " is-off"}`;
      item.innerHTML = `
        <input type="checkbox" aria-label="Учитывать в доходе" ${line.active ? "checked" : ""} />
        <input class="name-input" type="text" value="${escapeAttr(line.label)}" aria-label="Название" autocomplete="off" />
        <input class="num-input${row.paidLines?.[line.id] ? " is-settled" : ""}" type="text" inputmode="decimal" enterkeyhint="done" value="${formatEditable(line.amount)}" aria-label="Сумма" title="${escapeAttr(Number(line.amount) ? settledTitle(Boolean(row.paidLines?.[line.id])) : "Сумма")}" autocomplete="off" autocorrect="off" spellcheck="false" />
        <button type="button" class="icon-x" aria-label="Удалить строку">×</button>
      `;
      const [check, name, amount, remove] = item.children;
      check.addEventListener("change", () => patchRentLine(key, line.id, { active: check.checked }));
      name.addEventListener("change", () => patchRentLine(key, line.id, { label: name.value }));
      amount.addEventListener("change", () => patchRentLine(key, line.id, { amount: parseNumber(amount.value) || 0 }));
      armNoSelect(amount);
      amount.addEventListener("dblclick", (event) => {
        event.preventDefault();
        const current = monthByKey(key)?.income?.find(isRentRow);
        if (!current || !toggleRentLinePaid(current, line.id)) return;
        state.seeded = false;
        saveState();
        releaseSelection(amount);
        renderRentMenu();
        paintRentRow();
        renderIncome(monthByKey(state.currentMonth));
      });
      remove.addEventListener("click", () => removeRentLine(key, line.id));
      els.rentList.appendChild(item);
    });
    els.rentSum.textContent = money(rentTotal(row.lines));
  }

  function openRentMenu() {
    rentMenuKey = state.currentMonth;
    renderRentMenu();
    if (typeof els.rentDialog.showModal === "function") {
      if (!els.rentDialog.open) els.rentDialog.showModal();
    } else {
      els.rentDialog.setAttribute("open", "");
    }
    syncDialogScrollLock();
    const firstAmount = els.rentList.querySelector(".num-input");
    if (firstAmount) {
      queueMicrotask(() => {
        firstAmount.focus({ preventScroll: true });
        selectField(firstAmount);
        scrollFieldIntoView(firstAmount);
      });
    }
  }

  function closeRentMenu() {
    rentMenuKey = null;
    if (typeof els.rentDialog.close === "function" && els.rentDialog.open) els.rentDialog.close();
    else els.rentDialog.removeAttribute("open");
    syncDialogScrollLock();
  }

  function dedupePayrollRows(month) {
    const seen = { salary: false, advance: false, vacation: false };
    month.income = month.income.filter((row) => {
      const kind = isSalaryLabel(row.label)
        ? "salary"
        : isAdvanceLabel(row.label)
          ? "advance"
          : isVacationLabel(row.label)
            ? "vacation"
            : "";
      if (!kind) return true;
      if (seen[kind]) return false;
      seen[kind] = true;
      return true;
    });
  }

  function ensureIncomeRow(month, kind, label) {
    const match = month.income.find((row) => {
      if (kind === "advance") return isAdvanceLabel(row.label);
      if (kind === "vacation") return isVacationLabel(row.label);
      return isSalaryLabel(row.label);
    });
    if (match) {
      match.label = label;
      return match;
    }
    const row = { id: uid("inc"), label, amount: 0, manual: false };
    const order = ["salary", "advance", "vacation"];
    const slot = order.indexOf(kind);
    let insertAt = month.income.findIndex((row) => {
      const rowKind = isSalaryLabel(row.label) ? 0 : isAdvanceLabel(row.label) ? 1 : isVacationLabel(row.label) ? 2 : 3;
      return rowKind > slot;
    });
    if (insertAt < 0) month.income.push(row);
    else month.income.splice(insertAt, 0, row);
    return row;
  }

  function workedParts(month) {
    const days = month.workdays;
    if (days.partial) {
      return {
        first: Math.min(Math.max(0, Number(days.first) || 0), days.calendarFirst),
        second: Math.min(Math.max(0, Number(days.second) || 0), days.calendarSecond),
      };
    }
    return { first: days.calendarFirst, second: days.calendarSecond };
  }

  function monthBag(target, year, index) {
    if (index < 0) return null;
    return target.years?.[year]?.months?.[`${year}-${String(index + 1).padStart(2, "0")}`] || null;
  }

  function writeAmount(row, amount, force) {
    if (!row) return;
    if (row.manual && !force) return;
    row.amount = amount;
    if (force) row.manual = false;
  }

  /**
   * Аванс месяца — доля зарплаты за рабочие дни 1–15.
   * Зарплата в месяце — доля предыдущего месяца за дни с 16-го.
   * Отпускные — дни отпуска × средний заработок в день.
   */
  function applySalaryToMonths(target = state, { silent = false, force = false } = {}) {
    if (!target?.years) return;
    const net = Salary.calculateFromOklad(target.oklad).net;
    const dailyFor = (year) => {
      let sum = 0;
      for (let index = 0; index < 12; index += 1) sum += BudgetCalendar.parts(year, index).total;
      const average = sum / 12;
      return average ? Salary.roundMoney(net / average) : 0;
    };

    const share = (month, year) => {
      if (!month) return null;
      const parts = workedParts(month);
      const days = month.workdays;
      const rate = days.vacationOn
        ? (days.dailyManual ? Number(days.dailyRate) || 0 : dailyFor(year))
        : 0;
      const vacationDays = days.vacationOn ? Number(days.vacation) || 0 : 0;
      return {
        advance: Salary.payForDays(net, days.total, parts.first),
        salary: Salary.payForDays(net, days.total, parts.second),
        vacation: Salary.roundRuble(rate * vacationDays),
      };
    };

    YEARS.forEach((year) => {
      monthKeys(year).forEach((key, index) => {
        const month = target.years[year].months[key];
        if (!month) return;
        dedupePayrollRows(month);
        const own = share(month, year);
        const prev = index > 0
          ? share(monthBag(target, year, index - 1), year)
          : share(monthBag(target, year - 1, 11), year - 1);

        const salaryRow = ensureIncomeRow(
          month,
          "salary",
          index === 0 ? "ЗП декабря" : `ЗП ${MONTH_GENITIVE[index - 1]}`
        );
        if (prev) writeAmount(salaryRow, prev.salary, force);

        const advanceRow = ensureIncomeRow(month, "advance", `Аванс ${MONTH_GENITIVE[index]}`);
        writeAmount(advanceRow, own.advance, force);

        if (month.workdays.vacationOn) {
          const vacationRow = ensureIncomeRow(month, "vacation", "Отпускные");
          writeAmount(vacationRow, own.vacation, force);
        } else {
          month.income = month.income.filter((row) => !isVacationLabel(row.label) || row.manual);
        }
        dedupePayrollRows(month);
      });
    });

    if (!silent) target.seeded = false;
  }

  function saveState() {
    state.savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function money(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString("ru-RU", {
      minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    const sign = n < 0 ? "−" : "";
    return `${sign}${formatted} ₽`;
  }

  function parseNumber(raw) {
    const text = String(raw ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  function isPlainZero(value) {
    return /^-?0(?:[.,]0*)?$/.test(String(value).trim());
  }

  function isNumericField(el) {
    return el instanceof HTMLInputElement
      && el.type === "text"
      && !el.readOnly
      && (el.classList.contains("num-input") || el.inputMode === "numeric" || el.inputMode === "decimal");
  }

  function selectField(input) {
    if (!(input instanceof HTMLInputElement) || input.readOnly) return;
    const run = () => {
      try {
        const len = input.value.length;
        if (typeof input.setSelectionRange === "function") input.setSelectionRange(0, len);
        else input.select();
      } catch {
        /* iOS может отклонить select, пока клавиатура ещё поднимается */
      }
    };
    if (IOS_WEBKIT || COARSE_POINTER) {
      window.setTimeout(run, 10);
      return;
    }
    run();
  }

  function armNoSelect(input) {
    input.addEventListener("mousedown", (event) => {
      if (event.detail > 1 && String(input.value || "").trim()) event.preventDefault();
    });
  }

  function releaseSelection(input) {
    const drop = () => {
      if (input instanceof HTMLInputElement && typeof input.setSelectionRange === "function") {
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (e) {}
      }
      const selection = window.getSelection();
      if (selection && selection.rangeCount) selection.removeAllRanges();
    };
    drop();
    window.setTimeout(drop, 0);
  }

  function scrollFieldIntoView(el) {
    if (!(el instanceof HTMLElement)) return;
    window.clearTimeout(focusScrollTimer);
    focusScrollTimer = window.setTimeout(() => {
      const topbar = document.querySelector(".topbar");
      const topPad = (topbar ? topbar.getBoundingClientRect().height : 56) + 12;
      const vv = window.visualViewport;
      const viewTop = vv ? vv.offsetTop : 0;
      const viewH = vv ? vv.height : window.innerHeight;
      const rect = el.getBoundingClientRect();
      const above = rect.top < viewTop + topPad;
      const below = rect.bottom > viewTop + viewH - 24;
      if (!above && !below) return;
      try {
        el.scrollIntoView({ block: above ? "start" : "end", inline: "nearest", behavior: "smooth" });
      } catch {
        el.scrollIntoView(true);
      }
    }, IOS_WEBKIT ? 280 : 80);
  }

  function lockBodyScroll() {
    if (document.body.classList.contains("is-dialog-open")) return;
    bodyScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("is-dialog-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${bodyScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockBodyScroll() {
    if (!document.body.classList.contains("is-dialog-open")) return;
    document.body.classList.remove("is-dialog-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, bodyScrollY);
  }

  function syncDialogScrollLock() {
    const open = Boolean(
      (els.settingsDialog && els.settingsDialog.open)
      || (els.rentDialog && els.rentDialog.open)
    );
    if (open) lockBodyScroll();
    else unlockBodyScroll();
  }

  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      scrollFieldIntoView(target);
    }
    const input = target;
    if (!isNumericField(input)) return;
    if (!isPlainZero(input.value)) {
      delete input.dataset.zeroArmed;
      return;
    }
    input.dataset.zeroArmed = "1";
    selectField(input);
  });

  document.addEventListener("mouseup", (event) => {
    if (COARSE_POINTER || event.detail === 0) return;
    const input = event.target;
    if (!isNumericField(input) || input.dataset.zeroArmed !== "1") return;
    event.preventDefault();
  });

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (!isNumericField(input) || input.dataset.keepEmpty === "1") return;
    const raw = input.value;
    if (raw.trim() === "") {
      if (input.closest("#expenseTable, #savingsTable, #utilitiesTable")) return;
      input.value = "0";
      input.dataset.zeroArmed = "1";
      selectField(input);
      return;
    }
    if (input.dataset.zeroArmed === "1" && /^0\d/.test(raw)) input.value = raw.slice(1);
    delete input.dataset.zeroArmed;
  });

  function monthLabel(key) {
    const m = Number(key.slice(5, 7));
    return `${MONTHS_RU[m - 1]} ${yearOf(key)}`;
  }

  function activeMonth() {
    return state.months[state.currentMonth];
  }

  function columnSum(month, key) {
    return month.expenses.reduce((sum, row) => {
      normalizeExpense(row);
      const value = cellValue(row, key);
      return sum + (Number(value) || 0);
    }, 0);
  }

  function totals(month) {
    const income = month.income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const plan = columnSum(month, "plan");
    const spent = month.expenses.reduce((sum, row) => {
      return sum + Object.values(row.shares || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    }, 0);
    return { income, plan, spent, fact: spent, remain: income - plan };
  }

  function renderYearNav() {
    if (!els.yearNav) return;
    els.yearNav.innerHTML = "";
    YEARS.forEach((year) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `month-chip${year === state.year ? " active" : ""}`;
      btn.textContent = String(year);
      btn.setAttribute("aria-pressed", year === state.year ? "true" : "false");
      btn.addEventListener("click", () => {
        attachYear(state, year);
        saveState();
        render();
      });
      els.yearNav.appendChild(btn);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "month-chip year-add";
    remove.textContent = "−";
    remove.setAttribute("aria-label", "Удалить самый дальний год");
    remove.disabled = YEARS.length < 2;
    remove.addEventListener("click", () => removeFarthestYear());
    els.yearNav.appendChild(remove);
    const add = document.createElement("button");
    add.type = "button";
    add.className = "month-chip year-add";
    add.textContent = "+";
    add.setAttribute("aria-label", "Добавить следующий год");
    add.addEventListener("click", () => addNextYear());
    els.yearNav.appendChild(add);
  }

  function renderMonthNav() {
    els.monthNav.innerHTML = "";
    monthKeys().forEach((key, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `month-chip${key === state.currentMonth ? " active" : ""}`;
      btn.textContent = MONTHS_SHORT[index];
      btn.setAttribute("aria-pressed", key === state.currentMonth ? "true" : "false");
      btn.addEventListener("click", () => {
        state.currentMonth = key;
        saveState();
        render();
      });
      els.monthNav.appendChild(btn);
    });
    requestAnimationFrame(() => scrollActiveMonthIntoView("auto"));
  }

  function scrollActiveMonthIntoView(behavior = "smooth") {
    const nav = els.monthNav;
    const active = nav?.querySelector(".month-chip.active");
    if (!nav || !active) return;
    // На телефоне сетка без скролла: scrollIntoView сдвигает всю страницу.
    if (nav.scrollWidth <= nav.clientWidth + 2) return;
    active.scrollIntoView({ inline: "center", block: "nearest", behavior });
  }

  function unlockPayroll(month, kinds) {
    month.income.forEach((row) => {
      const kind = isSalaryLabel(row.label)
        ? "salary"
        : isAdvanceLabel(row.label)
          ? "advance"
          : isVacationLabel(row.label)
            ? "vacation"
            : "";
      if (kinds.includes(kind)) row.manual = false;
    });
  }

  function neighborMonth(year, index, step) {
    const date = new Date(year, index + step, 1);
    const nextYear = date.getFullYear();
    const nextIndex = date.getMonth();
    return state.years?.[nextYear]?.months?.[`${nextYear}-${String(nextIndex + 1).padStart(2, "0")}`] || null;
  }

  function bindWorkdays(month) {
    const days = month.workdays;
    const year = yearOf(state.currentMonth);
    const index = monthIndex(state.currentMonth);
    els.workTotalView.textContent = String(days.total);
    els.workSplitView.textContent = `1–15: ${days.calendarFirst} дн. · с 16-го: ${days.calendarSecond} дн.`;
    const suggestedDaily = () => {
      let sum = 0;
      for (let i = 0; i < 12; i += 1) sum += BudgetCalendar.parts(year, i).total;
      const net = Salary.calculateFromOklad(state.oklad).net;
      return sum ? Salary.roundMoney((net * 12) / sum) : 0;
    };
    els.workPartial.checked = Boolean(days.partialChosen);
    els.partialBox.hidden = !days.partialChosen;
    els.workFirst.value = days.partialChosen ? String(days.first ?? "") : "";
    els.workSecond.value = days.partialChosen ? String(days.second ?? "") : "";
    els.workVacationOn.checked = Boolean(days.vacationOn);
    els.vacationBox.hidden = !days.vacationOn;
    els.workVacation.value = days.vacationOn ? String(days.vacation || "") : "";
    els.workDaily.value = days.vacationOn
      ? formatEditable(days.dailyManual ? days.dailyRate : suggestedDaily())
      : "";

    const refreshPay = () => {
      unlockPayroll(month, ["advance", "vacation"]);
      const next = neighborMonth(year, index, 1);
      if (next) unlockPayroll(next, ["salary"]);
      applySalaryToMonths(state);
      saveState();
      renderIncome(activeMonth());
      refreshTotalsOnly();
    };

    els.workPartial.onchange = () => {
      days.partialChosen = els.workPartial.checked;
      days.partial = days.partialChosen;
      els.partialBox.hidden = !days.partialChosen;
      if (days.partialChosen) {
        days.first = days.calendarFirst;
        days.second = days.calendarSecond;
        els.workFirst.value = String(days.first);
        els.workSecond.value = String(days.second);
      }
      refreshPay();
    };
    els.workFirst.oninput = () => {
      const value = Math.max(0, parseNumber(els.workFirst.value) || 0);
      days.first = Math.min(value, days.calendarFirst);
      refreshPay();
    };
    els.workSecond.oninput = () => {
      const value = Math.max(0, parseNumber(els.workSecond.value) || 0);
      days.second = Math.min(value, days.calendarSecond);
      refreshPay();
    };
    els.workVacationOn.onchange = () => {
      days.vacationOn = els.workVacationOn.checked;
      els.vacationBox.hidden = !days.vacationOn;
      if (days.vacationOn && !days.dailyManual) {
        days.dailyRate = suggestedDaily();
        els.workDaily.value = formatEditable(days.dailyRate);
      }
      els.workVacation.value = days.vacation ? String(days.vacation) : "";
      refreshPay();
    };
    els.workVacation.oninput = () => {
      days.vacation = Math.max(0, parseNumber(els.workVacation.value) || 0);
      refreshPay();
    };
    els.workDaily.oninput = () => {
      days.dailyManual = true;
      days.dailyRate = Math.max(0, parseNumber(els.workDaily.value) || 0);
      refreshPay();
    };
  }

  function lineAmount(calc, key) {
    const line = calc.lines.find((item) => item.key === key);
    return line ? line.amount : 0;
  }

  function renderSettingsCalc(oklad) {
    const calc = Salary.calculateFromOklad(oklad);
    els.regionalAmount.textContent = money(lineAmount(calc, "regional"));
    els.northernAmount.textContent = money(lineAmount(calc, "northern"));
    els.basePayAmount.textContent = money(lineAmount(calc, "basePay"));
    els.grossAmount.textContent = money(calc.grossTaxable);
    els.netAmount.textContent = money(calc.net);
  }

  function openSettings() {
    if (!state) return;
    settingsDraftOklad = state.oklad;
    els.settingsOklad.value = formatEditable(state.oklad);
    try {
      renderSettingsCalc(state.oklad);
    } catch (err) {
      console.error(err);
      els.regionalAmount.textContent = "—";
      els.northernAmount.textContent = "—";
      els.basePayAmount.textContent = "—";
      els.grossAmount.textContent = "—";
      els.netAmount.textContent = "—";
    }
    if (typeof els.settingsDialog.showModal === "function") {
      if (!els.settingsDialog.open) els.settingsDialog.showModal();
    } else {
      els.settingsDialog.setAttribute("open", "");
    }
    syncDialogScrollLock();
    queueMicrotask(() => {
      els.settingsOklad.focus({ preventScroll: true });
      selectField(els.settingsOklad);
      scrollFieldIntoView(els.settingsOklad);
    });
  }

  function closeSettings() {
    if (typeof els.settingsDialog.close === "function" && els.settingsDialog.open) {
      els.settingsDialog.close();
    } else {
      els.settingsDialog.removeAttribute("open");
    }
    syncDialogScrollLock();
  }

  function commitSettings() {
    const parsed = parseNumber(els.settingsOklad.value);
    if (parsed == null || parsed <= 0) {
      alert("Укажите корректный оклад.");
      return false;
    }
    state.oklad = parsed;
    YEARS.forEach((year) => {
      Object.values(state.years[year].months).forEach((month) => {
        unlockPayroll(month, ["salary", "advance", "vacation"]);
      });
    });
    applySalaryToMonths(state);
    saveState();
    render();
    return true;
  }

  let paintedKey = null;
  let animateRows = false;

  function markFresh(selector, index) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.animationDelay = `${index * 0.07}s`;
    el.classList.remove("is-fresh");
    void el.offsetWidth;
    el.classList.add("is-fresh");
  }

  function paintText(el, text) {
    if (!el || el.textContent === text) return;
    el.textContent = text;
    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");
  }

  function renderIncome(month) {
    els.incomeBody.innerHTML = "";
    month.income.forEach((row, index) => {
      const payroll = isPayrollLabel(row.label);
      const tr = document.createElement("tr");
      const rent = isRentRow(row);
      if (payroll) tr.classList.add("payroll-derived");
      if (animateRows) {
        tr.classList.add("row-in");
        tr.style.animationDelay = `${Math.min(index, 8) * 0.045}s`;
      }
      if (rent) {
        tr.classList.add("rent-row");
        tr.innerHTML = `
          <td>
            <input class="name-input" type="text" value="Аренда" data-act="rent" readonly title="Нажмите, чтобы изменить" />
            <span class="rent-hint">Нажмите, чтобы изменить</span>
          </td>
          <td class="num"><input class="num-input${rentIsPaid(row) ? " is-settled" : ""}" type="text" inputmode="decimal" value="${formatEditable(row.amount)}" data-rent-amount readonly title="${escapeAttr(rentIsPaid(row) ? "Квартплата внесена. Двойное нажатие снимет отметку" : "Нажмите, чтобы изменить. Двойное нажатие отмечает, что квартплата внесена")}" /></td>
          <td class="actions-col"></td>
        `;
        tr.querySelector("[data-act=rent]").addEventListener("click", openRentMenu);
        const rentAmount = tr.querySelector("[data-rent-amount]");
        let rentOpenTimer = 0;
        rentAmount.addEventListener("click", (event) => {
          if (event.detail > 1) return;
          clearTimeout(rentOpenTimer);
          rentOpenTimer = setTimeout(openRentMenu, 240);
        });
        armNoSelect(rentAmount);
        rentAmount.addEventListener("dblclick", (event) => {
          event.preventDefault();
          clearTimeout(rentOpenTimer);
          if (!toggleRentPaid(row)) return;
          paintSettled(rentAmount, rentIsPaid(row));
          rentAmount.title = rentIsPaid(row)
            ? "Квартплата внесена. Двойное нажатие снимет отметку"
            : "Нажмите, чтобы изменить. Двойное нажатие отмечает, что квартплата внесена";
          state.seeded = false;
          saveState();
          releaseSelection(rentAmount);
          if (els.rentDialog.open) renderRentMenu();
        });
        els.incomeBody.appendChild(tr);
        return;
      }
      if (isBrokerLabel(row.label)) {
        const sum = brokerIncomeSum(state.currentMonth);
        row.amount = sum || 0;
        row.derived = "broker";
        delete row.manual;
        tr.classList.add("payroll-derived");
        tr.innerHTML = `
          <td><input class="name-input" type="text" value="Брокер" readonly /></td>
          <td class="num"><input class="num-input" type="text" readonly data-broker="1" data-blank="1" value="${sum == null ? "" : formatEditable(sum)}" placeholder="—" title="Сумма доходов брокерского счёта" /></td>
          <td class="actions-col"></td>
        `;
        els.incomeBody.appendChild(tr);
        return;
      }
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.label)}" data-field="label" ${payroll ? "readonly" : ""} /></td>
        <td class="num"><input class="num-input" type="text" inputmode="decimal" enterkeyhint="done" value="${formatEditable(row.amount)}" data-field="amount" title="${payroll ? "Можно поправить вручную" : ""}" autocomplete="off" autocorrect="off" spellcheck="false" /></td>
        <td class="actions-col">${payroll ? "" : `<button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button>`}</td>
      `;
      const labelInput = tr.querySelector('[data-field="label"]');
      const amountInput = tr.querySelector('[data-field="amount"]');
      amountInput.addEventListener("change", () => {
        row.amount = parseNumber(amountInput.value) || 0;
        row.manual = true;
        amountInput.value = formatEditable(row.amount);
        state.seeded = false;
        saveState();
        refreshTotalsOnly();
      });
      if (!payroll) {
        labelInput.addEventListener("change", () => {
          row.label = labelInput.value.trim() || "Прочее";
          state.seeded = false;
          saveState();
        });
        tr.querySelector('[data-act="del"]').addEventListener("click", () => {
          month.income = month.income.filter((r) => r.id !== row.id);
          state.seeded = false;
          saveState();
          render();
        });
      }
      els.incomeBody.appendChild(tr);
    });
  }

  function shareInput(row, key) {
    const value = cellValue(row, key);
    const shown = value == null ? "" : formatEditable(value);
    const settled = expenseSettled(row, key);
    const title = value == null ? "" : ` title="${escapeAttr(settledTitle(settled))}"`;
    return `<input class="num-input${settled ? " is-settled" : ""}" type="text" inputmode="decimal" enterkeyhint="done" value="${shown}" placeholder="—" data-key="${escapeAttr(key)}"${title} autocomplete="off" autocorrect="off" spellcheck="false" />`;
  }

  function settledTitle(on) {
    return on
      ? "Внесено. Двойное нажатие снимет отметку"
      : "Двойное нажатие отмечает, что сумма уже внесена";
  }

  function expenseSettled(row, key) {
    return cellValue(row, key) != null && Boolean(row.settled?.[key]);
  }

  function toggleExpenseSettled(row, key) {
    if (cellValue(row, key) == null) return false;
    if (!row.settled) row.settled = {};
    if (row.settled[key]) delete row.settled[key];
    else row.settled[key] = true;
    return true;
  }

  function paintSettled(input, on) {
    input.classList.toggle("is-settled", on);
    input.title = settledTitle(on);
  }

  function writeExpenseCell(row, key, parsed) {
    if (key === "plan") {
      row.plan = parsed;
      row.planManual = parsed != null;
    } else {
      if (parsed == null) delete row.shares[key];
      else row.shares[key] = parsed;
      row.sharesManual[key] = parsed != null;
    }
    if (parsed == null && row.settled) delete row.settled[key];
  }

  function expenseColumnKeys(month) {
    return ["plan", ...incomeColumns(month).map((col) => col.key)];
  }

  function fillExpensesFromPrevious(onlyKey) {
    const month = activeMonth();
    const keys = onlyKey ? [onlyKey] : expenseColumnKeys(month);
    let changed = false;
    month.expenses.forEach((row) => {
      normalizeExpense(row);
      keys.forEach((key) => {
        if (cellValue(row, key) != null) return;
        const suggested = suggestionFor(row, key);
        if (suggested == null) return;
        writeExpenseCell(row, key, suggested);
        changed = true;
      });
    });
    if (!changed) return;
    state.seeded = false;
    saveState();
    render();
  }

  function clearAllExpenses() {
    const month = activeMonth();
    month.expenses.forEach((row) => {
      normalizeExpense(row);
      writeExpenseCell(row, "plan", null);
      Object.keys(row.shares || {}).forEach((key) => writeExpenseCell(row, key, null));
      row.settled = {};
    });
    state.seeded = false;
    saveState();
    render();
  }

  function renderExpenses(month) {
    const columns = incomeColumns(month);
    const incomeTotal = month.income.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    els.expenseHead.innerHTML = `
      <tr>
        <th>Категория</th>
        <th class="num plan-col">
          <button type="button" class="col-fill" data-fill-key="plan" title="Заполнить столбец из прошлого месяца">
            <span class="col-title">План</span>
            <span class="col-sum" data-sum="plan">${money(incomeTotal)}</span>
          </button>
        </th>
        ${columns.map((col) => `
          <th class="num">
            <button type="button" class="col-fill" data-fill-key="${escapeAttr(col.key)}" title="Заполнить столбец из прошлого месяца">
              <span class="col-title">${escapeAttr(col.label)}</span>
              <span class="col-sum" data-income-id="${escapeAttr(col.id)}">${money(col.amount)}</span>
            </button>
          </th>
        `).join("")}
        <th class="actions-col"></th>
      </tr>
    `;
    let foot = document.getElementById("expenseFoot");
    if (!foot) {
      foot = document.createElement("tfoot");
      foot.id = "expenseFoot";
      els.expenseHead.parentElement.appendChild(foot);
    }
    foot.innerHTML = `
      <tr>
        <th class="remain-label">Остаток</th>
        <th class="num remain-value plan-col" data-remain="plan"></th>
        ${columns.map((col) => `<th class="num remain-value" data-remain-id="${escapeAttr(col.id)}"></th>`).join("")}
        <th></th>
      </tr>
    `;
    els.expenseBody.innerHTML = "";
    month.expenses.forEach((row, index) => {
      normalizeExpense(row);
      const tr = document.createElement("tr");
      tr.dataset.exp = row.id;
      if (animateRows) {
        tr.classList.add("row-in");
        tr.style.animationDelay = `${Math.min(index, 12) * 0.04}s`;
      }
      if (isSetAsideRow(row)) tr.classList.add("set-aside-row");
      const asideHint = isSetAsideRow(row)
        ? `<span class="set-aside-hint">${escapeAttr(setAsideHintText())}</span>`
        : "";
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.name)}" data-field="name" />${asideHint}</td>
        <td class="num plan-col">${shareInput(row, "plan")}</td>
        ${columns.map((col) => `<td class="num">${shareInput(row, col.key)}</td>`).join("")}
        <td class="actions-col"><button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button></td>
      `;
      tr.querySelector('[data-field="name"]').addEventListener("change", (event) => {
        row.name = event.target.value.trim() || "Прочее";
        state.seeded = false;
        saveState();
        render();
      });
      tr.querySelectorAll("[data-key]").forEach((input) => {
        const key = input.dataset.key;
        let arming = false;

        const commitCell = (parsed) => {
          const stored = parsed == null || parsed === 0 ? null : parsed;
          writeExpenseCell(row, key, stored);
          input.value = stored == null ? "" : formatEditable(stored);
          input.classList.remove("is-suggestion");
          delete input.dataset.pending;
          paintSettled(input, expenseSettled(row, key));
          if (stored == null) input.removeAttribute("title");
          state.seeded = false;
          saveState();
          refreshTotalsOnly();
        };

        input.addEventListener("dblclick", (event) => {
          if (!toggleExpenseSettled(row, key)) return;
          event.preventDefault();
          paintSettled(input, expenseSettled(row, key));
          state.seeded = false;
          saveState();
          releaseSelection(input);
        });
        armNoSelect(input);

        input.addEventListener("focus", () => {
          if (cellValue(row, key) != null) return;
          const suggested = suggestionFor(row, key);
          if (suggested == null) return;
          arming = true;
          input.value = formatEditable(suggested);
          input.dataset.pending = "1";
          input.classList.add("is-suggestion");
          arming = false;
          requestAnimationFrame(() => selectField(input));
        });

        input.addEventListener("pointerdown", (event) => {
          if (document.activeElement !== input || input.dataset.pending !== "1") return;
          event.preventDefault();
          commitCell(parseNumber(input.value));
        });

        input.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          delete input.dataset.pending;
          input.classList.remove("is-suggestion");
          commitCell(parseNumber(input.value));
          input.blur();
        });

        input.addEventListener("input", () => {
          if (arming) return;
          const wasPending = input.dataset.pending === "1";
          delete input.dataset.pending;
          input.classList.remove("is-suggestion");
          if (wasPending && input.value.trim() === "") input.dataset.keepEmpty = "1";
          else delete input.dataset.keepEmpty;
        });

        input.addEventListener("blur", () => {
          if (input.dataset.pending === "1") {
            input.value = "";
            delete input.dataset.pending;
            input.classList.remove("is-suggestion");
            return;
          }
          const parsed = parseNumber(input.value);
          const stored = parsed == null || parsed === 0 ? null : parsed;
          if (stored === cellValue(row, key)) {
            input.value = stored == null ? "" : formatEditable(stored);
            paintSettled(input, expenseSettled(row, key));
            if (stored == null) input.removeAttribute("title");
            return;
          }
          commitCell(stored);
        });
      });
      tr.querySelector('[data-act="del"]').addEventListener("click", () => {
        month.expenses = month.expenses.filter((item) => item.id !== row.id);
        state.seeded = false;
        saveState();
        render();
      });
      els.expenseBody.appendChild(tr);
    });
  }

  function enteredRowSum(row) {
    normalizeExpense(row);
    return Object.keys(row.shares || {}).reduce(
      (sum, key) => sum + (cellValue(row, key) || 0),
      0
    );
  }

  function planGap(row) {
    const plan = cellValue(row, "plan");
    if (plan == null) return 0;
    return Math.round(enteredRowSum(row) * 100) - Math.round(plan * 100);
  }

  function paintPlanShortfalls(month) {
    month.expenses.forEach((row) => {
      const input = document.querySelector(
        `#expenseBody tr[data-exp="${CSS.escape(row.id)}"] input[data-key="plan"]`
      );
      if (!input) return;
      const gap = planGap(row);
      input.classList.toggle("plan-short", gap < 0);
      input.classList.toggle("plan-over", gap > 0);
      if (gap < 0) input.title = "По строке введено меньше плана";
      else if (gap > 0) input.title = "По строке введено больше плана";
      else input.removeAttribute("title");
    });
  }

  function refreshTotalsOnly() {
    const month = activeMonth();
    const t = totals(month);
    paintText(els.sumIncome, money(t.income));
    paintText(els.sumPlan, money(t.plan));
    paintText(els.sumFact, money(t.spent));
    paintText(els.sumRemain, money(t.remain));
    els.sumRemain.parentElement.classList.toggle("negative", t.remain < 0);
    paintText(els.incomeTotal, money(t.income));
    paintText(document.querySelector('#expenseHead [data-sum="plan"]'), money(t.income));
    paintRemain(document.querySelector('#expenseFoot [data-remain="plan"]'), t.income - t.plan);
    month.income.forEach((row) => {
      const head = document.querySelector(`#expenseHead [data-income-id="${CSS.escape(row.id)}"]`);
      const amount = Number(row.amount) || 0;
      if (head) paintText(head, money(amount));
      const left = document.querySelector(`#expenseFoot [data-remain-id="${CSS.escape(row.id)}"]`);
      paintRemain(left, amount - columnSum(month, incomeColumnKey(row)));
    });
    paintPlanShortfalls(month);
    paintSetAsideHint();
    paintSavingsCalcs();
  }

  const SAVINGS_ROWS = [
    { id: "deposit", name: "Вклад" },
    { id: "broker", name: "Брокерский счет", calc: "broker" },
    { id: "iis", name: "ИИС" },
    { id: "iis3", name: "ИИС 3" },
    { id: "flat1", name: "Квартира 1", calc: "flat1" },
    { id: "flat2", name: "Квартира 2", calc: "flat2" },
    { id: "garage", name: "Гараж", calc: "garage" },
    { id: "own", name: "Вложил свои", calc: "own" },
    { id: "earned", name: "Заработал в месяц", calc: "earned" },
    { id: "topup", name: "Пополнил БС", calc: "topup" },
    { id: "delta", name: "Прирост", calc: "delta" },
  ];

  const SAVINGS_ASIDE = new Set(["own", "capitalPlan", "capitalFact"]);

  function savingsLineTemplate() {
    return SAVINGS_ROWS.map((row) => ({
      id: row.id,
      name: row.name,
      ...(row.calc ? { calc: row.calc } : {}),
    }));
  }

  function defaultBrokerIncomes() {
    const line = (id, name, amounts) => ({ id, name, amounts });
    return [
      line("brk-brus", "Брусника", { "2026-05": 10920.8, "2026-06": 10920.8, "2026-07": 10920, "2026-08": 10920, "2026-09": 11220, "2026-10": 11220 }),
      line("brk-vis", "Вис финанас", { "2026-01": 2207, "2026-03": 2207, "2026-04": 2207 }),
      line("brk-sel", "Селектел", {}),
      line("brk-selig", "Селигдар", { "2026-01": 3254, "2026-02": 3254, "2026-03": 3254, "2026-04": 3254 }),
      line("brk-parus", "парус", { "2026-02": 915, "2026-03": 916.04, "2026-04": 992.74, "2026-05": 153.47, "2026-06": 673, "2026-07": 673, "2026-08": 673, "2026-09": 674.3, "2026-10": 674.3 }),
      line("brk-post", "Почта", { "2026-05": 7571.7, "2026-06": 8262, "2026-07": 8262, "2026-08": 8262, "2026-09": 8319, "2026-10": 8319 }),
      line("brk-ofz", "ОФЗ", { "2026-05": 13559.76, "2026-06": 16980, "2026-07": 14388, "2026-08": 13611, "2026-09": 18961, "2026-10": 28470.4 }),
      line("brk-div", "Дивы", { "2026-07": 3260, "2026-08": 8657, "2026-09": 770, "2026-10": 7623 }),
    ];
  }

  function defaultSavingsFact() {
    return {
      lines: savingsLineTemplate(),
      rows: {
        deposit: { "2026-01": 30640, "2026-02": 20963, "2026-03": 32708, "2026-04": 24695 },
        broker: { "2026-01": 5461, "2026-02": 4169, "2026-03": 6377.04, "2026-05": 32205.73, "2026-06": 36835.8, "2026-07": 37503, "2026-08": 42123, "2026-09": 39944.3, "2026-10": 56306.7 },
        iis: {},
        iis3: {},
        flat1: { "2026-01": 19000, "2026-02": 19500, "2026-03": 19500, "2026-04": 19500, "2026-05": 21338, "2026-06": 20748, "2026-07": 20100, "2026-08": 20414, "2026-09": 20484, "2026-10": 21667 },
        flat2: { "2026-01": 25000, "2026-02": 25000, "2026-03": 25000, "2026-04": 25000, "2026-05": 28451, "2026-06": 28500, "2026-07": 30000, "2026-08": 26595, "2026-09": 3651, "2026-10": 0 },
        garage: { "2026-01": 16500, "2026-02": 16500, "2026-03": 16500, "2026-04": 6500, "2026-05": 16500, "2026-06": 16500, "2026-07": 16500, "2026-08": 16500, "2026-09": 16500, "2026-10": 16500 },
        own: {},
      },
      brokerIncomes: defaultBrokerIncomes(),
    };
  }

  function ensureSavingsFact(target) {
    let changed = false;
    if (!target.savingsFact?.rows) {
      target.savingsFact = defaultSavingsFact();
      return true;
    }
    if (!Array.isArray(target.savingsFact.brokerIncomes)) {
      target.savingsFact.brokerIncomes = defaultBrokerIncomes();
      changed = true;
    }
    if (!Array.isArray(target.savingsFact.lines) || !target.savingsFact.lines.length) {
      target.savingsFact.lines = savingsLineTemplate();
      changed = true;
    }
    const arranged = arrangeSavingsLines(target.savingsFact.lines);
    if (JSON.stringify(arranged) !== JSON.stringify(target.savingsFact.lines)) {
      target.savingsFact.lines = arranged;
      changed = true;
    }
    return changed;
  }

  function arrangeSavingsLines(lines) {
    const hidden = new Set(["capitalPlan", "capitalFact"]);
    const tailIds = ["earned", "topup", "delta"];
    const byId = Object.fromEntries(lines.map((row) => [row.id, row]));
    const rest = lines.filter((row) => !hidden.has(row.id) && !tailIds.includes(row.id));
    const own = rest.find((row) => row.id === "own");
    if (own) own.calc = "own";
    const broker = rest.find((row) => row.id === "broker");
    if (broker) broker.calc = "broker";
    rest.forEach((row) => {
      if (row.id === "flat1" || row.id === "flat2" || row.id === "garage") row.calc = row.id;
    });
    const earned = byId.earned || { id: "earned", name: "Заработал в месяц", calc: "earned" };
    earned.name = "Заработал в месяц";
    earned.calc = "earned";
    const topup = byId.topup || { id: "topup", name: "Пополнил БС", calc: "topup" };
    topup.name = topup.name || "Пополнил БС";
    topup.calc = "topup";
    const delta = byId.delta || { id: "delta", name: "Прирост", calc: "delta" };
    delta.calc = "delta";
    return [...rest, earned, topup, delta];
  }

  function savingsLines() {
    return state.savingsFact.lines;
  }

  function savingsStored(id, key) {
    const value = state.savingsFact?.rows?.[id]?.[key];
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function savingsRound(n) {
    return Math.round(n * 100) / 100;
  }

  function brokerIncomeSum(key) {
    const rows = state.savingsFact?.brokerIncomes || [];
    const parts = [];
    rows.forEach((row) => {
      const value = row.amounts?.[key];
      if (value == null || value === "") return;
      const n = Number(value);
      if (Number.isFinite(n)) parts.push(n);
    });
    if (!parts.length) return null;
    return savingsRound(parts.reduce((sum, value) => sum + value, 0));
  }

  function syncBrokerIncomeRows() {
    let changed = false;
    YEARS.forEach((year) => {
      Object.entries(state.years?.[year]?.months || {}).forEach(([key, month]) => {
        (month.income || []).forEach((row) => {
          if (!isBrokerLabel(row.label)) return;
          const amount = brokerIncomeSum(key) || 0;
          if (Number(row.amount) !== amount || row.derived !== "broker" || row.manual) {
            row.amount = amount;
            row.derived = "broker";
            delete row.manual;
            changed = true;
          }
        });
      });
    });
    return changed;
  }

  function refreshBrokerSurfaces() {
    paintSavingsCalcs();
    const input = document.querySelector("#incomeBody input[data-broker]");
    if (input) {
      const sum = brokerIncomeSum(state.currentMonth);
      input.value = sum == null ? "" : formatEditable(sum);
    }
    refreshTotalsOnly();
    renderAnalytics();
  }

  function savingsEarned(key) {
    const parts = [];
    savingsLines().forEach((row) => {
      if (row.id === "broker") {
        const broker = brokerIncomeSum(key);
        if (broker != null) parts.push(broker);
        return;
      }
      if (row.id === "flat1" || row.id === "flat2" || row.id === "garage") {
        const rent = rentSavings(row.id, key);
        if (rent != null) parts.push(rent);
        return;
      }
      if (row.calc || SAVINGS_ASIDE.has(row.id)) return;
      const value = savingsStored(row.id, key);
      if (value != null) parts.push(value);
    });
    if (!parts.length) return null;
    return savingsRound(parts.reduce((sum, value) => sum + value, 0));
  }

  function ownShareSkipped(key) {
    const label = String(key || "").replace(/^name:/, "").toLowerCase();
    return /аренд/.test(label) || /брокер/.test(label);
  }

  function ownFromSetAside(key) {
    const month = state.years?.[yearOf(key)]?.months?.[key];
    if (!month?.expenses) return null;
    let sum = 0;
    let found = false;
    month.expenses.forEach((row) => {
      if (!isSetAsideRow(row)) return;
      normalizeExpense(row);
      Object.keys(row.shares || {}).forEach((col) => {
        if (ownShareSkipped(col)) return;
        const value = cellValue(row, col);
        if (value == null) return;
        sum += value;
        found = true;
      });
    });
    return found ? savingsRound(sum) : null;
  }

  function ownIsManual(key) {
    return Boolean(state.savingsFact?.ownManual?.[key]);
  }

  function ownAmount(key) {
    if (ownIsManual(key)) return savingsStored("own", key);
    return ownFromSetAside(key);
  }

  function setAsideForMonth(key) {
    const month = state.years?.[yearOf(key)]?.months?.[key];
    if (!month?.expenses) return null;
    let sum = 0;
    let found = false;
    month.expenses.forEach((row) => {
      if (!isSetAsideRow(row)) return;
      const plan = cellValue(row, "plan");
      if (plan != null) {
        sum += plan;
        found = true;
        return;
      }
      Object.keys(row.shares || {}).forEach((col) => {
        const value = cellValue(row, col);
        if (value == null) return;
        sum += value;
        found = true;
      });
    });
    return found ? savingsRound(sum) : null;
  }

  function rentSavings(kind, key) {
    const month = monthByKey(key);
    const row = (month?.income || []).find(isRentRow);
    if (!row?.lines?.length) return null;
    const parts = [];
    row.lines.forEach((line) => {
      if (line.active === false || rentSavingsKind(line) !== kind) return;
      const n = Number(line.amount);
      if (Number.isFinite(n)) parts.push(n);
    });
    if (!parts.length) return null;
    return savingsRound(parts.reduce((sum, value) => sum + value, 0));
  }

  function rentSavingsKind(line) {
    if (line.id === "rent_gaz" || /газовик/i.test(line.label || "")) return "flat1";
    if (line.id === "rent_quiet" || /тихий/i.test(line.label || "")) return "flat2";
    if (line.id === "rent_garage" || /гараж/i.test(line.label || "")) return "garage";
    return "";
  }

  function savingsTopup(key) {
    const earned = savingsEarned(key);
    const own = ownAmount(key);
    if (earned == null && own == null) return null;
    return savingsRound((earned || 0) + (own || 0));
  }

  function savingsDelta(key) {
    const plan = savingsStored("capitalPlan", key);
    const fact = savingsStored("capitalFact", key);
    if (plan == null || fact == null) return null;
    return savingsRound(fact - plan);
  }

  function savingsCalc(kind, key) {
    if (kind === "earned") return savingsEarned(key);
    if (kind === "own") return ownAmount(key);
    if (kind === "flat1" || kind === "flat2" || kind === "garage") return rentSavings(kind, key);
    if (kind === "broker") return brokerIncomeSum(key);
    if (kind === "topup") return savingsTopup(key);
    return savingsDelta(key);
  }

  function previousMonthKey(key) {
    const year = Number(String(key).slice(0, 4));
    const month = Number(String(key).slice(5, 7));
    if (month <= 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, "0")}`;
  }

  function monthChip(key) {
    const index = Number(String(key).slice(5, 7)) - 1;
    if (index < 0 || index > 11) return String(key);
    return `${MONTHS_SHORT[index]} ${String(key).slice(0, 4)}`;
  }

  function compareView(current, previous) {
    const compare = utilityCompare(current, previous);
    return {
      currentText: current == null ? "" : formatEditable(current),
      prevText: previous == null ? "" : formatEditable(previous),
      deltaText: compare ? formatSigned(compare.delta) : "",
      percentText: compare ? formatPercent(compare.percent) : "",
      deltaTone: compare ? utilityTone(compare.delta).trim() : "",
      percentTone: compare ? utilityTone(compare.percent).trim() : "",
    };
  }

  function readCell(value, tone) {
    const cls = tone ? ` ${tone}` : "";
    return `<input class="num-input${cls}" type="text" readonly value="${escapeAttr(value)}" placeholder="—" />`;
  }

  function nameCell(label) {
    return `<input class="name-input" type="text" readonly value="${escapeAttr(label)}" />`;
  }

  function savingsIsSettled(id, monthKey) {
    return Boolean(state.savingsFact?.settled?.[id]?.[monthKey]);
  }

  function toggleSavingsSettled(id, monthKey) {
    if (!state.savingsFact.settled) state.savingsFact.settled = {};
    if (!state.savingsFact.settled[id]) state.savingsFact.settled[id] = {};
    if (state.savingsFact.settled[id][monthKey]) delete state.savingsFact.settled[id][monthKey];
    else state.savingsFact.settled[id][monthKey] = true;
  }

  function clearSavingsSettled(id, monthKey) {
    if (state.savingsFact?.settled?.[id]) delete state.savingsFact.settled[id][monthKey];
  }

  function brokerIsSettled(id, monthKey) {
    return Boolean(state.savingsFact?.brokerSettled?.[id]?.[monthKey]);
  }

  function toggleBrokerSettled(id, monthKey) {
    if (!state.savingsFact.brokerSettled) state.savingsFact.brokerSettled = {};
    if (!state.savingsFact.brokerSettled[id]) state.savingsFact.brokerSettled[id] = {};
    if (state.savingsFact.brokerSettled[id][monthKey]) delete state.savingsFact.brokerSettled[id][monthKey];
    else state.savingsFact.brokerSettled[id][monthKey] = true;
  }

  function clearBrokerSettled(id, monthKey) {
    if (state.savingsFact?.brokerSettled?.[id]) delete state.savingsFact.brokerSettled[id][monthKey];
  }

  function savingsValue(row, monthKey) {
    if (row.id === "own") return ownAmount(monthKey);
    return row.calc ? savingsCalc(row.calc, monthKey) : savingsStored(row.id, monthKey);
  }

  function savingsNameCell(row) {
    if (row.id === "earned") {
      return `<span class="savings-label">Заработал в месяц пассив</span>`;
    }
    if (row.id === "topup") {
      return `<span class="savings-label">Пополнил БС</span>`;
    }
    if (row.calc) return nameCell(row.name);
    return `<input class="name-input" type="text" value="${escapeAttr(row.name)}" data-field="name" />`;
  }

  function savingsCell(row, monthKey, editable) {
    if (row.id === "own") {
      const value = ownAmount(monthKey);
      const shown = value == null ? "" : formatEditable(value);
      const title = ` title="${escapeAttr(ownIsManual(monthKey) ? "Своя сумма" : "Из «Отложить» без аренды и брокера. Можно изменить")}"`;
      if (!editable) {
        return `<input class="num-input" type="text" readonly data-own="1" data-month="${escapeAttr(monthKey)}" value="${escapeAttr(shown)}"${title} />`;
      }
      return `<input class="num-input" type="text" inputmode="decimal" enterkeyhint="done" data-blank="1" data-own="1" data-settle="1" data-row="own" data-month="${escapeAttr(monthKey)}" value="${escapeAttr(shown)}" placeholder="—"${title} autocomplete="off" autocorrect="off" spellcheck="false" />`;
    }
    const value = savingsValue(row, monthKey);
    const shown = value == null ? "" : formatEditable(value);
    if (row.calc) {
      return `<input class="num-input" type="text" readonly data-calc="${escapeAttr(row.id)}" data-month="${escapeAttr(monthKey)}" value="${escapeAttr(shown)}" placeholder="—" />`;
    }
    if (!editable) {
      if (value == null) return readCell(shown);
      const settled = savingsIsSettled(row.id, monthKey);
      const title = ` title="${escapeAttr(settledTitle(settled))}"`;
      const cls = settled ? " is-settled" : "";
      return `<input class="num-input${cls}" type="text" readonly data-settle="1" data-row="${row.id}" data-month="${monthKey}" value="${escapeAttr(shown)}"${title} />`;
    }
    const settled = value != null && savingsIsSettled(row.id, monthKey);
    const title = value == null ? "" : ` title="${escapeAttr(settledTitle(settled))}"`;
    const cls = settled ? " is-settled" : "";
    return `<input class="num-input${cls}" type="text" inputmode="decimal" enterkeyhint="done" data-blank="1" data-settle="1" data-row="${row.id}" data-month="${monthKey}" value="${escapeAttr(shown)}" placeholder="—"${title} autocomplete="off" autocorrect="off" spellcheck="false" />`;
  }

  function paintOwnInputs() {
    document.querySelectorAll("#savingsBody input[data-own]").forEach((input) => {
      if (document.activeElement === input) return;
      const key = input.dataset.month;
      const amount = ownAmount(key);
      input.value = amount == null ? "" : formatEditable(amount);
      input.title = ownIsManual(key) ? "Своя сумма" : "Из «Отложить» без аренды и брокера. Можно изменить";
    });
  }

  function paintSavingsCalcs() {
    paintOwnInputs();
    document.querySelectorAll("#savingsBody input[data-calc]").forEach((input) => {
      const row = savingsLines().find((item) => item.id === input.dataset.calc);
      if (!row) return;
      const value = savingsValue(row, input.dataset.month);
      input.value = value == null ? "" : formatEditable(value);
    });
  }

  function renderSavings() {
    if (!els.savingsHead || !els.savingsBody || !state.savingsFact) return;
    const key = state.currentMonth;
    const months = [
      { key: previousMonthKey(previousMonthKey(key)), editable: false },
      { key: previousMonthKey(key), editable: false },
      { key, editable: true },
    ];
    els.savingsHead.innerHTML = `
      <tr>
        <th><span class="col-title">Строка</span></th>
        ${months.map((month, index) => `<th class="num${index === months.length - 2 ? " plan-col" : ""}${month.editable ? " is-entry" : ""}"><span class="col-title">${escapeAttr(monthChip(month.key))}</span></th>`).join("")}
        <th class="actions-col"></th>
      </tr>
    `;
    els.savingsBody.innerHTML = "";
    savingsLines().forEach((row) => {
      const tr = document.createElement("tr");
      if (row.calc) tr.classList.add("is-total");
      if (row.id === "earned" || row.id === "topup") tr.classList.add("is-savings-mark");
      const action = row.calc
        ? ""
        : `<button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button>`;
      tr.innerHTML = `
        <td>${savingsNameCell(row)}</td>
        ${months.map((month, index) => `<td class="num${index === months.length - 2 ? " plan-col" : ""}">${savingsCell(row, month.key, month.editable)}</td>`).join("")}
        <td class="actions-col">${action}</td>
      `;
      tr.querySelector("[data-field='name']")?.addEventListener("change", (event) => {
        row.name = event.target.value.trim() || "Строка";
        saveState();
      });
      tr.querySelectorAll("input[data-month]").forEach((input) => {
        input.addEventListener("change", () => {
          const monthKey = input.dataset.month;
          const parsed = parseNumber(input.value);
          if (row.id === "own") {
            const auto = ownFromSetAside(monthKey);
            if (!state.savingsFact.ownManual) state.savingsFact.ownManual = {};
            if (!state.savingsFact.rows.own) state.savingsFact.rows.own = {};
            if (parsed == null || parsed === auto) {
              delete state.savingsFact.ownManual[monthKey];
              delete state.savingsFact.rows.own[monthKey];
            } else {
              state.savingsFact.ownManual[monthKey] = true;
              state.savingsFact.rows.own[monthKey] = parsed;
            }
            clearSavingsSettled(row.id, monthKey);
            saveState();
            paintOwnInputs();
            paintSavingsCalcs();
            return;
          }
          if (!state.savingsFact.rows[row.id]) state.savingsFact.rows[row.id] = {};
          if (parsed == null) {
            delete state.savingsFact.rows[row.id][monthKey];
            clearSavingsSettled(row.id, monthKey);
          } else state.savingsFact.rows[row.id][monthKey] = parsed;
          saveState();
          input.value = parsed == null ? "" : formatEditable(parsed);
          input.classList.remove("is-settled");
          input.removeAttribute("title");
          paintSavingsCalcs();
        });
      });
      tr.querySelector("[data-act='del']")?.addEventListener("click", () => {
        state.savingsFact.lines = savingsLines().filter((item) => item.id !== row.id);
        delete state.savingsFact.rows[row.id];
        if (state.savingsFact.settled) delete state.savingsFact.settled[row.id];
        saveState();
        renderSavings();
      });
      els.savingsBody.appendChild(tr);
      tr.querySelectorAll("input[data-settle]").forEach((input) => {
        input.addEventListener("dblclick", (event) => {
          const monthKey = input.dataset.month;
          if (savingsValue(row, monthKey) == null) return;
          event.preventDefault();
          toggleSavingsSettled(row.id, monthKey);
          paintSettled(input, savingsIsSettled(row.id, monthKey));
          saveState();
          releaseSelection(input);
        });
        armNoSelect(input);
      });
    });
    renderBrokerIncomes(months);
  }

  function renderBrokerIncomes(months) {
    if (!els.brokerIncomeHead || !els.brokerIncomeBody || !state.savingsFact) return;
    const rows = state.savingsFact.brokerIncomes || [];
    els.brokerIncomeHead.innerHTML = `
      <tr>
        <th><span class="col-title">Доход</span></th>
        ${months.map((month, index) => `<th class="num${index === months.length - 2 ? " plan-col" : ""}${month.editable ? " is-entry" : ""}"><span class="col-title">${escapeAttr(monthChip(month.key))}</span></th>`).join("")}
        <th class="actions-col"></th>
      </tr>
    `;
    els.brokerIncomeBody.innerHTML = "";
    rows.forEach((row) => {
      if (!row.amounts) row.amounts = {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.name)}" data-field="name" /></td>
        ${months.map((month, index) => {
          const value = row.amounts[month.key];
          const shown = value == null || value === "" ? "" : formatEditable(Number(value));
          const settled = shown !== "" && brokerIsSettled(row.id, month.key);
          const title = shown === "" ? "" : ` title="${escapeAttr(settledTitle(settled))}"`;
          const cls = settled ? " is-settled" : "";
          const cell = !month.editable
            ? (shown === ""
              ? readCell(shown)
              : `<input class="num-input${cls}" type="text" readonly data-settle="1" data-month="${month.key}" value="${escapeAttr(shown)}"${title} />`)
            : `<input class="num-input${cls}" type="text" inputmode="decimal" enterkeyhint="done" data-blank="1" data-settle="1" data-month="${month.key}" value="${escapeAttr(shown)}" placeholder="—"${title} autocomplete="off" autocorrect="off" spellcheck="false" />`;
          return `<td class="num${index === months.length - 2 ? " plan-col" : ""}${month.editable ? " is-entry" : ""}">${cell}</td>`;
        }).join("")}
        <td class="actions-col"><button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button></td>
      `;
      tr.querySelector('[data-field="name"]').addEventListener("change", (event) => {
        row.name = event.target.value.trim() || "Доход";
        saveState();
      });
      tr.querySelectorAll("input[data-month]").forEach((input) => {
        input.addEventListener("change", () => {
          const monthKey = input.dataset.month;
          const parsed = parseNumber(input.value);
          if (parsed == null) {
            delete row.amounts[monthKey];
            clearBrokerSettled(row.id, monthKey);
          } else row.amounts[monthKey] = parsed;
          syncBrokerIncomeRows();
          saveState();
          input.value = parsed == null ? "" : formatEditable(parsed);
          input.classList.remove("is-settled");
          input.removeAttribute("title");
          refreshBrokerSurfaces();
        });
      });
      tr.querySelector('[data-act="del"]').addEventListener("click", () => {
        state.savingsFact.brokerIncomes = rows.filter((item) => item.id !== row.id);
        if (state.savingsFact.brokerSettled) delete state.savingsFact.brokerSettled[row.id];
        syncBrokerIncomeRows();
        saveState();
        renderSavings();
        refreshBrokerSurfaces();
      });
      els.brokerIncomeBody.appendChild(tr);
      tr.querySelectorAll("input[data-settle]").forEach((input) => {
        input.addEventListener("dblclick", (event) => {
          const monthKey = input.dataset.month;
          const value = row.amounts[monthKey];
          if (value == null || value === "") return;
          event.preventDefault();
          toggleBrokerSettled(row.id, monthKey);
          paintSettled(input, brokerIsSettled(row.id, monthKey));
          saveState();
          releaseSelection(input);
        });
        armNoSelect(input);
      });
    });
  }

  const UTILITY_MONTHS = [
    ["2025-12", "дек", "2025"],
    ["2026-01", "янв", "2026"], ["2026-02", "фев", "2026"], ["2026-03", "мар", "2026"],
    ["2026-04", "апр", "2026"], ["2026-05", "май", "2026"], ["2026-06", "июн", "2026"],
    ["2026-07", "июл", "2026"], ["2026-08", "авг", "2026"], ["2026-09", "сен", "2026"],
    ["2026-10", "окт", "2026"], ["2026-11", "ноя", "2026"],
  ];

  const UTILITY_ROWS = [
    { id: "quietBrus", name: "Тюменская брусника (тихий)" },
    { id: "quietUtil", name: "Тюменская комуналка (тихий)" },
    { id: "gazBrus", name: "Тюменская брусника (газовиков)" },
    { id: "gazUtil", name: "Тюменская комуналка (газовиков)" },
    { id: "gas", name: "Газ (НУР)" },
    { id: "nur", name: "Комуналка (НУР)" },
    { id: "light", name: "Свет (НУР)" },
    { id: "door", name: "Домофон" },
  ];

  function defaultUtilities() {
    return {
      rows: {
        quietBrus: { "2025-12": 1891.66, "2026-01": 1894, "2026-02": 1888.52, "2026-03": 1864.77, "2026-04": 1833.41, "2026-05": 1902, "2026-06": 1878.25, "2026-07": 1841.57, "2026-08": 1855.72, "2026-09": 1888, "2026-10": 0, "2026-11": 0 },
        quietUtil: { "2025-12": 1937.3, "2026-01": 2600, "2026-02": 2433.17, "2026-03": 2109.59, "2026-04": 2122.65, "2026-05": 1211, "2026-06": 874, "2026-07": 1077.14, "2026-08": 1230.74, "2026-09": 2451, "2026-10": 0, "2026-11": 0 },
        gazBrus: { "2025-12": 1581.73, "2026-01": 1643, "2026-02": 1612.83, "2026-03": 1667.44, "2026-04": 1604.56, "2026-05": 1662, "2026-06": 1578.08, "2026-07": 1700.06, "2026-08": 1662.51, "2026-09": 1703, "2026-10": 0, "2026-11": 0 },
        gazUtil: { "2025-12": 2624.33, "2026-01": 3046, "2026-02": 2645.3, "2026-03": 2625.09, "2026-04": 1847.13, "2026-05": 1532, "2026-06": 1269.65, "2026-07": 1204.08, "2026-08": 1332.22, "2026-09": 1328, "2026-10": 0, "2026-11": 0 },
        gas: { "2025-12": 363.79, "2026-01": 363.79, "2026-02": 369.85, "2026-03": 369.85, "2026-04": 369.85, "2026-05": 369, "2026-06": 369.85, "2026-07": 369.85, "2026-08": 369.85, "2026-09": 369, "2026-10": 0, "2026-11": 0 },
        nur: { "2025-12": 11132, "2026-01": 13375, "2026-02": 11962, "2026-03": 12267.52, "2026-04": 10253.34, "2026-05": 5506, "2026-06": 7420.06, "2026-07": 3483.87, "2026-08": 3240, "2026-09": 4142, "2026-10": 0, "2026-11": 0 },
        light: { "2025-12": 2176.87, "2026-01": 3684, "2026-02": 3205.1, "2026-03": 1932.32, "2026-04": 2199.6, "2026-05": 1532, "2026-06": 1879.57, "2026-07": 3416.76, "2026-08": 1542, "2026-09": 2479.8, "2026-10": 0, "2026-11": 0 },
        door: { "2026-02": 1000, "2026-04": 500 },
      },
    };
  }

  function ensureUtilities(target) {
    if (target.utilities?.rows) return false;
    target.utilities = defaultUtilities();
    return true;
  }

  function utilityStored(id, key) {
    const value = state.utilities?.rows?.[id]?.[key];
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function utilityTotal(key) {
    const parts = UTILITY_ROWS.map((row) => utilityStored(row.id, key)).filter((value) => value != null);
    if (!parts.length) return null;
    return Math.round(parts.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }

  function utilityCompare(current, previous) {
    if (current == null || previous == null) return null;
    const delta = Math.round((current - previous) * 100) / 100;
    const percent = previous === 0 ? null : delta / previous;
    return { delta, percent };
  }

  function formatSigned(n) {
    if (n == null || Number.isNaN(n)) return "";
    const text = formatEditable(Math.abs(n));
    if (n > 0) return `+${text}`;
    if (n < 0) return `−${text}`;
    return "0";
  }

  function formatPercent(ratio) {
    if (ratio == null || !Number.isFinite(ratio)) return "—";
    const pct = Math.round(ratio * 1000) / 10;
    const text = Math.abs(pct).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
    if (pct > 0) return `+${text}%`;
    if (pct < 0) return `−${text}%`;
    return "0%";
  }

  function utilityNameCell(label) {
    const text = String(label);
    const cut = text.indexOf(" (");
    if (cut === -1) return `<span class="utility-name">${escapeAttr(text)}</span>`;
    const main = text.slice(0, cut);
    const extra = text.slice(cut + 1);
    return `<span class="utility-name">${escapeAttr(main)}<span class="utility-name-sub">${escapeAttr(extra)}</span></span>`;
  }

  function utilityTone(n) {
    if (n == null || n === 0) return "";
    return n > 0 ? " utility-up" : " utility-down";
  }

  function utilityIsSettled(id, monthKey) {
    return Boolean(state.utilities?.settled?.[id]?.[monthKey]);
  }

  function toggleUtilitySettled(id, monthKey) {
    if (!state.utilities.settled) state.utilities.settled = {};
    if (!state.utilities.settled[id]) state.utilities.settled[id] = {};
    if (state.utilities.settled[id][monthKey]) delete state.utilities.settled[id][monthKey];
    else state.utilities.settled[id][monthKey] = true;
  }

  function clearUtilitySettled(id, monthKey) {
    if (state.utilities?.settled?.[id]) delete state.utilities.settled[id][monthKey];
  }

  function utilityAmountCell(id, monthKey, value, editable) {
    const shown = value == null ? "" : formatEditable(value);
    if (value == null) {
      return editable
        ? `<input class="num-input" type="text" inputmode="decimal" enterkeyhint="done" data-blank="1" data-row="${id}" data-month="${monthKey}" value="" placeholder="—" autocomplete="off" autocorrect="off" spellcheck="false" />`
        : readCell("");
    }
    const settled = utilityIsSettled(id, monthKey);
    const title = ` title="${escapeAttr(settledTitle(settled))}"`;
    const cls = settled ? " is-settled" : "";
    if (!editable) {
      return `<input class="num-input${cls}" type="text" readonly data-settle="1" data-util="${id}" data-month="${monthKey}" value="${escapeAttr(shown)}"${title} />`;
    }
    return `<input class="num-input${cls}" type="text" inputmode="decimal" enterkeyhint="done" data-blank="1" data-settle="1" data-row="${id}" data-util="${id}" data-month="${monthKey}" value="${escapeAttr(shown)}" placeholder="—"${title} autocomplete="off" autocorrect="off" spellcheck="false" />`;
  }

  function renderUtilities() {
    if (!els.utilitiesHead || !els.utilitiesBody || !state.utilities) return;
    const inputKey = previousMonthKey(state.currentMonth);
    const compareKey = previousMonthKey(inputKey);
    els.utilitiesHead.innerHTML = `
      <tr>
        <th><span class="col-title">Строка</span></th>
        <th class="num plan-col"><span class="col-title">${escapeAttr(monthChip(compareKey))}</span></th>
        <th class="num is-entry"><span class="col-title">${escapeAttr(monthChip(inputKey))}</span></th>
        <th class="num"><span class="col-title">Разница</span></th>
        <th class="num"><span class="col-title">%</span></th>
      </tr>
    `;
    els.utilitiesBody.innerHTML = "";
    const paintRow = (title, valueOf, editableId) => {
      const tr = document.createElement("tr");
      if (!editableId) tr.classList.add("is-total");
      const current = valueOf(inputKey);
      const previous = valueOf(compareKey);
      const view = compareView(current, previous);
      const rowId = editableId || "total";
      tr.innerHTML = `
        <td>${utilityNameCell(title)}</td>
        <td class="num plan-col">${utilityAmountCell(rowId, compareKey, previous, false)}</td>
        <td class="num is-entry">${utilityAmountCell(rowId, inputKey, current, Boolean(editableId))}</td>
        <td class="num">${readCell(view.deltaText, view.deltaTone)}</td>
        <td class="num">${readCell(view.percentText, view.percentTone)}</td>
      `;
      const input = tr.querySelector("input[data-row]:not([readonly])");
      if (input) {
        input.addEventListener("change", () => {
          const parsed = parseNumber(input.value);
          if (!state.utilities.rows[editableId]) state.utilities.rows[editableId] = {};
          if (parsed == null) {
            delete state.utilities.rows[editableId][inputKey];
            clearUtilitySettled(editableId, inputKey);
          } else state.utilities.rows[editableId][inputKey] = parsed;
          saveState();
          renderUtilities();
        });
      }
      tr.querySelectorAll("input[data-settle]").forEach((cell) => {
        armNoSelect(cell);
        cell.addEventListener("dblclick", (event) => {
          const id = cell.dataset.util;
          const monthKey = cell.dataset.month;
          const amount = id === "total" ? utilityTotal(monthKey) : utilityStored(id, monthKey);
          if (amount == null) return;
          event.preventDefault();
          toggleUtilitySettled(id, monthKey);
          paintSettled(cell, utilityIsSettled(id, monthKey));
          saveState();
          releaseSelection(cell);
        });
      });
      els.utilitiesBody.appendChild(tr);
    };
    UTILITY_ROWS.forEach((row) => paintRow(row.name, (month) => utilityStored(row.id, month), row.id));
    paintRow("Итого", utilityTotal, "");
  }

  function paintRemain(node, value) {
    if (!node) return;
    paintText(node, money(value));
    node.classList.toggle("delta-neg", value < 0);
  }

  let analyticsYears = null;
  let analyticsMonths = null;
  let analyticsYearPoints = false;

  function currentAnalyticsSelection() {
    const key = state.currentMonth;
    const year = YEARS.includes(yearOf(key)) ? yearOf(key) : state.year;
    const index = monthIndex(key);
    return { year, month: index >= 0 && index < 12 ? index : 0 };
  }

  function ensureAnalyticsFilters() {
    const current = currentAnalyticsSelection();
    if (!Array.isArray(analyticsYears)) analyticsYears = [current.year];
    if (!Array.isArray(analyticsMonths)) analyticsMonths = [current.month];
    analyticsYears = analyticsYears.filter((year) => YEARS.includes(year));
    analyticsMonths = analyticsMonths.filter((index) => index >= 0 && index < 12);
    if (!analyticsYears.length) analyticsYears = [current.year];
    if (!analyticsMonths.length && analyticsYears.length < 2) analyticsMonths = [current.month];
  }

  function keepMonthWhenOneYear() {
    if (analyticsYears.length < 2 && !analyticsMonths.length) {
      analyticsMonths = [currentAnalyticsSelection().month];
    }
  }

  function analyticsIsSingle() {
    return analyticsYears.length === 1 && analyticsMonths.length === 1;
  }

  function resetAnalyticsFilters() {
    const current = currentAnalyticsSelection();
    analyticsYears = [current.year];
    analyticsMonths = [current.month];
    analyticsYearPoints = false;
    renderAnalytics();
  }

  function toggleAnalyticsYear(year) {
    ensureAnalyticsFilters();
    const selected = analyticsYears.includes(year);
    if (selected && analyticsYears.length === 1) return;
    analyticsYears = selected
      ? analyticsYears.filter((item) => item !== year)
      : [...analyticsYears, year];
    keepMonthWhenOneYear();
    analyticsYearPoints = false;
    renderAnalytics();
  }

  function toggleAnalyticsMonth(index) {
    ensureAnalyticsFilters();
    const selected = analyticsMonths.includes(index);
    if (selected && analyticsIsSingle()) {
      analyticsYearPoints = !analyticsYearPoints;
      renderAnalytics();
      return;
    }
    analyticsMonths = selected
      ? analyticsMonths.filter((item) => item !== index)
      : [...analyticsMonths, index];
    if (!analyticsMonths.length && analyticsYears.length < 2) analyticsMonths = [index];
    analyticsYearPoints = false;
    renderAnalytics();
  }

  function yearMonth(year, index) {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`;
    return state.years?.[year]?.months?.[key] || null;
  }

  function payrollAmount(month) {
    if (!month?.income) return 0;
    return month.income.reduce((sum, row) => {
      if (!isSalaryLabel(row.label) && !isAdvanceLabel(row.label)) return sum;
      return sum + (Number(row.amount) || 0);
    }, 0);
  }

  function payrollSeries(year) {
    return Array.from({ length: 12 }, (_, index) => payrollAmount(yearMonth(year, index)));
  }

  function budgetSeries(year) {
    const income = [];
    const plan = [];
    for (let index = 0; index < 12; index += 1) {
      const month = yearMonth(year, index);
      const totalsRow = month ? totals(month) : { income: 0, plan: 0 };
      income.push(totalsRow.income);
      plan.push(totalsRow.plan);
    }
    return { income, plan };
  }

  function monthParts(year, index) {
    const month = yearMonth(year, index);
    if (!month) return { income: [], expenses: [] };
    const income = month.income
      .map((row) => ({ label: String(row.label || "Прочее"), value: Number(row.amount) || 0 }))
      .filter((row) => row.value > 0);
    const expenses = (month.expenses || []).map((row) => {
      normalizeExpense(row);
      return { label: String(row.name || "Прочее"), value: cellValue(row, "plan") || 0 };
    }).filter((row) => row.value > 0);
    return { income, expenses };
  }

  function monthAmounts(year, read) {
    return Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, "0")}`;
      return read(key) || 0;
    });
  }

  function sumNumbers(values) {
    return values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }

  function chartLegend(series) {
    return `<div class="chart-legend">${series.map((item) => `<span><i style="background:${item.color}"></i>${escapeAttr(item.name)}</span>`).join("")}</div>`;
  }

  function chartAxis(max) {
    const raw = Math.max(0, Number(max) || 0);
    if (raw <= 0) return { top: 1, ticks: [0] };
    const rough = raw / 4;
    const pow = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((n) => n * pow).find((n) => n + 1e-9 >= rough) || pow * 10;
    const count = Math.max(1, Math.ceil(raw / step - 1e-9));
    const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round(i * step * 100) / 100);
    return { top: ticks[count], ticks };
  }

  function axisMoney(n) {
    const abs = Math.abs(n);
    if (abs >= 1000000) {
      const value = abs / 1000000;
      const text = value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10).replace(".", ",");
      return `${n < 0 ? "−" : ""}${text} млн`;
    }
    if (abs >= 1000) return `${n < 0 ? "−" : ""}${Math.round(abs / 1000)} тыс.`;
    return money(n);
  }

  function chartTipPayload(title, rows) {
    return escapeAttr(JSON.stringify({
      title,
      rows: rows.map((row) => ({
        name: row.name,
        value: money(row.value),
        color: row.color,
      })),
    }));
  }

  function columnChart(labels, series, markIndex) {
    const width = 720;
    const height = 252;
    const padLeft = 64;
    const padRight = 8;
    const padTop = 12;
    const padBottom = 28;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const rawMax = Math.max(0, ...series.flatMap((item) => item.values.map((n) => Number(n) || 0)));
    const axis = chartAxis(rawMax);
    const marks = new Set(Array.isArray(markIndex) ? markIndex : (markIndex >= 0 ? [markIndex] : []));
    const groupW = plotW / labels.length;
    const inner = groupW * 0.72;
    const barW = inner / series.length;
    const yOf = (value) => padTop + plotH - (value / axis.top) * plotH;
    const grid = axis.ticks.map((tick) => {
      const y = yOf(tick);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="rgba(28,27,25,0.14)" />
        <text x="${padLeft - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#6d6962" font-size="11">${escapeAttr(axisMoney(tick))}</text>`;
    }).join("");
    const bands = [];
    const bars = [];
    const hits = [];
    const captions = [];
    labels.forEach((label, index) => {
      const x0 = padLeft + index * groupW;
      const marked = marks.has(index);
      if (marked) {
        bands.push(`<rect x="${x0.toFixed(1)}" y="${padTop}" width="${groupW.toFixed(1)}" height="${plotH}" rx="8" fill="rgba(28,27,25,0.05)" />`);
      }
      series.forEach((item, seriesIndex) => {
        const value = Number(item.values[index]) || 0;
        const barH = (value / axis.top) * plotH;
        const x = x0 + (groupW - inner) / 2 + seriesIndex * barW;
        const y = padTop + plotH - barH;
        const fade = marks.size && !marked ? 0.32 : 1;
        bars.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(barW - 3, 2).toFixed(1)}" height="${(value > 0 ? Math.max(barH, 1.5) : 0).toFixed(1)}" rx="3" fill="${item.color}" opacity="${fade}" />`);
      });
      hits.push(`<rect class="chart-hit" x="${x0.toFixed(1)}" y="${padTop}" width="${groupW.toFixed(1)}" height="${plotH}" fill="transparent" data-chart-tip="${chartTipPayload(label, series.map((item) => ({ name: item.name, value: Number(item.values[index]) || 0, color: item.color })))}" />`);
      captions.push(`<text x="${(x0 + groupW / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="#6d6962" font-size="11">${escapeAttr(label)}</text>`);
    });
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Столбчатый график">${grid}${bands.join("")}${bars.join("")}${captions.join("")}${hits.join("")}</svg>`;
  }

  function rowChart(items, color) {
    if (!items.length) return `<p class="chart-empty">Нет сумм за этот месяц</p>`;
    const width = 520;
    const rowH = 28;
    const labelW = 138;
    const axis = chartAxis(Math.max(...items.map((item) => item.value)));
    const plotW = width - labelW - 10;
    const axisH = 22;
    const height = items.length * rowH + axisH;
    const rows = items.map((item, index) => {
      const y = index * rowH;
      const barW = (plotW * item.value) / axis.top;
      const name = item.label.length > 16 ? `${item.label.slice(0, 15)}…` : item.label;
      return `<text x="0" y="${y + 18}" fill="#3f3c37" font-size="12">${escapeAttr(name)}</text>
        <rect x="${labelW}" y="${y + 6}" width="${Math.max(barW, 1.5).toFixed(1)}" height="14" rx="4" fill="${color}" />
        <rect class="chart-hit" x="0" y="${y}" width="${width}" height="${rowH}" fill="transparent" data-chart-tip="${chartTipPayload(item.label, [{ name: "Сумма", value: item.value, color }])}" />`;
    }).join("");
    const ticks = axis.ticks.map((tick) => {
      const x = labelW + (plotW * tick) / axis.top;
      const anchor = tick === 0 ? "start" : tick === axis.top ? "end" : "middle";
      return `<line x1="${x.toFixed(1)}" y1="${height - axisH}" x2="${x.toFixed(1)}" y2="${height - axisH + 4}" stroke="rgba(28,27,25,0.28)" />
        <text x="${x.toFixed(1)}" y="${height - 4}" text-anchor="${anchor}" fill="#6d6962" font-size="11">${escapeAttr(axisMoney(tick))}</text>`;
    }).join("");
    const baseline = `<line x1="${labelW}" y1="${height - axisH}" x2="${labelW + plotW}" y2="${height - axisH}" stroke="rgba(28,27,25,0.18)" />`;
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">${rows}${baseline}${ticks}</svg>`;
  }

  function pointChart(labels, series) {
    const width = 720;
    const height = 252;
    const padLeft = 64;
    const padRight = 8;
    const padTop = 16;
    const padBottom = 28;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const rawMax = Math.max(0, ...series.flatMap((item) => item.values.map((n) => Number(n) || 0)));
    const axis = chartAxis(rawMax);
    const groupW = plotW / labels.length;
    const yOf = (value) => padTop + plotH - (value / axis.top) * plotH;
    const xOf = (index) => padLeft + index * groupW + groupW / 2;
    const grid = axis.ticks.map((tick) => {
      const y = yOf(tick);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" stroke="rgba(28,27,25,0.14)" />
        <text x="${padLeft - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#6d6962" font-size="11">${escapeAttr(axisMoney(tick))}</text>`;
    }).join("");
    const lines = series.map((item) => {
      const points = labels.map((_, index) => `${xOf(index).toFixed(1)},${yOf(Number(item.values[index]) || 0).toFixed(1)}`).join(" ");
      return `<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
    }).join("");
    const dots = series.map((item) => labels.map((_, index) => {
      const y = yOf(Number(item.values[index]) || 0);
      return `<circle cx="${xOf(index).toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${item.color}" stroke="#f7f4ee" stroke-width="2" />`;
    }).join("")).join("");
    const hits = [];
    const captions = [];
    labels.forEach((label, index) => {
      const x0 = padLeft + index * groupW;
      hits.push(`<rect class="chart-hit" x="${x0.toFixed(1)}" y="${padTop}" width="${groupW.toFixed(1)}" height="${plotH}" fill="transparent" data-chart-tip="${chartTipPayload(label, series.map((item) => ({ name: item.name, value: Number(item.values[index]) || 0, color: item.color })))}" />`);
      captions.push(`<text x="${xOf(index).toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="#6d6962" font-size="11">${escapeAttr(label)}</text>`);
    });
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="График с точками по месяцам">${grid}${lines}${dots}${captions.join("")}${hits.join("")}</svg>`;
  }

  function paintChartTip(data) {
    els.chartTip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = data.title;
    els.chartTip.appendChild(title);
    data.rows.forEach((row) => {
      const line = document.createElement("span");
      const name = document.createElement("b");
      const swatch = document.createElement("i");
      swatch.style.background = row.color;
      name.append(swatch, document.createTextNode(row.name));
      const value = document.createElement("em");
      value.textContent = row.value;
      line.append(name, value);
      els.chartTip.appendChild(line);
    });
  }

  function placeChartTip(event) {
    const box = els.chartStage.getBoundingClientRect();
    const tip = els.chartTip;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    let left = x + 14;
    let top = y - tipH - 12;
    if (left + tipW > box.width - 6) left = Math.max(6, x - tipW - 14);
    if (top < 4) top = y + 16;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function bindChartTips() {
    if (!els.chartStage || els.chartStage.dataset.tips) return;
    const show = (event) => {
      const hit = event.target.closest?.("[data-chart-tip]");
      if (!hit || !els.chartStage.contains(hit)) {
        els.chartTip.hidden = true;
        return;
      }
      try {
        paintChartTip(JSON.parse(hit.getAttribute("data-chart-tip")));
      } catch {
        els.chartTip.hidden = true;
        return;
      }
      els.chartTip.hidden = false;
      placeChartTip(event);
    };
    els.chartStage.addEventListener("pointermove", show);
    els.chartStage.addEventListener("pointerdown", show);
    els.chartStage.addEventListener("pointerleave", () => {
      els.chartTip.hidden = true;
    });
    els.chartStage.dataset.tips = "1";
  }

  function bindAnalyticsReset() {
    const button = document.getElementById("btnAnalyticsReset");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", resetAnalyticsFilters);
  }

  function renderAnalyticsNav() {
    if (!els.analyticsYear || !els.analyticsMonth) return;
    ensureAnalyticsFilters();
    const single = analyticsIsSingle();
    els.analyticsYear.innerHTML = "";
    YEARS.forEach((year) => {
      const pressed = analyticsYears.includes(year);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `month-chip${pressed ? " active" : ""}`;
      btn.textContent = String(year);
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      btn.addEventListener("click", () => toggleAnalyticsYear(year));
      els.analyticsYear.appendChild(btn);
    });
    els.analyticsMonth.innerHTML = "";
    MONTHS_SHORT.forEach((name, index) => {
      const pressed = analyticsMonths.includes(index) && !(single && analyticsYearPoints);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `month-chip${pressed ? " active" : ""}`;
      btn.textContent = name;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      btn.addEventListener("click", () => toggleAnalyticsMonth(index));
      els.analyticsMonth.appendChild(btn);
    });
  }

  function renderAnalytics() {
    if (!els.analyticsCharts || !state) return;
    bindChartTips();
    bindAnalyticsReset();
    renderAnalyticsNav();
    const single = analyticsIsSingle();
    const years = [...analyticsYears].sort((a, b) => a - b);
    const marks = [...analyticsMonths];
    const year = years[0];
    const selectedMonth = marks[0];
    const packs = years.map((item) => ({
      year: item,
      budget: budgetSeries(item),
      payroll: payrollSeries(item),
      saved: monthAmounts(item, (key) => savingsTopup(key)),
      utilities: monthAmounts(item, (key) => utilityTotal(key)),
    }));
    const yearTone = (index) => [
      { income: "#1d6b45", expense: "#8d3a32", saved: "#9a6424", utility: "#1f4d4a" },
      { income: "#6aa384", expense: "#c47a72", saved: "#c49658", utility: "#5d8d89" },
      { income: "#143f2c", expense: "#5c2420", saved: "#6d4718", utility: "#143330" },
    ][index % 3];
    const flowOf = (pack) => [
      { name: "Доходы", color: "#1d6b45", values: pack.budget.income },
      { name: "Расходы", color: "#8d3a32", values: pack.budget.plan },
    ];
    const payrollOf = (pack) => [{ name: "Зарплата", color: "#1d6b45", values: pack.payroll }];
    const savedOf = (pack) => [{ name: "Отложено", color: "#9a6424", values: pack.saved }];
    const utilityOf = (pack) => [{ name: "Коммуналка", color: "#1f4d4a", values: pack.utilities }];
    const compare = years.length > 1 && marks.length === 0;
    const compareFlow = packs.flatMap((pack, index) => {
      const tone = yearTone(index);
      return [
        { name: `Доходы ${pack.year}`, color: tone.income, values: pack.budget.income },
        { name: `Расходы ${pack.year}`, color: tone.expense, values: pack.budget.plan },
      ];
    });
    const comparePayroll = packs.map((pack, index) => ({
      name: `Зарплата ${pack.year}`,
      color: yearTone(index).income,
      values: pack.payroll,
    }));
    const compareSaved = packs.map((pack, index) => ({
      name: `Отложено ${pack.year}`,
      color: yearTone(index).saved,
      values: pack.saved,
    }));
    const compareUtility = packs.map((pack, index) => ({
      name: `Коммуналка ${pack.year}`,
      color: yearTone(index).utility,
      values: pack.utilities,
    }));
    const incomeSum = sumNumbers(packs.flatMap((pack) => pack.budget.income));
    const planSum = sumNumbers(packs.flatMap((pack) => pack.budget.plan));
    const payrollSum = sumNumbers(packs.flatMap((pack) => pack.payroll));
    const savedSum = sumNumbers(packs.flatMap((pack) => pack.saved));
    const utilitySum = sumNumbers(packs.flatMap((pack) => pack.utilities));
    const monthName = MONTHS_RU[selectedMonth] || "";
    const parts = single && !analyticsYearPoints ? monthParts(year, selectedMonth) : null;
    const viewNote = compare
      ? "Сравнение годов тем же графиком по месяцам."
      : single
        ? (analyticsYearPoints
          ? "Точки по месяцам за год. Нажмите месяц — снова столбцы."
          : "Ещё раз по выбранному месяцу — график с точками за год.")
        : "Тот же график года: отмеченные месяцы выделены.";
    const scope = compare ? "Сравнение годов" : (years.length === 1 ? `За ${year}` : "За выбранные годы");
    const periodNote = years.length === 1
      ? `Общая сумма по месяцам ${year}`
      : "Общая сумма по выбранным годам";
    const drawCharts = (seriesOf) => {
      if (single && analyticsYearPoints) return pointChart(MONTHS_SHORT, seriesOf(packs[0]));
      return packs.map((pack) => {
        const caption = years.length > 1 ? `<p class="chart-year">${pack.year}</p>` : "";
        return `${caption}${columnChart(MONTHS_SHORT, seriesOf(pack), marks)}`;
      }).join("");
    };
    const flow = compare ? compareFlow : flowOf(packs[0]);
    const payrollSeriesView = compare ? comparePayroll : payrollOf(packs[0]);
    const savedSeries = compare ? compareSaved : savedOf(packs[0]);
    const utilitySeries = compare ? compareUtility : utilityOf(packs[0]);
    const paint = (series, seriesOf) => (
      compare ? columnChart(MONTHS_SHORT, series, -1) : drawCharts(seriesOf)
    );
    const breakdown = parts ? `
      <div class="chart-split">
        <div>
          <h4>Доходы · ${escapeAttr(monthName)}</h4>
          ${rowChart(parts.income, "#1d6b45")}
        </div>
        <div>
          <h4>Расходы · ${escapeAttr(monthName)}</h4>
          ${rowChart(parts.expenses, "#8d3a32")}
        </div>
      </div>
    ` : "";
    els.analyticsCharts.innerHTML = `
      <article class="chart-card">
        <h4>Доходы и расходы</h4>
        <p class="chart-note">${scope}: доходы ${escapeAttr(money(incomeSum))}, расходы ${escapeAttr(money(planSum))}. ${viewNote}</p>
        ${paint(flow, flowOf)}
        ${chartLegend(flow)}
        ${breakdown}
      </article>
      <article class="chart-card">
        <h4>Зарплата</h4>
        <p class="chart-note">${periodNote}: ${escapeAttr(money(payrollSum))}. Зарплата и аванс месяца вместе.</p>
        ${paint(payrollSeriesView, payrollOf)}
        ${chartLegend(payrollSeriesView)}
      </article>
      <article class="chart-card">
        <h4>Откладывания</h4>
        <p class="chart-note">${periodNote}: ${escapeAttr(money(savedSum))}</p>
        ${paint(savedSeries, savedOf)}
        ${chartLegend(savedSeries)}
      </article>
      <article class="chart-card">
        <h4>Коммуналка</h4>
        <p class="chart-note">${periodNote}: ${escapeAttr(money(utilitySum))}</p>
        ${paint(utilitySeries, utilityOf)}
        ${chartLegend(utilitySeries)}
      </article>
    `;
  }

  function render() {
    if (syncBrokerIncomeRows()) saveState();
    if (els.rentDialog?.open && rentMenuKey && rentMenuKey !== state.currentMonth) closeRentMenu();
    const month = activeMonth();
    const key = `${state.year}|${state.currentMonth}`;
    const switched = paintedKey != null && paintedKey !== key;
    animateRows = paintedKey == null || switched;
    paintedKey = key;
    els.monthTitle.textContent = monthLabel(state.currentMonth);
    els.monthHint.textContent = state.seeded
      ? "Стартовые цифры из Бюджет_2026 — можно править, факт вводить отдельно"
      : "Данные хранятся только в этом браузере";
    renderYearNav();
    renderMonthNav();
    refreshExpenseDefaults();
    bindWorkdays(month);
    renderIncome(month);
    renderExpenses(month);
    renderSavings();
    renderUtilities();
    renderAnalytics();
    refreshTotalsOnly();
    if (switched) {
      [".sheet-top", ".month-head", ".workdays", ".income-panel", ".expense-panel"].forEach((selector, index) => {
        markFresh(selector, index);
      });
      scrollActiveMonthIntoView("smooth");
    }
  }

  function formatEditable(n) {
    if (n == null || Number.isNaN(n)) return "";
    if (Math.abs(n % 1) < 1e-9) return String(Math.round(n));
    return String(Math.round(n * 100) / 100);
  }

  function escapeAttr(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function exportData() {
    const payload = {
      version: 3,
      year: state.year,
      currentMonth: state.currentMonth,
      source: "Бюджет",
      exportedAt: new Date().toISOString(),
      oklad: state.oklad,
      dailyAverage: state.dailyAverage,
      rentDefaults: state.rentDefaults,
      savingsFact: state.savingsFact,
      utilities: state.utilities,
      years: state.years,
      months: state.months,
      sheetNovemberCosts: state.sheetNovemberCosts,
      sheetBudgetThrough: state.sheetBudgetThrough,
      sheetSavingsFact: state.sheetSavingsFact,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-${state.currentMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== "object") throw new Error("bad");
        const hasYears = data.years && typeof data.years === "object";
        const hasMonths = data.months && typeof data.months === "object";
        if (!hasYears && !hasMonths) throw new Error("bad months");
        const next = buildStateFromSeed(seedTemplate || {}, false);
        delete next.needsPayroll;
        if (Number.isFinite(Number(data.oklad)) && Number(data.oklad) > 0) next.oklad = Number(data.oklad);
        if (Number.isFinite(Number(data.dailyAverage)) && Number(data.dailyAverage) >= 0) {
          next.dailyAverage = Number(data.dailyAverage);
        }
        if (Array.isArray(data.rentDefaults)) next.rentDefaults = cloneRentLines(data.rentDefaults);
        if (hasYears) {
          Object.keys(data.years).forEach((key) => {
            const year = Number(key);
            if (!Number.isInteger(year)) return;
            installImportedYear(next, year, data.years[key]?.months);
          });
        } else {
          const grouped = {};
          Object.keys(data.months).forEach((key) => {
            if (!/^\d{4}-\d{2}$/.test(key)) return;
            const year = yearOf(key);
            if (!grouped[year]) grouped[year] = {};
            grouped[year][key] = data.months[key];
          });
          Object.keys(grouped).forEach((key) => installImportedYear(next, Number(key), grouped[key]));
        }
        if (data.savingsFact && typeof data.savingsFact === "object") next.savingsFact = data.savingsFact;
        if (data.utilities && typeof data.utilities === "object") next.utilities = data.utilities;
        next.sheetNovemberCosts = data.sheetNovemberCosts || "2026-11";
        next.sheetBudgetThrough = data.sheetBudgetThrough || "2026-10";
        next.sheetSavingsFact = data.sheetSavingsFact || "2026";
        ensureRentStructure(next);
        dropKvFromDecember(next);
        ensureTitheStructure(next);
        const importedYear = Number(data.year);
        const year = next.years[importedYear] ? importedYear : Number(Object.keys(next.years)[0]);
        attachYear(next, year);
        if (data.currentMonth && next.years[yearOf(data.currentMonth)]?.months?.[data.currentMonth]) {
          next.year = yearOf(data.currentMonth);
          next.currentMonth = data.currentMonth;
          next.months = next.years[next.year].months;
        }
        if (!confirm("Импортировать бюджет? Текущие данные на этом устройстве будут заменены.")) return;
        state = next;
        saveState();
        render();
      } catch {
        alert("Не удалось прочитать файл. Нужен JSON экспорта этого приложения.");
      }
    };
    reader.readAsText(file);
  }

  function resetFromTable() {
    if (!confirm("Вернуть все месяцы к цифрам из таблицы Бюджет_2026?")) return;
    state = buildStateFromSeed(seedTemplate, true);
    delete state.sheetBudgetThrough;
    delete state.sheetSavingsFact;
    delete state.needsPayroll;
    applySheetBudget(state, sheetBudget);
    ensureSavingsFact(state);
    applySheetSavings(state, sheetSavings);
    saveState();
    render();
  }

  els.btnAddIncome.addEventListener("click", () => {
    activeMonth().income.push({ id: uid("inc"), label: "Прочее", amount: 0 });
    state.seeded = false;
    saveState();
    render();
  });

  els.expenseHead.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fill-key]");
    if (!button) return;
    fillExpensesFromPrevious(button.dataset.fillKey);
  });

  els.btnFillExpenses.addEventListener("click", () => fillExpensesFromPrevious());

  els.btnAddSavings?.addEventListener("click", () => {
    const lines = savingsLines();
    const index = lines.findIndex((row) => row.id === "earned");
    const line = { id: uid("sav"), name: "Новая строка" };
    if (index < 0) lines.push(line);
    else lines.splice(index, 0, line);
    state.savingsFact.rows[line.id] = {};
    saveState();
    renderSavings();
  });

  els.btnAddBrokerIncome.addEventListener("click", () => {
    if (!state.savingsFact.brokerIncomes) state.savingsFact.brokerIncomes = [];
    state.savingsFact.brokerIncomes.push({ id: uid("brk"), name: "Новый доход", amounts: {} });
    saveState();
    renderSavings();
  });

  els.btnClearExpenses.addEventListener("click", () => {
    if (!confirm("Очистить все суммы расходов этого месяца?")) return;
    clearAllExpenses();
  });

  els.btnAddExpense.addEventListener("click", () => {
    activeMonth().expenses.push({
      id: uid("exp"),
      name: "Прочее",
      plan: null,
      shares: {},
      sharesManual: {},
    });
    state.seeded = false;
    saveState();
    render();
  });

  els.btnExport.addEventListener("click", exportData);
  document.getElementById("btnAnalytics").addEventListener("click", () => {
    document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.btnReset.addEventListener("click", resetFromTable);
  els.btnSettings.addEventListener("click", openSettings);
  els.btnSettingsCancel.addEventListener("click", closeSettings);
  document.getElementById("btnSettingsClose").addEventListener("click", closeSettings);
  els.btnSettingsSave.addEventListener("click", () => {
    if (commitSettings()) closeSettings();
  });
  els.settingsOklad.addEventListener("input", () => {
    const parsed = parseNumber(els.settingsOklad.value);
    settingsDraftOklad = parsed;
    if (parsed != null && parsed > 0) renderSettingsCalc(parsed);
  });
  els.settingsDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeSettings();
  });
  els.settingsDialog.addEventListener("close", syncDialogScrollLock);
  els.settingsDialog.addEventListener("click", (e) => {
    if (e.target === els.settingsDialog) closeSettings();
  });
  document.getElementById("rentDialogClose").addEventListener("click", closeRentMenu);
  els.rentAdd.addEventListener("click", () => addRentLine(rentMenuKey || state.currentMonth));
  els.rentDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeRentMenu();
  });
  els.rentDialog.addEventListener("close", syncDialogScrollLock);
  els.rentDialog.addEventListener("click", (e) => {
    if (e.target === els.rentDialog) closeRentMenu();
  });
  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = "";
  });

  function clearStaleCaches() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
    }
  }

  function watchForUpdate() {
    const badge = document.querySelector(".app-version");
    if (badge) badge.textContent = `v${APP_VERSION}`;

    const check = async () => {
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote = String(data.version || "");
        if (!remote || remote === APP_VERSION) return;
        const next = new URL(location.href);
        next.searchParams.set("v", remote);
        location.replace(next.toString());
      } catch {
        /* следующая проверка повторит запрос */
      }
    };

    check();
    setInterval(check, 20000);
  }

  async function boot() {
    clearStaleCaches();
    try {
      const [seedRes, sheetRes, savingsRes] = await Promise.all([
        fetch(`./seed-data.json?v=${APP_VERSION}`, { cache: "no-store" }),
        fetch(`./sheet-budget-2026.json?v=${APP_VERSION}`, { cache: "no-store" }),
        fetch(`./sheet-savings-2026.json?v=${APP_VERSION}`, { cache: "no-store" }),
      ]);
      if (!seedRes.ok) throw new Error("seed missing");
      seedTemplate = await seedRes.json();
      if (sheetRes.ok) sheetBudget = await sheetRes.json();
      if (savingsRes.ok) sheetSavings = await savingsRes.json();
    } catch {
      seedTemplate = { version: 3, year: state?.year || 2026, months: {} };
    }
    state = loadState(seedTemplate);
    if (!Number.isFinite(Number(state.oklad)) || Number(state.oklad) <= 0) {
      state.oklad = defaultOklad(seedTemplate);
    }
    if (state.needsPayroll) {
      applySalaryToMonths(state, { force: true });
      delete state.needsPayroll;
      saveState();
    }
    let droppedVacation = false;
    YEARS.forEach((year) => {
      Object.values(state.years[year].months).forEach((month) => {
        if (month.workdays?.vacationOn) return;
        const before = month.income.length;
        month.income = month.income.filter((row) => !isVacationLabel(row.label) || row.manual);
        if (month.income.length !== before) droppedVacation = true;
      });
    });
    const savingsReady = ensureSavingsFact(state);
    const savingsApplied = applySheetSavings(state, sheetSavings);
    const rentBackfill = backfillRentFromSavings(state);
    if (droppedVacation || ensureRentStructure(state) || dropKvFromDecember(state) || blankExpenseZeros(state) || ensureTitheStructure(state) || applySheetNovemberCosts(state) || applySheetBudget(state, sheetBudget) || savingsReady || savingsApplied || rentBackfill || ensureUtilities(state)) saveState();
    render();
  }

  watchForUpdate();
  boot();
})();
