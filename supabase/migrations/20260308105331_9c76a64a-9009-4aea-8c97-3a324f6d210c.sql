-- Create customer search history table
CREATE TABLE public.customer_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_user_id UUID NOT NULL,
  search_query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_customer_search_history_user ON public.customer_search_history(customer_user_id);
CREATE INDEX idx_customer_search_history_created ON public.customer_search_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.customer_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Customers can insert own search history"
ON public.customer_search_history FOR INSERT
WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY "Admins can read all search history"
ON public.customer_search_history FOR SELECT
USING (auth.uid() = customer_user_id OR is_super_admin() OR has_permission('read_users'));