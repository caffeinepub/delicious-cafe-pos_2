import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AppLayout from "./components/AppLayout";
import CounterBPage from "./pages/CounterBPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import MenuManagementPage from "./pages/MenuManagementPage";
import POSPage from "./pages/POSPage";
import RecipesPage from "./pages/RecipesPage";
import SalesReportPage from "./pages/SalesReportPage";

export type Page =
  | "dashboard"
  | "pos"
  | "menu"
  | "inventory"
  | "recipes"
  | "counterb"
  | "sales";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "pos":
        return <POSPage />;
      case "menu":
        return <MenuManagementPage />;
      case "inventory":
        return <InventoryPage />;
      case "recipes":
        return <RecipesPage />;
      case "counterb":
        return <CounterBPage />;
      case "sales":
        return <SalesReportPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </AppLayout>
      <Toaster richColors position="top-right" />
    </>
  );
}
