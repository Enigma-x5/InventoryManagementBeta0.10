/*
  # Fix RLS policies for order_items table to allow anon access

  This migration updates the order_items table RLS policies to work with
  the application's custom authentication system using anon access.

  ## Changes Made

  1. **Remove authenticated-only policies**: Drop policies that rely on auth.uid()
  2. **Add anon access policies**: Allow anonymous access for all operations
  3. **Maintain data integrity**: Keep constraints and triggers intact

  ## Security Note
  
  This allows anonymous access to order_items data. The application handles
  authorization at the client level.
*/

-- Drop existing policy that requires authenticated users
DROP POLICY IF EXISTS "Order items inherit order permissions" ON order_items;

-- Create new policies for anon access
CREATE POLICY "Allow anon to view order items"
  ON order_items
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to create order items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update order items"
  ON order_items
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete order items"
  ON order_items
  FOR DELETE
  TO anon
  USING (true);