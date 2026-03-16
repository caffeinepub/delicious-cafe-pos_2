import Array "mo:base/Array";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor {
  // ---- Types ----
  public type MenuItem = {
    id: Text;
    name: Text;
    description: Text;
    createdAt: Int;
    isAvailable: Bool;
    category: Text;
    imageId: ?Text;
    price: Float;
    quantity: Float;
  };

  public type MenuItemInput = {
    name: Text;
    description: Text;
    category: Text;
    imageId: ?Text;
    price: Float;
    quantity: Float;
  };

  public type RawMaterial = {
    id: Text;
    name: Text;
    unit: Text;
    quantity: Float;
    costPrice: Float;
    lowStockThreshold: Float;
    supplierName: Text;
    createdAt: Int;
  };

  public type RawMaterialInput = {
    name: Text;
    unit: Text;
    quantity: Float;
    costPrice: Float;
    lowStockThreshold: Float;
    supplierName: Text;
  };

  public type RecipeIngredient = {
    materialId: Text;
    quantityNeeded: Float;
  };

  public type OrderItemInput = {
    menuItemId: Text;
    quantity: Nat;
  };

  public type OrderInput = {
    items: [OrderItemInput];
    paymentMethod: Text;
    createdBy: Text;
  };

  public type OrderItem = {
    menuItemId: Text;
    menuItemName: Text;
    quantity: Nat;
    unitPrice: Float;
  };

  public type Order = {
    id: Text;
    orderNumber: Text;
    items: [OrderItem];
    totalAmount: Float;
    paymentMethod: Text;
    status: Text;
    createdBy: Text;
    createdAt: Int;
  };

  public type DashboardStats = {
    totalOrders: Nat;
    totalSales: Float;
    lowStockMaterials: [RawMaterial];
    outOfStockItems: [MenuItem];
    totalInventoryItems: Nat;
  };

  // ---- State ----
  stable var menuItems: [MenuItem] = [];
  stable var rawMaterials: [RawMaterial] = [];
  stable var recipes: [(Text, [RecipeIngredient])] = [];
  stable var orders: [Order] = [];
  stable var nextMenuId: Nat = 1;
  stable var nextMaterialId: Nat = 1;
  stable var nextOrderId: Nat = 1;

  // ---- Menu ----
  public func createMenuItem(input: MenuItemInput): async Text {
    let id = Nat.toText(nextMenuId);
    nextMenuId += 1;
    let item: MenuItem = {
      id;
      name = input.name;
      description = input.description;
      category = input.category;
      imageId = input.imageId;
      price = input.price;
      quantity = input.quantity;
      isAvailable = true;
      createdAt = Time.now();
    };
    menuItems := Array.append(menuItems, [item]);
    id
  };

  public func updateMenuItem(id: Text, input: MenuItemInput): async () {
    menuItems := Array.map<MenuItem, MenuItem>(menuItems, func(item) {
      if (item.id == id) {
        {
          id = item.id;
          name = input.name;
          description = input.description;
          category = input.category;
          imageId = input.imageId;
          price = input.price;
          quantity = input.quantity;
          isAvailable = item.isAvailable;
          createdAt = item.createdAt;
        }
      } else item
    });
  };

  public func deleteMenuItem(id: Text): async () {
    menuItems := Array.filter<MenuItem>(menuItems, func(item) { item.id != id });
  };

  public query func listMenuItems(): async [MenuItem] { menuItems };

  public query func getMenuItem(id: Text): async ?MenuItem {
    Array.find<MenuItem>(menuItems, func(item) { item.id == id })
  };

  public func toggleMenuItemAvailability(id: Text): async Bool {
    var newState = false;
    menuItems := Array.map<MenuItem, MenuItem>(menuItems, func(item) {
      if (item.id == id) {
        newState := not item.isAvailable;
        { id = item.id; name = item.name; description = item.description; category = item.category; imageId = item.imageId; price = item.price; quantity = item.quantity; isAvailable = newState; createdAt = item.createdAt }
      } else item
    });
    newState
  };

  // ---- Inventory ----
  public func createRawMaterial(input: RawMaterialInput): async Text {
    let id = Nat.toText(nextMaterialId);
    nextMaterialId += 1;
    let mat: RawMaterial = {
      id;
      name = input.name;
      unit = input.unit;
      quantity = input.quantity;
      costPrice = input.costPrice;
      lowStockThreshold = input.lowStockThreshold;
      supplierName = input.supplierName;
      createdAt = Time.now();
    };
    rawMaterials := Array.append(rawMaterials, [mat]);
    id
  };

  public func updateRawMaterial(id: Text, input: RawMaterialInput): async () {
    rawMaterials := Array.map<RawMaterial, RawMaterial>(rawMaterials, func(m) {
      if (m.id == id) {
        { id = m.id; name = input.name; unit = input.unit; quantity = input.quantity; costPrice = input.costPrice; lowStockThreshold = input.lowStockThreshold; supplierName = input.supplierName; createdAt = m.createdAt }
      } else m
    });
  };

  public func deleteRawMaterial(id: Text): async () {
    rawMaterials := Array.filter<RawMaterial>(rawMaterials, func(m) { m.id != id });
  };

  public query func listRawMaterials(): async [RawMaterial] { rawMaterials };

  public query func getRawMaterial(id: Text): async ?RawMaterial {
    Array.find<RawMaterial>(rawMaterials, func(m) { m.id == id })
  };

  public func adjustRawMaterialQuantity(id: Text, adjustment: Float): async Float {
    var newQty: Float = 0.0;
    rawMaterials := Array.map<RawMaterial, RawMaterial>(rawMaterials, func(m) {
      if (m.id == id) {
        newQty := m.quantity + adjustment;
        if (newQty < 0.0) newQty := 0.0;
        { id = m.id; name = m.name; unit = m.unit; quantity = newQty; costPrice = m.costPrice; lowStockThreshold = m.lowStockThreshold; supplierName = m.supplierName; createdAt = m.createdAt }
      } else m
    });
    newQty
  };

  public query func listLowStockMaterials(): async [RawMaterial] {
    Array.filter<RawMaterial>(rawMaterials, func(m) { m.quantity <= m.lowStockThreshold })
  };

  // ---- Recipes ----
  public func setRecipe(menuItemId: Text, ingredients: [RecipeIngredient]): async () {
    let filtered = Array.filter<(Text, [RecipeIngredient])>(recipes, func(r) { r.0 != menuItemId });
    recipes := Array.append(filtered, [(menuItemId, ingredients)]);
  };

  public query func getRecipe(menuItemId: Text): async [RecipeIngredient] {
    for ((id, ings) in recipes.vals()) {
      if (id == menuItemId) return ings;
    };
    []
  };

  public query func listAllRecipes(): async [(Text, [RecipeIngredient])] { recipes };

  // ---- Orders ----
  public func placeOrder(input: OrderInput): async Text {
    var orderItems: [OrderItem] = [];
    var totalAmount: Float = 0.0;

    for (cartItem in input.items.vals()) {
      let menuItemOpt = Array.find<MenuItem>(menuItems, func(m) { m.id == cartItem.menuItemId });
      switch (menuItemOpt) {
        case null {};
        case (?menuItem) {
          let oi: OrderItem = {
            menuItemId = cartItem.menuItemId;
            menuItemName = menuItem.name;
            quantity = cartItem.quantity;
            unitPrice = menuItem.price;
          };
          orderItems := Array.append(orderItems, [oi]);
          totalAmount += menuItem.price * Float.fromInt(cartItem.quantity);

          let recipe = do {
            var found: [RecipeIngredient] = [];
            for ((rid, ings) in recipes.vals()) {
              if (rid == cartItem.menuItemId) found := ings;
            };
            found
          };
          for (ing in recipe.vals()) {
            rawMaterials := Array.map<RawMaterial, RawMaterial>(rawMaterials, func(m) {
              if (m.id == ing.materialId) {
                let deduct = ing.quantityNeeded * Float.fromInt(cartItem.quantity);
                let newQty = if (m.quantity > deduct) m.quantity - deduct else 0.0;
                { id = m.id; name = m.name; unit = m.unit; quantity = newQty; costPrice = m.costPrice; lowStockThreshold = m.lowStockThreshold; supplierName = m.supplierName; createdAt = m.createdAt }
              } else m
            });
          };
        };
      };
    };

    let orderId = Nat.toText(nextOrderId);
    let orderNum = "ORD-" # Nat.toText(nextOrderId);
    nextOrderId += 1;
    let order: Order = {
      id = orderId;
      orderNumber = orderNum;
      items = orderItems;
      totalAmount;
      paymentMethod = input.paymentMethod;
      status = "completed";
      createdBy = input.createdBy;
      createdAt = Time.now();
    };
    orders := Array.append(orders, [order]);
    orderId
  };

  public query func getOrders(startIndex: Nat, pageSize: Nat): async [Order] {
    let total = orders.size();
    if (startIndex >= total) return [];
    let end = if (startIndex + pageSize > total) total else startIndex + pageSize;
    let reversed = Array.tabulate<Order>(total, func(i) { orders[total - 1 - i] });
    Array.tabulate<Order>(end - startIndex, func(i) { reversed[startIndex + i] })
  };

  public query func getOrder(id: Text): async ?Order {
    Array.find<Order>(orders, func(o) { o.id == id })
  };

  // ---- Dashboard ----
  public query func getDashboardStats(): async DashboardStats {
    let lowStockMaterials = Array.filter<RawMaterial>(rawMaterials, func(m) {
      m.quantity <= m.lowStockThreshold
    });
    let outOfStockItems = Array.filter<MenuItem>(menuItems, func(item) {
      not item.isAvailable
    });
    var totalSales: Float = 0.0;
    for (order in orders.vals()) {
      totalSales += order.totalAmount;
    };
    {
      totalOrders = orders.size();
      totalSales;
      lowStockMaterials;
      outOfStockItems;
      totalInventoryItems = rawMaterials.size();
    }
  };
}
