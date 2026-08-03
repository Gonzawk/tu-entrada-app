export interface AdminEstadisticasResumen {
  eventosActivos: number;

  ticketsVendidos: number;
  ticketsIngresados: number;
  ticketsPendientes: number;

  totalOrdenesRRPP: number;
  totalBarraOnline: number;
  totalCajaBarra: number;
  totalVentanilla: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalGeneral: number;

  cajasAbiertas: number;
  cajasCerradas: number;

  eventos: AdminEstadisticaEvento[];
}

export interface AdminEstadisticaEvento {
  eventoId: number;
  eventoNombre: string;
  fechaInicio: string;

  ticketsVendidos: number;
  ticketsIngresados: number;

  totalOrdenesRRPP: number;
  totalBarraOnline: number;
  totalCajaBarra: number;
  totalVentanilla: number;
  totalGeneral: number;
}

export interface AdminEstadisticaEventoDetalle {
  eventoId: number;
  eventoNombre: string;
  fechaInicio: string;

  ticketsVendidos: number;
  ticketsIngresados: number;
  ticketsPendientes: number;
  ticketsCancelados: number;

  totalOrdenesRRPP: number;
  totalBarraOnline: number;
  totalCajaBarra: number;
  totalVentanilla: number;

  totalEfectivo: number;
  totalTransferencia: number;
  totalGeneral: number;

  cajasBarraAbiertas: number;
  cajasBarraCerradas: number;
  cajasVentanillaAbiertas: number;
  cajasVentanillaCerradas: number;

  entradasMasVendidas: AdminEntradaVendida[];
  bebidasMasVendidas: AdminBebidaVendida[];
  cajas: AdminCajaEvento[];
}

export interface AdminEntradaVendida {
  tipoEntradaId: number;
  nombre: string;
  cantidadVendida: number;
  totalRecaudado: number;
}

export interface AdminBebidaVendida {
  bebidaProductoId: number;
  nombre: string;
  cantidadVendida: number;
  totalRecaudado: number;
}

export interface AdminCajaEvento {
  cajaId: number;
  usuarioNombre: string;
  tipoCaja: string;
  estado: string;
  totalEfectivo: number;
  totalTransferencia: number;
  totalGeneral: number;
  fechaApertura: string;
  fechaCierre?: string | null;
}

export interface AdminEventoCargosResumen {
  eventoId: number;
  eventoNombre: string;
  fechaInicio: string;

  ticketsOnlineRRPP: number;
  ticketsVentanillaDigital: number;
  ticketsVentanillaFisico: number;
  ticketsMultiIngresoAdmin: number;
  ticketsBeneficioCumpleanios: number;

  personasVendidasSistema: number;
  personasIngresadasReales: number;

  cargoServicioRRPP: number;
  cargoServicioVentanillaDigital: number;
  cargoServicioVentanillaFisico: number;
  cargoServicioMultiIngresoAdmin: number;
  cargoServicioTotal: number;

  totalOrdenesRRPP: number;
  totalVentanillaDigital: number;
  totalVentanillaFisico: number;
  totalGeneralTickets: number;
}