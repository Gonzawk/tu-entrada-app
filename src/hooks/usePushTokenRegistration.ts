import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

export function usePushTokenRegistration() {
  const { user, activeRole } = useAuth();

  const lastRegistrationKey = useRef<string | null>(null);

  useEffect(() => {
    async function register() {
      if (!user?.userId || !activeRole) return;

      const key = `${user.userId}-${activeRole}`;

      if (lastRegistrationKey.current === key) return;

      lastRegistrationKey.current = key;

      const token = await registerForPushNotificationsAsync({
        usuarioId: user.userId,
        rolActivo: activeRole,
      });

      console.log("Expo push token registrado:", token);
    }

    register().catch((error) => {
      console.log("Error registrando push token:", error);
    });
  }, [user?.userId, activeRole]);
}