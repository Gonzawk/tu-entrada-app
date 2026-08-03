import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function PaymentPendingScreen() {
  const { ordenId } = useLocalSearchParams<{ ordenId: string }>();

  useEffect(() => {
    if (!ordenId) return;

    const timeout = setTimeout(() => {
      router.replace({
        pathname: "/user/drink-order-detail",
        params: { ordenId },
      } as never);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [ordenId]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color="#FFD166" />

      <Text
        style={{
          color: "#FFFFFF",
          marginTop: 18,
          fontSize: 24,
          fontWeight: "900",
        }}
      >
        Pago pendiente
      </Text>
    </View>
  );
}