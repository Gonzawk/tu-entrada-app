export interface BirthdayRequest {
  id: number;
  estado: string;
  fechaNacimiento: string;
  dni: string;
  fotoDniUrl?: string | null;
  cantidadInvitados: number;
  motivoRechazo?: string | null;
  ticketGeneradoId?: number | null;
  fechaCreacion: string;
  fechaResolucion?: string | null;

  evento: {
    id: number;
    nombre: string;
    fechaInicio?: string | null;
  };

  usuario?: {
    id: number;
    nombreCompleto: string;
    email: string;
  };
}

export interface CreateBirthdayRequest {
  eventoId: number;
  fechaNacimiento: string;
  dni: string;
  fotoDniUrl: string;
  cantidadInvitados: number;
}

export interface ResolveBirthdayRequest {
  aprobar: boolean;
  tipoEntradaId?: number | null;
  tandaEntradaId?: number | null;
  motivoRechazo?: string | null;
  observacionBeneficio?: string | null;
}

export interface CreateMultiTicketRequest {
  eventoId: number;
  tipoEntradaId: number;
  tandaEntradaId?: number | null;
  propietarioUsuarioId?: number | null;
  emailPendiente?: string | null;
  nombrePendiente?: string | null;
  cantidadUsosPermitidos: number;
  observacionBeneficio?: string | null;
}