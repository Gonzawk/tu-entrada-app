import { VentaBarra } from "./barra";

export type EstadoPagoApp =
  | "EsperandoPago"
  | "Procesando"
  | "Aprobado"
  | "Cancelado"
  | "Vencido"
  | "Rechazado"
  | "Fallido"
  | string;

export type EstadoImpresionTicketApp =
  | "SinSolicitar"
  | "EnProceso"
  | "Solicitada"
  | "EnTerminal"
  | "Confirmada"
  | "ResultadoIncierto"
  | "Fallida"
  | "Cancelada"
  | string;

export type VentaBarraPointCreada = VentaBarra & {
  id: number;
  estado?: string;
  total?: number;

  mercadoPagoOrderId?: string | null;
  mercadoPagoPaymentId?: string | null;
  mercadoPagoStatus?: string | null;
  mercadoPagoStatusDetail?: string | null;

  fechaExpiracionPago?: string | null;
  fechaPagoConfirmado?: string | null;

  ticketImpreso?: boolean;
  estadoImpresionTicket?: EstadoImpresionTicketApp | number;
};

export interface VentaPresencialEstadoPagoResponse {
  ventaId: number;

  estadoVenta: string;
  estadoPago: EstadoPagoApp;

  total: number;

  fechaExpiracionPago?: string | null;
  fechaPagoConfirmado?: string | null;

  mercadoPagoStatus?: string | null;
  mercadoPagoStatusDetail?: string | null;

  estadoFinal: boolean;
  confirmadaEnEstaOperacion?: boolean;

  ticketImpreso: boolean;
  estadoImpresion: EstadoImpresionTicketApp;

  mercadoPagoPrintActionId?: string | null;
  mercadoPagoPrintStatus?: string | null;

  cantidadImpresiones: number;
  errorUltimaImpresion?: string | null;

  requiereAccionTerminal?: boolean;
  mensaje?: string | null;
}