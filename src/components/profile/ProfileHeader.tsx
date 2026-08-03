import { Image, StyleSheet, Text, View } from "react-native";

interface ProfileHeaderProps {
  nombreCompleto: string;
  email: string;
  fotoUrl?: string | null;
  roles: string[];
  emailVerificado: boolean;
}

function getInitials(nombreCompleto: string): string {
  const parts = nombreCompleto
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRolesLabel(roles: string[]): string {
  if (roles.length === 0) {
    return "Usuario";
  }

  return roles.join(" · ");
}

export function ProfileHeader({
  nombreCompleto,
  email,
  fotoUrl,
  roles,
  emailVerificado,
}: ProfileHeaderProps) {
  const initials = getInitials(nombreCompleto);
  const rolesLabel = getRolesLabel(roles);

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        {fotoUrl ? (
          <Image
            source={{ uri: fotoUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}

        {emailVerificado ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✓</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {nombreCompleto || "Usuario"}
      </Text>

      <Text style={styles.role} numberOfLines={1}>
        {rolesLabel}
      </Text>

      <View style={styles.emailRow}>
        <Text style={styles.email} numberOfLines={1}>
          {email}
        </Text>

        {emailVerificado ? (
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedPillText}>Verificado</Text>
          </View>
        ) : (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Sin verificar</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#1C1C1C",
    borderWidth: 3,
    borderColor: "#FFD166",
  },

  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,209,102,0.14)",
    borderWidth: 3,
    borderColor: "#FFD166",
  },

  avatarInitials: {
    color: "#FFD166",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1,
  },

  verifiedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#111111",
  },

  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  role: {
    marginTop: 7,
    color: "#FFD166",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  emailRow: {
    marginTop: 12,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  email: {
    maxWidth: "72%",
    color: "#BDBDBD",
    fontSize: 14,
    fontWeight: "600",
  },

  verifiedPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.14)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.30)",
  },

  verifiedPillText: {
    color: "#6EE7A2",
    fontSize: 11,
    fontWeight: "900",
  },

  pendingPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,77,87,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.26)",
  },

  pendingPillText: {
    color: "#FF7A82",
    fontSize: 11,
    fontWeight: "900",
  },
});