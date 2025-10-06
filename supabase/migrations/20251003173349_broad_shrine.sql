/*
  # Add inventory tracking feature to items

  1. Schema Changes
    - Add `track_inventory` column to `items` table
    - Default value is `true` to maintain existing behavior
    - Boolean type to indicate whether stock counts should be tracked

  2. Security
    - No RLS changes needed as this inherits existing item policies
    - Only Admin users can modify this field (enforced in UI)

  3. Notes
    - Existing items will have `track_inventory = true` by default
    - When `track_inventory = false`, stock counts are still stored but not actively managed
    - UI will conditionally display stock information based on this flag
*/

-- Add track_inventory column to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'track_inventory'
  ) THEN
    ALTER TABLE items ADD COLUMN track_inventory BOOLEAN DEFAULT true;
  END IF;
END $$;