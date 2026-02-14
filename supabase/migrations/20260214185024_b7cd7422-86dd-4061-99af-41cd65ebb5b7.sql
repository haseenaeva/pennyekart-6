
-- Categories table (for both general and grocery categories)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  item_count TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories" ON public.categories
  FOR SELECT USING ((is_active = true) OR is_super_admin() OR has_permission('read_categories'::text));

CREATE POLICY "Authorized can create categories" ON public.categories
  FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_categories'::text));

CREATE POLICY "Authorized can update categories" ON public.categories
  FOR UPDATE USING (is_super_admin() OR has_permission('update_categories'::text));

CREATE POLICY "Authorized can delete categories" ON public.categories
  FOR DELETE USING (is_super_admin() OR has_permission('delete_categories'::text));

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services table for Penny Services
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services" ON public.services
  FOR SELECT USING ((is_active = true) OR is_super_admin() OR has_permission('read_services'::text));

CREATE POLICY "Authorized can create services" ON public.services
  FOR INSERT WITH CHECK (is_super_admin() OR has_permission('create_services'::text));

CREATE POLICY "Authorized can update services" ON public.services
  FOR UPDATE USING (is_super_admin() OR has_permission('update_services'::text));

CREATE POLICY "Authorized can delete services" ON public.services
  FOR DELETE USING (is_super_admin() OR has_permission('delete_services'::text));

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add section column to products for section management
ALTER TABLE public.products ADD COLUMN section TEXT;
CREATE INDEX idx_products_section ON public.products(section);

-- Seed categories
INSERT INTO public.categories (name, icon, category_type, sort_order) VALUES
  ('Electronics', 'Smartphone', 'general', 1),
  ('Fashion', 'Shirt', 'general', 2),
  ('Home & Living', 'Home', 'general', 3),
  ('Sports', 'Dumbbell', 'general', 4),
  ('Beauty', 'Sparkles', 'general', 5),
  ('Books', 'BookOpen', 'general', 6),
  ('Fruits', 'Apple', 'grocery', 1),
  ('Vegetables', 'Carrot', 'grocery', 2),
  ('Dairy', 'Milk', 'grocery', 3),
  ('Grains', 'Wheat', 'grocery', 4),
  ('Seafood', 'Fish', 'grocery', 5),
  ('Eggs', 'Egg', 'grocery', 6),
  ('Snacks', 'Cookie', 'grocery', 7),
  ('Beverages', 'Coffee', 'grocery', 8),
  ('Organic', 'Citrus', 'grocery', 9),
  ('Meat', 'Beef', 'grocery', 10);

-- Seed permissions for categories and services
INSERT INTO public.permissions (name, feature, action, description) VALUES
  ('read_categories', 'categories', 'read', 'View categories'),
  ('create_categories', 'categories', 'create', 'Create categories'),
  ('update_categories', 'categories', 'update', 'Update categories'),
  ('delete_categories', 'categories', 'delete', 'Delete categories'),
  ('read_services', 'services', 'read', 'View services'),
  ('create_services', 'services', 'create', 'Create services'),
  ('update_services', 'services', 'update', 'Update services'),
  ('delete_services', 'services', 'delete', 'Delete services');
