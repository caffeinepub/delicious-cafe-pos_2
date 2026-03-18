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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type RawMaterial, type RawMaterialInput, Unit } from "../backend";
import { useActor } from "../hooks/useActor";

const UNITS = Object.values(Unit);

interface FormState {
  name: string;
  quantity: string;
  unit: Unit;
  costPrice: string;
  supplierName: string;
  lowStockThreshold: string;
}

const defaultForm: FormState = {
  name: "",
  quantity: "",
  unit: Unit.piece,
  costPrice: "",
  supplierName: "",
  lowStockThreshold: "10",
};

export default function InventoryPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => actor!.listRawMaterials(),
    enabled: !!actor,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalOpen(true);
  };
  const openEdit = (m: RawMaterial) => {
    setEditing(m);
    setForm({
      name: m.name,
      quantity: m.quantity.toString(),
      unit: m.unit as Unit,
      costPrice: m.costPrice.toString(),
      supplierName: m.supplierName,
      lowStockThreshold: m.lowStockThreshold.toString(),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      const input: RawMaterialInput = {
        name: form.name.trim(),
        quantity: Number.parseFloat(form.quantity) || 0,
        unit: form.unit,
        costPrice: Number.parseFloat(form.costPrice) || 0,
        supplierName: form.supplierName.trim(),
        lowStockThreshold: Number.parseFloat(form.lowStockThreshold) || 10,
      };
      if (editing) {
        await actor.updateRawMaterial(editing.id, input);
        toast.success("Material updated");
      } else {
        await actor.createRawMaterial(input);
        toast.success("Material added");
      }
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setModalOpen(false);
    } catch (e) {
      console.error("Save raw material error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to save: ${msg.slice(0, 80)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!actor || !deleteTarget) return;
    setDeleting(true);
    try {
      await actor.deleteRawMaterial(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      toast.success("Material deleted");
      setDeleteTarget(null);
    } catch (e) {
      console.error("Delete raw material error:", e);
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const getStockStatus = (m: RawMaterial) => {
    if (m.quantity <= 0)
      return { label: "Out of Stock", cls: "bg-red-100 text-red-700" };
    if (m.quantity <= m.lowStockThreshold)
      return { label: "Low Stock", cls: "bg-orange-100 text-orange-700" };
    return { label: "In Stock", cls: "bg-green-100 text-green-700" };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage raw materials and stock levels.
          </p>
        </div>
        <Button
          data-ocid="inventory.add.open_modal_button"
          onClick={openAdd}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              ["s1", "s2", "s3", "s4", "s5"].map((sk) => (
                <TableRow key={sk}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                  data-ocid="inventory.empty_state"
                >
                  No materials added yet.
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m, i) => {
                const status = getStockStatus(m);
                return (
                  <TableRow
                    key={m.id}
                    data-ocid={`inventory.item.row.${i + 1}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {m.quantity <= m.lowStockThreshold &&
                          m.quantity > 0 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          )}
                        {m.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.quantity} {m.unit as string}
                    </TableCell>
                    <TableCell>₹{m.costPrice.toFixed(2)}</TableCell>
                    <TableCell>{m.supplierName || "—"}</TableCell>
                    <TableCell>
                      {m.lowStockThreshold} {m.unit as string}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.cls} border-0 text-xs`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`inventory.item.edit_button.${i + 1}`}
                          onClick={() => openEdit(m)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`inventory.item.delete_button.${i + 1}`}
                          onClick={() => setDeleteTarget(m)}
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent data-ocid="inventory.item.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit Material" : "Add Raw Material"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Material Name</Label>
              <Input
                data-ocid="inventory.name.input"
                className="mt-1"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Milk"
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                data-ocid="inventory.quantity.input"
                className="mt-1"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, unit: v as Unit }))
                }
              >
                <SelectTrigger
                  data-ocid="inventory.unit.select"
                  className="mt-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cost Price (₹)</Label>
              <Input
                data-ocid="inventory.cost.input"
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, costPrice: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Low Stock Threshold</Label>
              <Input
                data-ocid="inventory.threshold.input"
                className="mt-1"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))
                }
              />
            </div>
            <div className="col-span-2">
              <Label>Supplier Name</Label>
              <Input
                data-ocid="inventory.supplier.input"
                className="mt-1"
                value={form.supplierName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplierName: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              data-ocid="inventory.save.submit_button"
              onClick={handleSave}
              disabled={saving || !form.name}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this material and its recipes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="inventory.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="inventory.delete.confirm_button"
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
