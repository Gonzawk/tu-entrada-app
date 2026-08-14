import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  cambiarEstadoEventoAdminApi,
  getEventosAdminApi,
  publicarEventoAdminApi,
} from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";


type ApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (typeof data === "string") return data;

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.title === "string") return record.title;
  }

  return apiError.message ?? fallback;
}

const PAGE_SIZE = 5;

const EVENTO_ESTADOS = {
  BORRADOR: 0,
  PUBLICADO: 1,
  OCULTO: 2,
  FINALIZADO: 3,
  CANCELADO: 4,
} as const;

type AdminEventoResumen = {
  id: number;
  nombre: string;
  lugar?: string | null;
  fechaInicio: string;
  bannerUrl?: string | null;
  estado: string;
};

type AdminEventosResumen = {
  total: number;
  publicados: number;
  borradores: number;
  ocultos: number;
};

export default function AdminEventsScreen() {
  const [eventos, setEventos] = useState<AdminEventoResumen[]>([]);
  const [resumen, setResumen] = useState<AdminEventosResumen>({
    total: 0,
    publicados: 0,
    borradores: 0,
    ocultos: 0,
  });

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

  const loadFirstPage = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const result = await getEventosAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setEventos(result.items ?? []);
      setResumen(
        result.resumen ?? {
          total: 0,
          publicados: 0,
          borradores: 0,
          ocultos: 0,
        }
      );

      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar eventos.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getEventosAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setEventos((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = (result.items ?? []).filter(
          (x: AdminEventoResumen) => !ids.has(x.id)
        );

        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar más eventos.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function estadoTextoFromValue(estado: number) {
    if (estado === EVENTO_ESTADOS.BORRADOR) return "Borrador";
    if (estado === EVENTO_ESTADOS.PUBLICADO) return "Publicado";
    if (estado === EVENTO_ESTADOS.OCULTO) return "Oculto";
    if (estado === EVENTO_ESTADOS.FINALIZADO) return "Finalizado";
    if (estado === EVENTO_ESTADOS.CANCELADO) return "Cancelado";
    return "Borrador";
  }

  function actualizarResumenLocal(estadoAnterior: string, nuevoEstado: string) {
    setResumen((prev) => {
      const next = { ...prev };

      if (estadoAnterior === "Publicado") next.publicados -= 1;
      if (estadoAnterior === "Borrador") next.borradores -= 1;
      if (estadoAnterior === "Oculto") next.ocultos -= 1;

      if (nuevoEstado === "Publicado") next.publicados += 1;
      if (nuevoEstado === "Borrador") next.borradores += 1;
      if (nuevoEstado === "Oculto") next.ocultos += 1;

      return next;
    });
  }

  async function cambiarEstado(eventoId: number, estado: number) {
    try {
      const eventoActual = eventos.find((x) => x.id === eventoId);
      const estadoAnterior = eventoActual?.estado;
      const nuevoEstado = estadoTextoFromValue(estado);

      await cambiarEstadoEventoAdminApi(eventoId, estado);

      setEventos((prev) =>
        prev.map((evento) =>
          evento.id === eventoId ? { ...evento, estado: nuevoEstado } : evento
        )
      );

      if (estadoAnterior) {
        actualizarResumenLocal(estadoAnterior, nuevoEstado);
      }
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudo cambiar el estado.")
      );
    }
  }

  async function publicarEvento(eventoId: number) {
  try {
    const eventoActual =
      eventos.find((x) => x.id === eventoId);

    const estadoAnterior =
      eventoActual?.estado;

    await publicarEventoAdminApi(eventoId);

    setEventos((prev) =>
      prev.map((evento) =>
        evento.id === eventoId
          ? {
              ...evento,
              estado: "Publicado",
            }
          : evento
      )
    );

    if (estadoAnterior) {
      actualizarResumenLocal(
        estadoAnterior,
        "Publicado"
      );
    }

    Alert.alert(
      "Evento publicado",
      "El evento fue publicado correctamente y se notificó a los dispositivos habilitados."
    );
  } catch (error: unknown) {
    Alert.alert(
      "No se pudo publicar",
      getErrorMessage(
        error,
        "No se pudo publicar el evento."
      )
    );
  }
}

  function renderHeader() {
    return (
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.resumeScroller}
        >
          <ResumeCard label="Total" value={resumen.total} />
          <ResumeCard label="Publicados" value={resumen.publicados} />
          <ResumeCard label="Borradores" value={resumen.borradores} />
          <ResumeCard label="Ocultos" value={resumen.ocultos} />
        </ScrollView>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/events/create" as never)}
        >
          <Text style={styles.primaryText}>Crear nuevo evento</Text>
        </Pressable>

        <TextInput
          placeholder="Buscar por nombre, lugar, estado o ID..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
    );
  }

  function renderEvento({ item: evento }: { item: AdminEventoResumen }) {
    return (
      <View style={styles.card}>
        {evento.bannerUrl ? (
          <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
        ) : null}

        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{evento.nombre}</Text>
            <Text style={styles.muted}>
              #{evento.id} · {evento.lugar}
            </Text>
            <Text style={styles.muted}>{evento.fechaInicio}</Text>
          </View>

          <Text style={getStatusStyle(evento.estado)}>{evento.estado}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              router.push({
                pathname: "/admin/events/event-detail",
                params: { eventoId: evento.id },
              } as never)
            }
          >
            <Text style={styles.actionText}>Gestionar</Text>
          </Pressable>

          {evento.estado !== "Publicado" ? (
            <Pressable
              style={styles.publishButton}
              onPress={() =>
  publicarEvento(evento.id)
}
            >
              <Text style={styles.actionText}>Publicar</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.hideButton}
              onPress={() => cambiarEstado(evento.id, EVENTO_ESTADOS.OCULTO)}
            >
              <Text style={styles.actionText}>Ocultar</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actions}>
          {evento.estado !== "Finalizado" ? (
            <Pressable
              style={styles.secondaryAction}
              onPress={() => cambiarEstado(evento.id, EVENTO_ESTADOS.FINALIZADO)}
            >
              <Text style={styles.actionText}>Finalizar</Text>
            </Pressable>
          ) : null}

          {evento.estado !== "Cancelado" ? (
            <Pressable
              style={styles.dangerAction}
              onPress={() => cambiarEstado(evento.id, EVENTO_ESTADOS.CANCELADO)}
            >
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Eventos Admin" scroll={false}>
        <View style={styles.screen}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" />
            </View>
          ) : (
            <FlatList
              data={eventos}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderEvento}
              ListHeaderComponent={renderHeader}
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
                  <Text style={styles.empty}>No hay eventos para mostrar.</Text>
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
                flexGrow: eventos.length === 0 ? 1 : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function ResumeCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.resumeCardCompact}>
      <Text style={styles.resumeLabel}>{label}</Text>
      <Text style={styles.resumeValueCompact}>{value}</Text>
    </View>
  );
}

