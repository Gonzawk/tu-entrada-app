import { RRPPOrdenPendiente, RRPPOrdenPendienteItem } from "@/types/rrpp";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  cancelarOrdenRRPPApi,
  confirmarOrdenRRPPApi,
  getOrdenPendienteDetalleRRPPApi,
} from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

// El tipo compartido RRPPOrdenPendienteItem no declara esCombo, cantidadPersonas
// ni subtotal, pero el backend los envía y este componente los usa. Se extiende
// acá en vez de modificar el tipo global, para no afectar a otras pantallas.
type RRPPOrdenItem = RRPPOrdenPendienteItem & {
  esCombo?: boolean;
  cantidadPersonas?: number;
  subtotal?: number;
};

export default function RRPPOrderDetailScreen() {
  const { ordenId } = useLocalSearchParams<{ ordenId: string }>();
  const id = Number(ordenId);

  const [orden, setOrden] = useState<RRPPOrdenPendiente | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      if (!id) {
        setOrden(null);
        return;
      }

      const data = await getOrdenPendienteDetalleRRPPApi(id);

      setOrden({
        ...data,
        items: data.items ?? [],
      });
    } catch (e: unknown) {
      Alert.alert("Error", getApiErrorMessage(e));
      setOrden(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const resumen = useMemo(() => {
    if (!orden) return null;

    const items = (orden.items ?? []) as RRPPOrdenItem[];

    const cuposReservados = items.reduce<number>((acc, item) => {
      const cupos = item.esCombo ? item.cantidadPersonas ?? 1 : 1;
      return acc + cupos;
    }, 0);

    return {
      cantidadItems: items.length,
      cuposReservados,
      total: orden.total,
    };
  }, [orden]);

  async function confirmarPago() {
    if (!orden || confirming || cancelling) return;

    Alert.alert(
      "Confirmar pago",
      "¿Confirmás que recibiste el pago? Esta acción generará los tickets y pasará el stock reservado a vendido.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: async () => {
            try {
              setConfirming(true);

              await confirmarOrdenRRPPApi(orden.id);

              Alert.alert(
                "Correcto",
                "Pago confirmado. Los tickets fueron generados.",
                [
                  {
                    text: "Aceptar",
                    onPress: () =>
                      router.replace("/rrpp/pending-orders" as never),
                  },
                ]
              );
            } catch (e: unknown) {
              Alert.alert("Error", getApiErrorMessage(e));
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  }

  async function cancelarOrden() {
    if (!orden || confirming || cancelling) return;

    Alert.alert(
      "Cancelar orden",
      "¿Seguro que querés cancelar esta orden? Esta acción liberará el stock reservado y devolverá los cupos a la tanda.",
      [
        { text: "No cancelar", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);

              await cancelarOrdenRRPPApi(orden.id);

              Alert.alert(
                "Orden cancelada",
                "La orden fue cancelada correctamente y el stock reservado volvió a la tanda.",
                [
                  {
                    text: "Aceptar",
                    onPress: () =>
                      router.replace("/rrpp/pending-orders" as never),
                  },
                ]
              );
            } catch (e: unknown) {
              Alert.alert("Error", getApiErrorMessage(e));
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Orden">
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!orden) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Orden">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              La orden no existe, fue cancelada o ya fue confirmada.
            </Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  const isBusy = confirming || cancelling;

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title={`Orden #${orden.id}`}>
        <View style={styles.card}>
          <Text style={styles.title}>{orden.evento}</Text>
          <Text style={styles.muted}>Comprador: {orden.comprador}</Text>
          <Text style={styles.muted}>{formatDate(orden.fechaCreacion)}</Text>

          <Text style={styles.total}>{formatMoney(orden.total)}</Text>
          <Text style={styles.status}>{orden.estado}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Importante</Text>
          <Text style={styles.infoText}>
            Si cancelás esta orden pendiente, el stock reservado volverá a estar
            disponible en la tanda. Si confirmás el pago, se generarán los
            tickets y el stock pasará a vendido.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subTitle}>Resumen</Text>

          <Text style={styles.muted}>
            Items de orden: {resumen?.cantidadItems ?? 0}
          </Text>

          <Text style={styles.muted}>
            Cupos reservados: {resumen?.cuposReservados ?? 0}
          </Text>

          <Text style={styles.muted}>
            Total: {formatMoney(resumen?.total ?? 0)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Entradas</Text>

        {((orden.items ?? []) as RRPPOrdenItem[]).map((item) => {
          const esCombo = Boolean(item.esCombo);
          const cantidadPersonas = Number(item.cantidadPersonas ?? 1);
          const cupos = esCombo ? cantidadPersonas : 1;

          return (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.tipoEntrada}</Text>

              {esCombo ? (
                <Text style={styles.comboText}>
                  Combo x{cantidadPersonas} · Reserva {cupos} cupos
                </Text>
              ) : (
                <Text style={styles.singleText}>Entrada individual · 1 cupo</Text>
              )}

              <Text style={styles.muted}>
                Asignado:{" "}
                {item.usuarioAsignado ??
                  item.nombreInvitado ??
                  item.emailInvitado ??
                  "Pendiente sin datos"}
              </Text>

              {item.emailInvitado ? (
                <Text style={styles.muted}>Email: {item.emailInvitado}</Text>
              ) : null}

              <Text style={styles.itemPrice}>
                {formatMoney(item.precioUnitario)}
              </Text>

              {typeof item.subtotal === "number" ? (
                <Text style={styles.muted}>
                  Subtotal: {formatMoney(item.subtotal)}
                </Text>
              ) : null}
            </View>
          );
        })}

        <Pressable
          style={[styles.confirmButton, isBusy && styles.disabledButton]}
          onPress={confirmarPago}
          disabled={isBusy}
        >
          {confirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmText}>
              Confirmar pago y generar tickets
            </Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.cancelButton, isBusy && styles.disabledButton]}
          onPress={cancelarOrden}
          disabled={isBusy}
        >
          {cancelling ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmText}>Cancelar orden y liberar stock</Text>
          )}
        </Pressable>
      </AppLayout>
    </RoleGuard>
  );
}

function getApiErrorMessage(e: unknown) {
  const data = (e as { response?: { data?: unknown } })?.response?.data;

  if (!data) {
    return e instanceof Error ? e.message : "Ocurrió un error.";
  }
  if (typeof data === "string") return data;

  const maybeMessage = (data as { message?: unknown })?.message;
  if (typeof maybeMessage === "string") return maybeMessage;

  const maybeTitle = (data as { title?: unknown })?.title;
  if (typeof maybeTitle === "string") return maybeTitle;

  return JSON.stringify(data);
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
  infoCard: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.30)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  infoTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontWeight: "900",
  },
  infoText: {
    color: "#FFD166",
    marginTop: 8,
    lineHeight: 21,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },
  subTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 14,
  },
  status: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
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
  itemTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  comboText: {
    color: "#FFD166",
    marginTop: 6,
    fontWeight: "900",
  },
  singleText: {
    color: "#20D67B",
    marginTop: 6,
    fontWeight: "900",
  },
  itemPrice: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: "#E50914",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "rgba(255,77,87,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.45)",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: {
    color: "#BDBDBD",
  },
});