import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getResumenCajaBarraApi,
  getVentasBarraPaginadasApi,
} from "../../api/barraApi";
import { getCajaAbiertaApi } from "../../api/cajasApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BarraResumenCaja, VentaBarra } from "../../types/barra";
import { Caja } from "../../types/cajas";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 5;

export default function BarraSalesScreen() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<BarraResumenCaja | null>(null);
  const [ventas, setVentas] = useState<VentaBarra[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const montoInicial = resumen?.montoInicial ?? 0;
  const ventasEfectivo = resumen?.totalEfectivo ?? 0;
  const ventasTransferencia = resumen?.totalTransferencia ?? 0;
  const ventasTotal = resumen?.totalGeneral ?? 0;

  const totalEfectivoARendir = useMemo(
    () => resumen?.totalEfectivoARendir ?? montoInicial + ventasEfectivo,
    [resumen, montoInicial, ventasEfectivo]
  );

  const totalGeneralARendir = useMemo(
    () => resumen?.totalGeneralARendir ?? montoInicial + ventasTotal,
    [resumen, montoInicial, ventasTotal]
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const cajaData = await getCajaAbiertaApi(1);

      if (!cajaData) {
        setCaja(null);
        setResumen(null);
        setVentas([]);
        return;
      }

      setCaja(cajaData);

      const [resumenData, ventasData] = await Promise.all([
        getResumenCajaBarraApi(cajaData.id),
        getVentasBarraPaginadasApi({
          cajaId: cajaData.id,
          page: 1,
          pageSize: PAGE_SIZE,
        }),
      ]);

      setResumen(resumenData);
      setVentas(ventasData.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(ventasData.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo cargar el resumen.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!caja || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getVentasBarraPaginadasApi({
        cajaId: caja.id,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setVentas((prev) => [...prev, ...(result.items ?? [])]);
      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudieron cargar más ventas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Resumen ventas">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
      <AppLayout title="Resumen ventas">
        {!caja ? (
          <View style={styles.card}>
            <Text style={styles.title}>No hay caja abierta</Text>
            <Text style={styles.muted}>
              Abrí una caja de barra para ver ventas y resumen.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Caja #{caja.id}</Text>
              <Text style={styles.muted}>
                Evento: {caja.eventoNombre ?? "Sin evento"}
              </Text>
              <Text style={styles.muted}>Estado: {resumen?.estado}</Text>

              <Text style={styles.total}>
                Total a rendir: {formatMoney(totalGeneralARendir)}
              </Text>

              <View style={styles.summaryBox}>
                <MoneyRow label="Fondo inicial efectivo" value={montoInicial} />
                <MoneyRow label="Ventas en efectivo" value={ventasEfectivo} />
                <MoneyRow label="Ventas por transferencia" value={ventasTransferencia} />

                <View style={styles.separator} />

                <MoneyRow
                  label="Efectivo a rendir"
                  value={totalEfectivoARendir}
                  strong
                />
                <MoneyRow label="Total ventas" value={ventasTotal} />
                <MoneyRow
                  label="Total general a rendir"
                  value={totalGeneralARendir}
                  strong
                />

                <View style={styles.separator} />

                <Text style={styles.muted}>
                  Ventas: {resumen?.cantidadVentas ?? 0}
                </Text>
                <Text style={styles.muted}>
                  Items vendidos: {resumen?.cantidadItemsVendidos ?? 0}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Últimas ventas</Text>
              <Text style={styles.muted}>
                Se muestran las últimas {PAGE_SIZE}. Podés cargar más si lo necesitás.
              </Text>

              {ventas.length === 0 ? (
                <Text style={styles.muted}>Todavía no hay ventas.</Text>
              ) : (
                ventas.map((venta) => (
                  <View key={venta.id} style={styles.saleCard}>
                    <Text style={styles.saleTitle}>Venta #{venta.id}</Text>
                    <Text style={styles.muted}>Pago: {venta.metodoPago}</Text>
                    <Text style={styles.muted}>
                      Fecha: {formatDate(venta.fechaCreacion)}
                    </Text>

                    <Text style={styles.saleTotal}>{formatMoney(venta.total)}</Text>

                    {venta.items.map((item) => (
                      <Text key={item.id} style={styles.itemText}>
                        {item.cantidad}x {item.nombreProducto} ·{" "}
                        {formatMoney(item.subtotal)}
                      </Text>
                    ))}
                  </View>
                ))
              )}

              {hasNextPage ? (
                <Pressable
                  style={styles.secondaryButton}
                  onPress={loadMore}
                  disabled={loadingMore}
                >
                  <Text style={styles.buttonText}>
                    {loadingMore ? "Cargando..." : "Cargar más"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
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
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 6 },
  total: {
    color: "#20D67B",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 12,
  },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 7,
  },
  moneyLabel: { color: "#BDBDBD", flex: 1 },
  moneyValue: { color: "#FFFFFF", fontWeight: "900" },
  moneyLabelStrong: { color: "#FFFFFF", flex: 1, fontWeight: "900" },
  moneyValueStrong: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 9,
  },
  saleCard: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 12,
    marginTop: 12,
  },
  saleTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  saleTotal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },
  itemText: { color: "#BDBDBD", marginTop: 5 },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
});