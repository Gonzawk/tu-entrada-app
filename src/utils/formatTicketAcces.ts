export function formatHour(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

export function formatTicketAccessWindow(ticket: {
  entrada?: {
    tieneHorarioIngreso?: boolean;
    horaIngresoDesde?: string | null;
    horaIngresoHasta?: string | null;
  } | null;
}) {
  const entrada = ticket.entrada;

  if (!entrada?.tieneHorarioIngreso) {
    return "Ingreso habilitado durante el evento.";
  }

  const desde = formatHour(entrada.horaIngresoDesde);
  const hasta = formatHour(entrada.horaIngresoHasta);

  if (desde && hasta) {
    return `Ingreso permitido desde ${desde} hasta ${hasta}.`;
  }

  if (desde && !hasta) {
    return `Ingreso permitido desde ${desde}.`;
  }

  if (!desde && hasta) {
    return `Ingreso permitido hasta ${hasta}.`;
  }

  return "Ingreso habilitado durante el evento.";
}