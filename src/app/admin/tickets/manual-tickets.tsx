import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getTicketsAdminManualesApi } from "../../../api/adminApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

export default function AdminManualTicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  async function load(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);

      const data = await getTicketsAdminManualesApi();
      setTickets(data);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data ?? "No se pudieron cargar tickets.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copy(text: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copiado", text);
  }

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return tickets;

    return tickets.filter((x) => {
      return (
        x.eventoNombre?.toLowerCase().includes(q) ||
        x.tipoEntradaNombre?.toLowerCase().includes(q) ||
        x.codigoReclamo?.toLowerCase().includes(q) ||
        x.numeroTicket?.toLowerCase().includes(q) ||
        x.nombrePendiente?.toLowerCase().includes(q) ||
        x.emailPendiente?.toLowerCase().includes(q)
      );
    });
  }, [tickets, search]);

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Tickets manuales">
        <TextInput
          placeholder="Buscar evento, código o persona..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load(true)}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {filtrados.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.empty}>
                  No hay tickets manuales generados.
                </Text>
              </View>
            ) : (
              filtrados.map((ticket) => (
                <View key={ticket.id} style={styles.card}>
                  <Text style={styles.eventTitle}>
                    {ticket.eventoNombre}
                  </Text>

                  <Text style={styles.type}>
                    {ticket.tipoEntradaNombre}
                  </Text>

                  <View style={styles.codeBox}>
                    <Text style={styles.label}>Código reclamo</Text>

                    <Text style={styles.code}>
                      {ticket.codigoReclamo}
                    </Text>

                    <Pressable
                      style={styles.copyButton}
                      onPress={() => copy(ticket.codigoReclamo)}
                    >
                      <Text style={styles.copyText}>Copiar código</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.muted}>
                    Ticket: {ticket.numeroTicket}
                  </Text>

                  {ticket.nombrePendiente ? (
                    <Text style={styles.muted}>
                      Nombre: {ticket.nombrePendiente}
                    </Text>
                  ) : null}

                  {ticket.emailPendiente ? (
                    <Text style={styles.muted}>
                      Email: {ticket.emailPendiente}
                    </Text>
                  ) : null}

                  {ticket.observacionAdmin ? (
                    <Text style={styles.observation}>
                      {ticket.observacionAdmin}
                    </Text>
                  ) : null}

                  <View style={styles.statusRow}>
                    <Text
                      style={
                        ticket.reclmado
                          ? styles.claimed
                          : styles.pending
                      }
                    >
                      {ticket.reclmado
                        ? `Reclamado por ${ticket.usuarioAsignado}`
                        : "Pendiente de reclamar"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  type: {
    color: "#BDBDBD",
    marginTop: 4,
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 18,
    padding: 14,
  },
  label: {
    color: "#BDBDBD",
    fontSize: 12,
  },
  code: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  copyButton: {
    backgroundColor: "#E50914",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  copyText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 10,
  },
  observation: {
    color: "#FFD166",
    marginTop: 12,
    fontStyle: "italic",
  },
  statusRow: {
    marginTop: 16,
  },
  pending: {
    color: "#FFD166",
    fontWeight: "900",
  },
  claimed: {
    color: "#20D67B",
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 18,
    borderRadius: 20,
  },
  empty: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});