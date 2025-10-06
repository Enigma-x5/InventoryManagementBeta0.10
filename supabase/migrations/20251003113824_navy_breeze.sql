/*
  # Fix Orders RLS Policy for MANG and CLK roles

  1. Security Changes
    - Add INSERT policy for MANG and CLK roles to create orders
    - Ensure they can only create orders with their own user ID as created_by
    - This resolves the "new row violates row-level security policy" error

  2. Policy Details
    - Allows MANG and CLK users to insert orders
    - Automatically sets created_by to their user ID
    - Maintains security by preventing creation of orders for other users
*/

-- Add INSERT policy for MANG and CLK roles
CREATE POLICY "MANG and CLK can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('MANG', 'CLK')
    ) 
    AND created_by = auth.uid()
  );