/**
 * Производственный календарь РФ, пятидневка.
 * 2026 — постановление Правительства от 24.09.2025 № 1466.
 * 2027 — постановление Правительства от 17.09.2026 № 1187.
 * День 15 входит в первую половину (аванс), со дня 16 — во вторую (зарплата).
 */
(() => {
  const TRANSFERS = {
    2026: [
      ["2026-01-03", "2026-01-09"],
      ["2026-01-04", "2026-12-31"],
    ],
    2027: [
      ["2027-01-02", "2027-11-05"],
      ["2027-01-03", "2027-12-31"],
      ["2027-02-20", "2027-02-22"],
    ],
  };

  function holidaySet(year) {
    const set = new Set();
    for (let day = 1; day <= 8; day += 1) {
      set.add(`${year}-01-${String(day).padStart(2, "0")}`);
    }
    ["02-23", "03-08", "05-01", "05-09", "06-12", "11-04"].forEach((md) => {
      set.add(`${year}-${md}`);
    });
    return set;
  }

  function iso(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function parse(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function isWeekend(date) {
    const weekDay = date.getDay();
    return weekDay === 0 || weekDay === 6;
  }

  function dayMap(year) {
    const holidays = holidaySet(year);
    const extra = new Set();
    const workedWeekend = new Set();
    (TRANSFERS[year] || []).forEach(([src, dst]) => {
      extra.add(dst);
      if (!holidays.has(src)) workedWeekend.add(src);
    });
    holidays.forEach((key) => {
      const date = parse(key);
      if (date.getMonth() === 0 && date.getDate() <= 8) return;
      if (!isWeekend(date)) return;
      let next = new Date(date);
      while (true) {
        next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
        const nextKey = iso(next);
        if (!isWeekend(next) && !holidays.has(nextKey) && !extra.has(nextKey)) {
          extra.add(nextKey);
          break;
        }
      }
    });
    return { holidays, extra, workedWeekend };
  }

  function isWorking(date, map) {
    const key = iso(date);
    if (map.workedWeekend.has(key)) return true;
    if (map.holidays.has(key) || map.extra.has(key)) return false;
    return !isWeekend(date);
  }

  function parts(year, monthIndex) {
    const map = dayMap(year);
    const last = new Date(year, monthIndex + 1, 0).getDate();
    let first = 0;
    let second = 0;
    for (let day = 1; day <= last; day += 1) {
      if (!isWorking(new Date(year, monthIndex, day), map)) continue;
      if (day <= 15) first += 1;
      else second += 1;
    }
    return { first, second, total: first + second };
  }

  window.BudgetCalendar = {
    YEARS: [2026, 2027],
    parts,
  };
})();
