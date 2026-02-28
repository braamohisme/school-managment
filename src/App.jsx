import React, { useState, useEffect, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
// Read from Vite env first, then legacy fallback.
const META_ENV = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
const PROC_ENV = (typeof process !== "undefined" && process.env) ? process.env : {};
const SUPABASE_URL = META_ENV.VITE_SUPABASE_URL || META_ENV.REACT_APP_SUPABASE_URL || PROC_ENV.REACT_APP_SUPABASE_URL || "";
const SUPABASE_KEY = META_ENV.VITE_SUPABASE_KEY || META_ENV.REACT_APP_SUPABASE_KEY || PROC_ENV.REACT_APP_SUPABASE_KEY || "";
const IS_LOCAL_DEV = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const IS_DEV = Boolean(META_ENV.DEV);
const SB_READY = Boolean(SUPABASE_URL && SUPABASE_KEY);
const H = SB_READY ? { "Content-Type":"application/json", apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` } : null;
const esc = v => encodeURIComponent(String(v));
const normalizeEmail = v => String(v||"").trim().toLowerCase();
const normalizeList = v => {
  if(Array.isArray(v))return [...new Set(v.map(x=>String(x||"").trim()).filter(Boolean))];
  const s=String(v||"").trim();
  return s?[s]:[];
};
const teacherSubjectsOf = t => {
  const list=normalizeList(t?.subjects);
  return list.length?list:normalizeList(t?.subject);
};
const teacherGradesOf = t => {
  const list=normalizeList(t?.grades);
  return list.length?list:normalizeList(t?.grade);
};
const firstOrNull = arr => (arr&&arr.length>0?arr[0]:null);
const gradeNumber = g => {
  const m=String(g||"").match(/\d+/);
  return m?Number(m[0]):Number.MAX_SAFE_INTEGER;
};

const sb = {
  async get(table, qs="", accessToken=null) {
    if(!SB_READY)return null;
    try {
      const headers=accessToken?{...H,Authorization:`Bearer ${accessToken}`}:{...H};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`,{headers});
      if(!r.ok)return null;
      const txt=await r.text();
      if(!txt)return [];
      try{return JSON.parse(txt);}catch{return [];}
    } catch { return null; }
  },
  async upsert(table, body, accessToken=null) {
    if(!SB_READY)return null;
    try {
      const headers={...H,Prefer:"resolution=merge-duplicates,return=representation"};
      if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers,body:JSON.stringify(body)});
      if(!r.ok)return null;
      const txt=await r.text();
      if(!txt)return [];
      try{return JSON.parse(txt);}catch{return [];}
    } catch { return null; }
  },
  async upsertWithStatus(table, body, accessToken=null) {
    if(!SB_READY)return {ok:false,status:0,error:"supabase_not_ready"};
    try{
      const headers={...H,Prefer:"resolution=merge-duplicates,return=representation"};
      if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{
        method:"POST",
        headers,
        body:JSON.stringify(body)
      });
      const txt=await r.text().catch(()=>"");
      let parsed=null;
      try{parsed=txt?JSON.parse(txt):null;}catch{}
      return {
        ok:r.ok,
        status:r.status,
        data:parsed,
        error:parsed?.message||parsed?.error||txt||null
      };
    }catch(err){
      return {ok:false,status:0,error:String(err?.message||err)};
    }
  },
  async upsertWithStatusOnConflict(table, body, onConflict, accessToken=null) {
    if(!SB_READY)return {ok:false,status:0,error:"supabase_not_ready"};
    try{
      const headers={...H,Prefer:"resolution=merge-duplicates,return=representation"};
      if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
      const qs=onConflict?`?on_conflict=${encodeURIComponent(onConflict)}`:"";
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`,{
        method:"POST",
        headers,
        body:JSON.stringify(body)
      });
      const txt=await r.text().catch(()=>"");
      let parsed=null;
      try{parsed=txt?JSON.parse(txt):null;}catch{}
      return {
        ok:r.ok,
        status:r.status,
        data:parsed,
        error:parsed?.message||parsed?.error||txt||null
      };
    }catch(err){
      return {ok:false,status:0,error:String(err?.message||err)};
    }
  },
  async del(table, match, accessToken=null) {
    if(!SB_READY)return false;
    try {
      const qs=Object.entries(match).map(([k,v])=>`${k}=eq.${esc(v)}`).join("&");
      const headers=accessToken?{...H,Authorization:`Bearer ${accessToken}`}:{...H};
      const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`,{method:"DELETE",headers});
      return r.ok;
    } catch { return false; }
  },
  async signIn(email,password){
    if(!SB_READY)return {ok:false,status:0,error:"supabase_not_ready",data:null};
    try{
      const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
        method:"POST",
        headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY},
        body:JSON.stringify({email,password})
      });
      const data=await r.json().catch(()=>null);
      if(r.ok)return {ok:true,status:r.status,error:null,data};
      return {
        ok:false,
        status:r.status,
        error:data?.msg||data?.error_description||data?.error||"login_failed",
        data:null
      };
    }catch{
      return {ok:false,status:0,error:"network_or_auth_failed",data:null};
    }
  },
  async signUp(email,password){
    if(!SB_READY)return {ok:false};
    try{
      const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{
        method:"POST",
        headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY},
        body:JSON.stringify({email,password})
      });
      const data=await r.json().catch(()=>null);
      if(r.ok)return {ok:true,data};
      const msg=(data?.msg||data?.error_description||data?.error||"").toLowerCase();
      if(msg.includes("already")||msg.includes("exists"))return {ok:true,alreadyExists:true,data};
      return {ok:false,data,error:msg||"signup_failed"};
    }catch{return {ok:false,error:"network_or_signup_failed"};}
  },
  async adminCreateUser(payload,accessToken=null){
    try{
      const headers={"Content-Type":"application/json"};
      if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
      const r=await fetch("/api/admin-create-user",{
        method:"POST",
        headers,
        body:JSON.stringify(payload)
      });
      const data=await r.json().catch(()=>null);
      return {ok:r.ok,status:r.status,data};
    }catch{
      return {ok:false,status:0,data:null};
    }
  }
};

// ── Themes ────────────────────────────────────────────────────────────────────
const DARK={bg:"#0a0a0a",surface:"#111",card:"#161616",border:"#242424",border2:"#2e2e2e",text:"#f0f0f0",textSub:"#888",textMuted:"#444",accent:"#f0f0f0",accentInv:"#0a0a0a",success:"#4ade80",warn:"#facc15",danger:"#f87171",toggle:"#fff"};
const LIGHT={bg:"#f5f5f5",surface:"#ebebeb",card:"#fff",border:"#e0e0e0",border2:"#ccc",text:"#111",textSub:"#666",textMuted:"#aaa",accent:"#111",accentInv:"#fff",success:"#16a34a",warn:"#ca8a04",danger:"#dc2626",toggle:"#111"};
const LEAF={bg:"#FBFAF5",surface:"#EFE8DA",card:"#fffdf7",border:"#e5dccb",border2:"#d7cab3",text:"#2B3A8C",textSub:"#49607a",textMuted:"#8f97a5",accent:"#2F9E44",accentInv:"#ffffff",success:"#2F9E44",warn:"#F4B400",danger:"#E57373",toggle:"#2B3A8C"};
const getTheme=mode=>mode==="dark"?DARK:mode==="leaf"?LEAF:LIGHT;
function useIsMobile(bp=768){
  const get=()=>typeof window!=="undefined"&&window.innerWidth<bp;
  const[m,setM]=useState(get);
  useEffect(()=>{
    const onR=()=>setM(get());
    window.addEventListener("resize",onR);
    return()=>window.removeEventListener("resize",onR);
  },[bp]);
  return m;
}

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
    dir:"rtl",appName:"مدرسة زهور العراق الاهلية",signIn:"سجّل دخولك للمتابعة",
    email:"البريد الإلكتروني",password:"كلمة المرور",signInBtn:"دخول",signingIn:"جارٍ الدخول...",
    keepLoggedIn:"ابقَ متصلاً",demoAccounts:"حسابات تجريبية",
    invalidCreds:"بريد إلكتروني أو كلمة مرور غير صحيحة.",
    emailNotConfirmed:"الحساب موجود لكن البريد غير مُؤكَّد في Supabase.",
    authConfigIssue:"مشكلة إعدادات المصادقة في الخادم (مفاتيح/بيئة).",
    authServiceIssue:"تعذر الاتصال بخدمة تسجيل الدخول. حاول مجددًا.",
    accessDenied:"الدخول مرفوض. لم تتم الموافقة على حسابك.",
    welcome:"مرحباً،",signOut:"خروج",
    admin:"المدير",teacher:"المعلم",student:"الطالب",busDriver:"سائق الحافلة",accountant:"المحاسب",
    schoolOps:"إدارة المدرسة",classAttend:"الفصول والحضور",
    gradesAttend:"الدرجات والحضور",routesGps:"المسارات والموقع",
    access:"دخول",back:"رجوع",
    students:"الطلاب",teachers:"المعلمون",grades:"الدرجات",accountants:"المحاسبون",
    addStudent:"إضافة طالب",addTeacher:"إضافة معلم",addAccountant:"إضافة محاسب",
    name:"الاسم",emailLbl:"البريد",phone:"الهاتف",grade:"الصف",subject:"المادة",
    tuitionTotal:"إجمالي الرسوم",tuitionPaid:"المدفوع",tuitionOwed:"المتبقي",
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
    viewProfile:"عرض الملف",
    clickToToggle:"انقر على يوم لتغيير الحضور",
    selectStudent:"اختر طالباً",dark:"داكن",light:"فاتح",leaf:"ورقي",
    approvedLogins:"الحسابات المعتمدة",addCredential:"إضافة حساب",
    roleLabel:"الدور",newPassword:"كلمة المرور",credAdded:"تمت الإضافة.",credDeleted:"تم الحذف.",deleteBtn:"حذف",allGrades:"كل الصفوف",
    createApprovedLogin:"إنشاء حساب دخول معتمد",loginPwdRequired:"أدخل كلمة مرور لحساب الدخول.",
    editInfo:"تعديل المعلومات",saveChanges:"حفظ التعديلات",changesSaved:"تم حفظ التعديلات.",
    linkedLoginEmailChangeBlocked:"لا يمكن تغيير البريد لأنه مرتبط بحساب دخول معتمد.",
    approvedLoginLinked:"هذا المستخدم لديه حساب دخول معتمد.",
    createLoginOnSave:"إنشاء حساب دخول معتمد عند الحفظ",
    authExistsPwdNotChanged:"هذا البريد لديه حساب مسبقاً. كلمة المرور الجديدة لم تُحدّث. استخدم بريداً آخر أو أعد تعيين كلمة المرور.",
    seeAllGrades:"عرض كل الدرجات",
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
    grades1to12:["الصف الأول","الصف الثاني","الصف الثالث","الصف الرابع","الصف الخامس","الصف السادس"],
    roles:{admin:"مدير",teacher:"معلم",student:"طالب",bus_driver:"سائق حافلة",accountant:"محاسب"},
    subjectsSection:"المواد الدراسية",addSubject:"إضافة مادة",subjectName:"اسم المادة",
    subjectAdded:"تمت إضافة المادة.",subjectDeleted:"تم حذف المادة.",gradeForTeacher:"الصف المسؤول",
    addAnotherSubject:"إضافة مادة أخرى",addAnotherClass:"إضافة صف آخر",
    sortBy:"ترتيب حسب",filterByGrade:"تصفية الصف",gradeAsc:"الصف تصاعدي",gradeDesc:"الصف تنازلي",nameAsc:"الاسم أ-ي",nameDesc:"الاسم ي-أ",
    removeItem:"إزالة",
  },
  en:{
    dir:"ltr",appName:"zhoor al iraq private school",signIn:"Sign in to continue",
    email:"Email",password:"Password",signInBtn:"Sign In",signingIn:"Signing in...",
    keepLoggedIn:"Keep me logged in",demoAccounts:"Demo accounts",
    invalidCreds:"Invalid credentials.",accessDenied:"Access denied.",
    emailNotConfirmed:"Account exists but email is not confirmed in Supabase.",
    authConfigIssue:"Server auth configuration issue (keys/env).",
    authServiceIssue:"Could not reach auth service. Please try again.",
    welcome:"Welcome,",signOut:"Sign out",
    admin:"Admin",teacher:"Teacher",student:"Student",busDriver:"Bus Driver",accountant:"Accountant",
    schoolOps:"School operations",classAttend:"Classes & attendance",
    gradesAttend:"Grades & attendance",routesGps:"Routes & GPS",
    access:"Access",back:"Back",
    students:"Students",teachers:"Teachers",grades:"Grades",accountants:"Accountants",
    addStudent:"Add student",addTeacher:"Add teacher",addAccountant:"Add accountant",
    name:"Name",emailLbl:"Email",phone:"Phone",grade:"Grade",subject:"Subject",
    tuitionTotal:"Total fee",tuitionPaid:"Paid",tuitionOwed:"Owed",
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
    viewProfile:"View Profile",
    clickToToggle:"Click a weekday to toggle attendance",
    selectStudent:"Select student",dark:"Dark",light:"Light",leaf:"Leaf",
    approvedLogins:"Approved Logins",addCredential:"Add credential",
    roleLabel:"Role",newPassword:"Password",credAdded:"Credential added.",credDeleted:"Removed.",deleteBtn:"Remove",allGrades:"All Grades",
    createApprovedLogin:"Create approved login",loginPwdRequired:"Enter a password for approved login.",
    editInfo:"Edit info",saveChanges:"Save changes",changesSaved:"Changes saved.",
    linkedLoginEmailChangeBlocked:"Cannot change email because it is linked to an approved login.",
    approvedLoginLinked:"This user already has an approved login.",
    createLoginOnSave:"Create approved login on save",
    authExistsPwdNotChanged:"This email already has an Auth account. New password was not changed. Use another email or reset password.",
    seeAllGrades:"See all grades",
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
    grades1to12:["1st Grade","2nd Grade","3rd Grade","4th Grade","5th Grade","6th Grade"],
    roles:{admin:"Admin",teacher:"Teacher",student:"Student",bus_driver:"Bus Driver",accountant:"Accountant"},
    subjectsSection:"Subjects",addSubject:"Add subject",subjectName:"Subject name",
    subjectAdded:"Subject added.",subjectDeleted:"Subject removed.",gradeForTeacher:"Assigned Grade",
    addAnotherSubject:"Add another subject",addAnotherClass:"Add another class",
    sortBy:"Sort by",filterByGrade:"Filter grade",gradeAsc:"Grade ascending",gradeDesc:"Grade descending",nameAsc:"Name A-Z",nameDesc:"Name Z-A",
    removeItem:"Remove",
  }
};

const SCHOOL_LOGO_SRC="/logo2.png";
const SCHOOL_LOGO_FALLBACK="/logo.jpg";
const SCHOOL_NAME_AR="مدرسة زهور العراق الاهلية";
const SCHOOL_NAME_EN="Zhoor Al-iraq private school";
const SOCIAL_LINKS={
  facebook:"https://www.facebook.com/profile.php?id=100063930190683",
  phone:"tel:07710379919",
  location:"https://maps.app.goo.gl/G9VqwDkP88mocFQ37",
};

