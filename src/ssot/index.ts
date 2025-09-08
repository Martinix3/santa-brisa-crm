/*
 * Santa Brisa CRM — Única Fuente de Verdad (SSOT)
 * ------------------------------------------------
 * Todo en ESPAÑOL (código y UI). Los valores **persistidos** son slugs en minúsculas
 * sin tildes ni espacios (p.ej. "en_deposito"), y los **labels** vienen en ETIQUETAS
 * con tildes y mayúsculas bonitas. Incluye mapeos de compatibilidad y helpers
 * de normalización. También deja *alias de transición* en inglés (deprecated)
 * para que no te rompa el build durante la migración.
 */

// ------------------------------------------------------------
// Utilidades base
// ------------------------------------------------------------
export const SSOT_VERSION = "2025-09-08" as const;
export type ValorDe<T> = T[keyof T];
export function assertNunca(x: never): never {
  throw new Error(`Valor no soportado: ${x as unknown as string}`);
}

// ------------------------------------------------------------
// Roles, canales, distribución
// ------------------------------------------------------------
export const ROLES_USUARIO = [
  "Admin",
  "Ventas",
  "Distributor",
  "Marketing",
  "Manager",
  "Operaciones",
  "Finanzas",
  "Clavadista",
  "Líder Clavadista",
] as const;
export type RolUsuario = typeof ROLES_USUARIO[number];

export const CANALES = ["horeca", "retail", "online", "b2b"] as const;
export type Canal = typeof CANALES[number];

export const TIPOS_DISTRIBUCION = ["directo", "via_distribuidor"] as const;
export type TipoDistribucion = typeof TIPOS_DISTRIBUCION[number];

// ------------------------------------------------------------
// Tareas / Interacciones
// ------------------------------------------------------------
export const TIPOS_INTERACCION = ["visita", "llamada", "mensaje", "seguimiento", "nota"] as const;
export type TipoInteraccion = typeof TIPOS_INTERACCION[number];
export const interactionTypeOptions = [
  { value: "visita", label: "Visita" },
  { value: "llamada", label: "Llamada" },
  { value: "mensaje", label: "Mensaje" }, // email/whatsapp/dm
  { value: "seguimiento", label: "Seguimiento" },
  { value: "nota", label: "Nota interna" },
] as const;


export const RESULTADOS_INTERACCION = ["exito", "pendiente", "sin_respuesta", "no_interesado"] as const;
export type ResultadoInteraccion = typeof RESULTADOS_INTERACCION[number];
export const interactionOutcomeOptions = [
  { value: "exito", label: "Éxito" },
  { value: "pendiente", label: "Pendiente" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "no_interesado", label: "No interesado" },
] as const;


export const ESTADOS_TAREA = ["programada", "seguimiento", "completado"] as const;
export type EstadoTarea = typeof ESTADOS_TAREA[number];

export const AREAS_TAREA = ["Ventas", "Administración", "Marketing", "Personal"] as const;
export type AreaTarea = typeof AREAS_TAREA[number];

export const PRIORIDADES_TAREA = ["low", "medium", "high"] as const;
export type PrioridadTarea = typeof PRIORIDADES_TAREA[number];


// ------------------------------------------------------------
// Pedidos/Documentos — ESTADOS CANÓNICOS (solo de pedido)
// ------------------------------------------------------------
export const ESTADOS_PEDIDO = [
  "Borrador", // de una tarea, no un pedido real aún
  "Confirmado",   // aceptado/confirmado
  "Procesando", // Preparándose en almacén
  "Enviado",      // salida logística
  "Entregado",    // POD
  "Facturado",    // facturado
  "Pagado",       // cobro recibido
  "Cancelado",    // cancelado
  "Programada", // Visita/Tarea futura
  "Seguimiento", // Tarea de seguimiento activa
  "Fallido", // Visita sin resultado positivo
  "Completado" // Tarea completada que no es venta
] as const;
export type EstadoPedido = typeof ESTADOS_PEDIDO[number];

export const ESTADOS_PAGO = ["Pendiente", "Parcial", "Pagado", "Adelantado"] as const;
export type EstadoPago = typeof ESTADOS_PAGO[number];

export const ESTADOS_DOCUMENTO = ["proforma", "factura_pendiente", "factura_recibida", "factura_validada"] as const;
export type EstadoDocumento = typeof ESTADOS_DOCUMENTO[number];

export const ORIGENES_PEDIDO = ["crm", "holded", "shopify", "sendcloud"] as const;
export type OrigenPedido = typeof ORIGENES_PEDIDO[number];

