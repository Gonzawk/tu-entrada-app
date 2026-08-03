import { createIdempotencyKey } from "@/utils/idempotency";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { crearVentaBarraApi } from "../../api/barraApi";
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
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 12;

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
  const [saving, setSaving] = useState(false);
  const [ventaKey, setVentaKey] = useState(() =>
  createIdempotencyKey("venta-barra")
);

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
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar barra.")
      );
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
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo abrir caja.")
      );
    } finally {
      setSaving(false);
    }
  }

  function cambiarCantidad(productoId: number, delta: number) {
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

  async function confirmarVenta() {
    if (!caja) return;

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

    Alert.alert(
      "Confirmar venta",
      `Total: ${formatMoney(total)}\n\n¿Confirmás cerrar esta venta? Una vez confirmada no podrá modificarse.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setSaving(true);

              await crearVentaBarraApi({
                cajaId: caja.id,
                metodoPago,
                observacion: "Venta presencial barra",
                idempotencyKey: ventaKey,
                items,
              });

              setCarrito({});
              Alert.alert("Correcto", "Venta registrada.");
              setVentaKey(createIdempotencyKey("venta-barra"));
            } catch (e: unknown) {
              Alert.alert(
                "Error",
                getErrorMessage(e, "No se pudo vender.")
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function cerrarCajaActual() {
    if (!caja) return;

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
              Alert.alert(
                "Error",
                getErrorMessage(e, "No se pudo cerrar.")
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
                style={[styles.option, eventoId === e.id && styles.optionActive]}
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
                  ]}
                  onPress={() => setMetodoPago(1)}
                >
                  <Text style={styles.optionText}>Efectivo</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodButton,
                    metodoPago === 2 && styles.optionActive,
                  ]}
                  onPress={() => setMetodoPago(2)}
                >
                  <Text style={styles.optionText}>Transferencia</Text>
                </Pressable>
              </View>
            </View>

            <TextInput
              placeholder="Buscar bebida..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
              style={styles.input}
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
                    <Text style={styles.price}>{formatMoney(p.precioFinal)}</Text>
                  </View>

                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => cambiarCantidad(p.bebidaProductoId, -1)}
                  >
                    <Text style={styles.qtyText}>-</Text>
                  </Pressable>

                  <Text style={styles.qty}>{cantidad}</Text>

                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => cambiarCantidad(p.bebidaProductoId, 1)}
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </Pressable>
                </View>
              );
            })}

            {hasNextPage ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => loadProductos(false)}
                disabled={loadingMore}
              >
                <Text style={styles.buttonText}>
                  {loadingMore ? "Cargando..." : "Cargar más productos"}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.title}>Venta actual</Text>
              <Text style={styles.total}>{formatMoney(total)}</Text>

              <Pressable
                style={[
                  styles.primaryButton,
                  (saving || total <= 0) && styles.disabled,
                ]}
                onPress={confirmarVenta}
                disabled={saving || total <= 0}
              >
                <Text style={styles.buttonText}>Confirmar venta</Text>
              </Pressable>

              <Pressable
                style={styles.dangerButton}
                onPress={cerrarCajaActual}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Cerrar caja</Text>
              </Pressable>
            </View>
          </>
        )}
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
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  label: { color: "#BDBDBD", marginTop: 14, marginBottom: 8 },
  muted: { color: "#BDBDBD", marginTop: 6 },
  total: { color: "#20D67B", fontSize: 26, fontWeight: "900", marginTop: 10 },
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
  optionText: { color: "#FFFFFF", fontWeight: "900" },
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
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  methodButton: {
    flex: 1,
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  refreshText: { color: "#BDBDBD", fontSize: 13 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  productImage: { width: 58, height: 58, borderRadius: 14 },
  productName: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  price: { color: "#FFFFFF", fontWeight: "900", marginTop: 4 },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  qty: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    minWidth: 24,
    textAlign: "center",
  },
});