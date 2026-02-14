import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Service {
  id: string; name: string; description: string | null; icon: string | null;
  image_url: string | null; price: number; category: string | null;
}

const PennyServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("services").select("*").eq("is_active", true).order("sort_order");
      setServices((data as Service[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-primary">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">Penny Services</h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading services...</p>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Wrench className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">Services coming soon!</p>
            <p className="text-sm text-muted-foreground">We're adding home services. Stay tuned.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground">{category}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <div key={s.id} className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Wrench className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col">
                        <h3 className="font-semibold text-foreground">{s.name}</h3>
                        {s.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <span className="text-lg font-bold text-foreground">₹{s.price}</span>
                          <Button size="sm" variant="outline">Book Now</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PennyServices;
