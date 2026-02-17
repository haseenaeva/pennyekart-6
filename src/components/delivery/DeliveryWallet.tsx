import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  order_id: string | null;
}

interface Props {
  userId: string;
  walletBalance: number;
}

const DeliveryWallet = ({ userId, walletBalance }: Props) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("delivery_staff_wallet_transactions")
      .select("*")
      .eq("staff_user_id", userId)
      .order("created_at", { ascending: false });
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, [userId]);

  const filtered = transactions.filter((t) => {
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const totalCredit = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebit = filtered.filter(t => t.type === "debit" || t.type === "settlement").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">₹{walletBalance}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">₹{totalCredit}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Settled</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">₹{totalDebit}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <div className="flex flex-wrap gap-3 items-center mt-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "credit" ? "default" : "destructive"} className="text-xs">
                          {t.type === "credit" ? "Credit" : "Settlement"}
                        </Badge>
                      </TableCell>
                      <TableCell className={t.type === "credit" ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {t.type === "credit" ? "+" : "-"}₹{t.amount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryWallet;
