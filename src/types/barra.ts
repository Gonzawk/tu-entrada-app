import { MetodoPagoPresencial } from "./cajas";

export interface BarraProductoDisponible {
  bebidaProductoId: number;
  nombre: string;
  imagenUrl?: string | null;

  precioBase: number;
  precioEvento: number;
  precioFinal: number;

  tienePrecioEvento: boolean;
}

export interface CrearVentaBarraItemRequest {
  bebidaProductoId: number;
  cantidad: number;
}

export interface CrearVentaBarraRequest {
  cajaId: number;

  metodoPago: MetodoPagoPresencial;

  /**
   * Solo se utiliza cuando metodoPago = 4
   * (Efectivo + Mercado Pago Point).
   *
   * Representa únicamente el efectivo recibido.
   * El backend calcula el saldo correspondiente a Mercado Pago.
   */
  montoEfectivo?: number | null;

  observacion?: string | null;

  /**
   * Obligatoria para operaciones que utilizan Mercado Pago Point.
   * Debe mantenerse para el mismo intento técnico y regenerarse
   * para una nueva venta/intento comercial.
   */
  idempotencyKey?: string | null;

  items: CrearVentaBarraItemRequest[];
}

export interface VentaBarraItem {
  id: number;
  bebidaProductoId: number;
  nombreProducto: string;

  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaBarra {
  id: number;

  cajaId: number;
  eventoId?: number | null;

  metodoPago: string;
  estado: string;

  subtotal: number;
  total: number;

  /**
   * Snapshot económico del pago.
   * En efectivo puro: montoEfectivo = total.
   * En Point puro: montoMercadoPago = total.
   * En pago mixto: ambos contienen su porción correspondiente.
   */
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

  items: VentaBarraItem[];
}

export interface BarraResumenCaja {
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

  cantidadItemsVendidos: number;

  ventas: VentaBarra[];
}

export interface BarraCaja {
  id: number;

  eventoId?: number | null;
  eventoNombre?: string | null;

  estado: string;

  montoInicial: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalMercadoPago: number;
  totalGeneral: number;

  totalEfectivoARendir?: number;
  totalGeneralARendir?: number;

  fechaApertura: string;
  fechaCierre?: string | null;

  observacionApertura?: string | null;
  observacionCierre?: string | null;
}

export interface BarraCajaDetalle extends BarraCaja {
  cantidadVentas: number;
  ventas: BarraCajaVenta[];
}

export interface BarraCajaVenta {
  id: number;

  metodoPago: string;
  estado?: string;

  subtotal: number;
  total: number;

  montoEfectivo?: number;
  montoMercadoPago?: number;

  observacion?: string | null;
  fechaCreacion: string;

  items: BarraCajaVentaItem[];
}

export interface BarraCajaVentaItem {
  bebidaProductoId: number;
  nombreProducto: string;

  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}