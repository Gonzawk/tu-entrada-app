import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getRRPPsEventoAdminApi } from "../../../api/adminApi";
import {
  getEventoDetalleAdminApi,
  getTiposEntradaPorEventoAdminApi,
} from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { TipoEntradaAdmin } from "../../../types/events";
import { formatMoney } from "../../../utils/formatMoney";

interface EventoAdminDetalle {
  id: number;
  nombre: string;
  descripcion?: string | null;
  lugar?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  bannerUrl?: string | null;
  imagenPrincipalUrl?: string | null;
  estado: string | number;
}

interface RrppEventoResumen {
  rrppUsuarioId: number;
  activo: boolean;
}

interface EstadisticasEvento {
  tiposEntrada: number;
  tandas: number;
  tandasActivas: number;
  cuposTotales: number;
  cuposVendidos: number;
  cuposReservados: number;
  cuposDisponibles: number;
  rrppsAsignados: number;
  rrppsActivos: number;
  precioDesde: number | null;
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

function formatFechaEvento(value?: string | null) {
  if (!value) {
    return "Fecha no definida";
  }

  /*
   * Las fechas de los eventos representan horario local argentino
   * almacenado directamente en la base de datos.
   *
   * No utilizamos new Date() porque podría interpretar el valor como UTC
   * y desplazarlo tres horas al convertirlo a Argentina.
   *
   * Formatos admitidos:
   * - 2026-08-01T06:00:00
   * - 2026-08-01T06:00:00.0000000
   * - 2026-08-01 06:00:00
   * - 2026-08-01 06:00:00.0000000
   */
  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/,
  );

  if (!match) {
    return value;
  }

  const [, year, month, day, hour, minute] = match;

  return `${day}/${month}/${year}, ${hour}:${minute}`;
}

function getEstadoVisual(estado: string | number) {
  const normalizado = String(estado).trim().toLowerCase();

  if (normalizado === "1" || normalizado === "publicado") {
    return {
      texto: "Publicado",
      containerStyle: styles.statusPublished,
      textStyle: styles.statusPublishedText,
    };
  }

  if (normalizado === "2" || normalizado === "oculto") {
    return {
      texto: "Oculto",
      containerStyle: styles.statusHidden,
      textStyle: styles.statusHiddenText,
    };
  }

  if (normalizado === "3" || normalizado === "finalizado") {
    return {
      texto: "Finalizado",
      containerStyle: styles.statusFinished,
      textStyle: styles.statusFinishedText,
    };
  }

  if (normalizado === "4" || normalizado === "cancelado") {
    return {
      texto: "Cancelado",
      containerStyle: styles.statusCancelled,
      textStyle: styles.statusCancelledText,
    };
  }

  return {
    texto: "Borrador",
    containerStyle: styles.statusDraft,
    textStyle: styles.statusDraftText,
  };
}

