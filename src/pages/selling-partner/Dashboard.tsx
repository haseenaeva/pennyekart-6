import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, LogOut, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface SellerProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  is_approved: boolean;
  is_active: boolean;
  stock: number;
  area_godown_id: string | null;
  created_at: string;
}

interface Godown {
  id: string;
  name: string;
}

const SellingPartnerDashboard = () => {
  const { profile, signOut, user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", stock: "", area_godown_id: "" });

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase.from("seller_products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false });
    if (data) setProducts(data as SellerProduct[]);
  };

  const fetchGodowns = async () => {
    const { data } = await supabase.from("godowns").select("id, name").eq("godown_type", "area").eq("is_active", true);
    if (data) setGodowns(data);
  };

  useEffect(() => { fetchProducts(); fetchGodowns(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("seller_products").insert({
      seller_id: user.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      category: form.category.trim() || null,
      stock: parseInt(form.stock) || 0,
      area_godown_id: form.area_godown_id || null,
    });
    if (error) {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product submitted for approval!" });
      setForm({ name: "", description: "", price: "", category: "", stock: "", area_godown_id: "" });
      setDialogOpen(false);
      fetchProducts();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Pennyekart" className="h-8" />
          <span className="font-semibold text-foreground">Selling Partner</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile?.full_name}</span>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Products</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Product to Area Godown</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div><Label>Product Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={200} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={1000} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Price (₹)</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
                  <div><Label>Stock</Label><Input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required /></div>
                </div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} maxLength={100} /></div>
                <div>
                  <Label>Area Godown</Label>
                  <Select value={form.area_godown_id} onValueChange={v => setForm({ ...form, area_godown_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger>
                    <SelectContent>
                      {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Submit for Approval</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{products.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <Store className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{products.filter(p => p.is_approved).length}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Products</CardTitle></CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            ) : (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">₹{p.price} · Stock: {p.stock}</p>
                    </div>
                    <Badge variant={p.is_approved ? "default" : "secondary"}>
                      {p.is_approved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SellingPartnerDashboard;
