import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Shield, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function SettingsPage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [savingProfile, setSavingProfile] = useState(false);
  const [name, setName] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", identity?.getPrincipal().toString()],
    queryFn: async () => {
      const p = await actor!.getCallerUserProfile();
      if (p && !profileLoaded) {
        setName(p.name);
        setProfileLoaded(true);
      }
      return p;
    },
    enabled: !!actor && !!identity,
  });

  const saveProfile = async () => {
    if (!actor || !identity || !profile || !name.trim()) return;
    setSavingProfile(true);
    try {
      await actor.saveCallerUserProfile({ ...profile, name: name.trim() });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const principalId = identity?.getPrincipal().toText() ?? "";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and system settings.
        </p>
      </div>

      {/* Profile */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <User className="w-4 h-4" />
            Your Profile
          </CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Display Name</Label>
            <Input
              data-ocid="settings.name.input"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <Label>Principal ID (read-only)</Label>
            <Input
              className="mt-1 font-mono text-xs"
              value={principalId}
              readOnly
            />
            <p className="text-xs text-muted-foreground mt-1">
              Share this with the admin to get role assignment.
            </p>
          </div>
          <Button
            data-ocid="settings.save.primary_button"
            onClick={saveProfile}
            disabled={savingProfile || !name.trim()}
            className="bg-primary text-primary-foreground"
          >
            {savingProfile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Admin Role Management Info */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Management
          </CardTitle>
          <CardDescription>
            How to assign roles to staff members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Staff accounts are managed via Internet Identity. Each staff
              member signs in with their own Internet Identity.
            </p>
            <p>
              To promote a staff member to Admin, you need their{" "}
              <strong className="text-foreground">Principal ID</strong>. They
              can find it in their Settings page.
            </p>
            <div className="bg-muted rounded-lg p-3 text-xs font-mono">
              <p className="text-foreground font-semibold mb-1">
                Current Principal (Admin):
              </p>
              <p className="break-all">{principalId}</p>
            </div>
            <p className="text-xs">
              Role assignment is performed at the canister level. Contact your
              system administrator to update roles programmatically via the
              backend.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
