import { useCallback, useEffect, useMemo, useState } from "react";

import {
    approveAccountDeletionRequest,
    getPendingAccountDeletionRequests,
    processAccountDeletionRequest,
    rejectAccountDeletionRequest,
    startAccountDeletionReview,
} from "../api/adminAccountDeletion";

import type {
    AccountDeletionActionResponse,
    AccountDeletionActionState,
    AccountDeletionAdminFilters,
    AccountDeletionAdminResponse,
    AccountDeletionRequestStatusName,
} from "../types/adminAccountDeletion";

import {
    canProcessAccountDeletionRequest,
    canResolveAccountDeletionRequest,
    canStartAccountDeletionReview,
} from "../types/adminAccountDeletion";

const INITIAL_ACTION_STATE: AccountDeletionActionState = {
  solicitudId: null,
  action: null,
  loading: false,
};

const INITIAL_FILTERS: AccountDeletionAdminFilters = {
  search: "",
  status: "Todas",
};

interface UseAccountDeletionAdminOptions {
  /**
   * Permite desactivar la carga automática.
   * Es útil si la pantalla todavía está resolviendo permisos.
   */
  enabled?: boolean;
}

interface UseAccountDeletionAdminResult {
  requests: AccountDeletionAdminResponse[];
  filteredRequests: AccountDeletionAdminResponse[];

  loading: boolean;
  refreshing: boolean;
  error: string | null;

  filters: AccountDeletionAdminFilters;
  actionState: AccountDeletionActionState;

  totalRequests: number;
  confirmedCount: number;
  underReviewCount: number;
  approvedCount: number;

  loadRequests: (showFullLoading?: boolean) => Promise<void>;
  refreshRequests: () => Promise<void>;

  setSearch: (value: string) => void;
  setStatusFilter: (
    value: AccountDeletionRequestStatusName | "Todas"
  ) => void;
  clearFilters: () => void;

  startReview: (
    solicitudId: number
  ) => Promise<AccountDeletionActionResponse>;

  approveRequest: (
    solicitudId: number,
    observacion?: string
  ) => Promise<AccountDeletionActionResponse>;

  rejectRequest: (
    solicitudId: number,
    observacion?: string
  ) => Promise<AccountDeletionActionResponse>;

  processRequest: (
    solicitudId: number
  ) => Promise<AccountDeletionActionResponse>;

  isActionLoading: (
    solicitudId: number,
    action?:
      | "start-review"
      | "approve"
      | "reject"
      | "process"
  ) => boolean;
}

function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
            errors?: Record<string, string[]>;
          };
        };
      }
    ).response;

    const backendMessage =
      response?.data?.message ??
      response?.data?.title;

    if (backendMessage) {
      return backendMessage;
    }

    const validationErrors = response?.data?.errors;

    if (validationErrors) {
      const firstValidationError = Object.values(
        validationErrors
      )
        .flat()
        .find(Boolean);

      if (firstValidationError) {
        return firstValidationError;
      }
    }
  }

  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function sortRequests(
  requests: AccountDeletionAdminResponse[]
): AccountDeletionAdminResponse[] {
  return [...requests].sort((a, b) => {
    const dateA = new Date(a.fechaSolicitud).getTime();
    const dateB = new Date(b.fechaSolicitud).getTime();

    if (Number.isNaN(dateA) || Number.isNaN(dateB)) {
      return b.id - a.id;
    }

    return dateB - dateA;
  });
}

