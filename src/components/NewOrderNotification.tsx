import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Package } from "lucide-react";

interface PendingOrder {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
}

interface Props {
  userId: string;
  /** 'delivery' polls orders assigned to this staff; 'seller' polls orders for seller */
  role: "delivery" | "seller";
  onAccept?: (orderId: string) => void;
  onRefresh?: () => void;
}

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

const NewOrderNotification = ({ userId, role, onAccept, onRefresh }: Props) => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      let query;
      if (role === "delivery") {
        query = supabase
          .from("orders")
          .select("id, status, total, shipping_address, created_at, items")
          .eq("assigned_delivery_staff_id", userId)
          .in("status", ["pending", "seller_accepted"])
          .order("created_at", { ascending: false });
      } else {
        // seller: use RPC
        const { data, error } = await supabase.rpc("get_orders_for_seller", { seller_user_id: userId });
        if (error) return;
        const pending = ((data as PendingOrder[]) ?? []).filter(
          (o) => o.status === "seller_confirmation_pending" || o.status === "pending"
        );
        const newOrders = pending.filter((o) => !dismissedIds.has(o.id));
        if (newOrders.length > 0 && newOrders.length > prevCountRef.current) {
          playSound();
          setOpen(true);
        }
        prevCountRef.current = newOrders.length;
        setPendingOrders(pending);
        return;
      }

      const { data, error } = await query;
      if (error) return;
      const orders = (data as PendingOrder[]) ?? [];
      const newOrders = orders.filter((o) => !dismissedIds.has(o.id));
      if (newOrders.length > 0 && newOrders.length > prevCountRef.current) {
        playSound();
        setOpen(true);
      }
      prevCountRef.current = newOrders.length;
      setPendingOrders(orders);
    } catch {
      // silent
    }
  }, [userId, role, dismissedIds]);

  const playSound = () => {
    try {
      // Use Web Audio API for a notification beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Second beep
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1000;
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(ctx.currentTime + 0.3);
        } catch {}
      }, 400);
    } catch {}
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleAccept = async (orderId: string) => {
    const newStatus = role === "delivery" ? "accepted" : "seller_accepted";
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      setDismissedIds((prev) => new Set([...prev, orderId]));
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      onAccept?.(orderId);
      onRefresh?.();
      if (pendingOrders.length <= 1) setOpen(false);
    }
  };

  const handleDismiss = (orderId: string) => {
    setDismissedIds((prev) => new Set([...prev, orderId]));
  };

  const undismissedOrders = pendingOrders.filter((o) => !dismissedIds.has(o.id));

  if (pendingOrders.length === 0) return null;

  return (
    <>
      {/* Floating notification bell */}
      {undismissedOrders.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg animate-bounce hover:animate-none transition-all"
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {undismissedOrders.length}
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              New Orders ({pendingOrders.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className={`border rounded-lg p-3 space-y-2 transition-opacity ${
                  dismissedIds.has(order.id) ? "opacity-40" : "bg-accent/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</span>
                  <Badge variant="secondary">₹{order.total}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {order.shipping_address || "No address"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} item(s): {order.items.map((i: any) => i.name || i.id?.slice(0, 6)).join(", ")}
                  </p>
                )}
                {!dismissedIds.has(order.id) && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => handleAccept(order.id)}>
                      Accept Order
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDismiss(order.id)}>
                      Later
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewOrderNotification;
