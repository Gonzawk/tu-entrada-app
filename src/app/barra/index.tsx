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
import {
  cancelarPagoPointVentaBarraApi,
  crearVentaBarraApi,
  getEstadoPagoVentaBarraApi,
} from "../../api/barraApi";
import {
  abrirCajaApi,
  cerrarCajaApi,
  getCajaAbiertaApi,
} from "../../api/cajasApi";
import { getCatalogoBebidasApi } from "../../api/drinksApi";
import { getEventosActivosApi } from "../../api/eventsApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { Caja, MetodoPagoPresencial } from "../../types/cajas";
import { EventoActivo } from "../../types/events";
import { VentaPresencialEstadoPagoResponse } from "../../types/mercadoPagoPoint";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 12;
const POINT_POLL_INTERVAL_MS = 2500;

type Carrito = Record<number, number>;

type ProductoVentaBarra = {
  bebidaProductoId: number;
  nombre: string;
  imagenUrl?: string | null;
  precioFinal: number;
};

type CatalogoBebidaApiItem = {
  id?: number;
  bebidaProductoId?: number;
  nombre: string;
  imagenUrl?: string | null;
  precioEvento?: number;
  precioFinal?: number;
  precioBase?: number;
  precio?: number;
};

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

function esPagoAprobado(estado?: VentaPresencialEstadoPagoResponse | null): boolean {
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

  if (normalizar(estado.estadoPago) === "cancelado") {
    return "Cobro cancelado";
  }

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

  if (estado.requiereAccionTerminal) {
    return "Revisá el Point";
  }

  if (normalizar(estado.mercadoPagoStatus) === "at_terminal") {
    return "Esperando en el Point";
  }

  return "Esperando pago";
}

function descripcionEstadoPoint(
  estado?: VentaPresencialEstadoPagoResponse | null
): string {
  if (!estado) {
    return "Preparando el cobro...";
  }

  if (estado.mensaje) {
    return estado.mensaje;
  }

  if (esPagoAprobado(estado)) {
    if (estado.ticketImpreso) {
      return "El pago fue acreditado y el ticket fue enviado correctamente al terminal.";
    }

    if (
      ["fallida", "cancelada"].includes(normalizar(estado.estadoImpresion))
    ) {
      return "El pago fue acreditado, pero la impresión necesita revisión.";
    }

    return "El pago fue acreditado. Estamos verificando la impresión del ticket.";
  }

  if (estado.requiereAccionTerminal) {
    return "La operación requiere una acción en el terminal. Revisá el Point antes de continuar.";
  }

  if (normalizar(estado.mercadoPagoStatus) === "at_terminal") {
    return "El cobro ya está visible en el Point. Completá o cancelá la operación desde la terminal.";
  }

  if (esPagoFinalNoAprobado(estado)) {
    return "La operación terminó sin acreditarse. El carrito se conserva para que puedas intentar nuevamente.";
  }

  return "Esperando que el cliente complete el pago en el Point.";
}