// ------------------------------------------------------------
// Tipos de cliente / cuenta
// ------------------------------------------------------------
export const TIPOS_CLIENTE = ["Distribuidor", "HORECA", "Retail", "Cliente Final", "Otro"] as const;
export type TipoCliente = typeof TIPOS_CLIENTE[number];

export const POTENCIAL_TYPES = ['alto', 'medio', 'bajo'] as const;
export type PotencialType = typeof POTENCIAL_TYPES[number];

export const ACCOUNT_STATUSES = ['Activo', 'Repetición', 'Seguimiento', 'Inactivo', 'Pendiente', 'Fallido', 'Programada'] as const;
export type AccountStatus = typeof ACCOUNT_STATUSES[number];

/**
 * Unificamos tipos de cuenta. "Retail Minorista" y "Gran Superficie" se
 * manejan vía tags/atributos, no como tipos distintos.
 */
export const TIPOS_CUENTA_VALUES = ["prospect", "customer", "distributor", "importer"] as const;
export type TipoCuenta = typeof TIPOS_CUENTA_VALUES[number];
export const TIPOS_CUENTA = [
  { value: "prospect", label: "Prospecto" },
  { value: "customer", label: "Cliente" },
  { value: "distributor", label: "Distribuidor" },
  { value: "importer", label: "Importador" },
] as const;


export const OWNERSHIP_VALUES = ["propio", "distribuidor"] as const;
export type Ownership = typeof OWNERSHIP_VALUES[number];
export const OWNERSHIP_OPTIONS = [
  { value: "propio", label: "Nosotros" },
  { value: "distribuidor", label: "Distribuidor" },
] as const;


// ------------------------------------------------------------
// Productos/Stock
// ------------------------------------------------------------
export const CATEGORIAS_PRODUCTO = ["PT", "PLV", "materia_prima", "kit"] as const; // PT=Producto Terminado, PLV=Promocional
export type CategoriaProducto = typeof CATEGORIAS_PRODUCTO[number];

export const TIPOS_PACK = ["1-bot", "3-bot", "6-bot", "caja", "pallet"] as const;
export type TipoPack = typeof TIPOS_PACK[number];

export const POLITICAS_STOCK = ["crm", "holded"] as const;
export type PoliticaStock = typeof POLITICAS_STOCK[number];

export const UDM = ["unit", "kg", "g", "l", "ml"] as const; // Unidad de Medida (sin tildes por compatibilidad)
export type UdM = typeof UDM[number];

export const ESTADOS_QC = ["Pending", "Released", "Rejected"] as const; // estandarizamos en minúsculas EN para interoperabilidad QC
export type EstadoQC = typeof ESTADOS_QC[number];

export const TIPOS_BOM = ["blend", "fill"] as const;
export type TipoBOM = typeof TIPOS_BOM[number];

// ------------------------------------------------------------
// Eventos de Marketing
// ------------------------------------------------------------
export const TIPOS_EVENTO_CRM = [
  "Activación en Tienda",
  "Feria Comercial",
  "Evento Corporativo",
  "Degustación",
  "Patrocinio",
  "Activación",
  "Otro",
] as const;
export type TipoEventoCrm = typeof TIPOS_EVENTO_CRM[number];

export const ESTADOS_EVENTO_CRM = [
  "Planificado",
  "Confirmado",
  "En Curso",
  "Completado",
  "Cancelado",
  "Pospuesto",
] as const;
export type EstadoEventoCrm = typeof ESTADOS_EVENTO_CRM[number];

export const TIPOS_RECURSO_MARKETING = ["Folleto", "Presentación", "Imagen", "Guía"] as const;
export type TipoRecursoMarketing = typeof TIPOS_RECURSO_MARKETING[number];

// ------------------------------------------------------------
// Ventas directas, muestras, pagos, etc.
// ------------------------------------------------------------
export const ESTADOS_VENTA_DIRECTA = ["borrador", "confirmado", "enviado", "entregado", "facturado", "pagado", "cancelado", "en depósito"] as const;
export type EstadoVentaDirecta = typeof ESTADOS_VENTA_DIRECTA[number];

export const CANALES_VENTA_DIRECTA = ["Importador", "Online", "Estrategica", "Deposito/Consigna", "Otro"] as const; // sin tildes en slug
export type CanalVentaDirecta = typeof CANALES_VENTA_DIRECTA[number];

export const METODOS_PAGO = ["Adelantado", "Contado", "Transferencia 30 días", "Giro Bancario"] as const;
export type MetodoPago = typeof METODOS_PAGO[number];

