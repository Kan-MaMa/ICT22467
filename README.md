67117540 สรรพวัต สุขยา
67164223 พิรชัย อัสดรชัยกุล
67155611 อารียา สุขศรี
67080437 ปฏิภาณ เมตโต
67082639 ธีรยุทธ ทรงศักดิ์

library ที่มี
1. react-router-dom ใช้สำหรับจัดการระบบนำทาง (Routing) ภายในหน้าเว็บแบบ Single Page Application (SPA) ทำให้เปลี่ยนหน้าได้ลื่นไหลโดยไม่ต้องโหลดหน้าเว็บใหม่
วิธีติดตั้ง : npm install react-router-dom

    ***พระเอก***
2. firebase เป็นตัวกลางเชื่อมต่อกับบริการ Backend as a Service (BaaS) ของ Google ใช้เชื่อมต่อกับ Cloud Firestore เพื่อทำหน้าที่เป็นฐานข้อมูล (Database) หลักของระบบ
วิธีติดตั้ง : npm install firebase

3. mqtt ใช้เป็นโปรโตคอลสื่อสารหลักสำหรับงาน IoT (Internet of Things) ทำหน้าที่เชื่อมต่อหน้าเว็บ (Client) เข้ากับเซิร์ฟเวอร์ EMQX Broker ผ่าน WebSockets (wss://) ใช้ฟังก์ชัน client.subscribe() เพื่อดักฟังข้อมูลสัญญาณชีพ (หัวใจ, ความดัน, ออกซิเจน) ที่ถูกส่งมาจาก Node-RED แบบวินาทีต่อวินาที
วิธีติดตั้ง : npm install mqtt

4. recharts ไลบรารีสำหรับสร้างกราฟ (Data Visualization) ที่ถูกออกแบบมาเพื่อ React โดยเฉพาะ ใช้สร้างกราฟพื้นที่ (AreaChart) เพื่อแสดงแนวโน้มของสัญญาณชีพย้อนหลัง 10 ครั้ง
วิธีติดตั้ง : npm install recharts

5. lucide-react ชุดไอคอนแบบเวกเตอร์ (SVG Icons) ที่มีความมินิมอลและสวยงาม ใช้ตกแต่ง User Interface (UI) ทั่วทั้งโปรเจกต์
วิธีติดตั้ง : npm install lucide-react

6. react-hot-toast ระบบจัดการการแจ้งเตือนแบบป๊อปอัป (Toast Notifications) ใช้สำหรับแสดงข้อความตอบกลับผู้ใช้ (Feedback) ในมุมจอ เช่น การแจ้งเตือนสีเขียวเมื่อ "บันทึกข้อมูลสำเร็จ" หรือการเด้งป๊อปอัปสีแดงเมื่อ "พบความผิดปกติของสัญญาณชีพ"
วิธีติดตั้ง : npm install react-hot-toast

7. Tailwind CSS เป็น Utility-first CSS Framework ใช้สำหรับเขียนสไตล์การตกแต่งหน้าเว็บโดยตรงผ่าน className
วิธีติดตั้ง : npm install -D tailwindcss postcss autoprefixer
         npx tailwindcss init -p

วิธี Run โปรเจค
1. cd เข้าโฟลเดอร์ elderly-care-frontend
2. เปิดTerminal ใน vs code หรือ Command Prompt
3. พิมพ์คำสั่ง npm run dev
4. เมื่อพิมพ์คำสั่งแล้วrunแล้วระบบจะให้ url สำหรับการดูโปรเจคมาสามารถคลิ๊กที่ลิงค์นั้นได้เลย
