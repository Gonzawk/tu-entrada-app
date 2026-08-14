import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
  actualizarBebidaAdminApi,
  crearBebidaAdminApi,
  getBebidasAdminApi,
} from "../../../api/drinksApi";
import { subirImagenApi } from "../../../api/imagesApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { formatMoney } from "../../../utils/formatMoney";

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function AdminCreateDrinkScreen() {
  const { bebidaId } = useLocalSearchParams<{ bebidaId?: string }>();
  const id = bebidaId ? Number(bebidaId) : null;
  const isEdit = !!id;

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imagenFile, setImagenFile] = useState<PickedImage | null>(null);

  const [precioBase, setPrecioBase] = useState("");
  const [disponibleGlobal, setDisponibleGlobal] = useState(true);
  const [activo, setActivo] = useState(true);

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEdit() {
      if (!id) return;

      try {
        setLoadingEdit(true);

        const result = await getBebidasAdminApi({
          page: 1,
          pageSize: 50,
          search: String(id),
        });

        const bebida = result.items.find((x) => x.id === id);

        if (!bebida) {
          Alert.alert("Error", "No se encontró la bebida.");
          return;
        }

        setNombre(bebida.nombre);
        setDescripcion(bebida.descripcion ?? "");
        setImagenUrl(bebida.imagenUrl ?? "");
        setPrecioBase(String(bebida.precioBase));
        setDisponibleGlobal(bebida.disponibleGlobal);
        setActivo(bebida.activo);
      } catch {
        Alert.alert("Error", "No se pudo cargar la bebida.");
      } finally {
        setLoadingEdit(false);
      }
    }

    loadEdit();
  }, [id]);

  async function seleccionarImagen() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitás permitir acceso a la galería para cargar una imagen."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];

      const fileName =
        asset.fileName ??
        `bebida-${Date.now()}.${
          asset.mimeType?.includes("png") ? "png" : "jpg"
        }`;

      const mimeType = asset.mimeType ?? "image/jpeg";

      setImagenFile({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      setImagenUrl(asset.uri);
    } catch {
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  }

  function crearFormData(
  precio: number,
  finalImagenUrl: string
) {
  const formData = new FormData();

  formData.append(
    "nombre",
    nombre.trim()
  );

  formData.append(
    "descripcion",
    descripcion.trim()
  );

  formData.append(
    "precioBase",
    String(precio)
  );

  formData.append(
    "disponibleGlobal",
    String(disponibleGlobal)
  );

  if (isEdit) {
    formData.append(
      "activo",
      String(activo)
    );
  }

  if (finalImagenUrl.trim()) {
    formData.append(
      "imagenUrl",
      finalImagenUrl.trim()
    );
  }

  return formData;
}

 async function guardar() {
  try {
    if (!nombre.trim()) {
      Alert.alert(
        "Faltan datos",
        "El nombre es obligatorio."
      );
      return;
    }

    const precio = Number(
      precioBase.replace(",", ".")
    );

    if (Number.isNaN(precio) || precio < 0) {
      Alert.alert(
        "Precio inválido",
        "Ingresá un precio válido."
      );
      return;
    }

    setSaving(true);

    /*
     * Si estamos editando y no seleccionamos
     * una nueva imagen, conservamos la URL actual.
     */
    let finalImagenUrl = imagenUrl.trim();

    /*
     * Si el administrador seleccionó una nueva
     * imagen desde el dispositivo, primero se
     * sube a ImgBB mediante nuestra API.
     */
    if (imagenFile) {
      finalImagenUrl =
        await subirImagenApi(imagenFile);
    }

    /*
     * La API de bebidas recibe solamente
     * la URL definitiva de la imagen.
     */
    const formData = crearFormData(
      precio,
      finalImagenUrl
    );

    if (isEdit && id) {
      await actualizarBebidaAdminApi(
        id,
        formData
      );

      Alert.alert(
        "Correcto",
        "Bebida actualizada correctamente."
      );
    } else {
      await crearBebidaAdminApi(
        formData
      );

      Alert.alert(
        "Correcto",
        "Bebida creada correctamente."
      );
    }

    router.replace(
      "/admin/drinks" as never
    );
  } catch (e: any) {
    console.log("ERROR GUARDANDO BEBIDA:", {
      status: e?.response?.status,
      data: e?.response?.data,
      message: e?.message,
    });

    Alert.alert(
      "Error",
      String(
        e?.response?.data?.message ??
          e?.response?.data ??
          e?.message ??
          "No se pudo guardar la bebida."
      )
    );
  } finally {
    setSaving(false);
  }
}

  if (loadingEdit) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title={isEdit ? "Editar bebida" : "Crear bebida"}>
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title={isEdit ? "Editar bebida" : "Crear bebida"}>
        <View style={styles.previewCard}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmoji}>🍹</Text>
              <Text style={styles.previewEmptyText}>Imagen de bebida</Text>
            </View>
          )}

          <Text style={styles.previewTitle}>{nombre || "Nombre de bebida"}</Text>

          <Text style={styles.previewDescription}>
            {descripcion || "Descripción de la bebida..."}
          </Text>

          <Text style={styles.previewPrice}>
            {formatMoney(Number(precioBase.replace(",", ".") || 0))}
          </Text>

          <Text style={disponibleGlobal ? styles.active : styles.inactive}>
            {disponibleGlobal ? "Disponible" : "No disponible"}
          </Text>
        </View>

        <View style={styles.form}>
          <Input label="Nombre" value={nombre} setValue={setNombre} />

          <Input
            label="Descripción"
            value={descripcion}
            setValue={setDescripcion}
          />

          <Pressable style={styles.imageButton} onPress={seleccionarImagen}>
            <Text style={styles.buttonText}>
              {imagenFile || imagenUrl ? "Cambiar imagen" : "Cargar imagen"}
            </Text>
          </Pressable>

          <Input
            label="Imagen URL opcional"
            value={!imagenFile ? imagenUrl : ""}
            setValue={(value) => {
              setImagenFile(null);
              setImagenUrl(value);
            }}
          />

          <Input
            label="Precio base"
            value={precioBase}
            setValue={setPrecioBase}
            keyboardType="numeric"
          />

          <Pressable
            style={disponibleGlobal ? styles.toggleOn : styles.toggleOff}
            onPress={() => setDisponibleGlobal(!disponibleGlobal)}
          >
            <Text style={styles.buttonText}>
              {disponibleGlobal ? "Disponible globalmente" : "No disponible"}
            </Text>
          </Pressable>

          {isEdit ? (
            <Pressable
              style={activo ? styles.toggleOn : styles.toggleOff}
              onPress={() => setActivo(!activo)}
            >
              <Text style={styles.buttonText}>
                {activo ? "Activo" : "Inactivo"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.saveButton, saving && styles.disabled]}
            onPress={guardar}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isEdit ? "Guardar cambios" : "Crear bebida"}
              </Text>
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
  keyboardType = "default",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <TextInput
      placeholder={label}
      placeholderTextColor="#888"
      value={value}
      onChangeText={setValue}
      keyboardType={keyboardType}
      autoCapitalize="none"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    marginBottom: 14,
  },
  previewEmpty: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  previewEmoji: {
    fontSize: 42,
  },
  previewEmptyText: {
    color: "#888",
    marginTop: 8,
    fontWeight: "800",
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  previewDescription: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  previewPrice: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 12,
  },
  active: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
  },
  inactive: {
    color: "#FF4D57",
    marginTop: 8,
    fontWeight: "900",
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  imageButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  toggleOn: {
    backgroundColor: "rgba(32,214,123,0.20)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  toggleOff: {
    backgroundColor: "rgba(255,77,87,0.20)",
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