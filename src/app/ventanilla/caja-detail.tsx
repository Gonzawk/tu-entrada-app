import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getMiCajaVentanillaDetalleApi } from "../../api/ventanillaApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { VentanillaCajaDetalle } from "../../types/ventanilla";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

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

export default function VentanillaCajaDetailScreen() {
  const { cajaId } = useLocalSearchParams<{ cajaId: string }>();

  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<VentanillaCajaDetalle | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const id = Number(cajaId);

      if (!id) {
        Alert.alert("Error", "Caja inválida.");
        return;
      }

      const data = await getMiCajaVentanillaDetalleApi(id);
      setDetalle(data);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar detalle.")
      );
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    load();
  }, [load]);

  function goToItems() {
    if (!detalle) return;

    router.push({
      pathname: "/ventanilla/caja-items",
      params: { cajaId: String(detalle.id) },
    } as never);
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Ventanilla"]}>
        <AppLayout title="Detalle caja">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!detalle) {
    return (
      <RoleGuard allowedRoles={["Ventanilla"]}>
        <AppLayout title="Detalle caja">
          <Text style={styles.muted}>No hay datos disponibles.</Text>
        </AppLayout>
      </RoleGuard>
    );
  }

  const ventasEfectivo = detalle.totalEfectivo ?? 0;
  const totalEfectivoARendir =
    detalle.totalEfectivoARendir ?? detalle.montoInicial + ventasEfectivo;
  const totalGeneralARendir =
    detalle.totalGeneralARendir ?? detalle.montoInicial + detalle.totalGeneral;

  return (
    <RoleGuard allowedRoles={["Ventanilla"]}>
      <AppLayout title="Detalle caja">
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Caja #{detalle.id}</Text>
          <Text style={styles.muted}>{detalle.eventoNombre ?? "Sin evento"}</Text>
          <Text style={styles.heroTotal}>{formatMoney(totalGeneralARendir)}</Text>
          <Text style={styles.muted}>Estado: {detalle.estado}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rendición</Text>

          <MoneyRow label="Fondo inicial efectivo" value={detalle.montoInicial} />
          <MoneyRow label="Ventas efectivo" value={ventasEfectivo} />
          <MoneyRow label="Ventas transferencia" value={detalle.totalTransferencia} />
          <MoneyRow label="Efectivo a rendir" value={totalEfectivoARendir} strong />
          <MoneyRow label="Total general a rendir" value={totalGeneralARendir} strong />

          <Text style={styles.muted}>
            Apertura: {formatDate(detalle.fechaApertura)}
          </Text>

          {detalle.fechaCierre ? (
            <Text style={styles.muted}>
              Cierre: {formatDate(detalle.fechaCierre)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen tickets</Text>

          <InfoRow label="Ventas realizadas" value={detalle.cantidadVentas} />
          <InfoRow label="Tickets digitales" value={detalle.ticketsDigitalesGenerados} />
          <InfoRow label="Tickets físicos" value={detalle.ticketsFisicosVendidos} />

          <Pressable style={styles.secondaryButton} onPress={goToItems}>
            <Text style={styles.buttonText}>Ver items</Text>
          </Pressable>
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={styles.moneyValue}>{value}</Text>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={strong ? styles.moneyLabelStrong : styles.moneyLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.moneyValueStrong : styles.moneyValue}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "rgba(32,214,123,0.13)",
    borderColor: "rgba(32,214,123,0.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "900" },
  heroTotal: {
    color: "#20D67B",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  muted: { color: "#BDBDBD", marginTop: 6 },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  moneyLabel: { color: "#BDBDBD", flex: 1 },
  moneyValue: { color: "#FFFFFF", fontWeight: "900" },
  moneyLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "900",
    fontSize: 16,
  },
  moneyValueStrong: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 18,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
});