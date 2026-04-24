import { useState, useEffect } from "react";
import { 
  collection, doc, setDoc, updateDoc, getDocs, onSnapshot, 
  serverTimestamp, query, orderBy, arrayUnion
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { X, Users, Heart } from "lucide-react"; 

type Props = {
  isOpen: boolean;
  onClose: () => void;
  elderlyId?: string; 
};

export default function AddCaregiverModal({ isOpen, onClose, elderlyId }: Props) {
  const [allCaregivers, setAllCaregivers] = useState<any[]>([]);
  const [elderlyList, setElderlyList] = useState<any[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"select" | "new">("select");

  const [formData, setFormData] = useState({
    targetElderlyId: elderlyId || "", 
    caregiverId: "", 
    title: "นาย",
    fullName: "",
    relationship: "บุตร",
    phone: "",
    birthDate: "",
  });

  // 🚨 สร้างตัวแปรเก็บวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD เพื่อเอาไปล็อคปฏิทิน
  const d = new Date();
  const maxDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (isOpen) {
      const unsubCg = onSnapshot(query(collection(db, "caregivers"), orderBy("id", "asc")), (snapshot) => {
        setAllCaregivers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      if (!elderlyId) {
        const unsubElderly = onSnapshot(query(collection(db, "elderly"), orderBy("fullName", "asc")), (snapshot) => {
          setElderlyList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubCg(); unsubElderly(); };
      }

      setFormData(prev => ({ ...prev, targetElderlyId: elderlyId || "" }));
      return () => unsubCg();
    }
  }, [isOpen, elderlyId]);

  const findNextAvailableCgId = async () => {
    const cgRef = collection(db, "caregivers");
    const snap = await getDocs(cgRef);
    const ids = snap.docs.map(d => d.id).filter(i => i.startsWith("C")).map(i => parseInt(i.replace("C", ""), 10));
    ids.sort((a, b) => a - b);
    let next = 1;
    for (let i of ids) { if (i === next) next++; else if (i > next) break; }
    return `C${String(next).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalElderlyId = formData.targetElderlyId; 

    if (!finalElderlyId) {
      alert("กรุณาเลือกผู้สูงอายุที่จะผูกข้อมูลด้วยครับ");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "select") {
        if (!formData.caregiverId) throw new Error("กรุณาเลือกผู้ดูแล");
        
        const cgRef = doc(db, "caregivers", formData.caregiverId);
        await updateDoc(cgRef, {
          elderlyId: arrayUnion(finalElderlyId),
          [`relationMap.${finalElderlyId}`]: formData.relationship, 
          lastUpdated: serverTimestamp()
        });

      } else {
        const finalCgId = await findNextAvailableCgId();
        await setDoc(doc(db, "caregivers", finalCgId), {
          id: finalCgId,
          caregiverId: finalCgId, 
          title: formData.title,
          fullName: formData.fullName,
          phone: formData.phone,
          birthDate: formData.birthDate,
          
          elderlyId: [finalElderlyId], 
          relationMap: {
            [finalElderlyId]: formData.relationship 
          },
          
          createdAt: serverTimestamp(),
        });
      }
      
      alert("บันทึกข้อมูลเรียบร้อย ✅");
      
      setFormData({
        targetElderlyId: elderlyId || "", 
        caregiverId: "", title: "นาย", fullName: "", relationship: "บุตร", phone: "", birthDate: "",
      });
      onClose();

    } catch (error: any) {
      console.error("Error saving caregiver:", error);
      alert(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-[#0095B6] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <h2 className="text-xl font-bold">จัดการข้อมูลผู้ดูแล</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b">
          <button type="button" onClick={() => setMode("select")} className={`flex-1 py-4 font-bold transition-all ${mode === 'select' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}>เลือกคนเดิมที่มีอยู่</button>
          <button type="button" onClick={() => setMode("new")} className={`flex-1 py-4 font-bold transition-all ${mode === 'new' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}>เพิ่มคนใหม่เข้าระบบ</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {!elderlyId && (
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                <Heart size={16} className="text-rose-500" /> ผูกกับผู้สูงอายุคนใด?
              </label>
              <select 
                required
                className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500 bg-rose-50 cursor-pointer"
                value={formData.targetElderlyId}
                onChange={(e) => setFormData({...formData, targetElderlyId: e.target.value})}
              >
                <option value="">-- กรุณาเลือกผู้สูงอายุ --</option>
                {elderlyList.map(e => (
                  <option key={e.id} value={e.id}>{e.fullName} ({e.id})</option>
                ))}
              </select>
            </div>
          )}

          {mode === "select" ? (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600">รายชื่อผู้ดูแลในระบบ</label>
              <select 
                required
                className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500 bg-slate-50 cursor-pointer"
                value={formData.caregiverId}
                onChange={(e) => setFormData({...formData, caregiverId: e.target.value})}
              >
                <option value="">-- เลือกผู้ดูแล --</option>
                {allCaregivers.map(cg => (
                  <option key={cg.id} value={cg.id}>{cg.fullName} ({cg.id})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500 cursor-pointer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                    <option value="นาย">นาย</option><option value="นาง">นาง</option><option value="นางสาว">นางสาว</option>
                  </select>
                  <input type="text" required placeholder="ชื่อ-นามสกุล" className="md:col-span-2 rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="tel" required placeholder="เบอร์โทรศัพท์" className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  
                  {/* 🚨 max={maxDate} เพื่อบล็อกไม่ให้เลือกวันที่ในอนาคต */}
                  <input 
                    type="date" 
                    required 
                    max={maxDate} 
                    className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500" 
                    value={formData.birthDate} 
                    onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                  />
               </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-sm font-bold text-slate-600">ความสัมพันธ์กับผู้สูงอายุคนนี้</label>
            <select 
              className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-cyan-500 cursor-pointer"
              value={formData.relationship}
              onChange={(e) => setFormData({...formData, relationship: e.target.value})}
            >
              <option value="บุตร">บุตร</option>
              <option value="หลาน">หลาน</option>
              <option value="สามี/ภรรยา">สามี/ภรรยา</option>
              <option value="พี่น้อง">พี่น้อง</option>
              <option value="พยาบาล/ผู้ดูแล">พยาบาล/ผู้ดูแล</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">ยกเลิก</button>
            <button type="submit" disabled={isSubmitting} className={`flex-1 py-4 text-white font-bold rounded-2xl shadow-lg transition-all ${isSubmitting ? "bg-slate-300" : "bg-[#0095B6] hover:bg-[#0084a1]"}`}>
              {isSubmitting ? "กำลังบันทึก..." : "ยืนยันข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}