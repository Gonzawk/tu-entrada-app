import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { getHomeByRole } from "../auth/roleRedirect";

export default function Index() {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

if (!user) {
  return <Redirect href={"/auth/login" as never} />;
}

if (user.roles.length > 1 && !activeRole) {
  return <Redirect href={"/role-select" as never} />;
}

if (activeRole) {
  return <Redirect href={getHomeByRole(activeRole) as never} />;
}

return <Redirect href={getHomeByRole(user.roles[0]) as never} />;
}