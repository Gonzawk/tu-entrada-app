import { Alert, Linking } from "react-native";

function normalizeWhatsappNumber(phone?: string | null) {
  if (!phone) return null;

  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned) return null;

  if (cleaned.startsWith("549")) return cleaned;

  if (cleaned.startsWith("54")) {
    return `549${cleaned.slice(2)}`;
  }

  return `549${cleaned}`;
}

export async function openWhatsapp(
  phone?: string | null,
  rrppName?: string | null
) {
  try {
    const number = normalizeWhatsappNumber(phone);

    if (!number) {
      Alert.alert("Sin contacto", "Este RRPP no tiene teléfono cargado.");
      return;
    }

    const message = encodeURIComponent(
      `Hola ${rrppName ?? ""}, te contacto por mi compra de entradas.`
    );

    const url = `https://wa.me/${number}?text=${message}`;

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Error", "No se pudo abrir WhatsApp.");
      return;
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert("Error", "No se pudo abrir WhatsApp.");
  }
}