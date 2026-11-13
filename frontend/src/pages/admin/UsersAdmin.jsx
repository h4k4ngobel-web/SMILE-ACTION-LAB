import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { sel } from "@/pages/admin/PostsAdmin";

import { ROLE_LABEL as LABEL } from "@/pages/Admin";

export default function UsersAdmin() {
  const api = useApi();
  const [data, setData] = useState({ roles: [], users: [] });
  const load = useCallback(() => api.get("/users").then((r) => setData(r.data)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const change = async (uid, role) => {
    try { await api.patch(`/users/${uid}/role`, { role }); toast.success("Peran diperbarui"); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="sal-card p-6">
      <p className="font-bold">Pengguna ({data.users.length})</p>
      <div className="mt-4 divide-y divide-[#EDE6FF]">
        {data.users.map((u) => (
          <div key={u.user_id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`admin-user-row-${u.user_id}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFDA79] font-bold">{(u.name || "?")[0]}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{u.name}</p><p className="truncate text-xs text-[#68748C]">{u.email} · {u.xp || 0} XP · bergabung {fmtDate(u.created_at)}</p></div>
            <select value={u.role} onChange={(e) => change(u.user_id, e.target.value)} className={`${sel} !w-40`} data-testid={`admin-user-role-${u.user_id}`}>
              {data.roles.map((r) => <option key={r} value={r}>{LABEL[r] || r}</option>)}
            </select>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[#68748C]">Untuk memblokir atau menghapus akun, gunakan menu Manage → Users &amp; Auth di Emergent.</p>
    </div>
  );
}
