
export type UserRole = 'Admin' | 'SalesRep' | 'Distributor';

export interface Kpi {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string; // e.g., "botellas", "cuentas"
  icon?: React.ElementType;
}

export interface StrategicObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; 
  role: UserRole; 
  bottlesSold?: number; 
  monthlyTargetAccounts?: number; 
  monthlyTargetVisits?: number; 
  orders?: number; 
  visits?: number; 
  performanceData?: { month: string; bottles: number }[];
}

export type OrderStatus = 'Pendiente' | 'Confirmado' | 'Procesando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Fallido' | 'Seguimiento' | 'Programada';
export type ClientType = 'Distribuidor' | 'HORECA' | 'Retail' | 'Cliente Final';

// New types for follow-up and failure reasons
export type NextActionType = 'Llamar al responsable de compras' | 'Mandar información' | 'Visitar de nuevo' | 'Enviar muestra' | 'Esperar decisión' | 'Opción personalizada';
export type FailureReasonType = 'No interesado' | 'Ya trabaja con otro proveedor' | 'Sin presupuesto' | 'Producto no encaja' | 'Otro (especificar)';

export interface Order {
  id: string;
  clientName: string;
  visitDate: string; // Should be YYYY-MM-DD
  products?: string[]; 
  value?: number; 
  status: OrderStatus;
  salesRep: string;
  lastUpdated: string; // Should be YYYY-MM-DD

  clientType?: ClientType;
  numberOfUnits?: number; 
  unitPrice?: number; 
  clientStatus?: "new" | "existing"; // Added to Order for clarity during processing

  // Customer and billing information (snapshot for the order)
  nombreFiscal?: string;
  cif?: string;
  direccionFiscal?: string;
  direccionEntrega?: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
  observacionesAlta?: string; // Notes specific to new client sign-up with this order
  notes?: string; // General notes for the visit/order

  // Fields for follow-up / failure
  nextActionType?: NextActionType;
  nextActionCustom?: string;
  nextActionDate?: string; // YYYY-MM-DD
  failureReasonType?: FailureReasonType;
  failureReasonCustom?: string;
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

// CRM Account Management
export type AccountType = 'HORECA' | 'Distribuidor' | 'Retail Minorista' | 'Gran Superficie' | 'Evento Especial' | 'Otro';
export type AccountStatus = 'Activo' | 'Inactivo' | 'Potencial' | 'Bloqueado';

export interface Account {
  id: string;
  name: string; 
  legalName?: string;
  cif: string; // While optional in form, it's a key identifier for an account
  type: AccountType;
  status: AccountStatus;
  addressBilling?: string;
  addressShipping?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  mainContactPhone?: string;
  notes?: string; // General notes for the account
  salesRepId?: string; 
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
}

// CRM Event Management
export type CrmEventType = 'Activación en Tienda' | 'Feria Comercial' | 'Evento Corporativo' | 'Degustación' | 'Patrocinio' | 'Otro';
export type CrmEventStatus = 'Planificado' | 'Confirmado' | 'En Curso' | 'Completado' | 'Cancelado' | 'Pospuesto';

export interface CrmEvent {
  id: string;
  name: string;
  type: CrmEventType;
  status: CrmEventStatus;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, optional
  description?: string;
  location?: string;
  assignedTeamMemberIds: string[]; // Array of TeamMember.id
  requiredMaterials?: string;
  notes?: string;
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
}
