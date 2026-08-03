import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getMiOrdenDetalleApi } from "../../api/ordersApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import { MiOrdenDetalle } from "../../types/orders";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";
import { openWhatsapp } from "../../utils/whatsapp";

type OrdenDetalleItemConCargo =
  MiOrdenDetalle["items"][number] & {
    esCombo: boolean;
    cantidadPersonas: number;
    esPrincipalCombo: boolean;
    cargoServicioMonto: number;
    cargoServicioDescripcion?: string | null;
    totalTicket: number;
  };

type MiOrdenDetalleConCargo =
  Omit<MiOrdenDetalle, "items"> & {
    cantidadTickets: number;
    subtotal: number;
    cargoServicioUnitario: number;
    cargoServicioMonto: number;
    cargoServicioDescripcion?: string | null;
    items: OrdenDetalleItemConCargo[];
  };

export default function UserOrderDetailScreen() {
  const { user } = useAuth();
  const { ordenId } =
    useLocalSearchParams<{ ordenId: string }>();

  const [orden, setOrden] =
    useState<MiOrdenDetalleConCargo | null>(null);

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(async () => {
    const ordenIdNumero =
      Number(ordenId);

    if (!Number.isInteger(ordenIdNumero) ||
        ordenIdNumero <= 0)
    {
      setOrden(null);
      setLoading(false);

      Alert.alert(
        "Error",
        "El identificador de la orden no es válido."
      );

      return;
    }

    try {
      setLoading(true);

      const data =
        await getMiOrdenDetalleApi(
          ordenIdNumero
        );

      setOrden(
        data as MiOrdenDetalleConCargo
      );
    } catch (e: any) {
      setOrden(null);

      Alert.alert(
        "Error",
        obtenerMensajeError(
          e,
          "No se pudo cargar la orden."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let activo = true;

    async function setupRealtime() {
      if (!user?.userId) return;

      const token =
        await getToken();

      if (!token || !activo) return;

      await connectRealtime(
        user.userId,
        token,
        {
          onOrdenConfirmada: (data) => {
            if (
              activo &&
              Number(data.ordenId) ===
                Number(ordenId)
            ) {
              load();
            }
          },
        }
      );
    }

    setupRealtime().catch((error) => {
      console.log(
        "Realtime order detail error:",
        error
      );
    });

    return () => {
      activo = false;
    };
  }, [
    user?.userId,
    ordenId,
    load,
  ]);

  if (loading) {
    return (
      <RoleGuard
        allowedRoles={[
          "Usuario",
          "RRPP",
          "Admin",
          "SuperAdmin",
        ]}
      >
        <AppLayout title="Orden">
          <ActivityIndicator
            color="#E50914"
            style={styles.loader}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!orden) {
    return (
      <RoleGuard
        allowedRoles={[
          "Usuario",
          "RRPP",
          "Admin",
          "SuperAdmin",
        ]}
      >
        <AppLayout title="Orden">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Orden no encontrada.
            </Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  const confirmada =
    orden.estado === "Confirmada";

  const cantidadTickets =
    Number(orden.cantidadTickets ?? 0);

  const subtotalOrden =
    Number(orden.subtotal ?? 0);

  const cargoServicioUnitario =
    Number(
      orden.cargoServicioUnitario ?? 0
    );

  const cargoServicioTotal =
    Number(
      orden.cargoServicioMonto ?? 0
    );

  const totalOrden =
    Number(orden.total ?? 0);

  const mostrarCargoServicio =
    cargoServicioTotal > 0 &&
    cargoServicioUnitario > 0 &&
    cantidadTickets > 0;

  const montosConsistentes =
    Math.abs(
      subtotalOrden +
        cargoServicioTotal -
        totalOrden
    ) < 0.01;

  return (
    <RoleGuard
      allowedRoles={[
        "Usuario",
        "RRPP",
        "Admin",
        "SuperAdmin",
      ]}
    >
      <AppLayout
        title={`Orden #${orden.id}`}
      >
        <View style={styles.card}>
          {orden.bannerUrl ? (
            <Image
              source={{
                uri: orden.bannerUrl,
              }}
              style={styles.banner}
            />
          ) : null}

          <Text style={styles.title}>
            {orden.evento}
          </Text>

          <Text style={styles.muted}>
            {orden.lugar}
          </Text>

          <Text style={styles.muted}>
            {orden.direccion}
          </Text>

          <Text style={styles.muted}>
            Evento:{" "}
            {formatDate(
              orden.fechaEvento
            )}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            Resumen de la orden
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>
              Subtotal de entradas
            </Text>

            <Text style={styles.amountValue}>
              {formatMoney(
                subtotalOrden
              )}
            </Text>
          </View>

          {mostrarCargoServicio ? (
            <View style={styles.serviceBlock}>
              <View style={styles.amountRow}>
                <View
                  style={
                    styles.amountDescription
                  }
                >
                  <Text
                    style={
                      styles.amountLabel
                    }
                  >
                    {orden
                      .cargoServicioDescripcion ||
                      "Cargo por servicio"}
                  </Text>

                  <Text
                    style={
                      styles.amountDetail
                    }
                  >
                    {cantidadTickets}{" "}
                    {cantidadTickets === 1
                      ? "ticket"
                      : "tickets"}{" "}
                    ×{" "}
                    {formatMoney(
                      cargoServicioUnitario
                    )}
                  </Text>
                </View>

                <Text
                  style={styles.amountValue}
                >
                  {formatMoney(
                    cargoServicioTotal
                  )}
                </Text>
              </View>

              <Text
                style={styles.serviceHelp}
              >
                El cargo por servicio se
                aplica individualmente a
                cada ticket incluido en la
                orden.
              </Text>
            </View>
          ) : null}

          <View
            style={styles.totalDivider}
          />

          <View style={styles.totalRow}>
            <Text
              style={styles.summaryLabel}
            >
              Total de la orden
            </Text>

            <Text style={styles.total}>
              {formatMoney(totalOrden)}
            </Text>
          </View>

          {!montosConsistentes ? (
            <View
              style={
                styles.inconsistencyBox
              }
            >
              <Text
                style={
                  styles.inconsistencyText
                }
              >
                Los montos informados por
                la orden no coinciden.
                Actualizá la pantalla o
                contactá al soporte.
              </Text>
            </View>
          ) : null}

          <Text
            style={getEstadoStyle(
              orden.estado
            )}
          >
            Estado: {orden.estado}
          </Text>

          <Text style={styles.muted}>
            RRPP: {orden.rrpp}
          </Text>

          <Text style={styles.muted}>
            Creada:{" "}
            {formatDate(
              orden.fechaCreacion
            )}
          </Text>

          {orden.fechaConfirmacion ? (
            <Text style={styles.muted}>
              Confirmada:{" "}
              {formatDate(
                orden.fechaConfirmacion
              )}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>
          Entradas de la orden
        </Text>

        {orden.items.map(
          (
            item,
            index
          ) => {
            const precioEntrada =
              Number(
                item.precioUnitario ??
                  0
              );

            const subtotalTicket =
              Number(
                item.subtotal ??
                  precioEntrada
              );

            const cargoTicket =
              Number(
                item
                  .cargoServicioMonto ??
                  0
              );

            const totalTicket =
              Number(
                item.totalTicket ??
                  subtotalTicket +
                    cargoTicket
              );

            return (
              <View
                key={item.id}
                style={styles.itemCard}
              >
                <View
                  style={styles.itemHeader}
                >
                  {item.imagenUrl ? (
                    <Image
                      source={{
                        uri: item.imagenUrl,
                      }}
                      style={
                        styles.itemImage
                      }
                    />
                  ) : null}

                  <View
                    style={
                      styles.itemContent
                    }
                  >
                    <Text
                      style={
                        styles.itemTitle
                      }
                    >
                      {item.tipoEntrada}
                    </Text>

                    <Text
                      style={
                        styles.ticketNumber
                      }
                    >
                      Ticket{" "}
                      {index + 1} de{" "}
                      {cantidadTickets}
                    </Text>

                    {item.esCombo ? (
                      <View
                        style={
                          styles.comboBadge
                        }
                      >
                        <Text
                          style={
                            styles.comboBadgeText
                          }
                        >
                          Combo para{" "}
                          {
                            item.cantidadPersonas
                          }{" "}
                          personas
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View
                  style={
                    styles.ticketAmountBox
                  }
                >
                  <View
                    style={
                      styles.ticketAmountRow
                    }
                  >
                    <Text
                      style={
                        styles.ticketAmountLabel
                      }
                    >
                      Precio de la entrada
                    </Text>

                    <Text
                      style={
                        styles.ticketAmountValue
                      }
                    >
                      {formatMoney(
                        subtotalTicket
                      )}
                    </Text>
                  </View>

                  {cargoTicket > 0 ? (
                    <View
                      style={
                        styles.ticketAmountRowSpaced
                      }
                    >
                      <Text
                        style={
                          styles.ticketAmountLabel
                        }
                      >
                        Cargo por servicio
                      </Text>

                      <Text
                        style={
                          styles.ticketAmountValue
                        }
                      >
                        {formatMoney(
                          cargoTicket
                        )}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={
                      styles.ticketTotalRow
                    }
                  >
                    <Text
                      style={
                        styles.ticketTotalLabel
                      }
                    >
                      Total de este ticket
                    </Text>

                    <Text
                      style={
                        styles.ticketTotalValue
                      }
                    >
                      {formatMoney(
                        totalTicket
                      )}
                    </Text>
                  </View>
                </View>

                <Text style={styles.muted}>
                  Asignado:{" "}
                  {item.usuarioAsignado ??
                    item.nombreInvitado ??
                    item.emailInvitado ??
                    "Pendiente"}
                </Text>

                {item.emailInvitado ? (
                  <Text
                    style={styles.muted}
                  >
                    Email:{" "}
                    {item.emailInvitado}
                  </Text>
                ) : null}

                {item.ticketId ? (
                  <Text
                    style={
                      styles.ticketCreated
                    }
                  >
                    Ticket generado
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.ticketPending
                    }
                  >
                    Ticket pendiente hasta
                    confirmar pago
                  </Text>
                )}
              </View>
            );
          }
        )}

        {orden.rrppTelefono ? (
          <Pressable
            style={
              styles.whatsappButton
            }
            onPress={() =>
              openWhatsapp(
                orden.rrppTelefono,
                orden.rrppNombre
              )
            }
          >
            <Text
              style={
                styles.whatsappText
              }
            >
              Contactar a tu RRPP
            </Text>
          </Pressable>
        ) : null}

        {confirmada ? (
          <Pressable
            style={
              styles.primaryButton
            }
            onPress={() =>
              router.push(
                "/user/tickets" as never
              )
            }
          >
            <Text
              style={styles.primaryText}
            >
              Ver mis entradas
            </Text>
          </Pressable>
        ) : (
          <View
            style={styles.warningBox}
          >
            <Text
              style={styles.warningText}
            >
              Tu orden está pendiente. El
              RRPP debe confirmar el pago
              para que se generen tus
              tickets.
            </Text>
          </View>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function obtenerMensajeError(
  error: any,
  fallback: string
) {
  const data =
    error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    return String(
      data.message ??
        data.error ??
        fallback
    );
  }

  return fallback;
}

function getEstadoStyle(
  estado: string
) {
  if (estado === "Confirmada") {
    return styles.confirmada;
  }

  if (
    estado === "PendientePago"
  ) {
    return styles.pendiente;
  }

  if (estado === "Cancelada") {
    return styles.cancelada;
  }

  if (estado === "Vencida") {
    return styles.vencida;
  }

  return styles.pendiente;
}

const styles =
  StyleSheet.create({
    loader: {
      marginTop: 40,
    },
    card: {
      backgroundColor:
        "rgba(255,255,255,0.07)",
      padding: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
      marginBottom: 14,
    },
    banner: {
      width: "100%",
      height: 150,
      borderRadius: 18,
      marginBottom: 14,
      backgroundColor: "#1A1A1A",
    },
    title: {
      color: "#FFFFFF",
      fontSize: 23,
      fontWeight: "900",
    },
    muted: {
      color: "#BDBDBD",
      marginTop: 5,
    },
    summaryCard: {
      backgroundColor:
        "rgba(229,9,20,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(229,9,20,0.25)",
      padding: 18,
      borderRadius: 24,
      marginBottom: 16,
    },
    summaryTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 14,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      gap: 12,
    },
    amountDescription: {
      flex: 1,
    },
    amountLabel: {
      color: "#D0D0D0",
      fontWeight: "700",
    },
    amountDetail: {
      color: "#A8A8A8",
      fontSize: 13,
      marginTop: 4,
    },
    amountValue: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
    serviceBlock: {
      marginTop: 13,
    },
    serviceHelp: {
      color: "#BDBDBD",
      fontSize: 12,
      lineHeight: 17,
      marginTop: 8,
    },
    totalDivider: {
      height: 1,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      marginVertical: 16,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent:
        "space-between",
      gap: 12,
    },
    summaryLabel: {
      color: "#D0D0D0",
      fontWeight: "800",
      flex: 1,
    },
    total: {
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "900",
    },
    inconsistencyBox: {
      backgroundColor:
        "rgba(255,77,87,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(255,77,87,0.30)",
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },
    inconsistencyText: {
      color: "#FF7A82",
      fontWeight: "800",
      lineHeight: 18,
    },
    pendiente: {
      color: "#FFD166",
      marginTop: 12,
      fontWeight: "900",
    },
    confirmada: {
      color: "#20D67B",
      marginTop: 12,
      fontWeight: "900",
    },
    cancelada: {
      color: "#FF4D57",
      marginTop: 12,
      fontWeight: "900",
    },
    vencida: {
      color: "#FF8C42",
      marginTop: 12,
      fontWeight: "900",
    },
    sectionTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 12,
    },
    itemCard: {
      backgroundColor:
        "rgba(255,255,255,0.07)",
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
      marginBottom: 12,
    },
    itemHeader: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 10,
    },
    itemContent: {
      flex: 1,
    },
    itemImage: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: "#1A1A1A",
    },
    itemTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },
    ticketNumber: {
      color: "#A8A8A8",
      fontSize: 13,
      marginTop: 4,
      fontWeight: "700",
    },
    comboBadge: {
      alignSelf: "flex-start",
      backgroundColor:
        "rgba(229,9,20,0.16)",
      borderWidth: 1,
      borderColor:
        "rgba(229,9,20,0.30)",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 8,
    },
    comboBadgeText: {
      color: "#FF737A",
      fontSize: 12,
      fontWeight: "900",
    },
    ticketAmountBox: {
      backgroundColor:
        "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.08)",
      borderRadius: 15,
      padding: 12,
      marginBottom: 10,
    },
    ticketAmountRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 12,
    },
    ticketAmountRowSpaced: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 12,
      marginTop: 9,
    },
    ticketAmountLabel: {
      color: "#BDBDBD",
      flex: 1,
    },
    ticketAmountValue: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    ticketTotalRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 12,
      marginTop: 9,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor:
        "rgba(255,255,255,0.08)",
    },
    ticketTotalLabel: {
      color: "#FFFFFF",
      flex: 1,
      fontWeight: "800",
    },
    ticketTotalValue: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
    ticketCreated: {
      color: "#20D67B",
      marginTop: 10,
      fontWeight: "900",
    },
    ticketPending: {
      color: "#FFD166",
      marginTop: 10,
      fontWeight: "900",
    },
    primaryButton: {
      backgroundColor: "#E50914",
      padding: 14,
      borderRadius: 18,
      alignItems: "center",
      marginTop: 14,
    },
    primaryText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
    warningBox: {
      backgroundColor:
        "rgba(255,209,102,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(255,209,102,0.25)",
      padding: 16,
      borderRadius: 20,
      marginTop: 14,
    },
    warningText: {
      color: "#FFD166",
      fontWeight: "800",
      lineHeight: 20,
    },
    emptyCard: {
      backgroundColor:
        "rgba(255,255,255,0.07)",
      padding: 16,
      borderRadius: 22,
    },
    emptyText: {
      color: "#BDBDBD",
    },
    whatsappButton: {
      backgroundColor:
        "rgba(37,211,102,0.15)",
      borderWidth: 1,
      borderColor:
        "rgba(37,211,102,0.45)",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 18,
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    whatsappText: {
      color: "#25D366",
      fontSize: 15,
      fontWeight: "900",
    },
  });