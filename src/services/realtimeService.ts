import * as signalR from "@microsoft/signalr";
import { apiClient } from "../api/apiClient";
import { getToken } from "../auth/authStorage";

type RealtimeHandlers = {
  onNuevaOrdenRRPP?: () => void;
  onOrdenConfirmada?: (data: any) => void;
  onTicketUsado?: (data: any) => void;
  onStockActualizado?: (data: any) => void;
  onBebidaOrdenEntregada?: (data: any) => void;
  onBebidaOrdenPagada?: (data: any) => void;
};

let connection: signalR.HubConnection | null =
  null;

let connectionPromise:
  Promise<signalR.HubConnection> | null = null;

let currentUserId: number | null = null;

let currentHandlers: RealtimeHandlers = {};

function mergeHandlers(
  handlers: RealtimeHandlers
) {
  currentHandlers = {
    ...currentHandlers,
    ...handlers,
  };
}

function registerListeners(
  conn: signalR.HubConnection
) {
  conn.off("nueva_orden_rrpp");
  conn.off("orden_confirmada");
  conn.off("ticket_usado");
  conn.off("stock_actualizado");
  conn.off("bebida_orden_entregada");
  conn.off("bebida_orden_pagada");

  conn.on("nueva_orden_rrpp", () => {
    currentHandlers.onNuevaOrdenRRPP?.();
  });

  conn.on("orden_confirmada", (data) => {
    currentHandlers.onOrdenConfirmada?.(data);
  });

  conn.on("ticket_usado", (data) => {
    currentHandlers.onTicketUsado?.(data);
  });

  conn.on("stock_actualizado", (data) => {
    currentHandlers.onStockActualizado?.(data);
  });

  conn.on(
    "bebida_orden_entregada",
    (data) => {
      currentHandlers
        .onBebidaOrdenEntregada?.(data);
    }
  );

  conn.on(
    "bebida_orden_pagada",
    (data) => {
      currentHandlers
        .onBebidaOrdenPagada?.(data);
    }
  );
}

async function joinUserGroup(
  usuarioId: number
) {
  if (
    !connection ||
    connection.state !==
      signalR.HubConnectionState.Connected
  ) {
    return;
  }

  await connection.invoke(
    "JoinUserGroup",
    usuarioId
  );

  currentUserId = usuarioId;
}

async function getRealtimeToken(): Promise<string> {
  const currentToken = await getToken();

  if (!currentToken?.trim()) {
    throw new Error(
      "No existe una sesión activa para SignalR."
    );
  }

  return currentToken;
}

export async function connectRealtime(
  usuarioId: number,
  token: string,
  handlers: RealtimeHandlers
) {
  if (usuarioId <= 0) {
    throw new Error(
      "El usuario de SignalR no es válido."
    );
  }

  /*
   * Se conserva esta validación para mantener
   * compatibilidad con los llamados existentes.
   */
  if (!token?.trim()) {
    throw new Error(
      "No se recibió token para SignalR."
    );
  }

  mergeHandlers(handlers);

  if (connection) {
    registerListeners(connection);

    if (
      connection.state ===
        signalR.HubConnectionState.Connected &&
      currentUserId !== usuarioId
    ) {
      await joinUserGroup(usuarioId);
    }

    if (
      connection.state ===
      signalR.HubConnectionState.Connected
    ) {
      return connection;
    }
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const apiBaseUrl =
    apiClient.defaults.baseURL
      ?.replace(/\/+$/, "");

  if (!apiBaseUrl) {
    throw new Error(
      "No está configurada la URL de la API."
    );
  }

  const newConnection =
    new signalR.HubConnectionBuilder()
      .withUrl(
        `${apiBaseUrl}/hubs/app`,
        {
          /*
           * SignalR solicita el token nuevamente
           * durante una reconexión.
           */
          accessTokenFactory:
            getRealtimeToken,
        }
      )
      .withAutomaticReconnect([
        0,
        2000,
        5000,
        10000,
        30000,
      ])
      .configureLogging(
        __DEV__
          ? signalR.LogLevel.Information
          : signalR.LogLevel.Warning
      )
      .build();

  connection = newConnection;

  registerListeners(newConnection);

  newConnection.onreconnected(
    async () => {
      if (!currentUserId) {
        return;
      }

      try {
        await joinUserGroup(
          currentUserId
        );
      } catch (error) {
        if (__DEV__) {
          console.log(
            "Error re-joining SignalR group:",
            error
          );
        }
      }
    }
  );

  newConnection.onclose((error) => {
    if (__DEV__ && error) {
      console.log(
        "SignalR desconectado:",
        error
      );
    }
  });

  connectionPromise = (async () => {
    try {
      /*
       * Comprueba que todavía exista un token
       * antes de abrir la conexión.
       */
      await getRealtimeToken();

      await newConnection.start();

      await joinUserGroup(usuarioId);

      return newConnection;
    } catch (error) {
      connection = null;
      currentUserId = null;

      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export async function disconnectRealtime() {
  const currentConnection =
    connection;

  connection = null;
  connectionPromise = null;
  currentUserId = null;
  currentHandlers = {};

  if (!currentConnection) {
    return;
  }

  try {
    await currentConnection.stop();
  } catch (error) {
    if (__DEV__) {
      console.log(
        "Error desconectando SignalR:",
        error
      );
    }
  }
}