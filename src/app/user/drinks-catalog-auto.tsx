import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { getProximoEventoParaBebidasApi } from "../../api/eventsApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";

export default function DrinksCatalogAutoScreen() {
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (redirectStarted.current) {
      return;
    }

    redirectStarted.current = true;

    async function redirect() {
      try {
        const evento = await getProximoEventoParaBebidasApi();

        if (evento?.eventoId) {
          router.replace({
            pathname: "/user/drinks-catalog",
            params: {
              eventoId: String(evento.eventoId),
            },
          } as never);

          return;
        }

        /*
         * No existe evento en curso o próximo.
         * Abrimos el catálogo general.
         */
        router.replace("/user/drinks-catalog" as never);
      } catch (error: any) {
        const status = error?.response?.status;

        /*
         * Un 404 significa que no hay evento disponible.
         * No es un error del sistema: mostramos el catálogo global.
         */
        if (status === 404) {
          router.replace("/user/drinks-catalog" as never);
          return;
        }

        Alert.alert(
          "No se pudo cargar el catálogo",
          getApiErrorMessage(
            error,
            "Ocurrió un error al buscar el evento disponible.",
          ),
          [
            {
              text: "Volver",
              onPress: () => router.back(),
            },
            {
              text: "Ver catálogo general",
              onPress: () =>
                router.replace("/user/drinks-catalog" as never),
            },
          ],
        );
      }
    }

    void redirect();
  }, []);

  return (
    <RoleGuard
      allowedRoles={["Usuario", "RRPP", "Admin", "SuperAdmin"]}
    >
      <AppLayout title="Bebidas">
        <View
          style={{
            alignItems: "center",
            paddingTop: 60,
          }}
        >
          <ActivityIndicator color="#E50914" size="large" />

          <Text
            style={{
              color: "#BDBDBD",
              marginTop: 14,
              fontWeight: "700",
            }}
          >
            Buscando catálogo disponible...
          </Text>
        </View>
      </AppLayout>
    </RoleGuard>
  );
}

function getApiErrorMessage(
  error: any,
  fallback: string,
): string {
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