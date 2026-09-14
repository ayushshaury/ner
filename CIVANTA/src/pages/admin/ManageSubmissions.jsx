import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Eye, Pencil, MessageSquare } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useSubmissions } from "../../context/SubmissionsContext";

const tone = (s) =>
  s === "Resolved"
    ? "emerald"
    : s === "In Progress"
      ? "brand"
      : s === "Assigned"
        ? "indigo"
        : s === "Verified"
          ? "brand"
          : "amber";

function renderLocation(s) {
  if (typeof s.location === "string" && s.location) return s.location;
  if (s.lat !== undefined && s.lng !== undefined) {
    return `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`;
  }
  if (s.location && typeof s.location === "object" && s.location.coordinates) {
    return `${s.location.coordinates[1].toFixed(4)}, ${s.location.coordinates[0].toFixed(4)}`;
  }
  return "—";
}

function renderDate(s) {
  if (s.date) return s.date;
  if (s.created_at) return new Date(s.created_at).toLocaleDateString();
  return "—";
}

function renderUser(s) {
  if (typeof s.user === "string" && s.user) return s.user;
  if (s.user && typeof s.user === "object" && s.user.name) return s.user.name;
  if (s.user_id) return `User ${String(s.user_id).slice(0, 8)}`;
  return "Citizen User";
}

export default function ManageSubmissions() {
  const { submissions, loading } = useSubmissions();
  const [status, setStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = submissions.filter((s) => {
    const matchesStatus = status === "all" || s.status === status;
    const titleMatch = s.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const idMatch = s.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && (titleMatch || idMatch);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manage Submissions
          </h1>
          <p className="text-sm text-slate-500">
            Review, assign and update citizen submissions in real time.
          </p>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search submissions by ID, title…"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option>Submitted</option>
          <option>Verified</option>
          <option>Assigned</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
        <Button variant="secondary">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-left px-5 py-3">Priority</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Dept.</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    {loading ? "Loading live submissions…" : "No submissions found."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">
                      {s.id}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {renderUser(s)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 capitalize">
                      {s.category}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{renderLocation(s)}</td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={
                          s.priority === "High"
                            ? "rose"
                            : s.priority === "Medium"
                              ? "amber"
                              : "slate"
                        }
                      >
                        {s.priority}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={tone(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.department || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{renderDate(s)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/submissions/${s.id}`}
                          className="p-2 rounded-lg hover:bg-slate-100"
                          title="View & Process"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
