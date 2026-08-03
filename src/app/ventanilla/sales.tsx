import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCajaAbiertaApi } from "../../api/cajasApi";
import {
  getResumenCajaVentanillaApi,
  getVentasVentanillaPaginadasApi,
} from "../../api/ventanillaApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { Caja } from "../../types/cajas";
import { VentaVentanilla, VentanillaResumenCaja } from "../../types/ventanilla";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 5;

export default function VentanillaSalesScreen() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] = useState<VentanillaResumenCaja | null>(null);
  const [ventas, setVentas] = useState<VentaVentanilla[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const montoInicial = resumen?.montoInicial ?? 0;
  const ventasEfectivo = resumen?.totalEfectivo ?? 0;
  const ventasTransferencia = resumen?.totalTransferencia ?? 0;
  const ventasTotal = resumen?.totalGeneral ?? 0;

  const totalEfectivoARendir =
    resumen?.totalEfectivoARendir ?? montoInicial + ventasEfectivo;

  const totalGeneralARendir =
    resumen?.totalGeneralARendir ?? montoInicial + ventasTotal;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const cajaData = await getCajaAbiertaApi(2);

      if (!cajaData) {
        setCaja(null);
        setResumen(null);
        setVentas([]);
        return;
      }

      setCaja(cajaData);

      const [resumenData, ventasData] = await Promise.all([
        getResumenCajaVentanillaApi(cajaData.id),
        getVentasVentanillaPaginadasApi({
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
        String(e?.response?.data?.message ?? "No se pudo cargar resumen.")
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

      const result = await getVentasVentanillaPaginadasApi({
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
      <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
        <AppLayout title="Resumen ventas">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
      <AppLayout title="Resumen ventas">
        {!caja ? (
          <View style={styles.card}>
            <Text style={styles.title}>No hay caja abierta</Text>
            <Text style={styles.muted}>
              Abrí una caja de ventanilla para ver ventas.
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
                <MoneyRow
                  label="Ventas por transferencia"
                  value={ventasTransferencia}
                />

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
                  Digitales: {resumen?.ticketsDigitalesGenerados ?? 0}
                </Text>
                <Text style={styles.muted}>
                  Físicos: {resumen?.ticketsFisicosVendidos ?? 0}
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
                    <Text style={styles.muted}>Entrega: {venta.tipoEntrega}</Text>
                    <Text style={styles.muted}>
                      Fecha: {formatDate(venta.fechaCreacion)}
                    </Text>

                    <View style={styles.amountBox}>
                      <MoneyRow label="Entrada" value={venta.subtotal ?? 0} />

                      {(venta.cargoServicioMonto ?? 0) > 0 ? (
                        <MoneyRow
                          label={
                            venta.cargoServicioDescripcion ?? "Cargo servicio"
                          }
                          value={venta.cargoServicioMonto ?? 0}
                        />
                      ) : null}

                      <View style={styles.separator} />

                      <MoneyRow label="Total" value={venta.total} strong />
                    </View>

                    {venta.numeroTicket ? (
                      <Text style={styles.itemText}>
                        Ticket: {venta.numeroTicket}
                      </Text>
                    ) : (
                      <Text style={styles.itemText}>Ticket físico / caja</Text>
                    )}

                    {venta.emailCliente ? (
                      <Text style={styles.itemText}>{venta.emailCliente}</Text>
                    ) : null}
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
    <View style={styles.row}>
      <Text style={strong ? styles.rowLabelStrong : styles.rowLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.rowValueStrong : styles.rowValue}>
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
    fontSize: 25,
    fontWeight: "900",
    marginTop: 12,
  },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 12,
    borderRadius: 16,
    marginTop: 14,
  },
  saleCard: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 12,
    marginTop: 12,
  },
  saleTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  amountBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 12,
    borderRadius: 16,
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
    flex: 1,
  },
  rowValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  rowLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "900",
    fontSize: 16,
  },
  rowValueStrong: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 8,
  },
  itemText: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});