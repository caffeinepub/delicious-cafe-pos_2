import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MenuItem, Order } from "../backend";
import { Category, PaymentMethod } from "../backend";
import { useActor } from "../hooks/useActor";

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

const CATEGORIES = ["all", ...Object.values(Category)];

const CATEGORY_EMOJI: Record<string, string> = {
  beverages: "☕",
  food: "🍽️",
  snacks: "🥪",
  desserts: "🍰",
  other: "🍴",
};

export default function POSPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.cash,
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [placing, setPlacing] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

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

  const addToCart = (item: MenuItem) => {
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
      const orderId = await actor.placeOrder({
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
        })),
        paymentMethod,
        createdBy: "cafe-staff",
      });
      const order = await actor.getOrder(orderId);
      setReceipt(order);
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed successfully!");
    } catch (_e) {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleString();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Menu grid - left */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h1 className="text-xl font-display font-semibold text-foreground mb-3">
            New Order
          </h1>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
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
              {Array.from({ length: 8 }, (_, i) => String(i)).map((sk) => (
                <Skeleton key={sk} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"
              data-ocid="pos.menu.empty_state"
            >
              <ShoppingCart className="w-8 h-8 opacity-30" />
              <p className="text-sm">No items available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item, i) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    data-ocid={`pos.menu_item.card.${i + 1}`}
                    onClick={() => addToCart(item)}
                    className="bg-card rounded-xl border border-border p-3 text-left hover:border-primary/60 hover:shadow-coffee transition-all active:scale-95 relative"
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
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-bold text-foreground">
              ₹{total.toFixed(2)}
            </span>
          </div>

          {/* Payment method */}
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
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-mono font-semibold">
                    {receipt.orderNumber}
                  </span>
                </div>
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
              <div className="flex gap-2 pt-2">
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
