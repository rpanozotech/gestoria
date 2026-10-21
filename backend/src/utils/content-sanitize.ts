export type PublicBlock = { type: 'hero' | 'rich_text' | 'faq' | 'cta' | 'notice' | 'image' | 'seo'; [key: string]: unknown };

const ALLOWED = new Set(['hero', 'rich_text', 'faq', 'cta', 'notice', 'image', 'seo']);
const stripMarkup = (value: unknown) => String(value ?? '').replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '').replace(/<[^>]*>/g, '').trim();
const safeHref = (value: unknown) => {
  const href = String(value ?? '/').trim();
  return href.startsWith('/') && !href.startsWith('//') ? href : '/';
};

export function sanitizeContentBlocks(input: unknown): PublicBlock[] {
  if (!Array.isArray(input)) return [];
  return input.filter((block): block is Record<string, unknown> => Boolean(block && typeof block === 'object' && ALLOWED.has(String((block as any).type))))
    .map((block) => {
      const output: Record<string, unknown> = { type: String(block.type) };
      for (const [key, value] of Object.entries(block)) {
        if (key === 'type') continue;
        if (key === 'cta' && value && typeof value === 'object') {
          const cta = value as Record<string, unknown>;
          output.cta = { label: stripMarkup(cta.label), href: safeHref(cta.href) };
        } else if (Array.isArray(value)) {
          output[key] = value.map((item) => stripMarkup(item));
        } else if (typeof value === 'object' && value !== null) {
          output[key] = Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, stripMarkup(childValue)]));
        } else {
          output[key] = stripMarkup(value);
        }
      }
      return output as PublicBlock;
    });
}
