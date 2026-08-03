import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  entregarOrdenBebidaBarraApi,
  escanearOrdenBebidaBarraApi,
  registrarUsoDudosoBebidaScannerApi,
} from "../../api/drinksApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BebidaOrdenBarra, BebidaOrdenItem } from "../../types/drinks";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

type ApiErrorLike = {
  response?: {
    data?: { message?: string } | string;
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data && typeof data === "object" && typeof data.message === "string") {
    return data.message;
  }

  return fallback;
}

export default function BarraOrderDetailScreen() {
  const { codigoQR } = useLocalSearchParams<{
    ordenId?: string;
    codigoQR?: string;
  }>();

  const [orden, setOrden] = useState<BebidaOrdenBarra | null>(null);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const entregaConfirmadaRef = useRef(false);
  const alertaRegistradaRef = useRef(false);
  const loadedCodigoQRRef = useRef<string | null>(null);

  const codigoQRString = typeof codigoQR === "string" ? codigoQR.trim() : "";

  const registrarAlertaSiCorresponde = useCallback(async () => {
    if (alertaRegistradaRef.current) return;
    if (entregaConfirmadaRef.current) return;
    if (!codigoQRString) return;
    if (!orden) return;
    if (!orden.puedeEntregar) return;

    alertaRegistradaRef.current = true;

    await registrarUsoDudosoBebidaScannerApi({
      codigoQR: codigoQRString,
      intentos: 1,
      motivo:
        "Escaneó el QR de bebida/beneficio y confirmó volver atrás sin marcarlo como entregado.",
    });
  }, [codigoQRString, orden]);

  const volverConControl = useCallback(async () => {
    if (leaving || delivering) return;

    if (orden?.puedeEntregar && !entregaConfirmadaRef.current) {
      Alert.alert(
        "Entrega no confirmada",
        "Escaneaste este QR pero no marcaste la bebida o beneficio como entregado. Si volvés atrás, se registrará una alerta para el administrador.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Volver igual",
            style: "destructive",
            onPress: async () => {
              try {
                setLeaving(true);
                await registrarAlertaSiCorresponde();
              } finally {
                router.replace("/barra/scanner" as never);
              }
            },
          },
        ]
      );

      return;
    }

    router.replace("/barra/scanner" as never);
  }, [leaving, delivering, orden, registrarAlertaSiCorresponde]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          volverConControl();
          return true;
        }
      );

      return () => subscription.remove();
    }, [volverConControl])
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      if (!codigoQRString) {
        Alert.alert("Error", "No se recibió código QR.");
        return;
      }

      if (loadedCodigoQRRef.current === codigoQRString) return;

      loadedCodigoQRRef.current = codigoQRString;

      const data = await escanearOrdenBebidaBarraApi(codigoQRString);
      setOrden(data);
    } catch (e: unknown) {
      loadedCodigoQRRef.current = null;

      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar la orden.")
      );
    } finally {
      setLoading(false);
    }
  }, [codigoQRString]);

  useEffect(() => {
    load();
  }, [load]);

  const entregar = useCallback(async () => {
    if (!orden || delivering) return;

    Alert.alert(
      "Confirmar entrega",
      "¿Confirmás que entregaste todas las bebidas o beneficios detallados en esta orden?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Entregar",
          style: "default",
          onPress: async () => {
            try {
              setDelivering(true);

              await entregarOrdenBebidaBarraApi(orden.id);

              entregaConfirmadaRef.current = true;

              Alert.alert("Correcto", "Orden marcada como entregada.", [
                {
                  text: "Aceptar",
                  onPress: () => router.replace("/barra/scanner" as never),
                },
              ]);
            } catch (e: unknown) {
              Alert.alert(
                "Error",
                getErrorMessage(e, "No se pudo marcar como entregada.")
              );
            } finally {
              setDelivering(false);
            }
          },
        },
      ]
    );
  }, [orden, delivering]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Orden bebida">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!orden) {
    return (
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Orden bebida">
          <Text style={styles.emptyText}>Orden no encontrada.</Text>

          <Pressable style={styles.secondaryButton} onPress={volverConControl}>
            <Text style={styles.buttonText}>Volver</Text>
          </Pressable>
        </AppLayout>
      </RoleGuard>
    );
  }

  const esBeneficio = Number(orden.total ?? 0) <= 0;

  return (
    <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
      <AppLayout title={`Orden #${orden.id}`}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Atención</Text>
          <Text style={styles.warningText}>
            Este QR debe escanearse solo si vas a entregar la bebida o
            beneficio. Si volvés atrás sin marcarlo como entregado, se notificará
            al administrador.
          </Text>
        </View>

        <View style={[styles.card, esBeneficio && styles.benefitCard]}>
          <Text style={styles.title}>Orden #{orden.id}</Text>

          {orden.eventoNombre ? (
            <Text style={styles.muted}>{orden.eventoNombre}</Text>
          ) : null}

          <Text style={styles.code}>Código retiro: {orden.codigoRetiro}</Text>

          <Text style={esBeneficio ? styles.benefitTotal : styles.total}>
            {esBeneficio ? "Beneficio incluido" : formatMoney(orden.total)}
          </Text>

          <Text style={getStatusStyle(orden.estado)}>
            {orden.estado} · {orden.pagoEstado}
          </Text>

          {orden.fechaPagoConfirmado ? (
            <Text style={styles.muted}>
              Pago: {formatDate(orden.fechaPagoConfirmado)}
            </Text>
          ) : null}

          {orden.fechaEntregada ? (
            <Text style={styles.delivered}>
              Entregada: {formatDate(orden.fechaEntregada)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Detalle a entregar</Text>

       {(orden.items as BebidaOrdenItem[]).map((item, index) => (
          <View key={`${item.nombreProducto}-${index}`} style={styles.itemCard}>
            <View style={styles.qtyBox}>
              <Text style={styles.itemQty}>{item.cantidad}x</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>Nombre</Text>
              <Text style={styles.itemName}>{item.nombreProducto}</Text>

              {typeof item.precioUnitario === "number" ? (
                <Text style={styles.itemMeta}>
                  Precio unitario: {formatMoney(item.precioUnitario)}
                </Text>
              ) : null}

              {typeof item.subtotal === "number" ? (
                <Text style={styles.itemMeta}>
                  Subtotal: {formatMoney(item.subtotal)}
                </Text>
              ) : null}
            </View>
          </View>
        ))}

        {orden.puedeEntregar ? (
          <Pressable
            style={[
              styles.deliverButton,
              (delivering || leaving) && styles.disabled,
            ]}
            onPress={entregar}
            disabled={delivering || leaving}
          >
            {delivering ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Marcar como entregada</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.blockedCard}>
            <Text style={styles.blockedTitle}>No se puede entregar</Text>
            <Text style={styles.muted}>
              La orden no está pagada, ya fue entregada o no está habilitada.
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.secondaryButton, leaving && styles.disabled]}
          onPress={volverConControl}
          disabled={leaving || delivering}
        >
          {leaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Volver al scanner</Text>
          )}
        </Pressable>
      </AppLayout>
    </RoleGuard>
  );
}

function getStatusStyle(estado: string) {
  if (estado === "Pagada") return styles.statusPaid;
  if (estado === "Entregada") return styles.statusDelivered;
  return styles.statusPending;
}

const styles = StyleSheet.create({
  warningCard: {
    backgroundColor: "rgba(255,209,102,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.32)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  warningTitle: {
    color: "#FFD166",
    fontSize: 19,
    fontWeight: "900",
  },
  warningText: {
    color: "#FFD166",
    marginTop: 8,
    lineHeight: 21,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 16,
  },
  benefitCard: {
    borderColor: "rgba(255,209,102,0.55)",
    backgroundColor: "rgba(255,209,102,0.10)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  code: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 14,
  },
  benefitTotal: {
    color: "#FFD166",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 14,
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
  delivered: {
    color: "#9EC5FE",
    marginTop: 8,
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
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
    flexDirection: "row",
    gap: 14,
  },
  qtyBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(229,9,20,0.16)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemQty: {
    color: "#E50914",
    fontSize: 22,
    fontWeight: "900",
  },
  itemLabel: {
    color: "#FFD166",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "uppercase",
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  itemMeta: {
    color: "#BDBDBD",
    marginTop: 6,
    fontWeight: "700",
  },
  deliverButton: {
    backgroundColor: "#20D67B",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  blockedCard: {
    backgroundColor: "rgba(255,209,102,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.30)",
    padding: 16,
    borderRadius: 20,
    marginTop: 12,
  },
  blockedTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
    marginTop: 40,
  },
});