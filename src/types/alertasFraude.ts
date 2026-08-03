export interface AlertaUsoFraudulento {
  id: number;
  tipo: string;

  eventoId?: number | null;
  eventoNombre?: string | null;

  usuarioEscaneoId?: number | null;
  usuarioEscaneoNombre?: string | null;

  usuarioDuenioId?: number | null;
  usuarioDuenioNombre?: string | null;

  bebidaOrdenId?: number | null;
  ticketId?: number | null;

  codigoQR?: string | null;
  codigoRetiro?: string | null;

  descripcion: string;
  datosExtraJson?: string | null;

  revisada: boolean;
  revisadaPorUsuarioId?: number | null;
  revisadaPorUsuarioNombre?: string | null;

  fechaRevision?: string | null;
  fechaCreacion: string;
}