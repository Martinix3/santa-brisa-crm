
export type UserRole = 'Admin' | 'SalesRep' | 'Distributor' | 'Clavadista';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number; 
  targetValue: number;
  unit: string; 
  icon?: React.ElementType;
}

export interface StrategicObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface TeamMember {
  id: string; 
  authUid?: string; 
  name: string;
  email: string; 
  avatarUrl?: string; 
  role: UserRole; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  bottlesSold?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[]; 
  createdAt?: string; 
  updatedAt?: string; 
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido' | 'Seguimiento' | 'Programada' | 'Facturado' | 'Completado';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final';

export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';

export type PromotionalMaterialType = 'Merchandising Físico' | 'Material PLV' | 'Servicio de Personal' | 'Digital/Software';

export interface LatestPurchaseInfo {
  quantityPurchased: number;
  totalPurchaseCost: number;
  purchaseDate: string; 
  calculatedUnitCost: number;
  notes?: string; 
}

export interface PromotionalMaterial {
  id: string;
  name: string;
  description?: string;
  type: PromotionalMaterialType;
  latestPurchase?: LatestPurchaseInfo; 
}

export interface AssignedPromotionalMaterial {
  materialId: string; 
  quantity: number;
}

export type CanalOrigenColocacion = 'Equipo Santa Brisa' | 'Iniciativa Importador' | 'Marketing Digital' | 'Referido' | 'Otro';

export interface AddressDetails {
  street: string;
  number?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string; 
}

export type PaymentMethod = 'Adelantado' | 'Contado' | 'Transferencia 30 días';

export interface Order {
  id: string;
  clientName: string;
  visitDate: string; 
  products?: string[]; 
  value?: number; 
  status: OrderStatus;
  salesRep: string; 
  lastUpdated: string; 
  clavadistaId?: string; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 
  canalOrigenColocacion?: CanalOrigenColocacion;
  paymentMethod?: PaymentMethod; 
  invoiceUrl?: string;
  invoiceFileName?: string;

  clientType?: ClientType;
  numberOfUnits?: number; 
  unitPrice?: number; 
  clientStatus?: "new" | "existing"; 
  
  notes?: string; 

  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string; 
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;

  accountId?: string; 
  createdAt: string; 
  originatingTaskId?: string;
}

export type MarketingResourceType = 'Folleto' | 'Presentación' | 'Imagen' | 'Guía';

export interface MarketingResource {
  id: string;
  title: string;
  description: string;
  link: string;
  type: MarketingResourceType;
}

export interface MarketingResourceCategory {
  id: string;
  name: string;
  resources: MarketingResource[];
}

export type AccountType = 'HORECA' | 'Distribuidor' | 'Retail Minorista' | 'Gran Superficie' | 'Evento Especial' | 'Cliente Final Directo' | 'Importador' | 'Otro';
export type AccountStatus = 'Activo' | 'Inactivo' | 'Potencial' | 'Bloqueado';

export interface Account {
  id: string;
  name: string; 
  legalName?: string;
  cif: string; 
  type: AccountType;
  status: AccountStatus;
  addressBilling?: AddressDetails;
  addressShipping?: AddressDetails;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string; 
  internalNotes?: string;
  salesRepId?: string; 
  createdAt: string; 
  updatedAt: string; 
}


export type CrmEventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Activación' | 'Otro';
export type CrmEventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';

export interface CrmEvent {
  id: string;
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: string; 
  endDate?: string; 
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[]; 
  assignedMaterials?: AssignedPromotionalMaterial[]; 
  notes?: string;
  createdAt: string; 
  updatedAt: string; 
}

export interface TeamMemberFormValues {
  name: string;
  email: string; 
  role: UserRole;
  monthlyTargetAccounts?: number;
  monthlyTargetVisits?: number;
  avatarUrl?: string;
  authUid?: string; 
}

export type CanalVentaDirectaSB = 'Importador' | 'Online' | 'Estratégica' | 'Otro Directo';
export type EstadoVentaDirectaSB = 'Borrador' | 'Confirmada' | 'Facturada' | 'Pagada' | 'Cancelada';

export interface VentaDirectaSBItem {
  productoDescripcion: string; 
  cantidad: number;
  precioUnitarioNetoSB: number; 
  subtotalNetoSB: number; 
}

export interface VentaDirectaSB {
  id: string; 
  fechaEmision: string; 
  numeroFacturaSB?: string; 
  clienteId: string; 
  nombreClienteFactura: string; 
  cifClienteFactura?: string;
  direccionClienteFactura?: AddressDetails; 
  canalVentaDirectaSB: CanalVentaDirectaSB;
  items: VentaDirectaSBItem[];
  subtotalGeneralNetoSB: number;
  tipoIvaAplicadoSB?: number; 
  importeIvaSB?: number;
  totalFacturaSB: number; 
  estadoVentaDirectaSB: EstadoVentaDirectaSB;
  fechaVencimientoPago?: string; 
  referenciasOrdenesColocacion?: string[]; 
  notasInternasSB?: string;
  createdAt: string; 
  updatedAt: string; 
}

export interface VentaDirectaSBFormValues {
  fechaEmision: Date;
  numeroFacturaSB?: string;
  clienteId: string;
  canalVentaDirectaSB: CanalVentaDirectaSB;
  items: {
    productoDescripcion: string;
    cantidad?: number;
    precioUnitarioNetoSB?: number;
  }[];
  tipoIvaAplicadoSB?: number;
  estadoVentaDirectaSB: EstadoVentaDirectaSB;
  fechaVencimientoPago?: Date;
  referenciasOrdenesColocacion?: string; 
  notasInternasSB?: string;
}

export interface FollowUpResultFormValues {
  outcome: "successful" | "failed" | "follow-up";
  paymentMethod?: PaymentMethod;
  numberOfUnits?: number;
  unitPrice?: number;
  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: Date;
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;
  notes?: string;
}
