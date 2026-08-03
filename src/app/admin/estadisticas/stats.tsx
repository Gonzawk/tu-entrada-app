import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getAdminStatsEventosApi,
  getAdminStatsResumenApi,
} from "../../../api/adminStatsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import {
  AdminEstadisticaEvento,
  AdminEstadisticasResumen,
} from "../../../types/adminStats";
import { formatDate } from "../../../utils/formatDate";
import { formatMoney } from "../../../utils/formatMoney";

const PAGE_SIZE = 5;

export default function AdminStatsScreen() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<AdminEstadisticasResumen | null>(null);
  const [eventos, setEventos] = useState<AdminEstadisticaEvento[]>([]);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    loadFirstPage(false);
  }, []);

  async function loadFirstPage(isRefreshing = false) {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const [resumenData, eventosData] = await Promise.all([
        getAdminStatsResumenApi(),
        getAdminStatsEventosApi({
          page: 1,
          pageSize: PAGE_SIZE,
        }),
      ]);

      setStats(resumenData);
      setEventos(eventosData.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(eventosData.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ?? "No se pudieron cargar estadísticas."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getAdminStatsEventosApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setEventos((prev) => {
        const ids = new Set(prev.map((x) => x.eventoId));
        const nuevos = (result.items ?? []).filter(
          (x: AdminEstadisticaEvento) => !ids.has(x.eventoId)
        );

        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudieron cargar más eventos.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function renderHeader() {
    if (!stats) {
      return <Text style={styles.muted}>No hay datos disponibles.</Text>;
    }

    return (
      <>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Resumen general</Text>
          <Text style={styles.heroTotal}>{formatMoney(stats.totalGeneral)}</Text>
          <Text style={styles.muted}>Total estimado del sistema</Text>
        </View>

        <View style={styles.grid}>
          <StatCard label="Eventos activos" value={String(stats.eventosActivos)} />
          <StatCard label="Tickets vendidos" value={String(stats.ticketsVendidos)} />
          <StatCard label="Tickets ingresados" value={String(stats.ticketsIngresados)} />
          <StatCard label="Tickets pendientes" value={String(stats.ticketsPendientes)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recaudación por origen</Text>

          <MoneyRow label="Entradas RRPP" value={stats.totalOrdenesRRPP} />
          <MoneyRow label="Barra online" value={stats.totalBarraOnline} />
          <MoneyRow label="Caja barra" value={stats.totalCajaBarra} />
          <MoneyRow label="Ventanilla" value={stats.totalVentanilla} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cajas</Text>

          <MoneyRow label="Efectivo" value={stats.totalEfectivo} />
          <MoneyRow label="Transferencia" value={stats.totalTransferencia} />

          <View style={styles.separator} />

          <Text style={styles.muted}>Abiertas: {stats.cajasAbiertas}</Text>
          <Text style={styles.muted}>Cerradas: {stats.cajasCerradas}</Text>
        </View>

        <Text style={styles.sectionTitle}>Eventos</Text>
      </>
    );
  }

  function renderEvento({ item: evento }: { item: AdminEstadisticaEvento }) {
    return (
      <Pressable
        style={styles.eventCard}
        onPress={() =>
          router.push({
            pathname: "/admin/estadisticas/stats-event",
            params: { eventoId: evento.eventoId },
          } as never)
        }
      >
        <Text style={styles.eventTitle}>{evento.eventoNombre}</Text>
        <Text style={styles.muted}>{formatDate(evento.fechaInicio)}</Text>

        <Text style={styles.eventTotal}>
          {formatMoney(evento.totalGeneral)}
        </Text>

        <Text style={styles.muted}>
          Vendidos: {evento.ticketsVendidos} · Ingresados:{" "}
          {evento.ticketsIngresados}
        </Text>
      </Pressable>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Estadísticas" scroll={false}>
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={eventos}
            keyExtractor={(item) => String(item.eventoId)}
            renderItem={renderEvento}
            ListHeaderComponent={renderHeader}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadFirstPage(true)}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.card}>
                <Text style={styles.muted}>No hay eventos para mostrar.</Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
              ) : hasNextPage ? (
                <Pressable style={styles.secondaryButton} onPress={loadMore}>
                  <Text style={styles.buttonText}>Cargar más eventos</Text>
                </Pressable>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
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
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 12,
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  eventTotal: {
    color: "#20D67B",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});