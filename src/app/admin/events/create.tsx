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
import { crearEventoAdminApi, subirImagenAdminApi } from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

function buildArgentinaDateTime(date: string, time: string) {
  return `${date.trim()}T${time.trim()}:00-03:00`;
}

type ImageUploadKey = "banner" | "principal";

function getImageExtension(mimeType?: string | null) {
  switch (mimeType?.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

export default function AdminCreateEventScreen() {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [lugar, setLugar] = useState("");
  const [direccion, setDireccion] = useState("");

  const [fechaInicioDia, setFechaInicioDia] = useState("2026-12-20");
  const [fechaInicioHora, setFechaInicioHora] = useState("23:30");
  const [fechaFinDia, setFechaFinDia] = useState("2026-12-21");
  const [fechaFinHora, setFechaFinHora] = useState("06:00");

  const [bannerUrl, setBannerUrl] = useState("");
  const [imagenPrincipalUrl, setImagenPrincipalUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

  const fechaInicio = buildArgentinaDateTime(fechaInicioDia, fechaInicioHora);
  const fechaFin = buildArgentinaDateTime(fechaFinDia, fechaFinHora);
  async function pickAndUploadImage(
    onUploaded: (url: string) => void,
    uploadKey: ImageUploadKey
  ) {
    if (uploadingImageKey !== null) {
      return;
    }

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
        quality: 0.9,
        allowsEditing: true,
        aspect:
          uploadKey === "banner"
            ? [16, 9]
            : [1, 1],
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.uri) {
        Alert.alert(
          "Imagen inválida",
          "No se pudo obtener la imagen seleccionada."
        );
        return;
      }

      const extension = getImageExtension(asset.mimeType);

      const file = {
        uri: asset.uri,
        name:
          asset.fileName ??
          `evento-${uploadKey}-${Date.now()}.${extension}`,
        type: asset.mimeType ?? "image/jpeg",
      };

      setUploadingImageKey(uploadKey);

      const uploadResult =
        await subirImagenAdminApi(file);

      const url =
        uploadResult?.url ??
        uploadResult?.displayUrl;

      if (!url) {
        Alert.alert(
          "Error",
          "No se recibió una URL válida de la imagen."
        );
        return;
      }

      onUploaded(url);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            e?.message ??
            "No se pudo subir la imagen."
        )
      );
    } finally {
      setUploadingImageKey(null);
    }
  }

  async function crearEvento() {
    try {
      if (saving) return;

      if (!nombre.trim() || !lugar.trim() || !fechaInicioDia.trim() || !fechaInicioHora.trim()) {
        Alert.alert(
          "Faltan datos",
          "Nombre, lugar, fecha y hora de inicio son obligatorios."
        );
        return;
      }

      if (!bannerUrl.trim()) {
        Alert.alert("Falta banner", "Subí un banner para el evento.");
        return;
      }

      setSaving(true);

      await crearEventoAdminApi({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        lugar: lugar.trim(),
        direccion: direccion.trim(),
        fechaInicio,
        fechaFin,
        bannerUrl: bannerUrl.trim(),
        imagenPrincipalUrl: imagenPrincipalUrl.trim() || bannerUrl.trim(),
      });

      Alert.alert("Correcto", "Evento creado como borrador.");
      router.replace("/admin/events/events" as never);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? e?.response?.data ?? e?.message ?? "No se pudo crear.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Crear evento">
        <Text style={styles.previewLabel}>Previsualización</Text>

        <View style={styles.previewCard}>
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.previewBanner}
              resizeMode="cover"
            />
          ) : (
            <Pressable
              style={styles.previewBannerEmpty}
              onPress={() => pickAndUploadImage(setBannerUrl, "banner")}
            >
              {uploadingImageKey === "banner" ? (
                <ActivityIndicator color="#E50914" />
              ) : (
                <Text style={styles.previewEmptyText}>Subir banner del evento</Text>
              )}
            </Pressable>
          )}

          <Text style={styles.previewTitle}>{nombre.trim() || "Nombre del evento"}</Text>
          <Text style={styles.previewPlace}>{lugar.trim() || "Lugar del evento"}</Text>
          <Text style={styles.previewDate}>{fechaInicio}</Text>

          {descripcion.trim() ? (
            <Text style={styles.previewDescription}>{descripcion}</Text>
          ) : (
            <Text style={styles.previewDescriptionMuted}>Descripción del evento...</Text>
          )}

          <View style={styles.previewStatus}>
            <Text style={styles.previewStatusText}>Borrador</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Datos del evento</Text>

          <Input label="Nombre" value={nombre} setValue={setNombre} />
          <Input label="Descripción" value={descripcion} setValue={setDescripcion} multiline />
          <Input label="Lugar" value={lugar} setValue={setLugar} />
          <Input label="Dirección" value={direccion} setValue={setDireccion} />

          <Text style={styles.sectionLabel}>Fecha de inicio</Text>
          <View style={styles.row}>
            <Input label="YYYY-MM-DD" value={fechaInicioDia} setValue={setFechaInicioDia} half />
            <Input label="HH:mm" value={fechaInicioHora} setValue={setFechaInicioHora} half />
          </View>

          <Text style={styles.sectionLabel}>Fecha de finalización</Text>
          <View style={styles.row}>
            <Input label="YYYY-MM-DD" value={fechaFinDia} setValue={setFechaFinDia} half />
            <Input label="HH:mm" value={fechaFinHora} setValue={setFechaFinHora} half />
          </View>

          <Text style={styles.helpText}>
            Se enviará a la API con zona horaria Argentina: -03:00.
          </Text>

          <Text style={styles.imageHelpText}>
            Banner recomendado: 1920 × 1080 px (16:9). La imagen se recortará
            automáticamente a esa proporción antes de subirse.
          </Text>

          <Pressable
            style={styles.uploadButton}
            onPress={() => pickAndUploadImage(setBannerUrl, "banner")}
            disabled={uploadingImageKey !== null}
          >
            {uploadingImageKey === "banner" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {bannerUrl ? "Cambiar banner" : "Subir banner"}
              </Text>
            )}
          </Pressable>

          {bannerUrl ? (
            <Image
  source={{ uri: bannerUrl }}
  style={styles.previewBanner}
  resizeMode="cover"
/>
          ) : null}

          <Pressable
            style={styles.uploadSecondaryButton}
            onPress={() => pickAndUploadImage(setImagenPrincipalUrl, "principal")}
            disabled={uploadingImageKey !== null}
          >
            {uploadingImageKey === "principal" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {imagenPrincipalUrl ? "Cambiar imagen principal" : "Subir imagen principal opcional"}
              </Text>
            )}
          </Pressable>

          {imagenPrincipalUrl ? (
            <Image
              source={{ uri: imagenPrincipalUrl }}
              style={styles.previewMainImage}
              resizeMode="cover"
            />
          ) : null}

          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={crearEvento}
            disabled={saving || uploadingImageKey !== null}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Guardar como borrador</Text>
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
  multiline = false,
  half = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  multiline?: boolean;
  half?: boolean;
}) {
  return (
    <TextInput
      placeholder={label}
      placeholderTextColor="#888"
      value={value}
      onChangeText={setValue}
      autoCapitalize="none"
      multiline={multiline}
      style={[styles.input, multiline && styles.textArea, half && styles.halfInput]}
    />
  );
}

