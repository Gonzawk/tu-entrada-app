import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    getEventoProximoPuertaApi,
    getMiPerfilPuertaApi,
} from "../../api/doorApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { DoorNextEvent, DoorProfile } from "../../types/door";
import { formatDate } from "../../utils/formatDate";

export default function DoorDashboardScreen() {
  const [profile, setProfile] = useState<DoorProfile | null>(null);
  const [event, setEvent] = useState<DoorNextEvent | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [profileData, eventData] = await Promise.all([
        getMiPerfilPuertaApi(),
        getEventoProximoPuertaApi(),
      ]);

      setProfile(profileData);
      setEvent(eventData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RoleGuard allowedRoles={["Puerta"]}>
      <AppLayout title="Puerta">
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.nombreCompleto?.charAt(0).toUpperCase() ?? "P"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{profile?.nombreCompleto}</Text>
                <Text style={styles.profileEmail}>{profile?.email}</Text>

                {profile?.telefono ? (
                  <Text style={styles.profileMeta}>{profile.telefono}</Text>
                ) : null}

                <Text style={profile?.activo ? styles.active : styles.inactive}>
                  {profile?.activo ? "Usuario activo" : "Usuario inactivo"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Evento disponible</Text>

            {event ? (
              <View style={styles.eventCard}>
                {event.bannerUrl ? (
                  <Image source={{ uri: event.bannerUrl }} style={styles.banner} />
                ) : null}

                <Text style={styles.eventTitle}>{event.nombre}</Text>
                <Text style={styles.muted}>{event.lugar}</Text>

                {event.direccion ? (
                  <Text style={styles.muted}>{event.direccion}</Text>
                ) : null}

                <Text style={styles.muted}>
                  Inicio: {formatDate(event.fechaInicio)}
                </Text>

                {event.fechaFin ? (
                  <Text style={styles.muted}>
                    Fin: {formatDate(event.fechaFin)}
                  </Text>
                ) : null}

                <Text style={event.enCurso ? styles.inProgress : styles.nextEvent}>
                  {event.enCurso ? "Evento en curso" : "Próximo evento"}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No hay eventos próximos o en curso disponibles.
                </Text>
              </View>
            )}

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/door/scanner" as never)}
            >
              <Text style={styles.primaryText}>Comenzar a escanear</Text>
            </Pressable>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  profileEmail: {
    color: "#BDBDBD",
    marginTop: 4,
  },
  profileMeta: {
    color: "#FFFFFF",
    marginTop: 6,
    fontWeight: "700",
  },
  active: {
    color: "#20D67B",
    marginTop: 8,
    fontWeight: "900",
  },
  inactive: {
    color: "#FF4D57",
    marginTop: 8,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  banner: {
    height: 150,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    marginBottom: 14,
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 5,
  },
  inProgress: {
    color: "#20D67B",
    marginTop: 12,
    fontWeight: "900",
  },
  nextEvent: {
    color: "#FFD166",
    marginTop: 12,
    fontWeight: "900",
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 20,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
  },
  emptyText: {
    color: "#BDBDBD",
  },
});