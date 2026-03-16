import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4">
            <span className="text-4xl">☕</span>
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Delicious Cafe
          </h1>
          <p className="text-muted-foreground mt-1 font-body">
            Point of Sale System
          </p>
        </div>

        {/* Login card */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-coffee">
          <h2 className="text-lg font-display font-semibold text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with Internet Identity to access the POS system.
          </p>

          {isLoginError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">
              {loginError?.message ?? "Login failed. Please try again."}
            </div>
          )}

          <Button
            data-ocid="login.primary_button"
            className="w-full h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={login}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            New staff accounts are set up by your administrator.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Internet Computer
        </p>
      </div>
    </div>
  );
}
