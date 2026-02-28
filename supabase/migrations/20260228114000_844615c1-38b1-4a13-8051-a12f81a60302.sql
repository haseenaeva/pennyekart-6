
ALTER TABLE public.flash_sales
ADD COLUMN discount_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN discount_value numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.flash_sales.discount_type IS 'Type of discount: percentage or amount';
COMMENT ON COLUMN public.flash_sales.discount_value IS 'Discount value (percentage or fixed amount)';
