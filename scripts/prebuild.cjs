// scripts/prebuild.cjs
/**
 * ใช้สำหรับเตรียมไฟล์/โฟลเดอร์ก่อน build แบบข้ามเชลล์
 * - สร้างโฟลเดอร์ขั้นต่ำที่ Next ต้องการ (ถ้ายังไม่มี)
 * - ตรวจสอบ ENV ที่จำเป็น (ถ้าจะให้เข้มขึ้น ค่อยเพิ่มทีหลัง)
 */
const fs = require('fs');
const path = require('path');

const ensureDirs = ['pages', 'public'];
for (const d of ensureDirs) {
  const p = path.join(process.cwd(), d);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    console.log(`[prebuild] mkdir ${d}`);
  }
}

// ตัวอย่าง: สร้าง index หน้ากลวงๆ ถ้าไม่มี (กัน build พัง)
const indexPage = path.join(process.cwd(), 'pages/index.tsx');
if (!fs.existsSync(indexPage)) {
  fs.writeFileSync(
    indexPage,
    `export default function Home(){return <main style={{padding:24,fontFamily:'Inter, system-ui, Arial'}}><h1>Rapidahost – Admin Console</h1><p>Next.js is running.</p></main>}\n`
  );
  console.log('[prebuild] scaffold pages/index.tsx');
}
