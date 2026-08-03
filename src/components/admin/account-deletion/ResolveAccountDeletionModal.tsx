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

export type ResolveAccountDeletionMode =
  | "approve"
  | "reject";

interface ResolveAccountDeletionModalProps {
  visible: boolean;
  mode: ResolveAccountDeletionMode;
  request: AccountDeletionAdminResponse | null;
  loading?: boolean;

  /**
   * Se ejecuta únicamente cuando el formulario es válido.
   */
  onConfirm: (
    observacion?: string
  ) => Promise<void> | void;

  onClose: () => void;
}

const MAX_OBSERVATION_LENGTH = 500;

function getModeContent(
  mode: ResolveAccountDeletionMode
) {
  if (mode === "approve") {
    return {
      title: "Aprobar solicitud",
      subtitle:
        "Confirma que la solicitud fue revisada y puede avanzar al procesamiento definitivo.",
      confirmLabel: "Aprobar solicitud",
      observationLabel:
        "Observación administrativa",
      observationPlaceholder:
        "Agrega una observación opcional sobre la aprobación.",
      warningTitle:
        "La cuenta todavía no será eliminada",
      warningText:
        "Después de aprobar, un SuperAdmin deberá ejecutar el procesamiento definitivo.",
    };
  }

  return {
    title: "Rechazar solicitud",
    subtitle:
      "Indica por qué la solicitud no puede continuar con el proceso de eliminación.",
    confirmLabel: "Rechazar solicitud",
    observationLabel:
      "Motivo del rechazo",
    observationPlaceholder:
      "Describe el motivo del rechazo.",
    warningTitle:
      "Esta decisión cerrará la solicitud",
    warningText:
      "El usuario deberá iniciar una nueva solicitud si desea volver a pedir la eliminación de su cuenta.",
  };
}

