import { useEffect, useMemo, useState } from "react";
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
    asignarTicketPendienteApi,
    getTicketsPendientesDeMiCompraApi,
    getTicketsPendientesReclamarApi,
    reclamarTicketApi,
    reclamarTicketPorCodigoApi,
} from "../../api/ticketsApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { TicketPendienteReclamar } from "../../types/tickets";
import { formatDate } from "../../utils/formatDate";

export default function PendingTicketsScreen() {
  const [porEmail, setPorEmail] = useState<TicketPendienteReclamar[]>([]);
  const [deMiCompra, setDeMiCompra] = useState<TicketPendienteReclamar[]>([]);
  const [loading, setLoading] = useState(true);

  const [codigo, setCodigo] = useState("");
  const [assignEmail, setAssignEmail] = useState<Record<number, string>>({});
  const [assignName, setAssignName] = useState<Record<number, string>>({});

  async function load() {
    try {
      setLoading(true);

      const [emailData, compraData] = await Promise.all([
        getTicketsPendientesReclamarApi(),
        getTicketsPendientesDeMiCompraApi(),
      ]);

      setPorEmail(emailData);
      setDeMiCompra(compraData);
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "No se pudieron cargar pendientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reclamarPorEmail(ticketId: number) {
    try {
      await reclamarTicketApi(ticketId);
      Alert.alert("Correcto", "Ticket reclamado correctamente.");
      await load();
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "No se pudo reclamar."));
    }
  }

  async function reclamarPorCodigo() {
    try {
      if (!codigo.trim()) {
        Alert.alert("Código requerido", "Ingresá el código de reclamo.");
        return;
      }

      await reclamarTicketPorCodigoApi(codigo.trim());
      Alert.alert("Correcto", "Ticket reclamado correctamente.");
      setCodigo("");
      await load();
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "Código inválido."));
    }
  }

  async function asignarPorEmail(ticketId: number) {
    try {
      const email = assignEmail[ticketId]?.trim();
      const nombre = assignName[ticketId]?.trim();

      if (!email && !nombre) {
        Alert.alert("Faltan datos", "Indicá al menos email o nombre pendiente.");
        return;
      }

      await asignarTicketPendienteApi(ticketId, {
        usuarioAsignadoId: null,
        email: email || null,
        nombrePendiente: nombre || null,
      });

      Alert.alert("Correcto", "Ticket actualizado/asignado correctamente.");
      await load();
    } catch (e: any) {
      Alert.alert("Error", String(e?.response?.data ?? "No se pudo asignar."));
    }
  }

  const totalPendientes = useMemo(
    () => porEmail.length + deMiCompra.length,
    [porEmail, deMiCompra]
  );

  return (
    <RoleGuard allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}>
      <AppLayout title="Pendientes">
        <View style={styles.resumeCard}>
          <Text style={styles.resumeLabel}>Tickets pendientes</Text>
          <Text style={styles.resumeNumber}>{totalPendientes}</Text>
        </View>

        <Text style={styles.sectionTitle}>Reclamar por código</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Ej: CLM-123456"
            placeholderTextColor="#888"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
            style={styles.input}
          />

          <Pressable style={styles.primaryButton} onPress={reclamarPorCodigo}>
            <Text style={styles.primaryText}>Reclamar código</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Pendientes para mi email</Text>

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 30 }} />
        ) : porEmail.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tenés tickets pendientes por email.</Text>
          </View>
        ) : (
          porEmail.map((ticket) => (
            <View key={ticket.id} style={styles.card}>
              <Text style={styles.title}>{ticket.evento.nombre}</Text>
              <Text style={styles.muted}>{ticket.entrada.nombre}</Text>
              <Text style={styles.muted}>{formatDate(ticket.evento.fechaInicio)}</Text>
              <Text style={styles.muted}>Ticket: {ticket.numeroTicket}</Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => reclamarPorEmail(ticket.id)}
              >
                <Text style={styles.primaryText}>Reclamar entrada</Text>
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Pendientes de mi compra</Text>

        {deMiCompra.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tenés entradas sin asignar.</Text>
          </View>
        ) : (
          deMiCompra.map((ticket) => (
            <View key={ticket.id} style={styles.card}>
              <Text style={styles.title}>{ticket.evento.nombre}</Text>
              <Text style={styles.muted}>{ticket.entrada.nombre}</Text>
              <Text style={styles.muted}>Pendiente: {ticket.nombrePendiente ?? "Sin nombre"}</Text>
              <Text style={styles.muted}>Email: {ticket.emailPendiente ?? "Sin email"}</Text>

              {ticket.codigoReclamo ? (
                <Text style={styles.claimCode}>Código: {ticket.codigoReclamo}</Text>
              ) : null}

              <TextInput
                placeholder="Nuevo email para asignar/reclamar"
                placeholderTextColor="#888"
                value={assignEmail[ticket.id] ?? ""}
                onChangeText={(value) =>
                  setAssignEmail((prev) => ({ ...prev, [ticket.id]: value }))
                }
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />

              <TextInput
                placeholder="Nombre pendiente"
                placeholderTextColor="#888"
                value={assignName[ticket.id] ?? ""}
                onChangeText={(value) =>
                  setAssignName((prev) => ({ ...prev, [ticket.id]: value }))
                }
                style={styles.input}
              />

              <Pressable
                style={styles.secondaryButton}
                onPress={() => asignarPorEmail(ticket.id)}
              >
                <Text style={styles.primaryText}>Actualizar/asignar</Text>
              </Pressable>
            </View>
          ))
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  resumeCard: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderColor: "rgba(229,9,20,0.25)",
    borderWidth: 1,
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
  },
  resumeLabel: { color: "#BDBDBD", fontWeight: "800" },
  resumeNumber: { color: "#FFFFFF", fontSize: 36, fontWeight: "900", marginTop: 8 },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 12,
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    gap: 10,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  claimCode: {
    color: "#FFD166",
    marginTop: 10,
    fontWeight: "900",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  emptyText: { color: "#BDBDBD" },
});