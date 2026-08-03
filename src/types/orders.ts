export interface AsignacionEntradaRequest {
  usuarioAsignadoId?: number | null;
  emailInvitado?: string | null;
  nombreInvitado?: string | null;
}

export interface CrearOrdenItemRequest {
  tandaEntradaId: number;
  asignaciones: AsignacionEntradaRequest[];
}

export interface CrearOrdenRequest {
  eventoId: number;
  rrppUsuarioId: number;
  idempotencyKey?: string | null;
  items: CrearOrdenItemRequest[];
}

export interface OrdenItemResponse {
  id: number;
  tandaEntradaId: number;
  tipoEntrada: string;
  nombreAsignado?: string | null;
  emailInvitado?: string | null;
  precioUnitario: number;
  subtotal: number;
  esCombo: boolean;
  cantidadPersonas: number;
  precioTotalEntrada: number;
}

export interface OrdenResponse {
  id: number;
  eventoId: number;
  compradorUsuarioId: number;
  rrppUsuarioId: number;
  estado: string;
  total: number;
  fechaCreacion: string;
  items: OrdenItemResponse[];
}

export interface MiOrdenResumen {
  id: number;
  eventoId: number;
  evento: string;
  lugar: string;
  bannerUrl?: string | null;
  rrpp: string;
  total: number;
  estado: string;
  fechaCreacion: string;
  fechaConfirmacion?: string | null;
  cantidadEntradas: number;
}

export interface MiOrdenDetalleItem {
  id: number;
  tipoEntrada: string;
  imagenUrl?: string | null;
  precioUnitario: number;
  subtotal: number;
  usuarioAsignadoId?: number | null;
  usuarioAsignado?: string | null;
  emailInvitado?: string | null;
  nombreInvitado?: string | null;
  ticketId?: number | null;
}

export interface MiOrdenDetalle {
  id: number;
  eventoId: number;
  evento: string;
  lugar: string;
  direccion?: string | null;
  bannerUrl?: string | null;
  fechaEvento: string;
  rrpp: string;
  rrppNombre?: string;
rrppTelefono?: string;
  total: number;
  estado: string;
  fechaCreacion: string;
  fechaConfirmacion?: string | null;
  items: MiOrdenDetalleItem[];
}