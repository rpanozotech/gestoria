import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'size-11', md: 'size-12', lg: 'size-14' };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, children, size = 'md', className = '', type = 'button', ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-label={label}
      title={props.title ?? label}
      className={`inline-flex shrink-0 items-center justify-center rounded-md text-text transition-colors hover:bg-surface-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
});
