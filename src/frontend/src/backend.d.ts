export interface RawMaterial {
    id: string;
    lowStockThreshold: number;
    supplierName: string;
    name: string;
    createdAt: bigint;
    unit: Unit;
    quantity: number;
    costPrice: number;
}
export interface OrderItem {
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    menuItemId: string;
}
export interface OrderInput {
    paymentMethod: PaymentMethod;
    createdBy: string;
    items: Array<OrderItemInput>;
}
export interface OrderItemInput {
    quantity: number;
    menuItemId: string;
}
export interface Order {
    id: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    createdAt: bigint;
    createdBy: string;
    totalAmount: number;
    items: Array<OrderItem>;
    orderNumber: string;
}
export interface MenuItemInput {
    name: string;
    description: string;
    category: Category;
    imageId?: string;
    price: number;
    quantity: number;
}
export interface RecipeIngredient {
    materialId: string;
    quantityNeeded: number;
}
export interface DashboardStats {
    totalOrders: bigint;
    totalSales: number;
    lowStockMaterials: Array<RawMaterial>;
    outOfStockItems: Array<MenuItem>;
    totalInventoryItems: bigint;
}
export interface RawMaterialInput {
    lowStockThreshold: number;
    supplierName: string;
    name: string;
    unit: Unit;
    quantity: number;
    costPrice: number;
}
export interface MenuItem {
    id: string;
    name: string;
    description: string;
    createdAt: bigint;
    isAvailable: boolean;
    category: Category;
    imageId?: string;
    price: number;
    quantity: number;
}
export enum Category {
    desserts = "desserts",
    other = "other",
    food = "food",
    snacks = "snacks",
    beverages = "beverages"
}
export enum OrderStatus {
    completed = "completed"
}
export enum PaymentMethod {
    upi = "upi",
    cash = "cash"
}
export enum Unit {
    kg = "kg",
    ml = "ml",
    gram = "gram",
    liter = "liter",
    piece = "piece"
}
export interface backendInterface {
    adjustRawMaterialQuantity(id: string, adjustment: number): Promise<number>;
    createMenuItem(input: MenuItemInput): Promise<string>;
    createRawMaterial(input: RawMaterialInput): Promise<string>;
    deleteMenuItem(id: string): Promise<void>;
    deleteRawMaterial(id: string): Promise<void>;
    getDashboardStats(): Promise<DashboardStats>;
    getMenuItem(id: string): Promise<MenuItem | null>;
    getOrder(id: string): Promise<Order | null>;
    getOrders(startIndex: bigint, pageSize: bigint): Promise<Array<Order>>;
    getRawMaterial(id: string): Promise<RawMaterial | null>;
    getRecipe(menuItemId: string): Promise<Array<RecipeIngredient>>;
    listAllRecipes(): Promise<Array<[string, Array<RecipeIngredient>]>>;
    listLowStockMaterials(): Promise<Array<RawMaterial>>;
    listMenuItems(): Promise<Array<MenuItem>>;
    listRawMaterials(): Promise<Array<RawMaterial>>;
    placeOrder(input: OrderInput): Promise<string>;
    setRecipe(menuItemId: string, ingredients: Array<RecipeIngredient>): Promise<void>;
    toggleMenuItemAvailability(id: string): Promise<boolean>;
    updateMenuItem(id: string, input: MenuItemInput): Promise<void>;
    updateRawMaterial(id: string, input: RawMaterialInput): Promise<void>;
}
