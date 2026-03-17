import type { Category, Unit, PaymentMethod, OrderStatus } from "./backend";

export type { Category, Unit, PaymentMethod, OrderStatus };

export interface RawMaterial {
    id: string;
    name: string;
    unit: Unit;
    quantity: number;
    costPrice: number;
    lowStockThreshold: number;
    supplierName: string;
    createdAt: bigint;
}

export interface MenuItemFull {
    id: string;
    name: string;
    description: string;
    category: Category;
    price: number;
    quantity: number;
    isAvailable: boolean;
    imageId: [] | [string];
    createdAt: bigint;
}

export interface MenuItemInput {
    name: string;
    description: string;
    category: Category;
    price: number;
    quantity: number;
    imageId: [] | [string];
}

export interface RawMaterialInput {
    name: string;
    unit: Unit;
    quantity: number;
    costPrice: number;
    lowStockThreshold: number;
    supplierName: string;
}

export interface RecipeIngredient {
    materialId: string;
    quantityNeeded: number;
}

export interface OrderItemInput {
    menuItemId: string;
    quantity: number;
}

export interface OrderItem {
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
}

export interface OrderInput {
    items: Array<OrderItemInput>;
    paymentMethod: PaymentMethod;
    createdBy: string;
    customerName: [] | [string];
    customerPhone: [] | [string];
}

export interface OrderFull {
    id: string;
    orderNumber: string;
    items: Array<OrderItem>;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    createdBy: string;
    customerName: [] | [string];
    customerPhone: [] | [string];
    isTransferred: boolean;
    createdAt: bigint;
}

export interface DashboardStats {
    totalOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
    pendingOrdersCount: number;
    lowStockMaterials: Array<RawMaterial>;
    outOfStockItems: Array<MenuItemFull>;
    totalInventoryItems: number;
}

export interface ItemSalesBreakdown {
    menuItemId: string;
    menuItemName: string;
    quantitySold: number;
    revenue: number;
}

export interface SalesReport {
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    itemBreakdown: Array<ItemSalesBreakdown>;
}

export interface backendInterface {
    acceptOrder(id: string): Promise<boolean>;
    addMenuItem(input: MenuItemInput): Promise<string>;
    adjustRawMaterialQuantity(id: string, adjustment: number): Promise<number>;
    completeOrder(id: string): Promise<boolean>;
    createMenuItem(input: MenuItemInput): Promise<string>;
    createRawMaterial(input: RawMaterialInput): Promise<string>;
    deleteMenuItem(id: string): Promise<void>;
    deleteRawMaterial(id: string): Promise<void>;
    editOrderItems(id: string, newItems: Array<OrderItemInput>): Promise<boolean>;
    getDashboardStats(): Promise<DashboardStats>;
    getMenuItem(id: string): Promise<[] | [MenuItemFull]>;
    getOrder(id: string): Promise<[] | [OrderFull]>;
    getOrders(startIndex: bigint, pageSize: bigint): Promise<Array<OrderFull>>;
    getRawMaterial(id: string): Promise<[] | [RawMaterial]>;
    getRecipe(menuItemId: string): Promise<Array<RecipeIngredient>>;
    getSalesReport(startTime: bigint, endTime: bigint): Promise<SalesReport>;
    listActiveOrders(): Promise<Array<OrderFull>>;
    listAllRecipes(): Promise<Array<[string, Array<RecipeIngredient>]>>;
    listLowStockMaterials(): Promise<Array<RawMaterial>>;
    listMenuItems(): Promise<Array<MenuItemFull>>;
    listPendingOrders(): Promise<Array<OrderFull>>;
    listRawMaterials(): Promise<Array<RawMaterial>>;
    placeOrder(input: OrderInput): Promise<string>;
    setRecipe(menuItemId: string, ingredients: Array<RecipeIngredient>): Promise<void>;
    toggleMenuItemAvailability(id: string): Promise<boolean>;
    transferOrder(id: string, targetPos: string): Promise<boolean>;
    updateMenuItem(id: string, input: MenuItemInput): Promise<void>;
    updateRawMaterial(id: string, input: RawMaterialInput): Promise<void>;
}
