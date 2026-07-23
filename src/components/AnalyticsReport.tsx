import React, { useState, useMemo } from 'react';
import { Book, BookTransaction, Student } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  BookOpen, 
  Users, 
  Layers, 
  Award, 
  Sparkles, 
  Printer, 
  ArrowUpRight, 
  FileText,
  Bookmark,
  Calendar
} from 'lucide-react';

interface AnalyticsReportProps {
  books: Book[];
  transactions: BookTransaction[];
  students: Student[];
}

// Reuse the parseStudentDept function
const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  let level = '';
  let room = '-';
  let major = clean;

  const levelRegex = /(ปวช\s*\.\s*[1-3]|ปวส\s*\.\s*[1-2]|ม\s*\.\s*[1-6]|ปวช|ปวส)/i;
  const levelMatch = clean.match(levelRegex);
  if (levelMatch) {
    level = levelMatch[1].replace(/\s+/g, ''); // e.g. "ปวส.1"
    major = major.replace(levelMatch[0], '').trim();
  }

  const roomRegexes = [
    /ห้อง\s*([0-9]+\/[0-9]+)/,
    /ห้อง\s*([0-9]+)/,
    /([0-9]+\/[0-9]+)/,
    /\/([0-9]+)/
  ];

  let roomMatched = false;
  for (const regex of roomRegexes) {
    const match = major.match(regex);
    if (match) {
      room = match[1] || match[0];
      if (room.startsWith('/')) {
        const rNum = room.replace('/', '');
        const lvlNum = level.match(/\d+/);
        if (lvlNum) {
          room = `${lvlNum[0]}/${rNum}`;
        } else {
          room = rNum;
        }
      }
      major = major.replace(match[0], '').trim();
      roomMatched = true;
      break;
    }
  }

  if (!roomMatched && level) {
    const originalWithSlash = new RegExp(level.replace('.', '\\.') + '\\/([0-9]+)');
    const slashMatch = clean.match(originalWithSlash);
    if (slashMatch) {
      const rNum = slashMatch[1];
      const lvlNum = level.match(/\d+/);
      if (lvlNum) {
        room = `${lvlNum[0]}/${rNum}`;
      } else {
        room = rNum;
      }
      major = major.replace(new RegExp('\\/?' + rNum), '').trim();
      roomMatched = true;
    }
  }

  const parenRegex = /\(([^)]+)\)/;
  const parenMatch = major.match(parenRegex);
  if (parenMatch) {
    const code = parenMatch[1].trim();
    if (room === '-') {
      room = code;
    }
    if (!level) {
      const dashNum = code.match(/-([1-4][A-Z]?)$/);
      if (dashNum) {
        level = `ปี ${dashNum[1]}`;
      }
    }
    major = major.replace(parenMatch[0], '').trim();
  }

  major = major
    .replace(/\s*ห้อง\s*/g, ' ')
    .replace(/^\s*[\/\-,\(\)]+\s*|\s*[\/\-,\(\)]+\s*$/g, '')
    .trim();

  if (!level) {
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      level = parts[0].trim();
      major = parts.slice(1).join(' ').trim();
    } else {
      level = 'ทั่วไป';
      major = clean;
    }
  }

  if (!major || major === '/') {
    major = 'ทั่วไป';
  }

  return { level, room, major };
};

