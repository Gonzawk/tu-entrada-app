import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileInfoCard } from "@/components/profile/ProfileInfoCard";
import { ProfileStatusCard } from "@/components/profile/ProfileStatusCard";
import {
    getAccountDeletionStatus,
    getMyProfile,
} from "../../api/profileApi";
import { AppLayout } from "../../components/shared/AppLayout";
import type {
    AccountDeletionStatusResponse,
    MyProfileResponse,
} from "../../types/profile";

function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    const backendMessage =
      response?.data?.message ?? response?.data?.title;

    if (backendMessage) {
      return backendMessage;
    }

    const validationErrors = response?.data?.errors;

    if (validationErrors) {
      const firstError = Object.values(validationErrors)
        .flat()
        .find(Boolean);

      if (firstError) {
        return firstError;
      }
    }
  }

  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallbackMessage;
}

function hasActiveDeletionRequest(
  status: AccountDeletionStatusResponse | null
): boolean {
  return Boolean(status?.tieneSolicitudActiva);
}

export default function ProfileScreen() {
  const [profile, setProfile] =
    useState<MyProfileResponse | null>(null);

  const [deletionStatus, setDeletionStatus] =
    useState<AccountDeletionStatusResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletionStatusLoading, setDeletionStatusLoading] =
    useState(true);

  const [deleteModalVisible, setDeleteModalVisible] =
    useState(false);

  const [fatalError, setFatalError] = useState<string | null>(
    null
  );

  const activeDeletionRequest = useMemo(
    () => hasActiveDeletionRequest(deletionStatus),
    [deletionStatus]
  );

  const loadDeletionStatus = useCallback(async () => {
    setDeletionStatusLoading(true);

    try {
      const response = await getAccountDeletionStatus();
      setDeletionStatus(response);
    } catch (error: unknown) {
      /*
       * El perfil debe seguir funcionando aunque falle únicamente
       * la consulta del estado de eliminación.
       *
       * Si tu backend todavía no expone GET /api/account-deletion/status,
       * el resto del screen seguirá cargando correctamente.
       */
      console.warn(
        "No se pudo obtener el estado de eliminación de cuenta:",
        error
      );

      setDeletionStatus(null);
    } finally {
      setDeletionStatusLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const response = await getMyProfile();
    setProfile(response);
  }, []);

  const loadScreen = useCallback(
    async (showFullLoading: boolean) => {
      if (showFullLoading) {
        setLoading(true);
      }

      setFatalError(null);

      try {
        await Promise.all([
          loadProfile(),
          loadDeletionStatus(),
        ]);
      } catch (error: unknown) {
        const message = getApiErrorMessage(
          error,
          "No fue posible cargar tu perfil."
        );

        setFatalError(message);
      } finally {
        if (showFullLoading) {
          setLoading(false);
        }
      }
    },
    [loadDeletionStatus, loadProfile]
  );

  useEffect(() => {
    void loadScreen(true);
  }, [loadScreen]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadScreen(false);
    } finally {
      setRefreshing(false);
    }
  }, [loadScreen]);

  const handleDeletionSuccess = useCallback(async () => {
    await loadDeletionStatus();
  }, [loadDeletionStatus]);

  function openDeleteModal() {
    if (activeDeletionRequest) {
      Alert.alert(
        "Solicitud activa",
        deletionStatus?.message ||
          "Ya existe una solicitud activa de eliminación de cuenta."
      );

      return;
    }

    setDeleteModalVisible(true);
  }

  if (loading) {
    return (
      <AppLayout title="Mi perfil" scroll={false}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#FFD166"
          />

          <Text style={styles.loadingText}>
            Cargando tu perfil...
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (!profile || fatalError) {
    return (
      <AppLayout title="Mi perfil" scroll={false}>
        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>

          <Text style={styles.errorTitle}>
            No pudimos cargar tu perfil
          </Text>

          <Text style={styles.errorDescription}>
            {fatalError ||
              "Ocurrió un error inesperado al consultar tus datos."}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void loadScreen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga del perfil"
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mi perfil" scroll={false}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFD166"
            colors={["#FFD166"]}
            progressBackgroundColor="#111111"
          />
        }
      >
        <ProfileHeader
          nombreCompleto={profile.nombreCompleto}
          email={profile.email}
          fotoUrl={profile.fotoUrl}
          roles={profile.roles}
          emailVerificado={profile.emailVerificado}
        />

        <ProfileInfoCard
          nombreCompleto={profile.nombreCompleto}
          email={profile.email}
          telefono={profile.telefono}
          fechaCreacion={profile.fechaCreacion}
        />

        <ProfileStatusCard
          status={deletionStatus}
          loading={deletionStatusLoading}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>
            Zona de seguridad
          </Text>

          <Text style={styles.dangerZoneDescription}>
            La eliminación de la cuenta requiere tu contraseña
            actual y una confirmación enviada a tu correo.
          </Text>

          {activeDeletionRequest ? (
            <View style={styles.activeRequestNotice}>
              <Text style={styles.activeRequestTitle}>
                Ya existe una solicitud activa
              </Text>

              <Text style={styles.activeRequestText}>
                {deletionStatus?.message ||
                  "Revisá tu correo electrónico o esperá la revisión administrativa."}
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.deleteButton}
              onPress={openDeleteModal}
              accessibilityRole="button"
              accessibilityLabel="Solicitar eliminación de cuenta"
            >
              <Text style={styles.deleteButtonText}>
                Eliminar mi cuenta
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.footerText}>
          La información de este perfil corresponde al usuario
          autenticado actualmente.
        </Text>
      </ScrollView>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onSuccess={handleDeletionSuccess}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    paddingBottom: 34,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  loadingText: {
    marginTop: 16,
    color: "#BDBDBD",
    fontSize: 15,
    fontWeight: "700",
  },

  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.14)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
  },

  errorIconText: {
    color: "#FF7A82",
    fontSize: 30,
    fontWeight: "900",
  },

  errorTitle: {
    marginTop: 18,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },

  errorDescription: {
    marginTop: 10,
    color: "#BDBDBD",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 22,
    minWidth: 150,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FFD166",
  },

  retryButtonText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },

  dangerZone: {
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },

  dangerZoneTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  dangerZoneDescription: {
    marginTop: 8,
    color: "#BDBDBD",
    fontSize: 14,
    lineHeight: 21,
  },

  deleteButton: {
    marginTop: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(214,40,40,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,122,130,0.24)",
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  activeRequestNotice: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,209,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.22)",
  },

  activeRequestTitle: {
    color: "#FFD166",
    fontSize: 15,
    fontWeight: "900",
  },

  activeRequestText: {
    marginTop: 7,
    color: "#D6D6D6",
    fontSize: 13,
    lineHeight: 20,
  },

  footerText: {
    marginTop: 20,
    paddingHorizontal: 14,
    color: "#777777",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});