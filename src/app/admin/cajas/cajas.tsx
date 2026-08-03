import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCajasAdminApi } from "../../../api/cajasApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { Caja } from "../../../types/cajas";
import { formatDate } from "../../../utils/formatDate";
import { formatMoney } from "../../../utils/formatMoney";

const PAGE_SIZE = 10;

export default function AdminCajasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [cajas, setCajas] = useState<Caja[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    loadFirstPage(false);
  }, []);

  async function loadFirstPage(isRefreshing = false) {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const data = await getCajasAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
      });

      setCajas(data.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(data.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudieron cargar cajas.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const data = await getCajasAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setCajas((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = (data.items ?? []).filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(data.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudieron cargar más cajas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function renderCaja({ item: caja }: { item: Caja }) {
    const montoInicial = caja.montoInicial ?? 0;
    const ventasEfectivo = caja.totalEfectivo ?? 0;
    const ventasTransferencia = caja.totalTransferencia ?? 0;
    const ventasTotal = caja.totalGeneral ?? 0;

    const totalEfectivoARendir =
      caja.totalEfectivoARendir ?? montoInicial + ventasEfectivo;

    const totalGeneralARendir =
      caja.totalGeneralARendir ?? montoInicial + ventasTotal;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          Caja #{caja.id} · {caja.tipoCaja}
        </Text>

        <Text style={styles.muted}>Usuario: {caja.usuarioNombre}</Text>
        <Text style={styles.muted}>
          Evento: {caja.eventoNombre ?? "Sin evento"}
        </Text>
        <Text style={styles.muted}>Estado: {caja.estado}</Text>

        <Text style={styles.total}>
          Total a rendir: {formatMoney(totalGeneralARendir)}
        </Text>

        <View style={styles.summaryBox}>
          <Row label="Fondo inicial" value={formatMoney(montoInicial)} />
          <Row label="Ventas efectivo" value={formatMoney(ventasEfectivo)} />
          <Row
            label="Ventas transferencia"
            value={formatMoney(ventasTransferencia)}
          />
          <View style={styles.separator} />
          <Row
            label="Efectivo a rendir"
            value={formatMoney(totalEfectivoARendir)}
          />
          <Row
            label="Total ventas"
            value={formatMoney(ventasTotal)}
          />
          <Row
            label="Total general"
            value={formatMoney(totalGeneralARendir)}
          />
        </View>

        <Text style={styles.muted}>
          Apertura: {formatDate(caja.fechaApertura)}
        </Text>

        {caja.fechaCierre ? (
          <Text style={styles.muted}>
            Cierre: {formatDate(caja.fechaCierre)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Cajas" scroll={false}>
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={cajas}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCaja}
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
              <View style={styles.card}>
                <Text style={styles.muted}>No hay cajas registradas.</Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 6 },
  total: {
    color: "#20D67B",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10,
  },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  rowLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  rowValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});