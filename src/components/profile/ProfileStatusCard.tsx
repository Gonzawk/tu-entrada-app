import { StyleSheet, Text, View } from "react-native";

import type {
    AccountDeletionStatusName,
    AccountDeletionStatusResponse,
} from "../../types/profile";

interface ProfileStatusCardProps {
  status: AccountDeletionStatusResponse | null;
  loading?: boolean;
}

interface StatusPresentation {
  title: string;
  description: string;
  badgeText: string;
  badgeStyle: object;
  badgeTextStyle: object;
}

function normalizeStatus(
  status: AccountDeletionStatusResponse | null
): AccountDeletionStatusName | null {
  if (!status?.tieneSolicitudActiva) {
    return null;
  }

  if (status.estadoTexto) {
    return status.estadoTexto;
  }

  if (typeof status.estado === "string") {
    return status.estado;
  }

  return null;
}

function getStatusPresentation(
  statusName: AccountDeletionStatusName | null,
  backendMessage?: string
): StatusPresentation {
  switch (statusName) {
    case "PendienteConfirmacion":
      return {
        title: "Confirmación pendiente",
        description:
          backendMessage ||
          "Revisá tu correo electrónico y confirmá la solicitud para continuar.",
        badgeText: "Pendiente",
        badgeStyle: styles.warningBadge,
        badgeTextStyle: styles.warningBadgeText,
      };

    case "Confirmada":
      return {
        title: "Solicitud confirmada",
        description:
          backendMessage ||
          "La solicitud fue confirmada y será revisada por el equipo administrativo.",
        badgeText: "Confirmada",
        badgeStyle: styles.infoBadge,
        badgeTextStyle: styles.infoBadgeText,
      };

    case "EnRevision":
      return {
        title: "Solicitud en revisión",
        description:
          backendMessage ||
          "El equipo administrativo está revisando tu solicitud de eliminación.",
        badgeText: "En revisión",
        badgeStyle: styles.infoBadge,
        badgeTextStyle: styles.infoBadgeText,
      };

    case "Aprobada":
      return {
        title: "Solicitud aprobada",
        description:
          backendMessage ||
          "La solicitud fue aprobada y está pendiente de procesamiento.",
        badgeText: "Aprobada",
        badgeStyle: styles.successBadge,
        badgeTextStyle: styles.successBadgeText,
      };

    case "Procesada":
      return {
        title: "Solicitud procesada",
        description:
          backendMessage ||
          "La eliminación de la cuenta fue procesada correctamente.",
        badgeText: "Procesada",
        badgeStyle: styles.successBadge,
        badgeTextStyle: styles.successBadgeText,
      };

    case "Rechazada":
      return {
        title: "Solicitud rechazada",
        description:
          backendMessage ||
          "La solicitud fue rechazada. Podés comunicarte con soporte para conocer el motivo.",
        badgeText: "Rechazada",
        badgeStyle: styles.dangerBadge,
        badgeTextStyle: styles.dangerBadgeText,
      };

    case "Cancelada":
      return {
        title: "Solicitud cancelada",
        description:
          backendMessage ||
          "La solicitud de eliminación fue cancelada.",
        badgeText: "Cancelada",
        badgeStyle: styles.neutralBadge,
        badgeTextStyle: styles.neutralBadgeText,
      };

    case "Expirada":
      return {
        title: "Confirmación expirada",
        description:
          backendMessage ||
          "El enlace de confirmación expiró. Podés iniciar una nueva solicitud.",
        badgeText: "Expirada",
        badgeStyle: styles.neutralBadge,
        badgeTextStyle: styles.neutralBadgeText,
      };

    default:
      if (statusName) {
        return {
          title: "Solicitud de eliminación activa",
          description:
            backendMessage ||
            "Tu solicitud se encuentra activa y está siendo procesada.",
          badgeText: statusName,
          badgeStyle: styles.infoBadge,
          badgeTextStyle: styles.infoBadgeText,
        };
      }

      return {
        title: "Sin solicitudes activas",
        description:
          "Actualmente no existe una solicitud activa para eliminar tu cuenta.",
        badgeText: "Sin solicitud",
        badgeStyle: styles.neutralBadge,
        badgeTextStyle: styles.neutralBadgeText,
      };
  }
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProfileStatusCard({
  status,
  loading = false,
}: ProfileStatusCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Eliminación de cuenta</Text>
        </View>

        <View style={styles.loadingLine} />
        <View style={styles.loadingLineShort} />
      </View>
    );
  }

  const statusName = normalizeStatus(status);
  const presentation = getStatusPresentation(
    statusName,
    status?.message
  );

  const requestDate = formatDate(status?.fechaSolicitud);
  const confirmationDate = formatDate(status?.fechaConfirmacion);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Eliminación de cuenta</Text>

        <View style={[styles.badge, presentation.badgeStyle]}>
          <Text
            style={[
              styles.badgeText,
              presentation.badgeTextStyle,
            ]}
            numberOfLines={1}
          >
            {presentation.badgeText}
          </Text>
        </View>
      </View>

      <Text style={styles.statusTitle}>
        {presentation.title}
      </Text>

      <Text style={styles.description}>
        {presentation.description}
      </Text>

      {requestDate ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Solicitud iniciada
          </Text>
          <Text style={styles.detailValue}>
            {requestDate}
          </Text>
        </View>
      ) : null}

      {confirmationDate ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Confirmada
          </Text>
          <Text style={styles.detailValue}>
            {confirmationDate}
          </Text>
        </View>
      ) : null}

      {status?.motivo ? (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Motivo informado</Text>
          <Text style={styles.reasonText}>{status.motivo}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },

  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  badge: {
    maxWidth: "45%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },

  neutralBadge: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.13)",
  },

  neutralBadgeText: {
    color: "#C7C7C7",
  },

  warningBadge: {
    backgroundColor: "rgba(255,209,102,0.13)",
    borderColor: "rgba(255,209,102,0.28)",
  },

  warningBadgeText: {
    color: "#FFD166",
  },

  infoBadge: {
    backgroundColor: "rgba(59,130,246,0.13)",
    borderColor: "rgba(59,130,246,0.28)",
  },

  infoBadgeText: {
    color: "#7CB2FF",
  },

  successBadge: {
    backgroundColor: "rgba(34,197,94,0.13)",
    borderColor: "rgba(34,197,94,0.28)",
  },

  successBadgeText: {
    color: "#6EE7A2",
  },

  dangerBadge: {
    backgroundColor: "rgba(239,68,68,0.13)",
    borderColor: "rgba(239,68,68,0.28)",
  },

  dangerBadgeText: {
    color: "#FF7A82",
  },

  statusTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },

  description: {
    color: "#BDBDBD",
    fontSize: 14,
    lineHeight: 21,
  },

  detailRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },

  detailLabel: {
    color: "#8F8F8F",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },

  detailValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  reasonContainer: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  reasonLabel: {
    color: "#9E9E9E",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  reasonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },

  loadingLine: {
    height: 16,
    width: "82%",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  loadingLineShort: {
    height: 14,
    width: "58%",
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});