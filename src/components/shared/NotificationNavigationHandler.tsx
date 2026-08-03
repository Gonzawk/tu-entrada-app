import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

export function NotificationNavigationHandler() {
  useEffect(() => {
    function handleNotificationResponse(
      response:
        Notifications.NotificationResponse
    ) {
      const data =
        response.notification.request.content
          .data;

      const type =
        typeof data?.type === "string"
          ? data.type
          : "";

      if (
        type === "orden_confirmada" &&
        data.ordenId
      ) {
        router.push({
          pathname: "/user/order-detail",
          params: {
            ordenId: String(data.ordenId),
          },
        } as never);

        return;
      }

      if (
        type === "orden_pendiente" &&
        data.ordenId
      ) {
        router.push({
          pathname: "/rrpp/order-detail",
          params: {
            ordenId: String(data.ordenId),
          },
        } as never);

        return;
      }

      if (
        type === "evento_reprogramado" &&
        data.eventoId
      ) {
        router.push({
          pathname: "/user/event-detail",
          params: {
            eventoId: String(
              data.eventoId
            ),
          },
        } as never);
      }
    }

    const subscription =
      Notifications
        .addNotificationResponseReceivedListener(
          handleNotificationResponse
        );

    void Notifications
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(
            response
          );
        }
      });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}