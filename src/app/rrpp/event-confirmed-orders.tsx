import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getOrdenesConfirmadasRRPPPorEventoApi } from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { RRPPOrdenEvento } from "../../types/rrpp";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 10;

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

export default function RRPPEventConfirmedOrdersScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const id = Number(eventoId);

  const [items, setItems] = useState<RRPPOrdenEvento[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => clearTimeout(timeout);
  }, [search]);

  const totalConfirmado = useMemo(
    () => items.reduce((acc, x) => acc + Number(x.total ?? 0), 0),
    [items]
  );

  const ticketsGenerados = useMemo(
    () => items.reduce((acc, x) => acc + Number(x.cantidadEntradas ?? 0), 0),
    [items]
  );

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        if (!id) return;

        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        const result = await getOrdenesConfirmadasRRPPPorEventoApi({
          eventoId: id,
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        setItems(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(e, "No se pudo cargar.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, debouncedSearch]
  );

  useEffect(() => {
    loadFirstPage(false);
  }, [id, debouncedSearch, loadFirstPage]);

  async function loadMore() {
    if (!id || loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getOrdenesConfirmadasRRPPPorEventoApi({
        eventoId: id,
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setItems((prev) => {
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

  function renderItem({ item }: { item: RRPPOrdenEvento }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Orden #{item.id}</Text>

        <Text style={styles.muted}>
          Comprador: {item.compradorNombre ?? "Sin nombre"}
        </Text>

        <Text style={styles.muted}>
          Email: {item.compradorEmail ?? "Sin email"}
        </Text>

        <Text style={styles.total}>{formatMoney(item.total)}</Text>

        <Text style={styles.confirmed}>Estado: {item.estado}</Text>

        <Text style={styles.muted}>Entradas: {item.cantidadEntradas}</Text>
        <Text style={styles.muted}>Creada: {formatDate(item.fechaCreacion)}</Text>

        {item.fechaConfirmacion ? (
          <Text style={styles.muted}>
            Confirmada: {formatDate(item.fechaConfirmacion)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title="Confirmadas evento" scroll={false}>
        <View style={styles.screen}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeLabel}>Total confirmado cargado</Text>
            <Text style={styles.resumeAmount}>
              {formatMoney(totalConfirmado)}
            </Text>
            <Text style={styles.resumeText}>
              {items.length} órdenes cargadas · {ticketsGenerados} tickets
            </Text>
          </View>

          <TextInput
            placeholder="Buscar por orden, comprador o email..."
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
              data={items}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
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
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No hay órdenes confirmadas para este evento.
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
                flexGrow: items.length === 0 ? 1 : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  resumeLabel: { color: "#20D67B", fontWeight: "900" },
  resumeAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  resumeText: { color: "#BDBDBD", marginTop: 6 },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  total: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 12,
  },
  confirmed: { color: "#20D67B", marginTop: 8, fontWeight: "900" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
  },
  emptyText: { color: "#BDBDBD", textAlign: "center" },
});