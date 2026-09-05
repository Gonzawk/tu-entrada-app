import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    asignarAdminMercadoPagoTerminalACajaApi,
    desasignarAdminMercadoPagoTerminalDeCajaApi,
    getAdminMercadoPagoTerminalesApi,
    sincronizarAdminMercadoPagoTerminalesApi,
} from "../../../api/adminMercadoPagoPointApi";
import { MercadoPagoTerminalAdminResponse } from "../../../types/mercadoPagoPointAdmin";

type FiltroTerminal = "todas" | "activas" | "pdv" | "inactivas";


interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      error?: string;
      title?: string;
    };
  };
  message?: string;
}

function getErrorMessage(error: unknown): string {
  const typed = error as ApiErrorShape;

  return (
    typed?.response?.data?.message ||
    typed?.response?.data?.error ||
    typed?.response?.data?.title ||
    typed?.message ||
    "Ocurrió un error inesperado."
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "Sin sincronización";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function cleanValue(value?: string | null): string {
  const normalized = value?.trim();
  return normalized ? normalized : "—";
}

function buildTerminalSubtitle(terminal: MercadoPagoTerminalAdminResponse): string {
  if (!terminal.activa) return "Inactiva";
  if (terminal.estaEnModoPdv) return "Lista para operar";
  return "Requiere modo PDV";
}

export default function AdminMercadoPagoPointScreen() {
  const [terminales, setTerminales] = useState<
    MercadoPagoTerminalAdminResponse[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [liberando, setLiberando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroTerminal>("todas");

  const [modalAsignacionVisible, setModalAsignacionVisible] =
    useState(false);
  const [terminalSeleccionada, setTerminalSeleccionada] =
    useState<MercadoPagoTerminalAdminResponse | null>(null);
  const [cajaIdAsignar, setCajaIdAsignar] = useState("");

  const [modalLiberarVisible, setModalLiberarVisible] = useState(false);
  const [cajaIdLiberar, setCajaIdLiberar] = useState("");

  const consultarTerminales = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setCargando(true);

        const data = await getAdminMercadoPagoTerminalesApi(false);

        setTerminales(data);
      } catch (error) {
        Alert.alert(
          "No se pudieron consultar los POS",
          getErrorMessage(error)
        );
      } finally {
        if (showLoader) setCargando(false);
      }
    },
    []
  );

  useEffect(() => {
    void consultarTerminales();
  }, [consultarTerminales]);

  const refrescar = useCallback(async () => {
    try {
      setRefrescando(true);
      await consultarTerminales(false);
    } finally {
      setRefrescando(false);
    }
  }, [consultarTerminales]);

  const sincronizarTerminales = useCallback(async () => {
    if (sincronizando) return;

    Alert.alert(
      "Sincronizar terminales",
      "Se consultarán las terminales asociadas a Mercado Pago y se actualizará el registro local.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sincronizar",
          onPress: async () => {
            try {
              setSincronizando(true);

              const data =
                await sincronizarAdminMercadoPagoTerminalesApi();

              setTerminales(data.terminales);

              Alert.alert(
                "Sincronización completada",
                [
                  `Encontradas en Mercado Pago: ${data.encontradasMercadoPago}`,
                  `Creadas: ${data.creadas}`,
                  `Actualizadas: ${data.actualizadas}`,
                  `Desactivadas: ${data.desactivadas}`,
                  `En modo PDV: ${data.enModoPdv}`,
                ].join("\n")
              );
            } catch (error) {
              Alert.alert(
                "No se pudo sincronizar",
                getErrorMessage(error)
              );
            } finally {
              setSincronizando(false);
            }
          },
        },
      ]
    );
  }, [sincronizando]);

  const abrirAsignacion = useCallback(
    (terminal: MercadoPagoTerminalAdminResponse) => {
      if (!terminal.activa) {
        Alert.alert(
          "Terminal inactiva",
          "Sincronizá los POS antes de intentar asignar esta terminal."
        );
        return;
      }

      if (!terminal.estaEnModoPdv) {
        Alert.alert(
          "Terminal no disponible",
          "La terminal debe estar configurada en modo PDV para poder asignarse a una caja."
        );
        return;
      }

      setTerminalSeleccionada(terminal);
      setCajaIdAsignar("");
      setModalAsignacionVisible(true);
    },
    []
  );

  const cerrarAsignacion = useCallback(() => {
    if (asignando) return;

    setModalAsignacionVisible(false);
    setTerminalSeleccionada(null);
    setCajaIdAsignar("");
  }, [asignando]);

  const asignarTerminal = useCallback(async () => {
    if (!terminalSeleccionada || asignando) return;

    const cajaId = Number(cajaIdAsignar.trim());

    if (!Number.isInteger(cajaId) || cajaId <= 0) {
      Alert.alert(
        "Caja inválida",
        "Ingresá el identificador numérico de una caja abierta."
      );
      return;
    }

    try {
      setAsignando(true);

      await asignarAdminMercadoPagoTerminalACajaApi(
        cajaId,
        terminalSeleccionada.id
      );

      setModalAsignacionVisible(false);
      setTerminalSeleccionada(null);
      setCajaIdAsignar("");

      await consultarTerminales(false);

      Alert.alert(
        "Terminal asignada",
        `El POS fue vinculado correctamente a la caja #${cajaId}.`
      );
    } catch (error) {
      Alert.alert(
        "No se pudo asignar la terminal",
        getErrorMessage(error)
      );
    } finally {
      setAsignando(false);
    }
  }, [
    terminalSeleccionada,
    asignando,
    cajaIdAsignar,
    consultarTerminales,
  ]);

  const abrirLiberarCaja = useCallback(() => {
    setCajaIdLiberar("");
    setModalLiberarVisible(true);
  }, []);

  const cerrarLiberarCaja = useCallback(() => {
    if (liberando) return;

    setModalLiberarVisible(false);
    setCajaIdLiberar("");
  }, [liberando]);

  const liberarCaja = useCallback(async () => {
    if (liberando) return;

    const cajaId = Number(cajaIdLiberar.trim());

    if (!Number.isInteger(cajaId) || cajaId <= 0) {
      Alert.alert(
        "Caja inválida",
        "Ingresá el identificador numérico de la caja que querés liberar."
      );
      return;
    }

    Alert.alert(
      "Liberar terminal",
      `¿Querés desvincular el POS actualmente asociado a la caja #${cajaId}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Liberar",
          style: "destructive",
          onPress: async () => {
            try {
              setLiberando(true);

              await desasignarAdminMercadoPagoTerminalDeCajaApi(
                cajaId
              );

              setModalLiberarVisible(false);
              setCajaIdLiberar("");

              await consultarTerminales(false);

              Alert.alert(
                "Terminal liberada",
                `La caja #${cajaId} quedó sin terminal Point vinculada.`
              );
            } catch (error) {
              Alert.alert(
                "No se pudo liberar la terminal",
                getErrorMessage(error)
              );
            } finally {
              setLiberando(false);
            }
          },
        },
      ]
    );
  }, [cajaIdLiberar, consultarTerminales, liberando]);

  const totales = useMemo(() => {
    const activas = terminales.filter((x) => x.activa).length;
    const pdv = terminales.filter(
      (x) => x.activa && x.estaEnModoPdv
    ).length;
    const inactivas = terminales.filter((x) => !x.activa).length;

    return {
      total: terminales.length,
      activas,
      pdv,
      inactivas,
    };
  }, [terminales]);

  const terminalesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return terminales.filter((terminal) => {
      const coincideFiltro =
        filtro === "todas"
          ? true
          : filtro === "activas"
          ? terminal.activa
          : filtro === "pdv"
          ? terminal.activa && terminal.estaEnModoPdv
          : !terminal.activa;

      if (!coincideFiltro) return false;

      if (!term) return true;

      return [
        terminal.nombre,
        terminal.terminalId,
        terminal.posId,
        terminal.storeId,
        terminal.externalPosId,
        terminal.operatingMode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [terminales, busqueda, filtro]);

  const renderTerminal = ({
    item,
  }: {
    item: MercadoPagoTerminalAdminResponse;
  }) => {
    const operativa = item.activa && item.estaEnModoPdv;

    return (
      <View style={styles.terminalCard}>
        <View style={styles.terminalCardHeader}>
          <View style={styles.terminalIdentity}>
            <View
              style={[
                styles.terminalIcon,
                !item.activa && styles.terminalIconInactive,
              ]}
            >
              <Ionicons
                name="card-outline"
                size={22}
                color={item.activa ? "#111827" : "#9CA3AF"}
              />
            </View>

            <View style={styles.terminalTitleWrap}>
              <Text style={styles.terminalName} numberOfLines={1}>
                {item.nombre}
              </Text>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    item.activa
                      ? item.estaEnModoPdv
                        ? styles.statusDotSuccess
                        : styles.statusDotWarning
                      : styles.statusDotMuted,
                  ]}
                />

                <Text
                  style={[
                    styles.statusText,
                    !item.activa && styles.statusTextMuted,
                  ]}
                >
                  {buildTerminalSubtitle(item)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.modeBadge,
              item.estaEnModoPdv
                ? styles.modeBadgeSuccess
                : styles.modeBadgeMuted,
            ]}
          >
            <Text
              style={[
                styles.modeBadgeText,
                item.estaEnModoPdv
                  ? styles.modeBadgeTextSuccess
                  : styles.modeBadgeTextMuted,
              ]}
            >
              {cleanValue(item.operatingMode)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          <InfoRow
            label="Terminal ID"
            value={cleanValue(item.terminalId)}
          />
          <InfoRow label="POS ID" value={cleanValue(item.posId)} />
          <InfoRow label="Store ID" value={cleanValue(item.storeId)} />
          <InfoRow
            label="External POS"
            value={cleanValue(item.externalPosId)}
          />
          <InfoRow
            label="Última sincronización"
            value={formatDate(item.fechaUltimaSincronizacion)}
          />
        </View>

        <Pressable
          disabled={!operativa}
          onPress={() => abrirAsignacion(item)}
          style={({ pressed }) => [
            styles.assignButton,
            !operativa && styles.assignButtonDisabled,
            pressed && operativa && styles.buttonPressed,
          ]}
        >
          <Ionicons
            name="link-outline"
            size={18}
            color={operativa ? "#FFFFFF" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.assignButtonText,
              !operativa && styles.assignButtonTextDisabled,
            ]}
          >
            Asignar a caja
          </Text>
        </Pressable>
      </View>
    );
  };

  if (cargando) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingTitle}>
            Consultando terminales Point
          </Text>
          <Text style={styles.loadingSubtitle}>
            Recuperando los POS registrados en TuEntrada.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={terminalesFiltradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTerminal}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={refrescar}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
                <Text style={styles.title}>Mercado Pago Point</Text>
                <Text style={styles.subtitle}>
                  Consultá, sincronizá y vinculá terminales POS con las
                  cajas operativas de Barra y Ventanilla.
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => void refrescar()}
                disabled={refrescando || sincronizando}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {refrescando ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color="#111827"
                  />
                )}

                <Text style={styles.secondaryButtonText}>
                  Consultar POS
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void sincronizarTerminales()}
                disabled={sincronizando}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  sincronizando && styles.primaryButtonDisabled,
                ]}
              >
                {sincronizando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="sync-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.primaryButtonText}>
                  {sincronizando ? "Sincronizando..." : "Sincronizar"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Registradas"
                value={totales.total}
                icon="hardware-chip-outline"
              />
              <StatCard
                label="Activas"
                value={totales.activas}
                icon="checkmark-circle-outline"
              />
              <StatCard
                label="Modo PDV"
                value={totales.pdv}
                icon="card-outline"
              />
              <StatCard
                label="Inactivas"
                value={totales.inactivas}
                icon="pause-circle-outline"
              />
            </View>

            <View style={styles.toolsCard}>
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={19}
                  color="#6B7280"
                />
                <TextInput
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar por nombre, terminal, POS o store..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!busqueda && (
                  <Pressable onPress={() => setBusqueda("")}>
                    <Ionicons
                      name="close-circle"
                      size={19}
                      color="#9CA3AF"
                    />
                  </Pressable>
                )}
              </View>

              <View style={styles.filtersRow}>
                <FilterChip
                  label="Todas"
                  active={filtro === "todas"}
                  onPress={() => setFiltro("todas")}
                />
                <FilterChip
                  label="Activas"
                  active={filtro === "activas"}
                  onPress={() => setFiltro("activas")}
                />
                <FilterChip
                  label="PDV"
                  active={filtro === "pdv"}
                  onPress={() => setFiltro("pdv")}
                />
                <FilterChip
                  label="Inactivas"
                  active={filtro === "inactivas"}
                  onPress={() => setFiltro("inactivas")}
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Terminales</Text>
                <Text style={styles.sectionSubtitle}>
                  {terminalesFiltradas.length} resultado
                  {terminalesFiltradas.length === 1 ? "" : "s"}
                </Text>
              </View>

              <Pressable
                onPress={abrirLiberarCaja}
                style={({ pressed }) => [
                  styles.releaseShortcut,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="unlink-outline"
                  size={17}
                  color="#374151"
                />
                <Text style={styles.releaseShortcutText}>
                  Liberar caja
                </Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="card-outline"
                size={28}
                color="#6B7280"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No hay terminales para mostrar
            </Text>

            <Text style={styles.emptySubtitle}>
              Si todavía no registraste los POS de la cuenta, utilizá
              “Sincronizar” para consultar Mercado Pago y asentarlos en
              la base local.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />

      <Modal
        visible={modalAsignacionVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarAsignacion}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>ASIGNAR POS</Text>
                <Text style={styles.modalTitle}>
                  {terminalSeleccionada?.nombre ?? "Terminal"}
                </Text>
              </View>

              <Pressable
                disabled={asignando}
                onPress={cerrarAsignacion}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.modalTerminalInfo}>
              <Ionicons
                name="card-outline"
                size={20}
                color="#111827"
              />
              <View style={styles.modalTerminalCopy}>
                <Text style={styles.modalTerminalLabel}>
                  Terminal ID
                </Text>
                <Text
                  style={styles.modalTerminalValue}
                  numberOfLines={2}
                >
                  {cleanValue(terminalSeleccionada?.terminalId)}
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>ID de caja</Text>

            <TextInput
              value={cajaIdAsignar}
              onChangeText={(value) =>
                setCajaIdAsignar(value.replace(/[^0-9]/g, ""))
              }
              placeholder="Ej.: 25"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              style={styles.textInput}
              editable={!asignando}
            />

            <View style={styles.infoNotice}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color="#374151"
              />
              <Text style={styles.infoNoticeText}>
                La API validará que la terminal esté activa, en modo PDV
                y que no esté utilizada por otra caja abierta.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                disabled={asignando}
                onPress={cerrarAsignacion}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={asignando}
                onPress={() => void asignarTerminal()}
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  pressed && styles.buttonPressed,
                  asignando && styles.primaryButtonDisabled,
                ]}
              >
                {asignando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="link-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.modalConfirmText}>
                  {asignando ? "Asignando..." : "Asignar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalLiberarVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarLiberarCaja}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>LIBERAR TERMINAL</Text>
                <Text style={styles.modalTitle}>Desvincular de caja</Text>
              </View>

              <Pressable
                disabled={liberando}
                onPress={cerrarLiberarCaja}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Ingresá el ID de la caja a la que querés quitarle la
              terminal Mercado Pago Point.
            </Text>

            <Text style={styles.fieldLabel}>ID de caja</Text>

            <TextInput
              value={cajaIdLiberar}
              onChangeText={(value) =>
                setCajaIdLiberar(value.replace(/[^0-9]/g, ""))
              }
              placeholder="Ej.: 25"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              style={styles.textInput}
              editable={!liberando}
            />

            <View style={styles.modalActions}>
              <Pressable
                disabled={liberando}
                onPress={cerrarLiberarCaja}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                disabled={liberando}
                onPress={() => void liberarCaja()}
                style={({ pressed }) => [
                  styles.modalDangerButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {liberando ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="unlink-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                )}

                <Text style={styles.modalConfirmText}>
                  {liberando ? "Liberando..." : "Liberar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={20} color="#111827" />
      </View>

      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.buttonPressed,
      ]}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 42,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loadingTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  loadingSubtitle: {
    marginTop: 6,
    maxWidth: 310,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },

  header: {
    marginBottom: 18,
  },

  headerCopy: {
    maxWidth: 680,
  },

  eyebrow: {
    marginBottom: 5,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#6B7280",
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.7,
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    maxWidth: 650,
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  buttonPressed: {
    opacity: 0.75,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    minWidth: "47%",
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 84,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "800",
    color: "#111827",
  },

  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  toolsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginBottom: 22,
  },

  searchContainer: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
    fontSize: 14,
    color: "#111827",
  },

  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  filterChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  filterChipActive: {
    backgroundColor: "#111827",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  releaseShortcut: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
  },

  releaseShortcutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  terminalCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  terminalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  terminalIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  terminalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  terminalIconInactive: {
    backgroundColor: "#F9FAFB",
  },

  terminalTitleWrap: {
    flex: 1,
  },

  terminalName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  statusDotSuccess: {
    backgroundColor: "#22C55E",
  },

  statusDotWarning: {
    backgroundColor: "#F59E0B",
  },

  statusDotMuted: {
    backgroundColor: "#9CA3AF",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475467",
  },

  statusTextMuted: {
    color: "#9CA3AF",
  },

  modeBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  modeBadgeSuccess: {
    backgroundColor: "#ECFDF3",
  },

  modeBadgeMuted: {
    backgroundColor: "#F3F4F6",
  },

  modeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  modeBadgeTextSuccess: {
    color: "#15803D",
  },

  modeBadgeTextMuted: {
    color: "#667085",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF0F3",
    marginVertical: 14,
  },

  infoGrid: {
    gap: 9,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },

  infoLabel: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    color: "#667085",
  },

  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: "#344054",
  },

  assignButton: {
    minHeight: 44,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },

  assignButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },

  assignButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  assignButtonTextDisabled: {
    color: "#9CA3AF",
  },

  itemSeparator: {
    height: 12,
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 26,
    paddingVertical: 34,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  emptySubtitle: {
    marginTop: 7,
    maxWidth: 420,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  modalEyebrow: {
    marginBottom: 4,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#6B7280",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  modalDescription: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
  },

  modalTerminalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 17,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    padding: 13,
  },

  modalTerminalCopy: {
    flex: 1,
  },

  modalTerminalLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },

  modalTerminalValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  fieldLabel: {
    marginTop: 18,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  infoNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
  },

  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#475467",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#D7DCE3",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  modalConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },

  modalDangerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#B42318",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },

  modalConfirmText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
