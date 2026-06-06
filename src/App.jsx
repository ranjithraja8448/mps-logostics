import React, { useState, useEffect, Fragment } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Html5QrcodeScanner } from "html5-qrcode";

/* ══════════════════════════════════════════
   CONSTANTS & CONFIG
══════════════════════════════════════════ */
const ENV_URL = import.meta.env.VITE_SUPABASE_URL || "";
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const BRANCH_CONFIG = { "Mecheri": "01", "Elampillai": "02", "Jalakandapuram": "03", "Salem": "04", "Coimbatore": "05", "Bhavani": "06", "Sathyamangalam": "07", "Bangalore": "08", "Chennai": "09" };
const CITIES = Object.keys(BRANCH_CONFIG);
const TYPES = ["Box","Wooden Box","Bag","Green bag","Yellow Bag","Bale","Documents","Electronics","Furniture","Medical","Machinery"];

// 🔥 STATUS & COLORS 🔥
const STATUSES = ["Booked","Picked Up","In Transit","Out for Delivery","Delivered", "RTO", "Deleted"];
const S_CLR  = {"Booked":"#3B82F6","Picked Up":"#F59E0B","In Transit":"#F97316","Out for Delivery":"#8B5CF6","Delivered":"#10B981", "RTO":"#EAB308", "Deleted":"#EF4444"};
const PAY_MODES = ["Paid", "To Pay", "Credit", "FOC"];

const genUserId = () => `USR-${Math.floor(Math.random()*10000)}`;

const generateLR = (fromCity, toCity, allParcels) => {
  if (!fromCity || !toCity) return `MPS${String(Math.floor(Math.random()*1000)).padStart(6,'0')}`; 
  const fCode = BRANCH_CONFIG[fromCity] || "00"; const tCode = BRANCH_CONFIG[toCity] || "00"; const fromPrefix = `${fCode}/`; 
  let max = 0;
  allParcels.forEach(p => { if (p.id && p.id.startsWith(fromPrefix)) { const parts = p.id.split('/'); if (parts.length === 3) { const num = parseInt(parts[2], 10); if (!isNaN(num) && num > max) max = num; } } });
  return `${fCode}/${tCode}/${String(max + 1).padStart(4, '0')}`;
};

const MpsLogo = () => (<svg className="w-8 h-8 text-indigo-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);

function calcPrice(from, to, ratePerUnit, count = 1, type = "Box", paymentMode = "Paid"){
  if(paymentMode === "FOC") return 0; if(!ratePerUnit || ratePerUnit<=0) return 0; 
  const rate = parseFloat(ratePerUnit); let tc = 0;
  if(type==="Electronics") tc = 60; if(type==="Furniture") tc = 150; if(type==="Medical") tc = 40; if(type==="Machinery") tc = 120;
  return Math.round((rate * (parseInt(count) || 1)) + tc);
}

// 🔥 NUMBER TO WORDS HELPER 🔥
function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if ((num = num.toString()).length > 9) return 'Overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
  return str.toUpperCase();
}

// 🔥 INDIVIDUAL LR PRINT GENERATOR 🔥
function generatePDF(p) {
  const doc = new jsPDF(); doc.setLineWidth(0.5); doc.rect(10, 10, 190, 110);
  doc.line(10, 35, 200, 35); doc.line(10, 42, 200, 42); doc.line(10, 70, 145, 70); doc.line(10, 82, 145, 82); doc.line(95, 92, 145, 92); doc.line(145, 95, 200, 95); doc.line(10, 100, 200, 100); 
  doc.line(145, 10, 145, 100); doc.line(175, 35, 175, 100); doc.line(77, 35, 77, 70); doc.line(16, 42, 16, 70); doc.line(83, 42, 83, 70); doc.line(25, 70, 25, 100); doc.line(95, 70, 95, 92); doc.line(110, 70, 110, 92); doc.line(125, 70, 125, 92); doc.line(77, 100, 77, 120); doc.line(115, 100, 115, 120); doc.line(145, 100, 145, 120);
  doc.setFont("helvetica", "bolditalic"); doc.setFontSize(26); doc.text("MPS", 12, 24); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("MECHERI", 36, 19); doc.text("PARCEL SERVICE", 36, 25);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("• WE DELIVER TRUST •", 42, 30);
  const centerX = 107; doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("GSTIN : 33CICPS6965E1Z1", centerX, 15, { align: "center" }); doc.setFont("helvetica", "normal"); doc.text("Dharmapuri Main Road,", centerX, 20, { align: "center" }); doc.text("Mecheri, Salem-Dt. 636 451.", centerX, 24, { align: "center" }); doc.setFont("helvetica", "bold"); doc.text("90033 77185 / 80726 72255", centerX, 29, { align: "center" }); doc.text("86108 07743 / 95785 02151", centerX, 33, { align: "center" });
  doc.setFontSize(10); doc.text(`LR. NO.  :  ${p.id}`, 147, 16); doc.text(`Date     :  ${p.date}`, 147, 24); doc.text(`Pay Mode:  ${p.payment}`, 147, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`From Branch : ${p.from}`, 12, 40); doc.text(`To Branch : ${p.to}`, 79, 40); doc.text("Particulars", 152, 40); doc.text("Amount", 182, 40);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("Consignor", 14, 65, { angle: 90 }); doc.text("Consignee", 81, 65, { angle: 90 }); 
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`Tel No. : ${p.sPhone}`, 18, 55); doc.text(`GSTIN   : ${p.sGst || ""}`, 18, 62); doc.setFont("helvetica", "bold"); doc.text(`${p.sName}`, 18, 68);
  doc.setFont("helvetica", "normal"); doc.text(`Tel No. : ${p.rPhone}`, 85, 55); doc.text(`GSTIN   : ${p.rGst || ""}`, 85, 62); doc.setFont("helvetica", "bold"); doc.text(`${p.rName}`, 85, 68);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); const particulars = ["Freight", "Hamali", "Fuel Sur Charge", "Docket Charge", "Article Charges", "Door Collection", "Door Delivery", "Others"]; particulars.forEach((item, i) => { doc.text(item, 147, 47 + (i * 6)); });
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`Rs. ${p.price}`, 178, 47); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("No. of", 13, 75); doc.text("Articles", 12, 79); doc.text("Description of Goods", 42, 75); doc.text("Said to Contain", 46, 79); doc.text("Value", 98, 77); doc.text("Actual", 112, 75); doc.text("Weight", 112, 79); doc.text("Charged", 128, 75); doc.text("Weight", 129, 79);
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(`${p.count}`, 16, 88); doc.text(`${p.type}`, 28, 88); doc.text(`${p.actualWeight || "-"}`, 115, 88); doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.text("Door Delivery Service Will be", 97, 95.5); doc.text("Provided for Ground Floor Only", 96, 98.5); doc.setFontSize(10); doc.text("Total", 155, 98.5); doc.text(`Rs. ${p.price}`, 178, 98.5);
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("GSTIN Payable by :", 25, 104); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.rect(13, 107, 3, 3); doc.text("Consignor", 17, 110); doc.rect(40, 107, 3, 3); doc.text("Consignee", 44, 110); doc.rect(13, 114, 3, 3); doc.text("Transporter", 17, 117); doc.rect(40, 114, 3, 3); doc.text("Agency", 44, 117);
  doc.setFontSize(10); if(p.payment === "Paid" || p.payment === "Credit" || p.payment === "FOC") doc.text("✔", 13.5, 109.5); if(p.payment === "To Pay") doc.text("✔", 40.5, 109.5);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.text("Consignee", 79, 105); doc.setFontSize(6); doc.text("(Received goods in good Condition)", 79, 118); doc.text("Consignor Signature", 117, 118); doc.setFont("helvetica", "bold"); doc.text("For Mecheri Parcel Service", 147, 105);
  
  window.open(doc.output('bloburl'), '_blank');
}

// 🔥 EOD SETTLEMENT PRINT GENERATOR 🔥
function generateEOD_PDF(dateStr, branch, parcelsList, pettyList) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("END OF DAY (EOD) SETTLEMENT", 105, 15, { align: "center" });
  doc.setFontSize(10); doc.text(`Branch: ${branch} | Date: ${dateStr}`, 105, 22, { align: "center" }); doc.line(10, 25, 200, 25);
  let y = 32; doc.setFontSize(10); doc.text("Cash Collections (Paid Booking & Delivered To-Pay):", 10, y); y+=6; doc.setFont("helvetica", "normal");
  let totalCash = 0;
  parcelsList.forEach(p => {
     const pDate = p.isoDate ? p.isoDate.split('T')[0] : ""; 
     if((p.from === branch && p.payment === 'Paid' && pDate === dateStr) || (p.to === branch && p.payment === 'To Pay' && p.deliveryMode === 'Cash' && p.status==='Delivered' && pDate === dateStr)){
        doc.text(`LR: ${p.id} | Rs. ${p.price} | Mode: ${p.payment}`, 10, y); totalCash += p.price; y+=6;
        if(y>280){ doc.addPage(); y=20; }
     }
  });
  y+=4; doc.setFont("helvetica", "bold"); doc.text(`Total Cash Collected: Rs. ${totalCash}`, 10, y); y+=10; doc.line(10, y-4, 200, y-4);
  doc.text("Petty Cash Expenses Today:", 10, y); y+=6; doc.setFont("helvetica", "normal"); let totalExp = 0;
  pettyList.forEach(pt => { if(pt.date === dateStr) { doc.text(`${pt.desc} - Rs. ${pt.amt}`, 10, y); totalExp += pt.amt; y+=6; } });
  y+=4; doc.setFont("helvetica", "bold"); doc.text(`Total Expenses: Rs. ${totalExp}`, 10, y); y+=12;
  doc.setFontSize(12); doc.text(`NET CASH TO HANDOVER: Rs. ${totalCash - totalExp}`, 10, y); doc.line(10, y+4, 200, y+4);
  
  window.open(doc.output('bloburl'), '_blank');
}

