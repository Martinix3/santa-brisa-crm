/*
 * Santa Brisa CRM — Única Fuente de Verdad (SSOT)
 * ------------------------------------------------
 * Todo en ESPAÑOL (código y UI). Los valores **persistidos** son slugs en mayúsculas
 * sin tildes ni espacios (p.ej. "CLIENTE_FINAL"), y los **labels** vienen en ETIQUETAS
 * con tildes y mayúsculas bonitas.
 */

// ------------------------------------------------------------
// Utilidades base
// ------------------------------------------------------------
export const SSOT_VERSION = "2025-09-08T20:00:00Z" as const;
export type ValorDe<T> = T[keyof T];
export function assertNunca(x: never): never {
  throw new Error(`Valor no soportado: ${x as unknown as string}`);
}

// ------------------------------------------------------------
// Roles y Canales
// ------------------------------------------------------------
export const ROLES_USUARIO = [
  "Admin", "Ventas", "Distributor", "Marketing", "Manager",
  "Operaciones", "Finanzas", "Clavadista", "Líder Clavadista"
] as const;
export type RolUsuario = typeof ROLES_USUARIO[number];

export const CANALES_ORIGEN_COLOCACION = ["EVENTO_SB", "CONTACTO_DIRECTO", "REFERIDO", "CLAVADISTA", "OTRO"] as const;
export type CanalOrigenColocacion = typeof CANALES_ORIGEN_COLOCACION[number];


// ------------------------------------------------------------
// Cuentas de Cliente
// ------------------------------------------------------------
export const TIPOS_CUENTA_VALUES = ["CLIENTE_FINAL", "DISTRIBUIDOR", "IMPORTADOR", "HORECA", "RETAIL", "OTRO"] as const;
export type TipoCuenta = typeof TIPOS_CUENTA_VALUES[number];

export const ESTADOS_CUENTA = ["SEGUIMIENTO", "FALLIDA", "ACTIVA", "POTENCIAL", "INACTIVA"] as const;
export type AccountStage = typeof ESTADOS_CUENTA[number];

export const OWNERSHIP_VALUES = ["propio", "distribuidor"] as const;
export type Ownership = typeof OWNERSHIP_VALUES[number];


// ------------------------------------------------------------
// Pedidos, Interacciones y Tareas
// ------------------------------------------------------------
export const TIPOS_INTERACCION_VALUES = ["LLAMADA", "VISITA", "EMAIL", "WHATSAPP", "OTRO"] as const;
export type InteractionKind = typeof TIPOS_INTERACCION_VALUES[number];

export const RESULTADOS_INTERACCION_VALUES = ["VISITA_OK", "VISITA_FALLIDA", "SIN_CONTACTO", "PENDIENTE", "OTRO"] as const;
export type InteractionResult = typeof RESULTADOS_INTERACCION_VALUES[number];

export const ESTADOS_INTERACCION = ["PROGRAMADA", "COMPLETADA", "CANCELADA"] as const;
export type InteractionStatus = typeof ESTADOS_INTERACCION[number];

export const ESTADOS_PEDIDO = ["Programada", "Pendiente", "Confirmado", "Procesando", "Enviado", "Entregado", "Facturado", "Pagado", "Cancelado", "Fallido", "Seguimiento", "Completado"] as const;
export type EstadoPedido = typeof ESTADOS_PEDIDO[number];

// ------------------------------------------------------------
// Eventos y Material PLV
// ------------------------------------------------------------
export const TIPOS_EVENTO = ["ACTIVACION", "EVENTO", "FORMACION", "DEGUSTACION", "OTRO"] as const;
export type EventKind = typeof TIPOS_EVENTO[number];

export const ESTADOS_PLV = ["SOLICITADO", "ENTREGADO", "INSTALADO", "RETIRADO"] as const;
export type PlvStatus = typeof ESTADOS_PLV[number];


// ------------------------------------------------------------
// Mapeos de compatibilidad (Legacy -> Canónico)
// ------------------------------------------------------------
export const MAPEO_ESTADO_CUENTA_LEGACY: Record<string, AccountStage | undefined> = Object.freeze({
  "Activo": "ACTIVA",
  "Repetición": "ACTIVA", // Repetición es un estado derivado de 'ACTIVA' con >1 pedido
  "Seguimiento": "SEGUIMIENTO",
  "Programada": "SEGUIMIENTO",
  "Inactivo": "INACTIVA",
  "Pendiente": "POTENCIAL",
  "Fallido": "FALLIDA",
  "lead": "POTENCIAL", // si usas slugs en inglés
});

