import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase"; 
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin, Activity, X } from "lucide-react";

export default function GlobalEmergencyAlert() {
  const navigate = useNavigate();
  const notifiedIds = useRef(new Set()); 

  useEffect(() => {
    const q = query(
      collection(db, "emergency_logs"),
      where("status", "==", "รอดำเนินการ")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const docId = change.doc.id;

          // 🚨 1. กรองข้อมูลเก่า: เช็คว่าเหตุการณ์นี้เกิดมานานเกิน 12 ชั่วโมงหรือยัง?
          // ถ้าเก่ากว่า 12 ชั่วโมง แสดงว่าเป็นข้อมูลค้างเก่า เราจะไม่ให้มันเด้งเตือน
          const logTime = data.timestamp?.toMillis() || Date.now();
          const isOldLog = (Date.now() - logTime) > 1000 * 60 * 5;

          if (!notifiedIds.current.has(docId) && !isOldLog) {
            notifiedIds.current.add(docId);
            showCustomAlert(data, docId);
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const showCustomAlert = (data: any, toastId: string) => {
    let bgColor = "bg-rose-600"; 
    let hoverColor = "hover:bg-rose-700";
    let badgeText = "ระดับร้ายแรง";
    const level = data.severityLevel || "";

    if (level === "low" || data.severity?.includes("ต่ำ")) {
      bgColor = "bg-yellow-500"; 
      hoverColor = "hover:bg-yellow-600";
      badgeText = "ระดับเฝ้าระวัง";
    } else if (level === "medium" || data.severity?.includes("ปานกลาง")) {
      bgColor = "bg-orange-500"; 
      hoverColor = "hover:bg-orange-600";
      badgeText = "ระดับปานกลาง";
    }

    toast.custom(
      (t) => (
        <div className={`${t.visible ? "animate-enter" : "animate-leave"} pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/5`}>
          
          <div className={`flex items-start gap-3 p-4 text-white ${bgColor}`}>
            <AlertTriangle size={32} className="shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold">แจ้งเตือนเหตุฉุกเฉิน!</h3>
              {/* 🚨 2. ดักเคสข้อมูลเก่าที่ไม่มีชื่อ หรือไม่มี ID */}
              <p className="text-sm opacity-90">{data.fullName || "ผู้สูงอายุ (ไม่ระบุชื่อ)"} (ID: {data.elderlyId || "-"})</p>
            </div>
            <button onClick={() => toast.dismiss(toastId)} className="rounded-full p-1 hover:bg-white/20 transition">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 bg-slate-50 p-5 text-slate-700">
            <div className="flex items-start gap-3">
              <Activity size={18} className="mt-0.5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">เหตุที่พบ</p>
                
                <p className="text-sm font-bold leading-tight">
                  {data.details || data.severity || "ความผิดปกติไม่ทราบสาเหตุ"}
                </p>
                <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${bgColor}`}>
                  {badgeText}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">สถานที่ / โซน</p>
                <p className="text-sm font-bold">{data.zoneName || data.address || "ไม่ระบุตำแหน่ง"}</p>
              </div>
            </div>

            <button
              onClick={() => {
                toast.dismiss(toastId); 
                navigate("/emergency"); 
              }}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition shadow-md ${bgColor} ${hoverColor}`}
            >
              ดูรายละเอียด / เข้าช่วยเหลือ
            </button>
          </div>

        </div>
      ),
      { 
        id: toastId, 
        duration: Infinity, 
        position: "bottom-right" 
      }
    );
  };

  return null; 
}