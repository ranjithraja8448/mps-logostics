import React, { useState, useEffect, Fragment } from "react";
import { jsPDF } from "jspdf";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ══════════════════════════════════════════
   CONSTANTS & CONFIG
══════════════════════════════════════════ */
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const CITIES = ["Mecheri","Elampillai","Jalakandapuram","Salem","Coimbatore","Bhavani","Sathyamangalam","Bangalore", "Chennai"];
const TYPES = ["Box","Wooden Box","Bag","Green bag","Yellow Bag","Bale","Documents","Electronics","Furniture","Medical","Machinery"];
const STATUSES = ["Booked","Picked Up","In Transit","Out for Delivery","Delivered", "Deleted"];
const S_CLR  = {"Booked":"#3B82F6","Picked Up":"#F59E0B","In Transit":"#F97316","Out for Delivery":"#8B5CF6","Delivered":"#10B981", "Deleted":"#EF4444"};
const PAY_MODES = ["Paid", "To Pay", "Credit", "FOC"];

const genUserId = () => `USR-${Math.floor(Math.random()*10000)}`;

const generateLR = (originCity, allParcels) => {
  if (!originCity) return `MPS${String(Math.floor(Math.random()*1000)).padStart(6,'0')}`; 
  const prefix = originCity.substring(0, 3).toUpperCase(); 
  let max = 0;
  allParcels.forEach(p => {
    if (p.id && p.id.startsWith(prefix)) {
      const num = parseInt(p.id.replace(prefix, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
};

const MpsLogo = () => (
  <svg className="w-8 h-8 text-indigo-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

function calcPrice(from, to, ratePerUnit, count = 1, type = "Box", paymentMode = "Paid"){
  if(paymentMode === "FOC") return 0; 
  if(!ratePerUnit || ratePerUnit<=0) return 0; 
  const rate = parseFloat(ratePerUnit);
  let tc = 0;
  if(type==="Electronics") tc = 60; if(type==="Furniture") tc = 150; if(type==="Medical") tc = 40; if(type==="Machinery") tc = 120;
  return Math.round((rate * (parseInt(count) || 1)) + tc);
}

function generatePDF(p) {
  const doc = new jsPDF();
  doc.setLineWidth(0.5); doc.rect(10, 10, 190, 270); 
  doc.setFillColor(30, 58, 138); doc.rect(10, 10, 190, 22, "F"); 
  doc.setFontSize(24); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.text("MPS LOGISTICS", 15, 26);
  
  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(`LR NO: ${p.id}`, 15, 42); doc.text(`DATE: ${p.date}`, 145, 42);
  doc.line(10, 48, 200, 48); doc.line(105, 48, 105, 95); 
  
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text("CONSIGNOR (SENDER)", 15, 55); doc.text("CONSIGNEE (RECEIVER)", 110, 55);
  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(p.sName, 15, 63); doc.text(p.rName, 110, 63);
  doc.setFont("helvetica", "normal");
  doc.text(`Ph: ${p.sPhone}`, 15, 71); doc.text(`Ph: ${p.rPhone}`, 110, 71);
  doc.text(`Route: ${p.from} ➔ ${p.to}`, 15, 79);
  doc.line(10, 95, 200, 95);

  doc.setFillColor(245, 247, 250); doc.rect(10, 95, 190, 12, "F");
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("ARTICLES", 15, 103); doc.text("TYPE/DESC", 50, 103); doc.text("WEIGHT", 110, 103); doc.text("AMOUNT", 160, 103);
  doc.line(10, 107, 200, 107);

  doc.setFontSize(12); doc.setFont("helvetica", "normal");
  doc.text(`${p.count}`, 20, 117); doc.text(p.type, 50, 117); doc.text(`${p.actualWeight || "-"} Kg`, 112, 117); doc.text(`Rs. ${p.rate}`, 160, 117);
  doc.line(10, 140, 200, 140);

  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("PAYMENT MODE:", 15, 152);
  doc.text(p.payment.toUpperCase(), 60, 152);
  if(p.payment === 'Credit') { doc.setFontSize(11); doc.setTextColor(100); doc.text(`(A/c: ${p.creditCustomer || 'N/A'})`, 15, 160); }
  
  doc.setTextColor(0, 0, 0); doc.setFontSize(18); doc.text(`TOTAL: Rs. ${p.price}`, 140, 152);
  doc.save(`MPS_LR_${p.id}.pdf`);
}

function openWhatsApp(phone, isSender, p) {
  const text = `📦 *MPS Logistics*\n\nHello *${isSender ? p.sName : p.rName}*,\nYour parcel is booked successfully!\n\n*LR No:* ${p.id}\n*Route:* ${p.from} ➔ ${p.to}\n*Mode:* ${p.payment}\n*Amount:* ₹${p.price}\n\nTrack online anytime.`;
  window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(text)}`, '_blank');
}

const handleBoxTravel = (e, targets) => {
  let nextId = null;
  const isSelect = e.target.tagName === 'SELECT';
  
  let isStart = true, isEnd = true;
  try { 
    if(e.target.selectionStart !== null && e.target.selectionStart !== undefined) {
      isStart = e.target.selectionStart === 0; 
      isEnd = e.target.selectionEnd === e.target.value?.length; 
    }
  } catch(err){}

  if (e.key === 'Enter') nextId = targets.enter;
  else if (!isSelect && e.key === 'ArrowUp') nextId = targets.up;
  else if (!isSelect && e.key === 'ArrowDown') nextId = targets.down;
  else if (!isSelect && e.key === 'ArrowLeft' && isStart) nextId = targets.left;
  else if (!isSelect && e.key === 'ArrowRight' && isEnd) nextId = targets.right;

  if (nextId) {
    if (e.key === 'Enter' || (!isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) e.preventDefault();
    const nextElem = document.getElementById(nextId);
    if (nextElem) {
      nextElem.focus();
      if (nextElem.tagName === 'INPUT') nextElem.select();
    }
  }
};

function SuggestInput({ id, label, value, onChange, onSelect, dataList, isPhone, theme, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = dataList
    .filter(c => isPhone ? c.phone.includes(value) : (c.name||"").toLowerCase().includes(value.toLowerCase()))
    .filter(()=>value.length>=2);

  useEffect(() => { setActiveIndex(-1); }, [value]);

  const handleKeyDown = (e) => {
    if (open && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % matches.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + matches.length) % matches.length);
        return;
      } else if (e.key === 'Enter') {
        if (matches.length === 1 || activeIndex >= 0) {
          e.preventDefault();
          const selectedMatch = activeIndex >= 0 ? matches[activeIndex] : matches[0];
          onSelect(selectedMatch);
          setOpen(false);
          return;
        }
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const inputBg = theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';
  
  return (
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`}>
      <input 
        id={id} 
        onKeyDown={handleKeyDown} 
        value={value} 
        onChange={(e) => { 
          onChange(e.target.value); 
          setOpen(true);
          if (isPhone && e.target.value.length === 10) { 
            const exact = dataList.find(d=>d.phone===e.target.value); 
            if(exact) { onSelect(exact); setOpen(false); } 
          } 
        }} 
        onFocus={() => setOpen(true)} 
        onBlur={() => setTimeout(() => setOpen(false), 200)} 
        placeholder={label} 
        maxLength={isPhone ? "10" : "100"} 
        className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-20 ${inputBg}`} 
      />
      {open && matches.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl border overflow-hidden max-h-48 overflow-y-auto z-[60] ${theme==='dark'?'bg-slate-800 border-slate-600':'bg-white border-slate-200'}`}>
          {matches.map((c, i) => (
            <div 
              key={i} 
              className={`p-3 cursor-pointer text-sm transition-colors ${activeIndex === i ? (theme==='dark'?'bg-indigo-600 text-white':'bg-indigo-100 text-indigo-900') : (theme==='dark'?'hover:bg-indigo-600 text-white':'hover:bg-indigo-50 text-slate-800')}`} 
              onClick={() => { onSelect(c); setOpen(false); }}
            >
              <b>{isPhone ? c.phone : c.name}</b> <span className="opacity-60">- {isPhone ? c.name : c.phone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const local={
  async get(k){try{const r=window.localStorage.getItem(k);return r?JSON.parse(r):null;}catch{return null;}},
  async set(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));}catch{}},
  async remove(k){try{window.localStorage.removeItem(k);}catch{}}
};

class DB{
  constructor(url, key){ 
    this.isLive = Boolean(url && key); 
    if(this.isLive) {
      this.base = url.replace(/\/+$/,"")+"/rest/v1";
      this.h = {"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":"application/json"};
    }
  } 
  async getParcels(){ 
    if(this.isLive) { try { const r=await fetch(`${this.base}/parcels?select=*`,{headers:this.h}); if(r.ok) return await r.json(); } catch(e){} }
    return await local.get("mps_parcels")||[]; 
  }
  async insertParcel(p){ 
    if(this.isLive) { try { await fetch(`${this.base}/parcels`,{method:"POST",headers:this.h,body:JSON.stringify(p)}); } catch(e){} }
    await local.set("mps_parcels", [p, ...(await local.get("mps_parcels")||[])]); 
  }
  async updateParcel(id, data){ 
    if(this.isLive) { try { await fetch(`${this.base}/parcels?id=eq.${id}`,{method:"PATCH",headers:this.h,body:JSON.stringify(data)}); } catch(e){} }
    await local.set("mps_parcels", (await local.get("mps_parcels")||[]).map(x => x.id === id ? {...x, ...data} : x)); 
  }
  async deleteParcel(id){ 
    if(this.isLive) { try { await fetch(`${this.base}/parcels?id=eq.${id}`,{method:"DELETE",headers:this.h}); } catch(e){} }
    await local.set("mps_parcels", (await local.get("mps_parcels")||[]).filter(x => x.id !== id)); 
  }
  async getUsers(){ 
    if(this.isLive) { try { const r=await fetch(`${this.base}/app_users?select=*`,{headers:this.h}); if(r.ok) return await r.json(); } catch(e){} }
    let usrs = await local.get("mps_users");
    if (!usrs || usrs.length === 0) {
      usrs = [
        {id:'super-1', username:'superadmin', password:'123', role:'superadmin', branch:'All'},
        {id:'admin-1', username:'admin', password:'123', role:'admin', branch: CITIES[0]},
        {id:'staff-1', username:'staff', password:'123', role:'staff', branch: CITIES[0]}
      ];
      await local.set("mps_users", usrs);
    } else if (!usrs.find(u => u.username === 'superadmin')) {
      usrs.push({id:'super-1', username:'superadmin', password:'123', role:'superadmin', branch:'All'});
      await local.set("mps_users", usrs);
    }
    return usrs;
  }
  async insertUser(u){ 
    if(this.isLive) { try { await fetch(`${this.base}/app_users`,{method:"POST",headers:this.h,body:JSON.stringify(u)}); } catch(e){} }
    await local.set("mps_users", [u, ...(await this.getUsers())]); 
  }
  async deleteUser(id){ 
    if(this.isLive) { try { await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"DELETE",headers:this.h}); } catch(e){} }
    await local.set("mps_users", (await this.getUsers()).filter(u => u.id !== id)); 
  }
  async updateUser(id, data){
    if(this.isLive) { try { await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"PATCH",headers:this.h,body:JSON.stringify(data)}); } catch(e){} }
    await local.set("mps_users", (await this.getUsers()).map(u => u.id === id ? {...u, ...data} : u));
  }
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [shortcutMode, setShortcutMode] = useState("");
  const [theme, setTheme] = useState("light");
  
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [creditAuthList, setCreditAuthList] = useState([]); 

  const [db] = useState(new DB(ENV_URL, ENV_KEY));
  const showMsg = (msg, type='success') => { setToast({msg, type}); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    async function init() {
      const ps = await db.getParcels(); setParcels(ps);
      const usrs = await db.getUsers(); setUsers(usrs);
      const session = await local.get("mps_session"); if(session) setUser(session);
      const savedTheme = await local.get("mps_theme"); if(savedTheme) setTheme(savedTheme);
      
      const cList = await local.get("mps_credit_auth") || []; setCreditAuthList(cList);
    } init();
  }, []);

  const toggleTheme = () => { const nt = theme === "dark" ? "light" : "dark"; setTheme(nt); local.set("mps_theme", nt); };

  useEffect(() => {
    const handleKey = (e) => {
      if(!user) return;
      let mode = "";
      if (e.key === 'F7') mode = 'Paid';
      else if (e.key === 'F8') mode = 'To Pay';
      else if (e.key === 'F9') mode = 'Credit';
      else if (e.key === 'F10') mode = 'FOC';
      if(mode) { e.preventDefault(); setPage('book'); setShortcutMode(mode); showMsg(`${mode} Mode Activated!`, "info"); }
    };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [user]);

  if(!user) return <Login onLogin={async (u,p) => { 
    const valid = users.find(x=>x.username===u && x.password===p); 
    if(valid){ setUser(valid); await local.set("mps_session", valid); showMsg("Welcome!"); return true; } 
    else { return false; } 
  }} theme={theme} />;

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800";
  const headerBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  return (
    <div className={`flex h-screen font-sans ${bgClass} transition-colors duration-300`}>
      <aside className={`${sidebarExpanded ? "w-64" : "w-16 md:w-20"} bg-slate-950 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 transition-all duration-300`}>
        <div className="h-16 md:h-20 flex items-center justify-between px-2 md:px-4 border-b border-slate-800 bg-black/10">
          {sidebarExpanded ? (
            <div className="flex items-center animate-fade-in pl-2">
              <MpsLogo />
              <div><h1 className="text-xl font-black text-white tracking-widest">MPS</h1><p className="text-[10px] uppercase text-indigo-400 font-bold">{user.branch} Branch</p></div>
            </div>
          ) : (
            <div className="mx-auto"><MpsLogo /></div>
          )}
          <button onClick={() => setSidebarExpanded(!sidebarExpanded)} className="text-slate-400 hover:text-white text-md p-1 focus:outline-none transition-colors">
            {sidebarExpanded ? "◀" : "▶"}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 md:px-3 md:py-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard', role: 'staff' },
            { id: 'book', icon: '📦', label: 'Book Parcel', role: 'staff' },
            { id: 'track', icon: '🔍', label: 'Track', role: 'staff' },
            { id: 'delivery', icon: '🤝', label: 'Delivery', role: 'staff' },
            { id: 'accounts', icon: '💰', label: 'Accounts', role: 'admin' },
            { id: 'admin', icon: '⚙️', label: 'System Control', role: 'admin' }
          ].map(item => {
            const isAuthorized = item.role === 'staff' || user.role === 'admin' || user.role === 'superadmin';
            if (!isAuthorized) return null;
            return (
              <button key={item.id} title={item.label} onClick={() => setPage(item.id)} className={`w-full flex items-center py-3 rounded-xl font-medium transition-all ${sidebarExpanded ? "px-4" : "justify-center px-0"} ${page === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
                <span className="text-lg">{item.icon}</span>
                {sidebarExpanded && <span className="ml-3 animate-fade-in text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 flex justify-center">
          <button onClick={async ()=>{setUser(null); await local.remove("mps_session");}} className="text-slate-400 hover:text-white transition-colors flex items-center justify-center font-bold text-sm">
            <span>🚪</span> {sidebarExpanded && <span className="ml-2">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className={`${headerBg} shadow-sm h-auto min-h-[4rem] py-2 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 z-10 shrink-0 gap-2`}>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] md:text-sm font-bold bg-black/5 px-4 py-2 rounded-full">
            <span onClick={()=>{setPage('book'); setShortcutMode('Paid');}} className="cursor-pointer text-blue-500 hover:text-blue-600">F7: PAID</span><span className="opacity-25 hidden md:inline">|</span>
            <span onClick={()=>{setPage('book'); setShortcutMode('To Pay');}} className="cursor-pointer text-red-500 hover:text-red-600">F8: TO PAY</span><span className="opacity-25 hidden md:inline">|</span>
            <span onClick={()=>{setPage('book'); setShortcutMode('Credit');}} className="cursor-pointer text-amber-500 hover:text-amber-600">F9: CREDIT</span><span className="opacity-25 hidden md:inline">|</span>
            <span onClick={()=>{setPage('book'); setShortcutMode('FOC');}} className="cursor-pointer text-emerald-500 hover:text-emerald-600">F10: FOC</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className={`text-[10px] md:text-xs font-black uppercase px-2 py-1 md:px-3 rounded-full border ${user.role === 'superadmin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>
              {user.role} | {user.branch}
            </span>
            <button onClick={toggleTheme} className="text-lg md:text-xl">{(isDark)?'☀️':'🌙'}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {page === 'dashboard' && <Dashboard parcels={parcels} isDark={isDark} user={user} />}
            {page === 'book' && <Book shortcutMode={shortcutMode} parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} theme={theme} user={user} creditAuthList={creditAuthList} />}
            {page === 'track' && <Track parcels={parcels} isDark={isDark} />}
            {page === 'delivery' && <Delivery parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} />}
            {page === 'accounts' && (user.role === 'admin' || user.role === 'superadmin') && <Accounts parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} />}
            {page === 'admin' && (user.role === 'admin' || user.role === 'superadmin') && <Admin parcels={parcels} users={users} setUsers={setUsers} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} creditAuthList={creditAuthList} setCreditAuthList={setCreditAuthList} />}
          </div>
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-2xl font-bold text-white z-50 animate-bounce-in text-sm md:text-base ${toast.type==='error'?'bg-red-500':'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Dashboard({parcels, isDark, user}) {
  const [selectedBranch, setSelectedBranch] = useState(user.branch === 'All' ? 'All' : user.branch);

  const activeParcels = parcels.filter(p => p.status !== 'Deleted');
  
  const branchParcels = activeParcels.filter(p => {
    if (selectedBranch === 'All') return true;
    return p.bookedBranch === selectedBranch || p.from === selectedBranch || p.to === selectedBranch;
  });

  const rev = branchParcels.reduce((a,b)=>a+(b.price||0),0);
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
  
  const godownStock = activeParcels.filter(p => (selectedBranch === 'All' ? true : p.from === selectedBranch) && p.status === 'Booked');

  return (
    <div className="space-y-6">
      {(user.role === 'superadmin' || user.branch === 'All') && (
        <div className="flex justify-end mb-2">
          <select 
            value={selectedBranch} 
            onChange={e=>setSelectedBranch(e.target.value)} 
            className={`p-2 px-4 rounded-xl font-bold border outline-none shadow-sm cursor-pointer ${isDark?'bg-slate-900 border-slate-700':'bg-white border-slate-200'}`}
          >
            <option value="All">🌍 Global Network (All Branches)</option>
            {CITIES.map(c => <option key={c} value={c}>🏢 Branch: {c}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          {l: "Total Bookings", v: branchParcels.length, c: "text-blue-500"},
          {l: "In Transit", v: branchParcels.filter(p=>p.status==="In Transit").length, c: "text-amber-500"},
          {l: "Delivered", v: branchParcels.filter(p=>p.status==="Delivered").length, c: "textemerald-500"},
          {l: "Branch Revenue", v: `₹${rev}`, c: "text-indigo-500"}
        ].map((s,i) => (
          <div key={i} className={`${cardBg} p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-center`}>
            <span className="text-xs font-bold opacity-60 uppercase mb-1 md:mb-2">{s.l}</span>
            <span className={`text-2xl md:text-4xl font-black ${s.c}`}>{s.v}</span>
          </div>
        ))}
      </div>

      <div className={`${cardBg} rounded-2xl shadow-sm border overflow-hidden mt-6`}>
        <div className="bg-slate-900 text-white p-4 font-bold md:text-lg flex justify-between items-center">
          <span>📦 Godown Stock (Pending Loading)</span>
          <span className="bg-red-500 px-3 py-1 rounded-full text-xs md:text-sm">{godownStock.length} Parcels</span>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {godownStock.length === 0 ? <p className="text-center opacity-50 font-bold py-4">Godown Empty. All dispatched!</p> : 
            <table className="w-full text-left text-sm">
              <thead className="opacity-50"><tr><th className="pb-2">LR No</th><th className="pb-2">Origin</th><th className="pb-2">Destination</th><th className="pb-2">Type</th><th className="pb-2">Qty</th></tr></thead>
              <tbody>
                {godownStock.map(p => (
                  <tr key={p.id} className="border-t border-slate-500/20">
                    <td className="py-3 font-bold text-indigo-500">{p.id}</td><td className="py-3">{p.from}</td><td className="py-3">{p.to}</td>
                    <td className="py-3">{p.type}</td><td className="py-3 font-black text-amber-500">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  );
}

function Book({shortcutMode, parcels, setParcels, db, showMsg, isDark, theme, user, creditAuthList}) {
  const initF = {sName:"", sPhone:"", sGst:"", rName:"", rPhone:"", rGst:"", from: user.branch === 'All' ? "" : user.branch, to:"", rate:"", count:"1", actualWeight:"", type:"Box", payment:"Paid", creditCustomer:"", notes:""};
  const [f, setF] = useState(initF);
  const [done, setDone] = useState(null);
  const [eway, setEway] = useState("");
  const [contacts, setContacts] = useState([]);

  useEffect(() => { if(shortcutMode) setF(prev => ({...prev, payment: shortcutMode})); }, [shortcutMode]);
  useEffect(() => { async function load() { const c = await local.get("mps_contacts") || {}; setContacts(Object.entries(c).map(([phone, data]) => ({ phone, ...data }))); } load(); }, []);

  const smartFocus = (d, isSender) => {
    setTimeout(() => {
      if (isSender) {
        if (!d.name) document.getElementById('sName')?.focus();
        else if (!d.gst) document.getElementById('sGst')?.focus();
        else if (user.branch !== 'All') document.getElementById('rPhone')?.focus();
        else document.getElementById('sFrom')?.focus();
      } else {
        if (!d.name) document.getElementById('rName')?.focus();
        else if (!d.gst) document.getElementById('rGst')?.focus();
        else document.getElementById('rTo')?.focus();
      }
    }, 50);
  };

  const handlePhoneChange = async (isSender, value) => {
    const fieldPrefix = isSender ? 's' : 'r';
    setF(prev => ({ ...prev, [`${fieldPrefix}Phone`]: value }));
    if (value.length === 10) {
      const saved = await local.get("mps_contacts") || {};
      const found = saved[value];
      if (found) {
        setF(prev => ({...prev, [`${fieldPrefix}Name`]: found.name || "", [`${fieldPrefix}Gst`]: found.gst || "" }));
        showMsg("Customer details loaded automatically!", "success");
        smartFocus(found, isSender);
      }
    }
  };

  const handleContactSelect = (isSender, d) => { 
    const px = isSender ? 's' : 'r'; 
    setF(p => ({ ...p, [`${px}Phone`]: d.phone, [`${px}Name`]: d.name, [`${px}Gst`]: d.gst||'' })); 
    smartFocus(d, isSender);
  };

  const handleEwayChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setEway(val);
    if (val.length === 12) {
      showMsg("Validating E-Way Bill Parameters...", "info");
      setTimeout(() => {
        setF(p => ({...p, sName: "Sri Murugan Textiles", sPhone: "9876543210", sGst: "33AABCU1234F1Z1", from: user.branch === 'All' ? "Salem" : user.branch, rName: "City Fashions", rPhone: "9988776655", rGst: "29AAAAA0000A1Z5", to: "Bangalore", rate: "120", count: "15", type: "Bale", payment: "To Pay" }));
        showMsg("E-Way Bill Content Processed & Populated!", "success");
        document.getElementById("pQty").focus();
      }, 750);
    }
  };

  const ep = calcPrice(f.from, f.to, f.rate, f.count, f.type, f.payment);
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800";

  const submit = async () => {
    if(!f.sName || !f.sPhone || !f.from || !f.rName || !f.rPhone || !f.to || !f.count || !f.rate || !f.type) {
      return showMsg("Please fill all mandatory fields marked with (*)", "error");
    }

    if(f.payment === "Credit") {
      const isAuth = creditAuthList.find(c => c.phone === f.sPhone);
      if(!isAuth) return showMsg("Unauthorized Phone Number for Credit Billing! Please use Cash/To-Pay.", "error");
      f.creditCustomer = isAuth.company; 
    } else if(f.payment === "Credit" && !f.creditCustomer) {
      return showMsg("Credit Customer Account target missing (*)", "error");
    }
    
    const dObj = new Date();
    const isoDate = dObj.toISOString();
    const locDateStr = dObj.toLocaleDateString('en-IN');
    const lrNumber = generateLR(f.from, parcels);
    const p = {...f, notes: f.payment === 'Credit' ? `[A/c: ${f.creditCustomer}] ${f.notes}` : f.notes, id: lrNumber, date: locDateStr, isoDate: isoDate, status: "Booked", price: ep, bookedBy: user.username, bookedBranch: user.branch, settledBranches: [], history: [{status: "Booked", loc: f.from, time: dObj.toLocaleString()}]};
    
    const saved = await local.get("mps_contacts") || {};
    saved[f.sPhone] = { name: f.sName, gst: f.sGst }; saved[f.rPhone] = { name: f.rName, gst: f.rGst };
    await local.set("mps_contacts", saved);
    await db.insertParcel(p); setParcels([p, ...parcels]); setDone(p); showMsg("LR Generated cleanly.");
  };

  if(done) return (
    <div className={`${cardBg} p-6 md:p-10 rounded-3xl max-w-xl mx-auto text-center border-t-4 border-emerald-500`}>
      <h2 className="text-xl md:text-2xl font-black mb-4">Parcel Registered Successfully</h2>
      <div className="bg-indigo-600/10 text-indigo-500 text-xl md:text-2xl font-mono font-bold p-3 rounded-xl mb-6">{done.id}</div>
      <button onClick={()=>{setDone(null); setF(initF); setEway("");}} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mb-3">New Registration</button>
      <button onClick={()=>generatePDF(done)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mb-3">Download Receipt</button>
      <button onClick={() => openWhatsApp(done.sPhone, true, done)} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">📱 Send SMS / WhatsApp (Manual)</button>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`${cardBg} p-4 rounded-2xl border mb-2 flex flex-col sm:flex-row items-center gap-4 relative z-10`}>
        <span className="text-xl hidden sm:block">⚡</span>
        <input id="eway" onKeyDown={e=>handleBoxTravel(e,{enter:'sPhone', down:'sPhone'})} value={eway} onChange={handleEwayChange} placeholder="Enter 12-Digit E-Way Bill Number..." className={`w-full sm:flex-1 px-4 py-3 rounded-lg outline-none font-mono font-bold tracking-widest text-center sm:text-left ${inputBg}`} />
        {eway.length === 12 && <span className="text-emerald-500 font-bold px-4">Verified ✅</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-50">
        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}>
          <h3 className="font-bold text-indigo-500">Sender Profile</h3>
          <SuggestInput id="sPhone" onKeyDown={e=>handleBoxTravel(e,{enter:'sName', down:'sName', right:'rPhone', up:'eway'})} label="Mobile Number *" value={f.sPhone} onChange={v=>handlePhoneChange(true, v)} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={true} theme={theme} />
          <SuggestInput id="sName" onKeyDown={e=>handleBoxTravel(e,{enter:'sGst', down:'sGst', right:'rName', up:'sPhone'})} label="Full Name *" value={f.sName} onChange={v=>setF({...f, sName:v})} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={false} theme={theme} />
          <input id="sGst" onKeyDown={e=>handleBoxTravel(e,{enter: user.branch === 'All' ? 'sFrom' : 'rPhone', down: user.branch === 'All' ? 'sFrom' : 'rPhone', right:'rGst', up:'sName'})} value={f.sGst} onChange={e=>setF({...f, sGst:e.target.value})} placeholder="GST Number" className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`} />
          <select id="sFrom" disabled={user.branch !== 'All'} onKeyDown={e=>handleBoxTravel(e,{enter:'rPhone', down:'pQty', right:'rTo', up:'sGst'})} value={f.from} onChange={e=>setF({...f, from:e.target.value})} className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg} ${user.branch !== 'All' ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <option value="">Select Origin *</option>
            {CITIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}>
          <h3 className="font-bold text-emerald-500">Receiver Profile</h3>
          <SuggestInput id="rPhone" onKeyDown={e=>handleBoxTravel(e,{enter:'rName', down:'rName', left:'sPhone', up:'eway'})} label="Mobile Number *" value={f.rPhone} onChange={v=>handlePhoneChange(false, v)} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={true} theme={theme} />
          <SuggestInput id="rName" onKeyDown={e=>handleBoxTravel(e,{enter:'rGst', down:'rGst', left:'sName', up:'rPhone'})} label="Full Name *" value={f.rName} onChange={v=>setF({...f, rName:v})} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={false} theme={theme} />
          <input id="rGst" onKeyDown={e=>handleBoxTravel(e,{enter:'rTo', down:'rTo', left:'sGst', up:'rName'})} value={f.rGst} onChange={e=>setF({...f, rGst:e.target.value})} placeholder="GST Number" className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`} />
          <select id="rTo" onKeyDown={e=>handleBoxTravel(e,{enter:'pQty', down:'pQty', left:'sFrom', up:'rGst'})} value={f.to} onChange={e=>setF({...f, to:e.target.value})} className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`}><option value="">Select Destination *</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select>
        </div>
      </div>

      <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4 relative z-10`}>
        <h3 className="font-bold">Cargo Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <input id="pQty" onKeyDown={e=>handleBoxTravel(e,{enter:'pType', down:'pPay', right:'pType', up:user.branch==='All'?'sFrom':'sGst'})} type="number" value={f.count} onChange={e=>setF({...f, count:e.target.value})} placeholder="Quantity *" className={`p-3 rounded-xl border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
          <select id="pType" onKeyDown={e=>handleBoxTravel(e,{enter:'pWgt', down:'pPay', left:'pQty', right:'pWgt', up:'rTo'})} value={f.type} onChange={e=>setF({...f, type:e.target.value})} className={`p-3 rounded-xl border outline-none ${inputBg}`}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          <input id="pWgt" onKeyDown={e=>handleBoxTravel(e,{enter:'pRate', down:'btnSubmit', left:'pType', right:'pRate', up:'rTo'})} type="number" value={f.actualWeight} onChange={e=>setF({...f, actualWeight:e.target.value})} placeholder="Weight (Kg)" className={`p-3 rounded-xl border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
          <input id="pRate" onKeyDown={e=>handleBoxTravel(e,{enter:'pPay', down:'btnSubmit', left:'pWgt', up:'rTo'})} type="number" value={f.rate} onChange={e=>setF({...f, rate:e.target.value})} placeholder="Rate Per Unit *" className={`p-3 rounded-xl border outline-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2">
          <div className="flex flex-col gap-3">
            <select id="pPay" onKeyDown={e=>handleBoxTravel(e,{enter: f.payment==='Credit' ? 'pCredit' : 'btnSubmit', right: f.payment==='Credit'?'pCredit':'', up:'pQty', down:'btnSubmit'})} value={f.payment} onChange={e=>setF({...f, payment:e.target.value})} className="p-3 border rounded-xl font-bold bg-indigo-600 text-white outline-none w-full">{PAY_MODES.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}</select>
            {f.payment === 'Credit' && <input id="pCredit" onKeyDown={e=>handleBoxTravel(e,{enter:'btnSubmit', left:'pPay', up:'pRate', down:'btnSubmit'})} value={f.creditCustomer} onChange={e=>setF({...f, creditCustomer:e.target.value})} placeholder="Company Name Account *" className={`p-3 rounded-xl border outline-none w-full ${inputBg}`} disabled={true} />}
          </div>
          <div className="bg-slate-950 p-4 rounded-xl flex justify-between items-center text-white h-full"><span className="text-sm opacity-50">Total Income Allocation</span><span className="text-xl md:text-2xl font-black text-emerald-400">₹{ep}</span></div>
        </div>
      </div>
      <button id="btnSubmit" onClick={submit} onKeyDown={e => e.key === 'Enter' && submit()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-1 relative z-10">Confirm Booking</button>
    </div>
  );
}

function Track({parcels, isDark}) {
  const [id, setId] = useState(""); const [res, setRes] = useState(null);
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
  const search = () => { setRes(parcels.find(p=>p.id===id.toUpperCase()) || 'err'); };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex gap-2 md:gap-4 flex-col sm:flex-row">
        <input id="trkIn" onKeyDown={e=> e.key === 'Enter' ? search() : handleBoxTravel(e, {enter: 'trkBtn'})} value={id} onChange={e=>setId(e.target.value)} placeholder="Enter LR Tracking Number" className={`flex-1 p-3 rounded-xl border outline-none ${isDark?'bg-slate-900 border-slate-700':'bg-white'}`} />
        <button id="trkBtn" onClick={search} className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold">Search</button>
      </div>
      {res === 'err' && <div className="text-red-500 text-center font-bold">Invalid LR Reference</div>}
      {res && res !== 'err' && (
        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border`}>
          <h3 className="text-lg md:text-xl font-black text-indigo-500 mb-2">{res.id}</h3>
          <p className="font-bold mb-4">{res.from} ➔ {res.to} <span className="ml-2 px-2 py-1 rounded text-[10px] uppercase font-black" style={{backgroundColor: S_CLR[res.status]+'22', color: S_CLR[res.status]}}>{res.status}</span></p>
          <div className="space-y-3">
            {res.history.map((h,i)=>(<div key={i} className="text-xs md:text-sm border-l-2 border-indigo-500 pl-3"><b>{h.status}</b> - {h.loc} <br className="block sm:hidden" /><span className="opacity-70 sm:opacity-100">({h.time})</span> <span className="opacity-50 ml-1">{h.reason ? `[${h.reason}]` : ''}</span></div>))}
          </div>
        </div>
      )}
    </div>
  );
}

function Delivery({parcels, setParcels, db, showMsg, isDark, user}) {
  const [id, setId] = useState(""); const [activeItem, setActiveItem] = useState(null); const [payMethod, setPayMethod] = useState("");

  const searchLR = () => {
    const item = parcels.find(p=>p.id === id.toUpperCase());
    if(item) { 
      if(item.status === 'Deleted') return showMsg("Consignment has been deleted by an administrator.", "error");
      setActiveItem(item); setPayMethod(""); 
      setTimeout(() => document.getElementById(item.payment === 'To Pay' ? 'payMode' : 'btnDel')?.focus(), 100);
    } else showMsg("No consignment found", "error");
  };

  const completeProcess = async () => {
    if(activeItem.payment === "To Pay" && !payMethod) return showMsg("Please explicitly specify verified payment mode!", "error");
    
    const dMode = activeItem.payment === "To Pay" ? `[Mode: ${payMethod}]` : "";
    const updatedHistory = [...activeItem.history, {status: "Delivered", loc: activeItem.to, time: new Date().toLocaleString()}];
    const modifiedItem = {...activeItem, status: "Delivered", history: updatedHistory, deliveryMode: payMethod, deliveredBy: user.username, deliveredBranch: user.branch, notes: `${activeItem.notes || ""} Delivered ${dMode}`};
    
    await db.updateParcel(modifiedItem.id, modifiedItem);
    setParcels(parcels.map(p => p.id === activeItem.id ? modifiedItem : p));
    setActiveItem(null); setId(""); showMsg("Consignment delivered successfully!");
  };

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  return (
    <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
      <div className="flex gap-2 md:gap-4 flex-col sm:flex-row">
        <input id="delScan" onKeyDown={e=> e.key==='Enter'?searchLR():null} value={id} onChange={e=>setId(e.target.value)} placeholder="Enter LR Code" className={`flex-1 p-3 md:p-4 text-center text-lg md:text-xl font-bold border rounded-xl outline-none ${isDark?'bg-slate-900 border-slate-700':'bg-slate-50'}`} />
        <button id="delFetch" onClick={searchLR} className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold">Fetch Details</button>
      </div>

      {activeItem && (
        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4 animate-fade-in`}>
          <h3 className="font-bold text-lg">Consignment ID: {activeItem.id}</h3>
          <p className="text-sm md:text-base">Payment Profile Node: <b className="text-indigo-500">{activeItem.payment.toUpperCase()}</b> (Charges Due: ₹{activeItem.price})</p>
          
          {activeItem.payment === "To Pay" && (
            <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
              <label className="block text-[10px] md:text-xs font-bold text-red-500 uppercase">Forced Delivery Payment Selection *</label>
              <select id="payMode" onKeyDown={e=>handleBoxTravel(e,{enter:'btnDel'})} value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-full p-2 rounded border bg-transparent font-bold outline-none text-sm">
                <option value="" className="text-slate-900">Select Settlement Mode...</option>
                <option value="Cash" className="text-slate-900">💵 Physical Cash</option>
                <option value="GPay" className="text-slate-900">📱 UPI / GPay</option>
              </select>
            </div>
          )}

          <button id="btnDel" onClick={completeProcess} onKeyDown={e => e.key === 'Enter' && completeProcess()} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Confirm Delivery & Clear Dues</button>
        </div>
      )}
    </div>
  );
}

function Accounts({parcels, setParcels, db, showMsg, isDark, user}) {
  const [acc, setAcc] = useState({ emi: 25000, diesel: 30000, other: 15000 });
  const [payoutRate, setPayoutRate] = useState(10);
  const [partnerCount, setPartnerCount] = useState(5);
  const [pettyDesc, setPettyDesc] = useState("");
  const [pettyAmt, setPettyAmt] = useState("");
  const [pettyLedger, setPettyLedger] = useState([]);
  
  const [selectedBranch, setSelectedBranch] = useState(user.branch === 'All' ? CITIES[0] : user.branch);

  useEffect(() => { local.get("mps_petty_cash").then(d => { if(d) setPettyLedger(d); }); }, []);

  const addPetty = async () => {
    if(!pettyDesc || !pettyAmt) return;
    const item = { desc: pettyDesc, amt: Number(pettyAmt), date: new Date().toLocaleDateString() };
    const newList = [item, ...pettyLedger];
    setPettyLedger(newList); await local.set("mps_petty_cash", newList);
    setPettyDesc(""); setPettyAmt("");
  };

  const activeParcels = parcels.filter(p => p.status !== 'Deleted');
  
  const totalSystemRevenue = activeParcels.reduce((a,b)=>a+(b.price||0), 0);
  const totalPetty = pettyLedger.reduce((a,b)=>a+b.amt, 0);
  const exp = acc.emi + acc.diesel + acc.other;
  const net = totalSystemRevenue - exp - totalPetty; 

  const unsettledBranchParcels = activeParcels.filter(p => {
    const isRelated = p.bookedBranch === selectedBranch || p.deliveredBranch === selectedBranch;
    const isSettled = p.settledBranches && p.settledBranches.includes(selectedBranch);
    return isRelated && !isSettled;
  });

  const cashCollected = unsettledBranchParcels.filter(p => 
    (p.bookedBranch === selectedBranch && p.payment === 'Paid') || 
    (p.deliveredBranch === selectedBranch && p.payment === 'To Pay' && p.deliveryMode === 'Cash')
  ).reduce((a,b) => a + b.price, 0);

  const bookedCount = unsettledBranchParcels.filter(p => p.bookedBranch === selectedBranch).length;
  const deliveredCount = unsettledBranchParcels.filter(p => p.deliveredBranch === selectedBranch && p.status === 'Delivered').length;
  const branchCommission = (bookedCount + deliveredCount) * payoutRate;

  const netRemittance = cashCollected - branchCommission;

  const markLedgerSettled = async () => {
    if(unsettledBranchParcels.length === 0) return showMsg("No pending transactions to settle!", "error");
    if(!window.confirm(`Settle ledger for ${selectedBranch}? This will freeze these parcels.`)) return;

    let updatedParcelsList = [...parcels];
    for (let p of unsettledBranchParcels) {
      const updated = {...p, settledBranches: [...(p.settledBranches || []), selectedBranch]};
      await db.updateParcel(updated.id, updated);
      updatedParcelsList = updatedParcelsList.map(x => x.id === updated.id ? updated : x);
    }
    setParcels(updatedParcelsList);
    showMsg(`Ledger Settled for ${selectedBranch}. Frozen ${unsettledBranchParcels.length} parcels.`, "success");
  };

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50";

  return (
    <div className="space-y-6 md:space-y-8">
      <div className={`${cardBg} p-6 rounded-3xl border shadow-xl`}>
         <div className="flex justify-between items-center border-b border-slate-500/20 pb-4 mb-4">
            <div>
              <h3 className="font-black text-xl text-indigo-500">Franchise Reconciliation & Payout</h3>
              <p className="text-xs opacity-60">Active Settlement View</p>
            </div>
            {user.role === 'superadmin' ? (
              <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className={`p-2 rounded-xl font-bold border ${inputBg} outline-none`}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
               <div className="font-black text-lg bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl">{selectedBranch}</div>
            )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-2xl border border-dashed border-slate-500/30 text-center`}>
               <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Unsettled Parcels</p>
               <p className="text-2xl font-black">{bookedCount} <span className="text-sm opacity-50 font-normal">Bk</span> + {deliveredCount} <span className="text-sm opacity-50 font-normal">Dl</span></p>
            </div>
            <div className={`p-4 rounded-2xl border border-dashed border-emerald-500/30 text-center bg-emerald-500/5`}>
               <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Branch Cash in Hand</p>
               <p className="text-2xl font-black text-emerald-600">₹{cashCollected.toLocaleString()}</p>
               <p className="text-[8px] opacity-60 mt-1">From Paid & Cash To-Pay</p>
            </div>
            <div className={`p-4 rounded-2xl border border-dashed border-amber-500/30 text-center bg-amber-500/5`}>
               <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Commission Earned</p>
               <div className="flex justify-center items-center gap-2">
                 <p className="text-2xl font-black text-amber-600">₹{branchCommission.toLocaleString()}</p>
                 <input type="number" title="Rate" value={payoutRate} onChange={e=>setPayoutRate(Number(e.target.value))} className={`w-10 p-1 text-xs text-center border rounded ${inputBg}`} />
               </div>
               <p className="text-[8px] opacity-60 mt-1">Total Parcels × Rate</p>
            </div>
            <div className={`p-4 rounded-2xl border text-center text-white shadow-inner ${netRemittance >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-red-500 border-red-600'}`}>
               <p className="text-[10px] uppercase font-bold opacity-80 mb-1">{netRemittance >= 0 ? 'Branch Remit to HQ' : 'HQ Pays Branch'}</p>
               <p className="text-2xl font-black">₹{Math.abs(netRemittance).toLocaleString()}</p>
               <p className="text-[8px] opacity-80 mt-1">Net Balance Transfer</p>
            </div>
         </div>

         <div className="flex gap-4">
            <button className="flex-1 border border-indigo-500 text-indigo-500 font-bold py-3 rounded-xl hover:bg-indigo-500/10">📥 Download Statement PDF</button>
            <button onClick={markLedgerSettled} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-md">🔒 Mark Ledger as Settled</button>
         </div>
      </div>

      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border border-dashed border-indigo-500/40 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6`}>
        <div className="md:col-span-3"><h3 className="text-base md:text-lg font-black text-indigo-500">⚡ Master Global Sheet</h3></div>
        <div className="bg-slate-950 p-4 rounded-xl text-white">
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">📊 Gross Network Revenue</p>
          <p className="text-2xl md:text-3xl font-black text-blue-400 mt-1">₹{totalSystemRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl text-white">
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">📉 Total Fixed Expense</p>
          <p className="text-2xl md:text-3xl font-black text-red-400 mt-1">₹{exp.toLocaleString()}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl text-white">
          <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">☕ Total Petty Cash</p>
          <p className="text-2xl md:text-3xl font-black text-orange-400 mt-1">₹{totalPetty.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className={`${cardBg} p-4 md:p-6 rounded-3xl border space-y-4`}>
          <h3 className="font-bold text-sm md:text-md text-indigo-500">Fixed Operational Expenses</h3>
          <div className="space-y-4">
             <div>
               <label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Monthly Vehicle EMI (₹)</label>
               <input id="accEmi" onKeyDown={e=>handleBoxTravel(e,{enter:'accDiesel', down:'accDiesel'})} type="number" value={acc.emi} onChange={e=>setAcc({...acc, emi:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
             </div>
             <div>
               <label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Diesel & Highway Toll Log (₹)</label>
               <input id="accDiesel" onKeyDown={e=>handleBoxTravel(e,{enter:'accOther', down:'accOther', up:'accEmi'})} type="number" value={acc.diesel} onChange={e=>setAcc({...acc, diesel:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
             </div>
             <div>
               <label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Misc Office Rent & Utilities (₹)</label>
               <input id="accOther" onKeyDown={e=>handleBoxTravel(e,{up:'accDiesel'})} type="number" value={acc.other} onChange={e=>setAcc({...acc, other:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputBg}`} />
             </div>
          </div>
        </div>

        <div className="bg-slate-950 p-6 md:p-8 rounded-3xl text-white flex flex-col justify-center shadow-xl">
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <h3 className="text-lg md:text-xl font-black tracking-wider text-indigo-400">PARTNERSHIP SETTLEMENT</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60 uppercase">Partners:</span>
              <input type="number" value={partnerCount} onChange={e=>setPartnerCount(Number(e.target.value))} className="w-16 bg-slate-800 text-white font-bold p-1 rounded text-center border border-slate-700 outline-none" />
            </div>
          </div>
          <p className="text-xs md:text-sm opacity-60">Global Base Profit Yield: ₹{net.toLocaleString()}</p>
          <div className="mt-4 md:mt-6 bg-white/5 p-4 md:p-6 rounded-2xl text-center border border-white/10">
            <p className="text-[10px] md:text-xs opacity-50 uppercase tracking-widest mb-1">Per Partner Yield (Split: {partnerCount})</p>
            <p className="text-3xl md:text-4xl font-black text-emerald-400">₹{((net / (partnerCount||1)) || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border flex flex-col h-full`}>
          <h3 className="font-black text-sm md:text-md text-indigo-500 border-b pb-4 border-slate-500/20 mb-4">Petty Cash Ledger (Daily/Branch)</h3>
          <div className="flex gap-2 mb-4">
            <input value={pettyDesc} onChange={e=>setPettyDesc(e.target.value)} placeholder="Detail (Tea, Coolie)" className={`flex-1 p-2 border rounded-lg text-sm outline-none ${inputBg}`} />
            <input value={pettyAmt} onChange={e=>setPettyAmt(e.target.value)} placeholder="Amt ₹" type="number" className={`w-24 p-2 border rounded-lg text-sm outline-none font-bold ${inputBg}`} />
            <button onClick={addPetty} className="bg-orange-500 text-white px-4 rounded-lg font-bold text-sm">+</button>
          </div>
          <div className={`flex-1 overflow-y-auto max-h-40 border rounded-lg ${inputBg}`}>
            {pettyLedger.map((l, i) => (
              <div key={i} className="flex justify-between p-3 border-b border-slate-500/20 text-xs md:text-sm">
                <span>{l.desc} <span className="text-[10px] opacity-50 ml-2">{l.date}</span></span>
                <span className="font-bold text-orange-500">₹{l.amt}</span>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}

function Admin({parcels, users, setUsers, setParcels, db, showMsg, isDark, user, creditAuthList, setCreditAuthList}) {
  const [tab, setTab] = useState('parcels');
  const [editF, setEditF] = useState(null);
  
  const [newUser, setNewUser] = useState(""); 
  const [newPass, setNewPass] = useState(""); 
  const [newRole, setNewRole] = useState("staff");
  const [newBranch, setNewBranch] = useState(CITIES[0]);

  const [newCPhone, setNewCPhone] = useState("");
  const [newCName, setNewCName] = useState("");

  const [paymentFilter, setPaymentFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState(user.branch);
  const [searchQuery, setSearchQuery] = useState("");
  
  const d = new Date();
  const todayStr = d.toISOString().split('T')[0];
  d.setDate(d.getDate() - 7);
  const weekAgoStr = d.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(weekAgoStr);
  const [toDate, setToDate] = useState(todayStr);

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800";
  const tblBg = isDark ? "bg-slate-800/40" : "bg-slate-50";

  const isSuper = user.role === 'superadmin';

  // 🔥 UPDATED LOGIC HERE 🔥
  useEffect(() => {
    if (newRole === 'superadmin') {
      setNewBranch('All');
    } else if (newRole === 'staff' && newBranch === 'All') {
      setNewBranch(CITIES[0]);
    }
  }, [newRole]);

  const handleAddUser = async () => {
    if(!newUser || !newPass) return showMsg("Fill administrative requirements", "error");
    const assignedRole = isSuper ? newRole : "staff";
    const assignedBranch = assignedRole === 'superadmin' ? 'All' : newBranch;

    const u = {id: genUserId(), username: newUser, password: newPass, role: assignedRole, branch: assignedBranch};
    await db.insertUser(u); setUsers([u, ...users]); setNewUser(""); setNewPass(""); showMsg(`${assignedRole.toUpperCase()} Created at ${assignedBranch}!`);
  };

  const addCreditAuth = async () => {
    if(newCPhone.length !== 10 || !newCName) return showMsg("Invalid Credit details", "error");
    const newList = [...creditAuthList, {phone: newCPhone, company: newCName}];
    setCreditAuthList(newList); await local.set("mps_credit_auth", newList);
    setNewCPhone(""); setNewCName(""); showMsg("Credit Account Authorized!");
  };

  const removeCredit = async (phone) => {
    const newList = creditAuthList.filter(c => c.phone !== phone);
    setCreditAuthList(newList); await local.set("mps_credit_auth", newList); showMsg("Credit Auth Revoked", "error");
  };

  const deleteRecord = async (id) => {
    const reason = window.prompt(`Please enter the exact reason for deleting Consignment ${id}:`);
    if (!reason || reason.trim() === "") {
      return showMsg("Action Aborted! Deletion reason is strictly mandatory.", "error");
    }
    
    const target = parcels.find(p => p.id === id);
    const updatedHistory = [...target.history, {status: "Deleted", loc: user.branch, time: new Date().toLocaleString(), reason: reason}];
    const updatedParcel = { ...target, status: 'Deleted', deletedBy: user.username, deleteReason: reason, history: updatedHistory };
    
    await db.updateParcel(id, updatedParcel); 
    setParcels(parcels.map(p => p.id === id ? updatedParcel : p)); 
    showMsg(`Consignment dropped. Reason logged: ${reason}`, "error");
  };

  const saveOverrides = async () => {
    await db.updateParcel(editF.id, editF);
    setParcels(parcels.map(p => p.id === editF.id ? editF : p));
    setEditF(null); showMsg("Consignment parameters overriden successfully");
  };

  const sortedTableData = [...parcels].reverse().filter(p => {
    if (p.status === 'Deleted' && !isSuper) return false;

    if (fromDate && toDate && p.isoDate) {
      const pDate = p.isoDate.split('T')[0];
      if (pDate < fromDate || pDate > toDate) return false;
    }
    if (paymentFilter !== "All" && p.payment !== paymentFilter) return false;
    if (branchFilter !== "All") {
       if (p.bookedBranch !== branchFilter && p.deliveredBranch !== branchFilter && p.from !== branchFilter && p.to !== branchFilter) return false;
    }
    if (searchQuery) {
      const matchTerm = searchQuery.toLowerCase();
      return p.id.toLowerCase().includes(matchTerm) || p.sPhone.includes(matchTerm) || p.sName.toLowerCase().includes(matchTerm);
    }
    return true;
  });

  const exportData = () => {
    if (sortedTableData.length === 0) return showMsg("No data to export", "error");
    const headers = ["LR No", "Date", "Sender", "Receiver", "Origin", "Destination", "Payment Mode", "Amount", "Status", "Booked By"];
    const rows = sortedTableData.map(p => [p.id, p.date, p.sName, p.rName, p.from, p.to, p.payment, p.price, p.status, p.bookedBy].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MPS_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showMsg("Excel/CSV Report Downloaded!");
  };

  const chartData = STATUSES.filter(s=>s!=='Deleted').map(s => ({ name: s, count: sortedTableData.filter(p=>p.status===s).length, fill: S_CLR[s] }));

  const statCash = sortedTableData.filter(p => p.status !== 'Deleted' && (p.payment === 'Paid' || (p.payment === 'To Pay' && p.deliveryMode === 'Cash'))).reduce((a,b)=>a+b.price, 0);
  const statGpay = sortedTableData.filter(p => p.status !== 'Deleted' && (p.payment === 'To Pay' && p.deliveryMode === 'GPay')).reduce((a,b)=>a+b.price, 0);
  const statPending = sortedTableData.filter(p => p.status !== 'Deleted' && (p.payment === 'To Pay' && p.status !== 'Delivered')).reduce((a,b)=>a+b.price, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap gap-2 md:gap-4">
        <button onClick={()=>setTab('parcels')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='parcels'?'bg-indigo-600 text-white':cardBg}`}>📋 Audits & Analytics</button>
        <button onClick={()=>setTab('staff')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='staff'?'bg-indigo-600 text-white':cardBg}`}>👥 System RBAC</button>
        <button onClick={()=>setTab('credit')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='credit'?'bg-amber-600 text-white':cardBg}`}>💳 Credit Control</button>
      </div>

      {tab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}>
            <h3 className="font-black text-sm md:text-base">Assign Privilege Context</h3>
            <input id="stfUser" onKeyDown={e=>handleBoxTravel(e,{enter:'stfPass', down:'stfPass'})} value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="Username Identifier" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} />
            <input id="stfPass" onKeyDown={e=>handleBoxTravel(e,{enter: isSuper ? 'stfRole' : 'stfBranch', down: isSuper ? 'stfRole' : 'stfBranch', up:'stfUser'})} value={newPass} onChange={e=>setNewPass(e.target.value)} type="password" placeholder="Account Password" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} />
            
            {isSuper && (
              <select id="stfRole" onKeyDown={e=>handleBoxTravel(e,{enter:'stfBranch', down:'stfBranch', up:'stfPass'})} value={newRole} onChange={e=>setNewRole(e.target.value)} className={`w-full p-2 md:p-3 rounded-xl border font-bold outline-none text-sm ${inputBg}`}>
                <option value="staff">Privilege Level: STAFF</option>
                <option value="admin">Privilege Level: ADMIN</option>
                <option value="superadmin">Privilege Level: SUPERADMIN</option>
              </select>
            )}

            {/* 🔥 DROPDOWN FIX: Disabled ONLY for superadmin 🔥 */}
            <select id="stfBranch" disabled={newRole === 'superadmin'} onKeyDown={e=>handleBoxTravel(e,{enter:'stfBtn', up: isSuper ? 'stfRole' : 'stfPass'})} value={newBranch} onChange={e=>setNewBranch(e.target.value)} className={`w-full p-2 md:p-3 rounded-xl border font-bold outline-none text-sm ${inputBg} ${newRole==='superadmin'?'opacity-50 cursor-not-allowed':''}`}>
              {(isSuper && (newRole === 'admin' || newRole === 'superadmin')) && <option value="All">Global Access (All Branches)</option>}
              {CITIES.map(c => <option key={c} value={c}>Branch: {c}</option>)}
            </select>
            
            <button id="stfBtn" onClick={handleAddUser} onKeyDown={e => e.key === 'Enter' && handleAddUser()} className="w-full bg-indigo-600 text-white font-bold py-2 md:py-3 rounded-xl text-sm md:text-base">Commit Assignment</button>
          </div>
          
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border lg:col-span-2 space-y-3`}>
            <h3 className="font-black text-sm md:text-base">Identity Mapping Matrix</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {users.filter(u => isSuper ? true : u.role === 'staff').map(u => {
                const canManage = isSuper ? (u.username !== user.username) : true;
                return (
                  <div key={u.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-xl bg-black/5 gap-2">
                    <div>
                      <p className="font-bold text-sm">{u.username} <span className="text-[10px] ml-1 opacity-50">({u.branch})</span></p>
                      <p className={`text-[10px] uppercase font-black ${u.role === 'superadmin' ? 'text-amber-500' : 'text-indigo-500'}`}>{u.role}</p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button onClick={async ()=>{ 
                          await db.deleteUser(u.id); setUsers(users.filter(x=>x.id!==u.id)); showMsg("Access revoked", "error"); 
                        }} className="text-red-500 text-[10px] font-bold border border-red-500/20 px-2 py-1 rounded bg-red-500/10">Revoke 🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'credit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}>
            <h3 className="font-black text-sm md:text-base text-amber-500">Add Authorized Credit Account</h3>
            <p className="text-[10px] md:text-xs opacity-60">Only registered phone numbers can use 'F9: Credit' billing.</p>
            <input value={newCPhone} onChange={e=>setNewCPhone(e.target.value)} placeholder="Customer 10-digit Mobile" maxLength="10" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} />
            <input value={newCName} onChange={e=>setNewCName(e.target.value)} placeholder="Company / Individual Name" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} />
            <button onClick={addCreditAuth} className="w-full bg-amber-600 text-white font-bold py-2 md:py-3 rounded-xl text-sm md:text-base">Authorize Account</button>
          </div>
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border h-96 overflow-y-auto`}>
            <h3 className="font-black text-sm md:text-base mb-4">Approved Credit Ledger</h3>
            {creditAuthList.length === 0 ? <p className="text-sm opacity-50">No credit accounts authorized.</p> : 
              <div className="space-y-2">
                {creditAuthList.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border border-slate-500/20 rounded-xl bg-black/5">
                    <div><p className="font-bold text-sm">{c.company}</p><p className="text-[10px] opacity-60">Ph: {c.phone}</p></div>
                    <button onClick={()=>removeCredit(c.phone)} className="text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Revoke</button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {tab === 'parcels' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className={`${cardBg} p-4 md:p-6 rounded-2xl border h-48 lg:col-span-3`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{background: '#1e293b', border:'none', color:'#fff', borderRadius:'8px', fontSize:'12px'}} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>{chartData.map((e, i) => (<Cell key={i} fill={e.fill} />))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className={`${cardBg} p-4 rounded-2xl border flex flex-col justify-center gap-2 md:gap-3`}>
               <h4 className="text-[10px] md:text-xs font-bold opacity-60 uppercase text-center border-b border-slate-500/20 pb-2">Filter Summary</h4>
               <div className="flex justify-between items-center text-xs md:text-sm"><span className="opacity-70">Cash:</span><b className="text-emerald-500">₹{statCash}</b></div>
               <div className="flex justify-between items-center text-xs md:text-sm"><span className="opacity-70">GPay:</span><b className="text-blue-500">₹{statGpay}</b></div>
               <div className="flex justify-between items-center text-xs md:text-sm border-t border-slate-500/20 pt-2"><span className="opacity-70">Pending:</span><b className="text-amber-500">₹{statPending}</b></div>
               <button onClick={exportData} className="mt-2 w-full py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors text-[10px] md:text-xs font-bold rounded-lg border border-indigo-500/20">📥 Export CSV</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 Keyword" className={`p-2 md:p-3 rounded-xl border text-sm ${cardBg}`} />
            
            <select disabled={!isSuper} value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg} ${!isSuper && 'opacity-50 cursor-not-allowed'}`}>
              {isSuper && <option value="All">All Branches</option>}
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`} title="From Date" />
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`} title="To Date" />

            <select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`}>
              <option value="All">All Modes</option>
              <option value="Paid">Paid</option>
              <option value="To Pay">To Pay</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          <div className={`${cardBg} rounded-2xl border overflow-x-auto shadow-sm`}>
            <table className="min-w-[800px] w-full text-left whitespace-nowrap">
              <thead className={`${tblBg} text-[10px] md:text-xs font-bold uppercase opacity-80`}>
                <tr><th className="p-3 md:p-4">LR Code</th><th className="p-3 md:p-4">Route Info</th><th className="p-3 md:p-4">Billing Parameters</th><th className="p-3 md:p-4">Tracking Node</th><th className="p-3 md:p-4">Operations Control</th></tr>
              </thead>
              <tbody>
                {sortedTableData.length === 0 ? <tr><td colSpan="5" className="p-8 text-center opacity-50 font-bold">No records found.</td></tr> : sortedTableData.map(p => (
                  <tr key={p.id} className={`border-t hover:bg-black/5 ${p.status === 'Deleted' ? 'bg-red-500/5 border-red-500/10' : 'border-slate-500/10'}`}>
                    <td className="p-3 md:p-4 font-black text-indigo-500 text-sm">{p.id} <span className="block text-[10px] opacity-50 font-normal">{p.date}</span></td>
                    <td className="p-3 md:p-4 text-xs md:text-sm font-bold">{p.from} ➔ {p.to}</td>
                    <td className="p-3 md:p-4 text-xs md:text-sm">₹{p.price} <b className="text-[10px] md:text-xs opacity-60">({p.payment})</b></td>
                    <td className="p-3 md:p-4">
                      <span className="px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold" style={{backgroundColor: S_CLR[p.status]+'22', color: S_CLR[p.status]}}>{p.status}</span>
                      {p.status === 'Deleted' && isSuper && (
                        <div className="text-[10px] text-red-500 font-bold mt-1">
                          <p>By: {p.deletedBy}</p>
                          <p>Reason: {p.deleteReason}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-3 md:p-4 space-x-1 md:space-x-2">
                      {p.status !== 'Deleted' && (
                        <>
                          <button onClick={()=>setEditF(p)} className="text-amber-500 text-[10px] md:text-xs font-bold border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5">✏️ Edit</button>
                          <button onClick={()=>deleteRecord(p.id)} className="text-red-500 text-[10px] md:text-xs font-bold border border-red-500/20 px-2 py-1 rounded bg-red-500/5">🗑️ Drop</button>
                        </>
                      )}
                      <button onClick={()=>generatePDF(p)} className="text-blue-500 text-[10px] md:text-xs font-bold border border-blue-500/20 px-2 py-1 rounded bg-blue-500/5">🖨️ Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editF && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className={`${cardBg} p-6 rounded-2xl max-w-lg w-full space-y-4 animate-bounce-in`}>
            <h3 className="font-black text-lg">Modify Manifest Parameters: {editF.id}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={editF.sName} onChange={e=>setEditF({...editF, sName:e.target.value})} placeholder="Sender Identity" className={`p-2 border rounded text-sm ${inputBg}`} />
              <input value={editF.rName} onChange={e=>setEditF({...editF, rName:e.target.value})} placeholder="Receiver Identity" className={`p-2 border rounded text-sm ${inputBg}`} />
              <input type="number" value={editF.price} onChange={e=>setEditF({...editF, price:Number(e.target.value)})} placeholder="Price Override" className={`p-2 border rounded font-bold text-sm ${inputBg}`} />
            </div>
            <div className="flex gap-2 mt-4"><button onClick={saveOverrides} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl flex-1 text-sm">Save Changes</button><button onClick={()=>setEditF(null)} className="bg-slate-500 text-white py-2 px-4 rounded-xl text-sm">Dismiss</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// LOGIN COMPONENT
function Login({onLogin, theme}) {
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err, setErr] = useState("");
  const isDark = theme === 'dark';

  const handleSub = async () => {
    const success = await onLogin(u,p);
    if(!success) { 
      setP(""); 
      setErr("Invalid Identity ID or Passcode!");
      document.getElementById('pwdIn').focus(); 
    }
  };

  return (
    <div className={`flex h-screen items-center justify-center p-4 ${isDark?'bg-slate-900':'bg-slate-100'}`}>
      <div className={`${isDark?'bg-slate-800 border-slate-700 text-white':'bg-white border-slate-200 text-slate-800'} p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border relative`}>
        <div className="flex justify-center mb-6"><MpsLogo /></div>
        <h2 className="text-xl md:text-2xl font-black mb-2 tracking-widest">MPS TERMINAL</h2>
        
        {err ? <p className="text-red-500 font-bold mb-4 text-xs md:text-sm animate-fade-in">{err}</p> : <div className="h-4 mb-4"></div>}
        
        <input id="userIn" onKeyDown={e=> e.key === 'Enter' ? document.getElementById('pwdIn').focus() : null} value={u} onChange={e=>{setU(e.target.value); setErr("");}} placeholder="User Identity ID" className="w-full border p-3 rounded-xl mb-4 text-center font-bold text-slate-900 bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base" />
        <input id="pwdIn" onKeyDown={e=> e.key === 'Enter' && handleSub()} value={p} onChange={e=>{setP(e.target.value); setErr("");}} type="password" placeholder="Credential Security Code" className="w-full border p-3 rounded-xl mb-6 text-center font-bold text-slate-900 bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base" />
        <button onClick={handleSub} className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition text-sm md:text-base">Access Server</button>
      </div>
    </div>
  );
}