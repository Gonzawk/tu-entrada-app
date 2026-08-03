export interface EventoConfiguracionCompra {
  id: number;
  eventoId: number;
  eventoNombre: string;

  limitarComprasPorUsuario: boolean;

  maxOrdenesPendientesPorUsuario: number;
  maxOrdenesActivasPorUsuario: number;
  maxCuposPorUsuario: number;

  minutosVigenciaOrdenPendiente: number;
  segundosMinimosEntreOrdenes: number;

  activa: boolean;

  fechaCreacion: string;
  fechaModificacion?: string | null;
}

export interface ActualizarEventoConfiguracionCompraRequest {
  limitarComprasPorUsuario: boolean;

  maxOrdenesPendientesPorUsuario: number;
  maxOrdenesActivasPorUsuario: number;
  maxCuposPorUsuario: number;

  minutosVigenciaOrdenPendiente: number;
  segundosMinimosEntreOrdenes: number;

  activa: boolean;
}