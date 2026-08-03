import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createIdempotencyKey } from "../../../src/utils/idempotency";
import { getCargoServicioEntradasApi } from "../../api/configuracionApi";
import { getRRPPsDisponiblesEventoApi } from "../../api/eventsApi";
import { crearOrdenApi } from "../../api/ordersApi";
import { useAuth } from "../../auth/AuthContext";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { CargoServicioEntradas } from "../../types/configuracion";
import { RRPPDisponible } from "../../types/events";
import { AsignacionEntradaRequest } from "../../types/orders";
import { formatMoney } from "../../utils/formatMoney";

const RRPP_PAGE_SIZE = 10;

export default function BuyTicketScreen() {
  const { user } = useAuth();

  const params = useLocalSearchParams<{
    eventoId: string;
    tandaEntradaId: string;
    entradaNombre: string;
    entradaImagenUrl?: string;
    cantidadPersonas: string;
    esCombo: string;
    precio: string;
    incluyeBebidas?: string;
    descripcionBebidas?: string;
  }>();

  const eventoId = Number(params.eventoId);
  const tandaEntradaId = Number(params.tandaEntradaId);
  const cantidadPersonas = Number(params.cantidadPersonas || 1);
  const precio = Number(params.precio || 0);

  const esCombo = params.esCombo === "true";
  const entradaImagenUrl = params.entradaImagenUrl ?? "";
  const incluyeBebidas = params.incluyeBebidas === "true";
  const descripcionBebidas = params.descripcionBebidas ?? "";

  const [rrppModalOpen, setRrppModalOpen] = useState(false);

  const [rrpps, setRrpps] = useState<RRPPDisponible[]>([]);
  const [rrppSeleccionado, setRrppSeleccionado] =
    useState<RRPPDisponible | null>(null);

  const [rrppSearch, setRrppSearch] = useState("");
  const [rrppDebouncedSearch, setRrppDebouncedSearch] = useState("");

  const [rrppLoading, setRrppLoading] = useState(false);
  const [rrppRefreshing, setRrppRefreshing] = useState(false);
  const [rrppLoadingMore, setRrppLoadingMore] = useState(false);

  const [rrppPage, setRrppPage] = useState(1);
  const [rrppHasNextPage, setRrppHasNextPage] = useState(false);

  const [asignaciones, setAsignaciones] = useState<
    AsignacionEntradaRequest[]
  >([]);

  const [cargoServicio, setCargoServicio] =
    useState<CargoServicioEntradas | null>(null);

  /*
   * La misma clave se conserva mientras el usuario permanece
   * en esta pantalla. De esta manera, un doble toque o reintento
   * accidental no debería generar dos órdenes.
   */
  const [orderKey] = useState(() =>
    createIdempotencyKey("crear-orden")
  );

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const parametrosValidos = useMemo(() => {
    return (
      Number.isInteger(eventoId) &&
      eventoId > 0 &&
      Number.isInteger(tandaEntradaId) &&
      tandaEntradaId > 0 &&
      Number.isInteger(cantidadPersonas) &&
      cantidadPersonas > 0 &&
      Number.isFinite(precio) &&
      precio >= 0
    );
  }, [
    eventoId,
    tandaEntradaId,
    cantidadPersonas,
    precio,
  ]);

  const precioPorPersona = useMemo(() => {
    if (!esCombo || cantidadPersonas <= 0) {
      return precio;
    }

    return precio / cantidadPersonas;
  }, [precio, cantidadPersonas, esCombo]);

  const cantidadTickets = useMemo(() => {
    return esCombo ? cantidadPersonas : 1;
  }, [esCombo, cantidadPersonas]);

  const cargoServicioUnitario = useMemo(() => {
    if (!cargoServicio?.activo) {
      return 0;
    }

    const monto = Number(cargoServicio.monto ?? 0);

    return Number.isFinite(monto) && monto > 0
      ? monto
      : 0;
  }, [cargoServicio]);

  const cargoServicioMonto = useMemo(() => {
    return cargoServicioUnitario * cantidadTickets;
  }, [cargoServicioUnitario, cantidadTickets]);

  const totalFinal = useMemo(() => {
    return precio + cargoServicioMonto;
  }, [precio, cargoServicioMonto]);

  const esEntradaGratis = useMemo(() => {
    return totalFinal === 0;
  }, [totalFinal]);

  const inicializar = useCallback(async () => {
    try {
      setLoading(true);

      if (!parametrosValidos) {
        Alert.alert(
          "Datos inválidos",
          "No se pudo identificar correctamente el evento o la entrada."
        );

        return;
      }

      if (!user) {
        Alert.alert(
          "Sesión no disponible",
          "Necesitás iniciar sesión nuevamente."
        );

        return;
      }

      const cargoData =
        await getCargoServicioEntradasApi().catch(() => null);

      setCargoServicio(cargoData);

      /*
       * La primera entrada queda inicialmente asignada
       * al comprador.
       */
      const initialAsignaciones: AsignacionEntradaRequest[] =
        Array.from(
          { length: cantidadPersonas },
          (_, index) => {
            if (index === 0) {
              return {
                usuarioAsignadoId: user.userId,
                emailInvitado:
                  normalizarEmail(user.email) ?? null,
                nombreInvitado:
                  user.nombreCompleto?.trim() || null,
              };
            }

            return crearAsignacionVacia();
          }
        );

      setAsignaciones(initialAsignaciones);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudo cargar la información de compra."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [parametrosValidos, user, cantidadPersonas]);

  useEffect(() => {
    void inicializar();
  }, [inicializar]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRrppDebouncedSearch(rrppSearch.trim());
    }, 450);

    return () => clearTimeout(timeout);
  }, [rrppSearch]);

  const loadRRPPsFirstPage = useCallback(
    async (isRefreshing = false) => {
      if (!eventoId || eventoId <= 0) return;

      try {
        if (isRefreshing) {
          setRrppRefreshing(true);
        } else {
          setRrppLoading(true);
        }

        const result =
          await getRRPPsDisponiblesEventoApi({
            eventoId,
            page: 1,
            pageSize: RRPP_PAGE_SIZE,
            search: rrppDebouncedSearch || undefined,
          });

        /*
         * Filtrado defensivo.
         * Aunque el backend debe impedir la compra propia,
         * evitamos mostrar el perfil RRPP del mismo usuario.
         */
        const disponibles = (result.items ?? []).filter(
          (item) =>
            !user ||
            item.rrppUsuarioId !== user.userId
        );

        setRrpps(disponibles);
        setRrppPage(1);
        setRrppHasNextPage(Boolean(result.hasNextPage));
      } catch (error: unknown) {
        Alert.alert(
          "Error",
          getApiErrorMessage(
            error,
            "No se pudieron cargar los RRPP disponibles."
          )
        );
      } finally {
        setRrppLoading(false);
        setRrppRefreshing(false);
      }
    },
    [eventoId, rrppDebouncedSearch, user]
  );

  useEffect(() => {
    if (!rrppModalOpen) return;

    void loadRRPPsFirstPage(false);
  }, [rrppDebouncedSearch, rrppModalOpen, loadRRPPsFirstPage]);

  async function loadRRPPsMore() {
    if (
      rrppLoading ||
      rrppLoadingMore ||
      !rrppHasNextPage
    ) {
      return;
    }

    try {
      setRrppLoadingMore(true);

      const nextPage = rrppPage + 1;

      const result =
        await getRRPPsDisponiblesEventoApi({
          eventoId,
          page: nextPage,
          pageSize: RRPP_PAGE_SIZE,
          search: rrppDebouncedSearch || undefined,
        });

      setRrpps((prev) => {
        const idsActuales = new Set(
          prev.map((x) => x.rrppUsuarioId)
        );

        const nuevos = (result.items ?? []).filter(
          (item) =>
            !idsActuales.has(item.rrppUsuarioId) &&
            (!user ||
              item.rrppUsuarioId !== user.userId)
        );

        return [...prev, ...nuevos];
      });

      setRrppPage(nextPage);
      setRrppHasNextPage(Boolean(result.hasNextPage));
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        getApiErrorMessage(
          error,
          "No se pudieron cargar más RRPP."
        )
      );
    } finally {
      setRrppLoadingMore(false);
    }
  }

  function seleccionarRRPP(rrpp: RRPPDisponible) {
    if (
      user &&
      rrpp.rrppUsuarioId === user.userId
    ) {
      Alert.alert(
        "RRPP inválido",
        "No podés crear una orden utilizando tu propio perfil RRPP."
      );

      return;
    }

    setRrppSeleccionado(rrpp);
    setRrppModalOpen(false);
  }

  function updateAsignacion(
    index: number,
    field:
      | "emailInvitado"
      | "nombreInvitado",
    value: string
  ) {
    setAsignaciones((prev) => {
      const copy = [...prev];

      if (!copy[index]) {
        return prev;
      }

      copy[index] = {
        ...copy[index],

        /*
         * Al editar manualmente, el backend deberá
         * resolver la cuenta mediante el email.
         */
        usuarioAsignadoId: null,

        [field]:
          field === "emailInvitado"
            ? value.toLowerCase()
            : value,
      };

      return copy;
    });
  }

  function asignarComprador(index: number) {
    if (!user) return;

    setAsignaciones((prev) => {
      /*
       * El comprador solo puede aparecer una vez
       * en este combo.
       */
      const copy = prev.map((item) =>
        item.usuarioAsignadoId === user.userId
          ? crearAsignacionVacia()
          : item
      );

      copy[index] = {
        usuarioAsignadoId: user.userId,
        emailInvitado:
          normalizarEmail(user.email) ?? null,
        nombreInvitado:
          user.nombreCompleto?.trim() || null,
      };

      return copy;
    });
  }

  function limpiarAsignacion(index: number) {
    if (incluyeBebidas && index === 0) {
      Alert.alert(
        "Entrada principal",
        "Esta entrada incluye bebidas. La primera entrada debe permanecer asignada al comprador para generar correctamente el QR de bebida."
      );

      return;
    }

    setAsignaciones((prev) => {
      const copy = [...prev];

      copy[index] = crearAsignacionVacia();

      return copy;
    });
  }

  function normalizarAsignaciones():
    AsignacionEntradaRequest[] {
    return asignaciones.map((asignacion) => ({
      usuarioAsignadoId:
        asignacion.usuarioAsignadoId ?? null,

      emailInvitado:
        normalizarEmail(
          asignacion.emailInvitado
        ),

      nombreInvitado:
        asignacion.nombreInvitado
          ?.trim() || null,
    }));
  }

  function validarAsignaciones(
    normalizadas: AsignacionEntradaRequest[]
  ): boolean {
    if (
      normalizadas.length !== cantidadPersonas
    ) {
      Alert.alert(
        "Asignaciones incompletas",
        `Esta entrada requiere exactamente ${cantidadPersonas} asignaciones.`
      );

      return false;
    }

    for (
      let index = 0;
      index < normalizadas.length;
      index++
    ) {
      const asignacion = normalizadas[index];

      if (
        asignacion.emailInvitado &&
        !esEmailValido(
          asignacion.emailInvitado
        )
      ) {
        Alert.alert(
          "Email inválido",
          `El email de la entrada ${index + 1} no tiene un formato válido.`
        );

        return false;
      }

      if (
        !asignacion.emailInvitado &&
        asignacion.nombreInvitado?.includes("@")
      ) {
        Alert.alert(
          "Datos incorrectos",
          `En la entrada ${index + 1}, parece que ingresaste un email dentro del campo nombre.`
        );

        return false;
      }

      if (
        asignacion.usuarioAsignadoId &&
        asignacion.usuarioAsignadoId <= 0
      ) {
        Alert.alert(
          "Usuario inválido",
          `La asignación de la entrada ${index + 1} no es válida.`
        );

        return false;
      }
    }

    /*
     * Evita que una misma cuenta reciba más de una
     * entrada dentro del mismo combo.
     */
    const usuarioIds = normalizadas
      .map((x) => x.usuarioAsignadoId)
      .filter(
        (x): x is number =>
          typeof x === "number"
      );

    if (
      new Set(usuarioIds).size !==
      usuarioIds.length
    ) {
      Alert.alert(
        "Usuario repetido",
        "No podés asignar dos entradas del mismo combo a la misma cuenta."
      );

      return false;
    }

    /*
     * También se controla por email, porque los invitados
     * pueden no tener todavía UsuarioAsignadoId.
     */
    const emails = normalizadas
      .map((x) => x.emailInvitado)
      .filter(
        (x): x is string =>
          typeof x === "string" &&
          x.length > 0
      )
      .map((x) => x.toLowerCase());

    if (
      new Set(emails).size !== emails.length
    ) {
      Alert.alert(
        "Email repetido",
        "No podés asignar dos entradas del mismo combo al mismo email."
      );

      return false;
    }

    /*
     * Si incluye bebidas, la primera entrada debe ser
     * la del comprador.
     */
    if (
      incluyeBebidas &&
      normalizadas[0]?.usuarioAsignadoId !==
        user?.userId
    ) {
      Alert.alert(
        "Entrada principal requerida",
        "La primera entrada debe quedar asignada al comprador para generar correctamente el QR de bebida."
      );

      return false;
    }

    return true;
  }

  async function handleCrearOrden() {
    if (creating) return;

    if (!user) {
      Alert.alert(
        "Sesión no disponible",
        "Necesitás iniciar sesión nuevamente."
      );

      return;
    }

    if (!parametrosValidos) {
      Alert.alert(
        "Datos inválidos",
        "Los datos del evento o de la entrada no son válidos."
      );

      return;
    }

    if (!rrppSeleccionado) {
      Alert.alert(
        "Falta RRPP",
        "Seleccioná un RRPP para continuar."
      );

      return;
    }

    if (
      rrppSeleccionado.rrppUsuarioId ===
      user.userId
    ) {
      Alert.alert(
        "RRPP inválido",
        "No podés crear una orden utilizando tu propio perfil RRPP."
      );

      return;
    }

    const asignacionesNormalizadas =
      normalizarAsignaciones();

    if (
      !validarAsignaciones(
        asignacionesNormalizadas
      )
    ) {
      return;
    }

    try {
      setCreating(true);

      await crearOrdenApi({
        eventoId,
        idempotencyKey: orderKey,
        rrppUsuarioId:
          rrppSeleccionado.rrppUsuarioId,

        items: [
          {
            tandaEntradaId,

            /*
             * El backend resolverá automáticamente:
             *
             * - email existente:
             *   UsuarioAsignadoId completo.
             *
             * - email inexistente:
             *   ticket pendiente de reclamar.
             */
            asignaciones:
              asignacionesNormalizadas,
          },
        ],
      });

      Alert.alert(
        esEntradaGratis ? "Entrada solicitada" : "Orden creada",
        esEntradaGratis
          ? "Tu entrada gratuita estará disponible en unos minutos."
          : "Tu orden quedó pendiente de confirmación por el RRPP.",
        [
          {
            text: "Ver mis órdenes",
            onPress: () =>
              router.replace(
                "/user/orders" as never
              ),
          },
          {
            text: "Aceptar",
            onPress: () =>
              router.replace(
                "/user/events" as never
              ),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert(
        esEntradaGratis
          ? "No se pudo obtener la entrada"
          : "No se pudo crear la orden",
        getApiErrorMessage(
          error,
          "Revisá los datos e intentá nuevamente."
        )
      );
    } finally {
      setCreating(false);
    }
  }

  function renderRRPP({
    item,
  }: {
    item: RRPPDisponible;
  }) {
    const selected =
      rrppSeleccionado?.rrppUsuarioId ===
      item.rrppUsuarioId;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.rrppCard,
          selected &&
            styles.rrppCardSelected,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          seleccionarRRPP(item)
        }
      >
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarText}>
              {item.rrppNombre
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.flexOne}>
          <Text style={styles.rrppName}>
            {item.rrppNombre}
          </Text>

          {item.instagram ? (
            <Text style={styles.rrppMeta}>
              {item.instagram}
            </Text>
          ) : null}

          {item.telefonoContacto ? (
            <Text style={styles.rrppMeta}>
              {item.telefonoContacto}
            </Text>
          ) : null}
        </View>

        <Text style={styles.selectedMark}>
          {selected ? "✓" : ""}
        </Text>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <RoleGuard
        allowedRoles={["Usuario"]}
      >
        <AppLayout title="Comprar">
          <ActivityIndicator
            color="#E50914"
            style={{ marginTop: 60 }}
          />
        </AppLayout>
      </RoleGuard>
    );
  }

  if (!user || !parametrosValidos) {
    return (
      <RoleGuard
        allowedRoles={["Usuario"]}
      >
        <AppLayout title="Comprar">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No se puede continuar
            </Text>

            <Text style={styles.emptyText}>
              La sesión o los datos de la
              entrada no son válidos.
            </Text>

            <Pressable
              style={styles.closeModalButton}
              onPress={() => router.back()}
            >
              <Text
                style={styles.confirmButtonText}
              >
                Volver
              </Text>
            </Pressable>
          </View>
        </AppLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Usuario"]}>
      <AppLayout title="Comprar">
        <View style={styles.summaryCard}>
          {entradaImagenUrl ? (
            <Image
              source={{
                uri: entradaImagenUrl,
              }}
              style={styles.ticketImage}
            />
          ) : null}

          <View style={styles.textBlock}>
            <Text style={styles.ticketName}>
              {params.entradaNombre}
            </Text>

            <Text style={styles.muted}>
              {esCombo
                ? `Combo para ${cantidadPersonas} personas`
                : "Entrada individual"}
            </Text>

            {incluyeBebidas ? (
              <Text style={styles.benefit}>
                Incluye:{" "}
                {descripcionBebidas ||
                  "Bebidas seleccionadas"}
              </Text>
            ) : null}

            <Text style={styles.price}>
              {formatMoney(precio)}
            </Text>

            {esCombo ? (
              <Text style={styles.muted}>
                {formatMoney(
                  precioPorPersona
                )}{" "}
                por persona
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={styles.paymentSummaryCard}
        >
          <Text style={styles.paymentTitle}>
            Resumen de compra
          </Text>

          <View style={styles.paymentRow}>
            <Text
              style={styles.paymentLabel}
            >
              Subtotal entradas
            </Text>

            <Text
              style={styles.paymentValue}
            >
              {formatMoney(precio)}
            </Text>
          </View>

          {cargoServicioMonto > 0 ? (
            <View style={styles.paymentRow}>
              <View
                style={styles.paymentDescription}
              >
                <Text
                  style={styles.paymentLabel}
                >
                  {cargoServicio?.descripcion ||
                    "Cargo por servicio"}
                </Text>

                <Text
                  style={styles.paymentDetail}
                >
                  {cantidadTickets === 1
                    ? `${formatMoney(
                        cargoServicioUnitario
                      )} por ticket`
                    : `${cantidadTickets} tickets × ${formatMoney(
                        cargoServicioUnitario
                      )}`}
                </Text>
              </View>

              <Text
                style={styles.paymentValue}
              >
                {formatMoney(
                  cargoServicioMonto
                )}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.paymentSeparator}
          />

          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>
              Total final
            </Text>

            <Text style={styles.totalValue}>
              {formatMoney(totalFinal)}
            </Text>
          </View>

          <Text style={styles.paymentHelp}>
            {esEntradaGratis
              ? "La entrada es gratuita. El servidor validará nuevamente el total antes de emitirla."
              : esCombo
                ? `El cargo por servicio se aplica individualmente a cada uno de los ${cantidadTickets} tickets incluidos en el combo. El servidor validará nuevamente el importe al crear la orden.`
                : "El cargo por servicio se aplica al ticket. El servidor validará nuevamente el importe al crear la orden."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          RRPP
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.rrppSelector,
            rrppSeleccionado &&
              styles.rrppSelectorSelected,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            setRrppModalOpen(true)
          }
          disabled={creating}
        >
          {rrppSeleccionado ? (
            <>
              {rrppSeleccionado.avatarUrl ? (
                <Image
                  source={{
                    uri: rrppSeleccionado.avatarUrl,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={
                    styles.avatarPlaceholder
                  }
                >
                  <Text
                    style={styles.avatarText}
                  >
                    {rrppSeleccionado.rrppNombre
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.flexOne}>
                <Text style={styles.rrppName}>
                  {
                    rrppSeleccionado.rrppNombre
                  }
                </Text>

                <Text style={styles.rrppMeta}>
                  Cambiar RRPP
                </Text>
              </View>
            </>
          ) : (
            <Text
              style={
                styles.rrppSelectorText
              }
            >
              Buscar y seleccionar RRPP
            </Text>
          )}
        </Pressable>

        <Text style={styles.sectionTitle}>
          Asignar entradas
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Ingresá correctamente el nombre y el
            email de cada persona. Si el correo ya
            pertenece a una cuenta, la entrada se
            vinculará automáticamente. Si todavía
            no existe, quedará pendiente de
            reclamar.
          </Text>
        </View>

        {asignaciones.map(
          (asignacion, index) => {
            const asignadaAlComprador =
              asignacion.usuarioAsignadoId ===
              user.userId;

            const compradorYaAsignado =
              asignaciones.some(
                (x) =>
                  x.usuarioAsignadoId ===
                  user.userId
              );

            const esPrincipal = index === 0;

            const puedeAsignarComprador =
              !asignadaAlComprador &&
              !compradorYaAsignado;

            return (
              <View
                key={`asignacion-${index}`}
                style={[
                  styles.assignCard,
                  esPrincipal &&
                    incluyeBebidas &&
                    styles.mainAssignCard,
                ]}
              >
                <Text
                  style={styles.assignTitle}
                >
                  Entrada {index + 1}
                  {esPrincipal &&
                  incluyeBebidas
                    ? " · Principal con bebidas"
                    : ""}
                </Text>

                {asignadaAlComprador ? (
                  <View
                    style={styles.ownerBox}
                  >
                    <Text
                      style={styles.ownerText}
                    >
                      {user.nombreCompleto}
                    </Text>

                    <Text
                      style={styles.muted}
                    >
                      {user.email}
                    </Text>

                    <Text
                      style={styles.ownerBadge}
                    >
                      {esPrincipal &&
                      incluyeBebidas
                        ? "Recibirá el QR de bebida"
                        : "Asignada al comprador"}
                    </Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      placeholder="Nombre del invitado o dejar vacío"
                      placeholderTextColor="#8A8A8A"
                      value={
                        asignacion.nombreInvitado ??
                        ""
                      }
                      onChangeText={(value) =>
                        updateAsignacion(
                          index,
                          "nombreInvitado",
                          value
                        )
                      }
                      editable={!creating}
                      maxLength={150}
                      style={styles.input}
                    />

                    <TextInput
                      placeholder="Email del invitado"
                      placeholderTextColor="#8A8A8A"
                      value={
                        asignacion.emailInvitado ??
                        ""
                      }
                      onChangeText={(value) =>
                        updateAsignacion(
                          index,
                          "emailInvitado",
                          value
                        )
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!creating}
                      maxLength={254}
                      style={styles.input}
                    />

                    <Text style={styles.helpText}>
                      Cuenta existente: se asignará
                      directamente. Cuenta inexistente:
                      quedará pendiente para reclamar
                      después del pago.
                    </Text>
                  </>
                )}

                <View
                  style={styles.assignActions}
                >
                  {puedeAsignarComprador ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed &&
                          styles.pressed,
                      ]}
                      onPress={() =>
                        asignarComprador(index)
                      }
                      disabled={creating}
                    >
                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        Asignarme esta entrada
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.clearButton,
                      incluyeBebidas &&
                        esPrincipal &&
                        styles.clearButtonDisabled,
                      pressed &&
                        !(
                          incluyeBebidas &&
                          esPrincipal
                        ) &&
                        styles.pressed,
                    ]}
                    onPress={() =>
                      limpiarAsignacion(index)
                    }
                    disabled={
                      creating ||
                      (incluyeBebidas &&
                        esPrincipal)
                    }
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      {incluyeBebidas &&
                      esPrincipal
                        ? "Principal requerida"
                        : "Dejar pendiente"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }
        )}

        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            (!rrppSeleccionado ||
              creating) &&
              styles.confirmButtonDisabled,
            pressed &&
              !creating &&
              rrppSeleccionado &&
              styles.pressed,
          ]}
          onPress={handleCrearOrden}
          disabled={
            !rrppSeleccionado || creating
          }
        >
          {creating ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={styles.confirmButtonText}
            >
              {esEntradaGratis
                ? "Obtener entrada gratis"
                : `Crear orden por ${formatMoney(totalFinal)}`}
            </Text>
          )}
        </Pressable>

        <Modal
          visible={rrppModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setRrppModalOpen(false)
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Seleccionar RRPP
              </Text>

              <TextInput
                placeholder="Buscar por nombre, Instagram o teléfono..."
                placeholderTextColor="#888"
                value={rrppSearch}
                onChangeText={setRrppSearch}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.modalSearch}
              />

              {rrppLoading ? (
                <ActivityIndicator
                  color="#E50914"
                  style={{ marginTop: 30 }}
                />
              ) : (
                <FlatList
                  data={rrpps}
                  keyExtractor={(item) =>
                    String(
                      item.rrppUsuarioId
                    )
                  }
                  renderItem={renderRRPP}
                  onEndReached={
                    loadRRPPsMore
                  }
                  onEndReachedThreshold={0.4}
                  keyboardShouldPersistTaps="handled"
                  refreshControl={
                    <RefreshControl
                      refreshing={
                        rrppRefreshing
                      }
                      onRefresh={() =>
                        loadRRPPsFirstPage(
                          true
                        )
                      }
                      tintColor="#E50914"
                      colors={["#E50914"]}
                    />
                  }
                  ListEmptyComponent={
                    <View
                      style={styles.emptyCard}
                    >
                      <Text
                        style={styles.emptyText}
                      >
                        No se encontraron RRPP
                        disponibles.
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    rrppLoadingMore ? (
                      <ActivityIndicator
                        color="#E50914"
                        style={{
                          marginVertical: 20,
                        }}
                      />
                    ) : null
                  }
                  contentContainerStyle={{
                    paddingBottom: 18,
                  }}
                />
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.closeModalButton,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setRrppModalOpen(false)
                }
              >
                <Text
                  style={
                    styles.confirmButtonText
                  }
                >
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}

function crearAsignacionVacia():
  AsignacionEntradaRequest {
  return {
    usuarioAsignadoId: null,
    emailInvitado: null,
    nombreInvitado: null,
  };
}

function normalizarEmail(
  email?: string | null
): string | null {
  if (!email?.trim()) return null;

  return email
    .trim()
    .toLowerCase();
}

function esEmailValido(
  email: string
): boolean {
  /*
   * Validación práctica de frontend.
   * La validación definitiva debe permanecer
   * también en el backend.
   */
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function getApiErrorMessage(
  error: unknown,
  fallback: string
): string {
  const data = (error as { response?: { data?: unknown } })
    ?.response?.data;

  if (!data) {
    return error instanceof Error
      ? error.message
      : fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  const dataObj = data as {
    message?: unknown;
    title?: unknown;
    errors?: unknown;
  };

  if (
    typeof dataObj.message === "string"
  ) {
    return dataObj.message;
  }

  if (
    typeof dataObj.title === "string" &&
    !dataObj.errors
  ) {
    return dataObj.title;
  }

  /*
   * Errores automáticos de validación
   * generados por ASP.NET Core.
   */
  if (
    dataObj.errors &&
    typeof dataObj.errors === "object"
  ) {
    const mensajes = Object.values(
      dataObj.errors as Record<string, unknown>
    )
      .flatMap((value) =>
        Array.isArray(value)
          ? value
          : [value]
      )
      .filter(
        (value): value is string =>
          typeof value === "string"
      );

    if (mensajes.length > 0) {
      return mensajes.join("\n");
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
  },
  summaryCard: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ticketImage: {
    width: 130,
    height: 130,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
  },
  textBlock: {
    flex: 1,
  },
  ticketName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  muted: {
    color: "#BDBDBD",
    marginTop: 6,
  },
  benefit: {
    color: "#20D67B",
    fontWeight: "900",
    marginTop: 8,
  },
  price: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 12,
  },
  paymentSummaryCard: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginTop: 14,
  },
  paymentTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  paymentDescription: {
    flex: 1,
  },
  paymentLabel: {
    color: "#BDBDBD",
  },
  paymentDetail: {
    color: "#8F8F8F",
    fontSize: 12,
    marginTop: 3,
  },
  paymentValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  paymentSeparator: {
    height: 1,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    marginVertical: 12,
  },
  totalLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  totalValue: {
    color: "#20D67B",
    fontSize: 20,
    fontWeight: "900",
  },
  paymentHelp: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 28,
    marginBottom: 12,
  },
  rrppSelector: {
    minHeight: 72,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
    backgroundColor:
      "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rrppSelectorSelected: {
    borderColor: "#E50914",
    backgroundColor:
      "rgba(229,9,20,0.14)",
  },
  rrppSelectorText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  infoCard: {
    backgroundColor:
      "rgba(229,9,20,0.12)",
    borderColor:
      "rgba(229,9,20,0.25)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 18,
    marginTop: 14,
    marginBottom: 14,
  },
  infoText: {
    color: "#D0D0D0",
    lineHeight: 20,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    color: "#BDBDBD",
    marginTop: 7,
  },
  rrppCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  rrppCardSelected: {
    borderColor: "#E50914",
    backgroundColor:
      "rgba(229,9,20,0.14)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  rrppName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  rrppMeta: {
    color: "#BDBDBD",
    marginTop: 3,
  },
  selectedMark: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  assignCard: {
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  mainAssignCard: {
    borderColor:
      "rgba(32,214,123,0.45)",
    backgroundColor:
      "rgba(32,214,123,0.08)",
  },
  assignTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  ownerBox: {
    backgroundColor:
      "rgba(32,214,123,0.12)",
    borderColor:
      "rgba(32,214,123,0.25)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  ownerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  ownerBadge: {
    color: "#20D67B",
    fontWeight: "900",
    marginTop: 8,
  },
  input: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  helpText: {
    color: "#9B9B9B",
    fontSize: 12,
    lineHeight: 17,
  },
  assignActions: {
    gap: 10,
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor:
      "rgba(32,214,123,0.18)",
    borderColor:
      "rgba(32,214,123,0.32)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
  },
  clearButton: {
    backgroundColor:
      "rgba(255,255,255,0.12)",
    borderColor:
      "rgba(255,255,255,0.12)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  confirmButton: {
    backgroundColor: "#E50914",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.72)",
    padding: 16,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 16,
    maxHeight: "86%",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  modalSearch: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  closeModalButton: {
    backgroundColor: "#E50914",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
});