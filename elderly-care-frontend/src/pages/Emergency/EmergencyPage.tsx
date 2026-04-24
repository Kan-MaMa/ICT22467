import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  getDoc,
  serverTimestamp,
  updateDoc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getNearbyHospitals } from "../../services/hospitalService";
import { generateSimulatedFallEvent } from "../../services/fallSimulationService";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import {
  CheckCircle2,
  Clock3,
  HeartPulse,
  Hospital,
  Navigation,
  PhoneCall,
  ShieldAlert,
  Users,
  PlayCircle,
  Trash2,
  Sparkles,
  X,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import hospitalImg from "../../assets/hospital-building.png";
import toast from "react-hot-toast";

// --- 🚨 Interface สำหรับ TypeScript ---
interface ElderlyPerson {
  id: string;
  fullName: string;
  isFallen: boolean;
  currentLat: number;
  currentLng: number;
  alertDispatchStatus?: string;
  lastFallSeverity?: string;
  lastFallSeverityLevel?: "low" | "medium" | "high";
  lastFallImpactValue?: number;
  hospitalName?: string;
  hospitalPhone?: string;
  address?: string;
  zoneName?: string;
}

const LONGDO_API_KEY = "1afa8f91fa27973c6bff0322201a437e";

const normalUserIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
});

const dangerUserIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [45, 45],
});

const hospitalIcon = new L.Icon({
  iconUrl: hospitalImg,
  iconSize: [35, 35],
});

const simulatedFallIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1042/1042989.png",
  iconSize: [42, 42],
});

type EmergencyRouteState = {
  elderlyId?: string;
  personName?: string;
  severity?: string;
  severityLevel?: "low" | "medium" | "high";
  impactValue?: number;
  lat?: number;
  lng?: number;
};

