import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const getAppVariant = (): AppVariant => {
  const variant = process.env.APP_VARIANT;

  if (
    variant === "development" ||
    variant === "preview" ||
    variant === "production"
  ) {
    return variant;
  }

  return "development";
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = getAppVariant();

  const isProduction = appVariant === "production";
  const isPreview = appVariant === "preview";

  /*
   * Nombre visible de la aplicación.
   */
  const appName = isProduction
    ? "Lucky"
    : isPreview
      ? "Lucky Testing"
      : "Lucky Dev";

  /*
   * Scheme personalizado.
   */
  const appScheme = isProduction
    ? "lucky"
    : isPreview
      ? "lucky-testing"
      : "lucky-dev";

  /*
   * Identificador único según entorno.
   *
   * Permite instalar Development, Testing y Production
   * simultáneamente.
   */
  const applicationIdentifier = isProduction
    ? "com.gonza77.lucky"
    : isPreview
      ? "com.gonza77.lucky.testing"
      : "com.gonza77.lucky.development";

  /*
   * Firebase Android según entorno.
   */
  const googleServicesFile = isProduction
    ? "./firebase/production/google-services.json"
    : isPreview
      ? "./firebase/testing/google-services.json"
      : "./firebase/development/google-services.json";

  /*
   * Firebase iOS según entorno.
   *
   * Deben existir:
   *
   * firebase/production/GoogleService-Info.plist
   * firebase/testing/GoogleService-Info.plist
   * firebase/development/GoogleService-Info.plist
   */
  const googleServicesPlist = isProduction
    ? "./firebase/production/GoogleService-Info.plist"
    : isPreview
      ? "./firebase/testing/GoogleService-Info.plist"
      : "./firebase/development/GoogleService-Info.plist";

  /*
   * Universal Links y Android App Links.
   */
  const universalLinkHost = "app.lucky.com.ar";

  return {
    ...config,

    name: appName,
    slug: "lucky",
    owner: "gonza77",

    version: "1.0.0",

    orientation: "portrait",

    icon: "./assets/branding/icon.png",

    scheme: appScheme,

    userInterfaceStyle: "automatic",

    newArchEnabled: true,

    ios: {
      supportsTablet: false,

      icon: "./assets/branding/icon.png",

      bundleIdentifier: applicationIdentifier,

      /*
       * EAS administra el build number remotamente
       * mediante appVersionSource: remote.
       */
      buildNumber: "1",

      /*
       * Firebase nativo para iOS.
       */
      googleServicesFile: googleServicesPlist,

      associatedDomains: [
        `applinks:${universalLinkHost}`,
      ],

      infoPlist: {
        /*
         * Lucky utiliza solamente cifrado estándar/exento,
         * principalmente HTTPS/TLS.
         */
        ITSAppUsesNonExemptEncryption: false,

        NSCameraUsageDescription:
          "Lucky necesita usar la cámara para escanear códigos QR de entradas, bebidas y beneficios.",

        NSPhotoLibraryUsageDescription:
          "Lucky necesita acceder a tus imágenes para seleccionar contenido desde la galería.",
      },
    },

    android: {
      package: applicationIdentifier,

      /*
       * EAS administra versionCode remotamente
       * para builds con autoIncrement.
       */
      versionCode: 1,

      googleServicesFile,

      adaptiveIcon: {
        foregroundImage:
          "./assets/branding/adaptive-foreground.png",

        backgroundImage:
          "./assets/branding/adaptive-background.png",
      },

      predictiveBackGestureEnabled: false,

      permissions: [
        "CAMERA",
        "POST_NOTIFICATIONS",
      ],

      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,

          data: [
            {
              scheme: "https",
              host: universalLinkHost,
              pathPrefix: "/auth/verify-email",
            },
            {
              scheme: "https",
              host: universalLinkHost,
              pathPrefix: "/auth/reset-password",
            },
          ],

          category: [
            "BROWSABLE",
            "DEFAULT",
          ],
        },
      ],
    },

    web: {
      output: "static",

      favicon: "./assets/branding/favicon.png",
    },

    plugins: [
      "expo-router",

      /*
       * React Native Firebase.
       *
       * Deshabilitamos SPM en iOS para utilizar CocoaPods
       * junto con static frameworks.
       */
      [
        "@react-native-firebase/app",
        {
          ios: {
            disableSPM: true,
          },
        },
      ],

      "@react-native-firebase/auth",

      /*
       * Configuración nativa iOS para React Native Firebase.
       *
       * RNFBApp y RNFBAuth se enlazan estáticamente para evitar
       * los errores de headers no modulares encontrados en Xcode.
       */
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",

            forceStaticLinking: [
              "RNFBApp",
              "RNFBAuth",
            ],
          },
        },
      ],

      [
        "expo-splash-screen",
        {
          image: "./assets/branding/splash-icon.png",

          imageWidth: 220,

          resizeMode: "contain",

          backgroundColor: "#000000",

          dark: {
            image: "./assets/branding/splash-icon.png",

            backgroundColor: "#000000",
          },
        },
      ],

      [
        "expo-notifications",
        {
          icon:
            "./assets/branding/notification-icon.png",

          color: "#FFFFFF",

          defaultChannel: "default",
        },
      ],

      [
        "expo-camera",
        {
          cameraPermission:
            "Lucky necesita usar la cámara para escanear códigos QR de entradas, bebidas y beneficios.",
        },
      ],

      "expo-secure-store",
      "expo-font",
      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: false,
      reactCompiler: true,
    },

    extra: {
      router: {},

      appVariant,

      eas: {
        projectId:
          "c2ec45a4-e3c8-45ca-b2ab-80e17b7cc166",
      },
    },
  };
};