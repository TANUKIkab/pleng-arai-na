# วิธีเผยแพร่เว็บเพลงอะไรนะให้คนทั่วไปเข้าได้

เอกสารนี้เตรียมไว้สำหรับโปรเจกต์ `pleng-arai-na` โดยใช้ GitHub เก็บโค้ด และ Render ให้บริการเว็บไซต์ผ่าน URL สาธารณะ `onrender.com` ตัวแอปมีเซิร์ฟเวอร์ Node.js จึงต้องใช้บริการแบบ **Web Service** ไม่ใช่ Static Site

## ไฟล์ที่เตรียมไว้แล้ว

- `render.yaml` — ตั้งค่า Render Blueprint ให้สร้างเว็บ Node.js บนแผน Free ในภูมิภาค Singapore
- `.node-version` — กำหนด Node.js 22.13.0
- `.gitignore` — กันไฟล์ build, dependencies, log และ `.env` ไม่ให้ถูกอัปโหลด

## ก่อนเริ่ม

ต้องมีบัญชี [GitHub](https://github.com/) และ [Render](https://render.com/). รีโพสิตอรี GitHub ตั้งเป็น **Private** ก็ได้; ตอนเชื่อมกับ Render ให้สิทธิ์ Render อ่านรีโพสิตอรีนั้น

> อย่าอัปโหลดไฟล์ `.env`, รหัสผ่าน, API key หรือ token ขึ้น GitHub. โปรเจกต์นี้ไม่มี `.env` ที่จำเป็นสำหรับหน้าค้นหาเพลง/สถิติพื้นฐาน

## เกี่ยวกับโหมด "ค้นตามอารมณ์" (semantic search)

โดยดีฟอลต์ โหมดนี้ใช้ตัวคำนวณ fallback แบบเบา (ไม่โหลดโมเดล AI) เพื่อให้ทำงานได้ลื่นบน Render Free ที่มี RAM แค่ 512MB — โมเดล embeddings จริง (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`) กินหน่วยความจำเกินขนาดนี้ได้ง่ายจนทำให้ service รีสตาร์ทวนซ้ำ (อาการ: ค้นช้ามากทุกครั้ง ไม่ใช่แค่ครั้งแรก)

ถ้าอัปเกรดไปแผนที่มี RAM มากขึ้น (เช่น Starter ขึ้นไป) แล้วอยากใช้โมเดล AI จริง ให้เพิ่ม environment variable ใน Render Dashboard:

```
ENABLE_EMBEDDINGS=true
```

## ขั้นตอนที่ 1 — อัปโหลดโค้ดขึ้น GitHub

1. แตกไฟล์ ZIP ลงในเครื่อง แล้วเปิด Terminal/PowerShell ในโฟลเดอร์ `pleng-arai-na` (โฟลเดอร์ที่มี `package.json` และ `render.yaml`)
2. สร้างรีโพสิตอรีใหม่บน [GitHub](https://github.com/new) โดยเลือก Public หรือ Private ก็ได้ และอย่าเลือกสร้าง README/.gitignore ซ้ำ
3. กลับมาที่ Terminal แล้วรันคำสั่งต่อไปนี้ทีละบรรทัด:

```bash
git init -b main
git add .
git commit -m "Prepare public deployment"
git remote add origin https://github.com/YOUR_USERNAME/pleng-arai-na.git
git push -u origin main
```

แทน `YOUR_USERNAME` ด้วยชื่อผู้ใช้ GitHub จริง หากชื่อรีโพสิตอรีที่สร้างไม่ใช่ `pleng-arai-na` ให้แก้ส่วนท้าย URL ให้ตรงกัน Git อาจให้ยืนยันตัวตนในเบราว์เซอร์

## ขั้นตอนที่ 2 — สร้างเว็บสาธารณะบน Render

1. เข้าสู่ระบบที่ [Render Dashboard](https://dashboard.render.com/)
2. กด **New → Blueprint**
3. เชื่อม GitHub หาก Render ขออนุญาต แล้วเลือกรีโพสิตอรีที่เพิ่งอัปโหลด
4. ตรวจว่าพบ `render.yaml` ที่ root และบริการแสดงแผน **Free** กับภูมิภาค **Singapore**
5. กด **Deploy Blueprint**
6. รอ Build และ Deploy ให้เสร็จ จากหน้า service คัดลอก URL ที่ลงท้ายด้วย `onrender.com` แล้วเปิดทดสอบในหน้าต่างไม่ระบุตัวตน หรือส่ง URL ให้ผู้อื่นได้เลย

Render จะสร้าง URL สาธารณะและ deploy ใหม่ให้อัตโนมัติเมื่อ push การเปลี่ยนแปลงขึ้น branch ที่เชื่อมไว้

## ขั้นตอนที่ 3 — อัปเดตเว็บภายหลัง

แก้ไฟล์ในเครื่อง แล้วรัน:

```bash
git add .
git commit -m "Describe the change"
git push
```

Render จะเริ่ม deploy เวอร์ชันใหม่โดยอัตโนมัติ

## ข้อควรรู้เกี่ยวกับ Free

- เว็บไซต์เปิดให้คนทั่วไปได้ แต่ Free Web Service จะพักตัวเองหลังไม่มี traffic 15 นาที; ผู้เข้าชมคนถัดไปอาจรอประมาณหนึ่งนาทีระหว่างเริ่มระบบ
- ระบบไฟล์บนเครื่องเซิร์ฟเวอร์เป็นแบบชั่วคราวและอาจหายเมื่อ restart/deploy; โปรเจกต์นี้เก็บชุดข้อมูลเพลงไว้ในโค้ด ส่วน feedback ที่ส่งมาถูกเก็บในหน่วยความจำและไม่ใช่ฐานข้อมูลถาวร
- Free เหมาะกับเดโม/งานอดิเรก ไม่ควรถือว่าเป็นบริการ production ที่รับประกันการทำงานตลอดเวลา
- ถ้าต้องการโดเมนของตัวเองหรือให้บริการต่อเนื่องโดยไม่พัก ให้ตั้งค่า custom domain/แผนบริการที่เหมาะสมใน Render Dashboard

## ตรวจสอบปัญหาเบื้องต้น

- ถ้า deploy ล้มเหลว ให้เปิด service ใน Render แล้วดู **Events** และ **Logs**; ตรวจว่ามี `package.json`, `pnpm-lock.yaml`, และ `render.yaml` อยู่ที่ root ของ repo
- ถ้า Render ขอค่า secrets ให้ตรวจว่ากำลังสร้าง **Web Service จาก Blueprint นี้** ไม่ใช่ Static Site; ฟังก์ชันค้นหาเพลงและสถิติพื้นฐานไม่จำเป็นต้องใส่ฐานข้อมูล/API key
- ถ้าแก้ `render.yaml` ให้ commit และ push แล้วกด sync/deploy Blueprint ตามที่ Render แสดง

## แหล่งอ้างอิงทางการ

- [Render — Blueprints setup](https://render.com/docs/infrastructure-as-code)
- [Render — Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render — Deploy a Node Express app](https://render.com/docs/deploy-node-express-app)
- [Render — Free service limits](https://render.com/docs/free)
- [GitHub — Create a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
