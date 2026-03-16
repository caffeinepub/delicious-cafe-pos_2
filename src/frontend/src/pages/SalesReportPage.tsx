import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  BarChart2,
  CalendarDays,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";

type DateRange = "today" | "week" | "month" | "custom";

function getRange(
  range: DateRange,
  customStart?: Date,
  customEnd?: Date,
): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);

  if (range === "today") return { start: todayStart, end: todayEnd };
  if (range === "week") {
    const day = now.getDay();
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - day);
    return { start: weekStart, end: todayEnd };
  }
  if (range === "month") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: todayEnd,
    };
  }
  // custom
  return {
    start: customStart ?? todayStart,
    end: customEnd ?? todayEnd,
  };
}

function toNano(d: Date): bigint {
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

export default function SalesReportPage() {
  const { actor } = useActor();
  const [activeRange, setActiveRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const { start, end } = getRange(activeRange, customStart, customEnd);

  const { data: report, isLoading } = useQuery({
    queryKey: ["sales-report", start.toISOString(), end.toISOString()],
    queryFn: () => actor!.getSalesReport(toNano(start), toNano(end)),
    enabled: !!actor,
  });

  const sortedItems = report
    ? [...report.itemBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue)
    : [];

  const avgOrderValue =
    report && Number(report.totalOrders) > 0
      ? report.totalRevenue / Number(report.totalOrders)
      : 0;

  const rangeLabel =
    activeRange === "today"
      ? "Today"
      : activeRange === "week"
        ? "This Week"
        : activeRange === "month"
          ? "This Month"
          : `${customStart?.toLocaleDateString() ?? "?"} – ${customEnd?.toLocaleDateString() ?? "?"}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold">Sales Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyse revenue and item performance.
        </p>
      </div>

      {/* Date range filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "week", "month", "custom"] as DateRange[]).map((r) => (
          <Button
            key={r}
            data-ocid={`sales.range.${r === "today" ? "primary_button" : r === "week" ? "secondary_button" : r === "month" ? "button" : "toggle"}`}
            variant={activeRange === r ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveRange(r)}
            className={
              activeRange === r ? "bg-primary text-primary-foreground" : ""
            }
          >
            {r === "today"
              ? "Today"
              : r === "week"
                ? "This Week"
                : r === "month"
                  ? "This Month"
                  : "Custom"}
          </Button>
        ))}

        {activeRange === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="sales.custom_start.button"
                >
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {customStart
                    ? customStart.toLocaleDateString()
                    : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                data-ocid="sales.start.popover"
              >
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={(d) => {
                    setCustomStart(d ?? undefined);
                    setStartOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">to</span>
            <Popover open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="sales.custom_end.button"
                >
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {customEnd ? customEnd.toLocaleDateString() : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                data-ocid="sales.end.popover"
              >
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={(d) => {
                    setCustomEnd(d ?? undefined);
                    setEndOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Badge variant="outline" className="ml-auto text-xs">
          {rangeLabel}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Revenue
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <p className="text-2xl font-display font-bold">
                    ₹{(report?.totalRevenue ?? 0).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-green-50">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Orders
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="text-2xl font-display font-bold">
                    {report ? Number(report.totalOrders).toString() : "0"}
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-blue-50">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Avg Order Value
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-2xl font-display font-bold">
                    ₹{avgOrderValue.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item breakdown table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Item Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-ocid="sales.items.table">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right pr-6">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="sales.items.empty_state"
                  >
                    No sales data for this period.
                  </TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item, i) => (
                  <TableRow
                    key={item.menuItemId}
                    data-ocid={`sales.items.row.${i + 1}`}
                  >
                    <TableCell className="pl-6 text-muted-foreground text-sm">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.menuItemName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {item.quantitySold}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary pr-6">
                      ₹{item.totalRevenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
