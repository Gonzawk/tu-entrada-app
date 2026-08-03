import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getOrdenesPendientesRRPPApi } from "../../api/rrppApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import { RRPPOrdenPendiente } from "../../types/rrpp";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 10;

function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const response = (e as { response?: { data?: unknown } }).response;
    if (response?.data !== undefined && response?.data !== null) {
      return String(response.data);
    }
  }
  return fallback;
}

export default function RRPPPendingOrdersScreen() {
  const { user, activeRole } = useAuth();

  const [ordenes, setOrdenes] = useState<RRPPOrdenPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await getOrdenesPendientesRRPPApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        setOrdenes(result.items);
        setPage(1);
        setHasNextPage(result.hasNextPage);
      } catch (e: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(e, "No se pudieron cargar las órdenes.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch]
  );

  async function loadNextPage() {
    if (loadingMore || loading || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getOrdenesPendientesRRPPApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setOrdenes((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = result.items.filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(result.hasNextPage);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar más órdenes.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  useEffect(() => {
    async function setupRealtime() {
      if (!user?.userId || activeRole !== "RRPP") return;

      const token = await getToken();

      if (!token) return;

      await connectRealtime(user.userId, token, {
        onNuevaOrdenRRPP: () => {
          loadFirstPage(true);
        },
      });
    }

    setupRealtime().catch((error) => {
      console.log("Realtime RRPP error:", error);
    });
  }, [user?.userId, activeRole, debouncedSearch, loadFirstPage]);

  const totalPendientes = ordenes.length;

  function renderOrden({ item: orden }: { item: RRPPOrdenPendiente }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Orden #{orden.id}</Text>
            <Text style={styles.muted}>Evento: {orden.evento}</Text>
            <Text style={styles.muted}>Comprador: {orden.comprador}</Text>
            <Text style={styles.muted}>{formatDate(orden.fechaCreacion)}</Text>
          </View>

          <Text style={styles.status}>{orden.estado}</Text>
        </View>

        <Text style={styles.total}>{formatMoney(orden.total)}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/rrpp/order-detail",
              params: { ordenId: orden.id },
            } as never)
          }
        >
          <Text style={styles.primaryText}>Ver detalle</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title="Órdenes RRPP" scroll={false}>
        <View style={styles.screen}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pendientes visibles</Text>
            <Text style={styles.summaryValue}>{totalPendientes}</Text>
          </View>

          <TextInput
            placeholder="Buscar por orden, evento o comprador..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            style={styles.searchInput}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" />
            </View>
          ) : (
            <FlatList
              data={ordenes}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderOrden}
              showsVerticalScrollIndicator={false}
              onEndReached={loadNextPage}
              onEndReachedThreshold={0.4}
              keyboardShouldPersistTaps="handled"
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
                  <Text style={styles.emptyText}>No hay órdenes pendientes.</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    color="#E50914"
                    style={{ marginVertical: 20 }}
                  />
                ) : null
              }
              contentContainerStyle={{
                paddingBottom: 24,
                flexGrow: ordenes.length === 0 ? 1 : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  summaryCard: {
    backgroundColor: "rgba(229,9,20,0.14)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.28)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  summaryLabel: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  cardHeader: {
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
    fontSize: 26,
    fontWeight: "900",
    marginTop: 12,
  },
  status: {
    color: "#FFD166",
    fontWeight: "900",
    backgroundColor: "rgba(255,209,102,0.13)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: "hidden",
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