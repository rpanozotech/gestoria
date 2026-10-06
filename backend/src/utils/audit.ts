export type AuditValue = string | number | boolean | null | undefined;

export function diffChangedFields(
  before: Record<string, AuditValue>,
  after: Record<string, AuditValue>,
  fields: readonly string[],
) {
  return fields.reduce<Record<string, { before: AuditValue; after: AuditValue }>>((changes, field) => {
    if (before[field] !== after[field]) changes[field] = { before: before[field] ?? null, after: after[field] ?? null };
    return changes;
  }, {});
}
