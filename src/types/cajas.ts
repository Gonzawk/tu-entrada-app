export type TipoCaja = 1 | 2; // 1 Barra, 2 Ventanilla

export type MetodoPagoPresencial =
  | 1 // Efectivo
  | 2 // Transferencia
  | 3 // Mercado Pago Point
  | 4; // Efectivo + Mercado Pago Point

export interface CajaMovimiento {
  id: number;
  tipoMovimiento: string;
  metodoPago: string;
  monto: number;
  descripcion?: string | null;
  fechaCreacion: string;
}

export interface Caja {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  eventoId?: number | null;
  eventoNombre?: string | null;
  tipoCaja: string;
  estado: string;

  montoInicial: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalMercadoPago: number;
  totalGeneral: number;

  totalEfectivoARendir?: number;
  totalGeneralARendir?: number;

  observacionApertura?: string | null;
  observacionCierre?: string | null;

  fechaApertura: string;
  fechaCierre?: string | null;

  movimientos: CajaMovimiento[];
}

export interface AbrirCajaRequest {
  eventoId?: number | null;
  tipoCaja: TipoCaja;
  montoInicial: number;
  observacionApertura?: string | null;
}

export interface CerrarCajaRequest {
  observacionCierre?: string | null;
}
