import { MetodoPagoPresencial } from "./cajas";

export type TipoEntregaTicketVentanilla = 1 | 4;

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
  disponibles: number;
}

export interface CrearVentaVentanillaRequest {
  cajaId: number;
  eventoId: number;
  tandaEntradaId?: number | null;
  metodoPago: MetodoPagoPresencial;
  tipoEntrega: TipoEntregaTicketVentanilla;
  nombreCliente?: string | null;
  emailCliente?: string | null;
  telefonoCliente?: string | null;
  generaTicketDigital: boolean;
  observacion?: string | null;
  idempotencyKey?: string | null;
}

export interface VentaVentanilla {
  id: number;
  cajaId: number;
  eventoId: number;
  eventoNombre: string;
  ticketGeneradoId?: number | null;
  numeroTicket?: string | null;
  codigoQR?: string | null;
  codigoReclamo?: string | null;
  metodoPago: string;
  estado: string;
  tipoEntrega: string;
  nombreCliente?: string | null;
  emailCliente?: string | null;
  telefonoCliente?: string | null;
  generaTicketDigital: boolean;
  subtotal: number;
  cargoServicioMonto: number;
  cargoServicioDescripcion?: string | null;
  total: number;
  fechaCreacion: string;
}

export interface VentanillaResumenCaja {
  cajaId: number;
  estado: string;
  montoInicial: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalGeneral: number;
  cantidadVentas: number;
  ticketsDigitalesGenerados: number;
  ticketsFisicosVendidos: number;
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
  ticketsDigitalesGenerados: number;
  ticketsFisicosVendidos: number;
  ventas: VentaVentanilla[];
}