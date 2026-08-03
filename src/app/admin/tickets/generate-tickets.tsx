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
  generarTicketsAdminApi,
  getEventosAdminApi,
} from "../../../api/adminApi";
import { getTiposEntradaPorEventoAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { TipoEntradaAdmin } from "../../../types/events";

export default function AdminGenerateTicketsScreen() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [tipos, setTipos] = useState<TipoEntradaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [eventoId, setEventoId] = useState<number | null>(null);
  const [tipoEntradaId, setTipoEntradaId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [nombrePendiente, setNombrePendiente] = useState("");
  const [emailPendiente, setEmailPendiente] = useState("");
  const [observacion, setObservacion] = useState("");

  async function load() {
    try {
      const data = await getEventosAdminApi();
      setEventos(data.items);
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "No se pudo cargar."));
    } finally {
      setLoading(false);
    }
  }

  async function seleccionarEvento(id: number) {
    setEventoId(id);
    setTipoEntradaId(null);

    const data = await getTiposEntradaPorEventoAdminApi(id);
    setTipos(data);
  }

  async function generar() {
    try {
      if (!eventoId || !tipoEntradaId) {
        Alert.alert("Faltan datos", "Seleccioná evento y tipo de entrada.");
        return;
      }

      if (Number(cantidad) <= 0) {
        Alert.alert("Dato inválido", "La cantidad debe ser mayor a 0.");
        return;
      }

      setGenerating(true);

      const result = await generarTicketsAdminApi({
        eventoId,
        tipoEntradaId,
        cantidad: Number(cantidad),
        nombrePendiente: nombrePendiente.trim() || null,
        emailPendiente: emailPendiente.trim() || null,
        observacion: observacion.trim() || null,
      });

      Alert.alert(
        "Tickets generados",
        `Cantidad: ${result.cantidad}. Los códigos quedaron disponibles para reclamar.`
      );

      setCantidad("1");
      setNombrePendiente("");
      setEmailPendiente("");
      setObservacion("");
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "No se pudo generar."));
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Generar tickets">
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Seleccionar evento</Text>

            {eventos.map((evento) => {
              const selected = evento.id === eventoId;

              return (
                <Pressable
                  key={evento.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => seleccionarEvento(evento.id)}
                >
                  <Text style={styles.optionTitle}>{evento.nombre}</Text>
                  <Text style={styles.muted}>{evento.estado}</Text>
                </Pressable>
              );
            })}

            {eventoId ? (
              <>
                <Text style={styles.sectionTitle}>Tipo de entrada</Text>

                {tipos.map((tipo) => {
                  const selected = tipo.id === tipoEntradaId;

                  return (
                    <Pressable
                      key={tipo.id}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setTipoEntradaId(tipo.id)}
                    >
                      <Text style={styles.optionTitle}>{tipo.nombre}</Text>
                      <Text style={styles.muted}>
                        {tipo.esCombo
                          ? `Combo x${tipo.cantidadPersonas}`
                          : "Individual"}
                      </Text>
                    </Pressable>
                  );
                })}

                <View style={styles.form}>
                  <TextInput
                    placeholder="Cantidad"
                    placeholderTextColor="#888"
                    value={cantidad}
                    onChangeText={setCantidad}
                    keyboardType="numeric"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Nombre pendiente opcional"
                    placeholderTextColor="#888"
                    value={nombrePendiente}
                    onChangeText={setNombrePendiente}
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Email pendiente opcional"
                    placeholderTextColor="#888"
                    value={emailPendiente}
                    onChangeText={setEmailPendiente}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />

                  <TextInput
                    placeholder="Observación interna"
                    placeholderTextColor="#888"
                    value={observacion}
                    onChangeText={setObservacion}
                    style={styles.input}
                  />

                  <Pressable
                    style={[styles.primaryButton, generating && styles.disabled]}
                    onPress={generar}
                    disabled={generating}
                  >
                    {generating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryText}>Generar tickets</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 12,
  },
  option: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: "#E50914",
    backgroundColor: "rgba(229,9,20,0.16)",
  },
  optionTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    gap: 10,
    marginTop: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.6,
  },
});