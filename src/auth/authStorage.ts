import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "tuentrada_token";
const USER_KEY = "tuentrada_user";
const ACTIVE_ROLE_KEY = "tuentrada_active_role";

export async function saveToken(
  token: string
): Promise<void> {
  await SecureStore.setItemAsync(
    TOKEN_KEY,
    token
  );
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(
    TOKEN_KEY
  );
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(
    TOKEN_KEY
  );
}

export async function saveUser(
  user: unknown
): Promise<void> {
  await SecureStore.setItemAsync(
    USER_KEY,
    JSON.stringify(user)
  );
}

export async function getUser<T>(): Promise<T | null> {
  const value =
    await SecureStore.getItemAsync(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    await removeUser();
    return null;
  }
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(
    USER_KEY
  );
}

export async function saveActiveRole(
  role: string
): Promise<void> {
  await SecureStore.setItemAsync(
    ACTIVE_ROLE_KEY,
    role
  );
}

export async function getActiveRole(): Promise<
  string | null
> {
  return await SecureStore.getItemAsync(
    ACTIVE_ROLE_KEY
  );
}

export async function removeActiveRole(): Promise<void> {
  await SecureStore.deleteItemAsync(
    ACTIVE_ROLE_KEY
  );
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    removeToken(),
    removeUser(),
    removeActiveRole(),
  ]);
}