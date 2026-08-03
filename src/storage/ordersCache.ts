import * as SecureStore from "expo-secure-store";
import { MiOrdenResumen } from "../types/orders";

const KEY = "cache_user_orders";

export async function saveOrdersCache(items: MiOrdenResumen[]) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(items.slice(0, 5)));
}

export async function getOrdersCache(): Promise<MiOrdenResumen[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearOrdersCache() {
  await SecureStore.deleteItemAsync(KEY);
}