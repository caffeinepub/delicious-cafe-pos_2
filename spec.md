# Delicious Cafe POS

## Current State
- Single POS page for order taking
- Kitchen Display page showing active orders with accept/complete/edit
- Billing via receipt dialog (no customer name/phone)
- Nav labels: "POS / Orders", "Kitchen Display"

## Requested Changes (Diff)

### Add
- **POS 2 / Counter B**: Counter B page gets full POS ordering UI (same as POS 1) PLUS kitchen display (accept/complete/edit orders). This is the combined Counter B screen.
- **POS 1 label**: Rename existing POS page to "POS 1"
- **Order Transfer**: Both POS 1 and Counter B (POS 2) can transfer a pending/accepted order to the other screen. Uses `createdBy` field to route; backend needs `transferOrder(id, targetScreen)` function.
- **Customer Name + Mobile in Billing**: OrderInput gets optional `customerName` and `customerPhone` fields. Receipt shows these. POS place-order form has name/phone input fields.

### Modify
- "Kitchen Display" nav item renamed to "Counter B (POS 2)"
- "POS / Orders" nav item renamed to "POS 1"
- KitchenPage becomes CounterBPage with two tabs: "Take Order" (full POS UI) and "Active Orders" (kitchen display)
- Page type: `"kitchen"` → `"counterb"`, `"pos"` stays but labeled POS 1
- Order receipt shows customerName and customerPhone if provided
- Backend Order type gains optional customerName and customerPhone

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate backend with transferOrder function and customerName/customerPhone on Order/OrderInput
2. Update App.tsx page type to include `counterb`
3. Update AppLayout nav: POS 1, Counter B (POS 2) with badge
4. Create CounterBPage with two tabs: Take Order (POS UI) + Active Orders (kitchen display) + order transfer button
5. Update POSPage (POS 1): add customerName/phone inputs, transfer button on placed orders, label POS 1
6. Update receipt/billing dialogs to show customerName and phone
