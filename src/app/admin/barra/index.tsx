import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { crearUsuarioBarraAdminApi } from "../../../api/adminUsersApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

export default function AdminBarraCreateScreen() {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);


  function getApiErrorMessage(error: any) {
  const data = error?.response?.data;

  if (!data) return error?.message ?? "Ocurrió un error inesperado.";

  if (typeof data === "string") return data;

  if (typeof data?.message === "string") return data.message;

  if (typeof data?.title === "string") return data.title;

  if (data?.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join("\n");
  }

  return JSON.stringify(data);
}

  async function crearUsuario() {
    try {
      if (!nombreCompleto.trim() || !email.trim() || !password.trim()) {
        Alert.alert("Faltan datos", "Nombre, email y contraseña son obligatorios.");
        return;
      }

      if (password.length < 6) {
        Alert.alert("Contraseña débil", "Usá al menos 6 caracteres.");
        return;
      }

      setSaving(true);
      await crearUsuarioBarraAdminApi({
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        password,
      });

      setNombreCompleto("");
      setEmail("");
      setTelefono("");
      setPassword("");

      Alert.alert("Correcto", "Usuario de barra creado.", [
        {
          text: "Ver listado",
          onPress: () =>
            router.push("/admin/barra/barra-users" as never),
        },
        { text: "Crear otro" },
      ]);
    } catch (e: any) {
  console.log("ERROR CREAR BARRA:", JSON.stringify(e?.response?.data, null, 2));
  Alert.alert("Error", getApiErrorMessage(e));
} finally {
  setSaving(false);
}
  }

  

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Crear barra">
        <View style={styles.card}>
          <Text style={styles.title}>Crear usuario barra</Text>

          <TextInput
            placeholder="Nombre completo"
            placeholderTextColor="#888"
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
            style={styles.input}
          />

          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            placeholder="Teléfono opcional"
            placeholderTextColor="#888"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            placeholder="Contraseña temporal"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            style={[styles.primaryButton, saving && styles.disabled]}
            onPress={crearUsuario}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear usuario</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              router.push("/admin/barra/barra-users" as never)
            }
          >
            <Text style={styles.buttonText}>Ver usuarios barra</Text>
          </Pressable>
        </View>
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
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});