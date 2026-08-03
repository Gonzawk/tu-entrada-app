import { router, useLocalSearchParams } from "expo-router";
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
import {
  actualizarEventoConfiguracionCompraAdminApi,
  getEventoConfiguracionCompraAdminApi,
} from "../../../api/eventPurchaseLimitsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { EventoConfiguracionCompra } from "../../../types/eventPurchaseLimits";

type PurchaseLimitsPayload = {
  limitarComprasPorUsuario: boolean;
  maxOrdenesPendientesPorUsuario: number;
  maxOrdenesActivasPorUsuario: number;
  maxCuposPorUsuario: number;
  minutosVigenciaOrdenPendiente: number;
  segundosMinimosEntreOrdenes: number;
  activa: boolean;
};

type ApiErrorShape = {
  response?: {
    data?: unknown;
  };
  message?: string;
};

export default function AdminEventPurchaseLimitsScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId?: string }>();
  const id = Number(eventoId);

  const [configuracion, setConfiguracion] =
    useState<EventoConfiguracionCompra | null>(null);
  const [limitarComprasPorUsuario, setLimitarComprasPorUsuario] =
    useState(true);
  const [maxOrdenesPendientes, setMaxOrdenesPendientes] = useState("2");
  const [maxOrdenesActivas, setMaxOrdenesActivas] = useState("3");
  const [maxCupos, setMaxCupos] = useState("8");
  const [minutosVigencia, setMinutosVigencia] = useState("30");
  const [segundosEntreOrdenes, setSegundosEntreOrdenes] = useState("10");
  const [activa, setActiva] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      Alert.alert("Error", "El evento indicado no es válido.");
      router.back();
      return;
    }

    try {
      setLoading(true);

      const data = await getEventoConfiguracionCompraAdminApi(id);

      setConfiguracion(data);
      setLimitarComprasPorUsuario(data.limitarComprasPorUsuario);
      setMaxOrdenesPendientes(
        String(data.maxOrdenesPendientesPorUsuario)
      );
      setMaxOrdenesActivas(String(data.maxOrdenesActivasPorUsuario));
      setMaxCupos(String(data.maxCuposPorUsuario));
      setMinutosVigencia(String(data.minutosVigenciaOrdenPendiente));
      setSegundosEntreOrdenes(String(data.segundosMinimosEntreOrdenes));
      setActiva(data.activa);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudo cargar la configuración de compra."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function validarFormulario(): PurchaseLimitsPayload | null {
    const pendientes = Number(maxOrdenesPendientes);
    const activas = Number(maxOrdenesActivas);
    const cupos = Number(maxCupos);
    const vigencia = Number(minutosVigencia);
    const segundos = Number(segundosEntreOrdenes);

    if (
      !Number.isInteger(pendientes) ||
      pendientes < 1 ||
      pendientes > 20
    ) {
      Alert.alert(
        "Dato inválido",
        "El máximo de órdenes pendientes debe estar entre 1 y 20."
      );
      return null;
    }

    if (!Number.isInteger(activas) || activas < 1 || activas > 50) {
      Alert.alert(
        "Dato inválido",
        "El máximo de órdenes activas debe estar entre 1 y 50."
      );
      return null;
    }

    if (activas < pendientes) {
      Alert.alert(
        "Configuración inválida",
        "El máximo de órdenes activas no puede ser menor que el máximo de órdenes pendientes."
      );
      return null;
    }

    if (!Number.isInteger(cupos) || cupos < 1 || cupos > 100) {
      Alert.alert(
        "Dato inválido",
        "El máximo de cupos debe estar entre 1 y 100."
      );
      return null;
    }

    if (!Number.isInteger(vigencia) || vigencia < 1 || vigencia > 1440) {
      Alert.alert(
        "Dato inválido",
        "La vigencia debe estar entre 1 y 1440 minutos."
      );
      return null;
    }

    if (!Number.isInteger(segundos) || segundos < 0 || segundos > 3600) {
      Alert.alert(
        "Dato inválido",
        "La espera entre órdenes debe estar entre 0 y 3600 segundos."
      );
      return null;
    }

    return {
      limitarComprasPorUsuario,
      maxOrdenesPendientesPorUsuario: pendientes,
      maxOrdenesActivasPorUsuario: activas,
      maxCuposPorUsuario: cupos,
      minutosVigenciaOrdenPendiente: vigencia,
      segundosMinimosEntreOrdenes: segundos,
      activa,
    };
  }

  async function guardar() {
    if (saving) return;

    const payload = validarFormulario();
    if (!payload) return;

    Alert.alert(
      "Confirmar configuración",
      "Estos límites se aplicarán a las nuevas órdenes del evento. Las órdenes pendientes vencidas se liberarán según la vigencia configurada.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Guardar",
          onPress: () => void ejecutarGuardado(payload),
        },
      ]
    );
  }

  async function ejecutarGuardado(payload: PurchaseLimitsPayload) {
    if (!Number.isInteger(id) || id <= 0) {
      Alert.alert("Error", "El evento indicado no es válido.");
      return;
    }

    try {
      setSaving(true);

      const result =
        await actualizarEventoConfiguracionCompraAdminApi(id, payload);

      setConfiguracion(result);

      Alert.alert(
        "Configuración actualizada",
        "Los límites de compra del evento fueron guardados correctamente."
      );
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudo actualizar la configuración."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Límites de compra">
          <ActivityIndicator color="#E50914" style={styles.loader} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Límites de compra">
        <View style={styles.headerCard}>
          <Text style={styles.title}>
            {configuracion?.eventoNombre ?? "Configuración del evento"}
          </Text>

          <Text style={styles.description}>
            Definí cuántas órdenes y cupos puede concentrar un usuario en
            este evento.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Cómo se aplican los límites</Text>

          <Text style={styles.warningText}>
            Las órdenes canceladas o vencidas no cuentan. Las órdenes
            pendientes reservan cupos hasta ser confirmadas, canceladas o
            vencidas.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado de la configuración</Text>

          <ToggleRow
            title="Configuración activa"
            description="Permite activar o desactivar esta configuración para el evento."
            value={activa}
            onPress={() => setActiva((current) => !current)}
          />

          <View style={styles.separator} />

          <ToggleRow
            title="Limitar compras por usuario"
            description="Controla órdenes pendientes, órdenes activas y cupos por comprador."
            value={limitarComprasPorUsuario}
            onPress={() =>
              setLimitarComprasPorUsuario((current) => !current)
            }
          />
        </View>

        <View
          style={[
            styles.card,
            (!activa || !limitarComprasPorUsuario) &&
              styles.disabledSection,
          ]}
        >
          <Text style={styles.sectionTitle}>Órdenes por usuario</Text>

          <NumberInput
            label="Máximo de órdenes pendientes"
            helper="Órdenes creadas que todavía no fueron pagadas ni confirmadas."
            value={maxOrdenesPendientes}
            onChangeText={setMaxOrdenesPendientes}
            editable={activa && limitarComprasPorUsuario}
          />

          <NumberInput
            label="Máximo de órdenes activas"
            helper="Suma de órdenes pendientes y órdenes confirmadas."
            value={maxOrdenesActivas}
            onChangeText={setMaxOrdenesActivas}
            editable={activa && limitarComprasPorUsuario}
          />
        </View>

        <View
          style={[
            styles.card,
            (!activa || !limitarComprasPorUsuario) &&
              styles.disabledSection,
          ]}
        >
          <Text style={styles.sectionTitle}>Cupos y prevención de abuso</Text>

          <NumberInput
            label="Máximo de cupos por usuario"
            helper="Cantidad máxima de personas que puede reservar o comprar una misma cuenta."
            value={maxCupos}
            onChangeText={setMaxCupos}
            editable={activa && limitarComprasPorUsuario}
          />

          <NumberInput
            label="Vigencia de una orden pendiente (minutos)"
            helper="Al vencer este plazo, la reserva se libera y los cupos vuelven a la tanda."
            value={minutosVigencia}
            onChangeText={setMinutosVigencia}
            editable={activa && limitarComprasPorUsuario}
          />

          <NumberInput
            label="Espera mínima entre órdenes (segundos)"
            helper="Evita solicitudes repetidas, automatizadas o creadas demasiado rápido."
            value={segundosEntreOrdenes}
            onChangeText={setSegundosEntreOrdenes}
            editable={activa && limitarComprasPorUsuario}
          />
        </View>

        <Text style={styles.examplesTitle}>Ejemplos prácticos</Text>

        <ExampleCard
          number="1"
          title="Dos órdenes pendientes"
          text="Si el máximo es 2, el usuario no podrá crear una tercera orden hasta pagar, cancelar o dejar vencer una de las anteriores."
        />

        <ExampleCard
          number="2"
          title="Combo x4"
          text="Si el máximo es 8 cupos, podrá comprar dos combos x4. Después no podrá agregar otra entrada individual."
        />

        <ExampleCard
          number="3"
          title="Reserva abandonada"
          text="Si la vigencia es de 30 minutos y el usuario no paga, la orden vence y los cupos vuelven a estar disponibles."
        />

        <Pressable
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={guardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              Guardar límites de compra
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.backButtonText}>Volver al evento</Text>
        </Pressable>
      </AppLayout>
    </RoleGuard>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onPress,
}: {
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>

      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View
          style={[
            styles.switchThumb,
            value && styles.switchThumbActive,
          ]}
        />
      </View>
    </Pressable>
  );
}

