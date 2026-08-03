import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { UserRole } from "../../types/auth";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#050505",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#E50914" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/auth/login" as never} />;
  }

  if (!activeRole || !allowedRoles.includes(activeRole)) {
    return <Redirect href={"/role-select" as never} />;
  }

  return <>{children}</>;
}