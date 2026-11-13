import { Navigate } from "react-router-dom";
import { useMe } from "@/lib/api";
import { Loading } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Overview from "@/pages/admin/Overview";
import PostsAdmin from "@/pages/admin/PostsAdmin";
import EventsAdmin from "@/pages/admin/EventsAdmin";
import OrgsAdmin from "@/pages/admin/OrgsAdmin";
import UsersAdmin from "@/pages/admin/UsersAdmin";
import ReviewQueue from "@/pages/admin/ReviewQueue";
import SourcesAdmin from "@/pages/admin/SourcesAdmin";
import CounselAdmin from "@/pages/admin/CounselAdmin";
import AuditAdmin from "@/pages/admin/AuditAdmin";

export const STAFF = ["admin", "editor", "fact_checker", "event_manager", "counselor", "moderator"];
export const ROLE_LABEL = { admin: "Super Admin", editor: "Editor", fact_checker: "Fact Checker", event_manager: "Event Manager", counselor: "Konselor", moderator: "Moderator", member: "Anggota" };
const CONTENT = ["admin", "editor", "fact_checker"];

const TABS = [
  ["overview", "Ringkasan", Overview, STAFF],
  ["posts", "Konten", PostsAdmin, CONTENT],
  ["queue", "Antrian Review", ReviewQueue, CONTENT],
  ["sources", "Sumber", SourcesAdmin, CONTENT],
  ["events", "Event", EventsAdmin, ["admin", "event_manager"]],
  ["counsel", "Konseling", CounselAdmin, ["admin", "counselor"]],
  ["orgs", "PIK-R", OrgsAdmin, ["admin"]],
  ["users", "Pengguna & Peran", UsersAdmin, ["admin"]],
  ["audit", "Audit", AuditAdmin, ["admin"]],
];

export default function Admin() {
  const { me } = useMe();
  if (!me) return <Loading />;
  if (!STAFF.includes(me.role)) return <Navigate to="/dashboard" replace />;
  const tabs = TABS.filter((t) => t[3].includes(me.role));
  return (
    <div className="sal-sky min-h-screen" data-testid="admin-page">
      <div className="sal-container py-10">
        <p className="sal-eyebrow">{ROLE_LABEL[me.role]}</p>
        <h1 className="mt-2 text-4xl font-bold" data-testid="page-title">SMILE Content Studio</h1>
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="h-auto flex-wrap justify-start rounded-3xl bg-white p-1">
            {tabs.map(([v, l]) => <TabsTrigger key={v} value={v} className="rounded-full px-4 py-2 data-[state=active]:bg-[#7552D6] data-[state=active]:text-white" data-testid={`admin-tab-${v}`}>{l}</TabsTrigger>)}
          </TabsList>
          {tabs.map(([v, , C]) => <TabsContent key={v} value={v} className="mt-6"><C /></TabsContent>)}
        </Tabs>
      </div>
    </div>
  );
}
