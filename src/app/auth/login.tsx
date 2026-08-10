import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      Alert.alert("Datos incompletos", "Ingresá tu email y contraseña.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      await login({
        email: normalizedEmail,
        password: password.trim(),
      });

      /*
       * Siempre pasamos por role-select.
       * Esa pantalla resuelve:
       * - un solo rol;
       * - varios roles;
       * - aceptación legal;
       * - dashboard final.
       */
      router.replace("/role-select" as never);
    } catch (e: any) {
      const data = e?.response?.data;

      if (data?.requiereVerificacionEmail) {
        router.replace({
          pathname: "/auth/verify-email-pending",
          params: {
            email: data.email ?? normalizedEmail,
          },
        } as never);

        return;
      }

      Alert.alert(
        "Error",
        getApiErrorMessage(e, "Email o contraseña incorrectos.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/branding/iconn.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Ingresar</Text>
            <Text style={styles.subtitle}>
              Accedé a tus entradas y eventos.
            </Text>

            <View style={styles.form}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#8A8A8A"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#8A8A8A"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  style={styles.passwordInput}
                />

                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  hitSlop={10}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Ingresar</Text>
                )}
              </Pressable>

              <Pressable
  disabled={loading}
  onPress={() => router.push("/auth/forgot-password" as never)}
>
  <Text style={styles.forgotPassword}>
    ¿Olvidaste tu contraseña?
  </Text>
</Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/auth/register" as never)}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getApiErrorMessage(error: any, fallback: string) {
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

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    width: 200,
    height: 200,
    opacity: 0.92,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#B8B8B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 22,
  },
  form: {
    gap: 12,
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontSize: 15,
  },
  passwordContainer: {
    height: 52,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    color: "#FFFFFF",
    fontSize: 15,
    paddingRight: 8,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeText: {
    fontSize: 20,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  forgotPassword: {
  color: "#FFFFFF",
  textAlign: "center",
  marginTop: 0,
  fontSize: 14,
  fontWeight: "600",
}
});