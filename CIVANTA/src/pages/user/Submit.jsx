import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  MapPin,
  Paperclip,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { categories } from "../../data/mockData";
import { useToast } from "../../context/ToastContext";
import { useSubmissions } from "../../context/SubmissionsContext";
import { useAuth } from "../../context/AuthContext";
import LocationPickerMap from "../../components/maps/LocationPickerMap";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

const steps = [
  { key: "info", label: "Basic Info", icon: FileText },
  { key: "location", label: "Location", icon: MapPin },
  { key: "evidence", label: "Evidence & Photo", icon: Paperclip },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

export default function Submit() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ lat: 26.18, lng: 91.75 });
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();
  const { addSubmission } = useSubmissions();
  const { user } = useAuth();
  const nav = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const next = async () => {
    if (step === 0) {
      handleSubmit((d) => {
        setData((prev) => ({ ...prev, ...d }));
        setStep(1);
      })();
      return;
    }
    setStep(step + 1);
  };
  const back = () => setStep(step - 1);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = res.data.url;
      setData((prev) => ({ ...prev, image_url: imageUrl }));
      push({
        type: "success",
        title: "Image Uploaded",
        message: "Landslide photo attached successfully.",
      });
    } catch (err) {
      push({
        type: "error",
        title: "Upload Failed",
        message: err.response?.data?.detail || "Could not upload image.",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmitFinal = async () => {
    setSubmitting(true);
    try {
      const res = await addSubmission(data, user);
      setSubmitted(res);
      push({
        type: "success",
        title: "Submitted",
        message: `Your ID is ${res.id}`,
      });
    } catch (err) {
      push({ type: "error", title: "Failed", message: "Please try again" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
            Submission received!
          </h2>
          <p className="mt-2 text-slate-600">
            We've notified the relevant department. You'll receive updates as it
            progresses.
          </p>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Submission ID</div>
              <div className="mt-1 font-bold text-slate-900">
                {submitted.id}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Current Status</div>
              <div className="mt-1 font-bold text-brand-600">
                {submitted.status}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Estimated Response</div>
              <div className="mt-1 font-bold text-slate-900">24–48 hrs</div>
            </div>
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <Button onClick={() => nav(`/submissions/${submitted.id}`)}>
              Track Submission
            </Button>
            <Button variant="secondary" onClick={() => nav("/my-submissions")}>
              My Submissions
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Submit a Report
        </h1>
        <p className="text-sm text-slate-500">
          Help us resolve issues faster with accurate map pin and photo evidence.
        </p>
      </div>

      {/* Stepper */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div
                className={`flex items-center gap-2 ${i <= step ? "text-brand-600" : "text-slate-400"}`}
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className="hidden md:inline text-sm font-semibold">
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 ${i < step ? "bg-emerald-500" : "bg-slate-200"}`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        {step === 0 && (
          <div className="grid gap-4">
            <h3 className="font-bold text-slate-900">Basic Information</h3>
            <Input
              label="Title"
              placeholder="e.g. Landslide blocking NH-415 highway"
              {...register("title", { required: "Required" })}
              error={errors.title?.message}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                {...register("category", { required: "Required" })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                rows="5"
                {...register("description", { required: "Required" })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                placeholder="Describe the issue in detail…"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <h3 className="font-bold text-slate-900">Location & Coordinates</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="State"
                placeholder="e.g. Assam"
                {...register("state")}
              />
              <Input
                label="District"
                placeholder="e.g. Kamrup Metropolitan"
                {...register("district")}
              />
            </div>
            <Input
              label="City / Village"
              placeholder="e.g. Guwahati"
              {...register("city")}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Pin precise location on interactive map (Click or drag marker)
              </label>
              <LocationPickerMap
                lat={data.lat}
                lng={data.lng}
                onChange={({ lat, lng }) => setData((prev) => ({ ...prev, lat, lng }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <h3 className="font-bold text-slate-900">Upload Landslide Photo / Evidence</h3>
            <p className="text-xs text-slate-500">
              Attach a photo of the road damage or landslide for verification by admin officers.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/20 transition relative overflow-hidden">
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-brand-600">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-xs font-semibold">Uploading photo to server…</span>
                </div>
              ) : data.image_url ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={getImageUrl(data.image_url)}
                    alt="Landslide Preview"
                    className="h-36 w-auto object-cover rounded-xl border border-slate-200 shadow-sm"
                  />
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Photo attached! Click to replace.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Click or drag landslide photo here
                  </div>
                  <div className="text-xs text-slate-500">JPG, PNG, WEBP up to 10MB</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <h3 className="font-bold text-slate-900">Review your submission</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field k="Title" v={data.title || "—"} />
              <Field k="Category" v={data.category || "—"} />
              <Field k="State" v={data.state || "—"} />
              <Field k="District" v={data.district || "—"} />
              <Field k="Pinned Coordinates" v={`${data.lat?.toFixed(4)}, ${data.lng?.toFixed(4)}`} />
              <Field k="Photo Attached" v={data.image_url ? "Yes ✅" : "No"} />
            </div>

            {data.image_url && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Attached Photo Preview</div>
                <img
                  src={getImageUrl(data.image_url)}
                  alt="Attachment"
                  className="h-32 w-auto object-cover rounded-xl border border-slate-200 shadow-sm"
                />
              </div>
            )}

            <div>
              <div className="text-xs text-slate-500">Description</div>
              <div className="mt-1 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {data.description || "—"}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onSubmitFinal} loading={submitting}>
              Submit Report
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ k, v }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800 capitalize">
        {v}
      </div>
    </div>
  );
}
