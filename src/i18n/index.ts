import en from './en';
import gu from './gu';

export type Language = 'en' | 'gu';

const languages = { en, gu };

export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem('salon-language') === 'gu' ? 'gu' : 'en';
}

export function saveLanguage(language: Language) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('salon-language', language);
  }
}

export function translate(language: Language, key: keyof typeof en, values?: Record<string, string | number>): string {
  let text: string = languages[language][key] ?? languages.en[key];
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
