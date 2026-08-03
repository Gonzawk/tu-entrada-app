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
import { getMisOrdenesBebidasApi } from "../../api/drinksApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import { BebidaOrden } from "../../types/drinks";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 5;

export default function UserDrinkOrdersScreen() {
  const { user } = useAuth();

  const [ordenes, setOrdenes] = useState<BebidaOrden[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    loadFirstPage(false);
  }, []);

  useEffect(() => {
    async function setupRealtime() {
      if (!user?.userId) return;

      const token = await getToken();
      if (!token) return;

      await connectRealtime(user.userId, token, {
        onBebidaOrdenPagada: (data) => {
          setOrdenes((prev) =>
            prev.map((orden) =>
              Number(orden.id) === Number(data.ordenId)
                ? { ...orden, estado: data.estado, pagoEstado: data.pagoEstado }
                : orden
            )
          );
        },
        onBebidaOrdenEntregada: (data) => {
          setOrdenes((prev) =>
            prev.map((orden) =>
              Number(orden.id) === Number(data.ordenId)
                ? {
                    ...orden,
                    estado: "Entregada",
                    fechaEntregada: data.fechaEntregada,
                  }
                : orden
            )
          );
        },
      });
    }

    setupRealtime().catch((error) => {
      console.log("Realtime bebidas orders error:", error);
    });
  }, [user?.userId]);

  async function loadFirstPage(isRefreshing = false) {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const result = await getMisOrdenesBebidasApi({
        page: 1,
        pageSize: PAGE_SIZE,
      });

      setOrdenes(result.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudieron cargar las órdenes."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getMisOrdenesBebidasApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setOrdenes((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = (result.items ?? []).filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } finally {
      setLoadingMore(false);
    }
  }

  function renderOrden({ item }: { item: BebidaOrden }) {
    const esBeneficio = Number(item.total ?? 0) <= 0;

    const pagada = item.estado === "Pagada" && item.pagoEstado === "Aprobado";
    const entregada = item.estado === "Entregada" || Boolean(item.fechaEntregada);
    const cancelada =
      item.estado === "Cancelada" || item.pagoEstado === "Cancelado";
    const rechazada = item.pagoEstado === "Rechazado";

    const totalItems = item.items.reduce((acc, x) => acc + x.cantidad, 0);

    return (
      <Pressable
        style={[styles.card, esBeneficio && styles.goldCard]}
        onPress={() =>
          router.push({
            pathname: "/user/drink-order-detail",
            params: { ordenId: item.id },
          } as never)
        }
      >
        {esBeneficio ? <View style={styles.goldGlow} /> : null}

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Orden #{item.id}</Text>

            {item.eventoNombre ? (
              <Text style={styles.muted}>{item.eventoNombre}</Text>
            ) : null}

            <Text style={styles.muted}>{formatDate(item.fechaCreacion)}</Text>
          </View>

          {esBeneficio ? (
            <View style={styles.goldBadge}>
              <Text style={styles.goldBadgeText}>Beneficio</Text>
            </View>
          ) : null}
        </View>

        <Text style={esBeneficio ? styles.benefitTotal : styles.total}>
          {esBeneficio ? "Beneficio incluido" : formatMoney(item.total)}
        </Text>

        <Text
          style={
            entregada
              ? styles.statusDelivered
              : pagada
              ? styles.statusPaid
              : cancelada
              ? styles.statusCancelled
              : rechazada
              ? styles.statusRejected
              : styles.statusPending
          }
        >
          {item.estado} · {item.pagoEstado}
        </Text>

        {cancelada ? (
          <Text style={styles.cancelledText}>
            Orden vencida. Ya no puede pagarse.
          </Text>
        ) : rechazada ? (
          <Text style={styles.cancelledText}>
            Pago rechazado. Podés reintentar desde el detalle.
          </Text>
        ) : null}

        <Text style={styles.muted}>Items: {totalItems}</Text>

        <View style={styles.primaryButton}>
          <Text style={styles.primaryText}>Ver detalle</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Mis bebidas" scroll={false}>
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={ordenes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderOrden}
            onEndReached={loadNextPage}
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
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Todavía no tenés bebidas o beneficios.
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
              ) : null
            }
            contentContainerStyle={{
              paddingBottom: 24,
              flexGrow: ordenes.length === 0 ? 1 : 0,
            }}
          />
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
    overflow: "hidden",
  },
  goldCard: {
    borderColor: "rgba(255,209,102,0.75)",
    backgroundColor: "rgba(255,209,102,0.10)",
  },
  goldGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(255,209,102,0.22)",
  },
  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 12,
  },
  benefitTotal: {
    color: "#FFD166",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 12,
  },
  goldBadge: {
    backgroundColor: "rgba(255,209,102,0.18)",
    borderColor: "rgba(255,209,102,0.65)",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  goldBadgeText: {
    color: "#FFD166",
    fontWeight: "900",
    fontSize: 12,
  },
  statusPaid: { color: "#20D67B", marginTop: 8, fontWeight: "900" },
  statusDelivered: { color: "#9EC5FE", marginTop: 8, fontWeight: "900" },
  statusPending: { color: "#FFD166", marginTop: 8, fontWeight: "900" },
  statusRejected: { color: "#FF4D57", marginTop: 8, fontWeight: "900" },
  statusCancelled: { color: "#FF4D57", marginTop: 8, fontWeight: "900" },
  cancelledText: {
    color: "#FFB3B8",
    marginTop: 6,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
  },
});