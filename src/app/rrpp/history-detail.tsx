import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getOrdenConfirmadaDetalleRRPPApi } from "../../api/rrppApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { formatDate } from "../../utils/formatDate";
import { formatMoney } from "../../utils/formatMoney";

type OrdenConfirmadaDetalle = {
  id: number;
  evento: string;
  comprador: string;
  total: number;
  estado: string;
  fechaConfirmacion?: string | null;
  items: {
    id: number;
    tipoEntrada: string;
    usuarioAsignado?: string | null;
    nombreInvitado?: string | null;
    emailInvitado?: string | null;
    ticketId?: number | null;
    precioUnitario: number;
  }[];
};

type ApiErrorLike = {
  response?: {
    data?: string;
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as ApiErrorLike;
  return err?.response?.data ?? fallback;
}

export default function RRPPHistoryDetailScreen() {
  const { ordenId } = useLocalSearchParams<{ ordenId: string }>();

  const [orden, setOrden] = useState<OrdenConfirmadaDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const id = Number(ordenId);

      if (!id) {
        setOrden(null);
        return;
      }

      const data = await getOrdenConfirmadaDetalleRRPPApi(id);
      setOrden(data);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        getErrorMessage(e, "No se pudo cargar el detalle.")
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Detalle">
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!orden) {
    return (
      <RoleGuard allowedRoles={["RRPP"]}>
        <AppLayout title="Detalle">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Orden no encontrada.</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title={`Orden #${orden.id}`}>
        <View style={styles.card}>
          <Text style={styles.title}>{orden.evento}</Text>

          <Text style={styles.muted}>Comprador: {orden.comprador}</Text>

          <Text style={styles.muted}>
            Confirmada:{" "}
            {orden.fechaConfirmacion
              ? formatDate(orden.fechaConfirmacion)
              : "Sin fecha"}
          </Text>

          <Text style={styles.total}>{formatMoney(orden.total)}</Text>

          <Text style={styles.status}>Estado: {orden.estado}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tickets generados</Text>

        {orden.items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay tickets generados.</Text>
          </View>
        ) : (
          orden.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.tipoEntrada}</Text>

              <Text style={styles.muted}>
                Asignado:{" "}
                {item.usuarioAsignado ??
                  item.nombreInvitado ??
                  item.emailInvitado ??
                  "Pendiente sin datos"}
              </Text>

              {item.emailInvitado ? (
                <Text style={styles.muted}>Email: {item.emailInvitado}</Text>
              ) : null}

              <Text style={styles.muted}>
                Ticket ID: {item.ticketId ?? "Sin ticket"}
              </Text>

              <Text style={styles.itemPrice}>
                {formatMoney(item.precioUnitario)}
              </Text>
            </View>
          ))
        )}
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
  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 14,
  },
  status: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  itemTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  itemPrice: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
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