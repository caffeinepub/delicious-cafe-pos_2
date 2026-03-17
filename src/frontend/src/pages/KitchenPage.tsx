import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Edit2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OrderStatus } from "../backend";
import type { OrderFull, OrderItemInput } from "../backend.d";
import { useTypedActor } from "../hooks/useTypedActor";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

function timeAgo(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

interface EditState {
  orderId: string;
  orderNumber: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function KitchenPage() {
  const { actor } = useTypedActor();
  const queryClient = useQueryClient();
  const prevPendingCount = useRef(0);
  const beepInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [now, setNow] = useState(Date.now());
  const [editState, setEditState] = useState<EditState | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const {
    data: orders = [],
    isLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => actor!.listActiveOrders(),
    enabled: !!actor,
    refetchInterval: 3000,
  });

  // Keep "time ago" display up to date
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  // Beep logic
  const pendingOrders = orders.filter((o) => o.status === OrderStatus.pending);
  const pendingCount = pendingOrders.length;

  const stopBeeping = useCallback(() => {
    if (beepInterval.current) {
      clearInterval(beepInterval.current);
      beepInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (pendingCount > prevPendingCount.current) {
      // New orders arrived -- beep immediately then every 2s
      playBeep();
      stopBeeping();
      beepInterval.current = setInterval(playBeep, 2000);
    } else if (pendingCount === 0) {
      stopBeeping();
    }
    prevPendingCount.current = pendingCount;
    return stopBeeping;
  }, [pendingCount, stopBeeping]);

  const acceptedOrders = orders.filter(
    (o) => o.status === OrderStatus.accepted,
  );

  const handleAccept = async (id: string) => {
    if (!actor) return;
    setActioningId(id);
    try {
      await actor.acceptOrder(id);
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-count"] });
      toast.success("Order accepted!");
    } catch {
      toast.error("Failed to accept order");
    } finally {
      setActioningId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!actor) return;
    setActioningId(id);
    try {
      await actor.completeOrder(id);
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Order completed!");
    } catch {
      toast.error("Failed to complete order");
    } finally {
      setActioningId(null);
    }
  };

  const openEdit = (order: OrderFull) => {
    setEditState({
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items.map((it) => ({
        menuItemId: it.menuItemId,
        name: it.menuItemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });
  };

  const updateEditQty = (menuItemId: string, delta: number) => {
    setEditState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items
          .map((it) =>
            it.menuItemId === menuItemId
              ? { ...it, quantity: Math.max(0, it.quantity + delta) }
              : it,
          )
          .filter((it) => it.quantity > 0),
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!actor || !editState) return;
    setSavingEdit(true);
    try {
      const items: OrderItemInput[] = editState.items.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      }));
      await actor.editOrderItems(editState.orderId, items);
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success("Order updated!");
      setEditState(null);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setSavingEdit(false);
    }
  };

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "--";

  // suppress unused variable warning
  void now;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">
              Kitchen Display
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Last updated: {lastUpdated}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3"
          data-ocid="kitchen.empty_state"
        >
          <ChefHat className="w-12 h-12 opacity-20" />
          <p className="text-lg font-display">No active orders</p>
          <p className="text-sm">New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map((order, i) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={i}
                    type="pending"
                    actioningId={actioningId}
                    onAccept={() => handleAccept(order.id)}
                    onEdit={() => openEdit(order)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accepted orders */}
          {acceptedOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                In Progress ({acceptedOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedOrders.map((order, i) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    index={i}
                    type="accepted"
                    actioningId={actioningId}
                    onComplete={() => handleComplete(order.id)}
                    onEdit={() => openEdit(order)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editState} onOpenChange={() => setEditState(null)}>
        <DialogContent data-ocid="kitchen.edit.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Order #{editState?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-3 py-2">
              {editState.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items left in this order.
                </p>
              ) : (
                editState.items.map((it) => (
                  <div
                    key={it.menuItemId}
                    className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{it.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{it.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateEditQty(it.menuItemId, -1)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateEditQty(it.menuItemId, 1)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="kitchen.edit.cancel_button"
              onClick={() => setEditState(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="kitchen.edit.save_button"
              onClick={handleSaveEdit}
              disabled={
                savingEdit || !editState || editState.items.length === 0
              }
              className="bg-primary text-primary-foreground"
            >
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({
  order,
  index,
  type,
  actioningId,
  onAccept,
  onComplete,
  onEdit,
}: {
  order: OrderFull;
  index: number;
  type: "pending" | "accepted";
  actioningId: string | null;
  onAccept?: () => void;
  onComplete?: () => void;
  onEdit: () => void;
}) {
  const isActioning = actioningId === order.id;
  const borderColor =
    type === "pending" ? "border-orange-300" : "border-blue-300";
  const headerBg = type === "pending" ? "bg-orange-50" : "bg-blue-50";

  return (
    <div
      className={`bg-card rounded-xl border-2 ${borderColor} shadow-sm overflow-hidden`}
      data-ocid={`kitchen.order.card.${index + 1}`}
    >
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between`}
      >
        <div>
          <p className="font-display font-bold text-lg">#{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(order.createdAt)} • {order.paymentMethod}
          </p>
        </div>
        <Badge
          className={
            type === "pending"
              ? "bg-orange-500 text-white"
              : "bg-blue-500 text-white"
          }
        >
          {type === "pending" ? "Pending" : "In Progress"}
        </Badge>
      </div>

      <div className="p-4 space-y-1.5">
        {order.items.map((item) => (
          <div key={item.menuItemId} className="flex justify-between text-sm">
            <span className="font-medium">{item.menuItemName}</span>
            <span className="text-muted-foreground font-bold">
              ×{item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-primary">
          ₹{order.totalAmount.toFixed(2)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            data-ocid={`kitchen.order.edit_button.${index + 1}`}
            onClick={onEdit}
            className="h-8 px-3"
          >
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
          {type === "pending" ? (
            <Button
              size="sm"
              data-ocid={`kitchen.order.primary_button.${index + 1}`}
              onClick={onAccept}
              disabled={isActioning}
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3"
            >
              {isActioning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Accept"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              data-ocid={`kitchen.order.primary_button.${index + 1}`}
              onClick={onComplete}
              disabled={isActioning}
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
            >
              {isActioning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Done
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
