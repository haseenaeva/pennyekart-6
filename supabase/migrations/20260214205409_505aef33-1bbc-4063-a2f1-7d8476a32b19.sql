
-- Add fields to profiles for delivery staff and selling partners
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile_number text UNIQUE,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS local_body_id uuid REFERENCES public.locations_local_bodies(id),
ADD COLUMN IF NOT EXISTS ward_number integer;

-- Update handle_new_user to capture extra metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, mobile_number, date_of_birth, user_type, local_body_id, ward_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'mobile_number',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer'),
    NULLIF(NEW.raw_user_meta_data->>'local_body_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'ward_number', '')::integer
  );
  RETURN NEW;
END;
$$;

-- Godowns table
CREATE TABLE public.godowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  godown_type text NOT NULL DEFAULT 'micro',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Godown coverage - which local bodies a godown serves
CREATE TABLE public.godown_local_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  godown_id uuid NOT NULL REFERENCES public.godowns(id) ON DELETE CASCADE,
  local_body_id uuid NOT NULL REFERENCES public.locations_local_bodies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(godown_id, local_body_id)
);

-- Godown wards - for micro godowns, which wards they serve
CREATE TABLE public.godown_wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  godown_id uuid NOT NULL REFERENCES public.godowns(id) ON DELETE CASCADE,
  ward_number integer NOT NULL,
  local_body_id uuid NOT NULL REFERENCES public.locations_local_bodies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(godown_id, ward_number, local_body_id)
);

-- Godown stock with batch tracking
CREATE TABLE public.godown_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  godown_id uuid NOT NULL REFERENCES public.godowns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number text,
  quantity integer NOT NULL DEFAULT 0,
  expiry_date date,
  purchase_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stock transfers between godowns
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_godown_id uuid NOT NULL REFERENCES public.godowns(id),
  to_godown_id uuid NOT NULL REFERENCES public.godowns(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  batch_number text,
  quantity integer NOT NULL,
  transfer_type text NOT NULL DEFAULT 'transfer',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seller products (selling partners create products for area godowns)
CREATE TABLE public.seller_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  category text,
  area_godown_id uuid REFERENCES public.godowns(id),
  is_approved boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.godowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godown_local_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godown_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.godown_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_products ENABLE ROW LEVEL SECURITY;

-- Godown RLS
CREATE POLICY "Anyone can read active godowns" ON public.godowns FOR SELECT USING (is_active = true OR is_super_admin() OR has_permission('read_godowns'));
CREATE POLICY "Authorized can create godowns" ON public.godowns FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_godowns'));
CREATE POLICY "Authorized can update godowns" ON public.godowns FOR UPDATE USING (is_super_admin() OR has_permission('update_godowns'));
CREATE POLICY "Authorized can delete godowns" ON public.godowns FOR DELETE USING (is_super_admin() OR has_permission('delete_godowns'));

-- Godown local bodies RLS
CREATE POLICY "Anyone can read godown local bodies" ON public.godown_local_bodies FOR SELECT USING (true);
CREATE POLICY "Authorized can manage godown local bodies" ON public.godown_local_bodies FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_godowns'));
CREATE POLICY "Authorized can update godown local bodies" ON public.godown_local_bodies FOR UPDATE USING (is_super_admin() OR has_permission('update_godowns'));
CREATE POLICY "Authorized can delete godown local bodies" ON public.godown_local_bodies FOR DELETE USING (is_super_admin() OR has_permission('delete_godowns'));

-- Godown wards RLS
CREATE POLICY "Anyone can read godown wards" ON public.godown_wards FOR SELECT USING (true);
CREATE POLICY "Authorized can manage godown wards" ON public.godown_wards FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_godowns'));
CREATE POLICY "Authorized can update godown wards" ON public.godown_wards FOR UPDATE USING (is_super_admin() OR has_permission('update_godowns'));
CREATE POLICY "Authorized can delete godown wards" ON public.godown_wards FOR DELETE USING (is_super_admin() OR has_permission('delete_godowns'));

-- Godown stock RLS
CREATE POLICY "Anyone can read stock" ON public.godown_stock FOR SELECT USING (true);
CREATE POLICY "Authorized can add stock" ON public.godown_stock FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_stock'));
CREATE POLICY "Authorized can update stock" ON public.godown_stock FOR UPDATE USING (is_super_admin() OR has_permission('update_stock'));
CREATE POLICY "Authorized can delete stock" ON public.godown_stock FOR DELETE USING (is_super_admin() OR has_permission('delete_stock'));

-- Stock transfers RLS
CREATE POLICY "Read stock transfers" ON public.stock_transfers FOR SELECT USING (is_super_admin() OR has_permission('read_stock') OR created_by = auth.uid());
CREATE POLICY "Create stock transfers" ON public.stock_transfers FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_stock') OR auth.uid() IS NOT NULL);
CREATE POLICY "Update stock transfers" ON public.stock_transfers FOR UPDATE USING (is_super_admin() OR has_permission('update_stock'));

-- Seller products RLS
CREATE POLICY "Read seller products" ON public.seller_products FOR SELECT USING (seller_id = auth.uid() OR is_super_admin() OR has_permission('read_products') OR (is_approved = true AND is_active = true));
CREATE POLICY "Sellers can create products" ON public.seller_products FOR INSERT WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Sellers can update own" ON public.seller_products FOR UPDATE USING (seller_id = auth.uid() OR is_super_admin());
CREATE POLICY "Admin can delete seller products" ON public.seller_products FOR DELETE USING (is_super_admin() OR has_permission('delete_products'));

-- Triggers
CREATE TRIGGER update_godowns_updated_at BEFORE UPDATE ON public.godowns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_godown_stock_updated_at BEFORE UPDATE ON public.godown_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_products_updated_at BEFORE UPDATE ON public.seller_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New permissions
INSERT INTO public.permissions (name, feature, action, description) VALUES
('read_godowns', 'godowns', 'read', 'View godowns'),
('create_godowns', 'godowns', 'create', 'Create godowns'),
('update_godowns', 'godowns', 'update', 'Update godowns'),
('delete_godowns', 'godowns', 'delete', 'Delete godowns'),
('read_stock', 'stock', 'read', 'View stock'),
('create_stock', 'stock', 'create', 'Add stock'),
('update_stock', 'stock', 'update', 'Update stock'),
('delete_stock', 'stock', 'delete', 'Delete stock'),
('approve_seller_products', 'sellers', 'update', 'Approve seller products'),
('read_delivery_staff', 'delivery_staff', 'read', 'View delivery staff'),
('approve_delivery_staff', 'delivery_staff', 'update', 'Approve delivery staff'),
('read_selling_partners', 'selling_partners', 'read', 'View selling partners'),
('approve_selling_partners', 'selling_partners', 'update', 'Approve selling partners');
