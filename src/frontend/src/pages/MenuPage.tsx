import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MenuItem } from "../backend";
import { Category } from "../backend";
import { useActor } from "../hooks/useActor";

const CATEGORY_LABELS: Record<string, string> = {
  beverages: "Beverages",
  food: "Food",
  snacks: "Snacks",
  desserts: "Desserts",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  beverages: "bg-blue-100 text-blue-700",
  food: "bg-green-100 text-green-700",
  snacks: "bg-yellow-100 text-yellow-700",
  desserts: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

interface FormState {
  name: string;
  description: string;
  category: Category;
  price: string;
  quantity: string;
  isAvailable: boolean;
}

const defaultForm: FormState = {
  name: "",
  description: "",
  category: Category.beverages,
  price: "",
  quantity: "",
  isAvailable: true,
};

export default function MenuPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => actor!.listMenuItems(),
    enabled: !!actor,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalOpen(true);
  };
  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      price: item.price.toString(),
      quantity: item.quantity?.toString() ?? "",
      isAvailable: item.isAvailable,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price: Number.parseFloat(form.price),
        quantity: Number.parseFloat(form.quantity) || 0,
      };
      if (editing) {
        await actor.updateMenuItem(editing.id, input);
        if (editing.isAvailable !== form.isAvailable)
          await actor.toggleMenuItemAvailability(editing.id);
      } else {
        await actor.createMenuItem(input);
      }
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success(editing ? "Menu item updated" : "Menu item created");
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: MenuItem) => {
    if (!actor) return;
    try {
      await actor.toggleMenuItemAvailability(item.id);
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setDeleting(true);
    try {
      await actor.deleteMenuItem(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success("Menu item deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Menu Items</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your cafe menu.
          </p>
        </div>
        <Button
          data-ocid="menu.add.open_modal_button"
          onClick={openAdd}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["s1", "s2", "s3", "s4", "s5"].map((sk) => (
                <TableRow key={sk}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                  data-ocid="menu.empty_state"
                >
                  No menu items yet. Add your first item.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={item.id} data-ocid={`menu.item.row.${i + 1}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${CATEGORY_COLORS[item.category]} border-0 text-xs`}
                    >
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.quantity ?? 0}</TableCell>
                  <TableCell>
                    <Switch
                      data-ocid={`menu.item.toggle.${i + 1}`}
                      checked={item.isAvailable}
                      onCheckedChange={() => handleToggle(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`menu.item.edit_button.${i + 1}`}
                        onClick={() => openEdit(item)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`menu.item.delete_button.${i + 1}`}
                        onClick={() => setDeleteTarget(item)}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="menu.item.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Item Name *</Label>
              <Input
                data-ocid="menu.item.name.input"
                className="mt-1"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Cappuccino"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                data-ocid="menu.item.description.textarea"
                className="mt-1 resize-none"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. Rich espresso with steamed milk"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (₹) *</Label>
                <Input
                  data-ocid="menu.item.price.input"
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  data-ocid="menu.item.quantity.input"
                  className="mt-1"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as Category }))
                }
              >
                <SelectTrigger
                  data-ocid="menu.item.category.select"
                  className="mt-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                data-ocid="menu.item.available.switch"
                checked={form.isAvailable}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isAvailable: v }))
                }
              />
              <Label>Available</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              data-ocid="menu.item.save.submit_button"
              onClick={handleSave}
              disabled={saving || !form.name || !form.price}
              className="bg-primary text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="menu.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="menu.delete.confirm_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
