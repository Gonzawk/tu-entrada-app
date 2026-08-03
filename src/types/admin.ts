export interface CrearEventoRequest {
  nombre: string;
  descripcion?: string;
  lugar: string;
  direccion?: string;
  fechaInicio: string;
  fechaFin?: string;
  bannerUrl: string;
  imagenPrincipalUrl?: string;
}

export interface TipoEntradaBebidaIncluidaRequest {
  bebidaProductoId: number;
  cantidad: number;
}

export interface CrearTipoEntradaRequest {
  nombre: string;
  descripcion?: string;
  imagenUrl: string;

  incluyeBebidas: boolean;
  descripcionBebidas?: string;

  esCombo: boolean;
  cantidadPersonas: number;

  maximoPorOrden?: number | null;
  maximoPorUsuario?: number | null;

  tieneHorarioIngreso: boolean;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;

  bebidasIncluidas?: {
    bebidaProductoId: number;
    cantidad: number;
  }[];
}

export interface TipoEntradaBebidaIncluidaAdmin {
  bebidaProductoId: number;
  nombre: string;
  imagenUrl?: string | null;
  cantidad: number;
}

export interface ActualizarTipoEntradaRequest {
  nombre: string;

  descripcion?: string;

  imagenUrl: string;

  incluyeBebidas: boolean;

  descripcionBebidas?: string;

  esCombo: boolean;

  cantidadPersonas: number;

  tieneHorarioIngreso: boolean;

  horaIngresoDesde?: string | null;

  horaIngresoHasta?: string | null;

  maximoPorOrden?: number | null;
  maximoPorUsuario?: number | null;

  bebidasIncluidas: {
    bebidaProductoId: number;
    cantidad: number;
  }[];
}
export interface CrearTandaRequest {
  numeroTanda: number;
  nombre?: string;
  precio: number;
  cantidadTotal: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export interface CrearRRPPRequest {
  usuarioId: number;
  nombrePublico: string;
  instagram?: string;
  telefonoContacto?: string;
  avatarUrl?: string;
  avatar?: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface RRPPAdmin {
  id: number;
  usuarioId: number;
  nombrePublico: string;
  email: string;
  instagram?: string | null;
  telefonoContacto?: string | null;
  avatarUrl?: string | null;
  activo: boolean;
}

export interface UsuarioPuerta {
  id: number;
  email: string;
  nombreCompleto: string;
  telefono?: string | null;
  activo: boolean;
  fechaCreacion: string;
}


export interface UsuarioLookup {
  id: number;
  email: string;
  nombreCompleto: string;
  telefono?: string | null;
  activo: boolean;
}



export interface AdminEventosResumen {
  total: number;
  publicados: number;
  borradores: number;
  ocultos: number;
}

export interface AdminEventosPagedResponse {
  items: any[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  resumen: AdminEventosResumen;
}