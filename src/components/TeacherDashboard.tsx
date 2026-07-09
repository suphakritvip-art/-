import React, { useState, useEffect } from 'react';
import { Book, BookTransaction, Student } from '../types';
import { 
  Plus, Trash2, Edit2, Users, FileSpreadsheet, Check, X,
  RefreshCw, LogOut, Loader2, Sparkles, AlertCircle, CheckCircle2,
  FileDown, PlusCircle, HelpCircle, BookOpen, Search, Filter, 
  ChevronRight, HeartHandshake, Undo2, Ban, Import, Trash, Eye
} from 'lucide-react';

interface TeacherDashboardProps {
  teacher: { username: string; name: string };
  onLogout: () => void;
}

const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  // Check if it has a slash e.g. "ม.4/1" or "ปวช.1/2 ช่างยนต์" or "ม.4/2 ทั่วไป"
  const regex = /^([^/]+)\/([^/\s]+)(?:\s+(.+))?$/;
  const match = clean.match(regex);
  if (match) {
    return {
      level: match[1].trim(),
      room: match[2].trim(),
      major: (match[3] || 'ทั่วไป').trim()
    };
  }

  // Fallback if no slash: check if it has space
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return {
      level: parts[0].trim(),
      room: '-',
      major: parts.slice(1).join(' ').trim()
    };
  }

  return {
    level: clean,
    room: '-',
    major: 'ทั่วไป'
  };
};

