import type { InputHTMLAttributes, ReactNode } from 'react';

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  children?: ReactNode;
}

export function FormField({ id, label, hint, error, required, children, className = '', ...props }: FormFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? descriptionId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-text">
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children ?? (
        <input
          {...props}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-11 rounded-md border border-border bg-surface px-3 text-text placeholder:text-text-muted focus-visible:border-primary ${className}`}
        />
      )}
      {hint ? <p id={descriptionId} className="text-sm text-text-muted">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
