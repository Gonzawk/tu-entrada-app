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
  observacion?: string | null;
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
  fechaCreacion: string;
  items: VentaBarraItem[];
}

export interface BarraResumenCaja {
  cajaId: number;
  estado: string;
  montoInicial: number;
  totalEfectivo: number;
  totalTransferencia: number;
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
  totalGeneral: number;
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
  subtotal: number;
  total: number;
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