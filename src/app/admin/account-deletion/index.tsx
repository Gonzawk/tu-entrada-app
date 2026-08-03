import React, {
    useCallback,
    useMemo,
    useState,
} from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
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
    Stack,
    useLocalSearchParams,
} from "expo-router";

import AccountDeletionRequestCard from "@/components/admin/account-deletion/AccountDeletionRequestCard";
import ProcessAccountDeletionModal from "@/components/admin/account-deletion/ProcessAccountDeletionModal";
import ResolveAccountDeletionModal, {
    type ResolveAccountDeletionMode,
} from "@/components/admin/account-deletion/ResolveAccountDeletionModal";

import { useAccountDeletionAdmin } from "../../../hooks/useAccountDeletionAdmin";

import type {
    AccountDeletionAdminAction,
    AccountDeletionAdminResponse,
    AccountDeletionRequestStatusName,
} from "../../../types/adminAccountDeletion";

import {
    ACCOUNT_DELETION_STATUS_OPTIONS,
} from "../../../types/adminAccountDeletion";

type RouteParams = {
  role?: string | string[];
  roles?: string | string[];
};

interface ResolveModalState {
  visible: boolean;
  mode: ResolveAccountDeletionMode;
  request: AccountDeletionAdminResponse | null;
}

interface ProcessModalState {
  visible: boolean;
  request: AccountDeletionAdminResponse | null;
}

function normalizeRouteRoles(
  value: string | string[] | undefined
): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : [value];

  return values
    .flatMap((item) =>
      item
        .split(",")
        .map((role) => role.trim())
    )
    .filter(Boolean);
}

function getActionForRequest(
  actionState: {
    solicitudId: number | null;
    action: AccountDeletionAdminAction | null;
    loading: boolean;
  },
  solicitudId: number
): AccountDeletionAdminAction | null {
  if (
    !actionState.loading ||
    actionState.solicitudId !== solicitudId
  ) {
    return null;
  }

  return actionState.action;
}

