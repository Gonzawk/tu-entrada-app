import * as ImagePicker from "expo-image-picker";
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
  actualizarAvatarRRPPAdminApi,
  cambiarEstadoRRPPAdminApi,
  getRRPPAdminPaginadoApi,
  subirImagenAdminApi,
} from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { RRPPAdmin } from "../../../types/admin";

const PAGE_SIZE = 5;

type ApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

function getApiErrorMessage(error: unknown): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (!data) {
    return apiError.message ?? "Ocurrió un error.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.title === "string") {
      return record.title;
    }

    try {
      return JSON.stringify(data);
    } catch {
      return "Ocurrió un error.";
    }
  }

  return "Ocurrió un error.";
}

export default function AdminRRPPsScreen() {
  const [rrpps, setRrpps] = useState<RRPPAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchRRPP, setSearchRRPP] = useState("");
  const [debouncedSearchRRPP, setDebouncedSearchRRPP] = useState("");

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [editingAvatarId, setEditingAvatarId] = useState<number | null>(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<number | null>(null);
  const [savingAvatarId, setSavingAvatarId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchRRPP(searchRRPP.trim());
    }, 450);

    return () => clearTimeout(timeout);
  }, [searchRRPP]);

  const loadFirstPage = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await getRRPPAdminPaginadoApi({
          page: 1,
          pageSize: PAGE_SIZE,
          search: debouncedSearchRRPP,
        });

        const items: RRPPAdmin[] = Array.isArray(result)
          ? result
          : result.items ?? [];

        setRrpps(items);
        setPage(1);
        setHasNextPage(
          !Array.isArray(result) && Boolean(result.hasNextPage)
        );
      } catch (error: unknown) {
        Alert.alert("Error", getApiErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearchRRPP]
  );

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage]);

  async function loadNextPage() {
    if (loading || loadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;

      const result = await getRRPPAdminPaginadoApi({
        page: nextPage,
        pageSize: PAGE_SIZE,
        search: debouncedSearchRRPP,
      });

      const items: RRPPAdmin[] = Array.isArray(result)
        ? result
        : result.items ?? [];

      setRrpps((previous) => {
        const ids = new Set(previous.map((item) => item.id));
        const nuevos = items.filter((item) => !ids.has(item.id));

        return [...previous, ...nuevos];
      });

      setPage(nextPage);
      setHasNextPage(
        !Array.isArray(result) && Boolean(result.hasNextPage)
      );
    } catch (error: unknown) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }

  async function cambiarEstado(rrpp: RRPPAdmin) {
    try {
      const nuevoEstado = !rrpp.activo;

      await cambiarEstadoRRPPAdminApi(rrpp.id, nuevoEstado);

      setRrpps((previous) =>
        previous.map((item) =>
          item.id === rrpp.id
            ? { ...item, activo: nuevoEstado }
            : item
        )
      );
    } catch (error: unknown) {
      Alert.alert("Error", getApiErrorMessage(error));
    }
  }

  async function seleccionarYSubirAvatar(rrpp: RRPPAdmin) {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a tus imágenes."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setUploadingAvatarId(rrpp.id);

      const uploadResult = await subirImagenAdminApi({
        uri: asset.uri,
        name: asset.fileName ?? `rrpp-${rrpp.id}-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });

      const url = uploadResult?.url;

      if (!url) {
        Alert.alert(
          "Error",
          "No se recibió una URL válida de la imagen."
        );
        return;
      }

      setSavingAvatarId(rrpp.id);

      await actualizarAvatarRRPPAdminApi(rrpp.id, url);

      setRrpps((previous) =>
        previous.map((item) =>
          item.id === rrpp.id
            ? { ...item, avatarUrl: url }
            : item
        )
      );

      setEditingAvatarId(null);
      Alert.alert("Correcto", "Avatar actualizado.");
    } catch (error: unknown) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setUploadingAvatarId(null);
      setSavingAvatarId(null);
    }
  }

  async function ejecutarQuitarAvatar(rrpp: RRPPAdmin) {
    try {
      setSavingAvatarId(rrpp.id);

      await actualizarAvatarRRPPAdminApi(rrpp.id, null);

      setRrpps((previous) =>
        previous.map((item) =>
          item.id === rrpp.id
            ? { ...item, avatarUrl: undefined }
            : item
        )
      );

      setEditingAvatarId(null);
    } catch (error: unknown) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setSavingAvatarId(null);
    }
  }

  function quitarAvatar(rrpp: RRPPAdmin) {
    Alert.alert(
      "Quitar avatar",
      "¿Querés quitar el avatar de este RRPP?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => void ejecutarQuitarAvatar(rrpp),
        },
      ]
    );
  }

  function toggleEditarAvatar(rrpp: RRPPAdmin) {
    setEditingAvatarId((current) => (current === rrpp.id ? null : rrpp.id));
  }

  function renderRRPP({ item: rrpp }: { item: RRPPAdmin }) {
    const isUploading = uploadingAvatarId === rrpp.id;
    const isSaving = savingAvatarId === rrpp.id;
    const isBusy = isUploading || isSaving;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {rrpp.avatarUrl ? (
            <Image source={{ uri: rrpp.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {rrpp.nombrePublico.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{rrpp.nombrePublico}</Text>
            <Text style={styles.muted}>{rrpp.email}</Text>
            <Text style={styles.muted}>Usuario ID: {rrpp.usuarioId}</Text>
          </View>
        </View>

        <Text style={rrpp.activo ? styles.active : styles.inactive}>
          {rrpp.activo ? "Activo globalmente" : "Inactivo globalmente"}
        </Text>

        <Pressable
          style={styles.editAvatarButton}
          onPress={() => toggleEditarAvatar(rrpp)}
          disabled={isBusy}
        >
          <Text style={styles.stateButtonText}>
            {editingAvatarId === rrpp.id ? "Cancelar edición" : "Editar avatar"}
          </Text>
        </Pressable>

        {editingAvatarId === rrpp.id ? (
          <View style={styles.avatarEditBox}>
            <Text style={styles.formLabel}>Avatar del RRPP</Text>

            {rrpp.avatarUrl ? (
              <Image source={{ uri: rrpp.avatarUrl }} style={styles.avatarPreview} />
            ) : (
              <View style={styles.avatarPreviewEmpty}>
                <Text style={styles.avatarPreviewEmptyText}>
                  Sin avatar cargado
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.saveAvatarButton, isBusy && styles.disabled]}
              onPress={() => void seleccionarYSubirAvatar(rrpp)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.stateButtonText}>
                  {rrpp.avatarUrl ? "Cambiar imagen" : "Subir imagen"}
                </Text>
              )}
            </Pressable>

            {rrpp.avatarUrl ? (
              <Pressable
                style={[styles.removeAvatarButton, isBusy && styles.disabled]}
                onPress={() => quitarAvatar(rrpp)}
                disabled={isBusy}
              >
                <Text style={styles.stateButtonText}>Quitar avatar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[
            styles.stateButton,
            rrpp.activo ? styles.deactivateButton : styles.activateButton,
          ]}
          onPress={() => void cambiarEstado(rrpp)}
          disabled={isBusy}
        >
          <Text style={styles.stateButtonText}>
            {rrpp.activo ? "Desactivar RRPP" : "Activar RRPP"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="RRPPs" scroll={false}>
        <View style={styles.screen}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Gestión de RRPPs</Text>
            <Text style={styles.infoText}>
              Administrá los RRPPs activos, sus avatares y su estado global.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/admin/rrpps/create-rrpp" as never)}
          >
            <Text style={styles.primaryText}>Crear RRPP</Text>
          </Pressable>

          <TextInput
            placeholder="Buscar RRPP por nombre, email o ID..."
            placeholderTextColor="#888"
            value={searchRRPP}
            onChangeText={setSearchRRPP}
            autoCapitalize="none"
            style={styles.searchInput}
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E50914" />
            </View>
          ) : (
            <FlatList
              data={rrpps}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderRRPP}
              showsVerticalScrollIndicator={false}
              onEndReached={() => void loadNextPage()}
              onEndReachedThreshold={0.4}
              keyboardShouldPersistTaps="handled"
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
                  <Text style={styles.emptyText}>No hay RRPPs creados.</Text>
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
                flexGrow: rrpps.length === 0 ? 1 : 0,
              }}
            />
          )}
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  infoCard: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  infoText: { color: "#D0D0D0", marginTop: 8, lineHeight: 20 },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  formLabel: {
    color: "#FFFFFF",
    marginBottom: 8,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: { color: "#BDBDBD" },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 4 },
  active: { color: "#20D67B", marginTop: 12, fontWeight: "900" },
  inactive: { color: "#FF4D57", marginTop: 12, fontWeight: "900" },
  editAvatarButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  avatarEditBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarPreview: {
    width: "100%",
    height: 140,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    marginTop: 8,
  },
  avatarPreviewEmpty: {
    width: "100%",
    height: 140,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  avatarPreviewEmptyText: {
    color: "#888",
    fontWeight: "800",
  },
  saveAvatarButton: {
    backgroundColor: "rgba(229,9,20,0.85)",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  removeAvatarButton: {
    backgroundColor: "rgba(255,77,87,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.35)",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  stateButton: {
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  activateButton: {
    backgroundColor: "rgba(32,214,123,0.20)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.35)",
  },
  deactivateButton: {
    backgroundColor: "rgba(255,77,87,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.35)",
  },
  disabled: {
    opacity: 0.6,
  },
  stateButtonText: { color: "#FFFFFF", fontWeight: "900" },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
});