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
import { Edit2, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MenuItem } from "../backend";
import { Category } from "../backend";
import { useActor } from "../hooks/useActor";

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.beverages]: "Beverages",
  [Category.food]: "Food",
  [Category.snacks]: "Snacks",
  [Category.desserts]: "Desserts",
  [Category.other]: "Other",
};

const ALL_CATEGORIES = Object.values(Category);

interface FormState {
  name: string;
  price: string;
  category: Category;
  description: string;
  quantity: string;
}

const defaultForm: FormState = {
  name: "",
  price: "",
  category: Category.beverages,
  description: "",
  quantity: "1",
};

export default function MenuManagementPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => actor!.listMenuItems(),
    enabled: !!actor,
  });

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCat;
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
      price: item.price.toString(),
      category: item.category,
      description: item.description,
      quantity: item.quantity.toString(),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      const input = {
        name: form.name.trim(),
        price: Number.parseFloat(form.price) || 0,
        category: form.category,
        description: form.description.trim(),
        quantity: Number.parseFloat(form.quantity) || 0,
        imageId: undefined,
      };
      if (editing) {
        await actor.updateMenuItem(editing.id, input);
        toast.success("Menu item updated");
      } else {
        await actor.createMenuItem(input);
        toast.success("Menu item added");
      }
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save menu item");
    } finally {
      setSaving(false);
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

  const handleToggle = async (item: MenuItem) => {
    if (!actor) return;
    setTogglingId(item.id);
    try {
      await actor.toggleMenuItemAvailability(item.id);
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold">
            Menu Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add, edit, and manage your cafe menu items.
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="menu.search.search_input"
            placeholder="Search items..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => setFilterCategory(v as Category | "all")}
        >
          <SelectTrigger
            data-ocid="menu.category_filter.select"
            className="w-40"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Available</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4].map((sk) => (
                <TableRow key={sk}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
                  data-ocid="menu.empty_state"
                >
                  {items.length === 0
                    ? 'No menu items yet. Click "Add Item" to get started.'
                    : "No items match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, i) => (
                <TableRow key={item.id} data-ocid={`menu.item.row.${i + 1}`}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      data-ocid={`menu.item.switch.${i + 1}`}
                      checked={item.isAvailable}
                      disabled={togglingId === item.id}
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

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="menu.item.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Item Name *</Label>
              <Input
                data-ocid="menu.name.input"
                className="mt-1"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Cappuccino"
              />
            </div>
            <div>
              <Label>Price (₹) *</Label>
              <Input
                data-ocid="menu.price.input"
                className="mt-1"
                type="number"
                min="0"
                step="0.50"
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
                data-ocid="menu.quantity.input"
                className="mt-1"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as Category }))
                }
              >
                <SelectTrigger
                  data-ocid="menu.category.select"
                  className="mt-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                data-ocid="menu.description.textarea"
                className="mt-1 resize-none"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="menu.item.cancel_button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="menu.item.save_button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-primary text-primary-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Update Item"
              ) : (
                "Add Item"
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
              This will permanently remove this menu item. This action cannot be
              undone.
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
