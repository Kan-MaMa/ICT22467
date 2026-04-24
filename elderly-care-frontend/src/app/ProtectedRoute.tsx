import { Navigate, Outlet } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../services/firebase"; // 🚨 เช็ค Path ของไฟล์ firebase ให้ถูกต้องด้วยนะครับ
import { Loader2 } from "lucide-react"; // ใช้ไอคอนหมุนๆ (หรือลบทิ้งถ้าไม่ใช้)

export default function ProtectedRoute() {
  // 1. เรียกใช้ Hook เพื่อเช็คสถานะการล็อกอินแบบ Real-time
  const [user, loading, error] = useAuthState(auth);

  // 2. ถ้า Firebase กำลังตรวจสอบสถานะอยู่ ให้โชว์หน้าโหลด (สำคัญมาก! ป้องกันเว็บกะพริบไปหน้า Login)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-[#0095B6]" size={48} />
      </div>
    );
  }

  // 3. ถ้าตรวจสอบเสร็จแล้วพบว่า Error หรือ "ยังไม่ได้ล็อกอิน" (user เป็น null)
  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  // 4. ถ้าล็อกอินแล้ว ให้แสดงหน้าเว็บนั้นๆ ได้เลย
  return <Outlet />;
}