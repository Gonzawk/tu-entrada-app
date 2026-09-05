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

        if (!Number.isInteger(id) || id <= 0) {
          Alert.alert("Error", "Caja inválida.");
          setItems([]);
          return;
        }

        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

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
          getErrorMessage(e, "No se pudieron cargar las ventas.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cajaId]
  );

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadMore() {
    const id = Number(cajaId);

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      loadingMore ||
      !hasNextPage
    ) {
      return;
    }

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
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar más ventas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function renderItem({ item }: { item: VentaVentanilla }) {
    const tieneDesglosePago =
      (item.montoEfectivo ?? 0) > 0 ||
      (item.montoMercadoPago ?? 0) > 0;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.flexOne}>
            <Text style={styles.title}>Venta #{item.id}</Text>

            <Text style={styles.entryName}>
              {item.tipoEntradaNombre ?? "Entrada física"}
            </Text>

            {item.tandaNombre ? (
              <Text style={styles.muted}>Tanda: {item.tandaNombre}</Text>
            ) : null}
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{item.estado}</Text>
          </View>
        </View>

        <Text style={styles.muted}>Pago: {item.metodoPago}</Text>

        <Text style={styles.muted}>
          Fecha: {formatDate(item.fechaCreacion)}
        </Text>

        <View style={styles.amountBox}>
          <MoneyRow
            label="Subtotal entrada"
            value={item.subtotal ?? 0}
          />

          {(item.cargoServicioMonto ?? 0) > 0 ? (
            <MoneyRow
              label={
                item.cargoServicioDescripcion ?? "Cargo por servicio"
              }
              value={item.cargoServicioMonto ?? 0}
            />
          ) : null}

          <View style={styles.separator} />

          <MoneyRow label="Total" value={item.total} strong />

          {tieneDesglosePago ? (
            <>
              <View style={styles.separator} />

              {(item.montoEfectivo ?? 0) > 0 ? (
                <MoneyRow
                  label="Efectivo"
                  value={item.montoEfectivo ?? 0}
                />
              ) : null}

              {(item.montoMercadoPago ?? 0) > 0 ? (
                <MoneyRow
                  label="Mercado Pago"
                  value={item.montoMercadoPago ?? 0}
                />
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.ticketBox}>
          <Text style={styles.ticketTitle}>Ticket físico</Text>

          <Text style={styles.ticketText}>
            {item.ticketImpreso
              ? "Impresión confirmada"
              : "Sin impresión confirmada"}
          </Text>

          {typeof item.cantidadImpresiones === "number" ? (
            <Text style={styles.ticketMeta}>
              Impresiones: {item.cantidadImpresiones}
            </Text>
          ) : null}

          {item.errorUltimaImpresion ? (
            <Text style={styles.ticketError}>
              {item.errorUltimaImpresion}
            </Text>
          ) : null}
        </View>

        {item.mercadoPagoStatus ? (
          <Text style={styles.muted}>
            Mercado Pago: {item.mercadoPagoStatus}
          </Text>
        ) : null}

        {item.observacion ? (
          <Text style={styles.muted}>
            Observación: {item.observacion}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
      <AppLayout title="Ventas de caja" scroll={false}>
        {loading ? (
          <ActivityIndicator
            color="#E50914"
            style={{ marginTop: 60 }}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadFirstPage(true)}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color="#E50914"
                  style={{ marginVertical: 20 }}
                />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.card}>
                <Text style={styles.muted}>
                  No hay ventas registradas.
                </Text>
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
  flexOne: {
    flex: 1,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  entryName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 5,
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  statusBadge: {
    backgroundColor: "rgba(32,214,123,0.14)",
    borderColor: "rgba(32,214,123,0.30)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    color: "#20D67B",
    fontSize: 11,
    fontWeight: "900",
  },
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
  moneyLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  moneyValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
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
  ticketBox: {
    backgroundColor: "rgba(255,209,102,0.08)",
    borderColor: "rgba(255,209,102,0.24)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  ticketTitle: {
    color: "#FFD166",
    fontSize: 14,
    fontWeight: "900",
  },
  ticketText: {
    color: "#FFFFFF",
    marginTop: 4,
    fontWeight: "700",
  },
  ticketMeta: {
    color: "#BDBDBD",
    marginTop: 4,
    fontSize: 12,
  },
  ticketError: {
    color: "#FF8A8A",
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
});
