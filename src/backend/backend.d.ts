export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
}

export interface RawMaterial {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  costPerUnit: number;
  lowStockThreshold: number;
}

export interface RecipeIngredient {
  rawMaterialId: number;
  quantityNeeded: number;
}

export interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  items: OrderItem[];
  totalRevenue: number;
  totalCost: number;
  profit: number;
  timestamp: bigint;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  lowStockItems: RawMaterial[];
}

export declare const backend: {
  addMenuItem(name: string, category: string, price: number): Promise<number>;
  updateMenuItem(id: number, name: string, category: string, price: number): Promise<boolean>;
  deleteMenuItem(id: number): Promise<boolean>;
  getMenuItems(): Promise<MenuItem[]>;

  addRawMaterial(name: string, unit: string, currentQuantity: number, costPerUnit: number, lowStockThreshold: number): Promise<number>;
  updateRawMaterial(id: number, name: string, unit: string, currentQuantity: number, costPerUnit: number, lowStockThreshold: number): Promise<boolean>;
  deleteRawMaterial(id: number): Promise<boolean>;
  getRawMaterials(): Promise<RawMaterial[]>;

  setRecipe(menuItemId: number, ingredients: RecipeIngredient[]): Promise<boolean>;
  getRecipe(menuItemId: number): Promise<RecipeIngredient[]>;
  getAllRecipes(): Promise<[number, RecipeIngredient[]][]>;

  placeOrder(cartItems: [number, number][]): Promise<Order | null>;
  getOrders(): Promise<Order[]>;

  getDashboardStats(): Promise<DashboardStats>;
};
