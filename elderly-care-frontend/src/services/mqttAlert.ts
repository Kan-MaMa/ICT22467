// src/hooks/useMqttAlerts.ts
import { useEffect, useRef } from "react";
import mqtt from "mqtt";
import { db } from "../services/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

const THRESHOLDS = { HR_MIN: 50, HR_MAX: 120, SPO2_MIN: 90, SYS_MAX: 140, DIA_MAX: 90 };
const ALERT_COOLDOWN_MS = 60000; 

export function useMqttAlerts() {
  const vitalsBuffer = useRef<Record<string, any>>({});
  const lastAlertTime = useRef<Record<string, number>>({});

  useEffect(() => {
    // 💡 สุ่ม Client ID เพื่อป้องกันการเตะกันเองหากเผลอเปิดเว็บหลายแท็บ
    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt", {
      clientId: 'web_client_' + Math.random().toString(16).substr(2, 8)
    });

    client.on("connect", () => {
      console.log("🟢 [1. เว็บ] เชื่อมต่อเซิร์ฟเวอร์ MQTT สำเร็จแล้ว!");
      client.subscribe("healthcare/heart/#");
      client.subscribe("healthcare/spo2/#");
      client.subscribe("healthcare/bp/#");
      
      client.subscribe("healthcare/fall/#", (err) => {
        if (!err) console.log("👂 [2. เว็บ] เริ่มดักฟังข้อมูลการกดปุ่มล้ม (healthcare/fall/#) แล้ว");
      });
    });

    client.on("message", async (topic, message) => {
      const payload = message.toString();

      // 🚨 จุดที่ 1: ดักดูว่าเว็บได้รับข้อมูลเรื่องการล้มไหม?
      if (topic.includes("fall")) {
         console.log(`📥 [3. เว็บได้รับข้อความ!] Topic: ${topic} | ข้อความที่ส่งมา: ${payload}`);
      }

      const topicParts = topic.split("/");
      const type = topicParts[1]; 
      const elderlyId = topicParts[2]; 

      if (!elderlyId) return;

      if (!vitalsBuffer.current[elderlyId]) {
        vitalsBuffer.current[elderlyId] = { hr: 0, spo2: 0, sys: 0, dia: 0 };
      }

      let isAbnormal = false;
      let shortSeverity = ""; 
      let detailReason = "";  
      let severityLevel = "medium";

      if (type === "heart") {
        const hr = parseInt(payload);
        vitalsBuffer.current[elderlyId].hr = hr;
        if (hr < THRESHOLDS.HR_MIN) { isAbnormal = true; shortSeverity = "อันตราย"; detailReason = `หัวใจเต้นช้า (${hr} bpm)`; severityLevel = "high"; }
        else if (hr > THRESHOLDS.HR_MAX) { isAbnormal = true; shortSeverity = "อันตราย"; detailReason = `หัวใจเต้นเร็ว (${hr} bpm)`; severityLevel = "high"; }
      } 
      else if (type === "spo2") {
        const spo2 = parseInt(payload);
        vitalsBuffer.current[elderlyId].spo2 = spo2;
        if (spo2 < THRESHOLDS.SPO2_MIN) { isAbnormal = true; shortSeverity = "อันตราย"; detailReason = `ออกซิเจนต่ำ (${spo2}%)`; severityLevel = "high"; }
      } 
      else if (type === "bp") {
        const [sys, dia] = payload.split("/").map(Number);
        vitalsBuffer.current[elderlyId].sys = sys;
        vitalsBuffer.current[elderlyId].dia = dia;
        if (sys > THRESHOLDS.SYS_MAX || dia > THRESHOLDS.DIA_MAX) {
          isAbnormal = true; shortSeverity = "อันตราย"; detailReason = `ความดันสูง (${sys}/${dia})`; severityLevel = "high";
        }
      }
      else if (type === "fall") {
        isAbnormal = true;
        shortSeverity = "อันตราย"; 
        detailReason = "🚨 ผู้สูงอายุเกิดอุบัติเหตุ"; 
        severityLevel = "high";
        lastAlertTime.current[elderlyId] = 0; // ทะลุ Cooldown เสมอ
        console.log(`💥 [4. เว็บ] เข้าเงื่อนไขการล้ม! เตรียมบันทึกลงฐานข้อมูลให้ ${elderlyId}`);
      }

      const now = Date.now();
      const lastAlert = lastAlertTime.current[elderlyId] || 0;

      if (isAbnormal && (now - lastAlert > ALERT_COOLDOWN_MS)) {
        lastAlertTime.current[elderlyId] = now; 

        try {
          console.log(`💾 [5. เว็บ] กำลังอัปโหลดข้อมูลลง Firebase...`);
          
          const elderlySnap = await getDoc(doc(db, "elderly", elderlyId));
          const fullName = elderlySnap.exists() ? elderlySnap.data().fullName : elderlyId;

          await addDoc(collection(db, "emergency_logs"), {
            elderlyId: elderlyId,
            fullName: fullName,
            severity: shortSeverity, 
            details: detailReason, 
            severityLevel: severityLevel,
            status: "รอดำเนินการ", 
            isSimulated: false,
            timestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await updateDoc(doc(db, "elderly", elderlyId), {
            isFallen: true, 
            alertDispatchStatus: "pending",
            lastFallSeverity: detailReason, 
            updatedAt: serverTimestamp()
          });

          console.log(`✅ [6. เว็บ] บันทึกลง Firebase สำเร็จ! (Global Popup ควรจะเด้งขึ้นมาเดี๋ยวนี้)`);

        } catch (error) {
          console.error("❌ [เว็บ] Error บันทึก Firebase ไม่สำเร็จ! สาเหตุ:", error);
        }
      }
    });

    return () => {
      client.end();
    };
  }, []);
}