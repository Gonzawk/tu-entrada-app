import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  cambiarDisponibilidadGlobalBebidaApi,
  eliminarBebidaAdminApi,
  getBebidasAdminApi,
} from "../../../api/drinksApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { BebidaProducto } from "../../../types/drinks";
import { formatMoney } from "../../../utils/formatMoney";

const PAGE_SIZE = 10;

interface ApiErrorLike {
  response?: {
    data?: string | {
      message?: string;
    };
  };
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  const responseData = apiError.response?.data;

  if (typeof responseData === "string") return responseData;
  if (responseData?.message) return responseData.message;
  if (apiError.message) return apiError.message;

  return fallback;
}

export default function AdminDrinksScreen() {
  const [bebidas, setBebidas] = useState<BebidaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

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

        const result = await getBebidasAdminApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });

        setBebidas(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(error, "No se pudieron cargar bebidas.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const result = await getBebidasAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setBebidas((prev) => {
        const idsExistentes = new Set(prev.map((bebida) => bebida.id));
        const nuevasBebidas = (result.items ?? []).filter(
          (bebida) => !idsExistentes.has(bebida.id)
        );

        return [...prev, ...nuevasBebidas];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar más bebidas.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleDisponible(bebida: BebidaProducto) {
    try {
      const nuevaDisponibilidad = !bebida.disponibleGlobal;

      await cambiarDisponibilidadGlobalBebidaApi(
        bebida.id,
        nuevaDisponibilidad
      );

      setBebidas((prev) =>
        prev.map((item) =>
          item.id === bebida.id
            ? { ...item, disponibleGlobal: nuevaDisponibilidad }
            : item
        )
      );
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudo cambiar la disponibilidad.")
      );
    }
  }

  function eliminar(bebida: BebidaProducto) {
    Alert.alert("Eliminar bebida", `¿Querés eliminar ${bebida.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await eliminarBebidaAdminApi(bebida.id);
            setBebidas((prev) =>
              prev.filter((item) => item.id !== bebida.id)
            );
          } catch (error: unknown) {
            Alert.alert(
              "Error",
              getErrorMessage(error, "No se pudo eliminar la bebida.")
            );
          }
        },
      },
    ]);
  }

  function renderBebida({ item }: { item: BebidaProducto }) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.imagenUrl ? (
            <Image source={{ uri: item.imagenUrl }} style={styles.image} />
          ) : (
            <View style={styles.imageEmpty}>
              <Text style={styles.imageEmptyText}>🍹</Text>
            </View>
          )}

          <View style={styles.productInfo}>
            <Text style={styles.title}>{item.nombre}</Text>
            <Text style={styles.muted}>
              {item.descripcion ?? "Sin descripción"}
            </Text>
            <Text style={styles.price}>{formatMoney(item.precioBase)}</Text>
            <Text
              style={item.disponibleGlobal ? styles.active : styles.inactive}
            >
              {item.disponibleGlobal
                ? "Disponible globalmente"
                : "No disponible"}
            </Text>

            <Text
              style={item.manejaStock ? styles.stockActive : styles.stockInactive}
            >
              {item.manejaStock
                ? `Stock global libre: ${item.stockDisponible ?? 0}`
                : "Sin control de stock"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              router.push({
                pathname: "/admin/drinks/create",
                params: { bebidaId: item.id },
              } as never)
            }
          >
            <Text style={styles.buttonText}>Editar</Text>
          </Pressable>

          <Pressable
            style={
              item.disponibleGlobal
                ? styles.warningButton
                : styles.successButton
            }
            onPress={() => void toggleDisponible(item)}
          >
            <Text style={styles.buttonText}>
              {item.disponibleGlobal ? "Pausar" : "Activar"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.dangerButton}
            onPress={() => eliminar(item)}
          >
            <Text style={styles.buttonText}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Bebidas" scroll={false}>
        <View style={styles.screen}>
          <View style={styles.topActions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/admin/drinks/create" as never)}
            >
              <Text style={styles.primaryText}>Crear bebida</Text>
            </Pressable>

            <Pressable
              style={styles.summaryButton}
              onPress={() =>
                router.push(
                  "/admin/barra/barra-sales-summary" as never
                )
              }
            >
              <Text style={styles.summaryButtonText}>
                Ver resumen de ventas
              </Text>
            </Pressable>
          </View>

          <TextInput
            placeholder="Buscar bebida por nombre o descripción..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            style={styles.searchInput}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" />
            </View>
          ) : (
            <FlatList
              data={bebidas}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderBebida}
              showsVerticalScrollIndicator={false}
              onEndReached={() => void loadNextPage()}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void loadFirstPage(true)}
                  tintColor="#E50914"
                  colors={["#E50914"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No hay bebidas cargadas.</Text>
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
                bebidas.length === 0 && styles.emptyListContent,
              ]}
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
    justifyContent: "center",
    alignItems: "center",
  },
  topActions: {
    gap: 10,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  summaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  summaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  productInfo: {
    flex: 1,
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
  imageEmptyText: {
    fontSize: 28,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  price: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
  },
  active: {
    color: "#20D67B",
    marginTop: 6,
    fontWeight: "800",
  },
  inactive: {
    color: "#FF4D57",
    marginTop: 6,
    fontWeight: "800",
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
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  warningButton: {
    flex: 1,
    backgroundColor: "rgba(255,209,102,0.18)",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  successButton: {
    flex: 1,
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "rgba(255,77,87,0.20)",
    padding: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  emptyText: {
    color: "#BDBDBD",
    textAlign: "center",
  },
  footerLoader: {
    marginVertical: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
});