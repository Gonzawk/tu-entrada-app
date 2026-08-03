import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    cambiarEstadoEventoAdminApi,
} from "../../../api/adminApi";
import { reprogramarEventoAdminApi } from "../../../api/eventoAuditoriaApi";
import { getEventoDetalleAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

const EVENTO_ESTADOS = {
  BORRADOR: 0,
  PUBLICADO: 1,
  OCULTO: 2,
  FINALIZADO: 3,
  CANCELADO: 4,
} as const;

type EventoEstado =
  (typeof EVENTO_ESTADOS)[keyof typeof EVENTO_ESTADOS];

type EventoAdminDetalle = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  lugar?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  bannerUrl?: string | null;
  imagenPrincipalUrl?: string | null;
  estado: string | number;
};

type DateParts = {
  date: string;
  time: string;
};

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

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string");

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return fallback;
}

function estadoEventoNumero(estado: string | number): EventoEstado {
  if (typeof estado === "number" && estado >= 0 && estado <= 4) {
    return estado as EventoEstado;
  }

  const normalizado = String(estado).trim().toLowerCase();

  if (normalizado === "1" || normalizado === "publicado") {
    return EVENTO_ESTADOS.PUBLICADO;
  }

  if (normalizado === "2" || normalizado === "oculto") {
    return EVENTO_ESTADOS.OCULTO;
  }

  if (normalizado === "3" || normalizado === "finalizado") {
    return EVENTO_ESTADOS.FINALIZADO;
  }

  if (normalizado === "4" || normalizado === "cancelado") {
    return EVENTO_ESTADOS.CANCELADO;
  }

  return EVENTO_ESTADOS.BORRADOR;
}

function estadoEventoTexto(estado: string | number) {
  const numero = estadoEventoNumero(estado);

  if (numero === EVENTO_ESTADOS.PUBLICADO) {
    return "Publicado";
  }

  if (numero === EVENTO_ESTADOS.OCULTO) {
    return "Oculto";
  }

  if (numero === EVENTO_ESTADOS.FINALIZADO) {
    return "Finalizado";
  }

  if (numero === EVENTO_ESTADOS.CANCELADO) {
    return "Cancelado";
  }

  return "Borrador";
}

function estadoEventoDescripcion(estado: EventoEstado) {
  if (estado === EVENTO_ESTADOS.PUBLICADO) {
    return "Visible en el catálogo y habilitado para ventas, siempre que tenga configuración válida.";
  }

  if (estado === EVENTO_ESTADOS.OCULTO) {
    return "No aparece en el catálogo público, pero conserva toda su configuración.";
  }

  if (estado === EVENTO_ESTADOS.FINALIZADO) {
    return "El evento terminó. Este estado debe usarse cuando ya no habrá nuevas ventas.";
  }

  if (estado === EVENTO_ESTADOS.CANCELADO) {
    return "El evento fue cancelado. Las operaciones posteriores dependerán de las reglas del backend.";
  }

  return "Solo el equipo administrador puede verlo y configurarlo.";
}

function getEstadoColorStyle(estado: EventoEstado) {
  if (estado === EVENTO_ESTADOS.PUBLICADO) {
    return {
      badge: styles.publishedBadge,
      text: styles.publishedText,
      dot: styles.publishedDot,
    };
  }

  if (estado === EVENTO_ESTADOS.OCULTO) {
    return {
      badge: styles.hiddenBadge,
      text: styles.hiddenText,
      dot: styles.hiddenDot,
    };
  }

  if (estado === EVENTO_ESTADOS.FINALIZADO) {
    return {
      badge: styles.finishedBadge,
      text: styles.finishedText,
      dot: styles.finishedDot,
    };
  }

  if (estado === EVENTO_ESTADOS.CANCELADO) {
    return {
      badge: styles.cancelledBadge,
      text: styles.cancelledText,
      dot: styles.cancelledDot,
    };
  }

  return {
    badge: styles.draftBadge,
    text: styles.draftText,
    dot: styles.draftDot,
  };
}

