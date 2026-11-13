import { createContext, useContext } from "react";

export const AuthModeContext = createContext({ enabled: false });
const AuthContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
});

export function useAuthMode() {
  return useContext(AuthModeContext);
}

export function useSafeAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