// ── Static data ───────────────────────────────────────────────────────────────
const DEFAULT_CREDS = {
  "admin@school.edu":   {name:"مدير النظام",     role:"admin",      metadata:{phone:"+966 50 000 0001"}},
  "teacher@school.edu": {name:"د. سارة جونسون",  role:"teacher",    metadata:{subject:"math",subjects:["math","science"],grade:"الصف الخامس",grades:["الصف الرابع","الصف الخامس"],phone:"+966 50 123 4567"}},
  "student@school.edu": {name:"أليكس مارتينيز",  role:"student",    metadata:{grade:"الصف الخامس",phone:"+966 50 987 6543"}},
  "driver@school.edu":  {name:"جون السائق",      role:"bus_driver", metadata:{busNumber:"حافلة 45",route:"مسار أ - الحي الشرقي",phone:"+966 50 456 7890"}},
};
const DEMO_PASSWORDS = {
  "admin@school.edu":"admin123",
  "teacher@school.edu":"teacher123",
  "student@school.edu":"student123",
  "driver@school.edu":"driver123",
};
const SUBJ_KEYS = ["math","science","english","history","art"];
const DEMO_STUDENTS = [
  {id:"s1",name:"أليكس مارتينيز",email:"student@school.edu",grade:"الصف الخامس",phone:"+966 50 987 6543",tuition_total:10000,tuition_paid:7000},
  {id:"s2",name:"جيمي لي",        email:"jamie@school.edu",  grade:"الصف الخامس",phone:"+966 50 234 5678",tuition_total:10000,tuition_paid:5500},
  {id:"s3",name:"سام ريفيرا",     email:"sam@school.edu",    grade:"الصف السادس",phone:"+966 50 345 6789",tuition_total:11000,tuition_paid:9000},
  {id:"s4",name:"بريا باتيل",     email:"priya@school.edu",  grade:"الصف الرابع",phone:"+966 50 456 7890",tuition_total:11000,tuition_paid:3000},
  {id:"s5",name:"كريس نجوين",     email:"chris@school.edu",  grade:"الصف الثالث",phone:"+966 50 567 8901",tuition_total:12000,tuition_paid:12000},
];
const DEMO_TEACHERS = [
  {id:"t1",name:"د. سارة جونسون",email:"teacher@school.edu",subject:"math",subjects:["math","science"],subjectDisplay:"رياضيات، علوم",grade:"الصف الخامس",grades:["الصف الرابع","الصف الخامس"],phone:"+966 50 123 4567"},
  {id:"t2",name:"م. داود بارك",   email:"david@school.edu",  subject:"science",subjects:["science"],subjectDisplay:"علوم",grade:"الصف السادس",grades:["الصف السادس"],phone:"+966 50 678 9012"},
];
const DEMO_ACCOUNTANTS = [
  {id:"a1",name:"ليلى المحاسبة",email:"accountant@school.edu",phone:"+966 50 222 1111"},
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
function ThemeTabs({themeMode,onChange,T,t}){
  const opts=[["dark",t.dark],["light",t.light],["leaf",t.leaf]];
  return <div style={{display:"flex",alignItems:"center",background:T.surface,border:`1px solid ${T.border2}`,borderRadius:8,padding:2}}>
    {opts.map(([id,lbl])=><button key={id} onClick={()=>onChange(id)} style={{padding:"5px 10px",border:"none",borderRadius:6,background:themeMode===id?T.accent:"transparent",color:themeMode===id?T.accentInv:T.textSub,fontSize:11,fontWeight:700,cursor:"pointer"}}>{lbl}</button>)}
  </div>;
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
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20,animation:"fadeOverlay .2s ease"}}><div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:28,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",direction:dir,animation:"popIn .22s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><span style={{fontSize:15,fontWeight:700,color:T.text}}>{title}</span><button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,color:T.textSub,cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button></div>{children}</div></div>;
}
function Toast({msg,onDone,T}){
  const[v,setV]=useState(true);
  useEffect(()=>{const id=setTimeout(()=>{setV(false);onDone();},2800);return()=>clearTimeout(id);},[]);
  if(!v||!msg)return null;
  const err=msg.startsWith("!");
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:200,background:err?T.danger:T.success,color:"#fff",padding:"11px 22px",borderRadius:10,fontWeight:600,fontSize:13,boxShadow:"0 4px 28px rgba(0,0,0,.3)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}><Ic n={err?"alert":"check"} size={15} color="#fff"/>{err?msg.slice(1):msg}</div>;
}
function Lbl({children,T}){return <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMuted,display:"block",marginBottom:6}}>{children}</span>;}
function Inp({T,...p}){return <input {...p} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",...p.style}} onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>;}
function Sel({T,children,...p}){return <select {...p} style={{width:"100%",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",...p.style}}>{children}</select>;}
function BtnP({T,style,children,onMouseEnter,onMouseLeave,...p}){
  return <button {...p}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 18px rgba(0,0,0,.12)";onMouseEnter&&onMouseEnter(e);}}
    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";onMouseLeave&&onMouseLeave(e);}}
    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontWeight:600,borderRadius:8,border:"none",background:T.accent,color:T.accentInv,padding:"10px 20px",fontSize:13,transition:"transform .16s ease, box-shadow .16s ease",...style}}>
    {children}
  </button>;
}
function BtnO({T,style,children,onMouseEnter,onMouseLeave,...p}){
  return <button {...p}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 14px rgba(0,0,0,.08)";onMouseEnter&&onMouseEnter(e);}}
    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";onMouseLeave&&onMouseLeave(e);}}
    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontWeight:500,borderRadius:8,border:`1px solid ${T.border2}`,background:"transparent",color:T.text,padding:"9px 16px",fontSize:13,transition:"transform .16s ease, box-shadow .16s ease",...style}}>
    {children}
  </button>;
}
function BtnG({T,style,children,onMouseEnter,onMouseLeave,...p}){
  return <button {...p}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";onMouseEnter&&onMouseEnter(e);}}
    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";onMouseLeave&&onMouseLeave(e);}}
    style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",fontWeight:500,borderRadius:7,border:"none",background:"transparent",color:T.textSub,padding:"6px 8px",fontSize:13,transition:"transform .16s ease",...style}}>
    {children}
  </button>;
}
function Card({T,style,children}){return <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:22,boxShadow:"0 10px 30px rgba(0,0,0,.06)",transition:"border-color .18s ease, box-shadow .18s ease, transform .18s ease",animation:"fadeInUp .26s ease",...style}}>{children}</div>;}
function TH({children,center,T}){return <th style={{padding:"9px 14px",textAlign:center?"center":"right",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMuted,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>{children}</th>;}
function TD({children,bold,center,color,T}){return <td style={{padding:"12px 14px",fontSize:13,fontWeight:bold?600:400,color:color||(bold?T.text:T.textSub),textAlign:center?"center":"right",borderBottom:`1px solid ${T.border}`}}>{children}</td>;}
function Divider({T}){return <div style={{height:1,background:T.border,margin:"20px 0"}}/>;}

function SchoolBrand({T,lang="ar",compact=false,animate=false,stacked=false}){
  const isMobile=useIsMobile();
  const primary=lang==="ar"?SCHOOL_NAME_AR:SCHOOL_NAME_EN;
  const mobileCompact=compact&&isMobile;
  const forceStacked=stacked||mobileCompact;
  const size=compact?(isMobile?36:48):(isMobile?96:120);
  const titleSize=compact?(isMobile?10:13):(isMobile?15:20);
  return <div style={{display:"flex",flexDirection:forceStacked?"column":"row",alignItems:"center",gap:compact?8:12,animation:animate?"brandFloat 4.8s ease-in-out infinite":"brandReveal .42s ease",minWidth:0,maxWidth:isMobile?(compact?132:260):"none"}}>
    <div style={{width:size,height:size,borderRadius:compact?10:16,overflow:"hidden",border:`1px solid ${T.border}`,background:T.surface,boxShadow:compact?"0 6px 16px rgba(0,0,0,.12)":"0 10px 24px rgba(0,0,0,.16)",flexShrink:0}}>
      <img
        src={SCHOOL_LOGO_SRC}
        alt={primary}
        style={{width:"100%",height:"100%",objectFit:"cover"}}
        onError={e=>{
          if(e.currentTarget.src.includes(SCHOOL_LOGO_FALLBACK))return;
          e.currentTarget.src=SCHOOL_LOGO_FALLBACK;
        }}
      />
    </div>
    <div style={{lineHeight:1.15,textAlign:forceStacked?"center":"start",minWidth:0,maxWidth:isMobile?(compact?128:260):"none"}}>
      <div style={{fontSize:titleSize,fontWeight:800,color:T.text,whiteSpace:isMobile?"normal":"nowrap",wordBreak:"break-word",overflowWrap:"anywhere"}}>{primary}</div>
    </div>
  </div>;
}

function SocialLinksFooter({T,lang="ar"}){
  const isMobile=useIsMobile();
  const items=[
    ["Facebook",SOCIAL_LINKS.facebook,"facebook"],
    [lang==="ar"?"الهاتف":"Phone",SOCIAL_LINKS.phone,"phone"],
    [lang==="ar"?"الموقع":"Location",SOCIAL_LINKS.location,"map"],
  ].filter(([,href])=>Boolean(href));
  if(items.length===0)return null;
  return <div style={{position:"fixed",left:isMobile?"50%":14,transform:isMobile?"translateX(-50%)":"none",bottom:isMobile?"max(10px, env(safe-area-inset-bottom))":"12px",zIndex:70,display:"flex",gap:8,flexWrap:"wrap",maxWidth:isMobile?"calc(100vw - 20px)":"calc(100vw - 28px)",justifyContent:isMobile?"center":"flex-start"}}>
    {items.map(([name,href,icon])=><a key={name} href={href} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:T.text,textDecoration:"none",padding:"7px 11px",background:`${T.card}E8`,backdropFilter:"blur(5px)",border:`1px solid ${T.border2}`,borderRadius:999,boxShadow:"0 8px 20px rgba(0,0,0,.12)"}}>
      {icon==="facebook"
        ? <span style={{width:16,height:16,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.textSub,border:`1px solid ${T.border2}`,lineHeight:1}}>f</span>
        : <Ic n={icon} size={13} color={T.textSub}/>}
      {!isMobile&&name}
    </a>)}
  </div>;
}

