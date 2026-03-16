import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  BookOpen,
  Coffee,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";

interface Props {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems = [
  {
    id: "dashboard" as Page,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "pos" as Page,
    label: "POS / Orders",
    icon: ShoppingCart,
  },
  {
    id: "menu" as Page,
    label: "Menu Items",
    icon: UtensilsCrossed,
  },
  {
    id: "inventory" as Page,
    label: "Inventory",
    icon: Package,
  },
  {
    id: "recipes" as Page,
    label: "Recipe Mapping",
    icon: BookOpen,
  },
  {
    id: "sales" as Page,
    label: "Sales History",
    icon: BarChart2,
  },
];

function NavContent({
  currentPage,
  onNavigate,
  onClose,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-sidebar-foreground leading-tight">
                Delicious Cafe
              </p>
              <p className="text-xs text-sidebar-foreground/50">POS System</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              data-ocid={`nav.${item.id}.link`}
              onClick={() => {
                onNavigate(item.id);
                onClose?.();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors",
                active
                  ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center leading-relaxed">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-sidebar-foreground/60"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
  currentPage,
  onNavigate,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-58 flex-col bg-sidebar flex-shrink-0"
        style={{ width: "230px" }}
      >
        <NavContent currentPage={currentPage} onNavigate={onNavigate} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            role="button"
            tabIndex={0}
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50">
            <NavContent
              currentPage={currentPage}
              onNavigate={onNavigate}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-display font-semibold text-sidebar-foreground text-sm flex items-center gap-2">
            <Coffee className="w-4 h-4" /> Delicious Cafe
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
