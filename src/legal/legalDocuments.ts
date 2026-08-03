export type TipoDocumentoLegal =
  | "Privacidad"
  | "Terminos"
  | "CondicionesCompra"
  | "Reembolsos"
  | "ReglamentoEventos";

export const LEGAL_TEXTS: Record<TipoDocumentoLegal, string> = {
  Privacidad: `
Política de Privacidad

TuEntrada recolecta y utiliza datos necesarios para crear cuentas, gestionar eventos, emitir tickets, validar códigos QR, procesar compras y prevenir fraudes.

Datos recolectados:
- Nombre completo
- Email
- Teléfono
- Órdenes
- Tickets
- Códigos QR
- Historial de validaciones
- Registros operativos de acceso y entrega de beneficios

La cámara se utiliza únicamente para escanear códigos QR.

Los pagos pueden procesarse mediante Mercado Pago u otros medios oficiales habilitados.

No almacenamos datos completos de tarjetas.

El usuario puede solicitar información, rectificación o eliminación de sus datos conforme corresponda.
`,

  Terminos: `
Términos y Condiciones

El usuario se compromete a utilizar TuEntrada de forma correcta.

Cada ticket posee un código QR único. No debe compartirse públicamente.

La plataforma puede registrar validaciones, escaneos, entregas de beneficios y acciones operativas para seguridad del evento.

El uso indebido de cuentas, tickets o beneficios podrá generar bloqueos o alertas administrativas.
`,

  CondicionesCompra: `
Condiciones de Compra

Solo se garantizan entradas adquiridas por canales oficiales:

- App TuEntrada
- RRPP habilitados por el evento
- Mercado Pago iniciado desde la app

No se garantiza la validez de tickets comprados a terceros.

Un ticket adquirido fuera de los canales oficiales puede estar usado, duplicado, transferido, cancelado o invalidado.

Comprar a terceros será bajo exclusiva responsabilidad del comprador.
`,

  Reembolsos: `
Política de Reembolsos y Reprogramaciones

Si un evento es reprogramado, los tickets seguirán siendo válidos para la nueva fecha informada.

No es necesario cambiar el QR.

Si el evento es cancelado, el organizador informará el procedimiento correspondiente.

Las devoluciones dependerán de las condiciones del evento, medio de pago y políticas del organizador.
`,

  ReglamentoEventos: `
Reglamento General de Eventos

El ingreso se permite únicamente con QR válido.

La organización puede solicitar documentación para validar identidad.

Si una entrada tiene horario específico, el ingreso deberá respetar ese rango.

La organización puede negar el ingreso por seguridad, incumplimiento de normas o comportamiento indebido.

No compartas tu QR.
`,
};