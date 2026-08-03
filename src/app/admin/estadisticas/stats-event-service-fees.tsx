import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAdminEventoCargosResumenApi } from "../../../api/adminStatsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { AdminEventoCargosResumen } from "../../../types/adminStats";
import { formatDate } from "../../../utils/formatDate";
import { formatMoney } from "../../../utils/formatMoney";

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

export default function AdminStatsEventServiceFeesScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminEventoCargosResumen | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const id = Number(eventoId);

      if (!Number.isInteger(id) || id <= 0) {
        setData(null);
        Alert.alert("Error", "Evento inválido.");
        return;
      }

      const result = await getAdminEventoCargosResumenApi(id);
      setData(result);
    } catch (error: unknown) {
      const apiError = error as ApiError;

      setData(null);
      Alert.alert(
        "Error",
        apiError.response?.data?.message ??
          apiError.message ??
          "No se pudo cargar cargo por servicio."
      );
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Cargo por servicio">
        {loading ? (
          <ActivityIndicator color="#E50914" style={styles.loader} />
        ) : !data ? (
          <Text style={styles.muted}>No hay datos disponibles.</Text>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{data.eventoNombre}</Text>
              <Text style={styles.muted}>{formatDate(data.fechaInicio)}</Text>

              <Text style={styles.heroLabel}>Total a rendir plataforma</Text>
              <Text style={styles.heroTotal}>
                {formatMoney(data.cargoServicioTotal)}
              </Text>
            </View>

            <View style={styles.grid}>
              <StatCard
                label="Personas vendidas"
                value={String(data.personasVendidasSistema)}
              />
              <StatCard
                label="Ingresos reales"
                value={String(data.personasIngresadasReales)}
              />
              <StatCard
                label="Tickets RRPP"
                value={String(data.ticketsOnlineRRPP)}
              />
              <StatCard
                label="Ventanilla físicos"
                value={String(data.ticketsVentanillaFisico)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cargo por servicio</Text>

              <MoneyRow label="Órdenes RRPP" value={data.cargoServicioRRPP} />
              <MoneyRow
                label="Ventanilla digital"
                value={data.cargoServicioVentanillaDigital}
              />
              <MoneyRow
                label="Ventanilla físico"
                value={data.cargoServicioVentanillaFisico}
              />
              <MoneyRow
                label="QR multiingreso admin"
                value={data.cargoServicioMultiIngresoAdmin}
              />

              <View style={styles.separator} />

              <MoneyRow
                label="Total cargo servicio"
                value={data.cargoServicioTotal}
                strong
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Tickets por canal</Text>

              <InfoRow label="RRPP online" value={data.ticketsOnlineRRPP} />
              <InfoRow
                label="Ventanilla digital"
                value={data.ticketsVentanillaDigital}
              />
              <InfoRow
                label="Ventanilla físico"
                value={data.ticketsVentanillaFisico}
              />
              <InfoRow
                label="QR multiingreso admin"
                value={data.ticketsMultiIngresoAdmin}
              />
              <InfoRow
                label="Beneficios cumpleaños"
                value={data.ticketsBeneficioCumpleanios}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recaudación tickets</Text>

              <MoneyRow label="Total RRPP" value={data.totalOrdenesRRPP} />
              <MoneyRow
                label="Total ventanilla digital"
                value={data.totalVentanillaDigital}
              />
              <MoneyRow
                label="Total ventanilla físico"
                value={data.totalVentanillaFisico}
              />

              <View style={styles.separator} />

              <MoneyRow
                label="Total tickets"
                value={data.totalGeneralTickets}
                strong
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Criterio de cálculo</Text>
              <Text style={styles.helpText}>
                Los tickets normales cuentan como 1 persona. Los QR multiingreso
                cuentan según la cantidad de usos permitidos. Los beneficios de
                cumpleaños se informan aparte y no suman cargo por servicio si
                fueron marcados como beneficio.
              </Text>
            </View>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.rowLabelStrong : styles.rowLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.rowValueStrong : styles.rowValue}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  hero: {
    backgroundColor: "rgba(32,214,123,0.13)",
    borderColor: "rgba(32,214,123,0.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  heroLabel: {
    color: "#BDBDBD",
    marginTop: 14,
    fontWeight: "800",
  },
  heroTotal: {
    color: "#20D67B",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  statLabel: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  rowLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  rowValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  rowLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  rowValueStrong: {
    color: "#20D67B",
    fontSize: 18,
    fontWeight: "900",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },
  helpText: {
    color: "#BDBDBD",
    lineHeight: 20,
  },
});