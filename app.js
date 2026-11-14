(() => {
  const APP_VERSION = "1.1.2";
  const STORAGE_KEY = "personal-budget-v2";
  const YEAR = 2026;
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
    workTotal: document.getElementById("workTotal"),
    workWorked: document.getElementById("workWorked"),
    workVacation: document.getElementById("workVacation"),
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

  function monthKeys() {
    return Array.from({ length: 12 }, (_, i) => `${YEAR}-${String(i + 1).padStart(2, "0")}`);
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

  function cloneSeedMonths(seed) {
    const months = {};
    for (const key of monthKeys()) {
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

  function currentMonthKey() {
    const now = new Date();
    if (now.getFullYear() === YEAR) {
      return `${YEAR}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${YEAR}-01`;
  }

  function defaultOklad(seed) {
    const fromSeed = Number(seed?.salary?.oklad);
    if (Number.isFinite(fromSeed) && fromSeed > 0) return fromSeed;
    return Salary.DEFAULT_OKLAD;
  }

  function buildStateFromSeed(seed, seeded = true) {
    return {
      version: 2,
      year: YEAR,
      currentMonth: currentMonthKey(),
      seeded,
      oklad: defaultOklad(seed),
      months: cloneSeedMonths(seed),
      savedAt: new Date().toISOString(),
    };
  }

  function loadState(seed) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildStateFromSeed(seed, true);
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2 || !parsed.months) {
        return buildStateFromSeed(seed, true);
      }
      for (const key of monthKeys()) {
        if (!parsed.months[key]) parsed.months[key] = emptyMonth();
      }
      if (!monthKeys().includes(parsed.currentMonth)) {
        parsed.currentMonth = currentMonthKey();
      }
      if (!Number.isFinite(Number(parsed.oklad)) || Number(parsed.oklad) <= 0) {
        parsed.oklad = defaultOklad(seed);
      }
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

  /** Убрать дубли ЗП/Аванс, оставить по одной строке каждого вида */
  function dedupePayrollRows(month) {
    let seenSalary = false;
    let seenAdvance = false;
    month.income = month.income.filter((row) => {
      if (isSalaryLabel(row.label)) {
        if (seenSalary) return false;
        seenSalary = true;
        return true;
      }
      if (isAdvanceLabel(row.label)) {
        if (seenAdvance) return false;
        seenAdvance = true;
        return true;
      }
      return true;
    });
  }

  function ensureIncomeRow(month, kind, label) {
    const match =
      kind === "advance"
        ? month.income.find((r) => isAdvanceLabel(r.label))
        : month.income.find((r) => isSalaryLabel(r.label));
    if (match) {
      match.label = label;
      return match;
    }
    const row = { id: uid("inc"), label, amount: 0 };
    const insertAt = kind === "salary" ? 0 : month.income.findIndex((r) => !isSalaryLabel(r.label));
    if (insertAt < 0) month.income.push(row);
    else month.income.splice(insertAt, 0, row);
    return row;
  }

  /**
   * Обновляет строки «ЗП» / «Аванс» во всех месяцах по окладу и рабочим дням.
   * Аванс месяца M — от factor(M); ЗП в месяце M — от factor(M−1) (ЗП прошлого месяца).
   */
  function applySalaryToMonths(target = state, { silent = false } = {}) {
    if (!target?.months) return;
    const calc = Salary.calculateFromOklad(target.oklad);
    const keys = monthKeys();

    keys.forEach((key, index) => {
      const month = target.months[key];
      if (!month) return;

      dedupePayrollRows(month);

      const advancePay = Salary.scalePay(calc, Salary.workFactor(month.workdays));
      const prevKey = index > 0 ? keys[index - 1] : null;
      const prevFactor = prevKey
        ? Salary.workFactor(target.months[prevKey]?.workdays)
        : 1;
      const salaryPay = Salary.scalePay(calc, prevFactor);

      const advanceLabel = `Аванс ${MONTH_GENITIVE[index]}`;
      const salaryLabel =
        index === 0 ? "ЗП декабря" : `ЗП ${MONTH_GENITIVE[index - 1]}`;

      const salaryRow = ensureIncomeRow(month, "salary", salaryLabel);
      salaryRow.amount = salaryPay.salary;

      const advanceRow = ensureIncomeRow(month, "advance", advanceLabel);
      advanceRow.amount = advancePay.advance;

      dedupePayrollRows(month);
    });

    if (!silent) {
      target.seeded = false;
    }
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
    return `${MONTHS_RU[m - 1]} ${YEAR}`;
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

  function bindWorkdays(month) {
    const map = [
      [els.workTotal, "total"],
      [els.workWorked, "worked"],
      [els.workVacation, "vacation"],
    ];
    map.forEach(([input, key]) => {
      const value = month.workdays[key];
      input.value = value == null ? "" : String(value);
      input.oninput = () => {
        month.workdays[key] = parseNumber(input.value);
        if (key === "total" || key === "worked") {
          applySalaryToMonths(state);
        } else {
          state.seeded = false;
        }
        saveState();
        if (key === "total" || key === "worked") {
          renderIncome(activeMonth());
          refreshTotalsOnly();
        }
      };
    });
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
    applySalaryToMonths(state);
    saveState();
    render();
    return true;
  }

  function renderIncome(month) {
    els.incomeBody.innerHTML = "";
    month.income.forEach((row) => {
      const payrollLocked = isAdvanceLabel(row.label) || isSalaryLabel(row.label);
      const tr = document.createElement("tr");
      if (payrollLocked) tr.classList.add("payroll-derived");
      tr.innerHTML = `
        <td><input class="name-input" type="text" value="${escapeAttr(row.label)}" data-field="label" ${payrollLocked ? "readonly" : ""} /></td>
        <td class="num"><input class="num-input" type="text" inputmode="decimal" value="${formatEditable(row.amount)}" data-field="amount" ${payrollLocked ? "readonly title=\"Считается из оклада в Настройках\"" : ""} /></td>
        <td class="actions-col">${payrollLocked ? "" : `<button type="button" class="icon-x" aria-label="Удалить" data-act="del">×</button>`}</td>
      `;
      const labelInput = tr.querySelector('[data-field="label"]');
      const amountInput = tr.querySelector('[data-field="amount"]');
      if (!payrollLocked) {
        labelInput.addEventListener("change", () => {
          row.label = labelInput.value.trim() || "Прочее";
          state.seeded = false;
          saveState();
        });
        amountInput.addEventListener("change", () => {
          row.amount = parseNumber(amountInput.value) || 0;
          amountInput.value = formatEditable(row.amount);
          state.seeded = false;
          saveState();
          refreshTotalsOnly();
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
    month.expenses.forEach((row) => {
      const delta = row.fact == null ? null : (Number(row.fact) || 0) - (Number(row.plan) || 0);
      const deltaClass =
        delta == null ? "delta-zero" : delta > 0 ? "delta-neg" : delta < 0 ? "delta-pos" : "delta-zero";
      const tr = document.createElement("tr");
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
    els.sumIncome.textContent = money(t.income);
    els.sumPlan.textContent = money(t.plan);
    els.sumFact.textContent = t.fact == null ? "—" : money(t.fact);
    els.sumRemain.textContent = money(t.remain);
    els.sumRemain.parentElement.classList.toggle("negative", t.remain < 0);
    els.incomeTotal.textContent = money(t.income);
    els.expensePlanTotal.textContent = money(t.plan);
    els.expenseFactTotal.textContent = t.fact == null ? "—" : money(t.fact);
    const deltaTotal = t.fact == null ? null : t.fact - t.plan;
    els.expenseDeltaTotal.textContent = deltaTotal == null ? "—" : money(deltaTotal);
    els.expenseDeltaTotal.className = `num ${
      deltaTotal == null ? "delta-zero" : deltaTotal > 0 ? "delta-neg" : deltaTotal < 0 ? "delta-pos" : "delta-zero"
    }`;
  }

  function render() {
    const month = activeMonth();
    els.monthTitle.textContent = monthLabel(state.currentMonth);
    els.monthHint.textContent = state.seeded
      ? "Стартовые цифры из Бюджет_2026 — можно править, факт вводить отдельно"
      : "Данные хранятся только в этом браузере";
    renderMonthNav();
    bindWorkdays(month);
    renderIncome(month);
    renderExpenses(month);
    refreshTotalsOnly();
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
      year: YEAR,
      source: "Бюджет_2026",
      exportedAt: new Date().toISOString(),
      oklad: state.oklad,
      months: state.months,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-2026-${state.currentMonth}.json`;
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
      seedTemplate = { version: 2, year: YEAR, months: {} };
    }
    state = loadState(seedTemplate);
    if (!Number.isFinite(Number(state.oklad)) || Number(state.oklad) <= 0) {
      state.oklad = defaultOklad(seedTemplate);
    }
    render();
  }

  watchForUpdate();
  boot();
})();
