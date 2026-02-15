import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AreaProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  discount_rate: number;
  image_url: string | null;
  description: string | null;
  category: string | null;
  section: string | null;
  stock: number;
}

export const useAreaProducts = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<AreaProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!profile?.local_body_id || !profile?.ward_number) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get micro godown IDs (matching panchayath + ward)
      const { data: microWards } = await supabase
        .from("godown_wards")
        .select("godown_id")
        .eq("local_body_id", profile.local_body_id)
        .eq("ward_number", profile.ward_number);

      // Get area godown IDs (matching panchayath only)
      const { data: areaLocalBodies } = await supabase
        .from("godown_local_bodies")
        .select("godown_id")
        .eq("local_body_id", profile.local_body_id);

      const godownIds = new Set<string>();
      microWards?.forEach(r => godownIds.add(r.godown_id));
      areaLocalBodies?.forEach(r => godownIds.add(r.godown_id));

      if (godownIds.size === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get product IDs from godown_stock for these godowns
      const { data: stockData } = await supabase
        .from("godown_stock")
        .select("product_id, quantity")
        .in("godown_id", Array.from(godownIds))
        .gt("quantity", 0);

      if (!stockData?.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = [...new Set(stockData.map(s => s.product_id))];

      // Get product details
      const { data: productData } = await supabase
        .from("products")
        .select("id, name, price, mrp, discount_rate, image_url, description, category, section, stock")
        .in("id", productIds)
        .eq("is_active", true);

      setProducts((productData as AreaProduct[]) ?? []);
      setLoading(false);
    };

    fetchProducts();
  }, [profile?.local_body_id, profile?.ward_number]);

  return { products, loading };
};
