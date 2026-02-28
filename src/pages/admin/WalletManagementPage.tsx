import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Settings, RefreshCw } from "lucide-react";

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
  earning_balance?: number;
  min_usage_amount?: number;
  user_name: string;
  email: string;
  created_at: string;
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
  order_id: string | null;
}

const WalletManagementPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("customer");
  const [customerWallets, setCustomerWallets] = useState<WalletRow[]>([]);
  const [sellerWallets, setSellerWallets] = useState<WalletRow[]>([]);
  const [deliveryWallets, setDeliveryWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Transaction dialog
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnWallet, setTxnWallet] = useState<WalletRow | null>(null);
  const [txnType, setTxnType] = useState<"credit" | "debit">("credit");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDesc, setTxnDesc] = useState("");
  const [txnLoading, setTxnLoading] = useState(false);

  // Min amount dialog (customer only)
  const [minOpen, setMinOpen] = useState(false);
  const [minWallet, setMinWallet] = useState<WalletRow | null>(null);
  const [minAmount, setMinAmount] = useState("");

  // Global wallet rule
  const [globalMinUsage, setGlobalMinUsage] = useState("");
  const [globalRuleLoading, setGlobalRuleLoading] = useState(false);

  // Transaction history
  const [histOpen, setHistOpen] = useState(false);
  const [histWallet, setHistWallet] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchGlobalRule = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "wallet_min_usage_amount")
      .maybeSingle();
    setGlobalMinUsage(data?.value ?? "100");
  };

  const saveGlobalRule = async () => {
    setGlobalRuleLoading(true);
    // Upsert the app_settings row
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", "wallet_min_usage_amount")
      .maybeSingle();

    if (existing) {
      await supabase.from("app_settings").update({ value: globalMinUsage, updated_by: user?.id } as any).eq("id", existing.id);
    } else {
      await supabase.from("app_settings").insert({ key: "wallet_min_usage_amount", value: globalMinUsage, description: "Minimum order amount for customer wallet usage", updated_by: user?.id } as any);
    }

    // Also update all customer wallets with this value
    await supabase.from("customer_wallets").update({ min_usage_amount: Number(globalMinUsage) } as any).neq("id", "00000000-0000-0000-0000-000000000000");

    toast({ title: "Global wallet rule saved & applied to all customers" });
    setGlobalRuleLoading(false);
    fetchAll();
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCustomerWallets(), fetchSellerWallets(), fetchDeliveryWallets(), fetchGlobalRule()]);
    setLoading(false);
  };

  const fetchCustomerWallets = async () => {
    const { data: wallets } = await supabase.from("customer_wallets").select("*");
    if (!wallets) return setCustomerWallets([]);
    const userIds = wallets.map((w: any) => w.customer_user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    setCustomerWallets(wallets.map((w: any) => ({
      id: w.id, user_id: w.customer_user_id, balance: w.balance,
      min_usage_amount: w.min_usage_amount, user_name: profileMap.get(w.customer_user_id)?.full_name || "N/A",
      email: profileMap.get(w.customer_user_id)?.email || "", created_at: w.created_at,
    })));
  };

  const fetchSellerWallets = async () => {
    const { data: wallets } = await supabase.from("seller_wallets").select("*");
    if (!wallets) return setSellerWallets([]);
    const userIds = wallets.map((w: any) => w.seller_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    setSellerWallets(wallets.map((w: any) => ({
      id: w.id, user_id: w.seller_id, balance: w.balance,
      user_name: profileMap.get(w.seller_id)?.full_name || "N/A",
      email: profileMap.get(w.seller_id)?.email || "", created_at: w.created_at,
    })));
  };

  const fetchDeliveryWallets = async () => {
    const { data: wallets } = await supabase.from("delivery_staff_wallets").select("*");
    if (!wallets) return setDeliveryWallets([]);
    const userIds = wallets.map((w: any) => w.staff_user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    setDeliveryWallets(wallets.map((w: any) => ({
      id: w.id, user_id: w.staff_user_id, balance: w.balance, earning_balance: w.earning_balance,
      user_name: profileMap.get(w.staff_user_id)?.full_name || "N/A",
      email: profileMap.get(w.staff_user_id)?.email || "", created_at: w.created_at,
    })));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleTransaction = async () => {
    if (!txnWallet || !txnAmount || Number(txnAmount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" }); return;
    }
    setTxnLoading(true);
    const amount = Number(txnAmount);
    const walletType = activeTab;

    try {
      if (walletType === "customer") {
        const newBalance = txnType === "credit" ? txnWallet.balance + amount : txnWallet.balance - amount;
        if (newBalance < 0) { toast({ title: "Insufficient balance", variant: "destructive" }); setTxnLoading(false); return; }
        await supabase.from("customer_wallets").update({ balance: newBalance } as any).eq("id", txnWallet.id);
        await supabase.from("customer_wallet_transactions").insert({
          wallet_id: txnWallet.id, customer_user_id: txnWallet.user_id,
          type: txnType, amount, description: txnDesc || `Admin ${txnType}`, created_by: user?.id,
        } as any);
      } else if (walletType === "seller") {
        const newBalance = txnType === "credit" ? txnWallet.balance + amount : txnWallet.balance - amount;
        if (newBalance < 0) { toast({ title: "Insufficient balance", variant: "destructive" }); setTxnLoading(false); return; }
        await supabase.from("seller_wallets").update({ balance: newBalance }).eq("id", txnWallet.id);
        await supabase.from("seller_wallet_transactions").insert({
          wallet_id: txnWallet.id, seller_id: txnWallet.user_id,
          type: txnType, amount, description: txnDesc || `Admin ${txnType}`, settled_by: user?.id,
        });
      } else {
        const newBalance = txnType === "credit" ? txnWallet.balance + amount : txnWallet.balance - amount;
        if (newBalance < 0) { toast({ title: "Insufficient balance", variant: "destructive" }); setTxnLoading(false); return; }
        await supabase.from("delivery_staff_wallets").update({ balance: newBalance }).eq("id", txnWallet.id);
        await supabase.from("delivery_staff_wallet_transactions").insert({
          wallet_id: txnWallet.id, staff_user_id: txnWallet.user_id,
          type: txnType, amount, description: txnDesc || `Admin ${txnType}`,
        });
      }

      toast({ title: `${txnType === "credit" ? "Credited" : "Debited"} ₹${amount} successfully` });
      setTxnOpen(false); setTxnAmount(""); setTxnDesc("");
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setTxnLoading(false);
  };

  const handleMinAmountSave = async () => {
    if (!minWallet || !minAmount) return;
    await supabase.from("customer_wallets").update({ min_usage_amount: Number(minAmount) } as any).eq("id", minWallet.id);
    toast({ title: "Minimum usage amount updated" });
    setMinOpen(false);
    fetchAll();
  };

  const fetchTransactions = async (wallet: WalletRow) => {
    setHistWallet(wallet);
    setHistOpen(true);
    setHistLoading(true);
    let data: any[] = [];
    if (activeTab === "customer") {
      const res = await supabase.from("customer_wallet_transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);
      data = res.data ?? [];
    } else if (activeTab === "seller") {
      const res = await supabase.from("seller_wallet_transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);
      data = res.data ?? [];
    } else {
      const res = await supabase.from("delivery_staff_wallet_transactions").select("*").eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(50);
      data = res.data ?? [];
    }
    setTransactions(data);
    setHistLoading(false);
  };

  const renderWalletTable = (wallets: WalletRow[], type: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Balance (₹)</TableHead>
          {type === "delivery" && <TableHead className="text-right">Earnings (₹)</TableHead>}
          {type === "customer" && <TableHead className="text-right">Min Usage (₹)</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {wallets.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No wallets found</TableCell></TableRow>
        )}
        {wallets.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="font-medium">{w.user_name}</TableCell>
            <TableCell className="text-muted-foreground">{w.email}</TableCell>
            <TableCell className="text-right font-semibold">₹{Number(w.balance).toFixed(2)}</TableCell>
            {type === "delivery" && <TableCell className="text-right">₹{Number(w.earning_balance ?? 0).toFixed(2)}</TableCell>}
            {type === "customer" && <TableCell className="text-right">₹{Number(w.min_usage_amount ?? 0).toFixed(2)}</TableCell>}
            <TableCell className="text-right space-x-1">
              <Button size="sm" variant="outline" onClick={() => { setTxnWallet(w); setTxnType("credit"); setTxnOpen(true); }}>
                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Credit
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTxnWallet(w); setTxnType("debit"); setTxnOpen(true); }}>
                <ArrowDownCircle className="h-3.5 w-3.5 mr-1" /> Debit
              </Button>
              {type === "customer" && (
                <Button size="sm" variant="outline" onClick={() => { setMinWallet(w); setMinAmount(String(w.min_usage_amount ?? 100)); setMinOpen(true); }}>
                  <Settings className="h-3.5 w-3.5 mr-1" /> Min
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => fetchTransactions(w)}>History</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const totalBalance = (wallets: WalletRow[]) => wallets.reduce((s, w) => s + Number(w.balance), 0);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Wallet Management</h1>
            <p className="text-muted-foreground text-sm">Manage all wallets from a single place</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Global Wallet Rule */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Common Customer Wallet Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Set a global minimum order amount required for customers to use their wallet balance during checkout. This rule applies to all customer wallets.
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <Label className="text-xs">Minimum Order Amount (₹)</Label>
                <Input type="number" min="0" value={globalMinUsage} onChange={(e) => setGlobalMinUsage(e.target.value)} placeholder="100" />
              </div>
              <Button onClick={saveGlobalRule} disabled={globalRuleLoading} size="sm">
                {globalRuleLoading ? "Saving..." : "Save & Apply to All"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Customer Wallets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">₹{totalBalance(customerWallets).toFixed(2)}</p><p className="text-xs text-muted-foreground">{customerWallets.length} wallets</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Seller Wallets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">₹{totalBalance(sellerWallets).toFixed(2)}</p><p className="text-xs text-muted-foreground">{sellerWallets.length} wallets</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Delivery Staff Wallets</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">₹{totalBalance(deliveryWallets).toFixed(2)}</p><p className="text-xs text-muted-foreground">{deliveryWallets.length} wallets</p></CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="customer">Customers</TabsTrigger>
            <TabsTrigger value="seller">Sellers</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Staff</TabsTrigger>
          </TabsList>
          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Wallets</CardTitle>
                <p className="text-xs text-muted-foreground">Customers must reach the minimum usage amount before they can use wallet balance for orders.</p>
              </CardHeader>
              <CardContent>{renderWalletTable(customerWallets, "customer")}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="seller">
            <Card><CardHeader><CardTitle className="text-base">Seller Wallets</CardTitle></CardHeader>
              <CardContent>{renderWalletTable(sellerWallets, "seller")}</CardContent></Card>
          </TabsContent>
          <TabsContent value="delivery">
            <Card><CardHeader><CardTitle className="text-base">Delivery Staff Wallets</CardTitle></CardHeader>
              <CardContent>{renderWalletTable(deliveryWallets, "delivery")}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Credit/Debit Dialog */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txnType === "credit" ? "Credit" : "Debit"} Wallet — {txnWallet?.user_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={txnType} onValueChange={(v) => setTxnType(v as "credit" | "debit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (₹)</Label><Input type="number" min="1" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} placeholder="Enter amount" /></div>
            <div><Label>Description</Label><Textarea value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)} placeholder="Reason for transaction" /></div>
            <p className="text-xs text-muted-foreground">Current balance: ₹{Number(txnWallet?.balance ?? 0).toFixed(2)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={handleTransaction} disabled={txnLoading}>{txnLoading ? "Processing..." : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Min Usage Dialog */}
      <Dialog open={minOpen} onOpenChange={setMinOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Minimum Usage Amount — {minWallet?.user_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Customer must have at least this amount in their wallet before they can use it for purchases.</p>
            <div><Label>Minimum Amount (₹)</Label><Input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMinOpen(false)}>Cancel</Button>
            <Button onClick={handleMinAmountSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={histOpen} onOpenChange={setHistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Transaction History — {histWallet?.user_name}</DialogTitle></DialogHeader>
          {histLoading ? <p className="text-center py-4">Loading...</p> : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>}
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={t.type === "credit" ? "default" : "destructive"} className="text-xs">{t.type}</Badge></TableCell>
                      <TableCell className="text-right font-medium">₹{Number(t.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{t.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default WalletManagementPage;