export default function AdminEventDetailScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();

  const id = Number(eventoId);

  const [evento, setEvento] = useState<EventoAdminDetalle | null>(null);
  const [tiposEntrada, setTiposEntrada] = useState<TipoEntradaAdmin[]>([]);
  const [rrppsEvento, setRrppsEvento] = useState<RrppEventoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const estadisticas = useMemo<EstadisticasEvento>(() => {
    const tandas = tiposEntrada.flatMap((tipo) => tipo.tandas ?? []);

    const precios = tandas
      .map((tanda) => Number(tanda.precio))
      .filter((precio) => Number.isFinite(precio) && precio >= 0);

    return {
      tiposEntrada: tiposEntrada.length,
      tandas: tandas.length,
      tandasActivas: tandas.filter((tanda) => Boolean(tanda.activa)).length,
      cuposTotales: tandas.reduce(
        (total, tanda) => total + Number(tanda.cantidadTotal ?? 0),
        0,
      ),
      cuposVendidos: tandas.reduce(
        (total, tanda) => total + Number(tanda.cantidadVendida ?? 0),
        0,
      ),
      cuposReservados: tandas.reduce(
        (total, tanda) => total + Number(tanda.cantidadReservada ?? 0),
        0,
      ),
      cuposDisponibles: tandas.reduce(
        (total, tanda) => total + Math.max(Number(tanda.disponibles ?? 0), 0),
        0,
      ),
      rrppsAsignados: rrppsEvento.length,
      rrppsActivos: rrppsEvento.filter((rrpp) => rrpp.activo).length,
      precioDesde: precios.length > 0 ? Math.min(...precios) : null,
    };
  }, [tiposEntrada, rrppsEvento]);

  const cargarDatos = useCallback(
    async (modoActualizacion = false) => {
      if (!Number.isInteger(id) || id <= 0) {
        setEvento(null);
        setTiposEntrada([]);
        setRrppsEvento([]);
        setLoading(false);

        Alert.alert("Evento inválido", "No se pudo identificar el evento.");
        return;
      }

      try {
        if (modoActualizacion) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const resultados = await Promise.allSettled([
          getEventoDetalleAdminApi(id),
          getTiposEntradaPorEventoAdminApi(id),
          getRRPPsEventoAdminApi({
            eventoId: id,
            page: 1,
            pageSize: 100,
            search: "",
          }),
        ]);

        const eventoResultado = resultados[0];
        const tiposResultado = resultados[1];
        const rrppsResultado = resultados[2];

        if (eventoResultado.status === "rejected") {
          throw eventoResultado.reason;
        }

        setEvento(eventoResultado.value as EventoAdminDetalle);

        if (tiposResultado.status === "fulfilled") {
          setTiposEntrada(tiposResultado.value ?? []);
        } else {
          console.log(
            "No se pudo cargar el resumen de tipos de entrada:",
            tiposResultado.reason,
          );
          setTiposEntrada([]);
        }

        if (rrppsResultado.status === "fulfilled") {
          setRrppsEvento(rrppsResultado.value?.items ?? []);
        } else {
          console.log(
            "No se pudo cargar el resumen de RRPP:",
            rrppsResultado.reason,
          );
          setRrppsEvento([]);
        }
      } catch (error: any) {
        console.log("ERROR PANEL DE EVENTO:", {
          status: error?.response?.status,
          data: error?.response?.data,
          message: error?.message,
          url: error?.config?.url,
          method: error?.config?.method,
        });

        setEvento(null);

        Alert.alert(
          "No se pudo cargar el evento",
          getApiErrorMessage(
            error,
            "Ocurrió un error al obtener la información del evento.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos]),
  );

  function navegar(pathname: string) {
    router.push({
      pathname,
      params: {
        eventoId: String(id),
      },
    } as never);
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Gestionar evento">
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#E50914" size="large" />
            <Text style={styles.loaderText}>Cargando evento...</Text>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!evento) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Gestionar evento">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Evento no disponible</Text>
            <Text style={styles.emptyText}>
              No fue posible encontrar o cargar este evento.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => void cargarDatos()}
            >
              <Text style={styles.buttonText}>Reintentar</Text>
            </Pressable>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  const estadoVisual = getEstadoVisual(evento.estado);

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Gestionar evento">
        <View style={styles.eventCard}>
          {evento.bannerUrl ? (
            <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerPlaceholderText}>Sin banner</Text>
            </View>
          )}

          <View style={styles.eventContent}>
            <View style={styles.titleRow}>
              <View style={styles.titleContent}>
                <Text style={styles.title}>{evento.nombre}</Text>

                {evento.lugar ? (
                  <Text style={styles.place}>{evento.lugar}</Text>
                ) : null}
              </View>

              <View style={[styles.statusBadge, estadoVisual.containerStyle]}>
                <Text style={[styles.statusText, estadoVisual.textStyle]}>
                  {estadoVisual.texto}
                </Text>
              </View>
            </View>

            <Text style={styles.dateLabel}>Inicio del evento</Text>
            <Text style={styles.dateValue}>
              {formatFechaEvento(evento.fechaInicio)}
            </Text>

            {evento.fechaFin ? (
              <>
                <Text style={styles.dateLabel}>Finalización</Text>
                <Text style={styles.dateValue}>
                  {formatFechaEvento(evento.fechaFin)}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumen operativo</Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Tipos"
            value={String(estadisticas.tiposEntrada)}
            detail={`${estadisticas.tandas} tandas`}
          />

          <MetricCard
            label="Disponibles"
            value={String(estadisticas.cuposDisponibles)}
            detail={`${estadisticas.cuposReservados} reservados`}
          />

          <MetricCard
            label="Vendidos"
            value={String(estadisticas.cuposVendidos)}
            detail={`${estadisticas.cuposTotales} cupos totales`}
          />

          <MetricCard
            label="RRPP activos"
            value={String(estadisticas.rrppsActivos)}
            detail={`${estadisticas.rrppsAsignados} asignados`}
          />
        </View>

        {estadisticas.precioDesde !== null ? (
          <View style={styles.priceSummary}>
            <Text style={styles.priceSummaryLabel}>Entradas desde</Text>
            <Text style={styles.priceSummaryValue}>
              {formatMoney(estadisticas.precioDesde)}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Administración</Text>

        <ManagementCard
          title="Tipos de entrada y tandas"
          description="Crear, editar y organizar entradas, combos, precios, stock y períodos de venta."
          badge={`${estadisticas.tiposEntrada} tipos · ${estadisticas.tandas} tandas`}
          onPress={() => navegar("/admin/events/event-ticket-types")}
        />

        <ManagementCard
          title="Bebidas"
          description="Administrar el catálogo de bebidas disponible para este evento."
          onPress={() => navegar("/admin/events/event-drinks")}
        />

        <ManagementCard
          title="Límites de compra"
          description="Configurar restricciones generales de venta por orden y por usuario."
          onPress={() => navegar("/admin/events/event-purchase-limits")}
        />

        <ManagementCard
          title="RRPP del evento"
          description="Asignar, buscar, habilitar o deshabilitar RRPP vinculados al evento."
          badge={`${estadisticas.rrppsActivos} activos`}
          onPress={() => navegar("/admin/events/event-rrpps")}
        />

        <ManagementCard
          title="Imágenes del evento"
          description="Actualizar el banner y la imagen principal."
          onPress={() => navegar("/admin/events/event-images")}
        />

        <ManagementCard
          title="Estado y programación"
          description="Publicar, ocultar, finalizar, cancelar o reprogramar el evento."
          badge={estadoVisual.texto}
          onPress={() => navegar("/admin/events/event-settings")}
        />

        <Pressable
          style={[
            styles.refreshButton,
            refreshing && styles.disabledButton,
          ]}
          disabled={refreshing}
          onPress={() => void cargarDatos(true)}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Actualizar resumen</Text>
          )}
        </Pressable>
      </AppLayout>
    </RoleGuard>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function ManagementCard({
  title,
  description,
  badge,
  onPress,
}: {
  title: string;
  description: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.managementCard,
        pressed && styles.managementCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.managementContent}>
        <View style={styles.managementTitleRow}>
          <Text style={styles.managementTitle}>{title}</Text>

          {badge ? (
            <View style={styles.managementBadge}>
              <Text style={styles.managementBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.managementDescription}>{description}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
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
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 22,
    marginTop: 24,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    color: "#BDBDBD",
    marginTop: 8,
    lineHeight: 20,
  },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    overflow: "hidden",
  },
  banner: {
    width: "100%",
    height: 180,
    backgroundColor: "#171717",
  },
  bannerPlaceholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
  },
  bannerPlaceholderText: {
    color: "#737373",
    fontWeight: "800",
  },
  eventContent: {
    padding: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  place: {
    color: "#E50914",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 5,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusPublished: {
    backgroundColor: "rgba(32,214,123,0.13)",
    borderColor: "rgba(32,214,123,0.35)",
  },
  statusPublishedText: {
    color: "#20D67B",
  },
  statusHidden: {
    backgroundColor: "rgba(255,209,102,0.13)",
    borderColor: "rgba(255,209,102,0.35)",
  },
  statusHiddenText: {
    color: "#FFD166",
  },
  statusFinished: {
    backgroundColor: "rgba(138,138,138,0.15)",
    borderColor: "rgba(180,180,180,0.30)",
  },
  statusFinishedText: {
    color: "#CFCFCF",
  },
  statusCancelled: {
    backgroundColor: "rgba(255,77,87,0.13)",
    borderColor: "rgba(255,77,87,0.35)",
  },
  statusCancelledText: {
    color: "#FF4D57",
  },
  statusDraft: {
    backgroundColor: "rgba(108,99,255,0.13)",
    borderColor: "rgba(108,99,255,0.35)",
  },
  statusDraftText: {
    color: "#A9A4FF",
  },
  dateLabel: {
    color: "#777777",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 16,
  },
  dateValue: {
    color: "#D9D9D9",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 26,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: {
    color: "#AFAFAF",
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 7,
  },
  metricDetail: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },
  priceSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(229,9,20,0.10)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
  },
  priceSummaryLabel: {
    color: "#D2D2D2",
    fontWeight: "800",
  },
  priceSummaryValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  managementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 11,
  },
  managementCardPressed: {
    opacity: 0.72,
  },
  managementContent: {
    flex: 1,
  },
  managementTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  managementTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  managementDescription: {
    color: "#AFAFAF",
    lineHeight: 19,
    marginTop: 6,
  },
  managementBadge: {
    backgroundColor: "rgba(229,9,20,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  managementBadgeText: {
    color: "#FF737A",
    fontSize: 10,
    fontWeight: "900",
  },
  chevron: {
    color: "#E50914",
    fontSize: 34,
    fontWeight: "400",
    marginLeft: 12,
    marginTop: -2,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  refreshButton: {
    backgroundColor: "#272727",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 10,
    marginBottom: 34,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});