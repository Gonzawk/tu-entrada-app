import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";

export default function BarraDashboardScreen() {
  return (
    <RoleGuard allowedRoles={["Barra", "Admin", "SuperAdmin"]}>
      <AppLayout title="Barra">
        <View style={styles.card}>
          <Text style={styles.title}>Módulo de barra</Text>
          <Text style={styles.text}>
            Escaneá el QR del cliente, verificá los productos y marcá la orden
            como entregada.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/barra/scanner" as never)}
          >
            <Text style={styles.primaryText}>Escanear QR</Text>
          </Pressable>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Importante</Text>
          <Text style={styles.text}>
            No entregues bebidas si la orden aparece pendiente, rechazada o ya
            entregada.
          </Text>
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 18,
    borderRadius: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
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
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  warningCard: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.25)",
    padding: 16,
    borderRadius: 22,
    marginTop: 16,
  },
  warningTitle: {
    color: "#FFD166",
    fontSize: 18,
    fontWeight: "900",
  },
});