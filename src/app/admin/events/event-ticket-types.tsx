import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  actualizarTandaAdminApi,
  actualizarTipoEntradaAdminApi,
  cambiarEstadoTandaAdminApi,
  crearTandaAdminApi,
  crearTipoEntradaAdminApi,
  eliminarTipoEntradaAdminApi,
  subirImagenAdminApi,
} from "../../../api/adminApi";
import { getBebidasAdminApi } from "../../../api/drinksApi";
import {
  getEventoDetalleAdminApi,
  getTiposEntradaPorEventoAdminApi,
} from "../../../api/eventsApi";
import { AppLayout } from "../../../components/shared/AppLayout";
import { RoleGuard } from "../../../components/shared/RoleGuard";
import { TipoEntradaAdmin } from "../../../types/events";
import { formatMoney } from "../../../utils/formatMoney";

type TipoCompleto = TipoEntradaAdmin & {
  descripcion?: string | null;
  imagenUrl?: string | null;
  incluyeBebidas?: boolean;
  descripcionBebidas?: string | null;
  bebidasIncluidas?: Array<{
    bebidaProductoId?: number;
    id?: number;
    cantidad?: number;
  }>;
  esCombo?: boolean;
  cantidadPersonas?: number;
  maximoPorOrden?: number | null;
  maximoPorUsuario?: number | null;
  tieneHorarioIngreso?: boolean;
  horaIngresoDesde?: string | null;
  horaIngresoHasta?: string | null;
  tandas: any[];
};

type TipoForm = {
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  incluyeBebidas: boolean;
  descripcionBebidas: string;
  bebidasIncluidas: Record<number, number>;
  esCombo: boolean;
  cantidadPersonas: string;
  maximoPorOrden: string;
  maximoPorUsuario: string;
  tieneHorarioIngreso: boolean;
  horaIngresoDesde: string;
  horaIngresoHasta: string;
};

type TandaForm = {
  numeroTanda: string;
  nombre: string;
  precio: string;
  cantidadTotal: string;
  habilitadaVentaFisica: boolean;
  inicioDia: string;
  inicioHora: string;
  finDia: string;
  finHora: string;
};

const TIPO_VACIO: TipoForm = {
  nombre: "",
  descripcion: "",
  imagenUrl: "",
  incluyeBebidas: false,
  descripcionBebidas: "",
  bebidasIncluidas: {},
  esCombo: false,
  cantidadPersonas: "1",
  maximoPorOrden: "",
  maximoPorUsuario: "",
  tieneHorarioIngreso: false,
  horaIngresoDesde: "",
  horaIngresoHasta: "",
};

const TANDA_VACIA: TandaForm = {
  numeroTanda: "1",
  nombre: "Primera tanda",
  precio: "5000",
  cantidadTotal: "50",
  habilitadaVentaFisica: false,
  inicioDia: "",
  inicioHora: "",
  finDia: "",
  finHora: "",
};

function apiMessage(error: any, fallback: string) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.message ?? data?.title ?? error?.message ?? fallback;
}

function normalizarHora(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(clean)) return "INVALIDA";
  return `${clean}:00`;
}

function buildDateTime(date: string, time: string) {
  const d = date.trim();
  const t = time.trim();

  if (!d && !t) return null;
  if (!d || !t) return "INCOMPLETA";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "INVALIDA";
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) return "INVALIDA";

  const result = `${d}T${t}:00-03:00`;
  return Number.isNaN(new Date(result).getTime()) ? "INVALIDA" : result;
}

