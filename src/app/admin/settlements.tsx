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
import { getRendicionRRPPAdminApi } from "../../api/adminApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 2;

type RendicionRRPPDetalle = {
  rrppUsuarioId: number;
  rrppNombre: string;
  rrppEmail: string;
  totalARendir: number;
  ordenesConfirmadas: number;
  ticketsGenerados: number;
};

type RendicionEvento = {
  eventoId: number;
  eventoNombre: string;
  totalRecaudado: number;
  totalOrdenesConfirmadas: number;
  totalTicketsGenerados: number;
  rrpPs?: RendicionRRPPDetalle[];
  rrPPs?: RendicionRRPPDetalle[];
  rrpps?: RendicionRRPPDetalle[];
};

type ApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.title === "string") {
      return record.title;
    }
  }

  return apiError.message ?? fallback;
}

export default function AdminSettlementsScreen() {
  const [data, setData] = useState<RendicionEvento[]>([]);
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

        const result = await getRendicionRRPPAdminApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        const items: RendicionEvento[] = result.items ?? [];

        setData(items);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getApiErrorMessage(error, "No se pudo cargar.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadMore() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getRendicionRRPPAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      const items: RendicionEvento[] = result.items ?? [];

      setData((previous) => {
        const ids = new Set(previous.map((item) => item.eventoId));
        const nuevos = items.filter((item) => !ids.has(item.eventoId));

        return [...previous, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudieron cargar más eventos."
        )
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const totalVisible = useMemo(
    () =>
      data.reduce(
        (total, item) => total + Number(item.totalRecaudado ?? 0),
        0
      ),
    [data]
  );

  function renderEvento({ item: evento }: { item: RendicionEvento }) {
    const rrpps =
      evento.rrpPs ??
      evento.rrPPs ??
      evento.rrpps ??
      [];

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{evento.eventoNombre}</Text>

        <Text style={styles.total}>
          {formatMoney(evento.totalRecaudado ?? 0)}
        </Text>

        <Text style={styles.muted}>
          Órdenes: {evento.totalOrdenesConfirmadas ?? 0} | Tickets:{" "}
          {evento.totalTicketsGenerados ?? 0}
        </Text>

        <Text style={styles.section}>RRPPs</Text>

        {rrpps.length === 0 ? (
          <Text style={styles.muted}>Sin ventas RRPP.</Text>
        ) : (
          rrpps.map((rrpp) => (
            <View key={rrpp.rrppUsuarioId} style={styles.rrppBox}>
              <Text style={styles.rrppName}>{rrpp.rrppNombre}</Text>
              <Text style={styles.muted}>{rrpp.rrppEmail}</Text>

              <Text style={styles.rrppTotal}>
                Debe rendir: {formatMoney(rrpp.totalARendir ?? 0)}
              </Text>

              <Text style={styles.muted}>
                Órdenes: {rrpp.ordenesConfirmadas ?? 0} | Tickets:{" "}
                {rrpp.ticketsGenerados ?? 0}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Rendición RRPP" scroll={false}>
        <View style={styles.resumeCard}>
          <Text style={styles.resumeLabel}>Total visible</Text>
          <Text style={styles.resumeValue}>
            {formatMoney(totalVisible)}
          </Text>
        </View>

        <TextInput
          placeholder="Buscar evento..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator
            color="#E50914"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.eventoId)}
            renderItem={renderEvento}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadFirstPage(true)}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.card}>
                <Text style={styles.muted}>No hay rendiciones.</Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color="#E50914"
                  style={{ marginVertical: 20 }}
                />
              ) : hasNextPage ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => void loadMore()}
                >
                  <Text style={styles.buttonText}>Cargar más</Text>
                </Pressable>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  resumeCard: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
  },
  resumeLabel: { color: "#BDBDBD", fontWeight: "800" },
  resumeValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  input: {
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  total: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  muted: { color: "#BDBDBD", marginTop: 5 },
  section: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
  },
  rrppBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  rrppName: { color: "#FFFFFF", fontWeight: "900" },
  rrppTotal: { color: "#20D67B", fontWeight: "900", marginTop: 8 },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
});