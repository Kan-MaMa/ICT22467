//src/pages/Eldery/ElderlyDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
  arrayRemove,
  deleteField, 
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  ChevronLeft,
  User,
  Heart,
  Activity,
  Droplets,
  AlertTriangle,
  Clock,
  Users,
  UserPlus,
  Phone,
  X,
  Info,
  ShieldAlert,
  MapPin,
  Siren,
  Hospital,
  PencilLine,
  Save,
  Trash2,
  CheckSquare2,
  Square,
} from "lucide-react";
import { calculateAge } from "../../unit/calculateAge";
import AddCaregiverModal from "../../components/layout/AddCaregiverModal";

type CaregiverItem = {
  id: string;
  caregiverId: string;
  fullName: string;
  phone: string;
  relationship: string;
};

type EmergencyContactForm = {
  primaryEmergencyPhone: string;
  secondaryEmergencyPhone: string;
  hospitalName: string;
  hospitalPhone: string;
  emergencyNotes: string;
};

const defaultEmergencyForm: EmergencyContactForm = {
  primaryEmergencyPhone: "",
  secondaryEmergencyPhone: "",
  hospitalName: "",
  hospitalPhone: "",
  emergencyNotes: "",
};

export default function ElderlyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [caregivers, setCaregivers] = useState<CaregiverItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverItem | null>(null);

  const [isEmergencyEditorOpen, setIsEmergencyEditorOpen] = useState(false);
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState<EmergencyContactForm>(defaultEmergencyForm);
  
  const [activeCaregiverIds, setActiveCaregiverIds] = useState<string[]>([]);

  // 🚨 State สำหรับจัดการแก้ไขข้อมูลทางการแพทย์
  const [isMedicalEditorOpen, setIsMedicalEditorOpen] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState({
    congenitalDisease: "",
    medications: "",
  });

  useEffect(() => {
    if (!id) return;

    const unsubElderly = onSnapshot(doc(db, "elderly", id), (docSnap) => {
      if (docSnap.exists()) {
        const elderlyData = docSnap.data();
        setData(elderlyData);
      }
      setLoading(false);
    });

    const unsubCg = onSnapshot(collection(db, "caregivers"), (snapshot) => {
      try {
        const results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(cgData => {
            const rawId = cgData.elderlyId || cgData.elderly_id;
            if (!rawId) return false;
            if (Array.isArray(rawId)) return rawId.includes(id);
            return rawId === id || String(rawId).includes(id);
          })
          .map(cgData => ({
            id: cgData.id,
            caregiverId: cgData.caregiverId || cgData.id,
            fullName: cgData.fullName || cgData.care_name,
            phone: cgData.phone || cgData.care_phone,
            relationship: cgData.relationMap?.[id] || cgData.relationship || cgData.relation || "ไม่ระบุ",
          } as CaregiverItem));
          
        setCaregivers(results);
      } catch (error) {
        console.error("Fetch Caregivers Error:", error);
      }
    });

    return () => {
      unsubElderly();
      unsubCg(); 
    };
  }, [id]);

  const handleResetStatus = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "elderly", id), {
        isFallen: false,
        alertDispatchStatus: "resolved",
        updatedAt: serverTimestamp(),
      });

      const q = query(collection(db, "emergency_logs"), where("elderlyId", "==", id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const logs = querySnapshot.docs.map((d) => ({ ref: d.ref, data: d.data() }));
        logs.sort((a, b) => {
          const timeA = a.data.timestamp?.toMillis() || 0;
          const timeB = b.data.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        const latestLog = logs[0];
        const status = latestLog.data.status || "";

        if (status.includes("รอดำเนินการ") || status.includes("กำลังช่วยเหลือ") || status.includes("เหตุจำลอง") || status.includes("ผิดปกติ")) {
          await updateDoc(latestLog.ref, {
            status: "ปลอดภัยแล้ว",
            updatedAt: serverTimestamp(),
            resolvedAt: serverTimestamp(),
          });
        }
      }
      alert("อัปเดตสถานะเป็นปลอดภัยแล้ว ✅");
    } catch (error) {
      console.error("Update error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  const handleDeleteCaregiver = async (e: React.MouseEvent, caregiverId: string, caregiverName: string) => {
    e.stopPropagation();
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${caregiverName}" ออกจากระบบฐานข้อมูลทั้งหมด?`)) {
      try {
        await deleteDoc(doc(db, "caregivers", caregiverId));
        alert("ลบข้อมูลผู้ดูแลออกจากฐานข้อมูลเรียบร้อยแล้ว ✅");
      } catch (error) {
        console.error("Delete caregiver error:", error);
        alert("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    }
  };

  const emergencyContacts = useMemo(() => {
    const contacts = [];
    if (data?.primaryEmergencyPhone) contacts.push({ label: "เบอร์ฉุกเฉินหลัก", phone: data.primaryEmergencyPhone, color: "rose" });
    if (data?.secondaryEmergencyPhone) contacts.push({ label: "เบอร์ฉุกเฉินสำรอง", phone: data.secondaryEmergencyPhone, color: "amber" });
    if (!data?.primaryEmergencyPhone && caregivers[0]?.phone) contacts.push({ label: "ผู้ดูแลหลัก (อัตโนมัติ)", phone: caregivers[0].phone, color: "emerald" });
    if (!data?.secondaryEmergencyPhone && caregivers[1]?.phone) contacts.push({ label: "ผู้ดูแลสำรอง (อัตโนมัติ)", phone: caregivers[1].phone, color: "cyan" });
    return contacts;
  }, [data, caregivers]);

  const emergencyStatusText = useMemo(() => {
    if (data?.alertDispatchStatus === "resolved") return "ช่วยเหลือแล้ว";
    if (data?.alertDispatchStatus === "in_progress") return "กำลังช่วยเหลือ";
    if (data?.alertDispatchStatus === "pending") return "รอดำเนินการ";
    return "ยังไม่มีเหตุล่าสุด";
  }, [data]);

  const openEmergencyEditor = () => {
    setEmergencyForm({
      primaryEmergencyPhone: data?.primaryEmergencyPhone || "",
      secondaryEmergencyPhone: data?.secondaryEmergencyPhone || "",
      hospitalName: data?.hospitalName || "",
      hospitalPhone: data?.hospitalPhone || "",
      emergencyNotes: data?.emergencyNotes || "",
    });
    setActiveCaregiverIds(caregivers.map(cg => cg.id));
    setIsEmergencyEditorOpen(true);
  };

  const handleSaveEmergencyInfo = async () => {
    if (!id) return;
    try {
      setIsSavingEmergency(true);
      await updateDoc(doc(db, "elderly", id), {
        primaryEmergencyPhone: emergencyForm.primaryEmergencyPhone.trim(),
        secondaryEmergencyPhone: emergencyForm.secondaryEmergencyPhone.trim(),
        hospitalName: emergencyForm.hospitalName.trim(),
        hospitalPhone: emergencyForm.hospitalPhone.trim(),
        emergencyNotes: emergencyForm.emergencyNotes.trim(),
        emergencyConfigUpdatedAt: serverTimestamp(),
      });

      const caregiversToRemove = caregivers.filter(cg => !activeCaregiverIds.includes(cg.id));
      for (const cg of caregiversToRemove) {
        const cgRef = doc(db, "caregivers", cg.id);
        await updateDoc(cgRef, {
          elderlyId: arrayRemove(id), 
          [`relationMap.${id}`]: deleteField() 
        });
      }

      setIsEmergencyEditorOpen(false);
      alert("บันทึกข้อมูลและอัปเดตผู้ดูแลเรียบร้อยแล้ว ✅");
    } catch (error) {
      console.error("Save emergency info error:", error);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSavingEmergency(false);
    }
  };

  const toggleCaregiver = (caregiverId: string) => {
    setActiveCaregiverIds(prev => 
      prev.includes(caregiverId) 
        ? prev.filter(id => id !== caregiverId) 
        : [...prev, caregiverId] 
    );
  };

  // 🚨 ฟังก์ชันเปิด Modal ข้อมูลทางการแพทย์
  const openMedicalEditor = () => {
    setMedicalForm({
      congenitalDisease: data?.congenitalDisease || "",
      medications: data?.medications || "",
    });
    setIsMedicalEditorOpen(true);
  };

  // 🚨 ฟังก์ชันบันทึกข้อมูลทางการแพทย์
  const handleSaveMedicalInfo = async () => {
    if (!id) return;
    try {
      setIsSavingMedical(true);
      await updateDoc(doc(db, "elderly", id), {
        congenitalDisease: medicalForm.congenitalDisease.trim(),
        medications: medicalForm.medications.trim(),
        updatedAt: serverTimestamp(),
      });
      setIsMedicalEditorOpen(false);
      alert("อัปเดตข้อมูลทางการแพทย์เรียบร้อยแล้ว ✅");
    } catch (error) {
      console.error("Save medical info error:", error);
      alert("บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSavingMedical(false);
    }
  };

  const quickPrimaryPhone = data?.primaryEmergencyPhone || caregivers[0]?.phone || "";
  const quickHospitalPhone = data?.hospitalPhone || "";
  const currentLat = Number(data?.currentLat || 0);
  const currentLng = Number(data?.currentLng || 0);
  const hasLocation = Number.isFinite(currentLat) && Number.isFinite(currentLng) && currentLat !== 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg font-medium text-slate-500">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center text-slate-500">ไม่พบข้อมูลผู้สูงอายุ</div>;

  const isFallen = data.isFallen === true;

  return (
    <div className="space-y-6 pb-10">
      <button onClick={() => navigate("/elderly")} className="group flex items-center gap-2 text-slate-400 transition-colors hover:text-[#0095B6]">
        <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">กลับไปหน้ารายชื่อ</span>
      </button>

      {isFallen && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-[32px] bg-rose-500 p-6 text-white shadow-lg md:flex-row">
          <div className="flex items-center gap-4">
            <AlertTriangle size={32} />
            <div>
              <h2 className="text-xl font-bold">ตรวจพบการล้ม!</h2>
              <p className="text-sm text-rose-100">เวลาที่บันทึก: {data.lastFallTime?.toDate?.().toLocaleTimeString("th-TH") || "-"} น.</p>
              <p className="mt-1 text-xs text-rose-100">สถานะเหตุ: {emergencyStatusText}</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <button
              onClick={() => navigate("/emergency", { state: { elderlyId: id, personName: data.fullName, severity: data.lastFallSeverity || "ไม่ระบุ", severityLevel: data.lastFallSeverityLevel || "medium", impactValue: Number(data.lastFallImpactValue || 0), lat: currentLat, lng: currentLng } })}
              className="w-full rounded-2xl bg-slate-900/20 px-6 py-3 font-bold text-white hover:bg-slate-900/30 md:w-auto"
            >
              เปิดหน้า Emergency
            </button>
            <button onClick={handleResetStatus} className="w-full rounded-2xl bg-white px-8 py-3 font-bold text-rose-600 hover:bg-rose-50 md:w-auto">
              ยืนยันการช่วยเหลือแล้ว
            </button>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className={`h-24 ${isFallen ? "bg-rose-500" : "bg-gradient-to-r from-[#0095B6] to-blue-600"}`} />
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-4 flex items-end gap-6">
            <div className="h-32 w-32 shrink-0 rounded-[24px] bg-white p-2 shadow-lg">
              <div className={`flex h-full w-full items-center justify-center rounded-[18px] ${isFallen ? "bg-rose-50 text-rose-500" : "bg-cyan-50 text-cyan-500"}`}>
                <User size={64} />
              </div>
            </div>
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{data.fullName}</h1>
                <span className="rounded-full border border-cyan-200 bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-700 shadow-sm">ID: {data.id || id}</span>
                {data.lastFallSeverity && <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700 shadow-sm">เหตุล่าสุด: {data.lastFallSeverity}</span>}
              </div>
              <p className="mt-1 font-medium text-slate-500">{data.gender} • อายุ {calculateAge(data.birthDate)} ปี</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[40px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Heart className="mx-auto mb-2 text-rose-500" size={32} />
          <p className="mt-2 text-4xl font-bold text-slate-800">{data.heartRate || "--"} <span className="text-sm font-normal">BPM</span></p>
        </div>
        <div className="rounded-[40px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Activity className="mx-auto mb-2 text-amber-500" size={32} />
          <p className="mt-2 text-4xl font-bold text-slate-800">{data.bloodPressure || "--/--"}<span className="text-sm font-normal"> mmHg</span></p>
        </div>
        <div className="rounded-[40px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Droplets className="mx-auto mb-2 text-emerald-500" size={32} />
          <p className="mt-2 text-4xl font-bold text-slate-800">{data.spo2 || "--"} %</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3 text-[#0095B6]">
                <Heart size={24} />
                <h2 className="text-xl font-bold text-slate-800">ข้อมูลทางการแพทย์</h2>
              </div>
              <button 
                onClick={openMedicalEditor}
                className="flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-600 transition-colors hover:bg-cyan-100"
              >
                <PencilLine size={16} />
                <span className="hidden sm:inline">แก้ไข</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-slate-700">โรคประจำตัว</p>
                <p className="text-slate-700">{data.congenitalDisease || "ไม่มี"}</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-700">ยาที่ทานประจำ</p>
                <p className="text-slate-700">{data.medications || "ไม่มี"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-50 pb-4 text-emerald-500">
              <Clock size={24} />
              <h2 className="text-xl font-bold text-slate-800">ประวัติล่าสุด</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500">บันทึกข้อมูลสัญญาณชีพล่าสุดเมื่อ</p>
                <p className="font-bold text-slate-800 mt-1">
                  {data?.lastVitalsUpdate ? (
                    typeof data.lastVitalsUpdate.toDate === 'function' 
                      ? data.lastVitalsUpdate.toDate().toLocaleString('th-TH')
                      : new Date(data.lastVitalsUpdate.seconds ? data.lastVitalsUpdate.seconds * 1000 : data.lastVitalsUpdate).toLocaleString('th-TH')
                  ) : data?.lastUpdated ? (
                    typeof data.lastUpdated.toDate === 'function' 
                      ? data.lastUpdated.toDate().toLocaleString('th-TH')
                      : new Date(data.lastUpdated.seconds ? data.lastUpdated.seconds * 1000 : data.lastUpdated).toLocaleString('th-TH')
                  ) : (
                    <span className="text-slate-400 font-normal">ยังไม่มีประวัติการวัดสัญญาณชีพ</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">สถานะอุปกรณ์</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" /> เชื่อมต่อแล้ว
                </span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">สถานที่ล่าสุด / โซน</p>
                <p className="font-semibold text-slate-700">
                  {(data.address && data.address !== "-") ? data.address : 
                   (data.zoneName && data.zoneName !== "-") ? data.zoneName : 
                   hasLocation ? `พิกัด: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}` : "ไม่ระบุตำแหน่ง"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-rose-100 bg-white p-8 shadow-sm h-full">
            <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3 text-rose-500">
                <ShieldAlert size={24} />
                <h2 className="text-xl font-bold text-slate-800">ติดต่อฉุกเฉิน & ผู้ดูแล</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-100">
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">เพิ่มผู้ดูแล</span>
                </button>
                <button onClick={openEmergencyEditor} className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100">
                  <PencilLine size={16} />
                  <span className="hidden sm:inline">แก้ไข</span>
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {emergencyContacts.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {emergencyContacts.map((contact, index) => (
                    <a key={`${contact.label}-${index}`} href={`tel:${contact.phone}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-rose-200 hover:bg-rose-50">
                      <p className="text-xs font-bold uppercase text-slate-400">{contact.label}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                        <Phone size={16} className="text-emerald-500" />{contact.phone}
                      </p>
                    </a>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs font-bold uppercase text-slate-400 mb-3">ผู้ดูแลในระบบ</p>
                <div className="space-y-3">
                  {caregivers.length > 0 ? (
                    caregivers.map((cg) => (
                      <div key={cg.id} className="group flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50">
                        <div className="flex flex-1 flex-col gap-1 pr-4">
                          <div className="flex items-center gap-3">
                            <p className="text-base font-bold leading-tight text-slate-800 transition-colors group-hover:text-orange-600">{cg.fullName}</p>
                            <div className="flex items-center gap-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedCaregiver(cg); }} className="flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2 py-1 text-[10px] font-bold text-orange-500 hover:bg-orange-100">
                                <Info size={12} /> รายละเอียด
                              </button>
                              <button onClick={(e) => handleDeleteCaregiver(e, cg.caregiverId, cg.fullName)} className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-100" title="ลบผู้ดูแล">
                                <Trash2 size={12} /> ลบ
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-col">
                            <span className="text-xs font-medium text-slate-400">ความสัมพันธ์: {cg.relationship}</span>
                            <span className="mt-1 text-sm font-bold text-cyan-600">📞 {cg.phone}</span>
                          </div>
                        </div>
                        <a href={`tel:${cg.phone}`} className="shrink-0 rounded-2xl bg-emerald-500 p-3 text-white shadow-md transition-colors hover:bg-emerald-600 hover:scale-105 active:scale-95" title="โทรหาผู้ดูแล">
                          <Phone size={18} />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 text-center">ยังไม่ได้เพิ่มข้อมูลผู้ดูแล</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">โรงพยาบาล / จุดรับส่งหลัก</p>
                    <p className="mt-2 text-base font-bold text-slate-800">{data.hospitalName || "ยังไม่ได้ระบุโรงพยาบาลหลัก"}</p>
                    <p className="mt-1 text-sm text-slate-500">เบอร์: {data.hospitalPhone || "-"}</p>
                  </div>
                  <Hospital className="shrink-0 text-cyan-500" size={24} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">หมายเหตุฉุกเฉิน</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{data.emergencyNotes || "ยังไม่มีหมายเหตุเพิ่มเติม"}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                <a href={quickPrimaryPhone ? `tel:${quickPrimaryPhone}` : undefined} onClick={(e) => { if (!quickPrimaryPhone) { e.preventDefault(); alert("ยังไม่มีเบอร์ฉุกเฉินหลัก"); } }} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
                  <Phone size={18} /> โทรญาติ
                </a>
                <a href={quickHospitalPhone ? `tel:${quickHospitalPhone}` : undefined} onClick={(e) => { if (!quickHospitalPhone) { e.preventDefault(); alert("ยังไม่มีเบอร์โรงพยาบาล"); } }} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600">
                  <Siren size={18} /> โทร รพ.
                </a>
                <button onClick={() => navigate("/emergency", { state: { elderlyId: id, personName: data.fullName, severity: data.lastFallSeverity || "ไม่ระบุ", severityLevel: data.lastFallSeverityLevel || "medium", impactValue: Number(data.lastFallImpactValue || 0), lat: currentLat, lng: currentLng } })} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-700">
                  <MapPin size={18} /> ไป Emergency
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddCaregiverModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} elderlyId={id!} />

      {selectedCaregiver && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[40px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedCaregiver(null)} className="absolute right-6 top-6 rounded-full bg-slate-100 p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
              <X size={20} />
            </button>
            <div className="mb-8 mt-4 flex flex-col items-center text-center">
              <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 text-orange-500 shadow-inner">
                <User size={48} />
              </div>
              <span className="mb-3 rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">ID: {selectedCaregiver.caregiverId}</span>
              <h2 className="text-2xl font-bold text-slate-800">{selectedCaregiver.fullName}</h2>
              <p className="mt-1 font-medium text-slate-500">สถานะ: {selectedCaregiver.relationship}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400"><Phone size={14} className="text-emerald-500" /> เบอร์โทรศัพท์</span>
                <span className="text-base font-bold text-slate-700">{selectedCaregiver.phone}</span>
              </div>
            </div>
            <a href={`tel:${selectedCaregiver.phone}`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-600 hover:shadow-emerald-200 active:scale-95">
              <Phone size={20} /> โทรออกทันที
            </a>
          </div>
        </div>
      )}

      {/* Modal แก้ไขข้อมูลฉุกเฉิน */}
      {isEmergencyEditorOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-[36px] bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6 md:p-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">แก้ไขข้อมูลผู้ดูแล & ติดต่อฉุกเฉิน</h2>
                <p className="mt-1 text-sm text-slate-500">จัดการรายชื่อผู้ดูแลและข้อมูลการติดต่อกรณีฉุกเฉิน</p>
              </div>
              <button onClick={() => setIsEmergencyEditorOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Users size={20} className="text-orange-500" />
                    <h3 className="font-bold text-slate-800 text-lg">ผู้ดูแลที่ดูแลอยู่</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">กดที่รายชื่อเพื่อ <span className="font-bold text-rose-500">ติ๊กออก</span> หากต้องการยกเลิกการผูกผู้ดูแลคนนี้</p>
                  
                  <div className="space-y-2">
                    {caregivers.length > 0 ? (
                      caregivers.map((cg) => {
                        const isActive = activeCaregiverIds.includes(cg.id);
                        return (
                          <div 
                            key={cg.id} 
                            onClick={() => toggleCaregiver(cg.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                              isActive 
                                ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50" 
                                : "border-slate-200 bg-slate-50 opacity-60 hover:opacity-80"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isActive ? <CheckSquare2 size={22} className="text-emerald-500" /> : <Square size={22} className="text-slate-400" />}
                              <div>
                                <p className={`font-bold ${isActive ? "text-slate-800" : "text-slate-500 line-through decoration-slate-400"}`}>
                                  {cg.fullName} <span className="text-xs font-normal ml-1">({cg.caregiverId})</span>
                                </p>
                                <p className={`text-xs mt-0.5 ${isActive ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                                  สถานะ: {cg.relationship}
                                </p>
                              </div>
                            </div>
                            {!isActive && <span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-lg">จะถูกลบออก</span>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
                        ยังไม่ได้ผูกผู้ดูแลกับผู้สูงอายุท่านนี้
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Siren size={20} className="text-rose-500" />
                    <h3 className="font-bold text-slate-800 text-lg">เบอร์ติดต่อฉุกเฉิน</h3>
                  </div>

                  <div className="mb-4 rounded-2xl bg-cyan-50 p-4 border border-cyan-100">
                    <label className="block text-xs font-bold text-cyan-800 mb-2">ดึงเบอร์ติดต่อจากผู้ดูแล (Auto-fill)</label>
                    <select
                        className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 outline-none transition focus:border-cyan-500 bg-white text-slate-700 text-sm font-medium cursor-pointer"
                        onChange={(e) => {
                          const selectedCg = caregivers.find(c => c.id === e.target.value);
                          if (selectedCg) {
                            setEmergencyForm(prev => ({ ...prev, primaryEmergencyPhone: selectedCg.phone }));
                          }
                        }}
                    >
                        <option value="">-- เลือกชื่อเพื่อดึงเบอร์ --</option>
                        {caregivers.map((cg) => (
                          <option key={cg.id} value={cg.id}>{cg.fullName} ({cg.relationship})</option>
                        ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-700">เบอร์ฉุกเฉินหลัก</span>
                      <input value={emergencyForm.primaryEmergencyPhone} onChange={(e) => setEmergencyForm((prev) => ({ ...prev, primaryEmergencyPhone: e.target.value }))} placeholder="เช่น 08xxxxxxxx" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-cyan-500 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-700">เบอร์ฉุกเฉินสำรอง</span>
                      <input value={emergencyForm.secondaryEmergencyPhone} onChange={(e) => setEmergencyForm((prev) => ({ ...prev, secondaryEmergencyPhone: e.target.value }))} placeholder="เช่น 09xxxxxxxx" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-cyan-500 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-700">ชื่อโรงพยาบาลหลัก</span>
                      <input value={emergencyForm.hospitalName} onChange={(e) => setEmergencyForm((prev) => ({ ...prev, hospitalName: e.target.value }))} placeholder="เช่น รพ.ตัวอย่าง" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-cyan-500 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-700">เบอร์โรงพยาบาล</span>
                      <input value={emergencyForm.hospitalPhone} onChange={(e) => setEmergencyForm((prev) => ({ ...prev, hospitalPhone: e.target.value }))} placeholder="เช่น 1669" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-cyan-500 text-sm" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-700">หมายเหตุฉุกเฉิน</span>
                      <textarea value={emergencyForm.emergencyNotes} onChange={(e) => setEmergencyForm((prev) => ({ ...prev, emergencyNotes: e.target.value }))} rows={3} placeholder="แพ้ยาอะไร, ข้อควรระวัง..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none transition focus:border-cyan-500 text-sm" />
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 p-6 md:px-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setIsEmergencyEditorOpen(false)} className="rounded-2xl bg-white border border-slate-200 px-6 py-3 font-bold text-slate-600 transition hover:bg-slate-100">
                ยกเลิก
              </button>
              <button onClick={handleSaveEmergencyInfo} disabled={isSavingEmergency} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-8 py-3 font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-cyan-600/20">
                <Save size={18} />
                {isSavingEmergency ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 Modal แก้ไขข้อมูลทางการแพทย์ 🚨 */}
      {isMedicalEditorOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[36px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-[#0095B6]">
                <Heart size={24} />
                <h2 className="text-2xl font-bold text-slate-900">แก้ไขข้อมูลทางการแพทย์</h2>
              </div>
              <button onClick={() => setIsMedicalEditorOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-400 transition hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">โรคประจำตัว</span>
                <textarea 
                  value={medicalForm.congenitalDisease} 
                  onChange={(e) => setMedicalForm({...medicalForm, congenitalDisease: e.target.value})}
                  rows={3}
                  placeholder="ระบุโรคประจำตัว (ถ้ามี)" 
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500" 
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">ยาที่ทานประจำ</span>
                <textarea 
                  value={medicalForm.medications} 
                  onChange={(e) => setMedicalForm({...medicalForm, medications: e.target.value})}
                  rows={3}
                  placeholder="ระบุชื่อยาและขนาดที่ใช้ประจำ" 
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500" 
                />
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setIsMedicalEditorOpen(false)} className="rounded-2xl bg-white border border-slate-200 px-6 py-3 font-bold text-slate-600 transition hover:bg-slate-100">
                ยกเลิก
              </button>
              <button 
                onClick={handleSaveMedicalInfo} 
                disabled={isSavingMedical}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#0095B6] px-8 py-3 font-bold text-white transition hover:bg-[#0084a1] disabled:opacity-60 shadow-lg shadow-cyan-600/20"
              >
                <Save size={18} />
                {isSavingMedical ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}