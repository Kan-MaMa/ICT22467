import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users } from "lucide-react";

export default function ElderlyDataTable() {
  const [elderlyList, setElderlyList] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "elderly"), orderBy("id", "asc"));
    return onSnapshot(q, (snapshot) => {
      setElderlyList(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* ปุ่มกดกลับไป Dashboard */}
      <button
        onClick={() => navigate("/dashboard")}
        className="group flex items-center gap-2 text-slate-400 transition-colors hover:text-cyan-600"
      >
        <ChevronLeft
          size={20}
          className="transition-transform group-hover:-translate-x-1"
        />
        <span className="font-medium">กลับหน้า Dashboard</span>
      </button>

      {/* Layout ตาราง */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-t-8 border-t-cyan-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              ฐานข้อมูลผู้สูงอายุ (Elderly)
            </h2>
            <p className="text-sm text-slate-500">
              ข้อมูลประวัติส่วนตัวและสุขภาพของผู้สูงอายุในระบบ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold">รหัส (ID)</th>
                <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                <th className="p-4 font-bold">อายุ</th>
                <th className="p-4 font-bold">รหัสสัญญาณชีพ</th>
                <th className="p-4 font-bold">ชีพจร</th>
                <th className="p-4 font-bold">อ๊อกซิเจนในเลือด</th>
                <th className="p-4 font-bold">ความดันโลหิต</th>
                <th className="p-4 font-bold">โรคประจำตัว</th>
                <th className="p-4 font-bold">ยาทานประจำ</th>
                <th className="p-4 font-bold">เวลาที่วัดค่า</th>
                <th className="p-4 font-bold">โรงพยาบาลใกล้เคียง</th>
              </tr>
            </thead>
            <tbody>
              {/* 🚨 เปลี่ยนจาก (person) => ( เป็น (person) => { ... return (...) } เพื่อให้เขียนโค้ดแปลงเวลาด้านในได้ */}
              {elderlyList.map((person) => {
                // 🚨 สร้างระบบแปลงเวลาให้เป็นข้อความ
                let timeString = "-";
                const timeData = person.lastVitalsUpdate || person.lastUpdated;

                if (timeData) {
                  // แปลง Firebase Timestamp ให้เป็น Date ปกติ
                  const d =
                    typeof timeData.toDate === "function"
                      ? timeData.toDate()
                      : new Date(
                          timeData.seconds ? timeData.seconds * 1000 : timeData,
                        );

                  // แปลงเป็นรูปแบบ: 17 เม.ย. 2569 14:30 น.
                  timeString =
                    d.toLocaleString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) + " น.";
                }

                return (
                  <tr
                    key={person.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-cyan-600">{person.id}</td>
                    <td className="p-4 font-bold text-slate-800">
                      {person.fullName}
                    </td>
                    <td className="p-4">{person.age || "-"}</td>
                    <td className="px-4 py-3">
                      {person.latest_vital_id ? (
                        <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-600 border border-cyan-100">
                          {person.latest_vital_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {person.heartRate &&
                      person.heartRate !== "--" &&
                      person.heartRate !== "-" ? (
                        <span className="font-bold text-rose-500">
                          {person.heartRate}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4">
                      {person.spo2 &&
                      person.spo2 !== "--" &&
                      person.spo2 !== "-" ? (
                        <span className="font-bold text-emerald-500">
                          {person.spo2}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4">{person.bloodPressure || "-"}</td>
                    <td className="p-4 align-top">
                      <div className="min-w-[150px] max-w-[250px] whitespace-normal break-words text-sm text-slate-600 leading-relaxed">
                        {person.medications || "-"}
                      </div>
                    </td>

                    {/* คอลัมน์ โรคประจำตัว */}
                    <td className="p-4 align-top">
                      <div className="min-w-[150px] max-w-[250px] whitespace-normal break-words text-sm text-slate-600 leading-relaxed">
                        {person.congenitalDisease || person.disease || "-"}
                      </div>
                    </td>

                    {/* 🚨 แสดงผลเวลาที่แปลงเสร็จแล้วตรงนี้ */}
                    <td className="p-4 text-xs font-medium text-slate-500 bg-slate-50/50 rounded-md">
                      {timeString}
                    </td>

                    <td className="p-4">{person.hospitalName || "-"}</td>
                  </tr>
                );
              })}

              {elderlyList.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    ไม่มีข้อมูลผู้สูงอายุในระบบ
                  </td>
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
