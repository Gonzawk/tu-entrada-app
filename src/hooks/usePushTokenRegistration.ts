import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  registerForPushNotificationsAsync,
} from "../services/pushNotifications";

export function usePushTokenRegistration() {
  const {
    user,
    activeRole,
  } = useAuth();

  const lastRegistrationKey =
    useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (
        !user?.userId ||
        !activeRole
      ) {
        return;
      }

      const key =
        `${user.userId}-${activeRole}`;

      if (
        lastRegistrationKey.current ===
        key
      ) {
        return;
      }

      try {
        const token =
          await registerForPushNotificationsAsync({
            usuarioId:
              user.userId,

            rolActivo:
              activeRole,
          });

        /*
         * Marcamos como registrado
         * solamente DESPUÉS de que
         * el proceso haya terminado bien.
         */
        if (
          !cancelled &&
          token
        ) {
          lastRegistrationKey.current =
            key;
        }

        if (__DEV__) {
          console.log(
            "Expo push token registrado:",
            token
          );
        }
      } catch (error) {
        /*
         * Permitimos que pueda volver
         * a intentarse.
         */
        if (!cancelled) {
          lastRegistrationKey.current =
            null;
        }

        console.log(
          "Error registrando push token:",
          error
        );
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [
    user?.userId,
    activeRole,
  ]);
}