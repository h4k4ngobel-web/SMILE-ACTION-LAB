import axios from "axios";
import { useMemo, createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSafeAuth } from "@/lib/auth";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

export function useApi() {
  const { getToken, isSignedIn } = useSafeAuth();
  return useMemo(() => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(async (c) => {
      let token = null;
      if (isSignedIn) {
        token = await getToken();
        if (token) c.headers.Authorization = `Bearer ${token}`;
      }
      if (c.url && c.url.startsWith("/talk/")) {
        c.params = { ...c.params, anon_id: anonId() };
      }
      return c;
    });
    return inst;
  }, [getToken, isSignedIn]);
}

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return "Periksa kembali isian formulir.";
  return d || "Terjadi kesalahan. Coba lagi.";
};

export function anonId() {
  let id = localStorage.getItem("sal_anon_id");
  if (!id || id.length < 8 || id.length > 64) {
    id = (window.crypto?.randomUUID?.() || String(Math.random()).slice(2) + Date.now());
    localStorage.setItem("sal_anon_id", id);
  }
  return id;
}

export const fmtDate = (s) => {
  try {
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return s;
  }
};

const MeCtx = createContext({ me: null, refresh: () => {} });

export function MeProvider({ children }) {
  const { isSignedIn } = useSafeAuth();
  const api = useApi();
  const [me, setMe] = useState(null);
  const refresh = useCallback(async () => {
    if (!isSignedIn) { setMe(null); return; }
    try { setMe((await api.get("/me")).data); } catch { setMe(null); }
  }, [api, isSignedIn]);
  useEffect(() => { refresh(); }, [refresh]);
  return <MeCtx.Provider value={{ me, refresh }}>{children}</MeCtx.Provider>;
}

export const useMe = () => useContext(MeCtx);
