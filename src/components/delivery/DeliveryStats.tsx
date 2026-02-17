import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Wallet, MapPin, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface Props {
  pendingCount: number;
  deliveredToday: number;
  walletBalance: number;
  assignedWards: { local_body_name: string; ward_number: number }[];
}

const DeliveryStats = ({ pendingCount, deliveredToday, walletBalance, assignedWards }: Props) => {
  const [wardsOpen, setWardsOpen] = useState(false);

  // Group wards by local body
  const grouped: Record<string, number[]> = {};
  assignedWards.forEach((w) => {
    if (!grouped[w.local_body_name]) grouped[w.local_body_name] = [];
    grouped[w.local_body_name].push(w.ward_number);
  });

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent><p className="text-2xl font-bold">{pendingCount}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Delivered Today</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent><p className="text-2xl font-bold">{deliveredToday}</p></CardContent>
      </Card>
      <Card>
        <Collapsible open={wardsOpen} onOpenChange={setWardsOpen}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Wards</CardTitle>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Badge variant="secondary" className="text-xs">{assignedWards.length}</Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${wardsOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {Object.entries(grouped).length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(grouped).map(([name, wards]) => (
                    <div key={name} className="text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground ml-1">
                        W{wards.sort((a, b) => a - b).join(", W")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No wards assigned</p>}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default DeliveryStats;
