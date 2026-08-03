import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function PaymentSuccessScreen() {
  const { ordenId } = useLocalSearchParams<{ ordenId: string }>();

  useEffect(() => {
    if (!ordenId) return;

    router.replace({
      pathname: "/user/drink-order-detail",
      params: { ordenId },
    } as never);
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
      <ActivityIndicator color="#20D67B" />
      <Text style={{ color: "#fff", marginTop: 16, fontWeight: "900" }}>
        Redirigiendo a tu orden...
      </Text>
    </View>
  );
}