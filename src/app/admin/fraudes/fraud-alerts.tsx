import { useCallback, useEffect, useMemo, useState } from "react";
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
  getAlertasFraudeAdminApi,
  marcarAlertaFraudeRevisadaAdminApi,
} from "../../../api/alertasFraudeApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { AlertaUsoFraudulento } from "../../../types/alertasFraude";
import { formatDate } from "../../../utils/formatDate";


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

const PAGE_SIZE = 10;

type FilterType = "pendientes" | "revisadas" | "todas";

export default function AdminFraudAlertsScreen() {
  const [items, setItems] = useState<AlertaUsoFraudulento[]>([]);
  const [filter, setFilter] = useState<FilterType>("pendientes");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const revisadaParam = useMemo(
    () =>
      filter === "pendientes"
        ? false
        : filter === "revisadas"
          ? true
          : null,
    [filter]
  );

  const resumen = useMemo(() => {
    const total = items.length;
    const pendientes = items.filter((x) => !x.revisada).length;

    const porOperador = new Map<string, number>();
    const porCodigo = new Map<string, number>();
    const porDuenio = new Map<string, number>();

    items.forEach((x) => {
      const operador = x.usuarioEscaneoNombre ?? `Usuario #${x.usuarioEscaneoId ?? "-"}`;
      porOperador.set(operador, (porOperador.get(operador) ?? 0) + 1);

      if (x.codigoQR) {
        porCodigo.set(x.codigoQR, (porCodigo.get(x.codigoQR) ?? 0) + 1);
      }

      const duenio = x.usuarioDuenioNombre ?? `Usuario #${x.usuarioDuenioId ?? "-"}`;
      porDuenio.set(duenio, (porDuenio.get(duenio) ?? 0) + 1);
    });

    const topOperador = [...porOperador.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCodigo = [...porCodigo.entries()].sort((a, b) => b[1] - a[1])[0];
    const topDuenio = [...porDuenio.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      pendientes,
      topOperador,
      topCodigo,
      topDuenio,
    };
  }, [items]);

  const loadFirstPage = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const result = await getAlertasFraudeAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
        revisada: revisadaParam,
      });

      setItems(result.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar alertas.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [revisadaParam]);

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadMore() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getAlertasFraudeAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        revisada: revisadaParam,
      });

      setItems((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = (result.items ?? []).filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar más alertas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function marcarRevisada(alerta: AlertaUsoFraudulento) {
    try {
      setMarkingId(alerta.id);

      await marcarAlertaFraudeRevisadaAdminApi(alerta.id);

      setItems((prev) =>
        prev.map((x) =>
          x.id === alerta.id
            ? {
                ...x,
                revisada: true,
                fechaRevision: new Date().toISOString(),
              }
            : x
        )
      );

      Alert.alert("Correcto", "Alerta marcada como revisada.");
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudo marcar como revisada.")
      );
    } finally {
      setMarkingId(null);
    }
  }

  function renderItem({ item }: { item: AlertaUsoFraudulento }) {
    const repeatedQrCount = item.codigoQR
      ? items.filter((x) => x.codigoQR === item.codigoQR).length
      : 0;

    const repeatedOperatorCount = item.usuarioEscaneoId
      ? items.filter((x) => x.usuarioEscaneoId === item.usuarioEscaneoId).length
      : 0;

    const isCritical = repeatedQrCount >= 2 || repeatedOperatorCount >= 3;

    return (
      <View style={[styles.card, isCritical && styles.cardCritical]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Alerta #{item.id}</Text>
            <Text style={styles.muted}>{formatDate(item.fechaCreacion)}</Text>
          </View>

          <View style={item.revisada ? styles.badgeReviewed : styles.badgePending}>
            <Text style={styles.badgeText}>
              {item.revisada ? "Revisada" : "Pendiente"}
            </Text>
          </View>
        </View>

        <Text style={styles.type}>{item.tipo}</Text>

        <Text style={styles.description}>{item.descripcion}</Text>

        {isCritical ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Coincidencia importante</Text>

            {repeatedQrCount >= 2 ? (
              <Text style={styles.warningText}>
                Este mismo QR aparece {repeatedQrCount} veces en la lista cargada.
              </Text>
            ) : null}

            {repeatedOperatorCount >= 3 ? (
              <Text style={styles.warningText}>
                El operador tiene {repeatedOperatorCount} alertas en la lista cargada.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <InfoRow label="Evento" value={item.eventoNombre ?? "-"} />
          <InfoRow label="Operador" value={item.usuarioEscaneoNombre ?? "-"} />
          <InfoRow label="Dueño" value={item.usuarioDuenioNombre ?? "-"} />
          <InfoRow label="Orden bebida" value={item.bebidaOrdenId ? `#${item.bebidaOrdenId}` : "-"} />
          <InfoRow label="Ticket" value={item.ticketId ? `#${item.ticketId}` : "-"} />
          <InfoRow label="Código retiro" value={item.codigoRetiro ?? "-"} />
        </View>

        {item.codigoQR ? (
          <Text style={styles.qrText}>QR: {item.codigoQR}</Text>
        ) : null}

        {item.datosExtraJson ? (
          <View style={styles.jsonBox}>
            <Text style={styles.jsonTitle}>Datos extra</Text>
            <Text style={styles.jsonText}>{item.datosExtraJson}</Text>
          </View>
        ) : null}

        {item.revisada ? (
          <Text style={styles.reviewedText}>
            Revisada por {item.revisadaPorUsuarioNombre ?? "admin"}
            {item.fechaRevision ? ` · ${formatDate(item.fechaRevision)}` : ""}
          </Text>
        ) : (
          <Pressable
            style={[styles.primaryButton, markingId === item.id && styles.disabled]}
            onPress={() => marcarRevisada(item)}
            disabled={markingId === item.id}
          >
            {markingId === item.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Marcar como revisada</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Alertas fraude" scroll={false}>
        <View style={styles.container}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen cargado</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{resumen.total}</Text>
                <Text style={styles.summaryLabel}>Alertas</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{resumen.pendientes}</Text>
                <Text style={styles.summaryLabel}>Pendientes</Text>
              </View>
            </View>

            {resumen.topOperador ? (
              <Text style={styles.summaryText}>
                Operador con más alertas: {resumen.topOperador[0]} ({resumen.topOperador[1]})
              </Text>
            ) : null}

            {resumen.topCodigo ? (
              <Text style={styles.summaryText}>
                QR más repetido: {resumen.topCodigo[1]} veces
              </Text>
            ) : null}

            {resumen.topDuenio ? (
              <Text style={styles.summaryText}>
                Dueño más repetido: {resumen.topDuenio[0]} ({resumen.topDuenio[1]})
              </Text>
            ) : null}
          </View>

          <View style={styles.filters}>
            <FilterButton
              label="Pendientes"
              active={filter === "pendientes"}
              onPress={() => setFilter("pendientes")}
            />
            <FilterButton
              label="Revisadas"
              active={filter === "revisadas"}
              onPress={() => setFilter("revisadas")}
            />
            <FilterButton
              label="Todas"
              active={filter === "todas"}
              onPress={() => setFilter("todas")}
            />
          </View>

          {loading ? (
            <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
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
                  <Text style={styles.emptyText}>No hay alertas para mostrar.</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={active ? styles.filterActive : styles.filter} onPress={onPress}>
      <Text style={styles.filterText}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "rgba(229,9,20,0.13)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.30)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#BDBDBD",
    marginTop: 4,
    fontWeight: "800",
  },
  summaryText: {
    color: "#FFD166",
    marginTop: 6,
    fontWeight: "800",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filter: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  filterActive: {
    flex: 1,
    backgroundColor: "#E50914",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  filterText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  cardCritical: {
    borderColor: "rgba(255,209,102,0.60)",
    backgroundColor: "rgba(255,209,102,0.08)",
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
  badgePending: {
    backgroundColor: "rgba(255,209,102,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.40)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeReviewed: {
    backgroundColor: "rgba(32,214,123,0.18)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.40)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  type: {
    color: "#FFD166",
    marginTop: 10,
    fontWeight: "900",
  },
  description: {
    color: "#FFFFFF",
    marginTop: 8,
    lineHeight: 21,
    fontWeight: "800",
  },
  warningBox: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.28)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  warningTitle: {
    color: "#FFD166",
    fontWeight: "900",
  },
  warningText: {
    color: "#FFD166",
    marginTop: 5,
    lineHeight: 19,
  },
  infoBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  infoLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  infoValue: {
    color: "#FFFFFF",
    fontWeight: "900",
    flex: 1,
    textAlign: "right",
  },
  qrText: {
    color: "#BDBDBD",
    marginTop: 10,
    fontSize: 12,
  },
  jsonBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
  },
  jsonTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginBottom: 4,
  },
  jsonText: {
    color: "#BDBDBD",
    fontSize: 12,
  },
  reviewedText: {
    color: "#20D67B",
    marginTop: 12,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
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