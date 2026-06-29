import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import zh, { type Translations } from './zh';
import en from './en';

type Lang = 'zh' | 'en';

const translations: Record<Lang, Translations> = { zh, en };

function tFactory(lang: Lang) {
  const dict = translations[lang];
  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let val: any = dict;
    for (const k of keys) {
      val = val?.[k];
    }
    let text = (typeof val === 'string' ? val : key) as string;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: ReturnType<typeof tFactory>;
}

const LangContext = createContext<LangCtx>({
  lang: 'zh',
  setLang: () => {},
  t: tFactory('zh'),
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('checkin_lang') as Lang | null;
    return saved === 'en' ? 'en' : 'zh';
  });

  useEffect(() => {
    localStorage.setItem('checkin_lang', lang);
  }, [lang]);

  const t = tFactory(lang);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
