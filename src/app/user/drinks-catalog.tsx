import { createIdempotencyKey } from "@/utils/idempotency";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  InteractionManager,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  crearOrdenBebidasApi,
  getCatalogoBebidasApi,
} from "../../api/drinksApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BebidaCarritoItem, BebidaCatalogo } from "../../types/drinks";
import { formatMoney } from "../../utils/formatMoney";

const PAGE_SIZE = 20;

async function abrirCheckoutPago(checkoutUrl: string): Promise<void> {
  const url = checkoutUrl.trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("La URL de pago recibida no es válida.");
  }

  await Linking.openURL(url);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  if ("response" in error) {
    const response = (
      error as {
        response?: {
          data?: unknown;
        };
      }
    ).response;

    const data = response?.data;

    if (typeof data === "string") {
      return data;
    }

    if (data && typeof data === "object") {
      if (
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
      ) {
        return (data as { message: string }).message;
      }

      if (
        "title" in data &&
        typeof (data as { title?: unknown }).title === "string"
      ) {
        return (data as { title: string }).title;
      }
    }
  }

  if (
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export default function UserDrinksCatalogScreen() {
  const params =
    useLocalSearchParams<{ eventoId?: string | string[] }>();

  const rawEventoId = Array.isArray(params.eventoId)
    ? params.eventoId[0]
    : params.eventoId;

  const parsedEventoId = rawEventoId
    ? Number(rawEventoId)
    : undefined;

  const eventoId =
    parsedEventoId !== undefined &&
    Number.isInteger(parsedEventoId) &&
    parsedEventoId > 0
      ? parsedEventoId
      : undefined;

  const catalogoGeneral = eventoId === undefined;

  const [bebidas, setBebidas] = useState<BebidaCatalogo[]>([]);
  const [carrito, setCarrito] =
    useState<Record<number, BebidaCarritoItem>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [bebidaOrderKey, setBebidaOrderKey] = useState(() =>
    createIdempotencyKey("bebida-online"),
  );

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search.trim()),
      450,
    );

    return () => clearTimeout(timeout);
  }, [search]);

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await getCatalogoBebidasApi({
          eventoId,
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
        });

        setBebidas(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(
            error,
            "No se pudo cargar el catálogo de bebidas.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventoId, debouncedSearch],
  );

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadNextPage() {
    if (
      loading ||
      loadingMore ||
      refreshing ||
      !hasNextPage
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getCatalogoBebidasApi({
        eventoId,
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });

      setBebidas((current) => {
        const existingIds = new Set(
          current.map((item) => item.bebidaProductoId),
        );

        const newItems = (result.items ?? []).filter(
          (item) => !existingIds.has(item.bebidaProductoId),
        );

        return [...current, ...newItems];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(
          error,
          "No se pudieron cargar más bebidas.",
        ),
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function agregar(bebida: BebidaCatalogo) {
    if (catalogoGeneral) {
      Alert.alert(
        "Compra no disponible",
        "Podés consultar el catálogo general, pero las compras se habilitan cuando existe un evento publicado en curso o próximo.",
      );
      return;
    }

    if (!bebida.disponible) {
      Alert.alert(
        "Bebida no disponible",
        "Esta bebida no se encuentra disponible actualmente.",
      );
      return;
    }

    setCarrito((current) => {
      const existing = current[bebida.bebidaProductoId];

      return {
        ...current,
        [bebida.bebidaProductoId]: {
          ...bebida,
          cantidad: existing ? existing.cantidad + 1 : 1,
        },
      };
    });
  }

  function quitar(bebidaProductoId: number) {
    setCarrito((current) => {
      const existing = current[bebidaProductoId];

      if (!existing) {
        return current;
      }

      if (existing.cantidad <= 1) {
        const next = { ...current };
        delete next[bebidaProductoId];
        return next;
      }

      return {
        ...current,
        [bebidaProductoId]: {
          ...existing,
          cantidad: existing.cantidad - 1,
        },
      };
    });
  }

  function eliminarDelCarrito(bebidaProductoId: number) {
    setCarrito((current) => {
      const next = { ...current };
      delete next[bebidaProductoId];
      return next;
    });
  }

  const carritoItems = useMemo(
    () => Object.values(carrito),
    [carrito],
  );

  const total = useMemo(
    () =>
      carritoItems.reduce(
        (accumulator, item) =>
          accumulator + item.precio * item.cantidad,
        0,
      ),
    [carritoItems],
  );

  const cantidadTotal = useMemo(
    () =>
      carritoItems.reduce(
        (accumulator, item) =>
          accumulator + item.cantidad,
        0,
      ),
    [carritoItems],
  );

  async function esperarFinDeInteracciones() {
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve();
      });
    });
  }

  async function confirmarOrden() {
    if (!eventoId) {
      Alert.alert(
        "Compra no disponible",
        "Podés consultar el catálogo general, pero las compras de bebidas estarán habilitadas cuando exista un evento publicado en curso o próximo."
      );

      return;
    }

    if (carritoItems.length === 0) {
      Alert.alert(
        "Carrito vacío",
        "Agregá al menos una bebida."
      );

      return;
    }

    if (creatingOrder) {
      return;
    }

    let ordenCreadaId: number | null = null;

    try {
      setCreatingOrder(true);

      const ordenPago =
        await crearOrdenBebidasApi({
          eventoId,
          idempotencyKey: bebidaOrderKey,
          items: carritoItems.map((item) => ({
            bebidaProductoId: item.bebidaProductoId,
            cantidad: item.cantidad,
          })),
        });

      ordenCreadaId = ordenPago.ordenId;

      const checkoutUrl =
        ordenPago.checkoutUrl ??
        ordenPago.sandboxCheckoutUrl;

      if (!checkoutUrl) {
        setCarrito({});
        setCartOpen(false);
        setBebidaOrderKey(
          createIdempotencyKey("bebida-online")
        );

        Alert.alert(
          "Orden creada",
          "La orden fue creada correctamente, pero no se recibió la URL de pago. Podés continuar desde Mis órdenes."
        );

        router.push({
          pathname: "/user/drink-order-detail",
          params: {
            ordenId: String(ordenPago.ordenId),
          },
        } as never);

        return;
      }

      /*
       * La orden ya existe en backend.
       * En iOS cerramos primero el Modal y esperamos
       * a que termine su animación antes de presentar
       * SFSafariViewController mediante expo-web-browser.
       */
      setCarrito({});
      setCartOpen(false);
      setBebidaOrderKey(
        createIdempotencyKey("bebida-online")
      );

      await esperarFinDeInteracciones();

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

      try {
        await abrirCheckoutPago(checkoutUrl);

        if (__DEV__) {
          console.log("Checkout de Mercado Pago abierto en navegador externo.");
        }
      } catch (browserError) {
        console.log(
          "ERROR ABRIENDO MERCADO PAGO:",
          browserError
        );

        Alert.alert(
          "Orden creada",
          "Tu orden fue creada correctamente, pero no pudimos abrir Mercado Pago. Podés continuar el pago desde Mis órdenes."
        );
      }

      router.push({
        pathname: "/user/drink-order-detail",
        params: {
          ordenId: String(ordenPago.ordenId),
        },
      } as never);
    } catch (error: unknown) {
      console.log(
        "ERROR CREANDO ORDEN BEBIDA:",
        error
      );

      if (ordenCreadaId) {
        Alert.alert(
          "Orden creada",
          "La orden fue creada, pero ocurrió un problema al continuar con el pago. Revisala desde Mis órdenes."
        );

        router.push({
          pathname: "/user/drink-order-detail",
          params: {
            ordenId: String(ordenCreadaId),
          },
        } as never);

        return;
      }

      Alert.alert(
        "Error",
        getErrorMessage(
          error,
          "No se pudo crear la orden."
        )
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  function renderBebida({
    item,
  }: {
    item: BebidaCatalogo;
  }) {
    const cantidad =
      carrito[item.bebidaProductoId]?.cantidad ?? 0;

    const compraDeshabilitada =
      catalogoGeneral || !item.disponible;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.imagenUrl ? (
            <Image
              source={{ uri: item.imagenUrl }}
              style={styles.image}
            />
          ) : (
            <View style={styles.imageEmpty}>
              <Text style={styles.imageEmoji}>🍹</Text>
            </View>
          )}

          <View style={styles.productContent}>
            <View style={styles.productTitleRow}>
              <Text style={styles.title}>{item.nombre}</Text>

              {!item.disponible ? (
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableBadgeText}>
                    No disponible
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.muted}>
              {item.descripcion ?? "Sin descripción"}
            </Text>

            <Text style={styles.price}>
              {formatMoney(item.precio)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {cantidad > 0 && !catalogoGeneral ? (
            <Pressable
              style={styles.qtyButtonSecondary}
              onPress={() =>
                quitar(item.bebidaProductoId)
              }
            >
              <Text style={styles.buttonText}>-</Text>
            </Pressable>
          ) : null}

          {cantidad > 0 && !catalogoGeneral ? (
            <View style={styles.qtyBox}>
              <Text style={styles.qtyText}>{cantidad}</Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.addButton,
              compraDeshabilitada &&
                styles.disabledAddButton,
            ]}
            disabled={compraDeshabilitada}
            onPress={() => agregar(item)}
          >
            <Text style={styles.buttonText}>
              {catalogoGeneral
                ? "Solo consulta"
                : !item.disponible
                  ? "No disponible"
                  : cantidad > 0
                    ? "Agregar otro"
                    : "Agregar"}
            </Text>
          </Pressable>
        </View>
      </View>
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
      <AppLayout title="Bebidas" scroll={false}>
        <View style={styles.screen}>
          <TextInput
            placeholder="Buscar bebida..."
            placeholderTextColor="#888888"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />

          {catalogoGeneral ? (
            <View style={styles.generalCatalogNotice}>
              <Text style={styles.generalCatalogTitle}>
                Catálogo general
              </Text>

              <Text style={styles.generalCatalogText}>
                Actualmente no hay un evento publicado en curso
                o próximo. Podés consultar las bebidas disponibles,
                pero la compra se habilitará cuando exista un evento.
              </Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                color="#E50914"
                size="large"
              />

              <Text style={styles.loadingText}>
                Cargando bebidas...
              </Text>
            </View>
          ) : (
            <FlatList
              data={bebidas}
              keyExtractor={(item) =>
                String(item.bebidaProductoId)
              }
              renderItem={renderBebida}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onEndReached={() => void loadNextPage()}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() =>
                    void loadFirstPage(true)
                  }
                  tintColor="#E50914"
                  colors={["#E50914"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    Sin bebidas disponibles
                  </Text>

                  <Text style={styles.emptyText}>
                    {catalogoGeneral
                      ? "No hay bebidas disponibles en el catálogo general."
                      : "No hay bebidas disponibles para este evento."}
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    color="#E50914"
                    style={styles.footerLoader}
                  />
                ) : null
              }
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom:
                    carritoItems.length > 0 ? 120 : 24,
                  flexGrow:
                    bebidas.length === 0 ? 1 : 0,
                },
              ]}
            />
          )}

          {!catalogoGeneral &&
          carritoItems.length > 0 ? (
            <Pressable
              style={styles.floatingCart}
              onPress={() => setCartOpen(true)}
            >
              <View>
                <Text style={styles.cartLabel}>
                  Ver carrito
                </Text>

                <Text style={styles.cartText}>
                  {cantidadTotal} item(s) ·{" "}
                  {formatMoney(total)}
                </Text>
              </View>

              <Text style={styles.cartArrow}>›</Text>
            </Pressable>
          ) : null}

          <Modal
            visible={cartOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setCartOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.cartModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Tu pedido
                  </Text>

                  <Pressable
                    style={styles.modalCloseIcon}
                    onPress={() => setCartOpen(false)}
                  >
                    <Text style={styles.modalCloseIconText}>
                      ×
                    </Text>
                  </Pressable>
                </View>

                <FlatList
                  data={carritoItems}
                  keyExtractor={(item) =>
                    String(item.bebidaProductoId)
                  }
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.cartItem}>
                      <View style={styles.cartItemContent}>
                        <Text style={styles.cartItemTitle}>
                          {item.nombre}
                        </Text>

                        <Text style={styles.muted}>
                          {item.cantidad} x{" "}
                          {formatMoney(item.precio)}
                        </Text>

                        <Text
                          style={styles.cartItemSubtotal}
                        >
                          {formatMoney(
                            item.precio * item.cantidad,
                          )}
                        </Text>
                      </View>

                      <View style={styles.cartQtyActions}>
                        <Pressable
                          style={styles.smallQtyButton}
                          onPress={() =>
                            quitar(item.bebidaProductoId)
                          }
                        >
                          <Text style={styles.buttonText}>
                            -
                          </Text>
                        </Pressable>

                        <Text style={styles.qtyText}>
                          {item.cantidad}
                        </Text>

                        <Pressable
                          style={styles.smallQtyButton}
                          onPress={() => agregar(item)}
                        >
                          <Text style={styles.buttonText}>
                            +
                          </Text>
                        </Pressable>
                      </View>

                      <Pressable
                        style={styles.removeButton}
                        onPress={() =>
                          eliminarDelCarrito(
                            item.bebidaProductoId,
                          )
                        }
                      >
                        <Text style={styles.buttonText}>
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  contentContainerStyle={
                    styles.cartListContent
                  }
                />

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>
                    Total
                  </Text>

                  <Text style={styles.totalValue}>
                    {formatMoney(total)}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.checkoutButton,
                    creatingOrder &&
                      styles.disabledButton,
                  ]}
                  onPress={() => void confirmarOrden()}
                  disabled={creatingOrder}
                >
                  {creatingOrder ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Crear orden
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setCartOpen(false)}
                  disabled={creatingOrder}
                >
                  <Text style={styles.closeText}>
                    Seguir comprando
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
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
  loadingText: {
    color: "#BDBDBD",
    fontWeight: "700",
    marginTop: 12,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  generalCatalogNotice: {
    backgroundColor: "rgba(255,193,7,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.28)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  generalCatalogTitle: {
    color: "#FFD166",
    fontSize: 14,
    fontWeight: "900",
  },
  generalCatalogText: {
    color: "#CFC3A0",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  listContent: {
    paddingTop: 2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 14,
    borderRadius: 22,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  productContent: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  image: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },
  imageEmpty: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageEmoji: {
    fontSize: 28,
  },
  title: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  unavailableBadge: {
    backgroundColor: "rgba(255,77,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.30)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unavailableBadgeText: {
    color: "#FF737A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  price: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  addButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#E50914",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledAddButton: {
    backgroundColor: "#3A3A3A",
    opacity: 0.75,
  },
  qtyButtonSecondary: {
    width: 54,
    minHeight: 46,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBox: {
    minWidth: 34,
    alignItems: "center",
  },
  qtyText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  floatingCart: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    backgroundColor: "#E50914",
    padding: 16,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cartLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cartText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  cartArrow: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "flex-end",
  },
  cartModal: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: "82%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  modalCloseIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseIconText: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 28,
  },
  cartListContent: {
    paddingBottom: 4,
  },
  cartItem: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cartItemContent: {
    flex: 1,
  },
  cartItemTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  cartItemSubtotal: {
    color: "#FFFFFF",
    marginTop: 6,
    fontWeight: "900",
  },
  cartQtyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallQtyButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,77,87,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  totalLabel: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  totalValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  checkoutButton: {
    minHeight: 50,
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  closeButton: {
    minHeight: 48,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  closeText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 18,
    borderRadius: 22,
    marginTop: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },
  footerLoader: {
    marginVertical: 20,
  },
});