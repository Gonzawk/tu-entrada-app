import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getEstadoLegalApi } from "../api/legalApi";
import { useAuth } from "../auth/AuthContext";
import { getHomeByRole } from "../auth/roleRedirect";
import { clearPushTokenRegistrationCache } from "../services/pushNotifications";
import { UserRole } from "../types/auth";

export default function RoleSelectScreen() {
  const {
    user,
    loading: authLoading,
    setRole,
    logout,
  } = useAuth();

  const [processing, setProcessing] = useState(false);
  const [processingRole, setProcessingRole] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /*
   * Evita solicitudes duplicadas aunque el usuario pulse
   * varias veces antes de que React actualice el estado.
   */
  const processingRef = useRef(false);

  /*
   * Evita ejecutar más de una vez la selección automática
   * para usuarios que tienen un único rol.
   */
  const autoSelectionStartedRef = useRef(false);

  const completeRoleAccess = useCallback(
    async (role: UserRole) => {
      if (processingRef.current) return;

      if (!user) {
        Alert.alert(
          "Sesión no disponible",
          "No se encontró una sesión activa. Iniciá sesión nuevamente."
        );
        return;
      }

      if (!user.roles.includes(role)) {
        Alert.alert(
          "Rol inválido",
          "Tu cuenta no tiene asignado el rol seleccionado."
        );
        return;
      }

      processingRef.current = true;
      setProcessing(true);
      setProcessingRole(role);
      setErrorMessage(null);

      try {
        /*
         * Limpia el control local para permitir registrar correctamente
         * el token push asociado al rol que acaba de seleccionarse.
         */
        await clearPushTokenRegistrationCache();

        /*
         * Guarda el rol activo en el contexto y en almacenamiento seguro.
         */
        await setRole(role);

        /*
         * El token JWT ya fue almacenado durante login(),
         * por lo que esta petición autenticada debe funcionar.
         */
        const estadoLegal = await getEstadoLegalApi();

        if (!estadoLegal.completo) {
          router.replace({
            pathname: "/legal/legal-acceptance",
            params: {
              returnRole: role,
            },
          } as never);

          return;
        }

        router.replace(getHomeByRole(role) as never);
      } catch (error: any) {
        const message = getApiErrorMessage(
          error,
          "No se pudo verificar el estado de los documentos legales."
        );

        setErrorMessage(message);

        Alert.alert("No se pudo completar el ingreso", message);

        processingRef.current = false;
        autoSelectionStartedRef.current = false;
        setProcessing(false);
        setProcessingRole(null);
      }
    },
    [user, setRole]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!Array.isArray(user.roles)) return;
    if (user.roles.length !== 1) return;
    if (autoSelectionStartedRef.current) return;

    autoSelectionStartedRef.current = true;

    void completeRoleAccess(user.roles[0]);
  }, [authLoading, user, completeRoleAccess]);

  async function handleLogout() {
    if (processingRef.current) return;

    try {
      processingRef.current = true;
      setProcessing(true);

      await logout();
    } catch (error: any) {
      processingRef.current = false;
      setProcessing(false);

      Alert.alert(
        "Error",
        getApiErrorMessage(error, "No se pudo cerrar la sesión.")
      );
    }
  }

  function retrySingleRole() {
    if (!user || user.roles.length !== 1) return;
    if (processingRef.current) return;

    autoSelectionStartedRef.current = true;
    void completeRoleAccess(user.roles[0]);
  }

  if (authLoading) {
    return <LoadingView message="Recuperando sesión..." />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Sesión no disponible</Text>

          <Text style={styles.messageText}>
            No se encontró una sesión activa. Iniciá sesión nuevamente.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/auth/login" as never)}
          >
            <Text style={styles.primaryButtonText}>Ir al login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!Array.isArray(user.roles) || user.roles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Usuario sin roles</Text>

          <Text style={styles.messageText}>
            Tu cuenta no tiene un perfil de acceso asignado. Contactá al
            administrador del sistema.
          </Text>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleLogout}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * Para un usuario con un solo rol, el proceso es automático.
   * Si ocurrió un error, ofrecemos reintentar o cerrar sesión.
   */
  if (user.roles.length === 1) {
    if (errorMessage && !processing) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              No pudimos completar el ingreso
            </Text>

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              style={styles.primaryButton}
              onPress={retrySingleRole}
            >
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={handleLogout}
            >
              <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <LoadingView
        message={
          processingRole
            ? `Preparando acceso como ${processingRole}...`
            : "Preparando tu acceso..."
        }
      />
    );
  }

  /*
   * Para varios roles, mientras se procesa uno mostramos
   * una pantalla de espera para impedir nuevas selecciones.
   */
  if (processing) {
    return (
      <LoadingView
        message={
          processingRole
            ? `Preparando acceso como ${processingRole}...`
            : "Preparando tu acceso..."
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Elegí cómo querés ingresar</Text>

        <Text style={styles.subtitle}>
          Tu cuenta tiene varios perfiles. Seleccioná el que vas a utilizar.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {user.roles.map((role) => (
          <Pressable
            key={role}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => void completeRoleAccess(role)}
          >
            <View style={styles.roleContent}>
              <View style={styles.roleIcon}>
                <Text style={styles.roleIconText}>
                  {getRoleInitial(role)}
                </Text>
              </View>

              <View style={styles.roleTextContainer}>
                <Text style={styles.role}>{role}</Text>

                <Text style={styles.text}>
                  {getRoleDescription(role)}
                </Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function LoadingView({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#E50914" size="large" />

        <Text style={styles.loadingTitle}>TuEntrada</Text>
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

function getRoleInitial(role: UserRole): string {
  return role.charAt(0).toUpperCase();
}

function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
      return "Control completo y configuración del sistema.";

    case "Admin":
      return "Gestión de eventos, usuarios, ventas y estadísticas.";

    case "Puerta":
      return "Validación de entradas y control de acceso.";

    case "Barra":
      return "Control y entrega de bebidas y beneficios.";

    case "RRPP":
      return "Gestión de ventas, pagos y órdenes.";

    case "Ventanilla":
      return "Venta presencial de entradas.";

    case "Usuario":
    default:
      return "Compra, administración y visualización de entradas.";
  }
}

function getApiErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data;

  if (!data) {
    return error?.message ?? fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.title === "string") {
    return data.title;
  }

  if (data?.errors && typeof data.errors === "object") {
    const validationMessages = Object.values(data.errors)
      .flat()
      .filter((value): value is string => typeof value === "string");

    if (validationMessages.length > 0) {
      return validationMessages.join("\n");
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#BDBDBD",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 17,
    borderRadius: 22,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  roleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "rgba(229,9,20,0.18)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconText: {
    color: "#E50914",
    fontSize: 22,
    fontWeight: "900",
  },
  roleTextContainer: {
    flex: 1,
  },
  role: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  text: {
    color: "#BDBDBD",
    marginTop: 5,
    lineHeight: 19,
  },
  arrow: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "300",
  },
  loadingBox: {
    alignItems: "center",
  },
  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 18,
  },
  loadingText: {
    color: "#BDBDBD",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "700",
  },
  messageCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
    borderRadius: 24,
  },
  messageTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  messageText: {
    color: "#BDBDBD",
    marginTop: 8,
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: "rgba(255,77,87,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.30)",
    padding: 20,
    borderRadius: 24,
  },
  errorTitle: {
    color: "#FF4D57",
    fontSize: 21,
    fontWeight: "900",
  },
  errorText: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 21,
  },
  inlineError: {
    backgroundColor: "rgba(255,77,87,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.28)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
  },
  inlineErrorText: {
    color: "#FF9A9F",
    lineHeight: 19,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.10)",
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  logoutButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  logoutButtonText: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
});