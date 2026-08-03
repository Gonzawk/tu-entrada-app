import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function EmailVerifiedScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/auth/login");
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 28,
          fontWeight: "900",
          marginBottom: 12,
        }}
      >
        Cuenta confirmada
      </Text>

      <Text
        style={{
          color: "#BDBDBD",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Ya podés iniciar sesión.
      </Text>

      <ActivityIndicator color="#E50914" />
    </View>
  );
}