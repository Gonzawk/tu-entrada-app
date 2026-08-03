import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    asignarRRPPAEventoAdminApi,
    cambiarEstadoRRPPEventoAdminApi,
    getRRPPAdminPaginadoApi,
    getRRPPsEventoAdminApi,
} from "../../../api/adminApi";
import { getEventoDetalleAdminApi } from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

type EventoResumen = {
  id: number;
  nombre: string;
  lugar?: string | null;
  fechaInicio: string;
  bannerUrl?: string | null;
  estado: string | number;
};

type RRPPAsignado = {
  rrppUsuarioId: number;
  rrppNombre: string;
  rrppEmail: string;
  activo: boolean;
};

type RRPPDisponible = {
  usuarioId: number;
  nombrePublico: string;
  email: string;
  activo?: boolean;
  fotoPerfilUrl?: string | null;
};

type FiltroAsignados = "todos" | "activos" | "inactivos";

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

function formatFechaArgentina(value?: string | null) {
  if (!value) {
    return "Fecha no definida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEventRrppsScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const id = Number(eventoId);

  const [evento, setEvento] = useState<EventoResumen | null>(null);
  const [rrppsEvento, setRrppsEvento] = useState<RRPPAsignado[]>([]);
  const [rrppsGlobales, setRrppsGlobales] = useState<RRPPDisponible[]>([]);

  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const [searchAsignados, setSearchAsignados] = useState("");
  const [searchDisponibles, setSearchDisponibles] = useState("");
  const [filtroAsignados, setFiltroAsignados] =
    useState<FiltroAsignados>("todos");

  const [asignandoId, setAsignandoId] = useState<number | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(
    null,
  );

  const [pageDisponibles, setPageDisponibles] = useState(1);
  const [hasMoreDisponibles, setHasMoreDisponibles] = useState(false);
  const pageSize = 20;

  const cargarDatos = useCallback(
    async (modoActualizacion = false) => {
      if (!Number.isInteger(id) || id <= 0) {
        setLoading(false);
        Alert.alert("Evento inválido", "No se pudo identificar el evento.");
        return;
      }

      try {
        if (modoActualizacion) {
          setActualizando(true);
        } else {
          setLoading(true);
        }

        const resultados = await Promise.allSettled([
          getEventoDetalleAdminApi(id),
          getRRPPsEventoAdminApi({
            eventoId: id,
            page: 1,
            pageSize: 100,
            search: "",
          }),
          getRRPPAdminPaginadoApi({
            page: 1,
            pageSize,
            search: "",
          }),
        ]);

        const eventoResultado = resultados[0];
        const asignadosResultado = resultados[1];
        const disponiblesResultado = resultados[2];

        if (eventoResultado.status === "rejected") {
          throw eventoResultado.reason;
        }

        if (asignadosResultado.status === "rejected") {
          throw asignadosResultado.reason;
        }

        setEvento(eventoResultado.value as EventoResumen);
        setRrppsEvento(asignadosResultado.value?.items ?? []);

        if (disponiblesResultado.status === "fulfilled") {
          setRrppsGlobales(disponiblesResultado.value?.items ?? []);
          setHasMoreDisponibles(
  Boolean(
    disponiblesResultado.value?.hasNextPage ??
      (disponiblesResultado.value?.items?.length ?? 0) >= pageSize,
  ),
);
          setPageDisponibles(1);
        } else {
          console.log(
            "No se pudieron cargar RRPP disponibles:",
            disponiblesResultado.reason,
          );
          setRrppsGlobales([]);
          setHasMoreDisponibles(false);
        }
      } catch (error: any) {
        console.log("ERROR RRPP EVENTO:", {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
          url: error?.config?.url,
          method: error?.config?.method,
        });

        Alert.alert(
          "No se pudo cargar",
          getApiErrorMessage(
            error,
            "No fue posible obtener los RRPP del evento.",
          ),
        );
      } finally {
        setLoading(false);
        setActualizando(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos]),
  );

  const rrppIdsAsignados = useMemo(
    () => new Set(rrppsEvento.map((rrpp) => rrpp.rrppUsuarioId)),
    [rrppsEvento],
  );

  const rrppsDisponibles = useMemo(
    () =>
      rrppsGlobales.filter(
        (rrpp) => !rrppIdsAsignados.has(rrpp.usuarioId),
      ),
    [rrppsGlobales, rrppIdsAsignados],
  );

  const rrppsAsignadosFiltrados = useMemo(() => {
    const term = searchAsignados.trim().toLowerCase();

    return rrppsEvento.filter((rrpp) => {
      const coincideTexto =
        !term ||
        rrpp.rrppNombre?.toLowerCase().includes(term) ||
        rrpp.rrppEmail?.toLowerCase().includes(term) ||
        String(rrpp.rrppUsuarioId).includes(term);

      if (!coincideTexto) {
        return false;
      }

      if (filtroAsignados === "activos") {
        return rrpp.activo;
      }

      if (filtroAsignados === "inactivos") {
        return !rrpp.activo;
      }

      return true;
    });
  }, [rrppsEvento, searchAsignados, filtroAsignados]);

  const resumen = useMemo(
    () => ({
      asignados: rrppsEvento.length,
      activos: rrppsEvento.filter((rrpp) => rrpp.activo).length,
      inactivos: rrppsEvento.filter((rrpp) => !rrpp.activo).length,
      disponibles: rrppsDisponibles.length,
    }),
    [rrppsEvento, rrppsDisponibles],
  );

  async function buscarRRPPDisponibles() {
    try {
      setBuscando(true);

      const resultado = await getRRPPAdminPaginadoApi({
        page: 1,
        pageSize,
        search: searchDisponibles.trim(),
      });

      setRrppsGlobales(resultado.items ?? []);
      setPageDisponibles(1);
      setHasMoreDisponibles(
        Boolean(
          resultado?.hasNextPage ??
(resultado?.items?.length ?? 0) >= pageSize
        ),
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo buscar",
        getApiErrorMessage(error, "No se pudieron buscar RRPP."),
      );
    } finally {
      setBuscando(false);
    }
  }

  async function cargarMasDisponibles() {
    if (!hasMoreDisponibles || buscando) {
      return;
    }

    try {
      setBuscando(true);

      const nextPage = pageDisponibles + 1;

      const resultado = await getRRPPAdminPaginadoApi({
        page: nextPage,
        pageSize,
        search: searchDisponibles.trim(),
      });

      const nuevos = resultado.items ?? [];

      setRrppsGlobales((current) => {
        const idsExistentes = new Set(current.map((item) => item.usuarioId));

        return [
          ...current,
          ...nuevos.filter((item: RRPPDisponible) => !idsExistentes.has(item.usuarioId)),
        ];
      });

      setPageDisponibles(nextPage);
      setHasMoreDisponibles(
        Boolean(
          resultado?.hasNextPage ??
(resultado?.items?.length ?? 0) >= pageSize
        ),
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo cargar más",
        getApiErrorMessage(error, "No se pudieron cargar más RRPP."),
      );
    } finally {
      setBuscando(false);
    }
  }

  async function asignarRRPP(rrppUsuarioId: number) {
    if (asignandoId !== null) {
      return;
    }

    try {
      setAsignandoId(rrppUsuarioId);

      await asignarRRPPAEventoAdminApi(id, rrppUsuarioId);

      const rrpp = rrppsGlobales.find(
        (item) => item.usuarioId === rrppUsuarioId,
      );

      if (rrpp) {
        setRrppsEvento((current) => [
          ...current,
          {
            rrppUsuarioId: rrpp.usuarioId,
            rrppNombre: rrpp.nombrePublico,
            rrppEmail: rrpp.email,
            activo: true,
          },
        ]);

        setRrppsGlobales((current) =>
          current.filter((item) => item.usuarioId !== rrppUsuarioId),
        );
      } else {
        const actualizados = await getRRPPsEventoAdminApi({
          eventoId: id,
          page: 1,
          pageSize: 100,
          search: "",
        });

        setRrppsEvento(actualizados.items ?? []);
      }

      Alert.alert("RRPP asignado", "El RRPP fue asignado correctamente.");
    } catch (error: any) {
      Alert.alert(
        "No se pudo asignar",
        getApiErrorMessage(error, "No se pudo asignar el RRPP."),
      );
    } finally {
      setAsignandoId(null);
    }
  }

  async function cambiarEstadoRRPP(rrppUsuarioId: number, activo: boolean) {
    if (cambiandoEstadoId !== null) {
      return;
    }

    try {
      setCambiandoEstadoId(rrppUsuarioId);

      await cambiarEstadoRRPPEventoAdminApi(id, rrppUsuarioId, activo);

      setRrppsEvento((current) =>
        current.map((rrpp) =>
          rrpp.rrppUsuarioId === rrppUsuarioId
            ? {
                ...rrpp,
                activo,
              }
            : rrpp,
        ),
      );

      Alert.alert(
        "Estado actualizado",
        activo
          ? "El RRPP fue habilitado para este evento."
          : "El RRPP fue deshabilitado para este evento.",
      );
    } catch (error: any) {
      Alert.alert(
        "No se pudo actualizar",
        getApiErrorMessage(error, "No se pudo cambiar el estado del RRPP."),
      );
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  function confirmarCambioEstado(rrpp: RRPPAsignado) {
    const nuevoEstado = !rrpp.activo;

    Alert.alert(
      nuevoEstado ? "Habilitar RRPP" : "Deshabilitar RRPP",
      nuevoEstado
        ? `¿Querés habilitar a ${rrpp.rrppNombre} para este evento?`
        : `¿Querés deshabilitar a ${rrpp.rrppNombre} para este evento?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: nuevoEstado ? "Habilitar" : "Deshabilitar",
          style: nuevoEstado ? "default" : "destructive",
          onPress: () =>
            void cambiarEstadoRRPP(rrpp.rrppUsuarioId, nuevoEstado),
        },
      ],
    );
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="RRPP del evento">
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#E50914" size="large" />
            <Text style={styles.loaderText}>Cargando RRPP...</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="RRPP del evento">
        {evento ? (
          <View style={styles.eventCard}>
            {evento.bannerUrl ? (
              <Image
                source={{ uri: evento.bannerUrl }}
                style={styles.banner}
              />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Text style={styles.bannerPlaceholderText}>Sin banner</Text>
              </View>
            )}

            <View style={styles.eventContent}>
              <Text style={styles.title}>{evento.nombre}</Text>

              {evento.lugar ? (
                <Text style={styles.muted}>{evento.lugar}</Text>
              ) : null}

              <Text style={styles.date}>
                {formatFechaArgentina(evento.fechaInicio)}
              </Text>

              <Text style={styles.status}>Estado: {evento.estado}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <SummaryCard label="Asignados" value={resumen.asignados} />
          <SummaryCard label="Activos" value={resumen.activos} />
          <SummaryCard label="Inactivos" value={resumen.inactivos} />
          <SummaryCard label="Disponibles" value={resumen.disponibles} />
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>RRPP asignados</Text>
            <Text style={styles.sectionSubtitle}>
              Administrá quiénes pueden vender para este evento.
            </Text>
          </View>

          <Pressable
            style={[
              styles.refreshButton,
              actualizando && styles.disabledButton,
            ]}
            onPress={() => void cargarDatos(true)}
            disabled={actualizando}
          >
            {actualizando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.refreshButtonText}>Actualizar</Text>
            )}
          </Pressable>
        </View>

        <TextInput
          value={searchAsignados}
          onChangeText={setSearchAsignados}
          placeholder="Buscar asignados por nombre, email o ID..."
          placeholderTextColor="#777777"
          autoCapitalize="none"
          style={styles.searchInput}
        />

        <View style={styles.filtersRow}>
          <FilterChip
            label="Todos"
            active={filtroAsignados === "todos"}
            onPress={() => setFiltroAsignados("todos")}
          />

          <FilterChip
            label="Activos"
            active={filtroAsignados === "activos"}
            onPress={() => setFiltroAsignados("activos")}
          />

          <FilterChip
            label="Inactivos"
            active={filtroAsignados === "inactivos"}
            onPress={() => setFiltroAsignados("inactivos")}
          />
        </View>

        {rrppsAsignadosFiltrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin RRPP asignados</Text>
            <Text style={styles.emptyText}>
              No hay RRPP que coincidan con los filtros seleccionados.
            </Text>
          </View>
        ) : (
          rrppsAsignadosFiltrados.map((rrpp) => (
            <View key={rrpp.rrppUsuarioId} style={styles.rrppCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {rrpp.rrppNombre?.trim()?.charAt(0)?.toUpperCase() || "R"}
                </Text>
              </View>

              <View style={styles.rrppInfo}>
                <Text style={styles.rrppName}>{rrpp.rrppNombre}</Text>
                <Text style={styles.rrppEmail}>{rrpp.rrppEmail}</Text>
                <Text style={styles.rrppId}>
                  Usuario #{rrpp.rrppUsuarioId}
                </Text>
              </View>

              <View style={styles.rrppActions}>
                <View
                  style={[
                    styles.statusBadge,
                    rrpp.activo
                      ? styles.activeBadge
                      : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      rrpp.activo
                        ? styles.activeBadgeText
                        : styles.inactiveBadgeText,
                    ]}
                  >
                    {rrpp.activo ? "ACTIVO" : "INACTIVO"}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.stateButton,
                    rrpp.activo
                      ? styles.disableButton
                      : styles.enableButton,
                    cambiandoEstadoId === rrpp.rrppUsuarioId &&
                      styles.disabledButton,
                  ]}
                  onPress={() => confirmarCambioEstado(rrpp)}
                  disabled={cambiandoEstadoId !== null}
                >
                  {cambiandoEstadoId === rrpp.rrppUsuarioId ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {rrpp.activo ? "Deshabilitar" : "Habilitar"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>Asignar nuevo RRPP</Text>
            <Text style={styles.sectionSubtitle}>
              Buscá RRPP registrados y agregalos al evento.
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={searchDisponibles}
            onChangeText={setSearchDisponibles}
            placeholder="Buscar RRPP por nombre, email o ID..."
            placeholderTextColor="#777777"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void buscarRRPPDisponibles()}
            style={styles.availableSearchInput}
          />

          <Pressable
            style={[
              styles.searchButton,
              buscando && styles.disabledButton,
            ]}
            onPress={() => void buscarRRPPDisponibles()}
            disabled={buscando}
          >
            {buscando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Buscar</Text>
            )}
          </Pressable>
        </View>

        {rrppsDisponibles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin RRPP disponibles</Text>
            <Text style={styles.emptyText}>
              No hay resultados para asignar o todos los RRPP encontrados ya
              pertenecen al evento.
            </Text>
          </View>
        ) : (
          rrppsDisponibles.map((rrpp) => (
            <View key={rrpp.usuarioId} style={styles.availableCard}>
              {rrpp.fotoPerfilUrl ? (
                <Image
                  source={{ uri: rrpp.fotoPerfilUrl }}
                  style={styles.availableAvatarImage}
                />
              ) : (
                <View style={styles.availableAvatar}>
                  <Text style={styles.availableAvatarText}>
                    {rrpp.nombrePublico?.trim()?.charAt(0)?.toUpperCase() ||
                      "R"}
                  </Text>
                </View>
              )}

              <View style={styles.availableInfo}>
                <Text style={styles.rrppName}>{rrpp.nombrePublico}</Text>
                <Text style={styles.rrppEmail}>{rrpp.email}</Text>
                <Text style={styles.rrppId}>Usuario #{rrpp.usuarioId}</Text>
              </View>

              <Pressable
                style={[
                  styles.assignButton,
                  asignandoId === rrpp.usuarioId && styles.disabledButton,
                ]}
                onPress={() => void asignarRRPP(rrpp.usuarioId)}
                disabled={asignandoId !== null}
              >
                {asignandoId === rrpp.usuarioId ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Asignar</Text>
                )}
              </Pressable>
            </View>
          ))
        )}

        {hasMoreDisponibles ? (
          <Pressable
            style={[
              styles.loadMoreButton,
              buscando && styles.disabledButton,
            ]}
            onPress={() => void cargarMasDisponibles()}
            disabled={buscando}
          >
            {buscando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Cargar más RRPP</Text>
            )}
          </Pressable>
        ) : null}

        <View style={styles.bottomSpace} />
      </AppLayout>
    </RoleGuard>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    gap: 14,
  },
  loaderText: {
    color: "#BDBDBD",
    fontWeight: "700",
  },
  flex: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  banner: {
    width: "100%",
    height: 135,
    backgroundColor: "#171717",
  },
  bannerPlaceholder: {
    width: "100%",
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  },
  bannerPlaceholderText: {
    color: "#737373",
    fontWeight: "800",
  },
  eventContent: {
    padding: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  muted: {
    color: "#AFAFAF",
    marginTop: 4,
  },
  date: {
    color: "#D2D2D2",
    fontWeight: "700",
    marginTop: 7,
  },
  status: {
    color: "#E50914",
    fontWeight: "900",
    marginTop: 7,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 4,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  refreshButton: {
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    paddingHorizontal: 14,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 13,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: "rgba(229,9,20,0.18)",
    borderColor: "rgba(229,9,20,0.45)",
  },
  filterChipText: {
    color: "#9B9B9B",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 18,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#999999",
    lineHeight: 19,
    marginTop: 6,
  },
  rrppCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginBottom: 9,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(229,9,20,0.18)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  rrppInfo: {
    flex: 1,
  },
  rrppName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  rrppEmail: {
    color: "#AFAFAF",
    fontSize: 12,
    marginTop: 3,
  },
  rrppId: {
    color: "#727272",
    fontSize: 10,
    marginTop: 3,
  },
  rrppActions: {
    alignItems: "flex-end",
    gap: 7,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadge: {
    backgroundColor: "rgba(32,214,123,0.10)",
    borderColor: "rgba(32,214,123,0.30)",
  },
  inactiveBadge: {
    backgroundColor: "rgba(255,77,87,0.10)",
    borderColor: "rgba(255,77,87,0.30)",
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  activeBadgeText: {
    color: "#20D67B",
  },
  inactiveBadgeText: {
    color: "#FF737A",
  },
  stateButton: {
    minHeight: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  enableButton: {
    backgroundColor: "rgba(32,214,123,0.16)",
    borderWidth: 1,
    borderColor: "rgba(32,214,123,0.34)",
  },
  disableButton: {
    backgroundColor: "rgba(255,77,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.34)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 25,
  },
  searchBox: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 13,
  },
  availableSearchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    paddingHorizontal: 14,
  },
  searchButton: {
    minWidth: 88,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  availableCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginBottom: 9,
  },
  availableAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  availableAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#171717",
  },
  availableAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  availableInfo: {
    flex: 1,
  },
  assignButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  loadMoreButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  bottomSpace: {
    height: 34,
  },
});