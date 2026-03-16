import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import MenuPage from "./pages/MenuPage";
import POSPage from "./pages/POSPage";
import RecipesPage from "./pages/RecipesPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";

export type Page =
  | "dashboard"
  | "pos"
  | "menu"
  | "inventory"
  | "recipes"
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
        return <MenuPage />;
      case "inventory":
        return <InventoryPage />;
      case "recipes":
        return <RecipesPage />;
      case "sales":
        return <SalesHistoryPage />;
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