export default function AnalyticsReport({ books, transactions, students }: AnalyticsReportProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Compute stats in real-time
  const summaryStats = useMemo(() => {
    let totalCopiesReceived = 0;
    let totalCopiesGivenOut = 0;
    let totalCopiesInStock = 0;

    books.forEach(b => {
      totalCopiesReceived += b.receivedQty || 0;
      totalCopiesGivenOut += b.givenOutQty || 0;
      totalCopiesInStock += b.stockQty || 0;
    });

    const outOfStockCount = books.filter(b => b.stockQty <= 0).length;
    const lowStockCount = books.filter(b => b.stockQty > 0 && b.stockQty < 5).length;

    // Filter transactions to approved only
    const approvedTx = transactions.filter(t => t.status === 'approved');
    const totalBorrowed = approvedTx.filter(t => t.type === 'borrow').reduce((acc, t) => acc + t.qty, 0);
    const totalGivenOutDirect = approvedTx.filter(t => t.type === 'give_out').reduce((acc, t) => acc + t.qty, 0);

    return {
      totalCopiesReceived,
      totalCopiesGivenOut,
      totalCopiesInStock,
      outOfStockCount,
      lowStockCount,
      totalBorrowed,
      totalGivenOutDirect,
      activeTxCount: transactions.length
    };
  }, [books, transactions]);

  // List of unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    books.forEach(b => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [books]);

  // Group books by category with statistics
  const categoryStats = useMemo(() => {
    const statsMap: Record<string, { name: string; count: number; received: number; given: number; stock: number }> = {};
    
    books.forEach(b => {
      const cat = b.category || 'ทั่วไป';
      if (!statsMap[cat]) {
        statsMap[cat] = { name: cat, count: 0, received: 0, given: 0, stock: 0 };
      }
      statsMap[cat].count += 1;
      statsMap[cat].received += b.receivedQty || 0;
      statsMap[cat].given += b.givenOutQty || 0;
      statsMap[cat].stock += b.stockQty || 0;
    });

    return Object.values(statsMap).sort((a, b) => b.received - a.received);
  }, [books]);

  // Group transactions by Student Grade Level (parsed)
  const gradeLevelStats = useMemo(() => {
    const statsMap: Record<string, { level: string; totalBooks: number; borrowCount: number; giveawayCount: number }> = {};

    transactions.forEach(tx => {
      if (tx.status !== 'approved') return;
      
      // Find user department
      const student = students.find(s => s.id === tx.userId);
      const deptStr = student?.department || 'ทั่วไป';
      const parsed = parseStudentDept(deptStr);
      const lvl = parsed.level || 'ทั่วไป';

      if (!statsMap[lvl]) {
        statsMap[lvl] = { level: lvl, totalBooks: 0, borrowCount: 0, giveawayCount: 0 };
      }

      statsMap[lvl].totalBooks += tx.qty;
      if (tx.type === 'borrow') {
        statsMap[lvl].borrowCount += tx.qty;
      } else if (tx.type === 'give_out') {
        statsMap[lvl].giveawayCount += tx.qty;
      }
    });

    return Object.values(statsMap).sort((a, b) => b.totalBooks - a.totalBooks);
  }, [transactions, students]);

  // Top distributed/borrowed books
  const topBooks = useMemo(() => {
    return books
      .map(b => ({
        ...b,
        popularity: b.givenOutQty
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);
  }, [books]);

  // Trigger browser printing for clean report export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Filters and Actions Header */}
      <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            ระบบรายงานข้อมูลและสถิติวิเคราะห์เชิงลึก
          </h3>
          <p className="text-xs text-slate-500">รายงานข้อมูลเรียลไทม์ ตรวจสอบความเคลื่อนไหวคลัง สัดส่วนการแจกจ่าย และพฤติกรรมการยืมแยกตามห้องเรียน</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ml-auto"
        >
          <Printer className="w-4 h-4" />
          พิมพ์เอกสารรายงาน (PDF)
        </button>
      </div>

      {/* Main Print Header (Visible only when printing) */}
      <div className="hidden print:block text-center border-b pb-6 mb-6">
        <h1 className="text-2xl font-black text-slate-900">รายงานสถิติวิเคราะห์และสถานะคลังหนังสือเรียน</h1>
        <p className="text-sm text-slate-600 mt-1">สถาบันการศึกษาระบบยืม-คืนและแจกจ่ายหนังสืออัตโนมัติ</p>
        <p className="text-xs text-slate-500 mt-2">พิมพ์รายงานเมื่อวันที่: {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}</p>
      </div>

      {/* Overview Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Book Titles */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ประเภทหนังสือที่มี</p>
            <p className="text-2xl font-black text-slate-800">{books.length} <span className="text-xs font-semibold text-slate-500">รายวิชา</span></p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">รวม {summaryStats.totalCopiesReceived} เล่มสะสม</p>
          </div>
        </div>

        {/* Distributed Copies */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">แจก/ถูกยืมไปแล้ว</p>
            <p className="text-2xl font-black text-slate-800">
              {summaryStats.totalCopiesGivenOut} <span className="text-xs font-semibold text-slate-500">เล่ม</span>
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
              คิดเป็น {summaryStats.totalCopiesReceived > 0 ? ((summaryStats.totalCopiesGivenOut / summaryStats.totalCopiesReceived) * 100).toFixed(1) : 0}% ของทั้งหมด
            </p>
          </div>
        </div>

        {/* In-stock Copies */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">คงเหลือพร้อมใช้งาน</p>
            <p className="text-2xl font-black text-slate-800">{summaryStats.totalCopiesInStock} <span className="text-xs font-semibold text-slate-500">เล่ม</span></p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              คิดเป็น {summaryStats.totalCopiesReceived > 0 ? ((summaryStats.totalCopiesInStock / summaryStats.totalCopiesReceived) * 100).toFixed(1) : 0}% อยู่ในตู้
            </p>
          </div>
        </div>

        {/* Out of Stock / Alerts */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs flex items-center gap-4 ${summaryStats.outOfStockCount > 0 ? 'border-rose-200 bg-rose-50/5' : 'border-slate-150'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${summaryStats.outOfStockCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">วิกฤตสต็อก / หมดชั่วคราว</p>
            <p className="text-2xl font-black text-slate-800">{summaryStats.outOfStockCount} <span className="text-xs font-semibold text-slate-500">วิชา</span></p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">เตือนภัยใกล้หมดอีก {summaryStats.lowStockCount} วิชา</p>
          </div>
        </div>

      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Distribution by Level & Categories (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Chart 1: Distribution Volume by Class Level */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  ยอดการทำรายการรับหนังสือ จำแนกตามระดับชั้นปี (Real-time Class Demand)
                </h4>
                <p className="text-xs text-slate-400">วิเคราะห์ว่ากลุ่มนักเรียนระดับใดมีการเข้ามารับหนังสือ/ยืมสูงสุด เพื่อเตรียมความพร้อมในการบริการช่วงเปิดเทอม</p>
              </div>
            </div>

            {gradeLevelStats.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่มีสถิติความต้องการกลุ่มระดับชั้นในขณะนี้ เนื่องจากยังไม่มีการทำรายการธุรกรรมอนุมัติ
              </div>
            ) : (
              <div className="space-y-4">
                {gradeLevelStats.map((item, index) => {
                  const maxVolume = Math.max(...gradeLevelStats.map(i => i.totalBooks)) || 1;
                  const percentWidth = (item.totalBooks / maxVolume) * 100;

                  return (
                    <div key={item.level} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">{index + 1}</span>
                          {item.level === 'ทั่วไป' ? 'บุคคลทั่วไป / อื่นๆ' : `ระดับชั้น ${item.level}`}
                        </span>
                        <span className="text-slate-800 font-black">{item.totalBooks} เล่ม <span className="text-slate-400 font-semibold text-[10px]">(แจก {item.giveawayCount} | ยืม {item.borrowCount})</span></span>
                      </div>
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
                        <div 
                          style={{ width: `${percentWidth}%` }} 
                          className="h-full bg-gradient-to-r from-teal-500 to-indigo-600 rounded-full transition-all duration-1000"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2: Category Breakdown and Capacity */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                อัตราส่วนคงคลังและการแจกจ่าย แยกตามประเภทหมวดหมู่ (Category Analysis)
              </h4>
              <p className="text-xs text-slate-400">ภาพรวมสัดส่วนหนังสือในตู้ (คงเหลือพร้อมใช้) เปรียบเทียบกับหนังสือที่แจกจ่ายออกไปแล้ว เพื่อควบคุมระดับสต็อกขั้นต่ำ</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-2.5">หมวดหมู่รายวิชา</th>
                    <th className="py-2.5">จำนวนวิชา</th>
                    <th className="py-2.5">จำนวนรับทั้งหมด</th>
                    <th className="py-2.5">แจกจ่ายสะสม</th>
                    <th className="py-2.5 text-right">สัดส่วนแจกจ่าย / คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                  {categoryStats.map(cat => {
                    const total = cat.received || 1;
                    const givePercent = Math.round((cat.given / total) * 100);
                    const stockPercent = 100 - givePercent;

                    return (
                      <tr key={cat.name} className="hover:bg-slate-50/50">
                        <td className="py-3 font-bold text-slate-800">{cat.name}</td>
                        <td className="py-3">{cat.count} วิชา</td>
                        <td className="py-3 font-semibold text-slate-700">{cat.received} เล่ม</td>
                        <td className="py-3 text-indigo-600 font-semibold">{cat.given} เล่ม</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-indigo-600">{givePercent}% แจก</span>
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden flex">
                              <div style={{ width: `${givePercent}%` }} className="h-full bg-indigo-500 shrink-0" />
                              <div style={{ width: `${stockPercent}%` }} className="h-full bg-emerald-500 shrink-0" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600">{stockPercent}% เหลือ</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Popular Books & Alerts (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top 5 Most Popular Books */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-amber-500" />
                วิชาเรียนยอดนิยม / แจกจ่ายสูงสุด
              </h4>
              <p className="text-[10px] text-slate-400">หนังสือที่มีอัตราการแจกจ่ายและความต้องการสูงสุดในสถาบัน</p>
            </div>

            <div className="space-y-3.5">
              {topBooks.map((book, index) => {
                const total = book.receivedQty || 1;
                const percent = Math.round((book.givenOutQty / total) * 100);

                return (
                  <div key={book.id} className="flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">{book.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{book.category} | {book.author}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-slate-800">{book.givenOutQty} เล่ม</p>
                      <p className="text-[9px] font-bold text-slate-400">{percent}% จากสต็อก</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert: Out of Stock Warning list */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4.5 h-4.5" />
                เตือนหนังสือหมด / สต็อกวิกฤต
              </h4>
              <p className="text-[10px] text-slate-400">รายชื่อหนังสือที่จำเป็นต้องนำเข้าเพิ่มเติมเนื่องจากไม่พอแจกจ่ายนักศึกษาปีนี้</p>
            </div>

            {books.filter(b => b.stockQty < 5).length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                ✅ ข้อมูลคลังสมบูรณ์ ไม่มีหนังสือใกล้หมด
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {books
                  .filter(b => b.stockQty < 5)
                  .sort((a, b) => a.stockQty - b.stockQty)
                  .map(book => (
                    <div key={book.id} className="p-2.5 rounded-xl bg-rose-50/30 border border-rose-100 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-rose-950 truncate leading-tight">{book.title}</p>
                        <p className="text-[9px] text-rose-700 font-semibold mt-0.5">{book.category} | เก็บที่: {book.location || 'คลังกลาง'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {book.stockQty === 0 ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[8px] rounded-full uppercase tracking-wider">หมดเกลี้ยง</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-500 text-white font-black text-[8px] rounded-full">เหลือ {book.stockQty} เล่ม</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
