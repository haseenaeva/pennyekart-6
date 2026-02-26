import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";

interface GeneralCategory {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
}

const iconMap: Record<string, LucideIcons.LucideIcon> = {
  Smartphone: LucideIcons.Smartphone,
  Laptop: LucideIcons.Laptop,
  Shirt: LucideIcons.Shirt,
  Home: LucideIcons.Home,
  Sparkles: LucideIcons.Sparkles,
  Dumbbell: LucideIcons.Dumbbell,
  BookOpen: LucideIcons.BookOpen,
  Baby: LucideIcons.Baby,
  Car: LucideIcons.Car,
  Gift: LucideIcons.Gift,
  Apple: LucideIcons.Apple,
  Carrot: LucideIcons.Carrot,
  Milk: LucideIcons.Milk,
  Wheat: LucideIcons.Wheat,
  Fish: LucideIcons.Fish,
  Egg: LucideIcons.Egg,
  Cookie: LucideIcons.Cookie,
  Coffee: LucideIcons.Coffee,
  ShoppingBag: LucideIcons.ShoppingBag,
};

const fallbackIcon = LucideIcons.ShoppingBag;

interface CategoryBarProps {
  onCategoryClick?: (name: string) => void;
  selectedCategory?: string | null;
}

const fetchGeneralCategories = async (): Promise<GeneralCategory[]> => {
  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, image_url")
    .eq("category_type", "general")
    .eq("is_active", true)
    .order("sort_order");
  return (data as GeneralCategory[]) ?? [];
};

const CategoryBar = ({ onCategoryClick, selectedCategory }: CategoryBarProps) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "general"],
    queryFn: fetchGeneralCategories,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  if (categories.length === 0) return null;

  const half = Math.ceil(categories.length / 2);

  const renderBtn = (c: GeneralCategory, compact = false) => {
    const Icon = (c.icon && iconMap[c.icon]) || fallbackIcon;
    const isSelected = selectedCategory === c.name;
    return (
      <button
        key={c.id}
        onClick={() => onCategoryClick?.(c.name)}
        className={`group flex shrink-0 flex-col items-center gap-1.5 ${compact ? "" : "px-3 py-1"} transition-colors`}
      >
        <div className={`flex items-center justify-center rounded-full transition-colors ${
          compact ? "h-12 w-12" : "h-10 w-10"
        } ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted group-hover:bg-secondary group-hover:text-secondary-foreground"}`}>
          {c.image_url ? (
            <img src={c.image_url} alt={c.name} loading="lazy" className={`rounded-full object-cover ${compact ? "h-12 w-12" : "h-10 w-10"}`} />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"} ${compact ? "text-[11px]" : "text-xs"}`}>
          {c.name}
        </span>
      </button>
    );
  };

  return (
    <div className="border-b bg-card">
      <div className="container py-3">
        <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((c) => renderBtn(c))}
        </div>
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.slice(0, half).map((c) => renderBtn(c, true))}
          </div>
          <div className="flex gap-4 overflow-x-auto pt-1 scrollbar-hide">
            {categories.slice(half).map((c) => renderBtn(c, true))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
