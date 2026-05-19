import { useState, useEffect, Fragment } from "react";
import { jsPDF } from "jspdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ══════════════════════════════════════════
   CONSTANTS & ENV CONFIG
══════════════════════════════════════════ */
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const CITIES = ["Mecheri","Elampillai","Jalakandapuram","Salem","Coimbatore","Bhavani","Sathyamangalam","Punjai Puliampatti","Bangalore"];
const TYPES = ["Box","Wooden Box","Bag","Green bag","Yellow Bag","Bale","Documents","Electronics","Furniture","Medical","Machinery"];
const STATUSES = ["Booked","Picked Up","In Transit","Out for Delivery","Delivered"];
const S_CLR  = {"Booked":"#60A5FA","Picked Up":"#FBBF24","In Transit":"#F97316","Out for Delivery":"#A78BFA","Delivered":"#34D399"};
const PAY_MODES = ["Paid", "To Pay", "Credit", "FOC"];

const genId = n => `MPS${String(n).padStart(6,"0")}`;
const genUserId = () => `USR-${Math.floor(Math.random()*10000)}`;

/* ══════════════════════════════════════════
   HELPERS & PDF GENERATOR
══════════════════════════════════════════ */
function calcPrice(from, to, ratePerUnit, count = 1, type = "General", paymentMode = "Paid"){
  if(paymentMode === "FOC") return 0; 
  if(!ratePerUnit || ratePerUnit<=0) return 0; 
  const rate = parseFloat(ratePerUnit);
  let typeCharge = 0;
  if(type==="Fragile") typeCharge = 80; if(type==="Electronics") typeCharge = 60;
  if(type==="Furniture") typeCharge = 150; if(type==="Medical") typeCharge = 40; if(type==="Machinery") typeCharge = 120;
  return Math.round((rate * (parseInt(count) || 1)) + typeCharge);
}

function parseIndDate(dStr) {
  if(!dStr) return new Date();
  const parts = dStr.split('/');
  if(parts.length === 3) return new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`);
  return new Date(dStr);
}

function generatePDF(p) {
  const doc = new jsPDF();
  
  doc.setLineWidth(0.5); doc.rect(10, 10, 190, 270); 
  doc.setFillColor(255, 107, 53); doc.rect(10, 10, 190, 20, "F"); 
  doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  doc.text("MPS PARCEL SERVICE", 15, 25);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text("TAMIL NADU'S TRUSTED LOGISTICS PARTNER", 115, 23);
  
  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(`LR NUMBER: ${p.id}`, 15, 40);
  doc.text(`DATE: ${p.date || new Date().toLocaleDateString()}`, 130, 40);
  doc.line(10, 45, 200, 45);

  doc.line(105, 45, 105, 95); 
  doc.setFontSize(11); doc.setTextColor(100, 100, 100);
  doc.text("CONSIGNOR (SENDER)", 15, 52); doc.text("CONSIGNEE (RECEIVER)", 110, 52);
  
  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(p.sName, 15, 60); doc.text(p.rName, 110, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Ph: ${p.sPhone}`, 15, 68); doc.text(`Ph: ${p.rPhone}`, 110, 68);
  doc.text(`GST: ${p.sGst || "URP"}`, 15, 76); doc.text(`GST: ${p.rGst || "URP"}`, 110, 76);
  doc.text(`From: ${p.from}`, 15, 84); doc.text(`To: ${p.to}`, 110, 84);
  doc.line(10, 95, 200, 95);

  doc.setFillColor(240, 240, 240); doc.rect(10, 95, 190, 10, "F");
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("NO. OF PKGS", 15, 102); doc.text("DESCRIPTION (TYPE)", 50, 102); 
  doc.text("ACTUAL WT.", 110, 102); doc.text("RATE / CHARGED", 150, 102);
  doc.line(10, 105, 200, 105);

  doc.setFontSize(12); doc.setFont("helvetica", "normal");
  doc.text(`${p.count || 1}`, 22, 115); doc.text(p.type, 50, 115); 
  doc.text(`${p.actualWeight || "-"} Kg`, 115, 115); doc.text(`Rs. ${p.rate || 0}`, 155, 115);
  doc.line(10, 140, 200, 140);

  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("PAYMENT MODE:", 15, 152);
  doc.setTextColor(p.payment === "Paid" ? 34 : (p.payment === "FOC" ? 96 : 239), p.payment === "Paid" ? 197 : 165, p.payment === "Paid" ? 94 : 250); 
  doc.text(p.payment.toUpperCase(), 55, 152);
  
  doc.setTextColor(0, 0, 0); doc.setFontSize(16);
  doc.text(`GRAND TOTAL:  Rs. ${p.price}`, 130, 152);
  doc.line(10, 160, 200, 160);

  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text("Terms & Conditions:", 15, 170);
  doc.text("1. The carrier is not responsible for leakage or breakage.", 15, 175);
  doc.text("2. All disputes are subject to Tamil Nadu jurisdiction only.", 15, 180);
  doc.text("3. Delivery against Consignee's signature and ID proof.", 15, 185);
  
  doc.line(10, 240, 200, 240);
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
  doc.text("Booking Clerk Signature", 25, 265); doc.text("Receiver's Signature", 140, 265);

  doc.save(`MPS_LR_${p.id}.pdf`);
}