export default function TeacherDashboard({ teacher, onLogout }: TeacherDashboardProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Loading states
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active view tab: 'books' | 'approvals' | 'history' | 'roster'
  const [activeTab, setActiveTab] = useState<'books' | 'approvals' | 'history' | 'roster'>('books');

  // Book Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Student Search query state
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Forms control states
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  // Google Sheets state variables for students in Teacher Dashboard
  const [showStudentImportForm, setShowStudentImportForm] = useState(false);
  const [studentSheetUrl, setStudentSheetUrl] = useState('');
  const [studentImportLoading, setStudentImportLoading] = useState(false);

  // Add Book Form state
  const [bookId, setBookId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [receivedQty, setReceivedQty] = useState<number>(10);
  const [location, setLocation] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bookCurriculum, setBookCurriculum] = useState('');

  // Status Toast alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        // Sort newest first
        setTransactions(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchTransactions();
    fetchStudents();
  }, []);

  // Handle Add Book or Edit Book submit
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId || !bookTitle || !bookAuthor || !bookCategory) {
      showAlert('error', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setActionLoading('save_book');
    const payload = {
      id: bookId,
      title: bookTitle,
      author: bookAuthor,
      category: bookCategory,
      receivedQty,
      location,
      coverUrl: coverUrl || undefined,
      curriculum: bookCurriculum
    };

    const url = editingBookId ? `/api/books/${editingBookId}` : '/api/books';
    const method = editingBookId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', editingBookId ? 'อัปเดตข้อมูลหนังสือสำเร็จ' : 'เพิ่มข้อมูลหนังสือใหม่สำเร็จ!');
        fetchBooks();
        // Reset forms
        setShowAddBookForm(false);
        setEditingBookId(null);
        setBookId('');
        setBookTitle('');
        setBookAuthor('');
        setBookCategory('');
        setReceivedQty(10);
        setLocation('');
        setCoverUrl('');
        setBookCurriculum('');
      } else {
        showAlert('error', data.message || 'บันทึกข้อมูลล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมต่อระบบล้มเหลว');
    } finally {
      setActionLoading(null);
    }
  };

  // Populate form for editing
  const handleStartEdit = (book: Book) => {
    setEditingBookId(book.id);
    setBookId(book.id);
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookCategory(book.category);
    setReceivedQty(book.receivedQty);
    setLocation(book.location || '');
    setCoverUrl(book.coverUrl || '');
    setBookCurriculum(book.curriculum || '');
    setShowAddBookForm(true);
  };

  // Delete Book
  const handleDeleteBook = async (id: string) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบหนังสือรหัส ${id} หรือไม่? (ข้อมูลประวัติการยืมที่เสร็จสิ้นแล้วอาจจะถูกกรองออก)`)) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showAlert('success', 'ลบข้อมูลหนังสือออกเรียบร้อยแล้ว');
        fetchBooks();
        fetchTransactions();
      } else {
        showAlert('error', data.message || 'ไม่สามารถลบหนังสือเล่มนี้ได้');
      }
    } catch (err) {
      showAlert('error', 'ระบบล้มเหลวในระหว่างการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  // Google Sheets books CSV import
  const handleGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets');
      return;
    }

    setImportLoading(true);
    try {
      const res = await fetch('/api/books/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        fetchBooks();
        setSheetUrl('');
        setShowImportForm(false);
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setImportLoading(false);
    }
  };

  // Google Sheets student CSV import in Teacher Dashboard
  const handleStudentGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets สำหรับรายชื่อนักเรียน');
      return;
    }

    setStudentImportLoading(true);
    try {
      const res = await fetch('/api/students/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: studentSheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        fetchStudents();
        setStudentSheetUrl('');
        setShowStudentImportForm(false);
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setStudentImportLoading(false);
    }
  };

  // Approve a borrow loan request
  const handleApproveBorrow = async (txId: string) => {
    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: teacher.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'อนุมัติการยืมหนังสือสำเร็จเรียบร้อย');
        fetchTransactions();
        fetchBooks();
      } else {
        showAlert('error', data.message || 'อนุมัติคำขอยืมล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject a borrow request
  const handleRejectBorrow = async (txId: string) => {
    const reason = window.prompt('ระบุเหตุผลในการปฏิเสธการยืม (หากไม่มีให้เว้นว่างไว้):');
    if (reason === null) return; // cancelled

    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: teacher.name, notes: reason || 'ครูปฏิเสธคำขอ' })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ปฏิเสธคำขอยืมเรียบร้อยแล้ว');
        fetchTransactions();
      } else {
        showAlert('error', data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมต่อระบบมีปัญหา');
    } finally {
      setActionLoading(null);
    }
  };

  // Return a borrowed book back to stock
  const handleReturnBook = async (txId: string) => {
    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: teacher.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'บันทึกส่งคืนหนังสือเข้าคลังเรียบร้อยแล้ว!');
        fetchTransactions();
        fetchBooks();
      } else {
        showAlert('error', data.message || 'บันทึกคืนหนังสือล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setActionLoading(null);
    }
  };

  // Export transaction list to CSV
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // Thai BOM encoding helper
    csvContent += 'รหัสรายการ,รหัสหนังสือ,ชื่อหนังสือ,รหัสผู้ยืม,ชื่อผู้ยืม,ประเภท,จำนวน,สถานะ,ทำรายการเมื่อ,วันคืนหนังสือ,ผู้จัดการ\n';

    transactions.forEach(tx => {
      const typeStr = tx.type === 'borrow' ? 'ยืมหนังสือ' : tx.type === 'give_out' ? 'แจกจ่าย' : 'นำเข้าเพิ่มเติม';
      const statusStr = tx.status === 'pending' ? 'รออนุมัติ' : tx.status === 'approved' ? 'อนุมัติ/กำลังยืม' : tx.status === 'returned' ? 'คืนคลังสำเร็จ' : 'ปฏิเสธ';
      const returnStr = tx.returnDate ? new Date(tx.returnDate).toLocaleString('th-TH') : '-';
      csvContent += `"${tx.id}","${tx.bookId}","${tx.bookTitle}","${tx.userId}","${tx.userName}","${typeStr}","${tx.qty}","${statusStr}","${new Date(tx.timestamp).toLocaleString('th-TH')}","${returnStr}","${tx.approvedBy || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานคลังหนังสือ_ประวัติธุรกรรม_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search books list
  const categories = ['ทั้งหมด', ...Array.from(new Set(books.map(b => b.category)))];
  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ทั้งหมด' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Split transaction lists for quick tabs
  const pendingRequests = transactions.filter(t => t.status === 'pending' && t.type === 'borrow');
  const activeBorrows = transactions.filter(t => t.status === 'approved' && t.type === 'borrow');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 text-white rounded-2xl p-6 shadow-xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm">
            <Users className="w-8 h-8 text-teal-200" />
          </div>
          <div>
            <span className="bg-teal-500/30 text-teal-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              สิทธิ์ผู้ใช้งาน: คุณครู / ผู้จัดการคลังหนังสือ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide mt-1">ยินดีต้อนรับ: {teacher.name}</h2>
            <p className="text-teal-200/80 text-xs sm:text-sm mt-0.5">คุณมีหน้าที่เช็คจำนวน ตรวจสอบหนังสือเข้าและแจกออก สามารถจัดการหนังสือและอนุมัติการยืมได้เต็มรูปแบบ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => { fetchBooks(); fetchTransactions(); fetchStudents(); }}
            className="p-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/5 rounded-xl transition-all cursor-pointer"
            title="รีเฟรชฐานข้อมูล"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Roster & Library Stats Overview Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">หนังสือทั้งหมด</p>
          <p className="text-xl sm:text-2xl font-black text-indigo-700">{books.length} เรื่อง</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">นำเข้าคลังสะสม</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">
            {books.reduce((acc, b) => acc + b.receivedQty, 0)} เล่ม
          </p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">เเจกออกไปสะสม</p>
          <p className="text-xl sm:text-2xl font-black text-blue-600">
            {books.reduce((acc, b) => acc + b.givenOutQty, 0)} เล่ม
          </p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase">พร้อมใช้ในตู้</p>
          <p className="text-xl sm:text-2xl font-black text-teal-600">
            {books.reduce((acc, b) => acc + b.stockQty, 0)} เล่ม
          </p>
        </div>
        <div className="bg-white border border-rose-100 bg-rose-50/10 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-rose-500 font-bold uppercase">รออนุมัติยืม</p>
          <p className="text-xl sm:text-2xl font-black text-rose-600">{pendingRequests.length} รายการ</p>
        </div>
        <div className="bg-white border border-amber-100 bg-amber-50/10 p-4 rounded-xl shadow-xs text-center">
          <p className="text-[10px] text-amber-500 font-bold uppercase">กำลังถูกยืมอยู่</p>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{activeBorrows.length} เล่ม</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('books')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'books' 
              ? 'border-teal-600 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📚 ทะเบียนหนังสือในคลัง ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'approvals' 
              ? 'border-teal-600 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ⏳ คำขอยืมรอดำเนินการ
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full leading-none animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-teal-600 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📋 ประวัติธุรกรรมและนำเข้าทั้งหมด
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'roster' 
              ? 'border-teal-600 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👤 สมาชิกนักเรียนและแผนก
        </button>
      </div>

      {/* Toast Alert Feedback */}
      {alert && (
        <div className={`mb-6 p-4 rounded-xl shadow-md border text-sm flex gap-3 animate-fadeIn duration-300 ${
          alert.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <p className="font-bold">{alert.message}</p>
        </div>
      )}

      {/* TAB 1: BOOKS INVENTORY CATALOG */}
      {activeTab === 'books' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Book overlay side-form */}
          {showAddBookForm && (
            <div className="lg:col-span-4 bg-white border border-teal-100 rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-teal-600">
                  <Sparkles className="w-4 h-4" />
                  {editingBookId ? 'แก้ไขข้อมูลรายละเอียดหนังสือ' : 'บันทึกหนังสือเข้าเล่มใหม่'}
                </h4>
                <button 
                  onClick={() => { 
                    setShowAddBookForm(false); 
                    setEditingBookId(null); 
                    setBookId('');
                    setBookTitle('');
                    setBookAuthor('');
                    setBookCategory('');
                    setReceivedQty(10);
                    setLocation('');
                    setCoverUrl('');
                    setBookCurriculum('');
                  }} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBook} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">รหัสบาร์โค้ดหนังสือ (Book ID) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBookId}
                    placeholder="เช่น B005, CS-201"
                    value={bookId}
                    onChange={(e) => setBookId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ชื่อเรื่องของหนังสือ (Book Title) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อหนังสือเต็มเรื่อง"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ชื่อผู้แต่ง / ผู้เขียน / สำนักพิมพ์ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ศ.ดร.สมเกียรติ, Mr. Richard"
                    value={bookAuthor}
                    onChange={(e) => setBookAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">หมวดหมู่หนังสือ *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น เทคโนโลยี, วิทยาศาสตร์"
                      value={bookCategory}
                      onChange={(e) => setBookCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">จำนวนที่นำเข้าสะสม *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ตู้เก็บ / พิกัดชั้นวางหนังสือ</label>
                    <input
                      type="text"
                      placeholder="เช่น ชั้นวาง A1"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">ลิงก์รูปหน้าปก (Cover URL)</label>
                    <input
                      type="text"
                      placeholder="เช่น https://..."
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">หลักสูตรการสอน / รายวิชาหลักสูตรการสอน</label>
                  <input
                    type="text"
                    placeholder="เช่น ปวส. เทคโนโลยีสารสนเทศ, วศ.บ. คอมพิวเตอร์"
                    value={bookCurriculum}
                    onChange={(e) => setBookCurriculum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading === 'save_book'}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-md shadow-teal-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading === 'save_book' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingBookId ? 'บันทึกแก้ไขข้อมูลหนังสือ' : 'บันทึกเปิดเล่มใหม่เข้าห้องสมุด'}
                </button>
              </form>
            </div>
          )}

          {/* Table display of Book Catalog */}
          <div className={`${showAddBookForm ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
            
            {/* Header filters */}
            <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหารหัสหนังสือ, ชื่อเรื่อง หรือผู้แต่ง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer font-bold"
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAddBookForm(!showAddBookForm)}
                  className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  เพิ่มหนังสือใหม่
                </button>
                <button
                  onClick={() => { setShowImportForm(!showImportForm); setShowAddBookForm(false); }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Import className="w-4 h-4" />
                  ดึงจาก Google Sheets
                </button>
              </div>
            </div>

            {/* Google Sheets Import link section */}
            {showImportForm && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                  <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    เชื่อมโยงตารางรายชื่อหนังสือจาก Google Sheets
                  </h4>
                  <button onClick={() => setShowImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                <div className="text-xs text-emerald-800 space-y-1">
                  <p><strong>คำแนะนำในการตั้งค่า Google Sheets:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                    <li>สร้างสเปรดชีตที่มีคอลัมน์อย่างน้อย 2 คอลัมน์คือ <strong>"รหัสหนังสือ"</strong> และ <strong>"ชื่อหนังสือ"</strong></li>
                    <li>คุณยังสามารถเพิ่มคอลัมน์เสริม: <strong>"ผู้แต่ง"</strong>, <strong>"หมวดหมู่"</strong>, <strong>"จำนวนนำเข้า"</strong> และ <strong>"ชั้นวาง"</strong> (หรือเขียนคอลัมน์ภาษาอังกฤษเป็น ID, Title, Author, Category, Qty, Location)</li>
                    <li>กด <strong>"แชร์ (Share)"</strong> ที่มุมบนขวาในชีต แล้วเลือกให้ <strong>"ทุกคนที่มีลิงก์มีสิทธิ์อ่าน"</strong></li>
                  </ul>
                </div>

                <form onSubmit={handleGoogleSheetsImport} className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="submit"
                    disabled={importLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    เริ่มดึงฐานข้อมูล
                  </button>
                </form>
              </div>
            )}

            {/* Books Roster Table list */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-extrabold">
                      <th className="p-3">รหัสหนังสือ</th>
                      <th className="p-3">รูปภาพ</th>
                      <th className="p-3">ชื่อหนังสือ / ผู้แต่ง</th>
                      <th className="p-3">หมวดหมู่</th>
                      <th className="p-3 text-center">พิกัดชั้นเก็บ</th>
                      <th className="p-3 text-center bg-slate-50/50">รวมนำเข้า</th>
                      <th className="p-3 text-center bg-indigo-50/20">จ่ายออก/ยืมไป</th>
                      <th className="p-3 text-center bg-emerald-50/20">พร้อมใช้ในคลัง</th>
                      <th className="p-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {loadingBooks && books.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                          <span>กำลังดึงข้อมูลคลังหนังสือ...</span>
                        </td>
                      </tr>
                    ) : filteredBooks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-slate-400">
                          <span>ไม่พบหนังสือในทะเบียน</span>
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((book) => {
                        const isOutOfStock = book.stockQty <= 0;
                        return (
                          <tr key={book.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="p-3 font-mono font-bold text-indigo-600">{book.id}</td>
                            <td className="p-3 shrink-0">
                              <img 
                                src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=80&auto=format&fit=crop&q=60'} 
                                alt={book.title} 
                                className="w-10 h-10 object-cover rounded shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            </td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800 line-clamp-1">{book.title}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] text-slate-400 mt-0.5">
                                <span>ผู้แต่ง: {book.author}</span>
                                {book.curriculum && (
                                  <span className="text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.2 rounded font-medium">
                                    🎓 {book.curriculum}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-600">{book.category}</td>
                            <td className="p-3 text-center">
                              {book.location ? (
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                                  📍 {book.location}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center bg-slate-50/50 font-bold text-slate-800">{book.receivedQty}</td>
                            <td className="p-3 text-center bg-indigo-50/20 font-bold text-indigo-600">{book.givenOutQty}</td>
                            <td className="p-3 text-center bg-emerald-50/20 font-black">
                              <span className={isOutOfStock ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded' : 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded'}>
                                {book.stockQty}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`btn-edit-book-${book.id}`}
                                  onClick={() => handleStartEdit(book)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                                  title="แก้ไขข้อมูลหนังสือ"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-book-${book.id}`}
                                  onClick={() => handleDeleteBook(book.id)}
                                  disabled={actionLoading === book.id}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-all cursor-pointer"
                                  title="ลบหนังสือนี้ออกจากคลัง"
                                >
                                  {actionLoading === book.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {/* Section: Pending Borrow Approval list */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-amber-500" />
                  รายการขอยืมหนังสือจากนักเรียนที่ค้างพิจารณา
                </h3>
                <p className="text-xs text-slate-500">กรุณาตรวจสอบว่ามีตัวเล่มอยู่จริงในห้องสมุดก่อนกดยืนยันการส่งมอบ</p>
              </div>
              <span className="text-xs bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border">
                รอตรวจสอบ {pendingRequests.length} เล่ม
              </span>
            </div>

            {loadingTx && transactions.length === 0 ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2 bg-emerald-50 p-2 rounded-full" />
                <p className="font-bold text-slate-600 text-sm">เรียบร้อยหมดจด! ไม่มีคำขอยืมรอดำเนินการ</p>
                <p className="text-[10px] text-slate-400 mt-0.5">เมื่อนักเรียนทำรายการขอยืมผ่านมือถือ รายการจะเข้าคิวนี้ทันที</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสธุรกรรม</th>
                      <th className="p-3">ข้อมูลหนังสือ</th>
                      <th className="p-3">นักเรียนผู้ขอยืม</th>
                      <th className="p-3">ระดับชั้น / สาขา</th>
                      <th className="p-3">ทำรายการเมื่อ</th>
                      <th className="p-3">หมายเหตุ</th>
                      <th className="p-3 text-right">พิจารณาอนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {pendingRequests.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                          <p className="text-[10px] text-slate-400">รหัสเล่ม: {tx.bookId}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800">{tx.userName}</p>
                          <p className="text-[10px] text-slate-400">ID: {tx.userId}</p>
                        </td>
                        <td className="p-3 text-slate-500">{students.find(s => s.id === tx.userId)?.department || 'ทั่วไป'}</td>
                        <td className="p-3 font-semibold text-slate-500">
                          {new Date(tx.timestamp).toLocaleString('th-TH')} น.
                        </td>
                        <td className="p-3 text-slate-400 italic font-normal">"{tx.notes || 'ไม่มีระบุ'}"</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-approve-tx-${tx.id}`}
                              onClick={() => handleApproveBorrow(tx.id)}
                              disabled={actionLoading === tx.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              อนุมัติ
                            </button>
                            <button
                              id={`btn-reject-tx-${tx.id}`}
                              onClick={() => handleRejectBorrow(tx.id)}
                              disabled={actionLoading === tx.id}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                              ไม่อนุมัติ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Currently Borrowed books list (Return Tracking portal) */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Undo2 className="w-5 h-5 text-indigo-500" />
                  ทะเบียนและประวัติการยืมที่นักเรียนยังไม่ส่งคืน (Active Loans)
                </h3>
                <p className="text-xs text-slate-500">ใช้สแกนหรือกดรับคืนเมื่อนักเรียนนำหนังสือทางกายภาพมาส่งมอบคืนเข้าชั้นวาง</p>
              </div>
              <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                กำลังยืมอยู่ {activeBorrows.length} เล่ม
              </span>
            </div>

            {loadingTx && transactions.length === 0 ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
              </div>
            ) : activeBorrows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <BookOpen className="w-10 h-10 text-indigo-300 mx-auto mb-2 bg-indigo-50 p-2 rounded-full animate-bounce" />
                <p className="font-bold text-slate-600 text-sm">ไม่มีสถิติหนังสือที่ค้างยืมในสัปดาห์นี้</p>
                <p className="text-[10px] text-slate-400 mt-0.5">หนังสือทั้งหมดทุกเล่มอยู่ในตู้ห้องสมุดพร้อมให้บริการ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสธุรกรรม</th>
                      <th className="p-3">ชื่อหนังสือ / บาร์โค้ด</th>
                      <th className="p-3">นักเรียนผู้ยืม</th>
                      <th className="p-3">วันอนุมัติยืมออก</th>
                      <th className="p-3">ผู้อนุมัติ</th>
                      <th className="p-3 text-right">ดำเนินการรับคืนหนังสือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {activeBorrows.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                        <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                          <p className="text-[10px] text-indigo-600 font-bold">บาร์โค้ด: {tx.bookId}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800">{tx.userName}</p>
                          <p className="text-[10px] text-slate-400">รหัสตัว: {tx.userId}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-500">
                          {new Date(tx.timestamp).toLocaleString('th-TH')} น.
                        </td>
                        <td className="p-3 text-slate-500 italic font-semibold">{tx.approvedBy}</td>
                        <td className="p-3 text-right">
                          <button
                            id={`btn-return-tx-${tx.id}`}
                            onClick={() => handleReturnBook(tx.id)}
                            disabled={actionLoading === tx.id}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs ml-auto"
                          >
                            รับคืนเข้าคลังหนังสือ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION LOGS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">ประวัติความเคลื่อนไหวทางคลังหนังสือทั้งหมด</h3>
              <p className="text-xs text-slate-500">บันทึกทั้งการ นำเข้าคลังเพิ่ม, การแจกขาดออกไป และ ประวัติการขอยืม-คืนของนักเรียนทุกคน</p>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              ดาวน์โหลดรายงานประวัติทั้งหมด (CSV)
            </button>
          </div>

          {loadingTx && transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีประวัติการทำรายการในฐานข้อมูล</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                    <th className="p-3">รหัสธุรกรรม</th>
                    <th className="p-3">วันเวลาทำรายการ</th>
                    <th className="p-3">ชื่อหนังสือ / รหัส</th>
                    <th className="p-3">ผู้ดำเนินการ/นักเรียน</th>
                    <th className="p-3">ประเภทธุรกรรม</th>
                    <th className="p-3 text-center">จำนวน</th>
                    <th className="p-3">สถานะรายการ</th>
                    <th className="p-3">วันส่งคืนกลับ</th>
                    <th className="p-3">ผู้จัดการอนุมัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {transactions.map(tx => {
                    const isImport = tx.type === 'import';
                    const isGiveOut = tx.type === 'give_out';
                    const isBorrow = tx.type === 'borrow';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                        <td className="p-3 text-slate-400">{new Date(tx.timestamp).toLocaleString('th-TH')} น.</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {tx.bookId}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{tx.userName}</p>
                          <p className="text-[10px] text-slate-400">รหัสผู้รับ: {tx.userId}</p>
                        </td>
                        <td className="p-3">
                          {isImport ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">📥 นำเข้าเพิ่มเติม</span>
                          ) : isGiveOut ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold">📤 แจกขาดจากตู้ออก</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold">📖 ยืมคืนปกติ</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{tx.qty} เล่ม</td>
                        <td className="p-3">
                          {tx.status === 'pending' && <span className="text-amber-600 font-bold">🕒 รออนุมัติยืม</span>}
                          {tx.status === 'approved' && <span className="text-indigo-600 font-bold">📖 กำลังยืม/ส่งมอบสำเร็จ</span>}
                          {tx.status === 'returned' && <span className="text-emerald-600 font-bold">✓ คืนหนังสือแล้ว</span>}
                          {tx.status === 'rejected' && <span className="text-rose-600 font-bold">✗ ปฏิเสธการขอยืม</span>}
                        </td>
                        <td className="p-3 text-slate-500">
                          {tx.returnDate ? new Date(tx.returnDate).toLocaleString('th-TH') + ' น.' : '-'}
                        </td>
                        <td className="p-3 text-slate-500 italic font-bold">{tx.approvedBy || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEMBER ROSTER MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">ฐานข้อมูลรายชื่อนักเรียนที่มีสิทธิ์ยืม</h3>
              <p className="text-xs text-slate-500">จัดการรายชื่อประวัตินักเรียน และระบบตรวจสอบสถิติสถานะการยืม/รับหนังสือเรียนสะสม</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-teacher-student-import-toggle"
                onClick={() => setShowStudentImportForm(!showStudentImportForm)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                ดึงชื่อจาก Google Sheets
              </button>
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 font-bold">นักเรียนทั้งหมด {students.length} คน</span>
            </div>
          </div>

          {/* Google Sheets Student Import form */}
          {showStudentImportForm && (
            <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  ดึงข้อมูลรายชื่อนักเรียนจาก Google Sheets (บทบาทอาจารย์)
                </h4>
                <button onClick={() => setShowStudentImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="text-xs text-emerald-800 space-y-1">
                <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets รายชื่อนักเรียน:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                  <li>ต้องมีคอลัมน์หลักอย่างน้อยสองตัวคือ <strong>"รหัสนักเรียน"</strong> (หรือ รหัสประจำตัว/รหัสนักศึกษา) และ <strong>"ชื่อ-นามสกุล"</strong></li>
                  <li>สามารถเพิ่มคอลัมน์ <strong>"ห้องเรียน"</strong> หรือ <strong>"สาขา"</strong> (Department) เพื่อเก็บข้อมูลระดับชั้นเรียนของนักเรียนได้</li>
                  <li>ตั้งค่าสิทธิ์แชร์ชีตให้เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                </ul>
              </div>

              <form onSubmit={handleStudentGoogleSheetsImport} className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="วางลิงก์ Google Sheets รายชื่อนักเรียนตรงนี้..."
                  value={studentSheetUrl}
                  onChange={(e) => setStudentSheetUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  disabled={studentImportLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {studentImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  ดึงรายชื่อ
                </button>
              </form>
            </div>
          )}

          {/* Student Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="🔍 ค้นหารายชื่อนักเรียน-นักศึกษา ด้วย รหัสประจำตัว, ชื่อ-นามสกุล, หรือระดับชั้น..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
            {studentSearchQuery && (
              <button
                onClick={() => setStudentSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                  <th className="p-3">รหัสนักเรียน</th>
                  <th className="p-3">ชื่อ-นามสกุล</th>
                  <th className="p-3">ระดับชั้น</th>
                  <th className="p-3">ห้อง</th>
                  <th className="p-3">แผนกวิชา / สาขา</th>
                  <th className="p-3">สถานะการยืม / รายละเอียด</th>
                  <th className="p-3 text-center">สถานะเปิดบัญชี</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loadingStudents && students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                      กำลังดึงข้อมูลรายชื่อ...
                    </td>
                  </tr>
                ) : (
                  students.filter(s => {
                    const q = studentSearchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (s.id && s.id.toLowerCase().includes(q)) ||
                      (s.name && s.name.toLowerCase().includes(q)) ||
                      (s.department && s.department.toLowerCase().includes(q))
                    );
                  }).map(std => {
                    // Calculate student borrow statistics
                    const studentBorrows = transactions.filter(t => t.userId === std.id && t.type === 'borrow' && t.status === 'approved');
                    const studentPendings = transactions.filter(t => t.userId === std.id && t.type === 'borrow' && t.status === 'pending');
                    const studentGiveOuts = transactions.filter(t => t.userId === std.id && t.type === 'give_out' && t.status === 'approved');
                    const totalActive = studentBorrows.reduce((sum, x) => sum + x.qty, 0);
                    const totalPending = studentPendings.reduce((sum, x) => sum + x.qty, 0);
                    const totalGiveOut = studentGiveOuts.reduce((sum, x) => sum + x.qty, 0);

                    // Parse department into level, room, major
                    const parsed = parseStudentDept(std.department);

                    return (
                      <tr key={std.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-600">{std.id}</td>
                        <td className="p-3 font-extrabold text-slate-800">{std.name}</td>
                        <td className="p-3 text-slate-700 font-semibold">{parsed.level}</td>
                        <td className="p-3 text-slate-700">{parsed.room}</td>
                        <td className="p-3 text-slate-500">{parsed.major}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {totalActive > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded font-bold text-[10px] flex items-center gap-1">
                                📖 ยืม {totalActive} เล่ม
                              </span>
                            )}
                            {totalPending > 0 && (
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded font-bold text-[10px] flex items-center gap-1">
                                ⏳ รออนุมัติ {totalPending} เล่ม
                              </span>
                            )}
                            {totalGiveOut > 0 && (
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-bold text-[10px] flex items-center gap-1">
                                📦 รับแจกขาด {totalGiveOut} เล่ม
                              </span>
                            )}
                            {totalActive === 0 && totalPending === 0 && totalGiveOut === 0 && (
                              <span className="text-slate-400 text-[11px] italic">ไม่มีประวัติการยืม/รับหนังสือ</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {std.isRegistered ? (
                            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                              🟢 ใช้งานอยู่ (Active)
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                              🔴 ยังไม่เข้าระบบ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                {students.filter(s => {
                  const q = studentSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    (s.id && s.id.toLowerCase().includes(q)) ||
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.department && s.department.toLowerCase().includes(q))
                  );
                }).length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      ไม่พบข้อมูลรหัสนักศึกษา หรือชื่อนักเรียนที่ค้นหาในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