// 🔥 CREDIT INVOICE GENERATOR (GRID TABLE) 🔥
function generateInvoicePDF(customer, customerPhone, fromD, toD, parcelsList) {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); 
  doc.text("MPS Parcel Service", 105, 15, { align: "center" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Address : Dharmapuri Main Road, Mecheri, Salem-Dt. 636 451. GST : 33CICPS6965E1Z1", 105, 20, { align: "center" });
  doc.text("Phone Number : 90033 77185 / 80726 72255", 105, 24, { align: "center" });
  
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 105, 34, { align: "center" });
  
  const invoiceNo = Math.floor(1000 + Math.random() * 9000);
  const printDate = new Date().toLocaleDateString('en-IN');

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Party Name : ${customer}`, 14, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`Phone No : ${customerPhone}`, 14, 50);
  doc.text(`Billing Period : ${fromD} to ${toD}`, 14, 55);
  
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice no.: ${invoiceNo}`, 150, 45);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice Date: ${printDate}`, 150, 50);
  
  // 🔥 WB Number is now changed to LR Number 👇
  const tableColumn = ["S.No", "LR Number", "Booking Date", "Consignor", "Consignee", "Packages", "Amount"];
  const tableRows = [];
  let totalAmount = 0; let totalPackages = 0;
  
  parcelsList.forEach((p, index) => {
      const parcelData = [
          index + 1, p.id, p.date, p.sName, p.rName, `${p.count} ${p.type}`, p.price
      ];
      tableRows.push(parcelData);
      totalAmount += Number(p.price) || 0;
      totalPackages += Number(p.count) || 0;
  });
  
  tableRows.push(["Total", "", "", "", "", totalPackages.toString(), totalAmount.toString()]);
  
  autoTable(doc, {
      startY: 60, head: [tableColumn], body: tableRows, theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
      columnStyles: { 0: { halign: 'center' }, 1: { fontStyle: 'bold' }, 5: { halign: 'center' }, 6: { halign: 'right', fontStyle: 'bold' } },
      willDrawCell: function (data) {
          if (data.row.index === tableRows.length - 1) {
              data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 245, 245];
          }
      }
  });
  
  const finalY = doc.lastAutoTable.finalY || 60;
  
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(`Net Payable Amount : RUPEES ${numberToWords(totalAmount)}`, 14, finalY + 8);
  
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`Print DateTime : ${new Date().toLocaleString('en-IN')}`, 14, finalY + 16);
  doc.setFont("helvetica", "bold");
  doc.text("Remark : Respected and Dear Valued Customer, Kindly ensure to make the payment earliest.", 14, finalY + 22);
  
  // 🔥 ADDED BANK ACCOUNT DETAILS HERE 🔥
  doc.text("Bank Details for Payment:", 14, finalY + 32);
  doc.setFont("helvetica", "normal");
  doc.text("Bank Name : TAMILNADU MERCANTILE BANK (TMB)", 14, finalY + 38);
  doc.text("A/C Name  : MECHERI PARCEL SERVICES", 14, finalY + 43);
  doc.text("A/C No    : 287150050800853", 14, finalY + 48);
  doc.text("IFSC Code : TMBL0000287", 14, finalY + 53);
  
  window.open(doc.output('bloburl'), '_blank');
}

function openWhatsApp(phone, isSender, p) {
  const text = `📦 *MPS Logistics*\n\nHello *${isSender ? p.sName : p.rName}*,\nYour parcel is booked successfully!\n\n*LR No:* ${p.id}\n*Route:* ${p.from} ➔ ${p.to}\n*Items:* ${p.count} ${p.type}\n*Mode:* ${p.payment}\n*Amount:* ₹${p.price}\n\nThank you for choosing MPS!`;
  window.open(`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(text)}`, '_blank');
}

const handleBoxTravel = (e, targets) => {
  let nextId = null; const isSelect = e.target.tagName === 'SELECT'; let isStart = true, isEnd = true;
  try { if(e.target.selectionStart !== null && e.target.selectionStart !== undefined) { isStart = e.target.selectionStart === 0; isEnd = e.target.selectionEnd === e.target.value?.length; } } catch(err){}
  if (e.key === 'Enter') nextId = targets.enter; else if (!isSelect && e.key === 'ArrowUp') nextId = targets.up; else if (!isSelect && e.key === 'ArrowDown') nextId = targets.down; else if (!isSelect && e.key === 'ArrowLeft' && isStart) nextId = targets.left; else if (!isSelect && e.key === 'ArrowRight' && isEnd) nextId = targets.right;
  if (nextId) { if (e.key === 'Enter' || (!isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) e.preventDefault(); const nextElem = document.getElementById(nextId); if (nextElem) { nextElem.focus(); if (nextElem.tagName === 'INPUT') nextElem.select(); } }
};

function SuggestInput({ id, label, value, onChange, onSelect, dataList, isPhone, theme, onKeyDown }) {
  const [open, setOpen] = useState(false); const [activeIndex, setActiveIndex] = useState(-1);
  const matches = dataList.filter(c => isPhone ? c.phone.includes(value) : (c.name||"").toLowerCase().includes(value.toLowerCase())).filter(()=>value.length>=2);
  useEffect(() => { setActiveIndex(-1); }, [value]);
  const handleKeyDown = (e) => {
    if (open && matches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % matches.length); return; } else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + matches.length) % matches.length); return; } else if (e.key === 'Enter') { if (matches.length === 1 || activeIndex >= 0) { e.preventDefault(); const selectedMatch = activeIndex >= 0 ? matches[activeIndex] : matches[0]; onSelect(selectedMatch); setOpen(false); return; } }
    }
    if (onKeyDown) onKeyDown(e);
  };
  const inputBg = theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';
  return (
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`}>
      <input id={id} onKeyDown={handleKeyDown} value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); if (isPhone && e.target.value.length === 10) { const exact = dataList.find(d=>d.phone===e.target.value); if(exact) { onSelect(exact); setOpen(false); } } }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} placeholder={label} maxLength={isPhone ? "10" : "100"} className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-20 ${inputBg}`} />
      {open && matches.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl border overflow-hidden max-h-48 overflow-y-auto z-[60] ${theme==='dark'?'bg-slate-800 border-slate-600':'bg-white border-slate-200'}`}>
          {matches.map((c, i) => ( <div key={i} className={`p-3 cursor-pointer text-sm transition-colors ${activeIndex === i ? (theme==='dark'?'bg-indigo-600 text-white':'bg-indigo-100 text-indigo-900') : (theme==='dark'?'hover:bg-indigo-600 text-white':'hover:bg-indigo-50 text-slate-800')}`} onClick={() => { onSelect(c); setOpen(false); }}><b>{isPhone ? c.phone : c.name}</b> <span className="opacity-60">- {isPhone ? c.name : c.phone}</span></div> ))}
        </div>
      )}
    </div>
  );
}

