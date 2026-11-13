import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";
import AuthContext, { AuthModeContext } from "@/lib/auth";

const appearance = {
  variables: {
    colorPrimary: "#7552D6",
    colorPrimaryForeground: "#FFFFFF",
    colorForeground: "#19264C",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "14px",
  },
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

function ClerkAuthBridge({ children }) {
  const auth = useClerkAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/clerk/config`);
        if (!response.ok) throw new Error(`Clerk config request failed: ${response.status}`);
        const cfg = await response.json();
        if (cfg.enabled) {
          if (!cancelled) setConfig(cfg);
          return;
        }
      } catch {}

      if (cancelled) return;
      if (attempt >= 2) {
        setConfig({ enabled: false });
        return;
      }
      setTimeout(() => load(attempt + 1), 1500);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  if (!config) return null;
  if (!config.enabled) {
    return <AuthModeContext.Provider value={{ enabled: false }}>{children}</AuthModeContext.Provider>;
  }

  return (
    <AuthModeContext.Provider value={{ enabled: true }}>
      <ClerkProvider
        publishableKey={config.publishable_key}
        proxyUrl={config.proxy_url || undefined}
        appearance={appearance}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkProvider>
    </AuthModeContext.Provider>
  );
}
