import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
}

interface Godown {
  id: string;
  name: string;
  godown_type: string;
  is_active: boolean;
}

interface PurchaseItem {
  product_id: string;
  quantity: number;
  purchase_price: number;
  batch_number: string;
  expiry_date: string;
}

const PurchasePage = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [localGodowns, setLocalGodowns] = useState<Godown[]>([]);
  const [selectedGodownIds, setSelectedGodownIds] = useState<string[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, gdRes] = await Promise.all([
        supabase.from("products").select("id, name, price, category").eq("is_active", true).order("name"),
        supabase.from("godowns").select("*").eq("godown_type", "local").eq("is_active", true).order("name"),
      ]);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
      if (gdRes.data) setLocalGodowns(gdRes.data as Godown[]);
    };
    fetchData();
  }, []);

  const addItem = () => {
    setItems(prev => [...prev, { product_id: "", quantity: 1, purchase_price: 0, batch_number: "", expiry_date: "" }]);
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const toggleGodown = (id: string) => {
    setSelectedGodownIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedGodownIds(checked ? localGodowns.map(g => g.id) : []);
  };

  const handleSubmit = async () => {
    if (selectedGodownIds.length === 0) {
      toast({ title: "Select at least one godown", variant: "destructive" });
      return;
    }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Add at least one product with quantity", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const rows = selectedGodownIds.flatMap(godownId =>
      validItems.map(item => ({
        godown_id: godownId,
        product_id: item.product_id,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
      }))
    );

    const { error } = await supabase.from("godown_stock").insert(rows);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Stock added to ${selectedGodownIds.length} godown(s) — ${validItems.length} product(s)` });
      setItems([]);
      setSelectedGodownIds([]);
    }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name ?? "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" /> Purchase — Add Stock to Local Godowns
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add products to multiple local godowns at once from a single window.
            </p>
          </div>
        </div>

        {/* Select Godowns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Select Local Godowns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                checked={selectedGodownIds.length === localGodowns.length && localGodowns.length > 0}
                onCheckedChange={(checked) => selectAll(!!checked)}
              />
              <span className="text-sm font-medium">Select All ({localGodowns.length})</span>
              {selectedGodownIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedGodownIds.length} selected</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {localGodowns.map(g => (
                <label
                  key={g.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm ${
                    selectedGodownIds.includes(g.id) ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Checkbox
                    checked={selectedGodownIds.includes(g.id)}
                    onCheckedChange={() => toggleGodown(g.id)}
                  />
                  {g.name}
                </label>
              ))}
              {localGodowns.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No local godowns found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">2. Add Products</CardTitle>
              <Button size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                Click "Add Product" to start adding items to purchase.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end border rounded-lg p-3">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Product</Label>
                      <Select value={item.product_id} onValueChange={v => updateItem(index, "product_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Purchase Price</Label>
                      <Input type="number" min={0} step="0.01" value={item.purchase_price} onChange={e => updateItem(index, "purchase_price", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Batch No.</Label>
                      <Input value={item.batch_number} onChange={e => updateItem(index, "batch_number", e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Expiry</Label>
                        <Input type="date" value={item.expiry_date} onChange={e => updateItem(index, "expiry_date", e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Submit */}
        {items.length > 0 && selectedGodownIds.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{items.filter(i => i.product_id && i.quantity > 0).length}</span> product(s) →{" "}
                  <span className="font-medium text-foreground">{selectedGodownIds.length}</span> godown(s) ={" "}
                  <span className="font-medium text-foreground">{items.filter(i => i.product_id && i.quantity > 0).length * selectedGodownIds.length}</span> stock entries
                </div>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                  <Send className="h-4 w-4" />
                  {submitting ? "Adding Stock..." : "Add Stock to All Selected Godowns"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default PurchasePage;
