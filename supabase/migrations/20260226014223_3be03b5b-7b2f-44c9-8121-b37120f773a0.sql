
-- Indexes for godown_wards (used in area product lookup by ward)
CREATE INDEX IF NOT EXISTS idx_godown_wards_local_body_ward ON public.godown_wards (local_body_id, ward_number);
CREATE INDEX IF NOT EXISTS idx_godown_wards_godown_id ON public.godown_wards (godown_id);

-- Indexes for godown_local_bodies (used in area product lookup by local body)
CREATE INDEX IF NOT EXISTS idx_godown_local_bodies_local_body ON public.godown_local_bodies (local_body_id);
CREATE INDEX IF NOT EXISTS idx_godown_local_bodies_godown ON public.godown_local_bodies (godown_id);

-- Indexes for godown_stock (used to find products in godowns)
CREATE INDEX IF NOT EXISTS idx_godown_stock_godown_product ON public.godown_stock (godown_id, product_id);
CREATE INDEX IF NOT EXISTS idx_godown_stock_quantity ON public.godown_stock (godown_id) WHERE quantity > 0;

-- Indexes for products (section-based and category filtering)
CREATE INDEX IF NOT EXISTS idx_products_section_active ON public.products (section) WHERE is_active = true AND section IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products (category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);

-- Indexes for seller_products (area godown lookup)
CREATE INDEX IF NOT EXISTS idx_seller_products_area_godown ON public.seller_products (area_godown_id) WHERE is_active = true AND is_approved = true;

-- Indexes for profiles (auth lookup)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_type_active ON public.categories (category_type) WHERE is_active = true;

-- Indexes for banners
CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners (sort_order) WHERE is_active = true;

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_staff ON public.orders (assigned_delivery_staff_id);

-- Indexes for role_permissions (used in has_permission function)
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role_id);
