(() => {
  const STORAGE_KEY = "personal-budget-theme";
  const THEMES = {
    classic: { barColor: "#121614" },
    clay: { barColor: "#c5d0da" },
  };
  const DEFAULT_THEME = "classic";
  const root = document.documentElement;

  function readTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved in THEMES ? saved : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* приватный режим без хранилища: тема живёт до перезагрузки */
    }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[theme].barColor);
    document.querySelectorAll("[data-theme-option]").forEach((option) => {
      option.setAttribute("aria-checked", String(option.dataset.themeOption === theme));
    });
  }

  applyTheme(readTheme());

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(readTheme());
    document.querySelectorAll("[data-theme-option]").forEach((option) => {
      option.addEventListener("click", () => {
        const theme = option.dataset.themeOption;
        if (!(theme in THEMES)) return;
        saveTheme(theme);
        applyTheme(theme);
      });
    });
  });
})();