export const ESTADOS_SOLICITUD_MUESTRA = ["Pendiente", "Aprobada", "Rechazada", "Enviada"] as const;
export type EstadoSolicitudMuestra = typeof ESTADOS_SOLICITUD_MUESTRA[number];

export const PROPOSITOS_MUESTRA = [
  "Captación Cliente Nuevo",
  "Seguimiento Cliente Existente",
  "Material para Evento",
  "Uso Interno/Formación",
  "Otro",
] as const;
export type PropositoMuestra = typeof PROPOSITOS_MUESTRA[number];

export const SIGUIENTES_ACCIONES = [
  "Llamar al responsable de compras",
  "Mandar información",
  "Visitar de nuevo",
  "Enviar muestra",
  "Esperar decisión",
  "Opción personalizada",
] as const;
export type SiguienteAccion = typeof SIGUIENTES_ACCIONES[number];

export const MOTIVOS_FALLO = [
  "No interesado",
  "Ya trabaja con otro proveedor",
  "Sin presupuesto",
  "Producto no encaja",
  "Otro (especificar)",
] as const;
export type MotivoFallo = typeof MOTIVOS_FALLO[number];

export const CANALES_ORIGEN_COLOCACION = [
  "Equipo Santa Brisa",
  "Iniciativa Importador",
  "Marketing Digital",
  "Referido",
  "Evento Especial",
  "Otro",
] as const;
export type CanalOrigenColocacion = typeof CANALES_ORIGEN_COLOCACION[number];

export const MONEDAS = ["EUR", "USD", "MXN"] as const;
export type Moneda = typeof MONEDAS[number];

// ------------------------------------------------------------
// Producción
// ------------------------------------------------------------
export const ESTADOS_EJECUCION = ["Draft", "En curso", "Pausada", "Finalizada", "Cancelada"] as const;
export type EstadoEjecucion = typeof ESTADOS_EJECUCION[number];

export const TIPOS_EJECUCION = ["blend", "fill"] as const;
export type TipoEjecucion = typeof TIPOS_EJECUCION[number];

export const ESTADOS_TANQUE = ["Libre", "Ocupado", "Limpieza"] as const;
export type EstadoTanque = typeof ESTADOS_TANQUE[number];

export const TIPOS_PEDIDO = ["directa", "deposito"] as const;
export type TipoPedido = typeof TIPOS_PEDIDO[number];

export const TIPOS_CATEGORIA = ["inventory", "cost"] as const; // claves técnicas conservadas para integraciones
export type TipoCategoria = typeof TIPOS_CATEGORIA[number];

// ------------------------------------------------------------
// Etiquetas y Colores UI
// ------------------------------------------------------------
export const ETIQUETAS = Object.freeze({
  EstadoPedido: {
    Borrador: "Borrador",
    Confirmado: "Confirmado",
    Procesando: "Procesando",
    Enviado: "Enviado",
    Entregado: "Entregado",
    Facturado: "Facturado",
    Pagado: "Pagado",
    Cancelado: "Cancelado",
    Programada: "Programada",
    Seguimiento: "Seguimiento",
    Fallido: "Fallido",
    Completado: "Completado"
  } as const satisfies Record<EstadoPedido, string>,
  EstadoTarea: {
    programada: "Programada",
    seguimiento: "Seguimiento",
    completado: "Completado",
  } as const satisfies Record<EstadoTarea, string>,
  TipoCliente: {
    Distribuidor: "Distribuidor",
    HORECA: "HORECA",
    Retail: "Retail",
    "Cliente Final": "Cliente Final",
    Otro: "Otro",
  } as const satisfies Record<TipoCliente, string>,
  TipoCuenta: {
    prospect: "Prospecto",
    customer: "Cliente",
    distributor: "Distribuidor",
    importer: "Importador",
  } as const satisfies Record<TipoCuenta, string>,
});

export const COLORES_UI = Object.freeze({
  agenda: {
    Ventas: "#2563eb",
    Administración: "#16a34a",
    Marketing: "#a855f7",
    Personal: "#f59e0b",
  } as const satisfies Record<AreaTarea, string>,
});

// ------------------------------------------------------------
// Provincias de España (único origen)
// ------------------------------------------------------------
export const PROVINCIAS_ES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Burgos", "Cáceres",
  "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba", "La Coruña", "Cuenca", "Gerona", "Granada", "Guadalajara",
  "Guipúzcoa", "Huelva", "Huesca", "Islas Baleares", "Jaén", "León", "Lérida", "Lugo", "Madrid", "Málaga", "Murcia",
  "Navarra", "Orense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Santa Cruz de Tenerife",
  "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"
] as const;

