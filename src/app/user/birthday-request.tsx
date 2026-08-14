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

type DniImageFile = {
  uri: string;
  name: string;
  type: string;
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
  const [fotoDniFile, setFotoDniFile] = useState<DniImageFile | null>(null);
  const [fotoDniPreview, setFotoDniPreview] = useState("");
  const [cantidadInvitados, setCantidadInvitados] = useState("10");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

      // El usuario debe seleccionar explícitamente un evento disponible.
      setEventoId((actual) => {
        const sigueDisponible = (eventosData.items ?? []).some(
          (evento: EventoBasico) => evento.id === actual
        );

        return sigueDisponible ? actual : null;
      });
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo cargar la información.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function seleccionarFotoDni() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Necesitamos acceso a tus imágenes para seleccionar la foto del DNI."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setFotoDniFile({
        uri: asset.uri,
        name: asset.fileName ?? `dni-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });

      // Preview local. La imagen todavía NO se sube a ImgBB.
      setFotoDniPreview(asset.uri);
    } catch {
      Alert.alert(
        "Error",
        "No se pudo seleccionar la imagen del DNI."
      );
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

      const eventoSeleccionado = eventos.find(
        (evento) => evento.id === eventoId
      );

      if (!eventoId || !eventoSeleccionado) {
        Alert.alert(
          "Falta evento",
          "Seleccioná un evento disponible antes de enviar la solicitud."
        );
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

      if (!fotoDniFile) {
        Alert.alert("Falta foto", "Seleccioná una foto del DNI.");
        return;
      }

      const invitados = Number(cantidadInvitados);

      if (Number.isNaN(invitados) || invitados <= 0 || invitados > 20) {
        Alert.alert("Dato inválido", "La cantidad debe estar entre 1 y 20.");
        return;
      }

      setSending(true);

      /*
       * La imagen se sube únicamente cuando toda la solicitud
       * ya pasó las validaciones del frontend.
       */
      const fotoDniUrl = await subirImagenApi(fotoDniFile);

      if (!fotoDniUrl) {
        throw new Error(
          "No se pudo obtener la URL de la foto del DNI."
        );
      }

      /*
       * El backend vuelve a validar que el evento continúe
       * Publicado + Activo + No eliminado antes de crear la solicitud.
       */
      await crearSolicitudCumpleaniosApi({
        eventoId,
        fechaNacimiento,
        dni: dni.trim(),
        fotoDniUrl,
        cantidadInvitados: invitados,
      });

      Alert.alert("Correcto", "Solicitud enviada correctamente.");

      setEventoId(null);
      setFechaNacimiento("");
      setDni("");
      setFotoDniFile(null);
      setFotoDniPreview("");
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

  const eventoSeleccionado = eventos.find(
    (evento) => evento.id === eventoId
  );

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
          <Text style={styles.eventHelp}>
            Seleccioná el evento para el cual querés solicitar el beneficio.
          </Text>

          {eventos.length === 0 ? (
            <View style={styles.noEventsBox}>
              <Text style={styles.noEventsTitle}>
                No hay eventos publicados disponibles
              </Text>
              <Text style={styles.noEventsText}>
                La solicitud de cumpleaños solo puede realizarse para un evento
                publicado. Volvé a consultar cuando haya un nuevo evento disponible.
              </Text>
            </View>
          ) : (
            <>
              {eventos.map((evento) => {
                const selected = evento.id === eventoId;

                return (
                  <Pressable
                    key={evento.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setEventoId(evento.id)}
                    disabled={sending}
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

              {fotoDniPreview ? (
                <Image source={{ uri: fotoDniPreview }} style={styles.preview} />
              ) : null}

              <Pressable
                style={[styles.secondaryButton, sending && styles.disabled]}
                onPress={seleccionarFotoDni}
                disabled={sending || !eventoSeleccionado}
              >
                <Text style={styles.buttonText}>
                  {fotoDniFile ? "Cambiar foto DNI" : "Seleccionar foto DNI"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, sending && styles.disabled]}
                onPress={enviarSolicitud}
                disabled={
                  sending ||
                  !eventoSeleccionado ||
                  !fechaNacimiento.trim() ||
                  !dni.trim() ||
                  !fotoDniFile
                }
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Enviar solicitud</Text>
                )}
              </Pressable>
            </>
          )}
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
  eventHelp: {
    color: "#BDBDBD",
    marginTop: 6,
    marginBottom: 2,
  },
  noEventsBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,209,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.35)",
  },
  noEventsTitle: {
    color: "#FFD166",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  noEventsText: {
    color: "#FFD166",
    fontWeight: "700",
    lineHeight: 20,
  },
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