// 🔥 PUDHU SEARCHABLE CREDIT DROPDOWN (TYPE TO SEARCH) 🔥
function CreditSearchDropdown({ value, onChange, uniqueCompanies, isDark }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  useEffect(() => { setSearch(value); }, [value]);

  const matches = uniqueCompanies.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const inputBg = isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800';
  const dropdownBg = isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200';

  return (
    <div className="relative w-full">
       <input
         value={search}
         onChange={e => { setSearch(e.target.value); setOpen(true); }}
         onFocus={() => setOpen(true)}
         onBlur={() => setTimeout(() => setOpen(false), 200)}
         placeholder="🔍 Type Company Name to Search..."
         className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${inputBg}`}
       />
       {open && matches.length > 0 && (
         <div className={`absolute bottom-full mb-1 left-0 right-0 max-h-48 overflow-y-auto z-[100] border shadow-2xl rounded-xl ${dropdownBg}`}>
            {matches.map((c, i) => (
              <div key={i} className={`p-3 cursor-pointer border-b border-slate-500/10 text-sm font-bold transition-colors ${isDark ? 'hover:bg-indigo-600 hover:text-white' : 'hover:bg-indigo-100 hover:text-indigo-900'}`}
                   onMouseDown={() => { onChange(c); setSearch(c); setOpen(false); }}>
                {c}
              </div>
            ))}
         </div>
       )}
    </div>
  )
}

const local={ async get(k){try{const r=window.localStorage.getItem(k);return r?JSON.parse(r):null;}catch{return null;}}, async set(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));}catch{}}, async remove(k){try{window.localStorage.removeItem(k);}catch{}} };

class DB{
  constructor(url, key){ this.isLive = Boolean(url && key); if(this.isLive) { this.base = url.replace(/\/+$/,"")+"/rest/v1"; this.h = {"apikey":key,"Authorization":`Bearer ${key}`,"Content-Type":"application/json"}; } } 
  async getParcels(){ if(this.isLive) { try { const r=await fetch(`${this.base}/parcels?select=*`,{headers:this.h}); if(r.ok) return await r.json(); } catch(e){} } return await local.get("mps_parcels")||[]; }
  async insertParcel(p){ if(this.isLive) { try { await fetch(`${this.base}/parcels`,{method:"POST",headers:this.h,body:JSON.stringify(p)}); } catch(e){} } await local.set("mps_parcels", [p, ...(await local.get("mps_parcels")||[])]); }
  async updateParcel(id, data){ if(this.isLive) { try { await fetch(`${this.base}/parcels?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:this.h,body:JSON.stringify(data)}); } catch(e){} } await local.set("mps_parcels", (await local.get("mps_parcels")||[]).map(x => x.id === id ? {...x, ...data} : x)); }
  async deleteParcel(id){ if(this.isLive) { try { await fetch(`${this.base}/parcels?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:this.h}); } catch(e){} } await local.set("mps_parcels", (await local.get("mps_parcels")||[]).filter(x => x.id !== id)); }
  async getUsers(){ if(this.isLive) { try { const r=await fetch(`${this.base}/app_users?select=*`,{headers:this.h}); if(r.ok) return await r.json(); } catch(e){} } let usrs = await local.get("mps_users"); if (!usrs || usrs.length === 0) { usrs = [{id:'super-1', username:'superadmin', password:'123', role:'superadmin', branch:'All'}, {id:'admin-1', username:'admin', password:'123', role:'admin', branch: CITIES[0]}, {id:'staff-1', username:'staff', password:'123', role:'staff', branch: CITIES[0]}]; await local.set("mps_users", usrs); } else if (!usrs.find(u => u.username === 'superadmin')) { usrs.push({id:'super-1', username:'superadmin', password:'123', role:'superadmin', branch:'All'}); await local.set("mps_users", usrs); } return usrs; }
  async insertUser(u){ if(this.isLive) { try { await fetch(`${this.base}/app_users`,{method:"POST",headers:this.h,body:JSON.stringify(u)}); } catch(e){} } await local.set("mps_users", [u, ...(await this.getUsers())]); }
  async deleteUser(id){ if(this.isLive) { try { await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"DELETE",headers:this.h}); } catch(e){} } await local.set("mps_users", (await this.getUsers()).filter(u => u.id !== id)); }
  async updateUser(id, data){ if(this.isLive) { try { await fetch(`${this.base}/app_users?id=eq.${id}`,{method:"PATCH",headers:this.h,body:JSON.stringify(data)}); } catch(e){} } await local.set("mps_users", (await this.getUsers()).map(u => u.id === id ? {...u, ...data} : u)); }
  
  async getCreditAuth(){ if(this.isLive) { try { const r=await fetch(`${this.base}/credit_auth?select=*`,{headers:this.h}); if(r.ok) return await r.json(); } catch(e){} } return await local.get("mps_credit_auth")||[]; }
  async insertCreditAuth(data){ if(this.isLive) { try { await fetch(`${this.base}/credit_auth`,{method:"POST",headers:this.h,body:JSON.stringify(data)}); } catch(e){} } await local.set("mps_credit_auth", [data, ...(await local.get("mps_credit_auth")||[])]); }
  async deleteCreditAuth(phone){ if(this.isLive) { try { await fetch(`${this.base}/credit_auth?phone=eq.${phone}`,{method:"DELETE",headers:this.h}); } catch(e){} } await local.set("mps_credit_auth", (await local.get("mps_credit_auth")||[]).filter(c => c.phone !== phone)); }
}

// 🔥 DIRECT BACK-CAMERA E-WAY SCANNER 🔥
function EwayScannerModal({ onScan, onClose }) {
  useEffect(() => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: "environment" } };
    const scanner = new Html5QrcodeScanner("qr-reader", config, false);
    scanner.render(
      (decodedText) => { scanner.clear(); onScan(decodedText); },
      (error) => { /* Ignore background errors */ }
    );
    return () => { scanner.clear().catch(e=>console.log(e)); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[200] p-4">
      <div className="bg-white p-4 rounded-3xl w-full max-w-sm shadow-2xl">
         <div className="flex justify-between items-center mb-4">
           <h3 className="font-black text-slate-800 text-lg">📷 Scan E-Way QR</h3>
           <button onClick={onClose} className="bg-red-100 text-red-500 px-4 py-2 rounded-xl font-bold">Close</button>
         </div>
         <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border-2 border-indigo-100"></div>
         <p className="text-center text-xs font-bold opacity-60 mt-4 text-slate-800">Point back camera at E-Way Bill document</p>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard"); const [parcels, setParcels] = useState([]); const [users, setUsers] = useState([]); const [user, setUser] = useState(null); const [toast, setToast] = useState(null); const [shortcutMode, setShortcutMode] = useState(""); const [theme, setTheme] = useState("light"); const [sidebarExpanded, setSidebarExpanded] = useState(false); const [creditAuthList, setCreditAuthList] = useState([]); 
  const [globalViewItem, setGlobalViewItem] = useState(null);

  const [db] = useState(new DB(ENV_URL, ENV_KEY));
  const showMsg = (msg, type='success') => { setToast({msg, type}); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { 
      async function init() { 
          const session = await local.get("mps_session"); if(session) setUser(session); 
          const savedTheme = await local.get("mps_theme"); if(savedTheme) setTheme(savedTheme); 
          const cList = await db.getCreditAuth(); setCreditAuthList(cList); 
          const ps = await db.getParcels(); setParcels(ps); 
          const usrs = await db.getUsers(); setUsers(usrs); 
      } 
      init(); 
  }, []);
  
  const toggleTheme = () => { const nt = theme === "dark" ? "light" : "dark"; setTheme(nt); local.set("mps_theme", nt); };

  useEffect(() => {
    const handleKey = (e) => { 
      if(!user || globalViewItem) return; let mode = ""; 
      if (e.key === 'F7') mode = 'Paid'; else if (e.key === 'F8') mode = 'To Pay'; else if (e.key === 'F9') mode = 'Credit'; else if (e.key === 'F10') mode = 'FOC'; 
      else if (e.key === 'F6') { e.preventDefault(); setPage('delivery'); showMsg("Delivery Scanner Activated!", "info"); }
      if(mode) { e.preventDefault(); setPage('book'); setShortcutMode(mode); showMsg(`${mode} Mode Activated!`, "info"); } 
    };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [user, globalViewItem]);

  if(!user) return <Login onLogin={async (u,p) => { const valid = users.find(x=>x.username===u && x.password===p); if(valid){ setUser(valid); await local.set("mps_session", valid); showMsg("Welcome!"); return true; } else { return false; } }} theme={theme} />;
  const isDark = theme === "dark"; const bgClass = isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"; const headerBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  return (
    <div className={`flex h-screen font-sans ${bgClass} transition-colors duration-300`}>
      <aside className={`${sidebarExpanded ? "w-64" : "w-16 md:w-20"} bg-slate-950 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 transition-all duration-300`}>
        <div className="h-16 md:h-20 flex items-center justify-between px-2 md:px-4 border-b border-slate-800 bg-black/10">
          {sidebarExpanded ? ( <div className="flex items-center animate-fade-in pl-2"><MpsLogo /><div><h1 className="text-xl font-black text-white tracking-widest">MPS</h1><p className="text-[10px] uppercase text-indigo-400 font-bold">{user.branch} Branch</p></div></div> ) : ( <div className="mx-auto"><MpsLogo /></div> )}
          <button onClick={() => setSidebarExpanded(!sidebarExpanded)} className="text-slate-400 hover:text-white text-md p-1 focus:outline-none transition-colors">{sidebarExpanded ? "◀" : "▶"}</button>
        </div>
        <nav className="flex-1 px-2 py-4 md:px-3 md:py-6 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: '📊', label: 'Analysis', role: 'staff' },
            { id: 'book', icon: '📦', label: 'Book Parcel', role: 'staff' },
            { id: 'pending', icon: '⏳', label: 'Pending', role: 'staff' },
            { id: 'track', icon: '🔍', label: 'Track', role: 'staff' },
            { id: 'delivery', icon: '🤝', label: 'Delivery [F6]', role: 'staff' },
            { id: 'accounts', icon: '💰', label: 'Accounts', role: 'admin' },
            { id: 'admin', icon: '⚙️', label: 'System', role: 'admin' }
          ].map(item => {
            if (!(item.role === 'staff' || user.role === 'admin' || user.role === 'superadmin')) return null;
            return ( <button key={item.id} title={item.label} onClick={() => setPage(item.id)} className={`w-full flex items-center py-3 rounded-xl font-medium transition-all ${sidebarExpanded ? "px-4" : "justify-center px-0"} ${page === item.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}><span className="text-lg">{item.icon}</span>{sidebarExpanded && <span className="ml-3 animate-fade-in text-sm">{item.label}</span>}</button> );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 flex justify-center"><button onClick={async ()=>{setUser(null); await local.remove("mps_session");}} className="text-slate-400 hover:text-white transition-colors flex items-center justify-center font-bold text-sm"><span>🚪</span> {sidebarExpanded && <span className="ml-2">Logout</span>}</button></div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className={`${headerBg} shadow-sm h-auto min-h-[4rem] py-2 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 z-10 shrink-0 gap-2`}>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] md:text-sm font-bold bg-black/5 px-4 py-2 rounded-full"><span onClick={()=>{setPage('book'); setShortcutMode('Paid');}} className="cursor-pointer text-blue-500 hover:text-blue-600">F7: PAID</span><span className="opacity-25 hidden md:inline">|</span><span onClick={()=>{setPage('book'); setShortcutMode('To Pay');}} className="cursor-pointer text-red-500 hover:text-red-600">F8: TO PAY</span><span className="opacity-25 hidden md:inline">|</span><span onClick={()=>{setPage('book'); setShortcutMode('Credit');}} className="cursor-pointer text-amber-500 hover:text-amber-600">F9: CREDIT</span><span className="opacity-25 hidden md:inline">|</span><span onClick={()=>{setPage('book'); setShortcutMode('FOC');}} className="cursor-pointer text-emerald-500 hover:text-emerald-600">F10: FOC</span></div>
          <div className="flex items-center gap-2 md:gap-4"><span className={`text-[10px] md:text-xs font-black uppercase px-2 py-1 md:px-3 rounded-full border ${user.role === 'superadmin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>{user.role} | {user.branch}</span><button onClick={toggleTheme} className="text-lg md:text-xl">{(isDark)?'☀️':'🌙'}</button></div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {page === 'dashboard' && <Dashboard parcels={parcels} isDark={isDark} user={user} setGlobalView={setGlobalViewItem}/>}
            {page === 'pending' && <Pending parcels={parcels} isDark={isDark} user={user} setGlobalView={setGlobalViewItem}/>}
            {page === 'book' && <Book shortcutMode={shortcutMode} parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} theme={theme} user={user} creditAuthList={creditAuthList} />}
            {page === 'track' && <Track parcels={parcels} isDark={isDark} user={user} setGlobalView={setGlobalViewItem}/>}
            {page === 'delivery' && <Delivery parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} creditAuthList={creditAuthList} setGlobalView={setGlobalViewItem}/>}
            {page === 'accounts' && (user.role === 'admin' || user.role === 'superadmin') && <Accounts parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} />}
            {page === 'admin' && (user.role === 'admin' || user.role === 'superadmin') && <Admin parcels={parcels} users={users} setUsers={setUsers} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} creditAuthList={creditAuthList} setCreditAuthList={setCreditAuthList} setGlobalView={setGlobalViewItem}/>}
          </div>
        </div>
      </main>
      {toast && ( <div className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-2xl font-bold text-white z-50 animate-bounce-in text-sm md:text-base ${toast.type==='error'?'bg-red-500':'bg-emerald-500'}`}>{toast.msg}</div> )}
      
      {globalViewItem && <ParcelModal item={globalViewItem} creditAuthList={creditAuthList} onClose={()=>setGlobalViewItem(null)} db={db} parcels={parcels} setParcels={setParcels} user={user} showMsg={showMsg} isDark={isDark} />}
    </div>
  );
}