// ------------------------------------------------------------
// Mapeos de compatibilidad (Legacy -> Canónico ES)
// ------------------------------------------------------------
export const MAPEO_ESTADO_PEDIDO_LEGACY: Record<string, EstadoPedido | undefined> = Object.freeze({
  // Inglés
  draft: "Borrador",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  invoiced: "Facturado",
  paid: "Pagado",
  cancelled: "Cancelado",

  // Español anterior (mal mezclado con tareas)
  Pendiente: "Borrador",
  Procesando: "Procesando",
  Enviado: "Enviado",
  Entregado: "Entregado",
  Facturado: "Facturado",
  Pagado: "Pagado",
  Fallido: "Fallido",

  // Tareas que NO son estado de pedido -> undefined
  Programada: "Programada",
  Seguimiento: "Seguimiento",
  Completado: "Completado",
});

export const MAPEO_TIPO_CLIENTE_LEGACY: Record<string, TipoCliente | undefined> = Object.freeze({
  Distribuidor: "Distribuidor",
  HORECA: "HORECA",
  Retail: "Retail",
  "Retail Minorista": "Retail",
  "Gran Superficie": "Retail",
  "Cliente Final": "Cliente Final",
  "Cliente Final Directo": "Cliente Final",
  Otro: "Otro",
});

export const MAPEO_TIPO_CUENTA_LEGACY: Record<string, TipoCuenta | undefined> = Object.freeze({
  HORECA: "customer",
  Retail: "customer",
  "Retail Minorista": "customer",
  "Gran Superficie": "customer",
  Distribuidor: "distributor",
  Importador: "importer",
  "Cliente Final": "customer",
  "Cliente Final Directo": "customer",
  Otro: "prospect",
});


export function normalizarEstadoPedido(v: string): EstadoPedido {
  const m = MAPEO_ESTADO_PEDIDO_LEGACY[v];
  if (m) return m;
  if ((ESTADOS_PEDIDO as readonly string[]).includes(v)) return v as EstadoPedido;
  throw new Error(`EstadoPedido desconocido: "${v}"`);
}

export function normalizarTipoCliente(v: string): TipoCliente {
  const m = MAPEO_TIPO_CLIENTE_LEGACY[v];
  if (m) return m;
  if ((TIPOS_CLIENTE as readonly string[]).includes(v)) return v as TipoCliente;
  throw new Error(`TipoCliente desconocido: "${v}"`);
}

export function normalizarTipoCuenta(v: string): TipoCuenta {
  const m = MAPEO_TIPO_CUENTA_LEGACY[v];
  if (m) return m;
  if ((TIPOS_CUENTA_VALUES as readonly string[]).includes(v)) return v as TipoCuenta;
  throw new Error(`TipoCuenta desconocido: "${v}"`);
}


