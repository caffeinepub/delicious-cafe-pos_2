import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import BlobStorage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";



actor {
  // ---------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------

  public type MenuItem = {
    id : Text;
    name : Text;
    category : Category;
    imageId : ?Text;
    price : Float;
    isAvailable : Bool;
    createdAt : Int;
  };

  public type MenuItemExtra = {
    description : Text;
    quantity : Float;
  };

  public type MenuItemFull = {
    id : Text;
    name : Text;
    description : Text;
    category : Category;
    imageId : ?Text;
    price : Float;
    quantity : Float;
    isAvailable : Bool;
    createdAt : Int;
  };

  public type MenuItemInput = {
    name : Text;
    description : Text;
    category : Category;
    price : Float;
    quantity : Float;
    imageId : ?Text;
  };

  public type RawMaterial = {
    id : Text;
    name : Text;
    quantity : Float;
    unit : Unit;
    costPrice : Float;
    supplierName : Text;
    lowStockThreshold : Float;
    createdAt : Int;
  };

  public type RawMaterialInput = {
    name : Text;
    quantity : Float;
    unit : Unit;
    costPrice : Float;
    supplierName : Text;
    lowStockThreshold : Float;
  };

  public type RecipeIngredient = {
    materialId : Text;
    quantityNeeded : Float;
  };

  // Stored order type -- kept minimal for stable var compatibility
  public type OrderStatusStored = {
    #completed;
  };

  public type OrderStatus = {
    #pending;
    #accepted;
    #completed;
  };

  // Order stored type -- must remain backward-compatible with stable storage
  public type Order = {
    id : Text;
    orderNumber : Text;
    items : [OrderItem];
    totalAmount : Float;
    paymentMethod : PaymentMethod;
    status : OrderStatusStored;
    createdAt : Int;
    createdBy : Text;
  };

  // Full API type returned to frontend -- includes extra fields from side maps
  public type OrderFull = {
    id : Text;
    orderNumber : Text;
    items : [OrderItem];
    totalAmount : Float;
    paymentMethod : PaymentMethod;
    status : OrderStatus;
    createdAt : Int;
    createdBy : Text;
    customerName : ?Text;
    customerPhone : ?Text;
    isTransferred : Bool;
    transferredTo : ?Text;
  };

  public type OrderItem = {
    menuItemId : Text;
    menuItemName : Text;
    quantity : Float;
    unitPrice : Float;
  };

  public type SalesReportItem = {
    menuItemId : Text;
    menuItemName : Text;
    quantitySold : Float;
    totalRevenue : Float;
  };

  public type SalesReport = {
    startTime : Int;
    endTime : Int;
    totalRevenue : Float;
    totalOrders : Int;
    itemBreakdown : [SalesReportItem];
  };

  public type Category = {
    #beverages;
    #food;
    #snacks;
    #desserts;
    #other;
  };

  public type Unit = {
    #kg;
    #gram;
    #liter;
    #ml;
    #piece;
  };

  public type PaymentMethod = {
    #cash;
    #upi;
  };

  public type UserProfile = {
    id : Text;
    email : Text;
    name : Text;
    createdAt : Int;
    isActive : Bool;
  };

  public type OrderInput = {
    items : [OrderItemInput];
    paymentMethod : PaymentMethod;
    createdBy : Text;
    customerName : ?Text;
    customerPhone : ?Text;
  };

  public type OrderItemInput = {
    menuItemId : Text;
    quantity : Float;
  };

  public type DashboardStats = {
    totalSales : Float;
    totalOrders : Int;
    totalInventoryItems : Int;
    lowStockMaterials : [RawMaterial];
    outOfStockItems : [MenuItemFull];
    pendingOrdersCount : Int;
    todaySales : Float;
    todayOrders : Int;
  };

  // ---------------------------------------------------------------
  // Component storage
  // ---------------------------------------------------------------
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // ---------------------------------------------------------------
  // Persistent storage
  // ---------------------------------------------------------------
  let menuItems      = Map.empty<Text, MenuItem>();
  let menuItemExtras = Map.empty<Text, MenuItemExtra>();
  let rawMaterials   = Map.empty<Text, RawMaterial>();
  let recipes        = Map.empty<Text, [RecipeIngredient]>();
  let orders         = Map.empty<Text, Order>();

  // Kitchen/transfer status maps (separate from Order to avoid compat issues)
  let orderKitchenStatus   = Map.empty<Text, Text>();  // "pending" | "accepted"
  let orderCustomerNames   = Map.empty<Text, Text>();
  let orderCustomerPhones  = Map.empty<Text, Text>();
  let orderTransferredTo   = Map.empty<Text, Text>();  // target POS name

  // Kept for stable var backward compatibility (was present in previous version)
  stable var seedInitializedExt : Bool = false;
  let userProfiles = Map.empty<Principal, UserProfile>();

  var orderCounter : Int = 0;

  func generateId(prefix : Text) : Text {
    prefix # "_" # Time.now().toText();
  };

  func toFull(item : MenuItem) : MenuItemFull {
    let extra = switch (menuItemExtras.get(item.id)) {
      case (?e) { e };
      case (null) { { description = ""; quantity = 0.0 } };
    };
    {
      id          = item.id;
      name        = item.name;
      description = extra.description;
      category    = item.category;
      imageId     = item.imageId;
      price       = item.price;
      quantity    = extra.quantity;
      isAvailable = item.isAvailable;
      createdAt   = item.createdAt;
    };
  };

  func toOrderFull(order : Order) : OrderFull {
    let status : OrderStatus = switch (orderKitchenStatus.get(order.id)) {
      case (?"pending")  { #pending };
      case (?"accepted") { #accepted };
      case (_)           { #completed };
    };
    let transferredTo = orderTransferredTo.get(order.id);
    {
      id            = order.id;
      orderNumber   = order.orderNumber;
      items         = order.items;
      totalAmount   = order.totalAmount;
      paymentMethod = order.paymentMethod;
      status;
      createdAt     = order.createdAt;
      createdBy     = order.createdBy;
      customerName  = orderCustomerNames.get(order.id);
      customerPhone = orderCustomerPhones.get(order.id);
      isTransferred = switch (transferredTo) { case (null) { false }; case (_) { true } };
      transferredTo;
    };
  };

  // ---------------------------------------------------------------
  // Menu Item CRUD (No auth required -- staff-only app)
  // ---------------------------------------------------------------
  public shared func createMenuItem(input : MenuItemInput) : async Text {
    let id = generateId("menuItem");
    let item : MenuItem = {
      id;
      name        = input.name;
      category    = input.category;
      price       = input.price;
      imageId     = input.imageId;
      isAvailable = true;
      createdAt   = Time.now();
    };
    menuItems.add(id, item);
    menuItemExtras.add(id, { description = input.description; quantity = input.quantity });
    id;
  };

  public query func getMenuItem(id : Text) : async ?MenuItemFull {
    switch (menuItems.get(id)) {
      case (null) { null };
      case (?item) { ?toFull(item) };
    };
  };

  public shared func updateMenuItem(id : Text, input : MenuItemInput) : async () {
    switch (menuItems.get(id)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (?existing) {
        let updated : MenuItem = {
          id          = existing.id;
          name        = input.name;
          category    = input.category;
          price       = input.price;
          imageId     = input.imageId;
          isAvailable = existing.isAvailable;
          createdAt   = existing.createdAt;
        };
        menuItems.add(id, updated);
        menuItemExtras.add(id, { description = input.description; quantity = input.quantity });
      };
    };
  };

  public shared func deleteMenuItem(id : Text) : async () {
    if (not menuItems.containsKey(id)) {
      Runtime.trap("Menu item not found");
    };
    menuItems.remove(id);
    menuItemExtras.remove(id);
  };

  public shared func toggleMenuItemAvailability(id : Text) : async Bool {
    switch (menuItems.get(id)) {
      case (null) { Runtime.trap("Menu item not found") };
      case (?item) {
        let updated : MenuItem = {
          id          = item.id;
          name        = item.name;
          category    = item.category;
          price       = item.price;
          imageId     = item.imageId;
          isAvailable = not item.isAvailable;
          createdAt   = item.createdAt;
        };
        menuItems.add(id, updated);
        updated.isAvailable;
      };
    };
  };

  public query func listMenuItems() : async [MenuItemFull] {
    menuItems.values().toArray().map(toFull);
  };

  // ---------------------------------------------------------------
  // Raw Material CRUD (No auth required)
  // ---------------------------------------------------------------
  public shared func createRawMaterial(input : RawMaterialInput) : async Text {
    let id = generateId("rawMaterial");
    let material : RawMaterial = {
      id;
      name              = input.name;
      quantity          = input.quantity;
      unit              = input.unit;
      costPrice         = input.costPrice;
      supplierName      = input.supplierName;
      lowStockThreshold = input.lowStockThreshold;
      createdAt         = Time.now();
    };
    rawMaterials.add(id, material);
    id;
  };

  public query func getRawMaterial(id : Text) : async ?RawMaterial {
    rawMaterials.get(id);
  };

  public shared func updateRawMaterial(id : Text, input : RawMaterialInput) : async () {
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?existing) {
        let updated : RawMaterial = {
          id                = existing.id;
          name              = input.name;
          quantity          = input.quantity;
          unit              = input.unit;
          costPrice         = input.costPrice;
          supplierName      = input.supplierName;
          lowStockThreshold = input.lowStockThreshold;
          createdAt         = existing.createdAt;
        };
        rawMaterials.add(id, updated);
      };
    };
  };

  public shared func deleteRawMaterial(id : Text) : async () {
    if (not rawMaterials.containsKey(id)) {
      Runtime.trap("Raw material not found");
    };
    rawMaterials.remove(id);
  };

  public shared func adjustRawMaterialQuantity(id : Text, adjustment : Float) : async Float {
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material not found") };
      case (?material) {
        let newQuantity = material.quantity + adjustment;
        let updated : RawMaterial = {
          id                = material.id;
          name              = material.name;
          quantity          = newQuantity;
          unit              = material.unit;
          costPrice         = material.costPrice;
          supplierName      = material.supplierName;
          lowStockThreshold = material.lowStockThreshold;
          createdAt         = material.createdAt;
        };
        rawMaterials.add(id, updated);
        newQuantity;
      };
    };
  };

  public query func listRawMaterials() : async [RawMaterial] {
    rawMaterials.values().toArray();
  };

  public query func listLowStockMaterials() : async [RawMaterial] {
    rawMaterials.values().toArray().filter(
      func(rm) { rm.quantity <= rm.lowStockThreshold }
    );
  };

  // ---------------------------------------------------------------
  // Recipe Management (No auth required)
  // ---------------------------------------------------------------
  public shared func setRecipe(menuItemId : Text, ingredients : [RecipeIngredient]) : async () {
    if (not menuItems.containsKey(menuItemId)) {
      Runtime.trap("Menu item not found");
    };
    recipes.add(menuItemId, ingredients);
  };

  public query func getRecipe(menuItemId : Text) : async [RecipeIngredient] {
    switch (recipes.get(menuItemId)) {
      case (null)         { [] };
      case (?ingredients) { ingredients };
    };
  };

  public query func listAllRecipes() : async [(Text, [RecipeIngredient])] {
    recipes.toArray();
  };

  // ---------------------------------------------------------------
  // Order Placement (No auth required)
  // ---------------------------------------------------------------
  public shared func placeOrder(input : OrderInput) : async Text {
    let orderId           = generateId("order");
    let orderItemsBuilder = List.empty<OrderItem>();
    var totalAmount : Float = 0.0;

    for (itemInput in input.items.values()) {
      switch (menuItems.get(itemInput.menuItemId)) {
        case (null)     { Runtime.trap("Menu item not found") };
        case (?menuItem) {
          if (not menuItem.isAvailable) {
            Runtime.trap("Menu item not available");
          };
          switch (recipes.get(menuItem.id)) {
            case (null) {};
            case (?ingredients) {
              for (ingredient in ingredients.values()) {
                switch (rawMaterials.get(ingredient.materialId)) {
                  case (null) {};
                  case (?material) {
                    if (material.quantity < ingredient.quantityNeeded * itemInput.quantity) {
                      Runtime.trap("Insufficient raw material for: " # menuItem.name);
                    };
                  };
                };
              };
            };
          };
          let orderItem : OrderItem = {
            menuItemId   = itemInput.menuItemId;
            menuItemName = menuItem.name;
            quantity     = itemInput.quantity;
            unitPrice    = menuItem.price;
          };
          totalAmount += menuItem.price * itemInput.quantity;
          orderItemsBuilder.add(orderItem);
        };
      };
    };

    // Deduct inventory
    for (item in input.items.values()) {
      switch (recipes.get(item.menuItemId)) {
        case (null) {};
        case (?ingredients) {
          for (ingredient in ingredients.values()) {
            switch (rawMaterials.get(ingredient.materialId)) {
              case (null) {};
              case (?material) {
                let newQty = material.quantity - (ingredient.quantityNeeded * item.quantity);
                rawMaterials.add(ingredient.materialId, {
                  id                = material.id;
                  name              = material.name;
                  quantity          = newQty;
                  unit              = material.unit;
                  costPrice         = material.costPrice;
                  supplierName      = material.supplierName;
                  lowStockThreshold = material.lowStockThreshold;
                  createdAt         = material.createdAt;
                });
              };
            };
          };
        };
      };
    };

    orderCounter += 1;
    let order : Order = {
      id            = orderId;
      orderNumber   = "DC" # orderCounter.toText();
      items         = orderItemsBuilder.toArray();
      totalAmount;
      paymentMethod = input.paymentMethod;
      status        = #completed;
      createdAt     = Time.now();
      createdBy     = input.createdBy;
    };
    orders.add(orderId, order);
    orderKitchenStatus.add(orderId, "pending");
    switch (input.customerName) {
      case (?n) { orderCustomerNames.add(orderId, n) };
      case (null) {};
    };
    switch (input.customerPhone) {
      case (?p) { orderCustomerPhones.add(orderId, p) };
      case (null) {};
    };
    orderId;
  };

  public shared func transferOrder(id : Text, targetPos : Text) : async Bool {
    if (not orders.containsKey(id)) { return false };
    orderTransferredTo.add(id, targetPos);
    orderKitchenStatus.add(id, "pending");
    true;
  };

  public shared func acceptOrder(id : Text) : async () {
    if (not orders.containsKey(id)) {
      Runtime.trap("Order not found");
    };
    orderKitchenStatus.add(id, "accepted");
  };

  public shared func completeOrder(id : Text) : async () {
    if (not orders.containsKey(id)) {
      Runtime.trap("Order not found");
    };
    orderKitchenStatus.remove(id);
  };

  public shared func editOrderItems(id : Text, newItems : [OrderItemInput]) : async Float {
    switch (orders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let orderItemsBuilder = List.empty<OrderItem>();
        var totalAmount : Float = 0.0;
        for (itemInput in newItems.values()) {
          switch (menuItems.get(itemInput.menuItemId)) {
            case (null) { Runtime.trap("Menu item not found") };
            case (?menuItem) {
              let orderItem : OrderItem = {
                menuItemId   = itemInput.menuItemId;
                menuItemName = menuItem.name;
                quantity     = itemInput.quantity;
                unitPrice    = menuItem.price;
              };
              totalAmount += menuItem.price * itemInput.quantity;
              orderItemsBuilder.add(orderItem);
            };
          };
        };
        let updated : Order = {
          id            = order.id;
          orderNumber   = order.orderNumber;
          items         = orderItemsBuilder.toArray();
          totalAmount;
          paymentMethod = order.paymentMethod;
          status        = order.status;
          createdAt     = order.createdAt;
          createdBy     = order.createdBy;
        };
        orders.add(id, updated);
        totalAmount;
      };
    };
  };

  public query func getOrder(id : Text) : async ?OrderFull {
    switch (orders.get(id)) {
      case (null) { null };
      case (?order) { ?toOrderFull(order) };
    };
  };

  public query func getOrders(startIndex : Int, pageSize : Int) : async [OrderFull] {
    let allOrders = orders.values().toArray();
    if (startIndex >= allOrders.size()) { return [] };
    let endIndex = Int.min(allOrders.size(), startIndex + pageSize);
    allOrders.sliceToArray(startIndex, endIndex).map(toOrderFull);
  };

  public query func listPendingOrders() : async [OrderFull] {
    orders.values().toArray()
      .filter(func(o) {
        switch (orderKitchenStatus.get(o.id)) {
          case (?"pending") { true };
          case (_)          { false };
        };
      })
      .map(toOrderFull);
  };

  public query func listActiveOrders() : async [OrderFull] {
    orders.values().toArray()
      .filter(func(o) {
        switch (orderKitchenStatus.get(o.id)) {
          case (?"pending")  { true };
          case (?"accepted") { true };
          case (_)           { false };
        };
      })
      .map(toOrderFull);
  };

  // ---------------------------------------------------------------
  // Sales Report
  // ---------------------------------------------------------------
  public query func getSalesReport(startTime : Int, endTime : Int) : async SalesReport {
    let completedOrders = orders.values().toArray().filter(
      func(o) {
        let isCompleted = switch (orderKitchenStatus.get(o.id)) {
          case (null) { true };
          case (_)    { false };
        };
        isCompleted and o.createdAt >= startTime and o.createdAt <= endTime;
      }
    );

    var totalRevenue : Float = 0.0;
    let itemMap = Map.empty<Text, SalesReportItem>();

    for (order in completedOrders.values()) {
      totalRevenue += order.totalAmount;
      for (item in order.items.values()) {
        switch (itemMap.get(item.menuItemId)) {
          case (null) {
            itemMap.add(item.menuItemId, {
              menuItemId   = item.menuItemId;
              menuItemName = item.menuItemName;
              quantitySold = item.quantity;
              totalRevenue = item.unitPrice * item.quantity;
            });
          };
          case (?existing) {
            itemMap.add(item.menuItemId, {
              menuItemId   = existing.menuItemId;
              menuItemName = existing.menuItemName;
              quantitySold = existing.quantitySold + item.quantity;
              totalRevenue = existing.totalRevenue + (item.unitPrice * item.quantity);
            });
          };
        };
      };
    };

    {
      startTime;
      endTime;
      totalRevenue;
      totalOrders = completedOrders.size();
      itemBreakdown = itemMap.values().toArray();
    };
  };

  // ---------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------
  public query func getDashboardStats() : async DashboardStats {
    let allOrders = orders.values().toArray();
    var totalSales : Float = 0.0;
    var todaySales : Float = 0.0;
    var todayOrders : Int = 0;
    let nowNs = Time.now();
    let oneDayNs : Int = 86_400_000_000_000;
    let startOfDay = nowNs - (nowNs % oneDayNs);
    var pendingCount : Int = 0;

    for (o in allOrders.values()) {
      let isCompleted = switch (orderKitchenStatus.get(o.id)) {
        case (null) { true };
        case (_)    { false };
      };
      let isPending = switch (orderKitchenStatus.get(o.id)) {
        case (?"pending") { true };
        case (_)          { false };
      };
      if (isPending) { pendingCount += 1 };
      if (isCompleted) {
        totalSales += o.totalAmount;
        if (o.createdAt >= startOfDay) {
          todaySales  += o.totalAmount;
          todayOrders += 1;
        };
      };
    };

    let lowStockMaterials = rawMaterials.values().toArray().filter(
      func(rm) { rm.quantity <= rm.lowStockThreshold }
    );

    let outOfStockBuilder = List.empty<MenuItemFull>();
    for (item in menuItems.values().toArray().values()) {
      switch (recipes.get(item.id)) {
        case (null) {};
        case (?ingredients) {
          var isOutOfStock = false;
          for (ingredient in ingredients.values()) {
            switch (rawMaterials.get(ingredient.materialId)) {
              case (null) {};
              case (?material) {
                if (material.quantity < ingredient.quantityNeeded) {
                  isOutOfStock := true;
                };
              };
            };
          };
          if (isOutOfStock) { outOfStockBuilder.add(toFull(item)) };
        };
      };
    };

    {
      totalSales;
      totalOrders        = allOrders.size();
      totalInventoryItems = rawMaterials.size();
      lowStockMaterials;
      outOfStockItems    = outOfStockBuilder.toArray();
      pendingOrdersCount = pendingCount;
      todaySales;
      todayOrders;
    };
  };
};
