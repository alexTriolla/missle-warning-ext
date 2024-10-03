// src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import he from './locales/he.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';

// Retrieve the default language from .env, default to 'en' if not set
const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE || 'en';

i18n
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ru: { translation: ru },
      ar: { translation: ar },
    },
    lng: DEFAULT_LANGUAGE, // Initial language
    fallbackLng: 'en', // Fallback language if translation not found
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
