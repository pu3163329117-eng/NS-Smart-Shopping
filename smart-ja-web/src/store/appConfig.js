import { computed, ref } from 'vue';

const STORAGE_KEY = 'ns_app_theme';
const DARK = 'dark';
const LIGHT = 'light';

const isBrowser = typeof window !== 'undefined';

const resolveInitialTheme = () => {
  if (!isBrowser) return DARK;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === DARK || saved === LIGHT) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
};

const theme = ref(resolveInitialTheme());
const isDark = computed(() => theme.value === DARK);

const applyThemeToDom = (nextTheme) => {
  if (!isBrowser) return;
  const root = document.documentElement;
  const dark = nextTheme === DARK;
  root.classList.toggle(DARK, dark);
  root.setAttribute('data-theme', nextTheme);
  root.style.colorScheme = dark ? DARK : LIGHT;
};

const setTheme = (newTheme, persist = true) => {
  const normalized = newTheme === LIGHT ? LIGHT : DARK;
  theme.value = normalized;
  applyThemeToDom(normalized);
  if (isBrowser && persist) {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
};

const toggleTheme = () => {
  setTheme(theme.value === DARK ? LIGHT : DARK);
};

const initTheme = () => {
  setTheme(theme.value, false);

  if (!isBrowser) return;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const syncWithSystem = (event) => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === DARK || saved === LIGHT) return;
    setTheme(event.matches ? DARK : LIGHT, false);
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', syncWithSystem);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(syncWithSystem);
  }
};

export const useAppTheme = () => ({
  theme,
  isDark,
  setTheme,
  toggleTheme,
  initTheme
});
