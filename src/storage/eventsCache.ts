import * as SecureStore from "expo-secure-store";
import { EntradaDisponible, EventoActivo } from "../types/events";

const EVENTS_KEY = "cache_user_events";
const EVENT_DETAIL_PREFIX = "cache_event_detail_";

export async function saveEventsCache(items: EventoActivo[]) {
  await SecureStore.setItemAsync(EVENTS_KEY, JSON.stringify(items.slice(0, 5)));
}

export async function getEventsCache(): Promise<EventoActivo[]> {
  const raw = await SecureStore.getItemAsync(EVENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveEventDetailCache(
  eventoId: number,
  data: {
    evento: any;
    entradas: EntradaDisponible[];
  }
) {
  await SecureStore.setItemAsync(
    `${EVENT_DETAIL_PREFIX}${eventoId}`,
    JSON.stringify(data)
  );
}

export async function getEventDetailCache(eventoId: number): Promise<{
  evento: any;
  entradas: EntradaDisponible[];
} | null> {
  const raw = await SecureStore.getItemAsync(`${EVENT_DETAIL_PREFIX}${eventoId}`);
  return raw ? JSON.parse(raw) : null;
}