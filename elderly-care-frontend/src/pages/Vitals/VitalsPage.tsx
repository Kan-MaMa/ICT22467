import { useState, useEffect } from "react";
import mqtt from "mqtt";
import {
  Heart,
  Activity,
  Droplet,
  Save,
  Users,
  Loader2,
  LineChart as ChartIcon,
  X,
  UserCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LabelList,
} from "recharts";
import { collection, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

const MAX_DATA_POINTS = 10;

export default function VitalSignsPage() {
  const [elderlyList, setElderlyList] = useState<any[]>([]);
  const [selectedElderly, setSelectedElderly] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentVitals, setCurrentVitals] = useState({
    hr: "--",
    sys: "--",
    dia: "--",
    spo2: "--",
  });
  
  const [hrData, setHrData] = useState<any[]>([]);
  const [bpData, setBpData] = useState<any[]>([]);
  const [spo2Data, setSpo2Data] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "elderly"), orderBy("id", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setElderlyList(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedElderly) return;

    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt", {
      clientId: 'vitals_web_' + Math.random().toString(16).substr(2, 8),
    });

    client.on("connect", () => {
      setIsConnected(true);
      // ส่งคำสั่งเปลี่ยน ID ไปบอก Node-RED (ระบบ Smart Simulator)
      client.publish("simulator/set_id", selectedElderly.id);

      client.subscribe(`healthcare/heart/${selectedElderly.id}`);
      client.subscribe(`healthcare/bp/${selectedElderly.id}`);
      client.subscribe(`healthcare/spo2/${selectedElderly.id}`);
    });

    client.on("message", (topic, message) => {
      const payload = message.toString();
      const timeLabel = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (topic.includes("heart")) {
        const val = parseInt(payload);
        setCurrentVitals(prev => ({ ...prev, hr: val.toString() }));
        setHrData(prev => [...prev, { time: timeLabel, hr: val }].slice(-MAX_DATA_POINTS));
      } else if (topic.includes("spo2")) {
        const val = parseInt(payload);
        setCurrentVitals(prev => ({ ...prev, spo2: val.toString() }));
        setSpo2Data(prev => [...prev, { time: timeLabel, spo2: val }].slice(-MAX_DATA_POINTS));
      } else if (topic.includes("bp")) {
        const [sys, dia] = payload.split("/").map(Number);
        setCurrentVitals(prev => ({ ...prev, sys: sys.toString(), dia: dia.toString() }));
        setBpData(prev => [...prev, { time: timeLabel, sys, dia }].slice(-MAX_DATA_POINTS));
      }
    });

    return () => { client.end(); setIsConnected(false); };
  }, [selectedElderly?.id]);

  const handleSelectElderly = (person: any) => {
    setSelectedElderly(person);
    setCurrentVitals({ hr: "--", sys: "--", dia: "--", spo2: "--" });
    setHrData([]); setBpData([]); setSpo2Data([]);
    setIsModalOpen(false);
  };

  const handleSaveVitals = async () => {
    if (!selectedElderly || currentVitals.hr === "--") return;
    setIsSaving(true);
    try {
      const vitalsSnap = await getDocs(collection(db, "vitals"));
      let maxId = 0;
      vitalsSnap.forEach(d => {
        if (d.id.startsWith("V")) {
          const num = parseInt(d.id.replace("V", ""), 10);
          if (num > maxId) maxId = num;
        }
      });
      const newVitalId = `V${String(maxId + 1).padStart(3, "0")}`;

      await setDoc(doc(db, "vitals", newVitalId), {
        vital_id: newVitalId,
        elderly_id: selectedElderly.id,
        heart_rate: currentVitals.hr,
        spo2: currentVitals.spo2,
        blood_pressure: `${currentVitals.sys}/${currentVitals.dia}`,
        recorded_at: serverTimestamp()
      });

      await updateDoc(doc(db, "elderly", selectedElderly.id), {
        latest_vital_id: newVitalId,
        heartRate: currentVitals.hr,
        spo2: currentVitals.spo2,
        bloodPressure: `${currentVitals.sys}/${currentVitals.dia}`,
        lastVitalsUpdate: serverTimestamp()
      });
      alert(`✅ บันทึกรหัส ${newVitalId} สำเร็จ!`);
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* Header Section */}
      <section className="rounded-[32px] bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-900">Health Monitoring System</p>
            <h1 className="text-3xl font-bold mt-1">ข้อมูลสัญญาณชีพ</h1>
            {selectedElderly && (
              <div className="mt-2 flex items-center gap-2 text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full w-fit">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-sm font-bold">{selectedElderly.fullName} (ID: {selectedElderly.id})</span>
              </div>
            )}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-6 py-3 text-sm font-bold backdrop-blur-md transition-all border border-white/10">
            <Users size={18} /> เปลี่ยนคน
          </button>
        </div>
      </section>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${isConnected ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"}`}>
            {isConnected ? <Activity size={24} className="animate-pulse" /> : <Loader2 size={24} className="animate-spin" />}
          </div>
          <div>
            <p className="font-bold text-slate-800">{isConnected ? "เชื่อมต่ออุปกรณ์แล้ว" : "กำลังรอการเชื่อมต่อ..."}</p>
          </div>
        </div>
        <button onClick={handleSaveVitals} disabled={!selectedElderly || isSaving || currentVitals.hr === "--"} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40 shadow-lg shadow-emerald-600/20">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึกค่าลงระบบ
        </button>
      </div>

      {/* Big Value Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[40px] border-t-8 border-rose-500 bg-white p-8 shadow-sm flex flex-col items-center">
          <div className="p-4 bg-rose-50 text-rose-500 rounded-3xl mb-4"><Heart size={36} className={currentVitals.hr !== "--" ? "animate-pulse" : ""} /></div>
          <span className="text-slate-400 text-sm font-bold">อัตราการเต้นหัวใจ</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-5xl font-black text-slate-800">{currentVitals.hr}</h2>
            <span className="text-slate-400 font-bold">BPM</span>
          </div>
        </div>
        <div className="rounded-[40px] border-t-8 border-amber-500 bg-white p-8 shadow-sm flex flex-col items-center">
          <div className="p-4 bg-amber-50 text-amber-500 rounded-3xl mb-4"><Activity size={36} /></div>
          <span className="text-slate-400 text-sm font-bold">ความดันโลหิต</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-5xl font-black text-slate-800">{currentVitals.sys}/{currentVitals.dia}</h2>
            <span className="text-slate-400 font-bold">mmHg</span>
          </div>
        </div>
        <div className="rounded-[40px] border-t-8 border-emerald-500 bg-white p-8 shadow-sm flex flex-col items-center">
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-3xl mb-4"><Droplet size={36} /></div>
          <span className="text-slate-400 text-sm font-bold">ระดับออกซิเจนในเลือด</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h2 className="text-5xl font-black text-slate-800">{currentVitals.spo2}</h2>
            <span className="text-slate-400 font-bold">%</span>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 ml-2"><ChartIcon className="text-cyan-600" /> กราฟสัญญาณชีพ</h3>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {/* HR Area Chart */}
          <div className="rounded-[32px] bg-white p-6 shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Heart size={18} className="text-rose-500" /> อัตราการเต้นหัวใจ</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hrData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="hr" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorHr)" isAnimationActive={false}>
                    <LabelList dataKey="hr" position="top" offset={10} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#f43f5e' }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BP Area Chart */}
          <div className="rounded-[32px] bg-white p-6 shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Activity size={18} className="text-amber-500" /> ความดันโลหิต</h4>
            <div className="h-[320px] w-full"> 
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bpData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-45} textAnchor="end" height={50} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }} 
                  />

                  <Area 
                    type="monotone" 
                    dataKey="sys" 
                    name="ความดันบน (SYS)" 
                    stroke="#f59e0b" 
                    strokeWidth={4} 
                    fill="url(#colorSys)" 
                    isAnimationActive={false}
                  >
                     <LabelList dataKey="sys" position="top" style={{ fontSize: '11px', fill: '#d97706', fontWeight: 'bold' }} />
                  </Area>
                  
                  <Area 
                    type="monotone" 
                    dataKey="dia" 
                    name="ความดันล่าง (DIA)" 
                    stroke="#fbbf24" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    fill="transparent" 
                    isAnimationActive={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SpO2 Area Chart (Full Width or Grid) */}
          <div className="lg:col-span-2 rounded-[32px] bg-white p-6 shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Droplet size={18} className="text-emerald-500" /> ระดับออกซิเจนในเลือด (%)</h4>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spo2Data} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={[90, 100]} hide />
                  <Area type="stepAfter" dataKey="spo2" stroke="#10b981" strokeWidth={4} fill="url(#colorSpo2)" isAnimationActive={false}>
                    <LabelList dataKey="spo2" position="top" offset={10} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#059669' }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Selection */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mb-4"><Users size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-800">เลือกผู้สูงอายุ</h2>
              <p className="text-slate-500 text-sm">เลือกรายชื่อเพื่อเริ่มการตรวจวัดสัญญาณชีพ</p>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {elderlyList.map((person) => (
                <div key={person.id} onClick={() => handleSelectElderly(person)} className="flex items-center justify-between p-5 rounded-3xl border-2 border-slate-50 hover:border-cyan-500 hover:bg-cyan-50 cursor-pointer transition-all group">
                  <div className="flex items-center gap-4">
                    <UserCircle size={40} className="text-slate-300 group-hover:text-cyan-500" />
                    <div>
                      <p className="font-bold text-slate-800">{person.fullName}</p>
                      <p className="text-xs text-slate-400">ID: {person.id}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cyan-600 bg-white px-4 py-1.5 rounded-full shadow-sm">เลือก</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );
}