export default function AccountDeletionAdminScreen() {
  const params =
    useLocalSearchParams<RouteParams>();

  /*
   * El parámetro solo controla lo que se muestra en el frontend.
   * El backend debe seguir validando Admin/SuperAdmin mediante JWT.
   *
   * Ejemplo de navegación:
   * router.push({
   *   pathname: "/admin/account-deletion",
   *   params: { role: "SuperAdmin" },
   * });
   */
  const isSuperAdmin = useMemo(() => {
    const roles = [
      ...normalizeRouteRoles(params.role),
      ...normalizeRouteRoles(params.roles),
    ];

    return roles.some(
      (role) =>
        role.toLocaleLowerCase("es-AR") ===
        "superadmin"
    );
  }, [params.role, params.roles]);

  const {
    filteredRequests,
    loading,
    refreshing,
    error,
    filters,
    actionState,
    totalRequests,
    confirmedCount,
    underReviewCount,
    approvedCount,
    loadRequests,
    refreshRequests,
    setSearch,
    setStatusFilter,
    clearFilters,
    startReview,
    approveRequest,
    rejectRequest,
    processRequest,
  } = useAccountDeletionAdmin();

  const [resolveModal, setResolveModal] =
    useState<ResolveModalState>({
      visible: false,
      mode: "approve",
      request: null,
    });

  const [processModal, setProcessModal] =
    useState<ProcessModalState>({
      visible: false,
      request: null,
    });

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.status !== "Todas";

  const closeResolveModal = useCallback(() => {
    if (actionState.loading) {
      return;
    }

    setResolveModal({
      visible: false,
      mode: "approve",
      request: null,
    });
  }, [actionState.loading]);

  const closeProcessModal = useCallback(() => {
    if (actionState.loading) {
      return;
    }

    setProcessModal({
      visible: false,
      request: null,
    });
  }, [actionState.loading]);

  const handleStartReview = useCallback(
    (request: AccountDeletionAdminResponse) => {
      Alert.alert(
        "Iniciar revisión",
        `¿Deseas iniciar la revisión de la solicitud #${request.id}?`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Iniciar revisión",
            onPress: () => {
              void (async () => {
                try {
                  const response =
                    await startReview(request.id);

                  Alert.alert(
                    "Revisión iniciada",
                    response.message ||
                      "La solicitud pasó correctamente a revisión."
                  );
                } catch (actionError: unknown) {
                  Alert.alert(
                    "No se pudo iniciar la revisión",
                    actionError instanceof Error
                      ? actionError.message
                      : "Ocurrió un error inesperado."
                  );
                }
              })();
            },
          },
        ]
      );
    },
    [startReview]
  );

  const openApproveModal = useCallback(
    (request: AccountDeletionAdminResponse) => {
      setResolveModal({
        visible: true,
        mode: "approve",
        request,
      });
    },
    []
  );

  const openRejectModal = useCallback(
    (request: AccountDeletionAdminResponse) => {
      setResolveModal({
        visible: true,
        mode: "reject",
        request,
      });
    },
    []
  );

  const openProcessModal = useCallback(
    (request: AccountDeletionAdminResponse) => {
      if (!isSuperAdmin) {
        Alert.alert(
          "Acceso restringido",
          "Solo un SuperAdmin puede procesar definitivamente una solicitud aprobada."
        );

        return;
      }

      setProcessModal({
        visible: true,
        request,
      });
    },
    [isSuperAdmin]
  );

  const handleResolveConfirm = useCallback(
    async (observacion?: string) => {
      const selectedRequest =
        resolveModal.request;

      if (!selectedRequest) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      const response =
        resolveModal.mode === "approve"
          ? await approveRequest(
              selectedRequest.id,
              observacion
            )
          : await rejectRequest(
              selectedRequest.id,
              observacion
            );

      closeResolveModal();

      Alert.alert(
        resolveModal.mode === "approve"
          ? "Solicitud aprobada"
          : "Solicitud rechazada",
        response.message ||
          (resolveModal.mode === "approve"
            ? "La solicitud fue aprobada correctamente."
            : "La solicitud fue rechazada correctamente.")
      );
    },
    [
      approveRequest,
      closeResolveModal,
      rejectRequest,
      resolveModal.mode,
      resolveModal.request,
    ]
  );

  const handleProcessConfirm =
    useCallback(async () => {
      const selectedRequest =
        processModal.request;

      if (!selectedRequest) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      if (!isSuperAdmin) {
        throw new Error(
          "Solo un SuperAdmin puede procesar definitivamente esta solicitud."
        );
      }

      const response = await processRequest(
        selectedRequest.id
      );

      closeProcessModal();

      Alert.alert(
        "Solicitud procesada",
        response.message ||
          "La cuenta fue procesada y anonimizada correctamente."
      );
    }, [
      closeProcessModal,
      isSuperAdmin,
      processModal.request,
      processRequest,
    ]);

  const handleRetry = useCallback(() => {
    void loadRequests(true).catch(
      (loadError: unknown) => {
        Alert.alert(
          "No se pudo cargar",
          loadError instanceof Error
            ? loadError.message
            : "Ocurrió un error inesperado."
        );
      }
    );
  }, [loadRequests]);

  const handleRefresh = useCallback(() => {
    void refreshRequests().catch(
      (refreshError: unknown) => {
        Alert.alert(
          "No se pudo actualizar",
          refreshError instanceof Error
            ? refreshError.message
            : "Ocurrió un error inesperado."
        );
      }
    );
  }, [refreshRequests]);

  const renderRequest = useCallback(
    ({
      item,
    }: {
      item: AccountDeletionAdminResponse;
    }) => (
      <AccountDeletionRequestCard
        request={item}
        isSuperAdmin={isSuperAdmin}
        loadingAction={getActionForRequest(
          actionState,
          item.id
        )}
        disabled={
          actionState.loading &&
          actionState.solicitudId !== item.id
        }
        onStartReview={handleStartReview}
        onApprove={openApproveModal}
        onReject={openRejectModal}
        onProcess={openProcessModal}
      />
    ),
    [
      actionState,
      handleStartReview,
      isSuperAdmin,
      openApproveModal,
      openProcessModal,
      openRejectModal,
    ]
  );

  const keyExtractor = useCallback(
    (item: AccountDeletionAdminResponse) =>
      item.id.toString(),
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen
          options={{
            title: "Eliminación de cuentas",
            headerShown: true,
          }}
        />

        <StatusBar
          barStyle="light-content"
          backgroundColor="#0B0F16"
        />

        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#60A5FA"
          />

          <Text style={styles.centerStateTitle}>
            Cargando solicitudes
          </Text>

          <Text style={styles.centerStateText}>
            Estamos consultando las solicitudes
            pendientes de gestión.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    error &&
    totalRequests === 0
  ) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen
          options={{
            title: "Eliminación de cuentas",
            headerShown: true,
          }}
        />

        <StatusBar
          barStyle="light-content"
          backgroundColor="#0B0F16"
        />

        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>
              !
            </Text>
          </View>

          <Text style={styles.centerStateTitle}>
            No pudimos cargar las solicitudes
          </Text>

          <Text style={styles.centerStateText}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reintentar carga"
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Eliminación de cuentas",
          headerShown: true,
        }}
      />

      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B0F16"
      />

      <FlatList
        data={filteredRequests}
        keyExtractor={keyExtractor}
        renderItem={renderRequest}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredRequests.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#60A5FA"
            colors={["#60A5FA"]}
            progressBackgroundColor="#151B26"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.pageHeader}>
              <View style={styles.pageHeaderText}>
                <Text style={styles.pageTitle}>
                  Solicitudes de eliminación
                </Text>

                <Text style={styles.pageDescription}>
                  Gestiona solicitudes confirmadas,
                  revisiones y aprobaciones. El
                  procesamiento definitivo está
                  reservado para SuperAdmin.
                </Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  isSuperAdmin
                    ? styles.superAdminBadge
                    : styles.adminBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isSuperAdmin
                      ? styles.superAdminBadgeText
                      : styles.adminBadgeText,
                  ]}
                >
                  {isSuperAdmin
                    ? "SuperAdmin"
                    : "Admin"}
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {totalRequests}
                </Text>

                <Text style={styles.summaryLabel}>
                  Total pendientes
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {confirmedCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Confirmadas
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {underReviewCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  En revisión
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>
                  {approvedCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Aprobadas
                </Text>
              </View>
            </View>

            {error && (
              <View style={styles.inlineError}>
                <Text
                  style={
                    styles.inlineErrorTitle
                  }
                >
                  No se pudo actualizar el listado
                </Text>

                <Text
                  style={
                    styles.inlineErrorText
                  }
                >
                  {error}
                </Text>
              </View>
            )}

            <View style={styles.searchContainer}>
              <Text style={styles.filterTitle}>
                Buscar solicitudes
              </Text>

              <View style={styles.searchInputContainer}>
                <TextInput
                  value={filters.search}
                  onChangeText={setSearch}
                  placeholder="Nombre, email, ID, motivo..."
                  placeholderTextColor="#6F7A89"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  selectionColor="#60A5FA"
                  onSubmitEditing={Keyboard.dismiss}
                  style={styles.searchInput}
                  accessibilityLabel="Buscar solicitudes"
                />

                {filters.search.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                    onPress={() => setSearch("")}
                    style={({ pressed }) => [
                      styles.clearSearchButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.clearSearchText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.filterContainer}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>
                  Estado
                </Text>

                {hasActiveFilters && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar filtros"
                    onPress={clearFilters}
                    style={({ pressed }) => [
                      styles.clearFiltersButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={
                        styles.clearFiltersText
                      }
                    >
                      Limpiar filtros
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.statusFilters}>
                {ACCOUNT_DELETION_STATUS_OPTIONS.map(
                  (option) => {
                    const selected =
                      filters.status ===
                      option.value;

                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                        }}
                        onPress={() =>
                          setStatusFilter(
                            option.value as
                              | AccountDeletionRequestStatusName
                              | "Todas"
                          )
                        }
                        style={({ pressed }) => [
                          styles.statusFilter,
                          selected &&
                            styles.statusFilterSelected,
                          pressed &&
                            styles.buttonPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusFilterText,
                            selected &&
                              styles.statusFilterTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                Resultados
              </Text>

              <Text style={styles.resultsCount}>
                {filteredRequests.length}
                {filteredRequests.length === 1
                  ? " solicitud"
                  : " solicitudes"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ✓
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              {hasActiveFilters
                ? "No hay coincidencias"
                : "No hay solicitudes pendientes"}
            </Text>

            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? "Prueba cambiando la búsqueda o el estado seleccionado."
                : "Actualmente no existen solicitudes que requieran gestión administrativa."}
            </Text>

            {hasActiveFilters && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar filtros"
                onPress={clearFilters}
                style={({ pressed }) => [
                  styles.emptyActionButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={
                    styles.emptyActionButtonText
                  }
                >
                  Limpiar filtros
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListFooterComponent={
          filteredRequests.length > 0 ? (
            <Text style={styles.footerHint}>
              Desliza hacia abajo para actualizar
              las solicitudes.
            </Text>
          ) : null
        }
      />

      <ResolveAccountDeletionModal
        visible={resolveModal.visible}
        mode={resolveModal.mode}
        request={resolveModal.request}
        loading={
          actionState.loading &&
          actionState.solicitudId ===
            resolveModal.request?.id &&
          (actionState.action === "approve" ||
            actionState.action === "reject")
        }
        onConfirm={handleResolveConfirm}
        onClose={closeResolveModal}
      />

      <ProcessAccountDeletionModal
        visible={processModal.visible}
        request={processModal.request}
        loading={
          actionState.loading &&
          actionState.solicitudId ===
            processModal.request?.id &&
          actionState.action === "process"
        }
        onConfirm={handleProcessConfirm}
        onClose={closeProcessModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B0F16",
  },

  listContent: {
    paddingBottom: 34,
    paddingHorizontal: 16,
  },

  emptyListContent: {
    flexGrow: 1,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },

  separator: {
    height: 14,
  },

  headerContainer: {
    gap: 20,
    paddingBottom: 18,
    paddingTop: 18,
  },

  pageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },

  pageHeaderText: {
    flex: 1,
    gap: 7,
  },

  pageTitle: {
    color: "#F8FAFC",
    fontSize: 25,
    fontWeight: "900",
  },

  pageDescription: {
    color: "#98A3B3",
    fontSize: 14,
    lineHeight: 21,
  },

  roleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  adminBadge: {
    backgroundColor: "#15233C",
    borderColor: "#294A7A",
  },

  adminBadgeText: {
    color: "#93C5FD",
  },

  superAdminBadge: {
    backgroundColor: "#2C1806",
    borderColor: "#8A480E",
  },

  superAdminBadgeText: {
    color: "#FDBA74",
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    backgroundColor: "#141A24",
    borderColor: "#283140",
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 5,
    minHeight: 86,
    padding: 14,
  },

  summaryNumber: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
  },

  summaryLabel: {
    color: "#8E99A9",
    fontSize: 12,
    fontWeight: "700",
  },

  inlineError: {
    backgroundColor: "#2B1215",
    borderColor: "#7F1D1D",
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },

  inlineErrorTitle: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "900",
  },

  inlineErrorText: {
    color: "#FECACA",
    fontSize: 12,
    lineHeight: 18,
  },

  searchContainer: {
    gap: 9,
  },

  filterContainer: {
    gap: 10,
  },

  filterHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  filterTitle: {
    color: "#EDF2F7",
    fontSize: 14,
    fontWeight: "900",
  },

  searchInputContainer: {
    alignItems: "center",
    backgroundColor: "#111720",
    borderColor: "#2C3544",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 50,
  },

  searchInput: {
    color: "#F8FAFC",
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  clearSearchButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  clearSearchText: {
    color: "#A8B2C0",
    fontSize: 24,
    lineHeight: 26,
  },

  clearFiltersButton: {
    paddingHorizontal: 4,
    paddingVertical: 5,
  },

  clearFiltersText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800",
  },

  statusFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  statusFilter: {
    backgroundColor: "#151B25",
    borderColor: "#2C3543",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  statusFilterSelected: {
    backgroundColor: "#1D4ED8",
    borderColor: "#3B82F6",
  },

  statusFilterText: {
    color: "#AAB4C3",
    fontSize: 12,
    fontWeight: "700",
  },

  statusFilterTextSelected: {
    color: "#FFFFFF",
  },

  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  resultsTitle: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "900",
  },

  resultsCount: {
    color: "#7F8A99",
    fontSize: 12,
    fontWeight: "700",
  },

  centerState: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  centerStateTitle: {
    color: "#F8FAFC",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  centerStateText: {
    color: "#98A3B3",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 380,
    textAlign: "center",
  },

  errorIcon: {
    alignItems: "center",
    backgroundColor: "#381317",
    borderColor: "#991B1B",
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },

  errorIconText: {
    color: "#FCA5A5",
    fontSize: 27,
    fontWeight: "900",
  },

  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 13,
    marginTop: 6,
    minWidth: 140,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 46,
  },

  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#0B2B20",
    borderColor: "#166534",
    borderRadius: 999,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    marginBottom: 4,
    width: 62,
  },

  emptyIconText: {
    color: "#86EFAC",
    fontSize: 27,
    fontWeight: "900",
  },

  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color: "#8E99A9",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 370,
    textAlign: "center",
  },

  emptyActionButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 13,
    marginTop: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyActionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  footerHint: {
    color: "#667180",
    fontSize: 12,
    paddingBottom: 8,
    paddingTop: 22,
    textAlign: "center",
  },

  buttonPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },
});