function getStatusStyle(estado: string) {
  if (estado === "Publicado") return [styles.status, styles.statusPublished];
  if (estado === "Borrador") return [styles.status, styles.statusDraft];
  if (estado === "Oculto") return [styles.status, styles.statusHidden];
  if (estado === "Cancelado") return [styles.status, styles.statusCancelled];
  if (estado === "Finalizado") return [styles.status, styles.statusFinished];

  return [styles.status, styles.statusDraft];
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
  resumeScroller: {
    gap: 10,
    paddingBottom: 12,
  },
  resumeCardCompact: {
    width: 120,
    minHeight: 72,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 12,
  },
  resumeLabel: {
    color: "#BDBDBD",
    fontWeight: "800",
    fontSize: 12,
  },
  resumeValueCompact: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryText: {
    color: "#fff",
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  banner: {
    height: 150,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1A1A1A",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  status: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    fontWeight: "900",
    overflow: "hidden",
  },
  statusPublished: {
    color: "#20D67B",
    backgroundColor: "rgba(32,214,123,0.15)",
  },
  statusDraft: {
    color: "#FFD166",
    backgroundColor: "rgba(255,209,102,0.15)",
  },
  statusHidden: {
    color: "#9EC5FE",
    backgroundColor: "rgba(158,197,254,0.15)",
  },
  statusCancelled: {
    color: "#FF4D57",
    backgroundColor: "rgba(255,77,87,0.15)",
  },
  statusFinished: {
    color: "#C9C9C9",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  publishButton: {
    flex: 1,
    backgroundColor: "#E50914",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  hideButton: {
    flex: 1,
    backgroundColor: "rgba(158,197,254,0.20)",
    borderWidth: 1,
    borderColor: "rgba(158,197,254,0.35)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerAction: {
    flex: 1,
    backgroundColor: "rgba(255,77,87,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.35)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 20,
  },
  empty: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});