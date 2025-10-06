/*
  # Add Order Status and Item Tracking System

  1. New Order Status System
    - Update orders table status constraint to include 'open', 'pending', 'closed', 'cancelled'
    - Change default status from 'pending' to 'open'
    - Add closed_by and closed_at fields for admin override tracking

  2. Item Fulfillment Tracking
    - Add is_fulfilled boolean to order_items for individual shade tracking
    - Add fulfilled_by to track which user marked item as fulfilled
    - Add fulfilled_at timestamp for fulfillment tracking

  3. Security
    - Maintain existing RLS policies
    - Add foreign key constraints for data integrity
*/

-- Update orders table status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['open'::text, 'pending'::text, 'closed'::text, 'cancelled'::text]));

-- Change default status from 'pending' to 'open'
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'open'::text;

-- Add admin override fields to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN closed_by uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN closed_at timestamptz;
  END IF;
END $$;

-- Add foreign key constraint for closed_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_closed_by_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_closed_by_fkey 
      FOREIGN KEY (closed_by) REFERENCES users(id);
  END IF;
END $$;

-- Add fulfillment tracking fields to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_fulfilled'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_fulfilled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'fulfilled_by'
  ) THEN
    ALTER TABLE order_items ADD COLUMN fulfilled_by uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'fulfilled_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN fulfilled_at timestamptz;
  END IF;
END $$;

-- Add foreign key constraint for fulfilled_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_items_fulfilled_by_fkey'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_fulfilled_by_fkey 
      FOREIGN KEY (fulfilled_by) REFERENCES users(id);
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_is_fulfilled ON order_items(is_fulfilled);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);