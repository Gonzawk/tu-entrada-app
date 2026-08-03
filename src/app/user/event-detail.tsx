import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getEntradasDisponiblesApi,
  getEventoDetalleApi,
} from "../../api/eventsApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import {
  getEventDetailCache,
  saveEventDetailCache,
} from "../../storage/eventsCache";
import {
  EntradaDisponible,
  EventoActivo,
} from "../../types/events";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

function formatHorarioIngreso(
  entrada: EntradaDisponible
) {
  if (!entrada.tieneHorarioIngreso) {
    return "Ingreso habilitado durante todo el evento.";
  }

  const desde =
    entrada.horaIngresoDesde?.slice(0, 5);

  const hasta =
    entrada.horaIngresoHasta?.slice(0, 5);

  if (desde && hasta) {
    return `Ingreso permitido de ${desde} a ${hasta}.`;
  }

  if (desde) {
    return `Ingreso permitido desde las ${desde}.`;
  }

  if (hasta) {
    return `Ingreso permitido hasta las ${hasta}.`;
  }

  return "Ingreso habilitado durante todo el evento.";
}

function obtenerTextoDisponibilidad(
  entrada: EntradaDisponible
) {
  const tanda = entrada.tandaActual;

  if (!tanda) {
    return "Sin tanda disponible";
  }

  if (tanda.textoDisponibilidad) {
    return tanda.textoDisponibilidad;
  }

  const unidadesDisponibles =
    Number(tanda.unidadesDisponibles ?? 0);

  if (unidadesDisponibles <= 0) {
    return entrada.esCombo
      ? "No hay combos disponibles"
      : "No hay entradas disponibles";
  }

  const unidad =
    entrada.esCombo
      ? unidadesDisponibles === 1
        ? "combo"
        : "combos"
      : unidadesDisponibles === 1
        ? "entrada"
        : "entradas";

  return `${unidadesDisponibles} ${unidad} disponibles`;
}

