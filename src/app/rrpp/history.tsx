import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getOrdenesConfirmadasRRPPApi } from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { RRPPOrdenConfirmada } from "../../types/rrpp";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 10;

type ApiErrorLike = {
  response?: {
    data?: string;
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  return err?.response?.data ?? fallback;
}

export default function RRPPHistoryScreen() {
  const [ordenes, setOrdenes] = useState<RRPPOrdenConfirmada[]>([]);
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

        const result = await getOrdenesConfirmadasRRPPApi({
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
          getErrorMessage(e, "No se pudo cargar el historial.")
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

      const result = await getOrdenesConfirmadasRRPPApi({
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

  const total = useMemo(
    () => ordenes.reduce((acc, x) => acc + x.total, 0),
    [ordenes]
  );

  const tickets = useMemo(
    () => ordenes.reduce((acc, x) => acc + x.ticketsGenerados, 0),
    [ordenes]
  );

  function renderOrden({ item: orden }: { item: RRPPOrdenConfirmada }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Orden #{orden.id}</Text>

        <Text style={styles.muted}>Evento: {orden.evento}</Text>
        <Text style={styles.muted}>Comprador: {orden.comprador}</Text>

        <Text style={styles.muted}>
          Confirmada:{" "}
          {orden.fechaConfirmacion
            ? formatDate(orden.fechaConfirmacion)
            : "Sin fecha"}
        </Text>

        <Text style={styles.total}>{formatMoney(orden.total)}</Text>

        <Text style={styles.status}>
          Tickets generados: {orden.ticketsGenerados}
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/rrpp/history-detail",
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
      <AppLayout title="Historial RRPP" scroll={false}>
        <View style={styles.screen}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeLabel}>Total visible</Text>
            <Text style={styles.resumeAmount}>{formatMoney(total)}</Text>
            <Text style={styles.resumeText}>
              Órdenes visibles: {ordenes.length} | Tickets: {tickets}
            </Text>
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
                  <Text style={styles.emptyText}>
                    No hay órdenes confirmadas.
                  </Text>
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
  resumeCard: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
  },
  resumeLabel: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  resumeAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  resumeText: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
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
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
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