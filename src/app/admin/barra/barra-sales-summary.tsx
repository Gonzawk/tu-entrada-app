import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { getResumenVentasBarraAdminApi } from "../../../api/barraApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";

/*
 * SCREEN ADMIN · RESUMEN DE VENTAS DE BARRA
 *
 * Este archivo queda preparado para conectarse al endpoint real en el próximo paso.
 * La UI y el contrato esperado ya están definidos.
 *
 * Cuando creemos la API, solamente reemplazaremos `getResumenVentasBarraAdminApi`
 * por la función real importada desde `api/adminBarraApi.ts`.
 */

interface ProductoVentaResumen {
  bebidaProductoId: number;
  nombre: string;
  cantidadVendida: number;
}

interface AdminBarraVentasResumen {
  ordenesCompletadas: number;
  cantidadProductosVendidos: number;

  productoMasVendido?: ProductoVentaResumen | null;
  productoMenosVendido?: ProductoVentaResumen | null;

  fechaDesde?: string | null;
  fechaHasta?: string | null;
  eventoId?: number | null;
  eventoNombre?: string | null;
}

interface ApiErrorLike {
  response?: {
    data?:
      | string
      | {
          message?: string;
        };
  };
  message?: string;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  const apiError = error as ApiErrorLike;
  const responseData = apiError.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    responseData.message
  ) {
    return responseData.message;
  }

  if (apiError.message) {
    return apiError.message;
  }

  return fallback;
}



export default function AdminBarraSalesSummaryScreen() {
  const [resumen, setResumen] =
    useState<AdminBarraVentasResumen | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await getResumenVentasBarraAdminApi();

        setResumen(data);
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getErrorMessage(
            error,
            "No se pudo cargar el resumen de ventas de barra."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const hayDatos =
    (resumen?.ordenesCompletadas ?? 0) > 0 ||
    (resumen?.cantidadProductosVendidos ?? 0) > 0;

  if (loading) {
    return (
      <RoleGuard
        allowedRoles={["Admin", "SuperAdmin"]}
      >
        <AppLayout title="Control de barra">
          <ActivityIndicator
            color="#E50914"
            style={styles.loader}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      allowedRoles={["Admin", "SuperAdmin"]}
    >
      <AppLayout
        title="Control de barra"
        scroll={false}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor="#E50914"
              colors={["#E50914"]}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              ADMINISTRACIÓN
            </Text>

            <Text style={styles.title}>
              Resumen de ventas
            </Text>

            <Text style={styles.subtitle}>
              Información operativa rápida de la barra.
              El análisis detallado quedará reservado
              para el panel web.
            </Text>
          </View>

          {resumen?.eventoNombre ? (
            <View style={styles.eventCard}>
              <Text style={styles.eventLabel}>
                Evento actual
              </Text>

              <Text style={styles.eventName}>
                {resumen.eventoNombre}
              </Text>
            </View>
          ) : null}

          <View style={styles.metricsGrid}>
            <MetricCard
              label="Órdenes completadas"
              value={String(
                resumen?.ordenesCompletadas ?? 0
              )}
              description="Ventas confirmadas"
            />

            <MetricCard
              label="Productos vendidos"
              value={String(
                resumen?.cantidadProductosVendidos ??
                  0
              )}
              description="Unidades totales"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Producto más vendido
            </Text>

            {resumen?.productoMasVendido ? (
              <ProductSummary
                producto={
                  resumen.productoMasVendido
                }
                type="top"
              />
            ) : (
              <EmptyMetric
                text="Todavía no hay ventas suficientes para determinar el producto más vendido."
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Producto menos vendido
            </Text>

            {resumen?.productoMenosVendido ? (
              <ProductSummary
                producto={
                  resumen.productoMenosVendido
                }
                type="low"
              />
            ) : (
              <EmptyMetric
                text="Todavía no hay ventas suficientes para determinar el producto menos vendido."
              />
            )}
          </View>

          {!hayDatos ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                Sin actividad registrada
              </Text>

              <Text style={styles.infoText}>
                Cuando existan ventas confirmadas de
                barra, este resumen mostrará solamente
                los indicadores operativos más útiles:
                órdenes completadas, unidades vendidas,
                producto más vendido y producto menos
                vendido.
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push(
                "/admin/barra/barra-users" as never
              )
            }
          >
            <Text style={styles.secondaryButtonText}>
              Gestionar usuarios de barra
            </Text>
          </Pressable>
        </ScrollView>
      </AppLayout>
    </RoleGuard>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text style={styles.metricValue}>
        {value}
      </Text>

      <Text style={styles.metricDescription}>
        {description}
      </Text>
    </View>
  );
}

function ProductSummary({
  producto,
  type,
}: {
  producto: ProductoVentaResumen;
  type: "top" | "low";
}) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>
          {producto.nombre}
        </Text>

        <Text style={styles.productMeta}>
          Producto #{producto.bebidaProductoId}
        </Text>
      </View>

      <View
        style={[
          styles.quantityBadge,
          type === "top"
            ? styles.quantityBadgeTop
            : styles.quantityBadgeLow,
        ]}
      >
        <Text
          style={[
            styles.quantityValue,
            type === "top"
              ? styles.quantityValueTop
              : styles.quantityValueLow,
          ]}
        >
          {producto.cantidadVendida}
        </Text>

        <Text
          style={[
            styles.quantityLabel,
            type === "top"
              ? styles.quantityValueTop
              : styles.quantityValueLow,
          ]}
        >
          vendidos
        </Text>
      </View>
    </View>
  );
}

function EmptyMetric({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },

  loader: {
    marginTop: 60,
  },

  pressed: {
    opacity: 0.82,
  },

  header: {
    marginBottom: 18,
  },

  eyebrow: {
    color: "#8F8F8F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },

  subtitle: {
    color: "#BDBDBD",
    lineHeight: 20,
    marginTop: 7,
  },

  eventCard: {
    backgroundColor: "rgba(229,9,20,0.11)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.30)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  eventLabel: {
    color: "#AFAFAF",
    fontSize: 12,
    fontWeight: "700",
  },

  eventName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },

  metricCard: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 128,
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 16,
    justifyContent: "center",
  },

  metricLabel: {
    color: "#BDBDBD",
    fontSize: 13,
    fontWeight: "700",
  },

  metricValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },

  metricDescription: {
    color: "#858585",
    fontSize: 12,
    marginTop: 3,
  },

  card: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  productMeta: {
    color: "#8F8F8F",
    fontSize: 12,
    marginTop: 4,
  },

  quantityBadge: {
    minWidth: 92,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },

  quantityBadgeTop: {
    backgroundColor:
      "rgba(32,214,123,0.13)",
    borderWidth: 1,
    borderColor:
      "rgba(32,214,123,0.30)",
  },

  quantityBadgeLow: {
    backgroundColor:
      "rgba(255,183,3,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(255,183,3,0.28)",
  },

  quantityValue: {
    fontSize: 22,
    fontWeight: "900",
  },

  quantityValueTop: {
    color: "#20D67B",
  },

  quantityValueLow: {
    color: "#FFB703",
  },

  quantityLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },

  emptyBox: {
    backgroundColor:
      "rgba(0,0,0,0.20)",
    borderRadius: 16,
    padding: 13,
  },

  emptyText: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor:
      "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.09)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },

  infoTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  infoText: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  secondaryButton: {
    backgroundColor:
      "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});