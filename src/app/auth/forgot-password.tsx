import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { forgotPassword } from "../../api/authApi";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert(
        "Correo electrónico",
        "Ingresá tu correo electrónico."
      );
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const response = await forgotPassword({
        email: normalizedEmail,
      });

      Alert.alert(
        "Correo enviado",
        response.message,
        [
          {
            text: "Aceptar",
            onPress: () =>
              router.replace("/auth/login" as never),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          e,
          "No fue posible procesar la solicitud."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>
              Recuperar contraseña
            </Text>

            <Text style={styles.subtitle}>
              Ingresá el correo asociado a tu cuenta.
              {"\n"}
              Te enviaremos un enlace para restablecer tu contraseña.
            </Text>

            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#8A8A8A"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <Pressable
              style={[
                styles.primaryButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Enviar enlace
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                router.back()
              }
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                Volver al inicio de sesión
              </Text>
            </Pressable>
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

  keyboard: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
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
    marginTop: 10,
    marginBottom: 28,
    lineHeight: 22,
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

  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E50914",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  secondaryButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});