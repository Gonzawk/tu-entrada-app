import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { escanearOrdenBebidaBarraApi } from "../../api/drinksApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";

export default function BarraScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [acceptedWarning, setAcceptedWarning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const lastScannedCodeRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setLoading(false);
      lastScannedCodeRef.current = null;
    }, [])
  );

  async function handleScanned(data: string) {
    if (!acceptedWarning || scanned || loading) return;

    const codigoQR = data?.trim();
    if (!codigoQR) return;

    if (lastScannedCodeRef.current === codigoQR) return;

    lastScannedCodeRef.current = codigoQR;
    setScanned(true);
    setLoading(true);

    try {
      const orden = await escanearOrdenBebidaBarraApi(codigoQR);

      router.push({
        pathname: "/barra/order-detail",
        params: {
          ordenId: String(orden.id),
          codigoQR,
        },
      } as never);
    } catch (e: any) {
      lastScannedCodeRef.current = null;

      Alert.alert(
        "QR inválido",
        String(
          e?.response?.data?.message ??
            e?.response?.data ??
            "No se pudo leer la orden."
        ),
        [
          {
            text: "Reintentar",
            onPress: () => setScanned(false),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  if (!permission) {
    return (
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Escanear QR">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!permission.granted) {
    return (
      <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
        <AppLayout title="Escanear QR">
          <View style={styles.permissionCard}>
            <Text style={styles.title}>Permiso de cámara requerido</Text>
            <Text style={styles.text}>
              Necesitamos la cámara para escanear QR de bebidas y beneficios.
            </Text>

            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryText}>Permitir cámara</Text>
            </Pressable>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
      <AppLayout title="Escanear QR">
        {!acceptedWarning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Aviso importante</Text>

            <Text style={styles.text}>
              Escaneá el QR solo cuando realmente vayas a entregar la bebida o
              beneficio.
            </Text>

            <Text style={styles.warningText}>
              Si escaneás el QR y luego volvés atrás sin marcarlo como
              entregado, el sistema registrará una alerta para el administrador.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => setAcceptedWarning(true)}
            >
              <Text style={styles.primaryText}>Entiendo, comenzar escaneo</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryText}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Control de barra</Text>
              <Text style={styles.text}>
                Escaneá el QR de bebida o beneficio. Luego deberás confirmar la
                entrega desde el detalle.
              </Text>
            </View>

            <View style={styles.scannerCard}>
              {!scanned ? (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={({ data }) => handleScanned(data)}
                />
              ) : (
                <View style={styles.pausedBox}>
                  <ActivityIndicator color="#E50914" />
                  <Text style={styles.loadingText}>Validando QR...</Text>
                </View>
              )}

              <View style={styles.scanBox} />

              {loading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loadingText}>Validando QR...</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryText}>Volver</Text>
            </Pressable>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  permissionCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  warningCard: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.30)",
    padding: 18,
    borderRadius: 24,
  },
  warningTitle: {
    color: "#FFD166",
    fontSize: 22,
    fontWeight: "900",
  },
  warningText: {
    color: "#FFD166",
    marginTop: 10,
    lineHeight: 21,
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.25)",
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
  },
  infoTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  text: {
    color: "#BDBDBD",
    marginTop: 8,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 18,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  scannerCard: {
    height: 420,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  pausedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  scanBox: {
    position: "absolute",
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: "#E50914",
    borderRadius: 28,
    alignSelf: "center",
    top: 90,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 10,
    fontWeight: "900",
  },
});