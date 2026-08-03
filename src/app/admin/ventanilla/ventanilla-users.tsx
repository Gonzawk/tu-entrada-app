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
import { getUsuariosVentanillaAdminApi } from "../../../api/adminUsersApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { AdminUsuario } from "../../../types/adminUsers";

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

export default function AdminVentanillaUsersListScreen() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
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

      const result = await getUsuariosVentanillaAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setUsuarios(result.items ?? []);
      setPage(1);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar usuarios.")
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  async function loadMore() {
    if (loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getUsuariosVentanillaAdminApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      });

      setUsuarios((prev) => [...prev, ...(result.items ?? [])]);
      setPage(nextPage);
      setHasNextPage(Boolean(result.hasNextPage));
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudieron cargar más usuarios.")
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Usuarios ventanilla">
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/admin/ventanilla" as never)}
        >
          <Text style={styles.buttonText}>Crear usuario ventanilla</Text>
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
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : usuarios.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>No hay usuarios de ventanilla.</Text>
          </View>
        ) : (
          usuarios.map((u) => (
            <View key={u.id} style={styles.card}>
              <Text style={styles.title}>{u.nombreCompleto}</Text>
              <Text style={styles.muted}>{u.email}</Text>

              {u.telefono ? (
                <Text style={styles.muted}>{u.telefono}</Text>
              ) : null}

              <Text style={u.activo ? styles.active : styles.inactive}>
                {u.activo ? "Activo" : "Inactivo"}
              </Text>

              <Text style={u.emailVerificado ? styles.active : styles.inactive}>
                {u.emailVerificado ? "Email verificado" : "Email sin verificar"}
              </Text>
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
});