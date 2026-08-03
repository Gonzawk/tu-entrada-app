export interface HelpQuestion {
  id: string;
  title: string;
  content: string;
}

export const HELP_QUESTIONS: HelpQuestion[] = [
  {
    id: "comprar-entrada",
    title: "¿Cómo compro una entrada?",
    content:
      "Ingresá al evento, seleccioná el tipo de entrada y la tanda disponible. Luego elegí un RRPP habilitado, completá las asignaciones solicitadas y generá la orden.",
  },
  {
    id: "pago-rrpp",
    title: "¿Cómo funciona el pago mediante RRPP?",
    content:
      "La orden queda pendiente hasta que el RRPP confirme la recepción del pago. Una vez confirmado, los tickets se generan automáticamente y aparecen en tu cuenta.",
  },
  {
    id: "ticket-pendiente",
    title: "¿Por qué todavía no aparece mi ticket?",
    content:
      "El ticket se genera cuando el pago queda confirmado. Si realizaste el pago a un RRPP y sigue pendiente, comunicate directamente con el RRPP asociado a la orden.",
  },
  {
    id: "qr",
    title: "¿Puedo compartir una captura del QR?",
    content:
      "No. El QR es único y debe mantenerse privado. La primera validación correcta puede marcar la entrada como utilizada e impedir usos posteriores.",
  },
  {
    id: "terceros",
    title: "¿Qué sucede si compro una entrada a un tercero?",
    content:
      "TuEntrada solo garantiza entradas adquiridas mediante la aplicación, RRPP habilitados o medios de pago oficiales iniciados desde la plataforma. La compra a terceros queda bajo responsabilidad del comprador.",
  },
  {
    id: "reprogramacion",
    title: "¿Qué ocurre si el evento cambia de fecha?",
    content:
      "Si el evento es reprogramado, los tickets mantienen su validez y se actualizan para la nueva fecha. El código QR no debe reemplazarse.",
  },
  {
    id: "horario",
    title: "¿Mi entrada puede tener un horario de ingreso?",
    content:
      "Sí. Algunos tipos de entrada permiten ingresar únicamente desde o hasta un horario determinado. Revisá siempre el detalle de la entrada antes de asistir.",
  },
  {
    id: "combo",
    title: "¿Cómo funcionan las entradas combo?",
    content:
      "Un combo reserva cupos para varias personas. Cada integrante recibe su propio ticket cuando la orden es confirmada y las asignaciones correspondientes quedan completas.",
  },
  {
    id: "bebidas",
    title: "¿Cómo retiro una bebida o beneficio?",
    content:
      "Cuando la entrada incluye bebidas o beneficios, la aplicación genera un QR específico para barra. Mostralo únicamente al momento de recibir todos los productos detallados.",
  },
  {
    id: "cancelacion",
    title: "¿Puede cancelarse una orden pendiente?",
    content:
      "Sí. Mientras la orden siga pendiente de pago, el RRPP puede cancelarla. Los cupos reservados vuelven automáticamente a la tanda.",
  },
];