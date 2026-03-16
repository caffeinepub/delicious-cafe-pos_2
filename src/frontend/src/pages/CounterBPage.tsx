import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  ShoppingCart,
  Store,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Category, OrderStatus, PaymentMethod } from "../backend";
import type { MenuItemFull, OrderFull, OrderItemInput } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
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

const CATEGORIES = ["all", ...Object.values(Category)];

const CATEGORY_EMOJI: Record<string, string> = {
  beverages: "☕",
  food: "🍽️",
  snacks: "🥪",
  desserts: "🍰",
  other: "🍴",
};

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

// ─── Take Order Tab ──────────────────────────────────────────────────────────

function TakeOrderTab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.cash,
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [placing, setPlacing] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => actor!.listMenuItems(),
    enabled: !!actor,
  });

  const availableItems = menuItems.filter((m) => m.isAvailable);
  const filteredItems =
    activeCategory === "all"
      ? availableItems
      : availableItems.filter((m) => m.category === activeCategory);

  const addToCart = (item: MenuItemFull) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === id
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== id));
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0 || !actor) return;
    setPlacing(true);
    try {
      const orderInput: any = {
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
        })),
        paymentMethod,
        createdBy: "counter-b",
        customerName: customerName.trim() ? [customerName.trim()] : [],
        customerPhone: customerPhone.trim() ? [customerPhone.trim()] : [],
      };
      const orderId = await actor.placeOrder(orderInput);
      const order = await actor.getOrder(orderId);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-count"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success(
        `Order #${(order as any)?.orderNumber ?? ""} placed from Counter B!`,
      );
    } catch (_e) {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Menu grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex-wrap h-auto gap-1 bg-secondary">
              {CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  data-ocid="counterb.category.tab"
                  className="capitalize text-xs"
                >
                  {cat === "all"
                    ? "All"
                    : `${CATEGORY_EMOJI[cat] ?? ""} ${cat}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }, (_, i) => String(i)).map((sk) => (
                <Skeleton key={sk} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"
              data-ocid="counterb.menu.empty_state"
            >
              <ShoppingCart className="w-8 h-8 opacity-30" />
              <p className="text-sm">No items available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item, i) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    data-ocid={`counterb.menu_item.card.${i + 1}`}
                    onClick={() => addToCart(item)}
                    className="bg-card rounded-xl border border-border p-3 text-left hover:border-primary/60 hover:shadow-md transition-all active:scale-95 relative"
                  >
                    <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center mb-3 text-3xl">
                      {CATEGORY_EMOJI[item.category] ?? "🍴"}
                    </div>
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold text-primary">
                        ₹{item.price.toFixed(2)}
                      </span>
                      {inCart && (
                        <Badge className="bg-primary/90 text-primary-foreground text-xs px-1.5 py-0 h-5">
                          {inCart.quantity}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-72 flex-col border-l border-border bg-card hidden md:flex">
        <div className="px-4 py-3 border-b border-border bg-secondary">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cart.length > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </Badge>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2"
              data-ocid="counterb.cart.empty_state"
            >
              <ShoppingCart className="w-6 h-6 opacity-30" />
              <p className="text-xs">Cart is empty</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div
                key={item.menuItemId}
                data-ocid={`counterb.cart.item.${i + 1}`}
                className="flex items-center gap-2 bg-secondary rounded-lg px-2 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQty(item.menuItemId, -1)}
                    className="w-5 h-5 rounded flex items-center justify-center bg-border hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.menuItemId, 1)}
                    className="w-5 h-5 rounded flex items-center justify-center bg-border hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.menuItemId)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          {/* Customer info */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Customer Name
              </Label>
              <Input
                data-ocid="counterb.customer_name.input"
                placeholder="Optional"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Mobile No.
              </Label>
              <Input
                data-ocid="counterb.customer_phone.input"
                placeholder="Optional"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8 text-xs"
                type="tel"
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold text-foreground">
              ₹{total.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-ocid="counterb.payment.cash.toggle"
              onClick={() => setPaymentMethod(PaymentMethod.cash)}
              className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                paymentMethod === PaymentMethod.cash
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              💵 Cash
            </button>
            <button
              type="button"
              data-ocid="counterb.payment.upi.toggle"
              onClick={() => setPaymentMethod(PaymentMethod.upi)}
              className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                paymentMethod === PaymentMethod.upi
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              📱 UPI
            </button>
          </div>

          <Button
            data-ocid="counterb.complete_order.primary_button"
            className="w-full bg-primary text-primary-foreground h-11 font-semibold"
            disabled={cart.length === 0 || placing}
            onClick={placeOrder}
          >
            {placing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Place Order • ₹${total.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Active Orders Tab ───────────────────────────────────────────────────────

function ActiveOrdersTab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  // Track previously seen order IDs to detect truly new orders
  const prevOrderIds = useRef<Set<string>>(new Set());
  const beepInterval = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const pendingOrders = orders.filter((o) => o.status === OrderStatus.pending);
  const acceptedOrders = orders.filter(
    (o) => o.status === OrderStatus.accepted,
  );
  const pendingCount = pendingOrders.length;

  const stopBeeping = useCallback(() => {
    if (beepInterval.current) {
      clearInterval(beepInterval.current);
      beepInterval.current = null;
    }
  }, []);

  useEffect(() => {
    // Find newly appeared orders that have isTransferred === true
    const hasNewTransferredOrder = orders.some((o) => {
      const isNew = !prevOrderIds.current.has(o.id);
      const isTransferred = (o as any).isTransferred === true;
      return isNew && isTransferred;
    });

    if (hasNewTransferredOrder) {
      playBeep();
      stopBeeping();
      beepInterval.current = setInterval(playBeep, 2000);
    }

    // Stop beeping once there are no more pending orders
    if (pendingCount === 0) {
      stopBeeping();
    }

    // Update the set of known order IDs
    prevOrderIds.current = new Set(orders.map((o) => o.id));

    return stopBeeping;
  }, [orders, pendingCount, stopBeeping]);

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

  const handleTransferToPOS1 = async (order: OrderFull) => {
    if (!actor) return;
    setActioningId(order.id);
    try {
      await (actor as any).transferOrder(order.id, "pos-1");
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success(`Order #${order.orderNumber} transferred to POS 1!`);
    } catch {
      toast.error("Failed to transfer order");
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Last updated: {lastUpdated}
        </p>
        {pendingCount > 0 && (
          <Badge className="bg-red-500 text-white animate-pulse">
            {pendingCount} pending
          </Badge>
        )}
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
          data-ocid="counterb.orders.empty_state"
        >
          <Store className="w-12 h-12 opacity-20" />
          <p className="text-lg font-display">No active orders</p>
          <p className="text-sm">New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map((order, i) => (
                  <CounterBOrderCard
                    key={order.id}
                    order={order}
                    index={i}
                    type="pending"
                    actioningId={actioningId}
                    onAccept={() => handleAccept(order.id)}
                    onEdit={() => openEdit(order)}
                    onTransfer={() => handleTransferToPOS1(order)}
                  />
                ))}
              </div>
            </div>
          )}

          {acceptedOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Store className="w-4 h-4" />
                In Progress ({acceptedOrders.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedOrders.map((order, i) => (
                  <CounterBOrderCard
                    key={order.id}
                    order={order}
                    index={i}
                    type="accepted"
                    actioningId={actioningId}
                    onComplete={() => handleComplete(order.id)}
                    onEdit={() => openEdit(order)}
                    onTransfer={() => handleTransferToPOS1(order)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editState} onOpenChange={() => setEditState(null)}>
        <DialogContent data-ocid="counterb.edit.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Order #{editState?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-3 py-2">
              {editState.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items left.
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
              data-ocid="counterb.edit.cancel_button"
              onClick={() => setEditState(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="counterb.edit.save_button"
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

function CounterBOrderCard({
  order,
  index,
  type,
  actioningId,
  onAccept,
  onComplete,
  onEdit,
  onTransfer,
}: {
  order: OrderFull;
  index: number;
  type: "pending" | "accepted";
  actioningId: string | null;
  onAccept?: () => void;
  onComplete?: () => void;
  onEdit: () => void;
  onTransfer: () => void;
}) {
  const isActioning = actioningId === order.id;
  const borderColor =
    type === "pending" ? "border-orange-300" : "border-blue-300";
  const headerBg = type === "pending" ? "bg-orange-50" : "bg-blue-50";

  return (
    <div
      className={`bg-card rounded-xl border-2 ${borderColor} shadow-sm overflow-hidden`}
      data-ocid={`counterb.order.card.${index + 1}`}
    >
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between`}
      >
        <div>
          <p className="font-display font-bold text-lg">#{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(order.createdAt)} • {order.paymentMethod}
          </p>
          {(order as any).customerName?.[0] && (
            <p className="text-xs text-muted-foreground mt-0.5">
              👤 {(order as any).customerName[0]}
              {(order as any).customerPhone?.[0]
                ? ` · ${(order as any).customerPhone[0]}`
                : ""}
            </p>
          )}
          {(order as any).isTransferred && (
            <span className="inline-block mt-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              ↩ From POS 1
            </span>
          )}
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

      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-primary">
            ₹{order.totalAmount.toFixed(2)}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              data-ocid={`counterb.order.edit_button.${index + 1}`}
              onClick={onEdit}
              className="h-7 px-2 text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
            {type === "pending" ? (
              <Button
                size="sm"
                data-ocid={`counterb.order.primary_button.${index + 1}`}
                onClick={onAccept}
                disabled={isActioning}
                className="bg-orange-500 hover:bg-orange-600 text-white h-7 px-2 text-xs"
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
                data-ocid={`counterb.order.primary_button.${index + 1}`}
                onClick={onComplete}
                disabled={isActioning}
                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
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
        <Button
          variant="outline"
          size="sm"
          data-ocid={`counterb.order.secondary_button.${index + 1}`}
          onClick={onTransfer}
          disabled={isActioning}
          className="w-full h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <ArrowRightLeft className="w-3 h-3 mr-1" />
          Transfer to POS 1
        </Button>
      </div>
    </div>
  );
}

// ─── Main Counter B Page ─────────────────────────────────────────────────────

export default function CounterBPage() {
  const { actor } = useActor();
  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => actor!.listActiveOrders(),
    enabled: !!actor,
    refetchInterval: 5000,
  });

  const pendingCount = pendingOrders.filter(
    (o) => o.status === OrderStatus.pending,
  ).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold">
              Counter B
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (POS 2)
              </span>
            </h1>
          </div>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-red-500 text-white animate-pulse">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      <Tabs
        defaultValue="take-order"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList
          className="mx-6 mt-3 mb-0 w-auto self-start"
          data-ocid="counterb.tab"
        >
          <TabsTrigger
            value="take-order"
            data-ocid="counterb.take_order.tab"
            className="flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Take Order
          </TabsTrigger>
          <TabsTrigger
            value="active-orders"
            data-ocid="counterb.active_orders.tab"
            className="flex items-center gap-1.5 relative"
          >
            <Store className="w-3.5 h-3.5" />
            Active Orders
            {pendingCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-4 ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="take-order"
          className="flex-1 overflow-hidden mt-0 pt-3"
        >
          <TakeOrderTab />
        </TabsContent>
        <TabsContent
          value="active-orders"
          className="flex-1 overflow-y-auto mt-0"
        >
          <ActiveOrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
