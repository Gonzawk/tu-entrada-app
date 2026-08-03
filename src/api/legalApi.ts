import { apiClient } from "./apiClient";

export type TipoDocumentoLegal =
  | "Privacidad"
  | "Terminos"
  | "CondicionesCompra"
  | "Reembolsos"
  | "ReglamentoEventos";

export interface DocumentoLegalEstado {
  versionLegalId: number;
  tipoDocumento: TipoDocumentoLegal;
  titulo: string;
  version: string;
  aceptado: boolean;
  fechaAceptacion?: string | null;
}

export interface EstadoLegalUsuario {
  completo: boolean;
  puedeComprar: boolean;
  documentos: DocumentoLegalEstado[];
}

export async function getEstadoLegalApi(): Promise<EstadoLegalUsuario> {
  const response = await apiClient.get("/api/legal/estado");
  return response.data;
}

export async function aceptarDocumentoLegalApi(data: {
  tipoDocumento: TipoDocumentoLegal;
}) {
  const response = await apiClient.post("/api/legal/aceptar", data);
  return response.data;
}