export default function BarraScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [eventos, setEventos] = useState<EventoActivo[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [montoInicial, setMontoInicial] = useState("0");

  const [productos, setProductos] = useState<ProductoVentaBarra[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [carrito, setCarrito] = useState<Carrito>({});
  const [metodoPago, setMetodoPago] = useState<MetodoPagoPresencial>(1);
  const [montoEfectivoMixto, setMontoEfectivoMixto] = useState("");
  const [saving, setSaving] = useState(false);
  const [ventaKey, setVentaKey] = useState(() =>
    createIdempotencyKey("venta-barra")
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

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [cajaData, eventosData] = await Promise.all([
        getCajaAbiertaApi(1),
        getEventosActivosApi({ page: 1, pageSize: 50, search: "" }),
      ]);

      setCaja(cajaData);
      setEventos(eventosData.items ?? []);

      if (cajaData?.eventoId) {
        setEventoId(cajaData.eventoId);
      } else if ((eventosData.items ?? []).length > 0) {
        setEventoId(eventosData.items[0].id);
      }
    } catch (e: unknown) {
      Alert.alert("Error", getErrorMessage(e, "No se pudo cargar barra."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadProductos = useCallback(
    async (firstPage = true) => {
      try {
        const currentEventoId = caja?.eventoId ?? eventoId;

        if (!currentEventoId) return;

        if (firstPage) {
          setRefreshing(true);
        } else {
          setLoadingMore(true);
        }

        const nextPage = firstPage ? 1 : pageRef.current + 1;

        const result = await getCatalogoBebidasApi({
          eventoId: currentEventoId,
          page: nextPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        const productosAdaptados: ProductoVentaBarra[] = (
          result.items ?? []
        ).map((x: CatalogoBebidaApiItem) => ({
          bebidaProductoId: (x.id ?? x.bebidaProductoId) as number,
          nombre: x.nombre,
          imagenUrl: x.imagenUrl,
          precioFinal: Number(
            x.precioEvento ?? x.precioFinal ?? x.precioBase ?? x.precio ?? 0
          ),
        }));

        if (firstPage) {
          setProductos(productosAdaptados);
          setPage(1);
        } else {
          setProductos((prev) => [...prev, ...productosAdaptados]);
          setPage(nextPage);
        }

        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(e, "No se pudieron cargar bebidas.")
        );
      } finally {
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [caja?.eventoId, eventoId, debouncedSearch]
  );

  useEffect(() => {
    if (caja?.eventoId) {
      loadProductos(true);
    }
  }, [caja?.eventoId, debouncedSearch, loadProductos]);

  const consultarEstadoPoint = useCallback(
    async (ventaId: number) => {
      const estado = await getEstadoPagoVentaBarraApi(ventaId);
      setPointEstado(estado);
      return estado;
    },
    []
  );

  useEffect(() => {
    if (!pointVentaId || !pointModalVisible) return;

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const ejecutar = async () => {
      try {
        setConsultandoPoint(true);

        const estado = await getEstadoPagoVentaBarraApi(pointVentaId);

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
        if (!disposed) {
          setConsultandoPoint(false);
        }
      }
    };

    ejecutar();

    return () => {
      disposed = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pointVentaId, pointModalVisible]);

  useEffect(() => {
    if (!pointEstado || !pointVentaId) return;

    if (
      esPagoAprobado(pointEstado) &&
      pagoAprobadoProcesadoRef.current !== pointVentaId
    ) {
      pagoAprobadoProcesadoRef.current = pointVentaId;
      setCarrito({});
      setMontoEfectivoMixto("");
      setVentaKey(createIdempotencyKey("venta-barra"));
      return;
    }

    if (
      esPagoFinalNoAprobado(pointEstado) &&
      pagoFinalNoAprobadoProcesadoRef.current !== pointVentaId
    ) {
      pagoFinalNoAprobadoProcesadoRef.current = pointVentaId;

      // El carrito se conserva, pero un nuevo intento comercial
      // debe usar una nueva idempotency key.
      setVentaKey(createIdempotencyKey("venta-barra"));
    }
  }, [pointEstado, pointVentaId]);

  async function abrirCaja() {
    try {
      const monto = Number(montoInicial);

      if (!eventoId) {
        Alert.alert("Falta evento", "Seleccioná un evento para abrir caja.");
        return;
      }

      if (Number.isNaN(monto) || monto < 0) {
        Alert.alert("Dato inválido", "El monto inicial no puede ser negativo.");
        return;
      }

      setSaving(true);

      const data = await abrirCajaApi({
        tipoCaja: 1,
        eventoId,
        montoInicial: monto,
        observacionApertura: "Caja barra abierta desde app",
      });

      setCaja(data);
    } catch (e: unknown) {
      Alert.alert("Error", getErrorMessage(e, "No se pudo abrir caja."));
    } finally {
      setSaving(false);
    }
  }

  function cambiarCantidad(productoId: number, delta: number) {
    if (pointBloqueado) return;

    setCarrito((prev) => {
      const actual = prev[productoId] ?? 0;
      const nuevo = Math.max(0, actual + delta);
      const copy = { ...prev };

      if (nuevo === 0) delete copy[productoId];
      else copy[productoId] = nuevo;

      return copy;
    });
  }

  const total = useMemo(() => {
    return productos.reduce((acc, p) => {
      const cantidad = carrito[p.bebidaProductoId] ?? 0;
      return acc + cantidad * p.precioFinal;
    }, 0);
  }, [productos, carrito]);

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

  async function iniciarVentaPoint(
    cajaId: number,
    items: { bebidaProductoId: number; cantidad: number }[]
  ) {
    const esMixto = metodoPago === 4;

    const venta = await crearVentaBarraApi({
      cajaId,
      metodoPago,
      montoEfectivo: esMixto ? montoEfectivoMixtoNumero : null,
      observacion: esMixto
        ? "Venta presencial barra - Efectivo + Mercado Pago Point"
        : "Venta presencial barra - Mercado Pago Point",
      idempotencyKey: ventaKey,
      items,
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
      // El polling del modal seguirá intentando. No creamos otra venta.
    }
  }

  async function registrarVentaInmediata(
    cajaId: number,
    items: { bebidaProductoId: number; cantidad: number }[]
  ) {
    await crearVentaBarraApi({
      cajaId,
      metodoPago,
      montoEfectivo: null,
      observacion: "Venta presencial barra",
      idempotencyKey: ventaKey,
      items,
    });

    setCarrito({});
    setVentaKey(createIdempotencyKey("venta-barra"));
    Alert.alert("Correcto", "Venta registrada.");
  }

  async function ejecutarConfirmacionVenta(
    items: { bebidaProductoId: number; cantidad: number }[]
  ) {
    if (!caja) return;

    try {
      setSaving(true);

      if (metodoPago === 3 || metodoPago === 4) {
        await iniciarVentaPoint(caja.id, items);
        return;
      }

      await registrarVentaInmediata(caja.id, items);
    } catch (e: unknown) {
      Alert.alert("Error", getErrorMessage(e, "No se pudo vender."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmarVenta() {
    if (!caja || pointBloqueado) return;

    const items = Object.entries(carrito)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([bebidaProductoId, cantidad]) => ({
        bebidaProductoId: Number(bebidaProductoId),
        cantidad,
      }));

    if (items.length === 0) {
      Alert.alert("Sin productos", "Seleccioná al menos un producto.");
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
      ? "\n\nEl carrito quedará bloqueado hasta que el cobro termine o sea cancelado."
      : "\n\nUna vez confirmada no podrá modificarse.";

    Alert.alert(
      requierePoint ? "Confirmar cobro Point" : "Confirmar venta",
      `Total: ${formatMoney(total)}${detalleMixto}${textoFinal}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: requierePoint ? "Enviar al Point" : "Confirmar",
          onPress: () => {
            void ejecutarConfirmacionVenta(items);
          },
        },
      ]
    );
  }

  async function cancelarCobroPoint() {
    if (!pointVentaId || cancelandoPoint) return;

    Alert.alert(
      "Cancelar cobro",
      metodoPago === 4
        ? `¿Querés cancelar este intento de pago? Recordá devolver ${formatMoney(
            montoEfectivoMixtoNumero
          )} recibidos en efectivo. Si el cobro ya está en el Point, la app puede pedirte que lo canceles desde la terminal.`
        : "¿Querés cancelar este intento de pago? Si el cobro ya está en el Point, la app puede pedirte que lo canceles desde la terminal.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cancelar cobro",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelandoPoint(true);

              const estado =
                await cancelarPagoPointVentaBarraApi(pointVentaId);

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
                // Se mantiene el modal abierto y el polling seguirá intentando.
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
                observacionCierre: "Caja cerrada desde app",
              });

              setCaja(null);
              setCarrito({});
              setProductos([]);
              Alert.alert("Correcto", "Caja cerrada.");
            } catch (e: unknown) {
              Alert.alert("Error", getErrorMessage(e, "No se pudo cerrar."));
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
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Barra">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
      <AppLayout title="Barra">
        {!caja ? (
          <View style={styles.card}>
            <Text style={styles.title}>Abrir caja de barra</Text>

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
                onPress={() => router.push("/barra/sales" as never)}
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

                  <View style={styles.splitRow}>
                    <Text style={styles.splitLabel}>Efectivo</Text>
                    <Text style={styles.splitValue}>
                      {Number.isFinite(montoEfectivoMixtoNumero)
                        ? formatMoney(Math.max(montoEfectivoMixtoNumero, 0))
                        : "Monto inválido"}
                    </Text>
                  </View>

                  <View style={styles.splitRow}>
                    <Text style={styles.splitLabel}>Mercado Pago</Text>
                    <Text style={styles.splitValue}>
                      {formatMoney(montoMercadoPagoMixto)}
                    </Text>
                  </View>

                  <Text style={styles.mixedHelp}>
                    Ingresá solamente el efectivo recibido. El saldo a Mercado
                    Pago lo calcula el backend.
                  </Text>
                </View>
              ) : null}
            </View>

            <TextInput
              placeholder="Buscar bebida..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
              editable={!pointBloqueado}
              style={[styles.input, pointBloqueado && styles.disabled]}
            />

            {refreshing ? (
              <View style={styles.refreshRow}>
                <ActivityIndicator color="#E50914" size="small" />
                <Text style={styles.refreshText}>Actualizando bebidas...</Text>
              </View>
            ) : null}

            {productos.map((p) => {
              const cantidad = carrito[p.bebidaProductoId] ?? 0;

              return (
                <View key={p.bebidaProductoId} style={styles.productCard}>
                  {p.imagenUrl ? (
                    <Image
                      source={{ uri: p.imagenUrl }}
                      style={styles.productImage}
                    />
                  ) : null}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.nombre}</Text>
                    <Text style={styles.price}>
                      {formatMoney(p.precioFinal)}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.qtyButton,
                      pointBloqueado && styles.disabled,
                    ]}
                    onPress={() =>
                      cambiarCantidad(p.bebidaProductoId, -1)
                    }
                    disabled={pointBloqueado}
                  >
                    <Text style={styles.qtyText}>-</Text>
                  </Pressable>

                  <Text style={styles.qty}>{cantidad}</Text>

                  <Pressable
                    style={[
                      styles.qtyButton,
                      pointBloqueado && styles.disabled,
                    ]}
                    onPress={() =>
                      cambiarCantidad(p.bebidaProductoId, 1)
                    }
                    disabled={pointBloqueado}
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              );
            })}

            {hasNextPage ? (
              <Pressable
                style={[
                  styles.secondaryButton,
                  pointBloqueado && styles.disabled,
                ]}
                onPress={() => loadProductos(false)}
                disabled={loadingMore || pointBloqueado}
              >
                <Text style={styles.buttonText}>
                  {loadingMore ? "Cargando..." : "Cargar más productos"}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.title}>Venta actual</Text>
              <Text style={styles.total}>{formatMoney(total)}</Text>

              {pointBloqueado ? (
                <View style={styles.pendingBanner}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>
                      Cobro Point en curso
                    </Text>
                    <Text style={styles.pendingText}>
                      El carrito permanece bloqueado hasta finalizar la
                      operación.
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
                  {metodoPago === 3
                    ? "Cobrar con Mercado Pago"
                    : metodoPago === 4
                      ? "Cobrar pago mixto"
                      : "Confirmar venta"}
                </Text>
              </Pressable>

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
            </View>
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

              {pointEstado ? (
                <View style={styles.pointDetails}>
                  <View style={styles.pointDetailRow}>
                    <Text style={styles.pointDetailLabel}>Pago</Text>
                    <Text style={styles.pointDetailValue}>
                      {pointEstado.estadoPago}
                    </Text>
                  </View>

                  <View style={styles.pointDetailRow}>
                    <Text style={styles.pointDetailLabel}>
                      Mercado Pago
                    </Text>
                    <Text style={styles.pointDetailValue}>
                      {pointEstado.mercadoPagoStatus ?? "Consultando"}
                    </Text>
                  </View>

                  {esPagoAprobado(pointEstado) ? (
                    <>
                      <View style={styles.pointDetailRow}>
                        <Text style={styles.pointDetailLabel}>
                          Impresión
                        </Text>
                        <Text style={styles.pointDetailValue}>
                          {pointEstado.estadoImpresion}
                        </Text>
                      </View>

                      <View style={styles.pointDetailRow}>
                        <Text style={styles.pointDetailLabel}>
                          Tickets
                        </Text>
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
                      : "Volver al carrito"}
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
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  total: {
    color: "#20D67B",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10,
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
  row: {
    flexDirection: "row",
    gap: 8,
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
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  splitLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  splitValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  mixedHelp: {
    color: "#FFD166",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  refreshText: {
    color: "#BDBDBD",
    fontSize: 13,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  productImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  productName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  price: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 4,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  qty: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    minWidth: 24,
    textAlign: "center",
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
    color: "#D0D0D0",
    fontSize: 12,
    marginTop: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    padding: 20,
  },
  pointModalCard: {
    backgroundColor: "#171717",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pointHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pointIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  pointIconText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  pointTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  pointSaleId: {
    color: "#AFAFAF",
    fontSize: 12,
    marginTop: 3,
  },
  pointDescription: {
    color: "#D4D4D4",
    lineHeight: 20,
    marginTop: 16,
  },
  pointDetails: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  pointDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  pointDetailLabel: {
    color: "#AFAFAF",
  },
  pointDetailValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
  warningBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,180,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,180,0,0.32)",
  },
  warningTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  warningText: {
    color: "#D6D6D6",
    marginTop: 5,
    lineHeight: 18,
  },
  pointPollingText: {
    color: "#929292",
    textAlign: "center",
    fontSize: 12,
    marginTop: 14,
  },
});
