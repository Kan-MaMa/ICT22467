import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase"; 
import { useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export default function EmergencyTablePage() {
  const [emergencyList, setEmergencyList] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // ดึงข้อมูลจากคอลเลกชัน emergency_logs เรียงจากเหตุการณ์ล่าสุดไปเก่าสุด
    const q = query(
      collection(db, "emergency_logs"),
      orderBy("timestamp", "desc"),
    );
    return onSnapshot(q, (snapshot) => {
      setEmergencyList(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* ปุ่มกดกลับ */}
      <button
        onClick={() => navigate("/dashboard")}
        className="group flex items-center gap-2 text-slate-400 transition-colors hover:text-rose-600"
      >
        <ChevronLeft
          size={20}
          className="transition-transform group-hover:-translate-x-1"
        />
        <span className="font-medium">กลับหน้า Dashboard</span>
      </button>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-t-8 border-t-rose-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              ตารางประวัติเหตุฉุกเฉิน (Emergency Logs)
            </h2>
            <p className="text-sm text-slate-500">
              บันทึกข้อมูลการล้มและการขอความช่วยเหลือทั้งหมด
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
              <tr>
                {/* คอลัมน์ */}
                <th className="p-4 font-bold">รหัสเหตุฉุกเฉิน </th>
                <th className="p-4 font-bold">รหัสผู้สูงอายุ </th>
                <th className="p-4 font-bold">เวลาที่ล้ม </th>
                <th className="p-4 font-bold">ระดับความรุนแรง </th>
                <th className="p-4 font-bold">สถานที่ </th>
                <th className="p-4 font-bold">สถานะการช่วยเหลือ </th>
              </tr>
            </thead>
            <tbody>
              {emergencyList.length > 0 ? (
                emergencyList.map((log) => {
                  // แปลงเวลา Timestamp
                  const timeString = log.timestamp
                    ? typeof log.timestamp.toDate === "function"
                      ? log.timestamp.toDate().toLocaleString("th-TH")
                      : new Date(log.timestamp.seconds * 1000).toLocaleString("th-TH")
                    : "-";

                  // จัดสีสถานะ
                  const statusColor = log.status?.includes("รอดำเนินการ")
                    ? "text-rose-600 bg-rose-50 border-rose-200"
                    : log.status?.includes("กำลังช่วยเหลือ")
                      ? "text-amber-600 bg-amber-50 border-amber-200"
                      : "text-emerald-600 bg-emerald-50 border-emerald-200";

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      {/* 1. คอลัมน์รหัสเหตุฉุกเฉิน (EM001) */}
                      <td className="p-4">
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 border border-rose-100 shadow-sm">
                          {log.emergency_id || log.id}
                        </span>
                      </td>

                      {/* 2. คอลัมน์รหัสผู้สูงอายุ */}
                      <td className="p-4 font-bold text-slate-700">
                        {log.elderlyId || "-"}
                      </td>

                      {/* 3. คอลัมน์เวลา */}
                      <td className="p-4 font-medium text-slate-600">
                        {timeString}
                      </td>

                      {/* 4. คอลัมน์ความรุนแรง */}
                      <td className="p-4">
                        <span
                          className={`font-bold ${log.severity === "อันตราย" ? "text-rose-600" : log.severity === "กลาง" ? "text-amber-500" : "text-blue-500"}`}
                        >
                          {log.severity || "-"}
                        </span>
                      </td>

                      {/* 5. คอลัมน์พิกัด */}
                      <td className="p-4 text-xs font-mono text-slate-400">
                        {log.zoneName || "ไม่ระบุพิกัด"}
                      </td>

                      {/* 6. คอลัมน์สถานะ */}
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}
                        >
                          {log.status || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6} // 🚨 แก้เป็น 6 คอลัมน์ให้ตรงกับ header
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    ไม่มีประวัติเหตุฉุกเฉินในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}