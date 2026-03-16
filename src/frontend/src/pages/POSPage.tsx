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
  ClipboardList,
  Edit2,
  History,
  Loader2,
  Minus,
  Phone,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Category, PaymentMethod } from "../backend";
import type { MenuItemFull, OrderFull } from "../backend.d";
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

function timeAgo(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function statusColor(status: string) {
  if (status === "pending")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (status === "accepted") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "completed")
    return "bg-green-100 text-green-700 border-green-200";
  return "bg-muted text-muted-foreground";
}

// ─── Order History Tab ───────────────────────────────────────────────────────

function OrderHistoryTab() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await (actor as any).getOrders(0, 200);
      return result as OrderFull[];
    },
    enabled: !!actor,
    refetchInterval: 5000,
  });

  const filtered = searchTerm.trim()
    ? orders.filter((o) => {
        const name = (o as any).customerName?.[0] ?? "";
        const phone = (o as any).customerPhone?.[0] ?? "";
        const q = searchTerm.toLowerCase();
        return (
          name.toLowerCase().includes(q) ||
          phone.includes(q) ||
          o.orderNumber?.toString().includes(q)
        );
      })
    : orders;

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
      const items = editState.items.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      }));
      await actor.editOrderItems(editState.orderId, items);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success("Order updated!");
      setEditState(null);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTransfer = async (order: OrderFull) => {
    if (!actor) return;
    setTransferringId(order.id);
    try {
      await (actor as any).transferOrder(order.id, "counter-b");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success(`Order #${order.orderNumber} transferred to Counter B!`);
    } catch {
      toast.error("Failed to transfer order");
    } finally {
      setTransferringId(null);
    }
  };

  const isActive = (status: string) =>
    status === "pending" || status === "accepted";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search bar */}
      <div className="px-5 py-3 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="pos.history.search_input"
            placeholder="Search by customer name, phone, or order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
            data-ocid="pos.history.empty_state"
          >
            <ClipboardList className="w-12 h-12 opacity-20" />
            <p className="text-base font-display">
              {searchTerm ? "No orders match your search" : "No orders yet"}
            </p>
            <p className="text-sm">
              {searchTerm
                ? "Try a different name or phone number"
                : "Orders placed from POS 1 will appear here"}
            </p>
          </div>
        ) : (
          filtered.map((order, i) => (
            <div
              key={order.id}
              data-ocid={`pos.history.item.${i + 1}`}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-border/60 bg-secondary/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-foreground">
                      #{order.orderNumber}
                    </span>
                    <Badge
                      className={`text-xs px-2 py-0 h-5 border font-medium ${statusColor(order.status)}`}
                    >
                      {order.status}
                    </Badge>
                    {(order as any).isTransferred && (
                      <Badge className="text-xs px-2 py-0 h-5 bg-amber-100 text-amber-700 border border-amber-200">
                        Transferred
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(order.createdAt)} • {order.paymentMethod}
                  </p>
                  {(order as any).customerName?.[0] && (
                    <p className="text-xs text-foreground/80 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {(order as any).customerName[0]}
                      {(order as any).customerPhone?.[0] && (
                        <span className="text-muted-foreground">
                          · {(order as any).customerPhone[0]}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <span className="font-bold text-primary text-base">
                  ₹{order.totalAmount.toFixed(2)}
                </span>
              </div>

              {/* Items */}
              <div className="px-4 py-2.5 space-y-1">
                {order.items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-foreground/80">
                      {item.menuItemName}
                    </span>
                    <span className="font-semibold text-foreground">
                      ×{item.quantity}
                      <span className="text-muted-foreground font-normal ml-2">
                        ₹{(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions - only for active orders */}
              {isActive(order.status) && (
                <div className="px-4 pb-3 pt-1 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    data-ocid={`pos.history.edit_button.${i + 1}`}
                    onClick={() => openEdit(order)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Order
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-ocid={`pos.history.secondary_button.${i + 1}`}
                    onClick={() => handleTransfer(order)}
                    disabled={transferringId === order.id}
                    className="h-8 text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {transferringId === order.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-3 h-3" />
                    )}
                    Transfer to Counter B
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editState} onOpenChange={() => setEditState(null)}>
        <DialogContent data-ocid="pos.history.edit.dialog">
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
              data-ocid="pos.history.edit.cancel_button"
              onClick={() => setEditState(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="pos.history.edit.save_button"
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

// ─── New Order Tab ───────────────────────────────────────────────────────────

export default function POSPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.cash,
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<OrderFull | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [transferring, setTransferring] = useState(false);

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
        createdBy: "pos-1",
        customerName: customerName.trim() ? [customerName.trim()] : [],
        customerPhone: customerPhone.trim() ? [customerPhone.trim()] : [],
      };
      const orderId = await actor.placeOrder(orderInput);
      const order = await actor.getOrder(orderId);
      setReceipt(order as OrderFull);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-count"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success(`Order #${(order as any)?.orderNumber ?? ""} placed!`);
    } catch (_e) {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const handleTransferToCounterB = async () => {
    if (!actor || !receipt) return;
    setTransferring(true);
    try {
      await (actor as any).transferOrder(receipt.id, "counter-b");
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      toast.success(`Order #${receipt.orderNumber} transferred to Counter B!`);
      setReceipt(null);
    } catch {
      toast.error("Failed to transfer order");
    } finally {
      setTransferring(false);
    }
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header with tabs */}
      <div className="px-5 pt-4 pb-0 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded-md">
              POS 1
            </span>
            Order Management
          </h1>
        </div>
        <Tabs defaultValue="new-order" className="w-full">
          <TabsList className="mb-0 bg-transparent border-b-0 p-0 gap-0 rounded-none">
            <TabsTrigger
              value="new-order"
              data-ocid="pos.new_order.tab"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 gap-1.5 text-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              New Order
            </TabsTrigger>
            <TabsTrigger
              value="order-history"
              data-ocid="pos.order_history.tab"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 gap-1.5 text-sm"
            >
              <History className="w-3.5 h-3.5" />
              Order History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new-order" className="mt-0 h-full">
            <div className="flex h-[calc(100vh-10rem)] overflow-hidden">
              {/* Menu grid - left */}
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                <div className="px-5 pt-3 pb-3 border-b border-border">
                  <Tabs
                    value={activeCategory}
                    onValueChange={setActiveCategory}
                  >
                    <TabsList className="flex-wrap h-auto gap-1 bg-secondary">
                      {CATEGORIES.map((cat) => (
                        <TabsTrigger
                          key={cat}
                          value={cat}
                          data-ocid="pos.category.tab"
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
                      {Array.from({ length: 8 }, (_, i) => String(i)).map(
                        (sk) => (
                          <Skeleton key={sk} className="h-36 rounded-xl" />
                        ),
                      )}
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"
                      data-ocid="pos.menu.empty_state"
                    >
                      <ShoppingCart className="w-8 h-8 opacity-30" />
                      <p className="text-sm">
                        No items available in this category.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredItems.map((item, i) => {
                        const inCart = cart.find(
                          (c) => c.menuItemId === item.id,
                        );
                        return (
                          <button
                            type="button"
                            key={item.id}
                            data-ocid={`pos.menu_item.card.${i + 1}`}
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

              {/* Cart panel - right */}
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
                      data-ocid="pos.cart.empty_state"
                    >
                      <ShoppingCart className="w-6 h-6 opacity-30" />
                      <p className="text-xs">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item, i) => (
                      <div
                        key={item.menuItemId}
                        data-ocid={`pos.cart.item.${i + 1}`}
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
                        data-ocid="pos.customer_name.input"
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
                        data-ocid="pos.customer_phone.input"
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
                      data-ocid="pos.payment.cash.toggle"
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
                      data-ocid="pos.payment.upi.toggle"
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
                    data-ocid="pos.complete_order.primary_button"
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
          </TabsContent>

          <TabsContent
            value="order-history"
            className="mt-0 flex-1 overflow-hidden h-[calc(100vh-10rem)]"
          >
            <OrderHistoryTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-sm" data-ocid="receipt.dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-center">
              Order Receipt
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-4">
              <div className="text-center border-b border-border pb-3">
                <p className="font-display font-bold text-lg">
                  ☕ Delicious Cafe
                </p>
                <p className="text-xs text-muted-foreground">
                  Thank you for your order!
                </p>
              </div>
              {/* Order number highlight */}
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Order Number
                </p>
                <p className="font-display font-bold text-2xl text-primary">
                  #{receipt.orderNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  POS 1 Order
                </p>
              </div>
              <div className="space-y-1 text-sm">
                {(receipt as any).customerName?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">
                      {(receipt as any).customerName[0]}
                    </span>
                  </div>
                )}
                {(receipt as any).customerPhone?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-medium">
                      {(receipt as any).customerPhone[0]}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-xs">
                    {formatDate(receipt.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{receipt.paymentMethod}</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                {receipt.items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.menuItemName} × {item.quantity}
                    </span>
                    <span className="font-semibold">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">
                  ₹{receipt.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  data-ocid="receipt.transfer.button"
                  variant="outline"
                  onClick={handleTransferToCounterB}
                  disabled={transferring}
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {transferring ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                  )}
                  Transfer to Counter B
                </Button>
                <div className="flex gap-2">
                  <Button
                    data-ocid="receipt.print.button"
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    data-ocid="receipt.close.button"
                    variant="outline"
                    onClick={() => setReceipt(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
