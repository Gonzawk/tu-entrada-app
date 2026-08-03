export interface RRPPOrdenPendienteItem {
  id: number;
  tipoEntrada: string;
  precioUnitario: number;
  usuarioAsignadoId?: number | null;
  usuarioAsignado?: string | null;
  emailInvitado?: string | null;
  nombreInvitado?: string | null;
}

export interface RRPPOrdenPendiente {
  id: number;
  eventoId: number;
  evento: string;
  comprador: string;
  total: number;
  estado: string;
  fechaCreacion: string;
  items: RRPPOrdenPendienteItem[];
}

export interface RRPPOrdenConfirmadaItem {
  id: number;
  tipoEntrada: string;
  precioUnitario: number;
  subtotal: number;
  usuarioAsignadoId?: number | null;
  usuarioAsignado?: string | null;
  emailInvitado?: string | null;
  nombreInvitado?: string | null;
  ticketId?: number | null;
}

export interface RRPPOrdenConfirmada {
  id: number;

  evento: string;

  comprador: string;

  total: number;

  estado: string;

  fechaConfirmacion?: string | null;

  ticketsGenerados: number;
}

export interface RRPPPerfil {
  id: number;
  usuarioId: number;
  nombrePublico: string;
  email: string;
  instagram?: string | null;
  telefonoContacto?: string | null;
  avatarUrl?: string | null;
  activo: boolean;
  fechaCreacion: string;
}

export interface RRPPEventoResumen {
  eventoId: number;
  eventoNombre: string;
  lugar?: string | null;
  fechaInicio: string;
  bannerUrl?: string | null;
  estadoEvento: string;

  ordenesPendientes: number;
  ordenesConfirmadas: number;
  totalPendiente: number;
  totalConfirmado: number;
  ticketsGenerados: number;
}

export interface RRPPOrdenEvento {
  id: number;
  eventoId: number;
  eventoNombre: string;

  compradorUsuarioId?: number;
  compradorNombre: string;
  compradorEmail: string;

  estado: string;
  total: number;
  cantidadEntradas: number;

  fechaCreacion: string;
  fechaConfirmacion?: string | null;
}