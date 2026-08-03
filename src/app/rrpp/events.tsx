import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getMisEventosRRPPPaginadosApi } from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { RRPPEventoResumen } from "../../types/rrpp";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

export default function RRPPEeventsScreen() {
  const [eventos, setEventos] = useState<RRPPEventoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const data = await getMisEventosRRPPPaginadosApi();
      setEventos(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const eventosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return eventos;

    return eventos.filter((evento) =>
      evento.eventoNombre.toLowerCase().includes(q)
    );
  }, [eventos, search]);

  const totalARendir = eventosFiltrados.reduce(
    (acc, x) => acc + x.totalConfirmado,
    0
  );

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title="Mis eventos">
        <View style={styles.resumeCard}>
          <Text style={styles.resumeLabel}>Total a rendir</Text>
          <Text style={styles.resumeAmount}>{formatMoney(totalARendir)}</Text>
          <Text style={styles.resumeText}>
            Eventos asignados: {eventosFiltrados.length}
          </Text>
        </View>

        <TextInput
          placeholder="Buscar evento..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.searchInput}
        />

        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : eventosFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tenés eventos asignados.</Text>
          </View>
        ) : (
          eventosFiltrados.map((evento) => (
            <View key={evento.eventoId} style={styles.card}>
              {evento.bannerUrl ? (
                <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
              ) : null}

              <Text style={styles.title}>{evento.eventoNombre}</Text>
              <Text style={styles.muted}>{evento.lugar}</Text>
              <Text style={styles.muted}>{formatDate(evento.fechaInicio)}</Text>

              <Text style={styles.status}>Estado: {evento.estadoEvento}</Text>

              <View style={styles.statsRow}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Confirmadas</Text>
                  <Text style={styles.miniValue}>{evento.ordenesConfirmadas}</Text>
                </View>

                <View style={styles.miniStat}>
                  <Text style={styles.miniLabel}>Pendientes</Text>
                  <Text style={styles.miniValue}>{evento.ordenesPendientes}</Text>
                </View>
              </View>

              <View style={styles.moneyBox}>
                <Text style={styles.moneyLabel}>A rendir</Text>
                <Text style={styles.money}>{formatMoney(evento.totalConfirmado)}</Text>
              </View>

              <Text style={styles.muted}>
                Pendiente: {formatMoney(evento.totalPendiente)}
              </Text>

              <Text style={styles.muted}>
                Tickets generados: {evento.ticketsGenerados}
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() =>
                  router.push({
                    pathname: "/rrpp/event-detail",
                    params: { eventoId: evento.eventoId },
                  } as never)
                }
              >
                <Text style={styles.primaryText}>Ver detalle del evento</Text>
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
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
  },
  resumeLabel: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  resumeAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  resumeText: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
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
  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  status: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 16,
  },
  miniLabel: {
    color: "#BDBDBD",
    fontSize: 12,
    fontWeight: "800",
  },
  miniValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  moneyBox: {
    backgroundColor: "rgba(32,214,123,0.12)",
    padding: 14,
    borderRadius: 18,
    marginTop: 14,
  },
  moneyLabel: {
    color: "#20D67B",
    fontWeight: "900",
  },
  money: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: {
    color: "#BDBDBD",
  },
});