import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getMiEventoDetalleRRPPApi } from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { RRPPEventoResumen } from "../../types/rrpp";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

export default function RRPPEventDetailScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const id = Number(eventoId);

  const [evento, setEvento] = useState<RRPPEventoResumen | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      if (!id) {
        setEvento(null);
        return;
      }

      const data = await getMiEventoDetalleRRPPApi(id);
      setEvento(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Evento">
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!evento) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Evento">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Evento no encontrado.</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title="Detalle evento">
        <View style={styles.card}>
          {evento.bannerUrl ? (
            <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
          ) : null}

          <Text style={styles.title}>{evento.eventoNombre}</Text>
          <Text style={styles.muted}>{evento.lugar}</Text>
          <Text style={styles.muted}>{formatDate(evento.fechaInicio)}</Text>
          <Text style={styles.status}>Estado: {evento.estadoEvento}</Text>
        </View>

        <View style={styles.renderCard}>
          <Text style={styles.renderLabel}>Total a rendir al boliche</Text>
          <Text style={styles.renderAmount}>
            {formatMoney(evento.totalConfirmado)}
          </Text>
          <Text style={styles.renderText}>
            {evento.ordenesConfirmadas} órdenes confirmadas ·{" "}
            {evento.ticketsGenerados} tickets
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pendientes</Text>
            <Text style={styles.statValue}>{evento.ordenesPendientes}</Text>
            <Text style={styles.statMoney}>
              {formatMoney(evento.totalPendiente)}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Confirmadas</Text>
            <Text style={styles.statValue}>{evento.ordenesConfirmadas}</Text>
            <Text style={styles.statMoney}>
              {formatMoney(evento.totalConfirmado)}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/rrpp/event-orders",
              params: { eventoId: evento.eventoId },
            } as never)
          }
        >
          <Text style={styles.primaryText}>Ver todas las órdenes del evento</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.push({
              pathname: "/rrpp/event-confirmed-orders",
              params: { eventoId: evento.eventoId },
            } as never)
          }
        >
          <Text style={styles.primaryText}>Ver confirmadas del evento</Text>
        </Pressable>
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
    height: 160,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: "#1A1A1A",
  },
  title: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  status: { color: "#FFD166", marginTop: 8, fontWeight: "900" },
  renderCard: {
    backgroundColor: "rgba(32,214,123,0.12)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.25)",
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
  },
  renderLabel: { color: "#20D67B", fontWeight: "900" },
  renderAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  renderText: { color: "#BDBDBD", marginTop: 6 },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 20,
  },
  statLabel: { color: "#BDBDBD", fontWeight: "800" },
  statValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6,
  },
  statMoney: { color: "#FFFFFF", marginTop: 4, fontWeight: "800" },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 18,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: { color: "#BDBDBD" },
});