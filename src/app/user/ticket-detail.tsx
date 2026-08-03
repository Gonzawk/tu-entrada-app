import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import {
  getMiTicketDetalleApi,
  transferirTicketApi,
} from "../../api/ticketsApi";
import { useAuth } from "../../auth/AuthContext";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import { MiTicket } from "../../types/tickets";
import { formatDate } from "../../utils/formatDate";
import { createIdempotencyKey } from "../../utils/idempotency";

function formatHour(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function formatUtcDateInArgentina(value?: string | null) {
  if (!value) return null;

  /*
   * FechaUso se almacena y se envía en UTC.
   * Si la API devolviera el valor sin sufijo de zona horaria,
   * lo interpretamos explícitamente como UTC para evitar que
   * JavaScript lo trate como una fecha local.
   */
  const normalizedValue =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Catamarca",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatTicketAccessWindow(ticket: MiTicket) {
  const entrada = ticket.entrada;

  if (!entrada?.tieneHorarioIngreso) {
    return "Ingreso disponible durante toda la noche del evento.";
  }

  const desde = formatHour(entrada.horaIngresoDesde);
  const hasta = formatHour(entrada.horaIngresoHasta);

  if (desde && hasta) return `Ingreso permitido desde ${desde} hasta ${hasta}.`;
  if (desde && !hasta) return `Ingreso permitido desde ${desde}.`;
  if (!desde && hasta) return `Ingreso permitido hasta ${hasta}.`;

  return "Ingreso disponible durante toda la noche del evento.";
}

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<MiTicket | null>(null);
  const [loading, setLoading] = useState(true);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferNombre, setTransferNombre] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferKey, setTransferKey] = useState(() =>
    createIdempotencyKey("transferir-ticket")
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const id = Number(ticketId);

      if (!id) {
        setTicket(null);
        return;
      }

      const data = await getMiTicketDetalleApi(id);
      setTicket(data);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo cargar ticket."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [ticketId, load]);

  useEffect(() => {
    async function setupRealtime() {
      if (!user?.userId) return;

      const token = await getToken();
      if (!token) return;

      await connectRealtime(user.userId, token, {
        onOrdenConfirmada: () => {
          load();
        },
        onTicketUsado: (data) => {
          if (Number(data.ticketId) !== Number(ticketId)) return;

          setTicket((prev) =>
            prev
              ? {
                  ...prev,
                  estado: data.estado ?? prev.estado,
                  fechaUso: data.fechaUso ?? prev.fechaUso,
                }
              : prev
          );
        },
      });
    }

    setupRealtime().catch((error) => {
      console.log("Realtime ticket detail error:", error);
    });
  }, [user?.userId, ticketId, load]);

  async function confirmarTransferencia() {
    if (!ticket?.id) return;

    const email = transferEmail.trim().toLowerCase();
    const nombre = transferNombre.trim();

    if (!email) {
      Alert.alert("Faltan datos", "Ingresá el email del nuevo dueño.");
      return;
    }

    Alert.alert(
      "Transferir entrada",
      "La app no respalda compras o pagos realizados por fuera de la orden directa dentro de la aplicación. Si transferís esta entrada por venta externa, la validez del acuerdo depende de terceros.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Transferir",
          style: "destructive",
          onPress: async () => {
            try {
              setTransferring(true);

              await transferirTicketApi(ticket.id, {
                emailNuevoDueno: email,
                nombreNuevoDueno: nombre || null,
                idempotencyKey: transferKey,
              });

              Alert.alert(
                "Correcto",
                "La entrada fue transferida. Ya no aparecerá en tus entradas."
              );

              setTransferModalOpen(false);
              setTransferEmail("");
              setTransferNombre("");
              setTransferKey(createIdempotencyKey("transferir-ticket"));

              router.replace("/user/tickets" as never);
            } catch (e: any) {
              Alert.alert(
                "Error",
                String(
                  e?.response?.data?.message ??
                    e?.response?.data ??
                    "No se pudo transferir el ticket."
                )
              );
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
        <AppLayout title="Entrada">
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!ticket) {
    return (
      <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
        <AppLayout title="Entrada">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Ticket no encontrado.</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  const usosRestantes =
    ticket.usosRestantes ??
    Math.max(
      0,
      (ticket.cantidadUsosPermitidos ?? 1) -
        (ticket.cantidadUsosRealizados ?? 0)
    );

  const puedeMostrarQR = ticket.esMultiIngreso
    ? ticket.estado === "Asignada" && usosRestantes > 0
    : ticket.estado === "Asignada" && !ticket.fechaUso;

  const puedeTransferir =
    ticket.estado === "Asignada" &&
    !ticket.fechaUso &&
    !ticket.esMultiIngreso &&
    puedeMostrarQR;

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Mi entrada">
        <View style={styles.card}>
          {ticket.evento.bannerUrl ? (
            <Image
              source={{ uri: ticket.evento.bannerUrl }}
              style={styles.banner}
            />
          ) : null}

          <Text style={styles.title}>{ticket.evento.nombre}</Text>
          <Text style={styles.muted}>{ticket.evento.lugar}</Text>
          <Text style={styles.muted}>{ticket.evento.direccion}</Text>
          <Text style={styles.muted}>
            {formatDate(ticket.evento.fechaInicio)}
          </Text>
        </View>

        <View style={styles.ticketCard}>
          <Text style={styles.entryName}>{ticket.entrada.nombre}</Text>
          <Text style={styles.ticketNumber}>{ticket.numeroTicket}</Text>

          {ticket.entrada.descripcion ? (
            <Text style={styles.muted}>{ticket.entrada.descripcion}</Text>
          ) : null}

          {ticket.entrada.esCombo ? (
            <Text style={styles.combo}>
              Combo para {ticket.entrada.cantidadPersonas} personas
            </Text>
          ) : null}

          <Text style={puedeMostrarQR ? styles.active : styles.used}>
            Estado: {ticket.estado}
          </Text>
        </View>

        <View style={styles.accessCard}>
          <Text style={styles.accessTitle}>Horario de ingreso</Text>
          <Text style={styles.accessText}>
            {formatTicketAccessWindow(ticket)}
          </Text>
        </View>

        {ticket.esMultiIngreso ? (
          <View style={styles.multiCard}>
            <Text style={styles.multiTitle}>QR multiingreso</Text>

            <Text style={styles.multiText}>
              Este QR permite el ingreso de{" "}
              {ticket.cantidadUsosPermitidos ?? 1} personas.
            </Text>

            <Text style={styles.multiText}>
              Ingresaron: {ticket.cantidadUsosRealizados ?? 0}
            </Text>

            <Text style={styles.multiText}>Restantes: {usosRestantes}</Text>

            {ticket.observacionBeneficio ? (
              <Text style={styles.helpText}>{ticket.observacionBeneficio}</Text>
            ) : null}
          </View>
        ) : null}

        {ticket.entrada.incluyeBebidas ? (
          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Beneficio incluido</Text>

            <Text style={styles.benefitText}>
              {ticket.bebidasCanjeadas
                ? "Bebida/beneficio ya entregado."
                : ticket.entrada.descripcionBebidas ||
                  "Incluye bebidas seleccionadas."}
            </Text>

            {!ticket.bebidasCanjeadas ? (
              <Text style={styles.helpText}>
                El QR de bebida se visualiza desde Mis bebidas. Si transferís
                esta entrada, el QR de bebida no se transfiere automáticamente.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Código QR</Text>

          {puedeMostrarQR ? (
            <>
              <View style={styles.qrBox}>
                <QRCode value={ticket.codigoQR} size={230} />
              </View>

              <Text style={styles.qrHelp}>
                {ticket.esMultiIngreso
                  ? "Mostrá este QR en puerta. Cada escaneo registra un ingreso."
                  : "Mostrá este código en la puerta para validar tu ingreso."}
              </Text>
            </>
          ) : (
            <Text style={styles.notAvailable}>
              Este ticket ya no está disponible para ingreso.
            </Text>
          )}
        </View>

        {puedeTransferir ? (
          <View style={styles.transferCard}>
            <Text style={styles.transferTitle}>Transferir entrada</Text>
            <Text style={styles.helpText}>
              Podés transferir esta entrada a otro usuario por email. La compra
              o pago por fuera de la app no está respaldada por la aplicación.
            </Text>

            <Pressable
              style={styles.transferButton}
              onPress={() => setTransferModalOpen(true)}
            >
              <Text style={styles.primaryText}>Transferir ticket</Text>
            </Pressable>
          </View>
        ) : null}

        {ticket.fechaUso ? (
          <View style={styles.infoCard}>
            <Text style={styles.used}>
              Usado: {formatUtcDateInArgentina(ticket.fechaUso)}
            </Text>
            <Text style={styles.usedTimeZone}>
              Hora de Catamarca, Argentina
            </Text>
          </View>
        ) : null}

        <Modal visible={transferModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Transferir entrada</Text>

              <Text style={styles.warningText}>
                Importante: la app no garantiza compras, ventas o pagos
                realizados por fuera de la aplicación. Solo se transferirá la
                titularidad del ticket.
              </Text>

              <TextInput
                placeholder="Email del nuevo dueño"
                placeholderTextColor="#888"
                value={transferEmail}
                onChangeText={setTransferEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />

              <TextInput
                placeholder="Nombre opcional"
                placeholderTextColor="#888"
                value={transferNombre}
                onChangeText={setTransferNombre}
                style={styles.input}
              />

              <Pressable
                style={[styles.primaryButton, transferring && styles.disabled]}
                disabled={transferring}
                onPress={confirmarTransferencia}
              >
                {transferring ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Confirmar transferencia</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.closeButton}
                disabled={transferring}
                onPress={() => setTransferModalOpen(false)}
              >
                <Text style={styles.closeText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </AppLayout>
    </RoleGuard>
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
  banner: {
    height: 150,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1A1A1A",
  },
  title: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  ticketCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  entryName: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  ticketNumber: { color: "#BDBDBD", marginTop: 6 },
  combo: { color: "#FFFFFF", marginTop: 10, fontWeight: "800" },
  active: { color: "#20D67B", marginTop: 12, fontWeight: "900" },
  used: { color: "#FFB703", marginTop: 12, fontWeight: "900" },
  accessCard: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderColor: "rgba(255,209,102,0.25)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  accessTitle: {
    color: "#FFD166",
    fontWeight: "900",
    fontSize: 16,
  },
  accessText: {
    color: "#FFFFFF",
    marginTop: 6,
    fontWeight: "800",
  },
  multiCard: {
    backgroundColor: "rgba(158,197,254,0.12)",
    borderColor: "rgba(158,197,254,0.25)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  multiTitle: {
    color: "#9EC5FE",
    fontWeight: "900",
    fontSize: 16,
  },
  multiText: {
    color: "#FFFFFF",
    marginTop: 6,
    fontWeight: "800",
  },
  benefitCard: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderColor: "rgba(32,214,123,0.25)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  benefitTitle: {
    color: "#20D67B",
    fontWeight: "900",
    fontSize: 16,
  },
  benefitText: {
    color: "#FFFFFF",
    marginTop: 6,
    fontWeight: "800",
  },
  helpText: {
    color: "#BDBDBD",
    marginTop: 6,
    lineHeight: 19,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  qrTitle: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  qrBox: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },
  qrHelp: {
    color: "#333333",
    textAlign: "center",
    marginTop: 14,
    fontWeight: "700",
  },
  notAvailable: {
    color: "#E50914",
    fontWeight: "900",
    textAlign: "center",
  },
  transferCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  transferTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  transferButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 14,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.6,
  },
  closeButton: {
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  closeText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  infoCard: {
    backgroundColor: "rgba(255,183,3,0.12)",
    padding: 16,
    borderRadius: 20,
  },
  usedTimeZone: {
    color: "#FFD166",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: { color: "#BDBDBD" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  warningText: {
    color: "#FFD166",
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 12,
  },
});