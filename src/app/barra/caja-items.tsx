import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getVentasMiCajaBarraApi } from "../../api/barraApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BarraCajaVenta } from "../../types/barra";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 10;

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  return err?.response?.data?.message ?? fallback;
}

export default function BarraCajaItemsScreen() {
  const { cajaId } = useLocalSearchParams<{ cajaId: string }>();

  const [items, setItems] = useState<BarraCajaVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        const id = Number(cajaId);

        if (!id) {
          Alert.alert("Error", "Caja inválida.");
          return;
        }

        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        const result = await getVentasMiCajaBarraApi({
          cajaId: id,
          page: 1,
          pageSize: PAGE_SIZE,
        });

        setItems(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(e, "No se pudieron cargar ventas.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cajaId]
  );

  useEffect(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadMore() {
    const id = Number(cajaId);

    if (!id || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getVentasMiCajaBarraApi({
        cajaId: id,
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

  function renderItem({ item }: { item: BarraCajaVenta }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Venta #{item.id}</Text>
        <Text style={styles.muted}>Pago: {item.metodoPago}</Text>
        <Text style={styles.muted}>Fecha: {formatDate(item.fechaCreacion)}</Text>

        <Text style={styles.total}>{formatMoney(item.total)}</Text>

        {item.items.map((i, index) => (
          <View key={`${item.id}-${i.bebidaProductoId}-${index}`} style={styles.itemBox}>
            <Text style={styles.itemTitle}>{i.nombreProducto}</Text>
            <Text style={styles.muted}>
              {i.cantidad} x {formatMoney(i.precioUnitario)}
            </Text>
            <Text style={styles.itemTotal}>{formatMoney(i.subtotal)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Barra"]}>
      <AppLayout title="Items caja" scroll={false}>
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
                <Text style={styles.muted}>No hay ventas registradas.</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </AppLayout>
    </RoleGuard>
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
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 6 },
  total: {
    color: "#20D67B",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10,
  },
  itemBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  itemTitle: { color: "#FFFFFF", fontWeight: "900" },
  itemTotal: { color: "#FFFFFF", fontWeight: "900", marginTop: 5 },
});