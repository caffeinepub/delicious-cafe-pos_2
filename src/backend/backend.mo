import Array "mo:base/Array";
import Float "mo:base/Float";
import Int "mo:base/Int";
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
    customerName: ?Text;
    customerPhone: ?Text;
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
    customerName: ?Text;
    customerPhone: ?Text;
    isTransferred: Bool;
    createdAt: Int;
  };

  public type DashboardStats = {
    totalOrders: Nat;
    todayOrders: Nat;
    totalSales: Float;
    todaySales: Float;
    pendingOrdersCount: Nat;
    lowStockMaterials: [RawMaterial];
    outOfStockItems: [MenuItem];
    totalInventoryItems: Nat;
  };

  public type ItemSalesBreakdown = {
    menuItemId: Text;
    menuItemName: Text;
    quantitySold: Nat;
    revenue: Float;
  };

  public type SalesReport = {
    totalOrders: Nat;
    totalRevenue: Float;
    totalProfit: Float;
    itemBreakdown: [ItemSalesBreakdown];
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

  public func addMenuItem(input: MenuItemInput): async Text {
    await createMenuItem(input)
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

  public query func getMenuItems(): async [MenuItem] { menuItems };

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
      status = "pending";
      createdBy = input.createdBy;
      customerName = input.customerName;
      customerPhone = input.customerPhone;
      isTransferred = false;
      createdAt = Time.now();
    };
    orders := Array.append(orders, [order]);
    orderId
  };

  public func acceptOrder(id: Text): async Bool {
    var found = false;
    orders := Array.map<Order, Order>(orders, func(o) {
      if (o.id == id) {
        found := true;
        { id = o.id; orderNumber = o.orderNumber; items = o.items; totalAmount = o.totalAmount; paymentMethod = o.paymentMethod; status = "accepted"; createdBy = o.createdBy; customerName = o.customerName; customerPhone = o.customerPhone; isTransferred = o.isTransferred; createdAt = o.createdAt }
      } else o
    });
    found
  };

  public func completeOrder(id: Text): async Bool {
    var found = false;
    orders := Array.map<Order, Order>(orders, func(o) {
      if (o.id == id) {
        found := true;
        { id = o.id; orderNumber = o.orderNumber; items = o.items; totalAmount = o.totalAmount; paymentMethod = o.paymentMethod; status = "completed"; createdBy = o.createdBy; customerName = o.customerName; customerPhone = o.customerPhone; isTransferred = o.isTransferred; createdAt = o.createdAt }
      } else o
    });
    found
  };

  public query func listActiveOrders(): async [Order] {
    let active = Array.filter<Order>(orders, func(o) {
      o.status == "pending" or o.status == "accepted"
    });
    let n = active.size();
    Array.tabulate<Order>(n, func(i) { active[n - 1 - i] })
  };

  public func editOrderItems(id: Text, items: [OrderItemInput]): async Bool {
    var found = false;
    orders := Array.map<Order, Order>(orders, func(o) {
      if (o.id == id) {
        found := true;
        var newItems: [OrderItem] = [];
        var newTotal: Float = 0.0;
        for (inp in items.vals()) {
          let menuItemOpt = Array.find<MenuItem>(menuItems, func(m) { m.id == inp.menuItemId });
          switch (menuItemOpt) {
            case null {
              // keep existing item info if menu item not found
              let existingOpt = Array.find<OrderItem>(o.items, func(it) { it.menuItemId == inp.menuItemId });
              switch (existingOpt) {
                case null {};
                case (?existing) {
                  let ni: OrderItem = { menuItemId = existing.menuItemId; menuItemName = existing.menuItemName; quantity = inp.quantity; unitPrice = existing.unitPrice };
                  newItems := Array.append(newItems, [ni]);
                  newTotal += existing.unitPrice * Float.fromInt(inp.quantity);
                };
              };
            };
            case (?mi) {
              let ni: OrderItem = { menuItemId = inp.menuItemId; menuItemName = mi.name; quantity = inp.quantity; unitPrice = mi.price };
              newItems := Array.append(newItems, [ni]);
              newTotal += mi.price * Float.fromInt(inp.quantity);
            };
          };
        };
        { id = o.id; orderNumber = o.orderNumber; items = newItems; totalAmount = newTotal; paymentMethod = o.paymentMethod; status = o.status; createdBy = o.createdBy; customerName = o.customerName; customerPhone = o.customerPhone; isTransferred = o.isTransferred; createdAt = o.createdAt }
      } else o
    });
    found
  };

  public func transferOrder(id: Text, targetPos: Text): async Bool {
    var found = false;
    orders := Array.map<Order, Order>(orders, func(o) {
      if (o.id == id) {
        found := true;
        { id = o.id; orderNumber = o.orderNumber; items = o.items; totalAmount = o.totalAmount; paymentMethod = o.paymentMethod; status = o.status; createdBy = targetPos; customerName = o.customerName; customerPhone = o.customerPhone; isTransferred = true; createdAt = o.createdAt }
      } else o
    });
    found
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

  public query func getSalesReport(startTime: Int, endTime: Int): async SalesReport {
    let filtered = Array.filter<Order>(orders, func(o) {
      o.createdAt >= startTime and o.createdAt <= endTime and o.status == "completed"
    });
    var totalRevenue: Float = 0.0;
    var breakdown: [ItemSalesBreakdown] = [];
    for (order in filtered.vals()) {
      totalRevenue += order.totalAmount;
      for (item in order.items.vals()) {
        var updated = false;
        breakdown := Array.map<ItemSalesBreakdown, ItemSalesBreakdown>(breakdown, func(b) {
          if (b.menuItemId == item.menuItemId) {
            updated := true;
            { menuItemId = b.menuItemId; menuItemName = b.menuItemName; quantitySold = b.quantitySold + item.quantity; revenue = b.revenue + item.unitPrice * Float.fromInt(item.quantity) }
          } else b
        });
        if (not updated) {
          let nb: ItemSalesBreakdown = { menuItemId = item.menuItemId; menuItemName = item.menuItemName; quantitySold = item.quantity; revenue = item.unitPrice * Float.fromInt(item.quantity) };
          breakdown := Array.append(breakdown, [nb]);
        };
      };
    };
    { totalOrders = filtered.size(); totalRevenue; totalProfit = totalRevenue; itemBreakdown = breakdown }
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
    var todaySales: Float = 0.0;
    var todayOrders: Nat = 0;
    var pendingOrdersCount: Nat = 0;
    let oneDayNs: Int = 86_400_000_000_000;
    let now = Time.now();
    let todayStart = now - oneDayNs;
    for (order in orders.vals()) {
      if (order.status == "completed") {
        totalSales += order.totalAmount;
        if (order.createdAt >= todayStart) {
          todaySales += order.totalAmount;
          todayOrders += 1;
        };
      };
      if (order.status == "pending") pendingOrdersCount += 1;
    };
    {
      totalOrders = orders.size();
      todayOrders;
      totalSales;
      todaySales;
      pendingOrdersCount;
      lowStockMaterials;
      outOfStockItems;
      totalInventoryItems = rawMaterials.size();
    }
  };
}
