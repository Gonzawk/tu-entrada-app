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
import { getMisTicketsPaginadosApi } from "../../api/ticketsApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { MiTicket } from "../../types/tickets";
import { formatDate } from "../../utils/formatDate";

const PAGE_SIZE = 5;

function formatHour(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function formatTicketAccessWindow(ticket: MiTicket) {
  const entrada = ticket.entrada;

  if (!entrada?.tieneHorarioIngreso) {
    return "Ingreso habilitado durante el evento.";
  }

  const desde = formatHour(entrada.horaIngresoDesde);
  const hasta = formatHour(entrada.horaIngresoHasta);

  if (desde && hasta) return `Ingreso desde ${desde} hasta ${hasta}`;
  if (desde && !hasta) return `Ingreso desde ${desde}`;
  if (!desde && hasta) return `Ingreso hasta ${hasta}`;

  return "Ingreso habilitado durante el evento.";
}


function isTicketMultiIngreso(ticket: MiTicket) {
  return Boolean(ticket.esMultiIngreso);
}

function isTicketEspecial(ticket: MiTicket) {
  const nombre = `${ticket.entrada?.nombre ?? ""} ${
    ticket.observacionBeneficio ?? ""
  }`.toLowerCase();

  return (
    isTicketMultiIngreso(ticket) ||
    nombre.includes("vip") ||
    nombre.includes("beneficio") ||
    nombre.includes("cumple")
  );
}

export default function UserTicketsScreen() {
  const [tickets, setTickets] = useState<MiTicket[]>([]);
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
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        const result = await getMisTicketsPaginadosApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        setTickets(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: any) {
        Alert.alert(
          "Error",
          String(
            e?.response?.data?.message ??
              e?.response?.data ??
              "No se pudieron cargar tickets."
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

      const result = await getMisTicketsPaginadosApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setTickets((prev) => {
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

  function renderTicket({ item: ticket }: { item: MiTicket }) {
    const usada = ticket.estado === "Usada";
    const pendiente = ticket.estado === "PendienteReclamar";
    const activa = ticket.estado === "Asignada" && !ticket.fechaUso;
    const especial = isTicketEspecial(ticket);

    return (
      <Pressable
        style={[styles.card, especial && styles.goldCard]}
        onPress={() =>
          router.push({
            pathname: "/user/ticket-detail",
            params: { ticketId: ticket.id },
          } as never)
        }
      >
        {especial ? <View style={styles.goldGlow} /> : null}

        {ticket.evento.bannerUrl ? (
          <Image source={{ uri: ticket.evento.bannerUrl }} style={styles.banner} />
        ) : null}

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{ticket.evento.nombre}</Text>
            <Text style={styles.muted}>{ticket.evento.lugar}</Text>
            <Text style={styles.muted}>{formatDate(ticket.evento.fechaInicio)}</Text>
          </View>

          {especial ? (
            <View style={styles.goldBadge}>
              <Text style={styles.goldBadgeText}>
                {isTicketMultiIngreso(ticket)
                  ? "Multi"
                  : "Especial"}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ticketBox}>
          <Text style={styles.ticketName}>{ticket.entrada.nombre}</Text>
          <Text style={styles.ticketNumber}>{ticket.numeroTicket}</Text>

          <Text style={styles.accessText}>{formatTicketAccessWindow(ticket)}</Text>

          {ticket.entrada.esCombo ? (
            <Text style={styles.combo}>
              Combo para {ticket.entrada.cantidadPersonas} personas
            </Text>
          ) : null}

          {isTicketMultiIngreso(ticket) ? (
            <Text style={styles.multiText}>
              Multiingreso · Restantes: {ticket.usosRestantes ?? 0}
            </Text>
          ) : null}
        </View>

        <Text
          style={
            usada
              ? styles.used
              : pendiente
              ? styles.pending
              : activa
              ? styles.active
              : styles.pending
          }
        >
          Estado: {ticket.estado}
        </Text>

        {ticket.entrada.incluyeBebidas ? (
          <Text style={ticket.bebidasCanjeadas ? styles.used : styles.benefit}>
            {ticket.bebidasCanjeadas
              ? "Beneficio entregado"
              : `Incluye: ${
                  ticket.entrada.descripcionBebidas || "Bebidas seleccionadas"
                }`}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Mis entradas" scroll={false}>
        <View style={styles.screen}>
          <TextInput
            placeholder="Buscar por evento, entrada o ticket..."
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
              data={tickets}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderTicket}
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
                  <Text style={styles.emptyText}>No tenés entradas asignadas.</Text>
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
                flexGrow: tickets.length === 0 ? 1 : 0,
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
  goldCard: {
    borderColor: "rgba(255,209,102,0.75)",
    backgroundColor: "rgba(255,209,102,0.10)",
  },
  goldGlow: {
    position: "absolute",
    top: -45,
    right: -45,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: "rgba(255,209,102,0.20)",
  },
  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
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
  banner: {
    height: 145,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1A1A1A",
  },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  ticketBox: {
    backgroundColor: "rgba(0,0,0,0.24)",
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
  },
  ticketName: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  ticketNumber: { color: "#BDBDBD", marginTop: 5 },
  accessText: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "800",
  },
  combo: {
    color: "#FFFFFF",
    marginTop: 8,
    fontWeight: "800",
  },
  multiText: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "900",
  },
  active: { color: "#20D67B", marginTop: 12, fontWeight: "900" },
  used: { color: "#FFB703", marginTop: 12, fontWeight: "900" },
  pending: { color: "#FFD166", marginTop: 12, fontWeight: "900" },
  benefit: { color: "#20D67B", marginTop: 8, fontWeight: "800" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: { color: "#BDBDBD", textAlign: "center" },
});