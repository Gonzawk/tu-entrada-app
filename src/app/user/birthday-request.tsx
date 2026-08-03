import * as ImagePicker from "expo-image-picker";
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
  crearSolicitudCumpleaniosApi,
  getMisSolicitudesCumpleaniosApi,
} from "../../api/benefitsApi";
import { getEventosActivosApi } from "../../api/eventsApi";
import { subirImagenApi } from "../../api/imagesApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { BirthdayRequest } from "../../types/benefits";

type EventoBasico = {
  id: number;
  nombre: string;
};

export default function BirthdayRequestScreen() {
  const [eventos, setEventos] = useState<EventoBasico[]>([]);
  const [solicitudes, setSolicitudes] = useState<BirthdayRequest[]>([]);

  // Requiere fechaCreacion en BirthdayRequest
  const solicitudAnioActual = solicitudes.find((s: any) => {
    if (!s.fechaCreacion) return false;
    return new Date(s.fechaCreacion).getFullYear() === new Date().getFullYear();
  });

  const [eventoId, setEventoId] = useState<number | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [dni, setDni] = useState("");
  const [fotoDniUrl, setFotoDniUrl] = useState("");
  const [cantidadInvitados, setCantidadInvitados] = useState("10");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const [eventosData, solicitudesData] = await Promise.all([
        getEventosActivosApi({ page: 1, pageSize: 20, search: "" }),
        getMisSolicitudesCumpleaniosApi(),
      ]);

      setEventos(eventosData.items ?? []);
      setSolicitudes(solicitudesData ?? []);

      if ((eventosData.items ?? []).length > 0) {
        setEventoId(eventosData.items[0].id);
      }
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo cargar la información.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function subirFotoDni() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tus imágenes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled) return;

      setUploading(true);

      const asset = result.assets[0];

      const uploadResult = await subirImagenApi({
        uri: asset.uri,
        name: asset.fileName ?? `dni-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });

      const url =
        uploadResult?.data?.url ??
        uploadResult?.data?.display_url ??
        uploadResult?.data?.image?.url;

      if (!url) {
        Alert.alert("Error", "No se recibió la URL de la imagen.");
        return;
      }

      setFotoDniUrl(url);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo subir la imagen.")
      );
    } finally {
      setUploading(false);
    }
  }

  async function enviarSolicitud() {
    try {
      if (solicitudAnioActual) {
        Alert.alert(
          "Solicitud existente",
          "Ya enviaste una solicitud de cumpleaños este año."
        );
        return;
      }

      if (!eventoId) {
        Alert.alert("Falta evento", "Seleccioná un evento.");
        return;
      }

      if (!fechaNacimiento.trim()) {
        Alert.alert("Falta fecha", "Ingresá tu fecha de nacimiento.");
        return;
      }

      if (!dni.trim()) {
        Alert.alert("Falta DNI", "Ingresá tu DNI.");
        return;
      }

      if (!fotoDniUrl) {
        Alert.alert("Falta foto", "Subí una foto del DNI.");
        return;
      }

      const invitados = Number(cantidadInvitados);

      if (Number.isNaN(invitados) || invitados <= 0 || invitados > 20) {
        Alert.alert("Dato inválido", "La cantidad debe estar entre 1 y 20.");
        return;
      }

      setSending(true);

      await crearSolicitudCumpleaniosApi({
        eventoId,
        fechaNacimiento,
        dni: dni.trim(),
        fotoDniUrl,
        cantidadInvitados: invitados,
      });

      Alert.alert("Correcto", "Solicitud enviada correctamente.");

      setFechaNacimiento("");
      setDni("");
      setFotoDniUrl("");
      setCantidadInvitados("10");

      await load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo enviar la solicitud."
        )
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
        <AppLayout title="Cumpleaños">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Mi cumpleaños">
        <View style={styles.card}>
          <Text style={styles.title}>Solicitar beneficio</Text>
          <Text style={styles.muted}>
            Si tu cumpleaños aplica para el evento, el admin puede aprobarte un
            QR multiingreso.
          </Text>

          <Text style={styles.label}>Evento</Text>

          {eventos.map((evento) => {
            const selected = evento.id === eventoId;

            return (
              <Pressable
                key={evento.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setEventoId(evento.id)}
              >
                <Text style={styles.optionText}>{evento.nombre}</Text>
              </Pressable>
            );
          })}

          <Input
            label="Fecha nacimiento YYYY-MM-DD"
            value={fechaNacimiento}
            setValue={setFechaNacimiento}
          />

          <Input label="DNI" value={dni} setValue={setDni} />

          <Input
            label="Cantidad invitados"
            value={cantidadInvitados}
            setValue={setCantidadInvitados}
            keyboardType="numeric"
          />

          {fotoDniUrl ? (
            <Image source={{ uri: fotoDniUrl }} style={styles.preview} />
          ) : null}

          <Pressable
            style={[styles.secondaryButton, uploading && styles.disabled]}
            onPress={subirFotoDni}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {fotoDniUrl ? "Cambiar foto DNI" : "Subir foto DNI"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.primaryButton, sending && styles.disabled]}
            onPress={enviarSolicitud}
            disabled={sending || !eventoId || !fechaNacimiento || !dni || !fotoDniUrl}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Enviar solicitud</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Mis solicitudes</Text>

        {solicitudes.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.muted}>Todavía no enviaste solicitudes.</Text>
          </View>
        ) : (
          solicitudes.map((solicitud) => (
            <View key={solicitud.id} style={styles.card}>
              <Text style={styles.subTitle}>{solicitud.evento.nombre}</Text>
              <Text style={styles.muted}>
                Invitados: {solicitud.cantidadInvitados}
              </Text>
              <Text style={styles.status}>Estado: {solicitud.estado}</Text>
              {solicitud.ticketGeneradoId ? (
                <Text style={styles.green}>Ticket generado #{solicitud.ticketGeneradoId}</Text>
              ) : null}
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  subTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 6 },
  label: { color: "#FFFFFF", fontWeight: "900", marginTop: 16 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 10,
  },
  option: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 8,
  },
  optionSelected: {
    backgroundColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderColor: "#E50914",
  },
  optionText: { color: "#FFFFFF", fontWeight: "900" },
  preview: {
    width: "100%",
    height: 170,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  status: { color: "#FFD166", marginTop: 8, fontWeight: "900" },
  green: { color: "#20D67B", marginTop: 8, fontWeight: "900" },
});