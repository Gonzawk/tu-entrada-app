export interface ConfiguracionSistema {
  id: number;

  nombreSistema?: string | null;
  logoUrl?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;

  mercadoPagoActivo: boolean;

  cargoServicioEntradasActivo: boolean;
  cargoServicioEntradasMonto: number;
  cargoServicioEntradasDescripcion?: string | null;

  fechaCreacion: string;
  fechaActualizacion?: string | null;
}

export interface ActualizarConfiguracionSistemaRequest {
  nombreSistema?: string | null;
  logoUrl?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;

  mercadoPagoActivo: boolean;

  cargoServicioEntradasActivo: boolean;
  cargoServicioEntradasMonto: number;
  cargoServicioEntradasDescripcion?: string | null;
}

export interface CargoServicioEntradas {
  activo: boolean;
  monto: number;
  descripcion?: string | null;
}