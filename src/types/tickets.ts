export interface TicketEvento {
  id: number;
  nombre: string;
  lugar: string;
  direccion?: string | null;
  fechaInicio: string;
  bannerUrl?: string | null;
  imagenPrincipalUrl?: string | null;
}

export interface TicketEntrada {
  id: number;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  incluyeBebidas: boolean;
  descripcionBebidas?: string | null;
  esCombo: boolean;
  cantidadPersonas: number;
  tieneHorarioIngreso: boolean;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;
}

export interface MiTicket {
  id: number;
  numeroTicket: string;
  codigoQR: string;
  qrImagenUrl?: string | null;
  estado: string;
  asignada: boolean;
  evento: TicketEvento;
  entrada: TicketEntrada;

  esMultiIngreso: boolean;
  cantidadUsosPermitidos: number;
  cantidadUsosRealizados: number;
  usosRestantes: number;
  observacionBeneficio?: string | null;

  bebidasCanjeadas: boolean;
  fechaCanjeBebidas?: string | null;
  fechaUso?: string | null;
}

export interface TicketPendienteReclamar {
  id: number;
  numeroTicket: string;
  codigoReclamo?: string | null;
  estado: string;
  emailPendiente?: string | null;
  nombrePendiente?: string | null;
  evento: TicketEvento;
  entrada: TicketEntrada;
}