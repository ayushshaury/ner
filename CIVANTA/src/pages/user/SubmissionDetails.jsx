import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Flag,
  CheckCircle2,
  AlertTriangle,
  CloudRain,
  Mountain,
  Ban,
  Check,
  Image as ImageIcon,
  Maximize2
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import SingleSubmissionMap from "../../components/maps/SingleSubmissionMap";
import { useSubmissions } from "../../context/SubmissionsContext";
import { useToast } from "../../context/ToastContext";
import { getImageUrl } from "../../utils/imageUrl";

const statuses = ["Submitted", "Verified", "Assigned", "In Progress", "Resolved"];

export default function SubmissionDetails({ admin }) {
  const { id } = useParams();
  const { submissions, updateSubmission } = useSubmissions();
  const { push } = useToast();
  const [imgModalOpen, setImgModalOpen] = useState(false);

  const sub = submissions.find((s) => s.id === id) || submissions[0];

  if (!sub) {
    return (
      <div className="p-8 text-center text-slate-500">
        Submission not found. <Link to="/my-submissions" className="underline">Go back</Link>
      </div>
    );
  }

  const currentIdx = statuses.indexOf(sub.status);
  const road = sub.road;
  const lat = sub.lat || (sub.location && sub.location.coordinates ? sub.location.coordinates[1] : 26.18);
  const lng = sub.lng || (sub.location && sub.location.coordinates ? sub.location.coordinates[0] : 91.75);

  const handleApproveBlock = async () => {
    try {
      await updateSubmission(sub.id, { status: "Verified" });
      push({
        type: "success",
        title: "Report Approved & Road Blocked",
        message: `Road ${sub.road_id || ''} has been set to BLOCKED across all maps live.`,
      });
    } catch {
      push({ type: "error", title: "Action Failed", message: "Could not update status." });
    }
  };

  const handleResolve = async () => {
    try {
      await updateSubmission(sub.id, { status: "Resolved" });
      push({
        type: "success",
        title: "Report Resolved",
        message: `Road ${sub.road_id || ''} is now OPEN.`,
      });
    } catch {
      push({ type: "error", title: "Action Failed", message: "Could not update status." });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to={admin ? "/admin/submissions" : "/my-submissions"}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="text-xs text-slate-500">Submission</div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            #{sub.id}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone={sub.status === "Resolved" ? "emerald" : "brand"}>{sub.status}</Badge>
          {road && road.status === "blocked" && (
            <Badge tone="rose">ROAD CLOSED</Badge>
          )}
        </div>
      </div>

      {/* Main Overview */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{sub.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{sub.description}</p>
        </div>

        <div className="grid sm:grid-cols-4 gap-3 pt-2">
          <Info icon={Building2} k="Department" v={sub.department || "—"} />
          <Info icon={MapPin} k="Location" v={`${lat.toFixed(4)}, ${lng.toFixed(4)}`} />
          <Info icon={Flag} k="Priority" v={sub.priority || "Medium"} />
          <Info icon={Clock} k="Submitted" v={sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"} />
        </div>
      </Card>

      {/* Interactive Location & Verification Map */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Location Verification Map
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Pinned: {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        </div>

        <SingleSubmissionMap lat={lat} lng={lng} road={road} />
      </Card>

      {/* Uploaded Landslide Photo Evidence */}
      {sub.image_url && (
        <Card className="p-6 space-y-3 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Uploaded Photo Evidence
              </h3>
            </div>
            <button
              onClick={() => setImgModalOpen(true)}
              className="text-xs font-semibold text-brand-600 flex items-center gap-1 hover:underline"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Enlarge Photo
            </button>
          </div>

          <div className="relative group inline-block">
            <img
              src={getImageUrl(sub.image_url)}
              alt="Uploaded Landslide Evidence"
              className="h-64 w-auto max-w-full object-cover rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:opacity-95 transition"
              onClick={() => setImgModalOpen(true)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80";
              }}
            />
          </div>
        </Card>
      )}

      {/* Risk Explainability & Linked Road Box */}
      {road && (
        <Card className="p-6 border-l-4 border-l-amber-500 bg-amber-50/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Linked Monitored Road ({road.road_id})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">AI Risk Score:</span>
              <span className="font-extrabold text-base text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                {road.risk_score} / 100
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CloudRain className="h-4 w-4 text-blue-500" /> Rainfall (Recent)
              </div>
              <div className="font-bold text-slate-900">
                {road.rainfall_7d_mm ?? "—"} mm <span className="text-xs font-normal text-slate-500">(7-day accumulation)</span>
              </div>
              <div className="text-xs text-slate-500">
                24h: {road.rainfall_24h_mm ?? 0}mm | 3d: {road.rainfall_3d_mm ?? 0}mm
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Landslide Vulnerability
              </div>
              <div className="font-bold text-slate-900">
                {road.historical_landslide_count ?? 0} historical landslides nearby
              </div>
              <div className="text-xs text-slate-500">
                Nearest incident: {road.nearest_landslide_distance_km ?? "N/A"} km
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Mountain className="h-4 w-4 text-emerald-600" /> Terrain & Elevation
              </div>
              <div className="font-bold text-slate-900">
                {road.elevation_m ? `${Math.round(road.elevation_m)}m elevation` : "—"}
              </div>
              <div className="text-xs text-slate-500">
                Slope: {road.slope_deg ? `${road.slope_deg.toFixed(1)}°` : "—"} | Type: {road.road_type || "Standard"}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Admin Action Bar */}
      {admin && (
        <Card className="p-6 bg-slate-900 text-white">
          <h3 className="font-bold text-white text-base mb-2">Admin Approval & Live Road Blocking</h3>
          <p className="text-xs text-slate-300 mb-4">
            Verify the pinned location and landslide photo above. Approving this report will flip road segment <span className="font-mono text-amber-300">{sub.road_id || 'linked'}</span> to <span className="text-rose-400 font-bold">BLOCKED</span> across all live client maps instantly.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleApproveBlock}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <Ban className="h-4 w-4 mr-1.5" />
              Approve & Block Road
            </Button>
            <Button
              onClick={handleResolve}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Mark Resolved (Reopen Road)
            </Button>
          </div>
        </Card>
      )}

      {/* Status timeline */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-900 mb-6">Status Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
          <div className="space-y-6">
            {statuses.map((s, i) => {
              const done = i <= currentIdx;
              const hist = (sub.history || []).find((h) => h.status === s);
              return (
                <div key={s} className="relative pl-12">
                  <div
                    className={`absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div
                    className={`font-semibold ${done ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {s}
                  </div>
                  {hist && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {hist.at ? new Date(hist.at).toLocaleString() : ''} · {hist.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Image Modal Preview */}
      {imgModalOpen && sub.image_url && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
            <button
              onClick={() => setImgModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-900/80 text-white h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-900 z-10"
            >
              ✕
            </button>
            <img
              src={getImageUrl(sub.image_url)}
              alt="Landslide Evidence Enlarged"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, k, v }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {k}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900 capitalize">
        {v}
      </div>
    </div>
  );
}
