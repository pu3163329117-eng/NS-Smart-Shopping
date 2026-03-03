import { ref, watch } from 'vue';

const STORAGE_KEY = 'ns_app_theme';

const theme = ref(localStorage.getItem(STORAGE_KEY) || 'dark');

const setTheme = (newTheme) => {
    theme.value = newTheme;
    localStorage.setItem(STORAGE_KEY, newTheme);

    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
};

const initTheme = () => {
    setTheme(theme.value);
};

export const useAppTheme = () => {
    return {
        theme,
        setTheme,
        toggleTheme,
        initTheme
    };
};
