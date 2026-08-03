export interface DoorScanResponse {
  success: boolean;
  resultado: string;
  message: string;

  ticket?: {
  id: number;
  numeroTicket: string;
  estado: string;
  fechaUso?: string | null;

  esMultiIngreso?: boolean;
  cantidadUsosPermitidos?: number;
  cantidadUsosRealizados?: number;
  usosRestantes?: number;
  observacionBeneficio?: string | null;
};

  usuario?: {
    propietarioUsuarioId?: number | null;
    nombre?: string | null;
  };

  evento?: {
    id: number;
    nombre: string;
    lugar: string;
    fechaInicio: string;
  };

  entrada?: {
    id: number;
    nombre: string;
    descripcion?: string | null;
    esCombo: boolean;
    cantidadPersonas: number;
    incluyeBebidas: boolean;
    descripcionBebidas?: string | null;
    bebidasCanjeadas: boolean;
    puedeCanjearBebidas: boolean;
  };

  datosControl?: {
  horaActualArgentina: string;
  eventoInicioArgentina: string;
  eventoFinArgentina: string;
  horarioIngresoTexto: string;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;
};

  id?: number;
  numeroTicket?: string;
  fechaUso?: string | null;
  emailPendiente?: string | null;
  nombrePendiente?: string | null;
}

export interface MarcarBebidaResponse {
  message: string;
  id: number;
  numeroTicket: string;
  bebidasCanjeadas: boolean;
  fechaCanjeBebidas: string;
  beneficio?: string | null;
}

export interface DoorProfile {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  activo: boolean;
  fechaCreacion: string;
}

export interface DoorNextEvent {
  id: number;
  nombre: string;
  lugar: string;
  direccion?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  bannerUrl?: string | null;
  estado: string;
  enCurso: boolean;
}

export interface DoorScanRequest {
  codigoQR: string;
  idempotencyKey?: string | null;
}