const styles = StyleSheet.create({
  previewLabel: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 18,
  },
  previewBanner: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    marginBottom: 14,
  },
  previewBannerEmpty: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  previewEmptyText: {
    color: "#888",
    fontWeight: "800",
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  previewPlace: {
    color: "#E50914",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  previewDate: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  previewDescription: {
    color: "#D6D6D6",
    marginTop: 12,
    lineHeight: 20,
  },
  previewDescriptionMuted: {
    color: "#777",
    marginTop: 12,
    lineHeight: 20,
  },
  previewStatus: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,209,102,0.15)",
  },
  previewStatusText: {
    color: "#FFD166",
    fontWeight: "900",
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    marginBottom: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 4,
  },
  helpText: {
  color: "#BDBDBD",
  fontSize: 12,
  lineHeight: 17,
},

imageHelpText: {
  color: "#AFAFAF",
  fontSize: 12,
  lineHeight: 18,
  marginTop: 4,
  marginBottom: 2,
},

row: {
  flexDirection: "row",
  gap: 10,
},
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#fff",
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  previewMainImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
  },
  uploadButton: {
    backgroundColor: "rgba(229,9,20,0.85)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },
  uploadSecondaryButton: {
    backgroundColor: "rgba(255,255,255,0.14)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 6,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
  },
});