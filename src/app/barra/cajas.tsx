import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { getMisCajasBarraApi } from "../../api/barraApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BarraCaja } from "../../types/barra";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 10;

export default function BarraCajasScreen() {
  const [items, setItems] = useState<BarraCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    loadFirstPage(false);
  }, []);

  async function loadFirstPage(isRefreshing = false) {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const result = await getMisCajasBarraApi({
        page: 1,
        pageSize: PAGE_SIZE,
      });

      setItems(result.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
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

      const result = await getMisCajasBarraApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setItems((prev) => [...prev, ...(result.items ?? [])]);
      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } finally {
      setLoadingMore(false);
    }
  }

  function renderItem({ item }: { item: BarraCaja }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/barra/caja-detail",
            params: { cajaId: String(item.id) },
          } as never)
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Caja #{item.id}</Text>
            <Text style={styles.muted}>{item.eventoNombre ?? "Sin evento"}</Text>
          </View>

          <View
            style={[
              styles.badge,
              item.estado === "Abierta" ? styles.badgeOpen : styles.badgeClosed,
            ]}
          >
            <Text style={styles.badgeText}>{item.estado}</Text>
          </View>
        </View>

        <Text style={styles.total}>{formatMoney(item.totalGeneral)}</Text>

        <Text style={styles.muted}>
          Apertura: {formatDate(item.fechaApertura)}
        </Text>

        {item.fechaCierre ? (
          <Text style={styles.muted}>Cierre: {formatDate(item.fechaCierre)}</Text>
        ) : null}

        <View style={styles.summaryBox}>
          <Row label="Efectivo" value={formatMoney(item.totalEfectivo)} />
          <Row label="Transferencia" value={formatMoney(item.totalTransferencia)} />
        </View>
      </Pressable>
    );
  }

  return (
    <RoleGuard allowedRoles={["Barra"]}>
      <AppLayout title="Mis cajas" scroll={false}>
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadFirstPage(true)}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color="#E50914" style={{ marginVertical: 20 }} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.card}>
                <Text style={styles.muted}>Todavía no abriste cajas.</Text>
              </View>
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
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  total: {
    color: "#20D67B",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeOpen: {
    backgroundColor: "rgba(32,214,123,0.18)",
  },
  badgeClosed: {
    backgroundColor: "rgba(255,183,3,0.18)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  rowLabel: {
    color: "#BDBDBD",
  },
  rowValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});