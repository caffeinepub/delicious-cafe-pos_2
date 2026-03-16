import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    menuItems : Map.Map<Text, OldMenuItem>;
    menuItemExtras : Map.Map<Text, OldMenuItemExtra>;
    rawMaterials : Map.Map<Text, RawMaterial>;
    recipes : Map.Map<Text, [RecipeIngredient]>;
    orders : Map.Map<Text, Order>;
    orderKitchenStatus : Map.Map<Text, Text>;
    userProfiles : Map.Map<Principal, UserProfile>;
    seedInitializedExt : Bool;
    orderCounter : Int;
  };

  type NewActor = {
    menuItems : Map.Map<Text, MenuItem>;
    menuItemExtras : Map.Map<Text, MenuItemExtra>;
    rawMaterials : Map.Map<Text, RawMaterial>;
    recipes : Map.Map<Text, [RecipeIngredient]>;
    orders : Map.Map<Text, Order>;
    orderKitchenStatus : Map.Map<Text, Text>;
    userProfiles : Map.Map<Principal, UserProfile>;
    seedInitializedExt : Bool;
    orderCounter : Int;
  };

  type OldMenuItem = {
    id : Text;
    name : Text;
    category : Category;
    imageId : ?Text;
    price : Float;
    isAvailable : Bool;
    createdAt : Int;
  };

  type OldMenuItemExtra = {
    description : Text;
    quantity : Float;
  };

  type MenuItem = {
    id : Text;
    name : Text;
    category : Category;
    imageId : ?Text;
    price : Float;
    isAvailable : Bool;
    createdAt : Int;
  };

  type MenuItemExtra = {
    description : Text;
    quantity : Float;
  };

  type RawMaterial = {
    id : Text;
    name : Text;
    quantity : Float;
    unit : Unit;
    costPrice : Float;
    supplierName : Text;
    lowStockThreshold : Float;
    createdAt : Int;
  };

  type RecipeIngredient = {
    materialId : Text;
    quantityNeeded : Float;
  };

  type Order = {
    id : Text;
    orderNumber : Text;
    items : [OrderItem];
    totalAmount : Float;
    paymentMethod : PaymentMethod;
    status : OrderStatusStored;
    createdAt : Int;
    createdBy : Text;
  };

  type OrderItem = {
    menuItemId : Text;
    menuItemName : Text;
    quantity : Float;
    unitPrice : Float;
  };

  type OrderStatusStored = {
    #completed;
  };

  type Category = {
    #beverages;
    #food;
    #snacks;
    #desserts;
    #other;
  };

  type Unit = {
    #kg;
    #gram;
    #liter;
    #ml;
    #piece;
  };

  type PaymentMethod = {
    #cash;
    #upi;
  };

  type UserProfile = {
    id : Text;
    email : Text;
    name : Text;
    createdAt : Int;
    isActive : Bool;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