function dateParts(value?: string | null) {
  if (!value) return { date: "", time: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function horarioTexto(tipo: TipoCompleto) {
  if (!tipo.tieneHorarioIngreso) return "Ingreso libre durante el evento.";

  const desde = tipo.horaIngresoDesde?.slice(0, 5);
  const hasta = tipo.horaIngresoHasta?.slice(0, 5);

  if (desde && hasta) return `Ingreso de ${desde} a ${hasta}.`;
  if (desde) return `Ingreso desde las ${desde}.`;
  if (hasta) return `Ingreso hasta las ${hasta}.`;
  return "Ingreso libre durante el evento.";
}

function tandaCerrada(tanda: any) {
  return (
    String(tanda.estado).toLowerCase() === "cerrada" ||
    Number(tanda.estado) === 4
  );
}

function estadoTanda(estado: number) {
  if (estado === 1) return "Activa";
  if (estado === 3) return "Pausada";
  if (estado === 4) return "Cerrada";
  return "Activa";
}

export default function AdminEventTicketTypesScreen() {
  const { eventoId } = useLocalSearchParams<{ eventoId: string }>();
  const eventoIdNumero = Number(eventoId);

  const [evento, setEvento] = useState<any>(null);
  const [tipos, setTipos] = useState<TipoCompleto[]>([]);
  const [bebidas, setBebidas] = useState<any[]>([]);
  const [bebidaSearch, setBebidaSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "todos" | "individuales" | "combos" | "sinTandas"
  >("todos");

  const [tipoOpenId, setTipoOpenId] = useState<number | null>(null);
  const [tandaOpenId, setTandaOpenId] = useState<number | null>(null);

  const [tipoModal, setTipoModal] = useState(false);
  const [tipoEditId, setTipoEditId] = useState<number | null>(null);
  const [tipoForm, setTipoForm] = useState<TipoForm>(TIPO_VACIO);
  const [savingTipo, setSavingTipo] = useState(false);
  const [deletingTipoId, setDeletingTipoId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [tandaModal, setTandaModal] = useState(false);
  const [tipoTandaId, setTipoTandaId] = useState<number | null>(null);
  const [tandaEditId, setTandaEditId] = useState<number | null>(null);
  const [tandaForm, setTandaForm] = useState<TandaForm>(TANDA_VACIA);
  const [savingTanda, setSavingTanda] = useState(false);
  const [changingTandaId, setChangingTandaId] = useState<number | null>(null);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!Number.isInteger(eventoIdNumero) || eventoIdNumero <= 0) {
        setLoading(false);
        Alert.alert("Evento inválido", "No se pudo identificar el evento.");
        return;
      }

      try {
        refresh ? setRefreshing(true) : setLoading(true);

        const [eventoResult, tiposResult, bebidasResult] =
          await Promise.allSettled([
            getEventoDetalleAdminApi(eventoIdNumero),
            getTiposEntradaPorEventoAdminApi(eventoIdNumero),
            getBebidasAdminApi({ page: 1, pageSize: 100, search: "" }),
          ]);

        if (eventoResult.status === "rejected") throw eventoResult.reason;
        if (tiposResult.status === "rejected") throw tiposResult.reason;

        const tiposData = (tiposResult.value ?? []) as TipoCompleto[];

        setEvento(eventoResult.value);
        setTipos(tiposData);
        setBebidas(
          bebidasResult.status === "fulfilled"
            ? bebidasResult.value?.items ?? []
            : [],
        );

        setTipoOpenId((current) =>
          current && tiposData.some((x) => x.id === current)
            ? current
            : tiposData[0]?.id ?? null,
        );
      } catch (error: any) {
        Alert.alert(
          "No se pudo cargar",
          apiMessage(error, "No se pudieron obtener los tipos de entrada."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventoIdNumero],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const filteredTipos = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tipos.filter((tipo) => {
      const matches =
        !term ||
        tipo.nombre?.toLowerCase().includes(term) ||
        tipo.descripcion?.toLowerCase().includes(term) ||
        String(tipo.id).includes(term);

      if (!matches) return false;
      if (filter === "individuales") return !tipo.esCombo;
      if (filter === "combos") return Boolean(tipo.esCombo);
      if (filter === "sinTandas") return (tipo.tandas?.length ?? 0) === 0;
      return true;
    });
  }, [tipos, filter, search]);

  const summary = useMemo(() => {
    const tandas = tipos.flatMap((tipo) => tipo.tandas ?? []);

    return {
      tipos: tipos.length,
      combos: tipos.filter((tipo) => tipo.esCombo).length,
      tandas: tandas.length,
      disponibles: tandas.reduce(
        (sum, tanda) => sum + Math.max(Number(tanda.disponibles ?? 0), 0),
        0,
      ),
    };
  }, [tipos]);


  const filteredBebidas = useMemo(() => {
    const term = bebidaSearch.trim().toLowerCase();

    if (!term) {
      return bebidas;
    }

    return bebidas.filter((bebida) => {
      const nombre = String(bebida?.nombre ?? "").toLowerCase();
      const codigo = String(bebida?.codigo ?? "").toLowerCase();
      const id = String(bebida?.id ?? "");

      return (
        nombre.includes(term) ||
        codigo.includes(term) ||
        id.includes(term)
      );
    });
  }, [bebidas, bebidaSearch]);

  function patchTipo<K extends keyof TipoForm>(key: K, value: TipoForm[K]) {
    setTipoForm((current) => ({ ...current, [key]: value }));
  }

  function patchTanda<K extends keyof TandaForm>(
    key: K,
    value: TandaForm[K],
  ) {
    setTandaForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tus imágenes.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      if (!asset.uri) return;

      setUploading(true);

      const upload = await subirImagenAdminApi({
        uri: asset.uri,
        name: asset.fileName ?? `tipo-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });

      const url = upload.url ?? upload.displayUrl;
      if (!url) throw new Error("El servidor no devolvió la URL.");

      patchTipo("imagenUrl", url);
      Alert.alert("Imagen cargada", "La imagen se subió correctamente.");
    } catch (error: any) {
      Alert.alert("Error", apiMessage(error, "No se pudo subir la imagen."));
    } finally {
      setUploading(false);
    }
  }

  function openCreateTipo() {
    setTipoEditId(null);
    setTipoForm(TIPO_VACIO);
    setBebidaSearch("");
    setTipoModal(true);
  }

  function openEditTipo(tipo: TipoCompleto) {
    const bebidasIncluidas: Record<number, number> = {};

    (tipo.bebidasIncluidas ?? []).forEach((item) => {
      const bebidaId = Number(item.bebidaProductoId ?? item.bebidaProductoId ?? 0);
      const cantidad = Number(item.cantidad ?? 0);
      if (bebidaId > 0 && cantidad > 0) bebidasIncluidas[bebidaId] = cantidad;
    });

    setTipoEditId(tipo.id);
    setBebidaSearch("");
    setTipoForm({
      nombre: tipo.nombre ?? "",
      descripcion: tipo.descripcion ?? "",
      imagenUrl: tipo.imagenUrl ?? "",
      incluyeBebidas: Boolean(tipo.incluyeBebidas),
      descripcionBebidas: tipo.descripcionBebidas ?? "",
      bebidasIncluidas,
      esCombo: Boolean(tipo.esCombo),
      cantidadPersonas: String(tipo.cantidadPersonas ?? 1),
      maximoPorOrden:
        tipo.maximoPorOrden != null ? String(tipo.maximoPorOrden) : "",
      maximoPorUsuario:
        tipo.maximoPorUsuario != null ? String(tipo.maximoPorUsuario) : "",
      tieneHorarioIngreso: Boolean(tipo.tieneHorarioIngreso),
      horaIngresoDesde: tipo.horaIngresoDesde?.slice(0, 5) ?? "",
      horaIngresoHasta: tipo.horaIngresoHasta?.slice(0, 5) ?? "",
    });
    setTipoModal(true);
  }

  async function saveTipo() {
    if (!tipoForm.nombre.trim() || !tipoForm.imagenUrl.trim()) {
      Alert.alert("Faltan datos", "Nombre e imagen son obligatorios.");
      return;
    }

    const cantidadPersonas = Number(tipoForm.cantidadPersonas);
    const maximoPorOrden =
      tipoForm.maximoPorOrden.trim() === ""
        ? null
        : Number(tipoForm.maximoPorOrden);
    const maximoPorUsuario =
      tipoForm.maximoPorUsuario.trim() === ""
        ? null
        : Number(tipoForm.maximoPorUsuario);

    if (!Number.isInteger(cantidadPersonas) || cantidadPersonas <= 0) {
      Alert.alert("Cantidad inválida", "Ingresá una cantidad válida.");
      return;
    }

    if (!tipoForm.esCombo && cantidadPersonas !== 1) {
      Alert.alert(
        "Cantidad inconsistente",
        "Una entrada individual debe ser para una persona.",
      );
      return;
    }

    if (
      maximoPorOrden !== null &&
      (!Number.isInteger(maximoPorOrden) || maximoPorOrden <= 0)
    ) {
      Alert.alert("Máximo inválido", "Revisá el máximo por orden.");
      return;
    }

    if (
      maximoPorUsuario !== null &&
      (!Number.isInteger(maximoPorUsuario) || maximoPorUsuario <= 0)
    ) {
      Alert.alert("Máximo inválido", "Revisá el máximo por usuario.");
      return;
    }

    if (
      maximoPorOrden !== null &&
      maximoPorUsuario !== null &&
      maximoPorOrden > maximoPorUsuario
    ) {
      Alert.alert(
        "Límites inconsistentes",
        "El máximo por orden no puede superar el máximo por usuario.",
      );
      return;
    }

    const horaDesde = normalizarHora(tipoForm.horaIngresoDesde);
    const horaHasta = normalizarHora(tipoForm.horaIngresoHasta);

    if (horaDesde === "INVALIDA" || horaHasta === "INVALIDA") {
      Alert.alert("Horario inválido", "Usá el formato HH:mm.");
      return;
    }

    if (tipoForm.tieneHorarioIngreso && !horaDesde && !horaHasta) {
      Alert.alert("Horario requerido", "Indicá al menos una hora.");
      return;
    }

    const bebidasIncluidas = Object.entries(tipoForm.bebidasIncluidas)
      .filter(([, cantidad]) => Number(cantidad) > 0)
      .map(([bebidaProductoId, cantidad]) => ({
        bebidaProductoId: Number(bebidaProductoId),
        cantidad: Number(cantidad),
      }));

    if (tipoForm.incluyeBebidas && bebidasIncluidas.length === 0) {
      Alert.alert("Bebidas requeridas", "Seleccioná al menos una bebida.");
      return;
    }

    const payload = {
      nombre: tipoForm.nombre.trim(),
      descripcion: tipoForm.descripcion.trim() || undefined,
      imagenUrl: tipoForm.imagenUrl.trim(),
      incluyeBebidas: tipoForm.incluyeBebidas,
      descripcionBebidas: tipoForm.incluyeBebidas
        ? tipoForm.descripcionBebidas.trim() ||
          "Incluye bebidas seleccionadas"
        : undefined,
      bebidasIncluidas: tipoForm.incluyeBebidas ? bebidasIncluidas : [],
      esCombo: tipoForm.esCombo,
      cantidadPersonas,
      maximoPorOrden,
      maximoPorUsuario,
      tieneHorarioIngreso: tipoForm.tieneHorarioIngreso,
      horaIngresoDesde:
        tipoForm.tieneHorarioIngreso && horaDesde ? horaDesde : null,
      horaIngresoHasta:
        tipoForm.tieneHorarioIngreso && horaHasta ? horaHasta : null,
    };

    try {
      setSavingTipo(true);

      if (tipoEditId) {
        await actualizarTipoEntradaAdminApi(
          eventoIdNumero,
          tipoEditId,
          payload,
        );
      } else {
        await crearTipoEntradaAdminApi(eventoIdNumero, payload);
      }

      setTipoModal(false);
      setTipoEditId(null);
      setTipoForm(TIPO_VACIO);
      await loadData(true);

      Alert.alert(
        "Correcto",
        tipoEditId ? "Tipo actualizado." : "Tipo creado.",
      );
    } catch (error: any) {
      Alert.alert("Error", apiMessage(error, "No se pudo guardar el tipo."));
    } finally {
      setSavingTipo(false);
    }
  }

  function confirmDeleteTipo(tipo: TipoCompleto) {
    Alert.alert(
      "Eliminar tipo de entrada",
      `Vas a eliminar "${tipo.nombre}". ¿Querés continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void deleteTipo(tipo.id),
        },
      ],
    );
  }

  async function deleteTipo(tipoId: number) {
    try {
      setDeletingTipoId(tipoId);
      await eliminarTipoEntradaAdminApi(eventoIdNumero, tipoId);
      setTipos((current) => current.filter((tipo) => tipo.id !== tipoId));
      Alert.alert("Correcto", "Tipo eliminado correctamente.");
    } catch (error: any) {
      Alert.alert("Error", apiMessage(error, "No se pudo eliminar."));
    } finally {
      setDeletingTipoId(null);
    }
  }

  function openCreateTanda(tipoId: number) {
    const tipo = tipos.find((item) => item.id === tipoId);
    const numero =
      Math.max(0, ...(tipo?.tandas ?? []).map((tanda) => tanda.numeroTanda)) +
      1;

    setTipoTandaId(tipoId);
    setTandaEditId(null);
    setTandaForm({
      ...TANDA_VACIA,
      numeroTanda: String(numero),
      nombre: numero === 1 ? "Primera tanda" : `Tanda ${numero}`,
    });
    setTandaModal(true);
  }

  function openEditTanda(tipoId: number, tanda: any) {
    const inicio = dateParts(tanda.fechaInicio);
    const fin = dateParts(tanda.fechaFin);

    setTipoTandaId(tipoId);
    setTandaEditId(tanda.id);
    setTandaForm({
      numeroTanda: String(tanda.numeroTanda ?? 1),
      nombre: tanda.nombre ?? "",
      precio: String(tanda.precio ?? 0),
      cantidadTotal: String(tanda.cantidadTotal ?? 0),
      habilitadaVentaFisica: Boolean(tanda.habilitadaVentaFisica),
      inicioDia: inicio.date,
      inicioHora: inicio.time,
      finDia: fin.date,
      finHora: fin.time,
    });
    setTandaModal(true);
  }

  async function saveTanda() {
    if (!tipoTandaId) return;

    const numeroTanda = Number(tandaForm.numeroTanda);
    const precio = Number(tandaForm.precio);
    const cantidadTotal = Number(tandaForm.cantidadTotal);

    if (!Number.isInteger(numeroTanda) || numeroTanda <= 0) {
      Alert.alert("Número inválido", "Revisá el número de tanda.");
      return;
    }

    if (!tandaForm.nombre.trim()) {
      Alert.alert("Nombre requerido", "Ingresá el nombre de la tanda.");
      return;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      Alert.alert("Precio inválido", "Revisá el precio.");
      return;
    }

    if (!Number.isInteger(cantidadTotal) || cantidadTotal <= 0) {
      Alert.alert("Cantidad inválida", "Revisá la cantidad total.");
      return;
    }

    const fechaInicio = buildDateTime(
      tandaForm.inicioDia,
      tandaForm.inicioHora,
    );
    const fechaFin = buildDateTime(tandaForm.finDia, tandaForm.finHora);

    if (fechaInicio === "INCOMPLETA" || fechaFin === "INCOMPLETA") {
      Alert.alert("Fecha incompleta", "Completá fecha y hora.");
      return;
    }

    if (fechaInicio === "INVALIDA" || fechaFin === "INVALIDA") {
      Alert.alert("Fecha inválida", "Usá YYYY-MM-DD y HH:mm.");
      return;
    }

    if (
      fechaInicio &&
      fechaFin &&
      new Date(fechaFin).getTime() <= new Date(fechaInicio).getTime()
    ) {
      Alert.alert("Rango inválido", "La fecha fin debe ser posterior.");
      return;
    }

    const payload = {
      numeroTanda,
      nombre: tandaForm.nombre.trim(),
      precio,
      cantidadTotal,
      fechaInicio,
      fechaFin,
      habilitadaVentaFisica: tandaForm.habilitadaVentaFisica,
    };

    try {
      setSavingTanda(true);

      if (tandaEditId) {
        await actualizarTandaAdminApi(tipoTandaId, tandaEditId, payload);
      } else {
        await crearTandaAdminApi(tipoTandaId, payload);
      }

      setTandaModal(false);
      setTipoTandaId(null);
      setTandaEditId(null);
      setTandaForm(TANDA_VACIA);
      await loadData(true);

      Alert.alert(
        "Correcto",
        tandaEditId ? "Tanda actualizada." : "Tanda creada.",
      );
    } catch (error: any) {
      Alert.alert("Error", apiMessage(error, "No se pudo guardar la tanda."));
    } finally {
      setSavingTanda(false);
    }
  }

  async function changeTandaState(tandaId: number, estado: number) {
    try {
      setChangingTandaId(tandaId);
      await cambiarEstadoTandaAdminApi(tandaId, estado);

      setTipos((current) =>
        current.map((tipo) => ({
          ...tipo,
          tandas: tipo.tandas.map((tanda) =>
            tanda.id === tandaId
              ? {
                  ...tanda,
                  estado: estadoTanda(estado),
                  activa: estado === 1,
                }
              : tanda,
          ),
        })),
      );
    } catch (error: any) {
      Alert.alert("Error", apiMessage(error, "No se pudo cambiar el estado."));
    } finally {
      setChangingTandaId(null);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
        <AppLayout title="Tipos de entrada">
          <ActivityIndicator color="#E50914" style={styles.loader} />
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "SuperAdmin"]}>
      <AppLayout title="Tipos de entrada">
        {evento ? (
          <View style={styles.eventCard}>
            {evento.bannerUrl ? (
              <Image source={{ uri: evento.bannerUrl }} style={styles.banner} />
            ) : null}

            <View style={styles.eventInfo}>
              <Text style={styles.title}>{evento.nombre}</Text>
              <Text style={styles.muted}>{evento.lugar}</Text>
              <Text style={styles.status}>Estado: {evento.estado}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <Summary label="Tipos" value={summary.tipos} />
          <Summary label="Combos" value={summary.combos} />
          <Summary label="Tandas" value={summary.tandas} />
          <Summary label="Cupos" value={summary.disponibles} />
        </View>

        <Pressable style={styles.primaryButton} onPress={openCreateTipo}>
          <Text style={styles.buttonText}>Crear tipo de entrada</Text>
        </Pressable>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar tipo de entrada..."
          placeholderTextColor="#777"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {[
            ["todos", "Todos"],
            ["individuales", "Individuales"],
            ["combos", "Combos"],
            ["sinTandas", "Sin tandas"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              style={[
                styles.filter,
                filter === key && styles.filterActive,
              ]}
              onPress={() => setFilter(key as typeof filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Entradas configuradas</Text>
            <Text style={styles.muted}>
              {filteredTipos.length} resultados
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Actualizar</Text>
            )}
          </Pressable>
        </View>

        {filteredTipos.map((tipo) => {
          const open = tipoOpenId === tipo.id;
          const tandas = tipo.tandas ?? [];
          const disponibles = tandas.reduce(
            (sum, tanda) => sum + Number(tanda.disponibles ?? 0),
            0,
          );
          const activa = tandas.find((tanda) => tanda.activa);

          return (
            <View key={tipo.id} style={styles.card}>
              <Pressable
                style={styles.typeHeader}
                onPress={() => {
                  setTipoOpenId(open ? null : tipo.id);
                  setTandaOpenId(null);
                }}
              >
                {tipo.imagenUrl ? (
                  <Image
                    source={{ uri: tipo.imagenUrl }}
                    style={styles.typeImage}
                  />
                ) : null}

                <View style={styles.flex}>
                  <Text style={styles.subTitle}>{tipo.nombre}</Text>
                  <Text style={styles.muted}>
                    {tipo.esCombo
                      ? `Combo para ${tipo.cantidadPersonas} personas`
                      : "Entrada individual"}
                  </Text>
                  <Text style={activa ? styles.green : styles.gold}>
                    {activa
                      ? `${activa.nombre} · ${formatMoney(activa.precio)}`
                      : "Sin tanda activa"}
                  </Text>
                  <Text style={styles.muted}>
                    {tandas.length} tandas · {disponibles} cupos
                  </Text>
                </View>

                <Text style={styles.chevron}>{open ? "⌃" : "⌄"}</Text>
              </Pressable>

              {open ? (
                <View style={styles.body}>
                  {tipo.descripcion ? (
                    <Text style={styles.description}>{tipo.descripcion}</Text>
                  ) : null}

                  <Text style={styles.muted}>{horarioTexto(tipo)}</Text>
                  <Text style={styles.muted}>
                    Máximo por orden: {tipo.maximoPorOrden ?? "Sin límite"}
                  </Text>
                  <Text style={styles.muted}>
                    Máximo por usuario: {tipo.maximoPorUsuario ?? "Sin límite"}
                  </Text>

                  {tipo.incluyeBebidas ? (
                    <Text style={styles.green}>
                      Incluye:{" "}
                      {tipo.descripcionBebidas ?? "Bebidas seleccionadas"}
                    </Text>
                  ) : null}

                  <View style={styles.row}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openEditTipo(tipo)}
                    >
                      <Text style={styles.buttonText}>Editar tipo</Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => confirmDeleteTipo(tipo)}
                      disabled={deletingTipoId !== null}
                    >
                      {deletingTipoId === tipo.id ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>Eliminar</Text>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.tandasHeader}>
                    <Text style={styles.miniTitle}>Tandas</Text>
                    <Pressable
                      style={styles.addButton}
                      onPress={() => openCreateTanda(tipo.id)}
                    >
                      <Text style={styles.buttonText}>+ Nueva</Text>
                    </Pressable>
                  </View>

                  {tandas.length === 0 ? (
                    <Text style={styles.red}>No tiene tandas creadas.</Text>
                  ) : (
                    tandas.map((tanda) => {
                      const tandaOpen = tandaOpenId === tanda.id;
                      const cerrada = tandaCerrada(tanda);
                      const changing = changingTandaId === tanda.id;

                      return (
                        <View key={tanda.id} style={styles.tanda}>
                          <Pressable
                            style={styles.tandaHeader}
                            onPress={() =>
                              setTandaOpenId(tandaOpen ? null : tanda.id)
                            }
                          >
                            <View style={styles.flex}>
                              <Text style={styles.tandaTitle}>
                                #{tanda.numeroTanda} · {tanda.nombre}
                              </Text>
                              <Text style={styles.price}>
                                {formatMoney(tanda.precio)}
                              </Text>
                              <Text style={styles.muted}>
                                {tanda.disponibles} de {tanda.cantidadTotal}{" "}
                                disponibles
                              </Text>
                            </View>

                            <Text
                              style={tanda.activa ? styles.green : styles.gold}
                            >
                              {String(tanda.estado)}
                            </Text>
                          </Pressable>

                          {tandaOpen ? (
                            <View style={styles.tandaBody}>
                              <Text style={styles.muted}>
                                Vendidas: {tanda.cantidadVendida}
                              </Text>
                              <Text style={styles.muted}>
                                Reservadas: {tanda.cantidadReservada}
                              </Text>
                              <Text
                                style={
                                  tanda.habilitadaVentaFisica
                                    ? styles.green
                                    : styles.muted
                                }
                              >
                                Canal de venta:{" "}
                                {tanda.habilitadaVentaFisica
                                  ? "Ventanilla física"
                                  : "Catálogo online"}
                              </Text>
                              <Text style={styles.muted}>
                                Desde:{" "}
                                {formatDate(tanda.fechaInicio) ?? "Sin fecha"}
                              </Text>
                              <Text style={styles.muted}>
                                Hasta:{" "}
                                {formatDate(tanda.fechaFin) ?? "Sin fecha"}
                              </Text>

                              <Pressable
                                style={[
                                  styles.editTandaButton,
                                  cerrada && styles.disabled,
                                ]}
                                onPress={() => openEditTanda(tipo.id, tanda)}
                                disabled={cerrada}
                              >
                                <Text style={styles.buttonText}>
                                  {cerrada ? "Tanda cerrada" : "Editar tanda"}
                                </Text>
                              </Pressable>

                              <View style={styles.row}>
                                <ActionButton
                                  label="Activar"
                                  disabled={tanda.activa || cerrada || changing}
                                  onPress={() =>
                                    void changeTandaState(tanda.id, 1)
                                  }
                                />
                                <ActionButton
                                  label="Pausar"
                                  disabled={!tanda.activa || cerrada || changing}
                                  onPress={() =>
                                    void changeTandaState(tanda.id, 3)
                                  }
                                />
                                <ActionButton
                                  label={cerrada ? "Cerrada" : "Cerrar"}
                                  disabled={cerrada || changing}
                                  onPress={() =>
                                    Alert.alert(
                                      "Cerrar tanda",
                                      "Una tanda cerrada no podrá volver a editarse.",
                                      [
                                        { text: "Cancelar", style: "cancel" },
                                        {
                                          text: "Cerrar",
                                          style: "destructive",
                                          onPress: () =>
                                            void changeTandaState(tanda.id, 4),
                                        },
                                      ],
                                    )
                                  }
                                />
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        })}

        <Modal
          visible={tipoModal}
          transparent
          animationType="fade"
          onRequestClose={() => !savingTipo && setTipoModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
              >
                <Text style={styles.modalTitle}>
                  {tipoEditId ? "Editar tipo de entrada" : "Crear tipo"}
                </Text>

                <Field
                  label="Nombre"
                  value={tipoForm.nombre}
                  onChange={(v) => patchTipo("nombre", v)}
                />
                <Field
                  label="Descripción"
                  value={tipoForm.descripcion}
                  onChange={(v) => patchTipo("descripcion", v)}
                  multiline
                />

                {tipoForm.imagenUrl ? (
                  <Image
                    source={{ uri: tipoForm.imagenUrl }}
                    style={styles.preview}
                  />
                ) : null}

                <Field
                  label="URL de imagen"
                  value={tipoForm.imagenUrl}
                  onChange={(v) => patchTipo("imagenUrl", v)}
                />

                <Pressable
                  style={styles.uploadButton}
                  onPress={() => void uploadImage()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Seleccionar imagen</Text>
                  )}
                </Pressable>

                <Toggle
                  label={tipoForm.esCombo ? "Es combo: Sí" : "Es combo: No"}
                  active={tipoForm.esCombo}
                  onPress={() =>
                    setTipoForm((current) => ({
                      ...current,
                      esCombo: !current.esCombo,
                      cantidadPersonas: !current.esCombo
                        ? current.cantidadPersonas === "1"
                          ? "2"
                          : current.cantidadPersonas
                        : "1",
                    }))
                  }
                />

                <Field
                  label="Cantidad de personas"
                  value={tipoForm.cantidadPersonas}
                  onChange={(v) => patchTipo("cantidadPersonas", v)}
                  numeric
                />
                <Field
                  label="Máximo por orden"
                  value={tipoForm.maximoPorOrden}
                  onChange={(v) => patchTipo("maximoPorOrden", v)}
                  numeric
                />
                <Field
                  label="Máximo por usuario"
                  value={tipoForm.maximoPorUsuario}
                  onChange={(v) => patchTipo("maximoPorUsuario", v)}
                  numeric
                />

                <Toggle
                  label={
                    tipoForm.tieneHorarioIngreso
                      ? "Tiene horario de ingreso"
                      : "Sin horario de ingreso"
                  }
                  active={tipoForm.tieneHorarioIngreso}
                  onPress={() =>
                    setTipoForm((current) => ({
                      ...current,
                      tieneHorarioIngreso: !current.tieneHorarioIngreso,
                      horaIngresoDesde: current.tieneHorarioIngreso
                        ? ""
                        : current.horaIngresoDesde,
                      horaIngresoHasta: current.tieneHorarioIngreso
                        ? ""
                        : current.horaIngresoHasta,
                    }))
                  }
                />

                {tipoForm.tieneHorarioIngreso ? (
                  <>
                    <Field
                      label="Hora desde (HH:mm)"
                      value={tipoForm.horaIngresoDesde}
                      onChange={(v) => patchTipo("horaIngresoDesde", v)}
                    />
                    <Field
                      label="Hora hasta (HH:mm)"
                      value={tipoForm.horaIngresoHasta}
                      onChange={(v) => patchTipo("horaIngresoHasta", v)}
                    />
                  </>
                ) : null}

                <Toggle
                  label={
                    tipoForm.incluyeBebidas
                      ? "Incluye bebidas: Sí"
                      : "Incluye bebidas: No"
                  }
                  active={tipoForm.incluyeBebidas}
                  onPress={() =>
                    setTipoForm((current) => ({
                      ...current,
                      incluyeBebidas: !current.incluyeBebidas,
                      bebidasIncluidas: current.incluyeBebidas
                        ? {}
                        : current.bebidasIncluidas,
                    }))
                  }
                />

                {tipoForm.incluyeBebidas ? (
                  <>
                    <Field
                      label="Descripción del beneficio"
                      value={tipoForm.descripcionBebidas}
                      onChange={(v) => patchTipo("descripcionBebidas", v)}
                    />

                    <View style={styles.drinksSection}>
                      <Text style={styles.label}>Bebidas incluidas</Text>

                      <Text style={styles.drinksHelp}>
                        Buscá una bebida y definí cuántas unidades incluye cada
                        entrada o combo.
                      </Text>

                      <TextInput
                        value={bebidaSearch}
                        onChangeText={setBebidaSearch}
                        placeholder="Buscar bebida por nombre, código o ID..."
                        placeholderTextColor="#777"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.drinkSearchInput}
                      />

                      <View style={styles.drinksResultsHeader}>
                        <Text style={styles.drinksResultsText}>
                          {filteredBebidas.length} resultado
                          {filteredBebidas.length === 1 ? "" : "s"}
                        </Text>

                        {bebidaSearch.trim() ? (
                          <Pressable onPress={() => setBebidaSearch("")}>
                            <Text style={styles.clearDrinkSearchText}>
                              Limpiar
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {filteredBebidas.length === 0 ? (
                        <View style={styles.emptyDrinksBox}>
                          <Text style={styles.emptyDrinksTitle}>
                            No se encontraron bebidas
                          </Text>

                          <Text style={styles.emptyDrinksText}>
                            Probá con otro nombre, código o identificador.
                          </Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.drinksScroll}
                          contentContainerStyle={styles.drinksScrollContent}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                          showsVerticalScrollIndicator
                        >
                          {filteredBebidas.map((bebida) => {
                            const cantidad =
                              tipoForm.bebidasIncluidas[bebida.id] ?? 0;
                            const seleccionada = cantidad > 0;

                            return (
                              <View
                                key={bebida.id}
                                style={[
                                  styles.drinkRow,
                                  seleccionada && styles.drinkRowSelected,
                                ]}
                              >
                                {bebida.imagenUrl ? (
                                  <Image
                                    source={{ uri: bebida.imagenUrl }}
                                    style={styles.drinkImage}
                                  />
                                ) : (
                                  <View style={styles.drinkImagePlaceholder}>
                                    <Text
                                      style={styles.drinkImagePlaceholderText}
                                    >
                                      {String(bebida.nombre ?? "B")
                                        .trim()
                                        .charAt(0)
                                        .toUpperCase() || "B"}
                                    </Text>
                                  </View>
                                )}

                                <View style={styles.drinkInfo}>
                                  <Text
                                    style={styles.drinkName}
                                    numberOfLines={2}
                                  >
                                    {bebida.nombre}
                                  </Text>

                                  <View style={styles.drinkMetadataRow}>
                                    {bebida.codigo ? (
                                      <Text style={styles.drinkMetadata}>
                                        Código: {bebida.codigo}
                                      </Text>
                                    ) : null}

                                    <Text style={styles.drinkMetadata}>
                                      ID: {bebida.id}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.quantityControl}>
                                  <Pressable
                                    style={[
                                      styles.quantity,
                                      cantidad <= 0 &&
                                        styles.quantityDisabled,
                                    ]}
                                    onPress={() => {
                                      const next = {
                                        ...tipoForm.bebidasIncluidas,
                                      };

                                      if (cantidad <= 1) {
                                        delete next[bebida.id];
                                      } else {
                                        next[bebida.id] = cantidad - 1;
                                      }

                                      patchTipo("bebidasIncluidas", next);
                                    }}
                                    disabled={cantidad <= 0}
                                  >
                                    <Text style={styles.buttonText}>−</Text>
                                  </Pressable>

                                  <Text style={styles.quantityText}>
                                    {cantidad}
                                  </Text>

                                  <Pressable
                                    style={styles.quantity}
                                    onPress={() =>
                                      patchTipo("bebidasIncluidas", {
                                        ...tipoForm.bebidasIncluidas,
                                        [bebida.id]: cantidad + 1,
                                      })
                                    }
                                  >
                                    <Text style={styles.buttonText}>+</Text>
                                  </Pressable>
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  </>
                ) : null}

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void saveTipo()}
                  disabled={savingTipo}
                >
                  {savingTipo ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Guardar</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setTipoModal(false)}
                  disabled={savingTipo}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={tandaModal}
          transparent
          animationType="fade"
          onRequestClose={() => !savingTanda && setTandaModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {tandaEditId ? "Editar tanda" : "Crear tanda"}
                </Text>

                <Field
                  label="Número de tanda"
                  value={tandaForm.numeroTanda}
                  onChange={(v) => patchTanda("numeroTanda", v)}
                  numeric
                />
                <Field
                  label="Nombre"
                  value={tandaForm.nombre}
                  onChange={(v) => patchTanda("nombre", v)}
                />
                <Field
                  label="Precio"
                  value={tandaForm.precio}
                  onChange={(v) => patchTanda("precio", v)}
                  numeric
                />
                <Field
                  label="Cantidad total"
                  value={tandaForm.cantidadTotal}
                  onChange={(v) => patchTanda("cantidadTotal", v)}
                  numeric
                />

                <Toggle
                  label={
                    tandaForm.habilitadaVentaFisica
                      ? "Venta en ventanilla: habilitada"
                      : "Venta en ventanilla: deshabilitada"
                  }
                  active={tandaForm.habilitadaVentaFisica}
                  onPress={() =>
                    patchTanda(
                      "habilitadaVentaFisica",
                      !tandaForm.habilitadaVentaFisica,
                    )
                  }
                />

                <Text style={styles.muted}>
                  {tandaForm.habilitadaVentaFisica
                    ? "Esta tanda se ofrecerá en Ventanilla física y quedará fuera del catálogo online."
                    : "Esta tanda se ofrecerá en el catálogo online y no aparecerá en Ventanilla física."}
                </Text>

                <Field
                  label="Fecha inicio (YYYY-MM-DD)"
                  value={tandaForm.inicioDia}
                  onChange={(v) => patchTanda("inicioDia", v)}
                />
                <Field
                  label="Hora inicio (HH:mm)"
                  value={tandaForm.inicioHora}
                  onChange={(v) => patchTanda("inicioHora", v)}
                />
                <Field
                  label="Fecha fin (YYYY-MM-DD)"
                  value={tandaForm.finDia}
                  onChange={(v) => patchTanda("finDia", v)}
                />
                <Field
                  label="Hora fin (HH:mm)"
                  value={tandaForm.finHora}
                  onChange={(v) => patchTanda("finHora", v)}
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={() => void saveTanda()}
                  disabled={savingTanda}
                >
                  {savingTanda ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Guardar tanda</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setTandaModal(false)}
                  disabled={savingTanda}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.actionButton, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "numeric" : "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toggle, active && styles.toggleActive]}
      onPress={onPress}
    >
      <View style={[styles.dot, active && styles.dotActive]} />
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  eventCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  banner: { width: "100%", height: 135, backgroundColor: "#171717" },
  eventInfo: { padding: 16 },
  title: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  muted: { color: "#AFAFAF", marginTop: 4, lineHeight: 19 },
  status: { color: "#E50914", fontWeight: "900", marginTop: 7 },
  summaryRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
  },
  summary: {
    flex: 1,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  summaryValue: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#888", fontSize: 10, marginTop: 3 },
  primaryButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFF", fontWeight: "900" },
  search: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#FFF",
    paddingHorizontal: 14,
    marginTop: 12,
  },
  filters: { gap: 8, paddingVertical: 12 },
  filter: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  filterActive: {
    backgroundColor: "rgba(229,9,20,0.18)",
    borderColor: "rgba(229,9,20,0.45)",
  },
  filterText: { color: "#999", fontWeight: "800" },
  filterTextActive: { color: "#FFF" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  refreshButton: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 13,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
    overflow: "hidden",
  },
  typeHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 13,
  },
  typeImage: { width: 70, height: 70, borderRadius: 15 },
  flex: { flex: 1 },
  subTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  green: { color: "#20D67B", fontWeight: "800", marginTop: 5 },
  gold: { color: "#FFD166", fontWeight: "800", marginTop: 5 },
  red: { color: "#FF4D57", fontWeight: "800" },
  chevron: { color: "#E50914", fontSize: 24, fontWeight: "900" },
  body: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  description: { color: "#CCC", lineHeight: 20, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  editButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: "rgba(229,9,20,0.22)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: "rgba(255,77,87,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,77,87,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  tandasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  miniTitle: { color: "#FFF", fontSize: 17, fontWeight: "900" },
  addButton: {
    backgroundColor: "rgba(229,9,20,0.20)",
    paddingHorizontal: 12,
    minHeight: 39,
    borderRadius: 12,
    justifyContent: "center",
  },
  tanda: {
    backgroundColor: "rgba(0,0,0,0.24)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 9,
    overflow: "hidden",
  },
  tandaHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  tandaTitle: { color: "#FFF", fontWeight: "900" },
  price: { color: "#FFF", fontSize: 18, fontWeight: "900", marginTop: 4 },
  tandaBody: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
    padding: 12,
  },
  editTandaButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,209,102,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.38)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.42 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: 12,
  },
  modalCard: {
    maxHeight: "92%",
    backgroundColor: "#171717",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  modalContent: { padding: 18, gap: 10, paddingBottom: 28 },
  modalTitle: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  field: { gap: 6 },
  label: { color: "#FFF", fontWeight: "900" },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    paddingHorizontal: 13,
  },
  multiline: { minHeight: 95, paddingTop: 12 },
  preview: { width: "100%", height: 155, borderRadius: 15 },
  uploadButton: {
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.40)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
  },
  toggleActive: {
    backgroundColor: "rgba(32,214,123,0.08)",
    borderColor: "rgba(32,214,123,0.30)",
  },
  dot: {
    width: 17,
    height: 17,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#777",
  },
  dotActive: { backgroundColor: "#20D67B", borderColor: "#20D67B" },
  toggleText: { color: "#DDD", fontWeight: "800" },
  drinksSection: {
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 17,
    padding: 12,
  },
  drinksHelp: {
    color: "#8F8F8F",
    fontSize: 12,
    lineHeight: 17,
  },
  drinkSearchInput: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    paddingHorizontal: 13,
  },
  drinksResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  drinksResultsText: {
    color: "#8F8F8F",
    fontSize: 11,
    fontWeight: "800",
  },
  clearDrinkSearchText: {
    color: "#FF737A",
    fontSize: 11,
    fontWeight: "900",
  },
  emptyDrinksBox: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  emptyDrinksTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyDrinksText: {
    color: "#777777",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
  },
  drinksScroll: {
    maxHeight: 310,
    borderRadius: 14,
  },
  drinksScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  drinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 9,
    borderRadius: 14,
  },
  drinkRowSelected: {
    backgroundColor: "rgba(32,214,123,0.08)",
    borderColor: "rgba(32,214,123,0.28)",
  },
  drinkImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#111111",
  },
  drinkImagePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  drinkImagePlaceholderText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  drinkInfo: {
    flex: 1,
    minWidth: 0,
  },
  drinkName: {
    color: "#FFF",
    fontWeight: "800",
  },
  drinkMetadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  drinkMetadata: {
    color: "#777777",
    fontSize: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantity: {
    width: 33,
    height: 33,
    borderRadius: 10,
    backgroundColor: "rgba(229,9,20,0.20)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.36)",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityDisabled: {
    opacity: 0.35,
  },
  quantityText: {
    color: "#FFF",
    minWidth: 22,
    textAlign: "center",
    fontWeight: "900",
  },
  cancelButton: {
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
});