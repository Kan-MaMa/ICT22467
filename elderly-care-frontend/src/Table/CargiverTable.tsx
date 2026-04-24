import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, UserCircle2 } from "lucide-react";
import { calculateAge } from "../unit/calculateAge";

export default function CaregiverTablePage() {
  const [caregiverList, setCaregiverList] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "caregivers"));
    return onSnapshot(q, (snapshot) => {
      setCaregiverList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <button
        onClick={() => navigate("/dashboard")}
        className="group flex items-center gap-2 text-slate-400 transition-colors hover:text-emerald-600"
      >
        <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
        <span className="font-medium">กลับไปหน้า Dashboard</span>
      </button>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-t-8 border-t-emerald-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <UserCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">ฐานข้อมูลผู้ดูแล (Caregivers)</h2>
            <p className="text-sm text-slate-500">ข้อมูลการติดต่อและความสัมพันธ์ของญาติผู้ดูแล</p>
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-2xl border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold">รหัสผู้ดูแล</th>
                <th className="p-4 font-bold">ดูแลผู้สูงอายุ (ID)</th> 
                <th className="p-4 font-bold">คำนำหน้า</th>
                <th className="p-4 font-bold">ชื่อผู้ดูแล</th>
                <th className="p-4 font-bold">อายุ</th>
                <th className="p-4 font-bold">ความสัมพันธ์</th>
                <th className="p-4 font-bold">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>
              {caregiverList.length > 0 ? (
                caregiverList.map((person) => (
                  <tr key={person.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-emerald-600">{person.caregiverId || person.id}</td>
                    
                    <td className="p-4 font-bold text-cyan-600 max-w-[200px]">
                      {(() => {
                        const rawId = person.elderlyId || person.elderly_id;
                        // ถ้าไม่มีข้อมูล ให้โชว์ขีด
                        if (!rawId || rawId.length === 0) return <span className="text-slate-300">-</span>;
                        
                       
                        const idList = Array.isArray(rawId) ? rawId : String(rawId).split(",").map(s => s.trim());
                        
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {idList.map((id: string, index: number) => (
                              <span key={index} className="bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-100 text-[11px] tracking-wider">
                                {id}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="p-4">{person.title || person.prefix || "-"}</td>
                    <td className="p-4 font-bold text-slate-800">{person.fullName || person.care_name || "-"}</td>
                    <td className="p-4">
                      {person.birthDate ? (
                        <span className="font-bold text-slate-700">{calculateAge(person.birthDate)}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const rawId = person.elderlyId || person.elderly_id;
                        if (!rawId || rawId.length === 0) return <span className="text-slate-300">-</span>;
                        const idList = Array.isArray(rawId) ? rawId : String(rawId).split(",").map(s => s.trim());
                        
                        return (
                          <div className="flex flex-col gap-1.5">
                            {idList.map((id: string, index: number) => {

                              const rel = person.relationMap?.[id] || person.relationship || person.relation || "-";
                              return (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">{id}</span>
                                  <span className="text-xs font-medium text-slate-600">{rel}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </td>
                    
                    <td className="p-4 font-medium">{person.phone || person.care_phone || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">ไม่มีข้อมูลผู้ดูแลในระบบ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}