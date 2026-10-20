'use client';
import React,{createContext,useContext,useState,useCallback,useEffect,ReactNode} from 'react';
import {translations,getTranslation,languageLabels,Language,TranslationKey} from '@/lib/i18n';
interface LanguageContextValue{lang:Language;setLang:(lang:Language)=>void;t:(key:TranslationKey)=>string;languageLabel:string}
const LanguageContext=createContext<LanguageContextValue|undefined>(undefined);
export const LanguageProvider=({children,defaultLang='ES'}:{children:ReactNode;defaultLang?:Language})=>{const[lang,setLangState]=useState<Language>(defaultLang);useEffect(()=>{setLangState('ES');window.localStorage.setItem('rp-language','ES');document.documentElement.lang='es'},[]);const setLang=useCallback((next:Language)=>{setLangState(next);window.localStorage.setItem('rp-language',next);document.documentElement.lang=next.toLowerCase()},[]);const t=useCallback((key:TranslationKey)=>getTranslation(lang,key,key),[lang]);return <LanguageContext.Provider value={{lang,setLang,t,languageLabel:languageLabels[lang]}}>{children}</LanguageContext.Provider>};
export const useLanguage=()=>{const c=useContext(LanguageContext);if(!c)throw new Error('useLanguage must be used within a LanguageProvider');return c};
export {translations,languageLabels};
