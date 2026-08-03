import { useAuth } from "@/auth/AuthContext";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getMiPerfilRRPPApi,
  getMisEventosRRPPPaginadosApi,
} from "../../api/rrppApi";
import { getToken } from "../../auth/authStorage";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { connectRealtime } from "../../services/realtimeService";
import {
  RRPPEventoResumen,
  RRPPPerfil,
} from "../../types/rrpp";
import { formatMoney } from "../../utils/formatMoney";

export default function RRPPDashboardScreen() {
  const { user, activeRole } = useAuth();

  const [perfil, setPerfil] = useState<RRPPPerfil | null>(null);
  const [eventos, setEventos] = useState<RRPPEventoResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [perfilData, eventosData] = await Promise.all([
        getMiPerfilRRPPApi(),
        getMisEventosRRPPPaginadosApi({
          page: 1,
          pageSize: 5,
          search: "",
        }),
      ]);

      setPerfil(perfilData);
      setEventos(eventosData.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function setupRealtime() {
      if (!user?.userId || activeRole !== "RRPP") return;

      const token = await getToken();
      if (!token) return;

      await connectRealtime(user.userId, token, {
        onNuevaOrdenRRPP: () => load(false),
        onOrdenConfirmada: () => load(false),
      });
    }

    setupRealtime().catch((error) => {
      console.error("Realtime RRPP dashboard:", error);
    });
  }, [user?.userId, activeRole, load]);

  const totalPendiente = useMemo(
    () => eventos.reduce((acc, x) => acc + (x.totalPendiente ?? 0), 0),
    [eventos]
  );

  const totalConfirmado = useMemo(
    () => eventos.reduce((acc, x) => acc + (x.totalConfirmado ?? 0), 0),
    [eventos]
  );

  const ticketsGenerados = useMemo(
    () => eventos.reduce((acc, x) => acc + (x.ticketsGenerados ?? 0), 0),
    [eventos]
  );

  const ordenesPendientes = useMemo(
    () => eventos.reduce((acc, x) => acc + (x.ordenesPendientes ?? 0), 0),
    [eventos]
  );

  const ordenesConfirmadas = useMemo(
    () => eventos.reduce((acc, x) => acc + (x.ordenesConfirmadas ?? 0), 0),
    [eventos]
  );

  return (
    <RoleGuard allowedRoles={["RRPP"]}>
      <AppLayout title="Panel RRPP">
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.profileCard}>
              {perfil?.avatarUrl ? (
                <Image source={{ uri: perfil.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {perfil?.nombrePublico?.charAt(0).toUpperCase() ?? "R"}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{perfil?.nombrePublico}</Text>
                <Text style={styles.profileEmail}>{perfil?.email}</Text>
                {perfil?.instagram ? (
                  <Text style={styles.profileMeta}>{perfil.instagram}</Text>
                ) : null}
                <Text style={perfil?.activo ? styles.active : styles.inactive}>
                  {perfil?.activo ? "RRPP activo" : "RRPP inactivo"}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.label}>Pendientes</Text><Text style={styles.big}>{ordenesPendientes}</Text></View>
              <View style={styles.statCard}><Text style={styles.label}>A rendir</Text><Text style={styles.big}>{formatMoney(totalConfirmado)}</Text></View>
              <View style={styles.statCard}><Text style={styles.label}>Confirmadas</Text><Text style={styles.big}>{ordenesConfirmadas}</Text></View>
              <View style={styles.statCard}><Text style={styles.label}>Tickets</Text><Text style={styles.big}>{ticketsGenerados}</Text></View>
            </View>

            <Pressable style={styles.primaryButton} onPress={() => router.push("/rrpp/events" as never)}>
              <Text style={styles.primaryText}>Eventos asignados</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.push("/rrpp/pending-orders" as never)}>
              <Text style={styles.primaryText}>Órdenes pendientes - {formatMoney(totalPendiente)}</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.push("/rrpp/history" as never)}>
              <Text style={styles.primaryText}>Historial confirmado - {formatMoney(totalConfirmado)}</Text>
            </Pressable>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  profileCard:{flexDirection:"row",gap:14,alignItems:"center",backgroundColor:"rgba(255,255,255,0.07)",padding:16,borderRadius:24,borderWidth:1,borderColor:"rgba(255,255,255,0.10)",marginBottom:16},
  avatar:{width:72,height:72,borderRadius:24,backgroundColor:"#1A1A1A"},
  avatarFallback:{width:72,height:72,borderRadius:24,backgroundColor:"#E50914",alignItems:"center",justifyContent:"center"},
  avatarText:{color:"#FFFFFF",fontSize:28,fontWeight:"900"},
  profileName:{color:"#FFFFFF",fontSize:22,fontWeight:"900"},
  profileEmail:{color:"#BDBDBD",marginTop:4},
  profileMeta:{color:"#FFFFFF",marginTop:6,fontWeight:"700"},
  active:{color:"#20D67B",marginTop:8,fontWeight:"900"},
  inactive:{color:"#FF4D57",marginTop:8,fontWeight:"900"},
  statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:12},
  statCard:{width:"48%",backgroundColor:"rgba(255,255,255,0.07)",padding:16,borderRadius:22,borderWidth:1,borderColor:"rgba(255,255,255,0.10)"},
  label:{color:"#BDBDBD",fontWeight:"700"},
  big:{color:"#FFFFFF",fontSize:24,fontWeight:"900",marginTop:8},
  primaryButton:{backgroundColor:"#E50914",padding:15,borderRadius:18,alignItems:"center",marginTop:18},
  secondaryButton:{backgroundColor:"rgba(255,255,255,0.12)",padding:15,borderRadius:18,alignItems:"center",marginTop:12},
  primaryText:{color:"#FFFFFF",fontWeight:"900"},
});