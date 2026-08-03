import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../auth/AuthContext";
import { NotificationNavigationHandler } from "../components/shared/NotificationNavigationHandler";
import { usePushTokenRegistration } from "../hooks/usePushTokenRegistration";

function RootContent() {
  usePushTokenRegistration();

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationNavigationHandler />
        <StatusBar style="light" backgroundColor="#000000" />
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}