function ResolveAccountDeletionModal({
  visible,
  mode,
  request,
  loading = false,
  onConfirm,
  onClose,
}: ResolveAccountDeletionModalProps) {
  const [observation, setObservation] =
    useState("");

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const content = useMemo(
    () => getModeContent(mode),
    [mode]
  );

  useEffect(() => {
    if (!visible) {
      setObservation("");
      setValidationError(null);
      setSubmitError(null);
    }
  }, [visible]);

  useEffect(() => {
    setValidationError(null);
    setSubmitError(null);
  }, [mode, request?.id]);

  const closeModal = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  const validate = (): boolean => {
    const trimmed = observation.trim();

    if (
      mode === "reject" &&
      trimmed.length < 5
    ) {
      setValidationError(
        "Debes indicar un motivo de rechazo de al menos 5 caracteres."
      );

      return false;
    }

    if (
      trimmed.length >
      MAX_OBSERVATION_LENGTH
    ) {
      setValidationError(
        `La observación no puede superar los ${MAX_OBSERVATION_LENGTH} caracteres.`
      );

      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleConfirm = async () => {
    if (loading || !request) {
      return;
    }

    if (!validate()) {
      return;
    }

    setSubmitError(null);

    try {
      const trimmed = observation.trim();

      await onConfirm(
        trimmed.length > 0
          ? trimmed
          : undefined
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error &&
        error.message.trim().length > 0
          ? error.message
          : "No fue posible completar la operación.";

      setSubmitError(message);
    }
  };

  const remainingCharacters =
    MAX_OBSERVATION_LENGTH -
    observation.length;

  const isRejectMode =
    mode === "reject";

  const confirmDisabled =
    loading ||
    !request ||
    observation.length >
      MAX_OBSERVATION_LENGTH;

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
              contentContainerStyle={
                styles.scrollContent
              }
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title}>
                    {content.title}
                  </Text>

                  <Text style={styles.subtitle}>
                    {content.subtitle}
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

                    <Text style={styles.summaryStatus}>
                      {request.estado}
                    </Text>
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
                      Correo
                    </Text>

                    <Text
                      style={styles.summaryValue}
                      selectable
                      numberOfLines={2}
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
                </View>
              )}

              <View
                style={[
                  styles.warningBox,
                  isRejectMode
                    ? styles.warningBoxReject
                    : styles.warningBoxApprove,
                ]}
              >
                <Text
                  style={[
                    styles.warningTitle,
                    isRejectMode
                      ? styles.warningTitleReject
                      : styles.warningTitleApprove,
                  ]}
                >
                  {content.warningTitle}
                </Text>

                <Text style={styles.warningText}>
                  {content.warningText}
                </Text>
              </View>

              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    {content.observationLabel}
                  </Text>

                  <Text
                    style={[
                      styles.characterCounter,
                      remainingCharacters < 0 &&
                        styles.characterCounterError,
                    ]}
                  >
                    {observation.length}/
                    {MAX_OBSERVATION_LENGTH}
                  </Text>
                </View>

                <TextInput
                  value={observation}
                  onChangeText={(value) => {
                    setObservation(value);

                    if (validationError) {
                      setValidationError(null);
                    }

                    if (submitError) {
                      setSubmitError(null);
                    }
                  }}
                  placeholder={
                    content.observationPlaceholder
                  }
                  placeholderTextColor="#6F7A89"
                  editable={!loading}
                  multiline
                  maxLength={
                    MAX_OBSERVATION_LENGTH + 50
                  }
                  textAlignVertical="top"
                  selectionColor="#60A5FA"
                  style={[
                    styles.textArea,
                    validationError &&
                      styles.textAreaError,
                    loading &&
                      styles.disabledControl,
                  ]}
                  accessibilityLabel={
                    content.observationLabel
                  }
                />

                {mode === "approve" && (
                  <Text style={styles.helperText}>
                    La observación es opcional.
                  </Text>
                )}

                {mode === "reject" && (
                  <Text style={styles.helperText}>
                    El motivo es obligatorio para
                    mantener una auditoría clara.
                  </Text>
                )}

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
              </View>
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
                accessibilityLabel={
                  content.confirmLabel
                }
                accessibilityState={{
                  disabled: confirmDisabled,
                  busy: loading,
                }}
                disabled={confirmDisabled}
                onPress={() => {
                  void handleConfirm();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isRejectMode
                    ? styles.rejectButton
                    : styles.approveButton,
                  pressed &&
                    !confirmDisabled &&
                    styles.buttonPressed,
                  confirmDisabled &&
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
                      styles.primaryButtonText
                    }
                  >
                    {content.confirmLabel}
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
      "rgba(5, 8, 13, 0.78)",
    justifyContent: "flex-end",
  },

  keyboardContainer: {
    width: "100%",
    maxHeight: "92%",
  },

  modalCard: {
    backgroundColor: "#121722",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderColor: "#2A3140",
    borderWidth: 1,
    maxHeight: "100%",
    overflow: "hidden",
  },

  dragIndicator: {
    alignSelf: "center",
    backgroundColor: "#3B4352",
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
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "#AAB4C3",
    fontSize: 14,
    lineHeight: 21,
  },

  closeButton: {
    alignItems: "center",
    backgroundColor: "#1C2330",
    borderColor: "#313949",
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
    color: "#D9E0EA",
    fontSize: 25,
    fontWeight: "400",
    lineHeight: 28,
  },

  requestSummary: {
    backgroundColor: "#0E131C",
    borderColor: "#293140",
    borderRadius: 17,
    borderWidth: 1,
    gap: 11,
    padding: 15,
  },

  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  summaryTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },

  summaryStatus: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
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

  warningBox: {
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },

  warningBoxApprove: {
    backgroundColor: "#10261A",
    borderColor: "#256D45",
  },

  warningBoxReject: {
    backgroundColor: "#2B1215",
    borderColor: "#7F1D1D",
  },

  warningTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  warningTitleApprove: {
    color: "#86EFAC",
  },

  warningTitleReject: {
    color: "#FCA5A5",
  },

  warningText: {
    color: "#C7D0DC",
    fontSize: 13,
    lineHeight: 20,
  },

  fieldContainer: {
    gap: 9,
  },

  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  label: {
    color: "#F1F5F9",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },

  characterCounter: {
    color: "#7D8797",
    fontSize: 12,
    fontWeight: "600",
  },

  characterCounterError: {
    color: "#F87171",
  },

  textArea: {
    backgroundColor: "#0D121B",
    borderColor: "#303848",
    borderRadius: 15,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 14,
    lineHeight: 21,
    minHeight: 130,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  textAreaError: {
    borderColor: "#DC2626",
  },

  helperText: {
    color: "#7D8797",
    fontSize: 12,
    lineHeight: 18,
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
    borderTopColor: "#272F3D",
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

  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1.35,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
  },

  approveButton: {
    backgroundColor: "#15803D",
  },

  rejectButton: {
    backgroundColor: "#B91C1C",
  },

  primaryButtonText: {
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
    opacity: 0.5,
  },

  disabledControl: {
    opacity: 0.55,
  },
});

export default memo(
  ResolveAccountDeletionModal
);