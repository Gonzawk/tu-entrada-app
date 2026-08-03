import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";

export default function AdminDashboardScreen() {
  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Panel Admin">
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Administración</Text>
          <Text style={styles.heroText}>
            Controlá eventos, usuarios, cajas, entradas y operaciones del sistema.
          </Text>
        </View>

        <View style={styles.grid}>
          <AdminCard
            title="Eventos"
            text="Crear, editar y publicar eventos"
            icon="🎟️"
            onPress={() => router.push("/admin/events/events" as never)}
          />

          <AdminCard
            title="RRPPs"
            text="Gestionar vendedores y rendiciones"
            icon="🤝"
            onPress={() => router.push("/admin/rrpps/rrpps" as never)}
          />

          <AdminCard
            title="Puerta"
            text="Usuarios y validación de entradas"
            icon="🚪"
            onPress={() => router.push("/admin/door/door-users" as never)}
          />

          <AdminCard
            title="Ventanilla"
            text="Crear usuarios y controlar ventas"
            icon="🏦"
            onPress={() => router.push("/admin/ventanilla/ventanilla-users" as never)}
          />

          <AdminCard
            title="Barra"
            text="Bebidas, cajas y ventas presenciales"
            icon="🍸"
            onPress={() => router.push("/admin/drinks" as never)}
          />

          <AdminCard
            title="Cajas"
            text="Ver cajas abiertas y cerradas"
            icon="💵"
            onPress={() => router.push("/admin/cajas/cajas" as never)}
          />

          <AdminCard
            title="Tickets"
            text="Generar y revisar entradas"
            icon="📲"
            onPress={() => router.push("/admin/tickets/generate-tickets" as never)}
          />

          <AdminCard
            title="Beneficios"
            text="Cumpleaños y QR multiingreso"
            icon="🎁"
            onPress={() => router.push("/admin/cumpleanios/birthday-requests" as never)}
          />

          <AdminCard
            title="Estadísticas"
            text="Ventas, ingresos y métricas"
            icon="📊"
            onPress={() => router.push("/admin/estadisticas/stats" as never)}
          />
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function AdminCard({
  title,
  text,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "rgba(229,9,20,0.16)",
    borderColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  heroText: {
    color: "#D6D6D6",
    marginTop: 8,
    lineHeight: 21,
    fontWeight: "700",
  },
  grid: {
    gap: 14,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 28,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  cardText: {
    color: "#BDBDBD",
    marginTop: 4,
    lineHeight: 19,
  },
  arrow: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "300",
  },
});