(() => {
  const STORAGE_KEY = "personal-budget-v1";

  const INCOME_CATEGORIES = [
    "ЗП",
    "Аванс",
    "Пассив",
    "Вклад",
    "Брокерский счет",
    "Квартира",
    "Гараж",
    "Дивиденды",
    "Отпускные",
    "Прочее",
  ];

  const EXPENSE_CATEGORIES = [
    "Жили были",
    "Ипотека",
    "Связь",
    "Комуналка",
    "Отложить",
    "Покупки",
    "Отдых",
    "Бензин",
    "Тренировка",
    "Баня",
    "Дети",
    "Непланируемые",
    "Страховки",
    "Прочее",
  ];

  const MONTHS_RU = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];

  const els = {
    periodSelect: document.getElementById("periodSelect"),
    typeFilter: document.getElementById("typeFilter"),
    categoryFilter: document.getElementById("categoryFilter"),
    balanceValue: document.getElementById("balanceValue"),
    incomeValue: document.getElementById("incomeValue"),
    expenseValue: document.getElementById("expenseValue"),
    runningValue: document.getElementById("runningValue"),
    txList: document.getElementById("txList"),
    emptyState: document.getElementById("emptyState"),
    listHint: document.getElementById("listHint"),
    btnAdd: document.getElementById("btnAdd"),
    btnExport: document.getElementById("btnExport"),
    importFile: document.getElementById("importFile"),
    dialog: document.getElementById("txDialog"),
    form: document.getElementById("txForm"),
    dialogTitle: document.getElementById("dialogTitle"),
    amountInput: document.getElementById("amountInput"),
    categoryInput: document.getElementById("categoryInput"),
    dateInput: document.getElementById("dateInput"),
    noteInput: document.getElementById("noteInput"),
    formError: document.getElementById("formError"),
    btnDelete: document.getElementById("btnDelete"),
    btnCancel: document.getElementById("btnCancel"),
    btnCloseDialog: document.getElementById("btnCloseDialog"),
  };

  let state = loadState();
  let editingId = null;

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function sampleSeed() {
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    return [
      { id: uid(), type: "income", category: "ЗП", amount: 175000, date: `${y}-${m}-05`, note: "Зарплата" },
      { id: uid(), type: "income", category: "Аванс", amount: 149000, date: `${y}-${m}-20`, note: "" },
      { id: uid(), type: "income", category: "Пассив", amount: 66000, date: `${y}-${m}-01`, note: "Квартиры + вклад + гараж" },
      { id: uid(), type: "expense", category: "Жили были", amount: 60000, date: `${y}-${m}-03`, note: "" },
      { id: uid(), type: "expense", category: "Ипотека", amount: 38000, date: `${y}-${m}-10`, note: "" },
      { id: uid(), type: "expense", category: "Комуналка", amount: 26000, date: `${y}-${m}-12`, note: "" },
      { id: uid(), type: "expense", category: "Связь", amount: 2500, date: `${y}-${m}-08`, note: "Инет, связи" },
      { id: uid(), type: "expense", category: "Отложить", amount: 100000, date: `${y}-${m}-06`, note: "Пополнение БС" },
      { id: uid(), type: "expense", category: "Покупки", amount: 20000, date: `${y}-${m}-15`, note: "" },
      { id: uid(), type: "expense", category: "Бензин", amount: 10000, date: `${y}-${m}-14`, note: "" },
      { id: uid(), type: "expense", category: "Отдых", amount: 15000, date: `${y}-${m}-18`, note: "" },
      { id: uid(), type: "expense", category: "Баня", amount: 10000, date: `${y}-${m}-22`, note: "" },
    ];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { transactions: sampleSeed(), seeded: true };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        return { transactions: sampleSeed(), seeded: true };
      }
      return { transactions: parsed.transactions, seeded: Boolean(parsed.seeded) };
    } catch {
      return { transactions: sampleSeed(), seeded: true };
    }
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ transactions: state.transactions, seeded: state.seeded, savedAt: new Date().toISOString() })
    );
  }

  function money(n) {
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString("ru-RU", {
      minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ₽`;
  }

  function periodKey(dateStr) {
    return dateStr.slice(0, 7);
  }

  function periodLabel(key) {
    if (key === "all") return "Все время";
    const [y, m] = key.split("-");
    const month = MONTHS_RU[Number(m) - 1] || m;
    return `${month} ${y}`;
  }

  function categoriesFor(type) {
    return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  function fillCategorySelect(select, type, selected) {
    const cats = categoriesFor(type);
    select.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
    if (selected && cats.includes(selected)) select.value = selected;
  }

  function fillFilters() {
    const periods = new Set(state.transactions.map((t) => periodKey(t.date)));
    const current = todayISO().slice(0, 7);
    periods.add(current);
    const sorted = [...periods].sort((a, b) => b.localeCompare(a));

    const previous = els.periodSelect.value || current;
    els.periodSelect.innerHTML =
      `<option value="all">Все время</option>` +
      sorted.map((p) => `<option value="${p}">${periodLabel(p)}</option>`).join("");
    els.periodSelect.value = [...els.periodSelect.options].some((o) => o.value === previous)
      ? previous
      : current;

    const type = els.typeFilter.value;
    const cats =
      type === "income" ? INCOME_CATEGORIES : type === "expense" ? EXPENSE_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const unique = [...new Set(cats)];
    const prevCat = els.categoryFilter.value;
    els.categoryFilter.innerHTML =
      `<option value="all">Все категории</option>` +
      unique.map((c) => `<option value="${c}">${c}</option>`).join("");
    els.categoryFilter.value = [...els.categoryFilter.options].some((o) => o.value === prevCat)
      ? prevCat
      : "all";
  }

  function filteredTransactions() {
    const period = els.periodSelect.value;
    const type = els.typeFilter.value;
    const category = els.categoryFilter.value;
    return state.transactions
      .filter((t) => (period === "all" ? true : periodKey(t.date) === period))
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter((t) => (category === "all" ? true : t.category === category))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  function computeTotals(list) {
    let income = 0;
    let expense = 0;
    for (const t of list) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }

  function runningBalance() {
    const sorted = [...state.transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let total = 0;
    for (const t of sorted) {
      total += t.type === "income" ? t.amount : -t.amount;
    }
    return total;
  }

  function render() {
    fillFilters();
    const list = filteredTransactions();
    const totals = computeTotals(
      state.transactions.filter((t) => {
        const period = els.periodSelect.value;
        return period === "all" ? true : periodKey(t.date) === period;
      })
    );

    els.balanceValue.textContent = money(totals.balance);
    els.incomeValue.textContent = money(totals.income);
    els.expenseValue.textContent = money(totals.expense);
    els.runningValue.textContent = money(runningBalance());
    els.listHint.textContent = state.seeded
      ? "Показаны примеры из вашей таблицы — можно править или удалить"
      : "Данные хранятся только в этом браузере";

    els.txList.innerHTML = "";
    if (!list.length) {
      els.emptyState.hidden = false;
      return;
    }
    els.emptyState.hidden = true;

    list.forEach((t, index) => {
      const li = document.createElement("li");
      li.className = "tx-item";
      li.style.animationDelay = `${Math.min(index, 12) * 0.03}s`;
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      const sign = t.type === "income" ? "+" : "−";
      const note = t.note ? ` · ${t.note}` : "";
      li.innerHTML = `
        <div class="tx-main">
          <p class="tx-title">${escapeHtml(t.category)}</p>
          <p class="tx-meta">${formatDate(t.date)}${escapeHtml(note)}</p>
        </div>
        <div class="tx-amount ${t.type}">${sign}${money(t.amount)}</div>
      `;
      li.addEventListener("click", () => openEdit(t.id));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEdit(t.id);
        }
      });
      els.txList.appendChild(li);
    });
  }

  function formatDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${Number(d)} ${MONTHS_RU[Number(m) - 1]} ${y}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function selectedType() {
    const checked = els.form.querySelector('input[name="type"]:checked');
    return checked ? checked.value : "expense";
  }

  function parseAmount(raw) {
    const normalized = String(raw || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".");
    if (!normalized) return NaN;
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : NaN;
  }

  function showFormError(message) {
    if (!els.formError) return;
    if (!message) {
      els.formError.hidden = true;
      els.formError.textContent = "";
      return;
    }
    els.formError.hidden = false;
    els.formError.textContent = message;
  }

  function openCreate() {
    editingId = null;
    els.dialogTitle.textContent = "Новая операция";
    els.btnDelete.hidden = true;
    showFormError("");
    els.form.querySelector('input[name="type"][value="expense"]').checked = true;
    fillCategorySelect(els.categoryInput, "expense");
    els.dateInput.value = todayISO();
    els.amountInput.value = "";
    els.noteInput.value = "";
    els.dialog.showModal();
    requestAnimationFrame(() => {
      els.amountInput.focus({ preventScroll: true });
      els.amountInput.select();
    });
  }

  function openEdit(id) {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;
    editingId = id;
    els.dialogTitle.textContent = "Редактирование";
    els.btnDelete.hidden = false;
    showFormError("");
    els.form.querySelector(`input[name="type"][value="${tx.type}"]`).checked = true;
    fillCategorySelect(els.categoryInput, tx.type, tx.category);
    els.amountInput.value = String(tx.amount);
    els.dateInput.value = tx.date;
    els.noteInput.value = tx.note || "";
    els.dialog.showModal();
    requestAnimationFrame(() => {
      els.amountInput.focus({ preventScroll: true });
    });
  }

  function closeDialog() {
    showFormError("");
    if (els.dialog.open) els.dialog.close();
  }

  function upsertFromForm() {
    const type = selectedType();
    const amount = parseAmount(els.amountInput.value);
    const category = els.categoryInput.value;
    const date = els.dateInput.value;
    const note = els.noteInput.value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      showFormError("Введите сумму больше нуля");
      els.amountInput.focus();
      return;
    }
    if (!category) {
      showFormError("Выберите категорию");
      els.categoryInput.focus();
      return;
    }
    if (!date) {
      showFormError("Укажите дату");
      els.dateInput.focus();
      return;
    }

    showFormError("");

    if (editingId) {
      state.transactions = state.transactions.map((t) =>
        t.id === editingId ? { ...t, type, amount, category, date, note } : t
      );
    } else {
      state.transactions.push({ id: uid(), type, amount, category, date, note });
    }
    state.seeded = false;
    saveState();
    closeDialog();
    render();
  }

  function deleteCurrent() {
    if (!editingId) return;
    if (!confirm("Удалить эту операцию?")) return;
    state.transactions = state.transactions.filter((t) => t.id !== editingId);
    state.seeded = false;
    saveState();
    closeDialog();
    render();
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions: state.transactions }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lichnyy-budget-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const list = Array.isArray(data) ? data : data.transactions;
        if (!Array.isArray(list)) throw new Error("bad format");
        const normalized = list
          .filter((t) => t && (t.type === "income" || t.type === "expense") && t.amount > 0 && t.date && t.category)
          .map((t) => ({
            id: t.id || uid(),
            type: t.type,
            amount: Number(t.amount),
            category: String(t.category),
            date: String(t.date).slice(0, 10),
            note: t.note ? String(t.note) : "",
          }));
        if (!normalized.length) throw new Error("empty");
        if (!confirm(`Импортировать ${normalized.length} операций? Текущие данные будут заменены.`)) return;
        state = { transactions: normalized, seeded: false };
        saveState();
        render();
      } catch {
        alert("Не удалось прочитать файл. Нужен JSON, экспортированный из этого приложения.");
      }
    };
    reader.readAsText(file);
  }

  els.btnAdd.addEventListener("click", openCreate);
  els.btnCancel.addEventListener("click", closeDialog);
  els.btnCloseDialog.addEventListener("click", closeDialog);
  els.btnDelete.addEventListener("click", deleteCurrent);
  els.btnExport.addEventListener("click", exportData);
  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = "";
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    upsertFromForm();
  });

  els.form.querySelectorAll('input[name="type"]').forEach((input) => {
    input.addEventListener("change", () => {
      fillCategorySelect(els.categoryInput, selectedType());
    });
  });

  [els.periodSelect, els.typeFilter, els.categoryFilter].forEach((el) => {
    el.addEventListener("change", render);
  });

  render();
})();
