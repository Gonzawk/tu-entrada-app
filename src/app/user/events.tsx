import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { getEventosActivosApi } from "../../api/eventsApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { EventCard } from "../../components/shared/EventCard";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { getEventsCache, saveEventsCache } from "../../storage/eventsCache";
import { EventoActivo } from "../../types/events";

const PAGE_SIZE = 5;

export default function UserEventsScreen() {
  const [eventos, setEventos] = useState<EventoActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    async function loadCache() {
      const cached = await getEventsCache();

      if (cached.length > 0) {
        setEventos(cached);
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

        const result = await getEventosActivosApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        setEventos(result.items);
        await saveEventsCache(result.items);

        setPage(1);
        setHasNextPage(result.hasNextPage);
      } catch (e: any) {
        Alert.alert(
          "Error",
          String(e?.response?.data ?? "No se pudieron cargar los eventos.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch]
  );

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getEventosActivosApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setEventos((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = result.items.filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(result.hasNextPage);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data ?? "No se pudieron cargar más eventos.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadFirstPage(false);
  }, [debouncedSearch, loadFirstPage]);

  return (
    <RoleGuard allowedRoles={["Usuario"]}>
      <AppLayout title="Eventos" scroll={false}>
        <View style={styles.screen}>
          <TextInput
            placeholder="Buscar evento, lugar o dirección..."
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
              data={eventos}
              keyExtractor={(item) => String(item.id)}
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
                <Text style={styles.emptyText}>
                  No hay eventos activos disponibles.
                </Text>
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
                flexGrow: eventos.length === 0 ? 1 : 0,
              }}
              renderItem={({ item }) => (
                <EventCard
                  evento={item}
                  onPress={() =>
                    router.push({
                      pathname: "/user/event-detail",
                      params: { eventoId: item.id },
                    } as never)
                  }
                />
              )}
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
    paddingTop: 60,
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
  emptyText: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 40,
  },
});