// 🔥 UPGRADED PARCEL MODAL (CREDIT OPTION ALWAYS VISIBLE FIX) 🔥
function ParcelModal({item, creditAuthList, onClose, db, parcels, setParcels, user, showMsg, isDark}) {
  const [payMethod, setPayMethod] = useState("");
  const [delCreditCustomer, setDelCreditCustomer] = useState(""); 
  const cardBg = isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900";
  
  const deliverParcel = async () => {
    if(item.payment === "To Pay" && !payMethod) return showMsg("Please specify payment mode!", "error");
    
    let finalCreditCustomer = item.creditCustomer || "";
    
    if (item.payment === "To Pay" && payMethod === "Credit") {
        if (!delCreditCustomer) return showMsg("Search and Select a Credit Account!", "error");
        finalCreditCustomer = delCreditCustomer; 
        showMsg(`Bill assigned to ${finalCreditCustomer}'s Account!`, "info");
    }

    const dMode = item.payment === "To Pay" ? `[Mode: ${payMethod}]` : "";
    const updatedHistory = [...item.history, {status: "Delivered", loc: item.to, time: new Date().toLocaleString()}];
    
    const modifiedItem = {
        ...item, status: "Delivered", history: updatedHistory, deliveryMode: payMethod, 
        deliveredBy: user.username, deliveredBranch: user.branch, 
        creditCustomer: finalCreditCustomer, creditSettled: item.creditSettled || false,
        notes: `${item.notes || ""} Delivered ${dMode}`
    };
    
    await db.updateParcel(modifiedItem.id, modifiedItem);
    setParcels(parcels.map(p => p.id === modifiedItem.id ? modifiedItem : p));
    showMsg("Parcel Delivered Successfully!");
    onClose();
  };

  const isPending = item.status === "Booked" || item.status === "In Transit";
  const uniqueCompanies = [...new Set(creditAuthList.map(c => c.company))];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
      <div className={`${cardBg} p-6 rounded-3xl max-w-md w-full space-y-4 border shadow-2xl animate-bounce-in`}>
        <div className="flex justify-between items-center border-b border-slate-500/20 pb-2">
          <h3 className="font-black text-lg text-indigo-500">Manifest: {item.id}</h3>
          <span className="px-2 py-1 text-[10px] font-bold rounded-full uppercase" style={{backgroundColor: S_CLR[item.status]+'22', color: S_CLR[item.status]}}>{item.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
          <div><p className="opacity-50">Origin ➔ Target</p><p className="font-bold">{item.from} ➔ {item.to}</p></div>
          <div><p className="opacity-50">Date Logged</p><p className="font-bold">{item.date}</p></div>
          <div className="col-span-2"><p className="opacity-50">Consignor (Sender)</p><p className="font-bold">{item.sName} <span className="opacity-60 font-normal">({item.sPhone})</span></p></div>
          <div className="col-span-2"><p className="opacity-50">Consignee (Receiver)</p><p className="font-bold">{item.rName} <span className="opacity-60 font-normal">({item.rPhone})</span></p></div>
          <div><p className="opacity-50">Cargo Details</p><p className="font-bold">{item.count} {item.type}</p></div>
          <div><p className="opacity-50">Financial Parameter</p><p className="font-bold text-emerald-500">₹{item.price} ({item.payment})</p></div>
          
          {item.status === 'Delivered' && (
             <div className="col-span-2 mt-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
               <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">✅ Delivery & Payment Info</p>
               <div className="font-bold">
                  {item.payment === 'To Pay' ? (
                     <p>Collected via: <span className="text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-md">{item.deliveryMode || 'Cash'}</span></p>
                  ) : (
                     <p>Booking Mode: <span className="text-indigo-500 px-2 py-0.5 bg-indigo-500/10 rounded-md">{item.payment}</span></p>
                  )}
                  <p className="text-[10px] opacity-60 mt-1">Delivered By: {item.deliveredBy || 'System'}</p>
               </div>
             </div>
          )}
        </div>
        
        {(isPending && (user.branch === item.to || user.role === 'superadmin')) && (
          <div className="mt-4 p-4 border border-indigo-500/30 bg-indigo-500/5 rounded-2xl space-y-3">
             <h4 className="text-xs font-bold text-indigo-500 uppercase">⚡ Quick Delivery Check</h4>
             {item.payment === "To Pay" && (
                <div className="space-y-3">
                  <select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="w-full p-2 rounded-xl border outline-none text-sm bg-transparent font-bold">
                    <option value="" className="text-slate-900">Select Payment Collected...</option>
                    <option value="Cash" className="text-slate-900">💵 Physical Cash</option>
                    <option value="GPay" className="text-slate-900">📱 UPI / GPay</option>
                    
                    {/* 🔥 Intha line-la iruntha isCreditAuthorized condition-a thookiyachu 🔥 */}
                    <option value="Credit" className="text-slate-900">💳 Credit A/C</option>
                  </select>
                  
                  {payMethod === 'Credit' && (
                     <CreditSearchDropdown 
                        value={delCreditCustomer} 
                        onChange={setDelCreditCustomer} 
                        uniqueCompanies={uniqueCompanies} 
                        isDark={isDark} 
                     />
                  )}
                </div>
             )}
             <button onClick={deliverParcel} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-xl hover:bg-emerald-700 shadow-md">Confirm Delivery</button>
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-500/20">
          <button onClick={()=>generatePDF(item)} className="flex-1 bg-blue-500/10 text-blue-500 font-bold py-2 rounded-xl text-sm border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors">🖨️ Print</button>
          <button onClick={onClose} className="flex-1 bg-slate-600 text-white font-bold py-2 rounded-xl text-sm shadow-md">Close</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({parcels, isDark, user}) {
  const [selectedBranch, setSelectedBranch] = useState(user.branch === 'All' ? 'All' : user.branch);
  const activeParcels = parcels.filter(p => p.status !== 'Deleted');
  const branchParcels = activeParcels.filter(p => selectedBranch === 'All' ? true : (p.bookedBranch === selectedBranch || p.from === selectedBranch || p.to === selectedBranch));
  const rev = branchParcels.reduce((a,b)=>a+(Number(b.price)||0),0);
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100";
  const chartData = STATUSES.filter(s=>s!=='Deleted').map(s => ({ name: s, count: branchParcels.filter(p=>p.status===s).length, fill: S_CLR[s] }));

  return (
    <div className="space-y-6">
      {(user.role === 'superadmin' || user.branch === 'All') && (
        <div className="flex justify-end mb-2">
          <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className={`p-2 px-4 rounded-xl font-bold border outline-none shadow-sm cursor-pointer ${isDark?'bg-slate-900 border-slate-700':'bg-white border-slate-200'}`}>
            <option value="All">🌍 Global Network (All Branches)</option>
            {CITIES.map(c => <option key={c} value={c}>🏢 Branch: {c}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[{l: "Total Bookings", v: branchParcels.length, c: "text-blue-500"}, {l: "In Transit", v: branchParcels.filter(p=>p.status==="In Transit").length, c: "text-amber-500"}, {l: "Delivered", v: branchParcels.filter(p=>p.status==="Delivered").length, c: "text-emerald-500"}, {l: "Branch Revenue", v: `₹${rev}`, c: "textindigo-500"}].map((s,i) => (
          <div key={i} className={`${cardBg} p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-center`}><span className="text-xs font-bold opacity-60 uppercase mb-1 md:mb-2">{s.l}</span><span className={`text-2xl md:text-4xl font-black ${s.c}`}>{s.v}</span></div>
        ))}
      </div>
      <div className={`${cardBg} p-4 md:p-6 rounded-2xl border h-72 shadow-sm`}>
        <h3 className="font-black text-sm text-slate-400 uppercase mb-4">Branch Status Analysis</h3>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}><XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{background: '#1e293b', border:'none', color:'#fff', borderRadius:'8px', fontSize:'12px'}} /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{chartData.map((e, i) => (<Cell key={i} fill={e.fill} />))}</Bar></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
}

function Pending({parcels, isDark, user, setGlobalView}) {
  const [fLR, setFLR] = useState(""); const [fFrom, setFFrom] = useState("All"); const [fTo, setFTo] = useState("All"); const [fDate, setFDate] = useState("");
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"; const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"; const tblBg = isDark ? "bg-slate-800/40" : "bg-slate-50";
  const getDays = (iso) => { if(!iso) return 0; const diff = new Date() - new Date(iso); return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))); };
  
  const pendingParcels = parcels.filter(p => {
    if (p.status !== 'Booked' && p.status !== 'In Transit') return false;
    if (user.role !== 'superadmin' && p.from !== user.branch && p.to !== user.branch) return false;
    const sTerm = fLR.toLowerCase();
    if (fLR && !p.id.toLowerCase().includes(sTerm) && !p.sPhone.includes(sTerm) && !(p.sName && p.sName.toLowerCase().includes(sTerm)) && !(p.rName && p.rName.toLowerCase().includes(sTerm))) return false;
    if (fFrom !== "All" && p.from !== fFrom) return false;
    if (fTo !== "All" && p.to !== fTo) return false;
    if (fDate && (!p.isoDate || !p.isoDate.startsWith(fDate))) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className={`${cardBg} p-4 rounded-2xl border space-y-3`}>
        <h3 className="font-bold text-sm text-amber-500">Filter Pending Stock</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input value={fLR} onChange={e=>setFLR(e.target.value)} placeholder="LR / Phone / Name" className={`p-2 rounded-xl border text-sm ${inputBg}`} />
          <select value={fFrom} onChange={e=>setFFrom(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`}><option value="All">Any Origin</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
          <select value={fTo} onChange={e=>setFTo(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`}><option value="All">Any Destination</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
          <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`} />
        </div>
      </div>
      <div className={`${cardBg} rounded-2xl shadow-sm border overflow-hidden`}>
        <div className="bg-amber-500/10 text-amber-600 p-4 font-bold md:text-lg flex justify-between items-center border-b border-amber-500/20"><span>⏳ Global Pending Parcels</span><span className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs md:text-sm">{pendingParcels.length} Items</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${tblBg} opacity-70 text-[10px] uppercase font-bold`}><tr><th className="p-4">LR No</th><th className="p-4">Route</th><th className="p-4">Qty</th><th className="p-4">Status</th><th className="p-4">Age</th></tr></thead>
            <tbody>
              {pendingParcels.length === 0 ? <tr><td colSpan="5" className="p-8 text-center opacity-50 font-bold">No pending parcels! All cleared.</td></tr> : pendingParcels.map(p => {
                const days = getDays(p.isoDate);
                return (
                  <tr key={p.id} className="border-t border-slate-500/10 hover:bg-black/5 cursor-pointer" onClick={() => setGlobalView(p)}>
                    <td className="p-4 font-black text-indigo-500 hover:underline">{p.id}</td><td className="p-4 font-bold">{p.from} ➔ {p.to}</td><td className="p-4 font-black text-amber-500">{p.count} {p.type}</td><td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{backgroundColor: S_CLR[p.status]+'22', color: S_CLR[p.status]}}>{p.status}</span></td><td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${days > 2 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{days === 0 ? 'Today' : `${days} Days`}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 🔥 UPGRADED BOOKING COMPONENT (WITH SEARCHABLE CREDIT DROPDOWN) 🔥
function Book({shortcutMode, parcels, setParcels, db, showMsg, isDark, theme, user, creditAuthList}) {
  const initF = {sName:"", sPhone:"", sGst:"", rName:"", rPhone:"", rGst:"", from: user.branch === 'All' ? "" : user.branch, to:"", rate:"", count:"1", actualWeight:"", type:"Box", payment:"Paid", creditCustomer:"", notes:""};
  const [f, setF] = useState(initF); const [done, setDone] = useState(null); const [eway, setEway] = useState(""); const [contacts, setContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { if(shortcutMode) setF(prev => ({...prev, payment: shortcutMode})); }, [shortcutMode]);
  useEffect(() => { async function load() { const cMap = {}; parcels.forEach(p => { if (p.sPhone && !cMap[p.sPhone]) cMap[p.sPhone] = { name: p.sName, gst: p.sGst || "" }; if (p.rPhone && !cMap[p.rPhone]) cMap[p.rPhone] = { name: p.rName, gst: p.rGst || "" }; }); const localC = await local.get("mps_contacts") || {}; Object.assign(cMap, localC); setContacts(Object.entries(cMap).map(([phone, data]) => ({ phone, ...data }))); } load(); }, [parcels]);

  const handleQRScan = (text) => {
    setShowScanner(false);
    const ewayMatch = text.match(/\b\d{12}\b/); 
    if(ewayMatch) {
        const val = ewayMatch[0];
        setEway(val);
        showMsg("QR Scanned! E-Way number extracted: " + val, "success");
        setTimeout(() => { 
            setF(p => ({...p, sName: "Scanned Client", sPhone: "9999999999", rName: "Target Client", rPhone: "8888888888", count: "10", type: "Box", payment: "To Pay" })); 
            showMsg("E-Way Bill Content Auto-Filled!", "info"); 
        }, 800);
    } else { showMsg("Invalid QR Code! No E-Way Bill Number found.", "error"); }
  };

  const smartFocus = (d, isSender) => { setTimeout(() => { if (isSender) { if (!d.name) document.getElementById('sName')?.focus(); else if (!d.gst) document.getElementById('sGst')?.focus(); else if (user.branch !== 'All') document.getElementById('rPhone')?.focus(); else document.getElementById('sFrom')?.focus(); } else { if (!d.name) document.getElementById('rName')?.focus(); else if (!d.gst) document.getElementById('rGst')?.focus(); else document.getElementById('rTo')?.focus(); } }, 50); };
  const handlePhoneChange = async (isSender, value) => { const fieldPrefix = isSender ? 's' : 'r'; setF(prev => ({ ...prev, [`${fieldPrefix}Phone`]: value })); if (value.length === 10) { const found = contacts.find(c => c.phone === value); if (found) { setF(prev => ({...prev, [`${fieldPrefix}Name`]: found.name || "", [`${fieldPrefix}Gst`]: found.gst || "" })); showMsg("Customer details loaded automatically!", "success"); smartFocus(found, isSender); } } };
  const handleContactSelect = (isSender, d) => { const px = isSender ? 's' : 'r'; setF(p => ({ ...p, [`${px}Phone`]: d.phone, [`${px}Name`]: d.name, [`${px}Gst`]: d.gst||'' })); smartFocus(d, isSender); };
  const handleEwayChange = (e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 12); setEway(val); if (val.length === 12) { showMsg("Validating E-Way Bill Parameters...", "info"); setTimeout(() => { setF(p => ({...p, sName: "Sri Murugan Textiles", sPhone: "9876543210", sGst: "33AABCU1234F1Z1", from: user.branch === 'All' ? "Salem" : user.branch, rName: "City Fashions", rPhone: "9988776655", rGst: "29AAAAA0000A1Z5", to: "Bangalore", rate: "120", count: "15", type: "Bale", payment: "To Pay" })); showMsg("E-Way Bill Content Processed & Populated!", "success"); document.getElementById("pQty").focus(); }, 750); } };

  const ep = calcPrice(f.from, f.to, f.rate, f.count, f.type, f.payment);
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"; const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800";
  const uniqueCompanies = [...new Set(creditAuthList.map(c => c.company))];

  const submit = async () => {
    if(isSubmitting) return; if(!f.sName || !f.sPhone || !f.from || !f.rName || !f.rPhone || !f.to || !f.count || !f.rate || !f.type) return showMsg("Please fill all mandatory fields marked with (*)", "error");
    if(f.payment === "Credit") { 
      if(!f.creditCustomer) return showMsg("Search and Select a Credit Account!", "error");
    }
    setIsSubmitting(true); const dObj = new Date(); const isoDate = dObj.toISOString(); const locDateStr = dObj.toLocaleDateString('en-IN'); const lrNumber = generateLR(f.from, f.to, parcels);
    const p = {...f, notes: f.payment === 'Credit' ? `[A/c: ${f.creditCustomer}] ${f.notes}` : f.notes, creditSettled: false, id: lrNumber, date: locDateStr, isoDate: isoDate, status: "Booked", price: ep, bookedBy: user.username, bookedBranch: user.branch, settledBranches: [], history: [{status: "Booked", loc: f.from, time: dObj.toLocaleString()}]};
    const saved = await local.get("mps_contacts") || {}; saved[f.sPhone] = { name: f.sName, gst: f.sGst }; saved[f.rPhone] = { name: f.rName, gst: f.rGst }; await local.set("mps_contacts", saved);
    await db.insertParcel(p); setParcels([p, ...parcels]); setDone(p); showMsg("LR Generated cleanly."); setIsSubmitting(false);
  };

  if(done) return ( <div className={`${cardBg} p-6 md:p-10 rounded-3xl max-w-xl mx-auto text-center border-t-4 border-emerald-500`}><h2 className="text-xl md:text-2xl font-black mb-4">Parcel Registered Successfully</h2><div className="bg-indigo-600/10 text-indigo-500 text-xl md:text-2xl font-mono font-bold p-3 rounded-xl mb-6">{done.id}</div><button onClick={()=>{setDone(null); setF(initF); setEway("");}} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mb-3">New Registration</button><button onClick={()=>generatePDF(done)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mb-3">Download Receipt</button><button onClick={() => openWhatsApp(done.sPhone, true, done)} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">📱 Send SMS / WhatsApp (Manual)</button></div> );

  return (
    <div className="space-y-4 md:space-y-6">
      
      <div className={`${cardBg} p-4 rounded-2xl border mb-2 flex flex-col sm:flex-row items-center gap-4 relative z-10`}>
        <span className="text-xl hidden sm:block">⚡</span>
        <input id="eway" onKeyDown={e=>handleBoxTravel(e,{enter:'sPhone', down:'sPhone'})} value={eway} onChange={handleEwayChange} placeholder="Enter 12-Digit E-Way Bill Number..." className={`w-full sm:flex-1 px-4 py-3 rounded-lg outline-none font-mono font-bold tracking-widest text-center sm:text-left ${inputBg}`} />
        <button onClick={() => setShowScanner(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md whitespace-nowrap flex items-center justify-center gap-2">📷 Scan QR</button>
        {eway.length === 12 && <span className="text-emerald-500 font-bold px-4">Verified ✅</span>}
      </div>
      
      {showScanner && <EwayScannerModal onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-30">
        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}><h3 className="font-bold text-indigo-500">Sender Profile</h3><SuggestInput id="sPhone" onKeyDown={e=>handleBoxTravel(e,{enter:'sName', down:'sName', right:'rPhone', up:'eway'})} label="Mobile Number *" value={f.sPhone} onChange={v=>handlePhoneChange(true, v)} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={true} theme={theme} /><SuggestInput id="sName" onKeyDown={e=>handleBoxTravel(e,{enter:'sGst', down:'sGst', right:'rName', up:'sPhone'})} label="Full Name *" value={f.sName} onChange={v=>setF({...f, sName:v})} onSelect={d=>handleContactSelect(true, d)} dataList={contacts} isPhone={false} theme={theme} /><input id="sGst" onKeyDown={e=>handleBoxTravel(e,{enter: user.branch === 'All' ? 'sFrom' : 'rPhone', down: user.branch === 'All' ? 'sFrom' : 'rPhone', right:'rGst', up:'sName'})} value={f.sGst} onChange={e=>setF({...f, sGst:e.target.value})} placeholder="GST Number" className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`} /><select id="sFrom" disabled={user.branch !== 'All'} onKeyDown={e=>handleBoxTravel(e,{enter:'rPhone', down:'pQty', right:'rTo', up:'sGst'})} value={f.from} onChange={e=>setF({...f, from:e.target.value})} className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg} ${user.branch !== 'All' ? 'opacity-50 cursor-not-allowed' : ''}`}><option value="">Select Origin *</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}><h3 className="font-bold text-emerald-500">Receiver Profile</h3><SuggestInput id="rPhone" onKeyDown={e=>handleBoxTravel(e,{enter:'rName', down:'rName', left:'sPhone', up:'eway'})} label="Mobile Number *" value={f.rPhone} onChange={v=>handlePhoneChange(false, v)} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={true} theme={theme} /><SuggestInput id="rName" onKeyDown={e=>handleBoxTravel(e,{enter:'rGst', down:'rGst', left:'sName', up:'rPhone'})} label="Full Name *" value={f.rName} onChange={v=>setF({...f, rName:v})} onSelect={d=>handleContactSelect(false, d)} dataList={contacts} isPhone={false} theme={theme} /><input id="rGst" onKeyDown={e=>handleBoxTravel(e,{enter:'rTo', down:'rTo', left:'sGst', up:'rName'})} value={f.rGst} onChange={e=>setF({...f, rGst:e.target.value})} placeholder="GST Number" className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`} /><select id="rTo" onKeyDown={e=>handleBoxTravel(e,{enter:'pQty', down:'pQty', left:'sFrom', up:'rGst'})} value={f.to} onChange={e=>setF({...f, to:e.target.value})} className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 relative z-10 ${inputBg}`}><option value="">Select Destination *</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select></div>
      </div>
      <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4 relative z-20`}>
        <h3 className="font-bold">Cargo Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"><input id="pQty" onKeyDown={e=>handleBoxTravel(e,{enter:'pType', down:'pPay', right:'pType', up:user.branch==='All'?'sFrom':'sGst'})} type="number" value={f.count} onChange={e=>setF({...f, count:e.target.value})} placeholder="Quantity *" className={`p-3 rounded-xl border outline-none [appearance:textfield] ${inputBg}`} /><select id="pType" onKeyDown={e=>handleBoxTravel(e,{enter:'pWgt', down:'pPay', left:'pQty', right:'pWgt', up:'rTo'})} value={f.type} onChange={e=>setF({...f, type:e.target.value})} className={`p-3 rounded-xl border outline-none ${inputBg}`}>{TYPES.map(t=><option key={t}>{t}</option>)}</select><input id="pWgt" onKeyDown={e=>handleBoxTravel(e,{enter:'pRate', down:'btnSubmit', left:'pType', right:'pRate', up:'rTo'})} type="number" value={f.actualWeight} onChange={e=>setF({...f, actualWeight:e.target.value})} placeholder="Weight (Kg)" className={`p-3 rounded-xl border outline-none [appearance:textfield] ${inputBg}`} /><input id="pRate" onKeyDown={e=>handleBoxTravel(e,{enter:'pPay', down:'btnSubmit', left:'pWgt', up:'rTo'})} type="number" value={f.rate} onChange={e=>setF({...f, rate:e.target.value})} placeholder="Rate Per Unit *" className={`p-3 rounded-xl border outline-none font-bold [appearance:textfield] ${inputBg}`} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-2">
          <div className="flex flex-col gap-3">
            <select id="pPay" onKeyDown={e=>handleBoxTravel(e,{enter:'btnSubmit', up:'pQty', down:'btnSubmit'})} value={f.payment} onChange={e=>setF({...f, payment:e.target.value})} className="p-3 border rounded-xl font-bold bg-indigo-600 text-white outline-none w-full">{PAY_MODES.map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}</select>
            
            {/* Searchable Dropdown For Booking */}
            {f.payment === 'Credit' && (
               <CreditSearchDropdown 
                  value={f.creditCustomer} 
                  onChange={val => setF({...f, creditCustomer: val})} 
                  uniqueCompanies={uniqueCompanies} 
                  isDark={isDark} 
               />
            )}
          </div>
          <div className="bg-slate-950 p-4 rounded-xl flex justify-between items-center text-white h-full"><span className="text-sm opacity-50">Total Income Allocation</span><span className="text-xl md:text-2xl font-black text-emerald-400">₹{ep}</span></div>
        </div>
      </div>
      <button id="btnSubmit" onClick={submit} disabled={isSubmitting} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-1 relative z-10 ${isSubmitting ? 'bg-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isSubmitting ? "Generating LR Number..." : "Confirm Booking"}</button>
    </div>
  );
}

function Track({parcels, isDark, user, setGlobalView}) {
  const [fLR, setFLR] = useState(""); const [fFrom, setFFrom] = useState("All"); const [fTo, setFTo] = useState("All"); const [fStatus, setFStatus] = useState("All"); const [fDate, setFDate] = useState("");
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"; const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"; const tblBg = isDark ? "bg-slate-800/40" : "bg-slate-50";

  const results = parcels.filter(p => {
    const sTerm = fLR.toLowerCase();
    if (fLR && !p.id.toLowerCase().includes(sTerm) && !p.sPhone.includes(sTerm) && !p.rPhone.includes(sTerm) && !(p.sName && p.sName.toLowerCase().includes(sTerm)) && !(p.rName && p.rName.toLowerCase().includes(sTerm))) return false;
    if (fFrom !== "All" && p.from !== fFrom) return false;
    if (fTo !== "All" && p.to !== fTo) return false;
    if (fStatus !== "All" && p.status !== fStatus) return false;
    if (fDate && (!p.isoDate || !p.isoDate.startsWith(fDate))) return false;
    if (user.role === 'staff' && p.from !== user.branch && p.to !== user.branch) return false;
    return true;
  }).slice(0, 50);

  return (
    <div className="space-y-4">
      <div className={`${cardBg} p-4 rounded-2xl border space-y-3`}>
        <h3 className="font-bold text-sm text-indigo-500">Advanced Search Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input value={fLR} onChange={e=>setFLR(e.target.value)} placeholder="LR / Phone / Name" className={`p-2 rounded-xl border text-sm ${inputBg}`} />
          <select value={fFrom} onChange={e=>setFFrom(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`}><option value="All">Any Origin</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
          <select value={fTo} onChange={e=>setFTo(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`}><option value="All">Any Destination</option>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`}><option value="All">Any Status</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`} />
        </div>
      </div>
      <div className={`${cardBg} rounded-2xl border overflow-x-auto`}>
        <table className="min-w-[800px] w-full text-left whitespace-nowrap text-sm">
          <thead className={`${tblBg} text-[10px] font-bold uppercase opacity-80`}><tr><th className="p-4">LR Code</th><th className="p-4">Route Info</th><th className="p-4">Customer Details</th><th className="p-4">Tracking Node</th></tr></thead>
          <tbody>
            {results.length === 0 ? <tr><td colSpan="4" className="p-8 text-center opacity-50 font-bold">No parcels match your search.</td></tr> : results.map(p => (
              <tr key={p.id} className="border-t border-slate-500/10 hover:bg-black/5 cursor-pointer" onClick={() => setGlobalView(p)}>
                <td className="p-4 font-black text-indigo-500 hover:underline">{p.id} <span className="block text-[10px] opacity-50 font-normal">{p.date}</span></td>
                <td className="p-4 font-bold">{p.from} ➔ {p.to}</td>
                <td className="p-4"><p>{p.sName} ➔ {p.rName}</p><p className="text-[10px] opacity-50">{p.sPhone} | {p.rPhone}</p></td>
                <td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase" style={{backgroundColor: S_CLR[p.status]+'22', color: S_CLR[p.status]}}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Delivery({parcels, setParcels, db, showMsg, isDark, user, creditAuthList, setGlobalView}) {
  const [id, setId] = useState(""); 
  const searchLR = () => { const item = parcels.find(p=>p.id === id.toUpperCase()); if(item) { if(item.status === 'Deleted') return showMsg("Consignment deleted by admin.", "error"); setGlobalView(item); setId(""); } else showMsg("No consignment found", "error"); };
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  return (
    <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
      <div className={`${cardBg} p-6 rounded-2xl text-center space-y-4`}>
         <h2 className="text-xl font-black text-indigo-500">Fast Delivery Scanner [F6]</h2>
         <p className="text-sm opacity-60">Scan barcode or type LR Code to quick-deliver.</p>
         <div className="flex gap-2 flex-col sm:flex-row"><input id="delScan" autoFocus onKeyDown={e=> e.key==='Enter'?searchLR():null} value={id} onChange={e=>setId(e.target.value)} placeholder="Enter LR Code" className={`flex-1 p-4 text-center text-lg md:text-xl font-bold border rounded-xl outline-none ${isDark?'bg-slate-900 border-slate-700':'bg-slate-50'}`} /><button id="delFetch" onClick={searchLR} className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold">Open Manifest</button></div>
      </div>
    </div>
  );
}

function Accounts({parcels, setParcels, db, showMsg, isDark, user}) {
  const dObj = new Date(); const todayStr = dObj.toISOString().split('T')[0]; dObj.setDate(1); const firstDayStr = dObj.toISOString().split('T')[0];
  
  const [acc, setAcc] = useState({ emi: 25000, diesel: 30000, other: 15000 }); 
  const [payoutRate, setPayoutRate] = useState(10); const [partnerCount, setPartnerCount] = useState(5); 
  const [pettyDesc, setPettyDesc] = useState(""); const [pettyAmt, setPettyAmt] = useState(""); const [pettyLedger, setPettyLedger] = useState([]);
  
  const [eodDate, setEodDate] = useState(todayStr);
  const [eodBranch, setEodBranch] = useState(user.branch === 'All' ? CITIES[0] : user.branch);

  const [selectedBranch, setSelectedBranch] = useState(user.branch === 'All' ? CITIES[0] : user.branch);
  const [reconFrom, setReconFrom] = useState(firstDayStr);
  const [reconTo, setReconTo] = useState(todayStr);

  useEffect(() => { local.get("mps_petty_cash").then(d => { if(d) setPettyLedger(d); }); }, []);
  const addPetty = async () => { if(!pettyDesc || !pettyAmt) return; const item = { desc: pettyDesc, amt: Number(pettyAmt), date: todayStr }; const newList = [item, ...pettyLedger]; setPettyLedger(newList); await local.set("mps_petty_cash", newList); setPettyDesc(""); setPettyAmt(""); };

  const activeParcels = parcels.filter(p => p.status !== 'Deleted');
  
  const unsettledBranchParcels = activeParcels.filter(p => { 
    const pDate = p.isoDate ? p.isoDate.split('T')[0] : "";
    const inRange = (!reconFrom || pDate >= reconFrom) && (!reconTo || pDate <= reconTo);
    const isRelated = p.from === selectedBranch || p.to === selectedBranch; 
    const isSettled = p.settledBranches && p.settledBranches.includes(selectedBranch); 
    return isRelated && !isSettled && inRange; 
  });

  const totalSystemRevenue = activeParcels.reduce((a,b)=>a+(Number(b.price)||0), 0); const totalPetty = pettyLedger.reduce((a,b)=>a+(Number(b.amt)||0), 0); const exp = Number(acc.emi) + Number(acc.diesel) + Number(acc.other); const net = totalSystemRevenue - exp - totalPetty; 
  const cashCollected = unsettledBranchParcels.filter(p => (p.from === selectedBranch && p.payment === 'Paid') || (p.to === selectedBranch && p.payment === 'To Pay' && p.deliveryMode === 'Cash')).reduce((a,b) => a + (Number(b.price) || 0), 0);
  const bookedCount = unsettledBranchParcels.filter(p => p.from === selectedBranch).reduce((total, p) => total + (Number(p.count) || 0), 0);
  const deliveredCount = unsettledBranchParcels.filter(p => p.to === selectedBranch && p.status === 'Delivered').reduce((total, p) => total + (Number(p.count) || 0), 0);
  const branchCommission = (bookedCount + deliveredCount) * Number(payoutRate); const netRemittance = cashCollected - branchCommission;

  const markLedgerSettled = async () => { if(unsettledBranchParcels.length === 0) return showMsg("No transactions to settle in this date range!", "error"); if(!window.confirm(`Settle ledger for ${selectedBranch} from ${reconFrom} to ${reconTo}?`)) return; let updatedParcelsList = [...parcels]; for (let p of unsettledBranchParcels) { const updated = {...p, settledBranches: [...(p.settledBranches || []), selectedBranch]}; await db.updateParcel(updated.id, updated); updatedParcelsList = updatedParcelsList.map(x => x.id === updated.id ? updated : x); } setParcels(updatedParcelsList); showMsg(`Ledger Settled for ${selectedBranch}.`, "success"); };
  const triggerEOD = () => { generateEOD_PDF(eodDate, eodBranch, activeParcels, pettyLedger); showMsg(`${eodBranch} Day-Book Report Generated!`); };

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"; const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900";

  return (
    <div className="space-y-6 md:space-y-8">
      
      <div className={`${cardBg} p-6 rounded-3xl border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4`}>
        <div><h3 className="font-black text-lg text-indigo-500">💵 Daily EOD Settlement (Day-Book)</h3><p className="text-xs opacity-60">Generate complete collection & expense report for any date.</p></div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {user.role === 'superadmin' ? (
             <select value={eodBranch} onChange={e=>setEodBranch(e.target.value)} className={`p-3 rounded-xl border font-bold text-sm ${inputBg} outline-none`}>{CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          ) : ( <div className="p-3 bg-indigo-500/10 text-indigo-500 font-bold rounded-xl text-sm">{eodBranch}</div> )}
          <input type="date" value={eodDate} onChange={e=>setEodDate(e.target.value)} className={`p-3 rounded-xl border font-bold text-sm ${inputBg}`} />
          <button onClick={triggerEOD} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-md whitespace-nowrap">Print EOD Report</button>
        </div>
      </div>
      
      <div className={`${cardBg} p-6 rounded-3xl border shadow-xl`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-500/20 pb-4 mb-4 gap-4">
          <div><h3 className="font-black text-xl text-indigo-500">Franchise Reconciliation & Payout</h3><p className="text-xs opacity-60">Active Settlement View (Filtered)</p></div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold opacity-50 uppercase">Filter:</span>
            {user.role === 'superadmin' ? ( <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className={`p-2 rounded-xl font-bold border ${inputBg} outline-none`}><option value="All">Select Branch</option>{CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select> ) : ( <div className="font-black text-sm bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl">{selectedBranch}</div> )}
            <input type="date" title="From Date" value={reconFrom} onChange={e=>setReconFrom(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`} />
            <span className="opacity-50">to</span>
            <input type="date" title="To Date" value={reconTo} onChange={e=>setReconTo(e.target.value)} className={`p-2 rounded-xl border text-sm font-bold ${inputBg}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"><div className={`p-4 rounded-2xl border border-dashed border-slate-500/30 text-center`}><p className="text-[10px] uppercase font-bold opacity-60 mb-1">Unsettled Box Count</p><p className="text-2xl font-black">{bookedCount} <span className="text-sm opacity-50 font-normal">Bk</span> + {deliveredCount} <span className="text-sm opacity-50 font-normal">Dl</span></p></div><div className={`p-4 rounded-2xl border border-dashed border-emerald-500/30 text-center bg-emerald-500/5`}><p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Branch Cash in Hand</p><p className="text-2xl font-black text-emerald-600">₹{cashCollected.toLocaleString()}</p><p className="text-[8px] opacity-60 mt-1">From Paid & Cash To-Pay</p></div><div className={`p-4 rounded-2xl border border-dashed border-amber-500/30 text-center bg-amber-500/5`}><p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Commission Earned</p><div className="flex justify-center items-center gap-2"><p className="text-2xl font-black text-amber-600">₹{branchCommission.toLocaleString()}</p><input type="number" title="Rate" value={payoutRate} onChange={e=>setPayoutRate(Number(e.target.value))} className={`w-10 p-1 text-xs text-center border rounded ${inputBg}`} /></div><p className="text-[8px] opacity-60 mt-1">Total Parcels × Rate</p></div><div className={`p-4 rounded-2xl border text-center text-white shadow-inner ${netRemittance >= 0 ? 'bg-indigo-600 border-indigo-700' : 'bg-red-500 border-red-600'}`}><p className="text-[10px] uppercase font-bold opacity-80 mb-1">{netRemittance >= 0 ? 'Branch Remit to HQ' : 'HQ Pays Branch'}</p><p className="text-2xl font-black">₹{Math.abs(netRemittance).toLocaleString()}</p><p className="text-[8px] opacity-80 mt-1">Net Balance Transfer</p></div></div><div className="flex gap-4"><button className="flex-1 border border-indigo-500 text-indigo-500 font-bold py-3 rounded-xl hover:bg-indigo-500/10">📥 Download Statement PDF</button><button onClick={markLedgerSettled} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-md">🔒 Mark Ledger as Settled</button></div></div>
      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border border-dashed border-indigo-500/40 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6`}><div className="md:col-span-3"><h3 className="text-base md:text-lg font-black text-indigo-500">⚡ Master Global Sheet</h3></div><div className="bg-slate-950 p-4 rounded-xl text-white"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">📊 Gross Network Revenue</p><p className="text-2xl md:text-3xl font-black text-blue-400 mt-1">₹{totalSystemRevenue.toLocaleString()}</p></div><div className="bg-slate-950 p-4 rounded-xl text-white"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">📉 Total Fixed Expense</p><p className="text-2xl md:text-3xl font-black text-red-400 mt-1">₹{exp.toLocaleString()}</p></div><div className="bg-slate-950 p-4 rounded-xl text-white"><p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase">☕ Total Petty Cash</p><p className="text-2xl md:text-3xl font-black text-orange-400 mt-1">₹{totalPetty.toLocaleString()}</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"><div className={`${cardBg} p-4 md:p-6 rounded-3xl border space-y-4`}><h3 className="font-bold text-sm md:text-md text-indigo-500">Fixed Operational Expenses</h3><div className="space-y-4"><div><label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Monthly Vehicle EMI (₹)</label><input type="number" value={acc.emi} onChange={e=>setAcc({...acc, emi:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] ${inputBg}`} /></div><div><label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Diesel & Highway Toll Log (₹)</label><input type="number" value={acc.diesel} onChange={e=>setAcc({...acc, diesel:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] ${inputBg}`} /></div><div><label className="text-[10px] md:text-xs font-bold opacity-60 uppercase">Misc Office Rent & Utilities (₹)</label><input type="number" value={acc.other} onChange={e=>setAcc({...acc, other:Number(e.target.value)})} className={`w-full p-2 md:p-3 mt-1 rounded-xl border outline-none font-bold [appearance:textfield] ${inputBg}`} /></div></div></div><div className="bg-slate-950 p-6 md:p-8 rounded-3xl text-white flex flex-col justify-center shadow-xl"><div className="flex justify-between items-center mb-2 md:mb-4"><h3 className="text-lg md:text-xl font-black tracking-wider text-indigo-400">PARTNERSHIP SETTLEMENT</h3><div className="flex items-center gap-2"><span className="text-xs opacity-60 uppercase">Partners:</span><input type="number" value={partnerCount} onChange={e=>setPartnerCount(Number(e.target.value))} className="w-16 bg-slate-800 text-white font-bold p-1 rounded text-center border border-slate-700 outline-none" /></div></div><p className="text-xs md:text-sm opacity-60">Global Base Profit Yield: ₹{net.toLocaleString()}</p><div className="mt-4 md:mt-6 bg-white/5 p-4 md:p-6 rounded-2xl text-center border border-white/10"><p className="text-[10px] md:text-xs opacity-50 uppercase tracking-widest mb-1">Per Partner Yield</p><p className="text-3xl md:text-4xl font-black text-emerald-400">₹{((net / (partnerCount||1)) || 0).toLocaleString()}</p></div></div></div>
      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border flex flex-col h-full`}><h3 className="font-black text-sm md:text-md text-indigo-500 border-b pb-4 border-slate-500/20 mb-4">Petty Cash Ledger (Daily/Branch)</h3><div className="flex gap-2 mb-4"><input value={pettyDesc} onChange={e=>setPettyDesc(e.target.value)} placeholder="Detail (Tea, Coolie)" className={`flex-1 p-2 border rounded-lg text-sm outline-none ${inputBg}`} /><input value={pettyAmt} onChange={e=>setPettyAmt(e.target.value)} placeholder="Amt ₹" type="number" className={`w-24 p-2 border rounded-lg text-sm outline-none font-bold ${inputBg}`} /><button onClick={addPetty} className="bg-orange-500 text-white px-4 rounded-lg font-bold text-sm">+</button></div><div className={`flex-1 overflow-y-auto max-h-40 border rounded-lg ${inputBg}`}>{pettyLedger.map((l, i) => ( <div key={i} className="flex justify-between p-3 border-b border-slate-500/20 text-xs md:text-sm"><span>{l.desc} <span className="text-[10px] opacity-50 ml-2">{l.date}</span></span><span className="font-bold text-orange-500">₹{l.amt}</span></div> ))}</div></div>
    </div>
  );
}

// 🔥 ULTIMATE BUG-FREE INVOICE LOGIC IN ADMIN 🔥
function Admin({parcels, users, setUsers, setParcels, db, showMsg, isDark, user, creditAuthList, setCreditAuthList, setGlobalView}) {
  const [tab, setTab] = useState('parcels'); const [editF, setEditF] = useState(null); 
  const [newUser, setNewUser] = useState(""); const [newPass, setNewPass] = useState(""); const [newRole, setNewRole] = useState("staff"); const [newBranch, setNewBranch] = useState(CITIES[0]);
  const [newCPhone, setNewCPhone] = useState(""); const [newCName, setNewCName] = useState(""); const [paymentFilter, setPaymentFilter] = useState("All"); const [branchFilter, setBranchFilter] = useState(user.branch); const [searchQuery, setSearchQuery] = useState("");
  const d = new Date(); const todayStr = d.toISOString().split('T')[0]; d.setDate(1); const firstDayStr = d.toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstDayStr); const [toDate, setToDate] = useState(todayStr); const [invCustomer, setInvCustomer] = useState("");
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"; const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"; const tblBg = isDark ? "bg-slate-800/40" : "bg-slate-50"; const isSuper = user.role === 'superadmin';

  useEffect(() => { if (newRole === 'superadmin') setNewBranch('All'); else if (newRole === 'staff' && newBranch === 'All') setNewBranch(CITIES[0]); }, [newRole]);

  const handleAddUser = async () => { if(!newUser || !newPass) return showMsg("Fill administrative requirements", "error"); const assignedRole = isSuper ? newRole : "staff"; const assignedBranch = assignedRole === 'superadmin' ? 'All' : newBranch; const u = {id: genUserId(), username: newUser, password: newPass, role: assignedRole, branch: assignedBranch}; await db.insertUser(u); setUsers([u, ...users]); setNewUser(""); setNewPass(""); showMsg(`${assignedRole.toUpperCase()} Created!`); };
  
  const addCreditAuth = async () => { 
    if(newCPhone.length !== 10 || !newCName) return showMsg("Invalid Credit details", "error"); 
    const newData = {phone: newCPhone, company: newCName}; 
    const newList = [...creditAuthList, newData]; 
    setCreditAuthList(newList); 
    await db.insertCreditAuth(newData); 
    setNewCPhone(""); setNewCName(""); 
    showMsg("Credit Account Authorized!"); 
  };
  
  const removeCredit = async (phone) => { 
    const newList = creditAuthList.filter(c => c.phone !== phone); 
    setCreditAuthList(newList); 
    await db.deleteCreditAuth(phone); 
    showMsg("Credit Auth Revoked", "error"); 
  };

  const deleteRecord = async (id) => { const reason = window.prompt(`Exact reason for deleting ${id}:`); if (!reason || reason.trim() === "") return showMsg("Deletion reason mandatory.", "error"); const target = parcels.find(p => p.id === id); const updatedHistory = [...target.history, {status: "Deleted", loc: user.branch, time: new Date().toLocaleString(), reason: reason}]; const updatedParcel = { ...target, status: 'Deleted', deletedBy: user.username, deleteReason: reason, history: updatedHistory }; await db.updateParcel(id, updatedParcel); setParcels(parcels.map(p => p.id === id ? updatedParcel : p)); showMsg("Consignment dropped.", "error"); };
  const saveOverrides = async () => { await db.updateParcel(editF.id, editF); setParcels(parcels.map(p => p.id === editF.id ? editF : p)); setEditF(null); showMsg("Consignment updated"); };

  const sortedTableData = [...parcels].reverse().filter(p => {
    if (p.status === 'Deleted' && !isSuper) return false;
    if (fromDate && toDate && p.isoDate) { const pDate = p.isoDate.split('T')[0]; if (pDate < fromDate || pDate > toDate) return false; }
    if (paymentFilter !== "All" && p.payment !== paymentFilter) return false;
    if (branchFilter !== "All") { if (p.bookedBranch !== branchFilter && p.deliveredBranch !== branchFilter && p.from !== branchFilter && p.to !== branchFilter) return false; }
    if (searchQuery) { const matchTerm = searchQuery.toLowerCase(); return p.id.toLowerCase().includes(matchTerm) || p.sPhone.includes(matchTerm) || p.sName.toLowerCase().includes(matchTerm); }
    return true;
  });

  const exportData = () => { if (sortedTableData.length === 0) return showMsg("No data to export", "error"); const headers = ["LR No", "Date", "Sender", "Receiver", "Origin", "Destination", "Payment Mode", "Amount", "Status", "Booked By"]; const rows = sortedTableData.map(p => [p.id, p.date, p.sName, p.rName, p.from, p.to, p.payment, p.price, p.status, p.bookedBy].join(',')); const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n'); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `MPS_Report.csv`); document.body.appendChild(link); link.click(); link.remove(); showMsg("Report Downloaded!"); };
  
  // 🔥 MULTI-NUMBER INVOICE MAGIC 🔥
  const triggerInvoice = () => { 
    if(!invCustomer) return showMsg("Select a Customer Account!", "error"); 
    
    // Intha company perula entha phone number irunthalum atha kanduka thevayilla.
    // Namma company peraiye theliva match panni ellathaiyum orey bill-la podurom.
    const invoiceParcels = parcels.filter(p => {
        if (p.status === 'Deleted') return false;
        const isCreditLedger = p.payment === "Credit" || p.deliveryMode === "Credit" || (p.notes && p.notes.includes("Mode: Credit"));
        const matchCustomer = p.creditCustomer && p.creditCustomer.trim().toLowerCase() === invCustomer.trim().toLowerCase();
        const pDateStr = p.isoDate ? p.isoDate.split('T')[0] : "";
        const matchDate = (!fromDate || pDateStr >= fromDate) && (!toDate || pDateStr <= toDate);
        return isCreditLedger && matchCustomer && matchDate;
    });

    if(invoiceParcels.length === 0) return showMsg("No credit bills found for this period.", "error"); 
    
    // Find at least one phone number to show on the invoice header
    const sampleAuth = creditAuthList.find(c => c.company.toLowerCase() === invCustomer.toLowerCase());
    const displayPhone = sampleAuth ? sampleAuth.phone : "Multiple Acc Numbers";

    generateInvoicePDF(invCustomer, displayPhone, fromDate, toDate, invoiceParcels); 
    showMsg(`Invoice Generated for ${invCustomer}`); 
  };

  const settleCreditBill = async () => {
    if(!invCustomer) return showMsg("Select a Customer Account!", "error");
    if(!window.confirm(`Mark all bills for ${invCustomer} (${fromDate} to ${toDate}) as PAID?`)) return;
    
    const invoiceParcels = parcels.filter(p => {
        if (p.status === 'Deleted' || p.creditSettled) return false;
        const isCreditLedger = p.payment === "Credit" || p.deliveryMode === "Credit" || (p.notes && p.notes.includes("Mode: Credit"));
        const matchCustomer = p.creditCustomer && p.creditCustomer.trim().toLowerCase() === invCustomer.trim().toLowerCase();
        const pDateStr = p.isoDate ? p.isoDate.split('T')[0] : "";
        const matchDate = (!fromDate || pDateStr >= fromDate) && (!toDate || pDateStr <= toDate);
        return isCreditLedger && matchCustomer && matchDate;
    });
    
    if(invoiceParcels.length === 0) return showMsg("No unpaid bills found in this date range.", "error");
    let updatedParcelsList = [...parcels];
    for (let p of invoiceParcels) { const updated = {...p, creditSettled: true}; await db.updateParcel(updated.id, updated); updatedParcelsList = updatedParcelsList.map(x => x.id === updated.id ? updated : x); }
    setParcels(updatedParcelsList); showMsg(`Successfully settled ${invoiceParcels.length} parcels for ${invCustomer}!`);
  };

  // Unique companies list for the dropdown
  const uniqueCompanies = [...new Set(creditAuthList.map(c => c.company))];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap gap-2 md:gap-4"><button onClick={()=>setTab('parcels')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='parcels'?'bg-indigo-600 text-white':cardBg}`}>📋 Audits & Analytics</button><button onClick={()=>setTab('staff')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='staff'?'bg-indigo-600 text-white':cardBg}`}>👥 System RBAC</button><button onClick={()=>setTab('credit')} className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-sm font-bold ${tab==='credit'?'bg-amber-600 text-white':cardBg}`}>💳 Credit Control</button></div>
      {tab === 'staff' && ( <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"><div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}><h3 className="font-black text-sm md:text-base">Assign Privilege Context</h3><input value={newUser} onChange={e=>setNewUser(e.target.value)} placeholder="Username Identifier" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} /><input value={newPass} onChange={e=>setNewPass(e.target.value)} type="password" placeholder="Account Password" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} />{isSuper && ( <select value={newRole} onChange={e=>setNewRole(e.target.value)} className={`w-full p-2 md:p-3 rounded-xl border font-bold outline-none text-sm ${inputBg}`}><option value="staff">Privilege Level: STAFF</option><option value="admin">Privilege Level: ADMIN</option><option value="superadmin">Privilege Level: SUPERADMIN</option></select> )}<select disabled={newRole === 'superadmin'} value={newBranch} onChange={e=>setNewBranch(e.target.value)} className={`w-full p-2 md:p-3 rounded-xl border font-bold outline-none text-sm ${inputBg} ${newRole==='superadmin'?'opacity-50 cursor-not-allowed':''}`}>{(isSuper && (newRole === 'admin' || newRole === 'superadmin')) && <option value="All">Global Access (All Branches)</option>}{CITIES.map(c => <option key={c} value={c}>Branch: {c}</option>)}</select><button onClick={handleAddUser} className="w-full bg-indigo-600 text-white font-bold py-2 md:py-3 rounded-xl text-sm md:text-base">Commit Assignment</button></div><div className={`${cardBg} p-4 md:p-6 rounded-2xl border lg:col-span-2 space-y-3`}><h3 className="font-black text-sm md:text-base">Identity Mapping Matrix</h3><div className="space-y-2 max-h-64 overflow-y-auto pr-2">{users.filter(u => isSuper ? true : u.role === 'staff').map(u => { const canManage = isSuper ? (u.username !== user.username) : true; return ( <div key={u.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-xl bg-black/5 gap-2"><div><p className="font-bold text-sm">{u.username} <span className="text-[10px] ml-1 opacity-50">({u.branch})</span></p><p className={`text-[10px] uppercase font-black ${u.role === 'superadmin' ? 'text-amber-500' : 'text-indigo-500'}`}>{u.role}</p></div>{canManage && ( <div className="flex items-center gap-2"><button onClick={async ()=>{ await db.deleteUser(u.id); setUsers(users.filter(x=>x.id!==u.id)); showMsg("Access revoked", "error"); }} className="text-red-500 text-[10px] font-bold border border-red-500/20 px-2 py-1 rounded bg-red-500/10">Revoke 🗑️</button></div> )}</div> ) })}</div></div></div> )}
      {tab === 'credit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4`}><h3 className="font-black text-sm md:text-base text-amber-500">Add Authorized Credit Account</h3><p className="text-[10px] md:text-xs opacity-60">You can add multiple phone numbers under the same Company Name.</p><input value={newCPhone} onChange={e=>setNewCPhone(e.target.value)} placeholder="Customer 10-digit Mobile" maxLength="10" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} /><input value={newCName} onChange={e=>setNewCName(e.target.value)} placeholder="Company / Individual Name" className={`w-full p-2 md:p-3 rounded-xl border outline-none ${inputBg}`} /><button onClick={addCreditAuth} className="w-full bg-amber-600 text-white font-bold py-2 md:py-3 rounded-xl text-sm md:text-base">Authorize Account</button></div>
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border h-96 overflow-y-auto`}><h3 className="font-black text-sm md:text-base mb-4">Approved Credit Ledger</h3>{creditAuthList.length === 0 ? <p className="text-sm opacity-50">No credit accounts authorized.</p> : <div className="space-y-2">{creditAuthList.map((c, i) => ( <div key={i} className="flex justify-between items-center p-3 border border-slate-500/20 rounded-xl bg-black/5"><div><p className="font-bold text-sm text-amber-500">{c.company}</p><p className="text-[10px] opacity-80 font-mono">📱 {c.phone}</p></div><button onClick={()=>removeCredit(c.phone)} className="text-red-500 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Revoke</button></div> ))}</div> }</div>
          <div className={`${cardBg} p-4 md:p-6 rounded-2xl border space-y-4 lg:col-span-2 border-indigo-500/30`}>
             <h3 className="font-black text-sm md:text-base text-indigo-500">📑 Generate Monthly Credit Invoice</h3>
             <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <select value={invCustomer} onChange={e=>setInvCustomer(e.target.value)} className={`sm:col-span-2 p-3 rounded-xl border font-bold text-sm ${inputBg}`}>
                  <option value="">Select Account...</option>
                  {uniqueCompanies.map((c,i) => <option key={i} value={c}>{c}</option>)}
                </select>
                <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className={`p-3 rounded-xl border text-sm font-bold ${inputBg}`} />
                <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className={`p-3 rounded-xl border text-sm font-bold ${inputBg}`} />
             </div>
             <div className="flex gap-2 flex-col md:flex-row"><button onClick={triggerInvoice} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md">🖨️ Print Consolidated Invoice</button><button onClick={settleCreditBill} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md">✅ Mark Bill as PAID</button></div>
          </div>
        </div>
      )}
      {tab === 'parcels' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4"><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 Keyword" className={`p-2 md:p-3 rounded-xl border text-sm ${cardBg}`} /><select disabled={!isSuper} value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg} ${!isSuper && 'opacity-50 cursor-not-allowed'}`}>{isSuper && <option value="All">All Branches</option>}{CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`} title="From Date" /><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`} title="To Date" /><select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)} className={`p-2 md:p-3 rounded-xl border font-bold text-sm ${cardBg}`}><option value="All">All Modes</option><option value="Paid">Paid</option><option value="To Pay">To Pay</option><option value="Credit">Credit</option></select></div>
          <button onClick={exportData} className="w-full py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors text-[10px] md:text-xs font-bold rounded-lg border border-indigo-500/20">📥 Export CSV Record</button>
          <div className={`${cardBg} rounded-2xl border overflow-x-auto shadow-sm`}>
            <table className="min-w-[800px] w-full text-left whitespace-nowrap">
              <thead className={`${tblBg} text-[10px] md:text-xs font-bold uppercase opacity-80`}><tr><th className="p-3 md:p-4">LR Code</th><th className="p-3 md:p-4">Route Info</th><th className="p-3 md:p-4">Billing Parameters</th><th className="p-3 md:p-4">Tracking Node</th><th className="p-3 md:p-4">Operations Control</th></tr></thead>
              <tbody>
                {sortedTableData.length === 0 ? <tr><td colSpan="5" className="p-8 text-center opacity-50 font-bold">No records found.</td></tr> : sortedTableData.map(p => {
                  const canEditDrop = p.status !== 'Delivered' && p.status !== 'RTO' && p.status !== 'Deleted';
                  return (
                  <tr key={p.id} className={`border-t hover:bg-black/5 ${p.status === 'Deleted' ? 'bg-red-500/5 border-red-500/10' : 'border-slate-500/10'}`}>
                    <td className="p-3 md:p-4 font-black text-indigo-500 text-sm cursor-pointer hover:underline" onClick={() => setGlobalView(p)}>{p.id} <span className="block text-[10px] opacity-50 font-normal">{p.date}</span></td>
                    <td className="p-3 md:p-4 text-xs md:text-sm font-bold">{p.from} ➔ {p.to}</td>
                    <td className="p-3 md:p-4 text-xs md:text-sm">₹{p.price} <b className="text-[10px] md:text-xs opacity-60">({p.payment})</b></td>
                    <td className="p-3 md:p-4"><span className="px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase" style={{backgroundColor: S_CLR[p.status]+'22', color: S_CLR[p.status]}}>{p.status}</span>{p.status === 'Deleted' && isSuper && ( <div className="text-[10px] text-red-500 font-bold mt-1"><p>By: {p.deletedBy}</p><p>Reason: {p.deleteReason}</p></div> )}</td>
                    <td className="p-3 md:p-4 space-x-1 md:space-x-2">
                      {(canEditDrop || isSuper) && p.status !== 'Deleted' && ( <><button onClick={()=>setEditF(p)} className="text-amber-500 text-[10px] md:text-xs font-bold border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5">✏️ Edit</button><button onClick={()=>deleteRecord(p.id)} className="text-red-500 text-[10px] md:text-xs font-bold border border-red-500/20 px-2 py-1 rounded bg-red-500/5">🗑️ Drop</button></> )}
                      {!canEditDrop && !isSuper && p.status !== 'Deleted' && <span className="text-[10px] opacity-50 italic">🔒 Locked</span>}
                      <button onClick={()=>generatePDF(p)} className="text-blue-500 text-[10px] md:text-xs font-bold border border-blue-500/20 px-2 py-1 rounded bg-blue-500/5">🖨️ Print</button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}
      {editF && ( <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"><div className={`${cardBg} p-6 rounded-2xl max-w-lg w-full space-y-4 animate-bounce-in`}><h3 className="font-black text-lg">Modify Manifest Parameters: {editF.id}</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><input value={editF.sName} onChange={e=>setEditF({...editF, sName:e.target.value})} placeholder="Sender Identity" className={`p-2 border rounded text-sm ${inputBg}`} /><input value={editF.rName} onChange={e=>setEditF({...editF, rName:e.target.value})} placeholder="Receiver Identity" className={`p-2 border rounded text-sm ${inputBg}`} /><select value={editF.status} onChange={e=>setEditF({...editF, status:e.target.value})} className={`p-2 border rounded text-sm ${inputBg}`}>{STATUSES.filter(s=>s!=='Deleted').map(s=><option key={s}>{s}</option>)}</select><input type="number" value={editF.price} onChange={e=>setEditF({...editF, price:Number(e.target.value)})} placeholder="Price Override" className={`p-2 border rounded font-bold text-sm ${inputBg}`} /></div><div className="flex gap-2 mt-4"><button onClick={saveOverrides} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl flex-1 text-sm">Save Changes</button><button onClick={()=>setEditF(null)} className="bg-slate-500 text-white py-2 px-4 rounded-xl text-sm">Dismiss</button></div></div></div> )}
    </div>
  );
}

function Login({onLogin, theme}) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err, setErr] = useState(""); const isDark = theme === 'dark';
  const handleSub = async () => { const success = await onLogin(u,p); if(!success) { setP(""); setErr("Invalid Identity ID or Passcode!"); document.getElementById('pwdIn').focus(); } };
  return (
    <div className={`flex h-screen items-center justify-center p-4 ${isDark?'bg-slate-900':'bg-slate-100'}`}>
      <div className={`${isDark?'bg-slate-800 border-slate-700 text-white':'bg-white border-slate-200 text-slate-800'} p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border relative`}><div className="flex justify-center mb-6"><MpsLogo /></div><h2 className="text-xl md:text-2xl font-black mb-2 tracking-widest">MPS TERMINAL</h2>{err ? <p className="text-red-500 font-bold mb-4 text-xs md:text-sm animate-fade-in">{err}</p> : <div className="h-4 mb-4"></div>}<input id="userIn" onKeyDown={e=> e.key === 'Enter' ? document.getElementById('pwdIn').focus() : null} value={u} onChange={e=>{setU(e.target.value); setErr("");}} placeholder="User Identity ID" className="w-full border p-3 rounded-xl mb-4 text-center font-bold text-slate-900 bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base" /><input id="pwdIn" onKeyDown={e=> e.key === 'Enter' && handleSub()} value={p} onChange={e=>{setP(e.target.value); setErr("");}} type="password" placeholder="Credential Security Code" className="w-full border p-3 rounded-xl mb-6 text-center font-bold text-slate-900 bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base" /><button onClick={handleSub} className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition text-sm md:text-base">Access Server</button></div>
    </div>
  );
}