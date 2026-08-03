import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getVentasMiCajaVentanillaApi } from "../../api/ventanillaApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { VentaVentanilla } from "../../types/ventanilla";
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

export default function VentanillaCajaItemsScreen() {
  const { cajaId } = useLocalSearchParams<{ cajaId: string }>();

  const [items, setItems] = useState<VentaVentanilla[]>([]);
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

        const result = await getVentasMiCajaVentanillaApi({
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

      const result = await getVentasMiCajaVentanillaApi({
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

  function renderItem({ item }: { item: VentaVentanilla }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Venta #{item.id}</Text>
        <Text style={styles.muted}>Pago: {item.metodoPago}</Text>
        <Text style={styles.muted}>Entrega: {item.tipoEntrega}</Text>
        <Text style={styles.muted}>Fecha: {formatDate(item.fechaCreacion)}</Text>

        <View style={styles.amountBox}>
          <MoneyRow label="Entrada" value={item.subtotal ?? 0} />

          {(item.cargoServicioMonto ?? 0) > 0 ? (
            <MoneyRow
              label={item.cargoServicioDescripcion ?? "Cargo servicio"}
              value={item.cargoServicioMonto ?? 0}
            />
          ) : null}

          <View style={styles.separator} />
          <MoneyRow label="Total" value={item.total} strong />
        </View>

        {item.numeroTicket ? (
          <Text style={styles.ticket}>Ticket: #{item.numeroTicket}</Text>
        ) : (
          <Text style={styles.ticket}>Ticket físico</Text>
        )}

        {item.nombreCliente ? (
          <Text style={styles.muted}>Cliente: {item.nombreCliente}</Text>
        ) : null}

        {item.emailCliente ? (
          <Text style={styles.muted}>{item.emailCliente}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Ventanilla"]}>
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

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={strong ? styles.moneyLabelStrong : styles.moneyLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.moneyValueStrong : styles.moneyValue}>
        {formatMoney(value)}
      </Text>
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
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 6 },
  amountBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  moneyLabel: { color: "#BDBDBD", flex: 1 },
  moneyValue: { color: "#FFFFFF", fontWeight: "900" },
  moneyLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "900",
    fontSize: 16,
  },
  moneyValueStrong: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  ticket: {
    color: "#FFD166",
    marginTop: 10,
    fontWeight: "900",
  },
});