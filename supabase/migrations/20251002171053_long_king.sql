/*
  # Add demo users for testing

  1. New Data
    - Add demo admin user with credentials admin/admin123
    - Add sample users for other roles (MANG, CLK, FSSALE)
  
  2. Security
    - Users table already has RLS enabled
    - Existing policies will apply to new users
*/

-- Insert demo users
INSERT INTO users (username, password, role, full_name) VALUES
  ('admin', 'admin123', 'Admin', 'Admin User'),
  ('manager', 'manager123', 'MANG', 'Manager User'),
  ('clerk', 'clerk123', 'CLK', 'Clerk User'),
  ('sales', 'sales123', 'FSSALE', 'Field Sales User')
ON CONFLICT (username) DO NOTHING;