function openWhatsApp(phone, isSender, p) {
  const name = isSender ? p.sName : p.rName;
  const paymentText = p.payment === "To Pay" ? `\n*Please Note:* Amount ₹${p.price} is TO PAY at delivery.` : (p.payment === "FOC" ? `\n*Payment:* FREE OF COST` : `\n*Payment:* ${p.payment.toUpperCase()} (₹${p.price})`);
  const text = `📦 *MPS Parcel Service*\n\nHello *${name}*,\nYour parcel has been booked successfully!\n\n*LR Number:* ${p.id}\n*Route:* ${p.from} ➔ ${p.to}\n*Package:* ${p.type} (${p.count || 1} Pcs)${paymentText}\n\nTrack your parcel status anytime online. Thank you! 🚚`;
  window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(text)}`, '_blank');
}

function toDb(p){
  const hist = [...(p.history||[])]; 
  if(hist.length > 0) {
      hist[0].payment = p.payment;
      hist[0].actualWeight = p.actualWeight;
  }
  return{
    id:p.id, sender_name:p.sName, sender_phone:p.sPhone, sender_addr:p.sGst||"", 
    receiver_name:p.rName, receiver_phone:p.rPhone, receiver_addr:p.rGst||"",
    from_city:p.from, to_city:p.to, weight:parseFloat(p.rate||0), parcel_count:parseInt(p.count)||1,
    parcel_type:p.type, notes:p.notes||"", status:p.status, price:p.price,
    date_booked:p.date, history:hist
  };
}

function fromDb(r){
  const firstHist = (r.history && r.history[0]) ? r.history[0] : {};
  return{
    id:r.id, sName:r.sender_name, sPhone:r.sender_phone, sGst:r.sender_addr,
    rName:r.receiver_name, rPhone:r.receiver_phone, rGst:r.receiver_addr,
    from:r.from_city, to:r.to_city, rate:r.weight, count:r.parcel_count||1,
    type:r.parcel_type, notes:r.notes, status:r.status, price:r.price,
    date:r.date_booked, history:r.history||[], 
    payment: firstHist.payment || "Paid", actualWeight: firstHist.actualWeight || ""
  };
}
function sLabel(s){return s;}

/* ══════════════════════════════════════════
   DB CLIENT & LOCAL STORAGE
══════════════════════════════════════════ */
const local={
  async get(k){try{const r=window.localStorage.getItem(k);return r?JSON.parse(r):null;}catch{return null;}},
  async set(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));}catch{}},
  async remove(k){try{window.localStorage.removeItem(k);}catch{}}
};

class DB{
  constructor(url,key){
    this.isLive = !!(url && key);
    if(this.isLive){
      this.base = url.replace(/\/+$/,"")+"/rest/v1";
      this.h = {"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":"application/json"};
    }
  }
  async getParcels(){
    if(this.isLive){
      const r=await fetch(`${this.base}/parcels?select=*&order=created_at.desc`,{headers:this.h});
      if(r.ok) return (await r.json()).map(fromDb);
    }
    return await local.get("mps_parcels")||[];
  }
  async insertParcel(p){
    if(this.isLive) await fetch(`${this.base}/parcels`,{method:"POST",headers:{...this.h,"Prefer":"return=representation"},body:JSON.stringify(toDb(p))});
    else await local.set("mps_parcels", [p, ...(await local.get("mps_parcels")||[])]);
  }
  async updateParcel(id, data){
    if(this.isLive) await fetch(`${this.base}/parcels?id=eq.${id}`,{method:"PATCH",headers:{...this.h,"Prefer":"return=representation"},body:JSON.stringify(data)});
  }
  async deleteParcel(id){
    if(this.isLive) await fetch(`${this.base}/parcels?id=eq.${id}`,{method:"DELETE",headers:this.h});
  }
  async getUsers(){
    if(this.isLive){
      const r=await fetch(`${this.base}/app_users?select=*`,{headers:this.h});
      if(r.ok) return await r.json();
    }
    return await local.get("mps_users") || [{id:'admin-1', username:'admin', password:'admin@123', role:'admin'}];
  }
  async insertUser(u){
    if(this.isLive) await fetch(`${this.base}/app_users`,{method:"POST",headers:this.h,body:JSON.stringify(u)});
    else await local.set("mps_users", [u, ...(await this.getUsers())]);
  }
  async updateUser(id, u){
    if(this.isLive) await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"PATCH",headers:{...this.h,"Prefer":"return=representation"},body:JSON.stringify(u)});
    else await local.set("mps_users", (await this.getUsers()).map(user => user.id === id ? {...user, ...u} : user));
  }
  async deleteUser(id){
    if(this.isLive) await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"DELETE",headers:this.h});
    else await local.set("mps_users", (await this.getUsers()).filter(u => u.id !== id));
  }
}

/* ══════════════════════════════════════════
   LANGUAGE STRINGS 
══════════════════════════════════════════ */
const T={
  en:{
    nav:{home:"Home",book:"Book Parcel",track:"Track LR",admin:"Admin",accounts:"Accounts"},
    badge:"Tamil Nadu's Trusted Logistics Network", 
    h:["DELIVERING", "TRUST", "NATIONWIDE."], 
    hsub:"Experience lightning-fast, secure, and hassle-free parcel deliveries across Tamil Nadu. Your business partner in motion.",
    hb1:"📦 Book a New Parcel",hb2:"🔍 Track Parcel",
    stats:["Parcels Booked","Cities Connected","Express Delivery","Safe Delivery"],
    bookT:"Book a Parcel",bookS:"Fill details to generate LR Number",
    sT:"📤 Sender Details",rT:"📥 Receiver Details",pT:"📦 Parcel Details",
    estC:"Total Amount",confirmBtn:"Confirm Booking",
    doneT:"Booking Success!",tidLabel:"LR Number:",
    trackT:"Track LR Status",trackS:"Enter your MPS LR Number", trackPh:"e.g. MPS000001",trackBtn:"Track 🔍",
    notFound:"❌ LR Number not found.", sLabel:"Sender",rLabel:"Receiver",pLabel:"Parcel",priceLabel:"Price",
    histT:"Delivery Logs", priceT:"Price Calculator",priceS:"Instant estimates",
    fFrom2:"From City",fTo2:"To City",fW2:"Rate Per Parcel (₹)",
    estPrice:"Estimated Price",approx:"*Approximate.",
    adminT:"Operations Dashboard",adminS:"Manage Parcels, Reports and Logistics", chartT:"Analytics",
    logout:"Logout ↩",loginT:"Staff / Admin Login",loginS:"MPS Portal",
    pwLabel:"Password",loginBtn:"Login →",pwHint:"Admin: admin@123 | Staff: staff@123",
    setupT:"Connect Supabase",setupS:"Enter credentials",
    sbUrl:"Project URL",sbKey:"Anon Key", connectBtn:"Connect",skipBtn:"Offline Mode",
    s0:"Booked",s1:"Picked Up",s2:"In Transit",s3:"Out for Delivery",s4:"Delivered",
    totalParcels:"Total Parcels",noData:"No parcels found",
    updT:"Update LR",newS:"New Status",curL:"Current Location ",curLph:"e.g. Chennai Hub",
    updBtn:"✅ Save Update",cancel:"Cancel",
    tblH:["LR Number","Sender","Receiver","Route Info","Status","Action"],
    updText:"Update",searchPh:"Search LR, name, phone...",allS:"All Status",
  },
  ta:{
    nav:{home:"முகப்பு",book:"பார்சல் பதிவு",track:"கண்காணி",admin:"நிர்வாகி",accounts:"கணக்குகள்"},
    badge:"தமிழ்நாட்டின் நம்பகமான நெட்வொர்க்", 
    h:["எங்கும்", "நம்பிக்கையான", "டெலிவரி."], 
    hsub:"தமிழ்நாடு முழுவதும் மிக வேகமான மற்றும் பாதுகாப்பான பார்சல் சேவை. உங்கள் தொழிலின் சிறந்த பார்ட்னர்.",
    hb1:"📦 புதிய பதிவு செய்",hb2:"🔍 பார்சல் கண்காணி",
    stats:["பார்சல்கள்","நகரங்கள்","விரைவு டெலிவரி","பாதுகாப்பு"],
    bookT:"பார்சல் பதிவு",bookS:"LR Number உருவாக்க விவரங்களை நிரப்புங்கள்",
    sT:"📤 அனுப்புபவர்",rT:"📥 பெறுபவர்",pT:"📦 பார்சல்",
    estC:"மொத்த கட்டணம்",confirmBtn:"உறுதிப்படுத்து",
    doneT:"Booking Success!",tidLabel:"LR Number:",
    trackT:"LR கண்காணிப்பு",trackS:"உங்கள் LR Number-ஐ உள்ளிடுங்கள்", trackPh:"எ.கா. MPS000001",trackBtn:"கண்காணி 🔍",
    notFound:"❌ LR Number கிடைக்கவில்லை.", sLabel:"அனுப்புபவர்",rLabel:"பெறுபவர்",pLabel:"பார்சல்",priceLabel:"கட்டணம்",
    histT:"Delivery Logs", priceT:"கட்டண கணக்கீடு",priceS:"உடனடி மதிப்பீடு",
    fFrom2:"எங்கிருந்து",fTo2:"எங்கு",fW2:"ஒரு பார்சல் விலை (₹)",
    estPrice:"தோராய கட்டணம்",approx:"*தோராயம்.",
    adminT:"நிர்வாக பேனல்",adminS:"பார்சல்கள் மற்றும் அறிக்கைகளை நிர்வகிக்கவும்", chartT:"பகுப்பாய்வு",
    logout:"வெளியேறு ↩",loginT:"உள்நுழைவு",loginS:"MPS Portal",
    pwLabel:"கடவுச்சொல்",loginBtn:"உள்நுழை →",pwHint:"Admin: admin@123 | Staff: staff@123",
    setupT:"Supabase இணை",setupS:"credentials உள்ளிடுங்கள்",
    sbUrl:"URL",sbKey:"Key", connectBtn:"இணை",skipBtn:"ஆஃப்லைன்",
    s0:"பதிவாயிற்று",s1:"எடுக்கப்பட்டது",s2:"வழியில்",s3:"டெலிவரிக்கு கிளம்பியது",s4:"வழங்கப்பட்டது",
    totalParcels:"மொத்த பார்சல்கள்",noData:"பார்சல்கள் இல்லை",
    updT:"LR புதுப்பி",newS:"புதிய நிலை",curL:"தற்போதைய இடம் *",curLph:"எ.கா. சென்னை ஹப்",
    updBtn:"✅ நிலை புதுப்பி",cancel:"ரத்து செய்",
    tblH:["LR Number","அனுப்புபவர்","பெறுபவர்","வழி","நிலை","செயல்"],
    updText:"புதுப்பி",searchPh:"LR, பெயர், தொலைபேசி தேட...",allS:"அனைத்து நிலைகளும்",
  }
};

/* ══════════════════════════════════════════
   CUSTOM UI COMPONENTS
══════════════════════════════════════════ */
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (<div className={`toast-box toast-${type} slide-down`}>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} {msg}</div>);
}

function SuggestInput({ label, value, onChange, onSelect, dataList, icon, isPhone }) {
  const [open, setOpen] = useState(false);
  const matches = dataList.filter(c => isPhone ? c.phone.includes(value) : (c.name||"").toLowerCase().includes(value.toLowerCase())).filter(()=>value.length>=2);
  return (
    <div className="fg" style={{ position: "relative", zIndex: open ? 10 : 1 }}>
      <label className="flabel">{label}</label>
      <input className="input" value={value} onChange={(e) => { onChange(e.target.value); if (isPhone && e.target.value.length === 10) { const exact = dataList.find(d=>d.phone===e.target.value); if(exact) onSelect(exact); } }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} placeholder={isPhone ? "9876543210" : "Enter here"} maxLength={isPhone ? "10" : "100"} />
      {open && matches.length > 0 && (
        <div className="dropdown">
          {matches.map((c, i) => (<div key={i} className="dropdown-item" onClick={() => onSelect(c)}>{icon} {isPhone ? c.phone : c.name} - <span className="muted small">{isPhone ? c.name : c.phone}</span></div>))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════ */
export default function App(){
  const [theme,setTheme]=useState("dark");
  const [lang,setLang]=useState("en");
  const [page,setPage]=useState("home");
  const [parcels,setParcels]=useState([]);
  const [users,setUsers]=useState([]);
  const [counter,setCounter]=useState(1);
  const [currentUser,setCurrentUser]=useState(null); 
  const [db,setDb]=useState(null);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null); 
  const [paymentShortcut, setPaymentShortcut] = useState(""); // Shortcut state
  const t=T[lang];

  const showMsg = (msg, type='success') => setToast({msg, type});

  // Keyboard Shortcuts Magic Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if(!currentUser) return; // Don't trigger if not logged in
      if (e.key === 'F7') { e.preventDefault(); handleShortcutNavigation('Paid'); }
      else if (e.key === 'F8') { e.preventDefault(); handleShortcutNavigation('To Pay'); }
      else if (e.key === 'F9') { e.preventDefault(); handleShortcutNavigation('Credit'); }
      else if (e.key === 'F10') { e.preventDefault(); handleShortcutNavigation('FOC'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleShortcutNavigation = (mode) => {
    setPage('book');
    setPaymentShortcut(mode);
    showMsg(`Shortcut triggered: ${mode} Selected!`, "info");
  };

  useEffect(()=>{
    async function init(){
      const savedTheme = await local.get("mps_theme"); if(savedTheme) setTheme(savedTheme);
      const database = new DB(ENV_URL, ENV_KEY); setDb(database);
      const ps = await database.getParcels(); setParcels(ps); setCounter(ps.length+1);
      const usrs = await database.getUsers(); setUsers(usrs);
      const session = await local.get("mps_session"); if(session) setCurrentUser(session);
      setLoading(false);
    }
    init();
  },[]);

  const toggleTheme = () => { const newTheme = theme === "dark" ? "light" : "dark"; setTheme(newTheme); local.set("mps_theme", newTheme); };

  async function handleLogin(username, password) {
    const user = users.find(u => u.username === username && u.password === password);
    if(user) { setCurrentUser(user); await local.set("mps_session", user); showMsg(`Welcome back, ${user.username}!`, "success"); } 
    else showMsg("❌ Invalid Username or Password", "error");
  }

  function handleLogout() { setCurrentUser(null); local.remove("mps_session"); setPage("home"); showMsg("Logged out successfully", "info"); }

  async function bookParcel(data){
    const price = calcPrice(data.from, data.to, parseFloat(data.rate), parseInt(data.count)||1, data.type, data.payment);
    const p={...data,id:genId(counter),date:new Date().toLocaleDateString("en-IN"),status:"Booked",price,history:[{status:"Booked",time:new Date().toLocaleString("en-IN"),loc:data.from, payment:data.payment, actualWeight: data.actualWeight}]};
    await db.insertParcel(p);
    setParcels([p, ...parcels]); setCounter(counter+1);
    if(!db.isLive) await local.set("mps_counter", counter+1);
    return p;
  }

  async function updateStatus(id,status,loc){
    const updatedHistory = [...parcels.find(p=>p.id===id).history, {status,time:new Date().toLocaleString("en-IN"),loc}];
    await db.updateParcel(id, {status, history: updatedHistory});
    setParcels(parcels.map(p=>p.id===id?{...p,status,history:updatedHistory}:p));
    showMsg(`Status updated to ${status}`, "success");
  }

  async function editParcelFull(updatedF){
    await db.updateParcel(updatedF.id, toDb(updatedF));
    setParcels(parcels.map(p => p.id === updatedF.id ? updatedF : p));
    showMsg(`LR Number ${updatedF.id} updated!`, "success");
  }

  async function editUserAcc(id, updatedData) {
    await db.updateUser(id, updatedData);
    setUsers(users.map(u => u.id === id ? {...u, ...updatedData} : u));
    showMsg(`Account details updated!`, "success");
  }

  if(loading) return (
    <div data-theme={theme} style={{minHeight:"100vh", backgroundColor:"var(--bg)", color:"var(--text)"}}>
      <style>{CSS}</style>
      <div className="full-center"><div className="logo-box-lg">MPS</div><div className="loader-dots"><span/><span/><span/></div></div>
    </div>
  );

  if(!currentUser) return (
    <div data-theme={theme} style={{minHeight:"100vh", backgroundColor:"var(--bg)", color:"var(--text)"}}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <LoginScreen onLogin={handleLogin} t={t} />
    </div>
  );

  return(
    <div data-theme={theme} style={{minHeight:"100vh", backgroundColor:"var(--bg)", color:"var(--text)", transition:"background 0.3s, color 0.3s"}}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      
      <div className="app">
        <Nav page={page} nav={setPage} theme={theme} toggleTheme={toggleTheme} lang={lang} setLang={setLang} db={db} user={currentUser} logout={handleLogout} t={t}/>
        
        {/* SHORTCUT BAR INTEGRATION */}
        <div style={{background: "var(--card2)", borderBottom: "1px solid var(--border)", padding: "10px", display: "flex", justifyContent: "center", gap: "20px", fontSize: "0.85rem", fontWeight: "bold", position: "sticky", top: "70px", zIndex: 100}}>
          <span style={{cursor:"pointer", color:"#34D399"}} onClick={()=>handleShortcutNavigation("Paid")}>F7 : PAID</span>
          <span style={{color:"var(--border)"}}>|</span>
          <span style={{cursor:"pointer", color:"#ef4444"}} onClick={()=>handleShortcutNavigation("To Pay")}>F8 : TO PAY</span>
          <span style={{color:"var(--border)"}}>|</span>
          <span style={{cursor:"pointer", color:"#FBBF24"}} onClick={()=>handleShortcutNavigation("Credit")}>F9 : CREDIT</span>
          <span style={{color:"var(--border)"}}>|</span>
          <span style={{cursor:"pointer", color:"#60A5FA"}} onClick={()=>handleShortcutNavigation("FOC")}>F10 : FOC</span>
        </div>

        <main key={page} className="page-anim">
          {page==="home"  && <Home nav={setPage} count={parcels.length} t={t} />}
          {page==="book"  && <Book bookParcel={bookParcel} nav={setPage} showMsg={showMsg} paymentShortcut={paymentShortcut} t={t}/>}
          {page==="track" && <Track parcels={parcels} t={t} />}
          {page==="admin" && <Admin parcels={parcels} users={users} updateStatus={updateStatus} editParcelFull={editParcelFull} deleteParcel={(id)=>db.deleteParcel(id).then(()=>setParcels(parcels.filter(p=>p.id!==id)))} createStaff={async(u,p)=>{const n={id:genUserId(),username:u,password:p,role:'staff'}; await db.insertUser(n); setUsers([n,...users]); showMsg("Created!","success");}} removeStaff={async(id)=>{await db.deleteUser(id); setUsers(users.filter(u=>u.id!==id)); showMsg("Removed!","error");}} editUserAcc={editUserAcc} user={currentUser} showMsg={showMsg} t={t}/>}
          {page==="accounts" && <Accounts t={t} />}
        </main>
        <Footer nav={setPage} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   LOGIN SCREEN
══════════════════════════════════════════ */
function LoginScreen({ onLogin, t }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const submit = (e) => { e.preventDefault(); if(username && password) onLogin(username, password); };
  return (
    <div className="page full-center" style={{padding:"2rem"}}>
      <div className="login-card glass-panel pop-in" style={{padding:"3rem", maxWidth:"450px", width:"100%", textAlign:"center"}}>
        <div className="logo-box-lg" style={{display:"inline-block", marginBottom:"1rem"}}>MPS</div>
        <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.2rem", letterSpacing:"1px", color:"var(--text)"}}>EMPLOYEE PORTAL</h2>
        <p className="muted" style={{marginBottom:"2rem"}}>Authorized Personnel Only</p>
        <form onSubmit={submit} style={{textAlign:"left"}}>
          <FF l="UserID (Username)" v={username} o={setUsername} p="Enter username" />
          <FF l="Password" v={password} o={setPassword} type="password" p="••••••••" />
          <button type="submit" className="btn-primary btn-lg btn-glow" style={{width:"100%", marginTop:"1.5rem"}}>Secure Login ➔</button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   NAV, HOME
══════════════════════════════════════════ */
function Nav({page,nav,theme,toggleTheme,lang,setLang,db,user,logout,t}){
  const [open,setOpen]=useState(false);
  const links=[["home",t.nav.home],["book",t.nav.book],["track",t.nav.track],["admin",t.nav.admin],["accounts",t.nav.accounts]];
  return(
    <nav className="nav glass">
      <div className="nav-inner">
        <div className="logo" onClick={()=>{nav("home");setOpen(false);}}>
          <span className="logo-box">MPS</span><div><div className="logo-name">M P S</div><div className="logo-sub">Parcel Service</div></div>
        </div>
        <div className={`nav-links ${open?"open":""}`}>
          {links.map(([id,name])=>(<button type="button" key={id} className={`nav-link ${page===id?"active":""}`} onClick={()=>{nav(id);setOpen(false);}}>{name}</button>))}
        </div>
        <div className="nav-right">
          <button type="button" className="icon-btn" onClick={toggleTheme}>{theme==="dark"?"☀️":"🌙"}</button>
          <button type="button" className="lang-btn" onClick={()=>setLang(l=>l==="en"?"ta":"en")}>{lang==="en"?"தமிழ்":"EN"}</button>
          <span className="sb-badge" style={{background: db.isLive?"#34D39922":"#FBBF2422", color: db.isLive?"#34D399":"#FBBF24"}}>{db.isLive?"⚡ Live":"⚠️ Offline"}</span>
          <button type="button" className="btn-ghost small" style={{marginLeft:"10px", borderColor:"var(--border)"}} onClick={logout}>👤 {user.username} ↩</button>
          <button type="button" className="hamburger" onClick={()=>setOpen(!open)}>☰</button>
        </div>
      </div>
    </nav>
  );
}

function Home({nav,count,t}){
  const [trackId, setTrackId] = useState("");
  return(
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge slide-in">{t.badge}</div>
          <h1 className="hero-title" style={{color:"var(--text)"}}>{t.h[0]} <span className="accent">{t.h[1]}</span><br/>{t.h[2]}</h1>
          <p className="hero-sub">{t.hsub}</p>
          
          <div className="quick-track glass-panel">
            <input className="input" value={trackId} onChange={e=>setTrackId(e.target.value)} placeholder="Enter LR Number to Track..." style={{flex:1, border:"none", background:"transparent", fontSize:"1.1rem"}}/>
            <button className="btn-primary" onClick={()=>{if(trackId) nav("track");}}>Track Now ➔</button>
          </div>
          
          <div className="hero-btns" style={{marginTop:"2rem", justifyContent:"center"}}>
            <button type="button" className="btn-primary btn-lg btn-glow" onClick={()=>nav("book")}>{t.hb1}</button>
          </div>
        </div>
      </section>
      <div className="stats-strip">
        {[count||"0+","16","24h","99%"].map((n,i)=>(<div key={i} className="stat-item glass-panel"><div className="stat-n">{n}</div><div className="stat-l">{t.stats[i]}</div></div>))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   BOOK
══════════════════════════════════════════ */
function Book({bookParcel,nav,showMsg,paymentShortcut,t}){
  const I={sName:"",sPhone:"",sGst:"",rName:"",rPhone:"",rGst:"",from:"",to:"",rate:"",actualWeight:"",count:"",type:"Box",payment:"Paid",notes:""};
  const [f,setF]=useState(I); const [done,setDone]=useState(null); const [loading,setLoading]=useState(false);
  const [contacts, setContacts] = useState([]); const [ewayNo, setEwayNo] = useState("");

  useEffect(() => {
    async function loadContacts() { 
      const saved = await local.get("mps_contacts") || {}; 
      setContacts(Object.entries(saved).map(([phone, data]) => ({ phone, ...data })));
    }
    loadContacts();
  }, []);

  // Shortcut Auto-Select Logic
  useEffect(() => {
    if(paymentShortcut) {
      setF(prev => ({...prev, payment: paymentShortcut}));
    }
  }, [paymentShortcut]);

  const s=(k,v)=>setF(prev=>({...prev,[k]:v}));
  const ep = calcPrice(f.from,f.to,parseFloat(f.rate)||0,parseInt(f.count)||1,f.type, f.payment);

  const fetchEwayDetails = (e) => {
    e.preventDefault(); 
    if(!ewayNo || ewayNo.length < 8) return showMsg("Valid E-Way Bill Thevai!", "error");
    showMsg("Fetching E-Way Bill Data...", "info");
    setTimeout(() => {
      setF(prev => ({ ...prev, sName: "ABC Traders", sPhone: "9876543210", sGst: "33AABCU1234F1Z1", from: "Chennai", rName: "XYZ Enterprises", rPhone: "9988776655", rGst: "33AAAAA0000A1Z5", to: "Coimbatore", rate: "150", actualWeight:"15", count: "2", type: "Box", payment: "To Pay", notes: `E-Way: ${ewayNo}` }));
      showMsg("Data Auto-Filled!", "success");
    }, 800); 
  };

  const handleContactSelect = (isSender, data) => {
    const pfx = isSender ? 's' : 'r';
    setF(prev => ({ ...prev, [`${pfx}Phone`]: data.phone, [`${pfx}Name`]: data.name || prev[`${pfx}Name`], [`${pfx}Gst`]: data.gst || prev[`${pfx}Gst`] }));
    showMsg("Contact Filled!", "success");
  };

  async function submit(e){
    e.preventDefault(); 
    if(!f.sName||!f.sPhone||!f.rName||!f.rPhone||!f.from||!f.to||(!f.rate && f.payment!=="FOC") || !f.count) return showMsg("⚠️ Fill all (*) fields!", "error");
    if(f.payment !== "FOC" && parseFloat(f.rate)<=0) return showMsg("⚠️ Rate must be > 0!", "error");
    if(parseInt(f.count) <= 0) return showMsg("⚠️ Qty must be at least 1!", "error");
    
    setLoading(true);
    try {
      const bookedParcel = await bookParcel({...f}); 
      const saved = await local.get("mps_contacts") || {}; 
      saved[f.sPhone] = { name: f.sName, gst: f.sGst };
      saved[f.rPhone] = { name: f.rName, gst: f.rGst };
      await local.set("mps_contacts", saved); setContacts(Object.entries(saved).map(([phone, data]) => ({ phone, ...data })));

      setDone(bookedParcel); 
      setTimeout(()=> showMsg("📱 LR Generated & SMS Triggered", "info"), 500);
    } catch (error) { showMsg("⚠️ Database error!", "error"); } finally { setLoading(false); }
  }

  return(
    <div className="page">
      <div className="page-header"><h1>{t.bookT}</h1><p className="muted">{t.bookS}</p></div>
      
      <div className="eway-banner glass-panel" style={{marginBottom: "2rem", padding: "1.5rem", borderRadius: "var(--r)", border: "1px dashed var(--accent)", textAlign: "center"}}>
        <h3 className="accent" style={{marginBottom: "10px"}}>⚡ E-Way Bill Fast Fill</h3>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <input className="input" style={{ maxWidth: "250px", textAlign: "center", fontWeight: "bold" }} placeholder="12-digit number" value={ewayNo} onChange={(e) => setEwayNo(e.target.value)} />
          <button type="button" className="btn-primary" onClick={fetchEwayDetails}>🔍 Fetch</button>
        </div>
      </div>

      <div className="form-grid3">
        <div className="form-card glass-panel">
          <div className="form-card-hd">{t.sT}</div>
          <FRow>
            <SuggestInput label="Phone *" value={f.sPhone} onChange={v=>s("sPhone",v)} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={true} icon="📱"/>
            <SuggestInput label="Full Name *" value={f.sName} onChange={v=>s("sName",v)} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={false} icon="👤"/>
          </FRow>
          <FF l="GST Number (Optional)" v={f.sGst} o={v=>s("sGst",v)} placeholder="e.g. 33AAAA..."/>
          <FS l="From City *" v={f.from} o={v=>s("from",v)} opts={CITIES}/>
        </div>
        
        <div className="form-card glass-panel">
          <div className="form-card-hd">{t.rT}</div>
          <FRow>
            <SuggestInput label="Phone *" value={f.rPhone} onChange={v=>s("rPhone",v)} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={true} icon="📱"/>
            <SuggestInput label="Full Name *" value={f.rName} onChange={v=>s("rName",v)} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={false} icon="👤"/>
          </FRow>
          <FF l="GST Number (Optional)" v={f.rGst} o={v=>s("rGst",v)} placeholder="e.g. 33AABC..."/>
          <FS l="To City *" v={f.to} o={v=>s("to",v)} opts={CITIES}/>
        </div>

        <div className="form-card glass-panel">
          <div className="form-card-hd">{t.pT}</div>
          <FRow>
            <FF l={f.payment==="FOC"?"Rate (₹)":"Rate (₹) *"} v={f.rate} o={v=>s("rate",v)} type="number" p={f.payment==="FOC"?"0":""}/>
            <FS l="Payment Mode * (F7-F10)" v={f.payment} o={v=>s("payment",v)} opts={PAY_MODES}/>
          </FRow>
          <FRow>
            <FF l="Qty/Count *" v={f.count} o={v=>s("count",v)} type="number" placeholder="e.g. 2"/>
            <FF l="Weight (Kg)" v={f.actualWeight} o={v=>s("actualWeight",v)} type="number" placeholder="Physical Wt"/>
          </FRow>
          <FRow>
             <FS l="Parcel Type" v={f.type} o={v=>s("type",v)} opts={TYPES}/>
             <FF l="Notes" v={f.notes} o={v=>s("notes",v)} placeholder="Fragile..."/>
          </FRow>
          <div style={{marginTop: "1.5rem", padding: "1rem", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div style={{fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "bold"}}>{t.estC}</div>
            <div style={{fontSize: "1.5rem", color: "var(--accent)", fontWeight: "bold", fontFamily: "'Bebas Neue',sans-serif"}}>₹{ep} <span style={{fontSize:"1rem", color:"var(--text)"}}>({f.payment})</span></div>
          </div>
        </div>

        <div style={{gridColumn: "1 / -1", textAlign:"center", marginTop:"1rem"}}>
            <button type="button" className="btn-primary btn-lg btn-glow" onClick={submit} disabled={loading}>{loading?"⏳ Booking...":t.confirmBtn}</button>
        </div>
      </div>
      
      {done && (
        <div className="modal-bg">
          <div className="modal pop-in glass-panel" style={{textAlign: "center", maxWidth: "420px", padding: "2.5rem 2rem"}}>
            <div style={{fontSize: "4rem", marginBottom: "0.5rem"}}>✅</div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:"2.4rem", color:"var(--accent)"}}>{t.doneT}</h2>
            <div className="tid-big">{done.id}</div>
            <div className="btn-col">
              <button type="button" className="btn-primary btn-lg btn-glow" onClick={(e) => { e.preventDefault(); setDone(null); setF(I); setEwayNo(""); nav("home"); }}>✅ DONE</button>
              <div style={{display:"flex", gap:"10px", marginTop: "10px"}}>
                <button type="button" className="btn-whatsapp" onClick={(e) => { e.preventDefault(); openWhatsApp(done.sPhone, true, done); }}>📱 WA Sender</button>
                <button type="button" className="btn-whatsapp" onClick={(e) => { e.preventDefault(); openWhatsApp(done.rPhone, false, done); }}>📱 WA Receiver</button>
              </div>
              <button type="button" className="btn-ghost" onClick={(e) => { e.preventDefault(); generatePDF(done); }}>📄 Print LR Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   TRACK
══════════════════════════════════════════ */
function Track({parcels, t}){
  const [id,setId]=useState(""); const [result,setResult]=useState(null); const [err,setErr]=useState("");
  function search(e){ if(e) e.preventDefault(); const f=parcels.find(p=>p.id===id.trim().toUpperCase()); if(f){setResult(f);setErr("");}else{setResult(null);setErr(t.notFound);} }
  const si=result?STATUSES.indexOf(result.status):-1;
  return(
    <div className="page">
      <div className="page-header"><h1>{t.trackT}</h1><p className="muted">{t.trackS}</p></div>
      <div className="track-search glass-panel" style={{padding:"1.5rem", borderRadius:"var(--r)"}}>
        <input className="input track-in" value={id} onChange={e=>setId(e.target.value)} placeholder={t.trackPh} onKeyDown={e=>e.key==="Enter"&&search(e)}/>
        <button type="button" className="btn-primary" onClick={search}>{t.trackBtn}</button>
      </div>
      {err&&<div style={{background:"#ef444422", color:"#ef4444", padding:"1rem", borderRadius:"var(--r2)", textAlign:"center"}}>{err}</div>}
      {result&&(
        <div className="track-card glass-panel slide-up" style={{marginTop:"2rem"}}>
          <div className="track-top">
            <div><div className="track-id">{result.id}</div><div className="muted">{result.from} → {result.to} &nbsp;|&nbsp; {result.date}</div></div>
            <div className="sbadge" style={{background:S_CLR[result.status]+"22",color:S_CLR[result.status]}}>{sLabel(result.status,t)}</div>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", padding:"2rem 1.5rem", position:"relative", margin:"1rem 0"}}>
            <div style={{position:"absolute", top:"50%", left:"2rem", right:"2rem", height:"4px", background:"var(--border)", zIndex:1, transform:"translateY(-50%)"}}></div>
            {STATUSES.map((s,i)=>(
              <div key={s} style={{position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", gap:"10px"}}>
                <div style={{width:"20px", height:"20px", borderRadius:"50%", background:i<=si?(i===si?S_CLR[s]:"#FF6B35"):"var(--card)", border:i<=si?"none":"3px solid var(--border)", boxShadow:i===si?`0 0 14px ${S_CLR[s]}99`:"none", transform:i===si?"scale(1.3)":"scale(1)", transition:"all 0.3s"}}/>
                <div style={{color:i<=si?"var(--text)":"var(--muted)", fontWeight:i===si?700:400, fontSize:"0.8rem", textAlign:"center"}}>{sLabel(s,t)}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"1.5rem", padding:"1.5rem", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", background:"var(--bg)"}}>
            {[["Sender",result.sName,result.sPhone],["Receiver",result.rName,result.rPhone],["Parcel Info",`${result.type} × ${result.count}`,result.actualWeight?`${result.actualWeight} Kg`:""],["Total Amount",`₹${result.price}`, result.payment]].map(([l,m,s])=>(<div key={l}>
              <div style={{fontSize:"0.75rem", color:"var(--muted)", textTransform:"uppercase", fontWeight:"bold", marginBottom:"5px"}}>{l}</div>
              <div style={{fontWeight:"bold"}}>{m}</div>
              <div style={{fontSize:"0.85rem", color: s==="To Pay" ? "#ef4444" : "var(--muted)", fontWeight: s==="To Pay"?700:400}}>{s}</div>
            </div>))}
          </div>
          <div style={{padding:"1.5rem"}}>
            <div style={{fontSize:"1.1rem", fontWeight:"bold", marginBottom:"1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center"}}>{t.histT} <button type="button" className="btn-ghost small" onClick={(e)=>{ e.preventDefault(); generatePDF(result); }}>Download LR</button></div>
            {[...result.history].reverse().map((h,i)=>(<div key={i} style={{display:"flex", gap:"15px", marginBottom:"15px"}}>
              <div style={{width:"12px", height:"12px", borderRadius:"50%", background:S_CLR[h.status]||"#aaa", marginTop:"6px"}}/>
              <div><div style={{fontWeight:"bold", color:"var(--text)"}}>{sLabel(h.status,t)}</div><div className="muted small">{h.loc} • {h.time}</div></div>
            </div>))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   ACCOUNTS (5 PARTNER SPLIT)
══════════════════════════════════════════ */
function Accounts({t}) {
  const [accounts, setAccounts] = useState({ revenue: 50000, emi: 8000, diesel: 12000, other: 5000 });
  const totalExpenses = accounts.emi + accounts.diesel + accounts.other;
  const netProfit = accounts.revenue - totalExpenses;
  const profitPerPerson = netProfit / 5;

  return (
    <div className="page slide-up">
      <div className="page-header">
        <h1>{t.nav.accounts || "Accounts & Settlement"}</h1>
        <p className="muted">Monthly Profit Split for 5 Partners</p>
      </div>
      <div className="form-grid3">
        <div className="form-card glass-panel">
          <div className="form-card-hd">Monthly Expenses Entry</div>
          <FF l="Total Revenue (₹)" v={accounts.revenue} o={v=>setAccounts({...accounts, revenue: Number(v)})} type="number" />
          <FF l="Vehicle EMI (₹)" v={accounts.emi} o={v=>setAccounts({...accounts, emi: Number(v)})} type="number" />
          <FF l="Diesel & Toll (₹)" v={accounts.diesel} o={v=>setAccounts({...accounts, diesel: Number(v)})} type="number" />
          <FF l="Other Expenses (₹)" v={accounts.other} o={v=>setAccounts({...accounts, other: Number(v)})} type="number" />
        </div>
        <div className="form-card glass-panel" style={{gridColumn: "span 2", background: "var(--card2)"}}>
          <div className="form-card-hd">Profit Settlement Breakdown</div>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:"15px", fontSize:"1.2rem", paddingBottom:"10px", borderBottom:"1px solid var(--border)"}}>
            <span style={{color:"var(--muted)"}}>Total Income</span>
            <span className="accent" style={{fontWeight:"bold"}}>₹{accounts.revenue.toLocaleString()}</span>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginBottom:"15px", fontSize:"1.2rem", paddingBottom:"10px", borderBottom:"1px solid var(--border)"}}>
            <span style={{color:"var(--muted)"}}>Total Expenses</span>
            <span style={{color:"#ef4444", fontWeight:"bold"}}>- ₹{totalExpenses.toLocaleString()}</span>
          </div>
          <div style={{display:"flex", justifyContent:"space-between", margin:"20px 0", padding:"20px", background:"var(--border)", borderRadius:"12px", fontSize:"1.6rem", fontWeight:"bold"}}>
            <span>Net Profit</span>
            <span style={{color:"#34D399"}}>₹{netProfit.toLocaleString()}</span>
          </div>
          <div style={{textAlign:"center", marginTop:"30px", padding:"40px", background:"var(--bg)", borderRadius:"16px", border:"2px dashed var(--accent)"}}>
            <div style={{fontSize:"1.1rem", color:"var(--muted)", textTransform:"uppercase", fontWeight:"bold", marginBottom:"10px"}}>Per Partner Share (5 Partners)</div>
            <div style={{fontSize:"5rem", fontFamily:"'Bebas Neue',sans-serif", color:"var(--accent)", lineHeight:"1"}}>₹{profitPerPerson.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ADMIN
══════════════════════════════════════════ */
function Admin({parcels, users, updateStatus, editParcelFull, deleteParcel, createStaff, removeStaff, editUserAcc, user, showMsg, t}){
  const role = user.role; 
  const [tab, setTab] = useState("parcels"); 

  const [selected,setSelected]=useState(null); const [newS,setNewS]=useState(""); const [loc,setLoc]=useState(""); 
  const [editingParcel, setEditingParcel] = useState(null); const [editF, setEditF] = useState({});
  const [filter,setFilter]=useState("All"); const [search,setSearch]=useState("");
  const [timeFilter, setTimeFilter]=useState("All");
  const [payFilter, setPayFilter]=useState("All"); 

  const [newStaffUser, setNewStaffUser] = useState(""); const [newStaffPass, setNewStaffPass] = useState("");
  const [editingStaff, setEditingStaff] = useState(null); const [editStaffData, setEditStaffData] = useState({});

  async function applyUpdate(e){ e.preventDefault(); if(!newS)return; await updateStatus(selected.id, newS, loc || "Updated"); setSelected(null);setNewS("");setLoc(""); }
  async function applyFullEdit(e){ e.preventDefault(); await editParcelFull(editF); setEditingParcel(null); }

  const handleAddStaff = (e) => {
    e.preventDefault();
    if(!newStaffUser || !newStaffPass) return showMsg("Fill both fields!", "error");
    createStaff(newStaffUser, newStaffPass);
    setNewStaffUser(""); setNewStaffPass("");
  }
  const saveStaffEdit = (e) => {
    e.preventDefault();
    editUserAcc(editingStaff.id, editStaffData);
    setEditingStaff(null);
  }

  const now = new Date();
  const filteredTimeParcels = parcels.filter(p => {
    if (timeFilter === "All") return true;
    const pDate = parseIndDate(p.date);
    if (timeFilter === "Today") return pDate.toDateString() === now.toDateString();
    if (timeFilter === "Week") return (now - pDate) <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "Month") return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    return true;
  });

  const counts=STATUSES.reduce((a,s)=>{a[s]=filteredTimeParcels.filter(p=>p.status===s).length;return a;},{});
  const chartData = STATUSES.map(s => ({ name: sLabel(s,t), count: counts[s] || 0, fill: S_CLR[s] }));
  const statRev = filteredTimeParcels.reduce((a,b)=>a+(b.price||0),0);
  const statPcs = filteredTimeParcels.reduce((a,b)=>a+(b.count||1),0);

  const filteredTable = [...parcels].reverse()
    .filter(p=> filter==="All" || p.status===filter)
    .filter(p=> payFilter==="All" || p.payment===payFilter)
    .filter(p=> search==="" || p.id.includes(search.toUpperCase())||p.sName.toLowerCase().includes(search.toLowerCase())||p.rName.toLowerCase().includes(search.toLowerCase())||p.sPhone.includes(search)||p.rPhone.includes(search) );

  return(
    <div className="page">
      <div className="admin-header">
        <div>
          <h1>{t.adminT} <span className="sbadge-sm" style={{background:"var(--accent)22",color:"var(--accent)"}}>{role.toUpperCase()}</span></h1>
          <p className="muted">{t.adminS}</p>
        </div>
      </div>

      {role === "admin" && (
        <div style={{display:"flex", gap:"10px", marginBottom:"2rem"}}>
          <button className={`btn-${tab==="parcels"?"primary":"ghost"}`} onClick={()=>setTab("parcels")}>📦 Manage Parcels</button>
          <button className={`btn-${tab==="staff"?"primary":"ghost"}`} onClick={()=>setTab("staff")}>👥 Manage Staff Accounts</button>
        </div>
      )}

      {tab === "staff" && role === "admin" ? (
        <div className="form-grid3">
          <div className="form-card glass-panel">
            <h3 style={{marginBottom:"1rem"}}>Add New Staff</h3>
            <form onSubmit={handleAddStaff}>
              <FF l="Staff Username" v={newStaffUser} o={setNewStaffUser} p="e.g. jhon123"/>
              <FF l="Password" v={newStaffPass} o={setNewStaffPass} p="Assign a secure password"/>
              <button type="submit" className="btn-primary" style={{width:"100%", marginTop:"1rem"}}>+ Create Account</button>
            </form>
          </div>
          <div className="form-card glass-panel" style={{gridColumn:"span 2"}}>
            <h3 style={{marginBottom:"1rem"}}>Active Accounts</h3>
            <div className="ptable">
              {users.map(u => (
                <div key={u.id} className="ptable-row" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr", background:"var(--bg2)", marginBottom:"5px", borderRadius:"8px"}}>
                  <span className="mono accent">{u.id}</span>
                  <span><strong>{u.username}</strong></span>
                  <span><span className="sbadge-sm" style={{background:u.role==="admin"?"#FBBF2422":"#60A5FA22", color:u.role==="admin"?"#FBBF24":"#60A5FA"}}>{u.role.toUpperCase()}</span></span>
                  <span style={{display:"flex", gap:"5px"}}>
                    <button className="btn-upd" style={{color:"#FBBF24"}} onClick={()=>{setEditingStaff(u); setEditStaffData({username: u.username, password: u.password, role: u.role});}}>✏️ Edit</button>
                    {u.role !== "admin" && <button className="btn-upd" style={{color:"#ef4444"}} onClick={()=>removeStaff(u.id)}>🗑️ Remove</button>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {role === "admin" && (
            <>
              <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"10px"}}>
                 <select className="input glass-panel" value={timeFilter} onChange={e=>setTimeFilter(e.target.value)} style={{width:"auto", padding:"5px 15px", fontSize:"0.8rem", color:"var(--accent)", borderColor:"var(--accent)"}}>
                   <option value="All">📈 All Time</option>
                   <option value="Today">📅 Today</option>
                   <option value="Week">📆 This Week</option>
                   <option value="Month">📊 This Month</option>
                 </select>
              </div>
              <div className="admin-stats">
                <div className="ast glass-panel"><div className="ast-n">{filteredTimeParcels.length}</div><div className="ast-l">Bookings</div></div>
                <div className="ast glass-panel"><div className="ast-n">{statPcs}</div><div className="ast-l">Pcs Handled</div></div>
                <div className="ast glass-panel" style={{borderColor:"var(--accent)"}}><div className="ast-n" style={{color:"var(--accent)"}}>₹{statRev}</div><div className="ast-l">Revenue</div></div>
              </div>
              <div className="form-card glass-panel" style={{marginBottom: "2rem", height: "250px", padding: "1rem"}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--muted)'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'var(--bg)'}} contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)'}} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <div className="admin-controls">
            <input className="input glass-panel" placeholder={`🔍 Search LR, Name, Phone...`} value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2}}/>
            <select className="input glass-panel" value={filter} onChange={e=>setFilter(e.target.value)} style={{flex:1, minWidth:"140px"}}><option value="All">{t.allS}</option>{STATUSES.map(s=><option key={s} value={s}>{sLabel(s,t)}</option>)}</select>
            <select className="input glass-panel" value={payFilter} onChange={e=>setPayFilter(e.target.value)} style={{flex:1, minWidth:"140px"}}><option value="All">All Payments</option>{PAY_MODES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          </div>

          <div className="ptable glass-panel">
            <div className="ptable-head"><span>{t.tblH[0]}</span><span>{t.tblH[1]}</span><span>{t.tblH[2]}</span><span>{t.tblH[3]}</span><span>{t.tblH[4]}</span><span>{t.tblH[5]}</span></div>
            {filteredTable.map(p=>(
              <div key={p.id} className="ptable-row">
                <span className="mono accent">{p.id}</span>
                <span>{p.sName}<br/><small className="muted">{p.sPhone}</small></span>
                <span>{p.rName}<br/><small className="muted">{p.rPhone}</small></span>
                <span className="small">{p.from} → {p.to}<br/><small className="muted">{p.count} Pcs | ₹{p.price} <b style={{color: p.payment==="To Pay"?"#ef4444":(p.payment==="Credit"?"#FBBF24":"#34D399")}}>({p.payment})</b></small></span>
                <span><span className="sbadge-sm" style={{background:S_CLR[p.status]+"22",color:S_CLR[p.status]}}>{sLabel(p.status,t)}</span></span>
                <span style={{display:"flex", gap:"5px"}}>
                  <button type="button" className="btn-upd" onClick={(e)=>{ e.preventDefault(); setSelected(p);setNewS(p.status);setLoc("");}}>Upd</button>
                  {role === "admin" && <button type="button" className="btn-upd" style={{color:"#FBBF24", borderColor:"#FBBF2455", background:"#FBBF2415"}} onClick={(e)=>{ e.preventDefault(); setEditingParcel(p); setEditF({from:p.from, to:p.to, rate:p.rate, count:p.count, type:p.type, payment:p.payment, actualWeight:p.actualWeight, ...p}); }}>✏️</button>}
                  {role === "admin" && <button type="button" className="btn-upd" style={{color:"#ef4444", borderColor:"#ef444455", background:"#ef444415"}} onClick={() => { if(window.confirm('Delete this parcel?')) deleteParcel(p.id); }}>🗑️</button>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {selected&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div className="modal pop-in glass-panel">
            <h3>{t.updT}: <span className="accent">{selected.id}</span></h3>
            <p className="muted" style={{marginBottom:"1.5rem"}}>{selected.sName} → {selected.rName}</p>
            <FS l={t.newS} v={newS} o={setNewS} opts={STATUSES} labelFn={s=>sLabel(s,t)}/>
            <FF l={t.curL} v={loc} o={setLoc} p={t.curLph}/>
            <div className="btn-row" style={{marginTop:"1.5rem"}}><button type="button" className="btn-primary" onClick={applyUpdate} disabled={!newS}>{t.updBtn}</button><button type="button" className="btn-ghost" onClick={(e)=>{ e.preventDefault(); setSelected(null);}}>{t.cancel}</button></div>
          </div>
        </div>
      )}

      {editingParcel&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setEditingParcel(null)}>
          <div className="modal pop-in glass-panel" style={{maxWidth: "700px", maxHeight: "90vh", overflowY: "auto"}}>
            <h3>Edit LR Details: <span className="accent">{editingParcel.id}</span></h3>
            <div className="form-row" style={{marginTop:"1.5rem"}}>
              <FF l="Sender Name" v={editF.sName} o={v=>setEditF(p=>({...p, sName:v}))} />
              <FF l="Sender Phone" v={editF.sPhone} o={v=>setEditF(p=>({...p, sPhone:v}))} />
              <FF l="Receiver Name" v={editF.rName} o={v=>setEditF(p=>({...p, rName:v}))} />
              <FF l="Receiver Phone" v={editF.rPhone} o={v=>setEditF(p=>({...p, rPhone:v}))} />
              <FS l="From City" v={editF.from} o={v=>setEditF(p=>({...p, from:v}))} opts={CITIES}/>
              <FS l="To City" v={editF.to} o={v=>setEditF(p=>({...p, to:v}))} opts={CITIES}/>
              <FF l="Rate (₹)" v={editF.rate} o={v=>setEditF(p=>({...p, rate:v}))} type="number"/>
              <FS l="Payment Mode" v={editF.payment} o={v=>setEditF(p=>({...p, payment:v}))} opts={PAY_MODES}/>
              <FF l="Total Amount (₹) Override" v={editF.price} o={v=>setEditF(p=>({...p, price:parseInt(v)||0}))} type="number"/>
            </div>
            <div className="btn-row" style={{marginTop:"1.5rem"}}>
              <button type="button" className="btn-primary" onClick={applyFullEdit}>💾 Save Changes</button>
              <button type="button" className="btn-ghost" onClick={(e)=>{ e.preventDefault(); setEditingParcel(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingStaff&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setEditingStaff(null)}>
          <div className="modal pop-in glass-panel">
            <h3>Edit Account: <span className="accent">{editingStaff.username}</span></h3>
            <div className="fg" style={{marginTop:"1rem"}}><label className="flabel">Username</label><input className="input" value={editStaffData.username} onChange={e=>setEditStaffData({...editStaffData, username:e.target.value})}/></div>
            <div className="fg"><label className="flabel">Password</label><input className="input" value={editStaffData.password} onChange={e=>setEditStaffData({...editStaffData, password:e.target.value})}/></div>
            <FS l="Role" v={editStaffData.role} o={v=>setEditStaffData({...editStaffData, role:v})} opts={["admin", "staff"]}/>
            <div className="btn-row" style={{marginTop:"1.5rem"}}><button type="button" className="btn-primary" onClick={saveStaffEdit}>💾 Update Account</button><button type="button" className="btn-ghost" onClick={(e)=>{ e.preventDefault(); setEditingStaff(null);}}>Cancel</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════
   FOOTER, FORMS, CSS
══════════════════════════════════════════ */
function Footer(){
  return(
    <footer className="footer">
      <div className="footer-inner">
        <div><div className="logo-box" style={{fontSize:"1.4rem",padding:"4px 12px"}}>MPS</div><div className="muted small" style={{marginTop:"0.5rem"}}>M P S Parcel Service</div></div>
        <div className="muted small">Tamil Nadu, India</div>
      </div>
      <div className="footer-btm">© 2026 MPS Parcel Service. Enterprise Grade.</div>
    </footer>
  );
}

function FF({l,v,o,p,type="text",onEnter}){ return<div className="fg"><label className="flabel">{l}</label><input className="input" type={type} value={v} onChange={e=>o(e.target.value)} placeholder={p} onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter(e)}/></div>; }
function FS({l,v,o,opts,labelFn}){ return<div className="fg"><label className="flabel">{l}</label><select className="input" value={v} onChange={e=>o(e.target.value)}><option value="">Select...</option>{opts.map(opt=><option key={opt} value={opt}>{labelFn?labelFn(opt):opt}</option>)}</select></div>; }
function FRow({children}){return<div className="form-row">{children}</div>;}

const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

[data-theme="dark"]{--bg:#0A0F1C; --bg2:#111A2D; --card:#152238; --card2:#1B2C47; --border:#263B5E; --text:#F1F5F9; --text2:#CBD5E1; --muted:#94A3B8; --input-bg:#0A0F1C;}
[data-theme="light"]{--bg:#F4F7FB; --bg2:#FFFFFF; --card:#FFFFFF; --card2:#F8FAFC; --border:#E2E8F0; --text:#0F172A; --text2:#334155; --muted:#64748B; --input-bg:#F8FAFC;}

:root{--accent:#FF6B35;--gold:#FBBF24;--whatsapp:#25D366;--r:16px;--r2:10px;}
html{scroll-behavior:smooth;}
body{background:var(--bg);color:var(--text);font-family:'Inter','DM Sans',sans-serif;line-height:1.6;}
.app{min-height:100vh;display:flex;flex-direction:column;} main{flex:1;}
.accent{color:var(--accent);} .muted{color:var(--muted);} .small{font-size:0.85rem;} .mono{font-family:'Courier New',monospace;letter-spacing:1px;}

.glass{background:var(--bg2); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:200;}
.glass-panel{background:var(--card); border:1px solid var(--border); border-radius:var(--r); box-shadow:0 10px 30px rgba(0,0,0,0.03);}

.input{width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:var(--r2);padding:0.8rem 1rem;color:var(--text);font-size:0.95rem;outline:none;} 
.input:focus{border-color:var(--accent); box-shadow: 0 0 0 2px var(--accent)33;} 

.toast-box{position:fixed; top:80px; left:50%; transform:translateX(-50%); padding:12px 24px; border-radius:30px; font-weight:600; font-size:0.9rem; z-index:9999999; box-shadow:0 10px 30px rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1);}
.toast-success{background:#34D399; color:#064E3B;} .toast-error{background:#EF4444; color:#450A0A;} .toast-info{background:#60A5FA; color:#1E3A8A;}
@keyframes slideDown{from{opacity:0;transform:translate(-50%,-20px);}to{opacity:1;transform:translate(-50%,0);}} .slide-down{animation:slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;}

@keyframes fadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
@keyframes pop{0%{opacity:0;transform:scale(0.8);}100%{opacity:1;transform:scale(1);}}
@keyframes glow{0%,100%{box-shadow:0 0 10px var(--accent)44;}50%{box-shadow:0 0 25px var(--accent)88;}}
.page-anim{animation:fadeUp 0.4s ease both;} .slide-up{animation:fadeUp 0.5s ease both;} .slide-in{animation:fadeUp 0.4s ease both;} .pop-in{animation:pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;} 

.full-center{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;}
.logo-box-lg{background:var(--accent);color:white;font-family:'Bebas Neue',sans-serif;font-size:2.5rem;letter-spacing:4px;padding:8px 24px;border-radius:12px;}
.nav-inner{max-width:1400px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:70px;}
.logo{display:flex;align-items:center;gap:0.8rem;cursor:pointer;} .logo-box{background:var(--accent);color:white;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:3px;padding:4px 12px;border-radius:8px;}
.logo-name{font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:4px;} .logo-sub{font-size:0.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
.nav-links{display:flex;gap:4px;} .nav-link{background:none;border:none;color:var(--muted);font-weight:600;font-size:0.9rem;cursor:pointer;padding:8px 16px;border-radius:20px;transition:all 0.2s;} .nav-link:hover{color:var(--text);background:var(--border);} .nav-link.active{color:var(--accent);background:var(--accent)18;}
.nav-right{display:flex;align-items:center;gap:0.5rem;} .icon-btn{background:none;border:1px solid var(--border);border-radius:10px;padding:6px 12px;cursor:pointer;color:var(--text);} 
.sb-badge{border-radius:12px;padding:4px 12px;font-size:0.75rem;font-weight:700;} .hamburger{display:none;background:none;border:none;color:var(--text);font-size:1.5rem;cursor:pointer;}

.page{max-width:1400px;margin:0 auto;padding:3rem 2rem 5rem;} 
.center-page{display:flex;justify-content:center;padding-top:4rem;} .page-header{margin-bottom:2.5rem; text-align:center;} .page-header h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,4vw,3.5rem);letter-spacing:2px;}

.home-page{max-width:100%; text-align: center;} 
.hero{padding:6rem 2rem 5rem; max-width:1400px; margin:0 auto;} 
.hero-badge{display:inline-block;background:var(--accent)15;color:var(--accent);border:1px solid var(--accent)33;border-radius:20px;padding:8px 24px;font-size:0.85rem;font-weight:700;margin-bottom:2rem;letter-spacing:1px;}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(4rem,9vw,9rem);line-height:0.9;letter-spacing:2px;margin-bottom:1.5rem; color:var(--text);} 
.hero-sub{font-size:1.2rem;color:var(--muted);margin-bottom:3rem; line-height:1.6; max-width: 600px; margin-left: auto; margin-right: auto;} 
.hero-btns{display:flex;gap:1rem;flex-wrap:wrap; justify-content: center;} 

.quick-track{display:flex; align-items:center; max-width: 600px; margin: 0 auto 3rem; padding: 0.5rem 0.5rem 0.5rem 1.5rem; border-radius: 40px; box-shadow: 0 15px 40px rgba(0,0,0,0.1); border: 1px solid var(--border);}
.quick-track .input{outline:none; box-shadow:none; padding:0;}
.quick-track .btn-primary{border-radius: 30px; padding: 0.8rem 1.8rem;}

.stats-strip{display:flex; flex-wrap:wrap; gap: 1.5rem; padding: 0 2rem; max-width: 1400px; margin: 0 auto 3rem;} 
.stat-item{flex:1; min-width:200px; text-align:center; padding:2rem;} 
.stat-n{font-family:'Bebas Neue',sans-serif;font-size:3.5rem;color:var(--accent); line-height:1;} .stat-l{font-size:0.9rem;color:var(--muted);text-transform:uppercase;font-weight:700; margin-top:0.5rem;}

.btn-primary{background:var(--accent);color:white;border:none;padding:0.8rem 2rem;border-radius:var(--r2);font-weight:600;font-size:1rem;cursor:pointer;} .btn-primary:hover{background:#FF5722;} .btn-primary:disabled{opacity:0.5;cursor:default;}
.btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border);padding:0.8rem 2rem;border-radius:var(--r2);font-weight:600;font-size:1rem;cursor:pointer;} .btn-ghost:hover{border-color:var(--accent);color:var(--accent);} .btn-ghost.small{padding:0.5rem 1rem;font-size:0.85rem;} .btn-lg{padding:1rem 2.5rem;font-size:1.1rem;} .btn-col{display:flex;flex-direction:column;gap:0.75rem;margin-top:1.5rem;} .btn-whatsapp{flex:1; background:var(--whatsapp); color:white; border:none; padding:12px 15px; border-radius:var(--r2); font-weight:600; cursor:pointer;} 

.form-grid3{display:grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 2rem;} 
.form-card{padding:2.5rem;} .form-card-hd{font-weight:700;font-size:1.1rem;margin-bottom:1.5rem;} .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;} .fg{margin-bottom:1.2rem;} .flabel{display:block;font-size:0.75rem;color:var(--muted);margin-bottom:6px;text-transform:uppercase;font-weight:600;} 

.dropdown{position:absolute;top:100%;left:0;right:0;background:var(--card2);border:1px solid var(--accent);border-radius:var(--r2);z-index:100;margin-top:5px;max-height:200px;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);} .dropdown-item{padding:12px 15px;cursor:pointer;font-size:0.9rem;border-bottom:1px solid var(--border);} .dropdown-item:hover{background:var(--accent);color:white;}

.tid-big{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:var(--accent);background:var(--accent)10;border:2px dashed var(--accent)44;border-radius:var(--r2);padding:0.5rem 1.5rem;display:inline-block;margin:0.8rem 0;} 
.track-search{display:flex;gap:1rem;margin-bottom:2rem;} .track-in{flex:1;} .track-top{padding:1.5rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);background:var(--card2);} .track-id{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--accent);} .sbadge{padding:6px 16px;border-radius:20px;font-weight:600;font-size:0.85rem;}

.admin-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;} .admin-header h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(2.2rem,4vw,3rem);} .admin-stats{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;} .ast{padding:1.5rem;text-align:center;flex:1;min-width:150px;} .ast-n{font-family:'Bebas Neue',sans-serif;font-size:2.5rem;} .ast-l{font-size:0.75rem;color:var(--muted);text-transform:uppercase;font-weight:600;} .admin-controls{display:flex;gap:1rem;margin-bottom:1.5rem; flex-wrap:wrap;} .ptable{overflow-x:auto;} .ptable-head, .ptable-row{display:grid;grid-template-columns:1fr 1.2fr 1.2fr 1.5fr 1fr 1fr;padding:1rem 1.5rem;gap:0.5rem;min-width:1000px;} .ptable-head{background:var(--card2);font-size:0.75rem;text-transform:uppercase;color:var(--muted);font-weight:600;} .ptable-row{border-top:1px solid var(--border);align-items:center;font-size:0.9rem;} .sbadge-sm{padding:4px 12px;border-radius:12px;font-size:0.75rem;font-weight:600;} .btn-upd{background:var(--card2);color:var(--text);border:1px solid var(--border);padding:6px 10px;border-radius:6px;font-size:0.85rem;cursor:pointer;font-weight:600;} .btn-upd:hover{border-color:var(--accent);}

.modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:999999;padding:1rem;} 
.modal{width:100%;max-width:420px;} .login-card{padding:3rem 2.5rem;max-width:400px;width:100%;}
.footer{background:var(--card);border-top:1px solid var(--border);margin-top:auto;} .footer-inner{max-width:1400px;margin:0 auto;padding:3rem 2rem;display:flex;justify-content:space-between;gap:2rem;} .footer-links{display:flex;gap:1rem;} .footer-link{background:none;border:none;color:var(--muted);cursor:pointer;font-weight:600;}

@media(max-width:900px){ 
  .form-grid3{grid-template-columns: 1fr;}
}
@media(max-width:768px){ 
  .nav-links{display:none;position:fixed;top:70px;left:0;right:0;background:var(--bg2);flex-direction:column;padding:1rem;gap:8px;} 
  .nav-links.open{display:flex;} 
  .hamburger{display:block;} 
  .form-row{grid-template-columns:1fr;} 
  .track-search{flex-direction:column;} 
  .admin-stats{flex-direction:column;} 
  .quick-track{flex-direction: column; gap:10px; padding: 1rem; border-radius: 12px;}
  .quick-track .btn-primary{width: 100%; border-radius: 8px;}
}
`;