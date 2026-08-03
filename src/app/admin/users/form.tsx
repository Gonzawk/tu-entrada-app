import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
  actualizarAdminUsuarioApi,
  agregarRolAdminUsuarioApi,
  crearAdminUsuarioApi,
  getAdminUsuarioDetalleApi,
  quitarRolAdminUsuarioApi,
} from "../../../api/adminUsersApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { UserRole } from "../../../types/auth";

const ROLES: UserRole[] = [
  "Usuario",
  "Admin",
  "RRPP",
  "Puerta",
  "Barra",
  "Ventanilla",
  "SuperAdmin",
];

export default function AdminUserFormScreen() {
  const { usuarioId } = useLocalSearchParams<{ usuarioId?: string }>();
  const id = usuarioId ? Number(usuarioId) : null;
  const isEdit = Boolean(id);

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("123456");
  const [roles, setRoles] = useState<UserRole[]>(["Usuario"]);

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEdit() {
      if (!id) return;

      try {
        setLoadingEdit(true);

        const data = await getAdminUsuarioDetalleApi(id);

        setNombreCompleto(data.nombreCompleto ?? "");
        setEmail(data.email ?? "");
        setTelefono(data.telefono ?? "");
        setRoles(data.roles ?? []);
      } catch (e: any) {
        Alert.alert(
          "Error",
          String(
            e?.response?.data?.message ??
              e?.response?.data ??
              "No se pudo cargar el usuario."
          )
        );
      } finally {
        setLoadingEdit(false);
      }
    }

    loadEdit();
  }, [id]);

  function toggleRol(rol: UserRole) {
    setRoles((prev) =>
      prev.includes(rol) ? prev.filter((x) => x !== rol) : [...prev, rol]
    );
  }

  async function guardar() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!nombreCompleto.trim() || !normalizedEmail) {
      Alert.alert("Faltan datos", "Completá nombre y email.");
      return;
    }

    if (!isEdit && !password.trim()) {
      Alert.alert("Faltan datos", "Completá la contraseña.");
      return;
    }

    if (!isEdit && roles.length === 0) {
      Alert.alert("Faltan roles", "Seleccioná al menos un rol.");
      return;
    }

    try {
      setSaving(true);

      if (!isEdit) {
        await crearAdminUsuarioApi({
          nombreCompleto: nombreCompleto.trim(),
          email: normalizedEmail,
          telefono: telefono.trim() || null,
          password: password.trim(),
          roles,
        });

        Alert.alert("Correcto", "Usuario creado.");
        router.replace("/admin/users" as never);
        return;
      }

      if (!id) return;

      await actualizarAdminUsuarioApi(id, {
        nombreCompleto: nombreCompleto.trim(),
        email: normalizedEmail,
        telefono: telefono.trim() || null,
      });

      Alert.alert("Correcto", "Usuario actualizado.");
      router.replace("/admin/users" as never);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo guardar."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function agregarRol(rol: UserRole) {
    if (!id) return;

    try {
      await agregarRolAdminUsuarioApi(id, rol);

      setRoles((prev) => (prev.includes(rol) ? prev : [...prev, rol]));

      Alert.alert("Correcto", `Rol ${rol} agregado.`);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo agregar el rol.")
      );
    }
  }

  async function quitarRol(rol: UserRole) {
    if (!id) return;

    try {
      await quitarRolAdminUsuarioApi(id, rol);

      setRoles((prev) => prev.filter((x) => x !== rol));

      Alert.alert("Correcto", `Rol ${rol} quitado.`);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo quitar el rol.")
      );
    }
  }

  if (loadingEdit) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Editar usuario">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title={isEdit ? "Editar usuario" : "Crear usuario"}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isEdit ? `Datos del usuario #${id}` : "Datos del usuario"}
          </Text>

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
            placeholder="Teléfono"
            placeholderTextColor="#888"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
          />

          {!isEdit ? (
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
          ) : null}

          {!isEdit ? (
            <>
              <Text style={styles.sectionTitle}>Roles</Text>

              <View style={styles.rolesGrid}>
                {ROLES.map((rol) => (
                  <Pressable
                    key={rol}
                    style={roles.includes(rol) ? styles.roleActive : styles.role}
                    onPress={() => toggleRol(rol)}
                  >
                    <Text style={styles.roleText}>{rol}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Pressable
            style={[styles.primaryButton, saving && styles.disabled]}
            onPress={guardar}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {isEdit ? "Guardar cambios" : "Crear usuario"}
              </Text>
            )}
          </Pressable>
        </View>

        {isEdit ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gestión de roles</Text>

            <Text style={styles.help}>
              Roles actuales: {roles.length ? roles.join(", ") : "Sin roles"}
            </Text>

            {ROLES.map((rol) => {
              const hasRole = roles.includes(rol);

              return (
                <View key={rol} style={styles.roleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleName}>{rol}</Text>
                    <Text style={hasRole ? styles.roleStatusOn : styles.roleStatusOff}>
                      {hasRole ? "Asignado" : "No asignado"}
                    </Text>
                  </View>

                  <View style={styles.roleActions}>
                    <Pressable
                      style={[styles.successSmall, hasRole && styles.disabled]}
                      onPress={() => agregarRol(rol)}
                      disabled={hasRole}
                    >
                      <Text style={styles.primaryText}>Agregar</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.dangerSmall, !hasRole && styles.disabled]}
                      onPress={() => quitarRol(rol)}
                      disabled={!hasRole}
                    >
                      <Text style={styles.primaryText}>Quitar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    borderRadius: 22,
    gap: 12,
    marginBottom: 16,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  help: {
    color: "#BDBDBD",
    lineHeight: 20,
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  role: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  roleActive: {
    backgroundColor: "#E50914",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  roleText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.45,
  },
  roleRow: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  roleName: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  roleStatusOn: {
    color: "#20D67B",
    marginTop: 4,
    fontWeight: "800",
  },
  roleStatusOff: {
    color: "#BDBDBD",
    marginTop: 4,
    fontWeight: "800",
  },
  roleActions: {
    flexDirection: "row",
    gap: 8,
  },
  successSmall: {
    flex: 1,
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerSmall: {
    flex: 1,
    backgroundColor: "rgba(255,77,87,0.20)",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
});