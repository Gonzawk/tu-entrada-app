import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  actualizarBebidaEventoApi,
  asignarBebidasMasivoEventoApi,
  getCatalogoAdminParaEventoApi,
} from "../../../api/drinksApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { BebidaDisponibleParaEvento } from "../../../types/drinks";
import { formatMoney } from "../../../utils/formatMoney";

type ApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (typeof data === "string") return data;

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.title === "string") {
      return record.title;
    }
  }

  return apiError.message ?? fallback;
}

const PAGE_SIZE = 20;

export default function AdminEventDrinksScreen() {
  const { eventoId } =
    useLocalSearchParams<{ eventoId: string }>();

  const id = Number(eventoId);

  const [bebidas, setBebidas] =
    useState<BebidaDisponibleParaEvento[]>([]);

  const [seleccionadas, setSeleccionadas] =
    useState<Record<number, boolean>>({});

  const [preciosEvento, setPreciosEvento] =
    useState<Record<number, string>>({});

  const [manejaStockEvento, setManejaStockEvento] =
    useState<Record<number, boolean>>({});

  const [stockAsignadoEvento, setStockAsignadoEvento] =
    useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] =
    useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search.trim()),
      450
    );

    return () => clearTimeout(timeout);
  }, [search]);

  const syncLocalState = useCallback(
    (items: BebidaDisponibleParaEvento[]) => {
      setSeleccionadas((prev) => {
        const next = { ...prev };

        items.forEach((x) => {
          next[x.bebidaProductoId] =
            x.asignadaAlEvento
              ? x.disponibleEnEvento
              : false;
        });

        return next;
      });

      setPreciosEvento((prev) => {
        const next = { ...prev };

        items.forEach((x) => {
          next[x.bebidaProductoId] =
            x.precioEvento != null
              ? String(x.precioEvento)
              : "";
        });

        return next;
      });

      setManejaStockEvento((prev) => {
        const next = { ...prev };

        items.forEach((x) => {
          next[x.bebidaProductoId] =
            Boolean(x.manejaStockEvento);
        });

        return next;
      });

      setStockAsignadoEvento((prev) => {
        const next = { ...prev };

        items.forEach((x) => {
          next[x.bebidaProductoId] =
            x.manejaStockEvento
              ? String(x.stockAsignadoEvento ?? 0)
              : "0";
        });

        return next;
      });
    },
    []
  );

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await getCatalogoAdminParaEventoApi({
            eventoId: id,
            page: 1,
            pageSize: PAGE_SIZE,
            search: debouncedSearch,
          });

        const items = result.items ?? [];

        setBebidas(items);
        syncLocalState(items);
        setPage(1);
        setHasNextPage(
          Boolean(result.hasNextPage)
        );
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(
            error,
            "No se pudieron cargar bebidas."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, id, syncLocalState]
  );

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setLoading(false);

      Alert.alert(
        "Error",
        "El evento indicado no es válido."
      );

      return;
    }

    void loadFirstPage(false);
  }, [id, loadFirstPage]);

  async function loadNextPage() {
    if (
      loading ||
      loadingMore ||
      !hasNextPage
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result =
        await getCatalogoAdminParaEventoApi({
          eventoId: id,
          page: nextPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

      const nuevos = result.items ?? [];

      setBebidas((prev) => {
        const ids = new Set(
          prev.map((x) => x.bebidaProductoId)
        );

        return [
          ...prev,
          ...nuevos.filter(
            (x) =>
              !ids.has(x.bebidaProductoId)
          ),
        ];
      });

      syncLocalState(nuevos);

      setPage(nextPage);
      setHasNextPage(
        Boolean(result.hasNextPage)
      );
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(
          error,
          "No se pudieron cargar más bebidas."
        )
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function obtenerStockAsignado(
    bebidaProductoId: number
  ): number {
    const raw =
      stockAsignadoEvento[
        bebidaProductoId
      ]?.trim() ?? "";

    if (!raw) return 0;

    return Number(raw.replace(",", "."));
  }

  function validarConfiguracion(
    bebida: BebidaDisponibleParaEvento
  ) {
    const bebidaProductoId =
      bebida.bebidaProductoId;

    const precioTexto =
      preciosEvento[
        bebidaProductoId
      ]?.trim();

    const precioEvento =
      precioTexto
        ? Number(
            precioTexto.replace(",", ".")
          )
        : null;

    if (
      precioEvento != null &&
      (
        Number.isNaN(precioEvento) ||
        precioEvento < 0
      )
    ) {
      throw new Error(
        `Precio inválido para ${bebida.nombre}.`
      );
    }

    const manejaStock =
      Boolean(
        manejaStockEvento[
          bebidaProductoId
        ]
      );

    if (
      manejaStock &&
      !bebida.manejaStockGlobal
    ) {
      throw new Error(
        `${bebida.nombre} no tiene control de stock global habilitado.`
      );
    }

    const stockAsignado =
      manejaStock
        ? obtenerStockAsignado(
            bebidaProductoId
          )
        : 0;

    if (
      manejaStock &&
      (
        !Number.isInteger(stockAsignado) ||
        stockAsignado <= 0
      )
    ) {
      throw new Error(
        `Ingresá un stock promocional válido para ${bebida.nombre}.`
      );
    }

    /*
     * Para nuevas asignaciones no podemos reservar
     * más stock del disponible global.
     *
     * En edición el backend valida diferencias
     * y unidades ya vendidas/reservadas.
     */
    if (
      manejaStock &&
      !bebida.asignadaAlEvento &&
      stockAsignado >
        bebida.stockDisponibleGlobal
    ) {
      throw new Error(
        `No hay stock suficiente de ${bebida.nombre}. ` +
          `Disponible global: ${bebida.stockDisponibleGlobal}.`
      );
    }

    return {
      precioEvento,
      manejaStock,
      stockAsignado,
    };
  }

  async function guardarCambios() {
    try {
      setSaving(true);

      const seleccionadasActuales =
        bebidas.filter(
          (x) =>
            seleccionadas[
              x.bebidaProductoId
            ]
        );

      if (
        seleccionadasActuales.length === 0
      ) {
        Alert.alert(
          "Sin selección",
          "Seleccioná al menos una bebida."
        );

        return;
      }

      const nuevas =
        seleccionadasActuales.filter(
          (x) => !x.asignadaAlEvento
        );

      const existentes =
        seleccionadasActuales.filter(
          (x) =>
            x.asignadaAlEvento &&
            x.bebidaEventoId != null
        );

      /*
       * Nuevas asignaciones:
       * se envían juntas al endpoint masivo.
       */
      if (nuevas.length > 0) {
        const items =
          nuevas.map((x) => {
            const config =
              validarConfiguracion(x);

            return {
              bebidaProductoId:
                x.bebidaProductoId,

              precioEvento:
                config.precioEvento,

              disponible: true,

              manejaStock:
                config.manejaStock,

              stockAsignado:
                config.stockAsignado,
            };
          });

        await asignarBebidasMasivoEventoApi(
          id,
          items
        );
      }

      /*
       * Configuraciones existentes:
       * se actualizan individualmente porque el
       * backend calcula diferencias de stock,
       * devoluciones y reservas pendientes.
       */
      for (const bebida of existentes) {
        if (!bebida.bebidaEventoId) {
          continue;
        }

        const config =
          validarConfiguracion(bebida);

        await actualizarBebidaEventoApi(
          bebida.bebidaEventoId,
          {
            precioEvento:
              config.precioEvento,

            disponible: true,

            activo: true,

            manejaStock:
              config.manejaStock,

            stockAsignado:
              config.stockAsignado,
          }
        );
      }

      Alert.alert(
        "Correcto",
        "Bebidas actualizadas para el evento."
      );

      await loadFirstPage(true);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(
          error,
          "No se pudo guardar."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function renderBebida({
    item,
  }: {
    item: BebidaDisponibleParaEvento;
  }) {
    const selected =
      Boolean(
        seleccionadas[
          item.bebidaProductoId
        ]
      );

    const controlaStockEvento =
      Boolean(
        manejaStockEvento[
          item.bebidaProductoId
        ]
      );

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.imagenUrl ? (
            <Image
              source={{
                uri: item.imagenUrl,
              }}
              style={styles.image}
            />
          ) : (
            <View
              style={styles.imageEmpty}
            >
              <Text
                style={styles.imageEmoji}
              >
                🍹
              </Text>
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.title}>
              {item.nombre}
            </Text>

            <Text style={styles.muted}>
              {item.descripcion ??
                "Sin descripción"}
            </Text>

            <Text style={styles.price}>
              Base:{" "}
              {formatMoney(
                item.precioBase
              )}
            </Text>

            <Text
              style={
                item.manejaStockGlobal
                  ? styles.stockActive
                  : styles.stockInactive
              }
            >
              {item.manejaStockGlobal
                ? `Stock global libre: ${item.stockDisponibleGlobal}`
                : "Sin control de stock global"}
            </Text>

            {item.asignadaAlEvento ? (
              <>
                <Text
                  style={styles.active}
                >
                  Ya asignada al evento
                </Text>

                {item.manejaStockEvento ? (
                  <Text
                    style={
                      styles.eventStock
                    }
                  >
                    Stock evento:{" "}
                    {item.stockDisponibleEvento}{" "}
                    disponibles de{" "}
                    {item.stockAsignadoEvento}{" "}
                    asignadas
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>
                No asignada todavía
              </Text>
            )}
          </View>
        </View>

        <Pressable
          style={
            selected
              ? styles.selectedButton
              : styles.selectButton
          }
          onPress={() =>
            setSeleccionadas((prev) => ({
              ...prev,
              [item.bebidaProductoId]:
                !selected,
            }))
          }
        >
          <Text style={styles.buttonText}>
            {selected
              ? "Seleccionada para este evento"
              : "Agregar al evento"}
          </Text>
        </Pressable>

        {selected ? (
          <View
            style={styles.configurationBox}
          >
            <Text style={styles.label}>
              Precio especial del evento
              (opcional)
            </Text>

            <TextInput
              placeholder={`Usar base ${formatMoney(
                item.precioBase
              )}`}
              placeholderTextColor="#888"
              value={
                preciosEvento[
                  item.bebidaProductoId
                ] ?? ""
              }
              onChangeText={(value) =>
                setPreciosEvento(
                  (prev) => ({
                    ...prev,
                    [item.bebidaProductoId]:
                      value,
                  })
                )
              }
              keyboardType="numeric"
              style={styles.input}
            />

            {item.manejaStockGlobal ? (
              <>
                <Pressable
                  style={
                    controlaStockEvento
                      ? styles.toggleOn
                      : styles.toggleOff
                  }
                  onPress={() => {
                    const next =
                      !controlaStockEvento;

                    setManejaStockEvento(
                      (prev) => ({
                        ...prev,
                        [item.bebidaProductoId]:
                          next,
                      })
                    );

                    if (!next) {
                      setStockAsignadoEvento(
                        (prev) => ({
                          ...prev,
                          [item.bebidaProductoId]:
                            "0",
                        })
                      );
                    }
                  }}
                >
                  <Text
                    style={
                      styles.buttonText
                    }
                  >
                    {controlaStockEvento
                      ? "Promoción con stock limitado"
                      : "Precio sin cupo promocional propio"}
                  </Text>
                </Pressable>

                {controlaStockEvento ? (
                  <>
                    <Text
                      style={styles.label}
                    >
                      Stock total asignado a
                      esta promoción
                    </Text>

                    <TextInput
                      placeholder="Ej: 10"
                      placeholderTextColor="#888"
                      value={
                        stockAsignadoEvento[
                          item
                            .bebidaProductoId
                        ] ?? "0"
                      }
                      onChangeText={(
                        value
                      ) =>
                        setStockAsignadoEvento(
                          (prev) => ({
                            ...prev,
                            [item.bebidaProductoId]:
                              value,
                          })
                        )
                      }
                      keyboardType="numeric"
                      style={styles.input}
                    />

                    <Text
                      style={styles.helper}
                    >
                      {item.asignadaAlEvento
                        ? "El backend calculará cuánto stock debe tomar o devolver según la asignación actual y las unidades ya vendidas/reservadas."
                        : `Podés asignar hasta ${item.stockDisponibleGlobal} unidades del stock global libre.`}
                    </Text>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.helper}>
                Para limitar unidades a
                precio promocional, primero
                activá el control de stock
                global en la bebida.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  const selectedCount = useMemo(
    () =>
      Object.values(
        seleccionadas
      ).filter(Boolean).length,
    [seleccionadas]
  );

  return (
    <RoleGuard
      allowedRoles={[
        "Admin",
        "SuperAdmin",
      ]}
    >
      <AppLayout
        title="Bebidas del evento"
        scroll={false}
      >
        <View style={styles.screen}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Catálogo del evento
            </Text>

            <Text style={styles.infoText}>
              Seleccioná bebidas, definí
              precios especiales y, si
              corresponde, reservá una
              cantidad limitada de stock
              para la promoción.
            </Text>

            <Text style={styles.infoMeta}>
              Seleccionadas: {selectedCount}
            </Text>
          </View>

          <TextInput
            placeholder="Buscar bebida..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            style={styles.searchInput}
          />

          <Pressable
            style={[
              styles.saveButton,
              saving &&
                styles.disabledButton,
            ]}
            onPress={guardarCambios}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={styles.buttonText}
              >
                Guardar bebidas
                seleccionadas
              </Text>
            )}
          </Pressable>

          {loading ? (
            <View
              style={styles.loadingBox}
            >
              <ActivityIndicator
                color="#E50914"
              />
            </View>
          ) : (
            <FlatList
              data={bebidas}
              keyExtractor={(item) =>
                String(
                  item.bebidaProductoId
                )
              }
              renderItem={renderBebida}
              showsVerticalScrollIndicator={
                false
              }
              onEndReached={() =>
                void loadNextPage()
              }
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() =>
                    void loadFirstPage(
                      true
                    )
                  }
                  tintColor="#E50914"
                  colors={["#E50914"]}
                />
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    color="#E50914"
                    style={{
                      marginVertical: 20,
                    }}
                  />
                ) : null
              }
              ListEmptyComponent={
                <View
                  style={styles.emptyCard}
                >
                  <Text
                    style={styles.emptyText}
                  >
                    No hay bebidas para
                    mostrar.
                  </Text>
                </View>
              }
              contentContainerStyle={{
                paddingBottom: 24,
                flexGrow:
                  bebidas.length === 0
                    ? 1
                    : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    backgroundColor:
      "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(229,9,20,0.25)",
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  },

  infoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  infoText: {
    color: "#D0D0D0",
    marginTop: 6,
    lineHeight: 19,
  },

  infoMeta: {
    color: "#FFFFFF",
    marginTop: 8,
    fontWeight: "800",
  },

  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  saveButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },

  card: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    padding: 14,
    borderRadius: 22,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  productInfo: {
    flex: 1,
  },

  image: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },

  imageEmpty: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  imageEmoji: {
    fontSize: 26,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },

  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },

  price: {
    color: "#fff",
    marginTop: 8,
    fontWeight: "900",
  },

  active: {
    color: "#20D67B",
    marginTop: 6,
    fontWeight: "900",
  },

  stockActive: {
    color: "#20D67B",
    marginTop: 5,
    fontWeight: "800",
  },

  stockInactive: {
    color: "#9A9A9A",
    marginTop: 5,
    fontWeight: "800",
  },

  eventStock: {
    color: "#FFD166",
    marginTop: 5,
    fontWeight: "800",
  },

  selectedButton: {
    backgroundColor:
      "rgba(32,214,123,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  selectButton: {
    backgroundColor:
      "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  configurationBox: {
    marginTop: 12,
    gap: 8,
  },

  label: {
    color: "#fff",
    fontWeight: "800",
  },

  input: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    color: "#fff",
  },

  toggleOn: {
    backgroundColor:
      "rgba(32,214,123,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  toggleOff: {
    backgroundColor:
      "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  helper: {
    color: "#AFAFAF",
    fontSize: 12,
    lineHeight: 18,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "900",
  },

  emptyCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor:
      "rgba(255,255,255,0.07)",
  },

  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },
});