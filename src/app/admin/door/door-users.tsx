import { useEffect, useMemo, useState } from "react";
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
  cambiarEstadoUsuarioPuertaAdminApi,
  crearUsuarioPuertaAdminApi,
  getUsuariosPuertaAdminApi,
} from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { UsuarioPuerta } from "../../../types/admin";

export default function AdminDoorUsersScreen() {
  const [usuarios, setUsuarios] = useState<UsuarioPuerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    loadUsuarios();
  }, []);

  async function loadUsuarios() {
    try {
      setLoading(true);
      const data = await getUsuariosPuertaAdminApi();
      setUsuarios(data);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data ?? "No se pudieron cargar usuarios de puerta.")
      );
    } finally {
      setLoading(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return usuarios;

    return usuarios.filter((u) => {
      return (
        u.nombreCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    });
  }, [usuarios, search]);

  async function crearUsuarioPuerta() {
    try {
      if (!email.trim() || !password.trim() || !nombreCompleto.trim()) {
        Alert.alert("Faltan datos", "Nombre, email y contraseña son obligatorios.");
        return;
      }

      setCreating(true);

      await crearUsuarioPuertaAdminApi({
        email: email.trim().toLowerCase(),
        password,
        nombreCompleto: nombreCompleto.trim(),
        telefono: telefono.trim() || undefined,
      });

      Alert.alert("Correcto", "Usuario de puerta creado correctamente.");

      setEmail("");
      setPassword("123456");
      setNombreCompleto("");
      setTelefono("");
      setShowCreate(false);

      await loadUsuarios();
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data ?? "No se pudo crear el usuario de puerta.")
      );
    } finally {
      setCreating(false);
    }
  }

  async function cambiarEstado(usuario: UsuarioPuerta) {
    try {
      await cambiarEstadoUsuarioPuertaAdminApi(usuario.id, !usuario.activo);
      await loadUsuarios();
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data ?? "No se pudo cambiar el estado.")
      );
    }
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Usuarios puerta">
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Gestión de puerta</Text>
          <Text style={styles.infoText}>
            Estos usuarios podrán iniciar sesión solo para escanear entradas,
            validar accesos y marcar bebidas o beneficios entregados.
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => setShowCreate(!showCreate)}
        >
          <Text style={styles.primaryText}>
            {showCreate ? "Cancelar" : "Crear usuario puerta"}
          </Text>
        </Pressable>

        {showCreate ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Nuevo usuario de puerta</Text>

            <Input
              label="Nombre completo"
              value={nombreCompleto}
              setValue={setNombreCompleto}
            />

            <Input
              label="Email"
              value={email}
              setValue={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Teléfono opcional"
              value={telefono}
              setValue={setTelefono}
              keyboardType="phone-pad"
            />

            <Input
              label="Contraseña"
              value={password}
              setValue={setPassword}
              secureTextEntry
            />

            <Pressable
              style={[styles.saveButton, creating && styles.disabledButton]}
              onPress={crearUsuarioPuerta}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Guardar usuario</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Usuarios creados</Text>

        <TextInput
          placeholder="Buscar por nombre, email o ID..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.searchInput}
        />

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : usuariosFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay usuarios de puerta.</Text>
          </View>
        ) : (
          usuariosFiltrados.map((usuario) => (
            <View key={usuario.id} style={styles.card}>
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {usuario.nombreCompleto.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{usuario.nombreCompleto}</Text>
                <Text style={styles.muted}>{usuario.email}</Text>
                <Text style={styles.muted}>Usuario ID: {usuario.id}</Text>

                {usuario.telefono ? (
                  <Text style={styles.muted}>Tel: {usuario.telefono}</Text>
                ) : null}

                <Text style={usuario.activo ? styles.active : styles.inactive}>
                  {usuario.activo ? "Activo" : "Inactivo"}
                </Text>

                <Pressable
                  style={[
                    styles.stateButton,
                    usuario.activo
                      ? styles.deactivateButton
                      : styles.activateButton,
                  ]}
                  onPress={() => cambiarEstado(usuario)}
                >
                  <Text style={styles.stateButtonText}>
                    {usuario.activo ? "Desactivar" : "Activar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function Input({
  label,
  value,
  setValue,
  keyboardType = "default",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      placeholder={label}
      placeholderTextColor="#888"
      value={value}
      onChangeText={setValue}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  infoText: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 10,
    marginBottom: 20,
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 10,
  },
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
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: {
    color: "#BDBDBD",
  },
  card: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  active: {
    color: "#20D67B",
    marginTop: 12,
    fontWeight: "900",
  },
  inactive: {
    color: "#FF4D57",
    marginTop: 12,
    fontWeight: "900",
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
  stateButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});