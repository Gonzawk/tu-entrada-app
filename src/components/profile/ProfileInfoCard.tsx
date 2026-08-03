import { StyleSheet, Text, View } from "react-native";

interface ProfileInfoCardProps {
  nombreCompleto: string;
  email: string;
  telefono?: string | null;
  fechaCreacion: string;
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

export function ProfileInfoCard({
  nombreCompleto,
  email,
  telefono,
  fechaCreacion,
}: ProfileInfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Información personal</Text>

      <Row
        label="Nombre completo"
        value={nombreCompleto}
      />

      <Row
        label="Correo electrónico"
        value={email}
      />

      <Row
        label="Teléfono"
        value={telefono || "No registrado"}
      />

      <Row
        label="Contraseña"
        value="••••••••••••"
      />

      <Row
        label="Miembro desde"
        value={formatDate(fechaCreacion)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: "#111111",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 18,
  },

  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },

  label: {
    color: "#9E9E9E",
    fontSize: 13,
    marginBottom: 5,
    fontWeight: "700",
  },

  value: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});