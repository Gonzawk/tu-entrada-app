import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getSolicitudesCumpleaniosAdminApi,
  resolverSolicitudCumpleaniosAdminApi,
} from "../../../api/benefitsApi";
import { getTiposEntradaPorEventoAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { BirthdayRequest } from "../../../types/benefits";

const PAGE_SIZE = 10;

type EstadoFiltro = "Pendiente" | "Aprobada" | "Rechazada" | "Todas";

export default function AdminBirthdayRequestsScreen() {
  const [items, setItems] = useState<BirthdayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tiposEntradaPorEvento, setTiposEntradaPorEvento] = useState<
    Record<number, any[]>
  >({});

  const [expandedBySolicitud, setExpandedBySolicitud] = useState<
    Record<number, boolean>
  >({});

  const [selectedTipoBySolicitud, setSelectedTipoBySolicitud] = useState<
    Record<number, number>
  >({});

  const [observacionBySolicitud, setObservacionBySolicitud] = useState<
    Record<number, string>
  >({});

  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Pendiente");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load(false);
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (estadoFiltro !== "Todas") {
      result = result.filter((x) => x.estado === estadoFiltro);
    }

    const q = search.trim().toLowerCase();

    if (q) {
      result = result.filter((x) => {
        const nombre = x.usuario?.nombreCompleto?.toLowerCase() ?? "";
        const email = x.usuario?.email?.toLowerCase() ?? "";
        const evento = x.evento?.nombre?.toLowerCase() ?? "";
        const dni = x.dni?.toLowerCase?.() ?? String(x.dni ?? "").toLowerCase();

        return (
          nombre.includes(q) ||
          email.includes(q) ||
          evento.includes(q) ||
          dni.includes(q)
        );
      });
    }

    return result;
  }, [items, estadoFiltro, search]);

  const pendientesCount = items.filter((x) => x.estado === "Pendiente").length;
  const aprobadasCount = items.filter((x) => x.estado === "Aprobada").length;
  const rechazadasCount = items.filter((x) => x.estado === "Rechazada").length;

  async function load(isRefreshing = false) {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      const solicitudes = await getSolicitudesCumpleaniosAdminApi({
        page: 1,
        pageSize: PAGE_SIZE,
      });

      setItems(solicitudes.items ?? []);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo cargar.")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function cargarTipos(eventoId: number) {
    if (tiposEntradaPorEvento[eventoId]) return;

    try {
      const tipos = await getTiposEntradaPorEventoAdminApi(eventoId);

      setTiposEntradaPorEvento((prev) => ({
        ...prev,
        [eventoId]: tipos,
      }));
    } catch {
      Alert.alert("Error", "No se pudieron cargar tipos de entrada.");
    }
  }

  function toggleDetalle(solicitud: BirthdayRequest) {
    setExpandedBySolicitud((prev) => ({
      ...prev,
      [solicitud.id]: !prev[solicitud.id],
    }));

    if (!tiposEntradaPorEvento[solicitud.evento.id]) {
      cargarTipos(solicitud.evento.id);
    }
  }

  async function aprobar(solicitud: BirthdayRequest) {
    const tipoEntradaId = selectedTipoBySolicitud[solicitud.id];

    if (!tipoEntradaId) {
      Alert.alert("Falta tipo", "Seleccioná un tipo de entrada.");
      return;
    }

    Alert.alert(
      "Aprobar beneficio",
      `Se generará un QR multiingreso para ${solicitud.cantidadInvitados} personas. ¿Confirmás la aprobación?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            try {
              await resolverSolicitudCumpleaniosAdminApi(solicitud.id, {
                aprobar: true,
                tipoEntradaId,
                tandaEntradaId: null,
                observacionBeneficio:
                  observacionBySolicitud[solicitud.id] ||
                  `Beneficio cumpleaños para ${solicitud.cantidadInvitados} personas.`,
              });

              Alert.alert("Correcto", "Solicitud aprobada.");
              await load(true);
            } catch (e: any) {
              Alert.alert(
                "Error",
                String(e?.response?.data?.message ?? "No se pudo aprobar.")
              );
            }
          },
        },
      ]
    );
  }

  async function rechazar(solicitud: BirthdayRequest) {
    Alert.alert(
      "Rechazar solicitud",
      "¿Seguro que querés rechazar esta solicitud?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            try {
              await resolverSolicitudCumpleaniosAdminApi(solicitud.id, {
                aprobar: false,
                motivoRechazo: "Solicitud rechazada por administración.",
              });

              Alert.alert("Correcto", "Solicitud rechazada.");
              await load(true);
            } catch (e: any) {
              Alert.alert(
                "Error",
                String(e?.response?.data?.message ?? "No se pudo rechazar.")
              );
            }
          },
        },
      ]
    );
  }

  function renderItem({ item }: { item: BirthdayRequest }) {
    const tipos = tiposEntradaPorEvento[item.evento.id] ?? [];
    const pendiente = item.estado === "Pendiente";
    const expanded = Boolean(expandedBySolicitud[item.id]);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {item.usuario?.nombreCompleto ?? "Usuario sin nombre"}
            </Text>
            <Text style={styles.muted}>{item.evento.nombre}</Text>
            <Text style={styles.muted}>
              Invitados: {item.cantidadInvitados}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              item.estado === "Pendiente" && styles.badgePending,
              item.estado === "Aprobada" && styles.badgeApproved,
              item.estado === "Rechazada" && styles.badgeRejected,
            ]}
          >
            <Text style={styles.badgeText}>{item.estado}</Text>
          </View>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => toggleDetalle(item)}
        >
          <Text style={styles.buttonText}>
            {expanded ? "Ocultar detalle" : "Ver detalle"}
          </Text>
        </Pressable>

        {expanded ? (
          <View style={styles.detailBox}>
            <Text style={styles.muted}>{item.usuario?.email}</Text>
            <Text style={styles.muted}>DNI: {item.dni}</Text>
            <Text style={styles.muted}>Evento: {item.evento.nombre}</Text>

            {(item as any).fotoDniUrl ? (
              <Image
                source={{ uri: (item as any).fotoDniUrl }}
                style={styles.dniImage}
              />
            ) : null}

            {pendiente ? (
              <>
                <Text style={styles.sectionTitle}>Tipo de entrada</Text>

                {tipos.length === 0 ? (
                  <Text style={styles.muted}>
                    No hay tipos de entrada cargados para este evento.
                  </Text>
                ) : (
                  tipos.map((tipo) => {
                    const selected =
                      selectedTipoBySolicitud[item.id] === tipo.id;

                    return (
                      <Pressable
                        key={tipo.id}
                        style={[
                          styles.option,
                          selected && styles.optionSelected,
                        ]}
                        onPress={() =>
                          setSelectedTipoBySolicitud((prev) => ({
                            ...prev,
                            [item.id]: tipo.id,
                          }))
                        }
                      >
                        <Text style={styles.optionText}>{tipo.nombre}</Text>
                      </Pressable>
                    );
                  })
                )}

                <TextInput
                  placeholder="Observación beneficio"
                  placeholderTextColor="#888"
                  value={observacionBySolicitud[item.id] ?? ""}
                  onChangeText={(value) =>
                    setObservacionBySolicitud((prev) => ({
                      ...prev,
                      [item.id]: value,
                    }))
                  }
                  style={styles.input}
                />

                <View style={styles.row}>
                  <Pressable
                    style={styles.approveButton}
                    onPress={() => aprobar(item)}
                  >
                    <Text style={styles.buttonText}>Aprobar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.rejectButton}
                    onPress={() => rechazar(item)}
                  >
                    <Text style={styles.buttonText}>Rechazar</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.closedText}>
                Esta solicitud ya fue resuelta.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Cumpleaños" scroll={false}>
        {loading ? (
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Solicitudes</Text>

              <View style={styles.summaryGrid}>
                <SummaryBox label="Pendientes" value={pendientesCount} />
                <SummaryBox label="Aprobadas" value={aprobadasCount} />
                <SummaryBox label="Rechazadas" value={rechazadasCount} />
              </View>

              <TextInput
                placeholder="Buscar por usuario, email, evento o DNI..."
                placeholderTextColor="#888"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                style={styles.searchInput}
              />

              <View style={styles.filterRow}>
                {(["Pendiente", "Aprobada", "Rechazada", "Todas"] as EstadoFiltro[]).map(
                  (estado) => (
                    <Pressable
                      key={estado}
                      style={[
                        styles.filterButton,
                        estadoFiltro === estado && styles.filterButtonActive,
                      ]}
                      onPress={() => setEstadoFiltro(estado)}
                    >
                      <Text style={styles.filterText}>{estado}</Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => load(true)}
                  tintColor="#E50914"
                  colors={["#E50914"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.card}>
                  <Text style={styles.muted}>
                    No hay solicitudes para este filtro.
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.24)",
    padding: 12,
    borderRadius: 16,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#BDBDBD",
    marginTop: 4,
    fontSize: 12,
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  filterButtonActive: {
    backgroundColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderColor: "#E50914",
  },
  filterText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  muted: { color: "#BDBDBD", marginTop: 5 },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgePending: {
    backgroundColor: "rgba(255,209,102,0.18)",
  },
  badgeApproved: {
    backgroundColor: "rgba(32,214,123,0.18)",
  },
  badgeRejected: {
    backgroundColor: "rgba(229,9,20,0.18)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  detailBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    padding: 12,
    borderRadius: 18,
    marginTop: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 4,
  },
  status: { color: "#FFD166", marginTop: 8, fontWeight: "900" },
  dniImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 10,
  },
  option: {
    backgroundColor: "rgba(255,255,255,0.10)",
    padding: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  optionSelected: {
    backgroundColor: "rgba(229,9,20,0.32)",
    borderWidth: 1,
    borderColor: "#E50914",
  },
  optionText: { color: "#FFFFFF", fontWeight: "900" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#20D67B",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#E50914",
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  closedText: {
    color: "#BDBDBD",
    marginTop: 14,
    fontWeight: "800",
  },
});