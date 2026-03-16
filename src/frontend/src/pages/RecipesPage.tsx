import { Button } from "@/components/ui/button";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RecipeIngredient } from "../backend";
import { useActor } from "../hooks/useActor";

export default function RecipesPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [localRecipes, setLocalRecipes] = useState<
    Record<string, RecipeIngredient[]>
  >({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: () => actor!.listMenuItems(),
    enabled: !!actor,
  });

  const { data: materials = [], isLoading: matLoading } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => actor!.listRawMaterials(),
    enabled: !!actor,
  });

  const { data: allRecipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: () => actor!.listAllRecipes(),
    enabled: !!actor,
  });

  const recipeMap: Record<string, RecipeIngredient[]> = {};
  for (const [menuItemId, ingredients] of allRecipes) {
    recipeMap[menuItemId] = ingredients;
  }

  const toggleItem = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!localRecipes[id]) {
        setLocalRecipes((prev) => ({
          ...prev,
          [id]: recipeMap[id] ? [...recipeMap[id]] : [],
        }));
      }
    }
  };

  const addIngredient = (menuItemId: string) => {
    if (materials.length === 0) return;
    setLocalRecipes((prev) => ({
      ...prev,
      [menuItemId]: [
        ...(prev[menuItemId] ?? []),
        { materialId: materials[0].id, quantityNeeded: 1 },
      ],
    }));
  };

  const removeIngredient = (menuItemId: string, idx: number) => {
    setLocalRecipes((prev) => ({
      ...prev,
      [menuItemId]: prev[menuItemId].filter((_, i) => i !== idx),
    }));
  };

  const updateIngredient = (
    menuItemId: string,
    idx: number,
    field: keyof RecipeIngredient,
    value: string,
  ) => {
    setLocalRecipes((prev) => ({
      ...prev,
      [menuItemId]: prev[menuItemId].map((ing, i) =>
        i === idx
          ? {
              ...ing,
              [field]:
                field === "quantityNeeded"
                  ? Number.parseFloat(value) || 0
                  : value,
            }
          : ing,
      ),
    }));
  };

  const saveRecipe = async (menuItemId: string) => {
    if (!actor) return;
    setSaving(menuItemId);
    try {
      await actor.setRecipe(menuItemId, localRecipes[menuItemId] ?? []);
      queryClient.invalidateQueries({ queryKey: ["all-recipes"] });
      toast.success("Recipe saved!");
    } catch {
      toast.error("Failed to save recipe");
    } finally {
      setSaving(null);
    }
  };

  const isLoading = menuLoading || matLoading || recipesLoading;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold">Recipe Mapping</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Link menu items to raw materials with ingredient quantities.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : menuItems.length === 0 ? (
        <div
          className="bg-card rounded-xl border p-8 text-center text-muted-foreground"
          data-ocid="recipe.empty_state"
        >
          Add menu items first to define recipes.
        </div>
      ) : (
        <div className="space-y-2">
          {menuItems.map((item, idx) => {
            const isOpen = expanded === item.id;
            const _ingredients = isOpen
              ? (localRecipes[item.id] ?? [])
              : (recipeMap[item.id] ?? []);
            const hasRecipe = (recipeMap[item.id] ?? []).length > 0;

            return (
              <div
                key={item.id}
                data-ocid={`recipe.item.panel.${idx + 1}`}
                className="bg-card rounded-xl border border-border shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasRecipe && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {recipeMap[item.id].length} ingredient
                        {recipeMap[item.id].length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="pt-3 space-y-2">
                      {(localRecipes[item.id] ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No ingredients defined. Click + to add.
                        </p>
                      ) : (
                        (localRecipes[item.id] ?? []).map((ing, i) => {
                          const mat = materials.find(
                            (m) => m.id === ing.materialId,
                          );
                          return (
                            <div
                              key={`ing-${item.id}-${i}`}
                              className="flex items-center gap-2"
                            >
                              <Select
                                value={ing.materialId}
                                onValueChange={(v) =>
                                  updateIngredient(item.id, i, "materialId", v)
                                }
                              >
                                <SelectTrigger className="flex-1 h-8 text-xs">
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                                <SelectContent>
                                  {materials.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      {m.name} ({m.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={ing.quantityNeeded}
                                onChange={(e) =>
                                  updateIngredient(
                                    item.id,
                                    i,
                                    "quantityNeeded",
                                    e.target.value,
                                  )
                                }
                                className="w-20 h-8 text-xs text-center"
                              />
                              <span className="text-xs text-muted-foreground w-8">
                                {mat?.unit ?? ""}
                              </span>
                              <button
                                type="button"
                                data-ocid={`recipe.ingredient.delete_button.${i + 1}`}
                                onClick={() => removeIngredient(item.id, i)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addIngredient(item.id)}
                        className="text-xs"
                        disabled={materials.length === 0}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Ingredient
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveRecipe(item.id)}
                        data-ocid={`recipe.save.button.${idx + 1}`}
                        disabled={saving === item.id}
                        className="bg-primary text-primary-foreground text-xs"
                      >
                        {saving === item.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3 mr-1" />
                            Save Recipe
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
