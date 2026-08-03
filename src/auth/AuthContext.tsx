import { router } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AppState,
  AppStateStatus,
} from "react-native";
import {
  loginApi,
  registerApi,
} from "../api/authApi";
import { disconnectRealtime } from "../services/realtimeService";
import {
  AuthUser,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  UserRole,
} from "../types/auth";
import {
  clearUnauthorizedHandler,
  resetUnauthorizedState,
  setUnauthorizedHandler,
} from "./authEvents";
import {
  clearAuthStorage,
  getActiveRole,
  getToken,
  getUser,
  saveActiveRole,
  saveToken,
  saveUser,
} from "./authStorage";
import { getDefaultRole } from "./roleRedirect";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  activeRole: UserRole | null;

  login: (
    data: LoginRequest
  ) => Promise<AuthUser>;

  register: (
    data: RegisterRequest
  ) => Promise<RegisterResponse>;

  logout: () => Promise<void>;

  setRole: (
    role: UserRole
  ) => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );

const EXPIRATION_TOLERANCE_MS =
  30 * 1000;

function hasValidExpiration(
  expiresAtUtc?: string
): boolean {
  if (!expiresAtUtc) {
    return false;
  }

  const expirationTime =
    new Date(expiresAtUtc).getTime();

  if (!Number.isFinite(expirationTime)) {
    return false;
  }

  return (
    expirationTime >
    Date.now() + EXPIRATION_TOLERANCE_MS
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activeRole, setActiveRole] =
    useState<UserRole | null>(null);

  useEffect(() => {
    void loadSession();

    setUnauthorizedHandler(
      handleUnauthorized
    );

    const subscription =
      AppState.addEventListener(
        "change",
        handleAppStateChange
      );

    return () => {
      clearUnauthorizedHandler();
      subscription.remove();
    };
  }, []);

  async function handleAppStateChange(
    state: AppStateStatus
  ) {
    if (state !== "active") {
      return;
    }

    try {
      const [storedUser, storedToken] =
        await Promise.all([
          getUser<AuthUser>(),
          getToken(),
        ]);

      if (!storedUser || !storedToken) {
        return;
      }

      if (
        !hasValidExpiration(
          storedUser.expiresAtUtc
        )
      ) {
        await handleUnauthorized();
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          "Error validando sesión al reactivar la app:",
          error
        );
      }

      await handleUnauthorized();
    }
  }

  async function loadSession() {
    try {
      const [
        storedUser,
        storedToken,
        storedRole,
      ] = await Promise.all([
        getUser<AuthUser>(),
        getToken(),
        getActiveRole(),
      ]);

      if (!storedUser || !storedToken) {
        await clearAuthStorage();

        setUser(null);
        setActiveRole(null);

        return;
      }

      if (
        !hasValidExpiration(
          storedUser.expiresAtUtc
        )
      ) {
        await clearAuthStorage();

        setUser(null);
        setActiveRole(null);

        return;
      }

      const roles =
        storedUser.roles ?? [];

      if (roles.length === 0) {
        await clearAuthStorage();

        setUser(null);
        setActiveRole(null);

        return;
      }

      /*
       * El token almacenado por separado es la
       * fuente utilizada por Axios y SignalR.
       */
      const sessionUser: AuthUser = {
        ...storedUser,
        token: storedToken,
      };

      const validRole =
        storedRole &&
        roles.includes(
          storedRole as UserRole
        )
          ? (storedRole as UserRole)
          : getDefaultRole(roles);

      setUser(sessionUser);
      setActiveRole(validRole);

      await Promise.all([
        saveUser(sessionUser),
        saveActiveRole(validRole),
      ]);

      resetUnauthorizedState();
    } catch (error) {
      console.log(
        "Error al recuperar sesión:",
        error
      );

      await clearAuthStorage();

      setUser(null);
      setActiveRole(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(
    data: LoginRequest
  ): Promise<AuthUser> {
    const result = await loginApi(
      data.email,
      data.password
    );

    if (!result?.token) {
      throw new Error(
        "La API no devolvió un token válido."
      );
    }

    if (!result?.roles?.length) {
      throw new Error(
        "El usuario no tiene roles asignados."
      );
    }

    if (
      !hasValidExpiration(
        result.expiresAtUtc
      )
    ) {
      throw new Error(
        "La API devolvió una fecha de expiración inválida."
      );
    }

    const defaultRole =
      getDefaultRole(result.roles);

    /*
     * Se persiste primero para que las peticiones
     * siguientes ya encuentren el token.
     */
    await Promise.all([
      saveToken(result.token),
      saveUser(result),
      saveActiveRole(defaultRole),
    ]);

    setUser(result);
    setActiveRole(defaultRole);

    resetUnauthorizedState();

    return result;
  }

  async function register(
    data: RegisterRequest
  ): Promise<RegisterResponse> {
    return await registerApi(data);
  }

  async function clearCurrentSession() {
    /*
     * La conexión debe cerrarse antes de eliminar
     * el token que utiliza SignalR.
     */
    await disconnectRealtime();

    await clearAuthStorage();

    setUser(null);
    setActiveRole(null);
  }

  async function logout() {
    await clearCurrentSession();

    router.replace(
      "/auth/login" as never
    );
  }

  async function handleUnauthorized() {
    await clearCurrentSession();

    router.replace(
      "/auth/login" as never
    );
  }

  async function setRole(
    role: UserRole
  ) {
    if (!user) {
      throw new Error(
        "No existe una sesión activa."
      );
    }

    if (!user.roles.includes(role)) {
      throw new Error(
        "El usuario no tiene asignado el rol seleccionado."
      );
    }

    await saveActiveRole(role);

    setActiveRole(role);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated:
          Boolean(user),
        activeRole,
        setRole,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe usarse dentro de AuthProvider"
    );
  }

  return context;
}