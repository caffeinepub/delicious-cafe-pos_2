# Delicious Cafe POS

## Current State
- POS 1 (POSPage.tsx): Only has New Order flow. No order history, no order editing from history.
- Counter B / POS 2 (CounterBPage.tsx): Has Take Order + Active Orders tabs. Sound plays on ANY new pending order (including Counter B's own orders). Transfer button exists but backend has no `transferOrder` function, so it always fails.
- Backend (backend.mo): Has `placeOrder`, `getOrder`, `getOrders` but is missing: `acceptOrder`, `completeOrder`, `listActiveOrders`, `editOrderItems`, `transferOrder`. Also missing `customerName`/`customerPhone` in `OrderInput`/`Order`. No `isTransferred` flag on orders.

## Requested Changes (Diff)

### Add
- Backend: `customerName: ?Text` and `customerPhone: ?Text` fields to `OrderInput` and `Order`
- Backend: `isTransferred: Bool` field to `Order` (marks orders transferred from another POS)
- Backend: `acceptOrder(id: Text): async Bool` - changes status to accepted
- Backend: `completeOrder(id: Text): async Bool` - changes status to completed
- Backend: `listActiveOrders(): async [Order]` - returns all pending + accepted orders
- Backend: `editOrderItems(id: Text, items: [OrderItemInput]): async Bool` - replaces order items and recalculates total
- Backend: `transferOrder(id: Text, targetPos: Text): async Bool` - updates `createdBy` to target, sets `isTransferred = true`, keeps status as pending
- POS 1 frontend: "Order History" tab alongside "New Order" tab
  - Lists all orders (completed + active) sorted by newest first
  - Search by customer name
  - Each order card shows: order number, customer name, items, total, status
  - Edit button on each card opens edit dialog (add/remove items by qty)
  - Transfer to Counter B button on active orders

### Modify
- Counter B / POS 2 `ActiveOrdersTab`: Change beep sound logic to ONLY play when a new transferred order arrives (i.e., `isTransferred === true`) instead of any pending order
- Backend `placeOrder`: include `customerName`, `customerPhone`, set `isTransferred = false` by default

### Remove
- Nothing removed

## Implementation Plan
1. Regenerate backend with all new fields and functions
2. Update POSPage.tsx to add Order History tab with search, edit, and transfer
3. Update CounterBPage.tsx ActiveOrdersTab to only beep on `isTransferred` orders