export function useAccountDeletionAdmin(
  options: UseAccountDeletionAdminOptions = {}
): UseAccountDeletionAdminResult {
  const { enabled = true } = options;

  const [requests, setRequests] = useState<
    AccountDeletionAdminResponse[]
  >([]);

  const [filters, setFilters] =
    useState<AccountDeletionAdminFilters>(
      INITIAL_FILTERS
    );

  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionState, setActionState] =
    useState<AccountDeletionActionState>(
      INITIAL_ACTION_STATE
    );

  const loadRequests = useCallback(
    async (showFullLoading = true): Promise<void> => {
      if (!enabled) {
        setLoading(false);
        return;
      }

      if (showFullLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const response =
          await getPendingAccountDeletionRequests();

        setRequests(sortRequests(response));
      } catch (loadError: unknown) {
        const message = getApiErrorMessage(
          loadError,
          "No fue posible cargar las solicitudes de eliminación."
        );

        setError(message);

        if (showFullLoading) {
          setRequests([]);
        }

        throw new Error(message);
      } finally {
        if (showFullLoading) {
          setLoading(false);
        }
      }
    },
    [enabled]
  );

  const refreshRequests =
    useCallback(async (): Promise<void> => {
      if (!enabled || refreshing) {
        return;
      }

      setRefreshing(true);

      try {
        await loadRequests(false);
      } finally {
        setRefreshing(false);
      }
    }, [enabled, loadRequests, refreshing]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void loadRequests(true).catch(() => {
      /*
       * El error queda disponible en `error`.
       * Se evita una promesa rechazada sin manejar durante el montaje.
       */
    });
  }, [enabled, loadRequests]);

  const runAction = useCallback(
    async (
      solicitudId: number,
      action:
        | "start-review"
        | "approve"
        | "reject"
        | "process",
      execute: () => Promise<AccountDeletionActionResponse>
    ): Promise<AccountDeletionActionResponse> => {
      if (actionState.loading) {
        throw new Error(
          "Ya existe una operación administrativa en curso."
        );
      }

      setActionState({
        solicitudId,
        action,
        loading: true,
      });

      setError(null);

      try {
        const response = await execute();

        await loadRequests(false);

        return response;
      } catch (actionError: unknown) {
        const message = getApiErrorMessage(
          actionError,
          "No fue posible completar la operación."
        );

        setError(message);
        throw new Error(message);
      } finally {
        setActionState(INITIAL_ACTION_STATE);
      }
    },
    [actionState.loading, loadRequests]
  );

  const startReview = useCallback(
    async (
      solicitudId: number
    ): Promise<AccountDeletionActionResponse> => {
      const request = requests.find(
        (item) => item.id === solicitudId
      );

      if (!request) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      if (
        !canStartAccountDeletionReview(request.estado)
      ) {
        throw new Error(
          "Solo una solicitud confirmada puede pasar a revisión."
        );
      }

      return runAction(
        solicitudId,
        "start-review",
        () =>
          startAccountDeletionReview(solicitudId)
      );
    },
    [requests, runAction]
  );

  const approveRequest = useCallback(
    async (
      solicitudId: number,
      observacion?: string
    ): Promise<AccountDeletionActionResponse> => {
      const request = requests.find(
        (item) => item.id === solicitudId
      );

      if (!request) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      if (
        !canResolveAccountDeletionRequest(request.estado)
      ) {
        throw new Error(
          "Solo una solicitud en revisión puede aprobarse."
        );
      }

      return runAction(
        solicitudId,
        "approve",
        () =>
          approveAccountDeletionRequest(
            solicitudId,
            observacion?.trim() || undefined
          )
      );
    },
    [requests, runAction]
  );

  const rejectRequest = useCallback(
    async (
      solicitudId: number,
      observacion?: string
    ): Promise<AccountDeletionActionResponse> => {
      const request = requests.find(
        (item) => item.id === solicitudId
      );

      if (!request) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      if (
        !canResolveAccountDeletionRequest(request.estado)
      ) {
        throw new Error(
          "Solo una solicitud en revisión puede rechazarse."
        );
      }

      return runAction(
        solicitudId,
        "reject",
        () =>
          rejectAccountDeletionRequest(
            solicitudId,
            observacion?.trim() || undefined
          )
      );
    },
    [requests, runAction]
  );

  const processRequest = useCallback(
    async (
      solicitudId: number
    ): Promise<AccountDeletionActionResponse> => {
      const request = requests.find(
        (item) => item.id === solicitudId
      );

      if (!request) {
        throw new Error(
          "No se encontró la solicitud seleccionada."
        );
      }

      if (
        !canProcessAccountDeletionRequest(request.estado)
      ) {
        throw new Error(
          "Solo una solicitud aprobada puede procesarse definitivamente."
        );
      }

      return runAction(
        solicitudId,
        "process",
        () =>
          processAccountDeletionRequest(solicitudId)
      );
    },
    [requests, runAction]
  );

  const filteredRequests = useMemo(() => {
    const search = normalizeText(filters.search);

    return requests.filter((request) => {
      const matchesStatus =
        filters.status === "Todas" ||
        request.estado === filters.status;

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableText = [
        request.id.toString(),
        request.usuarioId.toString(),
        request.nombreUsuario,
        request.emailOriginal,
        request.estado,
        request.motivo,
        request.observacionAdministrador,
      ]
        .map(normalizeText)
        .join(" ");

      return searchableText.includes(search);
    });
  }, [filters, requests]);

  const confirmedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.estado === "Confirmada"
      ).length,
    [requests]
  );

  const underReviewCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.estado === "EnRevision"
      ).length,
    [requests]
  );

  const approvedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.estado === "Aprobada"
      ).length,
    [requests]
  );

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({
      ...current,
      search: value,
    }));
  }, []);

  const setStatusFilter = useCallback(
    (
      value:
        | AccountDeletionRequestStatusName
        | "Todas"
    ) => {
      setFilters((current) => ({
        ...current,
        status: value,
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const isActionLoading = useCallback(
    (
      solicitudId: number,
      action?:
        | "start-review"
        | "approve"
        | "reject"
        | "process"
    ): boolean => {
      if (
        !actionState.loading ||
        actionState.solicitudId !== solicitudId
      ) {
        return false;
      }

      if (!action) {
        return true;
      }

      return actionState.action === action;
    },
    [actionState]
  );

  return {
    requests,
    filteredRequests,

    loading,
    refreshing,
    error,

    filters,
    actionState,

    totalRequests: requests.length,
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

    isActionLoading,
  };
}