import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddElderlyModal from "./../../components/layout/Topbar"; 
import AddCaregiverModal from "../../components/layout/AddCaregiverModal";
import {
  collection, onSnapshot, query, where, orderBy, limit, Timestamp
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { 
  AlertCircle, Clock, X, Info, ChevronDown, 
  Activity, Heart, Droplet, Users, BellRing, CalendarClock 
} from "lucide-react"; 

// --- Components ย่อย: กล่องสถิติด้านบน ---
type StatCardProps = {
  title: string; value: string; description: string; 
  borderClass: string; iconClass: string; icon: React.ReactNode; 
  onClick?: () => void;
};
function StatCard({ title, value, description, borderClass, iconClass, icon, onClick }: StatCardProps) {
  return (
    <div onClick={onClick} className={`rounded-[28px] border border-slate-100 border-t-8 ${borderClass} bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md cursor-pointer group flex flex-col h-full`}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl bg-slate-50 ${iconClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <p className="text-sm font-bold text-slate-500 mt-4 group-hover:text-slate-700 transition-colors">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 mt-1">{value}</h3>
      <p className="mt-2 text-xs font-medium text-slate-400 mt-auto">{description}</p>
    </div>
  );
}

// --- ฟังก์ชันกำหนดสีตามสถานะ ---
const getStatusTheme = (status: string) => {
  if (status.includes("รอดำเนินการ")) {
    return {
      bg: "bg-rose-50/80", text: "text-rose-600", border: "border-rose-200",
      iconBg: "bg-rose-100", iconText: "text-rose-600", label: "Emergency", badgeBg: "bg-rose-100"
    };
  }
  if (status.includes("กำลังช่วยเหลือ")) {
    return {
      bg: "bg-amber-50/80", text: "text-amber-600", border: "border-amber-200",
      iconBg: "bg-amber-100", iconText: "text-amber-600", label: "In Progress", badgeBg: "bg-amber-100"
    };
  }
  return {
    bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-200",
    iconBg: "bg-emerald-100", iconText: "text-emerald-600", label: "Resolved", badgeBg: "bg-emerald-100"
  };
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  
  const [elderlyList, setElderlyList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isElderlyModalOpen, setIsElderlyModalOpen] = useState(false);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);

  // ดึงข้อมูลจาก Firebase
  useEffect(() => {
    const unsubElderly = onSnapshot(collection(db, "elderly"), (snapshot) => {
      setElderlyList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLatest = query(collection(db, "emergency_logs"), orderBy("timestamp", "desc"), limit(10));
    const unsubLatest = onSnapshot(qLatest, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(startOfToday);
    const qToday = query(collection(db, "emergency_logs"), where("timestamp", ">=", todayTimestamp), orderBy("timestamp", "desc"));
    const unsubToday = onSnapshot(qToday, (snapshot) => {
      setTodayEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubElderly(); unsubLatest(); unsubToday(); };
  }, []);

  const fallenCount = elderlyList.filter(e => e.isFallen === true).length;

  // 🚨 ตัวกรองผู้ที่วัดสัญญาณชีพในวันนี้ (แยกจากการแก้ไขประวัติส่วนตัว)
  const measuredTodayList = elderlyList.filter(person => {
    // ต้องมีฟิลด์ lastVitalsUpdate และมีค่าสัญญาณชีพ
    if (!person.lastVitalsUpdate) return false;
    if (!person.heartRate || person.heartRate === "-" || person.heartRate === "--") return false;

    try {
      let updatedDate;
      if (typeof person.lastVitalsUpdate.toDate === 'function') {
        updatedDate = person.lastVitalsUpdate.toDate();
      } else if (person.lastVitalsUpdate.seconds) {
        updatedDate = new Date(person.lastVitalsUpdate.seconds * 1000);
      } else {
        updatedDate = new Date(person.lastVitalsUpdate);
      }

      // เช็คว่าเป็นของวันนี้หรือไม่ (ตั้งแต่ 00.00 ถึง 23.59)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      return updatedDate >= startOfToday && updatedDate <= endOfToday;
    } catch (error) {
      return false;
    }
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header & เพิ่มข้อมูล */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Overview</p>
          <h1 className="text-2xl font-bold text-slate-900">Elderly Care Dashboard</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="rounded-lg bg-[#0095B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#0084a1] flex items-center gap-2 transition-all shadow-sm"
          >
            เพิ่มข้อมูล <ChevronDown size={16} className={`transition-transform duration-200 ${isAddMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isAddMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => { setIsElderlyModalOpen(true); setIsAddMenuOpen(false); }}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 text-sm font-bold text-slate-700 border-b border-slate-50 transition-colors flex items-center gap-2"
              >
                👴 ลงทะเบียนผู้สูงอายุ
              </button>
              <button
                onClick={() => { setIsCaregiverModalOpen(true); setIsAddMenuOpen(false); }}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors flex items-center gap-2"
              >
                👥 เพิ่มข้อมูลผู้ดูแล
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <section className="rounded-[28px] bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-lg md:p-8">
        <h1 className="text-3xl font-bold md:text-4xl font-display">ระบบดูแลผู้สูงอายุ</h1>
        <p className="mt-3 text-cyan-50">ติดตามข้อมูลสุขภาพและการแจ้งเตือนเหตุฉุกเฉินแบบเรียลไทม์</p>
      </section>

      {/* สถิติ 3 กล่อง */}
      <section className="grid gap-5 md:grid-cols-3">
        <StatCard 
          title="ผู้สูงอายุในระบบ" value={`${elderlyList.length} คน`} description="ที่ลงทะเบียนใช้งาน" 
          borderClass="border-cyan-500" iconClass="text-cyan-600 bg-cyan-50" icon={<Users size={24} />} 
          onClick={() => navigate("/elderly")} 
        />
        <StatCard 
          title="สถานะฉุกเฉินปัจจุบัน" value={`${fallenCount} เคส`} description="ต้องการความช่วยเหลือทันที" 
          borderClass="border-rose-500" iconClass="text-rose-600 bg-rose-50" icon={<BellRing size={24} />} 
        />
        <StatCard 
          title="เหตุการณ์วันนี้" value={`${todayEvents.length} เคส`} description="ประวัติการแจ้งเตือนวันนี้" 
          borderClass="border-indigo-500" iconClass="text-indigo-600 bg-indigo-50" icon={<CalendarClock size={24} />} 
          onClick={() => setIsEventsModalOpen(true)} 
        />
      </section>

      {/* 2 กล่องหลักด้านล่าง */}
      <section className="grid gap-6 xl:grid-cols-2">
        
        {/* 🚨 กล่องซ้าย: เช็คการวัดสัญญาณชีพวันนี้ */}
        <div className="rounded-[28px] border border-slate-100 border-t-8 border-t-amber-500 bg-white p-6 shadow-sm flex flex-col h-[520px]">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
              <Activity className="text-amber-500" /> วันนี้มีใครวัดสัญญาณชีพยังน้าาา
            </h2>
            <p className="text-xs text-slate-500 mt-1">รีเซ็ตข้อมูลทุก 00.00 น.</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {measuredTodayList.length > 0 ? (
              measuredTodayList.map(person => {
                // แปลงเวลาสำหรับแสดงใน Badge
                let timeString = "";
                if (person.lastVitalsUpdate) {
                  const d = typeof person.lastVitalsUpdate.toDate === 'function' 
                    ? person.lastVitalsUpdate.toDate() 
                    : new Date(person.lastVitalsUpdate.seconds ? person.lastVitalsUpdate.seconds * 1000 : person.lastVitalsUpdate);
                  timeString = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                }

                return (
                  <div key={person.id} className="group relative flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-amber-200 transition-all shadow-sm hover:shadow-md overflow-hidden cursor-default">
                    <div className="transition-transform group-hover:-translate-x-1">
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="text-amber-600">{person.id}</span> {person.fullName}
                        {/* ป้ายบอกเวลาแบบมินิมอล */}
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full ml-1">
                          <Clock size={12} /> {timeString} น.
                        </span>
                      </p>
                      <div className="flex gap-4 mt-2 text-[13px] font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Heart size={14} className="text-rose-500"/> {person.heartRate}</span>
                        <span className="flex items-center gap-1"><Droplet size={14} className="text-emerald-500"/> {person.spo2}</span>
                        <span className="flex items-center gap-1"><Activity size={14} className="text-blue-500"/> {person.bloodPressure}</span>
                      </div>
                    </div>

                    <div className="absolute right-4 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/elderly/${person.id}`); }}
                        className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl shadow-md hover:bg-amber-600 transition-colors"
                      >
                        ดูประวัติ
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <Activity size={32} />
                </div>
                <div>
                  <p className="text-slate-500 font-bold">ยังไม่มีใครวัดสัญญาณชีพวันนี้เลย</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🚨 กล่องขวา: เหตุฉุกเฉินล่าสุด */}
        <div className="rounded-[28px] border border-slate-100 border-t-8 border-t-rose-500 bg-white p-6 shadow-sm flex flex-col h-[520px]">
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                <AlertCircle className="text-rose-500" /> เหตุฉุกเฉินล่าสุด
              </h2>
              <p className="text-xs text-slate-500 mt-1">อัปเดตแบบเรียลไทม์</p>
            </div>
            
            <button
              onClick={() => navigate('/emergency-table')}
              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              📄 ดูตาราง
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {alerts.length > 0 ? (
              alerts.map((alert) => {
                const theme = getStatusTheme(alert.status || "");
                const isPending = alert.status?.includes("รอดำเนินการ");

                return (
                  <div key={alert.id} className={`group relative p-5 rounded-2xl border border-slate-100 hover:border-transparent transition-all shadow-sm hover:shadow-md ${theme.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${theme.iconBg} ${theme.iconText}`}>
                        {theme.label}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {alert.timestamp?.toDate().toLocaleTimeString('th-TH')} น.
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`text-lg font-bold ${isPending ? 'text-rose-900' : 'text-slate-800'}`}>
                            {alert.fullName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            สถานะ: <span className={`font-bold px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.text}`}>{alert.status}</span>
                          </p>
                        </div>
                      </div>

                      <button
                         onClick={() => navigate(`/elderly/${alert.elderlyId}`)}
                         className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                           isPending
                             ? 'bg-rose-600 text-white shadow-md shadow-rose-200 hover:bg-rose-700 hover:-translate-y-0.5'
                             : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:-translate-y-0.5'
                         }`}
                      >
                        ตรวจสอบข้อมูล
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <AlertCircle size={32} />
                </div>
                <p className="text-slate-500 font-bold">สงบสุขดี ยังไม่มีประวัติการแจ้งเตือน</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* สไตล์ของ Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* Modal สรุปเหตุการณ์วันนี้ */}
      {isEventsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 text-white p-2 rounded-xl shadow-sm"><CalendarClock size={24}/></div>
                <h2 className="text-xl font-bold text-slate-800 font-display">สรุปเหตุการณ์วันนี้</h2>
              </div>
              <button onClick={() => setIsEventsModalOpen(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto space-y-3 font-sans custom-scrollbar">
              {todayEvents.length > 0 ? todayEvents.map((event) => {
                const theme = getStatusTheme(event.status || "");

                return (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${theme.iconBg} ${theme.iconText}`}>
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{event.fullName}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{event.timestamp?.toDate().toLocaleTimeString('th-TH')} น.</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${theme.badgeBg} ${theme.text}`}>
                      {event.status}
                    </span>
                  </div>
                );
              }) : <div className="text-center py-10 text-slate-400 font-medium">ไม่มีเหตุการณ์ผิดปกติในวันนี้ 🎉</div>}
            </div>
            
            <div className="p-5 bg-white border-t border-slate-100 text-center">
              <button onClick={() => setIsEventsModalOpen(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* เรียกใช้งาน Modals */}
      <AddElderlyModal isOpen={isElderlyModalOpen} onClose={() => setIsElderlyModalOpen(false)} />
      <AddCaregiverModal isOpen={isCaregiverModalOpen} onClose={() => setIsCaregiverModalOpen(false)} />
    </div>
  );
}
