import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getMisOrdenesPaginadasApi } from "../../api/ordersApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { getOrdersCache, saveOrdersCache } from "../../storage/ordersCache";
import { MiOrdenResumen } from "../../types/orders";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 5;

export default function UserOrdersScreen() {
  const [ordenes, setOrdenes] = useState<MiOrdenResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    async function loadCache() {
      const cached = await getOrdersCache();

      if (cached.length > 0) {
        setOrdenes(cached);
        setLoading(false);
      }
    }

    loadCache();
  }, []);

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

        const result = await getMisOrdenesPaginadasApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        const items = result.items ?? [];

        setOrdenes(items);
        await saveOrdersCache(items);

        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: any) {
        Alert.alert(
          "Error",
          String(
            e?.response?.data?.message ??
              e?.response?.data ??
              "No se pudieron cargar tus órdenes."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    loadFirstPage(false);
  }, [debouncedSearch, loadFirstPage]);

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getMisOrdenesPaginadasApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setOrdenes((prev) => {
        const idsExistentes = new Set(prev.map((orden) => orden.id));
        const nuevasOrdenes = (result.items ?? []).filter(
          (orden) => !idsExistentes.has(orden.id)
        );

        return [...prev, ...nuevasOrdenes];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudieron cargar más órdenes."
        )
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function renderOrden({ item: orden }: { item: MiOrdenResumen }) {
    const confirmada = orden.estado === "Confirmada";
    const pendiente = orden.estado === "PendientePago";
    const cancelada = orden.estado === "Cancelada";

    return (
      <Pressable
        style={[
          styles.card,
          confirmada && styles.confirmedCard,
          pendiente && styles.pendingCard,
          cancelada && styles.cancelledCard,
        ]}
        onPress={() =>
          router.push({
            pathname: "/user/order-detail",
            params: { ordenId: orden.id },
          } as never)
        }
      >
        {orden.bannerUrl ? (
          <Image source={{ uri: orden.bannerUrl }} style={styles.banner} />
        ) : null}

        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Orden #{orden.id}</Text>
            <Text style={styles.event}>{orden.evento}</Text>
            <Text style={styles.muted}>{orden.lugar}</Text>
          </View>

          <View style={getEstadoBadgeStyle(orden.estado)}>
            <Text style={styles.badgeText}>{orden.estado}</Text>
          </View>
        </View>

        <Text style={styles.muted}>RRPP: {orden.rrpp}</Text>
        <Text style={styles.muted}>
          Creada: {formatDate(orden.fechaCreacion)}
        </Text>

        <View style={styles.row}>
          <Text style={styles.total}>{formatMoney(orden.total)}</Text>
        </View>

        <Text style={styles.muted}>
          Entradas: {orden.cantidadEntradas}
        </Text>
      </Pressable>
    );
  }

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Mis órdenes" scroll={false}>
        <View style={styles.screen}>
          <TextInput
            placeholder="Buscar por evento, RRPP, estado u orden..."
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
                    No tenés órdenes creadas.
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    color="#E50914"
                    style={styles.footerLoader}
                  />
                ) : null
              }
              contentContainerStyle={[
                styles.listContent,
                ordenes.length === 0 && styles.emptyListContent,
              ]}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function getEstadoBadgeStyle(estado: string) {
  if (estado === "Confirmada") {
    return [styles.badge, styles.badgeSuccess];
  }

  if (estado === "Cancelada") {
    return [styles.badge, styles.badgeError];
  }

  return [styles.badge, styles.badgePending];
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
    overflow: "hidden",
  },
  confirmedCard: {
    borderColor: "rgba(32,214,123,0.35)",
  },
  pendingCard: {
    borderColor: "rgba(255,209,102,0.35)",
  },
  cancelledCard: {
    borderColor: "rgba(255,77,87,0.35)",
  },
  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: "rgba(32,214,123,0.14)",
    borderColor: "rgba(32,214,123,0.35)",
  },
  badgePending: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderColor: "rgba(255,209,102,0.35)",
  },
  badgeError: {
    backgroundColor: "rgba(255,77,87,0.14)",
    borderColor: "rgba(255,77,87,0.35)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
  },
  banner: {
    width: "100%",
    height: 140,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1A1A1A",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  event: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  row: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: {
    color: "#FFFFFF",
    fontSize: 26,
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
  footerLoader: {
    marginVertical: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});