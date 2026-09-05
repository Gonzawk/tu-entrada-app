import { createIdempotencyKey } from "@/utils/idempotency";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { abrirCajaApi, cerrarCajaApi, getCajaAbiertaApi } from "../../api/cajasApi";
import { getCargoServicioEntradasApi } from "../../api/configuracionApi";
import { getEventosActivosApi } from "../../api/eventsApi";
import {
  cancelarPagoPointVentaVentanillaApi,
  crearVentaVentanillaApi,
  getEstadoPagoVentaVentanillaApi,
  getVentanillaEntradasDisponiblesApi,
} from "../../api/ventanillaApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { Caja, MetodoPagoPresencial } from "../../types/cajas";
import { CargoServicioEntradas } from "../../types/configuracion";
import { EventoActivo } from "../../types/events";
import { VentaPresencialEstadoPagoResponse } from "../../types/mercadoPagoPoint";
import { VentanillaEntradaDisponible } from "../../types/ventanilla";
import { formatMoney } from "../../utils/formatMoney";

const POINT_POLL_INTERVAL_MS = 2500;

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  return err?.response?.data?.message ?? fallback;
}

function normalizar(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function esPagoAprobado(
  estado?: VentaPresencialEstadoPagoResponse | null
): boolean {
  if (!estado) return false;

  return (
    normalizar(estado.estadoVenta) === "confirmada" ||
    normalizar(estado.estadoPago) === "aprobado" ||
    (normalizar(estado.mercadoPagoStatus) === "processed" &&
      normalizar(estado.mercadoPagoStatusDetail) === "accredited")
  );
}

function esPagoFinalNoAprobado(
  estado?: VentaPresencialEstadoPagoResponse | null
): boolean {
  if (!estado || !estado.estadoFinal) return false;
  return !esPagoAprobado(estado);
}

function impresionSiguePendiente(
  estado?: VentaPresencialEstadoPagoResponse | null
): boolean {
  if (!estado || !esPagoAprobado(estado) || estado.ticketImpreso) {
    return false;
  }

  const impresion = normalizar(estado.estadoImpresion);

  return !["fallida", "cancelada", "confirmada", "enterminal"].includes(
    impresion
  );
}

function debeSeguirPolling(
  estado?: VentaPresencialEstadoPagoResponse | null
): boolean {
  if (!estado) return false;
  if (!estado.estadoFinal) return true;
  return impresionSiguePendiente(estado);
}

function tituloEstadoPoint(
  estado?: VentaPresencialEstadoPagoResponse | null
): string {
  if (!estado) return "Mercado Pago Point";

  if (esPagoAprobado(estado)) {
    if (estado.ticketImpreso) return "Pago aprobado";
    return "Pago aprobado · imprimiendo";
  }

  if (normalizar(estado.estadoPago) === "cancelado") return "Cobro cancelado";

  if (
    normalizar(estado.estadoPago) === "vencido" ||
    normalizar(estado.estadoVenta) === "vencida"
  ) {
    return "Cobro vencido";
  }

  if (
    normalizar(estado.estadoPago) === "rechazado" ||
    normalizar(estado.estadoPago) === "fallido" ||
    normalizar(estado.estadoVenta) === "fallida"
  ) {
    return "Pago no aprobado";
  }

  if (estado.requiereAccionTerminal) return "Revisá el Point";
  if (normalizar(estado.mercadoPagoStatus) === "at_terminal") {
    return "Esperando en el Point";
  }

  return "Esperando pago";
}

function descripcionEstadoPoint(
  estado?: VentaPresencialEstadoPagoResponse | null
): string {
  if (!estado) return "Preparando el cobro...";

  if (estado.mensaje) return estado.mensaje;

  if (esPagoAprobado(estado)) {
    if (estado.ticketImpreso) {
      return "El pago fue acreditado y la entrada física fue impresa correctamente.";
    }

    if (
      ["fallida", "cancelada"].includes(normalizar(estado.estadoImpresion))
    ) {
      return "El pago fue acreditado, pero la impresión necesita revisión.";
    }

    return "El pago fue acreditado. Estamos verificando la impresión de la entrada.";
  }

  if (estado.requiereAccionTerminal) {
    return "La operación requiere una acción en el terminal. Revisá el Point antes de continuar.";
  }

  if (normalizar(estado.mercadoPagoStatus) === "at_terminal") {
    return "El cobro ya está visible en el Point. Completá o cancelá la operación desde la terminal.";
  }

  if (esPagoFinalNoAprobado(estado)) {
    return "La operación terminó sin acreditarse. La entrada seleccionada se conserva para que puedas intentar nuevamente.";
  }

  return "Esperando que el cliente complete el pago en el Point.";
}

export default function VentanillaScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [eventos, setEventos] = useState<EventoActivo[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [montoInicial, setMontoInicial] = useState("0");

  const [cargoServicio, setCargoServicio] =
    useState<CargoServicioEntradas | null>(null);

  const [entradas, setEntradas] = useState<VentanillaEntradaDisponible[]>([]);
  const [entradaSeleccionada, setEntradaSeleccionada] =
    useState<VentanillaEntradaDisponible | null>(null);

  const [metodoPago, setMetodoPago] = useState<MetodoPagoPresencial>(1);
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState("");

  const [ventaKey, setVentaKey] = useState(() =>
    createIdempotencyKey("venta-ventanilla")
  );

  const [pointVentaId, setPointVentaId] = useState<number | null>(null);
  const [pointEstado, setPointEstado] =
    useState<VentaPresencialEstadoPagoResponse | null>(null);
  const [pointModalVisible, setPointModalVisible] = useState(false);
  const [cancelandoPoint, setCancelandoPoint] = useState(false);
  const [consultandoPoint, setConsultandoPoint] = useState(false);

  const pagoAprobadoProcesadoRef = useRef<number | null>(null);
  const pagoFinalNoAprobadoProcesadoRef = useRef<number | null>(null);

  const pointBloqueado =
    pointVentaId !== null &&
    pointEstado !== null &&
    !pointEstado.estadoFinal;

  const subtotalEntrada = useMemo(
    () => Number(entradaSeleccionada?.precio ?? 0),
    [entradaSeleccionada]
  );

  /*
   * Mantiene la misma regla utilizada por el catálogo online:
   * - entrada individual: 1 ticket
   * - combo: el cargo se aplica por cada persona/ticket incluido
   */
  const cantidadTicketsCargoServicio = useMemo(() => {
    if (!entradaSeleccionada) return 0;

    return entradaSeleccionada.esCombo
      ? Math.max(entradaSeleccionada.cantidadPersonas, 1)
      : 1;
  }, [entradaSeleccionada]);

  const cargoServicioUnitario = useMemo(() => {
    if (!cargoServicio?.activo) {
      return 0;
    }

    const monto = Number(cargoServicio.monto ?? 0);

    return Number.isFinite(monto) && monto > 0 ? monto : 0;
  }, [cargoServicio]);

  const cargoServicioMonto = useMemo(() => {
    return cargoServicioUnitario * cantidadTicketsCargoServicio;
  }, [cargoServicioUnitario, cantidadTicketsCargoServicio]);

  const total = useMemo(() => {
    return subtotalEntrada + cargoServicioMonto;
  }, [subtotalEntrada, cargoServicioMonto]);

  const montoEfectivoMixtoNumero = useMemo(() => {
    const value = montoEfectivoMixto.trim();
    if (!value) return 0;

    const numero = Number(value.replace(",", "."));
    return Number.isFinite(numero) ? numero : Number.NaN;
  }, [montoEfectivoMixto]);

  const montoMercadoPagoMixto = useMemo(() => {
    if (!Number.isFinite(montoEfectivoMixtoNumero)) return 0;
    return Math.max(total - montoEfectivoMixtoNumero, 0);
  }, [total, montoEfectivoMixtoNumero]);

  const loadEntradas = useCallback(async (id: number) => {
    try {
      const data = await getVentanillaEntradasDisponiblesApi(id);
      setEntradas(data);
      setEntradaSeleccionada(null);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar las entradas de ventanilla.")
      );
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [cajaData, eventosData, cargoData] = await Promise.all([
        getCajaAbiertaApi(2),
        getEventosActivosApi({ page: 1, pageSize: 50, search: "" }),
        getCargoServicioEntradasApi().catch(() => null),
      ]);

      setCaja(cajaData);
      setEventos(eventosData.items ?? []);
      setCargoServicio(cargoData);

      if (cajaData?.eventoId) {
        setEventoId(cajaData.eventoId);
      } else if ((eventosData.items ?? []).length > 0) {
        setEventoId(eventosData.items[0].id);
      }
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar ventanilla.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (caja?.eventoId) {
      void loadEntradas(caja.eventoId);
    }
  }, [caja?.eventoId, loadEntradas]);

  const consultarEstadoPoint = useCallback(async (ventaId: number) => {
    const estado = await getEstadoPagoVentaVentanillaApi(ventaId);
    setPointEstado(estado);
    return estado;
  }, []);

  useEffect(() => {
    if (!pointVentaId || !pointModalVisible) return;

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const ejecutar = async () => {
      try {
        setConsultandoPoint(true);

        const estado = await getEstadoPagoVentaVentanillaApi(pointVentaId);

        if (disposed) return;

        setPointEstado(estado);

        if (debeSeguirPolling(estado)) {
          timeoutId = setTimeout(ejecutar, POINT_POLL_INTERVAL_MS);
        }
      } catch {
        if (!disposed) {
          timeoutId = setTimeout(ejecutar, POINT_POLL_INTERVAL_MS);
        }
      } finally {
        if (!disposed) setConsultandoPoint(false);
      }
    };

    void ejecutar();

    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pointVentaId, pointModalVisible]);

  useEffect(() => {
    if (!pointEstado || !pointVentaId) return;

    if (
      esPagoAprobado(pointEstado) &&
      pagoAprobadoProcesadoRef.current !== pointVentaId
    ) {
      pagoAprobadoProcesadoRef.current = pointVentaId;
      setEntradaSeleccionada(null);
      setMontoEfectivoMixto("");
      setVentaKey(createIdempotencyKey("venta-ventanilla"));

      if (caja?.eventoId) {
        void loadEntradas(caja.eventoId);
      }

      return;
    }

    if (
      esPagoFinalNoAprobado(pointEstado) &&
      pagoFinalNoAprobadoProcesadoRef.current !== pointVentaId
    ) {
      pagoFinalNoAprobadoProcesadoRef.current = pointVentaId;
      setVentaKey(createIdempotencyKey("venta-ventanilla"));
    }
  }, [pointEstado, pointVentaId, caja?.eventoId, loadEntradas]);

  async function abrirCaja() {
    try {
      const monto = Number(montoInicial);

      if (!eventoId) {
        Alert.alert("Falta evento", "Seleccioná un evento.");
        return;
      }

      if (Number.isNaN(monto) || monto < 0) {
        Alert.alert("Dato inválido", "El monto inicial no puede ser negativo.");
        return;
      }

      setSaving(true);

      const data = await abrirCajaApi({
        tipoCaja: 2,
        eventoId,
        montoInicial: monto,
        observacionApertura: "Caja ventanilla abierta desde app",
      });

      setCaja(data);
      await loadEntradas(eventoId);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo abrir caja.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function iniciarVentaPoint() {
    if (!caja || !entradaSeleccionada) return;

    const esMixto = metodoPago === 4;

    const venta = await crearVentaVentanillaApi({
      cajaId: caja.id,
      eventoId: caja.eventoId!,
      tandaEntradaId: entradaSeleccionada.tandaEntradaId,
      metodoPago,
      montoEfectivo: esMixto ? montoEfectivoMixtoNumero : null,
      idempotencyKey: ventaKey,
      observacion: esMixto
        ? "Venta física ventanilla - Efectivo + Mercado Pago Point"
        : "Venta física ventanilla - Mercado Pago Point",
    });

    if (!venta.id) {
      throw new Error(
        "La API creó la venta pero no devolvió un identificador válido."
      );
    }

    pagoAprobadoProcesadoRef.current = null;
    pagoFinalNoAprobadoProcesadoRef.current = null;

    setPointVentaId(venta.id);
    setPointEstado(null);
    setPointModalVisible(true);

    try {
      await consultarEstadoPoint(venta.id);
    } catch {
      // El polling continuará con la misma venta.
    }
  }

  async function registrarVentaInmediata() {
    if (!caja || !entradaSeleccionada) return;

    await crearVentaVentanillaApi({
      cajaId: caja.id,
      eventoId: caja.eventoId!,
      tandaEntradaId: entradaSeleccionada.tandaEntradaId,
      metodoPago,
      montoEfectivo: null,
      idempotencyKey: ventaKey,
      observacion: "Venta física por ventanilla",
    });

    setEntradaSeleccionada(null);
    setMontoEfectivoMixto("");
    setVentaKey(createIdempotencyKey("venta-ventanilla"));

    await loadEntradas(caja.eventoId!);

    Alert.alert(
      "Correcto",
      "Venta registrada e impresión física solicitada."
    );
  }

  async function ejecutarConfirmacionVenta() {
    if (!caja || !entradaSeleccionada) return;

    try {
      setSaving(true);

      if (metodoPago === 3 || metodoPago === 4) {
        await iniciarVentaPoint();
        return;
      }

      await registrarVentaInmediata();
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo registrar la venta.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmarVenta() {
    if (!caja || !entradaSeleccionada || pointBloqueado || saving) return;

    if (total <= 0) {
      Alert.alert("Precio inválido", "La entrada no posee un precio válido.");
      return;
    }

    if (metodoPago === 4) {
      if (
        !Number.isFinite(montoEfectivoMixtoNumero) ||
        montoEfectivoMixtoNumero <= 0 ||
        montoEfectivoMixtoNumero >= total
      ) {
        Alert.alert(
          "Monto en efectivo inválido",
          "Para un pago mixto, el efectivo debe ser mayor a $0 y menor al total de la venta."
        );
        return;
      }
    }

    const requierePoint = metodoPago === 3 || metodoPago === 4;

    const detalleMixto =
      metodoPago === 4
        ? `\nEfectivo: ${formatMoney(montoEfectivoMixtoNumero)}\nMercado Pago: ${formatMoney(
            montoMercadoPagoMixto
          )}`
        : "";

    const textoFinal = requierePoint
      ? "\n\nLa entrada quedará bloqueada hasta que el cobro Point termine o sea cancelado."
      : "\n\nUna vez confirmada no podrá modificarse.";

    Alert.alert(
      requierePoint ? "Confirmar cobro Point" : "Confirmar venta",
      `Entrada: ${entradaSeleccionada.tipoEntradaNombre}` +
        `\nSubtotal: ${formatMoney(subtotalEntrada)}` +
        (cargoServicioMonto > 0
          ? `\n${cargoServicio?.descripcion || "Cargo por servicio"}: ${formatMoney(
              cargoServicioMonto
            )}`
          : "") +
        `\nTotal: ${formatMoney(total)}` +
        `${detalleMixto}${textoFinal}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: requierePoint ? "Enviar al Point" : "Confirmar",
          onPress: () => void ejecutarConfirmacionVenta(),
        },
      ]
    );
  }

  async function cancelarCobroPoint() {
    if (!pointVentaId || cancelandoPoint) return;

    Alert.alert(
      "Cancelar cobro",
      metodoPago === 4
        ? `¿Querés cancelar este intento? Recordá devolver ${formatMoney(
            montoEfectivoMixtoNumero
          )} recibidos en efectivo. Si el cobro ya está en el Point, puede requerir cancelación desde la terminal.`
        : "¿Querés cancelar este intento de pago? Si el cobro ya está en el Point, puede requerir cancelación desde la terminal.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar cobro",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelandoPoint(true);
              const estado =
                await cancelarPagoPointVentaVentanillaApi(pointVentaId);
              setPointEstado(estado);
            } catch (e: unknown) {
              Alert.alert(
                "No se pudo cancelar",
                getErrorMessage(
                  e,
                  "No se pudo cancelar el cobro. Se seguirá consultando el estado para evitar inconsistencias."
                )
              );

              try {
                await consultarEstadoPoint(pointVentaId);
              } catch {
                // El modal queda abierto y el polling sigue activo.
              }
            } finally {
              setCancelandoPoint(false);
            }
          },
        },
      ]
    );
  }

  function cerrarModalPoint() {
    if (!pointEstado?.estadoFinal && pointVentaId) {
      Alert.alert(
        "Cobro en curso",
        "La operación todavía no finalizó. Cancelala o completala antes de cerrar este flujo."
      );
      return;
    }

    setPointModalVisible(false);
    setPointVentaId(null);
    setPointEstado(null);
    setCancelandoPoint(false);
    setConsultandoPoint(false);
  }

  async function cerrarCajaActual() {
    if (!caja) return;

    if (pointBloqueado) {
      Alert.alert(
        "Cobro en curso",
        "Finalizá o cancelá el cobro de Mercado Pago antes de cerrar la caja."
      );
      return;
    }

    Alert.alert(
      "Cerrar caja",
      "¿Seguro que querés cerrar la caja? No podrás registrar más ventas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              await cerrarCajaApi(caja.id, {
                observacionCierre: "Caja ventanilla cerrada desde app",
              });

              setCaja(null);
              setEntradas([]);
              setEntradaSeleccionada(null);
              setMontoEfectivoMixto("");

              Alert.alert("Correcto", "Caja cerrada.");
            } catch (e: unknown) {
              Alert.alert(
                "Error",
                getErrorMessage(e, "No se pudo cerrar caja.")
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
        <AppLayout title="Ventanilla">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
      <AppLayout title="Ventanilla">
        {!caja ? (
          <View style={styles.card}>
            <Text style={styles.title}>Abrir caja de ventanilla</Text>

            <Text style={styles.label}>Evento</Text>

            {eventos.map((e) => (
              <Pressable
                key={e.id}
                style={[
                  styles.option,
                  eventoId === e.id && styles.optionActive,
                ]}
                onPress={() => setEventoId(e.id)}
              >
                <Text style={styles.optionText}>{e.nombre}</Text>
              </Pressable>
            ))}

            <TextInput
              placeholder="Monto inicial"
              placeholderTextColor="#888"
              value={montoInicial}
              onChangeText={setMontoInicial}
              keyboardType="numeric"
              style={styles.input}
            />

            <Pressable
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={abrirCaja}
              disabled={saving}
            >
              <Text style={styles.buttonText}>Abrir caja</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Caja abierta #{caja.id}</Text>
              <Text style={styles.muted}>
                Evento: {caja.eventoNombre ?? "Sin evento"}
              </Text>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/ventanilla/sales" as never)}
              >
                <Text style={styles.buttonText}>Ver resumen y ventas</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Método de pago</Text>

              <View style={styles.row}>
                <Pressable
                  style={[
                    styles.methodButton,
                    metodoPago === 1 && styles.optionActive,
                    pointBloqueado && styles.disabled,
                  ]}
                  onPress={() => setMetodoPago(1)}
                  disabled={pointBloqueado}
                >
                  <Text style={styles.optionText}>Efectivo</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodButton,
                    metodoPago === 2 && styles.optionActive,
                    pointBloqueado && styles.disabled,
                  ]}
                  onPress={() => setMetodoPago(2)}
                  disabled={pointBloqueado}
                >
                  <Text style={styles.optionText}>Transferencia</Text>
                </Pressable>
              </View>

              <View style={styles.row}>
                <Pressable
                  style={[
                    styles.methodButton,
                    metodoPago === 3 && styles.optionActive,
                    pointBloqueado && styles.disabled,
                  ]}
                  onPress={() => setMetodoPago(3)}
                  disabled={pointBloqueado}
                >
                  <Text style={styles.optionText}>Mercado Pago</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodButton,
                    metodoPago === 4 && styles.optionActive,
                    pointBloqueado && styles.disabled,
                  ]}
                  onPress={() => setMetodoPago(4)}
                  disabled={pointBloqueado}
                >
                  <Text style={styles.optionText}>Efectivo + MP</Text>
                </Pressable>
              </View>

              {metodoPago === 4 ? (
                <View style={styles.mixedBox}>
                  <Text style={styles.label}>Monto recibido en efectivo</Text>

                  <TextInput
                    placeholder="Ej: 5000"
                    placeholderTextColor="#888"
                    value={montoEfectivoMixto}
                    onChangeText={setMontoEfectivoMixto}
                    keyboardType="decimal-pad"
                    editable={!pointBloqueado}
                    style={[styles.input, pointBloqueado && styles.disabled]}
                  />

                  <RowTotal
                    label="Efectivo"
                    value={
                      Number.isFinite(montoEfectivoMixtoNumero)
                        ? Math.max(montoEfectivoMixtoNumero, 0)
                        : 0
                    }
                  />
                  <RowTotal
                    label="Mercado Pago"
                    value={montoMercadoPagoMixto}
                  />

                  <Text style={styles.chargeHelp}>
                    Ingresá solamente el efectivo recibido. El saldo a Mercado
                    Pago lo calcula el backend.
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Entradas de ventanilla</Text>

            {entradas.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.muted}>
                  No hay tandas habilitadas para venta física en este evento.
                </Text>
              </View>
            ) : null}

            {entradas.map((entrada) => {
              const selected =
                entradaSeleccionada?.tandaEntradaId === entrada.tandaEntradaId;

              return (
                <Pressable
                  key={entrada.tandaEntradaId}
                  style={[
                    styles.ticketCard,
                    selected && styles.optionActive,
                    pointBloqueado && styles.disabled,
                  ]}
                  onPress={() => setEntradaSeleccionada(entrada)}
                  disabled={pointBloqueado}
                >
                  {entrada.imagenUrl ? (
                    <Image
                      source={{ uri: entrada.imagenUrl }}
                      style={styles.ticketImage}
                    />
                  ) : null}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>
                      {entrada.tipoEntradaNombre}
                    </Text>
                    <Text style={styles.muted}>{entrada.tandaNombre}</Text>

                    {entrada.cantidadPersonas > 1 ? (
                      <Text style={styles.groupAccess}>
                        Acceso para {entrada.cantidadPersonas} personas
                      </Text>
                    ) : null}

                    <Text style={styles.price}>
                      {formatMoney(entrada.precio)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {entradaSeleccionada ? (
              <View style={styles.card}>
                <Text style={styles.title}>Venta actual</Text>

                <Text style={styles.selectedTicket}>
                  {entradaSeleccionada.tipoEntradaNombre}
                </Text>
                <Text style={styles.muted}>
                  {entradaSeleccionada.tandaNombre}
                </Text>

                <View style={styles.totalBox}>
                  <RowTotal
                    label="Subtotal entrada"
                    value={subtotalEntrada}
                  />

                  {cargoServicioMonto > 0 ? (
                    <>
                      <View style={styles.serviceChargeRow}>
                        <View style={styles.serviceChargeDescription}>
                          <Text style={styles.totalLabel}>
                            {cargoServicio?.descripcion ||
                              "Cargo por servicio"}
                          </Text>

                          <Text style={styles.serviceChargeDetail}>
                            {cantidadTicketsCargoServicio === 1
                              ? `${formatMoney(
                                  cargoServicioUnitario
                                )} por ticket`
                              : `${cantidadTicketsCargoServicio} tickets × ${formatMoney(
                                  cargoServicioUnitario
                                )}`}
                          </Text>
                        </View>

                        <Text style={styles.totalValue}>
                          {formatMoney(cargoServicioMonto)}
                        </Text>
                      </View>
                    </>
                  ) : null}

                  <View style={styles.totalSeparator} />

                  <RowTotal label="Total a cobrar" value={total} strong />

                  <Text style={styles.serviceChargeHelp}>
                    {cargoServicioMonto > 0
                      ? entradaSeleccionada.esCombo
                        ? `El cargo por servicio se aplica individualmente a cada uno de los ${cantidadTicketsCargoServicio} tickets incluidos en el combo. El servidor validará nuevamente el importe al registrar la venta.`
                        : "El cargo por servicio se aplica al ticket. El servidor validará nuevamente el importe al registrar la venta."
                      : "El servidor validará nuevamente el importe antes de registrar la venta."}
                  </Text>
                </View>

                {pointBloqueado ? (
                  <View style={styles.pendingBanner}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingTitle}>
                        Cobro Point en curso
                      </Text>
                      <Text style={styles.pendingText}>
                        La venta queda bloqueada hasta finalizar la operación.
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Pressable
                  style={[
                    styles.primaryButton,
                    (saving || total <= 0 || pointBloqueado) &&
                      styles.disabled,
                  ]}
                  onPress={confirmarVenta}
                  disabled={saving || total <= 0 || pointBloqueado}
                >
                  <Text style={styles.buttonText}>
                    {saving
                      ? "Procesando..."
                      : metodoPago === 3
                        ? "Cobrar con Mercado Pago"
                        : metodoPago === 4
                          ? "Cobrar pago mixto"
                          : "Confirmar venta"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.dangerButton,
                pointBloqueado && styles.disabled,
              ]}
              onPress={cerrarCajaActual}
              disabled={saving || pointBloqueado}
            >
              <Text style={styles.buttonText}>Cerrar caja</Text>
            </Pressable>
          </>
        )}

        <Modal
          visible={pointModalVisible}
          transparent
          animationType="fade"
          onRequestClose={cerrarModalPoint}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.pointModalCard}>
              <View style={styles.pointHeader}>
                <View style={styles.pointIcon}>
                  {debeSeguirPolling(pointEstado) || !pointEstado ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.pointIconText}>
                      {esPagoAprobado(pointEstado) ? "✓" : "!"}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.pointTitle}>
                    {tituloEstadoPoint(pointEstado)}
                  </Text>

                  {pointVentaId ? (
                    <Text style={styles.pointSaleId}>
                      Venta #{pointVentaId}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.pointDescription}>
                {descripcionEstadoPoint(pointEstado)}
              </Text>

              {metodoPago === 4 ? (
                <View style={styles.pointSplitBox}>
                  <RowTotal
                    label="Efectivo"
                    value={Math.max(montoEfectivoMixtoNumero, 0)}
                  />
                  <RowTotal
                    label="Mercado Pago"
                    value={montoMercadoPagoMixto}
                  />
                </View>
              ) : null}

              {pointEstado ? (
                <View style={styles.pointDetails}>
                  <View style={styles.pointDetailRow}>
                    <Text style={styles.pointDetailLabel}>Pago</Text>
                    <Text style={styles.pointDetailValue}>
                      {pointEstado.estadoPago}
                    </Text>
                  </View>

                  <View style={styles.pointDetailRow}>
                    <Text style={styles.pointDetailLabel}>Mercado Pago</Text>
                    <Text style={styles.pointDetailValue}>
                      {pointEstado.mercadoPagoStatus ?? "Consultando"}
                    </Text>
                  </View>

                  {esPagoAprobado(pointEstado) ? (
                    <>
                      <View style={styles.pointDetailRow}>
                        <Text style={styles.pointDetailLabel}>Impresión</Text>
                        <Text style={styles.pointDetailValue}>
                          {pointEstado.estadoImpresion}
                        </Text>
                      </View>

                      <View style={styles.pointDetailRow}>
                        <Text style={styles.pointDetailLabel}>Tickets</Text>
                        <Text style={styles.pointDetailValue}>
                          {pointEstado.cantidadImpresiones}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              {pointEstado?.errorUltimaImpresion ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>
                    Atención con la impresión
                  </Text>
                  <Text style={styles.warningText}>
                    {pointEstado.errorUltimaImpresion}
                  </Text>
                </View>
              ) : null}

              {pointEstado?.requiereAccionTerminal ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>
                    Acción requerida en el Point
                  </Text>
                  <Text style={styles.warningText}>
                    {pointEstado.mensaje ??
                      "Revisá la operación directamente en la terminal."}
                  </Text>
                </View>
              ) : null}

              {!pointEstado?.estadoFinal && pointVentaId ? (
                <Pressable
                  style={[
                    styles.dangerButton,
                    cancelandoPoint && styles.disabled,
                  ]}
                  onPress={cancelarCobroPoint}
                  disabled={cancelandoPoint}
                >
                  {cancelandoPoint ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Cancelar cobro</Text>
                  )}
                </Pressable>
              ) : null}

              {pointEstado?.estadoFinal ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={cerrarModalPoint}
                >
                  <Text style={styles.buttonText}>
                    {esPagoAprobado(pointEstado)
                      ? "Finalizar venta"
                      : "Volver a la venta"}
                  </Text>
                </Pressable>
              ) : null}

              {!pointEstado ? (
                <Text style={styles.pointPollingText}>
                  Creando y verificando la operación...
                </Text>
              ) : consultandoPoint && debeSeguirPolling(pointEstado) ? (
                <Text style={styles.pointPollingText}>
                  Actualizando estado automáticamente...
                </Text>
              ) : null}
            </View>
          </View>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}

function RowTotal({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalLabelStrong : styles.totalLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.totalValueStrong : styles.totalValue}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  label: {
    color: "#BDBDBD",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 12,
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  option: {
    padding: 13,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderColor: "#E50914",
  },
  optionText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  methodButton: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  mixedBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  ticketCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  ticketImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  ticketName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  selectedTicket: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  groupAccess: {
    color: "#FFD166",
    fontWeight: "800",
    marginTop: 5,
  },
  price: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 5,
  },
  totalBox: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  totalLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  totalValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  totalLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
  totalValueStrong: {
    color: "#20D67B",
    fontSize: 22,
    fontWeight: "900",
  },
  totalSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },
  serviceChargeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  serviceChargeDescription: {
    flex: 1,
  },
  serviceChargeDetail: {
    color: "#8F8F8F",
    fontSize: 12,
    marginTop: 3,
  },
  serviceChargeHelp: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  chargeHelp: {
    color: "#FFD166",
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  dangerButton: {
    backgroundColor: "#7F0008",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.45,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.45)",
    padding: 12,
    borderRadius: 15,
    marginTop: 14,
  },
  pendingTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  pendingText: {
    color: "#D6D6D6",
    marginTop: 3,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: 20,
  },
  pointModalCard: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 20,
  },
  pointHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pointIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E50914",
  },
  pointIconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  pointTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  pointSaleId: {
    color: "#AFAFAF",
    marginTop: 3,
  },
  pointDescription: {
    color: "#D6D6D6",
    lineHeight: 20,
    marginTop: 16,
  },
  pointDetails: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 12,
  },
  pointSplitBox: {
    marginTop: 14,
    backgroundColor: "rgba(32,214,123,0.08)",
    borderRadius: 16,
    padding: 12,
  },
  pointDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 5,
  },
  pointDetailLabel: {
    color: "#AFAFAF",
    flex: 1,
  },
  pointDetailValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
  },
  warningBox: {
    marginTop: 14,
    borderRadius: 15,
    padding: 12,
    backgroundColor: "rgba(255,209,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.28)",
  },
  warningTitle: {
    color: "#FFD166",
    fontWeight: "900",
  },
  warningText: {
    color: "#E5E5E5",
    marginTop: 5,
    lineHeight: 18,
  },
  pointPollingText: {
    color: "#AFAFAF",
    textAlign: "center",
    marginTop: 14,
    fontSize: 12,
  },
});
