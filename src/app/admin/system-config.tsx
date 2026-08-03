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
    actualizarConfiguracionSistemaAdminApi,
    getConfiguracionSistemaAdminApi,
} from "../../api/configuracionApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";

export default function SystemConfigScreen() {
  const [nombreSistema, setNombreSistema] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimario, setColorPrimario] = useState("#E50914");
  const [colorSecundario, setColorSecundario] = useState("#000000");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [mercadoPagoActivo, setMercadoPagoActivo] = useState(false);

  const [cargoActivo, setCargoActivo] = useState(true);
  const [cargoMonto, setCargoMonto] = useState("0");
  const [cargoDescripcion, setCargoDescripcion] = useState(
    "Cargo por servicio de la plataforma"
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const data = await getConfiguracionSistemaAdminApi();

      setNombreSistema(data.nombreSistema ?? "");
      setLogoUrl(data.logoUrl ?? "");
      setColorPrimario(data.colorPrimario ?? "#E50914");
      setColorSecundario(data.colorSecundario ?? "#000000");
      setInstagram(data.instagram ?? "");
      setWhatsapp(data.whatsapp ?? "");

      setMercadoPagoActivo(data.mercadoPagoActivo);

      setCargoActivo(data.cargoServicioEntradasActivo);
      setCargoMonto(String(data.cargoServicioEntradasMonto ?? 0));
      setCargoDescripcion(
        data.cargoServicioEntradasDescripcion ??
          "Cargo por servicio de la plataforma"
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo cargar la configuración."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      const montoNumber = Number(cargoMonto);

      if (Number.isNaN(montoNumber) || montoNumber < 0) {
        Alert.alert("Dato inválido", "El cargo por servicio debe ser igual o mayor a 0.");
        return;
      }

      setSaving(true);

      await actualizarConfiguracionSistemaAdminApi({
        nombreSistema: nombreSistema.trim() || "Lucky",
        logoUrl: logoUrl.trim() || null,
        colorPrimario: colorPrimario.trim() || "#E50914",
        colorSecundario: colorSecundario.trim() || "#000000",
        instagram: instagram.trim() || null,
        whatsapp: whatsapp.trim() || null,

        mercadoPagoActivo,

        cargoServicioEntradasActivo: cargoActivo,
        cargoServicioEntradasMonto: montoNumber,
        cargoServicioEntradasDescripcion:
          cargoDescripcion.trim() || "Cargo por servicio de la plataforma",
      });

      Alert.alert("Correcto", "Configuración actualizada.");
      await load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo guardar la configuración."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["SuperAdmin"]}>
        <AppLayout title="Configuración">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["SuperAdmin"]}>
      <AppLayout title="Configuración">
        <View style={styles.card}>
          <Text style={styles.title}>Datos del sistema</Text>

          <Input label="Nombre sistema" value={nombreSistema} setValue={setNombreSistema} />
          <Input label="Logo URL" value={logoUrl} setValue={setLogoUrl} />
          <Input label="Color primario" value={colorPrimario} setValue={setColorPrimario} />
          <Input label="Color secundario" value={colorSecundario} setValue={setColorSecundario} />
          <Input label="Instagram" value={instagram} setValue={setInstagram} />
          <Input label="Whatsapp" value={whatsapp} setValue={setWhatsapp} />

          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Pagos</Text>

          <Pressable
            style={[styles.toggle, mercadoPagoActivo && styles.toggleActive]}
            onPress={() => setMercadoPagoActivo((prev) => !prev)}
          >
            <Text style={styles.buttonText}>
              {mercadoPagoActivo ? "Mercado Pago activo" : "Mercado Pago inactivo"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Cargo por servicio</Text>

          <Text style={styles.muted}>
            Este cargo se suma a todas las órdenes de entradas, incluso si la entrada cuesta $0.
          </Text>

          <Pressable
            style={[styles.toggle, cargoActivo && styles.toggleActive]}
            onPress={() => setCargoActivo((prev) => !prev)}
          >
            <Text style={styles.buttonText}>
              {cargoActivo ? "Cargo activo" : "Cargo desactivado"}
            </Text>
          </Pressable>

          <Input
            label="Monto cargo"
            value={cargoMonto}
            setValue={setCargoMonto}
            keyboardType="numeric"
          />

          <Input
            label="Descripción cargo"
            value={cargoDescripcion}
            setValue={setCargoDescripcion}
          />
        </View>

        <Pressable
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Guardar configuración</Text>
          )}
        </Pressable>
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
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 8,
    lineHeight: 20,
  },
  input: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 12,
  },
  logoPreview: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginTop: 14,
    backgroundColor: "#111",
  },
  toggle: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  toggleActive: {
    backgroundColor: "rgba(32,214,123,0.35)",
    borderWidth: 1,
    borderColor: "#20D67B",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});