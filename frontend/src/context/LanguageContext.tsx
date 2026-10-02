'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, getTranslation, languageLabels, Language } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.ES) => string;
  languageLabel: string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLang?: Language;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, defaultLang = 'ES' }) => {
  const [lang, setLang] = useState<Language>(defaultLang);

  const t = useCallback(
    (key: keyof typeof translations.ES): string => {
      return getTranslation(lang, key, key);
    },
    [lang]
  );

  const value: LanguageContextValue = {
    lang,
    setLang,
    t,
    languageLabel: languageLabels[lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { translations, languageLabels };