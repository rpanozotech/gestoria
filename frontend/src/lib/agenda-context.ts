/** Los nombres son una búsqueda de respaldo, no una identidad de cliente. */
export function appointmentClientHref(appointment: { client_id?: string | null; client_name: string }): string {
  return appointment.client_id
    ? `/crm/clientes/${encodeURIComponent(appointment.client_id)}`
    : `/crm/clientes?client=${encodeURIComponent(appointment.client_name)}&from=agenda`;
}