function NumberInput({
  label,
  helper,
  value,
  onChangeText,
  editable,
}: {
  label: string;
  helper: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={(text) =>
          onChangeText(text.replace(/[^0-9]/g, ""))
        }
        keyboardType="number-pad"
        editable={editable}
        placeholder="0"
        placeholderTextColor="#777"
        style={[styles.input, !editable && styles.inputDisabled]}
      />

      <Text style={styles.inputHelper}>{helper}</Text>
    </View>
  );
}

function ExampleCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.exampleCard}>
      <View style={styles.exampleNumber}>
        <Text style={styles.exampleNumberText}>{number}</Text>
      </View>

      <View style={styles.exampleContent}>
        <Text style={styles.exampleTitle}>{title}</Text>
        <Text style={styles.exampleText}>{text}</Text>
      </View>
    </View>
  );
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorShape;
  const data = apiError.response?.data;

  if (!data) {
    return apiError.message ?? fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object" || data === null) {
    return fallback;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.title === "string") {
    return record.title;
  }

  if (
    record.errors &&
    typeof record.errors === "object" &&
    record.errors !== null
  ) {
    const messages = Object.values(
      record.errors as Record<string, unknown>
    )
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(
        (message): message is string => typeof message === "string"
      );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  headerCard: {
    backgroundColor: "rgba(229,9,20,0.13)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.28)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  description: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 21,
  },
  warningCard: {
    backgroundColor: "rgba(255,209,102,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.25)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  warningTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontWeight: "900",
  },
  warningText: {
    color: "#D0D0D0",
    lineHeight: 21,
    marginTop: 7,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  disabledSection: {
    opacity: 0.5,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.09)",
    marginVertical: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  toggleDescription: {
    color: "#AFAFAF",
    lineHeight: 19,
    marginTop: 5,
    fontSize: 13,
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    padding: 3,
    justifyContent: "center",
  },
  switchTrackActive: {
    backgroundColor: "#E50914",
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  inputDisabled: {
    color: "#888",
  },
  inputHelper: {
    color: "#999",
    lineHeight: 18,
    marginTop: 7,
    fontSize: 12,
  },
  examplesTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 12,
  },
  exampleCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  exampleNumber: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(229,9,20,0.18)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  exampleNumberText: {
    color: "#E50914",
    fontSize: 18,
    fontWeight: "900",
  },
  exampleContent: {
    flex: 1,
  },
  exampleTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  exampleText: {
    color: "#BDBDBD",
    lineHeight: 19,
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: "#E50914",
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  backButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  backButtonText: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
});