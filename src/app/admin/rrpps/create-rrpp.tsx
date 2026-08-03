import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  buscarUsuariosAdminApi,
  crearRRPPAdminApi,
  subirImagenAdminApi,
} from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { UsuarioLookup } from "../../../types/admin";

export default function AdminCreateRRPPScreen() {
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<UsuarioLookup[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioLookup | null>(null);

  const [queryUsuario, setQueryUsuario] = useState("");
  const [nombrePublico, setNombrePublico] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [searching, setSearching] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imagenFile] = useState<{
  uri: string;
  name: string;
  type: string;
} | null>(null);

  async function buscarUsuarios() {
    try {
      if (!queryUsuario.trim()) {
        Alert.alert("Buscar usuario", "Ingresá un email o nombre.");
        return;
      }

      setSearching(true);

      const data = await buscarUsuariosAdminApi(queryUsuario.trim());
      setUsuariosEncontrados(data ?? []);

      if (!data || data.length === 0) {
        Alert.alert("Sin resultados", "No se encontraron usuarios.");
      }
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? e?.response?.data ?? "No se pudo buscar.")
      );
    } finally {
      setSearching(false);
    }
  }

  function seleccionarUsuario(usuario: UsuarioLookup) {
    setUsuarioSeleccionado(usuario);
    setNombrePublico(usuario.nombreCompleto);
    setTelefonoContacto(usuario.telefono ?? "");
  }

  async function seleccionarImagen() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitás permitir acceso a la galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];

      const fileName = asset.fileName ?? `rrpp-avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";

      setUploadingImage(true);

      const uploaded = await subirImagenAdminApi({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      setAvatarUrl(uploaded.url);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? e?.response?.data ?? "No se pudo subir la imagen.")
      );
    } finally {
      setUploadingImage(false);
    }
  }

  async function crearRRPP() {
  try {
    if (!usuarioSeleccionado) {
      Alert.alert("Falta usuario", "Seleccioná un usuario.");
      return;
    }

    if (!nombrePublico.trim()) {
      Alert.alert("Falta nombre público", "Ingresá el nombre público.");
      return;
    }

    setCreating(true);

    const formData = new FormData();

    formData.append("usuarioId", String(usuarioSeleccionado.id));
    formData.append("nombrePublico", nombrePublico.trim());
    formData.append("instagram", instagram.trim());
    formData.append("telefonoContacto", telefonoContacto.trim());
    formData.append("avatarUrl", avatarUrl.trim());

    if (imagenFile) {
      formData.append("avatar", {
        uri: imagenFile.uri,
        name: imagenFile.name,
        type: imagenFile.type,
      } as any);
    }

    await crearRRPPAdminApi({
  usuarioId: usuarioSeleccionado.id,
  nombrePublico: nombrePublico.trim(),
  instagram: instagram.trim() || undefined,
  telefonoContacto: telefonoContacto.trim() || undefined,
  avatarUrl: avatarUrl.trim() || undefined,
  avatar: imagenFile ?? undefined,
});

    Alert.alert("Correcto", "RRPP creado correctamente.");
    router.replace("/admin/rrpps/rrpps" as never);
  } catch (e: any) {
    Alert.alert(
      "Error",
      String(
        e?.response?.data?.message ??
          e?.response?.data ??
          "No se pudo crear."
      )
    );
  } finally {
    setCreating(false);
  }
}

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Crear RRPP">
        <View style={styles.form}>
          <Text style={styles.formTitle}>Buscar usuario</Text>

          <View style={styles.searchRow}>
            <TextInput
              placeholder="Email o nombre"
              placeholderTextColor="#888"
              value={queryUsuario}
              onChangeText={setQueryUsuario}
              autoCapitalize="none"
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={buscarUsuarios}
            />

            <Pressable
              style={[styles.searchButton, searching && styles.disabled]}
              onPress={buscarUsuarios}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Buscar</Text>
              )}
            </Pressable>
          </View>

          {usuariosEncontrados.map((usuario) => {
            const selected = usuarioSeleccionado?.id === usuario.id;

            return (
              <Pressable
                key={usuario.id}
                style={[styles.userResult, selected && styles.userResultSelected]}
                onPress={() => seleccionarUsuario(usuario)}
              >
                <Text style={styles.title}>
                  #{usuario.id} - {usuario.nombreCompleto}
                </Text>
                <Text style={styles.muted}>{usuario.email}</Text>
                {usuario.telefono ? (
                  <Text style={styles.muted}>{usuario.telefono}</Text>
                ) : null}
              </Pressable>
            );
          })}

          {usuarioSeleccionado ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedText}>Usuario seleccionado</Text>
              <Text style={styles.title}>{usuarioSeleccionado.nombreCompleto}</Text>
              <Text style={styles.muted}>{usuarioSeleccionado.email}</Text>
            </View>
          ) : null}

          <Text style={styles.formTitle}>Datos públicos RRPP</Text>

          <Input label="Nombre público" value={nombrePublico} setValue={setNombrePublico} />
          <Input label="Instagram opcional" value={instagram} setValue={setInstagram} />
          <Input
            label="Teléfono contacto opcional"
            value={telefonoContacto}
            setValue={setTelefonoContacto}
          />

          <View style={styles.avatarBox}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.preview} />
            ) : (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>Avatar RRPP</Text>
              </View>
            )}

            <Pressable
              style={[styles.secondaryButton, uploadingImage && styles.disabled]}
              onPress={seleccionarImagen}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Cargar imagen</Text>
              )}
            </Pressable>
          </View>

          <Input label="Avatar URL opcional" value={avatarUrl} setValue={setAvatarUrl} />

          <Pressable
            style={[styles.saveButton, creating && styles.disabled]}
            onPress={crearRRPP}
            disabled={creating || !usuarioSeleccionado || !nombrePublico.trim()}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar RRPP</Text>
            )}
          </Pressable>
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function Input({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <TextInput
      placeholder={label}
      placeholderTextColor="#888"
      value={value}
      onChangeText={setValue}
      autoCapitalize="none"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchButton: {
    backgroundColor: "#E50914",
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: "center",
    minWidth: 86,
    alignItems: "center",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  userResult: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  userResultSelected: {
    borderColor: "#E50914",
    backgroundColor: "rgba(229,9,20,0.18)",
  },
  selectedBox: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 12,
    borderRadius: 16,
  },
  selectedText: {
    color: "#20D67B",
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  avatarBox: {
    backgroundColor: "rgba(0,0,0,0.20)",
    padding: 12,
    borderRadius: 18,
    gap: 10,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },
  previewEmpty: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmptyText: {
    color: "#888",
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});