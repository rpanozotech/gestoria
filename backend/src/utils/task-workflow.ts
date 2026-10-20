export const TASK_STATUSES = [
  "pendiente",
  "en_espera_cliente",
  "revision",
  "documentacion",
  "seguimiento",
  "completada",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function normalizeTaskStatus(value: unknown): TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value)
    ? value as TaskStatus
    : "pendiente";
}
