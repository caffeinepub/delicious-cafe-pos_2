import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  onComplete: () => void;
}

export default function SetupProfilePage({ onComplete }: Props) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !actor || !identity) return;
    setSaving(true);
    try {
      const principal = identity.getPrincipal();
      await actor.saveCallerUserProfile({
        id: principal.toText(),
        name: name.trim(),
        email: "",
        createdAt: BigInt(Date.now()) * BigInt(1_000_000),
        isActive: true,
      });
      toast.success("Profile created!");
      onComplete();
    } catch (_e) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">☕</div>
          <h1 className="text-2xl font-display font-semibold">
            Welcome to Delicious Cafe
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your staff profile to get started.
          </p>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow-coffee">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                data-ocid="setup.name.input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <Button
              data-ocid="setup.save.primary_button"
              className="w-full bg-primary text-primary-foreground"
              onClick={handleSave}
              disabled={!name.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
