import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  getMiOrdenBebidaDetalleApi,
  reintentarPagoBebidaOrdenApi,
} from "../../api/drinksApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import { BebidaOrden, BebidaOrdenItem } from "../../types/drinks";
import { formatDate, formatUtcDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

// BebidaOrdenItem (types/drinks) no declara descripcionProducto, descripcion
// ni productoDescripcion, pero el backend puede enviarlos y este componente
// los usa como fallback en cascada. Se extiende acá como opcionales, sin
// tocar el tipo compartido, para no afectar otras pantallas.

async function abrirCheckoutPago(checkoutUrl: string): Promise<void> {
  const url = checkoutUrl.trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("La URL de pago recibida no es válida.");
  }

  await Linking.openURL(url);
}

type BebidaOrdenItemConDescripcion = BebidaOrdenItem & {
  descripcionProducto?: string | null;
  descripcion?: string | null;
  productoDescripcion?: string | null;
};

export default function UserDrinkOrderDetailScreen() {
  const { ordenId } = useLocalSearchParams<{ ordenId: string }>();
  const { user } = useAuth();

  const id = Number(ordenId);

  const [orden, setOrden] = useState<BebidaOrden | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const load = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);

        const data = await getMiOrdenBebidaDetalleApi(id);
        setOrden(data);
      } catch (e: unknown) {
        Alert.alert("Error", String(getErrorMessage(e)));
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  async function reintentarPago() {
    if (!orden) return;

    try {
      setRetryingPayment(true);

      const pago = await reintentarPagoBebidaOrdenApi(orden.id);
      const checkoutUrl = pago.checkoutUrl ?? pago.sandboxCheckoutUrl;

      if (!checkoutUrl) {
        Alert.alert("Error", "No se recibió URL de pago.");
        return;
      }

      await abrirCheckoutPago(checkoutUrl);

      // Linking.openURL entrega el checkout al navegador del sistema y retorna
      // inmediatamente. La orden se refresca al volver a primer plano mediante
      // el listener de AppState definido debajo.
    } catch (e: unknown) {
      Alert.alert("No se pudo reintentar", String(getErrorMessage(e)));
      await load(false);
    } finally {
      setRetryingPayment(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load(true);
  }, [id, load]);

  useEffect(() => {
    if (!id) return;

    let previousState = AppState.currentState;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const estabaFuera =
        previousState === "inactive" || previousState === "background";

      if (estabaFuera && nextState === "active") {
        void load(false);
      }

      previousState = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [id, load]);

  useEffect(() => {
    async function setupRealtime() {
      if (!user?.userId || !id) return;

      const token = await getToken();
      if (!token) return;

      await connectRealtime(user.userId, token, {
        onBebidaOrdenPagada: (data) => {
          if (Number(data.ordenId) !== id) return;

          setOrden((prev) =>
            prev
              ? {
                  ...prev,
                  estado: data.estado,
                  pagoEstado: data.pagoEstado,
                }
              : prev
          );

          load(false);
        },

        onBebidaOrdenEntregada: (data) => {
          if (Number(data.ordenId) !== id) return;

          setOrden((prev) =>
            prev
              ? {
                  ...prev,
                  estado: "Entregada",
                  fechaEntregada:
                    data.fechaEntregada ?? new Date().toISOString(),
                }
              : prev
          );

          load(false);
        },
      });
    }

    setupRealtime().catch((error) => {
      console.log("Realtime bebida orden error:", error);
    });
  }, [user?.userId, id, load]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
        <AppLayout title="Orden bebida">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!orden) {
    return (
      <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
        <AppLayout title="Orden bebida">
          <Text style={styles.emptyText}>Orden no encontrada.</Text>
        </AppLayout>
      </RoleGuard>
    );
  }

  const esBeneficio = Number(orden.total ?? 0) <= 0;

  const estaPagada =
    orden.estado === "Pagada" && orden.pagoEstado === "Aprobado";

  const estaEntregada =
    orden.estado === "Entregada" || Boolean(orden.fechaEntregada);

  const estaCancelada =
    orden.estado === "Cancelada" || orden.pagoEstado === "Cancelado";

  const estaRechazada = orden.pagoEstado === "Rechazado";

  const puedeMostrarQR = estaPagada && !estaEntregada;

  const puedeReintentarPago =
    !esBeneficio &&
    !estaPagada &&
    !estaEntregada &&
    !estaCancelada &&
    (orden.estado === "PendientePago" ||
      orden.pagoEstado === "Pendiente" ||
      orden.pagoEstado === "Rechazado");

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title={`Orden #${orden.id}`}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Orden #{orden.id}</Text>

              {orden.eventoNombre ? (
                <Text style={styles.muted}>{orden.eventoNombre}</Text>
              ) : null}

              <Text style={styles.muted}>
  Creada: {formatUtcDate(orden.fechaCreacion)}
</Text>
            </View>

            {esBeneficio ? (
              <View style={styles.benefitBadge}>
                <Text style={styles.benefitBadgeText}>Beneficio</Text>
              </View>
            ) : null}
          </View>

          {orden.fechaPagoConfirmado ? (
            <Text style={styles.muted}>
              Pagada: {formatDate(orden.fechaPagoConfirmado)}
            </Text>
          ) : null}

          {estaEntregada ? (
            <Text style={styles.delivered}>
              Entregada:{" "}
              {orden.fechaEntregada
                ? formatDate(orden.fechaEntregada)
                : "Confirmada"}
            </Text>
          ) : null}

          <Text style={esBeneficio ? styles.benefitTotal : styles.total}>
            {esBeneficio ? "Beneficio incluido" : formatMoney(orden.total)}
          </Text>

          <Text style={getStatusStyle(orden.estado, orden.pagoEstado)}>
            {orden.estado} · {orden.pagoEstado}
          </Text>
        </View>

        {puedeMostrarQR ? (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>
              {esBeneficio ? "QR de beneficio" : "Mostrá este QR en barra"}
            </Text>

            <View style={styles.qrBox}>
              <QRCode value={orden.codigoQR} size={230} />
            </View>

            <Text style={styles.codigoRetiro}>
              Código: {orden.codigoRetiro}
            </Text>
          </View>
        ) : estaEntregada ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Pedido entregado</Text>
            <Text style={styles.muted}>El QR ya no está disponible.</Text>
          </View>
        ) : estaCancelada ? (
          <View style={styles.cancelledCard}>
            <Text style={styles.cancelledTitle}>Orden vencida</Text>
            <Text style={styles.muted}>
              Esta orden ya no puede pagarse. Creá una nueva compra para generar
              un nuevo pago.
            </Text>

            <Pressable style={styles.secondaryButton} onPress={() => load(true)}>
              <Text style={styles.primaryText}>Actualizar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>
              {estaRechazada ? "Pago rechazado" : "Pago pendiente"}
            </Text>

            <Text style={styles.muted}>
              {estaRechazada
                ? "El pago fue rechazado. Podés intentar nuevamente con débito o dinero en cuenta."
                : esBeneficio
                ? "Este beneficio quedará disponible cuando sea confirmado."
                : "Cuando el pago sea aprobado, aparecerá el QR de retiro."}
            </Text>

            {puedeReintentarPago ? (
              <Pressable
                style={[
                  styles.primaryButton,
                  retryingPayment && { opacity: 0.6 },
                ]}
                onPress={reintentarPago}
                disabled={retryingPayment}
              >
                {retryingPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Reintentar pago</Text>
                )}
              </Pressable>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={() => load(true)}>
              <Text style={styles.primaryText}>Actualizar</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionTitle}>Detalle de la orden</Text>

        {orden.items.map((item: BebidaOrdenItemConDescripcion) => {
          const itemEsBeneficio =
            Number(item.precioUnitario ?? 0) <= 0 ||
            Number(item.subtotal ?? 0) <= 0;

          const descripcion =
            item.descripcionProducto ??
            item.descripcion ??
            item.productoDescripcion ??
            null;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.qtyBox}>
                  <Text style={styles.qtyText}>{item.cantidad}x</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>Nombre</Text>
                  <Text style={styles.itemTitle}>{item.nombreProducto}</Text>
                </View>
              </View>

              <Text style={styles.itemLabel}>Descripción</Text>

              {descripcion ? (
                <Text style={styles.itemDescription}>{descripcion}</Text>
              ) : (
                <Text style={styles.itemDescriptionMuted}>
                  Sin descripción cargada.
                </Text>
              )}

              <View style={styles.itemAmountBox}>
                <Text style={styles.muted}>
                  {item.cantidad} x{" "}
                  {itemEsBeneficio
                    ? "Incluido"
                    : formatMoney(item.precioUnitario)}
                </Text>

                <Text
                  style={
                    itemEsBeneficio
                      ? styles.itemBenefitSubtotal
                      : styles.itemSubtotal
                  }
                >
                  {itemEsBeneficio ? "Beneficio" : formatMoney(item.subtotal)}
                </Text>
              </View>
            </View>
          );
        })}
      </AppLayout>
    </RoleGuard>
  );
}

function getErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  if (!data) {
    return error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado.";
  }
  if (typeof data === "string") return data;

  const maybeMessage = (data as { message?: unknown })?.message;
  if (typeof maybeMessage === "string") return maybeMessage;

  return JSON.stringify(data);
}

function getStatusStyle(estado: string, pagoEstado?: string) {
  if (estado === "Pagada") return styles.statusPaid;
  if (estado === "Entregada") return styles.statusDelivered;
  if (estado === "Cancelada" || pagoEstado === "Cancelado") {
    return styles.statusCancelled;
  }
  if (pagoEstado === "Rechazado") return styles.statusRejected;

  return styles.statusPending;
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
  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  delivered: {
    color: "#9EC5FE",
    marginTop: 8,
    fontWeight: "900",
  },
  total: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 14,
  },
  benefitTotal: {
    color: "#20D67B",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 14,
  },
  benefitBadge: {
    backgroundColor: "rgba(32,214,123,0.18)",
    borderColor: "rgba(32,214,123,0.35)",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  benefitBadgeText: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 12,
  },
  statusPaid: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
  },
  statusDelivered: {
    color: "#9EC5FE",
    marginTop: 8,
    fontWeight: "900",
  },
  statusPending: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "900",
  },
  statusRejected: {
    color: "#FF4D57",
    marginTop: 8,
    fontWeight: "900",
  },
  statusCancelled: {
    color: "#FF4D57",
    marginTop: 8,
    fontWeight: "900",
  },
  qrCard: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 18,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  qrTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  qrBox: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 22,
    marginTop: 16,
  },
  codigoRetiro: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 16,
  },
  successCard: {
    backgroundColor: "rgba(158,197,254,0.14)",
    borderWidth: 1,
    borderColor: "rgba(158,197,254,0.30)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 16,
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  pendingCard: {
    backgroundColor: "rgba(255,209,102,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.30)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 16,
  },
  pendingTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  cancelledCard: {
    backgroundColor: "rgba(255,77,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.30)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 16,
  },
  cancelledTitle: {
    color: "#FF4D57",
    fontSize: 20,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  qtyBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "rgba(229,9,20,0.16)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: "#E50914",
    fontSize: 20,
    fontWeight: "900",
  },
  itemLabel: {
    color: "#FFD166",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "uppercase",
  },
  itemTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  itemDescription: {
    color: "#D0D0D0",
    marginTop: 5,
    lineHeight: 20,
  },
  itemDescriptionMuted: {
    color: "#888",
    marginTop: 5,
    fontStyle: "italic",
  },
  itemAmountBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  itemSubtotal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  itemBenefitSubtotal: {
    color: "#20D67B",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
    marginTop: 40,
  },
});