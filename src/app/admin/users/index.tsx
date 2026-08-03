import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  cambiarEstadoAdminUsuarioApi,
  cambiarVerificacionEmailUsuarioApi,
  getAdminUsuariosApi,
} from "../../../api/adminUsersApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { AdminUsuario } from "../../../types/adminUsers";
import { formatDate } from "../../../utils/formatDate";

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

export default function AdminUsersScreen() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rol, setRol] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);

        const result = await getAdminUsuariosApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          rol,
        });

        setUsuarios(result.items ?? []);
        setPage(1);
        setHasNextPage(Boolean(result.hasNextPage));
      } catch (e: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(e, "No se pudieron cargar los usuarios.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, rol]
  );

  useEffect(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getAdminUsuariosApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        rol,
      });

      setUsuarios((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const nuevos = (result.items ?? []).filter((x) => !ids.has(x.id));
        return [...prev, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } finally {
      setLoadingMore(false);
    }
  }

  async function cambiarEstado(usuario: AdminUsuario) {
    try {
      const nuevoEstado = !usuario.activo;

      await cambiarEstadoAdminUsuarioApi(usuario.id, nuevoEstado);

      setUsuarios((prev) =>
        prev.map((x) =>
          x.id === usuario.id ? { ...x, activo: nuevoEstado } : x
        )
      );
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cambiar el estado.")
      );
    }
  }

  async function cambiarEmailVerificado(usuario: AdminUsuario) {
    try {
      const nuevoEstado = !usuario.emailVerificado;

      await cambiarVerificacionEmailUsuarioApi(usuario.id, nuevoEstado);

      setUsuarios((prev) =>
        prev.map((x) =>
          x.id === usuario.id ? { ...x, emailVerificado: nuevoEstado } : x
        )
      );
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cambiar la verificación.")
      );
    }
  }

  function renderUsuario({ item }: { item: AdminUsuario }) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.nombreCompleto}</Text>
        <Text style={styles.email}>{item.email}</Text>

        {item.telefono ? (
          <Text style={styles.muted}>Tel: {item.telefono}</Text>
        ) : null}

        <Text style={styles.muted}>
          Creado: {formatDate(item.fechaCreacion)}
        </Text>

        <View style={styles.badges}>
          <Text style={item.activo ? styles.badgeActive : styles.badgeInactive}>
            {item.activo ? "Activo" : "Inactivo"}
          </Text>

          <Text
            style={
              item.emailVerificado
                ? styles.badgeVerified
                : styles.badgeNotVerified
            }
          >
            {item.emailVerificado ? "Email verificado" : "Email pendiente"}
          </Text>
        </View>

        <Text style={styles.roles}>
          Roles: {item.roles?.length ? item.roles.join(", ") : "Sin roles"}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              router.push({
                pathname: "/admin/users/form",
                params: { usuarioId: item.id },
              } as never)
            }
          >
            <Text style={styles.buttonText}>Editar</Text>
          </Pressable>

          <Pressable
            style={item.activo ? styles.warningButton : styles.successButton}
            onPress={() => cambiarEstado(item)}
          >
            <Text style={styles.buttonText}>
              {item.activo ? "Desactivar" : "Activar"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={
            item.emailVerificado
              ? styles.emailUnverifyButton
              : styles.emailVerifyButton
          }
          onPress={() => cambiarEmailVerificado(item)}
        >
          <Text style={styles.buttonText}>
            {item.emailVerificado
              ? "Desverificar email"
              : "Verificar email"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Usuarios" scroll={false}>
        <View style={styles.container}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/admin/users/form" as never)}
          >
            <Text style={styles.primaryText}>Crear usuario</Text>
          </Pressable>

          <TextInput
            placeholder="Buscar por nombre, email o teléfono..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={styles.filters}>
            {["", "Usuario", "Admin", "Barra", "RRPP", "SuperAdmin"].map((r) => (
              <Pressable
                key={r || "todos"}
                style={rol === r ? styles.filterActive : styles.filter}
                onPress={() => setRol(r)}
              >
                <Text style={styles.filterText}>{r || "Todos"}</Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
          ) : (
            <FlatList
              data={usuarios}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderUsuario}
              onEndReached={loadNextPage}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadFirstPage(true)}
                  tintColor="#E50914"
                  colors={["#E50914"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No hay usuarios.</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator
                    color="#E50914"
                    style={{ marginVertical: 20 }}
                  />
                ) : null
              }
              contentContainerStyle={{
                paddingBottom: 24,
                flexGrow: usuarios.length === 0 ? 1 : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  input: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filter: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  filterActive: {
    backgroundColor: "#E50914",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  filterText: { color: "#FFFFFF", fontWeight: "800" },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  name: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  email: { color: "#BDBDBD", marginTop: 4 },
  muted: { color: "#BDBDBD", marginTop: 5 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  badgeActive: {
    color: "#20D67B",
    fontWeight: "900",
  },
  badgeInactive: {
    color: "#FF4D57",
    fontWeight: "900",
  },
  badgeVerified: {
    color: "#9EC5FE",
    fontWeight: "900",
  },
  badgeNotVerified: {
    color: "#FFD166",
    fontWeight: "900",
  },
  roles: {
    color: "#FFFFFF",
    marginTop: 10,
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
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  warningButton: {
    flex: 1,
    backgroundColor: "rgba(255,209,102,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  successButton: {
    flex: 1,
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  emailVerifyButton: {
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  emailUnverifyButton: {
    backgroundColor: "rgba(255,77,87,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: { color: "#BDBDBD", textAlign: "center" },
});