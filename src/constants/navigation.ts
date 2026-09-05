import { UserRole } from "../types/auth";

export interface AppMenuItem {
  label: string;
  route: string;
  roles: UserRole[];
}

const ALL_AUTHENTICATED_ROLES: UserRole[] = [
  "Usuario",
  "RRPP",
  "Puerta",
  "Barra",
  "Ventanilla",
  "Admin",
  "SuperAdmin",
];

export const PROFILE_ROUTE = "/profile";

export const APP_MENU_ITEMS: AppMenuItem[] = [
  // PERFIL - DISPONIBLE PARA TODOS LOS USUARIOS AUTENTICADOS
  // En AppLayout se muestra primero para roles operativos y de cliente.
  // Para Admin y SuperAdmin se muestra como acceso independiente y más discreto.
  {
    label: "Mi perfil",
    route: PROFILE_ROUTE,
    roles: ALL_AUTHENTICATED_ROLES,
  },

  // CLIENTE
  { label: "Eventos", route: "/user/events", roles: ["Usuario"] },
  { label: "Mis órdenes", route: "/user/orders", roles: ["Usuario"] },
  { label: "Mis entradas", route: "/user/tickets", roles: ["Usuario"] },
  { label: "Pendientes", route: "/user/pending-tickets", roles: ["Usuario"] },
  { label: "Barra / Bebidas", route: "/user/drinks-catalog-auto", roles: ["Usuario"] },
  { label: "Mis bebidas", route: "/user/drink-orders", roles: ["Usuario"] },
  { label: "Mi cumpleaños", route: "/user/birthday-request", roles: ["Usuario"] },
  { label: "Ayuda", route: "/user/help", roles: ["Usuario"] },

  // RRPP
  { label: "Panel RRPP", route: "/rrpp/dashboard", roles: ["RRPP"] },
  { label: "Mis eventos RRPP", route: "/rrpp/events", roles: ["RRPP"] },
  { label: "Órdenes pendientes", route: "/rrpp/pending-orders", roles: ["RRPP"] },
  { label: "Historial RRPP", route: "/rrpp/history", roles: ["RRPP"] },

  // PUERTA
  { label: "Panel puerta", route: "/door/dashboard", roles: ["Puerta"] },
  { label: "Scanner puerta", route: "/door/scanner", roles: ["Puerta"] },

  // BARRA
  { label: "Panel barra", route: "/barra/dashboard", roles: ["Barra"] },
  { label: "Barra", route: "/barra", roles: ["Barra"] },
  { label: "Resumen Ventas", route: "/barra/sales", roles: ["Barra"] },
  { label: "Mis cajas", route: "/barra/cajas", roles: ["Barra"] },

  // VENTANILLA
  { label: "Ventanilla", route: "/ventanilla", roles: ["Ventanilla"] },
  { label: "Resumen ventas", route: "/ventanilla/sales", roles: ["Ventanilla"] },
  { label: "Mis cajas", route: "/ventanilla/cajas", roles: ["Ventanilla"] },

  // ADMIN / SUPERADMIN
  { label: "Panel Admin", route: "/admin/dashboard", roles: ["Admin", "SuperAdmin"] },
  { label: "Eventos", route: "/admin/events/events", roles: ["Admin", "SuperAdmin"] },
  { label: "Usuarios", route: "/admin/users", roles: ["Admin", "SuperAdmin"] },
  { label: "RRPPs", route: "/admin/rrpps/rrpps", roles: ["Admin", "SuperAdmin"] },
  { label: "Barra", route: "/admin/barra/barra-users", roles: ["Admin", "SuperAdmin"] },
  { label: "Puerta", route: "/admin/door/door-users", roles: ["Admin", "SuperAdmin"] },
  { label: "Ventanilla", route: "/admin/ventanilla/ventanilla-users", roles: ["Admin", "SuperAdmin"] },
  { label: "Rendición RRPP", route: "/admin/settlements", roles: ["Admin", "SuperAdmin"] },
  { label: "Generar tickets", route: "/admin/tickets/generate-tickets", roles: ["Admin", "SuperAdmin"] },
  { label: "Códigos tickets", route: "/admin/tickets/manual-tickets", roles: ["Admin", "SuperAdmin"] },
  { label: "Solicitudes cumpleaños", route: "/admin/cumpleanios/birthday-requests", roles: ["Admin", "SuperAdmin"] },
  { label: "Crear QR multiingreso", route: "/admin/tickets/create-multi-ticket", roles: ["Admin", "SuperAdmin"] },
  { label: "Bebidas", route: "/admin/drinks", roles: ["Admin", "SuperAdmin"] },
  { label: "Cajas", route: "/admin/cajas/cajas", roles: ["Admin", "SuperAdmin"] },
  { label: "Configuración sistema", route: "/admin/system-config", roles: ["SuperAdmin"] },
  { label: "Terminales POS", route: "/admin/mercadopago/", roles: ["Admin", "SuperAdmin"] },
  { label: "Estadísticas", route: "/admin/estadisticas/stats", roles: ["Admin", "SuperAdmin"] },
  { label: "Alertas fraude", route: "/admin/fraudes/fraud-alerts", roles: ["Admin", "SuperAdmin"] },
  { label: "Solicitudes eliminación de cuenta", route: "/admin/account-deletion", roles: ["Admin", "SuperAdmin"] },
];