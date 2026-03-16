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

  // Base MenuItem -- same shape as the originally-deployed stable var
  // (do NOT add fields here; new fields go in MenuItemExtra)
  public type MenuItem = {
    id : Text;
    name : Text;
    category : Category;
    imageId : ?Text;
    price : Float;
    isAvailable : Bool;
    createdAt : Int;
  };

  // Extra fields added after v1 -- stored in a separate map
  public type MenuItemExtra = {
    description : Text;
    quantity : Float;
  };

  // Combined shape returned to the frontend
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

  public type Order = {
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

  public type OrderStatus = {
    #completed;
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
  };

  // ---------------------------------------------------------------
  // Component storage (kept to preserve stable var compatibility)
  // ---------------------------------------------------------------
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // ---------------------------------------------------------------
  // Persistent storage
  // ---------------------------------------------------------------
  let menuItems     = Map.empty<Text, MenuItem>();
  let menuItemExtras = Map.empty<Text, MenuItemExtra>();  // NEW -- description & quantity
  let rawMaterials  = Map.empty<Text, RawMaterial>();
  let recipes       = Map.empty<Text, [RecipeIngredient]>();
  let orders        = Map.empty<Text, Order>();

  // Kept for stable-var forward compatibility with previous deployment
  stable var seedInitializedExt : Bool = false;
  let userProfiles = Map.empty<Principal, UserProfile>();

  var orderCounter : Int = 0;

  func generateId(prefix : Text) : Text {
    prefix # "_" # Time.now().toText();
  };

  // Helper: merge MenuItem + MenuItemExtra -> MenuItemFull
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

  // ---------------------------------------------------------------
  // Menu Item CRUD (no auth check -- direct access)
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
  // Raw Material CRUD
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
  // Recipe Management
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
  // Order Placement (with auto inventory deduction)
  // ---------------------------------------------------------------
  public shared func placeOrder(input : OrderInput) : async Text {
    let orderId          = generateId("order");
    let orderItemsBuilder = List.empty<OrderItem>();
    var totalAmount : Float = 0.0;

    // Validate and build order items
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
    orderId;
  };

  public query func getOrder(id : Text) : async ?Order {
    orders.get(id);
  };

  public query func getOrders(startIndex : Int, pageSize : Int) : async [Order] {
    let allOrders = orders.values().toArray();
    if (startIndex >= allOrders.size()) { return [] };
    let endIndex = Int.min(allOrders.size(), startIndex + pageSize);
    allOrders.sliceToArray(startIndex, endIndex);
  };

  // ---------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------
  public query func getDashboardStats() : async DashboardStats {
    let allOrders = orders.values().toArray();
    var totalSales : Float = 0.0;
    for (o in allOrders.values()) { totalSales += o.totalAmount };

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
    };
  };
};
