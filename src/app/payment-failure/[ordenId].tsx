import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function PaymentFailureScreen() {
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
      <Text
        style={{
          color: "#FF4D57",
          fontSize: 24,
          fontWeight: "900",
        }}
      >
        Pago rechazado
      </Text>
    </View>
  );
}