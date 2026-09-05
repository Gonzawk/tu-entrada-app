import { MetodoPagoPresencial } from "./cajas";

export interface VentanillaEntradaDisponible {
  eventoId: number;
  eventoNombre: string;

  tipoEntradaId: number;
  tipoEntradaNombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;

  esCombo: boolean;
  cantidadPersonas: number;

  tandaEntradaId: number;
  tandaNombre: string;
  precio: number;
}

export interface CrearVentaVentanillaRequest {
  cajaId: number;
  eventoId: number;
  tandaEntradaId: number;

  metodoPago: MetodoPagoPresencial;

  /**
   * Se utiliza únicamente cuando metodoPago = 4
   * (Efectivo + Mercado Pago Point).
   *
   * Representa SOLO el efectivo efectivamente recibido.
   * El backend calcula el saldo correspondiente a Mercado Pago.
   */
  montoEfectivo?: number | null;

  observacion?: string | null;
  idempotencyKey?: string | null;
}

export interface VentaVentanilla {
  id: number;

  cajaId: number;
  eventoId: number;
  eventoNombre: string;

  tipoEntradaId?: number | null;
  tipoEntradaNombre?: string | null;

  tandaEntradaId?: number | null;
  tandaNombre?: string | null;

  metodoPago: string;
  estado: string;

  subtotal: number;
  cargoServicioMonto: number;
  cargoServicioDescripcion?: string | null;
  total: number;

  montoEfectivo?: number;
  montoMercadoPago?: number;

  mercadoPagoOrderId?: string | null;
  mercadoPagoPaymentId?: string | null;
  mercadoPagoStatus?: string | null;
  mercadoPagoStatusDetail?: string | null;

  ticketImpreso?: boolean;
  estadoImpresionTicket?: string | number;
  cantidadImpresiones?: number;
  errorUltimaImpresion?: string | null;

  observacion?: string | null;
  fechaCreacion: string;
}

export interface VentanillaResumenCaja {
  cajaId: number;
  estado: string;

  montoInicial: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalMercadoPago: number;
  totalGeneral: number;

  cantidadVentas: number;

  totalEfectivoARendir?: number;
  totalGeneralARendir?: number;

  ventas: VentaVentanilla[];
}

export interface VentanillaCaja {
  id: number;

  eventoId?: number | null;
  eventoNombre?: string | null;

  estado: string;

  montoInicial: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalMercadoPago: number;
  totalGeneral: number;

  totalEfectivoARendir: number;
  totalGeneralARendir: number;

  fechaApertura: string;
  fechaCierre?: string | null;

  observacionApertura?: string | null;
  observacionCierre?: string | null;
}

export interface VentanillaCajaDetalle extends VentanillaCaja {
  cantidadVentas: number;
  ventas: VentaVentanilla[];
}