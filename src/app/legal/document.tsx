import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  aceptarDocumentoLegalApi,
  TipoDocumentoLegal,
} from "../../../src/api/legalApi";
import { LEGAL_TEXTS } from "../../../src/legal/legalDocuments";

type LegalDocumentMode = "accept" | "readOnly";

export default function LegalDocumentScreen() {
  const params = useLocalSearchParams<{
    tipoDocumento?: string;
    titulo?: string;
    version?: string;
    mode?: string;
  }>();

  const [accepting, setAccepting] = useState(false);

  const tipoDocumento = params.tipoDocumento as
    | TipoDocumentoLegal
    | undefined;

  const mode: LegalDocumentMode =
    params.mode === "readOnly" ? "readOnly" : "accept";

  const isReadOnly = mode === "readOnly";

  const documentData = useMemo(() => {
    if (!tipoDocumento) {
      return null;
    }

    const text = LEGAL_TEXTS[tipoDocumento];

    if (!text) {
      return null;
    }

    return {
      tipoDocumento,
      titulo:
        typeof params.titulo === "string" && params.titulo.trim()
          ? params.titulo.trim()
          : getDefaultTitle(tipoDocumento),
      version:
        typeof params.version === "string" && params.version.trim()
          ? params.version.trim()
          : null,
      text,
    };
  }, [tipoDocumento, params.titulo, params.version]);

  async function aceptar() {
    if (!documentData || isReadOnly || accepting) {
      return;
    }

    try {
      setAccepting(true);

      await aceptarDocumentoLegalApi({
        tipoDocumento: documentData.tipoDocumento,
      });

      Alert.alert(
        "Documento aceptado",
        "La aceptación fue registrada correctamente.",
        [
          {
            text: "Continuar",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        "No se pudo registrar la aceptación",
        getApiErrorMessage(
          e,
          "Ocurrió un error al aceptar el documento."
        )
      );
    } finally {
      setAccepting(false);
    }
  }

  function volver() {
    if (accepting) {
      return;
    }

    router.back();
  }

  if (!documentData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Documento no disponible
            </Text>

            <Text style={styles.errorText}>
              No se pudo identificar el documento legal solicitado.
            </Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={volver}
            >
              <Text style={styles.secondaryButtonText}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{documentData.titulo}</Text>

          {documentData.version ? (
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                Versión {documentData.version}
              </Text>
            </View>
          ) : null}

          <Text style={styles.modeText}>
            {isReadOnly
              ? "Documento disponible para consulta."
              : "Leé el documento completo antes de aceptar."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.text}>{documentData.text}</Text>
        </View>

        {!isReadOnly ? (
          <View style={styles.acceptanceCard}>
            <Text style={styles.acceptanceTitle}>
              Declaración de aceptación
            </Text>

            <Text style={styles.acceptanceText}>
              Al seleccionar “He leído y acepto”, confirmás que
              leíste este documento y aceptás su versión vigente.
            </Text>
          </View>
        ) : null}

        {isReadOnly ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={volver}
          >
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[
                styles.acceptButton,
                accepting && styles.disabledButton,
              ]}
              onPress={aceptar}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptButtonText}>
                  He leído y acepto
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={volver}
              disabled={accepting}
            >
              <Text style={styles.cancelButtonText}>
                Volver sin aceptar
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getDefaultTitle(
  tipoDocumento: TipoDocumentoLegal
): string {
  switch (tipoDocumento) {
    case "Privacidad":
      return "Política de Privacidad";

    case "Terminos":
      return "Términos y Condiciones";

    case "CondicionesCompra":
      return "Condiciones de Compra";

    case "Reembolsos":
      return "Política de Reembolsos y Reprogramaciones";

    case "ReglamentoEventos":
      return "Reglamento General de Eventos";

    default:
      return "Documento legal";
  }
}

function getApiErrorMessage(
  error: any,
  fallback: string
): string {
  const data = error?.response?.data;

  if (!data) {
    return error?.message ?? fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.title === "string") {
    return data.title;
  }

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors)
      .flat()
      .filter(
        (value): value is string =>
          typeof value === "string"
      );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    padding: 18,
    paddingTop: 28,
    paddingBottom: 42,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  versionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(229,9,20,0.16)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.32)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  versionText: {
    color: "#E50914",
    fontSize: 12,
    fontWeight: "900",
  },
  modeText: {
    color: "#BDBDBD",
    marginTop: 10,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  text: {
    color: "#D0D0D0",
    lineHeight: 23,
    fontSize: 15,
  },
  acceptanceCard: {
    backgroundColor: "rgba(255,209,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.26)",
    borderRadius: 20,
    padding: 15,
    marginTop: 16,
  },
  acceptanceTitle: {
    color: "#FFD166",
    fontWeight: "900",
    fontSize: 17,
  },
  acceptanceText: {
    color: "#D0D0D0",
    lineHeight: 20,
    marginTop: 7,
  },
  acceptButton: {
    minHeight: 52,
    backgroundColor: "#E50914",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 18,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 52,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 18,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  cancelButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  errorCard: {
    backgroundColor: "rgba(255,77,87,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.30)",
    borderRadius: 22,
    padding: 18,
  },
  errorTitle: {
    color: "#FF4D57",
    fontSize: 21,
    fontWeight: "900",
  },
  errorText: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 21,
  },
});