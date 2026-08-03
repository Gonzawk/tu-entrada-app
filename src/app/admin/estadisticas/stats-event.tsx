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
import { getAdminStatsEventoDetalleApi } from "../../../api/adminStatsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { AdminEstadisticaEventoDetalle } from "../../../types/adminStats";
import { formatDate } from "../../../utils/formatDate";
import { formatMoney } from "../../../utils/formatMoney";

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export default function AdminStatsEventScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();

  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] =
    useState<AdminEstadisticaEventoDetalle | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const id = Number(eventoId);

      if (!Number.isInteger(id) || id <= 0) {
        setDetalle(null);
        Alert.alert("Error", "Evento inválido.");
        return;
      }

      const data = await getAdminStatsEventoDetalleApi(id);
      setDetalle(data);
    } catch (error: unknown) {
      const apiError = error as ApiError;

      setDetalle(null);
      Alert.alert(
        "Error",
        apiError.response?.data?.message ??
          apiError.message ??
          "No se pudo cargar detalle."
      );
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    void load();
  }, [load]);

  function goToCargoServicio() {
    const id = Number(eventoId);

    if (!Number.isInteger(id) || id <= 0) {
      Alert.alert("Error", "Evento inválido.");
      return;
    }

    router.push({
      pathname: "/admin/estadisticas/stats-event-service-fees",
      params: { eventoId: String(id) },
    } as never);
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Detalle evento">
        {loading ? (
          <ActivityIndicator color="#E50914" style={styles.loader} />
        ) : !detalle ? (
          <Text style={styles.muted}>No hay datos disponibles.</Text>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{detalle.eventoNombre}</Text>
              <Text style={styles.muted}>{formatDate(detalle.fechaInicio)}</Text>
              <Text style={styles.heroTotal}>
                {formatMoney(detalle.totalGeneral)}
              </Text>

              <Pressable
                style={styles.serviceButton}
                onPress={goToCargoServicio}
              >
                <Text style={styles.serviceButtonText}>
                  Ver detalle de Cargo por Servicio
                </Text>
              </Pressable>
            </View>

            <View style={styles.grid}>
              <StatCard
                label="Vendidos"
                value={String(detalle.ticketsVendidos)}
              />
              <StatCard
                label="Ingresados"
                value={String(detalle.ticketsIngresados)}
              />
              <StatCard
                label="Pendientes"
                value={String(detalle.ticketsPendientes)}
              />
              <StatCard
                label="Cancelados"
                value={String(detalle.ticketsCancelados)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recaudación</Text>
              <MoneyRow
                label="Entradas RRPP"
                value={detalle.totalOrdenesRRPP}
              />
              <MoneyRow
                label="Barra online"
                value={detalle.totalBarraOnline}
              />
              <MoneyRow
                label="Caja barra"
                value={detalle.totalCajaBarra}
              />
              <MoneyRow
                label="Ventanilla"
                value={detalle.totalVentanilla}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Medios de caja</Text>
              <MoneyRow label="Efectivo" value={detalle.totalEfectivo} />
              <MoneyRow
                label="Transferencia"
                value={detalle.totalTransferencia}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Entradas más vendidas</Text>

              {detalle.entradasMasVendidas.length === 0 ? (
                <Text style={styles.muted}>Sin ventas de entradas.</Text>
              ) : (
                detalle.entradasMasVendidas.map((item) => (
                  <View key={item.tipoEntradaId} style={styles.rowItem}>
                    <Text style={styles.itemTitle}>{item.nombre}</Text>
                    <Text style={styles.muted}>
                      Cantidad: {item.cantidadVendida}
                    </Text>
                    <Text style={styles.itemTotal}>
                      {formatMoney(item.totalRecaudado)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Bebidas más vendidas</Text>

              {detalle.bebidasMasVendidas.length === 0 ? (
                <Text style={styles.muted}>Sin ventas de bebidas.</Text>
              ) : (
                detalle.bebidasMasVendidas.map((item) => (
                  <View key={item.bebidaProductoId} style={styles.rowItem}>
                    <Text style={styles.itemTitle}>{item.nombre}</Text>
                    <Text style={styles.muted}>
                      Cantidad: {item.cantidadVendida}
                    </Text>
                    <Text style={styles.itemTotal}>
                      {formatMoney(item.totalRecaudado)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cajas del evento</Text>

              {detalle.cajas.length === 0 ? (
                <Text style={styles.muted}>No hay cajas asociadas.</Text>
              ) : (
                detalle.cajas.map((caja) => (
                  <View key={caja.cajaId} style={styles.rowItem}>
                    <Text style={styles.itemTitle}>
                      Caja #{caja.cajaId} · {caja.tipoCaja}
                    </Text>
                    <Text style={styles.muted}>{caja.usuarioNombre}</Text>
                    <Text style={styles.muted}>Estado: {caja.estado}</Text>
                    <MoneyRow label="Efectivo" value={caja.totalEfectivo} />
                    <MoneyRow
                      label="Transferencia"
                      value={caja.totalTransferencia}
                    />
                    <MoneyRow label="Total" value={caja.totalGeneral} />
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={styles.moneyValue}>{formatMoney(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  hero: {
    backgroundColor: "rgba(229,9,20,0.16)",
    borderColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  heroTotal: {
    color: "#20D67B",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  serviceButton: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  serviceButtonText: {
    color: "#111111",
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: {
    color: "#BDBDBD",
    marginTop: 5,
  },
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
  moneyLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  moneyValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  rowItem: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 12,
    marginTop: 12,
  },
  itemTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  itemTotal: {
    color: "#20D67B",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
});