import React, { memo, useMemo } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import AccountDeletionStatusBadge from "./AccountDeletionStatusBadge";

import type {
    AccountDeletionAdminAction,
    AccountDeletionAdminResponse,
} from "../../../types/adminAccountDeletion";

import {
    canProcessAccountDeletionRequest,
    canResolveAccountDeletionRequest,
    canStartAccountDeletionReview,
} from "../../../types/adminAccountDeletion";

interface AccountDeletionRequestCardProps {
  request: AccountDeletionAdminResponse;

  /**
   * Debe ser true únicamente cuando el usuario autenticado
   * posee el rol SuperAdmin.
   */
  isSuperAdmin: boolean;

  /**
   * Acción que actualmente se está ejecutando sobre esta solicitud.
   */
  loadingAction?: AccountDeletionAdminAction | null;

  /**
   * Deshabilita todas las acciones de la tarjeta.
   * Resulta útil cuando existe otra operación global en curso.
   */
  disabled?: boolean;

  onStartReview: (
    request: AccountDeletionAdminResponse
  ) => void;

  onApprove: (
    request: AccountDeletionAdminResponse
  ) => void;

  onReject: (
    request: AccountDeletionAdminResponse
  ) => void;

  onProcess: (
    request: AccountDeletionAdminResponse
  ) => void;
}

