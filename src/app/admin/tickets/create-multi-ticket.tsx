import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getEventosAdminApi } from "../../../api/adminApi";
import { crearTicketMultiIngresoAdminApi } from "../../../api/benefitsApi";
import { getTiposEntradaPorEventoAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

type EventoResumen = {
  id: number;
  nombre: string;
};

type TipoEntradaResumen = {
  id: number;
  nombre: string;
};

type ApiError = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") {
      return record.message;
    }

    if (typeof record.title === "string") {
      return record.title;
    }
  }

  return apiError.message ?? fallback;
}

export default function AdminCreateMultiTicketScreen() {
  const [eventos, setEventos] = useState<EventoResumen[]>([]);
  const [tipos, setTipos] = useState<TipoEntradaResumen[]>([]);

  const [eventoId, setEventoId] = useState<number | null>(null);
  const [tipoEntradaId, setTipoEntradaId] = useState<number | null>(null);

  const [emailPendiente, setEmailPendiente] = useState("");
  const [nombrePendiente, setNombrePendiente] = useState("");
  const [cantidadUsos, setCantidadUsos] = useState("10");
  const [observacion, setObservacion] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadTipos = useCallback(async (id: number) => {
    try {
      const result = await getTiposEntradaPorEventoAdminApi(id);
      const items: TipoEntradaResumen[] = result ?? [];

      setTipos(items);
      setTipoEntradaId(items[0]?.id ?? null);
    } catch (error: unknown) {
      setTipos([]);
      setTipoEntradaId(null);

      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudieron cargar tipos de entrada."
        )
      );
    }
  }, []);

  const loadEventos = useCallback(async () => {
    try {
      setLoading(true);

      const result = await getEventosAdminApi({
        page: 1,
        pageSize: 50,
        search: "",
      });

      const items: EventoResumen[] = result.items ?? [];

      setEventos(items);

      const firstId = items[0]?.id;

      if (firstId) {
        setEventoId(firstId);
        await loadTipos(firstId);
      } else {
        setEventoId(null);
        setTipos([]);
        setTipoEntradaId(null);
      }
    } catch (error: unknown) {
      setEventos([]);
      setEventoId(null);
      setTipos([]);
      setTipoEntradaId(null);

      Alert.alert(
        "Error",
        getApiErrorMessage(error, "No se pudieron cargar eventos.")
      );
    } finally {
      setLoading(false);
    }
  }, [loadTipos]);

  useEffect(() => {
    void loadEventos();
  }, [loadEventos]);

  async function seleccionarEvento(id: number) {
    setEventoId(id);
    setTipoEntradaId(null);
    setTipos([]);

    await loadTipos(id);
  }

  async function crear() {
    if (creating) return;

    if (!eventoId || !tipoEntradaId) {
      Alert.alert("Faltan datos", "Seleccioná evento y tipo de entrada.");
      return;
    }

    const usos = Number(cantidadUsos);

    if (!Number.isInteger(usos) || usos <= 1) {
      Alert.alert(
        "Dato inválido",
        "Los usos deben ser un número entero mayor a 1."
      );
      return;
    }

    try {
      setCreating(true);

      await crearTicketMultiIngresoAdminApi({
        eventoId,
        tipoEntradaId,
        tandaEntradaId: null,
        propietarioUsuarioId: null,
        emailPendiente: emailPendiente.trim().toLowerCase() || null,
        nombrePendiente: nombrePendiente.trim() || null,
        cantidadUsosPermitidos: usos,
        observacionBeneficio:
          observacion.trim() || `QR multiingreso para ${usos} personas.`,
      });

      Alert.alert("Correcto", "QR multiingreso creado.");

      setEmailPendiente("");
      setNombrePendiente("");
      setCantidadUsos("10");
      setObservacion("");
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "No se pudo crear.")
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Multiingreso">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Crear QR multiingreso">
        <View style={styles.card}>
          <Text style={styles.title}>Evento</Text>

          {eventos.map((evento) => {
            const selected = evento.id === eventoId;

            return (
              <Pressable
                key={evento.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => void seleccionarEvento(evento.id)}
              >
                <Text style={styles.optionText}>{evento.nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Tipo de entrada</Text>

          {tipos.map((tipo) => {
            const selected = tipo.id === tipoEntradaId;

            return (
              <Pressable
                key={tipo.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setTipoEntradaId(tipo.id)}
              >
                <Text style={styles.optionText}>{tipo.nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Asignación</Text>

          <Input
            label="Email del beneficiario o RRPP"
            value={emailPendiente}
            setValue={setEmailPendiente}
          />

          <Input
            label="Nombre visible"
            value={nombrePendiente}
            setValue={setNombrePendiente}
          />

          <Input
            label="Cantidad usos"
            value={cantidadUsos}
            setValue={setCantidadUsos}
            keyboardType="numeric"
          />

          <Input
            label="Observación"
            value={observacion}
            setValue={setObservacion}
          />

          <Pressable
            style={[styles.primaryButton, creating && styles.disabled]}
            onPress={() => void crear()}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear QR multiingreso</Text>
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
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  option: {
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  optionSelected: {
    backgroundColor: "rgba(229,9,20,0.32)",
    borderColor: "#E50914",
    borderWidth: 1,
  },
  optionText: { color: "#FFFFFF", fontWeight: "900" },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
});