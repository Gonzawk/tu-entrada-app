import { unregisterCurrentPushTokenAsync } from "@/services/pushNotifications";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/AuthContext";
import { BRANDING } from "../../constants/branding";
import {
  APP_MENU_ITEMS,
  PROFILE_ROUTE,
} from "../../constants/navigation";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
  scroll?: boolean;
}

type AdminSectionKey =
  | "usuarios"
  | "eventos"
  | "operaciones"
  | "configuracion";

const CLOSED_ADMIN_SECTIONS: Record<AdminSectionKey, boolean> = {
  usuarios: false,
  eventos: false,
  operaciones: false,
  configuracion: false,
};

const SECTION_LABELS: Record<AdminSectionKey, string> = {
  usuarios: "Usuarios",
  eventos: "Eventos y tickets",
  operaciones: "Operación",
  configuracion: "Configuración",
};

export function AppLayout({
  title,
  children,
  scroll = true,
}: AppLayoutProps) {
  const { user, logout, activeRole } = useAuth();
  const insets = useSafeAreaInsets();

  const [menuOpen, setMenuOpen] = useState(false);
  const [adminSectionsOpen, setAdminSectionsOpen] = useState(
    CLOSED_ADMIN_SECTIONS
  );

  const visibleItems = useMemo(
    () =>
      activeRole
        ? APP_MENU_ITEMS.filter((item) =>
            item.roles.includes(activeRole)
          )
        : [],
    [activeRole]
  );

  const isAdmin =
    activeRole === "Admin" || activeRole === "SuperAdmin";

  const profileItem = visibleItems.find(
    (item) => item.route === PROFILE_ROUTE
  );

  const visibleItemsWithoutProfile = visibleItems.filter(
    (item) => item.route !== PROFILE_ROUTE
  );

  const adminSections: Record<
    AdminSectionKey,
    typeof visibleItemsWithoutProfile
  > = {
    usuarios: visibleItemsWithoutProfile.filter((item) =>
      [
        "/admin/users",
        "/admin/rrpps/rrpps",
        "/admin/door/door-users",
        "/admin/ventanilla",
        "/admin/ventanilla/ventanilla-users",
        "/admin/barra/barra-users",
      ].includes(item.route)
    ),

    eventos: visibleItemsWithoutProfile.filter((item) =>
      [
        "/admin/events/events",
        "/admin/tickets/generate-tickets",
        "/admin/tickets/manual-tickets",
        "/admin/tickets/create-multi-ticket",
        "/admin/cumpleanios/birthday-requests",
      ].includes(item.route)
    ),

    operaciones: visibleItemsWithoutProfile.filter((item) =>
      [
        "/admin/settlements",
        "/admin/drinks",
        "/admin/cajas/cajas",
        "/admin/estadisticas/stats",
        "/admin/fraudes/fraud-alerts",
      ].includes(item.route)
    ),

    configuracion: visibleItemsWithoutProfile.filter((item) =>
      ["/admin/system-config",
        "/admin/mercadopago/",
        "/admin/account-deletion"
      ].includes(item.route)
    ),
  };

  const adminSectionRoutes = Object.values(adminSections)
    .flat()
    .map((item) => item.route);

  const normalItems = isAdmin
    ? visibleItemsWithoutProfile.filter(
        (item) => !adminSectionRoutes.includes(item.route)
      )
    : visibleItems;

  function openMenu() {
    setAdminSectionsOpen(CLOSED_ADMIN_SECTIONS);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleAdminSection(section: AdminSectionKey) {
    setAdminSectionsOpen((previous) => ({
      ...previous,
      [section]: !previous[section],
    }));
  }

  async function handleLogout() {
    closeMenu();

    try {
      await unregisterCurrentPushTokenAsync();
    } finally {
      await logout();
    }
  }

  function goTo(route: string) {
    closeMenu();
    router.push(route as never);
  }

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          <Image
            source={BRANDING.logo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightContainer}>
          <Pressable
            style={styles.menuButton}
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú principal"
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </Pressable>
        </View>
      </View>

      {scroll ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingBottom:
                Math.max(insets.bottom, 16) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.content,
            styles.contentContainer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {children}
        </View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Pressable
            style={[
              styles.drawer,
              {
                paddingTop: Math.max(insets.top, 18),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.drawerHeaderFixed}>
              <Image
                source={BRANDING.logo}
                style={styles.drawerLogo}
                resizeMode="contain"
              />

              <Text style={styles.drawerTitle}>
                {BRANDING.appName}
              </Text>

              <Text style={styles.userName} numberOfLines={1}>
                {user?.nombreCompleto ?? "Usuario"}
              </Text>

              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>

              {isAdmin && profileItem ? (
                <Pressable
                  style={styles.adminProfileButton}
                  onPress={() => goTo(profileItem.route)}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir mi perfil"
                >
                  <Text style={styles.adminProfileButtonText}>
                    Mi perfil
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.separator} />

              {normalItems.map((item, index) => (
                <Pressable
                  key={`${item.route}-${item.label}-${index}`}
                  style={styles.menuItem}
                  onPress={() => goTo(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Text style={styles.menuItemText}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}

              {isAdmin ? (
                <>
                  <View style={styles.separator} />

                  {(Object.keys(adminSections) as AdminSectionKey[]).map(
                    (key) => {
                      const items = adminSections[key];

                      if (items.length === 0) {
                        return null;
                      }

                      const isOpen = adminSectionsOpen[key];

                      return (
                        <View key={key}>
                          <Pressable
                            style={styles.sectionButton}
                            onPress={() =>
                              toggleAdminSection(key)
                            }
                            accessibilityRole="button"
                            accessibilityState={{ expanded: isOpen }}
                          >
                            <Text style={styles.sectionButtonText}>
                              {SECTION_LABELS[key]}
                            </Text>

                            <Text style={styles.sectionButtonIcon}>
                              {isOpen ? "−" : "+"}
                            </Text>
                          </Pressable>

                          {isOpen
                            ? items.map((item, index) => (
                                <Pressable
                                  key={`${item.route}-${index}`}
                                  style={styles.subMenuItem}
                                  onPress={() => goTo(item.route)}
                                  accessibilityRole="button"
                                  accessibilityLabel={item.label}
                                >
                                  <Text style={styles.subMenuItemText}>
                                    {item.label}
                                  </Text>
                                </Pressable>
                              ))
                            : null}
                        </View>
                      );
                    }
                  )}
                </>
              ) : null}

              <View style={styles.separator} />

              {user && user.roles.length > 1 ? (
                <Pressable
                  style={styles.changeRoleButton}
                  onPress={() => {
                    closeMenu();
                    router.push("/role-select" as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar rol actual"
                >
                  <Text style={styles.changeRoleText}>
                    Cambiar rol actual: {activeRole}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                style={styles.logoutButton}
                onPress={() => void handleLogout()}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
              >
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  leftContainer: {
    width: 54,
    alignItems: "flex-start",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
  },
  rightContainer: {
    width: 54,
    alignItems: "flex-end",
  },
  logo: {
    width: 42,
    height: 42,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "flex-end",
  },
  drawer: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: "#111111",
    paddingHorizontal: 18,
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
  },
  drawerHeaderFixed: {
    alignItems: "center",
    paddingBottom: 14,
  },
  drawerLogo: {
    width: 86,
    height: 86,
  },
  drawerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  userName: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: 10,
    maxWidth: "100%",
  },
  userEmail: {
    color: "#BDBDBD",
    marginTop: 4,
    maxWidth: "100%",
  },
  adminProfileButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  adminProfileButtonText: {
    color: "#DADADA",
    fontSize: 13,
    fontWeight: "800",
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingBottom: 24,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 14,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 10,
  },
  menuItemText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  profileMenuItem: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.22)",
  },
  profileMenuItemText: {
    color: "#FFD166",
  },
  sectionButton: {
    backgroundColor: "rgba(255,209,102,0.12)",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.18)",
  },
  sectionButtonText: {
    color: "#FFD166",
    fontWeight: "900",
  },
  sectionButtonIcon: {
    color: "#FFD166",
    fontSize: 22,
    fontWeight: "900",
  },
  subMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255,209,102,0.45)",
  },
  subMenuItemText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  changeRoleButton: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,209,102,0.14)",
    marginBottom: 10,
  },
  changeRoleText: {
    color: "#FFD166",
    fontWeight: "900",
  },
  logoutButton: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(229,9,20,0.18)",
  },
  logoutText: {
    color: "#FF4D57",
    fontWeight: "900",
  },
});