function InfoCard({T,name,icon,photoUrl,details}){
  const hasPhoto=Boolean(photoUrl);
  return <Card T={T} style={{marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}><div style={{width:72,height:72,borderRadius:16,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{hasPhoto?<img src={photoUrl} alt={name||"profile"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Ic n={icon||"user"} size={30} color={T.textSub}/>}</div><div style={{fontWeight:800,fontSize:19}}>{name}</div></div><div style={{display:"flex",flexWrap:"wrap",gap:"6px 28px"}}>{details.map((d,i)=><span key={i} style={{fontSize:12,color:T.textSub,display:"flex",alignItems:"center",gap:5}}>{d.icon&&<Ic n={d.icon} size={12} color={T.textMuted}/>}{d.label&&<span style={{fontWeight:600,color:T.textMuted,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{d.label}:</span>}{d.value}</span>)}</div></Card>;
}

function PageShell({T,t,themeMode,onThemeChange,lang,onToggleLang,onBack,title,icon,children,rightEl,sync,wide=false}){
  const isMobile=useIsMobile();
  const shellW=isMobile?"100%":wide?"min(1680px, calc(100vw - 36px))":"1020px";
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",direction:t.dir}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeInUp{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}@keyframes popIn{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}@keyframes fadeOverlay{0%{opacity:0}100%{opacity:1}}@keyframes brandFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes brandReveal{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}} *{box-sizing:border-box}`}</style>
    <div style={{padding:isMobile?"12px 14px":"16px 20px",borderBottom:`1px solid ${T.border}`,background:T.card,position:"sticky",top:0,zIndex:50,backdropFilter:"saturate(120%) blur(4px)"}}>
      <div style={{maxWidth:shellW,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:12,flexWrap:isMobile?"wrap":"nowrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <SchoolBrand T={T} lang={lang} compact={true}/>
          {onBack&&<BtnG T={T} onClick={onBack}><Ic n={t.dir==="rtl"?"fwd":"back"} size={16} color={T.textSub}/></BtnG>}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {icon&&<div style={{width:34,height:34,borderRadius:9,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={icon} size={17} color={T.textSub}/></div>}
            <span style={{fontSize:18,fontWeight:800}}>{title}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:isMobile?"wrap":"nowrap"}}>
          <SyncBadge s={sync} T={T}/>
          {rightEl}
          <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
          <ThemeTabs themeMode={themeMode} onChange={onThemeChange} T={T} t={t}/>
        </div>
      </div>
    </div>
    <div style={{maxWidth:shellW,margin:"0 auto",padding:isMobile?"16px 14px calc(74px + env(safe-area-inset-bottom))":"24px 20px 90px"}}>
      {children}
      <SocialLinksFooter T={T} lang={lang}/>
    </div>
  </div>;
}

// ── Attendance Calendar ───────────────────────────────────────────────────────
async function readImageAsDataUrl(file,maxBytes=2*1024*1024){
  if(!file)return null;
  if(file.size>maxBytes)throw new Error("too_large");
  return await new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload=()=>resolve(typeof fr.result==="string"?fr.result:null);
    fr.onerror=()=>reject(new Error("read_failed"));
    fr.readAsDataURL(file);
  });
}

function AttendanceCalendar({T,t,editable=false,onSave,students=null,initAtt:iA=null,subjectKey=null,showStudentSelector=true}){
  const[selIdx,setSelIdx]=useState(MONTHS.length-1);
  const[selSid,setSelSid]=useState(students?.[0]?.id??null);
  const[ov,setOv]=useState({});
  const base=MONTHS[selIdx];
  const key=`${base.year}-${base.month}`;
  // For student-scoped calendars, default to month template so newly added students are editable immediately.
  const bData=selSid&&iA?((iA[selSid]?.[key])??(base.data??{})):(base.data??{});
  const oData=selSid?(ov[selSid]?.[key]??{}):(ov["__all__"]?.[key]??{});
  const rawData={...bData,...oData};
  const normalizeDayValue=(v)=>{
    if(subjectKey){
      if(v&&typeof v==="object")return {...v};
      if(typeof v==="boolean")return {[subjectKey]:v};
      return {};
    }
    return v;
  };
  const scopedData=Object.fromEntries(Object.entries(rawData).map(([d,v])=>[d,normalizeDayValue(v)]));
  const attVal=(v)=>{
    if(subjectKey){
      if(v&&typeof v==="object")return Boolean(v[subjectKey]);
      return false;
    }
    if(typeof v==="boolean")return v;
    if(v&&typeof v==="object")return Object.values(v).some(Boolean);
    return false;
  };
  const dayData=Object.fromEntries(Object.entries(scopedData).map(([d,v])=>[d,attVal(v)]));
  const wdays=Object.keys(dayData).length;
  const pres=Object.values(dayData).filter(Boolean).length;
  const abs=wdays-pres;
  const pct=wdays?Math.round((pres/wdays)*100):0;
  const toggle=(d,canEdit)=>{
    if(!canEdit)return;
    const sid=selSid??"__all__";
    const current=scopedData[d];
    const nextBool=!dayData[d];
    const nextVal=subjectKey
      ? (current&&typeof current==="object"?{...current,[subjectKey]:nextBool}:{[subjectKey]:nextBool})
      : nextBool;
    setOv(p=>({...p,[sid]:{...(p[sid]??{}),[key]:{...(p[sid]?.[key]??{}),[d]:nextVal}}}));
  };
  const isDk=T.bg===DARK.bg;
  const pBg=isDk?"#122412":"#dcfce7",aBg=isDk?"#2a1212":"#fee2e2",wBg=T.surface;
  const ss=a=>({padding:"5px 12px",borderRadius:6,border:`1px solid ${a?T.accent:T.border}`,background:a?T.accent:"transparent",color:a?T.accentInv:T.textSub,cursor:"pointer",fontSize:11,fontWeight:600});
  const firstDow=new Date(base.year,base.month,1).getDay();
  const dim=new Date(base.year,base.month+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDow;i++)cells.push({e:true});
  for(let d=1;d<=dim;d++){const dw=new Date(base.year,base.month,d).getDay();const we=dw===0||dw===6;const fut=new Date(base.year,base.month,d)>NOW;const tod=base.year===NOW.getFullYear()&&base.month===NOW.getMonth()&&d===NOW.getDate();cells.push({d,we,fut,tod,s:dayData[d]});}
  return <div>
    {showStudentSelector&&students&&students.length>0&&<div style={{marginBottom:18}}><Lbl T={T}>{t.selectStudent}</Lbl><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{students.map(s=><button key={s.id} onClick={()=>setSelSid(s.id)} style={ss(selSid===s.id)}>{s.name}</button>)}</div></div>}
    <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>{MONTHS.map((m,i)=>{const mm=String(m.month+1).padStart(2,"0");const yyyy=String(m.year);return <button key={i} onClick={()=>setSelIdx(i)} style={ss(i===selIdx)}>{`${mm}/${yyyy}`}</button>;})}</div>
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
        if((!we||tod)&&!fut){bg=s===true?pBg:aBg;tc=s===true?T.success:T.danger;}
        const canEdit=editable&&!fut&&(!we||tod);
        return <div key={d} onClick={()=>toggle(d,canEdit)} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:7,background:bg,color:tc,fontSize:13,fontWeight:600,cursor:canEdit?"pointer":"default",border:tod?`2px solid ${T.accent}`:"2px solid transparent",transition:"background .1s",userSelect:"none"}}>{d}</div>;
      })}
    </div>
    <div style={{marginTop:14,display:"flex",gap:18,flexWrap:"wrap",fontSize:12,color:T.textSub}}>
      {[[pBg,T.success,t.present],[aBg,T.danger,t.absent]].map(([bg,bdr,lbl])=><span key={lbl} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${bdr}`,display:"inline-block"}}/>{lbl}</span>)}
    </div>
    {editable&&<div style={{marginTop:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:T.textMuted}}>{t.clickToToggle}</span>
      {onSave&&<BtnP T={T} onClick={()=>onSave(selSid,key,scopedData)}><Ic n="save" size={14} color={T.accentInv}/>{t.saveAttendance}</BtnP>}
    </div>}
  </div>;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({onLogin,themeMode,onThemeChange,lang,onToggleLang,creds}){
  const T=getTheme(themeMode),t=TR[lang];
  const isMobile=useIsMobile();
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[keep,setKeep]=useState(false);
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const submit=async()=>{
    setErr("");setLoading(true);
    try{
      const normalizedEmail=normalizeEmail(email);
      const u=creds[normalizedEmail]||Object.entries(creds).find(([k])=>normalizeEmail(k)===normalizedEmail)?.[1];
      if(SB_READY){
        const signInRes=await sb.signIn(normalizedEmail,pass);
        if(!signInRes?.ok){
          const em=String(signInRes?.error||"").toLowerCase();
          if(em.includes("invalid login credentials")) setErr(t.invalidCreds);
          else if(em.includes("email not confirmed")) setErr(t.emailNotConfirmed);
          else if(em.includes("invalid api key")||em.includes("apikey")||em.includes("api key")) setErr(t.authConfigIssue);
          else setErr(t.authServiceIssue);
          return;
        }
        const sess=signInRes.data;
        const fallback=u||{name:normalizedEmail,role:null,metadata:{}};
        let fromDb=(await sb.get("app_users",`?email=ilike.${esc(normalizedEmail)}&select=name,role,phone,grade,grades,subject,subjects,bus_number,route,photo_url&limit=1`,sess.access_token||null))?.[0];
        if(!fromDb&&u){
          // Self-heal: if Auth exists but app_users row is missing, create it from local approved-login cache.
          await sb.upsert("app_users",[{
            email:normalizedEmail,
            name:u.name||normalizedEmail,
            role:u.role||"student",
            phone:u.metadata?.phone||null,
            grade:u.metadata?.grade||null,
            grades:normalizeList(u.metadata?.grades||u.metadata?.grade),
            subject:u.metadata?.subject||null,
            subjects:normalizeList(u.metadata?.subjects||u.metadata?.subject),
            bus_number:u.metadata?.busNumber||null,
            route:u.metadata?.route||null,
            photo_url:u.metadata?.photo_url||null,
          }],sess.access_token||null);
          fromDb=(await sb.get("app_users",`?email=ilike.${esc(normalizedEmail)}&select=name,role,phone,grade,grades,subject,subjects,bus_number,route,photo_url&limit=1`,sess.access_token||null))?.[0];
        }
        if(!fromDb){
          // Fallback self-heal: infer role from profile tables when approved-login cache is missing.
          const [accRow,teachRow,studRow]=await Promise.all([
            sb.get("accountants",`?email=eq.${esc(normalizedEmail)}&select=name,email,phone,photo_url&limit=1`,sess.access_token||null),
            sb.get("teachers",`?email=eq.${esc(normalizedEmail)}&select=name,email,phone,subject,subjects,grade,grades,photo_url&limit=1`,sess.access_token||null),
            sb.get("students",`?email=eq.${esc(normalizedEmail)}&select=name,email,phone,grade,photo_url&limit=1`,sess.access_token||null),
          ]);
          const a=accRow?.[0]||null;
          const tRow=teachRow?.[0]||null;
          const sRow=studRow?.[0]||null;
          const inferred=a?{
            role:"accountant",
            name:a.name||normalizedEmail,
            phone:a.phone||null,
            grade:null,
            subject:null,
            photo_url:a.photo_url||null,
          }:tRow?{
            role:"teacher",
            name:tRow.name||normalizedEmail,
            phone:tRow.phone||null,
            grade:firstOrNull(teacherGradesOf(tRow))||null,
            grades:teacherGradesOf(tRow),
            subject:firstOrNull(teacherSubjectsOf(tRow))||null,
            subjects:teacherSubjectsOf(tRow),
            photo_url:tRow.photo_url||null,
          }:sRow?{
            role:"student",
            name:sRow.name||normalizedEmail,
            phone:sRow.phone||null,
            grade:sRow.grade||null,
            subject:null,
            photo_url:sRow.photo_url||null,
          }:null;
          if(inferred){
            await sb.upsert("app_users",[{
              email:normalizedEmail,
              name:inferred.name,
              role:inferred.role,
              phone:inferred.phone,
              grade:inferred.grade,
              grades:normalizeList(inferred.grades||inferred.grade),
              subject:inferred.subject,
              subjects:normalizeList(inferred.subjects||inferred.subject),
              photo_url:inferred.photo_url,
            }],sess.access_token||null);
            fromDb=(await sb.get("app_users",`?email=ilike.${esc(normalizedEmail)}&select=name,role,phone,grade,grades,subject,subjects,bus_number,route,photo_url&limit=1`,sess.access_token||null))?.[0];
          }
        }
        const dbUser=fromDb?{
          name:fromDb.name||fallback.name||normalizedEmail,
          role:fromDb.role||fallback.role,
          metadata:{
            ...fallback.metadata,
            phone:fromDb.phone??fallback.metadata?.phone,
            grade:fromDb.grade??fallback.metadata?.grade,
            grades:normalizeList(fromDb.grades??fallback.metadata?.grades??fromDb.grade??fallback.metadata?.grade),
            subject:fromDb.subject??fallback.metadata?.subject,
            subjects:normalizeList(fromDb.subjects??fallback.metadata?.subjects??fromDb.subject??fallback.metadata?.subject),
            busNumber:fromDb.bus_number??fallback.metadata?.busNumber,
            route:fromDb.route??fallback.metadata?.route,
            photo_url:fromDb.photo_url??fallback.metadata?.photo_url,
          },
        }:null;
        if(!dbUser&&!u){setErr(t.accessDenied);return;}
        onLogin({email:normalizedEmail,...(dbUser||u),accessToken:sess.access_token||null,refreshToken:sess.refresh_token||null},keep);
        return;
      }
      if(!u){setErr(t.accessDenied);return;}
      // Offline demo mode only.
      if(DEMO_PASSWORDS[normalizedEmail]===pass){onLogin({email:normalizedEmail,...u},keep);}
      else{setErr(t.invalidCreds);}
    }finally{setLoading(false);}
  };
  const deco=[
    {icon:"book",x:"8%",y:"18%",d:0},
    {icon:"teacher",x:"88%",y:"20%",d:1.2},
    {icon:"student",x:"10%",y:"74%",d:2.1},
    {icon:"grades",x:"86%",y:"72%",d:3.2},
    {icon:"attend",x:"50%",y:"10%",d:1.8},
    {icon:"clock",x:"50%",y:"87%",d:2.7},
  ];
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20,direction:t.dir,position:"relative",overflow:"hidden"}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeInUp{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}@keyframes popIn{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}@keyframes fadeOverlay{0%{opacity:0}100%{opacity:1}}@keyframes floatSoft{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes brandFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes brandReveal{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}} input::placeholder{color:${T.textMuted}} *{box-sizing:border-box}`}</style>
    {!isMobile&&deco.map((d,i)=><div key={`${themeMode}-${d.icon}-${i}`}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px) scale(1.05)";e.currentTarget.style.boxShadow="0 14px 32px rgba(0,0,0,.18)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow="0 10px 30px rgba(0,0,0,.12)";}}
      style={{position:"absolute",left:d.x,top:d.y,width:58,height:58,borderRadius:14,background:`${T.card}cc`,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 10px 30px rgba(0,0,0,.12)",backdropFilter:"blur(4px)",animation:`floatSoft ${4.8+i*0.5}s ease-in-out ${d.d}s infinite`,transition:"transform .18s ease, box-shadow .18s ease",cursor:"pointer"}}><Ic n={d.icon} size={26} color={themeMode==="dark"?"#a3a3a3":themeMode==="leaf"?"#5f6f83":"#7b8798"}/></div>)}
    <div style={{position:"absolute",inset:0,background:`radial-gradient(circle at 20% 20%, ${T.accent}10 0%, transparent 35%), radial-gradient(circle at 80% 75%, ${T.success}12 0%, transparent 30%)`,pointerEvents:"none"}}/>
    <div style={{position:"fixed",top:20,left:t.dir==="rtl"?20:"auto",right:t.dir==="rtl"?"auto":20,display:"flex",gap:8}}>
      <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
      <ThemeTabs themeMode={themeMode} onChange={onThemeChange} T={T} t={t}/>
    </div>
    <div style={{width:"100%",maxWidth:380}}>
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
          <SchoolBrand T={T} lang={lang} animate={true} stacked={true}/>
        </div>
        <div style={{fontSize:14,color:T.textSub,marginTop:6}}>{t.signIn}</div>
      </div>
      <Card T={T} style={{padding:28}}>
        <div style={{marginBottom:16}}><Lbl T={T}>{t.email}</Lbl><Inp T={T} type="email" placeholder="you@school.edu" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={{marginBottom:16}}><Lbl T={T}>{t.password}</Lbl><Inp T={T} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div style={{marginBottom:20}}><Checkbox checked={keep} onChange={()=>setKeep(v=>!v)} label={t.keepLoggedIn} T={T}/></div>
        {err&&<div style={{display:"flex",alignItems:"center",gap:7,color:T.danger,fontSize:13,marginBottom:14,padding:"9px 12px",background:`${T.danger}12`,borderRadius:7}}><Ic n="alert" size={14} color={T.danger}/>{err}</div>}
        {!SB_READY&&<div style={{fontSize:11,color:T.warn,marginBottom:10}}>Supabase env vars are missing. Running in offline demo mode.</div>}
        <BtnP T={T} style={{width:"100%",padding:"11px"}} onClick={submit}>{loading?t.signingIn:<><Ic n="signout" size={15} color={T.accentInv}/>{t.signInBtn}</>}</BtnP>
      </Card>
      <SocialLinksFooter T={T} lang={lang}/>
    </div>
  </div>;
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({user,onNavigate,onSignOut,themeMode,onThemeChange,lang,onToggleLang}){
  const T=getTheme(themeMode),t=TR[lang];
  const isMobile=useIsMobile();
  const portals=[
    {role:["admin"],              path:"admin",     title:t.admin,     sub:t.schoolOps,    icon:"admin"},
    {role:["teacher","admin"],    path:"teacher",   title:t.teacher,   sub:t.classAttend,  icon:"teacher"},
    {role:["student","admin"],    path:"student",   title:t.student,   sub:t.gradesAttend, icon:"student"},
    {role:["accountant","admin"], path:"accountant",title:t.accountant,sub:t.schoolOps,    icon:"stats"},
    {role:["bus_driver","admin"], path:"bus-driver",title:t.busDriver, sub:t.routesGps,    icon:"bus"},
  ].filter(p=>p.role.includes(user.role));
  return <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Segoe UI','Helvetica Neue',Arial,sans-serif",direction:t.dir}}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeInUp{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}@keyframes popIn{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}@keyframes fadeOverlay{0%{opacity:0}100%{opacity:1}} *{box-sizing:border-box}`}</style>
    <div style={{padding:isMobile?"12px 14px":"18px 28px",borderBottom:`1px solid ${T.border}`,background:T.card}}>
      <div style={{maxWidth:isMobile?900:"min(1780px, calc(100vw - 56px))",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:10,flexWrap:isMobile?"wrap":"nowrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <SchoolBrand T={T} lang={lang} compact={true}/>
          {!isMobile&&<div style={{fontSize:11,color:T.textSub}}>{t.welcome} {user.name}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:isMobile?"wrap":"nowrap"}}>
          <LangToggle lang={lang} onToggle={onToggleLang} T={T}/>
          <ThemeTabs themeMode={themeMode} onChange={onThemeChange} T={T} t={t}/>
          <BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>
        </div>
      </div>
    </div>
    <div style={{maxWidth:isMobile?900:"min(1780px, calc(100vw - 56px))",margin:"0 auto",padding:isMobile?"20px 14px":"30px 10px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?170:320}px,1fr))`,gap:isMobile?12:18,minHeight:isMobile?"auto":"calc(100vh - 170px)"}}>
        {portals.map(p=><div key={p.path} onClick={()=>onNavigate(p.path)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:isMobile?20:30,cursor:"pointer",transition:"all .16s",minHeight:isMobile?170:260,display:"flex",flexDirection:"column",justifyContent:"space-between"}} onMouseEnter={el=>{el.currentTarget.style.borderColor=T.accent;el.currentTarget.style.transform="translateY(-3px)";el.currentTarget.style.boxShadow="0 14px 30px rgba(0,0,0,.10)";}} onMouseLeave={el=>{el.currentTarget.style.borderColor=T.border;el.currentTarget.style.transform="translateY(0)";el.currentTarget.style.boxShadow="none";}}>
          <div style={{width:isMobile?44:56,height:isMobile?44:56,borderRadius:12,background:T.surface,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}><Ic n={p.icon} size={isMobile?22:28} color={T.textSub}/></div>
          <div style={{fontSize:isMobile?16:21,fontWeight:800,marginBottom:6}}>{p.title}</div>
          <div style={{fontSize:isMobile?13:15,color:T.textSub,marginBottom:18}}>{p.sub}</div>
          <div style={{fontSize:12,color:T.textMuted,display:"flex",alignItems:"center",gap:5}}><Ic n="fwd" size={12} color={T.textMuted}/>{t.access}</div>
        </div>)}
      </div>
      <SocialLinksFooter T={T} lang={lang}/>
    </div>
  </div>;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({user,onBack,themeMode,onThemeChange,lang,onToggleLang,creds,onCredsChange,gradePeriods,onPeriodsChange,studentGrades,onStudentGradesChange,subjects,onSubjectsChange}){
  const T=getTheme(themeMode),t=TR[lang],dir=t.dir;
  const isMobile=useIsMobile();
  const[students,setStudents]=useState(DEMO_STUDENTS);
  const[teachers,setTeachers]=useState(DEMO_TEACHERS);
  const[accountants,setAccountants]=useState(DEMO_ACCOUNTANTS);
  const[modal,setModal]=useState(null);
  const[toast,setToast]=useState("");
  const[sync,setSync]=useState(null);
  const SLABELS=subjects.map(s=>lang==="ar"?s.label_ar:s.label_en);
  const SKEYS=subjects.map(s=>s.id);
  const blank=()=>Object.fromEntries(SKEYS.map(s=>[s,0]));
  const blankP=()=>Object.fromEntries(gradePeriods.map(p=>[p.id,blank()]));
  const[ns,setNs]=useState({name:"",email:"",phone:"",grade:t.grades1to12[0],tuition_total:0,tuition_paid:0,photo_url:""});
  const[nsG,setNsG]=useState(()=>blankP());
  const[nsCred,setNsCred]=useState({enabled:true,password:""});
  const[nt,setNt]=useState({name:"",email:"",phone:"",subjects:[subjects[0]?.id||"math"],grades:[t.grades1to12[0]],photo_url:""});
  const[ntCred,setNtCred]=useState({enabled:true,password:""});
  const[na,setNa]=useState({name:"",email:"",phone:"",photo_url:""});
  const[naCred,setNaCred]=useState({enabled:true,password:""});
  const[nc,setNc]=useState({email:"",password:"",name:"",role:"teacher",phone:""});
  const[np,setNp]=useState("");
  const[newSubj,setNewSubj]=useState({label_ar:"",label_en:""});
  const[editCred,setEditCred]=useState(null);
  const[editStudent,setEditStudent]=useState(null);
  const[editTeacher,setEditTeacher]=useState(null);
  const[editAccountant,setEditAccountant]=useState(null);
  const[editStudentLogin,setEditStudentLogin]=useState({has:false,create:false,password:""});
  const[editTeacherLogin,setEditTeacherLogin]=useState({has:false,create:false,password:""});
  const[editAccountantLogin,setEditAccountantLogin]=useState({has:false,create:false,password:""});
  const[studentGradeFilter,setStudentGradeFilter]=useState("all");
  const[studentSort,setStudentSort]=useState("grade_asc");

  useEffect(()=>{
    async function load(){
      const[dS,dT,dA,dSub,dUsers,dPeriods]=await Promise.all([
        sb.get("students","?order=created_at.asc",user?.accessToken||null),
        sb.get("teachers","?order=created_at.asc",user?.accessToken||null),
        sb.get("accountants","?order=created_at.asc",user?.accessToken||null),
        sb.get("subjects","?order=created_at.asc",user?.accessToken||null),
        sb.get("app_users","?select=email,name,role,phone,grade,grades,subject,subjects,bus_number,route,photo_url&order=created_at.asc",user?.accessToken||null),
        sb.get("grade_periods","?order=created_at.asc",user?.accessToken||null),
      ]);
      if(dS&&dS.length>0){setStudents(dS.map(s=>({id:s.id,name:s.name,email:s.email,grade:s.grade,phone:s.phone||"",tuition_total:Number(s.tuition_total||0),tuition_paid:Number(s.tuition_paid||0),photo_url:s.photo_url||""})));setSync("ok");}
      else if(dS===null){setSync("fail");}
      if(dT&&dT.length>0){setTeachers(dT.map(tt=>{
        const tSubjects=teacherSubjectsOf(tt);
        const tGrades=teacherGradesOf(tt);
        const subjLabel=tSubjects.map(sk=>SLABELS[SKEYS.indexOf(sk)]||sk).join(", ");
        return {
          id:tt.id,
          name:tt.name,
          email:tt.email,
          subject:firstOrNull(tSubjects)||"",
          subjects:tSubjects,
          subjectDisplay:subjLabel||tt.subject_display||tt.subject||"",
          grade:firstOrNull(tGrades)||"",
          grades:tGrades,
          phone:tt.phone||"",
          photo_url:tt.photo_url||"",
        };
      }));}
      if(dA&&dA.length>0){setAccountants(dA.map(a=>({id:a.id,name:a.name,email:a.email,phone:a.phone||"",photo_url:a.photo_url||""})));}
      if(dSub&&dSub.length>0){onSubjectsChange(dSub.map(s=>({id:s.id,label_ar:s.label_ar,label_en:s.label_en})));}
      if(dUsers&&dUsers.length>0){
        const mapped=Object.fromEntries(dUsers.map(u=>[u.email,{
          name:u.name||u.email,
          role:u.role||"teacher",
          metadata:{
            phone:u.phone||"",
            grade:u.grade||null,
            grades:normalizeList(u.grades||u.grade),
            subject:u.subject||null,
            subjects:normalizeList(u.subjects||u.subject),
            busNumber:u.bus_number||null,
            route:u.route||null,
            photo_url:u.photo_url||"",
          }
        }]));
        onCredsChange(prev=>({...prev,...mapped}));
      }
      if(dPeriods&&dPeriods.length>0){
        onPeriodsChange(dPeriods.map(p=>({id:p.id,label:p.label})));
      }
    }
    load();
  },[user?.accessToken]);

  const handlePhotoSelect=async(setter,file)=>{
    if(!file)return;
    try{
      const data=await readImageAsDataUrl(file);
      if(!data)throw new Error("read_failed");
      setter(prev=>({...prev,photo_url:data}));
    }catch(err){
      if(String(err?.message||"").includes("too_large")){
        setToast("!Image is too large. Please use a smaller file (max 2MB).");
      }else{
        setToast("!Could not read image file.");
      }
    }
  };
  const studentGradeOptions=Array.from(new Set(students.map(s=>s.grade).filter(Boolean))).sort((a,b)=>{
    const ra=gradeNumber(a),rb=gradeNumber(b);
    if(ra!==rb)return ra-rb;
    return String(a).localeCompare(String(b),lang==="ar"?"ar":"en");
  });
  const shownStudents=students
    .filter(s=>studentGradeFilter==="all"||s.grade===studentGradeFilter)
    .sort((a,b)=>{
      if(studentSort==="name_asc")return String(a.name||"").localeCompare(String(b.name||""),lang==="ar"?"ar":"en");
      if(studentSort==="name_desc")return String(b.name||"").localeCompare(String(a.name||""),lang==="ar"?"ar":"en");
      const ga=gradeNumber(a.grade),gb=gradeNumber(b.grade);
      if(ga!==gb)return studentSort==="grade_desc"?gb-ga:ga-gb;
      return String(a.name||"").localeCompare(String(b.name||""),lang==="ar"?"ar":"en");
    });
  const teacherSubjectsLabel=tList=>normalizeList(tList).map(sk=>SLABELS[SKEYS.indexOf(sk)]||sk).join(", ");
  const addTeacherSubjectField=(isEdit=false)=>{
    const first=subjects[0]?.id||"math";
    if(isEdit)setEditTeacher(p=>({...p,subjects:[...normalizeList(p?.subjects),first]}));
    else setNt(p=>({...p,subjects:[...normalizeList(p.subjects),first]}));
  };
  const addTeacherGradeField=(isEdit=false)=>{
    const first=t.grades1to12[0];
    if(isEdit)setEditTeacher(p=>({...p,grades:[...normalizeList(p?.grades),first]}));
    else setNt(p=>({...p,grades:[...normalizeList(p.grades),first]}));
  };

  const addStudent=async()=>{
    if(!ns.name||!ns.email)return;
    const email=String(ns.email).trim().toLowerCase();
    if(nsCred.enabled){
      const okAuth=await createAuthForApprovedLogin({email,password:nsCred.password,name:ns.name,role:"student",phone:ns.phone||"",grade:ns.grade||null});
      if(!okAuth)return;
      onCredsChange(prev=>({...prev,[email]:{name:ns.name,role:"student",metadata:{phone:ns.phone||"",grade:ns.grade||null,photo_url:ns.photo_url||""}}}));
    }
    const id=`s${Date.now()}`;
    const newS={...ns,email,id};
    setStudents(p=>[...p,newS]);
    onStudentGradesChange(prev=>({...prev,[id]:nsG}));
    setNs({name:"",email:"",phone:"",grade:t.grades1to12[0],tuition_total:0,tuition_paid:0,photo_url:""});
    setNsCred({enabled:true,password:""});
    setNsG(blankP()); setModal(null); setToast(t.studentAdded);
    const ok=await sb.upsert("students",[{id,name:newS.name,email:newS.email,grade:newS.grade,phone:newS.phone||null,tuition_total:Number(newS.tuition_total||0),tuition_paid:Number(newS.tuition_paid||0),photo_url:newS.photo_url||null}],user?.accessToken||null);
    if(nsCred.enabled||creds[newS.email]){
      await sb.upsert("app_users",[{
        email:newS.email,
        name:newS.name,
        role:"student",
        phone:newS.phone||null,
        grade:newS.grade||null,
        photo_url:newS.photo_url||null,
      }],user?.accessToken||null);
    }
    setSync(ok?"ok":"fail");
  };
  const addTeacher=async()=>{
    const ntSubjects=normalizeList(nt.subjects);
    const ntGrades=normalizeList(nt.grades);
    if(!nt.name||!nt.email||ntSubjects.length===0||ntGrades.length===0)return;
    const email=String(nt.email).trim().toLowerCase();
    const mainSubject=ntSubjects[0];
    const mainGrade=ntGrades[0];
    if(ntCred.enabled){
      const okAuth=await createAuthForApprovedLogin({email,password:ntCred.password,name:nt.name,role:"teacher",phone:nt.phone||"",grade:mainGrade||null,grades:ntGrades,subject:mainSubject||null,subjects:ntSubjects});
      if(!okAuth)return;
      onCredsChange(prev=>({...prev,[email]:{name:nt.name,role:"teacher",metadata:{phone:nt.phone||"",subject:mainSubject||null,subjects:ntSubjects,grade:mainGrade||null,grades:ntGrades,photo_url:nt.photo_url||""}}}));
    }
    const sl=teacherSubjectsLabel(ntSubjects);
    const id=`t${Date.now()}`;
    const newT={...nt,email,id,subject:mainSubject,subjects:ntSubjects,grade:mainGrade,grades:ntGrades,subjectDisplay:sl};
    setTeachers(p=>[...p,newT]);
    setNt({name:"",email:"",phone:"",subjects:[subjects[0]?.id||"math"],grades:[t.grades1to12[0]],photo_url:""});setNtCred({enabled:true,password:""});setModal(null);setToast(t.teacherAdded);
    const ok=await sb.upsert("teachers",[{id,name:newT.name,email:newT.email,subject:newT.subject,subjects:newT.subjects,subject_display:sl,grade:newT.grade,grades:newT.grades,phone:newT.phone||null,photo_url:newT.photo_url||null}],user?.accessToken||null);
    if(ntCred.enabled||creds[newT.email]){
      await sb.upsert("app_users",[{
        email:newT.email,
        name:newT.name,
        role:"teacher",
        phone:newT.phone||null,
        grade:newT.grade||null,
        grades:newT.grades,
        subject:newT.subject||null,
        subjects:newT.subjects,
        photo_url:newT.photo_url||null,
      }],user?.accessToken||null);
    }
    setSync(ok?"ok":"fail");
  };
  const addSubject=async()=>{
    const arL=newSubj.label_ar.trim(),enL=newSubj.label_en.trim();
    if(!arL||!enL)return;
    const id=`subj_${Date.now()}`;
    onSubjectsChange(prev=>[...prev,{id,label_ar:arL,label_en:enL}]);
    setNewSubj({label_ar:"",label_en:""});setModal(null);setToast(t.subjectAdded);
    const ok=await sb.upsert("subjects",[{id,label_ar:arL,label_en:enL}],user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const delSubject=async id=>{
    onSubjectsChange(prev=>prev.filter(s=>s.id!==id));
    setToast(t.subjectDeleted);
    const ok=await sb.del("subjects",{id},user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const createAuthForApprovedLogin=async({email,password,name,role,phone,grade=null,grades=[],subject=null,subjects=[],busNumber=null,route=null})=>{
    const emailNorm=String(email||"").trim().toLowerCase();
    if(!emailNorm){
      setToast(`!${t.invalidCreds}`);
      setSync("fail");
      return false;
    }
    if(!password){
      setToast(`!${t.loginPwdRequired}`);
      setSync("fail");
      return false;
    }
    if(SB_READY){
      if(!user?.accessToken){
        setToast("!Admin session expired. Please sign in again.");
        setSync("fail");
        return false;
      }
      const auth=await sb.adminCreateUser({
        email:emailNorm,password,name,role,
        phone:phone||null,
        grade:grade||null,
        grades:normalizeList(grades||grade),
        subject:subject||null,
        subjects:normalizeList(subjects||subject),
        bus_number:busNumber||null,
        route:route||null
      },user.accessToken);
      if(auth.ok&&auth?.data?.alreadyExists){
        setToast(`!${t.authExistsPwdNotChanged}`);
        setSync("fail");
        return false;
      }
      if(!auth.ok){
        let recovered=false;
        if(auth.status===404){
          const fallback=await sb.signUp(emailNorm,password);
          if(fallback?.alreadyExists){
            setToast(`!${t.authExistsPwdNotChanged}`);
            setSync("fail");
            return false;
          }
          if(!fallback.ok){
            setToast("!Backend route /api/admin-create-user is missing.");
            setSync("fail");
            return false;
          }
          recovered=true;
        }else if((auth.status===0) && (IS_LOCAL_DEV||IS_DEV)){
          const fallback=await sb.signUp(emailNorm,password);
          if(fallback?.alreadyExists){
            setToast(`!${t.authExistsPwdNotChanged}`);
            setSync("fail");
            return false;
          }
          if(!fallback.ok){
            const msg=String(fallback.error||"local signup fallback failed").replaceAll("_"," ").slice(0,120);
            setToast(`!Auth create failed: ${msg}`);
            setSync("fail");
            return false;
          }
          recovered=true;
        }else if(auth.status===0){
          setToast("!Auth create failed: backend unreachable (status 0).");
          setSync("fail");
          return false;
        }
        if(!recovered){
          const err=auth?.data?.error||auth?.data?.details?.error||auth?.data?.details?.msg||`backend user create failed (status ${auth.status})`;
          const msg=String(err).replaceAll("_"," ").slice(0,120);
          setToast(`!Auth create failed: ${msg}`);
          setSync("fail");
          return false;
        }
      }
    }else{
      DEMO_PASSWORDS[emailNorm]=password;
    }
    return true;
  };
  const addCred=async()=>{
    if(!nc.email||!nc.name||!nc.password)return;
    const email=String(nc.email).trim().toLowerCase();
    const okAuth=await createAuthForApprovedLogin({email,password:nc.password,name:nc.name,role:nc.role,phone:nc.phone||""});
    if(!okAuth)return;
    onCredsChange(prev=>({...prev,[email]:{name:nc.name,role:nc.role,metadata:{phone:nc.phone,photo_url:""}}}));
    setNc({email:"",password:"",name:"",role:"teacher",phone:""});
    setModal(null);setToast(t.credAdded);
    const ok=await sb.upsert("app_users",[{email,name:nc.name,role:nc.role,phone:nc.phone||null,photo_url:null}],user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const addPeriod=async()=>{
    if(!np.trim())return;
    const id=`p${Date.now()}`;
    const label=np.trim();
    onPeriodsChange(prev=>[...prev,{id,label}]);
    onStudentGradesChange(prev=>{const u={...prev};Object.keys(u).forEach(sid=>{u[sid]={...u[sid],[id]:blank()};});return u;});
    setNp("");setToast(t.periodAdded);
    const ok=await sb.upsert("grade_periods",[{id,label}],user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const delPeriod=async pid=>{
    onPeriodsChange(prev=>prev.filter(p=>p.id!==pid));
    onStudentGradesChange(prev=>{const u={...prev};Object.keys(u).forEach(sid=>{const g={...u[sid]};delete g[pid];u[sid]=g;});return u;});
    setToast(t.periodDeleted);
    const ok=await sb.del("grade_periods",{id:pid},user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const delStudent=async s=>{
    setStudents(prev=>prev.filter(x=>x.id!==s.id));
    const ok=await sb.del("students",{id:s.id},user?.accessToken||null);
    await sb.del("app_users",{email:s.email},user?.accessToken||null);
    onCredsChange(prev=>{const u={...prev};delete u[s.email];return u;});
    setSync(ok?"ok":"fail");
  };
  const delTeacher=async tt=>{
    setTeachers(prev=>prev.filter(x=>x.id!==tt.id));
    const ok=await sb.del("teachers",{id:tt.id},user?.accessToken||null);
    await sb.del("app_users",{email:tt.email},user?.accessToken||null);
    onCredsChange(prev=>{const u={...prev};delete u[tt.email];return u;});
    setSync(ok?"ok":"fail");
  };
  const addAccountant=async()=>{
    if(!na.name||!na.email)return;
    const email=String(na.email).trim().toLowerCase();
    if(naCred.enabled){
      const okAuth=await createAuthForApprovedLogin({email,password:naCred.password,name:na.name,role:"accountant",phone:na.phone||""});
      if(!okAuth)return;
      onCredsChange(prev=>({...prev,[email]:{name:na.name,role:"accountant",metadata:{phone:na.phone||"",photo_url:na.photo_url||""}}}));
    }
    const id=`a${Date.now()}`;
    const row={id,name:na.name,email,phone:na.phone||"",photo_url:na.photo_url||""};
    const accRes=await sb.upsertWithStatus("accountants",[{
      id:row.id,
      name:row.name,
      email:row.email,
      phone:row.phone||null,
      photo_url:row.photo_url||null,
    }],user?.accessToken||null);
    if(!accRes.ok){
      setSync("fail");
      setToast(`!Accountant save failed: ${String(accRes.error||`status ${accRes.status}`).slice(0,120)}`);
      return;
    }
    const userRes=await sb.upsertWithStatus("app_users",[{
      email:row.email,
      name:row.name,
      role:"accountant",
      phone:row.phone||null,
      photo_url:row.photo_url||null,
    }],user?.accessToken||null);
    if(!userRes.ok){
      setSync("fail");
      setToast(`!Approved login save failed: ${String(userRes.error||`status ${userRes.status}`).slice(0,120)}`);
      return;
    }
    setAccountants(prev=>[...prev,row]);
    setNa({name:"",email:"",phone:"",photo_url:""});
    setNaCred({enabled:true,password:""});
    setModal(null);
    setSync("ok");
    setToast(t.changesSaved);
  };
  const openEditAccountant=a=>{
    setEditAccountant({...a});
    const has=Boolean(creds[a.email]);
    setEditAccountantLogin({has,create:false,password:""});
    setModal("edit-accountant");
  };
  const saveEditAccountant=async()=>{
    if(!editAccountant?.id||!editAccountant?.name||!editAccountant?.email)return;
    const email=String(editAccountant.email).trim().toLowerCase();
    const old=accountants.find(a=>a.id===editAccountant.id);
    if(!old)return;
    if(old.email!==email && creds[old.email]){
      setToast(`!${t.linkedLoginEmailChangeBlocked}`);
      return;
    }
    if(!editAccountantLogin.has&&editAccountantLogin.create){
      const okAuth=await createAuthForApprovedLogin({
        email,
        password:editAccountantLogin.password,
        name:editAccountant.name,
        role:"accountant",
        phone:editAccountant.phone||"",
      });
      if(!okAuth)return;
      onCredsChange(prev=>({
        ...prev,
        [email]:{name:editAccountant.name,role:"accountant",metadata:{phone:editAccountant.phone||"",photo_url:editAccountant.photo_url||""}}
      }));
    }else if(editAccountantLogin.has){
      onCredsChange(prev=>({
        ...prev,
        [email]:{
          ...(prev[email]||{}),
          name:editAccountant.name,
          role:"accountant",
          metadata:{...((prev[email]?.metadata)||{}),phone:editAccountant.phone||"",photo_url:editAccountant.photo_url||""},
        }
      }));
    }
    setAccountants(prev=>prev.map(a=>a.id===editAccountant.id?{...a,...editAccountant,email}:a));
    const okAcc=await sb.upsert("accountants",[{
      id:editAccountant.id,
      name:editAccountant.name,
      email,
      phone:editAccountant.phone||null,
      photo_url:editAccountant.photo_url||null,
    }],user?.accessToken||null);
    if(old.email!==email){
      await sb.del("app_users",{email:old.email},user?.accessToken||null);
    }
    const okUser=await sb.upsert("app_users",[{
      email,
      name:editAccountant.name,
      role:"accountant",
      phone:editAccountant.phone||null,
      photo_url:editAccountant.photo_url||null,
    }],user?.accessToken||null);
    if(old.email!==email){
      onCredsChange(prev=>{
        const next={...prev};
        if(next[old.email]&&!next[email]){
          next[email]={...next[old.email]};
        }
        delete next[old.email];
        return next;
      });
    }
    setSync(okAcc&&okUser?"ok":"fail");
    setToast(t.changesSaved);
    setModal(null);
    setEditAccountant(null);
    setEditAccountantLogin({has:false,create:false,password:""});
  };
  const delAccountant=async a=>{
    setAccountants(prev=>prev.filter(x=>x.id!==a.id));
    const okAcc=await sb.del("accountants",{id:a.id},user?.accessToken||null);
    await sb.del("app_users",{email:a.email},user?.accessToken||null);
    onCredsChange(prev=>{const u={...prev};delete u[a.email];return u;});
    setSync(okAcc?"ok":"fail");
  };
  const delCred=async email=>{
    if(email==="admin@school.edu")return;
    const u={...creds};delete u[email];onCredsChange(u);setToast(t.credDeleted);
    const ok=await sb.del("app_users",{email},user?.accessToken||null);
    setSync(ok?"ok":"fail");
  };
  const openEditCred=email=>{
    const u=creds[email];
    if(!u)return;
    setEditCred({
      email,
      name:u.name||"",
      role:u.role||"teacher",
      phone:u.metadata?.phone||"",
    });
    setModal("edit-cred");
  };
  const saveEditCred=async()=>{
    if(!editCred?.email||!editCred?.name)return;
    const prev=creds[editCred.email]||{metadata:{}};
    onCredsChange(p=>({
      ...p,
      [editCred.email]:{
        ...prev,
        name:editCred.name,
        role:editCred.role,
        metadata:{...(prev.metadata||{}),phone:editCred.phone||""},
      }
    }));
    const ok=await sb.upsert("app_users",[{
      email:editCred.email,
      name:editCred.name,
      role:editCred.role,
      phone:editCred.phone||null,
    }],user?.accessToken||null);
    setSync(ok?"ok":"fail");
    setToast(t.changesSaved);
    setModal(null);
    setEditCred(null);
  };
  const openEditStudent=s=>{
    setEditStudent({...s});
    const has=Boolean(creds[s.email]);
    setEditStudentLogin({has,create:false,password:""});
    setModal("edit-student");
  };
  const saveEditStudent=async()=>{
    if(!editStudent?.id||!editStudent?.name||!editStudent?.email)return;
    const email=String(editStudent.email).trim().toLowerCase();
    const old=students.find(s=>s.id===editStudent.id);
    if(!old)return;
    if(old.email!==email && creds[old.email]){
      setToast(`!${t.linkedLoginEmailChangeBlocked}`);
      return;
    }
    if(!editStudentLogin.has&&editStudentLogin.create){
      const okAuth=await createAuthForApprovedLogin({
        email,
        password:editStudentLogin.password,
        name:editStudent.name,
        role:"student",
        phone:editStudent.phone||"",
        grade:editStudent.grade||null,
      });
      if(!okAuth)return;
      onCredsChange(prev=>({...prev,[email]:{name:editStudent.name,role:"student",metadata:{phone:editStudent.phone||"",grade:editStudent.grade||null,photo_url:editStudent.photo_url||""}}}));
      const okUser=await sb.upsert("app_users",[{
        email,
        name:editStudent.name,
        role:"student",
        phone:editStudent.phone||null,
        grade:editStudent.grade||null,
        photo_url:editStudent.photo_url||null,
      }],user?.accessToken||null);
      setSync(okUser?"ok":"fail");
    }else if(editStudentLogin.has){
      onCredsChange(prev=>({
        ...prev,
        [email]:{
          ...(prev[email]||{}),
          name:editStudent.name,
          role:"student",
          metadata:{...((prev[email]?.metadata)||{}),phone:editStudent.phone||"",grade:editStudent.grade||null,photo_url:editStudent.photo_url||""},
        }
      }));
      const okUser=await sb.upsert("app_users",[{
        email,
        name:editStudent.name,
        role:"student",
        phone:editStudent.phone||null,
        grade:editStudent.grade||null,
        photo_url:editStudent.photo_url||null,
      }],user?.accessToken||null);
      setSync(okUser?"ok":"fail");
    }
    setStudents(p=>p.map(s=>s.id===editStudent.id?{...s,...editStudent,email}:s));
    const ok=await sb.upsert("students",[{
      id:editStudent.id,
      name:editStudent.name,
      email,
      grade:editStudent.grade,
      phone:editStudent.phone||null,
      tuition_total:Number(editStudent.tuition_total||0),
      tuition_paid:Number(editStudent.tuition_paid||0),
      photo_url:editStudent.photo_url||null,
    }],user?.accessToken||null);
    setSync(ok?"ok":"fail");
    setToast(t.changesSaved);
    setModal(null);
    setEditStudent(null);
    setEditStudentLogin({has:false,create:false,password:""});
  };
  const openEditTeacher=tt=>{
    setEditTeacher({
      ...tt,
      subjects:teacherSubjectsOf(tt),
      grades:teacherGradesOf(tt),
    });
    const has=Boolean(creds[tt.email]);
    setEditTeacherLogin({has,create:false,password:""});
    setModal("edit-teacher");
  };
  const saveEditTeacher=async()=>{
    const editSubjects=normalizeList(editTeacher?.subjects);
    const editGrades=normalizeList(editTeacher?.grades);
    if(!editTeacher?.id||!editTeacher?.name||!editTeacher?.email||editSubjects.length===0||editGrades.length===0)return;
    const email=String(editTeacher.email).trim().toLowerCase();
    const mainSubject=editSubjects[0];
    const mainGrade=editGrades[0];
    const old=teachers.find(tt=>tt.id===editTeacher.id);
    if(!old)return;
    if(old.email!==email && creds[old.email]){
      setToast(`!${t.linkedLoginEmailChangeBlocked}`);
      return;
    }
    if(!editTeacherLogin.has&&editTeacherLogin.create){
      const okAuth=await createAuthForApprovedLogin({
        email,
        password:editTeacherLogin.password,
        name:editTeacher.name,
        role:"teacher",
        phone:editTeacher.phone||"",
        grade:mainGrade||null,
        grades:editGrades,
        subject:mainSubject||null,
        subjects:editSubjects,
      });
      if(!okAuth)return;
      onCredsChange(prev=>({...prev,[email]:{name:editTeacher.name,role:"teacher",metadata:{phone:editTeacher.phone||"",subject:mainSubject||null,subjects:editSubjects,grade:mainGrade||null,grades:editGrades,photo_url:editTeacher.photo_url||""}}}));
      const okUser=await sb.upsert("app_users",[{
        email,
        name:editTeacher.name,
        role:"teacher",
        phone:editTeacher.phone||null,
        grade:mainGrade||null,
        grades:editGrades,
        subject:mainSubject||null,
        subjects:editSubjects,
        photo_url:editTeacher.photo_url||null,
      }],user?.accessToken||null);
      setSync(okUser?"ok":"fail");
    }else if(editTeacherLogin.has){
      onCredsChange(prev=>({
        ...prev,
        [email]:{
          ...(prev[email]||{}),
          name:editTeacher.name,
          role:"teacher",
          metadata:{...((prev[email]?.metadata)||{}),phone:editTeacher.phone||"",subject:mainSubject||null,subjects:editSubjects,grade:mainGrade||null,grades:editGrades,photo_url:editTeacher.photo_url||""},
        }
      }));
      const okUser=await sb.upsert("app_users",[{
        email,
        name:editTeacher.name,
        role:"teacher",
        phone:editTeacher.phone||null,
        grade:mainGrade||null,
        grades:editGrades,
        subject:mainSubject||null,
        subjects:editSubjects,
        photo_url:editTeacher.photo_url||null,
      }],user?.accessToken||null);
      setSync(okUser?"ok":"fail");
    }
    const sl=teacherSubjectsLabel(editSubjects);
    setTeachers(p=>p.map(tt=>tt.id===editTeacher.id?{...tt,...editTeacher,email,subject:mainSubject,subjects:editSubjects,grade:mainGrade,grades:editGrades,subjectDisplay:sl}:tt));
    const ok=await sb.upsert("teachers",[{
      id:editTeacher.id,
      name:editTeacher.name,
      email,
      subject:mainSubject,
      subjects:editSubjects,
      subject_display:sl,
      grade:mainGrade||null,
      grades:editGrades,
      phone:editTeacher.phone||null,
      photo_url:editTeacher.photo_url||null,
    }],user?.accessToken||null);
    setSync(ok?"ok":"fail");
    setToast(t.changesSaved);
    setModal(null);
    setEditTeacher(null);
    setEditTeacherLogin({has:false,create:false,password:""});
  };
  const rc={admin:T.warn,teacher:T.success,student:"#60a5fa",bus_driver:T.textSub};

  return <PageShell T={T} t={t} themeMode={themeMode} onThemeChange={onThemeChange} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.admin} icon="admin" sync={sync} wide={true}>
    {toast&&<Toast msg={toast} onDone={()=>setToast("")} T={T}/>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:12,marginBottom:24}}>
      {[[t.students,students.length,"users",T.success],[t.teachers,teachers.length,"teacher",T.warn],[t.grades,[...new Set(students.map(s=>s.grade))].length,"grades","#60a5fa"]].map(([l,v,ic,c])=>
        <Card T={T} key={l} style={{padding:"18px 22px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:6}}>{l}</div><div style={{fontSize:30,fontWeight:800}}>{v}</div></div><div style={{width:38,height:38,borderRadius:9,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n={ic} size={18} color={c}/></div></div></Card>
      )}
    </div>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="user" size={16} color={T.textSub}/>{t.approvedLogins}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("cred")}><Ic n="plus" size={13} color={T.text}/>{t.addCredential}</BtnO></div>
      {isMobile?<div style={{display:"grid",gap:8}}>
        {Object.entries(creds).map(([email,u])=><div key={email} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>{u.name}</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:4}}>{email}</div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:6}}>{u.metadata?.phone||"—"}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${rc[u.role]||T.accent}18`,color:rc[u.role]||T.accent}}>{t.roles[u.role]||u.role}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>openEditCred(email)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button>
              {email!=="admin@school.edu"&&<button onClick={()=>delCred(email)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button>}
            </div>
          </div>
        </div>)}
      </div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.roleLabel}</TH><TH T={T}>{t.phone}</TH><TH T={T}/></tr></thead>
        <tbody>{Object.entries(creds).map(([email,u])=><tr key={email}>
          <TD T={T} bold>{u.name}</TD><TD T={T}>{email}</TD>
          <td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${rc[u.role]||T.accent}18`,color:rc[u.role]||T.accent}}>{t.roles[u.role]||u.role}</span></td>
          <TD T={T}>{u.metadata?.phone||"—"}</TD>
          <td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>openEditCred(email)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button>
              {email!=="admin@school.edu"&&<button onClick={()=>delCred(email)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button>}
            </div>
          </td>
        </tr>)}</tbody>
      </table></div>}
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="attend" size={16} color={T.textSub}/>{t.gradePeriods}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("period")}><Ic n="plus" size={13} color={T.text}/>{t.addPeriod}</BtnO></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {gradePeriods.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:8,background:T.surface,border:`1px solid ${T.border2}`}}><span style={{fontSize:12,fontWeight:600,color:T.text}}>{p.label}</span><button onClick={()=>delPeriod(p.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.danger,fontSize:14,lineHeight:1,padding:0}}>×</button></div>)}
        {gradePeriods.length===0&&<div style={{fontSize:12,color:T.textMuted}}>—</div>}
      </div>
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="book" size={16} color={T.textSub}/>{t.subjectsSection}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("subject")}><Ic n="plus" size={13} color={T.text}/>{t.addSubject}</BtnO></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {subjects.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:8,background:T.surface,border:`1px solid ${T.border2}`}}>
          <span style={{fontSize:12,fontWeight:600,color:T.text}}>{lang==="ar"?s.label_ar:s.label_en}</span>
          <span style={{fontSize:10,color:T.textMuted,padding:"1px 6px",borderRadius:10,background:T.bg}}>{s.id}</span>
          <button onClick={()=>delSubject(s.id)} style={{background:"transparent",border:"none",cursor:"pointer",color:T.danger,fontSize:14,lineHeight:1,padding:0}}>×</button>
        </div>)}
        {subjects.length===0&&<div style={{fontSize:12,color:T.textMuted}}>—</div>}
      </div>
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="stats" size={16} color={T.textSub}/>{t.accountants}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("accountant")}><Ic n="plus" size={13} color={T.text}/>{t.addAccountant}</BtnO></div>
      {isMobile?<div style={{display:"grid",gap:8}}>{accountants.map(a=><div key={a.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>{a.photo_url?<img src={a.photo_url} alt={a.name} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={12} color={T.textSub}/></div>}<div style={{fontSize:13,fontWeight:700}}>{a.name}</div></div><div style={{fontSize:12,color:T.textSub}}>{a.email}</div><div style={{fontSize:12,color:T.textSub}}>{a.phone||"—"}</div><div style={{display:"flex",gap:6,marginTop:8}}><button onClick={()=>openEditAccountant(a)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delAccountant(a)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></div>)}</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}/></tr></thead><tbody>{accountants.map(a=><tr key={a.id}><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:8}}>{a.photo_url?<img src={a.photo_url} alt={a.name} style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={11} color={T.textSub}/></div>}<span style={{fontSize:13,fontWeight:600,color:T.text}}>{a.name}</span></div></td><TD T={T}>{a.email}</TD><TD T={T}>{a.phone||"—"}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",gap:6}}><button onClick={()=>openEditAccountant(a)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delAccountant(a)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></td></tr>)}</tbody></table></div>}
    </Card>

    <Card T={T} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="users" size={16} color={T.textSub}/>{t.students}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("student")}><Ic n="plus" size={13} color={T.text}/>{t.addStudent}</BtnO></div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:12}}>
        <div><Lbl T={T}>{t.filterByGrade}</Lbl><Sel T={T} value={studentGradeFilter} onChange={e=>setStudentGradeFilter(e.target.value)}><option value="all">{t.allGrades}</option>{studentGradeOptions.map(g=><option key={g} value={g}>{g}</option>)}</Sel></div>
        <div><Lbl T={T}>{t.sortBy}</Lbl><Sel T={T} value={studentSort} onChange={e=>setStudentSort(e.target.value)}>{[["grade_asc",t.gradeAsc],["grade_desc",t.gradeDesc],["name_asc",t.nameAsc],["name_desc",t.nameDesc]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></div>
      </div>
      {isMobile?<div style={{display:"grid",gap:8}}>{shownStudents.map(s=><div key={s.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>{s.photo_url?<img src={s.photo_url} alt={s.name} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={12} color={T.textSub}/></div>}<div style={{fontSize:13,fontWeight:700}}>{s.name}</div></div><div style={{fontSize:12,color:T.textSub}}>{s.email}</div><div style={{fontSize:12,color:T.textSub}}>{s.phone||"—"}</div><div style={{fontSize:12,color:T.textSub}}>{s.grade}</div><div style={{fontSize:12,color:T.textSub}}>{t.tuitionTotal}: {Number(s.tuition_total||0)}</div><div style={{fontSize:12,color:T.textSub}}>{t.tuitionPaid}: {Number(s.tuition_paid||0)}</div><div style={{fontSize:12,color:T.textSub,marginBottom:8}}>{t.tuitionOwed}: {Math.max(0,Number(s.tuition_total||0)-Number(s.tuition_paid||0))}</div><div style={{display:"flex",gap:6}}><button onClick={()=>openEditStudent(s)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delStudent(s)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></div>)}</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}>{t.grade}</TH><TH T={T}>{t.tuitionTotal}</TH><TH T={T}>{t.tuitionPaid}</TH><TH T={T}>{t.tuitionOwed}</TH><TH T={T}/></tr></thead><tbody>{shownStudents.map(s=><tr key={s.id}><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:8}}>{s.photo_url?<img src={s.photo_url} alt={s.name} style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={11} color={T.textSub}/></div>}<span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.name}</span></div></td><TD T={T}>{s.email}</TD><TD T={T}>{s.phone||"—"}</TD><TD T={T}>{s.grade}</TD><TD T={T}>{Number(s.tuition_total||0)}</TD><TD T={T}>{Number(s.tuition_paid||0)}</TD><TD T={T}>{Math.max(0,Number(s.tuition_total||0)-Number(s.tuition_paid||0))}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",gap:6}}><button onClick={()=>openEditStudent(s)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delStudent(s)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></td></tr>)}</tbody></table></div>}
    </Card>

    <Card T={T}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,fontWeight:700}}><Ic n="teacher" size={16} color={T.textSub}/>{t.teachers}</div><BtnO T={T} style={{padding:"6px 14px",fontSize:12}} onClick={()=>setModal("teacher")}><Ic n="plus" size={13} color={T.text}/>{t.addTeacher}</BtnO></div>
      {isMobile?<div style={{display:"grid",gap:8}}>{teachers.map(tt=><div key={tt.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>{tt.photo_url?<img src={tt.photo_url} alt={tt.name} style={{width:26,height:26,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={12} color={T.textSub}/></div>}<div style={{fontSize:13,fontWeight:700}}>{tt.name}</div></div><div style={{fontSize:12,color:T.textSub}}>{tt.email}</div><div style={{fontSize:12,color:T.textSub}}>{tt.phone||"—"}</div><div style={{fontSize:12,color:T.textSub}}>{tt.subjectDisplay||tt.subject}</div><div style={{fontSize:12,color:T.textSub,marginBottom:8}}>{normalizeList(tt.grades||tt.grade).join(", ")||"—"}</div><div style={{display:"flex",gap:6}}><button onClick={()=>openEditTeacher(tt)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delTeacher(tt)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></div>)}</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}>{t.subject}</TH><TH T={T}>{t.grade}</TH><TH T={T}/></tr></thead><tbody>{teachers.map(tt=><tr key={tt.id}><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",alignItems:"center",gap:8}}>{tt.photo_url?<img src={tt.photo_url} alt={tt.name} style={{width:24,height:24,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/>:<div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,border:`1px solid ${T.border}`}}><Ic n="user" size={11} color={T.textSub}/></div>}<span style={{fontSize:13,fontWeight:600,color:T.text}}>{tt.name}</span></div></td><TD T={T}>{tt.email}</TD><TD T={T}>{tt.phone||"—"}</TD><TD T={T}>{tt.subjectDisplay||tt.subject}</TD><TD T={T}>{normalizeList(tt.grades||tt.grade).join(", ")||"—"}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",gap:6}}><button onClick={()=>openEditTeacher(tt)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.textSub,background:"transparent",border:`1px solid ${T.border2}`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="edit" size={11} color={T.textSub}/>{t.editInfo}</button><button onClick={()=>delTeacher(tt)} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:600,color:T.danger,background:"transparent",border:`1px solid ${T.danger}33`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}><Ic n="trash" size={11} color={T.danger}/>{t.deleteBtn}</button></div></td></tr>)}</tbody></table></div>}
    </Card>

    <Modal open={modal==="cred"} onClose={()=>setModal(null)} title={t.addCredential} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={nc[f]} onChange={e=>setNc(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:14}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={nc.password} onChange={e=>setNc(p=>({...p,password:e.target.value}))}/></div>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.roleLabel}</Lbl><Sel T={T} value={nc.role} onChange={e=>setNc(p=>({...p,role:e.target.value}))}>{["admin","teacher","student","bus_driver","accountant"].map(r=><option key={r} value={r}>{t.roles[r]}</option>)}</Sel></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addCred}><Ic n="plus" size={14} color={T.accentInv}/>{t.addCredential}</BtnP>
    </Modal>
    <Modal open={modal==="period"} onClose={()=>setModal(null)} title={t.addPeriod} T={T} dir={dir}>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.periodName}</Lbl><Inp T={T} value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPeriod()}/></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addPeriod}><Ic n="plus" size={14} color={T.accentInv}/>{t.addPeriod}</BtnP>
    </Modal>
    <Modal open={modal==="student"} onClose={()=>setModal(null)} title={t.addStudent} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={ns[f]} onChange={e=>setNs(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:16}}><Lbl T={T}>{t.gradeLevel}</Lbl><Sel T={T} value={ns.grade} onChange={e=>setNs(p=>({...p,grade:e.target.value}))}>{t.grades1to12.map(g=><option key={g} value={g}>{g}</option>)}</Sel></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <div><Lbl T={T}>{t.tuitionTotal}</Lbl><Inp T={T} type="number" min="0" value={ns.tuition_total??0} onChange={e=>setNs(p=>({...p,tuition_total:+e.target.value}))}/></div>
        <div><Lbl T={T}>{t.tuitionPaid}</Lbl><Inp T={T} type="number" min="0" value={ns.tuition_paid??0} onChange={e=>setNs(p=>({...p,tuition_paid:+e.target.value}))}/></div>
      </div>
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setNs,e.target.files?.[0])}/>{ns.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={ns.photo_url} alt={ns.name||"student"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setNs(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      <div style={{marginBottom:12}}><Checkbox checked={nsCred.enabled} onChange={()=>setNsCred(p=>({...p,enabled:!p.enabled}))} label={t.createApprovedLogin} T={T}/></div>
      {nsCred.enabled&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={nsCred.password} onChange={e=>setNsCred(p=>({...p,password:e.target.value}))}/></div>}
      {gradePeriods.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:T.textMuted,marginBottom:12}}>{t.initialGrades}</div>{gradePeriods.map(period=><div key={period.id} style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,color:T.textSub,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.border}`}}>{period.label}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>{SKEYS.map((sk,si)=><div key={sk}><Lbl T={T}>{SLABELS[si]}</Lbl><Inp T={T} type="number" min="0" max="100" value={nsG[period.id]?.[sk]??0} onChange={e=>setNsG(prev=>({...prev,[period.id]:{...prev[period.id],[sk]:+e.target.value}}))}/></div>)}</div></div>)}</div>}
      <BtnP T={T} style={{width:"100%"}} onClick={addStudent}><Ic n="plus" size={14} color={T.accentInv}/>{t.addStudent}</BtnP>
    </Modal>
    <Modal open={modal==="teacher"} onClose={()=>setModal(null)} title={t.addTeacher} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={nt[f]} onChange={e=>setNt(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:14}}><Lbl T={T}>{t.subject}</Lbl>{normalizeList(nt.subjects).map((subjectKey,idx)=><div key={`new-sub-${idx}`} style={{display:"flex",gap:8,marginBottom:8}}><Sel T={T} value={subjectKey} onChange={e=>setNt(p=>{const next=normalizeList(p.subjects);next[idx]=e.target.value;return {...p,subjects:next};})}>{subjects.map((s)=><option key={s.id} value={s.id}>{lang==="ar"?s.label_ar:s.label_en}</option>)}</Sel>{normalizeList(nt.subjects).length>1&&<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setNt(p=>{const next=normalizeList(p.subjects).filter((_,i)=>i!==idx);return {...p,subjects:next.length?next:[subjects[0]?.id||"math"]};})}>{t.removeItem}</BtnO>}</div>)}<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>addTeacherSubjectField(false)}><Ic n="plus" size={12} color={T.text}/>{t.addAnotherSubject}</BtnO></div>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.gradeForTeacher}</Lbl>{normalizeList(nt.grades).map((gradeLabel,idx)=><div key={`new-grade-${idx}`} style={{display:"flex",gap:8,marginBottom:8}}><Sel T={T} value={gradeLabel} onChange={e=>setNt(p=>{const next=normalizeList(p.grades);next[idx]=e.target.value;return {...p,grades:next};})}>{t.grades1to12.map(g=><option key={g} value={g}>{g}</option>)}</Sel>{normalizeList(nt.grades).length>1&&<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setNt(p=>{const next=normalizeList(p.grades).filter((_,i)=>i!==idx);return {...p,grades:next.length?next:[t.grades1to12[0]]};})}>{t.removeItem}</BtnO>}</div>)}<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>addTeacherGradeField(false)}><Ic n="plus" size={12} color={T.text}/>{t.addAnotherClass}</BtnO></div>
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setNt,e.target.files?.[0])}/>{nt.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={nt.photo_url} alt={nt.name||"teacher"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setNt(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      <div style={{marginBottom:12}}><Checkbox checked={ntCred.enabled} onChange={()=>setNtCred(p=>({...p,enabled:!p.enabled}))} label={t.createApprovedLogin} T={T}/></div>
      {ntCred.enabled&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={ntCred.password} onChange={e=>setNtCred(p=>({...p,password:e.target.value}))}/></div>}
      <BtnP T={T} style={{width:"100%"}} onClick={addTeacher}><Ic n="plus" size={14} color={T.accentInv}/>{t.addTeacher}</BtnP>
    </Modal>
    <Modal open={modal==="accountant"} onClose={()=>setModal(null)} title={t.addAccountant} T={T} dir={dir}>
      {[["name",t.name,"text"],["email",t.emailLbl,"email"],["phone",t.phone,"tel"]].map(([f,lbl,tp])=><div key={f} style={{marginBottom:14}}><Lbl T={T}>{lbl}</Lbl><Inp T={T} type={tp} value={na[f]} onChange={e=>setNa(p=>({...p,[f]:e.target.value}))}/></div>)}
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setNa,e.target.files?.[0])}/>{na.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={na.photo_url} alt={na.name||"accountant"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setNa(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      <div style={{marginBottom:12}}><Checkbox checked={naCred.enabled} onChange={()=>setNaCred(p=>({...p,enabled:!p.enabled}))} label={t.createApprovedLogin} T={T}/></div>
      {naCred.enabled&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={naCred.password} onChange={e=>setNaCred(p=>({...p,password:e.target.value}))}/></div>}
      <BtnP T={T} style={{width:"100%"}} onClick={addAccountant}><Ic n="plus" size={14} color={T.accentInv}/>{t.addAccountant}</BtnP>
    </Modal>
    <Modal open={modal==="subject"} onClose={()=>setModal(null)} title={t.addSubject} T={T} dir={dir}>
      <div style={{marginBottom:14}}><Lbl T={T}>الاسم بالعربية</Lbl><Inp T={T} value={newSubj.label_ar} onChange={e=>setNewSubj(p=>({...p,label_ar:e.target.value}))} placeholder="مثال: كيمياء"/></div>
      <div style={{marginBottom:18}}><Lbl T={T}>English Name</Lbl><Inp T={T} value={newSubj.label_en} onChange={e=>setNewSubj(p=>({...p,label_en:e.target.value}))} placeholder="e.g. Chemistry"/></div>
      <BtnP T={T} style={{width:"100%"}} onClick={addSubject}><Ic n="plus" size={14} color={T.accentInv}/>{t.addSubject}</BtnP>
    </Modal>
    <Modal open={modal==="edit-cred"} onClose={()=>setModal(null)} title={t.editInfo} T={T} dir={dir}>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.emailLbl}</Lbl><Inp T={T} value={editCred?.email||""} disabled/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.name}</Lbl><Inp T={T} value={editCred?.name||""} onChange={e=>setEditCred(p=>({...p,name:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.phone}</Lbl><Inp T={T} value={editCred?.phone||""} onChange={e=>setEditCred(p=>({...p,phone:e.target.value}))}/></div>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.roleLabel}</Lbl><Sel T={T} value={editCred?.role||"teacher"} onChange={e=>setEditCred(p=>({...p,role:e.target.value}))}>{["admin","teacher","student","bus_driver","accountant"].map(r=><option key={r} value={r}>{t.roles[r]}</option>)}</Sel></div>
      <BtnP T={T} style={{width:"100%"}} onClick={saveEditCred}><Ic n="save" size={14} color={T.accentInv}/>{t.saveChanges}</BtnP>
    </Modal>
    <Modal open={modal==="edit-student"} onClose={()=>setModal(null)} title={t.editInfo} T={T} dir={dir}>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.name}</Lbl><Inp T={T} value={editStudent?.name||""} onChange={e=>setEditStudent(p=>({...p,name:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.emailLbl}</Lbl><Inp T={T} type="email" value={editStudent?.email||""} onChange={e=>setEditStudent(p=>({...p,email:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.phone}</Lbl><Inp T={T} value={editStudent?.phone||""} onChange={e=>setEditStudent(p=>({...p,phone:e.target.value}))}/></div>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.gradeLevel}</Lbl><Sel T={T} value={editStudent?.grade||t.grades1to12[0]} onChange={e=>setEditStudent(p=>({...p,grade:e.target.value}))}>{t.grades1to12.map(g=><option key={g} value={g}>{g}</option>)}</Sel></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <div><Lbl T={T}>{t.tuitionTotal}</Lbl><Inp T={T} type="number" min="0" value={editStudent?.tuition_total??0} onChange={e=>setEditStudent(p=>({...p,tuition_total:+e.target.value}))}/></div>
        <div><Lbl T={T}>{t.tuitionPaid}</Lbl><Inp T={T} type="number" min="0" value={editStudent?.tuition_paid??0} onChange={e=>setEditStudent(p=>({...p,tuition_paid:+e.target.value}))}/></div>
      </div>
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setEditStudent,e.target.files?.[0])}/>{editStudent?.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={editStudent.photo_url} alt={editStudent.name||"student"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setEditStudent(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      {editStudentLogin.has?<div style={{marginBottom:14,fontSize:12,color:T.success,background:`${T.success}14`,border:`1px solid ${T.success}44`,borderRadius:8,padding:"10px 12px"}}>{t.approvedLoginLinked}</div>:<>
        <div style={{marginBottom:12}}><Checkbox checked={editStudentLogin.create} onChange={()=>setEditStudentLogin(p=>({...p,create:!p.create}))} label={t.createLoginOnSave} T={T}/></div>
        {editStudentLogin.create&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={editStudentLogin.password} onChange={e=>setEditStudentLogin(p=>({...p,password:e.target.value}))}/></div>}
      </>}
      <BtnP T={T} style={{width:"100%"}} onClick={saveEditStudent}><Ic n="save" size={14} color={T.accentInv}/>{t.saveChanges}</BtnP>
    </Modal>
    <Modal open={modal==="edit-teacher"} onClose={()=>setModal(null)} title={t.editInfo} T={T} dir={dir}>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.name}</Lbl><Inp T={T} value={editTeacher?.name||""} onChange={e=>setEditTeacher(p=>({...p,name:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.emailLbl}</Lbl><Inp T={T} type="email" value={editTeacher?.email||""} onChange={e=>setEditTeacher(p=>({...p,email:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.phone}</Lbl><Inp T={T} value={editTeacher?.phone||""} onChange={e=>setEditTeacher(p=>({...p,phone:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.subject}</Lbl>{normalizeList(editTeacher?.subjects).map((subjectKey,idx)=><div key={`edit-sub-${idx}`} style={{display:"flex",gap:8,marginBottom:8}}><Sel T={T} value={subjectKey} onChange={e=>setEditTeacher(p=>{const next=normalizeList(p?.subjects);next[idx]=e.target.value;return {...p,subjects:next};})}>{subjects.map((s)=><option key={s.id} value={s.id}>{lang==="ar"?s.label_ar:s.label_en}</option>)}</Sel>{normalizeList(editTeacher?.subjects).length>1&&<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setEditTeacher(p=>{const next=normalizeList(p?.subjects).filter((_,i)=>i!==idx);return {...p,subjects:next.length?next:[subjects[0]?.id||"math"]};})}>{t.removeItem}</BtnO>}</div>)}<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>addTeacherSubjectField(true)}><Ic n="plus" size={12} color={T.text}/>{t.addAnotherSubject}</BtnO></div>
      <div style={{marginBottom:18}}><Lbl T={T}>{t.gradeForTeacher}</Lbl>{normalizeList(editTeacher?.grades).map((gradeLabel,idx)=><div key={`edit-grade-${idx}`} style={{display:"flex",gap:8,marginBottom:8}}><Sel T={T} value={gradeLabel} onChange={e=>setEditTeacher(p=>{const next=normalizeList(p?.grades);next[idx]=e.target.value;return {...p,grades:next};})}>{t.grades1to12.map(g=><option key={g} value={g}>{g}</option>)}</Sel>{normalizeList(editTeacher?.grades).length>1&&<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>setEditTeacher(p=>{const next=normalizeList(p?.grades).filter((_,i)=>i!==idx);return {...p,grades:next.length?next:[t.grades1to12[0]]};})}>{t.removeItem}</BtnO>}</div>)}<BtnO T={T} type="button" style={{padding:"6px 10px",fontSize:11}} onClick={()=>addTeacherGradeField(true)}><Ic n="plus" size={12} color={T.text}/>{t.addAnotherClass}</BtnO></div>
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setEditTeacher,e.target.files?.[0])}/>{editTeacher?.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={editTeacher.photo_url} alt={editTeacher.name||"teacher"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setEditTeacher(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      {editTeacherLogin.has?<div style={{marginBottom:14,fontSize:12,color:T.success,background:`${T.success}14`,border:`1px solid ${T.success}44`,borderRadius:8,padding:"10px 12px"}}>{t.approvedLoginLinked}</div>:<>
        <div style={{marginBottom:12}}><Checkbox checked={editTeacherLogin.create} onChange={()=>setEditTeacherLogin(p=>({...p,create:!p.create}))} label={t.createLoginOnSave} T={T}/></div>
        {editTeacherLogin.create&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={editTeacherLogin.password} onChange={e=>setEditTeacherLogin(p=>({...p,password:e.target.value}))}/></div>}
      </>}
      <BtnP T={T} style={{width:"100%"}} onClick={saveEditTeacher}><Ic n="save" size={14} color={T.accentInv}/>{t.saveChanges}</BtnP>
    </Modal>
    <Modal open={modal==="edit-accountant"} onClose={()=>setModal(null)} title={t.editInfo} T={T} dir={dir}>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.name}</Lbl><Inp T={T} value={editAccountant?.name||""} onChange={e=>setEditAccountant(p=>({...p,name:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.emailLbl}</Lbl><Inp T={T} type="email" value={editAccountant?.email||""} onChange={e=>setEditAccountant(p=>({...p,email:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><Lbl T={T}>{t.phone}</Lbl><Inp T={T} value={editAccountant?.phone||""} onChange={e=>setEditAccountant(p=>({...p,phone:e.target.value}))}/></div>
      <div style={{marginBottom:16}}><Lbl T={T}>Photo</Lbl><Inp T={T} type="file" accept="image/*" onChange={e=>handlePhotoSelect(setEditAccountant,e.target.files?.[0])}/>{editAccountant?.photo_url&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}><img src={editAccountant.photo_url} alt={editAccountant.name||"accountant"} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`1px solid ${T.border}`}}/><BtnO T={T} type="button" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setEditAccountant(p=>({...p,photo_url:""}))}>Remove</BtnO></div>}</div>
      {editAccountantLogin.has?<div style={{marginBottom:14,fontSize:12,color:T.success,background:`${T.success}14`,border:`1px solid ${T.success}44`,borderRadius:8,padding:"10px 12px"}}>{t.approvedLoginLinked}</div>:<>
        <div style={{marginBottom:12}}><Checkbox checked={editAccountantLogin.create} onChange={()=>setEditAccountantLogin(p=>({...p,create:!p.create}))} label={t.createLoginOnSave} T={T}/></div>
        {editAccountantLogin.create&&<div style={{marginBottom:16}}><Lbl T={T}>{t.newPassword}</Lbl><Inp T={T} type="password" value={editAccountantLogin.password} onChange={e=>setEditAccountantLogin(p=>({...p,password:e.target.value}))}/></div>}
      </>}
      <BtnP T={T} style={{width:"100%"}} onClick={saveEditAccountant}><Ic n="save" size={14} color={T.accentInv}/>{t.saveChanges}</BtnP>
    </Modal>
  </PageShell>;
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
function TeacherDashboard({user,onBack,themeMode,onThemeChange,lang,onToggleLang,onSignOut,gradePeriods,studentGrades,onStudentGradesChange,subjects=[]}){
  const T=getTheme(themeMode),t=TR[lang],dir=t.dir;
  const isMobile=useIsMobile();
  const[students,setStudents]=useState(DEMO_STUDENTS);
  const[studAtt,setStudAtt]=useState(STUDENT_ATT);
  const[activeGrade,setActiveGrade]=useState(null);
  const[tab,setTab]=useState("attendance");
  const[editSt,setEditSt]=useState(null);
  const[profileSt,setProfileSt]=useState(null);
  const[gVals,setGVals]=useState({});
  const[toast,setToast]=useState("");
  const[sync,setSync]=useState(null);
  const SLABELS=subjects.map(s=>lang==="ar"?s.label_ar:s.label_en);
  const SKEYS=subjects.map(s=>s.id);
  const teacherSubjects=normalizeList(user.metadata?.subjects||user.metadata?.subject);
  const teacherGrades=normalizeList(user.metadata?.grades||user.metadata?.grade);
  const[activeSubject,setActiveSubject]=useState(firstOrNull(teacherSubjects)||null);
  useEffect(()=>{
    if(!activeSubject&&teacherSubjects.length>0){setActiveSubject(teacherSubjects[0]);return;}
    if(activeSubject&&!teacherSubjects.includes(activeSubject)){setActiveSubject(firstOrNull(teacherSubjects)||null);}
  },[activeSubject,teacherSubjects]);
  // Teacher can edit one selected assigned subject at a time.
  const tSubjKey=activeSubject;
  const tSubjLabel=tSubjKey?(SLABELS[SKEYS.indexOf(tSubjKey)]||tSubjKey):"—";
  useEffect(()=>{
    let alive=true;
    async function loadTeacherData(){
      const[dS,dA]=await Promise.all([
        sb.get("students","?order=created_at.asc",user?.accessToken||null),
        sb.get("attendance","?select=student_id,year_month,days",user?.accessToken||null)
      ]);
      if(!alive)return;
      if(dS&&dS.length>0){
        setStudents(dS.map(s=>({
          id:s.id,
          name:s.name,
          email:s.email,
          grade:s.grade,
          phone:s.phone||"",
        })));
      }
      if(dA&&dA.length>0){
        const mapped={};
        dA.forEach(r=>{
          if(!mapped[r.student_id])mapped[r.student_id]={};
          mapped[r.student_id][r.year_month]=r.days||{};
        });
        setStudAtt(prev=>({...prev,...mapped}));
      }
    }
    loadTeacherData();
    return()=>{alive=false;};
  },[]);
  const scopedStudents=(teacherGrades.length>0?students.filter(s=>teacherGrades.includes(s.grade)):students);
  const grouped=scopedStudents.reduce((a,s)=>{(a[s.grade]=a[s.grade]||[]).push(s);return a;},{});
  const requireToken=()=>{
    if(SB_READY&&!user?.accessToken){
      setToast("!Session expired. Please sign in again.");
      setSync("fail");
      return false;
    }
    return true;
  };
  const markTodayForGrade=async(present)=>{
    if(!requireToken())return;
    if(!tSubjKey){
      setToast("!No subject assigned to this teacher.");
      setSync("fail");
      return;
    }
    if(!activeGrade)return;
    const today=new Date();
    const key=`${today.getFullYear()}-${today.getMonth()}`;
    const day=String(today.getDate());
    const targets=grouped[activeGrade]||[];
    if(targets.length===0)return;
    let ok=true;
    for(const st of targets){
      const currentVal=studAtt[st.id]?.[key]?.[day];
      const nextDayVal=(currentVal&&typeof currentVal==="object")
        ? {...currentVal,[tSubjKey]:present}
        : {[tSubjKey]:present};
      const nextDays={...(studAtt[st.id]?.[key]||{}),[day]:nextDayVal};
      setStudAtt(prev=>({
        ...prev,
        [st.id]:{...(prev[st.id]||{}),[key]:nextDays}
      }));
      const r=await sb.upsertWithStatusOnConflict("attendance",[{student_id:st.id,year_month:key,days:nextDays}],"student_id,year_month",user?.accessToken||null);
      if(!r.ok){
        ok=false;
        setToast(`!Attendance save failed: ${String(r.error||`status ${r.status}`).slice(0,120)}`);
        break;
      }
    }
    setSync(ok?"ok":"fail");
    if(ok)setToast(t.attendanceSaved);
  };

  const openEdit=st=>{
    const ex=studentGrades[st.id]||{};
    const v={};
    gradePeriods.forEach(p=>{v[p.id]={...Object.fromEntries(SKEYS.map(s=>[s,0])),...(ex[p.id]||{})};});
    setGVals(v);setEditSt(st);
  };
  const saveGrades=async()=>{
    if(!requireToken())return;
    if(!editSt)return;
    onStudentGradesChange(prev=>({...prev,[editSt.id]:gVals}));
    setToast(t.gradesSaved);
    let ok=true;
    for(const p of gradePeriods){
      const r=await sb.upsertWithStatusOnConflict("grades",[{student_id:editSt.id,period_id:p.id,scores:gVals[p.id]}],"student_id,period_id",user?.accessToken||null);
      if(!r.ok){
        ok=false;
        setToast(`!Grades save failed: ${String(r.error||`status ${r.status}`).slice(0,120)}`);
        break;
      }
    }
    if(ok)setToast(t.gradesSaved);
    setSync(ok?"ok":"fail");setEditSt(null);
  };

  return <PageShell T={T} t={t} themeMode={themeMode} onThemeChange={onThemeChange} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.teacher} icon="teacher" sync={sync}
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    {toast&&<Toast msg={toast} onDone={()=>setToast("")} T={T}/>}
    <InfoCard T={T} name={user.name} icon="teacher" photoUrl={user.metadata?.photo_url||""} details={[{icon:"book",label:t.subject,value:teacherSubjects.map(sk=>SLABELS[SKEYS.indexOf(sk)]||sk).join(", ")||"—"},{icon:"grades",label:t.classes,value:teacherGrades.join(", ")||"—"},{icon:"phone",label:t.phone,value:user.metadata?.phone||"—"}]}/>
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
      {teacherSubjects.length>1&&<div style={{marginBottom:12}}><Lbl T={T}>{t.subject}</Lbl><Sel T={T} value={tSubjKey||teacherSubjects[0]} onChange={e=>setActiveSubject(e.target.value)}>{teacherSubjects.map(sk=><option key={sk} value={sk}>{SLABELS[SKEYS.indexOf(sk)]||sk}</option>)}</Sel></div>}
      <div style={{display:"flex",gap:6,marginBottom:22}}>
        {[["attendance",t.attendance,"attend"],["grades",t.gradesTxt,"grades"]].map(([tb,lbl,ic])=><button key={tb} onClick={()=>setTab(tb)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 18px",borderRadius:7,border:`1px solid ${tab===tb?T.accent:T.border}`,background:tab===tb?T.accent:"transparent",color:tab===tb?T.accentInv:T.textSub,cursor:"pointer",fontSize:12,fontWeight:600}}><Ic n={ic} size={13} color={tab===tb?T.accentInv:T.textSub}/>{lbl}</button>)}
      </div>
      {tab==="attendance"&&<>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          <BtnO T={T} style={{padding:"6px 12px",fontSize:11}} onClick={()=>markTodayForGrade(true)}><Ic n="check" size={12} color={T.text}/>{t.present}</BtnO>
          <BtnO T={T} style={{padding:"6px 12px",fontSize:11}} onClick={()=>markTodayForGrade(false)}><Ic n="alert" size={12} color={T.text}/>{t.absent}</BtnO>
        </div>
        {!tSubjKey?<div style={{padding:"10px 12px",borderRadius:8,background:`${T.warn}14`,border:`1px solid ${T.warn}33`,fontSize:12,color:T.warn}}>No subject assigned to this teacher account.</div>:
          <AttendanceCalendar T={T} t={t} editable={true} students={grouped[activeGrade]||[]} initAtt={studAtt} subjectKey={tSubjKey} onSave={async(sid,key,days)=>{
            if(!requireToken())return;
            if(!tSubjKey){
              setToast("!No subject assigned to this teacher.");
              setSync("fail");
              return;
            }
            const prevDays=studAtt[sid]?.[key]||{};
            const safeDays={...prevDays};
            Object.entries(days||{}).forEach(([d,v])=>{
              const prevVal=prevDays[d];
              const nextObj=(prevVal&&typeof prevVal==="object")?{...prevVal}:{};
              nextObj[tSubjKey]=Boolean(v&&typeof v==="object"?v[tSubjKey]:false);
              safeDays[d]=nextObj;
            });
            const r=await sb.upsertWithStatusOnConflict("attendance",[{student_id:sid,year_month:key,days:safeDays}],"student_id,year_month",user?.accessToken||null);
            setStudAtt(prev=>({
              ...prev,
              [sid]:{...(prev[sid]||{}),[key]:safeDays}
            }));
            setSync(r.ok?"ok":"fail");
            setToast(r.ok?t.attendanceSaved:`!Attendance save failed: ${String(r.error||`status ${r.status}`).slice(0,120)}`);
            if(r.ok)setActiveGrade(null);
          }}/>}
      </>}
      {tab==="grades"&&<table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.emailLbl}</TH><TH T={T}>{t.phone}</TH><TH T={T}/><TH T={T}/></tr></thead>
        <tbody>{(grouped[activeGrade]||[]).map(st=><tr key={st.id}><TD T={T} bold>{st.name}</TD><TD T={T}>{st.email}</TD><TD T={T}>{st.phone||"—"}</TD><td style={{padding:"12px 8px",borderBottom:`1px solid ${T.border}`}}><BtnO T={T} style={{padding:"5px 10px",fontSize:11}} onClick={()=>setProfileSt(st)}><Ic n="user" size={12} color={T.text}/>{t.viewProfile}</BtnO></td><td style={{padding:"12px 8px",borderBottom:`1px solid ${T.border}`}}><BtnO T={T} style={{padding:"5px 10px",fontSize:11}} onClick={()=>openEdit(st)}><Ic n="edit" size={12} color={T.text}/>{t.edit}</BtnO></td></tr>)}</tbody>
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
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            {SKEYS.map((sk,si)=>{
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

    <Modal open={!!profileSt} onClose={()=>setProfileSt(null)} title={`${t.viewProfile} — ${profileSt?.name||""}`} T={T} dir={dir}>
      {profileSt&&(()=>{
        const sid=profileSt.id;
        const myG=studentGrades[sid]||{};
        const myAtt=studAtt[sid]||{};
        const months=Object.values(myAtt);
        const allDays=months.flatMap(m=>Object.values(m||{}));
        const dayPresent=v=>typeof v==="boolean"?v:(v&&typeof v==="object"?Object.values(v).some(Boolean):false);
        const pres=allDays.filter(dayPresent).length;
        const total=allDays.length;
        const rate=total?Math.round((pres/total)*100):0;
        const avgSub=sk=>{
          const vals=gradePeriods.map(p=>myG[p.id]?.[sk]??0).filter(v=>v>0);
          return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
        };
        return <div>
          <InfoCard T={T} name={profileSt.name} icon="student" details={[{icon:"phone",label:t.phone,value:profileSt.phone||"—"},{icon:"grades",label:t.grade,value:profileSt.grade||"—"},{icon:"attend",label:t.rate,value:`${rate}%`}]} />
          <Card T={T} style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:T.textMuted,marginBottom:10}}>{t.gradesTxt}</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
              {SKEYS.map((sk,si)=><div key={sk} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:T.textSub}}>{SLABELS[si]}</span>
                <span style={{fontSize:13,fontWeight:700,color:T.text}}>{avgSub(sk)||"—"}</span>
              </div>)}
            </div>
          </Card>
        </div>;
      })()}
    </Modal>
  </PageShell>;
}

// ── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({user,onBack,themeMode,onThemeChange,lang,onToggleLang,onSignOut,gradePeriods,studentGrades,subjects=[]}){
  const T=getTheme(themeMode),t=TR[lang];
  const isMobile=useIsMobile();
  const[tab,setTab]=useState("grades");
  const[sr,setSr]=useState(()=>DEMO_STUDENTS.find(s=>s.email===user.email)||{});
  const[myAtt,setMyAtt]=useState({});
  const[myGrades,setMyGrades]=useState({});
  const[studentLoaded,setStudentLoaded]=useState(false);
  const[selectedSubject,setSelectedSubject]=useState("__all");
  const[attSubject,setAttSubject]=useState("math");
  const info={name:user.name,grade:user.metadata?.grade||sr.grade||"—",phone:user.metadata?.phone||sr.phone||"—",photo_url:sr.photo_url||user.metadata?.photo_url||""};
  const subjList=subjects.length>0?subjects:t.subjectKeys.map((id,i)=>({id,label_ar:t.subjects[i]||id,label_en:t.subjects[i]||id}));
  const SLABELS=subjList.map(s=>lang==="ar"?s.label_ar:s.label_en);
  const SKEYS=subjList.map(s=>s.id);
  const gc=v=>v>=90?T.success:v>=80?T.text:v>=70?T.warn:T.danger;
  useEffect(()=>{
    if(selectedSubject==="__all")return;
    if(SKEYS.length>0 && !SKEYS.includes(selectedSubject)){
      setSelectedSubject("__all");
    }
  },[SKEYS,selectedSubject]);
  useEffect(()=>{
    if(SKEYS.length>0 && !SKEYS.includes(attSubject)){
      setAttSubject(SKEYS[0]);
    }
  },[SKEYS,attSubject]);
  useEffect(()=>{
    let alive=true;
    async function loadStudentSelf(){
      const email=String(user.email||"").trim().toLowerCase();
      const row=(await sb.get("students",`?email=eq.${esc(email)}&select=id,name,email,grade,phone,tuition_total,tuition_paid,photo_url&limit=1`,user?.accessToken||null))?.[0];
      if(!alive)return;
      if(row){
        setSr({id:row.id,name:row.name,email:row.email,grade:row.grade,phone:row.phone||"",tuition_total:Number(row.tuition_total||0),tuition_paid:Number(row.tuition_paid||0),photo_url:row.photo_url||""});
      }
      setStudentLoaded(true);
    }
    loadStudentSelf();
    return()=>{alive=false;};
  },[user.email,user?.accessToken]);
  const sid=sr.id||(!SB_READY?(DEMO_STUDENTS.find(s=>s.email===user.email)?.id||"s1"):null);
  useEffect(()=>{
    let alive=true;
    async function loadMyGrades(){
      if(!sid)return;
      const rows=await sb.get("grades",`?student_id=eq.${esc(sid)}&select=period_id,scores`,user?.accessToken||null);
      if(!alive)return;
      if(rows&&rows.length>0){
        const mapped={};
        rows.forEach(r=>{mapped[r.period_id]=r.scores||{};});
        setMyGrades(mapped);
      }else{
        setMyGrades(studentGrades[sid]||{});
      }
    }
    loadMyGrades();
    return()=>{alive=false;};
  },[sid,user?.accessToken,studentGrades]);
  useEffect(()=>{
    let alive=true;
    async function loadMyAttendance(){
      if(!sid)return;
      const rows=await sb.get("attendance",`?student_id=eq.${esc(sid)}&select=year_month,days`,user?.accessToken||null);
      if(!alive)return;
      if(rows&&rows.length>0){
        const mapped={};
        rows.forEach(r=>{mapped[r.year_month]=r.days||{};});
        setMyAtt({[sid]:mapped});
        const firstObjDay=Object.values(mapped).flatMap(m=>Object.values(m||{})).find(v=>v&&typeof v==="object");
        const firstKey=firstObjDay?Object.keys(firstObjDay)[0]:null;
        if(firstKey && SKEYS.includes(firstKey)){
          setAttSubject(firstKey);
        }else{
          setAttSubject(SKEYS[0]||"math");
        }
      }else{
        setMyAtt({[sid]:STUDENT_ATT[sid]||STUDENT_ATT["s1"]});
        setAttSubject(SKEYS[0]||"math");
      }
    }
    loadMyAttendance();
    return()=>{alive=false;};
  },[sid,user?.accessToken,SKEYS.join(",")]);
  const myG=myGrades||{};
  const sAvg=sk=>{const v=gradePeriods.map(p=>myG[p.id]?.[sk]??0).filter(v=>v>0);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;};
  const finals=Object.fromEntries(SKEYS.map(s=>[s,sAvg(s)]));
  const total=SKEYS.length>0?Math.round(SKEYS.reduce((a,s)=>a+finals[s],0)/SKEYS.length):0;
  const tuitionTotal=Number(sr.tuition_total||0);
  const tuitionPaid=Number(sr.tuition_paid||0);
  const tuitionOwed=Math.max(0,tuitionTotal-tuitionPaid);

  return <PageShell T={T} t={t} themeMode={themeMode} onThemeChange={onThemeChange} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.student} icon="student"
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    <div style={{display:"flex",gap:16,alignItems:"stretch",marginBottom:24,flexWrap:"wrap"}}>
      <InfoCard T={T} name={info.name} icon="student" photoUrl={info.photo_url} details={[{icon:"grades",label:t.grade,value:info.grade},{icon:"phone",label:t.phone,value:info.phone}]}/>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"18px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:110,flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:T.textMuted,marginBottom:6}}>{t.overallAvg}</div>
        <div style={{fontSize:38,fontWeight:800,color:gc(total),lineHeight:1}}>{total||"—"}</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,minmax(140px,1fr))",gap:10,marginBottom:16}}>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionTotal}</div><div style={{fontSize:22,fontWeight:800}}>{tuitionTotal}</div></Card>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionPaid}</div><div style={{fontSize:22,fontWeight:800,color:T.success}}>{tuitionPaid}</div></Card>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionOwed}</div><div style={{fontSize:22,fontWeight:800,color:T.warn}}>{tuitionOwed}</div></Card>
    </div>
    <div style={{display:"flex",gap:7,marginBottom:22}}>
      {[["grades",t.gradesTxt,"grades"],["attendance",t.attendance,"attend"]].map(([tb,lbl,ic])=><button key={tb} onClick={()=>setTab(tb)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:8,border:`1px solid ${tab===tb?T.accent:T.border}`,background:tab===tb?T.accent:"transparent",color:tab===tb?T.accentInv:T.textSub,cursor:"pointer",fontSize:13,fontWeight:600}}><Ic n={ic} size={14} color={tab===tb?T.accentInv:T.textSub}/>{lbl}</button>)}
    </div>
    {tab==="grades"&&<Card T={T} style={{marginBottom:16,padding:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <Lbl T={T}>{t.subject}</Lbl>
        <Sel T={T} value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} style={{maxWidth:240}}>
          <option value="__all">{t.seeAllGrades}</option>
          {subjList.map((s)=><option key={s.id} value={s.id}>{lang==="ar"?s.label_ar:s.label_en}</option>)}
        </Sel>
        {selectedSubject!=="__all"&&<div style={{fontSize:12,color:T.textSub}}>{t.average}: <strong style={{color:gc(finals[selectedSubject]||0)}}>{finals[selectedSubject]??"—"}</strong></div>}
      </div>
    </Card>}
    {tab==="grades"&&<Card T={T}>{gradePeriods.length===0?<div style={{color:T.textMuted,fontSize:13,padding:"20px 0",textAlign:"center"}}>{t.noGradePeriods}</div>:
      selectedSubject==="__all"
      ? <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead><tr><TH T={T}>{t.period}</TH>{SKEYS.map((sk,i)=><TH T={T} center key={sk}>{SLABELS[i]}</TH>)}</tr></thead>
          <tbody>
            {gradePeriods.map(p=>{const pg=myG[p.id]||{};return <tr key={p.id}><TD T={T} bold>{p.label}</TD>{SKEYS.map(s=><TD T={T} center key={s} color={gc(pg[s]??0)}>{pg[s]??"—"}</TD>)}</tr>;})}
            <tr style={{background:T.surface}}><td style={{padding:"12px 14px",fontWeight:800,fontSize:13,color:T.text,textAlign:"right"}}>{t.final}</td>{SKEYS.map(s=><td key={s} style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:13,color:gc(finals[s])}}>{finals[s]||"—"}</td>)}</tr>
          </tbody>
        </table></div>
      : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:340}}>
          <thead><tr><TH T={T}>{t.period}</TH><TH T={T} center>{SLABELS[SKEYS.indexOf(selectedSubject)]||selectedSubject}</TH></tr></thead>
          <tbody>
            {gradePeriods.map(p=>{const pg=myG[p.id]||{};return <tr key={p.id}><TD T={T} bold>{p.label}</TD><TD T={T} center color={gc(pg[selectedSubject]??0)}>{pg[selectedSubject]??"—"}</TD></tr>;})}
            <tr style={{background:T.surface}}><td style={{padding:"12px 14px",fontWeight:800,fontSize:13,color:T.text,textAlign:"right"}}>{t.final}</td><td style={{padding:"12px 14px",textAlign:"center",fontWeight:800,fontSize:13,color:gc(finals[selectedSubject]||0)}}>{finals[selectedSubject]||"—"}</td></tr>
          </tbody>
        </table></div>
    }</Card>}
    {tab==="attendance"&&<Card T={T} style={{marginBottom:16,padding:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <Lbl T={T}>{t.subject}</Lbl>
        <Sel T={T} value={attSubject} onChange={e=>setAttSubject(e.target.value)} style={{maxWidth:240}}>
          {subjList.map((s)=><option key={s.id} value={s.id}>{lang==="ar"?s.label_ar:s.label_en}</option>)}
        </Sel>
      </div>
    </Card>}
    {tab==="attendance"&&<Card T={T}><AttendanceCalendar T={T} t={t} editable={false} students={[{id:sid,name:info.name}]} initAtt={myAtt} subjectKey={attSubject} showStudentSelector={false}/></Card>}
  </PageShell>;
}

// ── Accountant Dashboard ─────────────────────────────────────────────────────
function AccountantDashboard({user,onBack,themeMode,onThemeChange,lang,onToggleLang,onSignOut}){
  const T=getTheme(themeMode),t=TR[lang];
  const isMobile=useIsMobile();
  const[students,setStudents]=useState(DEMO_STUDENTS);
  const[selectedGrade,setSelectedGrade]=useState("all");
  const[toast,setToast]=useState("");
  const[savingId,setSavingId]=useState(null);
  const[sync,setSync]=useState(null);
  const info={name:user.name,phone:user.metadata?.phone||"—",photo_url:user.metadata?.photo_url||""};
  useEffect(()=>{
    let alive=true;
    async function load(){
      const dS=await sb.get("students","?order=created_at.asc",user?.accessToken||null);
      if(!alive)return;
      if(dS&&dS.length>0){
        setStudents(dS.map(s=>({
          id:s.id,name:s.name,email:s.email,grade:s.grade,phone:s.phone||"",
          tuition_total:Number(s.tuition_total||0),
          tuition_paid:Number(s.tuition_paid||0),
        })));
        setSync("ok");
      }else if(dS===null){
        setSync("fail");
      }
    }
    load();
    return()=>{alive=false;};
  },[user?.accessToken]);
  const gradeRank=g=>{
    const m=String(g||"").match(/\d+/);
    return m?Number(m[0]):Number.MAX_SAFE_INTEGER;
  };
  const gradeOptions=Array.from(new Set(students.map(s=>s.grade).filter(Boolean))).sort((a,b)=>{
    const ra=gradeRank(a),rb=gradeRank(b);
    if(ra!==rb)return ra-rb;
    return String(a).localeCompare(String(b), lang==="ar"?"ar":"en");
  });
  const shownStudents=students
    .filter(s=>selectedGrade==="all"||s.grade===selectedGrade)
    .slice()
    .sort((a,b)=>{
      const ra=gradeRank(a.grade),rb=gradeRank(b.grade);
      if(ra!==rb)return ra-rb;
      const gcmp=String(a.grade||"").localeCompare(String(b.grade||""), lang==="ar"?"ar":"en");
      if(gcmp!==0)return gcmp;
      return String(a.name||"").localeCompare(String(b.name||""), lang==="ar"?"ar":"en");
    });
  const totals=students.reduce((a,s)=>{
    const tt=Number(s.tuition_total||0),tp=Number(s.tuition_paid||0),ow=Math.max(0,tt-tp);
    a.total+=tt;a.paid+=tp;a.owed+=ow;return a;
  },{total:0,paid:0,owed:0});
  const setMoney=(id,key,value)=>{
    const clean=Math.max(0,Number(value||0));
    setStudents(prev=>prev.map(s=>s.id===id?{...s,[key]:clean}:s));
  };
  const saveMoney=async s=>{
    setSavingId(s.id);
    const r=await sb.upsertWithStatus("students",[{
      id:s.id,
      name:s.name,
      email:s.email,
      grade:s.grade,
      phone:s.phone||null,
      tuition_total:Number(s.tuition_total||0),
      tuition_paid:Number(s.tuition_paid||0),
    }],user?.accessToken||null);
    setSavingId(null);
    if(!r.ok){
      setSync("fail");
      setToast(`!Save failed: ${String(r.error||`status ${r.status}`).slice(0,120)}`);
      return;
    }
    setSync("ok");
    setToast(t.changesSaved);
  };

  return <PageShell T={T} t={t} themeMode={themeMode} onThemeChange={onThemeChange} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.accountant} icon="stats" sync={sync}
    rightEl={<BtnO T={T} style={{padding:"7px 14px",fontSize:12}} onClick={onSignOut}><Ic n="signout" size={14} color={T.textSub}/>{t.signOut}</BtnO>}>
    {toast&&<Toast msg={toast} onDone={()=>setToast("")} T={T}/>}
    <InfoCard T={T} name={info.name} icon="stats" photoUrl={info.photo_url} details={[{icon:"phone",label:t.phone,value:info.phone},{icon:"book",label:t.emailLbl,value:user.email||"—"},{icon:"user",label:t.roleLabel,value:t.accountant}]}/>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,minmax(140px,1fr))",gap:10,marginBottom:16}}>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionTotal}</div><div style={{fontSize:24,fontWeight:800}}>{totals.total}</div></Card>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionPaid}</div><div style={{fontSize:24,fontWeight:800,color:T.success}}>{totals.paid}</div></Card>
      <Card T={T} style={{padding:14}}><div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{t.tuitionOwed}</div><div style={{fontSize:24,fontWeight:800,color:T.warn}}>{totals.owed}</div></Card>
    </div>
    <Card T={T} style={{padding:12,marginBottom:12}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"220px",gap:10,alignItems:"end"}}>
        <div>
          <Lbl T={T}>{t.grade}</Lbl>
          <Sel T={T} value={selectedGrade} onChange={e=>setSelectedGrade(e.target.value)}>
            <option value="all">{t.allGrades}</option>
            {gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}
          </Sel>
        </div>
      </div>
    </Card>
    <Card T={T}>
      {isMobile?<div style={{display:"grid",gap:8}}>
        {shownStudents.map(s=><div key={s.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{s.name} <span style={{fontWeight:600,color:T.textSub}}>({s.grade||"—"})</span></div>
          <div style={{fontSize:12,color:T.textSub,marginBottom:8}}>{s.grade}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div><Lbl T={T}>{t.tuitionTotal}</Lbl><Inp T={T} type="number" min="0" value={Number(s.tuition_total||0)} onChange={e=>setMoney(s.id,"tuition_total",e.target.value)}/></div>
            <div><Lbl T={T}>{t.tuitionPaid}</Lbl><Inp T={T} type="number" min="0" value={Number(s.tuition_paid||0)} onChange={e=>setMoney(s.id,"tuition_paid",e.target.value)}/></div>
          </div>
          <div style={{fontSize:12,color:T.warn,marginBottom:8}}>{t.tuitionOwed}: {Math.max(0,Number(s.tuition_total||0)-Number(s.tuition_paid||0))}</div>
          <BtnP T={T} onClick={()=>saveMoney(s)} style={{width:"100%",padding:"8px 12px",fontSize:12}}>{savingId===s.id?t.save:<><Ic n="save" size={12} color={T.accentInv}/>{t.save}</>}</BtnP>
        </div>)}
      </div>:<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH T={T}>{t.name}</TH><TH T={T}>{t.grade}</TH><TH T={T}>{t.tuitionTotal}</TH><TH T={T}>{t.tuitionPaid}</TH><TH T={T}>{t.tuitionOwed}</TH><TH T={T}/></tr></thead>
          <tbody>{shownStudents.map(s=><tr key={s.id}><TD T={T} bold>{s.name} <span style={{fontWeight:600,color:T.textSub}}>({s.grade||"—"})</span></TD><TD T={T}>{s.grade}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><Inp T={T} type="number" min="0" value={Number(s.tuition_total||0)} onChange={e=>setMoney(s.id,"tuition_total",e.target.value)} style={{maxWidth:120}}/></td><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><Inp T={T} type="number" min="0" value={Number(s.tuition_paid||0)} onChange={e=>setMoney(s.id,"tuition_paid",e.target.value)} style={{maxWidth:120}}/></td><TD T={T} color={T.warn}>{Math.max(0,Number(s.tuition_total||0)-Number(s.tuition_paid||0))}</TD><td style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><BtnP T={T} onClick={()=>saveMoney(s)} style={{padding:"6px 12px",fontSize:12,minWidth:78}}>{savingId===s.id?t.save:<><Ic n="save" size={12} color={T.accentInv}/>{t.save}</>}</BtnP></td></tr>)}</tbody>
        </table>
      </div>}
    </Card>
  </PageShell>;
}

// ── Bus Driver Dashboard ──────────────────────────────────────────────────────
function BusDriverDashboard({user,onBack,themeMode,onThemeChange,lang,onToggleLang,onSignOut}){
  const T=getTheme(themeMode),t=TR[lang];
  const[tracking,setTracking]=useState(false);
  const info={name:user.name,bus:user.metadata?.busNumber||"حافلة 45",route:user.metadata?.route||"مسار أ",phone:user.metadata?.phone||"—",photo_url:user.metadata?.photo_url||""};

  return <PageShell T={T} t={t} themeMode={themeMode} onThemeChange={onThemeChange} lang={lang} onToggleLang={onToggleLang} onBack={onBack} title={t.busDriver} icon="bus"
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
  const readLS=(k,fallback)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fallback;}catch{return fallback;}};
  const[themeMode,setThemeMode]=useState("dark");
  const[lang,setLang]=useState("ar");
  const[creds,setCreds]=useState(()=>readLS("sms_creds",DEFAULT_CREDS));
  const[periods,setPeriods]=useState(()=>readLS("sms_periods",DEFAULT_PERIODS));
  const[grades,setGrades]=useState(()=>initGrades());
  const[subjects,setSubjects]=useState(()=>readLS("sms_subjects",[
    {id:"math",  label_ar:"رياضيات", label_en:"Math"},
    {id:"science",label_ar:"علوم",   label_en:"Science"},
    {id:"english",label_ar:"إنجليزي",label_en:"English"},
    {id:"history",label_ar:"تاريخ",  label_en:"History"},
    {id:"art",   label_ar:"فنون",   label_en:"Art"},
  ]));
  useEffect(()=>{try{localStorage.setItem("sms_creds",JSON.stringify(creds));}catch{}},[creds]);
  useEffect(()=>{try{localStorage.setItem("sms_subjects",JSON.stringify(subjects));}catch{}},[subjects]);
  useEffect(()=>{try{localStorage.setItem("sms_periods",JSON.stringify(periods));}catch{}},[periods]);
  useEffect(()=>{
    let alive=true;
    async function loadBootData(){
      const[dSub,dUsers,dPeriods,dGrades]=await Promise.all([
        sb.get("subjects","?order=created_at.asc"),
        sb.get("app_users","?select=email,name,role,phone,grade,grades,subject,subjects,bus_number,route,photo_url&order=created_at.asc"),
        sb.get("grade_periods","?order=created_at.asc"),
        sb.get("grades","?select=student_id,period_id,scores"),
      ]);
      if(alive&&dSub&&dSub.length>0){
        setSubjects(dSub.map(s=>({id:s.id,label_ar:s.label_ar,label_en:s.label_en})));
      }
      if(alive&&dUsers&&dUsers.length>0){
        const mapped=Object.fromEntries(dUsers.map(u=>[normalizeEmail(u.email),{
          name:u.name||u.email,
          role:u.role||"teacher",
          metadata:{
            phone:u.phone||"",
            grade:u.grade||null,
            grades:normalizeList(u.grades||u.grade),
            subject:u.subject||null,
            subjects:normalizeList(u.subjects||u.subject),
            busNumber:u.bus_number||null,
            route:u.route||null,
            photo_url:u.photo_url||"",
          }
        }]));
        setCreds(prev=>({...prev,...mapped}));
      }
      if(alive&&dPeriods&&dPeriods.length>0){
        setPeriods(dPeriods.map(p=>({id:p.id,label:p.label})));
      }
      if(alive&&dGrades&&dGrades.length>0){
        const mapped={};
        dGrades.forEach(g=>{
          if(!mapped[g.student_id])mapped[g.student_id]={};
          mapped[g.student_id][g.period_id]=g.scores||{};
        });
        setGrades(prev=>({...prev,...mapped}));
      }
    }
    loadBootData();
    return()=>{alive=false;};
  },[]);
  const getSaved=()=>{
    try{
      const s=localStorage.getItem("sms_user")||sessionStorage.getItem("sms_user");
      return s?JSON.parse(s):null;
    }catch{return null;}
  };
  const[user,setUser]=useState(()=>getSaved());
  const[page,setPage]=useState(()=>{const s=getSaved();if(!s)return"login";if(s.role==="teacher")return"teacher";if(s.role==="student")return"student";if(s.role==="accountant")return"accountant";if(s.role==="bus_driver")return"bus-driver";return"home";});
  const popSyncRef=useRef(false);
  const resolveBackPage=(current,role)=>{
    if(current==="admin")return "home";
    if(current==="home")return "login";
    if(current==="teacher"||current==="student"||current==="accountant"||current==="bus-driver"){
      return role==="admin"?"home":"login";
    }
    return "login";
  };

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const onPop=(e)=>{
      popSyncRef.current=true;
      const target=e?.state?.appPage;
      if(typeof target==="string"){
        setPage(target);
        return;
      }
      setPage(prev=>resolveBackPage(prev,user?.role||null));
    };
    window.addEventListener("popstate",onPop);
    return ()=>window.removeEventListener("popstate",onPop);
  },[user?.role]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const state={appPage:page};
    if(!window.history.state?.appPage){
      window.history.replaceState(state,"");
      return;
    }
    if(popSyncRef.current){
      popSyncRef.current=false;
      return;
    }
    if(window.history.state?.appPage!==page){
      window.history.pushState(state,"");
    }
  },[page]);

  const login=(u)=>{setUser(u);try{localStorage.setItem("sms_user",JSON.stringify(u));sessionStorage.setItem("sms_user",JSON.stringify(u));}catch{}if(u.role==="admin")setPage("home");else if(u.role==="teacher")setPage("teacher");else if(u.role==="student")setPage("student");else if(u.role==="accountant")setPage("accountant");else if(u.role==="bus_driver")setPage("bus-driver");else setPage("home");};
  const logout=()=>{try{localStorage.removeItem("sms_user");sessionStorage.removeItem("sms_user");}catch{}setUser(null);setPage("login");};
  const sh={themeMode,onThemeChange:setThemeMode,lang,onToggleLang:()=>setLang(l=>l==="ar"?"en":"ar")};
  if(!user||page==="login")return <Login {...sh} onLogin={login} creds={creds}/>;
  const dp={...sh,user,onBack:user?.role==="admin"?()=>setPage("home"):null,onSignOut:logout};
  if(page==="home")      return <Home {...sh} user={user} onNavigate={setPage} onSignOut={logout}/>;
  if(page==="admin")     return <AdminDashboard {...sh} user={user} onBack={()=>setPage("home")} creds={creds} onCredsChange={setCreds} gradePeriods={periods} onPeriodsChange={setPeriods} studentGrades={grades} onStudentGradesChange={setGrades} subjects={subjects} onSubjectsChange={setSubjects}/>;
  if(page==="teacher")   return <TeacherDashboard {...dp} gradePeriods={periods} studentGrades={grades} onStudentGradesChange={setGrades} subjects={subjects}/>;
  if(page==="student")   return <StudentDashboard {...dp} gradePeriods={periods} studentGrades={grades} subjects={subjects}/>;
  if(page==="accountant")return <AccountantDashboard {...dp}/>;
  if(page==="bus-driver")return <BusDriverDashboard {...dp}/>;
  return <Login {...sh} onLogin={login} creds={creds}/>;

  
}
