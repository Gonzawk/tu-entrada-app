import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState } from "react";
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
  DocumentoLegalEstado,
  getEstadoLegalApi,
} from "../../../src/api/legalApi";
import { getHomeByRole } from "../../../src/auth/roleRedirect";
import { UserRole } from "../../../src/types/auth";

export default function LegalAcceptanceScreen() {
  const { returnRole } = useLocalSearchParams<{
    returnRole?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoLegalEstado[]>([]);
  const [completo, setCompleto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const estado = await getEstadoLegalApi();

      setDocumentos(estado.documentos ?? []);
      setCompleto(Boolean(estado.completo));
    } catch (e: any) {
      const message = getApiErrorMessage(
        e,
        "No se pudo consultar el estado de los documentos legales."
      );

      setError(message);
      setDocumentos([]);
      setCompleto(false);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [])
  );

function abrirDocumento(doc: DocumentoLegalEstado) {
  router.push({
    pathname: "/legal/document",
    params: {
      tipoDocumento: doc.tipoDocumento,
      titulo: doc.titulo,
      version: doc.version,
      mode: "accept",
    },
  } as never);
}

async function continuar() {
  if (continuing) return;

  try {
    setContinuing(true);

    const estado = await getEstadoLegalApi();

    setDocumentos(estado.documentos ?? []);
    setCompleto(Boolean(estado.completo));

    if (!estado.completo) {
      Alert.alert(
        "Documentos pendientes",
        "Debés leer y aceptar todos los documentos legales vigentes antes de continuar."
      );

      return;
    }

    const role = returnRole as UserRole | undefined;

    if (!role) {
      router.replace("/role-select" as never);
      return;
    }

    router.replace(getHomeByRole(role) as never);
  } catch (e: any) {
    Alert.alert(
      "Error",
      getApiErrorMessage(
        e,
        "No se pudo completar la verificación legal."
      )
    );
  } finally {
    setContinuing(false);
  }
}
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#E50914" size="large" />
          <Text style={styles.loadingText}>
            Consultando documentos legales...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Antes de continuar</Text>

          <Text style={styles.description}>
            Para utilizar TuEntrada necesitás leer y aceptar los documentos
            legales vigentes.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No pudimos cargar los documentos</Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : documentos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No hay documentos disponibles
            </Text>

            <Text style={styles.emptyText}>
              No se encontraron documentos legales vigentes. Contactá al
              administrador.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {documentos.map((doc, index) => (
              <View key={doc.versionLegalId}>
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => abrirDocumento(doc)}
                >
                  <View
                    style={doc.aceptado ? styles.checkOn : styles.checkOff}
                  >
                    <Text style={styles.checkText}>
                      {doc.aceptado ? "✓" : ""}
                    </Text>
                  </View>

                  <View style={styles.documentContent}>
                    <Text style={styles.docTitle}>{doc.titulo}</Text>

                    <Text style={styles.docVersion}>
                      Versión {doc.version}
                    </Text>

                    <Text
                      style={
                        doc.aceptado
                          ? styles.acceptedText
                          : styles.pendingText
                      }
                    >
                      {doc.aceptado
                        ? "Leído y aceptado"
                        : "Pendiente de aceptación"}
                    </Text>
                  </View>

                  <Text style={styles.arrow}>›</Text>
                </Pressable>

                {index < documentos.length - 1 ? (
                  <View style={styles.separator} />
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {completo
              ? "Documentación completa"
              : "Documentación pendiente"}
          </Text>

          <Text style={styles.statusText}>
            {completo
              ? "Ya aceptaste todos los documentos legales vigentes."
              : "Abrí cada documento, leelo y confirmá su aceptación para continuar."}
          </Text>
        </View>

        <Pressable
          style={[
            styles.button,
            (!completo || continuing || Boolean(error)) && styles.disabled,
          ]}
          disabled={!completo || continuing || Boolean(error)}
          onPress={continuar}
        >
          {continuing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
          )}
        </Pressable>

        {!completo && !error ? (
          <Text style={styles.warning}>
            Debés aceptar todos los documentos para continuar.
          </Text>
        ) : null}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/auth/login" as never)}
          disabled={continuing}
        >
          <Text style={styles.secondaryButtonText}>
            Volver al inicio de sesión
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function getApiErrorMessage(error: any, fallback: string) {
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

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 32,
    paddingBottom: 36,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#BDBDBD",
    marginTop: 14,
    fontWeight: "700",
  },
  header: {
    marginBottom: 22,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  description: {
    color: "#BDBDBD",
    marginTop: 10,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.75,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 40,
  },
  documentContent: {
    flex: 1,
  },
  checkOn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#20D67B",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOff: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#888",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
  },
  docTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  docVersion: {
    color: "#888",
    marginTop: 3,
  },
  acceptedText: {
    color: "#20D67B",
    marginTop: 4,
    fontWeight: "800",
    fontSize: 12,
  },
  pendingText: {
    color: "#FFD166",
    marginTop: 4,
    fontWeight: "800",
    fontSize: 12,
  },
  arrow: {
    color: "#FFFFFF",
    fontSize: 28,
  },
  statusCard: {
    backgroundColor: "rgba(255,209,102,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.24)",
    borderRadius: 20,
    padding: 14,
    marginTop: 16,
  },
  statusTitle: {
    color: "#FFD166",
    fontWeight: "900",
  },
  statusText: {
    color: "#D0D0D0",
    marginTop: 6,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#E50914",
    minHeight: 52,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  warning: {
    color: "#FFD166",
    marginTop: 12,
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#BDBDBD",
    fontWeight: "800",
  },
  errorCard: {
    backgroundColor: "rgba(255,77,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.30)",
    borderRadius: 22,
    padding: 16,
  },
  errorTitle: {
    color: "#FF4D57",
    fontSize: 18,
    fontWeight: "900",
  },
  errorText: {
    color: "#D0D0D0",
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: "#BDBDBD",
    marginTop: 8,
    lineHeight: 20,
  },
});