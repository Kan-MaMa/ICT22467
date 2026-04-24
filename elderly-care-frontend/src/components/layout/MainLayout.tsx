//src/components/layout/MainLayout.tsx
import { Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import Sidebar from "./Sidebar";
import { db } from "../../services/firebase";
import { VitalMqttService } from "../../services/mqttService";

type ElderlyItem = {
  id: string;
  fullName?: string;
  isFallen?: boolean;
  [key: string]: any;
};

export default function MainLayout() {
  const elderlyRef = useRef<ElderlyItem[]>([]);

  useEffect(() => {
    // ดึงข้อมูลผู้สูงอายุมาเก็บไว้ใช้อ้างอิง
    const unsub = onSnapshot(collection(db, "elderly"), (snapshot) => {
      const list = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...snapshotDoc.data(),
      })) as ElderlyItem[];

      elderlyRef.current = list;
    });

    const mqttService = new VitalMqttService({
      topics: ["healthcare/#"],
      onMessage: async (topic, msg) => {
        const parts = topic.split("/");
        const type = parts[1];
        const idFromTopic = parts[2];

        if (!type || !idFromTopic) {
          return;
        }

        if (["heart", "bp", "spo2"].includes(type)) {
          const person = elderlyRef.current.find((item) => item.id === idFromTopic);

          if (!person) return;

          const upMap: Record<string, any> = {
            lastUpdated: serverTimestamp(),
          };

          if (type === "heart") upMap.heartRate = msg;
          if (type === "bp") upMap.bloodPressure = msg;
          if (type === "spo2") upMap.spo2 = msg;

          try {
            await updateDoc(doc(db, "elderly", person.id), upMap);
          } catch (error) {
            console.error("Vital update error:", error);
          }
        }
      },
    });

    mqttService.connect();

    return () => {
      unsub();
      mqttService.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 overflow-x-hidden">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
      
    </div>
  );
}