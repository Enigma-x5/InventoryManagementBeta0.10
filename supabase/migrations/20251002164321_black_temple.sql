/*
  # Initial Schema for IMS Pro - Inventory & Order Management

  1. New Tables
    - `users` - User accounts with roles (Admin, MANG, CLK, FSSALE)
    - `clients` - Customer/client information
    - `items` - Inventory items with photos
    - `shades` - Shade variants for each item with stock counts
    - `orders` - Sales orders
    - `order_items` - Line items within orders

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure data access based on user roles

  3. Features
    - Real-time subscriptions for order notifications
    - Proper foreign key relationships
    - Default values and constraints
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'MANG', 'CLK', 'FSSALE')),
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  photo_url text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shades table linked to items
CREATE TABLE IF NOT EXISTS shades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  shade_number text NOT NULL,
  shade_name text DEFAULT '',
  stock_count integer DEFAULT 0 CHECK (stock_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, shade_number)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id),
  created_by uuid REFERENCES users(id),
  order_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_amount decimal(10,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id),
  shade_id uuid REFERENCES shades(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  rate decimal(10,2) DEFAULT 0 CHECK (rate >= 0),
  amount decimal(10,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shades ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Clients policies
CREATE POLICY "Admin and MANG can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('Admin', 'MANG')
    )
  );

CREATE POLICY "CLK and FSSALE can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('CLK', 'FSSALE')
    )
  );

-- Items policies
CREATE POLICY "Admin and MANG can manage items"
  ON items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('Admin', 'MANG')
    )
  );

CREATE POLICY "All authenticated users can view items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

-- Shades policies
CREATE POLICY "Admin and MANG can manage shades"
  ON shades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('Admin', 'MANG')
    )
  );

CREATE POLICY "All authenticated users can view shades"
  ON shades FOR SELECT
  TO authenticated
  USING (true);

-- Orders policies
CREATE POLICY "Admin can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "MANG and CLK can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('MANG', 'CLK')
    )
  );

CREATE POLICY "FSSALE can create and view their own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'FSSALE'
    ) AND created_by = auth.uid()
  );

CREATE POLICY "FSSALE can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'FSSALE' AND created_by = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Order items inherit order permissions"
  ON order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN users u ON u.id = auth.uid()
      WHERE o.id = order_id
      AND (
        u.role = 'Admin' OR 
        u.role IN ('MANG', 'CLK') OR
        (u.role = 'FSSALE' AND o.created_by = auth.uid())
      )
    )
  );

-- Insert default admin user (password should be hashed in production)
INSERT INTO users (username, password, role, full_name) VALUES 
('admin', 'admin123', 'Admin', 'System Administrator');

-- Insert sample data
INSERT INTO clients (name, address, phone, email) VALUES
('ABC Traders', '123 Main St, Mumbai', '+91 9876543210', 'abc@email.com'),
('XYZ Corporation', '456 Business Park, Delhi', '+91 9876543211', 'xyz@email.com');

INSERT INTO items (name, photo_url, description) VALUES
('Cotton Fabric', 'https://images.pexels.com/photos/6865163/pexels-photo-6865163.jpeg', 'Premium cotton fabric for garments'),
('Silk Fabric', 'https://images.pexels.com/photos/7319070/pexels-photo-7319070.jpeg', 'Luxury silk fabric collection');

INSERT INTO shades (item_id, shade_number, shade_name, stock_count) VALUES
((SELECT id FROM items WHERE name = 'Cotton Fabric'), 'RED-001', 'Cherry Red', 50),
((SELECT id FROM items WHERE name = 'Cotton Fabric'), 'BLUE-002', 'Ocean Blue', 30),
((SELECT id FROM items WHERE name = 'Silk Fabric'), 'GOLD-001', 'Royal Gold', 25),
((SELECT id FROM items WHERE name = 'Silk Fabric'), 'SILVER-002', 'Pearl Silver', 40);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  order_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-(.*)') AS integer)), 0) + 1
  INTO next_num
  FROM orders
  WHERE order_number LIKE 'ORD-%';
  
  order_num := 'ORD-' || LPAD(next_num::text, 6, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Create indexes for better performance
CREATE INDEX idx_shades_item_id ON shades(item_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_users_username ON users(username);