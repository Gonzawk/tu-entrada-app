import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const ARGENTINA_TIMEZONE =
  "America/Argentina/Buenos_Aires";

/*
 * =========================================================
 * FECHAS LOCALES / COMERCIALES
 * =========================================================
 *
 * Usar para fechas que el backend ya maneja como horario
 * local de Argentina.
 *
 * Ejemplos:
 * - FechaInicio de evento
 * - FechaFin de evento
 * - FechaInicio de tanda
 * - FechaFin de tanda
 *
 * IMPORTANTE:
 * No realiza conversión de zona horaria.
 */
export function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  if (!date.isValid()) {
    return "-";
  }

  return date.format(
    "DD/MM/YYYY HH:mm"
  );
}

/*
 * =========================================================
 * FECHAS UTC / AUDITORÍA
 * =========================================================
 *
 * Usar para timestamps técnicos guardados por el backend
 * en UTC.
 *
 * Ejemplos:
 * - FechaCreacion
 * - FechaPagoConfirmado
 * - FechaPagoRechazado
 * - FechaExpiracionReserva
 * - FechaEntregada, si backend la guarda en UTC
 *
 * SQL Server datetime2 no conserva DateTimeKind.
 * Por eso interpretamos explícitamente el valor recibido
 * como UTC y luego lo convertimos a horario argentino.
 */
export function formatUtcDate(
  value?: string | null
): string {
  if (!value) {
    return "-";
  }

  const date = dayjs.utc(value);

  if (!date.isValid()) {
    return "-";
  }

  return date
    .tz(ARGENTINA_TIMEZONE)
    .format("DD/MM/YYYY HH:mm");
}