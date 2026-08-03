import React, {
    memo,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import type {
    AccountDeletionAdminResponse,
} from "../../../types/adminAccountDeletion";

interface ProcessAccountDeletionModalProps {
  visible: boolean;
  request: AccountDeletionAdminResponse | null;
  loading?: boolean;

  /**
   * Debe ejecutar:
   * POST /api/account-deletion/admin/{solicitudId}/process
   */
  onConfirm: () => Promise<void> | void;

  onClose: () => void;
}

const REQUIRED_CONFIRMATION = "PROCESAR";

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

function ProcessAccountDeletionModal({
  visible,
  request,
  loading = false,
  onConfirm,
  onClose,
}: ProcessAccountDeletionModalProps) {
  const [confirmation, setConfirmation] =
    useState("");

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setConfirmation("");
      setValidationError(null);
      setSubmitError(null);
    }
  }, [visible]);

  useEffect(() => {
    setConfirmation("");
    setValidationError(null);
    setSubmitError(null);
  }, [request?.id]);

  const normalizedConfirmation = useMemo(
    () => confirmation.trim().toUpperCase(),
    [confirmation]
  );

  const isConfirmationValid =
    normalizedConfirmation ===
    REQUIRED_CONFIRMATION;

  const canSubmit =
    Boolean(request) &&
    isConfirmationValid &&
    !loading;

  const closeModal = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  const validate = (): boolean => {
    if (!request) {
      setValidationError(
        "No se encontró la solicitud seleccionada."
      );

      return false;
    }

    if (
      request.estado !== "Aprobada"
    ) {
      setValidationError(
        "Solo una solicitud aprobada puede procesarse definitivamente."
      );

      return false;
    }

    if (!isConfirmationValid) {
      setValidationError(
        `Escribe ${REQUIRED_CONFIRMATION} para continuar.`
      );

      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleConfirm = async () => {
    if (loading) {
      return;
    }

    if (!validate()) {
      return;
    }

    setSubmitError(null);

    try {
      await onConfirm();
    } catch (error: unknown) {
      const message =
        error instanceof Error &&
        error.message.trim().length > 0
          ? error.message
          : "No fue posible procesar la solicitud.";

      setSubmitError(message);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <SafeAreaView style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeModal}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <View
            style={styles.modalCard}
            accessibilityViewIsModal
          >
            <View style={styles.dragIndicator} />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.scrollContent
              }
            >
              <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title}>
                    Procesar eliminación definitiva
                  </Text>

                  <Text style={styles.subtitle}>
                    Esta acción anonimiza los datos
                    personales y desactiva
                    definitivamente la cuenta.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  disabled={loading}
                  onPress={closeModal}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed &&
                      !loading &&
                      styles.closeButtonPressed,
                    loading &&
                      styles.disabledControl,
                  ]}
                >
                  <Text style={styles.closeButtonText}>
                    ×
                  </Text>
                </Pressable>
              </View>

              {request && (
                <View style={styles.requestSummary}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>
                      Solicitud #{request.id}
                    </Text>

                    <View style={styles.approvedBadge}>
                      <Text
                        style={
                          styles.approvedBadgeText
                        }
                      >
                        Aprobada
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Usuario
                    </Text>

                    <Text
                      style={styles.summaryValue}
                      numberOfLines={2}
                    >
                      {request.nombreUsuario?.trim() ||
                        "Sin nombre disponible"}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Correo original
                    </Text>

                    <Text
                      style={styles.summaryValue}
                      numberOfLines={2}
                      selectable
                    >
                      {request.emailOriginal}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Usuario ID
                    </Text>

                    <Text style={styles.summaryValue}>
                      #{request.usuarioId}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Solicitud
                    </Text>

                    <Text style={styles.summaryValue}>
                      {formatDate(
                        request.fechaSolicitud
                      )}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Resolución
                    </Text>

                    <Text style={styles.summaryValue}>
                      {formatDate(
                        request.fechaResolucion
                      )}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.criticalWarning}>
                <Text
                  style={
                    styles.criticalWarningTitle
                  }
                >
                  Acción irreversible
                </Text>

                <Text
                  style={
                    styles.criticalWarningText
                  }
                >
                  Antes de continuar, verifica que
                  la solicitud corresponda al
                  usuario correcto y que el proceso
                  administrativo haya sido
                  completado.
                </Text>
              </View>

              <View style={styles.impactList}>
                <Text style={styles.impactTitle}>
                  Al procesar esta solicitud:
                </Text>

                <View style={styles.impactItem}>
                  <View style={styles.impactBullet}>
                    <Text
                      style={
                        styles.impactBulletText
                      }
                    >
                      1
                    </Text>
                  </View>

                  <Text style={styles.impactText}>
                    La cuenta será desactivada y el
                    usuario no podrá volver a
                    iniciar sesión.
                  </Text>
                </View>

                <View style={styles.impactItem}>
                  <View style={styles.impactBullet}>
                    <Text
                      style={
                        styles.impactBulletText
                      }
                    >
                      2
                    </Text>
                  </View>

                  <Text style={styles.impactText}>
                    Los datos personales definidos
                    por el backend serán
                    anonimizados.
                  </Text>
                </View>

                <View style={styles.impactItem}>
                  <View style={styles.impactBullet}>
                    <Text
                      style={
                        styles.impactBulletText
                      }
                    >
                      3
                    </Text>
                  </View>

                  <Text style={styles.impactText}>
                    La solicitud pasará al estado
                    Procesada y no podrá volver a
                    gestionarse.
                  </Text>
                </View>
              </View>

              {request?.motivo?.trim() && (
                <View style={styles.motiveBox}>
                  <Text style={styles.motiveTitle}>
                    Motivo informado por el usuario
                  </Text>

                  <Text style={styles.motiveText}>
                    {request.motivo.trim()}
                  </Text>
                </View>
              )}

              {request
                ?.observacionAdministrador
                ?.trim() && (
                <View style={styles.observationBox}>
                  <Text
                    style={styles.observationTitle}
                  >
                    Observación administrativa
                  </Text>

                  <Text
                    style={styles.observationText}
                  >
                    {request.observacionAdministrador.trim()}
                  </Text>
                </View>
              )}

              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationLabel}>
                  Para continuar, escribe
                </Text>

                <View
                  style={
                    styles.requiredConfirmationBox
                  }
                >
                  <Text
                    style={
                      styles.requiredConfirmationText
                    }
                  >
                    {REQUIRED_CONFIRMATION}
                  </Text>
                </View>

                <TextInput
                  value={confirmation}
                  editable={!loading}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={REQUIRED_CONFIRMATION}
                  placeholderTextColor="#6F7A89"
                  selectionColor="#F97316"
                  onChangeText={(value) => {
                    setConfirmation(value);

                    if (validationError) {
                      setValidationError(null);
                    }

                    if (submitError) {
                      setSubmitError(null);
                    }
                  }}
                  onSubmitEditing={() => {
                    if (canSubmit) {
                      void handleConfirm();
                    }
                  }}
                  style={[
                    styles.confirmationInput,
                    confirmation.length > 0 &&
                      !isConfirmationValid &&
                      styles.confirmationInputError,
                    isConfirmationValid &&
                      styles.confirmationInputValid,
                    loading &&
                      styles.disabledControl,
                  ]}
                  accessibilityLabel={`Escribe ${REQUIRED_CONFIRMATION} para procesar la solicitud`}
                />

                {confirmation.length > 0 &&
                  !isConfirmationValid && (
                    <Text
                      style={
                        styles.confirmationHelperError
                      }
                    >
                      El texto todavía no coincide.
                    </Text>
                  )}

                {isConfirmationValid && (
                  <Text
                    style={
                      styles.confirmationHelperValid
                    }
                  >
                    Confirmación correcta.
                  </Text>
                )}
              </View>

              {validationError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {validationError}
                  </Text>
                </View>
              )}

              {submitError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {submitError}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                disabled={loading}
                onPress={closeModal}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed &&
                    !loading &&
                    styles.buttonPressed,
                  loading &&
                    styles.disabledControl,
                ]}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Procesar eliminación definitiva"
                accessibilityState={{
                  disabled: !canSubmit,
                  busy: loading,
                }}
                disabled={!canSubmit}
                onPress={() => {
                  void handleConfirm();
                }}
                style={({ pressed }) => [
                  styles.processButton,
                  pressed &&
                    canSubmit &&
                    styles.buttonPressed,
                  !canSubmit &&
                    styles.disabledButton,
                ]}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.processButtonText
                    }
                  >
                    Procesar definitivamente
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(5, 8, 13, 0.82)",
    justifyContent: "flex-end",
  },

  keyboardContainer: {
    width: "100%",
    maxHeight: "94%",
  },

  modalCard: {
    backgroundColor: "#121722",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderColor: "#39291F",
    borderWidth: 1,
    maxHeight: "100%",
    overflow: "hidden",
  },

  dragIndicator: {
    alignSelf: "center",
    backgroundColor: "#4B3A2E",
    borderRadius: 999,
    height: 5,
    marginTop: 10,
    width: 48,
  },

  scrollContent: {
    gap: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },

  headerTextContainer: {
    flex: 1,
    gap: 7,
  },

  title: {
    color: "#FFF7ED",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "#B8B2AA",
    fontSize: 14,
    lineHeight: 21,
  },

  closeButton: {
    alignItems: "center",
    backgroundColor: "#211B18",
    borderColor: "#42342C",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  closeButtonPressed: {
    opacity: 0.75,
  },

  closeButtonText: {
    color: "#EEE7DF",
    fontSize: 25,
    fontWeight: "400",
    lineHeight: 28,
  },

  requestSummary: {
    backgroundColor: "#0F131B",
    borderColor: "#2D3441",
    borderRadius: 17,
    borderWidth: 1,
    gap: 11,
    padding: 15,
  },

  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  summaryTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },

  approvedBadge: {
    backgroundColor: "#12361F",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  approvedBadgeText: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "900",
  },

  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  summaryLabel: {
    color: "#7D8797",
    flex: 0.8,
    fontSize: 13,
  },

  summaryValue: {
    color: "#DDE4EE",
    flex: 1.4,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },

  criticalWarning: {
    backgroundColor: "#341609",
    borderColor: "#C2410C",
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    padding: 15,
  },

  criticalWarningTitle: {
    color: "#FDBA74",
    fontSize: 14,
    fontWeight: "900",
  },

  criticalWarningText: {
    color: "#FED7AA",
    fontSize: 13,
    lineHeight: 20,
  },

  impactList: {
    backgroundColor: "#0F141D",
    borderColor: "#2B3442",
    borderRadius: 16,
    borderWidth: 1,
    gap: 13,
    padding: 15,
  },

  impactTitle: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "900",
  },

  impactItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 11,
  },

  impactBullet: {
    alignItems: "center",
    backgroundColor: "#3A1D0B",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24,
  },

  impactBulletText: {
    color: "#FDBA74",
    fontSize: 11,
    fontWeight: "900",
  },

  impactText: {
    color: "#C4CCD7",
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },

  motiveBox: {
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  motiveTitle: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "900",
  },

  motiveText: {
    color: "#B7C0CC",
    fontSize: 13,
    lineHeight: 20,
  },

  observationBox: {
    backgroundColor: "#151B26",
    borderColor: "#384355",
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  observationTitle: {
    color: "#D6DCE5",
    fontSize: 13,
    fontWeight: "900",
  },

  observationText: {
    color: "#B7C0CC",
    fontSize: 13,
    lineHeight: 20,
  },

  confirmationSection: {
    gap: 10,
  },

  confirmationLabel: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "800",
  },

  requiredConfirmationBox: {
    alignSelf: "flex-start",
    backgroundColor: "#2A1607",
    borderColor: "#9A4A0B",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  requiredConfirmationText: {
    color: "#FDBA74",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  confirmationInput: {
    backgroundColor: "#0D121B",
    borderColor: "#3A414D",
    borderRadius: 14,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  confirmationInputError: {
    borderColor: "#DC2626",
  },

  confirmationInputValid: {
    borderColor: "#16A34A",
  },

  confirmationHelperError: {
    color: "#FCA5A5",
    fontSize: 12,
  },

  confirmationHelperValid: {
    color: "#86EFAC",
    fontSize: 12,
  },

  errorBox: {
    backgroundColor: "#2B1215",
    borderColor: "#7F1D1D",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },

  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 19,
  },

  footer: {
    backgroundColor: "#10151F",
    borderTopColor: "#30271F",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingBottom:
      Platform.OS === "ios" ? 20 : 14,
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#1C2330",
    borderColor: "#343D4D",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
  },

  secondaryButtonText: {
    color: "#DCE3ED",
    fontSize: 14,
    fontWeight: "800",
  },

  processButton: {
    alignItems: "center",
    backgroundColor: "#C2410C",
    borderRadius: 14,
    flex: 1.55,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
  },

  processButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  disabledButton: {
    opacity: 0.45,
  },

  disabledControl: {
    opacity: 0.55,
  },
});

export default memo(
  ProcessAccountDeletionModal
);