export default function EventDetailScreen() {
  const { eventoId } =
    useLocalSearchParams<{ eventoId: string }>();

  const { user } = useAuth();

  const [evento, setEvento] =
    useState<EventoActivo | null>(null);

  const [entradas, setEntradas] =
    useState<EntradaDisponible[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadData = useCallback(
    async (showInitialLoading = true) => {
      try {
        if (showInitialLoading) {
          setLoading(true);
        }

        const id = Number(eventoId);

        if (!Number.isInteger(id) || id <= 0) {
          setEvento(null);
          setEntradas([]);
          return;
        }

        if (showInitialLoading) {
          const cached =
            await getEventDetailCache(id);

          if (cached) {
            setEvento(
              cached.evento as EventoActivo
            );

            setEntradas(
              cached.entradas as EntradaDisponible[]
            );

            setLoading(false);
          }
        }

        const [
          eventoData,
          entradasData,
        ] = await Promise.all([
          getEventoDetalleApi(id),
          getEntradasDisponiblesApi(id),
        ]);

        const eventoNormalizado =
          eventoData as EventoActivo;

        const entradasNormalizadas =
          entradasData as EntradaDisponible[];

        setEvento(eventoNormalizado);
        setEntradas(entradasNormalizadas);

        await saveEventDetailCache(id, {
          evento: eventoNormalizado,
          entradas: entradasNormalizadas,
        });
      } catch (error) {
        console.log(
          "Error loading event detail:",
          error
        );
      } finally {
        if (showInitialLoading) {
          setLoading(false);
        }
      }
    },
    [eventoId]
  );

  const refreshEntradas =
    useCallback(async () => {
      const id = Number(eventoId);

      if (!Number.isInteger(id) || id <= 0) {
        return;
      }

      try {
        const entradasData =
          await getEntradasDisponiblesApi(id);

        const entradasNormalizadas =
          entradasData as EntradaDisponible[];

        setEntradas(entradasNormalizadas);

        if (evento) {
          await saveEventDetailCache(id, {
            evento,
            entradas:
              entradasNormalizadas,
          });
        }
      } catch (error) {
        console.log(
          "Error refreshing available tickets:",
          error
        );
      }
    }, [eventoId, evento]);

  const onRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);
        await loadData(false);
      } finally {
        setRefreshing(false);
      }
    }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let mounted = true;

    async function setupRealtime() {
      if (!user?.userId) {
        return;
      }

      const token =
        await getToken();

      if (!token || !mounted) {
        return;
      }

      await connectRealtime(
        user.userId,
        token,
        {
          onStockActualizado:
            async (data) => {
              if (!mounted) {
                return;
              }

              if (
                Number(data.eventoId) !==
                Number(eventoId)
              ) {
                return;
              }

              await refreshEntradas();
            },
        }
      );
    }

    setupRealtime().catch((error) => {
      console.log(
        "Realtime event detail error:",
        error
      );
    });

    return () => {
      mounted = false;
    };
  }, [
    user?.userId,
    eventoId,
    refreshEntradas,
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
        <AppLayout title="Evento">
          <ActivityIndicator
            color="#E50914"
            style={styles.loader}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!evento) {
    return (
      <RoleGuard
        allowedRoles={[
          "Usuario",
          "RRPP",
          "Admin",
          "SuperAdmin",
        ]}
      >
        <AppLayout title="Evento">
          <Text style={styles.empty}>
            Evento no encontrado.
          </Text>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      allowedRoles={[
        "Usuario",
        "RRPP",
        "Admin",
        "SuperAdmin",
      ]}
    >
      <AppLayout title="Detalle">
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E50914"
              colors={["#E50914"]}
              progressBackgroundColor="#1A1A1A"
            />
          }
        >
          {evento.bannerUrl ? (
            <Image
              source={{
                uri: evento.bannerUrl,
              }}
              style={styles.banner}
            />
          ) : null}

          <Text style={styles.title}>
            {evento.nombre}
          </Text>

          {evento.lugar ? (
            <Text style={styles.place}>
              {evento.lugar}
            </Text>
          ) : null}

          <Text style={styles.date}>
            {formatDate(
              evento.fechaInicio
            )}
          </Text>

          {evento.descripcion ? (
            <Text
              style={styles.description}
            >
              {evento.descripcion}
            </Text>
          ) : null}

          <Pressable
            style={styles.drinksButton}
            onPress={() =>
              router.push({
                pathname:
                  "/user/drinks-catalog",
                params: {
                  eventoId: evento.id,
                },
              } as never)
            }
          >
            <Text
              style={
                styles.drinksButtonText
              }
            >
              Comprar bebidas
            </Text>
          </Pressable>

          <Text
            style={styles.sectionTitle}
          >
            Entradas disponibles
          </Text>

          {entradas.length === 0 ? (
            <Text style={styles.empty}>
              No hay entradas disponibles.
            </Text>
          ) : (
            entradas.map((entrada) => {
              const tanda =
                entrada.tandaActual;

              const unidadesDisponibles =
                Number(
                  tanda
                    ?.unidadesDisponibles ??
                    0
                );

              const tieneDisponibilidad =
                Boolean(
                  tanda?.tieneDisponibilidad
                );

              const sinStock =
                !tanda ||
                !tieneDisponibilidad ||
                unidadesDisponibles <= 0;

              const textoDisponibilidad =
                obtenerTextoDisponibilidad(
                  entrada
                );

              return (
                <View
                  key={entrada.id}
                  style={styles.ticketCard}
                >
                  {entrada.imagenUrl ? (
                    <Image
                      source={{
                        uri:
                          entrada.imagenUrl,
                      }}
                      style={
                        styles.ticketImage
                      }
                    />
                  ) : null}

                  <View
                    style={
                      styles.ticketContent
                    }
                  >
                    <Text
                      style={
                        styles.ticketName
                      }
                    >
                      {entrada.nombre}
                    </Text>

                    {entrada.descripcion ? (
                      <Text
                        style={
                          styles.ticketDescription
                        }
                      >
                        {
                          entrada.descripcion
                        }
                      </Text>
                    ) : null}

                    <Text
                      style={
                        entrada
                          .tieneHorarioIngreso
                          ? styles.accessTime
                          : styles.freeAccess
                      }
                    >
                      {formatHorarioIngreso(
                        entrada
                      )}
                    </Text>

                    {entrada
                      .incluyeBebidas ? (
                      <Text
                        style={
                          styles.benefit
                        }
                      >
                        Incluye:{" "}
                        {entrada
                          .descripcionBebidas ||
                          "Bebidas seleccionadas"}
                      </Text>
                    ) : null}

                    {entrada.esCombo ? (
                      <View
                        style={
                          styles.comboBadge
                        }
                      >
                        <Text
                          style={
                            styles.comboText
                          }
                        >
                          Combo para{" "}
                          {
                            entrada.cantidadPersonas
                          }{" "}
                          personas
                        </Text>
                      </View>
                    ) : null}

                    {tanda ? (
                      <>
                        <Text
                          style={
                            styles.price
                          }
                        >
                          {formatMoney(
                            tanda.precio
                          )}
                        </Text>

                        <Text
                          style={
                            sinStock
                              ? styles.noStock
                              : styles.stock
                          }
                        >
                          {
                            textoDisponibilidad
                          }
                        </Text>

                        {entrada.esCombo &&
                        !sinStock ? (
                          <Text
                            style={
                              styles.stockDetail
                            }
                          >
                            Cada combo utiliza{" "}
                            {tanda.cuposPorUnidad}{" "}
                            cupos del evento.
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <Text
                        style={
                          styles.noStock
                        }
                      >
                        Sin tanda disponible
                      </Text>
                    )}

                    <Pressable
                      disabled={sinStock}
                      style={[
                        styles.buyButton,
                        sinStock &&
                          styles.buyButtonDisabled,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname:
                            "/user/buy-ticket",
                          params: {
                            eventoId: String(
                              evento.id
                            ),
                            tandaEntradaId:
                              String(
                                tanda?.id
                              ),
                            entradaNombre:
                              entrada.nombre,
                            entradaImagenUrl:
                              entrada.imagenUrl ??
                              "",
                            cantidadPersonas:
                              String(
                                entrada
                                  .cantidadPersonas
                              ),
                            esCombo: String(
                              entrada.esCombo
                            ),
                            precio: String(
                              tanda?.precio ?? 0
                            ),
                            unidadesDisponibles:
                              String(
                                unidadesDisponibles
                              ),
                            cuposDisponibles:
                              String(
                                tanda
                                  ?.cuposDisponibles ??
                                  0
                              ),
                            cuposPorUnidad:
                              String(
                                tanda
                                  ?.cuposPorUnidad ??
                                  entrada
                                    .cantidadPersonas ??
                                  1
                              ),
                            incluyeBebidas:
                              String(
                                entrada
                                  .incluyeBebidas
                              ),
                            descripcionBebidas:
                              entrada
                                .descripcionBebidas ??
                              "",
                            tieneHorarioIngreso:
                              String(
                                entrada
                                  .tieneHorarioIngreso
                              ),
                            horaIngresoDesde:
                              entrada
                                .horaIngresoDesde ??
                              "",
                            horaIngresoHasta:
                              entrada
                                .horaIngresoHasta ??
                              "",
                          },
                        } as never)
                      }
                    >
                      <Text
                        style={
                          styles.buyButtonText
                        }
                      >
                        {sinStock
                          ? "No disponible"
                          : entrada.esCombo
                            ? "Comprar combo"
                            : "Comprar entrada"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </AppLayout>
    </RoleGuard>
  );
}

const styles =
  StyleSheet.create({
    loader: {
      marginTop: 60,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    banner: {
      width: "100%",
      height: 190,
      borderRadius: 24,
      backgroundColor: "#1A1A1A",
    },
    title: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "900",
      marginTop: 18,
    },
    place: {
      color: "#E50914",
      fontSize: 16,
      fontWeight: "800",
      marginTop: 6,
    },
    date: {
      color: "#BDBDBD",
      marginTop: 4,
    },
    description: {
      color: "#CFCFCF",
      marginTop: 16,
      lineHeight: 22,
    },
    sectionTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "900",
      marginTop: 28,
      marginBottom: 14,
    },
    ticketCard: {
      flexDirection: "row",
      gap: 14,
      backgroundColor:
        "rgba(255,255,255,0.07)",
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
      marginBottom: 14,
    },
    ticketImage: {
      width: 86,
      height: 86,
      borderRadius: 16,
      backgroundColor: "#1A1A1A",
    },
    ticketContent: {
      flex: 1,
    },
    ticketName: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "900",
    },
    ticketDescription: {
      color: "#BDBDBD",
      marginTop: 4,
    },
    accessTime: {
      color: "#FFD166",
      marginTop: 6,
      fontWeight: "900",
    },
    freeAccess: {
      color: "#BDBDBD",
      marginTop: 6,
      fontWeight: "700",
    },
    benefit: {
      color: "#20D67B",
      marginTop: 6,
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
    comboText: {
      color: "#FF737A",
      fontWeight: "900",
      fontSize: 12,
    },
    price: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 10,
    },
    stock: {
      color: "#20D67B",
      marginTop: 4,
      fontWeight: "900",
    },
    stockDetail: {
      color: "#AFAFAF",
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
    },
    noStock: {
      color: "#FF4D57",
      marginTop: 10,
      fontWeight: "800",
    },
    buyButton: {
      backgroundColor: "#E50914",
      paddingVertical: 11,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 12,
    },
    buyButtonDisabled: {
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },
    buyButtonText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
    empty: {
      color: "#FFFFFF",
      textAlign: "center",
      marginTop: 40,
    },
    drinksButton: {
      backgroundColor: "#E50914",
      padding: 15,
      borderRadius: 18,
      alignItems: "center",
      marginTop: 16,
      marginBottom: 18,
    },
    drinksButtonText: {
      color: "#FFFFFF",
      fontWeight: "900",
    },
  });