function getArgentinaDateParts(value?: string | null): DateParts {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function buildArgentinaDateTime(date: string, time: string) {
  const cleanDate = date.trim();
  const cleanTime = time.trim();

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!dateRegex.test(cleanDate) || !timeRegex.test(cleanTime)) {
    return null;
  }

  const value = `${cleanDate}T${cleanTime}:00-03:00`;
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return value;
}

function formatFechaArgentina(value?: string | null) {
  if (!value) {
    return "Sin fecha definida";
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

export default function AdminEventSettingsScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const id = Number(eventoId);

  const [evento, setEvento] = useState<EventoAdminDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changingState, setChangingState] = useState<EventoEstado | null>(null);

  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [reprogramming, setReprogramming] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const currentState = useMemo(
    () => estadoEventoNumero(evento?.estado ?? EVENTO_ESTADOS.BORRADOR),
    [evento?.estado],
  );

  const currentStateStyle = useMemo(
    () => getEstadoColorStyle(currentState),
    [currentState],
  );

  const loadData = useCallback(
    async (refresh = false) => {
      if (!Number.isInteger(id) || id <= 0) {
        setLoading(false);
        Alert.alert("Evento inválido", "No se pudo identificar el evento.");
        return;
      }

      try {
        refresh ? setRefreshing(true) : setLoading(true);

        const data = (await getEventoDetalleAdminApi(
          id,
        )) as EventoAdminDetalle;

        setEvento(data);
      } catch (error: any) {
        console.log("ERROR CONFIGURACIÓN EVENTO:", {
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
            "No se pudo obtener la configuración del evento.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  function openReprogramModal() {
    if (!evento) {
      return;
    }

    const inicio = getArgentinaDateParts(evento.fechaInicio);
    const fin = getArgentinaDateParts(evento.fechaFin);

    setStartDate(inicio.date);
    setStartTime(inicio.time);
    setEndDate(fin.date);
    setEndTime(fin.time);
    setReason("");
    setShowReprogramModal(true);
  }

  function closeReprogramModal() {
    if (reprogramming) {
      return;
    }

    setShowReprogramModal(false);
  }

  function confirmStateChange(nextState: EventoEstado) {
    if (!evento || nextState === currentState || changingState !== null) {
      return;
    }

    const nextText = estadoEventoTexto(nextState);
    const isDangerous =
      nextState === EVENTO_ESTADOS.FINALIZADO ||
      nextState === EVENTO_ESTADOS.CANCELADO;

    let message = `El evento cambiará de "${estadoEventoTexto(
      currentState,
    )}" a "${nextText}".`;

    if (nextState === EVENTO_ESTADOS.PUBLICADO) {
      message +=
        "\n\nAsegurate de que tenga banner, tipos de entrada, tandas activas y fechas correctas.";
    }

    if (nextState === EVENTO_ESTADOS.OCULTO) {
      message +=
        "\n\nEl evento dejará de mostrarse en el catálogo público.";
    }

    if (nextState === EVENTO_ESTADOS.FINALIZADO) {
      message +=
        "\n\nUsá esta opción únicamente cuando el evento ya haya terminado.";
    }

    if (nextState === EVENTO_ESTADOS.CANCELADO) {
      message +=
        "\n\nEste cambio puede afectar ventas, accesos y procesos de devolución.";
    }

    Alert.alert(`Cambiar a ${nextText}`, message, [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Confirmar",
        style: isDangerous ? "destructive" : "default",
        onPress: () => void changeEventState(nextState),
      },
    ]);
  }

  async function changeEventState(nextState: EventoEstado) {
    try {
      setChangingState(nextState);

      await cambiarEstadoEventoAdminApi(id, nextState);

      setEvento((current) =>
        current
          ? {
              ...current,
              estado: estadoEventoTexto(nextState),
            }
          : current,
      );

      Alert.alert(
        "Estado actualizado",
        `El evento ahora se encuentra en estado "${estadoEventoTexto(
          nextState,
        )}".`,
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo cambiar el estado",
        getApiErrorMessage(
          error,
          "El servidor no pudo actualizar el estado del evento.",
        ),
      );
    } finally {
      setChangingState(null);
    }
  }

  function validateReprogramming() {
    const fechaInicio = buildArgentinaDateTime(startDate, startTime);

    if (!fechaInicio) {
      Alert.alert(
        "Inicio inválido",
        "Ingresá la fecha como YYYY-MM-DD y la hora como HH:mm.",
      );
      return null;
    }

    const hasAnyEndValue = endDate.trim() || endTime.trim();

    let fechaFin: string | null = null;

    if (hasAnyEndValue) {
      fechaFin = buildArgentinaDateTime(endDate, endTime);

      if (!fechaFin) {
        Alert.alert(
          "Finalización inválida",
          "Para definir la finalización debés completar fecha y hora válidas.",
        );
        return null;
      }
    }

    const inicioDate = new Date(fechaInicio);
    const finDate = fechaFin ? new Date(fechaFin) : null;

    if (finDate && finDate.getTime() <= inicioDate.getTime()) {
      Alert.alert(
        "Rango inválido",
        "La fecha de finalización debe ser posterior al inicio.",
      );
      return null;
    }

    return {
      fechaInicio,
      fechaFin,
      motivo: reason.trim() || null,
    };
  }

  function confirmReprogramming() {
    const payload = validateReprogramming();

    if (!payload) {
      return;
    }

    Alert.alert(
      "Confirmar reprogramación",
      "Vas a modificar la fecha y los horarios del evento. Los tickets existentes seguirán siendo válidos, pero funcionarán según la nueva programación.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Reprogramar",
          style: "destructive",
          onPress: () => void executeReprogramming(payload),
        },
      ],
    );
  }

  async function executeReprogramming(payload: {
    fechaInicio: string;
    fechaFin: string | null;
    motivo: string | null;
  }) {
    try {
      setReprogramming(true);

      await reprogramarEventoAdminApi(id, payload);

      setShowReprogramModal(false);
      await loadData(true);

      Alert.alert(
        "Evento reprogramado",
        "La nueva fecha y horarios fueron guardados correctamente.",
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo reprogramar",
        getApiErrorMessage(
          error,
          "No se pudo actualizar la programación del evento.",
        ),
      );
    } finally {
      setReprogramming(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Estado y programación">
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#E50914" size="large" />
            <Text style={styles.loaderText}>Cargando configuración...</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Estado y programación">
        {evento ? (
          <View style={styles.eventCard}>
            {evento.bannerUrl ? (
              <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Text style={styles.bannerPlaceholderText}>Sin banner</Text>
              </View>
            )}

            <View style={styles.eventContent}>
              <View style={styles.eventTitleRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{evento.nombre}</Text>

                  {evento.lugar ? (
                    <Text style={styles.muted}>{evento.lugar}</Text>
                  ) : null}
                </View>

                <View
                  style={[styles.statusBadge, currentStateStyle.badge]}
                >
                  <View
                    style={[styles.statusDot, currentStateStyle.dot]}
                  />

                  <Text
                    style={[
                      styles.statusBadgeText,
                      currentStateStyle.text,
                    ]}
                  >
                    {estadoEventoTexto(currentState)}
                  </Text>
                </View>
              </View>

              <View style={styles.scheduleSummary}>
                <ScheduleItem
                  label="Inicio"
                  value={formatFechaArgentina(evento.fechaInicio)}
                />

                <ScheduleItem
                  label="Finalización"
                  value={formatFechaArgentina(evento.fechaFin)}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Estado actual</Text>
          <Text style={styles.infoText}>
            {estadoEventoDescripcion(currentState)}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cambiar estado</Text>
          <Text style={styles.sectionSubtitle}>
            Seleccioná el estado operativo que corresponda.
          </Text>
        </View>

        <View style={styles.statesGrid}>
          <StateOption
            label="Borrador"
            description="Configuración privada."
            active={currentState === EVENTO_ESTADOS.BORRADOR}
            loading={changingState === EVENTO_ESTADOS.BORRADOR}
            disabled={changingState !== null}
            colorStyle="draft"
            onPress={() => confirmStateChange(EVENTO_ESTADOS.BORRADOR)}
          />

          <StateOption
            label="Publicado"
            description="Visible y disponible."
            active={currentState === EVENTO_ESTADOS.PUBLICADO}
            loading={changingState === EVENTO_ESTADOS.PUBLICADO}
            disabled={changingState !== null}
            colorStyle="published"
            onPress={() => confirmStateChange(EVENTO_ESTADOS.PUBLICADO)}
          />

          <StateOption
            label="Oculto"
            description="No aparece en catálogo."
            active={currentState === EVENTO_ESTADOS.OCULTO}
            loading={changingState === EVENTO_ESTADOS.OCULTO}
            disabled={changingState !== null}
            colorStyle="hidden"
            onPress={() => confirmStateChange(EVENTO_ESTADOS.OCULTO)}
          />

          <StateOption
            label="Finalizado"
            description="El evento ya terminó."
            active={currentState === EVENTO_ESTADOS.FINALIZADO}
            loading={changingState === EVENTO_ESTADOS.FINALIZADO}
            disabled={changingState !== null}
            colorStyle="finished"
            onPress={() => confirmStateChange(EVENTO_ESTADOS.FINALIZADO)}
          />

          <StateOption
            label="Cancelado"
            description="Evento suspendido."
            active={currentState === EVENTO_ESTADOS.CANCELADO}
            loading={changingState === EVENTO_ESTADOS.CANCELADO}
            disabled={changingState !== null}
            colorStyle="cancelled"
            onPress={() => confirmStateChange(EVENTO_ESTADOS.CANCELADO)}
          />
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Cambios sensibles</Text>
          <Text style={styles.warningText}>
            Finalizar o cancelar un evento puede afectar ventas, accesos,
            reportes y devoluciones. La validación definitiva permanece en el
            backend.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Programación</Text>
          <Text style={styles.sectionSubtitle}>
            Modificá la fecha y los horarios manteniendo la zona horaria de
            Argentina.
          </Text>
        </View>

        <View style={styles.programmingCard}>
          <View style={styles.programmingRow}>
            <View style={styles.timelineDot} />

            <View style={styles.flex}>
              <Text style={styles.programmingLabel}>Inicio actual</Text>
              <Text style={styles.programmingValue}>
                {formatFechaArgentina(evento?.fechaInicio)}
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.programmingRow}>
            <View style={styles.timelineDotSecondary} />

            <View style={styles.flex}>
              <Text style={styles.programmingLabel}>Finalización actual</Text>
              <Text style={styles.programmingValue}>
                {formatFechaArgentina(evento?.fechaFin)}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.reprogramButton}
            onPress={openReprogramModal}
            disabled={reprogramming || changingState !== null}
          >
            <Text style={styles.buttonText}>Reprogramar evento</Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.refreshButton,
            refreshing && styles.disabledButton,
          ]}
          onPress={() => void loadData(true)}
          disabled={refreshing || reprogramming || changingState !== null}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Actualizar información</Text>
          )}
        </Pressable>

        <View style={styles.bottomSpace} />

        <Modal
          visible={showReprogramModal}
          transparent
          animationType="fade"
          onRequestClose={closeReprogramModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalContent}
              >
                <Text style={styles.modalTitle}>Reprogramar evento</Text>

                <Text style={styles.modalText}>
                  Los tickets existentes seguirán siendo válidos, pero se
                  utilizará la nueva fecha para las validaciones del evento.
                </Text>

                <View style={styles.modalInfoCard}>
                  <Text style={styles.modalInfoTitle}>Zona horaria</Text>
                  <Text style={styles.modalInfoText}>
                    Las fechas se enviarán con horario de Argentina
                    (UTC-03:00).
                  </Text>
                </View>

                <View style={styles.dateSection}>
                  <Text style={styles.dateSectionTitle}>
                    Nuevo inicio obligatorio
                  </Text>

                  <Field
                    label="Fecha inicio"
                    hint="YYYY-MM-DD"
                    value={startDate}
                    onChange={setStartDate}
                  />

                  <Field
                    label="Hora inicio"
                    hint="HH:mm"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </View>

                <View style={styles.dateSection}>
                  <Text style={styles.dateSectionTitle}>
                    Nueva finalización opcional
                  </Text>

                  <Field
                    label="Fecha fin"
                    hint="YYYY-MM-DD"
                    value={endDate}
                    onChange={setEndDate}
                  />

                  <Field
                    label="Hora fin"
                    hint="HH:mm"
                    value={endTime}
                    onChange={setEndTime}
                  />

                  <Text style={styles.fieldHelp}>
                    Para quitar la fecha de finalización, dejá ambos campos
                    vacíos.
                  </Text>
                </View>

                <Field
                  label="Motivo de la reprogramación"
                  hint="Opcional"
                  value={reason}
                  onChange={setReason}
                  multiline
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    reprogramming && styles.disabledButton,
                  ]}
                  onPress={confirmReprogramming}
                  disabled={reprogramming}
                >
                  {reprogramming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Confirmar reprogramación
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={closeReprogramModal}
                  disabled={reprogramming}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}

function ScheduleItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.scheduleItem}>
      <Text style={styles.scheduleLabel}>{label}</Text>
      <Text style={styles.scheduleValue}>{value}</Text>
    </View>
  );
}

function StateOption({
  label,
  description,
  active,
  loading,
  disabled,
  colorStyle,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  colorStyle: "draft" | "published" | "hidden" | "finished" | "cancelled";
  onPress: () => void;
}) {
  const styleMap = {
    draft: {
      card: styles.stateDraftCard,
      dot: styles.draftDot,
      label: styles.stateDraftLabel,
    },
    published: {
      card: styles.statePublishedCard,
      dot: styles.publishedDot,
      label: styles.statePublishedLabel,
    },
    hidden: {
      card: styles.stateHiddenCard,
      dot: styles.hiddenDot,
      label: styles.stateHiddenLabel,
    },
    finished: {
      card: styles.stateFinishedCard,
      dot: styles.finishedDot,
      label: styles.stateFinishedLabel,
    },
    cancelled: {
      card: styles.stateCancelledCard,
      dot: styles.cancelledDot,
      label: styles.stateCancelledLabel,
    },
  };

  const stateStyle = styleMap[colorStyle];

  return (
    <Pressable
      style={[
        styles.stateCard,
        stateStyle.card,
        active && styles.stateCardActive,
        disabled && !active && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || active}
    >
      <View style={styles.stateCardHeader}>
        <View style={[styles.stateDot, stateStyle.dot]} />

        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : active ? (
          <Text style={styles.currentLabel}>ACTUAL</Text>
        ) : null}
      </View>

      <Text style={[styles.stateLabel, stateStyle.label]}>{label}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </Pressable>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={hint}
        placeholderTextColor="#777777"
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
      />
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
  banner: {
    width: "100%",
    height: 145,
    backgroundColor: "#171717",
  },
  bannerPlaceholder: {
    width: "100%",
    height: 115,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  },
  bannerPlaceholderText: {
    color: "#737373",
    fontWeight: "800",
  },
  eventContent: {
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  draftBadge: {
    backgroundColor: "rgba(180,180,180,0.10)",
    borderColor: "rgba(180,180,180,0.25)",
  },
  draftText: {
    color: "#CFCFCF",
  },
  draftDot: {
    backgroundColor: "#AFAFAF",
  },
  publishedBadge: {
    backgroundColor: "rgba(32,214,123,0.10)",
    borderColor: "rgba(32,214,123,0.30)",
  },
  publishedText: {
    color: "#20D67B",
  },
  publishedDot: {
    backgroundColor: "#20D67B",
  },
  hiddenBadge: {
    backgroundColor: "rgba(255,209,102,0.10)",
    borderColor: "rgba(255,209,102,0.30)",
  },
  hiddenText: {
    color: "#FFD166",
  },
  hiddenDot: {
    backgroundColor: "#FFD166",
  },
  finishedBadge: {
    backgroundColor: "rgba(116,142,245,0.10)",
    borderColor: "rgba(116,142,245,0.30)",
  },
  finishedText: {
    color: "#8EA5FF",
  },
  finishedDot: {
    backgroundColor: "#8EA5FF",
  },
  cancelledBadge: {
    backgroundColor: "rgba(255,77,87,0.10)",
    borderColor: "rgba(255,77,87,0.30)",
  },
  cancelledText: {
    color: "#FF737A",
  },
  cancelledDot: {
    backgroundColor: "#FF4D57",
  },
  scheduleSummary: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  scheduleItem: {
    flex: 1,
    minHeight: 72,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 11,
  },
  scheduleLabel: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  scheduleValue: {
    color: "#E1E1E1",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 5,
  },
  infoCard: {
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
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  statesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  stateCard: {
    width: "48%",
    minHeight: 122,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  stateCardActive: {
    borderWidth: 2,
  },
  stateCardHeader: {
    minHeight: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  stateDescription: {
    color: "#969696",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  currentLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  stateDraftCard: {
    backgroundColor: "rgba(180,180,180,0.06)",
    borderColor: "rgba(180,180,180,0.18)",
  },
  stateDraftLabel: {
    color: "#D0D0D0",
  },
  statePublishedCard: {
    backgroundColor: "rgba(32,214,123,0.06)",
    borderColor: "rgba(32,214,123,0.23)",
  },
  statePublishedLabel: {
    color: "#20D67B",
  },
  stateHiddenCard: {
    backgroundColor: "rgba(255,209,102,0.06)",
    borderColor: "rgba(255,209,102,0.23)",
  },
  stateHiddenLabel: {
    color: "#FFD166",
  },
  stateFinishedCard: {
    backgroundColor: "rgba(116,142,245,0.06)",
    borderColor: "rgba(116,142,245,0.23)",
  },
  stateFinishedLabel: {
    color: "#8EA5FF",
  },
  stateCancelledCard: {
    backgroundColor: "rgba(255,77,87,0.06)",
    borderColor: "rgba(255,77,87,0.23)",
  },
  stateCancelledLabel: {
    color: "#FF737A",
  },
  warningCard: {
    backgroundColor: "rgba(255,209,102,0.07)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.22)",
    padding: 14,
    marginTop: 13,
  },
  warningTitle: {
    color: "#FFD166",
    fontWeight: "900",
  },
  warningText: {
    color: "#C8B987",
    lineHeight: 19,
    marginTop: 5,
  },
  programmingCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 15,
  },
  programmingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#20D67B",
    borderWidth: 3,
    borderColor: "rgba(32,214,123,0.25)",
  },
  timelineDotSecondary: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E50914",
    borderWidth: 3,
    borderColor: "rgba(229,9,20,0.25)",
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginLeft: 6,
  },
  programmingLabel: {
    color: "#858585",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  programmingValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 3,
  },
  reprogramButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.42)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  refreshButton: {
    minHeight: 47,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.45,
  },
  bottomSpace: {
    height: 34,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.80)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modalCard: {
    width: "100%",
    maxHeight: "92%",
    borderRadius: 24,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  modalContent: {
    padding: 18,
    gap: 11,
    paddingBottom: 28,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  modalText: {
    color: "#BDBDBD",
    lineHeight: 20,
  },
  modalInfoCard: {
    backgroundColor: "rgba(116,142,245,0.08)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(116,142,245,0.22)",
    padding: 12,
  },
  modalInfoTitle: {
    color: "#8EA5FF",
    fontWeight: "900",
  },
  modalInfoText: {
    color: "#B7C0E5",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  dateSection: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    gap: 10,
  },
  dateSectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  fieldHelp: {
    color: "#7F7F7F",
    fontSize: 11,
    lineHeight: 16,
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
  multilineInput: {
    minHeight: 92,
    paddingTop: 13,
    paddingBottom: 13,
  },
  primaryButton: {
    minHeight: 49,
    borderRadius: 15,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cancelButton: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
});