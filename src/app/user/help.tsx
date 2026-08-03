import { router } from "expo-router";
import { useState } from "react";
import {
    Linking,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { TipoDocumentoLegal } from "../../api/legalApi";
import { AppLayout } from "../../components/shared/AppLayout";
import { RoleGuard } from "../../components/shared/RoleGuard";
import { HELP_QUESTIONS } from "../../help/helpContent";

interface LegalLink {
  tipoDocumento: TipoDocumentoLegal;
  titulo: string;
  descripcion: string;
}

const LEGAL_DOCUMENTS: LegalLink[] = [
  {
    tipoDocumento: "Privacidad",
    titulo: "Política de Privacidad",
    descripcion: "Información sobre el tratamiento y protección de datos.",
  },
  {
    tipoDocumento: "Terminos",
    titulo: "Términos y Condiciones",
    descripcion: "Reglas generales para utilizar TuEntrada.",
  },
  {
    tipoDocumento: "CondicionesCompra",
    titulo: "Condiciones de Compra",
    descripcion: "Canales oficiales, pagos, tickets y responsabilidades.",
  },
  {
    tipoDocumento: "Reembolsos",
    titulo: "Reembolsos y Reprogramaciones",
    descripcion: "Condiciones aplicables ante cambios o cancelaciones.",
  },
  {
    tipoDocumento: "ReglamentoEventos",
    titulo: "Reglamento General de Eventos",
    descripcion: "Normas de ingreso, horarios, seguridad y uso de QR.",
  },
];

export default function UserHelpScreen() {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  const supportWhatsApp =
    process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "");

  function toggleQuestion(id: string) {
    setOpenQuestionId((current) => (current === id ? null : id));
  }

 function abrirDocumentoDesdeAyuda(document: {
  tipoDocumento: TipoDocumentoLegal;
  titulo: string;
}) {
  router.push({
    pathname: "/legal/document",
    params: {
      tipoDocumento: document.tipoDocumento,
      titulo: document.titulo,
      mode: "readOnly",
    },
  } as never);
}

  async function openSupportEmail() {
    if (!supportEmail) return;

    const subject = encodeURIComponent("Consulta desde TuEntrada");

    await Linking.openURL(
      `mailto:${supportEmail}?subject=${subject}`
    );
  }

  async function openSupportWhatsApp() {
    if (!supportWhatsApp) return;

    const message = encodeURIComponent(
      "Hola, necesito ayuda con la aplicación TuEntrada."
    );

    await Linking.openURL(
      `https://wa.me/${supportWhatsApp}?text=${message}`
    );
  }

  const hasSupportContact = Boolean(supportEmail || supportWhatsApp);

  return (
    <RoleGuard
      allowedRoles={[
        "Usuario",
        "RRPP",
        "Barra",
        "Puerta",
        "Ventanilla",
        "Admin",
        "SuperAdmin",
      ]}
    >
      <AppLayout title="Ayuda">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Centro de ayuda</Text>

          <Text style={styles.heroText}>
            Encontrá información sobre compras, pagos, tickets, códigos QR,
            eventos y beneficios.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>

        <View style={styles.sectionCard}>
          {HELP_QUESTIONS.map((question, index) => {
            const isOpen = openQuestionId === question.id;

            return (
              <View key={question.id}>
                <Pressable
                  style={({ pressed }) => [
                    styles.questionHeader,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleQuestion(question.id)}
                >
                  <Text style={styles.questionTitle}>
                    {question.title}
                  </Text>

                  <Text style={styles.arrow}>
                    {isOpen ? "−" : "+"}
                  </Text>
                </Pressable>

                {isOpen ? (
                  <View style={styles.answerBox}>
                    <Text style={styles.answerText}>
                      {question.content}
                    </Text>
                  </View>
                ) : null}

                {index < HELP_QUESTIONS.length - 1 ? (
                  <View style={styles.separator} />
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Información legal</Text>

        <View style={styles.sectionCard}>
          {LEGAL_DOCUMENTS.map((document, index) => (
            <View key={document.tipoDocumento}>
              <Pressable
                style={({ pressed }) => [
                  styles.legalRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => abrirDocumentoDesdeAyuda(document)}
              >
                <View style={styles.legalIcon}>
                  <Text style={styles.legalIconText}>§</Text>
                </View>

                <View style={styles.legalContent}>
                  <Text style={styles.legalTitle}>
                    {document.titulo}
                  </Text>

                  <Text style={styles.legalDescription}>
                    {document.descripcion}
                  </Text>
                </View>

                <Text style={styles.legalArrow}>›</Text>
              </Pressable>

              {index < LEGAL_DOCUMENTS.length - 1 ? (
                <View style={styles.separator} />
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>Compra segura</Text>

          <Text style={styles.securityText}>
            Solo se garantizan entradas adquiridas desde TuEntrada, mediante
            RRPP habilitados o utilizando medios de pago oficiales iniciados
            desde la plataforma.
          </Text>

          <Text style={styles.securityWarning}>
            No compartas tu QR ni compres tickets a terceros.
          </Text>
        </View>

        {hasSupportContact ? (
          <>
            <Text style={styles.sectionTitle}>Contacto</Text>

            <View style={styles.sectionCard}>
              {supportWhatsApp ? (
                <Pressable
                  style={styles.contactButton}
                  onPress={openSupportWhatsApp}
                >
                  <Text style={styles.contactButtonText}>
                    Contactar por WhatsApp
                  </Text>
                </Pressable>
              ) : null}

              {supportEmail ? (
                <Pressable
                  style={styles.emailButton}
                  onPress={openSupportEmail}
                >
                  <Text style={styles.contactButtonText}>
                    Enviar correo a soporte
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </AppLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "rgba(229,9,20,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  heroText: {
    color: "#D0D0D0",
    lineHeight: 21,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  questionHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  questionTitle: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  arrow: {
    color: "#E50914",
    fontSize: 26,
    fontWeight: "900",
  },
  answerBox: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 16,
    padding: 13,
    marginBottom: 13,
  },
  answerText: {
    color: "#D0D0D0",
    lineHeight: 21,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  legalRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  legalIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(229,9,20,0.16)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  legalIconText: {
    color: "#E50914",
    fontSize: 21,
    fontWeight: "900",
  },
  legalContent: {
    flex: 1,
  },
  legalTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  legalDescription: {
    color: "#AFAFAF",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },
  legalArrow: {
    color: "#FFFFFF",
    fontSize: 28,
  },
  securityCard: {
    backgroundColor: "rgba(255,209,102,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.27)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
  },
  securityTitle: {
    color: "#FFD166",
    fontSize: 19,
    fontWeight: "900",
  },
  securityText: {
    color: "#D0D0D0",
    lineHeight: 21,
    marginTop: 8,
  },
  securityWarning: {
    color: "#FFD166",
    lineHeight: 20,
    marginTop: 10,
    fontWeight: "900",
  },
  contactButton: {
    backgroundColor: "#20B85A",
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  emailButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.75,
  },
});