import { TipoEntradaBebidaIncluidaAdmin } from "./admin";

export interface EventoActivo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  lugar?: string | null;
  direccion?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  bannerUrl?: string | null;
  imagenPrincipalUrl?: string | null;
  estado: string;
}

export interface TandaActual {
  id: number;
  numeroTanda: number;
  nombre?: string | null;
  precio: number;

  cantidadTotal: number;
  cantidadVendida: number;
  cantidadReservada: number;

  /**
   * Cantidad real de cupos físicos disponibles.
   * Se mantiene por compatibilidad con el backend.
   */
  disponibles: number;

  /**
   * Cantidad real de cupos físicos disponibles.
   */
  cuposDisponibles: number;

  /**
   * Cupos consumidos por una unidad comercial.
   * Ejemplo:
   * - Entrada simple: 1
   * - Combo X2: 2
   * - Combo X4: 4
   */
  cuposPorUnidad: number;

  /**
   * Cantidad de entradas o combos completos
   * que todavía pueden venderse.
   */
  unidadesDisponibles: number;

  /**
   * Cupos restantes que no alcanzan para
   * formar otra unidad completa.
   */
  cuposSobrantes: number;

  /**
   * Valor descriptivo:
   * "entrada", "entradas", "combo" o "combos".
   */
  unidadDisponibilidad: string;

  /**
   * Texto listo para mostrar en pantalla.
   * Ejemplo: "10 combos disponibles".
   */
  textoDisponibilidad: string;

  /**
   * Indica si queda al menos una unidad
   * comercial completa disponible.
   */
  tieneDisponibilidad: boolean;

  fechaInicio?: string | null;
  fechaFin?: string | null;
  habilitadaAnticipadamente: boolean;
  mensajeDisponibilidad?: string | null;
}

export interface EntradaDisponible {
  id: number;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;

  maximoPorOrden?: number | null;
  maximoPorUsuario?: number | null;

  incluyeBebidas: boolean;
  descripcionBebidas?: string | null;

  esCombo: boolean;
  cantidadPersonas: number;

  tieneHorarioIngreso: boolean;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;

  tandaActual: TandaActual | null;
}

export interface RRPPDisponible {
  id: number;
  eventoId: number;
  eventoNombre: string;
  rrppUsuarioId: number;
  rrppNombre: string;
  rrppEmail: string;
  instagram?: string | null;
  telefonoContacto?: string | null;
  avatarUrl?: string | null;
  activo: boolean;
  fechaAsignacion: string;
}

export interface TandaEntradaAdmin {
  id: number;
  tipoEntradaId: number;

  numeroTanda: number;
  nombre?: string | null;
  precio: number;

  cantidadTotal: number;
  cantidadVendida: number;
  cantidadReservada: number;
  disponibles: number;

  estado: string | number;
  activa: boolean;

  /**
   * true  => tanda exclusiva para Ventanilla física.
   * false => tanda disponible para el canal online.
   */
  habilitadaVentaFisica: boolean;

  fechaInicio?: string | null;
  fechaFin?: string | null;

  fechaCreacion?: string;
}

/**
 * Payload usado al crear una nueva tanda.
 * Se exporta también desde este archivo para que el frontend
 * mantenga el mismo contrato en creación y actualización.
 */
export interface CrearTandaRequest {
  numeroTanda: number;
  nombre: string;
  precio: number;
  cantidadTotal: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  habilitadaVentaFisica: boolean;
}

export interface ActualizarTandaEntradaRequest {
  numeroTanda: number;
  nombre: string;
  precio: number;
  cantidadTotal: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  habilitadaVentaFisica: boolean;
}

export interface TipoEntradaAdmin {
  id: number;
  eventoId: number;
  nombre: string;
  descripcion?: string | null;
  imagenUrl: string;
  incluyeBebidas: boolean;
  descripcionBebidas?: string | null;
  esCombo: boolean;
  cantidadPersonas: number;
  tieneHorarioIngreso: boolean;
  maximoPorOrden?: number | null;
  maximoPorUsuario?: number | null;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;
  activo: boolean;
  eliminado: boolean;
  bebidasIncluidas: TipoEntradaBebidaIncluidaAdmin[];
  tandas: TandaEntradaAdmin[];
}

export interface EventoProximoBebidas {
  eventoId: number;
  nombre: string;
  lugar?: string | null;
  fechaInicio: string;
  bannerUrl?: string | null;
}
