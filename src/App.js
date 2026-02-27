import { useState, useEffect } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
// Read from environment variables (set these in your build / .env) with fallback
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://lyvmoeqhnjhwdaqafmkw.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5dm1vZXFobmpod2RhcWFmbWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTkxNjQsImV4cCI6MjA4Nzc5NTE2NH0.H8poCkol5j72vChfFYw4Dut9FZFxZ-wDBsEbGQ2DirM";
const H = { "Content-Type":"application/json", apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` };

const sb = {
  async get(table, qs="") {
    try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`,{headers:H}); return r.ok?r.json():null; } catch { return null; }
  },
  async upsert(table, body) {
    try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{...H,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(body)}); return r.ok?r.json():null; } catch { return null; }
  },
  async del(table, match) {
    try { const qs=Object.entries(match).map(([k,v])=>`${k}=eq.${v}`).join("&"); const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`,{method:"DELETE",headers:H}); return r.ok; } catch { return false; }
  }
};

// ── Themes ────────────────────────────────────────────────────────────────────
const DARK={bg:"#0a0a0a",surface:"#111",card:"#161616",border:"#242424",border2:"#2e2e2e",text:"#f0f0f0",textSub:"#888",textMuted:"#444",accent:"#f0f0f0",accentInv:"#0a0a0a",success:"#4ade80",warn:"#facc15",danger:"#f87171",toggle:"#fff"};
const LIGHT={bg:"#f5f5f5",surface:"#ebebeb",card:"#fff",border:"#e0e0e0",border2:"#ccc",text:"#111",textSub:"#666",textMuted:"#aaa",accent:"#111",accentInv:"#fff",success:"#16a34a",warn:"#ca8a04",danger:"#dc2626",toggle:"#111"};

// ── Minimalist SVG Icons ──────────────────────────────────────────────────────
const ICONS = {
  user:    <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
  users:   <><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="8" r="3"/><path d="M22 20c0-2.8-2.2-5-5-5"/></>,
  teacher: <><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8M12 16v5M8 10h4M8 7h8"/></>,
  student: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3.3 1.7 8.7 1.7 12 0v-5"/></>,
  bus:     <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20M7 6V4M17 6V4M2 14h20"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></>,
  admin:   <><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 18l-6.2 3 1.2-6.8L2 9.3l6.9-1z"/></>,
  grades:  <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  attend:  <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
  map:     <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></>,
  signout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></>,
  plus:    <><path d="M12 5v14M5 12h14"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></>,
  edit:    <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z"/></>,
  save:    <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
  back:    <><polyline points="15 18 9 12 15 6"/></>,
  fwd:     <><polyline points="9 18 15 12 9 6"/></>,
  moon:    <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
  sun:     <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  globe:   <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></>,
  check:   <><polyline points="20 6 9 17 4 12"/></>,
  gps:     <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/></>,
  phone:   <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></>,
  stats:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  clock:   <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  alert:   <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  book:    <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
  stop:    <><rect x="3" y="3" width="18" height="18" rx="2"/></>,
};
function Ic({ n, size=16, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,display:"block"}}>
      {ICONS[n]}
    </svg>
  );
}

// ── Translations ──────────────────────────────────────────────────────────────
const TR = {
  ar:{
    dir:"rtl",appName:"نظام إدارة المدرسة",signIn:"سجّل دخولك للمتابعة",
    email:"البريد الإلكتروني",password:"كلمة المرور",signInBtn:"دخول",signingIn:"جارٍ الدخول...",
    keepLoggedIn:"ابقَ متصلاً",demoAccounts:"حسابات تجريبية",
    invalidCreds:"بريد إلكتروني أو كلمة مرور غير صحيحة.",
    accessDenied:"الدخول مرفوض. لم تتم الموافقة على حسابك.",
    welcome:"مرحباً،",signOut:"خروج",
    admin:"المدير",teacher:"المعلم",student:"الطالب",busDriver:"سائق الحافلة",
    schoolOps:"إدارة المدرسة",classAttend:"الفصول والحضور",
    gradesAttend:"الدرجات والحضور",routesGps:"المسارات والموقع",
    access:"دخول",back:"رجوع",
    students:"الطلاب",teachers:"المعلمون",grades:"الدرجات",
    addStudent:"إضافة طالب",addTeacher:"إضافة معلم",
    name:"الاسم",emailLbl:"البريد",phone:"الهاتف",grade:"الصف",subject:"المادة",
    attendance:"الحضور",gradesTxt:"الدرجات",
    present:"حاضر",absent:"غائب",rate:"النسبة",
    save:"حفظ",saveAttendance:"حفظ الحضور",saveGrades:"حفظ الدرجات",
    classes:"الفصول",period:"الفترة",final:"النهائي",overallAvg:"المعدل العام",
    liveMap:"خريطة المسار",currentLoc:"الموقع الحالي والمحطات",
    mapNote:"الخريطة متاحة في التطبيق الكامل",gpsActive:"GPS يُرسل الموقع",
    todayStops:"محطات اليوم",routeSched:"جدول المسار",
    startGps:"تشغيل GPS",stopTracking:"إيقاف التتبع",trackingActive:"التتبع نشط",
    studentAdded:"تمت إضافة الطالب.",teacherAdded:"تمت إضافة المعلم.",
    attendanceSaved:"تم حفظ الحضور.",gradesSaved:"تم حفظ الدرجات.",
    average:"المعدل",editGrades:"تعديل الدرجات",edit:"تعديل",
    clickToToggle:"انقر على يوم لتغيير الحضور",
    selectStudent:"اختر طالباً",dark:"داكن",light:"فاتح",
    approvedLogins:"الحسابات المعتمدة",addCredential:"إضافة حساب",
    roleLabel:"الدور",newPassword:"كلمة المرور",credAdded:"تمت الإضافة.",credDeleted:"تم الحذف.",deleteBtn:"حذف",
    gradePeriods:"فترات التقييم",addPeriod:"إضافة فترة",periodName:"اسم الفترة",
    periodAdded:"تمت إضافة الفترة.",periodDeleted:"تم حذف الفترة.",
    initialGrades:"الدرجات الأولية (اختياري)",gradeLevel:"المستوى الدراسي",
    subjects:["رياضيات","علوم","إنجليزي","تاريخ","فنون"],
    subjectKeys:["math","science","english","history","art"],
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    days:["أح","إث","ث","أر","خ","ج","س"],
    loading:"جارٍ التحميل...",syncOk:"متصل بقاعدة البيانات",syncFail:"يعمل دون اتصال",
    noGradePeriods:"لا توجد فترات تقييم — يرجى طلبها من المدير.",
    mySubjectOnly:"تعديل درجات مادتك فقط",
    grades1to12:Array.from({length:12},(_,i)=>`الصف ${i+1}`),
    roles:{admin:"مدير",teacher:"معلم",student:"طالب",bus_driver:"سائق حافلة"},
  },
  en:{
    dir:"ltr",appName:"School Management",signIn:"Sign in to continue",
    email:"Email",password:"Password",signInBtn:"Sign In",signingIn:"Signing in...",
    keepLoggedIn:"Keep me logged in",demoAccounts:"Demo accounts",
    invalidCreds:"Invalid credentials.",accessDenied:"Access denied.",
    welcome:"Welcome,",signOut:"Sign out",
    admin:"Admin",teacher:"Teacher",student:"Student",busDriver:"Bus Driver",
    schoolOps:"School operations",classAttend:"Classes & attendance",
    gradesAttend:"Grades & attendance",routesGps:"Routes & GPS",
    access:"Access",back:"Back",
    students:"Students",teachers:"Teachers",grades:"Grades",
    addStudent:"Add student",addTeacher:"Add teacher",
    name:"Name",emailLbl:"Email",phone:"Phone",grade:"Grade",subject:"Subject",
    attendance:"Attendance",gradesTxt:"Grades",
    present:"Present",absent:"Absent",rate:"Rate",
    save:"Save",saveAttendance:"Save attendance",saveGrades:"Save grades",
    classes:"Classes",period:"Period",final:"Final",overallAvg:"Overall avg",
    liveMap:"Live Route Map",currentLoc:"Current location and stops",
    mapNote:"Map available in full app",gpsActive:"GPS transmitting",
    todayStops:"Today's Stops",routeSched:"Route schedule",
    startGps:"Start GPS",stopTracking:"Stop tracking",trackingActive:"Tracking active",
    studentAdded:"Student added.",teacherAdded:"Teacher added.",
    attendanceSaved:"Attendance saved.",gradesSaved:"Grades saved.",
    average:"Average",editGrades:"Edit grades",edit:"Edit",
    clickToToggle:"Click a weekday to toggle attendance",
    selectStudent:"Select student",dark:"Dark",light:"Light",
    approvedLogins:"Approved Logins",addCredential:"Add credential",
    roleLabel:"Role",newPassword:"Password",credAdded:"Credential added.",credDeleted:"Removed.",deleteBtn:"Remove",
    gradePeriods:"Grade Periods",addPeriod:"Add period",periodName:"Period name",
    periodAdded:"Period added.",periodDeleted:"Period removed.",
    initialGrades:"Initial Grades (optional)",gradeLevel:"Grade Level",
    subjects:["Math","Science","English","History","Art"],
    subjectKeys:["math","science","english","history","art"],
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    days:["Su","Mo","Tu","We","Th","Fr","Sa"],
    loading:"Loading...",syncOk:"Connected to database",syncFail:"Working offline",
    noGradePeriods:"No grade periods defined. Ask admin to add some.",
    mySubjectOnly:"You can only edit your subject",
    grades1to12:Array.from({length:12},(_,i)=>`Grade ${i+1}`),
    roles:{admin:"Admin",teacher:"Teacher",student:"Student",bus_driver:"Bus Driver"},
  }
};

// ── Static data ───────────────────────────────────────────────────────────────
const DEFAULT_CREDS = {
  "admin@school.edu":   {password:"admin123",  name:"مدير النظام",     role:"admin",      metadata:{phone:"+966 50 000 0001"}},
  "teacher@school.edu": {password:"teacher123",name:"د. سارة جونسون",  role:"teacher",    metadata:{subject:"math",phone:"+966 50 123 4567"}},
  "student@school.edu": {password:"student123",name:"أليكس مارتينيز",  role:"student",    metadata:{grade:"الصف 10",phone:"+966 50 987 6543"}},
  "driver@school.edu":  {password:"driver123", name:"جون السائق",      role:"bus_driver", metadata:{busNumber:"حافلة 45",route:"مسار أ - الحي الشرقي",phone:"+966 50 456 7890"}},
};
const SUBJ_KEYS = ["math","science","english","history","art"];
const DEMO_STUDENTS = [
  {id:"s1",name:"أليكس مارتينيز",email:"student@school.edu",grade:"الصف 10",phone:"+966 50 987 6543"},
  {id:"s2",name:"جيمي لي",        email:"jamie@school.edu",  grade:"الصف 10",phone:"+966 50 234 5678"},
  {id:"s3",name:"سام ريفيرا",     email:"sam@school.edu",    grade:"الصف 11",phone:"+966 50 345 6789"},
  {id:"s4",name:"بريا باتيل",     email:"priya@school.edu",  grade:"الصف 11",phone:"+966 50 456 7890"},
  {id:"s5",name:"كريس نجوين",     email:"chris@school.edu",  grade:"الصف 12",phone:"+966 50 567 8901"},
];
const DEMO_TEACHERS = [
  {id:"t1",name:"د. سارة جونسون",email:"teacher@school.edu",subject:"math",   subjectDisplay:"رياضيات",phone:"+966 50 123 4567"},
  {id:"t2",name:"م. داود بارك",   email:"david@school.edu",  subject:"science",subjectDisplay:"علوم",    phone:"+966 50 678 9012"},
];
const DEFAULT_PERIODS = [
  {id:"p1",label:"الربع الأول"},{id:"p2",label:"الربع الثاني"},
  {id:"p3",label:"الربع الثالث"},{id:"p4",label:"الربع الرابع"},
];
const BUS_STOPS = [
  {id:1,name:"محطة الشارع الرئيسي",students:8, time:"7:15 ص"},
  {id:2,name:"محطة شارع بارك",     students:12,time:"7:30 ص"},
  {id:3,name:"البوابة الرئيسية",   students:0, time:"8:00 ص"},
];
const NOW = new Date();
function genDays(y,m){const d={},dt=new Date(y,m,1);while(dt.getMonth()===m){const dw=dt.getDay();if(dw!==0&&dw!==6)d[dt.getDate()]=Math.random()>.1;dt.setDate(dt.getDate()+1);}return d;}
const MONTHS=Array.from({length:6},(_,i)=>{const d=new Date(NOW.getFullYear(),NOW.getMonth()+i-5,1);return{year:d.getFullYear(),month:d.getMonth(),data:genDays(d.getFullYear(),d.getMonth())};});
const initAtt=()=>{const r={};DEMO_STUDENTS.forEach(s=>{r[s.id]={};MONTHS.forEach(m=>{r[s.id][`${m.year}-${m.month}`]=genDays(m.year,m.month);});});return r;};
const STUDENT_ATT=initAtt();
const initGrades=()=>{const r={};DEMO_STUDENTS.forEach(s=>{r[s.id]={p1:{math:85,science:88,english:90,history:87,art:92},p2:{math:88,science:90,english:87,history:89,art:94},p3:{math:90,science:92,english:89,history:91,art:95},p4:{math:91,science:93,english:91,history:90,art:96}};});return r;};

// ── Shared components ─────────────────────────────────────────────────────────
function ThemeToggle({dark,onToggle,T,t}){
  return <button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:8,padding:"7px 12px",color:T.textSub,fontSize:12,cursor:"pointer"}}><Ic n={dark?"sun":"moon"} size={14} color={T.textSub}/><span style={{fontSize:12,fontWeight:600}}>{dark?t.light:t.dark}</span></button>;
}
function LangToggle({lang,onToggle,T}){
  return <button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:8,padding:"7px 12px",color:T.textSub,fontSize:12,fontWeight:600,cursor:"pointer"}}><Ic n="globe" size={14} color={T.textSub}/>{lang==="ar"?"EN":"عربي"}</button>;
}
function SyncBadge({s,T}){
  if(!s)return null;
  const ok=s==="ok";
  return <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:ok?`${T.success}18`:`${T.warn}18`,border:`1px solid ${ok?T.success:T.warn}44`}}><span style={{width:6,height:6,borderRadius:"50%",background:ok?T.success:T.warn,animation:"pulse 2s infinite"}}/><span style={{fontSize:10,fontWeight:600,color:ok?T.success:T.warn}}>DB</span></div>;
}
function Checkbox({checked,onChange,label,T}){
  return <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.textSub,userSelect:"none"}}><span onClick={onChange} style={{width:18,height:18,borderRadius:5,border:`1.5px solid ${checked?T.accent:T.border2}`,background:checked?T.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s",cursor:"pointer"}}>{checked&&<Ic n="check" size={11} color={T.accentInv}/>}</span>{label}</label>;
}
function Modal({open,onClose,title,children,width=520,T,dir="rtl"}){
  if(!open)return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20}}><div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:28,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",direction:dir}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><span style={{fontSize:15,fontWeight:700,color:T.text}}>{title}</span><button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,color:T.textSub,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button></div>{children}</div></div>;
}
function Toast({msg,onDone,T}){
  const[v,setV]=useState(true);
  useEffect(()=>{const id=setTimeout(()=>{setV(false);onDone();},2800);return()=>clearTimeout(id);},[onDone]);
  if(!v||!msg)return null;
  const err=msg.startsWith("!");
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:200,background:err?T.danger:T.success,color:"#fff",padding:"11px 22px",borderRadius:10,fontWeight:600,fontSize:13,boxShadow:"0 4px 28px rgba(0,0,0,.3)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}><Ic n={err?"alert":"check"} size={15} color="#fff"/>{err?msg.slice(1):msg}</div>;
}
function Lbl({children,T}){return <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMuted,display:"block",marginBottom:6}}>{children}</span>;}
function Inp({T,...p}){return <input {...p} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",...p.style}} onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>;}
function Sel({T,children,...p}){return <select {...p} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",...p.style}}>{children}</select>;}
function BtnP({T,style,children,...p}){return <button {...p} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontWeight:600,borderRadius:8,border:"none",background:T.accent,color:T.accentInv,padding:"10px 20px",fontSize:13,...style}}>{children}</button>;}
function BtnO({T,style,children,...p}){return <button {...p} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontWeight:500,borderRadius:8,border:`1px solid ${T.border2}`,background:"transparent",color:T.text,padding:"9px 16px",fontSize:13,...style}}>{children}</button>;}
function BtnG({T,style,children,...p}){return <button {...p} style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",fontWeight:500,borderRadius:7,border:"none",background:"transparent",color:T.textSub,padding:"6px 8px",fontSize:13,...style}}>{children}</button>;}
function Card({T,style,children}){return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:22,...style}}>{children}</div>;}
function TH({children,center,T}){return <th style={{padding:"9px 14px",textAlign:center?"center":"right",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{children}</th>;}
function TD({children,bold,center,color,T}){return <td style={{padding:"12px 14px",fontSize:13,fontWeight:bold?600:400,color:color||(bold?T.text:T.textSub),textAlign:center?"center":"right",borderBottom:`1px solid ${T.border}`}}>{children}</td>;}
function Divider({T}){return <div style={{height:1,background:T.border,margin:"20px 0"}}/>;}

function InfoCard({T,name,icon,details}){
  return <Card T={T} style={{marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><div style={{width:42,height:42,borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={icon||"user"} size={20} color={T.textSub}/></div><div style={{fontWeight:800,fontSize:17}}>{name}</div></div><div style={{display:"flex",flexWrap:"wrap",gap:"6px 28px"}}>{details.map((d,i)=><span key={i} style={{fontSize:12,color:T.textSub,display:"flex",alignItems:"center",gap:5}}>{d.icon&&<Ic n={d.icon} size={12} color={T.textMuted}/>}{d.label&&<span style={{fontWeight:600,color:T.textMuted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{d.label}:</span>}{d.value}</span>)}</div></Card>;
}

function PageShell({T,t,dark,onToggleTheme,lang,onToggleLang,onBack,title,icon,children,rightEl,sync}){
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",direction:t.dir}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} *{box-sizing:border-box}`}</style>
    <div style={{padding:"18px 28px",borderBottom:`1px solid ${T.border}`,background:T.card,position:"sticky",top:0,zIndex:50}}>
      <div style={{maxWidth:1020,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {onBack&&<BtnG T={T} onClick={onBack}><Ic n={t.dir==="rtl"?"fwd":"back"} size={16} color={T.textSub}/></BtnG>}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {icon&&<div style={{width:34,height:34,borderRadius:9,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={icon} size={17} color={T.textSub}/></div>}
            <span style={{fontSize:18,fontWeight:800}}>{title}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <SyncBadge s={sync} T={T}/>
          {rightEl}
          <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} T={T} t={t}/>
        </div>
      </div>
    </div>
    <div style={{maxWidth:1020,margin:"0 auto",padding:"28px 28px"}}>{children}</div>
  </div>;
}

// ── Attendance Calendar ───────────────────────────────────────────────────────
function AttendanceCalendar({T,t,editable=false,onSave,students=null,initAtt:iA=null}){
  const[selIdx,setSelIdx]=useState(MONTHS.length-1);
  const[selSid,setSelSid]=useState(students?.[0]?.id??null);
  const[ov,setOv]=useState({});
  const base=MONTHS[selIdx];
  const key=`${base.year}-${base.month}`;
  const bData=selSid&&iA?(iA[selSid]?.[key]??{}):(base.data??{});
  const oData=selSid?(ov[selSid]?.[key]??{}):(ov["__all__"]?.[key]??{});
  const dayData={...bData,...oData};
  const wdays=Object.keys(dayData).length;
  const pres=Object.values(dayData).filter(Boolean).length;
  const abs=wdays-pres;
  const pct=wdays?Math.round((pres/wdays)*100):0;
  const toggle=d=>{if(!editable||!(d in dayData))return;const sid=selSid??"__all__";setOv(p=>({...p,[sid]:{...(p[sid]??{}),[key]:{...(p[sid]?.[key]??{}),[d]:!dayData[d]}}}));};
  const isDk=T.bg===DARK.bg;
  const pBg=isDk?"#122412":"#dcfce7",aBg=isDk?"#2a1212":"#fee2e2",wBg=T.surface;
  const ss=a=>({padding:"5px 12px",borderRadius:6,border:`1px solid ${a?T.accent:T.border}`,background:a?T.accent:"transparent",color:a?T.accentInv:T.textSub,cursor:"pointer",fontSize:11,fontWeight:600});
  const firstDow=new Date(base.year,base.month,1).getDay();
  const dim=new Date(base.year,base.month+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDow;i++)cells.push({e:true});
  for(let d=1;d<=dim;d++){const dw=new Date(base.year,base.month,d).getDay();const we=dw===0||dw===6;const fut=new Date(base.year,base.month,d)>NOW;const tod=base.year===NOW.getFullYear()&&base.month===NOW.getMonth()&&d===NOW.getDate();cells.push({d,we,fut,tod,s:dayData[d]});}
  return <div>
    {students&&students.length>0&&<div style={{marginBottom:18}}><Lbl T={T}>{t.selectStudent}</Lbl><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{students.map(s=><button key={s.id} onClick={()=>setSelSid(s.id)} style={ss(selSid===s.id)}>{s.name}</button>)}</div></div>}
    <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>{MONTHS.map((m,i)=><button key={i} onClick={()=>setSelIdx(i)} style={ss(i===selIdx)}>{t.months[m.month].slice(0,3)} {m.year}</button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
      {[[t.present,pres,T.success,"check"],[t.absent,abs,T.danger,"alert"],[t.rate,`${pct}%`,pct>=90?T.success:pct>=75?T.warn:T.danger,"stats"]].map(([l,v,c,ic])=>
        <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:5}}><Ic n={ic} size={14} color={c}/></div>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.textMuted,marginBottom:4}}>{l}</div>
          <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
        </div>
      )}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:5}}>{t.days.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:T.textMuted,padding:"4px 0"}}>{d}</div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
      {cells.map((c,i)=>{
        if(c.e)return <div key={`e${i}`}/>;
        const{d,we,fut,tod,s}=c;
        let bg=wBg,tc=T.textMuted;
        if(!we&&!fut){bg=s===true?pBg:aBg;tc=s===true?T.success:T.danger;}
        return <div key={d} onClick={()=>!we&&!fut&&toggle(d)} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:7,background:bg,color:tc,fontSize:13,fontWeight:600,cursor:editable&&!we&&!fut?"pointer":"default",border:tod?`2px solid ${T.accent}`:"2px solid transparent",transition:"background .1s",userSelect:"none"}}>{d}</div>;
      })}
    </div>
    <div style={{marginTop:14,display:"flex",gap:18,flexWrap:"wrap",fontSize:12,color:T.textSub}}>
      {[[pBg,T.success,t.present],[aBg,T.danger,t.absent]].map(([bg,bdr,lbl])=><span key={lbl} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${bdr}`,display:"inline-block"}}/>{lbl}</span>)}
    </div>
    {editable&&<div style={{marginTop:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:T.textMuted}}>{t.clickToToggle}</span>
      {onSave&&<BtnP T={T} onClick={()=>onSave(selSid,key,dayData)}><Ic n="save" size={14} color={T.accentInv}/>{t.saveAttendance}</BtnP>}
    </div>}
  </div>;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({onLogin,dark,onToggleTheme,lang,onToggleLang,creds}){
  const T=dark?DARK:LIGHT,t=TR[lang];
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[keep,setKeep]=useState(false);
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const submit=()=>{setErr("");setLoading(true);setTimeout(()=>{const u=creds[email];if(u&&u.password===pass){onLogin({email,...u},keep);}else if(u){setErr(t.invalidCreds);}else{setErr(t.accessDenied);}setLoading(false);},380);};
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20,direction:t.dir}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} input::placeholder{color:${T.textMuted}} *{box-sizing:border-box}`}</style>
    <div style={{position:"fixed",top:20,left:t.dir==="rtl"?20:"auto",right:t.dir==="rtl"?"auto":20,display:"flex",gap:8}}>
      <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
      <ThemeToggle dark={dark} onToggle={onToggleTheme} T={T} t={t}/>
    </div>
    <div style={{width:"100%",maxWidth:380}}>
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:14,background:T.card,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic n="book" size={24} color={T.textSub}/></div>
        <div style={{fontSize:22,fontWeight:800}}>{t.appName}</div>
        <div style={{fontSize:14,color:T.textSub,marginTop:6}}>{t.signIn}</div>
      </div>
      <Card T={T} style={{padding:28}}>
        <div style={{marginBottom:16}}><Lbl T={T}>{t.email}</Lbl><Inp T={T} type="email" placeholder="you@school.edu" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={{marginBottom:16}}><Lbl T={T}>{t.password}</Lbl><Inp T={T} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={{marginBottom:20}}><Checkbox checked={keep} onChange={()=>setKeep(v=>!v)} label={t.keepLoggedIn} T={T}/></div>
        {err&&<div style={{display:"flex",alignItems:"center",gap:7,color:T.danger,fontSize:13,marginBottom:14,padding:"9px 12px",background:`${T.danger}12`,borderRadius:7}}><Ic n="alert" size={14} color={T.danger}/>{err}</div>}
        <BtnP T={T} style={{width:"100%",padding:"11px"}} onClick={submit}>{loading?t.signingIn:<><Ic n="signout" size={15} color={T.accentInv}/>{t.signInBtn}</>}</BtnP>
        <Divider T={T}/>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:T.textMuted,marginBottom:10}}>{t.demoAccounts}</div>
        {Object.entries(creds).map(([e,u])=><div key={e} onClick={()=>{setEmail(e);setPass(u.password);}} style={{padding:"8px 12px",borderRadius:7,cursor:"pointer",marginBottom:4,fontSize:12,color:T.textSub,display:"flex",justifyContent:"space-between",alignItems:"center"}} onMouseEnter={el=>el.currentTarget.style.background=T.surface} onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
          <span style={{fontWeight:700,color:T.text}}>{t.roles[u.role]}</span>
          <span style={{color:T.textMuted,fontSize:11}}>{e}</span>
        </div>)}
      </Card>
    </div>
  </div>;
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({user,onNavigate,onSignOut,dark,onToggleTheme,lang,onToggleLang}){
  const T=dark?DARK:LIGHT,t=TR[lang];
  const portals=[
    {role:["admin"],              path:"admin",     title:t.admin,     sub:t.schoolOps,    icon:"admin"},
    {role:["teacher","admin"],    path:"teacher",   title:t.teacher,   sub:t.classAttend,  icon:"teacher"},
    {role:["student","admin"],    path:"student",   title:t.student,   sub:t.gradesAttend, icon:"student"},
    {role:["bus_driver","admin"], path:"bus-driver",title:t.busDriver, sub:t.routesGps,    icon:"bus"},
  ].filter(p=>p.role.includes(user.role));
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",direction:t.dir}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} *{box-sizing:border-box}`}</style>
    <div style={{padding:"18px 28px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
      <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:9,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="book" size={18} color={T.textSub}/></div>
          <div><div style={{fontSize:16,fontWeight:800}}>{t.appName}</div><div style={{fontSize:11,color:T.textSub}}>{t.welcome} {user.name}</div></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} T={T} t={t}/>
          <BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>
        </div>
      </div>
    </div>
    <div style={{maxWidth:900,margin:"0 auto",padding:"40px 28px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
        {portals.map(p=><div key={p.path} onClick={()=>onNavigate(p.path)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:22,cursor:"pointer",transition:"all .15s"}} onMouseEnter={el=>{el.currentTarget.style.borderColor=T.accent;el.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={el=>{el.currentTarget.style.borderColor=T.border;el.currentTarget.style.transform="translateY(0)";}}>
          <div style={{width:40,height:40,borderRadius:10,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}><Ic n={p.icon} size={20} color={T.textSub}/></div>
          <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>{p.title}</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:18}}>{p.sub}</div>
          <div style={{fontSize:12,color:T.textMuted,display:"flex",alignItems:"center",gap:5}}><Ic n="fwd" size={12} color={T.textMuted}/>{t.access}</div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({onBack,dark,onToggleTheme,lang,onToggleLang,creds,onCredsChange,gradePeriods,onPeriodsChange,studentGrades,onStudentGradesChange}){
  const T=dark?DARK:LIGHT,t=TR[lang],dir=t.dir;
  const[students,setStudents]=useState(DEMO_STUDENTS);
  const[teachers,setTeachers]=useState(DEMO_TEACHERS);
  const[modal,setModal]=useState(null);
  const[toast,setToast]=useState("");
  const[sync,setSync]=useState(null);
  const SLABELS=t.subjects;
  const blank=()=>Object.fromEntries(SUBJ_KEYS.map(s=>[s,0]));
  const blankP=()=>Object.fromEntries(gradePeriods.map(p=>[p.id,blank()]));
  const[ns,setNs]=useState({name:"",email:"",phone:"",grade:t.grades1to12[0]});
  const[nsG,setNsG]=useState(()=>blankP());
  const[nt,setNt]=useState({name:"",email:"",phone:"",subject:"math"});
  const[nc,setNc]=useState({email:"",password:"",name:"",role:"teacher",phone:""});
  const[np,setNp]=useState("");

  useEffect(()=>{
    async function load(){
      const [dS,dT,dCreds,dPeriods] = await Promise.all([
        sb.get("students","?order=created_at.asc"),
        sb.get("teachers","?order=created_at.asc"),
        sb.get("approved_logins","?select=*"),
        sb.get("grade_periods","?order=id.asc")
      ]);
      if(dS&&dS.length>0){setStudents(dS.map(s=>({id:s.id,name:s.name,email:s.email,grade:s.grade,phone:s.phone||""})));setSync("ok");}
      else if(dS===null){setSync("fail");}
      if(dT&&dT.length>0){setTeachers(dT.map(t=>({id:t.id,name:t.name,email:t.email,subject:t.subject,subjectDisplay:t.subject_display||t.subject,phone:t.phone||""})));}
      // apply remote approved_logins -> merge into creds
      if(Array.isArray(dCreds) && dCreds.length>0){
        try{
          const obj = {};
          dCreds.forEach(r=>{ if(r.email) obj[r.email] = {password:r.password||"", name:r.name||"", role:r.role||"teacher", metadata:r.metadata||{}}; });
          onCredsChange(prev=>({...prev,...obj}));
          setSync("ok");
        }catch{}
      }
      // apply remote grade_periods
      if(Array.isArray(dPeriods) && dPeriods.length>0){
        try{ onPeriodsChange(dPeriods.map(p=>({id:p.id,label:p.label}))); setSync("ok"); }catch{}
      }
    }
    load();
  },[onCredsChange,onPeriodsChange]);

  const addStudent=async()=>{
    if(!ns.name||!ns.email)return;
    const id=`s${Date.now()}`;
    const newS={...ns,id};
    setStudents(p=>[...p,newS]);
    onStudentGradesChange(prev=>({...prev,[id]:nsG}));
    setNs({name:"",email:"",phone:"",grade:t.grades1to12[0]});
    setNsG(blankP()); setModal(null); setToast(t.studentAdded);
    const ok=await sb.upsert("students",[{id,name:newS.name,email:newS.email,grade:newS.grade,phone:newS.phone||null}]);
    setSync(ok?"ok":"fail");
  };
  const addTeacher=async()=>{
    if(!nt.name||!nt.email||!nt.subject)return;
    const sl=SLABELS[SUBJ_KEYS.indexOf(nt.subject)]||nt.subject;
    const id=`t${Date.now()}`;
    const newT={...nt,id,subjectDisplay:sl};
    setTeachers(p=>[...p,newT]);
    setNt({name:"",email:"",phone:"",subject:"math"});setModal(null);setToast(t.teacherAdded);
    const ok=await sb.upsert("teachers",[{id,name:newT.name,email:newT.email,subject:newT.subject,subject_display:sl,phone:newT.phone||null}]);
    setSync(ok?"ok":"fail");
  };
  const addCred=async()=>{
    if(!nc.email||!nc.password||!nc.name) return;
    const newCred={password:nc.password,name:nc.name,role:nc.role,metadata:{phone:nc.phone}};
    onCredsChange({...creds,[nc.email]:newCred});
    setNc({email:"",password:"",name:"",role:"teacher",phone:""});
    setModal(null); setToast(t.credAdded);
    try{
      const body={email:nc.email,password:nc.password,name:nc.name,role:nc.role,metadata:{phone:nc.phone}};
      const r = await sb.upsert("approved_logins",[body]);
      setSync(r?"ok":"fail");
    }catch{ setSync("fail"); }
  };
  const addPeriod=async()=>{
    if(!np.trim()) return;
    const id=`p${Date.now()}`;
    onPeriodsChange(prev=>[...prev,{id,label:np.trim()}]);
    onStudentGradesChange(prev=>{const u={...prev};Object.keys(u).forEach(sid=>{u[sid]={...u[sid],[id]:blank()};});return u;});
    setNp(""); setToast(t.periodAdded);
    try{
      const r = await sb.upsert("grade_periods",[{id,label:np.trim()}]);
      setSync(r?"ok":"fail");
    }catch{ setSync("fail"); }
  };
  const delPeriod=async pid=>{
    onPeriodsChange(prev=>prev.filter(p=>p.id!==pid));
    onStudentGradesChange(prev=>{const u={...prev};Object.keys(u).forEach(sid=>{const g={...u[sid]};delete g[pid];u[sid]=g;});return u;});
    setToast(t.periodDeleted);
    try{ const ok = await sb.del("grade_periods",{id:pid}); setSync(ok?"ok":"fail"); }catch{ setSync("fail"); }
  };
  const delCred=async email=>{
    if(email==="admin@school.edu") return;
    const u={...creds}; delete u[email]; onCredsChange(u); setToast(t.credDeleted);
    try{ const ok = await sb.del("approved_logins",{email}); setSync(ok?"ok":"fail"); }catch{ setSync("fail"); }
  };
  const rc={admin:T.warn,teacher:T.success,student:"#60a5fa",bus_driver:T.textSub};

  return <PageShell T={T} t={t} dark={dark} onToggleTheme={onToggleTheme} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.admin} icon="admin" sync={sync}>
    {toast&&<Toast msg={toast} onDone={()=>setToast("")} T={T}/>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
      {[[t.students,students.length,"users",T.success],[t.teachers,teachers.length,"teacher",T.warn],[t.grades,[...new Set(students.map(s=>s.grade))].length,"grades","#60a5fa"]].map(([l,v,ic,c])=>
        <Card T={T} key={l} style={{padding:"18px 22px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:6}}>{l}</div><div style={{fontSize:30,fontWeight:800}}>{v}</div></div><div style={{width:38,height:38,borderRadius:9,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={ic} size={18} color={c}/></div></div></Card>
      )}
    </div>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="user" size={16} color={T.textSub}/>{t.approvedLogins}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("cred")}><Ic n="plus" size={13} color={T.text}/>{t.addCredential}</BtnO></div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.roleLabel}</TH><TH T={T}>{t.phone}</TH><TH T={T}/></tr></thead>
        <tbody>{Object.entries(creds).map(([email,u])=><tr key={email}>
          <TD T={T} bold>{u.name}</TD><TD T={T}>{email}</TD>
          <td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${rc[u.role]||T.accent}18`,color:rc[u.role]||T.accent}}>{t.roles[u.role]||u.role}</span></td>
          <TD T={T}>{u.metadata?.phone||"—"}</TD>
          <td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>{email!=="admin@school.edu"&&<button onClick={()=>delCred(email)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button>}</td>
        </tr>)}</tbody>
      </table></div>
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="attend" size={16} color={T.textSub}/>{t.gradePeriods}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("period")}><Ic n="plus" size={13} color={T.text}/>{t.addPeriod}</BtnO></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {gradePeriods.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:8,background:T.surface,border:`1px solid ${T.border2}`}}><span style={{fontSize:12,fontWeight:600,color:T.text}}>{p.label}</span><button onClick={()=>delPeriod(p.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.danger,fontSize:14,lineHeight:1,padding:0}}>×</button></div>)}
        {gradePeriods.length===0&&<div style={{fontSize:12,color:T.textMuted}}>—</div>}
      </div>
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="users" size={16} color={T.textSub}/>{t.students}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("student")}><Ic n="plus" size={13} color={T.text}/>{t.addStudent}</BtnO></div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}>{t.grade}</TH></tr></thead><tbody>{students.map(s=><tr key={s.id}><TD T={T} bold>{s.name}</TD><TD T={T}>{s.email}</TD><TD T={T}>{s.phone||"—"}</TD><TD T={T}>{s.grade}</TD></tr>)}</tbody></table></div>
    </Card>

    <Card T={T}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="teacher" size={16} color={T.textSub}/>{t.teachers}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("teacher")}><Ic n="plus" size={13} color={T.text}/>{t.addTeacher}</BtnO></div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}>{t.subject}</TH></tr></thead><tbody>{teachers.map(tt=><tr key={tt.id}><TD T={T} bold>{tt.name}</TD><TD T={T}>{tt.email}</TD><TD T={T}>{tt.phone||"—"}</TD><TD T={T}>{tt.subjectDisplay||tt.subject}</TD></tr>)}</tbody></table></div>
    </Card>

    <Modal open={modal==="cred"} onClose={()=>setModal(null)} title={t.addCredential} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["password",t.newPassword,"password"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={nc[f]} onChange={e=>setNc(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:18}}><Lbl T={T}>{t.roleLabel}</Lbl><Sel T={T} value={nc.role} onChange={e=>setNc(p=>({...p,role:e.target.value}))}>{["admin","teacher","student","bus_driver"].map(r=><option key={r} value={r}>{t.roles[r]}</option>)}</Sel></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addCred}><Ic n="plus" size={14} color={T.accentInv}/>{t.addCredential}</BtnP>
    </Modal>
    <Modal open={modal==="period"} onClose={()=>setModal(null)} title={t.addPeriod} T={T} dir={dir}>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.periodName}</Lbl><Inp T={T} value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPeriod()}/></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addPeriod}><Ic n="plus" size={14} color={T.accentInv}/>{t.addPeriod}</BtnP>
    </Modal>
    <Modal open={modal==="student"} onClose={()=>setModal(null)} title={t.addStudent} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={ns[f]} onChange={e=>setNs(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:16}}><Lbl T={T}>{t.gradeLevel}</Lbl><Sel T={T} value={ns.grade} onChange={e=>setNs(p=>({...p,grade:e.target.value}))}>{t.grades1to12.map(g=><option key={g} value={g}>{g}</option>)}</Sel></div>
      {gradePeriods.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:T.textMuted,marginBottom:12}}>{t.initialGrades}</div>{gradePeriods.map(period=><div key={period.id} style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:T.textSub,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>{period.label}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{SUBJ_KEYS.map((sk,si)=><div key={sk}><Lbl T={T}>{SLABELS[si]}</Lbl><Inp T={T} type="number" min="0" max="100" value={nsG[period.id]?.[sk]??0} onChange={e=>setNsG(prev=>({...prev,[period.id]:{...prev[period.id],[sk]:+e.target.value}}))}/></div>)}</div></div>)}</div>}
      <BtnP T={T} style={{width:"100%"}} onClick={addStudent}><Ic n="plus" size={14} color={T.accentInv}/>{t.addStudent}</BtnP>
    </Modal>
    <Modal open={modal==="teacher"} onClose={()=>setModal(null)} title={t.addTeacher} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={nt[f]} onChange={e=>setNt(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:18}}><Lbl T={T}>{t.subject}</Lbl><Sel T={T} value={nt.subject} onChange={e=>setNt(p=>({...p,subject:e.target.value}))}>{SUBJ_KEYS.map((sk,si)=><option key={sk} value={sk}>{SLABELS[si]}</option>)}</Sel></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addTeacher}><Ic n="plus" size={14} color={T.accentInv}/>{t.addTeacher}</BtnP>
    </Modal>
  </PageShell>;
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
function TeacherDashboard({user,onBack,dark,onToggleTheme,lang,onToggleLang,onSignOut,gradePeriods,studentGrades,onStudentGradesChange}){
  const T=dark?DARK:LIGHT,t=TR[lang],dir=t.dir;
  const[students]=useState(DEMO_STUDENTS);
  const[studAtt]=useState(STUDENT_ATT);
  const[activeGrade,setActiveGrade]=useState(null);
  const[tab,setTab]=useState("attendance");
  const[editSt,setEditSt]=useState(null);
  const[gVals,setGVals]=useState({});
  const[toast,setToast]=useState("");
  const[sync,setSync]=useState(null);
  const SLABELS=t.subjects;
  // Teacher's subject — ONLY this subject is editable
  const tSubjKey=user.metadata?.subject||"math";
  const tSubjLabel=SLABELS[SUBJ_KEYS.indexOf(tSubjKey)]||tSubjKey;
  const grouped=students.reduce((a,s)=>{(a[s.grade]=a[s.grade]||[]).push(s);return a;},{});

  const openEdit=st=>{
    const ex=studentGrades[st.id]||{};
    const v={};
    gradePeriods.forEach(p=>{v[p.id]={...Object.fromEntries(SUBJ_KEYS.map(s=>[s,0])),...(ex[p.id]||{})};});
    setGVals(v);setEditSt(st);
  };
  const saveGrades=async()=>{
    if(!editSt)return;
    onStudentGradesChange(prev=>({...prev,[editSt.id]:gVals}));
    setToast(t.gradesSaved);
    for(const p of gradePeriods){await sb.upsert("grades",[{student_id:editSt.id,period_id:p.id,...gVals[p.id]}]);}
    setSync("ok");setEditSt(null);
  };

  return <PageShell T={T} t={t} dark={dark} onToggleTheme={onToggleTheme} lang={lang} onToggleLang={onToggleLang} onBack={()=>{}} title={t.teacher} icon="teacher" sync={sync}
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    {toast&&<Toast msg={toast} onDone={()=>setToast("")} T={T}/>}
    <InfoCard T={T} name={user.name} icon="teacher" details={[{icon:"book",label:t.subject,value:tSubjLabel},{icon:"phone",label:t.phone,value:user.metadata?.phone||"—"}]}/>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:9,background:`${T.warn}14`,border:`1px solid ${T.warn}33`,marginBottom:22,fontSize:12,color:T.warn}}>
      <Ic n="alert" size={14} color={T.warn}/>{t.mySubjectOnly}: <strong style={{margin:"0 4px"}}>{tSubjLabel}</strong>
    </div>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:T.textMuted,marginBottom:14,display:"flex",alignItems:"center",gap:6}}><Ic n="users" size={13} color={T.textMuted}/>{t.classes}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
      {Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([grade,studs])=><div key={grade} onClick={()=>{setActiveGrade(grade);setTab("attendance");}} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:20,cursor:"pointer",transition:"all .15s"}} onMouseEnter={el=>{el.currentTarget.style.borderColor=T.accent;el.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={el=>{el.currentTarget.style.borderColor=T.border;el.currentTarget.style.transform="translateY(0)";}}>
        <div style={{fontWeight:700,marginBottom:5}}>{grade}</div>
        <div style={{fontSize:12,color:T.textSub,marginBottom:12}}>{studs.length} {t.students}</div>
        {studs.slice(0,3).map(s=><div key={s.id} style={{fontSize:11,color:T.textMuted,marginBottom:3,display:"flex",alignItems:"center",gap:5}}><Ic n="user" size={10} color={T.textMuted}/>{s.name}</div>)}
        {studs.length>3&&<div style={{fontSize:11,color:T.textMuted}}>+{studs.length-3}</div>}
      </div>)}
    </div>

    <Modal open={!!activeGrade} onClose={()=>setActiveGrade(null)} title={activeGrade||""} width={740} T={T} dir={dir}>
      <div style={{display:"flex",gap:6,marginBottom:22}}>
        {[["attendance",t.attendance,"attend"],["grades",t.gradesTxt,"grades"]].map(([tb,lbl,ic])=><button key={tb} onClick={()=>setTab(tb)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 18px",borderRadius:7,border:`1px solid ${tab===tb?T.accent:T.border}`,background:tab===tb?T.accent:"transparent",color:tab===tb?T.accentInv:T.textSub,cursor:"pointer",fontSize:12,fontWeight:600}}><Ic n={ic} size={13} color={tab===tb?T.accentInv:T.textSub}/>{lbl}</button>)}
      </div>
      {tab==="attendance"&&<AttendanceCalendar T={T} t={t} editable={true} students={grouped[activeGrade]||[]} initAtt={studAtt} onSave={async(sid,key,days)=>{await sb.upsert("attendance",[{student_id:sid,year_month:key,days}]);setToast(t.attendanceSaved);setActiveGrade(null);}}/>}
      {tab==="grades"&&<table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}/></tr></thead>
        <tbody>{(grouped[activeGrade]||[]).map(st=><tr key={st.id}><TD T={T} bold>{st.name}</TD><TD T={T}>{st.email}</TD><TD T={T}>{st.phone||"—"}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><BtnO T={T} style={{padding:"5px 12px",fontSize:11}} onClick={()=>openEdit(st)}><Ic n="edit" size={12} color={T.text}/>{t.edit}</BtnO></td></tr>)}</tbody>
      </table>}
    </Modal>

    {/* Edit grades — teacher edits ONLY their subject */}
    <Modal open={!!editSt} onClose={()=>setEditSt(null)} title={`${t.editGrades} — ${editSt?.name}`} T={T} dir={dir}>
      {gradePeriods.length===0?<div style={{color:T.textMuted,fontSize:13,textAlign:"center",padding:"28px 0"}}>{t.noGradePeriods}</div>:<>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"9px 13px",borderRadius:8,background:`${T.warn}14`,border:`1px solid ${T.warn}33`,marginBottom:20,fontSize:12,color:T.warn}}>
          <Ic n="book" size={13} color={T.warn}/>{t.mySubjectOnly}: <strong style={{margin:"0 4px"}}>{tSubjLabel}</strong>
        </div>
        {gradePeriods.map(period=><div key={period.id} style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,color:T.textSub,marginBottom:10,paddingBottom:7,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6}}><Ic n="attend" size={12} color={T.textMuted}/>{period.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {SUBJ_KEYS.map((sk,si)=>{
              const mine=sk===tSubjKey;
              return <div key={sk} style={{opacity:mine?1:0.35}}>
                <Lbl T={T}>{SLABELS[si]}{mine&&<span style={{color:T.success,marginRight:4}}> ✓</span>}</Lbl>
                <Inp T={T} type="number" min="0" max="100" value={gVals[period.id]?.[sk]??0} disabled={!mine}
                  onChange={e=>mine&&setGVals(prev=>({...prev,[period.id]:{...prev[period.id],[sk]:+e.target.value}}))}
                  style={{cursor:mine?"text":"not-allowed",background:mine?T.surface:T.bg}}/>
              </div>;
            })}
          </div>
        </div>)}
        <BtnP T={T} style={{width:"100%"}} onClick={saveGrades}><Ic n="save" size={15} color={T.accentInv}/>{t.saveGrades}</BtnP>
      </>}
    </Modal>
  </PageShell>;
}

// ── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({user,onBack,dark,onToggleTheme,lang,onToggleLang,onSignOut,gradePeriods,studentGrades}){
  const T=dark?DARK:LIGHT,t=TR[lang];
  const[tab,setTab]=useState("grades");
  const sr=DEMO_STUDENTS.find(s=>s.email===user.email)||{};
  const info={name:user.name,grade:user.metadata?.grade||"الصف 10",phone:user.metadata?.phone||sr.phone||"—"};
  const SLABELS=t.subjects;
  const gc=v=>v>=90?T.success:v>=80?T.text:v>=70?T.warn:T.danger;
  const sid=sr.id||"s1";
  const myAtt={[sid]:STUDENT_ATT[sid]||STUDENT_ATT["s1"]};
  const myG=studentGrades[sid]||{};
  const sAvg=sk=>{const v=gradePeriods.map(p=>myG[p.id]?.[sk]??0).filter(v=>v>0);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;};
  const finals=Object.fromEntries(SUBJ_KEYS.map(s=>[s,sAvg(s)]));
  const total=Math.round(SUBJ_KEYS.reduce((a,s)=>a+finals[s],0)/SUBJ_KEYS.length);

  return <PageShell T={T} t={t} dark={dark} onToggleTheme={onToggleTheme} lang={lang} onToggleLang={onToggleLang} onBack={()=>{}} title={t.student} icon="student"
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    <div style={{display:"flex",gap:16,alignItems:"stretch",marginBottom:24,flexWrap:"wrap"}}>
      <InfoCard T={T} name={info.name} icon="student" details={[{icon:"grades",label:t.grade,value:info.grade},{icon:"phone",label:t.phone,value:info.phone}]}/>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"18px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:110,flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:6}}>{t.overallAvg}</div>
        <div style={{fontSize:38,fontWeight:800,color:gc(total),lineHeight:1}}>{total||"—"}</div>
      </div>
    </div>
    <div style={{display:"flex",gap:7,marginBottom:22}}>
      {[["grades",t.gradesTxt,"grades"],["attendance",t.attendance,"attend"]].map(([tb,lbl,ic])=><button key={tb} onClick={()=>setTab(tb)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:8,border:`1px solid ${tab===tb?T.accent:T.border}`,background:tab===tb?T.accent:"transparent",color:tab===tb?T.accentInv:T.textSub,cursor:"pointer",fontSize:13,fontWeight:600}}><Ic n={ic} size={14} color={tab===tb?T.accentInv:T.textSub}/>{lbl}</button>)}
    </div>
    {tab==="grades"&&<Card T={T}>{gradePeriods.length===0?<div style={{color:T.textMuted,fontSize:13,padding:"20px 0",textAlign:"center"}}>{t.noGradePeriods}</div>:
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
        <thead><tr><TH T={T}>{t.period}</TH>{SUBJ_KEYS.map((sk,i)=><TH T={T} center key={sk}>{SLABELS[i]}</TH>)}</tr></thead>
        <tbody>
          {gradePeriods.map(p=>{const pg=myG[p.id]||{};return <tr key={p.id}><TD T={T} bold>{p.label}</TD>{SUBJ_KEYS.map(s=><TD T={T} center key={s} color={gc(pg[s]??0)}>{pg[s]??"—"}</TD>)}</tr>;})}
          <tr style={{background:T.surface}}><td style={{padding:"12px 14px",fontWeight:800,fontSize:13,color:T.text,textAlign:"right"}}>{t.final}</td>{SUBJ_KEYS.map(s=><td key={s} style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:13,color:gc(finals[s])}}>{finals[s]||"—"}</td>)}</tr>
        </tbody>
      </table></div>
    }</Card>}
    {tab==="attendance"&&<Card T={T}><AttendanceCalendar T={T} t={t} editable={false} students={[{id:sid,name:info.name}]} initAtt={myAtt}/></Card>}
  </PageShell>;
}

// ── Bus Driver Dashboard ──────────────────────────────────────────────────────
function BusDriverDashboard({user,onBack,dark,onToggleTheme,lang,onToggleLang,onSignOut}){
  const T=dark?DARK:LIGHT,t=TR[lang];
  const[tracking,setTracking]=useState(false);
  const info={name:user.name,bus:user.metadata?.busNumber||"حافلة 45",route:user.metadata?.route||"مسار أ",phone:user.metadata?.phone||"—"};

  return <PageShell T={T} t={t} dark={dark} onToggleTheme={onToggleTheme} lang={lang} onToggleLang={onToggleLang} onBack={()=>{}} title={t.busDriver} icon="bus"
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    <InfoCard T={T} name={info.name} icon="bus" details={[{icon:"map",label:"المسار",value:info.route},{icon:"phone",label:t.phone,value:info.phone},{icon:"bus",label:"الحافلة",value:info.bus}]}/>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
      {tracking&&<div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:T.success}}><span style={{width:8,height:8,borderRadius:"50%",background:T.success,animation:"pulse 1.2s infinite"}}/>{t.trackingActive}</div>}
      <button onClick={()=>setTracking(v=>!v)} style={{display:"inline-flex",alignItems:"center",gap:7,cursor:"pointer",fontWeight:600,borderRadius:8,border:tracking?`1px solid ${T.danger}`:"none",background:tracking?"transparent":T.accent,color:tracking?T.danger:T.accentInv,padding:"10px 20px",fontSize:13}}>
        <Ic n={tracking?"stop":"gps"} size={15} color={tracking?T.danger:T.accentInv}/>{tracking?t.stopTracking:t.startGps}
      </button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
      <Card T={T}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700,marginBottom:4}}><Ic n="map" size={16} color={T.textSub}/>{t.liveMap}</div>
        <div style={{fontSize:12,color:T.textSub,marginBottom:16}}>{t.currentLoc}</div>
        <div style={{height:300,background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <Ic n="map" size={32} color={T.textMuted}/><div style={{fontSize:12,color:T.textMuted}}>{t.mapNote}</div>
          {tracking&&<div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:7,border:`1px solid ${T.success}`,color:T.success,fontSize:12,fontWeight:600}}><span style={{width:7,height:7,borderRadius:"50%",background:T.success,animation:"pulse 1.2s infinite"}}/>{t.gpsActive}</div>}
        </div>
      </Card>
      <Card T={T}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700,marginBottom:4}}><Ic n="clock" size={16} color={T.textSub}/>{t.todayStops}</div>
        <div style={{fontSize:12,color:T.textSub,marginBottom:16}}>{t.routeSched}</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {BUS_STOPS.map((stop,i)=><div key={stop.id} style={{background:T.surface,borderRadius:9,padding:"13px 14px",border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:22,height:22,borderRadius:"50%",border:`1px solid ${T.border2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.textSub,flexShrink:0}}>{i+1}</div>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{stop.name}</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2,display:"flex",alignItems:"center",gap:4}}><Ic n="clock" size={10} color={T.textMuted}/>{stop.time}</div>
                {stop.students>0&&<div style={{fontSize:11,color:T.textSub,marginTop:2,display:"flex",alignItems:"center",gap:4}}><Ic n="users" size={10} color={T.textSub}/>{stop.students} {t.students}</div>}
              </div>
            </div>
          </div>)}
        </div>
      </Card>
    </div>
  </PageShell>;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App(){
  const[dark,setDark]=useState(true);
  const[lang,setLang]=useState("ar");
  const[creds,setCreds]=useState(DEFAULT_CREDS);
  const[periods,setPeriods]=useState(DEFAULT_PERIODS);
  const[grades,setGrades]=useState(()=>initGrades());
  const getSaved=()=>{try{const s=sessionStorage.getItem("sms_user");return s?JSON.parse(s):null;}catch{return null;}};
  const[user,setUser]=useState(()=>getSaved());
  const[page,setPage]=useState(()=>{const s=getSaved();if(!s)return"login";if(s.role==="teacher")return"teacher";if(s.role==="student")return"student";if(s.role==="bus_driver")return"bus-driver";return"home";});
  const login=(u,keep)=>{setUser(u);if(keep){try{sessionStorage.setItem("sms_user",JSON.stringify(u));}catch{}}if(u.role==="admin")setPage("home");else if(u.role==="teacher")setPage("teacher");else if(u.role==="student")setPage("student");else if(u.role==="bus_driver")setPage("bus-driver");else setPage("home");};
  const logout=()=>{try{sessionStorage.removeItem("sms_user");}catch{}setUser(null);setPage("login");};
  const sh={dark,onToggleTheme:()=>setDark(d=>!d),lang,onToggleLang:()=>setLang(l=>l==="ar"?"en":"ar")};
  if(!user||page==="login")return <Login {...sh} onLogin={login} creds={creds}/>;
  const dp={...sh,user,onBack:()=>{},onSignOut:logout};
  if(page==="home")      return <Home {...sh} user={user} onNavigate={setPage} onSignOut={logout}/>;
  if(page==="admin")     return <AdminDashboard {...sh} onBack={()=>setPage("home")} creds={creds} onCredsChange={setCreds} gradePeriods={periods} onPeriodsChange={setPeriods} studentGrades={grades} onStudentGradesChange={setGrades}/>;
  if(page==="teacher")   return <TeacherDashboard {...dp} gradePeriods={periods} studentGrades={grades} onStudentGradesChange={setGrades}/>;
  if(page==="student")   return <StudentDashboard {...dp} gradePeriods={periods} studentGrades={grades}/>;
  if(page==="bus-driver")return <BusDriverDashboard {...dp}/>;
  return null;
}
