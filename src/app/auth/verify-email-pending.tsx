import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { reenviarVerificacionEmailApi } from "../../api/authApi";
import { BRANDING } from "../../constants/branding";

export default function VerifyEmailPendingScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  async function reenviarCorreo() {
    if (!email) {
      Alert.alert("Error", "No se recibió el correo.");
      return;
    }

    try {
      setLoading(true);

      const result = await reenviarVerificacionEmailApi(String(email));

      Alert.alert(
        "Correo reenviado",
        String(result?.message ?? "Revisá tu casilla de correo.")
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo reenviar el correo."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={BRANDING.logo} style={styles.logo} resizeMode="contain" />

      <Text style={styles.title}>Verificá tu correo</Text>

      <Text style={styles.text}>
        Tu cuenta ya fue creada, pero todavía falta confirmar tu correo.
      </Text>

      {email ? <Text style={styles.email}>{String(email)}</Text> : null}

      <Text style={styles.text}>
        Abrí el email que te enviamos y tocá el botón “Confirmar cuenta”.
      </Text>

      <Pressable
        style={[styles.primaryButton, loading && { opacity: 0.6 }]}
        onPress={reenviarCorreo}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryText}>Reenviar correo</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.replace("/auth/login" as never)}
      >
        <Text style={styles.secondaryText}>Volver al login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 22,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    color: "#BDBDBD",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 14,
  },
  email: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 26,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 12,
  },
  secondaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});