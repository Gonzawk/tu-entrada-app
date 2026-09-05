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
import {
  VentaVentanilla,
  VentanillaResumenCaja,
} from "../../types/ventanilla";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 5;

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

export default function VentanillaSalesScreen() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [resumen, setResumen] =
    useState<VentanillaResumenCaja | null>(null);

  const [ventas, setVentas] = useState<VentaVentanilla[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const montoInicial = resumen?.montoInicial ?? 0;
  const ventasEfectivo = resumen?.totalEfectivo ?? 0;
  const ventasTransferencia = resumen?.totalTransferencia ?? 0;
  const ventasMercadoPago = resumen?.totalMercadoPago ?? 0;
  const ventasTotal = resumen?.totalGeneral ?? 0;

  const totalEfectivoARendir =
    resumen?.totalEfectivoARendir ??
    montoInicial + ventasEfectivo;

  const totalGeneralARendir =
    resumen?.totalGeneralARendir ??
    montoInicial + ventasTotal;

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const cajaData = await getCajaAbiertaApi(2);

      if (!cajaData) {
        setCaja(null);
        setResumen(null);
        setVentas([]);
        setPage(1);
        setHasNextPage(false);
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
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar el resumen.")
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
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar más ventas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard
        allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}
      >
        <AppLayout title="Resumen ventas">
          <ActivityIndicator
            color="#E50914"
            style={{ marginTop: 60 }}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}
    >
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

              <Text style={styles.muted}>
                Estado: {resumen?.estado ?? caja.estado}
              </Text>

              <Text style={styles.total}>
                Total a rendir: {formatMoney(totalGeneralARendir)}
              </Text>

              <View style={styles.summaryBox}>
                <MoneyRow
                  label="Fondo inicial efectivo"
                  value={montoInicial}
                />

                <MoneyRow
                  label="Ventas en efectivo"
                  value={ventasEfectivo}
                />

                <MoneyRow
                  label="Ventas por transferencia"
                  value={ventasTransferencia}
                />

                <MoneyRow
                  label="Ventas Mercado Pago"
                  value={ventasMercadoPago}
                />

                <View style={styles.separator} />

                <MoneyRow
                  label="Efectivo a rendir"
                  value={totalEfectivoARendir}
                  strong
                />

                <MoneyRow
                  label="Total ventas"
                  value={ventasTotal}
                />

                <MoneyRow
                  label="Total general a rendir"
                  value={totalGeneralARendir}
                  strong
                />

                <View style={styles.separator} />

                <Text style={styles.muted}>
                  Ventas realizadas: {resumen?.cantidadVentas ?? 0}
                </Text>

                <Text style={styles.helpText}>
                  Todas las ventas de Ventanilla corresponden a entradas
                  físicas. El estado de impresión se muestra individualmente
                  en cada venta.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Últimas ventas</Text>

              <Text style={styles.muted}>
                Se muestran las últimas {PAGE_SIZE}. Podés cargar más si lo
                necesitás.
              </Text>

              {ventas.length === 0 ? (
                <Text style={styles.muted}>
                  Todavía no hay ventas.
                </Text>
              ) : (
                ventas.map((venta) => {
                  const tieneDesglosePago =
                    (venta.montoEfectivo ?? 0) > 0 ||
                    (venta.montoMercadoPago ?? 0) > 0;

                  return (
                    <View key={venta.id} style={styles.saleCard}>
                      <View style={styles.saleHeader}>
                        <View style={styles.flexOne}>
                          <Text style={styles.saleTitle}>
                            Venta #{venta.id}
                          </Text>

                          <Text style={styles.entryName}>
                            {venta.tipoEntradaNombre ??
                              "Entrada física"}
                          </Text>
                        </View>

                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>
                            {venta.estado}
                          </Text>
                        </View>
                      </View>

                      {venta.tandaNombre ? (
                        <Text style={styles.muted}>
                          Tanda: {venta.tandaNombre}
                        </Text>
                      ) : null}

                      <Text style={styles.muted}>
                        Pago: {venta.metodoPago}
                      </Text>

                      <Text style={styles.muted}>
                        Fecha: {formatDate(venta.fechaCreacion)}
                      </Text>

                      <View style={styles.amountBox}>
                        <MoneyRow
                          label="Subtotal entrada"
                          value={venta.subtotal ?? 0}
                        />

                        {(venta.cargoServicioMonto ?? 0) > 0 ? (
                          <MoneyRow
                            label={
                              venta.cargoServicioDescripcion ??
                              "Cargo por servicio"
                            }
                            value={venta.cargoServicioMonto ?? 0}
                          />
                        ) : null}

                        <View style={styles.separator} />

                        <MoneyRow
                          label="Total"
                          value={venta.total}
                          strong
                        />

                        {tieneDesglosePago ? (
                          <>
                            <View style={styles.separator} />

                            {(venta.montoEfectivo ?? 0) > 0 ? (
                              <MoneyRow
                                label="Efectivo"
                                value={venta.montoEfectivo ?? 0}
                              />
                            ) : null}

                            {(venta.montoMercadoPago ?? 0) > 0 ? (
                              <MoneyRow
                                label="Mercado Pago"
                                value={
                                  venta.montoMercadoPago ?? 0
                                }
                              />
                            ) : null}
                          </>
                        ) : null}
                      </View>

                      <View style={styles.ticketBox}>
                        <Text style={styles.ticketTitle}>
                          Ticket físico
                        </Text>

                        <Text style={styles.itemText}>
                          {venta.ticketImpreso
                            ? "Impresión confirmada"
                            : "Sin impresión confirmada"}
                        </Text>

                        {typeof venta.cantidadImpresiones ===
                        "number" ? (
                          <Text style={styles.itemText}>
                            Impresiones:{" "}
                            {venta.cantidadImpresiones}
                          </Text>
                        ) : null}
                      </View>

                      {venta.mercadoPagoStatus ? (
                        <Text style={styles.itemText}>
                          Mercado Pago: {venta.mercadoPagoStatus}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}

              {hasNextPage ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Cargar más
                    </Text>
                  )}
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
  flexOne: {
    flex: 1,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
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
    paddingTop: 14,
    marginTop: 14,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  saleTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  entryName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
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
  helpText: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  ticketBox: {
    backgroundColor: "rgba(255,209,102,0.08)",
    borderColor: "rgba(255,209,102,0.24)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
  },
  ticketTitle: {
    color: "#FFD166",
    fontSize: 13,
    fontWeight: "900",
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
    justifyContent: "center",
    minHeight: 48,
    marginTop: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.82,
  },
});
