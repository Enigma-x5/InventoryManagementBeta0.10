export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'MANG' | 'CLK' | 'FSSALE';
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  photo_url: string;
  description: string;
  track_inventory: boolean;
  created_at: string;
  updated_at: string;
  shades?: Shade[];
}

export interface Shade {
  id: string;
  item_id: string;
  shade_number: string;
  shade_name: string;
  stock_count: number;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  created_by: string;
  order_date: string;
  status: 'open' | 'pending' | 'closed' | 'cancelled';
  total_amount: number;
  notes: string;
  is_authorized: boolean;
  created_at: string;
  updated_at: string;
  closed_by?: string | null;
  closed_at?: string | null;
  client?: Client;
  creator?: User;
  closer?: User;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  shade_id: string;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
  is_fulfilled: boolean;
  fulfilled_by?: string | null;
  fulfilled_at?: string | null;
  item?: Item;
  shade?: Shade;
  fulfiller?: User;
}

export interface CatalogueShare {
  item: Item;
  selectedShades: Shade[];
}

export interface AuthContext {
  user: User | null;
  loading: boolean;
  checkUsername: (username: string) => Promise<User | null>;
  login: (user: User, password: string) => Promise<boolean>;
  logout: () => void;
}