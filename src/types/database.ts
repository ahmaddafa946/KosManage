export type RoomStatus = 'available' | 'occupied' | 'maintenance';
export type TenantStatus = 'active' | 'inactive';
export type PaymentMethod = 'cash' | 'transfer' | 'ewallet' | 'qris';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export type UserRole = 'owner' | 'tenant';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_number: string;
  floor: number | null;
  price: number;
  status: RoomStatus;
  facilities: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  active_tenant?: Tenant | null;
}

export interface Tenant {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  identity_number: string | null;
  start_date: string;
  end_date: string | null;
  rent_price: number;
  deposit: number | null;
  status: TenantStatus;
  profile_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  room?: Room | null;
}

export interface Payment {
  id: string;
  property_id: string;
  tenant_id: string;
  room_id: string | null;
  billing_period: string; // YYYY-MM
  due_date: string;
  amount_due: number;
  amount_paid: number;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  payment_reference: string | null;
  payment_url: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  tenant?: Tenant | null;
  room?: Room | null;
}

export interface DashboardSummary {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  totalTenants: number;
  monthlyRevenue: number;
  totalOutstanding: number;
}

export interface Facility {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomFacility {
  room_id: string;
  facility_id: string;
  created_at: string;
}

export type MaintenanceCategory = 'AC' | 'electrical' | 'plumbing' | 'furniture' | 'internet' | 'other';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type MaintenanceStatus = 'submitted' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceReport {
  id: string;
  property_id: string;
  room_id: string | null;
  tenant_id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
