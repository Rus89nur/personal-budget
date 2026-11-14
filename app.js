(() => {
  const APP_VERSION = "1.3.2";
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
    expensePlanTotal: document.getElementById("expensePlanTotal"),
    expenseFactTotal: document.getElementById("expenseFactTotal"),
    expenseDeltaTotal: document.getElementById("expenseDeltaTotal"),
    btnAddIncome: document.getElementById("btnAddIncome"),
    btnAddExpense: document.getElementById("btnAddExpense"),
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
  };

  let seedTemplate = null;
  let state = null;
  let settingsDraftOklad = null;

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
        { id: uid("inc"), label: "КВ", amount: 0 },
        { id: uid("inc"), label: "Брокер", amount: 0 },
      ],
      expenses: [
        { id: uid("exp"), name: "Отложить", plan: 0, fact: null },
        { id: uid("exp"), name: "Жили были", plan: 0, fact: null },
        { id: uid("exp"), name: "Ипотека", plan: 0, fact: null },
        { id: uid("exp"), name: "Инет, связи", plan: 0, fact: null },
        { id: uid("exp"), name: "Комуналка", plan: 0, fact: null },
        { id: uid("exp"), name: "Покупки", plan: 0, fact: null },
        { id: uid("exp"), name: "Отдых", plan: 0, fact: null },
        { id: uid("exp"), name: "Бензин", plan: 0, fact: null },
        { id: uid("exp"), name: "Баня", plan: 0, fact: null },
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
        income: (src.income || []).map((row) => ({
          id: row.id || uid("inc"),
          label: String(row.label || "Прочее"),
          amount: Number(row.amount) || 0,
        })),
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
    return next;
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

  function monthLabel(key) {
    const m = Number(key.slice(5, 7));
    return `${MONTHS_RU[m - 1]} ${yearOf(key)}`;
  }

  function activeMonth() {
    return state.months[state.currentMonth];
  }

  function totals(month) {
    const income = month.income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const plan = month.expenses.reduce((s, r) => s + (Number(r.plan) || 0), 0);
    const factRows = month.expenses.filter((r) => r.fact != null && r.fact !== "");
    const fact = factRows.length
      ? month.expenses.reduce((s, r) => s + (r.fact == null ? 0 : Number(r.fact) || 0), 0)
      : null;
    const remain = income - plan;
    const remainFact = fact == null ? null : income - fact;
    return { income, plan, fact, remain, remainFact, factCount: factRows.length };
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
      if (payroll) tr.classList.add("payroll-derived");
      if (animateRows) {
        tr.classList.add("row-in");
        tr.style.animationDelay = `${Math.min(index, 8) * 0.045}s`;
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

  function renderExpenses(month) {
    els.expenseBody.innerHTML = "";
    month.expenses.forEach((row, index) => {
      const delta = row.fact == null ? null : (Number(row.fact) || 0) - (Number(row.plan) || 0);
      const deltaClass =
        delta == null ? "delta-zero" : delta > 0 ? "delta-neg" : delta < 0 ? "delta-pos" : "delta-zero";
      const tr = document.createElement("tr");
      if (animateRows) {
        tr.classList.add("row-in");
        tr.style.animationDelay = `${Math.min(index, 12) * 0.04}s`;
      }
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.name)}" data-field="name" /></td>
        <td class="num"><input class="num-input" type="text" inputmode="decimal" value="${formatEditable(row.plan)}" data-field="plan" /></td>
        <td class="num"><input class="num-input" type="text" inputmode="decimal" value="${row.fact == null ? "" : formatEditable(row.fact)}" placeholder="—" data-field="fact" /></td>
        <td class="num ${deltaClass}" data-delta>${delta == null ? "—" : money(delta)}</td>
        <td class="actions-col"><button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button></td>
      `;
      const nameInput = tr.querySelector('[data-field="name"]');
      const planInput = tr.querySelector('[data-field="plan"]');
      const factInput = tr.querySelector('[data-field="fact"]');
      const deltaCell = tr.querySelector("[data-delta]");

      nameInput.addEventListener("change", () => {
        row.name = nameInput.value.trim() || "Прочее";
        state.seeded = false;
        saveState();
      });

      const syncRow = () => {
        const d = row.fact == null ? null : (Number(row.fact) || 0) - (Number(row.plan) || 0);
        deltaCell.textContent = d == null ? "—" : money(d);
        deltaCell.className = `num ${d == null ? "delta-zero" : d > 0 ? "delta-neg" : d < 0 ? "delta-pos" : "delta-zero"}`;
        refreshTotalsOnly();
      };

      planInput.addEventListener("change", () => {
        row.plan = parseNumber(planInput.value) || 0;
        planInput.value = formatEditable(row.plan);
        state.seeded = false;
        saveState();
        syncRow();
      });

      factInput.addEventListener("change", () => {
        const parsed = parseNumber(factInput.value);
        row.fact = parsed;
        factInput.value = parsed == null ? "" : formatEditable(parsed);
        state.seeded = false;
        saveState();
        syncRow();
      });

      tr.querySelector('[data-act="del"]').addEventListener("click", () => {
        month.expenses = month.expenses.filter((r) => r.id !== row.id);
        state.seeded = false;
        saveState();
        render();
      });

      els.expenseBody.appendChild(tr);
    });
  }

  function refreshTotalsOnly() {
    const month = activeMonth();
    const t = totals(month);
    paintText(els.sumIncome, money(t.income));
    paintText(els.sumPlan, money(t.plan));
    paintText(els.sumFact, t.fact == null ? "—" : money(t.fact));
    paintText(els.sumRemain, money(t.remain));
    els.sumRemain.parentElement.classList.toggle("negative", t.remain < 0);
    paintText(els.incomeTotal, money(t.income));
    paintText(els.expensePlanTotal, money(t.plan));
    paintText(els.expenseFactTotal, t.fact == null ? "—" : money(t.fact));
    const deltaTotal = t.fact == null ? null : t.fact - t.plan;
    els.expenseDeltaTotal.className = `num ${
      deltaTotal == null ? "delta-zero" : deltaTotal > 0 ? "delta-neg" : deltaTotal < 0 ? "delta-pos" : "delta-zero"
    }`;
    paintText(els.expenseDeltaTotal, deltaTotal == null ? "—" : money(deltaTotal));
  }

  function render() {
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
    bindWorkdays(month);
    renderIncome(month);
    renderExpenses(month);
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
        for (const key of monthKeys()) {
          if (months[key]) {
            const src = months[key];
            next.months[key] = {
              workdays: {
                total: src.workdays?.total ?? null,
                worked: src.workdays?.worked ?? null,
                vacation: src.workdays?.vacation ?? null,
              },
              income: (src.income || []).map((row) => ({
                id: row.id || uid("inc"),
                label: String(row.label || "Прочее"),
                amount: Number(row.amount) || 0,
              })),
              expenses: (src.expenses || []).map((row) => ({
                id: row.id || uid("exp"),
                name: String(row.name || "Прочее"),
                plan: Number(row.plan) || 0,
                fact: row.fact == null || row.fact === "" ? null : Number(row.fact),
              })),
            };
          }
        }
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

  els.btnAddExpense.addEventListener("click", () => {
    activeMonth().expenses.push({ id: uid("exp"), name: "Прочее", plan: 0, fact: null });
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
    if (droppedVacation) saveState();
    render();
  }

  watchForUpdate();
  boot();
})();
