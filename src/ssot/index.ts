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

export const SIGUIENTES_ACCIONES = ['Llamar', 'Visitar', 'Enviar Muestras', 'Preparar Propuesta', 'Opción personalizada'] as const;
export type SiguienteAccion = typeof SIGUIENTES_ACCIONES[number];

export const MOTIVOS_FALLO = ['Precio', 'No Interesado', 'Sin Stock', 'Competencia', 'Otro (especificar)'] as const;
export type MotivoFallo = typeof MOTIVOS_FALLO[number];

export const TIPOS_CLIENTE = ['HORECA', 'Retail Minorista', 'Gran Superficie', 'Distribuidor', 'Importador', 'Cliente Final Directo', 'Evento Especial', 'Otro'] as const;
export type TipoCliente = typeof TIPOS_CLIENTE[number];

export const METODOS_PAGO = ['Adelantado', 'Giro Bancario', 'Transferencia', 'Confirming'] as const;
export type MetodoPago = typeof METODOS_PAGO[number];

// ------------------------------------------------------------
// Eventos y Material PLV
// ------------------------------------------------------------
export const TIPOS_EVENTO = ["Activación en Tienda", "Evento Patrocinado", "Feria Comercial", "Formación de Producto", "Cata / Degustación"] as const;
export type TipoEventoCrm = typeof TIPOS_EVENTO[number];

export const ESTADOS_EVENTO_CRM = ["Planificado", "Confirmado", "En Curso", "Completado", "Cancelado", "Pospuesto"] as const;
export type EstadoEventoCrm = typeof ESTADOS_EVENTO_CRM[number];

export const ESTADOS_PLV = ["SOLICITADO", "ENTREGADO", "INSTALADO", "RETIRADO"] as const;
export type PlvStatus = typeof ESTADOS_PLV[number];


// ------------------------------------------------------------
// ERP: Compras, Inventario, Producción
// ------------------------------------------------------------
export const ESTADOS_DOCUMENTO = ['proforma', 'factura_pendiente', 'factura_recibida', 'factura_validada'] as const;
export type EstadoDocumento = typeof ESTADOS_DOCUMENTO[number];

export const ESTADOS_PAGO = ['pendiente', 'parcial', 'pagado', 'pagado_adelantado'] as const;
export type EstadoPago = typeof ESTADOS_PAGO[number];

export const ESTADOS_PRODUCCION = ['Draft', 'En curso', 'Pausada', 'Finalizada', 'Cancelada'] as const;
export type ProductionRunStatus = typeof ESTADOS_PRODUCCION[number];

export const ESTADOS_QC = ['Pending', 'Released', 'Rejected'] as const;
export type EstadoQC = typeof ESTADOS_QC[number];

export const ESTADOS_TANQUE = ['Libre', 'Ocupado', 'Limpieza'] as const;
export type EstadoTanque = typeof ESTADOS_TANQUE[number];

export const ESTADOS_VENTA_DIRECTA = ['borrador', 'confirmado', 'enviado', 'entregado', 'facturado', 'pagado', 'cancelado', 'en depósito'] as const;
export type EstadoVentaDirecta = typeof ESTADOS_VENTA_DIRECTA[number];

export const CANALES_VENTA_DIRECTA = ['directo', 'online', 'estrategico', 'exportacion'] as const;
export type CanalVentaDirecta = typeof CANALES_VENTA_DIRECTA[number];

export const PROPOSITOS_MUESTRA = ['Primera Visita', 'Seguimiento', 'Evento', 'Negociación', 'Apoyo Marketing'] as const;
export type PropositoMuestra = typeof PROPOSITOS_MUESTRA[number];

export const ESTADOS_SOLICITUD_MUESTRA = ['Pendiente', 'Aprobada', 'Rechazada', 'Enviada'] as const;
export type EstadoSolicitudMuestra = typeof ESTADOS_SOLICITUD_MUESTRA[number];

export const UDM = ['unit', 'kg', 'g', 'l', 'ml'] as const;
export type UdM = typeof UDM[number];

export const TIPOS_BOM = ["blend", "fill"] as const;
export type TipoBOM = typeof TIPOS_BOM[number];

export const TIPOS_EJECUCION = ['blend', 'fill'] as const;
export type TipoEjecucion = typeof TIPOS_EJECUCION[number];

export const TIPOS_PEDIDO = ['directa', 'deposito'] as const;
export type TipoPedido = typeof TIPOS_PEDIDO[number];

export const TIPOS_CATEGORIA = ['inventory', 'cost'] as const;
export type TipoCategoria = typeof TIPOS_CATEGORIA[number];

export interface AmbassadorSettings {
    horeca: { pago_apertura: number; bonus_segundo_pedido: number; comision_inicial: number; comision_indefinida: number; min_pedido: number; segundo_pedido_plazo_dias: number; };
    distribuidor_mediano: { pago_apertura: number; bonus_segundo_pedido: number; comision_inicial: number; comision_indefinida: number; min_pedido: number; segundo_pedido_plazo_dias: number; };
    distribuidor_grande: { pago_apertura: number; bonus_segundo_pedido: number; comision_inicial: number; comision_indefinida: number; min_pedido: number; segundo_pedido_plazo_dias: number; };
    distribuidor_top: { pago_apertura: number; bonus_segundo_pedido: number; comision_inicial: number; comision_indefinida: number; min_pedido: number; segundo_pedido_plazo_dias: number; };
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

export const MONEDAS = ["EUR", "USD", "MXN"] as const;
export type Moneda = typeof MONEDAS[number];

export const orderChannelOptions = [
    { value: 'propio', label: 'Propio' },
    { value: 'distribuidor', label: 'Distribuidor' },
] as const;

export const userRolesList = ["Admin", "Ventas", "Distributor", "Clavadista", "Líder Clavadista"] as const;

// ------------------------------------------------------------
// Listas para el diálogo de edición de pedidos
// ------------------------------------------------------------

export const paymentMethodList = METODOS_PAGO;
export const nextActionTypeList = SIGUIENTES_ACCIONES;
export const failureReasonList = MOTIVOS_FALLO;
export const clientTypeList = TIPOS_CLIENTE;
export const crmEventTypeList = TIPOS_EVENTO;
export const crmEventStatusList = ESTADOS_EVENTO_CRM;


// ------------------------------------------------------------
// Listas para geografía, etc.
// ------------------------------------------------------------
export const PROVINCIAS_ES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona",
  "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba",
  "La Coruña", "Cuenca", "Gerona", "Granada", "Guadalajara", "Guipúzcoa", "Huelva",
  "Huesca", "Islas Baleares", "Jaén", "León", "Lérida", "Lugo", "Madrid", "Málaga",
  "Murcia", "Navarra", "Orense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja",
  "Salamanca", "Segovia", "Sevilla", "Soria", "Tarragona", "Santa Cruz de Tenerife",
  "Teruel", "Toledo", "Valencia", "Valladolid", "Vizcaya", "Zamora", "Zaragoza"
] as const;
