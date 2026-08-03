import { createIdempotencyKey } from "@/utils/idempotency";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { abrirCajaApi, cerrarCajaApi, getCajaAbiertaApi } from "../../api/cajasApi";
import { getCargoServicioEntradasApi } from "../../api/configuracionApi";
import { getEventosActivosApi } from "../../api/eventsApi";
import {
  crearVentaVentanillaApi,
  getVentanillaEntradasDisponiblesApi,
} from "../../api/ventanillaApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { Caja, MetodoPagoPresencial } from "../../types/cajas";
import { CargoServicioEntradas } from "../../types/configuracion";
import { EventoActivo } from "../../types/events";
import { VentanillaEntradaDisponible } from "../../types/ventanilla";
import { formatMoney } from "../../utils/formatMoney";

export default function VentanillaScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [caja, setCaja] = useState<Caja | null>(null);
  const [eventos, setEventos] = useState<EventoActivo[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [montoInicial, setMontoInicial] = useState("0");

  const [cargoServicio, setCargoServicio] =
    useState<CargoServicioEntradas | null>(null);

  const [entradas, setEntradas] = useState<VentanillaEntradaDisponible[]>([]);
  const [entradaSeleccionada, setEntradaSeleccionada] =
    useState<VentanillaEntradaDisponible | null>(null);

  const [metodoPago, setMetodoPago] = useState<MetodoPagoPresencial>(1);
  const [generaTicketDigital, setGeneraTicketDigital] = useState(true);

  const [nombreCliente, setNombreCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");

  const [ventaKey, setVentaKey] = useState(() =>
    createIdempotencyKey("venta-ventanilla")
  );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (caja?.eventoId) {
      loadEntradas(caja.eventoId);
    }
  }, [caja?.eventoId]);

  async function load() {
    try {
      setLoading(true);

      const [cajaData, eventosData, cargoData] = await Promise.all([
        getCajaAbiertaApi(2),
        getEventosActivosApi({ page: 1, pageSize: 50, search: "" }),
        getCargoServicioEntradasApi(),
      ]);

      setCaja(cajaData);
      setEventos(eventosData.items ?? []);
      setCargoServicio(cargoData);

      if (cajaData?.eventoId) {
        setEventoId(cajaData.eventoId);
      } else if ((eventosData.items ?? []).length > 0) {
        setEventoId(eventosData.items[0].id);
      }
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo cargar ventanilla.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadEntradas(id: number) {
    try {
      const data = await getVentanillaEntradasDisponiblesApi(id);
      setEntradas(data);
      setEntradaSeleccionada(null);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudieron cargar entradas.")
      );
    }
  }

  async function abrirCaja() {
    try {
      const monto = Number(montoInicial);

      if (!eventoId) {
        Alert.alert("Falta evento", "Seleccioná un evento.");
        return;
      }

      if (Number.isNaN(monto) || monto < 0) {
        Alert.alert("Dato inválido", "El monto inicial no puede ser negativo.");
        return;
      }

      setSaving(true);

      const data = await abrirCajaApi({
        tipoCaja: 2,
        eventoId,
        montoInicial: monto,
        observacionApertura: "Caja ventanilla abierta desde app",
      });

      setCaja(data);
      await loadEntradas(eventoId);
    } catch (e: any) {
      Alert.alert(
        "Error",
        String(e?.response?.data?.message ?? "No se pudo abrir caja.")
      );
    } finally {
      setSaving(false);
    }
  }

  const subtotal = useMemo(() => {
    return entradaSeleccionada?.precio ?? 0;
  }, [entradaSeleccionada]);

  const cargoServicioMonto = useMemo(() => {
    if (!entradaSeleccionada) return 0;
    if (!cargoServicio?.activo) return 0;
    return cargoServicio.monto ?? 0;
  }, [entradaSeleccionada, cargoServicio]);

  const total = useMemo(() => {
    return subtotal + cargoServicioMonto;
  }, [subtotal, cargoServicioMonto]);

  async function confirmarVenta() {
    if (!caja || !entradaSeleccionada) {
      Alert.alert("Faltan datos", "Seleccioná una entrada.");
      return;
    }

    if (saving) return;

    if (generaTicketDigital && !emailCliente.trim()) {
      Alert.alert(
        "Email requerido",
        "Para ticket digital debés ingresar el email del usuario registrado."
      );
      return;
    }

    Alert.alert(
      "Confirmar venta",
      `Entrada: ${formatMoney(subtotal)}
Cargo por servicio: ${formatMoney(cargoServicioMonto)}
Total a cobrar: ${formatMoney(total)}

¿Confirmás cerrar esta venta? Una vez confirmada no podrá modificarse.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setSaving(true);

              const result = await crearVentaVentanillaApi({
                cajaId: caja.id,
                eventoId: caja.eventoId!,
                tandaEntradaId: entradaSeleccionada.tandaEntradaId,
                metodoPago,
                tipoEntrega: generaTicketDigital ? 1 : 4,
                nombreCliente: nombreCliente.trim() || null,
                emailCliente: emailCliente.trim().toLowerCase() || null,
                telefonoCliente: telefonoCliente.trim() || null,
                generaTicketDigital,
                idempotencyKey: ventaKey,
                observacion: generaTicketDigital
                  ? "Venta digital por ventanilla"
                  : "Venta física por ventanilla",
              });

              setEntradaSeleccionada(null);
              setNombreCliente("");
              setEmailCliente("");
              setTelefonoCliente("");
              setVentaKey(createIdempotencyKey("venta-ventanilla"));

              await loadEntradas(caja.eventoId!);

              Alert.alert(
                "Venta registrada",
                result.numeroTicket
                  ? `Ticket generado: ${result.numeroTicket}`
                  : "Venta física registrada en caja."
              );
            } catch (e: any) {
              Alert.alert(
                "Error",
                String(e?.response?.data?.message ?? "No se pudo registrar la venta.")
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  async function cerrarCajaActual() {
    if (!caja) return;

    Alert.alert(
      "Cerrar caja",
      "¿Seguro que querés cerrar la caja? No podrás registrar más ventas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              await cerrarCajaApi(caja.id, {
                observacionCierre: "Caja ventanilla cerrada desde app",
              });

              setCaja(null);
              setEntradas([]);
              setEntradaSeleccionada(null);

              Alert.alert("Correcto", "Caja cerrada.");
            } catch (e: any) {
              Alert.alert(
                "Error",
                String(e?.response?.data?.message ?? "No se pudo cerrar caja.")
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
        <AppLayout title="Ventanilla">
          <ActivityIndicator color="#E50914" style={{ marginTop: 60 }} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Ventanilla", "Admin", "SuperAdmin"]}>
      <AppLayout title="Ventanilla">
        {!caja ? (
          <View style={styles.card}>
            <Text style={styles.title}>Abrir caja de ventanilla</Text>

            {eventos.map((e) => (
              <Pressable
                key={e.id}
                style={[styles.option, eventoId === e.id && styles.optionActive]}
                onPress={() => setEventoId(e.id)}
              >
                <Text style={styles.optionText}>{e.nombre}</Text>
              </Pressable>
            ))}

            <TextInput
              placeholder="Monto inicial"
              placeholderTextColor="#888"
              value={montoInicial}
              onChangeText={setMontoInicial}
              keyboardType="numeric"
              style={styles.input}
            />

            <Pressable
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={abrirCaja}
              disabled={saving}
            >
              <Text style={styles.buttonText}>Abrir caja</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Caja abierta #{caja.id}</Text>
              <Text style={styles.muted}>
                Evento: {caja.eventoNombre ?? "Sin evento"}
              </Text>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.push("/ventanilla/sales" as never)}
              >
                <Text style={styles.buttonText}>Ver resumen y ventas</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Método de pago</Text>

              <View style={styles.row}>
                <Pressable
                  style={[styles.methodButton, metodoPago === 1 && styles.optionActive]}
                  onPress={() => setMetodoPago(1)}
                >
                  <Text style={styles.optionText}>Efectivo</Text>
                </Pressable>

                <Pressable
                  style={[styles.methodButton, metodoPago === 2 && styles.optionActive]}
                  onPress={() => setMetodoPago(2)}
                >
                  <Text style={styles.optionText}>Transferencia</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Tipo de entrega</Text>

              <View style={styles.row}>
                <Pressable
                  style={[styles.methodButton, generaTicketDigital && styles.optionActive]}
                  onPress={() => setGeneraTicketDigital(true)}
                >
                  <Text style={styles.optionText}>App</Text>
                </Pressable>

                <Pressable
                  style={[styles.methodButton, !generaTicketDigital && styles.optionActive]}
                  onPress={() => setGeneraTicketDigital(false)}
                >
                  <Text style={styles.optionText}>Físico</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Entradas disponibles</Text>

            {entradas.map((entrada) => {
              const selected =
                entradaSeleccionada?.tandaEntradaId === entrada.tandaEntradaId;

              return (
                <Pressable
                  key={entrada.tandaEntradaId}
                  style={[styles.ticketCard, selected && styles.optionActive]}
                  onPress={() => setEntradaSeleccionada(entrada)}
                >
                  {entrada.imagenUrl ? (
                    <Image source={{ uri: entrada.imagenUrl }} style={styles.ticketImage} />
                  ) : null}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>
                      {entrada.tipoEntradaNombre}
                    </Text>
                    <Text style={styles.muted}>{entrada.tandaNombre}</Text>
                    <Text style={styles.muted}>
                      Disponibles: {entrada.disponibles}
                    </Text>
                    <Text style={styles.price}>{formatMoney(entrada.precio)}</Text>
                  </View>
                </Pressable>
              );
            })}

            {entradaSeleccionada ? (
              <View style={styles.card}>
                <Text style={styles.title}>Datos del cliente</Text>

                <TextInput
                  placeholder="Nombre cliente"
                  placeholderTextColor="#888"
                  value={nombreCliente}
                  onChangeText={setNombreCliente}
                  style={styles.input}
                />

                {generaTicketDigital ? (
                  <TextInput
                    placeholder="Email del usuario registrado"
                    placeholderTextColor="#888"
                    value={emailCliente}
                    onChangeText={setEmailCliente}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                ) : null}

                <TextInput
                  placeholder="Teléfono opcional"
                  placeholderTextColor="#888"
                  value={telefonoCliente}
                  onChangeText={setTelefonoCliente}
                  keyboardType="phone-pad"
                  style={styles.input}
                />

                <View style={styles.totalBox}>
                  <RowTotal label="Entrada" value={subtotal} />

                  {cargoServicioMonto > 0 ? (
                    <>
                      <RowTotal
                        label={cargoServicio?.descripcion ?? "Cargo por servicio"}
                        value={cargoServicioMonto}
                      />
                      <Text style={styles.chargeHelp}>
                        Este cargo corresponde al servicio de la plataforma.
                      </Text>
                    </>
                  ) : null}

                  <View style={styles.totalSeparator} />

                  <RowTotal label="Total a cobrar" value={total} strong />
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    (saving || total <= 0) && styles.disabled,
                  ]}
                  onPress={confirmarVenta}
                  disabled={saving || total <= 0}
                >
                  <Text style={styles.buttonText}>
                    {saving ? "Procesando..." : "Confirmar venta"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={styles.dangerButton}
              onPress={cerrarCajaActual}
              disabled={saving}
            >
              <Text style={styles.buttonText}>Cerrar caja</Text>
            </Pressable>
          </>
        )}
      </AppLayout>
    </RoleGuard>
  );
}

function RowTotal({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={strong ? styles.totalLabelStrong : styles.totalLabel}>
        {label}
      </Text>
      <Text style={strong ? styles.totalValueStrong : styles.totalValue}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 12,
  },
  muted: { color: "#BDBDBD", marginTop: 6 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    marginTop: 12,
  },
  option: {
    padding: 13,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: "rgba(229,9,20,0.35)",
    borderWidth: 1,
    borderColor: "#E50914",
  },
  optionText: { color: "#FFFFFF", fontWeight: "900" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  methodButton: {
    flex: 1,
    padding: 13,
    borderRadius: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  ticketCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  ticketImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  ticketName: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  price: { color: "#FFFFFF", fontWeight: "900", marginTop: 5 },
  totalBox: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  totalLabel: {
    color: "#BDBDBD",
    flex: 1,
  },
  totalValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  totalLabelStrong: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
  totalValueStrong: {
    color: "#20D67B",
    fontSize: 22,
    fontWeight: "900",
  },
  totalSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },
  chargeHelp: {
    color: "#FFD166",
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  dangerButton: {
    backgroundColor: "#7F0008",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.6 },
});