// ------------------------------------------------------------
// Seeds de desarrollo (opcionales)
// ------------------------------------------------------------
export const SEEDS_DESARROLLO = Object.freeze({
  cuentasIniciales: [
    "Sello Copil", "Grupo Tragaluz", "MARRIOT", "AC HOTELES", "Bokaxankla Bar",
    "Florida Park", "Restaurante Bajio", "Restaurante Trompo", "NH HOTELES", "Casa de Mexico",
    "Grupo Dejate Llevar", "Chiton", "Martina por el Norte", "Boheme", "4 Latas",
    "Vineci Hoteles", "Catering Ciboulette", "Los pefiotes", "Restaurante Fondeo", "Morris Club",
    "Floren Domezain", "Taberna Jimmys", "Casa Ortega", "Cafe de Paris", "CRISTINA ORIA",
    "Salvador Bachiller", "Restaurante Lanteo", "Fuerte Group Hotels", "Noname", "Bar Nuevo M40",
    "Tienda El enemigo", "Discoteca Maracaibo", "La Oficina Maracaibo", "Liquor shop", "Casa de Siempre",
    "Filemon", "La Rubia", "Restaurante Meneo", "Ke Sotogrande", "Polo Sotogrande",
    "Agora Sotogrande", "Nueva Taberna", "Restaurante Aurea", "Chambao", "Gkg Sky Bar",
    "ella Sky Bar", "Botania", "Dofia Tomasa", "Mantequerias Bravo", "Catering Samantha",
    "Grupo Mentidero", "Catering Laurel", "Cristine Bedfor", "Estrella Galicia", "Tierra del Queiles",
    "Restaurante Her", "Noneta", "Makila", "Golda", "Vinoteca Collado", "Petit Apetit",
  ].map((nombre) => ({ nombre, type: "customer" as TipoCuenta, potencial: "medio" as const })),

  tanques: [
    { name: "Tanque Mezcla 1", capacity: 1000, status: "Libre", location: "Zona de Mezcla" },
    { name: "Tanque Mezcla 2", capacity: 1000, status: "Libre", location: "Zona de Mezcla" },
    { name: "Tanque Pulmón 1", capacity: 500, status: "Libre", location: "Línea 1" },
  ] as const,

  categorias: [
    { name: "Nóminas",               kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "NOMINAS" },
    { name: "Consultores",           kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "CONSULTORES" },
    { name: "Almacenamiento",        kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "ALMACEN" },
    { name: "Gastos Administrativos",kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "ADMIN" },
    { name: "Impuestos & Tasas",     kind: "cost",      costType: "fixed",    isConsumable: false, idOverride: "IMPUESTOS" },

    { name: "Impuestos Especiales (Alcohol)", kind: "cost", costType: "variable", isConsumable: false, parentId: "IMPUESTOS", idOverride: "IIEE" },
    { name: "IVA Soportado No Recuperable",   kind: "cost", costType: "variable", isConsumable: false, parentId: "IMPUESTOS", idOverride: "IVA_SOPORTADO" },

    { name: "Logística",             kind: "cost",      costType: "variable", isConsumable: false, idOverride: "LOGISTICA" },
    { name: "Viajes y Dietas",       kind: "cost",      costType: "variable", isConsumable: false, idOverride: "VIAJES" },
    { name: "Ventas & Marketing",    kind: "cost",      costType: "variable", isConsumable: false, idOverride: "MKT" },

    { name: "Inventario General",    kind: "inventory", isConsumable: true, idOverride: "INV_GENERAL" },
    { name: "Materia Prima (COGS)",  kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_MATERIA_PRIMA" },
    { name: "Material Embalaje (COGS)", kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_EMBALAJE" },
    { name: "Producto Terminado",    kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PRODUCTO_TERMINADO" },
    { name: "Producto Intermedio",   kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PRODUCTO_INTERMEDIO" },
    { name: "Material Promocional",  kind: "inventory", isConsumable: true, parentId: "INV_GENERAL", idOverride: "INV_PROMO_MATERIAL" },
  ] as const,
});

// ------------------------------------------------------------
// Integración Holded (ejemplo de mapeo)
// ------------------------------------------------------------
export type EstadoFacturaHolded = 0 | 1 | 2 | 3; // 0=no pagada,1=pagada,2=borrador,3=parcial
export const HOLDED_A_ESTADO_PAGO: Record<EstadoFacturaHolded, EstadoPago> = Object.freeze({
  0: "Pendiente",
  1: "Pagado",
  2: "Pendiente",
  3: "Parcial",
});

// ------------------------------------------------------------
// Type Guards
// ------------------------------------------------------------
export const esEstadoPedido = (v: unknown): v is EstadoPedido => typeof v === "string" && (ESTADOS_PEDIDO as readonly string[]).includes(v);
export const esTipoCuenta = (v: unknown): v is TipoCuenta => typeof v === "string" && (TIPOS_CUENTA_VALUES as readonly string[]).includes(v);
export const esTipoCliente = (v: unknown): v is TipoCliente => typeof v === "string" && (TIPOS_CLIENTE as readonly string[]).includes(v);

// ------------------------------------------------------------
// Aliases de transición (DEPRECADO). Quitar cuando migremos módulos.
// ------------------------------------------------------------
/** @deprecated */ export const USER_ROLES = ROLES_USUARIO;
/** @deprecated */ export type UserRole = RolUsuario;
/** @deprecated */ export const CHANNELS = CANALES;
/** @deprecated */ export type Channel = Canal;
/** @deprecated */ export const ORDER_STATUSES = ESTADOS_PEDIDO;
/** @deprecated */ export type OrderStatus = EstadoPedido;
/** @deprecated */ export const TASK_STATUSES = ESTADOS_TAREA;
/** @deprecated */ export type TaskStatus = EstadoTarea;
/** @deprecated */ export const CLIENT_TYPES = TIPOS_CLIENTE;
/** @deprecated */ export type ClientType = TipoCliente;
/** @deprecated */ export const ACCOUNT_TYPES = TIPOS_CUENTA;
/** @deprecated */ export type AccountType = TipoCuenta;
/** @deprecated */ export const LABELS = ETIQUETAS;
/** @deprecated */ export const UI_COLORS = COLORES_UI;
