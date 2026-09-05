import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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
  actualizarDatosBasicosEventoAdminApi,
  actualizarImagenesEventoAdminApi,
  subirImagenAdminApi,
} from "../../../api/adminApi";
import { getEventoDetalleAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

type EventoAdminDetalle = {
  id: number;
  nombre: string;
  descripcion?: string | null;

  lugar?: string | null;
  fechaInicio: string;

  bannerUrl?: string | null;
  imagenPrincipalUrl?: string | null;

  estado: string | number;
};

type ImageField = "banner" | "principal";

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

function formatFechaArgentina(value?: string | null) {
  if (!value) {
    return "Fecha no definida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEventImagesScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const id = Number(eventoId);

  const [evento, setEvento] = useState<EventoAdminDetalle | null>(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [imagenPrincipalUrl, setImagenPrincipalUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [guardandoImagenes, setGuardandoImagenes] = useState(false);
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null);

  const [bannerInicial, setBannerInicial] = useState("");
  const [imagenPrincipalInicial, setImagenPrincipalInicial] = useState("");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [nombreInicial, setNombreInicial] = useState("");
  const [descripcionInicial, setDescripcionInicial] = useState("");

  const cargarDatos = useCallback(
    async (modoActualizacion = false) => {
      if (!Number.isInteger(id) || id <= 0) {
        setLoading(false);
        Alert.alert("Evento inválido", "No se pudo identificar el evento.");
        return;
      }

      try {
        if (modoActualizacion) {
          setActualizando(true);
        } else {
          setLoading(true);
        }

        const data = (await getEventoDetalleAdminApi(
          id,
        )) as EventoAdminDetalle;

        const nombreEvento = data.nombre ?? "";
        const descripcionEvento = data.descripcion ?? "";
        const banner = data.bannerUrl ?? "";
        const principal = data.imagenPrincipalUrl ?? "";

        setEvento(data);

        setNombre(nombreEvento);
        setDescripcion(descripcionEvento);
        setNombreInicial(nombreEvento);
        setDescripcionInicial(descripcionEvento);

        setBannerUrl(banner);
        setImagenPrincipalUrl(principal);
        setBannerInicial(banner);
        setImagenPrincipalInicial(principal);
      } catch (error: any) {
        console.log("ERROR IMÁGENES EVENTO:", {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
          url: error?.config?.url,
          method: error?.config?.method,
        });

        Alert.alert(
          "No se pudo cargar",
          getApiErrorMessage(
            error,
            "No fue posible obtener las imágenes del evento.",
          ),
        );
      } finally {
        setLoading(false);
        setActualizando(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos]),
  );

  const tieneCambiosDatos =
    nombre.trim() !== nombreInicial.trim() ||
    descripcion.trim() !== descripcionInicial.trim();

  const tieneCambiosImagenes =
    bannerUrl.trim() !== bannerInicial.trim() ||
    imagenPrincipalUrl.trim() !== imagenPrincipalInicial.trim();

  const tieneCambios =
    tieneCambiosDatos || tieneCambiosImagenes;

  const bloqueado =
    guardandoDatos ||
    guardandoImagenes ||
    uploadingField !== null;

  async function seleccionarYSubirImagen(field: ImageField) {
    if (uploadingField !== null) {
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a la galería para seleccionar una imagen.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
        aspect: field === "banner" ? [16, 9] : [1, 1],
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.uri) {
        Alert.alert(
          "Imagen inválida",
          "No se pudo obtener la ubicación de la imagen seleccionada.",
        );
        return;
      }

      const extension = getImageExtension(asset.mimeType);

      const file = {
        uri: asset.uri,
        name:
          asset.fileName ??
          `evento-${field}-${Date.now()}.${extension}`,
        type: asset.mimeType ?? "image/jpeg",
      };

      setUploadingField(field);

      const uploadResult = await subirImagenAdminApi(file);
      const url = uploadResult.url ?? uploadResult.displayUrl;

      if (!url) {
        Alert.alert(
          "Respuesta inválida",
          "El servidor no devolvió la URL de la imagen.",
        );
        return;
      }

      if (field === "banner") {
        setBannerUrl(url);
      } else {
        setImagenPrincipalUrl(url);
      }

      Alert.alert(
        "Imagen cargada",
        field === "banner"
          ? "El banner se subió correctamente. Guardá los cambios para aplicarlo al evento."
          : "La imagen principal se subió correctamente. Guardá los cambios para aplicarla al evento.",
      );
    } catch (error: any) {
      console.log("ERROR SUBIENDO IMAGEN EVENTO:", {
        field,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
        method: error?.config?.method,
      });

      Alert.alert(
        "No se pudo subir",
        getApiErrorMessage(error, "No se pudo subir la imagen."),
      );
    } finally {
      setUploadingField(null);
    }
  }

  function limpiarImagen(field: ImageField) {
    if (field === "banner") {
      Alert.alert(
        "Quitar banner",
        "El evento quedará sin banner. ¿Querés continuar?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Quitar",
            style: "destructive",
            onPress: () => setBannerUrl(""),
          },
        ],
      );

      return;
    }

    Alert.alert(
      "Quitar imagen principal",
      "La imagen principal es opcional. ¿Querés quitarla?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Quitar",
          style: "destructive",
          onPress: () => setImagenPrincipalUrl(""),
        },
      ],
    );
  }

  function restaurarCambios() {
    if (!tieneCambios) {
      return;
    }

    Alert.alert(
      "Descartar cambios",
      "Se restaurarán las imágenes guardadas actualmente en el evento.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: () => {
            setNombre(nombreInicial);
            setDescripcion(descripcionInicial);
            setBannerUrl(bannerInicial);
            setImagenPrincipalUrl(imagenPrincipalInicial);
          },
        },
      ],
    );
  }

  async function guardarDatosBasicos() {
    const nombreLimpio = nombre.trim();
    const descripcionLimpia = descripcion.trim();

    if (!nombreLimpio) {
      Alert.alert(
        "Nombre requerido",
        "El evento debe tener un nombre."
      );
      return;
    }

    if (nombreLimpio.length > 150) {
      Alert.alert(
        "Nombre demasiado largo",
        "El nombre no puede superar los 150 caracteres."
      );
      return;
    }

    if (descripcionLimpia.length > 2000) {
      Alert.alert(
        "Descripción demasiado larga",
        "La descripción no puede superar los 2000 caracteres."
      );
      return;
    }

    try {
      setGuardandoDatos(true);

      const result =
        await actualizarDatosBasicosEventoAdminApi(
          id,
          {
            nombre: nombreLimpio,
            descripcion: descripcionLimpia || null,
          }
        );

      setEvento((current) =>
        current
          ? {
              ...current,
              nombre: result?.nombre ?? nombreLimpio,
              descripcion:
                result?.descripcion ??
                (descripcionLimpia || null),
            }
          : current
      );

      setNombre(nombreLimpio);
      setDescripcion(descripcionLimpia);
      setNombreInicial(nombreLimpio);
      setDescripcionInicial(descripcionLimpia);

      Alert.alert(
        "Evento actualizado",
        "El nombre y la descripción fueron actualizados correctamente."
      );
    } catch (error: any) {
      console.log("ERROR DATOS EVENTO:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        url: error?.config?.url,
        method: error?.config?.method,
      });

      Alert.alert(
        "No se pudo guardar",
        getApiErrorMessage(
          error,
          "No se pudieron actualizar los datos del evento."
        )
      );
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarImagenes() {
    const bannerLimpio = bannerUrl.trim();
    const principalLimpia = imagenPrincipalUrl.trim();

    if (!bannerLimpio) {
      Alert.alert(
        "Banner requerido",
        "El evento debe tener un banner. Seleccioná o ingresá una imagen.",
      );
      return;
    }

    try {
      setGuardandoImagenes(true);

      await actualizarImagenesEventoAdminApi(id, {
        bannerUrl: bannerLimpio,
        imagenPrincipalUrl: principalLimpia || null,
      });

      setEvento((current) =>
        current
          ? {
              ...current,
              bannerUrl: bannerLimpio,
              imagenPrincipalUrl: principalLimpia || null,
            }
          : current,
      );

      setBannerInicial(bannerLimpio);
      setImagenPrincipalInicial(principalLimpia);

      Alert.alert(
        "Imágenes actualizadas",
        "El banner y la imagen principal fueron guardados correctamente.",
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo guardar",
        getApiErrorMessage(
          error,
          "No se pudieron actualizar las imágenes del evento.",
        ),
      );
    } finally {
      setGuardandoImagenes(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Editar evento">
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#E50914" size="large" />
            <Text style={styles.loaderText}>Cargando evento...</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Editar evento">
        {evento ? (
          <View style={styles.eventCard}>
            {bannerUrl.trim() ? (
              <Image
                source={{ uri: bannerUrl.trim() }}
                style={styles.eventBanner}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.eventBannerPlaceholder}>
                <Text style={styles.eventBannerPlaceholderText}>
                  Sin banner guardado
                </Text>
              </View>
            )}

            <View style={styles.eventInfo}>
              <View style={styles.eventTitleRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>
                    {nombre.trim() || evento.nombre}
                  </Text>

                  {evento.lugar ? (
                    <Text style={styles.muted}>{evento.lugar}</Text>
                  ) : null}
                </View>

                <View style={styles.eventStatusBadge}>
                  <Text style={styles.eventStatusText}>
                    {String(evento.estado)}
                  </Text>
                </View>
              </View>

              <Text style={styles.dateText}>
                {formatFechaArgentina(evento.fechaInicio)}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.basicDataCard}>
          <Text style={styles.sectionTitle}>
            Datos básicos
          </Text>

          <Text style={styles.sectionSubtitle}>
            Podés modificar el nombre y la descripción incluso después de
            publicar el evento.
          </Text>

          <Text style={styles.formLabel}>
            Nombre del evento
          </Text>

          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: SAVAGE"
            placeholderTextColor="#777777"
            editable={!guardandoDatos}
            maxLength={150}
            style={[
              styles.input,
              guardandoDatos && styles.inputDisabled,
            ]}
          />

          <Text style={styles.formLabel}>
            Descripción
          </Text>

          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Descripción del evento..."
            placeholderTextColor="#777777"
            editable={!guardandoDatos}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.descriptionInput,
              guardandoDatos && styles.inputDisabled,
            ]}
          />

          <Text style={styles.counterText}>
            {descripcion.length}/2000
          </Text>

          <Pressable
            style={[
              styles.primaryButton,
              (!tieneCambiosDatos || guardandoDatos) &&
                styles.disabledButton,
            ]}
            onPress={() => void guardarDatosBasicos()}
            disabled={!tieneCambiosDatos || guardandoDatos}
          >
            {guardandoDatos ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Guardar datos básicos
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Presentación visual</Text>
          <Text style={styles.infoText}>
            El banner se utiliza en el encabezado y en los listados. La imagen
            principal puede utilizarse en tarjetas, detalles o piezas
            promocionales del evento.
          </Text>
        </View>

        <ImageEditorCard
          title="Banner del evento"
          subtitle="Recomendado: formato horizontal 16:9 y buena resolución."
          value={bannerUrl}
          previewStyle={styles.bannerPreview}
          uploading={uploadingField === "banner"}
          disabled={guardandoImagenes || uploadingField !== null}
          onChange={setBannerUrl}
          onUpload={() => void seleccionarYSubirImagen("banner")}
          onRemove={() => limpiarImagen("banner")}
        />

        <ImageEditorCard
          title="Imagen principal"
          subtitle="Recomendado: formato cuadrado 1:1. Esta imagen es opcional."
          value={imagenPrincipalUrl}
          previewStyle={styles.mainImagePreview}
          uploading={uploadingField === "principal"}
          disabled={guardandoImagenes || uploadingField !== null}
          onChange={setImagenPrincipalUrl}
          onUpload={() => void seleccionarYSubirImagen("principal")}
          onRemove={() => limpiarImagen("principal")}
        />

        <View style={styles.changesBox}>
          <View style={styles.changesContent}>
            <Text style={styles.changesTitle}>
              {tieneCambiosImagenes ? "Cambios pendientes" : "Todo actualizado"}
            </Text>

            <Text style={styles.changesText}>
              {tieneCambiosImagenes
                ? "Las imágenes seleccionadas todavía no fueron asociadas al evento."
                : "Las imágenes visibles coinciden con las guardadas en el servidor."}
            </Text>
          </View>

          <View
            style={[
              styles.changesIndicator,
              tieneCambiosImagenes
                ? styles.changesIndicatorPending
                : styles.changesIndicatorSaved,
            ]}
          />
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            (!tieneCambiosImagenes ||
              guardandoImagenes ||
              uploadingField !== null) &&
              styles.disabledButton,
          ]}
          onPress={() => void guardarImagenes()}
          disabled={
            !tieneCambiosImagenes ||
            guardandoImagenes ||
            uploadingField !== null
          }
        >
          {guardandoImagenes ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Guardar imágenes</Text>
          )}
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.secondaryButton,
              (!tieneCambios || bloqueado) && styles.disabledButton,
            ]}
            onPress={restaurarCambios}
            disabled={!tieneCambios || bloqueado}
          >
            <Text style={styles.buttonText}>Descartar cambios</Text>
          </Pressable>

          <Pressable
            style={[
              styles.refreshButton,
              (actualizando || bloqueado) && styles.disabledButton,
            ]}
            onPress={() => void cargarDatos(true)}
            disabled={actualizando || bloqueado}
          >
            {actualizando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Actualizar</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </AppLayout>
    </RoleGuard>
  );
}

