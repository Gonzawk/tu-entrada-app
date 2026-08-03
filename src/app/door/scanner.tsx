import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { escanearTicketPuertaApi } from "../../api/doorApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { DoorScanResponse } from "../../types/door";
import { formatDate } from "../../utils/formatDate";
import { createIdempotencyKey } from "../../utils/idempotency";

interface PendingScan {
  codigoQR: string;
  idempotencyKey: string;
}

function getErrorMessage(error: any): string {
  const responseMessage =
    error?.response?.data?.message;

  if (
    typeof responseMessage === "string" &&
    responseMessage.trim()
  ) {
    return responseMessage;
  }

  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "No se pudo validar el QR.";
}

function isUncertainRequestError(
  error: any
): boolean {
  /*
   * Sin respuesta HTTP puede haberse perdido
   * la conexión antes o después del commit.
   */
  if (!error?.response) {
    return true;
  }

  const status =
    error.response.status;

  /*
   * 409 puede indicar que la misma operación
   * todavía está procesándose.
   */
  if (status === 409) {
    return true;
  }

  /*
   * Timeout, rate limit y errores del servidor
   * se reintentan con la misma clave.
   */
  return (
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

export default function DoorScannerScreen() {
  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [scanningEnabled, setScanningEnabled] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [lastResult, setLastResult] =
    useState<DoorScanResponse | null>(
      null
    );

  /*
   * Conserva el QR y la misma IdempotencyKey
   * cuando el resultado de la solicitud es incierto.
   */
  const pendingScanRef =
    useRef<PendingScan | null>(null);

  async function executeScan(
    pendingScan: PendingScan
  ) {
    setScanningEnabled(false);
    setLoading(true);

    try {
      const result =
        await escanearTicketPuertaApi({
          codigoQR:
            pendingScan.codigoQR,

          idempotencyKey:
            pendingScan.idempotencyKey,
        });

      /*
       * El backend respondió de forma definitiva.
       * La operación pendiente puede eliminarse.
       */
      pendingScanRef.current = null;

      setLastResult(result);
    } catch (error: any) {
      const message =
        getErrorMessage(error);

      if (
        isUncertainRequestError(error)
      ) {
        /*
         * No borramos pendingScanRef.
         * El reintento utiliza la misma clave.
         */
        Alert.alert(
          "Resultado pendiente",
          `${message}\n\nNo vuelvas a escanear el QR. Podés reintentar la misma operación de forma segura.`,
          [
            {
              text: "Cancelar intento",
              style: "cancel",
              onPress: () => {
                pendingScanRef.current =
                  null;

                setLastResult(null);
                setScanningEnabled(true);
              },
            },
            {
              text: "Reintentar",
              onPress: () => {
                void retryPendingScan();
              },
            },
          ],
          {
            cancelable: false,
          }
        );

        return;
      }

      /*
       * Una respuesta HTTP 400, 401, 403 o 404
       * es definitiva. El 401 además será tratado
       * por apiClient y AuthContext.
       */
      pendingScanRef.current = null;

      Alert.alert(
        "Error",
        message
      );

      setScanningEnabled(true);
    } finally {
      setLoading(false);
    }
  }

  async function retryPendingScan() {
    const pendingScan =
      pendingScanRef.current;

    if (!pendingScan || loading) {
      return;
    }

    await executeScan(pendingScan);
  }

  async function handleBarcodeScanned({
    data,
  }: {
    data: string;
  }) {
    if (
      !scanningEnabled ||
      loading ||
      pendingScanRef.current
    ) {
      return;
    }

    const codigoQR =
      data?.trim();

    if (!codigoQR) {
      return;
    }

    const pendingScan: PendingScan = {
      codigoQR,

      idempotencyKey:
        createIdempotencyKey(
          "scanner-puerta"
        ),
    };

    pendingScanRef.current =
      pendingScan;

    await executeScan(pendingScan);
  }

  function resetScanner() {
    pendingScanRef.current = null;

    setLastResult(null);
    setScanningEnabled(true);
  }

  if (!permission) {
    return (
      <RoleGuard
        allowedRoles={["Puerta"]}
      >
        <AppLayout title="Scanner">
          <ActivityIndicator
            color="#E50914"
            style={{
              marginTop: 40,
            }}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!permission.granted) {
    return (
      <RoleGuard
        allowedRoles={["Puerta"]}
      >
        <AppLayout title="Scanner">
          <View style={styles.card}>
            <Text style={styles.title}>
              Permiso de cámara requerido
            </Text>

            <Text style={styles.muted}>
              Para escanear entradas
              necesitás habilitar la cámara.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={
                requestPermission
              }
            >
              <Text
                style={styles.primaryText}
              >
                Permitir cámara
              </Text>
            </Pressable>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      allowedRoles={["Puerta"]}
    >
      <AppLayout title="Scanner">
        <View style={styles.infoCard}>
          <Text
            style={styles.infoTitle}
          >
            Control de ingreso
          </Text>

          <Text
            style={styles.infoText}
          >
            Escaneá el QR de la entrada.
            Si es válida, el sistema
            registrará el ingreso
            automáticamente.
          </Text>
        </View>

        <View style={styles.cameraBox}>
          {scanningEnabled ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={
                handleBarcodeScanned
              }
            />
          ) : (
            <View
              style={
                styles.cameraPaused
              }
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#E50914"
                  />

                  <Text
                    style={
                      styles.pausedText
                    }
                  >
                    Validando entrada...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.pausedText
                  }
                >
                  Escaneo pausado
                </Text>
              )}
            </View>
          )}
        </View>

        {lastResult ? (
          <View
            style={[
              styles.resultCard,

              lastResult.success
                ? styles.successCard
                : styles.errorCard,
            ]}
          >
            <Text
              style={styles.resultTitle}
            >
              {lastResult.success
                ? "Ingreso válido"
                : "Ingreso rechazado"}
            </Text>

            <Text
              style={
                styles.resultMessage
              }
            >
              {lastResult.message}
            </Text>

            <Text
              style={
                styles.resultState
              }
            >
              Resultado:{" "}
              {lastResult.resultado}
            </Text>

            {lastResult.datosControl ? (
              <View
                style={
                  styles.controlBox
                }
              >
                <Text
                  style={
                    styles.controlTitle
                  }
                >
                  Control horario
                </Text>

                <Text
                  style={
                    styles.controlText
                  }
                >
                  Hora actual:{" "}
                  {
                    lastResult
                      .datosControl
                      .horaActualArgentina
                  }
                </Text>

                <Text
                  style={
                    styles.controlText
                  }
                >
                  Inicio evento:{" "}
                  {
                    lastResult
                      .datosControl
                      .eventoInicioArgentina
                  }
                </Text>

                <Text
                  style={
                    styles.controlText
                  }
                >
                  Fin evento:{" "}
                  {
                    lastResult
                      .datosControl
                      .eventoFinArgentina
                  }
                </Text>

                <Text
                  style={
                    styles.accessText
                  }
                >
                  {
                    lastResult
                      .datosControl
                      .horarioIngresoTexto
                  }
                </Text>
              </View>
            ) : null}

            {lastResult.ticket ? (
              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Ticket
                </Text>

                <Text
                  style={styles.white}
                >
                  #
                  {
                    lastResult.ticket
                      .numeroTicket
                  }
                </Text>

                <Text
                  style={
                    styles.mutedLight
                  }
                >
                  Estado:{" "}
                  {
                    lastResult.ticket
                      .estado
                  }
                </Text>

                {lastResult.ticket
                  .fechaUso ? (
                  <Text
                    style={
                      styles.mutedLight
                    }
                  >
                    Uso:{" "}
                    {formatDate(
                      lastResult.ticket
                        .fechaUso
                    )}
                  </Text>
                ) : null}

                {lastResult.ticket
                  .esMultiIngreso ? (
                  <View
                    style={
                      styles.multiBox
                    }
                  >
                    <Text
                      style={
                        styles.multiTitle
                      }
                    >
                      QR multiingreso
                    </Text>

                    <Text
                      style={
                        styles.mutedLight
                      }
                    >
                      Permitidos:{" "}
                      {lastResult.ticket
                        .cantidadUsosPermitidos ??
                        0}
                    </Text>

                    <Text
                      style={
                        styles.mutedLight
                      }
                    >
                      Usados:{" "}
                      {lastResult.ticket
                        .cantidadUsosRealizados ??
                        0}
                    </Text>

                    <Text
                      style={
                        styles.multiRemaining
                      }
                    >
                      Restantes:{" "}
                      {lastResult.ticket
                        .usosRestantes ??
                        0}
                    </Text>

                    {lastResult.ticket
                      .observacionBeneficio ? (
                      <Text
                        style={
                          styles.mutedLight
                        }
                      >
                        {
                          lastResult
                            .ticket
                            .observacionBeneficio
                        }
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {lastResult.usuario ? (
              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Usuario
                </Text>

                <Text
                  style={styles.white}
                >
                  {lastResult.usuario
                    .nombre ??
                    "Sin nombre"}
                </Text>
              </View>
            ) : null}

            {lastResult.evento ? (
              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Evento
                </Text>

                <Text
                  style={styles.white}
                >
                  {
                    lastResult.evento
                      .nombre
                  }
                </Text>

                <Text
                  style={
                    styles.mutedLight
                  }
                >
                  {
                    lastResult.evento
                      .lugar
                  }
                </Text>

                <Text
                  style={
                    styles.mutedLight
                  }
                >
                  {formatDate(
                    lastResult.evento
                      .fechaInicio
                  )}
                </Text>
              </View>
            ) : null}

            {lastResult.entrada ? (
              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Entrada
                </Text>

                <Text
                  style={styles.white}
                >
                  {
                    lastResult.entrada
                      .nombre
                  }
                </Text>

                {lastResult.entrada
                  .esCombo ? (
                  <Text
                    style={
                      styles.mutedLight
                    }
                  >
                    Combo para{" "}
                    {
                      lastResult
                        .entrada
                        .cantidadPersonas
                    }{" "}
                    personas
                  </Text>
                ) : null}

                {lastResult.entrada
                  .descripcion ? (
                  <Text
                    style={
                      styles.mutedLight
                    }
                  >
                    {
                      lastResult
                        .entrada
                        .descripcion
                    }
                  </Text>
                ) : null}

                {lastResult.entrada
                  .incluyeBebidas ? (
                  <Text
                    style={
                      styles.benefitAvailable
                    }
                  >
                    Incluye
                    bebida/beneficio. El
                    retiro se valida con el
                    QR de bebida asignado al
                    usuario.
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.mutedLight
                    }
                  >
                    No incluye beneficios.
                  </Text>
                )}
              </View>
            ) : null}

            {lastResult.emailPendiente ||
            lastResult.nombrePendiente ? (
              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Pendiente de asignación
                </Text>

                <Text
                  style={
                    styles.mutedLight
                  }
                >
                  Nombre:{" "}
                  {lastResult.nombrePendiente ??
                    "Sin nombre"}
                </Text>

                <Text
                  style={
                    styles.mutedLight
                  }
                >
                  Email:{" "}
                  {lastResult.emailPendiente ??
                    "Sin email"}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={
                styles.primaryButton
              }
              onPress={resetScanner}
            >
              <Text
                style={
                  styles.primaryText
                }
              >
                Escanear otra entrada
              </Text>
            </Pressable>
          </View>
        ) : null}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor:
      "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(229,9,20,0.25)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  infoText: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 20,
  },
  cameraBox: {
    height: 340,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginBottom: 18,
  },
  camera: {
    flex: 1,
  },
  cameraPaused: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pausedText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontWeight: "800",
  },
  card: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 8,
  },
  resultCard: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 18,
  },
  successCard: {
    backgroundColor:
      "rgba(32,214,123,0.12)",
    borderColor:
      "rgba(32,214,123,0.30)",
  },
  errorCard: {
    backgroundColor:
      "rgba(255,77,87,0.12)",
    borderColor:
      "rgba(255,77,87,0.30)",
  },
  resultTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  resultMessage: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
  },
  resultState: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  controlBox: {
    backgroundColor:
      "rgba(255,209,102,0.13)",
    borderWidth: 1,
    borderColor:
      "rgba(255,209,102,0.32)",
    padding: 14,
    borderRadius: 18,
    marginTop: 14,
  },
  controlTitle: {
    color: "#FFD166",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  controlText: {
    color: "#FFFFFF",
    marginTop: 4,
    fontWeight: "800",
  },
  accessText: {
    color: "#FFD166",
    marginTop: 8,
    fontWeight: "900",
    lineHeight: 20,
  },
  section: {
    backgroundColor:
      "rgba(0,0,0,0.22)",
    padding: 14,
    borderRadius: 18,
    marginTop: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  white: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  mutedLight: {
    color: "#D0D0D0",
    marginTop: 4,
  },
  benefitAvailable: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
    lineHeight: 20,
  },
  multiBox: {
    backgroundColor:
      "rgba(255,209,102,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(255,209,102,0.25)",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  multiTitle: {
    color: "#FFD166",
    fontWeight: "900",
    marginBottom: 4,
  },
  multiRemaining: {
    color: "#20D67B",
    fontWeight: "900",
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});