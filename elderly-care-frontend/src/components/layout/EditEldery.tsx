import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { X, Save, MapPin, Navigation } from "lucide-react"; // เพิ่ม Icon

type Props = {
  isOpen: boolean;
  onClose: () => void;
  personData: any;
};

const LONGDO_API_KEY = "1afa8f91fa27973c6bff0322201a437e";

export default function EditElderlyModal({ isOpen, onClose, personData }: Props) {
  const [formData, setFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDisease, setHasDisease] = useState("no");
  const [hasMedication, setHasMedication] = useState("no");

  useEffect(() => {
    if (personData) {
      setFormData({
        title: personData.title || "นาย",
        firstName: personData.firstName || "",
        lastName: personData.lastName || "",
        birthDate: personData.birthDate || "",
        gender: personData.gender || "ชาย",
        address: personData.address || "", // 🚨 เพิ่มที่อยู่
        currentLat: personData.currentLat || 0, // 🚨 เพิ่มพิกัด Lat
        currentLng: personData.currentLng || 0, // 🚨 เพิ่มพิกัด Lng
        diseaseDetails: personData.congenitalDisease === "ไม่มี" ? "" : personData.congenitalDisease,
        medicationDetails: personData.medications === "ไม่มี" ? "" : personData.medications,
      });

      setHasDisease(personData.congenitalDisease !== "ไม่มี" ? "yes" : "no");
      setHasMedication(personData.medications !== "ไม่มี" ? "yes" : "no");
    }
  }, [personData]);

  // 🚨 ฟังก์ชันดึงพิกัดปัจจุบันสำหรับการแก้ไข
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData({
          ...formData,
          currentLat: position.coords.latitude,
          currentLng: position.coords.longitude,
        });
        alert("✅ อัปเดตพิกัดปัจจุบันสำเร็จ!");
      });
    } else {
      alert("เบราว์เซอร์ไม่รองรับการดึงพิกัด");
    }
  };

  // 🚨 ฟังก์ชันแปลงที่อยู่เป็นพิกัด (กรณีผู้ใช้พิมพ์ที่อยู่ใหม่แต่ไม่ได้กดดึงพิกัดปัจจุบัน)
  const getCoordsFromAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(address)}&limit=1&key=${LONGDO_API_KEY}`
      );
      const result = await response.json();
      if (result?.data?.length > 0) {
        return { lat: parseFloat(result.data[0].lat), lng: parseFloat(result.data[0].lon) };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  if (!isOpen || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalLat = formData.currentLat;
      let finalLng = formData.currentLng;

      // ถ้ามีการเปลี่ยนที่อยู่ แต่พิกัดยังเป็น 0 หรือต้องการความแม่นยำ
      // ให้ลองเช็คพิกัดจากที่อยู่อีกรอบ (ถ้าไม่ได้กดปุ่มดึงพิกัดปัจจุบัน)
      if (finalLat === 0 || formData.address !== personData.address) {
         const coords = await getCoordsFromAddress(formData.address);
         if (coords) {
           finalLat = coords.lat;
           finalLng = coords.lng;
         }
      }

      const docRef = doc(db, "elderly", personData.id);
      await updateDoc(docRef, {
        fullName: `${formData.title}${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        title: formData.title,
        birthDate: formData.birthDate,
        gender: formData.gender,
        address: formData.address,
        currentLat: finalLat,      
        currentLng: finalLng,      
        congenitalDisease: hasDisease === "yes" ? formData.diseaseDetails : "ไม่มี",
        medications: hasMedication === "yes" ? formData.medicationDetails : "ไม่มี",
      });

      alert("อัปเดตข้อมูลสำเร็จ! ✅");
      onClose();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto border-t-8 border-cyan-500">
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">แก้ไขข้อมูลผู้สูงอายุ</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ส่วนชื่อ-นามสกุล */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-bold text-slate-400 uppercase">คำนำหน้า</label>
              <select className="mt-1 w-full rounded-xl border p-3 outline-none focus:border-cyan-500"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                <option value="นาย">นาย</option><option value="นาง">นาง</option><option value="นางสาว">นางสาว</option>
              </select>
            </div>
            <div className="md:col-span-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">ชื่อ</label>
              <input className="mt-1 w-full rounded-xl border p-3 focus:border-cyan-500"
                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="md:col-span-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">นามสกุล</label>
              <input className="mt-1 w-full rounded-xl border p-3 focus:border-cyan-500"
                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">วันเกิด</label>
              <input type="date" className="mt-1 w-full rounded-xl border p-3"
                value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">เพศ</label>
              <select className="mt-1 w-full rounded-xl border p-3"
                value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* ส่วนโรคประจำตัวและยา (เหมือนเดิม) */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-sm font-bold text-slate-700 block mb-3">มีโรคประจำตัวหรือไม่?</label>
                <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={hasDisease === "no"} onChange={() => setHasDisease("no")} /> ไม่มี
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={hasDisease === "yes"} onChange={() => setHasDisease("yes")} /> มี
                </label>
                </div>
                {hasDisease === "yes" && (
                <input type="text" placeholder="ระบุโรคประจำตัว" className="w-full border p-3 rounded-xl bg-white outline-none focus:border-cyan-500"
                    value={formData.diseaseDetails} onChange={e => setFormData({...formData, diseaseDetails: e.target.value})} />
                )}
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-sm font-bold text-slate-700 block mb-3">มียาที่ต้องทานประจำหรือไม่?</label>
                <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={hasMedication === "no"} onChange={() => setHasMedication("no")} /> ไม่มี
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={hasMedication === "yes"} onChange={() => setHasMedication("yes")} /> มี
                </label>
                </div>
                {hasMedication === "yes" && (
                <textarea placeholder="ระบุชื่อยาและวิธีทาน" className="w-full border p-3 rounded-xl bg-white outline-none focus:border-cyan-500 min-h-[80px]"
                    value={formData.medicationDetails} onChange={e => setFormData({...formData, medicationDetails: e.target.value})} />
                )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600">ยกเลิก</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 rounded-2xl bg-cyan-600 py-4 font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:bg-cyan-700 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={20} /> {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}