function ImageEditorCard({
  title,
  subtitle,
  value,
  previewStyle,
  uploading,
  disabled,
  onChange,
  onUpload,
  onRemove,
}: {
  title: string;
  subtitle: string;
  value: string;
  previewStyle: object;
  uploading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onUpload: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.imageCard}>
      <View style={styles.imageCardHeader}>
        <Text style={styles.imageCardTitle}>{title}</Text>
        <Text style={styles.imageCardSubtitle}>{subtitle}</Text>
      </View>

      {value.trim() ? (
        <Image
          source={{ uri: value.trim() }}
          style={previewStyle}
          resizeMode="cover"
        />
      ) : (
        <View style={[previewStyle, styles.previewPlaceholder]}>
          <Text style={styles.previewPlaceholderTitle}>Sin imagen</Text>
          <Text style={styles.previewPlaceholderText}>
            Seleccioná una imagen o ingresá una URL.
          </Text>
        </View>
      )}

      <Text style={styles.formLabel}>URL de la imagen</Text>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="https://..."
        placeholderTextColor="#777777"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        style={[
          styles.input,
          disabled && styles.inputDisabled,
        ]}
      />

      <Pressable
        style={[
          styles.uploadButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onUpload}
        disabled={disabled}
      >
        {uploading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Seleccionar y subir imagen</Text>
        )}
      </Pressable>

      {value.trim() ? (
        <Pressable
          style={[
            styles.removeButton,
            disabled && styles.disabledButton,
          ]}
          onPress={onRemove}
          disabled={disabled}
        >
          <Text style={styles.removeButtonText}>Quitar imagen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    gap: 14,
  },
  loaderText: {
    color: "#BDBDBD",
    fontWeight: "700",
  },
  flex: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  eventBanner: {
    width: "100%",
    height: 145,
    backgroundColor: "#171717",
  },
  eventBannerPlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  },
  eventBannerPlaceholderText: {
    color: "#737373",
    fontWeight: "800",
  },
  eventInfo: {
    padding: 16,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  muted: {
    color: "#AFAFAF",
    marginTop: 4,
  },
  dateText: {
    color: "#D2D2D2",
    fontWeight: "700",
    marginTop: 9,
  },
  eventStatusBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(229,9,20,0.14)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  eventStatusText: {
    color: "#FF737A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  basicDataCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 15,
    marginTop: 14,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: "#929292",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 4,
  },

  infoBox: {
    backgroundColor: "rgba(229,9,20,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.22)",
    padding: 15,
    marginTop: 14,
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  infoText: {
    color: "#BEBEBE",
    lineHeight: 20,
    marginTop: 6,
  },
  imageCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 15,
    marginTop: 14,
  },
  imageCardHeader: {
    marginBottom: 12,
  },
  imageCardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  imageCardSubtitle: {
    color: "#929292",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  bannerPreview: {
    width: "100%",
    height: 178,
    borderRadius: 16,
    backgroundColor: "#111111",
  },
  mainImagePreview: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 330,
    borderRadius: 18,
    backgroundColor: "#111111",
  },
  previewPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
  },
  previewPlaceholderTitle: {
    color: "#BDBDBD",
    fontSize: 16,
    fontWeight: "900",
  },
  previewPlaceholderText: {
    color: "#777777",
    textAlign: "center",
    marginTop: 5,
    paddingHorizontal: 18,
  },
  formLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 13,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    paddingHorizontal: 13,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 13,
    paddingBottom: 13,
  },

  counterText: {
    color: "#777777",
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },

  inputDisabled: {
    opacity: 0.55,
  },
  uploadButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.42)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 14,
  },
  removeButton: {
    minHeight: 43,
    borderRadius: 14,
    backgroundColor: "rgba(255,77,87,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 14,
  },
  removeButtonText: {
    color: "#FF737A",
    fontWeight: "900",
  },
  changesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 14,
    marginTop: 14,
  },
  changesContent: {
    flex: 1,
  },
  changesTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  changesText: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  changesIndicator: {
    width: 13,
    height: 13,
    borderRadius: 999,
  },
  changesIndicatorPending: {
    backgroundColor: "#FFD166",
  },
  changesIndicatorSaved: {
    backgroundColor: "#20D67B",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 9,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,77,87,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  refreshButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  bottomSpace: {
    height: 34,
  },
});