import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export interface SalesReportItem {
    menuItemName: string;
    quantitySold: number;
    totalRevenue: number;
    menuItemId: string;
}
export interface OrderItem {
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    menuItemId: string;
}
export interface OrderItemInput {
    quantity: number;
    menuItemId: string;
}
export interface OrderInput {
    paymentMethod: PaymentMethod;
    createdBy: string;
    items: Array<OrderItemInput>;
}
export interface DashboardStats {
    totalOrders: bigint;
    todaySales: number;
    totalSales: number;
    pendingOrdersCount: bigint;
    lowStockMaterials: Array<RawMaterial>;
    outOfStockItems: Array<MenuItemFull>;
    totalInventoryItems: bigint;
    todayOrders: bigint;
}
export interface MenuItemInput {
    name: string;
    description: string;
    quantity: number;
    category: Category;
    imageId?: string;
    price: number;
}
export interface RecipeIngredient {
    materialId: string;
    quantityNeeded: number;
}
export interface RawMaterialInput {
    lowStockThreshold: number;
    supplierName: string;
    name: string;
    unit: Unit;
    quantity: number;
    costPrice: number;
}
export interface OrderFull {
    id: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    createdAt: bigint;
    createdBy: string;
    totalAmount: number;
    items: Array<OrderItem>;
    orderNumber: string;
}
export interface SalesReport {
    startTime: bigint;
    itemBreakdown: Array<SalesReportItem>;
    totalOrders: bigint;
    endTime: bigint;
    totalRevenue: number;
}
export interface MenuItemFull {
    id: string;
    name: string;
    createdAt: bigint;
    isAvailable: boolean;
    description: string;
    quantity: number;
    category: Category;
    imageId?: string;
    price: number;
}
export interface UserProfile {
    id: string;
    name: string;
    createdAt: bigint;
    isActive: boolean;
    email: string;
}
export enum Category {
    desserts = "desserts",
    other = "other",
    food = "food",
    snacks = "snacks",
    beverages = "beverages"
}
export enum OrderStatus {
    pending = "pending",
    completed = "completed",
    accepted = "accepted"
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptOrder(id: string): Promise<void>;
    adjustRawMaterialQuantity(id: string, adjustment: number): Promise<number>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completeOrder(id: string): Promise<void>;
    createMenuItem(input: MenuItemInput): Promise<string>;
    createRawMaterial(input: RawMaterialInput): Promise<string>;
    deleteMenuItem(id: string): Promise<void>;
    deleteRawMaterial(id: string): Promise<void>;
    editOrderItems(id: string, newItems: Array<OrderItemInput>): Promise<number>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardStats(): Promise<DashboardStats>;
    getMenuItem(id: string): Promise<MenuItemFull | null>;
    getOrder(id: string): Promise<OrderFull | null>;
    getOrders(startIndex: bigint, pageSize: bigint): Promise<Array<OrderFull>>;
    getRawMaterial(id: string): Promise<RawMaterial | null>;
    getRecipe(menuItemId: string): Promise<Array<RecipeIngredient>>;
    getSalesReport(startTime: bigint, endTime: bigint): Promise<SalesReport>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listActiveOrders(): Promise<Array<OrderFull>>;
    listAllRecipes(): Promise<Array<[string, Array<RecipeIngredient>]>>;
    listLowStockMaterials(): Promise<Array<RawMaterial>>;
    listMenuItems(): Promise<Array<MenuItemFull>>;
    listPendingOrders(): Promise<Array<OrderFull>>;
    listRawMaterials(): Promise<Array<RawMaterial>>;
    placeOrder(input: OrderInput): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setRecipe(menuItemId: string, ingredients: Array<RecipeIngredient>): Promise<void>;
    toggleMenuItemAvailability(id: string): Promise<boolean>;
    updateMenuItem(id: string, input: MenuItemInput): Promise<void>;
    updateRawMaterial(id: string, input: RawMaterialInput): Promise<void>;
}
