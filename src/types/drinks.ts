export interface BebidaProducto {
  id: number;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  precioBase: number;
  disponibleGlobal: boolean;

  manejaStock: boolean;
  stockDisponible: number;

  activo: boolean;
  fechaCreacion: string;
}

export interface CrearBebidaProductoRequest {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  precioBase: number;
  disponibleGlobal: boolean;
  manejaStock: boolean;
stockDisponible: number;
}

export interface ActualizarBebidaProductoRequest {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  precioBase: number;
  disponibleGlobal: boolean;

  manejaStock: boolean;
  stockDisponible: number;

  activo: boolean;
}

export interface BebidaEventoAdmin {
  id: number;
  eventoId: number;
  eventoNombre: string;

  bebidaProductoId: number;

  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;

  precioBase: number;
  precioEvento?: number | null;
  precioFinal: number;

  manejaStock: boolean;
  stockAsignado: number;
  stockDisponible: number;

  precioPromocionalActivo: boolean;

  disponible: boolean;
  activo: boolean;
}

export interface BebidaDisponibleParaEvento {
  bebidaProductoId: number;
  bebidaEventoId?: number | null;

  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;

  precioBase: number;
  precioEvento?: number | null;
  precioFinal: number;

  disponibleGlobal: boolean;

  /*
   * Stock global del BebidaProducto.
   */
  manejaStockGlobal: boolean;
  stockDisponibleGlobal: number;

  /*
   * Configuración particular del evento.
   */
  manejaStockEvento: boolean;
  stockAsignadoEvento: number;
  stockDisponibleEvento: number;

  precioPromocionalActivo: boolean;

  asignadaAlEvento: boolean;
  disponibleEnEvento: boolean;
}

export interface BebidaCatalogo {
  bebidaProductoId: number;
  bebidaEventoId?: number | null;
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  precio: number;
  disponible: boolean;
}

export interface BebidaCarritoItem extends BebidaCatalogo {
  cantidad: number;
}

export interface CrearBebidaOrdenRequest {
  eventoId?: number | null;
  idempotencyKey?: string | null;
  items: {
    bebidaProductoId: number;
    cantidad: number;
  }[];
}

export interface BebidaOrden {
  id: number;

  eventoId?: number | null;
  eventoNombre?: string | null;

  estado: string;
  pagoEstado: string;

  codigoQR: string;
  codigoRetiro: string;

  subtotal: number;
  cargoServicio: number;
  total: number;

  fechaCreacion: string;

  fechaExpiracionReserva?: string | null;

  fechaPagoConfirmado?: string | null;
  fechaEntregada?: string | null;

  items: BebidaOrdenItem[];
}
export interface BebidaOrdenItem {
  id: number;
  bebidaProductoId: number;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface BebidaOrdenBarra {
  id: number;
  eventoNombre?: string | null;
  estado: string;
  pagoEstado: string;
  codigoRetiro: string;
  total: number;
  fechaPagoConfirmado?: string | null;
  fechaEntregada?: string | null;
  puedeEntregar: boolean;
  items: {
    nombreProducto: string;
    cantidad: number;
  }[];
}

export interface CrearBebidaOrdenPagoResponse {
  ordenId: number;
  estado: string;
  pagoEstado: string;
  total: number;
  externalReference: string;
  preferenceId: string;
  checkoutUrl: string;
  sandboxCheckoutUrl?: string | null;
}


export interface AsignarBebidaEventoRequest {
  bebidaProductoId: number;
  precioEvento?: number | null;
  disponible: boolean;

  manejaStock: boolean;
  stockAsignado: number;
}

export interface ActualizarBebidaEventoRequest {
  precioEvento?: number | null;
  disponible: boolean;
  activo: boolean;

  manejaStock: boolean;
  stockAsignado: number;
}

export interface AsignarBebidaMasivoItemRequest {
  bebidaProductoId: number;
  precioEvento?: number | null;
  disponible: boolean;

  manejaStock: boolean;
  stockAsignado: number;
}

