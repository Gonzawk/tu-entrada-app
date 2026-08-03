export interface ReprogramarEventoRequest {
  fechaInicio: string;
  fechaFin?: string | null;
  motivo?: string | null;
}

export interface EventoReprogramacion {
  id: number;
  eventoId: number;
  eventoNombre: string;
  fechaInicioAnterior: string;
  fechaFinAnterior?: string | null;
  fechaInicioNueva: string;
  fechaFinNueva?: string | null;
  motivo?: string | null;
  usuarioAdminId: number;
  usuarioAdminNombre: string;
  fechaCreacion: string;
}