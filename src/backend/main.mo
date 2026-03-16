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

  // Stored order type -- ONLY #completed variant (backward compatible)
  // Do NOT add variants here; use orderKitchenStatus for pending/accepted tracking
  public type OrderStatusStored = {
    #completed;
  };

  // Public API status type -- includes all statuses
  public type OrderStatus = {
    #pending;
    #accepted;
    #completed;
  };

  // Stored shape -- status only has #completed to preserve stable var compatibility
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

  // API shape returned to frontend -- has full OrderStatus
  public type OrderFull = {
    id : Text;
    orderNumber : Text;
    items : [OrderItem];
    totalAmount : Float;
    paymentMethod : PaymentMethod;
    status : OrderStatus;
    createdAt : Int;
    createdBy : Text;
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

  // Kitchen status tracking (separate from stored Order to avoid type compat issues)
  // "pending" or "accepted" -- if not present, order is completed
  let orderKitchenStatus = Map.empty<Text, Text>();

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

  // Convert stored Order to OrderFull using kitchen status map
  func toOrderFull(order : Order) : OrderFull {
    let status : OrderStatus = switch (orderKitchenStatus.get(order.id)) {
      case (?"pending")  { #pending };
      case (?"accepted") { #accepted };
      case (_)           { #completed };
    };
    {
      id            = order.id;
      orderNumber   = order.orderNumber;
      items         = order.items;
      totalAmount   = order.totalAmount;
      paymentMethod = order.paymentMethod;
      status;
      createdAt     = order.createdAt;
      createdBy     = order.createdBy;
    };
  };

  // ---------------------------------------------------------------
  // User Profile Management
  // ---------------------------------------------------------------
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ---------------------------------------------------------------
  // Menu Item CRUD (Admin-only)
  // ---------------------------------------------------------------
  public shared ({ caller }) func createMenuItem(input : MenuItemInput) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create menu items");
    };
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

  public query ({ caller }) func getMenuItem(id : Text) : async ?MenuItemFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view menu items");
    };
    switch (menuItems.get(id)) {
      case (null) { null };
      case (?item) { ?toFull(item) };
    };
  };

  public shared ({ caller }) func updateMenuItem(id : Text, input : MenuItemInput) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update menu items");
    };
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

  public shared ({ caller }) func deleteMenuItem(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete menu items");
    };
    if (not menuItems.containsKey(id)) {
      Runtime.trap("Menu item not found");
    };
    menuItems.remove(id);
    menuItemExtras.remove(id);
  };

  public shared ({ caller }) func toggleMenuItemAvailability(id : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can toggle menu item availability");
    };
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

  public query ({ caller }) func listMenuItems() : async [MenuItemFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list menu items");
    };
    menuItems.values().toArray().map(toFull);
  };

  // ---------------------------------------------------------------
  // Raw Material CRUD (Admin-only)
  // ---------------------------------------------------------------
  public shared ({ caller }) func createRawMaterial(input : RawMaterialInput) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create raw materials");
    };
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

  public query ({ caller }) func getRawMaterial(id : Text) : async ?RawMaterial {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view raw materials");
    };
    rawMaterials.get(id);
  };

  public shared ({ caller }) func updateRawMaterial(id : Text, input : RawMaterialInput) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update raw materials");
    };
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

  public shared ({ caller }) func deleteRawMaterial(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete raw materials");
    };
    if (not rawMaterials.containsKey(id)) {
      Runtime.trap("Raw material not found");
    };
    rawMaterials.remove(id);
  };

  public shared ({ caller }) func adjustRawMaterialQuantity(id : Text, adjustment : Float) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can adjust raw material quantities");
    };
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

  public query ({ caller }) func listRawMaterials() : async [RawMaterial] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list raw materials");
    };
    rawMaterials.values().toArray();
  };

  public query ({ caller }) func listLowStockMaterials() : async [RawMaterial] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view low stock materials");
    };
    rawMaterials.values().toArray().filter(
      func(rm) { rm.quantity <= rm.lowStockThreshold }
    );
  };

  // ---------------------------------------------------------------
  // Recipe Management (Admin-only)
  // ---------------------------------------------------------------
  public shared ({ caller }) func setRecipe(menuItemId : Text, ingredients : [RecipeIngredient]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set recipes");
    };
    if (not menuItems.containsKey(menuItemId)) {
      Runtime.trap("Menu item not found");
    };
    recipes.add(menuItemId, ingredients);
  };

  public query ({ caller }) func getRecipe(menuItemId : Text) : async [RecipeIngredient] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view recipes");
    };
    switch (recipes.get(menuItemId)) {
      case (null)         { [] };
      case (?ingredients) { ingredients };
    };
  };

  public query ({ caller }) func listAllRecipes() : async [(Text, [RecipeIngredient])] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list recipes");
    };
    recipes.toArray();
  };

  // ---------------------------------------------------------------
  // Order Placement (User-level)
  // ---------------------------------------------------------------
  public shared ({ caller }) func placeOrder(input : OrderInput) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };
    let orderId          = generateId("order");
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
      status        = #completed;  // stored status always #completed
      createdAt     = Time.now();
      createdBy     = input.createdBy;
    };
    orders.add(orderId, order);
    // Track as pending in kitchen status map
    orderKitchenStatus.add(orderId, "pending");
    orderId;
  };

  public shared ({ caller }) func acceptOrder(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept orders");
    };
    if (not orders.containsKey(id)) {
      Runtime.trap("Order not found");
    };
    orderKitchenStatus.add(id, "accepted");
  };

  public shared ({ caller }) func completeOrder(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can complete orders");
    };
    if (not orders.containsKey(id)) {
      Runtime.trap("Order not found");
    };
    orderKitchenStatus.remove(id);  // removing = completed
  };

  public shared ({ caller }) func editOrderItems(id : Text, newItems : [OrderItemInput]) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit orders");
    };
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

  public query ({ caller }) func getOrder(id : Text) : async ?OrderFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    switch (orders.get(id)) {
      case (null) { null };
      case (?order) { ?toOrderFull(order) };
    };
  };

  public query ({ caller }) func getOrders(startIndex : Int, pageSize : Int) : async [OrderFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    let allOrders = orders.values().toArray();
    if (startIndex >= allOrders.size()) { return [] };
    let endIndex = Int.min(allOrders.size(), startIndex + pageSize);
    allOrders.sliceToArray(startIndex, endIndex).map(toOrderFull);
  };

  public query ({ caller }) func listPendingOrders() : async [OrderFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view pending orders");
    };
    orders.values().toArray()
      .filter(func(o) {
        switch (orderKitchenStatus.get(o.id)) {
          case (?"pending") { true };
          case (_)          { false };
        };
      })
      .map(toOrderFull);
  };

  public query ({ caller }) func listActiveOrders() : async [OrderFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active orders");
    };
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
  // Sales Report (User-level)
  // ---------------------------------------------------------------
  public query ({ caller }) func getSalesReport(startTime : Int, endTime : Int) : async SalesReport {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales reports");
    };
    // Include completed orders (not in kitchen status) in the date range
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
  // Dashboard (User-level)
  // ---------------------------------------------------------------
  public query ({ caller }) func getDashboardStats() : async DashboardStats {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view dashboard stats");
    };
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
