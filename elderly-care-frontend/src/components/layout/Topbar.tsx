import { useState } from "react";
import {
  serverTimestamp,
  doc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { X, UserPlus, HeartPulse, Pill, Calendar } from "lucide-react"; // 🚨 เอา MapPin ออกแล้ว

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const today = new Date().toISOString().split("T")[0];

// --- ฟังก์ชันช่วย: คำนวณอายุจาก วัน/เดือน/ปี เกิด ---
const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) age--;
  return age;
};

// --- ฟังก์ชันค้นหา ID ผู้สูงอายุที่ว่าง (E001, E002, ...) ---
const findNextAvailableId = async () => {
  const elderlyRef = collection(db, "elderly");
  const querySnapshot = await getDocs(elderlyRef);

  const existingIds = querySnapshot.docs.map((doc) => {
    return parseInt(doc.id.replace("E", ""), 10);
  });

  existingIds.sort((a, b) => a - b);

  let nextIdNum = 1;
  for (let i = 0; i < existingIds.length; i++) {
    if (existingIds[i] === nextIdNum) {
      nextIdNum++;
    } else if (existingIds[i] > nextIdNum) {
      break;
    }
  }

  return `E${String(nextIdNum).padStart(3, "0")}`;
};

export default function AddElderlyModal({ isOpen, onClose }: Props) {
  // 🚨 ถอด address ออกจาก State แล้ว
  const [formData, setFormData] = useState({
    title: "นาย",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "ชาย",
    hasDisease: "no",
    diseaseDetails: "",
    hasMedication: "no",
    medicationDetails: "",
    emergencyNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const customId = await findNextAvailableId();

      const dataToSave = {
        id: customId,
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.title}${formData.firstName} ${formData.lastName}`,
        birthDate: formData.birthDate,
        age: calculateAge(formData.birthDate),
        gender: formData.gender,
        currentLat: 0,
        currentLng: 0,
        congenitalDisease:
          formData.hasDisease === "yes" ? formData.diseaseDetails : "ไม่มี",
        medications:
          formData.hasMedication === "yes"
            ? formData.medicationDetails
            : "ไม่มี",
        isFallen: false,
        createdAt: serverTimestamp(),
        emergencyNotes: formData.emergencyNotes,
      };

      await setDoc(doc(db, "elderly", customId), dataToSave);

      alert(`ลงทะเบียนผู้สูงอายุสำเร็จ! ✅ ใช้รหัส: ${customId}`);
      onClose();

      // ล้างข้อมูลฟอร์ม
      setFormData({
        title: "นาย",
        firstName: "",
        lastName: "",
        birthDate: "",
        gender: "ชาย",
        hasDisease: "no",
        diseaseDetails: "",
        hasMedication: "no",
        medicationDetails: "",
        emergencyNotes: "",
      });
    } catch (error) {
      console.error("Error: ", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 p-3 rounded-2xl text-cyan-600">
              <UserPlus size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 font-display">
              ลงทะเบียนผู้สูงอายุ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-500 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X size={30} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ข้อมูลชื่อ-นามสกุล */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">
                คำนำหน้า
              </label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-1000 p-4 outline-none focus:border-cyan-500"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              >
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
              </select>
            </div>
            <div className="md:col-span-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">
                ชื่อ
              </label>
              <input
                type="text"
                required
                className="mt-2 w-full rounded-2xl border border-slate-1000 p-4 outline-none focus:border-cyan-500"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">
                นามสกุล
              </label>
              <input
                type="text"
                required
                className="mt-2 w-full rounded-2xl border border-slate-1000 p-4 outline-none focus:border-cyan-500"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
          </div>

          {/* วันเกิดและเพศ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Calendar size={14} /> วันเกิด (ว/ด/ป)
              </label>
              <input
                type="date"
                max={today}
                required
                className="mt-2 w-full rounded-2xl border border-slate-700 p-4 outline-none focus:border-cyan-500"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                เพศ
              </label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-700 p-4 outline-none focus:border-cyan-500"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* โรคประจำตัว */}
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-700">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <HeartPulse size={18} className="text-rose-500" /> โรคประจำตัว
              </label>
              <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.hasDisease === "no"}
                    onChange={() =>
                      setFormData({ ...formData, hasDisease: "no" })
                    }
                  />{" "}
                  ไม่มี
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.hasDisease === "yes"}
                    onChange={() =>
                      setFormData({ ...formData, hasDisease: "yes" })
                    }
                  />{" "}
                  มี
                </label>
              </div>
              {formData.hasDisease === "yes" && (
                <textarea
                  placeholder="ระบุชื่อโรค"
                  required
                  className="w-full border p-3 rounded-xl bg-white outline-none focus:border-cyan-500 min-h-[45px]"
                  value={formData.diseaseDetails}
                  onChange={(e) =>
                    setFormData({ ...formData, diseaseDetails: e.target.value })
                  }
                />
              )}
            </div>

            {/* ยาประจำตัว */}
            <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-700">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Pill size={18} className="text-emerald-500" />{" "}
                ยาที่ต้องทานประจำ
              </label>
              <div className="flex gap-6 mb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.hasMedication === "no"}
                    onChange={() =>
                      setFormData({ ...formData, hasMedication: "no" })
                    }
                  />{" "}
                  ไม่มี
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.hasMedication === "yes"}
                    onChange={() =>
                      setFormData({ ...formData, hasMedication: "yes" })
                    }
                  />{" "}
                  มี
                </label>
              </div>
              {formData.hasMedication === "yes" && (
                <textarea
                  placeholder="ระบุชื่อยา"
                  required
                  className="w-full border p-3 rounded-xl bg-white outline-none focus:border-cyan-500 min-h-[45px]"
                  value={formData.medicationDetails}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      medicationDetails: e.target.value,
                    })
                  }
                />
              )}
            </div>

            {/*เพิ่มช่องกรอกหมายเหตุ/แพ้ยา */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">
                หมายเหตุ
              </label>
              <input
                type="text"
                required
                className="mt-2 w-full rounded-2xl border border-slate-1000 p-4 outline-none focus:border-cyan-500"
                value={formData.emergencyNotes}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyNotes: e.target.value })
                }
                placeholder="แพ้ยาอะไร, แพ้อาหารอะไร หรือข้อมูลสำคัญอื่นๆ ที่ควรทราบในกรณีฉุกเฉิน"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${isSubmitting ? "bg-slate-300" : "bg-[#0095B6] hover:bg-[#0084a1] shadow-cyan-100"}`}
            >
              {isSubmitting ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูลผู้สูงอายุ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
