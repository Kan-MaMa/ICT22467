//src/components/layout/Fall.tsx
import { AlertTriangle, MapPinned, Siren, X } from "lucide-react";

type Props = {
  personName: string;
  severity: string;
  severityLevel: "low" | "medium" | "high";
  impactValue: number;
  lat: number;
  lng: number;
  onClose: () => void;
  onClick: () => void;
  onEmergency: () => void;
};

function getSeverityTheme(level: Props["severityLevel"]) {
  if (level === "low") {
    return {
      border: "border-emerald-500",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
      title: "ตรวจพบการล้ม",
      description: "ระดับไม่รุนแรงมาก ควรตรวจสอบผู้สูงอายุและติดตามอาการ",
      ctaLabel: "ดูรายละเอียดผู้สูงอายุ",
      emergencyLabel: "ไปหน้าฉุกเฉิน",
    };
  }

  if (level === "medium") {
    return {
      border: "border-amber-500",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      title: "ตรวจพบการล้มระดับกลาง",
      description: "ควรแจ้งญาติหรือผู้ดูแลให้รีบตรวจสอบโดยเร็ว",
      ctaLabel: "ดูรายละเอียดผู้สูงอายุ",
      emergencyLabel: "เปิดหน้าฉุกเฉิน",
    };
  }

  return {
    border: "border-rose-500",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    title: "ตรวจพบการล้มรุนแรง!",
    description: "เหตุการณ์นี้มีความเสี่ยงสูง ควรเปิดหน้าฉุกเฉินและเร่งช่วยเหลือทันที",
    ctaLabel: "ดูข้อมูลผู้สูงอายุ",
    emergencyLabel: "เปิดเหตุฉุกเฉินทันที",
  };
}

export default function FallToast({
  personName,
  severity,
  severityLevel,
  impactValue,
  lat,
  lng,
  onClose,
  onClick,
  onEmergency,
}: Props) {
  const theme = getSeverityTheme(severityLevel);

  return (
    <div className="fixed right-6 top-6 z-[999] w-[360px] animate-in slide-in-from-right-10 fade-in duration-300">
      <div
        className={`overflow-hidden rounded-3xl border-l-8 ${theme.border} bg-white shadow-2xl ring-1 ring-black/5`}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`rounded-full ${theme.iconBg} ${theme.iconText} p-2`}>
              <AlertTriangle size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer" onClick={onClick}>
                  <h4 className="text-base font-extrabold text-slate-900">{theme.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    คุณ{" "}
                    <span className="font-bold text-slate-800">{personName}</span>{" "}
                    เกิดอุบัติเหตุล้ม
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
                  aria-label="ปิดแจ้งเตือน"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">{theme.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${theme.badgeBg} ${theme.badgeText}`}
                >
                  ระดับ: {severity}
                </span>

                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  Impact: {impactValue.toFixed(1)}
                </span>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPinned size={14} className="mt-0.5 shrink-0 text-cyan-600" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">ตำแหน่งล่าสุด</p>
                    <p className="break-all">
                      lat: {lat.toFixed(6)}, lng: {lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <button
                  onClick={onClick}
                  className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  {theme.ctaLabel}
                </button>

                <button
                  onClick={onEmergency}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${
                    severityLevel === "high"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : severityLevel === "medium"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : "bg-cyan-600 hover:bg-cyan-700"
                  }`}
                >
                  <Siren size={18} />
                  {theme.emergencyLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center">
          <p className="text-[11px] font-medium text-slate-500">
            ระบบบันทึกเหตุล้มและเตรียมข้อมูลสำหรับแจ้งเตือนฉุกเฉินแล้ว
          </p>
        </div>
      </div>
    </div>
  );
}