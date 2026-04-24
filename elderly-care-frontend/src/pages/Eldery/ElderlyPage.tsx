import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, getDocs, where, limit, serverTimestamp, documentId } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { UserCircle, Trash2, Edit2 } from "lucide-react"; 
import { calculateAge } from "../../unit/calculateAge";
import EditElderlyModal from "../../components/layout/EditEldery";

export default function ElderlyPage() {
  const navigate = useNavigate();
  const [elderlyList, setElderlyList] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "elderly"), orderBy(documentId(), "asc"));
    return onSnapshot(q, (snapshot) => {
      setElderlyList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // 🟢 ฟังก์ชันสำหรับเปิด Modal แก้ไข
  const handleEdit = (e: React.MouseEvent, person: any) => {
    e.stopPropagation(); // ป้องกันไม่ให้คลิกแล้วเด้งไปหน้าอื่น
    setSelectedPerson(person);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ "${name}"?`)) {
      await deleteDoc(doc(db, "elderly", id));
    }
  };

  

  const resetStatus = async (e: React.MouseEvent, id: string, fullName: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "elderly", id), { 
        isFallen: false,
        alertDispatchStatus: "resolved",
        updatedAt: serverTimestamp()
      });

      const q = query(
        collection(db, "emergency_logs"), 
        where("elderlyId", "==", id), 
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // นำข้อมูลมาเรียงลำดับหาตัวล่าสุดด้วย JavaScript แทน
        const logs = snap.docs.map(d => ({ ref: d.ref, data: d.data() }));
        logs.sort((a, b) => {
          const timeA = a.data.timestamp?.toMillis() || 0;
          const timeB = b.data.timestamp?.toMillis() || 0;
          return timeB - timeA; // เรียงจากใหม่ไปเก่า
        });

        const latestLog = logs[0];
        const currentStatus = latestLog.data.status || "";

        // อัปเดตสถานะ Log เป็นปลอดภัยแล้ว
        if (
          currentStatus.includes("รอดำเนินการ") || 
          currentStatus.includes("กำลังช่วยเหลือ") || 
          currentStatus.includes("เหตุจำลอง") ||
          currentStatus.includes("ผิดปกติ")
        ) {
          await updateDoc(latestLog.ref, {
            status: "ปลอดภัยแล้ว",
            updatedAt: serverTimestamp(),
            resolvedAt: serverTimestamp()
          });
        }
      }

      alert("อัปเดตสถานะปลอดภัยเรียบร้อยแล้ว ✅");
    } catch (err) { 
      console.error("Reset status error:", err); 
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">รายชื่อผู้สูงอายุ</h1>
        <p className="mt-2 opacity-90">จัดการข้อมูลและติดตามสถานะความปลอดภัย</p>
        <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/elderly-table')} 
          className="bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-2 px-4 rounded-xl backdrop-blur-sm transition-all"
        >
          📄 ดูข้อมูลแบบตาราง
        </button>

        <button 
            onClick={() => navigate('/caregiver-table')} 
            className="bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-2 px-4 rounded-xl backdrop-blur-sm transition-all"
          >
            📄 ตารางผู้ดูแล
          </button>
          </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {elderlyList.map((person) => {
          const isFallen = person.isFallen === true;
          return (
            <div key={person.id} className={`group relative rounded-[32px] border bg-white p-6 shadow-sm transition-all hover:shadow-md ${isFallen ? "border-rose-500 ring-4 ring-rose-100" : "border-slate-200"}`}>
              
              <button 
                onClick={(e) => handleDelete(e, person.id, person.fullName)} 
                className="absolute top-6 right-20 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                title="ลบข้อมูล"
              >
                <Trash2 size={18} />
              </button>

              <button 
                onClick={(e) => handleEdit(e, person)} 
                className="absolute top-6 right-28 p-2 text-slate-300 hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all"
                title="แก้ไขข้อมูล"
              >
                <Edit2 size={18} />
              </button>

              <div className="absolute top-6 right-6">
                {isFallen ? <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">ล้ม!</span> : <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">ปกติ</span>}
              </div>

              <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{person.fullName}</h3>
                  <p className="text-slate-500 font-medium">
                    <span className="text-cyan-600 font-bold mr-2">[{person.id}]</span>
                    อายุ {person.birthDate ? calculateAge(person.birthDate) : "--"} ปี
                  </p>
                </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => navigate(`/elderly/${person.id}`)} className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">รายละเอียด</button>
                {isFallen && <button onClick={(e) => resetStatus(e, person.id, person.fullName)} className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg">ช่วยเหลือแล้ว</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🟢 เรียกใช้ Modal แก้ไขข้อมูล */}
      {selectedPerson && (
        <EditElderlyModal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPerson(null);
          }} 
          personData={selectedPerson} 
        />
      )}
    </div>
  );
}