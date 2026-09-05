import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiClient } from "../api/apiClient";

type RegisterPushParams = {
  usuarioId: number;
  rolActivo: string;
  idempotencyKey?: string | null;
};

const PUSH_CACHE_KEY =
  "last_registered_push_token";

const isDevelopment = __DEV__;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync({
  usuarioId,
  rolActivo,
}: RegisterPushParams): Promise<string | null> {
  if (!Device.isDevice) {
    if (isDevelopment) {
      console.log(
        "Push cancelado: se requiere un dispositivo físico."
      );
    }

    return null;
  }

  if (usuarioId <= 0 || !rolActivo.trim()) {
    throw new Error(
      "No se pudo identificar al usuario o al rol activo."
    );
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "default",
      {
        name: "Lucky",
        description:
          "Notificaciones de entradas, órdenes y eventos.",
        importance:
          Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E50914",
        sound: "default",
      }
    );
  }

  const existingPermission =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingPermission.status;

  if (finalStatus !== "granted") {
    const requestedPermission =
      await Notifications.requestPermissionsAsync();

    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      "No se encontró el projectId de EAS."
    );
  }

  let expoPushToken: string;

  try {
    const tokenResult =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    expoPushToken = tokenResult.data;
  } catch (error) {
    if (isDevelopment) {
      console.log(
        "No se pudo obtener ExpoPushToken:",
        error
      );
    }

    throw new Error(
      "No se pudo registrar este dispositivo para recibir notificaciones."
    );
  }

 const cacheValue =
  `${usuarioId}|${rolActivo}|${expoPushToken}`;

/*
 * Siempre sincronizamos el token con la API.
 *
 * El backend debe implementar este endpoint
 * como upsert/idempotente.
 *
 * De esta forma:
 * - reactiva tokens;
 * - actualiza RolActivo;
 * - actualiza UltimoUso;
 * - recupera registros desincronizados.
 */
await apiClient.post(
  "/api/notificaciones/push-token",
  {
    token: expoPushToken,
    plataforma: Platform.OS,
    rolActivo: rolActivo.trim(),
  }
);

await SecureStore.setItemAsync(
  PUSH_CACHE_KEY,
  cacheValue
);

  await SecureStore.setItemAsync(
    PUSH_CACHE_KEY,
    cacheValue
  );

  if (isDevelopment) {
    console.log(
      "Push token registrado correctamente."
    );
  }

  return expoPushToken;
}

export async function clearPushTokenRegistrationCache() {
  await SecureStore.deleteItemAsync(
    PUSH_CACHE_KEY
  );
}

export async function unregisterCurrentPushTokenAsync() {
  try {
    await apiClient.post(
      "/api/notificaciones/push-token/desactivar"
    );
  } catch (error) {
    if (isDevelopment) {
      console.log(
        "No se pudo desactivar push token:",
        error
      );
    }
  } finally {
    await clearPushTokenRegistrationCache();
  }
}