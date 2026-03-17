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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, Eye, Printer } from "lucide-react";
import { useState } from "react";
import type { OrderFull } from "../backend.d";
import { useTypedActor } from "../hooks/useTypedActor";

const PAGE_SIZE = 20n;

export default function SalesHistoryPage() {
  const { actor } = useTypedActor();
  const [page, setPage] = useState(0n);
  const [selectedOrder, setSelectedOrder] = useState<OrderFull | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", page.toString()],
    queryFn: () => actor!.getOrders(page * PAGE_SIZE, PAGE_SIZE),
    enabled: !!actor,
  });

  const formatDate = (ts: bigint) => {
    return new Date(Number(ts) / 1_000_000).toLocaleString();
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const rows = [
      ["Order #", "Date", "Items", "Total", "Payment Method"].join(","),
      ...orders.map((o) =>
        [
          o.orderNumber,
          formatDate(o.createdAt),
          o.items.map((i) => `${i.menuItemName} x${i.quantity}`).join(" | "),
          o.totalAmount.toFixed(2),
          o.paymentMethod,
        ].join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Sales History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review all past orders and export reports.
          </p>
        </div>
        <Button
          data-ocid="sales.export_csv.button"
          variant="outline"
          onClick={exportCSV}
          disabled={orders.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Orders shown</p>
            <p className="text-2xl font-display font-bold">{orders.length}</p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-display font-bold">
              ₹{totalSales.toFixed(2)}
            </p>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Avg. Order Value</p>
            <p className="text-2xl font-display font-bold">
              ₹{(totalSales / orders.length).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-16">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((sk) => (
                <TableRow key={sk}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                  data-ocid="sales.empty_state"
                >
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, i) => (
                <TableRow
                  key={order.id}
                  data-ocid={`sales.order.row.${i + 1}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedOrder(order)}
                >
                  <TableCell className="font-mono text-sm font-semibold">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.items
                      .slice(0, 2)
                      .map((it) => `${it.menuItemName} x${it.quantity}`)
                      .join(", ")}
                    {order.items.length > 2 &&
                      ` +${order.items.length - 2} more`}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs border-0 ${
                        order.paymentMethod === "cash"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                      variant="outline"
                    >
                      {order.paymentMethod === "cash" ? "💵 Cash" : "📱 UPI"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {BigInt(orders.length) === PAGE_SIZE && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            data-ocid="sales.pagination_next"
            onClick={() => setPage((p) => p + 1n)}
          >
            <ChevronDown className="w-4 h-4 mr-2" />
            Load More
          </Button>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="sales.receipt.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Order Receipt</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div className="text-center border-b pb-3">
                <p className="font-display font-bold">Delicious Cafe</p>
                <p className="text-xs text-muted-foreground">Receipt</p>
              </div>
              <div className="space-y-1 text-sm">
                {(selectedOrder as any).customerName?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">
                      {(selectedOrder as any).customerName[0]}
                    </span>
                  </div>
                )}
                {(selectedOrder as any).customerPhone?.[0] && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile</span>
                    <span className="font-medium">
                      {(selectedOrder as any).customerPhone[0]}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-mono font-semibold">
                    {selectedOrder.orderNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-xs">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">
                    {selectedOrder.paymentMethod}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div
                    key={`${item.menuItemId}`}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.menuItemName} x{item.quantity}
                    </span>
                    <span>₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">
                  ₹{selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              <Button
                data-ocid="receipt.print.button"
                className="w-full bg-primary text-primary-foreground"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
