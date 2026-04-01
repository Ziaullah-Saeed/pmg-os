import { useState } from "react";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const { login, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg-atmosphere">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1E3A5F]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-crimson to-crimson/70 mb-4 relative">
            <div className="absolute inset-0 rounded-2xl opacity-30 bg-gradient-to-t from-transparent to-white/10" />
            <Shield className="h-8 w-8 text-white relative z-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            PMG <span className="text-crimson">OS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI Operating System</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 space-y-5 border border-border/30">
          <div>
            <h2 className="text-lg font-semibold">Sign In</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Access PMG Group OS</p>
          </div>

          {loginError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-3 py-2">
              {loginError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@pmggroup.com"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-crimson/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-crimson/50 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-lg bg-crimson hover:bg-crimson/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground/60">Protected by PMG Group Security</p>
          </div>
        </form>
      </div>
    </div>
  );
}
