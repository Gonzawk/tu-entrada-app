import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  const [confirmaMayorDeEdad, setConfirmaMayorDeEdad] = useState(false);
  const [modalMayorEdadVisible, setModalMayorEdadVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  function abrirDeclaracionMayorEdad() {
    if (loading) {
      return;
    }

    setModalMayorEdadVisible(true);
  }

  function aceptarDeclaracionMayorEdad() {
    setConfirmaMayorDeEdad(true);
    setModalMayorEdadVisible(false);
  }

  function cerrarDeclaracionMayorEdad() {
    setModalMayorEdadVisible(false);
  }

  function quitarConfirmacionMayorEdad() {
    if (loading) {
      return;
    }

    setConfirmaMayorDeEdad(false);
  }

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNombre = nombreCompleto.trim();
    const normalizedTelefono = telefono.trim();
    const normalizedPassword = password.trim();

    if (!normalizedNombre || !normalizedEmail || !normalizedPassword) {
      Alert.alert(
        "Datos incompletos",
        "Completá nombre, email y contraseña."
      );
      return;
    }

    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      Alert.alert("Email inválido", "Ingresá un correo válido.");
      return;
    }

    if (normalizedPassword.length < 6) {
      Alert.alert(
        "Contraseña inválida",
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (!confirmaMayorDeEdad) {
      Alert.alert(
        "Confirmación requerida",
        "Debes declarar que eres mayor de 18 años para crear una cuenta.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Leer declaración",
            onPress: abrirDeclaracionMayorEdad,
          },
        ]
      );

      return;
    }

    try {
      setLoading(true);

      const result = await register({
        nombreCompleto: normalizedNombre,
        email: normalizedEmail,
        telefono: normalizedTelefono,
        password: normalizedPassword,
        confirmaMayorDeEdad: true,
      });

      router.replace({
        pathname: "/auth/verify-email-pending",
        params: {
          email: result.email ?? normalizedEmail,
        },
      } as never);
    } catch (e: any) {
      const data = e?.response?.data;

      if (data?.requiereVerificacionEmail) {
        router.replace({
          pathname: "/auth/verify-email-pending",
          params: {
            email: data.email ?? normalizedEmail,
          },
        } as never);

        return;
      }

      Alert.alert(
        "Error",
        String(data?.message ?? data ?? "No se pudo crear la cuenta.")
      );
    } finally {
      setLoading(false);
    }
  }

  const registerDisabled = loading || !confirmaMayorDeEdad;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/branding/iconn.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Crear cuenta</Text>

            <Text style={styles.subtitle}>
              Registrate para comprar y reclamar tus entradas.
            </Text>

            <View style={styles.form}>
              <TextInput
                placeholder="Nombre completo"
                placeholderTextColor="#8A8A8A"
                value={nombreCompleto}
                onChangeText={setNombreCompleto}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={!loading}
                style={styles.input}
              />

              <TextInput
                placeholder="Email"
                placeholderTextColor="#8A8A8A"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!loading}
                style={styles.input}
              />

              <TextInput
                placeholder="Teléfono (opcional)"
                placeholderTextColor="#8A8A8A"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={!loading}
                style={styles.input}
              />

              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="#8A8A8A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!loading}
                style={styles.input}
              />

              <View style={styles.ageSection}>
                <View style={styles.ageHeader}>
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageBadgeText}>+18</Text>
                  </View>

                  <View style={styles.ageHeaderTextContainer}>
                    <Text style={styles.ageTitle}>
                      Declaración de mayoría de edad
                    </Text>

                    <Text style={styles.ageSubtitle}>
                      Requerida para crear una cuenta.
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="Declaro que soy mayor de 18 años"
                  accessibilityState={{
                    checked: confirmaMayorDeEdad,
                    disabled: loading,
                  }}
                  style={styles.checkboxRow}
                  onPress={
                    confirmaMayorDeEdad
                      ? quitarConfirmacionMayorEdad
                      : abrirDeclaracionMayorEdad
                  }
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.checkbox,
                      confirmaMayorDeEdad && styles.checkboxChecked,
                    ]}
                  >
                    {confirmaMayorDeEdad && (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    )}
                  </View>

                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxLabel}>
                      Declaro que soy mayor de 18 años.
                    </Text>

                    <Text style={styles.checkboxHint}>
                      Tocá para leer y aceptar la declaración.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.readPolicyButton}
                  onPress={abrirDeclaracionMayorEdad}
                  disabled={loading}
                >
                  <Text style={styles.readPolicyButtonText}>
                    Ver declaración y condiciones +18
                  </Text>
                </Pressable>

                {confirmaMayorDeEdad && (
                  <View style={styles.confirmedContainer}>
                    <Text style={styles.confirmedIcon}>✓</Text>

                    <Text style={styles.confirmedText}>
                      Declaración aceptada
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  registerDisabled && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={registerDisabled}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Registrarme</Text>
                )}
              </Pressable>

              {!confirmaMayorDeEdad && (
                <Text style={styles.registerRequirementText}>
                  Debes aceptar la declaración +18 para continuar.
                </Text>
              )}

              <Pressable
                style={styles.secondaryButton}
                onPress={() => router.replace("/auth/login" as never)}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Volver al login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalMayorEdadVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cerrarDeclaracionMayorEdad}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalAgeBadge}>
                  <Text style={styles.modalAgeBadgeText}>+18</Text>
                </View>

                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>
                    Declaración de mayoría de edad
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Lee esta información antes de continuar.
                  </Text>
                </View>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.policyMainText}>
                  Declaro que soy mayor de 18 años y que la información
                  proporcionada durante el registro es verdadera.
                </Text>

                <View style={styles.policyItem}>
                  <View style={styles.policyItemNumber}>
                    <Text style={styles.policyItemNumberText}>1</Text>
                  </View>

                  <Text style={styles.policyItemText}>
                    Comprendo que la compra y el canje de bebidas alcohólicas
                    están permitidos únicamente para personas mayores de 18
                    años.
                  </Text>
                </View>

                <View style={styles.policyItem}>
                  <View style={styles.policyItemNumber}>
                    <Text style={styles.policyItemNumberText}>2</Text>
                  </View>

                  <Text style={styles.policyItemText}>
                    Los códigos QR correspondientes a bebidas representan un
                    voucher canjeable y no garantizan por sí solos la entrega
                    del producto.
                  </Text>
                </View>

                <View style={styles.policyItem}>
                  <View style={styles.policyItemNumber}>
                    <Text style={styles.policyItemNumberText}>3</Text>
                  </View>

                  <Text style={styles.policyItemText}>
                    La entrega de bebidas estará sujeta a la validación del
                    Documento Nacional de Identidad (DNI) u otro documento
                    oficial vigente que permita acreditar la identidad y la
                    mayoría de edad.
                  </Text>
                </View>

                <View style={styles.policyItem}>
                  <View style={styles.policyItemNumber}>
                    <Text style={styles.policyItemNumberText}>4</Text>
                  </View>

                  <Text style={styles.policyItemText}>
                    El personal del evento o del punto de entrega podrá
                    rechazar el canje cuando el documento no sea válido, no
                    corresponda al titular o no permita comprobar la mayoría de
                    edad.
                  </Text>
                </View>

                <View style={styles.policyWarning}>
                  <Text style={styles.policyWarningTitle}>
                    Importante
                  </Text>

                  <Text style={styles.policyWarningText}>
                    La declaración realizada durante el registro no reemplaza
                    la validación presencial del documento al momento del
                    canje.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.acceptButton}
                  onPress={aceptarDeclaracionMayorEdad}
                >
                  <Text style={styles.acceptButtonText}>
                    Soy mayor de 18 años y acepto
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={cerrarDeclaracionMayorEdad}
                >
                  <Text style={styles.cancelButtonText}>
                    Volver sin aceptar
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 22,
  },

  logo: {
    width: 150,
    height: 150,
    opacity: 0.92,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#B8B8B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 20,
  },

  form: {
    gap: 12,
  },

  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontSize: 15,
  },

  ageSection: {
    marginTop: 4,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(229,9,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.34)",
  },

  ageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  ageBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },

  ageBadgeText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  ageHeaderTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  ageTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  ageSubtitle: {
    color: "#B8B8B8",
    fontSize: 12,
    marginTop: 3,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#8A8A8A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkboxChecked: {
    backgroundColor: "#E50914",
    borderColor: "#E50914",
  },

  checkboxCheck: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },

  checkboxTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  checkboxLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },

  checkboxHint: {
    color: "#9F9F9F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  readPolicyButton: {
    alignSelf: "flex-start",
    marginTop: 13,
    paddingVertical: 4,
  },

  readPolicyButtonText: {
    color: "#FF6068",
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  confirmedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "rgba(67, 181, 129, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(67, 181, 129, 0.32)",
  },

  confirmedIcon: {
    color: "#57D699",
    fontSize: 15,
    fontWeight: "900",
  },

  confirmedText: {
    color: "#A6EFCB",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },

  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  buttonDisabled: {
    opacity: 0.48,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  registerRequirementText: {
    color: "#A8A8A8",
    fontSize: 12,
    textAlign: "center",
    marginTop: -4,
  },

  secondaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },

  modalKeyboardView: {
    flex: 1,
    justifyContent: "center",
  },

  modalContainer: {
    maxHeight: "92%",
    backgroundColor: "#151515",
    borderRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignSelf: "center",
    marginBottom: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
  },

  modalAgeBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
  },

  modalAgeBadgeText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },

  modalHeaderText: {
    flex: 1,
    marginLeft: 13,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },

  modalSubtitle: {
    color: "#AFAFAF",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  modalScroll: {
    marginTop: 16,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  policyMainText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginBottom: 18,
  },

  policyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },

  policyItemNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(229,9,20,0.18)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  policyItemNumberText: {
    color: "#FF666E",
    fontSize: 12,
    fontWeight: "900",
  },

  policyItemText: {
    flex: 1,
    color: "#D0D0D0",
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 11,
  },

  policyWarning: {
    marginTop: 2,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "rgba(255,180,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,180,0,0.28)",
  },

  policyWarningTitle: {
    color: "#FFD16A",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5,
  },

  policyWarningText: {
    color: "#D4C49E",
    fontSize: 12,
    lineHeight: 18,
  },

  modalActions: {
    marginTop: 17,
    gap: 9,
  },

  acceptButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#E50914",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  cancelButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#C5C5C5",
    fontSize: 14,
    fontWeight: "700",
  },
});