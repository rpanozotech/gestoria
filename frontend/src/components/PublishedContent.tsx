'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

type Block = {
  type: string;
  title?: string;
  text?: string;
  body?: string;
  label?: string;
  items?: string[];
  questions?: string[];
  answers?: string[];
  cta?: { label?: string; href?: string };
  src?: string;
  alt?: string;
};

type PublishedPage = { blocks?: Block[] };

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export default function PublishedContent({ pageKey }: { pageKey: string }) {
  const { lang } = useLanguage();
  const [page, setPage] = useState<PublishedPage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/public-content/${pageKey}?locale=${lang}`), { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lang, pageKey]);

  if (!page?.blocks?.length) return null;

  return (
    <section aria-label="Contenido actualizado" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <div className="space-y-5">
        {page.blocks.map((block, index) => {
          const title = text(block.title);
          const body = text(block.text || block.body);
          const label = text(block.label);
          const items = Array.isArray(block.items) ? block.items.map(text).filter(Boolean) : [];
          const questions = Array.isArray(block.questions) ? block.questions.map(text).filter(Boolean) : [];
          const answers = Array.isArray(block.answers) ? block.answers.map(text) : [];

          if (block.type === 'seo') return null;
          if (block.type === 'image' && text(block.src).startsWith('/')) {
            return <img key={index} src={block.src} alt={text(block.alt) || title || 'RP Asesoría'} className="max-h-96 w-full rounded-2xl object-cover" />;
          }
          if (block.type === 'faq') {
            return (
              <div key={index} className="rounded-2xl border border-[#cbd9e2] bg-white p-6">
                {title && <h2 className="font-heading text-2xl font-extrabold text-[#0b1f33]">{title}</h2>}
                <div className="mt-4 space-y-3">
                  {questions.map((question, itemIndex) => (
                    <details key={`${question}-${itemIndex}`} className="rounded-xl border border-[#edf0f2] p-4">
                      <summary className="cursor-pointer font-bold text-[#0b1f33]">{question}</summary>
                      {answers[itemIndex] && <p className="mt-3 text-sm leading-relaxed text-[#565e74]">{answers[itemIndex]}</p>}
                    </details>
                  ))}
                </div>
              </div>
            );
          }
          if (block.type === 'cta') {
            return (
              <div key={index} className="rounded-2xl bg-[#0b1f33] p-6 text-white sm:p-8">
                {title && <h2 className="font-heading text-2xl font-extrabold">{title}</h2>}
                {body && <p className="mt-3 max-w-2xl text-slate-200">{body}</p>}
                {block.cta?.label && text(block.cta.href).startsWith('/') && (
                  <Link href={block.cta.href || '/'} className="mt-5 inline-flex rounded-xl bg-[#f28c28] px-5 py-3 font-bold text-white">{block.cta.label}</Link>
                )}
              </div>
            );
          }
          return (
            <div key={index} className={`rounded-2xl border p-6 ${block.type === 'notice' ? 'border-[#f4c58d] bg-[#fff8ed]' : 'border-[#cbd9e2] bg-white'}`}>
              {label && <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c96f16]">{label}</p>}
              {title && <h2 className="mt-2 font-heading text-2xl font-extrabold text-[#0b1f33]">{title}</h2>}
              {body && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#565e74]">{body}</p>}
              {items.length > 0 && <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#565e74]">{items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ul>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