interface ActionButtonProps {
  label: string;
  variant:
    | "primary"
    | "success"
    | "danger"
    | "warning";
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ActionButton({
  label,
  variant,
  loading = false,
  disabled = false,
  onPress,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        styles[`actionButton_${variant}`],
        isDisabled && styles.actionButtonDisabled,
        pressed && !isDisabled && styles.actionButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <Text style={styles.actionButtonText}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function AccountDeletionRequestCard({
  request,
  isSuperAdmin,
  loadingAction = null,
  disabled = false,
  onStartReview,
  onApprove,
  onReject,
  onProcess,
}: AccountDeletionRequestCardProps) {
  const canStartReview = useMemo(
    () =>
      canStartAccountDeletionReview(
        request.estado
      ),
    [request.estado]
  );

  const canResolve = useMemo(
    () =>
      canResolveAccountDeletionRequest(
        request.estado
      ),
    [request.estado]
  );

  const canProcess = useMemo(
    () =>
      isSuperAdmin &&
      canProcessAccountDeletionRequest(
        request.estado
      ),
    [isSuperAdmin, request.estado]
  );

  const hasAnyAction =
    canStartReview ||
    canResolve ||
    canProcess;

  const userDisplayName =
    request.nombreUsuario?.trim() ||
    "Usuario sin nombre disponible";

  const motive =
    request.motivo?.trim() ||
    "El usuario no indicó un motivo.";

  const adminObservation =
    request.observacionAdministrador?.trim();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text
            style={styles.userName}
            numberOfLines={2}
          >
            {userDisplayName}
          </Text>

          <Text
            style={styles.email}
            selectable
            numberOfLines={2}
          >
            {request.emailOriginal}
          </Text>
        </View>

        <AccountDeletionStatusBadge
          status={request.estado}
        />
      </View>

      <View style={styles.identifierRow}>
        <View style={styles.identifierItem}>
          <Text style={styles.identifierLabel}>
            Solicitud
          </Text>

          <Text style={styles.identifierValue}>
            #{request.id}
          </Text>
        </View>

        <View style={styles.identifierDivider} />

        <View style={styles.identifierItem}>
          <Text style={styles.identifierLabel}>
            Usuario
          </Text>

          <Text style={styles.identifierValue}>
            #{request.usuarioId}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Motivo informado
        </Text>

        <Text style={styles.sectionText}>
          {motive}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Seguimiento
        </Text>

        <InfoRow
          label="Solicitada"
          value={formatDate(
            request.fechaSolicitud
          )}
        />

        <InfoRow
          label="Confirmada"
          value={formatDate(
            request.fechaConfirmacion
          )}
        />

        <InfoRow
          label="Inicio de revisión"
          value={formatDate(
            request.fechaInicioRevision
          )}
        />

        <InfoRow
          label="Resolución"
          value={formatDate(
            request.fechaResolucion
          )}
        />

        {request.fechaProcesamiento && (
          <InfoRow
            label="Procesamiento"
            value={formatDate(
              request.fechaProcesamiento
            )}
          />
        )}
      </View>

      {adminObservation && (
        <View style={styles.observationBox}>
          <Text style={styles.observationTitle}>
            Observación administrativa
          </Text>

          <Text style={styles.observationText}>
            {adminObservation}
          </Text>
        </View>
      )}

      {request.datosAnonimizados && (
        <View style={styles.anonymizedBox}>
          <Text style={styles.anonymizedTitle}>
            Datos anonimizados
          </Text>

          <Text style={styles.anonymizedText}>
            La solicitud ya fue procesada y los
            datos personales fueron anonimizados.
          </Text>
        </View>
      )}

      {hasAnyAction && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>
            Acciones disponibles
          </Text>

          {canStartReview && (
            <ActionButton
              label="Iniciar revisión"
              variant="primary"
              loading={
                loadingAction ===
                "start-review"
              }
              disabled={disabled}
              onPress={() =>
                onStartReview(request)
              }
            />
          )}

          {canResolve && (
            <View style={styles.resolveActions}>
              <View style={styles.resolveActionItem}>
                <ActionButton
                  label="Aprobar"
                  variant="success"
                  loading={
                    loadingAction ===
                    "approve"
                  }
                  disabled={disabled}
                  onPress={() =>
                    onApprove(request)
                  }
                />
              </View>

              <View style={styles.resolveActionItem}>
                <ActionButton
                  label="Rechazar"
                  variant="danger"
                  loading={
                    loadingAction ===
                    "reject"
                  }
                  disabled={disabled}
                  onPress={() =>
                    onReject(request)
                  }
                />
              </View>
            </View>
          )}

          {canProcess && (
            <>
              <View style={styles.processWarning}>
                <Text style={styles.processWarningTitle}>
                  Acción definitiva
                </Text>

                <Text style={styles.processWarningText}>
                  Esta operación anonimiza y
                  desactiva la cuenta. Solo debe
                  ejecutarse después de verificar
                  correctamente la solicitud.
                </Text>
              </View>

              <ActionButton
                label="Procesar definitivamente"
                variant="warning"
                loading={
                  loadingAction === "process"
                }
                disabled={disabled}
                onPress={() =>
                  onProcess(request)
                }
              />
            </>
          )}
        </View>
      )}

      {!hasAnyAction &&
        request.estado === "Aprobada" &&
        !isSuperAdmin && (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingTitle}>
              Pendiente de SuperAdmin
            </Text>

            <Text style={styles.waitingText}>
              La solicitud fue aprobada y espera
              el procesamiento definitivo de un
              SuperAdmin.
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151922",
    borderColor: "#2A3040",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 18,
  },

  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  headerTextContainer: {
    flex: 1,
    gap: 5,
  },

  userName: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },

  email: {
    color: "#AAB4C3",
    fontSize: 14,
    lineHeight: 20,
  },

  identifierRow: {
    alignItems: "center",
    backgroundColor: "#10141C",
    borderColor: "#252B38",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  identifierItem: {
    flex: 1,
    gap: 4,
  },

  identifierDivider: {
    backgroundColor: "#2A3040",
    height: 34,
    marginHorizontal: 14,
    width: 1,
  },

  identifierLabel: {
    color: "#7D8797",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  identifierValue: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },

  section: {
    gap: 10,
  },

  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },

  sectionText: {
    color: "#C3CAD5",
    fontSize: 14,
    lineHeight: 21,
  },

  infoRow: {
    alignItems: "flex-start",
    borderBottomColor: "#252B38",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 8,
  },

  infoLabel: {
    color: "#7D8797",
    flex: 1,
    fontSize: 13,
  },

  infoValue: {
    color: "#DDE3EC",
    flex: 1.35,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },

  observationBox: {
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  observationTitle: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },

  observationText: {
    color: "#AEB8C6",
    fontSize: 13,
    lineHeight: 20,
  },

  anonymizedBox: {
    backgroundColor: "#052E2B",
    borderColor: "#0F766E",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  anonymizedTitle: {
    color: "#99F6E4",
    fontSize: 13,
    fontWeight: "800",
  },

  anonymizedText: {
    color: "#A7F3D0",
    fontSize: 13,
    lineHeight: 20,
  },

  actionsContainer: {
    borderTopColor: "#2A3040",
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 16,
  },

  actionsTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },

  actionButton: {
    alignItems: "center",
    borderRadius: 13,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  actionButton_primary: {
    backgroundColor: "#2563EB",
  },

  actionButton_success: {
    backgroundColor: "#15803D",
  },

  actionButton_danger: {
    backgroundColor: "#B91C1C",
  },

  actionButton_warning: {
    backgroundColor: "#B45309",
  },

  actionButtonDisabled: {
    opacity: 0.5,
  },

  actionButtonPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  resolveActions: {
    flexDirection: "row",
    gap: 10,
  },

  resolveActionItem: {
    flex: 1,
  },

  processWarning: {
    backgroundColor: "#2A1605",
    borderColor: "#92400E",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  processWarningTitle: {
    color: "#FCD34D",
    fontSize: 13,
    fontWeight: "800",
  },

  processWarningText: {
    color: "#FDE68A",
    fontSize: 13,
    lineHeight: 20,
  },

  waitingBox: {
    backgroundColor: "#172033",
    borderColor: "#334E7D",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  waitingTitle: {
    color: "#BFDBFE",
    fontSize: 13,
    fontWeight: "800",
  },

  waitingText: {
    color: "#C7D2FE",
    fontSize: 13,
    lineHeight: 20,
  },
});

export default memo(
  AccountDeletionRequestCard
);