export const MAPEO_TIPO_CUENTA_LEGACY: Record<string, TipoCuenta | undefined> = Object.freeze({
    "HORECA": "HORECA",
    "Distribuidor": "DISTRIBUIDOR",
    "Importador": "IMPORTADOR",
    "Retail Minorista": "RETAIL",
    "Gran Superficie": "RETAIL",
    "Cliente Final Directo": "CLIENTE_FINAL",
    "Otro": "OTRO",
    // slugs
    "customer": "CLIENTE_FINAL",
    "distributor": "DISTRIBUIDOR",
    "importer": "IMPORTADOR",
    "prospect": "HORECA", // Asumimos que los prospectos son HORECA por defecto
});


export function normalizarEstadoCuenta(v: string | undefined): AccountStage | undefined {
  if (!v) return undefined;
  const m = MAPEO_ESTADO_CUENTA_LEGACY[v];
  if (m) return m;
  if ((ESTADOS_CUENTA as readonly string[]).includes(v)) return v as AccountStage;
  return undefined; // No lanzar error, solo ignorar si no se puede mapear
}

export function normalizarTipoCuenta(v: string | undefined): TipoCuenta | undefined {
    if (!v) return undefined;
    const m = MAPEO_TIPO_CUENTA_LEGACY[v];
    if (m) return m;
    if ((TIPOS_CUENTA_VALUES as readonly string[]).includes(v)) return v as TipoCuenta;
    return "OTRO";
}

// ------------------------------------------------------------
// Listas para UI (Selects, etc.)
// ------------------------------------------------------------
export const OPCIONES_TIPO_CUENTA = [
    { value: "HORECA", label: "HORECA" },
    { value: "RETAIL", label: "Retail" },
    { value: "DISTRIBUIDOR", label: "Distribuidor" },
    { value: "IMPORTADOR", label: "Importador" },
    { value: "CLIENTE_FINAL", label: "Cliente Final" },
    { value: "OTRO", label: "Otro" },
] as const;

export const OPCIONES_ESTADO_CUENTA = [
    { value: "SEGUIMIENTO", label: "En Seguimiento" },
    { value: "ACTIVA", label: "Activa" },
    { value: "POTENCIAL", label: "Potencial" },
    { value: "INACTIVA", label: "Inactiva" },
    { value: "FALLIDA", label: "Fallida" },
] as const;

export const OWNERSHIP_OPTIONS = [
    { value: 'propio', label: 'Propia (gestionada por Santa Brisa)' },
    { value: 'distribuidor', label: 'De Distribuidor' },
] as const;

export const OPCIONES_CANAL_ORIGEN = [
    { value: "EVENTO_SB", label: "Evento SB" },
    { value: "CONTACTO_DIRECTO", label: "Contacto Directo" },
    { value: "REFERIDO", label: "Referido" },
    { value: "CLAVADISTA", label: "Clavadista" },
    { value: "OTRO", label: "Otro" },
] as const;

export const TIPOS_INTERACCION = [
    { value: 'visita', label: 'Visita'},
    { value: 'llamada', label: 'Llamada'},
    { value: 'email', label: 'Email'},
    { value: 'whatsapp', label: 'WhatsApp'},
    { value: 'otro', label: 'Otro'},
] as const;

export const RESULTADOS_INTERACCION = [
    { value: 'pedido', label: 'Pedido Exitoso'},
    { value: 'seguimiento', label: 'Requiere Seguimiento'},
    { value: 'fallida', label: 'Fallida / Sin Pedido'},
    { value: 'pendiente', label: 'Pendiente de registrar'},
] as const;


// ------------------------------------------------------------
// Aliases de transición (DEPRECADO).
// ------------------------------------------------------------
/** @deprecated Usa RolUsuario */
export const USER_ROLES = ROLES_USUARIO;
/** @deprecated Usa RolUsuario */
export type UserRole = RolUsuario;
/** @deprecated Usa AccountStage */
export const ACCOUNT_STATUSES = ESTADOS_CUENTA;
/** @deprecated Usa TipoCuenta */
export const ACCOUNT_TYPES = TIPOS_CUENTA_VALUES;
