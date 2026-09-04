import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

const STORAGE_KEY = 'kc_language';

function detectLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: string) {
  localStorage.setItem(STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