type SimulatedEventState = {
  lat: number;
  lng: number;
  zoneName: string;
  severityLabel: string;
  severityLevel: "low" | "medium" | "high";
  impactValue: number;
  happenedAt: Date;
  nearestHospital?: any;
};

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export default function SmartMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as EmergencyRouteState;

  const [elderlyList, setElderlyList] = useState<ElderlyPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<ElderlyPerson | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [latestEmergencyLogs, setLatestEmergencyLogs] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSimulatingFall, setIsSimulatingFall] = useState(false);
  const [simulatedEvent, setSimulatedEvent] = useState<SimulatedEventState | null>(null);

  const [currentCaregivers, setCurrentCaregivers] = useState<any[]>([]);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "elderly"), (snapshot) => {
      const list = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      })) as ElderlyPerson[];
      
      setElderlyList(list);

      if (routeState.elderlyId) {
        const matched = list.find((item) => item.id === routeState.elderlyId);
        if (matched) {
          setSelectedPerson(matched);
          return;
        }
      }
      
      setSelectedPerson((prev) => {
        if (!prev) return list.find((item) => item.isFallen) || list[0] || null;
        const refreshed = list.find((item) => item.id === prev.id);
        return refreshed || prev;
      });
    });
    return () => unsub();
  }, [routeState.elderlyId]);

  useEffect(() => {
    if (!selectedPerson?.id) {
      setCurrentCaregivers([]);
      return;
    }

    const linkQuery = query(collection(db, "caregiver_links"), where("elderlyId", "==", selectedPerson.id));
    
    const unsubLinks = onSnapshot(linkQuery, async (snapshot) => {
      try {
        const caregiverPromises = snapshot.docs.map(async (linkDoc) => {
          const linkData = linkDoc.data();
          const cgSnap = await getDoc(doc(db, "caregivers", linkData.caregiverId));
          if (cgSnap.exists()) {
            const cgData = cgSnap.data();
            return {
              id: linkDoc.id,
              caregiverId: linkData.caregiverId,
              fullName: cgData.fullName,
              phone: cgData.phone,
              relationship: linkData.relationship
            };
          }
          return null;
        });
        const results = await Promise.all(caregiverPromises);
        setCurrentCaregivers(results.filter(item => item !== null));
      } catch (error) {
        console.error("Caregiver fetch error:", error);
      }
    });

    return () => unsubLinks();
  }, [selectedPerson?.id]);

  useEffect(() => {
    const emergencyQuery = query(collection(db, "emergency_logs"), orderBy("timestamp", "desc"), limit(10));
    const unsub = onSnapshot(emergencyQuery, (snapshot) => {
      const logs = snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }));
      setLatestEmergencyLogs(logs);
    });
    return () => unsub();
  }, []);

  const activeLat = Number(simulatedEvent?.lat ?? selectedPerson?.currentLat ?? routeState.lat ?? 13.75);
  const activeLng = Number(simulatedEvent?.lng ?? selectedPerson?.currentLng ?? routeState.lng ?? 100.5);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (!activeLat || !activeLng) { setNearbyPlaces([]); return; }
      setIsLoadingPlaces(true);
      try {
        const places = await getNearbyHospitals(activeLat, activeLng, 5);
        const healthFacilities = places.filter((h: any) => !h?.name?.includes("สัตว์"));
        setNearbyPlaces(healthFacilities);
      } catch (error) {
        console.error("Fetch places error:", error);
      } finally {
        setIsLoadingPlaces(false);
      }
    };
    fetchPlaces();
  }, [activeLat, activeLng, selectedPerson?.id, simulatedEvent?.happenedAt?.getTime()]);

  // 🚨 ตัวแปรสำหรับคอลัมน์ "สรุปเหตุ"
  const severityLabel = simulatedEvent?.severityLabel || selectedPerson?.lastFallSeverity || routeState.severity || "ไม่ระบุ";
  const selectedHospitalName = simulatedEvent?.nearestHospital?.name || selectedPerson?.hospitalName || nearbyPlaces[0]?.name || "ยังไม่ระบุ";
  const latestSelectedLog = useMemo(() => {
    if (!selectedPerson?.id) return null;
    return latestEmergencyLogs.find((log) => log.elderlyId === selectedPerson.id) || null;
  }, [latestEmergencyLogs, selectedPerson?.id]);

  const handleUpdateEmergencyStatus = async (status: "กำลังช่วยเหลือ" | "ปลอดภัยแล้ว") => {
    if (!selectedPerson?.id) return;
    try {
      setIsUpdatingStatus(true);
      await updateDoc(doc(db, "elderly", selectedPerson.id), {
        alertDispatchStatus: status === "กำลังช่วยเหลือ" ? "in_progress" : "resolved",
        isFallen: status === "ปลอดภัยแล้ว" ? false : true,
        updatedAt: serverTimestamp(),
      });
      
      if (latestSelectedLog?.id) {
        await updateDoc(doc(db, "emergency_logs", latestSelectedLog.id), {
          status: status,
          updatedAt: serverTimestamp(),
          resolvedAt: status === "ปลอดภัยแล้ว" ? serverTimestamp() : null,
          help_status: status 
        });
      }
      toast.success(`อัปเดตเป็น ${status} แล้ว`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSimulateFall = async () => {
    if (!selectedPerson?.id) { toast.error("กรุณาเลือกผู้สูงอายุก่อน"); return; }
    try {
      setIsSimulatingFall(true);
      const generated = generateSimulatedFallEvent();
      const places = await getNearbyHospitals(generated.lat, generated.lng, 5);
      const healthFacilities = places.filter((h: any) => !h?.name?.includes("สัตว์"));
      const nearestHospital = healthFacilities.length > 0 ? healthFacilities[0] : null;

      // 🚨 1. สร้าง ID แบบ EM001
      const emSnap = await getDocs(collection(db, "emergency_logs"));
      let maxEmId = 0;
      emSnap.forEach((d) => {
        if (d.id.startsWith("EM")) {
          const num = parseInt(d.id.replace("EM", ""), 10);
          if (!isNaN(num) && num > maxEmId) maxEmId = num;
        }
      });
      const newEmId = `EM${String(maxEmId + 1).padStart(3, "0")}`;

      // 2. อัปเดตข้อมูลผู้สูงอายุ (แนบ ID ล่าสุดไปด้วย เผื่อโชว์ในตาราง)
      await updateDoc(doc(db, "elderly", selectedPerson.id), {
        latest_emergency_id: newEmId, // 🚨 เอาไปโชว์ในตารางได้เลย
        currentLat: generated.lat, currentLng: generated.lng, isFallen: true,
        lastFallSeverity: generated.severity.label, lastFallSeverityLevel: generated.severity.level,
        lastFallImpactValue: generated.severity.impactValue, alertDispatchStatus: "pending",
        hospitalName: nearestHospital?.name || "", address: generated.zoneName, updatedAt: serverTimestamp(),
      });

      // 🚨 3. บันทึกลง emergency_logs ด้วยรหัสใหม่ EMxxx
      await setDoc(doc(db, "emergency_logs", newEmId), {
        emergency_id: newEmId, // เก็บลงไปในฟิลด์ด้วย
        elderlyId: selectedPerson.id, fullName: selectedPerson.fullName,
        severity: generated.severity.label, severityLevel: generated.severity.level,
        status: "รอดำเนินการ", zoneName: generated.zoneName, lat: generated.lat, lng: generated.lng,
        timestamp: serverTimestamp(), help_status: "รอดำเนินการ"
      });

      setSimulatedEvent({
        lat: generated.lat, lng: generated.lng, zoneName: generated.zoneName,
        severityLabel: generated.severity.label, severityLevel: generated.severity.level as any,
        impactValue: generated.severity.impactValue, happenedAt: generated.happenedAt, nearestHospital,
      });
      toast.success(`จำลองการล้มรหัส ${newEmId} สำเร็จ!`);
    } catch (error) { console.error(error); } finally { setIsSimulatingFall(false); }
  };

  const handleClearSimulation = () => setSimulatedEvent(null);

  return (
    <div className="min-h-[calc(100vh-100px)] space-y-6 bg-slate-50 p-4 md:p-6 font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* แบนเนอร์หัวข้อ */}
      <div className="rounded-[32px] bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-lg">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-100">Emergency Command Center</p>
        <h1 className="mt-2 text-3xl font-bold">ระบบช่วยเหลือฉุกเฉินผู้สูงอายุ</h1>
      </div>

      <div className="grid gap-6 items-start xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* คอลัมน์ 1: รายชื่อ */}
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm h-[600px] flex flex-col">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-800 shrink-0"><Users size={20} className="text-cyan-600" /> เลือกผู้สูงอายุ</h2>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {elderlyList.map((person) => (
              <div key={person.id} onClick={() => setSelectedPerson(person)} className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${selectedPerson?.id === person.id ? "border-cyan-500 bg-cyan-50 shadow-md" : "border-transparent bg-slate-50 hover:border-cyan-100"}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">{person.fullName}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold shrink-0 ${person.isFallen ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-emerald-100 text-emerald-700"}`}>
                    {person.alertDispatchStatus === "in_progress" ? "ช่วยอยู่" : person.isFallen ? "ผิดปกติ" : "ปกติ"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* คอลัมน์ 2: แผนที่ & ปุ่มด่วน */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-sm h-[500px] xl:h-[600px]">
            <MapContainer {...({ center: [13.75, 100.5], zoom: 12 } as any)} className="h-full w-full">
              <TileLayer url={`https://ms.longdo.com/mmmap/img.php?zoom={z}&x={x}&y={y}&key=${LONGDO_API_KEY}&proj=epsg3857`} />
              <MapUpdater lat={activeLat} lng={activeLng} />
              {elderlyList.map((person) => person.currentLat && person.currentLng && (
                  <Marker key={person.id} position={[person.currentLat, person.currentLng] as any} {...({ icon: person.isFallen ? dangerUserIcon : normalUserIcon } as any)}>
                    <Popup><div className="font-bold text-center">{person.fullName}</div></Popup>
                  </Marker>
              ))}
              {simulatedEvent && <Marker position={[simulatedEvent.lat, simulatedEvent.lng] as any} {...({ icon: simulatedFallIcon } as any)} />}
              {nearbyPlaces.map((place) => <Marker key={place.id} position={[place.lat, place.lng] as any} {...({ icon: hospitalIcon } as any)} />)}
            </MapContainer>
          </div>
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><ShieldAlert size={20} className="text-rose-500" /> คำสั่งด่วน</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsCaregiverModalOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 text-sm font-bold text-white transition hover:bg-emerald-600 shadow-lg shadow-emerald-100"><PhoneCall size={20} /> ญาติ / ผู้ดูแล</button>
              <button onClick={() => selectedPerson?.id && navigate(`/elderly/${selectedPerson.id}`)} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"><Users size={20} /> ประวัติสุขภาพ</button>
            </div>
          </div>
        </div>

        {/* คอลัมน์ 3: สถานะ & 🚨 ส่วนสรุปเหตุ (ที่หายไป) 🚨 */}
        <div className="flex flex-col gap-6">
          {/* ส่วนอัปเดตสถานะ */}
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><Clock3 size={20} className="text-amber-500" /> อัปเดตสถานะ</h3>
            <div className="grid gap-3">
              <button disabled={isUpdatingStatus || !selectedPerson?.id} onClick={() => handleUpdateEmergencyStatus("กำลังช่วยเหลือ")} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"><HeartPulse size={18} /> กำลังช่วยเหลือ</button>
              <button disabled={isUpdatingStatus || !selectedPerson?.id} onClick={() => handleUpdateEmergencyStatus("ปลอดภัยแล้ว")} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"><CheckCircle2 size={18} /> ปลอดภัยแล้ว</button>
            </div>
          </div>

          {/* 🚨 🚨 ส่วนสรุปเหตุ (SUMMARY CARD) 🚨 🚨 */}
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#0095B6]">
              <ShieldAlert size={20} />
              <h3 className="text-lg font-bold text-slate-800">สรุปเหตุ</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">ผู้สูงอายุ:</span>
                <span className="font-bold text-slate-800">{selectedPerson?.fullName || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">ความรุนแรง:</span>
                <span className={`font-bold ${severityLabel.includes("รุนแรง") ? "text-rose-600" : "text-slate-800"}`}>{severityLabel}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">สถานที่:</span>
                <span className="font-bold text-slate-800 text-right max-w-[150px] truncate">{simulatedEvent?.zoneName || latestSelectedLog?.zoneName || selectedPerson?.address || "ไม่ระบุตำแหน่ง"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">รพ./คลินิก ที่ใกล้ที่สุด:</span>
                <span className="font-bold text-cyan-600 text-right max-w-[150px] truncate" title={selectedHospitalName}>{selectedHospitalName}</span>
              </div>
            </div>
          </div>

          {/* รายชื่อ รพ. ใกล้เคียง */}
          <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm flex flex-col max-h-[300px]">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 shrink-0"><Hospital size={20} className="text-emerald-500" /> รพ. ใกล้เคียง</h3>
            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {nearbyPlaces.map((place, i) => (
                <div key={place.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-cyan-800">{place.name} {i === 0 && "(ใกล้สุด)"}</p>
                  <p className="text-[10px] text-slate-500 mt-1">ระยะ: {place.distance.toFixed(1)} กม.</p>
                  <div className="mt-2 flex gap-2">
                    <a href={`tel:${place.phone}`} className="flex-1 bg-emerald-500 text-white text-[10px] font-bold text-center py-1.5 rounded-lg">โทร</a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-cyan-600 text-white text-[10px] font-bold text-center py-1.5 rounded-lg">นำทาง</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ส่วน Logs และ Simulator ด้านล่าง */}
      <div className="grid gap-6 items-start xl:grid-cols-[minmax(0,1fr)_950px]">
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><Sparkles size={20} className="text-violet-500" /> จำลอง</h3>
          <button disabled={isSimulatingFall || !selectedPerson?.id} onClick={handleSimulateFall} className="flex justify-center gap-2 rounded-2xl bg-violet-600 p-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 w-full"><PlayCircle size={18} /> จำลองการล้ม</button>
        </div>
      </div>

      {/* Modal Caregiver */}
      {isCaregiverModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative">
            <button onClick={() => setIsCaregiverModalOpen(false)} className="absolute top-6 right-6 text-slate-400 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-6">ผู้ดูแล / ญาติ</h2>
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {currentCaregivers.map((cg) => (
                <div key={cg.id} className="bg-slate-50 rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <p className="text-lg font-bold text-slate-800">{cg.fullName}</p>
                  <p className="text-xs text-emerald-600 font-bold mb-3">สถานะ: {cg.relationship}</p>
                  <a href={`tel:${cg.phone}`} className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-md shadow-emerald-100"><PhoneCall size={18} /> โทรหาญาติ</a>
                </div>
              ))}
              {currentCaregivers.length === 0 && <p className="text-center text-slate-400 py-10">ไม่พบข้อมูลผู้ดูแล</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
