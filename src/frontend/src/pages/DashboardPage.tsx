import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useActor } from "../hooks/useActor";

export default function DashboardPage() {
  const { actor } = useActor();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => actor!.getDashboardStats(),
    enabled: !!actor,
    refetchInterval: 30000,
  });

  const statCards = [
    {
      title: "Today's Sales",
      value: stats ? `₹${stats.todaySales.toFixed(2)}` : "--",
      sub: stats ? `Total: ₹${stats.totalSales.toFixed(2)}` : undefined,
      icon: IndianRupee,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Today's Orders",
      value: stats ? stats.todayOrders.toString() : "--",
      sub: stats ? `Total: ${stats.totalOrders.toString()}` : undefined,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pending Orders",
      value: stats ? stats.pendingOrdersCount.toString() : "--",
      sub: "awaiting kitchen",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Inventory Items",
      value: stats ? stats.totalInventoryItems.toString() : "--",
      sub: `${stats?.lowStockMaterials.length ?? 0} low stock`,
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Low Stock Alerts",
      value: stats ? stats.lowStockMaterials.length.toString() : "--",
      sub: undefined,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Revenue (All Time)",
      value: stats ? `₹${stats.totalSales.toFixed(0)}` : "--",
      sub: undefined,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of cafe operations.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="border-border shadow-xs"
              data-ocid="dashboard.stats.card"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <p className="text-2xl font-display font-bold text-foreground">
                        {card.value}
                      </p>
                    )}
                    {card.sub && !isLoading && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.sub}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.lowStockMaterials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                ✅ All stock levels are healthy.
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.lowStockMaterials.map((m, i) => (
                  <div
                    key={m.id}
                    data-ocid={`dashboard.low_stock.item.${i + 1}`}
                    className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.quantity} {m.unit} remaining
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-300 bg-orange-50 text-xs"
                    >
                      Low Stock
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Out of stock */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Out of Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.outOfStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                ✅ All menu items are available.
              </p>
            ) : (
              <div className="space-y-2">
                {stats?.outOfStockItems.map((item, i) => (
                  <div
                    key={item.id}
                    data-ocid={`dashboard.out_of_stock.item.${i + 1}`}
                    className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.category}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-red-600 border-red-300 bg-red-50 text-xs"
                    >
                      Out of Stock
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
