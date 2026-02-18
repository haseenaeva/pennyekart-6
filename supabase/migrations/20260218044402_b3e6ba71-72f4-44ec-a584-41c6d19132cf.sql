-- 1. Create the BEFORE UPDATE trigger on orders that fires deduct_stock_on_delivery
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_delivery ON public.orders;
CREATE TRIGGER trigger_deduct_stock_on_delivery
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_delivery();

-- 2. Create an auto-assign trigger for delivery staff (if not already existing)
DROP TRIGGER IF EXISTS trigger_auto_assign_delivery ON public.orders;
CREATE TRIGGER trigger_auto_assign_delivery
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_delivery_staff();

-- 3. Create a helper RPC function so the seller dashboard can fetch orders 
-- that contain their product IDs in the items JSONB array reliably
CREATE OR REPLACE FUNCTION public.get_orders_for_seller(seller_user_id uuid)
RETURNS SETOF orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.*
  FROM public.orders o
  WHERE 
    -- Direct seller_id match
    o.seller_id = seller_user_id
    OR
    -- Items JSONB contains a product belonging to this seller
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(o.items) AS item
      JOIN public.seller_products sp ON sp.id = (item->>'id')::uuid
      WHERE sp.seller_id = seller_user_id
    )
  ORDER BY o.created_at DESC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_orders_for_seller(uuid) TO authenticated;