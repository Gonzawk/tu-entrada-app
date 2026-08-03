import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  cambiarEstadoAdminUsuarioApi,
  getUsuariosBarraAdminApi,
} from "../../../api/adminUsersApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

const PAGE_SIZE = 10;

interface AdminBarraUsuario {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  activo: boolean;
  emailVerificado: boolean;
}

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

export default function AdminBarraUsersListScreen() {
  const [usuarios, setUsuarios] = useState<AdminBarraUsuario[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadFirstPage = useCallback(async () => {
    try {
      setLoading(true);

      const result = await getUsuariosBarraAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setUsuarios(result.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar usuarios.")
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  async function loadMore() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const result = await getUsuariosBarraAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setUsuarios((prev) => {
        const idsExistentes = new Set(prev.map((usuario) => usuario.id));
        const nuevosUsuarios = (result.items ?? []).filter(
          (usuario: AdminBarraUsuario) => !idsExistentes.has(usuario.id)
        );

        return [...prev, ...nuevosUsuarios];
      });

      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "No se pudieron cargar más usuarios.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function cambiarEstado(usuarioId: number, activoActual: boolean) {
    const nuevoEstado = !activoActual;

    Alert.alert(
      nuevoEstado ? "Activar usuario" : "Desactivar usuario",
      nuevoEstado
        ? "¿Seguro que querés activar este usuario de barra?"
        : "¿Seguro que querés desactivar este usuario de barra? No podrá ingresar ni operar en barra.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: nuevoEstado ? "Activar" : "Desactivar",
          style: nuevoEstado ? "default" : "destructive",
          onPress: async () => {
            try {
              await cambiarEstadoAdminUsuarioApi(usuarioId, nuevoEstado);

              setUsuarios((prev) =>
                prev.map((usuario) =>
                  usuario.id === usuarioId
                    ? { ...usuario, activo: nuevoEstado }
                    : usuario
                )
              );

              Alert.alert(
                "Correcto",
                nuevoEstado
                  ? "Usuario activado correctamente."
                  : "Usuario desactivado correctamente."
              );
            } catch (error: unknown) {
              Alert.alert(
                "Error",
                getErrorMessage(error, "No se pudo cambiar el estado.")
              );
            }
          },
        },
      ]
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Usuarios barra">
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/barra" as never)}
        >
          <Text style={styles.buttonText}>Crear usuario barra</Text>
        </Pressable>

        <TextInput
          placeholder="Buscar por nombre, email o teléfono..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator color="#E50914" style={styles.loader} />
        ) : usuarios.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>No hay usuarios de barra.</Text>
          </View>
        ) : (
          usuarios.map((usuario) => (
            <View key={usuario.id} style={styles.card}>
              <Text style={styles.title}>{usuario.nombreCompleto}</Text>
              <Text style={styles.muted}>{usuario.email}</Text>

              {usuario.telefono ? (
                <Text style={styles.muted}>{usuario.telefono}</Text>
              ) : null}

              <Text style={usuario.activo ? styles.active : styles.inactive}>
                {usuario.activo ? "Activo" : "Inactivo"}
              </Text>

              <Pressable
                style={
                  usuario.activo ? styles.disableButton : styles.enableButton
                }
                onPress={() => cambiarEstado(usuario.id, usuario.activo)}
              >
                <Text style={styles.buttonText}>
                  {usuario.activo ? "Desactivar" : "Activar"}
                </Text>
              </Pressable>

              <Text
                style={
                  usuario.emailVerificado ? styles.active : styles.inactive
                }
              >
                {usuario.emailVerificado
                  ? "Email verificado"
                  : "Email sin verificar"}
              </Text>
            </View>
          ))
        )}

        {hasNextPage ? (
          <Pressable
            style={[styles.secondaryButton, loadingMore && styles.disabledButton]}
            onPress={() => void loadMore()}
            disabled={loadingMore}
          >
            <Text style={styles.buttonText}>
              {loadingMore ? "Cargando..." : "Cargar más"}
            </Text>
          </Pressable>
        ) : null}
      </AppLayout>
    </RoleGuard>
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
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  active: {
    color: "#20D67B",
    fontWeight: "900",
    marginTop: 8,
  },
  inactive: {
    color: "#FFB703",
    fontWeight: "900",
    marginTop: 8,
  },
  disableButton: {
    backgroundColor: "rgba(229,9,20,0.24)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.45)",
  },
  enableButton: {
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.45)",
  },
  loader: {
    marginTop: 40,
  },
});