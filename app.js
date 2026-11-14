(() => {
  const APP_VERSION = "1.8.1";
  const STORAGE_KEY = "personal-budget-v2";
  const YEARS = [2026, 2027];
  const Salary = window.BudgetSalary;

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
    utilitiesHead: document.getElementById("utilitiesHead"),
    utilitiesBody: document.getElementById("utilitiesBody"),
  };

  let seedTemplate = null;
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
    if (isSalaryLabel(row.label)) return "salary";
    if (isAdvanceLabel(row.label)) return "advance";
    if (isVacationLabel(row.label)) return "vacation";
    return `name:${String(row.label || "").trim().toLowerCase()}`;
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
    }
    return copy;
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
    renderRentMenu();
    const names = els.rentList.querySelectorAll(".name-input");
    names[names.length - 1]?.focus();
    names[names.length - 1]?.select();
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
    renderRentMenu();
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
        <input class="name-input" type="text" value="${escapeAttr(line.label)}" aria-label="Название" />
        <input class="num-input" type="text" inputmode="decimal" value="${formatEditable(line.amount)}" aria-label="Сумма" />
        <button type="button" class="icon-x" aria-label="Удалить строку">×</button>
      `;
      const [check, name, amount, remove] = item.children;
      check.addEventListener("change", () => patchRentLine(key, line.id, { active: check.checked }));
      name.addEventListener("change", () => patchRentLine(key, line.id, { label: name.value }));
      amount.addEventListener("change", () => patchRentLine(key, line.id, { amount: parseNumber(amount.value) || 0 }));
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
    els.rentList.querySelector(".num-input")?.focus();
  }

  function closeRentMenu() {
    rentMenuKey = null;
    if (typeof els.rentDialog.close === "function" && els.rentDialog.open) els.rentDialog.close();
    else els.rentDialog.removeAttribute("open");
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
          month.income = month.income.filter((row) => !isVacationLabel(row.label));
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

  document.addEventListener("focusin", (event) => {
    const input = event.target;
    if (!isNumericField(input)) return;
    if (!isPlainZero(input.value)) {
      delete input.dataset.zeroArmed;
      return;
    }
    input.dataset.zeroArmed = "1";
    input.select();
  });

  document.addEventListener("mouseup", (event) => {
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
      input.select();
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
    queueMicrotask(() => {
      els.settingsOklad.focus();
      els.settingsOklad.select();
    });
  }

  function closeSettings() {
    if (typeof els.settingsDialog.close === "function" && els.settingsDialog.open) {
      els.settingsDialog.close();
    } else {
      els.settingsDialog.removeAttribute("open");
    }
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
          <td class="num"><input class="num-input" type="text" inputmode="decimal" value="${formatEditable(row.amount)}" data-rent-amount readonly title="Нажмите, чтобы изменить" /></td>
          <td class="actions-col"></td>
        `;
        tr.querySelector("[data-act=rent]").addEventListener("click", openRentMenu);
        tr.querySelector("[data-rent-amount]").addEventListener("click", openRentMenu);
        els.incomeBody.appendChild(tr);
        return;
      }
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.label)}" data-field="label" ${payroll ? "readonly" : ""} /></td>
        <td class="num"><input class="num-input" type="text" inputmode="decimal" value="${formatEditable(row.amount)}" data-field="amount" title="${payroll ? "Можно поправить вручную" : ""}" /></td>
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
    return `<input class="num-input" type="text" inputmode="decimal" value="${shown}" placeholder="—" data-key="${escapeAttr(key)}" />`;
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
        <th class="num">
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
        <th class="num remain-value" data-remain="plan"></th>
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
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.name)}" data-field="name" /></td>
        <td class="num">${shareInput(row, "plan")}</td>
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
          state.seeded = false;
          saveState();
          refreshTotalsOnly();
        };

        input.addEventListener("focus", () => {
          if (cellValue(row, key) != null) return;
          const suggested = suggestionFor(row, key);
          if (suggested == null) return;
          arming = true;
          input.value = formatEditable(suggested);
          input.dataset.pending = "1";
          input.classList.add("is-suggestion");
          arming = false;
          requestAnimationFrame(() => input.select());
        });

        input.addEventListener("mousedown", (event) => {
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
  }

  const SAVINGS_MONTHS = [
    ["2025-08", "авг", "2025"], ["2025-09", "сен", "2025"], ["2025-10", "окт", "2025"],
    ["2025-11", "ноя", "2025"], ["2025-12", "дек", "2025"],
    ["2026-01", "янв", "2026"], ["2026-02", "фев", "2026"], ["2026-03", "мар", "2026"],
    ["2026-04", "апр", "2026"], ["2026-05", "май", "2026"], ["2026-06", "июн", "2026"],
    ["2026-07", "июл", "2026"], ["2026-08", "авг", "2026"], ["2026-09", "сен", "2026"],
    ["2026-10", "окт", "2026"], ["2026-11", "ноя", "2026"], ["2026-12", "дек", "2026"],
  ];

  const SAVINGS_ROWS = [
    { id: "deposit", name: "Вклад" },
    { id: "broker", name: "Брокерский счет" },
    { id: "iis", name: "ИИС" },
    { id: "iis3", name: "ИИС 3" },
    { id: "flat1", name: "Квартира 1" },
    { id: "flat2", name: "Квартира 2" },
    { id: "garage", name: "Гараж" },
    { id: "own", name: "Вложил свои" },
    { id: "earned", name: "Заработал в месяц", calc: "earned" },
    { id: "capitalPlan", name: "Капитал план" },
    { id: "capitalFact", name: "Капитал факт" },
    { id: "delta", name: "Прирост", calc: "delta" },
    { id: "topup", name: "Пополнил БС", calc: "topup" },
  ];

  const SAVINGS_EARNED = ["deposit", "broker", "iis", "iis3", "flat1", "flat2", "garage"];

  function defaultSavingsFact() {
    return {
      rows: {
        deposit: { "2026-01": 30640, "2026-02": 20963, "2026-03": 32708, "2026-04": 24695 },
        broker: { "2025-08": 18000, "2025-11": 8368, "2025-12": 14606, "2026-01": 5461, "2026-02": 4169, "2026-03": 6377.04, "2026-05": 32205.73, "2026-06": 36835.8, "2026-07": 37503, "2026-08": 42123, "2026-09": 39944.3, "2026-10": 56306.7 },
        iis: {},
        iis3: {},
        flat1: { "2025-08": 19000, "2025-11": 19500, "2025-12": 19000, "2026-01": 19000, "2026-02": 19500, "2026-03": 19500, "2026-04": 19500, "2026-05": 21338, "2026-06": 20748, "2026-07": 20100, "2026-08": 20414, "2026-09": 20484, "2026-10": 21667 },
        flat2: { "2025-08": 25000, "2025-11": 29611, "2025-12": 30440, "2026-01": 25000, "2026-02": 25000, "2026-03": 25000, "2026-04": 25000, "2026-05": 28451, "2026-06": 28500, "2026-07": 30000, "2026-08": 26595, "2026-09": 3651, "2026-10": 0 },
        garage: { "2025-08": 16500, "2025-11": 16500, "2025-12": 16500, "2026-01": 16500, "2026-02": 16500, "2026-03": 16500, "2026-04": 6500, "2026-05": 16500, "2026-06": 16500, "2026-07": 16500, "2026-08": 16500, "2026-09": 16500, "2026-10": 16500 },
        own: { "2026-01": 60000, "2026-02": 145870, "2026-03": 0, "2026-04": 118000, "2026-05": 118000, "2026-06": 108000, "2026-07": 0, "2026-08": 200000, "2026-09": 90000, "2026-10": 120000, "2026-11": 36468, "2026-12": 60000 },
        capitalPlan: { "2025-08": 997662, "2025-09": 997662, "2025-10": 2989305, "2025-11": 3063284, "2025-12": 3143830, "2026-01": 3109070, "2026-02": 3341072, "2026-04": 3694388, "2026-05": 3910882.73, "2026-06": 3518867.8, "2026-07": 3622970.8, "2026-08": 3928602.8, "2026-09": 4099182.1, "2026-10": 4313655.8, "2026-11": 4350123.8, "2026-12": 4410123.8 },
        capitalFact: { "2025-12": 2952469, "2026-03": 3525388, "2026-05": 3308284 },
      },
    };
  }

  function ensureSavingsFact(target) {
    if (target.savingsFact?.rows) return false;
    target.savingsFact = defaultSavingsFact();
    return true;
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

  function savingsEarned(key) {
    const parts = SAVINGS_EARNED.map((id) => savingsStored(id, key)).filter((value) => value != null);
    if (!parts.length) return null;
    return savingsRound(parts.reduce((sum, value) => sum + value, 0));
  }

  function savingsTopup(key) {
    const earned = savingsEarned(key);
    const own = savingsStored("own", key);
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

  function renderSavings() {
    if (!els.savingsHead || !els.savingsBody || !state.savingsFact) return;
    const key = state.currentMonth;
    const prevKey = previousMonthKey(key);
    els.savingsHead.innerHTML = `
      <tr>
        <th><span class="col-title">Строка</span></th>
        <th class="num"><span class="col-title">${escapeAttr(monthChip(prevKey))}</span></th>
        <th class="num"><span class="col-title">${escapeAttr(monthChip(key))}</span></th>
        <th class="num"><span class="col-title">Разница</span></th>
        <th class="num"><span class="col-title">%</span></th>
      </tr>
    `;
    els.savingsBody.innerHTML = "";
    SAVINGS_ROWS.forEach((row) => {
      const tr = document.createElement("tr");
      if (row.calc) tr.classList.add("is-total");
      const current = row.calc ? savingsCalc(row.calc, key) : savingsStored(row.id, key);
      const previous = row.calc ? savingsCalc(row.calc, prevKey) : savingsStored(row.id, prevKey);
      const view = compareView(current, previous);
      const currentCell = row.calc
        ? readCell(view.currentText)
        : `<input class="num-input" type="text" inputmode="decimal" data-blank="1" data-row="${row.id}" value="${current == null ? "" : formatEditable(current)}" placeholder="—" />`;
      tr.innerHTML = `
        <td>${nameCell(row.name)}</td>
        <td class="num">${readCell(view.prevText)}</td>
        <td class="num">${currentCell}</td>
        <td class="num">${readCell(view.deltaText, view.deltaTone)}</td>
        <td class="num">${readCell(view.percentText, view.percentTone)}</td>
      `;
      const input = tr.querySelector("input:not([readonly])");
      if (input) {
        input.addEventListener("change", () => {
          const parsed = parseNumber(input.value);
          if (!state.savingsFact.rows[row.id]) state.savingsFact.rows[row.id] = {};
          if (parsed == null) delete state.savingsFact.rows[row.id][key];
          else state.savingsFact.rows[row.id][key] = parsed;
          saveState();
          renderSavings();
        });
      }
      els.savingsBody.appendChild(tr);
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

  function utilityTone(n) {
    if (n == null || n === 0) return "";
    return n > 0 ? " delta-pos" : " delta-neg";
  }

  function renderUtilities() {
    if (!els.utilitiesHead || !els.utilitiesBody || !state.utilities) return;
    const key = state.currentMonth;
    const prevKey = previousMonthKey(key);
    els.utilitiesHead.innerHTML = `
      <tr>
        <th><span class="col-title">Строка</span></th>
        <th class="num"><span class="col-title">${escapeAttr(monthChip(prevKey))}</span></th>
        <th class="num"><span class="col-title">${escapeAttr(monthChip(key))}</span></th>
        <th class="num"><span class="col-title">Разница</span></th>
        <th class="num"><span class="col-title">%</span></th>
      </tr>
    `;
    els.utilitiesBody.innerHTML = "";
    const paintRow = (title, currentOf, editableId) => {
      const tr = document.createElement("tr");
      if (!editableId) tr.classList.add("is-total");
      const current = currentOf(key);
      const previous = currentOf(prevKey);
      const view = compareView(current, previous);
      const currentCell = editableId
        ? `<input class="num-input" type="text" inputmode="decimal" data-blank="1" data-row="${editableId}" value="${current == null ? "" : formatEditable(current)}" placeholder="—" />`
        : readCell(view.currentText);
      tr.innerHTML = `
        <td>${nameCell(title)}</td>
        <td class="num">${readCell(view.prevText)}</td>
        <td class="num">${currentCell}</td>
        <td class="num">${readCell(view.deltaText, view.deltaTone)}</td>
        <td class="num">${readCell(view.percentText, view.percentTone)}</td>
      `;
      const input = tr.querySelector("input:not([readonly])");
      if (input) {
        input.addEventListener("change", () => {
          const parsed = parseNumber(input.value);
          if (!state.utilities.rows[editableId]) state.utilities.rows[editableId] = {};
          if (parsed == null) delete state.utilities.rows[editableId][key];
          else state.utilities.rows[editableId][key] = parsed;
          saveState();
          renderUtilities();
        });
      }
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

  function render() {
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
    refreshTotalsOnly();
    if (switched) {
      [".sheet-top", ".month-head", ".workdays", ".income-panel", ".expense-panel"].forEach((selector, index) => {
        markFresh(selector, index);
      });
      document.querySelector(".month-chip.active")?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
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
      version: 2,
      year: state.year,
      source: "Бюджет",
      exportedAt: new Date().toISOString(),
      oklad: state.oklad,
      dailyAverage: state.dailyAverage,
      rentDefaults: state.rentDefaults,
      savingsFact: state.savingsFact,
      utilities: state.utilities,
      months: state.months,
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
        const months = data.months || data;
        if (!months || typeof months !== "object") throw new Error("bad months");
        const next = buildStateFromSeed({ months }, false);
        if (Number.isFinite(Number(data.oklad)) && Number(data.oklad) > 0) {
          next.oklad = Number(data.oklad);
        }
        if (Array.isArray(data.rentDefaults)) next.rentDefaults = cloneRentLines(data.rentDefaults);
        for (const key of monthKeys()) {
          if (months[key]) {
            const src = months[key];
            next.months[key] = {
              workdays: {
                total: src.workdays?.total ?? null,
                worked: src.workdays?.worked ?? null,
                vacation: src.workdays?.vacation ?? null,
              },
              income: (src.income || []).map(copyIncomeRow),
              expenses: (src.expenses || []).map((row) => ({
                id: row.id || uid("exp"),
                name: String(row.name || "Прочее"),
                plan: Number(row.plan) || 0,
                fact: row.fact == null || row.fact === "" ? null : Number(row.fact),
              })),
            };
          }
        }
        ensureRentStructure(next);
        dropKvFromDecember(next);
        ensureTitheStructure(next);
        if (data.savingsFact && typeof data.savingsFact === "object") next.savingsFact = data.savingsFact;
        if (data.utilities && typeof data.utilities === "object") next.utilities = data.utilities;
        if (!confirm("Импортировать бюджет? Текущие данные за этот год будут заменены.")) return;
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
  document.getElementById("rentDialogClose").addEventListener("click", closeRentMenu);
  els.rentAdd.addEventListener("click", () => addRentLine(rentMenuKey || state.currentMonth));
  els.rentDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeRentMenu();
  });
  els.rentDialog.addEventListener("click", (e) => {
    if (e.target === els.rentDialog) closeRentMenu();
  });
  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = "";
  });

  function watchForUpdate() {
    const badge = document.querySelector(".app-version");
    if (badge) badge.textContent = APP_VERSION;

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
    try {
      const res = await fetch("./seed-data.json", { cache: "no-store" });
      if (!res.ok) throw new Error("seed missing");
      seedTemplate = await res.json();
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
        month.income = month.income.filter((row) => !isVacationLabel(row.label));
        if (month.income.length !== before) droppedVacation = true;
      });
    });
    if (droppedVacation || ensureRentStructure(state) || dropKvFromDecember(state) || blankExpenseZeros(state) || ensureTitheStructure(state) || applySheetNovemberCosts(state) || ensureSavingsFact(state) || ensureUtilities(state)) saveState();
    render();
  }

  watchForUpdate();
  boot();
})();
