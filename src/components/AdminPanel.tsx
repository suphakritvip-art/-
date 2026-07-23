import React, { useState, useEffect } from 'react';
import { Student, Teacher, Book, BookTransaction } from '../types';
import AnalyticsReport from './AnalyticsReport';
import TextbookDistribution from './TextbookDistribution';
import { StudentDetailModal } from './StudentDetailModal';
import { TeacherDetailModal } from './TeacherDetailModal';
import { 
  ShieldAlert, Users, School, BookOpen, Trash2, Key, CheckCircle2, 
  AlertCircle, Loader2, LogOut, RefreshCw, RefreshCw as ResetIcon, Plus,
  Database, Info, AlertTriangle, FileSpreadsheet, Check, X, Sparkles, BookMarked,
  Search, HeartHandshake, Undo2, ChevronDown, ExternalLink, User,
  Code, Send, Save, Copy
} from 'lucide-react';

const APPS_SCRIPT_CODE_TEMPLATE = `// ==========================================
// 🚀 Google Apps Script Web App Code 
// (นำโค้ดนี้ไปวางใน Google Sheet -> ส่วนขยาย (Extensions) -> Apps Script)
// ==========================================

function doGet(e) {
  return handleRead(e);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    var req = contents ? JSON.parse(contents) : {};
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = req.action || 'read';

    if (action === 'read') {
      return handleRead(e);
    }

    if (action === 'writeAll') {
      sheet.clearContents();
      var allData = [];
      if (req.headers && req.headers.length > 0) {
        allData.push(req.headers);
      }
      if (req.rows && req.rows.length > 0) {
        allData = allData.concat(req.rows);
      }
      if (allData.length > 0 && allData[0].length > 0) {
        sheet.getRange(1, 1, allData.length, allData[0].length).setValues(allData);
      }
      return jsonResponse({ success: true, message: 'บันทึกข้อมูลลง Google Sheet สำเร็จ!' });
    }

    if (action === 'updateCell') {
      var r = Number(req.rowIndex) + 2;
      var c = Number(req.colIndex) + 1;
      sheet.getRange(r, c).setValue(req.value);
      return jsonResponse({ success: true, message: 'อัปเดตเซลล์สำเร็จ' });
    }

    if (action === 'addRow') {
      sheet.appendRow(req.rowData);
      return jsonResponse({ success: true, message: 'เพิ่มแถวใหม่สำเร็จ' });
    }

    return jsonResponse({ success: false, message: 'ไม่พบ action ที่ระบุ' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Error: ' + err.toString() });
  }
}

function handleRead(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) {
    return jsonResponse({ success: true, headers: [], rows: [] });
  }
  var headers = data[0];
  var rows = data.slice(1);
  return jsonResponse({ success: true, headers: headers, rows: rows, totalRows: rows.length });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;


interface AdminPanelProps {
  adminUser: { username: string; name: string };
  onLogout: () => void;
}

const parseStudentDept = (deptStr: string) => {
  const clean = (deptStr || '').trim();
  if (!clean || clean === 'ทั่วไป') {
    return { level: clean || 'ทั่วไป', room: '-', major: 'ทั่วไป' };
  }

  let level = '';
  let room = '-';
  let major = clean;

  // 1. Try to find Level (ระดับชั้น) such as ปวช.1, ปวช.2, ปวช.3, ปวส.1, ปวส.2, ม.1, ม.2, ม.3, ม.4, ม.5, ม.6, ปวช, ปวส
  const levelRegex = /(ปวช\s*\.\s*[1-3]|ปวส\s*\.\s*[1-2]|ม\s*\.\s*[1-6]|ปวช|ปวส)/i;
  const levelMatch = clean.match(levelRegex);
  if (levelMatch) {
    level = levelMatch[1].replace(/\s+/g, ''); // e.g. "ปวส.1"
    major = major.replace(levelMatch[0], '').trim();
  }

  // 2. Try to find Room (ห้อง) like 1/1, 1/2, 1/3, 1/4, etc.
  const roomRegexes = [
    /ห้อง\s*([0-9]+\/[0-9]+)/,               // e.g. "ห้อง 1/2"
    /ห้อง\s*([0-9]+)/,                      // e.g. "ห้อง 2"
    /([0-9]+\/[0-9]+)/,                     // e.g. "1/2" or "1/3" or "1/4"
    /\/([0-9]+)/                            // e.g. "/2" as in "ปวส.1/2"
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

  // If level was matched but no room was found yet, check if there's an orphaned slash in the remaining text or the original text
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

  // 3. Check parenthesized class codes like (IT-3A), (CPE-1), (CS-2B)
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

  // 4. Clean up the major text
  major = major
    .replace(/\s*ห้อง\s*/g, ' ')
    .replace(/^\s*[\/\-,\(\)]+\s*|\s*[\/\-,\(\)]+\s*$/g, '')
    .trim();

  // 5. Fallback formatting if level is still empty
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

  // Normalise level formatting if it matched ปวช or ปวส without dots/numbers
  if (level === 'ปวช' || level === 'ปวส') {
    if (room !== '-') {
      const firstDigit = room.match(/\d/);
      if (firstDigit) {
        level = `${level}.${firstDigit[0]}`;
      }
    }
  }

  return { level, room, major };
};

export default function AdminPanel({ adminUser, onLogout }: AdminPanelProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalBooks: 0,
    totalReceived: 0,
    totalGivenOut: 0,
    totalStock: 0,
    activeBorrows: 0,
    pendingBorrows: 0
  });
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);

  // Modal for student profile & password management
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Modal for teacher profile & password management
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState<Teacher | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'books' | 'approvals' | 'distribution' | 'analytics' | 'sheets'>('teachers');

  // Dropdown menus states
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  // Book and student search query state
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Google Sheets state variables for students
  const [showStudentImportForm, setShowStudentImportForm] = useState(false);
  const [studentSheetUrl, setStudentSheetUrl] = useState('');
  const [studentImportLoading, setStudentImportLoading] = useState(false);

  // Google Sheets state variables for teachers
  const [showTeacherImportForm, setShowTeacherImportForm] = useState(false);
  const [teacherSheetUrl, setTeacherSheetUrl] = useState('');
  const [teacherImportLoading, setTeacherImportLoading] = useState(false);

  // Google Sheets Real-Time Monitor States
  const [liveSheetUrl, setLiveSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  const [liveSheetGid, setLiveSheetGid] = useState('0');
  const [livePresetType, setLivePresetType] = useState<'books' | 'students' | 'teachers' | 'custom'>('books');
  const [liveSheetData, setLiveSheetData] = useState<{
    headers: string[];
    rows: string[][];
    fetchedAt: string;
    totalRows: number;
    spreadsheetId: string;
    embedUrl: string;
  } | null>(null);
  const [liveSheetLoading, setLiveSheetLoading] = useState(false);
  const [liveSheetAutoRefresh, setLiveSheetAutoRefresh] = useState(false);
  const [liveSheetFilter, setLiveSheetFilter] = useState('');
  const [liveSheetMode, setLiveSheetMode] = useState<'table' | 'embed'>('table');
  const [liveSheetSyncLoading, setLiveSheetSyncLoading] = useState<string | null>(null);

  // Google Apps Script Live 2-Way Editing States
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [appsScriptLoading, setAppsScriptLoading] = useState(false);
  const [appsScriptSaving, setAppsScriptSaving] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [isAppsScriptMode, setIsAppsScriptMode] = useState(false);
  const [editableHeaders, setEditableHeaders] = useState<string[]>([]);
  const [editableRows, setEditableRows] = useState<string[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchLiveSheetData = async (targetUrl?: string, targetGid?: string) => {
    const url = targetUrl !== undefined ? targetUrl : liveSheetUrl;
    if (!url) return;
    setLiveSheetLoading(true);
    try {
      const res = await fetch('/api/sheets/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: url, gid: targetGid !== undefined ? targetGid : liveSheetGid })
      });
      const data = await res.json();
      if (data.success) {
        setLiveSheetData(data);
        setEditableHeaders(data.headers || []);
        setEditableRows(data.rows || []);
        setHasUnsavedChanges(false);
        setIsAppsScriptMode(false);
      } else {
        setAlert({ type: 'error', message: data.message || 'ไม่สามารถโหลดข้อมูล Google Sheet ได้' });
      }
    } catch (err: any) {
      console.error(err);
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheet' });
    } finally {
      setLiveSheetLoading(false);
    }
  };

  const handleFetchAppsScript = async (urlToFetch?: string) => {
    const url = urlToFetch || appsScriptUrl;
    if (!url.trim()) {
      setAlert({ type: 'error', message: 'กรุณากรอก URL ของ Google Apps Script Web App' });
      return;
    }
    setAppsScriptLoading(true);
    try {
      const res = await fetch('/api/apps-script/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: url })
      });
      const data = await res.json();
      if (data.success) {
        setLiveSheetData({
          headers: data.headers,
          rows: data.rows,
          fetchedAt: data.fetchedAt,
          totalRows: data.totalRows,
          spreadsheetId: 'Google Apps Script Web App',
          embedUrl: url
        });
        setEditableHeaders(data.headers || []);
        setEditableRows(data.rows || []);
        setIsAppsScriptMode(true);
        setHasUnsavedChanges(false);
        setAlert({ type: 'success', message: `🚀 เชื่อมต่อ Google Apps Script สำเร็จ! โหลดข้อมูลเรียลไทม์เรียบร้อยแล้ว (${data.totalRows} แถว)` });
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Apps Script' });
    } finally {
      setAppsScriptLoading(false);
    }
  };

  const handleCellEdit = (rowIdx: number, colIdx: number, value: string) => {
    const updatedRows = [...editableRows];
    updatedRows[rowIdx] = [...(updatedRows[rowIdx] || [])];
    updatedRows[rowIdx][colIdx] = value;
    setEditableRows(updatedRows);
    setHasUnsavedChanges(true);

    if (liveSheetData) {
      setLiveSheetData({
        ...liveSheetData,
        rows: updatedRows
      });
    }
  };

  const handleHeaderEdit = (colIdx: number, value: string) => {
    const updatedHeaders = [...editableHeaders];
    updatedHeaders[colIdx] = value;
    setEditableHeaders(updatedHeaders);
    setHasUnsavedChanges(true);
    if (liveSheetData) {
      setLiveSheetData({
        ...liveSheetData,
        headers: updatedHeaders
      });
    }
  };

  const handleAddRow = () => {
    const colsCount = editableHeaders.length || 5;
    const newRow = new Array(colsCount).fill('');
    const updatedRows = [...editableRows, newRow];
    setEditableRows(updatedRows);
    setHasUnsavedChanges(true);
    if (liveSheetData) {
      setLiveSheetData({
        ...liveSheetData,
        rows: updatedRows,
        totalRows: updatedRows.length
      });
    }
  };

  const handleDeleteRow = (rowIdx: number) => {
    const updatedRows = editableRows.filter((_, idx) => idx !== rowIdx);
    setEditableRows(updatedRows);
    setHasUnsavedChanges(true);
    if (liveSheetData) {
      setLiveSheetData({
        ...liveSheetData,
        rows: updatedRows,
        totalRows: updatedRows.length
      });
    }
  };

  const handleAddColumn = () => {
    const newColName = `Col ${editableHeaders.length + 1}`;
    const updatedHeaders = [...editableHeaders, newColName];
    const updatedRows = editableRows.map(r => [...r, '']);
    setEditableHeaders(updatedHeaders);
    setEditableRows(updatedRows);
    setHasUnsavedChanges(true);
    if (liveSheetData) {
      setLiveSheetData({
        ...liveSheetData,
        headers: updatedHeaders,
        rows: updatedRows
      });
    }
  };

  const handleSaveToGoogleSheet = async () => {
    if (!appsScriptUrl.trim()) {
      setAlert({ type: 'error', message: 'กรุณากรอก URL ของ Google Apps Script Web App ในช่อง Apps Script เพื่อบันทึกข้อมูลย้อนกลับไปยัง Google Sheet' });
      return;
    }
    setAppsScriptSaving(true);
    try {
      const res = await fetch('/api/apps-script/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl,
          action: 'writeAll',
          headers: editableHeaders,
          rows: editableRows
        })
      });
      const data = await res.json();
      if (data.success) {
        setHasUnsavedChanges(false);
        setAlert({ type: 'success', message: '⚡ บันทึกการแก้ไขตรงไปยัง Google Sheets เรียบร้อยแล้วสดๆ!' });
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'ไม่สามารถส่งข้อมูลไปยัง Google Apps Script ได้' });
    } finally {
      setAppsScriptSaving(false);
    }
  };

  // Auto-refresh interval when enabled
  useEffect(() => {
    let interval: any;
    if (liveSheetAutoRefresh && activeTab === 'sheets') {
      fetchLiveSheetData();
      interval = setInterval(() => {
        fetchLiveSheetData();
      }, 12000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveSheetAutoRefresh, activeTab, liveSheetUrl, liveSheetGid]);

  useEffect(() => {
    if (activeTab === 'sheets' && !liveSheetData && !liveSheetLoading) {
      fetchLiveSheetData();
    }
  }, [activeTab]);

  const handleLiveSyncToBooks = async () => {
    if (!liveSheetUrl) return;
    setLiveSheetSyncLoading('books');
    try {
      const res = await fetch('/api/books/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: liveSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: `⚡ ซิงก์ข้อมูลลงทะเบียนหนังสือสำเร็จ! ${data.message}` });
        loadAllData();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการซิงก์ข้อมูลหนังสือ' });
    } finally {
      setLiveSheetSyncLoading(null);
    }
  };

  const handleLiveSyncToStudents = async () => {
    if (!liveSheetUrl) return;
    setLiveSheetSyncLoading('students');
    try {
      const res = await fetch('/api/students/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: liveSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: `⚡ ซิงก์ข้อมูลนักเรียนสำเร็จ! ${data.message}` });
        loadAllData();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการซิงก์ข้อมูลนักเรียน' });
    } finally {
      setLiveSheetSyncLoading(null);
    }
  };

  const handleLiveSyncToTeachers = async () => {
    if (!liveSheetUrl) return;
    setLiveSheetSyncLoading('teachers');
    try {
      const res = await fetch('/api/teachers/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: liveSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: `⚡ ซิงก์ข้อมูลครู/อาจารย์สำเร็จ! ${data.message}` });
        loadAllData();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการซิงก์ข้อมูลอาจารย์' });
    } finally {
      setLiveSheetSyncLoading(null);
    }
  };

  const handleLiveSyncToAdmins = async () => {
    if (!liveSheetUrl) return;
    setLiveSheetSyncLoading('admins');
    try {
      const res = await fetch('/api/admins/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: liveSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ type: 'success', message: `⚡ ซิงก์ข้อมูลผู้ดูแลระบบ (Admin) สำเร็จ! ${data.message}` });
        loadAllData();
      } else {
        setAlert({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการซิงก์ข้อมูลผู้ดูแลระบบ' });
    } finally {
      setLiveSheetSyncLoading(null);
    }
  };

  // Form for creating teacher
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherUser, setTeacherUser] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPosition, setTeacherPosition] = useState('');
  const [teacherBirthdate, setTeacherBirthdate] = useState('');
  const [teacherPass, setTeacherPass] = useState('');

  // Form for creating student
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentLevel, setStudentLevel] = useState('');
  const [studentRoom, setStudentRoom] = useState('');
  const [studentMajor, setStudentMajor] = useState('');

  // Reset database state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');

  // Google Sheets state variables in Admin Panel
  const [showImportForm, setShowImportForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [adminSheetUrl, setAdminSheetUrl] = useState('');

  // Cover image inline editing state variables in Admin Panel
  const [editingCoverBookId, setEditingCoverBookId] = useState<string | null>(null);
  const [tempCoverUrl, setTempCoverUrl] = useState('');

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

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
        setSheetUrl('');
        setShowImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setImportLoading(false);
    }
  };

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
        setStudentSheetUrl('');
        setShowStudentImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setStudentImportLoading(false);
    }
  };

  const handleTeacherGoogleSheetsImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherSheetUrl) {
      showAlert('error', 'กรุณากรอกลิงก์ Google Sheets สำหรับรายชื่อคุณครู/อาจารย์');
      return;
    }

    setTeacherImportLoading(true);
    try {
      const res = await fetch('/api/teachers/import-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: teacherSheetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', data.message);
        setTeacherSheetUrl('');
        setShowTeacherImportForm(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'ไม่สามารถนำเข้าข้อมูลได้ ตรวจสอบสิทธิ์ชีตและชื่อคอลัมน์');
      }
    } catch (err) {
      showAlert('error', 'ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์นำเข้า');
    } finally {
      setTeacherImportLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resStats, resTeachers, resStudents, resBooks, resTx] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/teachers'),
        fetch('/api/students'),
        fetch('/api/books'),
        fetch('/api/transactions')
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
      if (resTeachers.ok) {
        setTeachers(await resTeachers.json());
      }
      if (resStudents.ok) {
        setStudents(await resStudents.json());
      }
      if (resBooks.ok) {
        setBooks(await resBooks.json());
      }
      if (resTx.ok) {
        setTransactions(await resTx.json());
      }
    } catch (err) {
      console.error(err);
      showAlert('error', 'ล้มเหลวในการเชื่อมโยงข้อมูลเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Register a new teacher account
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUser || !teacherName || !teacherPass) {
      showAlert('error', 'กรุณากรอกข้อมูลครูอาจารย์ให้ครบถ้วน');
      return;
    }

    setActionLoading('add_teacher');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUser,
          name: teacherName,
          position: teacherPosition || 'คุณครู',
          birthdate: teacherBirthdate,
          password: teacherPass,
          role: 'teacher',
          isCreatedByAdmin: true
        })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ลงทะเบียนและสร้างบัญชีคุณครูเรียบร้อยแล้ว');
        setTeacherUser('');
        setTeacherName('');
        setTeacherPosition('');
        setTeacherBirthdate('');
        setTeacherPass('');
        setShowAddTeacher(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'สร้างผู้สอนล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงไม่สำเร็จ');
    } finally {
      setActionLoading(null);
    }
  };

  // Add Student manually as Admin
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !studentName || !studentLevel) {
      showAlert('error', 'กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน (รหัสนักศึกษา, ชื่อจริง, ระดับชั้น)');
      return;
    }

    const combinedDept = `${studentLevel}/${studentRoom || '-'} ${studentMajor || 'ทั่วไป'}`.trim();

    setActionLoading('add_student');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId,
          name: studentName,
          department: combinedDept
        })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'บันทึกรายชื่อนักเรียนคนใหม่เรียบร้อยแล้ว');
        setStudentId('');
        setStudentName('');
        setStudentLevel('');
        setStudentRoom('');
        setStudentMajor('');
        setShowAddStudent(false);
        loadAllData();
      } else {
        showAlert('error', data.message || 'บันทึกนักเรียนไม่สำเร็จ');
      }
    } catch (err) {
      showAlert('error', 'เกิดปัญหาทางเครือข่าย');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Teacher account
  const handleDeleteTeacher = async (username: string) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบบัญชีผู้สอนของ ${username} หรือไม่?`)) return;
    
    setActionLoading(username);
    try {
      const res = await fetch(`/api/teachers/${username}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ลบบัญชีผู้ใช้ครูสำเร็จแล้ว');
        loadAllData();
      } else {
        showAlert('error', 'ลบผู้สอนไม่สำเร็จ');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Student account & credentials
  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบข้อมูลและประวัติยืมทั้งหมดของนักเรียนรหัส ${id} หรือไม่?`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'ลบข้อมูลและบัญชีนักเรียนรายนี้สำเร็จแล้ว');
        loadAllData();
      } else {
        showAlert('error', 'ไม่สามารถลบนักเรียนได้');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมโยงขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  // Approve a borrow loan request
  const handleApproveBorrow = async (txId: string) => {
    setActionLoading(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: adminUser.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'อนุมัติการยืมหนังสือสำเร็จเรียบร้อย');
        loadAllData();
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
        body: JSON.stringify({ approvedBy: adminUser.name, notes: reason || 'ผู้ดูแลระบบปฏิเสธคำขอ' })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ปฏิเสธคำขอยืมเรียบร้อยแล้ว');
        loadAllData();
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
        body: JSON.stringify({ approvedBy: adminUser.name })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'บันทึกส่งคืนหนังสือเข้าคลังเรียบร้อยแล้ว!');
        loadAllData();
      } else {
        showAlert('error', data.message || 'บันทึกคืนหนังสือล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เกิดข้อผิดพลาดในการคืนหนังสือ');
    } finally {
      setActionLoading(null);
    }
  };

  // Database hard reset
  const handleResetDBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode !== '12102548') {
      showAlert('error', 'รหัสยืนยันไม่ถูกต้อง');
      return;
    }

    setActionLoading('reset');
    try {
      const res = await fetch('/api/admin/reset-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCode: resetCode })
      });
      const data = await res.json();

      if (res.ok) {
        showAlert('success', 'ล้างข้อมูลสำมะโนและประวัติยืมกลับเป็นข้อมูลพรีเซ็ตสำเร็จแล้ว!');
        setShowResetConfirm(false);
        setResetCode('');
        loadAllData();
      } else {
        showAlert('error', data.message || 'ล้างระบบล้มเหลว');
      }
    } catch (err) {
      showAlert('error', 'เชื่อมต่อขัดข้อง');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingRequests = transactions.filter(t => t.status === 'pending' && t.type === 'borrow');
  const activeBorrows = transactions.filter(t => t.status === 'approved' && t.type === 'borrow');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-rose-900/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="bg-rose-500/20 text-rose-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-rose-500/30">
              บทบาทสูงสุด: ผู้ดูแลระบบส่วนกลาง (Super Admin)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide mt-1">แผงควบคุมระบบหนังสือและสมาชิกส่วนกลาง</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              ผู้จัดการสูงสุด: <strong>{adminUser.name}</strong> | ควบคุม บัญชีอาจารย์, รายชื่อนักเรียน, และทำการคืนค่าโรงงานฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={loadAllData}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
            title="รีเฟรชฐานข้อมูลทั้งหมด"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/35 text-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Library Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">อาจารย์ผู้สอน</p>
          <p className="text-lg font-black text-slate-200">{stats.totalTeachers} บัญชี</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">นักเรียนสะสม</p>
          <p className="text-lg font-black text-slate-200">{stats.totalStudents} คน</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">จำนวนประเภทหนังสือ</p>
          <p className="text-lg font-black text-rose-400">{stats.totalBooks} รายการ</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">นำเข้าทั้งหมด</p>
          <p className="text-lg font-black text-emerald-400">{stats.totalReceived} เล่ม</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">แจกขาดออกไป</p>
          <p className="text-lg font-black text-blue-400">{stats.totalGivenOut} เล่ม</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800/80 shadow-md text-center">
          <p className="text-[10px] text-slate-400 font-bold">คงคลังปัจจุบัน</p>
          <p className="text-lg font-black text-teal-400">{stats.totalStock} เล่ม</p>
        </div>
        <div className="bg-slate-900 border border-rose-950 bg-rose-950/20 rounded-xl p-4 shadow-md text-center animate-pulse">
          <p className="text-[10px] text-rose-400 font-bold">รออนุมัติยืม</p>
          <p className="text-lg font-black text-rose-300">{stats.pendingBorrows} รายการ</p>
        </div>
        <div className="bg-slate-900 border border-amber-950 bg-amber-950/20 rounded-xl p-4 shadow-md text-center">
          <p className="text-[10px] text-amber-400 font-bold">กำลังถูกยืมไป</p>
          <p className="text-lg font-black text-amber-300">{stats.activeBorrows} เล่ม</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-4 mb-6 relative">
        
        {/* Dropdown 1: 👥 สมาชิกในระบบ */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowBookDropdown(false);
            }}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
              activeTab === 'teachers' || activeTab === 'students'
                ? 'border-rose-600 text-rose-600 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👥 สมาชิกในระบบ</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showUserDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowUserDropdown(false)}></div>
              <div className="absolute left-0 mt-1 w-56 sm:w-64 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black/5 focus:outline-none z-40 animate-fadeIn divide-y divide-slate-100 overflow-hidden">
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'teachers' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🎓 รายชื่อคุณครูผู้จัดการ</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                      {teachers.length} คน
                    </span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('students');
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'students' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">👥 รายชื่อนักเรียนแผนกต่าง ๆ</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                      {students.length} คน
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dropdown 2: 📚 จัดการคลังและวิเคราะห์ */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBookDropdown(!showBookDropdown);
              setShowUserDropdown(false);
            }}
            className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
              ['books', 'approvals', 'distribution', 'analytics'].includes(activeTab)
                ? 'border-rose-600 text-rose-600 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📚 ระบบจัดสรรและคลังความรู้</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showBookDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showBookDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowBookDropdown(false)}></div>
              <div className="absolute left-0 mt-1 w-64 sm:w-72 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black/5 focus:outline-none z-40 animate-fadeIn divide-y divide-slate-100 overflow-hidden">
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      setActiveTab('books');
                      setShowBookDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'books' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">📖 ทะเบียนพิกัดหนังสือ</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                      {books.length} เล่ม
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('approvals');
                      setShowBookDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'approvals' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🔔 อนุมัติยืมและรับคืนหนังสือ</span>
                    {stats.pendingBorrows > 0 && (
                      <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full leading-none animate-pulse">
                        {stats.pendingBorrows}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('distribution');
                      setShowBookDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'distribution' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">🎁 ระบบแจกหนังสือเรียน</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('analytics');
                      setShowBookDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'analytics' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">📊 รายงานและวิเคราะห์ข้อมูล</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('sheets');
                      setShowBookDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${
                      activeTab === 'sheets' ? 'bg-rose-50 text-rose-700 font-extrabold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">🌐 ตรวจสอบ Google Sheets Real-time</span>
                    <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                      LIVE
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tab 3: 📊 Google Sheets Real-time Monitor */}
        <button
          id="btn-admin-tab-sheets"
          onClick={() => {
            setActiveTab('sheets');
            setShowUserDropdown(false);
            setShowBookDropdown(false);
          }}
          className={`pb-3 px-1 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'sheets'
              ? 'border-rose-600 text-rose-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>📊 ดูข้อมูล Google Sheet สด</span>
          <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-black uppercase">
            LIVE
          </span>
        </button>
      </div>

      {/* Toast alert notifications */}
      {alert && (
        <div className={`p-4 rounded-xl shadow-md border text-sm flex gap-3 animate-fadeIn duration-300 ${
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

      {/* Main content grid splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Content Area */}
        <div className={`${activeTab === 'sheets' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
          
          {/* Sub-Tab 1: Teachers list */}
          {activeTab === 'teachers' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ระบบลงทะเบียนคุณครู</h3>
                  <p className="text-xs text-slate-500">สามารถเพิ่ม/ลบบัญชี และสิทธิ์ตรวจสอบคลังหนังสือแก่คุณครูใหม่ได้</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="btn-admin-teacher-import-toggle"
                    onClick={() => setShowTeacherImportForm(!showTeacherImportForm)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ดึงชื่อจาก Google Sheets
                  </button>
                  <button
                    id="btn-add-teacher-toggle"
                    onClick={() => { setShowAddTeacher(!showAddTeacher); setShowAddStudent(false); }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มบัญชีอาจารย์
                  </button>
                </div>
              </div>

              {/* Google Sheets Teacher Import form */}
              {showTeacherImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลรายชื่อครูและอาจารย์จาก Google Sheets
                    </h4>
                    <button onClick={() => setShowTeacherImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets รายชื่อครู/อาจารย์:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ควรจัดเตรียมคอลัมน์ชื่อ <strong>"ชื่อ-นามสกุล"</strong> และ <strong>"ตำแหน่ง"</strong> ใน Google Sheet</li>
                      <li>แนะนำให้เพิ่มคอลัมน์ <strong>"วันเดือนปีเกิด"</strong> (หรือ วันเกิด / Birthdate / Birthday) รูปแบบ <strong>20/10/2540</strong> เพื่อนำมาใช้เป็นรหัสผ่านเริ่มต้นโดยตรง</li>
                      <li>หากไม่มีคอลัมน์ <strong>"ชื่อผู้ใช้งาน"</strong> (Username) ระบบจะสร้างชื่อผู้ใช้งานจากชื่อ-นามสกุลอังกฤษ (หรือภาษาไทยโดยการเชื่อมคำ) ให้อัตโนมัติ</li>
                      <li>ตั้งค่าสิทธิ์แชร์ชีตให้เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                    </ul>
                  </div>

                  <form onSubmit={handleTeacherGoogleSheetsImport} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="วางลิงก์ Google Sheets รายชื่อครู/อาจารย์ตรงนี้..."
                      value={teacherSheetUrl}
                      onChange={(e) => setTeacherSheetUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={teacherImportLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {teacherImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      ดึงรายชื่อ
                    </button>
                  </form>
                </div>
              )}

              {/* Add Teacher form */}
              {showAddTeacher && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> กรอกข้อมูลคุณครูใหม่</h4>
                  <form onSubmit={handleAddTeacherSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Username (ภาษาอังกฤษใช้เข้าสู่ระบบ)</label>
                      <input
                        id="form-teacher-username"
                        type="text"
                        required
                        placeholder="เช่น somsaki"
                        value={teacherUser}
                        onChange={(e) => setTeacherUser(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อจริง / นามสกุลจริง</label>
                      <input
                        id="form-teacher-name"
                        type="text"
                        required
                        placeholder="เช่น อ.สมศักดิ์ รักสอน"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ตำแหน่ง</label>
                      <input
                        id="form-teacher-position"
                        type="text"
                        placeholder="เช่น หัวหน้าแผนกวิชา"
                        value={teacherPosition}
                        onChange={(e) => setTeacherPosition(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">วันเดือนปีเกิด (รหัสผ่านเริ่มต้น)</label>
                      <input
                        id="form-teacher-birthdate"
                        type="text"
                        placeholder="เช่น 20/10/2540"
                        value={teacherBirthdate}
                        onChange={(e) => setTeacherBirthdate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">รหัสผ่าน (Password)</label>
                      <input
                        id="form-teacher-pass"
                        type="password"
                        required
                        placeholder="กำหนดรหัสผ่าน"
                        value={teacherPass}
                        onChange={(e) => setTeacherPass(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="sm:col-span-5 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setShowAddTeacher(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 text-xs rounded-lg cursor-pointer">ยกเลิก</button>
                      <button type="submit" disabled={actionLoading === 'add_teacher'} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                        {actionLoading === 'add_teacher' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ลงทะเบียนคุณครู'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Teachers table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">Username</th>
                      <th className="p-3">ชื่อจริง-นามสกุล</th>
                      <th className="p-3">ตำแหน่ง</th>
                      <th className="p-3">วันเดือนปีเกิด (รหัสผ่านเริ่มต้น)</th>
                      <th className="p-3">สิทธิ์ใช้งาน</th>
                      <th className="p-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {teachers.map(t => (
                      <tr key={t.username} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-600">{t.username}</td>
                        <td className="p-3 font-bold text-slate-800">{t.name}</td>
                        <td className="p-3 text-slate-500 font-medium">{t.position || 'คุณครู'}</td>
                        <td className="p-3 text-rose-600 font-semibold">{t.birthdate || t.password || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[10px] font-bold">
                            คุณครูเช็คพัสดุ
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-view-teacher-${t.username}`}
                              onClick={() => {
                                setSelectedTeacherForModal(t);
                                setIsTeacherModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer text-[11px] font-bold flex items-center gap-1 transition-all"
                              title="ดูข้อมูลส่วนตัวและเปลี่ยนรหัสผ่านคุณครู"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>ดูข้อมูล/แก้รหัสผ่าน</span>
                            </button>
                            <button
                              id={`btn-delete-teacher-${t.username}`}
                              onClick={() => handleDeleteTeacher(t.username)}
                              disabled={actionLoading === t.username}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-all"
                              title="ลบข้อมูลคุณครู"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Students list */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ระบบดูแลและขึ้นทะเบียนรายชื่อนักเรียน</h3>
                  <p className="text-xs text-slate-500">จัดการข้อมูลประวัตินักเรียน บัญชีสมาชิก และตรวจสอบสถานะการยืม/รับหนังสือรายบุคคล</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    id="btn-admin-student-import-toggle"
                    onClick={() => setShowStudentImportForm(!showStudentImportForm)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ดึงชื่อจาก Google Sheets
                  </button>
                  <button
                    id="btn-add-student-toggle"
                    onClick={() => { setShowAddStudent(!showAddStudent); setShowAddTeacher(false); }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มข้อมูลนักเรียน
                  </button>
                </div>
              </div>

              {/* Google Sheets Student Import form */}
              {showStudentImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลรายชื่อนักเรียนนักศึกษาจาก Google Sheets
                    </h4>
                    <button onClick={() => setShowStudentImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets รายชื่อนักเรียน:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ต้องมีคอลัมน์หลักอย่างน้อยสองตัวคือ <strong>"รหัสนักเรียน"</strong> (หรือ รหัสประจำตัว) และ <strong>"ชื่อ-นามสกุล"</strong></li>
                      <li>ระบบรองรับทั้งคอลัมน์ระดับชั้นเดี่ยวๆ เช่น <strong>"ห้องเรียน"</strong> หรือสามารถแยกเป็น 3 คอลัมน์ได้แก่ <strong>"ระดับชั้น"</strong> (เช่น ม.4, ปวช.1), <strong>"ห้อง"</strong> (เช่น 1, 2) และ <strong>"แผนกวิชา"</strong> หรือ <strong>"สาขา"</strong> โดยระบบจะผสานข้อมูลให้อัตโนมัติ</li>
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

              {/* Add Student form */}
              {showAddStudent && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-rose-500" /> กรอกข้อมูลประวัตินักเรียนใหม่</h4>
                  <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">รหัสนักศึกษา (Student ID) *</label>
                      <input
                        id="form-student-id"
                        type="text"
                        required
                        placeholder="เช่น 64301, STD-901"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ชื่อจริง / นามสกุลจริง *</label>
                      <input
                        id="form-student-name"
                        type="text"
                        required
                        placeholder="เช่น นายอภิสิทธิ์ เล่าเรียน"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ระดับชั้น *</label>
                      <input
                        id="form-student-level"
                        type="text"
                        required
                        placeholder="เช่น ม.4, ปวช.1, ปวส.2"
                        value={studentLevel}
                        onChange={(e) => setStudentLevel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">ห้อง</label>
                      <input
                        id="form-student-room"
                        type="text"
                        placeholder="เช่น 1, 2, A, B (ว่างหากไม่มี)"
                        value={studentRoom}
                        onChange={(e) => setStudentRoom(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">แผนกวิชา / สาขา</label>
                      <input
                        id="form-student-major"
                        type="text"
                        placeholder="เช่น เทคโนโลยีสารสนเทศ"
                        value={studentMajor}
                        onChange={(e) => setStudentMajor(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="sm:col-span-5 flex justify-end gap-2 mt-1">
                      <button type="button" onClick={() => setShowAddStudent(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 text-xs rounded-lg cursor-pointer">ยกเลิก</button>
                      <button type="submit" disabled={actionLoading === 'add_student'} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                        {actionLoading === 'add_student' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'เพิ่มรายชื่อนักเรียน'}
                      </button>
                    </div>
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
                  placeholder="🔍 ค้นหารายชื่อนักเรียน-นักศึกษา ด้วย รหัสประจำตัว, ชื่อ-นามสกุล, หรือห้องเรียน/สาขา..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
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

              {/* Students table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสประจำตัว</th>
                      <th className="p-3">ชื่อ-นามสกุล</th>
                      <th className="p-3">ระดับชั้น</th>
                      <th className="p-3">ห้อง</th>
                      <th className="p-3">แผนกวิชา / สาขา</th>
                      <th className="p-3">สถานะการยืม / รายละเอียด</th>
                      <th className="p-3 text-center">สถานะใช้งานแอป</th>
                      <th className="p-3 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {students.filter(s => {
                      const q = studentSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (s.id && s.id.toLowerCase().includes(q)) ||
                        (s.name && s.name.toLowerCase().includes(q)) ||
                        (s.department && s.department.toLowerCase().includes(q))
                      );
                    }).map(s => {
                      // Calculate borrow statistics
                      const studentBorrows = transactions.filter(t => t.userId === s.id && t.type === 'borrow' && t.status === 'approved');
                      const studentPendings = transactions.filter(t => t.userId === s.id && t.type === 'borrow' && t.status === 'pending');
                      const studentGiveOuts = transactions.filter(t => t.userId === s.id && t.type === 'give_out' && t.status === 'approved');
                      const totalActive = studentBorrows.reduce((sum, x) => sum + x.qty, 0);
                      const totalPending = studentPendings.reduce((sum, x) => sum + x.qty, 0);
                      const totalGiveOut = studentGiveOuts.reduce((sum, x) => sum + x.qty, 0);

                      // Parse department into level, room, major
                      const parsed = parseStudentDept(s.department);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-600">{s.id}</td>
                          <td className="p-3 font-bold text-slate-800">{s.name}</td>
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
                            {s.isRegistered || s.isLoggedIn ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="px-3 py-1 bg-emerald-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                                  🟢 ลงชื่อเข้าใช้งานแล้ว
                                </span>
                                {s.lastLogin && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {new Date(s.lastLogin).toLocaleDateString('th-TH')} {new Date(s.lastLogin).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-3 py-1 bg-rose-500 text-white rounded-full font-bold text-[10px] shadow-xs inline-flex items-center gap-1 justify-center min-w-[110px]">
                                🔴 ยังไม่ลงชื่อเข้าใช้
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`btn-view-student-${s.id}`}
                                onClick={() => {
                                  setSelectedStudentForModal(s);
                                  setIsStudentModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg cursor-pointer text-[11px] font-bold flex items-center gap-1 transition-all"
                                title="ดูข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>ดูข้อมูล/แก้รหัสผ่าน</span>
                              </button>
                              <button
                                id={`btn-delete-student-${s.id}`}
                                onClick={() => handleDeleteStudent(s.id)}
                                disabled={actionLoading === s.id}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-all"
                                title="ลบข้อมูลนักเรียน"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          ไม่พบข้อมูลรหัสนักศึกษา หรือชื่อนักเรียนที่ค้นหาในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Books overview */}
          {activeTab === 'books' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-50 gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">ภาพรวมหนังสือสะสมทั้งหมดในฐานข้อมูล</h3>
                  <p className="text-xs text-slate-500">รายการและสถิติคลังย่อของแต่ละรายการ พร้อมช่องข้อมูลหนังสือหลักสูตรการสอน</p>
                </div>
                <button
                  id="btn-admin-import-toggle"
                  onClick={() => setShowImportForm(!showImportForm)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm self-start sm:self-center"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  ดึงจาก Google Sheets
                </button>
              </div>

              {/* Google Sheets Import form */}
              {showImportForm && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50">
                    <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ดึงข้อมูลหนังสือหลักสูตรการสอนจาก Google Sheets
                    </h4>
                    <button onClick={() => setShowImportForm(false)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><strong>คำแนะนำในการจัดเตรียมคอลัมน์ใน Google Sheets:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800/80">
                      <li>ต้องมีคอลัมน์หลักอย่างน้อยสองตัวคือ <strong>"รหัสหนังสือ"</strong> และ <strong>"ชื่อหนังสือ"</strong></li>
                      <li>สามารถเพิ่มคอลัมน์ <strong>"หลักสูตร"</strong> หรือ <strong>"หลักสูตรการสอน"</strong> (Curriculum) เพื่อจัดเก็บข้อมูลหลักสูตรที่หนังสือเล่มนั้นอ้างอิงได้แบบเรียลไทม์!</li>
                      <li>คอลัมน์สนับสนุนเพิ่มเติม: <strong>"ผู้แต่ง"</strong>, <strong>"หมวดหมู่"</strong>, <strong>"จำนวนนำเข้า"</strong>, <strong>"ชั้นวาง"</strong></li>
                      <li>ตั้งค่าสิทธิ์ให้แชร์เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์เข้าถึง (Anyone with the link can view)"</strong></li>
                    </ul>
                  </div>

                  <form onSubmit={handleGoogleSheetsImport} className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="วางลิงก์ Google Sheets ตรงนี้..."
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
                      ดึงข้อมูลชีต
                    </button>
                  </form>
                </div>
              )}

              {/* Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 ค้นหา รหัสหนังสือ, ชื่อหนังสือ, ผู้แต่ง, หรือหลักสูตรการสอน..."
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
                {bookSearchQuery && (
                  <button
                    onClick={() => setBookSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="p-3">รหัสหนังสือ</th>
                      <th className="p-3">รูปภาพ</th>
                      <th className="p-3">ชื่อเรื่อง</th>
                      <th className="p-3">ผู้แต่ง</th>
                      <th className="p-3">หลักสูตรการสอน</th>
                      <th className="p-3">หมวดหมู่</th>
                      <th className="p-3 text-center">พิกัดจัดเก็บ</th>
                      <th className="p-3 text-center">คงเหลือปัจจุบัน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {books.filter(b => {
                      const q = bookSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (b.id && b.id.toLowerCase().includes(q)) ||
                        (b.title && b.title.toLowerCase().includes(q)) ||
                        (b.author && b.author.toLowerCase().includes(q)) ||
                        (b.curriculum && b.curriculum.toLowerCase().includes(q)) ||
                        (b.category && b.category.toLowerCase().includes(q))
                      );
                    }).map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-indigo-600">{b.id}</td>
                        <td className="p-3">
                          {editingCoverBookId === b.id ? (
                            <div className="flex flex-col gap-1.5 min-w-[150px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-bold">ใส่ URL รูปปกหนังสือ:</span>
                              <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={tempCoverUrl}
                                onChange={(e) => setTempCoverUrl(e.target.value)}
                                className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none font-sans"
                                autoFocus
                              />
                              <div className="flex gap-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingCoverBookId(null)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/books/${b.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ coverUrl: tempCoverUrl })
                                      });
                                      if (res.ok) {
                                        showAlert('success', 'อัปเดตลิงก์รูปภาพเรียบร้อยแล้ว');
                                        setEditingCoverBookId(null);
                                        loadAllData();
                                      } else {
                                        showAlert('error', 'อัปเดตล้มเหลว');
                                      }
                                    } catch (err) {
                                      showAlert('error', 'เกิดข้อผิดพลาดในการบันทึก');
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  บันทึก
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingCoverBookId(b.id);
                                setTempCoverUrl(b.coverUrl || '');
                              }}
                              className="w-10 h-14 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all shadow-2xs"
                              title="คลิกเพื่อเพิ่มหรือแก้ไขลิงก์รูปภาพปกหนังสือ"
                            >
                              {b.coverUrl ? (
                                <>
                                  <img 
                                    src={b.coverUrl} 
                                    alt={b.title} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      // fallback if broken link
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=80&auto=format&fit=crop&q=60';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                                    <span className="text-[9px] text-white font-extrabold tracking-tight">แก้ไขรูป</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600 p-1 text-center">
                                  <Plus className="w-3.5 h-3.5 mb-0.5" />
                                  <span className="text-[8px] font-bold leading-tight">เพิ่มรูป</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800 line-clamp-1">{b.title}</td>
                        <td className="p-3 text-slate-500">{b.author}</td>
                        <td className="p-3 text-slate-600">
                          {b.curriculum ? (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-semibold text-[10px] block max-w-[200px] truncate" title={b.curriculum}>
                              🎓 {b.curriculum}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- ไม่ระบุหลักสูตร -</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{b.category}</td>
                        <td className="p-3 text-center">
                          {b.location ? (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold text-[10px]">📍 {b.location}</span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{b.stockQty} / {b.receivedQty} เล่ม</td>
                      </tr>
                    ))}
                    {books.filter(b => {
                      const q = bookSearchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (b.id && b.id.toLowerCase().includes(q)) ||
                        (b.title && b.title.toLowerCase().includes(q)) ||
                        (b.author && b.author.toLowerCase().includes(q)) ||
                        (b.curriculum && b.curriculum.toLowerCase().includes(q)) ||
                        (b.category && b.category.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          ไม่พบข้อมูลรหัสหนังสือ หรือชื่อหนังสือที่ค้นหาในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Approvals */}
          {activeTab === 'approvals' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Section: Pending Borrow Approval list */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <HeartHandshake className="w-5 h-5 text-rose-500" />
                      รายการขอยืมหนังสือจากนักเรียนที่ค้างพิจารณา
                    </h3>
                    <p className="text-xs text-slate-500">ตรวจสอบจำนวนคงเหลือในคลังก่อนตัดสินใจอนุมัติหรือไม่อนุมัติ</p>
                  </div>
                  <span className="text-xs bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border">
                    รอตรวจสอบ {pendingRequests.length} เล่ม
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2 bg-emerald-50 p-2 rounded-full" />
                    <p className="font-bold text-slate-600 text-sm">ไม่มีคำขอยืมหนังสือที่ค้างอนุมัติอยู่</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">เมื่อนักเรียนส่งคำขอยืมหนังสือ รายการคำขอจะแสดงที่นี่ทันที</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                          <th className="p-3">รหัสธุรกรรม</th>
                          <th className="p-3">ข้อมูลหนังสือ</th>
                          <th className="p-3">นักเรียนผู้ยืม</th>
                          <th className="p-3">ทำรายการเมื่อ</th>
                          <th className="p-3">หมายเหตุ</th>
                          <th className="p-3 text-right">การจัดการคำขอ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {pendingRequests.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="p-3 font-mono font-bold text-slate-500">{tx.id}</td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800 line-clamp-1">{tx.bookTitle}</p>
                              <p className="text-[10px] text-indigo-600">รหัสเล่ม: {tx.bookId}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-800">{tx.userName}</p>
                              <p className="text-[10px] text-slate-400">ID: {tx.userId}</p>
                            </td>
                            <td className="p-3 font-semibold text-slate-500">
                              {new Date(tx.timestamp).toLocaleString('th-TH')} น.
                            </td>
                            <td className="p-3 text-slate-400 italic font-normal">"{tx.notes || 'ไม่มีระบุ'}"</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`btn-admin-approve-tx-${tx.id}`}
                                  onClick={() => handleApproveBorrow(tx.id)}
                                  disabled={actionLoading === tx.id}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  อนุมัติ
                                </button>
                                <button
                                  id={`btn-admin-reject-tx-${tx.id}`}
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
                      ทะเบียนค้างยืมและดำเนินการรับคืนหนังสือ
                    </h3>
                    <p className="text-xs text-slate-500">รายการหนังสือที่ได้รับการอนุมัติและยังไม่มีการส่งคืนกลับเข้าชั้นวาง</p>
                  </div>
                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                    กำลังยืมอยู่ {activeBorrows.length} เล่ม
                  </span>
                </div>

                {activeBorrows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <BookOpen className="w-10 h-10 text-indigo-300 mx-auto mb-2 bg-indigo-50 p-2 rounded-full" />
                    <p className="font-bold text-slate-600 text-sm">ไม่มีหนังสือค้างส่งคืนในขณะนี้</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">หนังสือทั้งหมดทุกเล่มอยู่ในคลังพร้อมสำหรับการยืม</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
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
                                id={`btn-admin-return-tx-${tx.id}`}
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

          {activeTab === 'distribution' && (
            <TextbookDistribution 
              books={books} 
              students={students} 
              currentUser={{ name: adminUser.name, id: adminUser.username, role: 'admin' }} 
              onRefreshData={loadAllData} 
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReport 
              books={books} 
              transactions={transactions} 
              students={students} 
            />
          )}

          {/* Sub-Tab 7: Real-Time Google Sheets Viewer */}
          {activeTab === 'sheets' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-slate-100 animate-fadeIn">
              {/* Header & Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shadow-inner">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-lg sm:text-xl font-display">
                        Google Sheets Real-time Viewer & Live Sync
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        LIVE REALTIME
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ดึงข้อมูลสดจาก Google Sheets แบบเรียลไทม์ พร้อมระบบตรวจสอบโครงสร้าง ตรวจสอบแถว และซิงก์เข้าฐานข้อมูลได้ทันที
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  {/* Auto Refresh Toggle */}
                  <button
                    id="btn-admin-sheets-autorefresh-toggle"
                    onClick={() => setLiveSheetAutoRefresh(!liveSheetAutoRefresh)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      liveSheetAutoRefresh
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {liveSheetAutoRefresh ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        <span>ซิงก์อัตโนมัติอยู่ (12 วินาที)</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        <span>เปิดซิงก์อัตโนมัติ</span>
                      </>
                    )}
                  </button>

                  {/* Manual Refresh Button */}
                  <button
                    id="btn-admin-sheets-manual-refresh"
                    onClick={() => fetchLiveSheetData()}
                    disabled={liveSheetLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${liveSheetLoading ? 'animate-spin' : ''}`} />
                    <span>{liveSheetLoading ? 'กำลังโหลดสด...' : 'รีเฟรชข้อมูลสด'}</span>
                  </button>
                </div>
              </div>

              {/* Preset Selector & Custom Input Form */}
              <div className="bg-slate-950/70 border border-slate-800 p-4.5 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    1. เลือกชีตพรีเซ็ต หรือระบุลิงก์ Google Sheets (อ่านอย่างเดียว):
                  </label>

                  {/* Quick presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="btn-admin-sheets-preset-books"
                      onClick={() => {
                        setLivePresetType('books');
                        const url = sheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
                        setLiveSheetUrl(url);
                        fetchLiveSheetData(url);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        livePresetType === 'books'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      📖 ชีตพิกัดหนังสือ
                    </button>

                    <button
                      type="button"
                      id="btn-admin-sheets-preset-students"
                      onClick={() => {
                        setLivePresetType('students');
                        const url = studentSheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
                        setLiveSheetUrl(url);
                        fetchLiveSheetData(url);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        livePresetType === 'students'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      👥 ชีตรายชื่อนักเรียน
                    </button>

                    <button
                      type="button"
                      id="btn-admin-sheets-preset-teachers"
                      onClick={() => {
                        setLivePresetType('teachers');
                        const url = teacherSheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
                        setLiveSheetUrl(url);
                        fetchLiveSheetData(url);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        livePresetType === 'teachers'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      🎓 ชีตรายชื่ออาจารย์
                    </button>

                    <button
                      type="button"
                      id="btn-admin-sheets-preset-admins"
                      onClick={() => {
                        setLivePresetType('custom');
                        const url = adminSheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
                        setLiveSheetUrl(url);
                        fetchLiveSheetData(url);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        livePresetType === 'custom'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      🛡️ ชีตรายชื่อ Admin
                    </button>
                  </div>
                </div>

                {/* URL Input Row */}
                <form onSubmit={(e) => { e.preventDefault(); fetchLiveSheetData(); }} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3" />
                    <input
                      id="input-admin-live-sheet-url"
                      type="text"
                      required
                      placeholder="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit..."
                      value={liveSheetUrl}
                      onChange={(e) => setLiveSheetUrl(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-750 focus:border-rose-500 focus:outline-none rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <input
                      id="input-admin-live-sheet-gid"
                      type="text"
                      placeholder="GID (เช่น 0)"
                      value={liveSheetGid}
                      onChange={(e) => setLiveSheetGid(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-750 focus:border-rose-500 focus:outline-none rounded-xl text-xs text-white placeholder-slate-500 font-mono"
                    />
                  </div>

                  <button
                    id="btn-admin-live-sheet-submit"
                    type="submit"
                    disabled={liveSheetLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {liveSheetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    ดึงข้อมูลสด
                  </button>
                </form>

                {/* Google Apps Script 2-Way Sync Connection Box */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <label className="text-xs font-black text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-rose-400" />
                      2. ช่องเชื่อมต่อ Google Apps Script Web App (ดึงข้อมูล + แก้ไขสดแบบ 2-Way Sync):
                    </label>

                    <button
                      type="button"
                      id="btn-open-apps-script-modal"
                      onClick={() => setShowAppsScriptModal(true)}
                      className="text-xs font-bold text-sky-400 hover:text-sky-300 underline flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Code className="w-3.5 h-3.5" />
                      วิธีติดตั้ง & ดูโค้ด Google Apps Script (ก๊อปปี้ไปวางได้เลย)
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleFetchAppsScript(); }} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Send className="w-4 h-4 text-rose-400 absolute left-3.5 top-3" />
                      <input
                        id="input-admin-apps-script-url"
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                        value={appsScriptUrl}
                        onChange={(e) => setAppsScriptUrl(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-750 focus:border-rose-500 focus:outline-none rounded-xl text-xs text-rose-200 placeholder-slate-500 font-mono"
                      />
                    </div>

                    <button
                      id="btn-admin-apps-script-submit"
                      type="submit"
                      disabled={appsScriptLoading}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-md"
                    >
                      {appsScriptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                      ดึงข้อมูลผ่าน Apps Script
                    </button>
                  </form>
                </div>
              </div>

              {/* Live Status Stats & View Switcher */}
              {liveSheetData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">สถานะการเชื่อมต่อ</p>
                      <p className="text-xs sm:text-sm font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        {isAppsScriptMode ? 'Apps Script 2-Way Live' : 'เชื่อมต่อสดสำเร็จ'}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">เวลาดึงข้อมูลล่าสุด</p>
                      <p className="text-xs sm:text-sm font-black text-slate-200 mt-0.5 font-mono">
                        {new Date(liveSheetData.fetchedAt).toLocaleTimeString('th-TH')} น.
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">จำนวนแถวทั้งหมด</p>
                      <p className="text-xs sm:text-sm font-black text-rose-400 mt-0.5 font-mono">
                        {editableRows.length} แถว
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">คอลัมน์ที่ตรวจพบ</p>
                      <p className="text-xs sm:text-sm font-black text-sky-400 mt-0.5 font-mono">
                        {editableHeaders.length} คอลัมน์
                      </p>
                    </div>
                  </div>

                  {/* View Mode & Quick Sync Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 border border-slate-800 rounded-xl">
                    {/* View mode toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                      <button
                        id="btn-admin-sheets-mode-table"
                        onClick={() => setLiveSheetMode('table')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          liveSheetMode === 'table' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        ตารางข้อมูลสด ({editableRows.length})
                      </button>

                      <button
                        id="btn-admin-sheets-mode-embed"
                        onClick={() => setLiveSheetMode('embed')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          liveSheetMode === 'embed' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ฝังหน้าจอ Google Sheet สด
                      </button>
                    </div>

                    {/* Quick sync buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">นำเข้าเข้าสู่ระบบทันที:</span>
                      
                      <button
                        id="btn-admin-sheets-sync-books"
                        onClick={handleLiveSyncToBooks}
                        disabled={liveSheetSyncLoading !== null}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="นำเข้าชีตนี้เข้าสู่ทะเบียนหนังสือ"
                      >
                        {liveSheetSyncLoading === 'books' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        ซิงก์เข้าหนังสือ
                      </button>

                      <button
                        id="btn-admin-sheets-sync-students"
                        onClick={handleLiveSyncToStudents}
                        disabled={liveSheetSyncLoading !== null}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="นำเข้าชีตนี้เข้าสู่ทะเบียนนักเรียน"
                      >
                        {liveSheetSyncLoading === 'students' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                        ซิงก์เข้านักเรียน
                      </button>

                      <button
                        id="btn-admin-sheets-sync-teachers"
                        onClick={handleLiveSyncToTeachers}
                        disabled={liveSheetSyncLoading !== null}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="นำเข้าชีตนี้เข้าสู่ทะเบียนอาจารย์"
                      >
                        {liveSheetSyncLoading === 'teachers' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <School className="w-3.5 h-3.5" />}
                        ซิงก์เข้าอาจารย์
                      </button>

                      <button
                        id="btn-admin-sheets-sync-admins"
                        onClick={handleLiveSyncToAdmins}
                        disabled={liveSheetSyncLoading !== null}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="นำเข้าชีตนี้เข้าสู่ทะเบียนผู้ดูแลระบบ (Admin)"
                      >
                        {liveSheetSyncLoading === 'admins' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        ซิงก์เข้า Admin
                      </button>
                    </div>
                  </div>

                  {/* Content Mode 1: Interactive Table Grid View with Live Editing */}
                  {liveSheetMode === 'table' && (
                    <div className="space-y-3">
                      {/* Table Controls & Apps Script Push Bar */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                        <div className="relative flex-1 max-w-xs">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            id="input-admin-live-sheet-search"
                            type="text"
                            placeholder="ค้นหาข้อความในแถวข้อมูล..."
                            value={liveSheetFilter}
                            onChange={(e) => setLiveSheetFilter(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                          />
                        </div>

                        {/* Action buttons for editing */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            เพิ่มแถวใหม่
                          </button>

                          <button
                            type="button"
                            onClick={handleAddColumn}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 text-sky-400" />
                            เพิ่มคอลัมน์
                          </button>

                          <button
                            type="button"
                            id="btn-save-live-apps-script"
                            onClick={handleSaveToGoogleSheet}
                            disabled={appsScriptSaving}
                            className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                              hasUnsavedChanges
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse font-black'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title="ส่งการแก้ไขกลับไปยัง Google Sheet ผ่าน Apps Script"
                          >
                            {appsScriptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{hasUnsavedChanges ? '💾 มีการแก้ไข! บันทึกลง Google Sheet' : '💾 บันทึกลง Google Sheet'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Editable Table Grid */}
                      <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[520px] shadow-inner bg-slate-950">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-300 font-bold z-10">
                            <tr>
                              <th className="py-2 px-2 border-r border-slate-800 text-center w-10 text-slate-500">#</th>
                              {editableHeaders.map((header, colIdx) => (
                                <th key={colIdx} className="p-1 border-r border-slate-800 font-mono text-emerald-400 min-w-[120px]">
                                  <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => handleHeaderEdit(colIdx, e.target.value)}
                                    className="w-full px-2 py-1 bg-transparent hover:bg-slate-800 focus:bg-slate-900 border border-transparent focus:border-emerald-500/50 rounded font-bold text-emerald-400 focus:outline-none"
                                    placeholder={`Col ${colIdx + 1}`}
                                  />
                                </th>
                              ))}
                              <th className="py-2 px-2 text-center w-12 text-slate-500">ลบ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                            {editableRows
                              .map((row, realRowIdx) => ({ row, realRowIdx }))
                              .filter(({ row }) => !liveSheetFilter || row.some(cell => String(cell || '').toLowerCase().includes(liveSheetFilter.toLowerCase())))
                              .map(({ row, realRowIdx }) => (
                                <tr key={realRowIdx} className="hover:bg-slate-900/60 transition-colors">
                                  <td className="py-2 px-2 border-r border-slate-800/60 text-center text-slate-500 font-bold text-[11px]">
                                    {realRowIdx + 1}
                                  </td>
                                  {editableHeaders.map((_, colIdx) => (
                                    <td key={colIdx} className="p-1 border-r border-slate-800/60 min-w-[120px]">
                                      <input
                                        type="text"
                                        value={row[colIdx] ?? ''}
                                        onChange={(e) => handleCellEdit(realRowIdx, colIdx, e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent focus:border-rose-500/50 rounded text-slate-200 focus:outline-none text-xs"
                                        placeholder="-"
                                      />
                                    </td>
                                  ))}
                                  <td className="py-2 px-2 text-center border-l border-slate-800/60">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(realRowIdx)}
                                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10 cursor-pointer"
                                      title="ลบแถวนี้"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}


                  {/* Content Mode 2: Live Embedded Iframe View */}
                  {liveSheetMode === 'embed' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5 font-mono">
                          <ExternalLink className="w-4 h-4 text-emerald-400" />
                          ลิงก์ Google Sheet ID: {liveSheetData.spreadsheetId}
                        </span>

                        <a
                          href={liveSheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 underline underline-offset-2"
                        >
                          เปิดในแท็บใหม่ Google Sheets ↗
                        </a>
                      </div>

                      <div className="w-full h-[550px] rounded-xl overflow-hidden border border-slate-800 bg-white shadow-2xl relative">
                        <iframe
                          src={liveSheetData.embedUrl}
                          className="w-full h-full border-0"
                          title="Live Google Sheet View"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 bg-slate-950 border border-slate-800 rounded-2xl">
                  {liveSheetLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                      <p className="font-bold text-slate-300 text-sm">กำลังเชื่อมต่อและดึงข้อมูลสดจาก Google Sheet...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-10 h-10 text-slate-600" />
                      <p className="font-bold text-slate-300 text-sm">ยังไม่ได้โหลดข้อมูล Google Sheet</p>
                      <p className="text-xs text-slate-500">กรุณากดปุ่ม "ดึงข้อมูลสด" หรือเลือกชีตพรีเซ็ตด้านบน</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Settings Area (4/12) */}
        {activeTab !== 'sheets' && (
          <div className="lg:col-span-4 space-y-6">
            
            {/* Danger Zone Reset Module */}
          <div className="bg-white rounded-2xl border border-red-150 p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-red-800 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              การจัดการความปลอดภัยและข้อมูล
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ฟังก์ชันนี้ทำไว้เพื่อให้สามารถย้อนสถานะข้อมูลทดสอบกลับไปจุดเริ่มต้นได้ สะดวกต่อการนำเสนอหรือเมื่อข้อมูลในระบบชนกันเสียหาย
            </p>

            {!showResetConfirm ? (
              <button
                id="btn-show-reset-db"
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Database className="w-4 h-4" />
                รีเซ็ตฐานข้อมูลเป็นค่าตั้งต้น (Reset)
              </button>
            ) : (
              <form onSubmit={handleResetDBSubmit} className="space-y-3 p-4 bg-red-50/50 border border-red-100 rounded-xl fade-in text-xs">
                <div>
                  <p className="font-bold text-red-900">ระบุรหัสความปลอดภัยผู้ใช้เพื่อยืนยัน:</p>
                  <p className="text-[10px] text-red-600 mt-0.5">ระบุรหัสประจำตัวพินความปลอดภัยแอดมิน: <strong className="bg-white px-1.5 py-0.5 border rounded font-mono font-black text-rose-800">12102548</strong></p>
                </div>

                <input
                  id="admin-reset-code-input"
                  type="text"
                  required
                  placeholder="พิมพ์ 12102548"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl font-bold font-mono text-center text-sm"
                />

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowResetConfirm(false); setResetCode(''); }}
                    className="flex-1 py-1.5 bg-white text-slate-600 border rounded-lg font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading === 'reset'}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {actionLoading === 'reset' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    ยืนยันการคืนค่า
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Guidelines / Helper Box */}
          <div className="bg-slate-55 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-3">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4.5 h-4.5 text-slate-500" />
              หน้าที่ผู้ดูแลระบบหลัก (Admin)
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px] leading-relaxed">
              <li>สร้างและลงทะเบียนบัญชีสำหรับคุณครู เพื่อให้ครูไปนำเข้าหนังสือจาก Google Sheet ต่อไป</li>
              <li>ติดตามการเคลื่อนไหวรวมจาก Bento Grid ด้านซ้าย</li>
              <li>สามารถตรวจสอบหรือลบประวัตินักเรียนที่มีพฤติกรรมผิดนโยบายการคืนหนังสือได้</li>
              <li>การล้างข้อมูลโรงงานจะไม่ลบบัญชีแอดมินตัวนี้</li>
            </ul>
          </div>
        </div>
      )}

      </div>

      {/* Student Detail & Password Edit Modal */}
      <StudentDetailModal
        student={selectedStudentForModal}
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onUpdateSuccess={loadAllData}
        transactions={transactions}
        books={books}
      />

      {/* Teacher Detail & Password Edit Modal */}
      <TeacherDetailModal
        teacher={selectedTeacherForModal}
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onUpdateSuccess={loadAllData}
      />

      {/* Google Apps Script Setup & Code Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
                  <Code className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">วิธีติดตั้ง Google Apps Script สำหรับการแก้ไขข้อมูลสดสด 2-Way Sync</h3>
                  <p className="text-xs text-slate-400 mt-0.5">คัดลอกชุดโค้ดนี้ไปใส่ใน Google Sheet เพื่อเปิดสิทธิ์อ่าน-เขียนข้อมูลเรียลไทม์ผ่านเว็บแอป</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Installation Steps */}
            <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <h4 className="font-extrabold text-rose-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> ขั้นตอนการติดตั้งง่ายๆ ใน 2 นาที:
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed text-slate-300">
                <li>เปิด Google Sheet ของท่าน &rarr; คลิกเมนูข้างบน <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">ส่วนขยาย (Extensions)</strong> &gt; <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded">Apps Script</strong></li>
                <li>ลบโค้ดที่มีเดิมในไฟล์ <code className="text-rose-300">Code.gs</code> ออกทั้งหมด แล้ววางชุดโค้ดด้านล่างนี้แทนที่</li>
                <li>กดปุ่ม <strong className="text-emerald-400">บันทึก (Save / 💾)</strong></li>
                <li>กดปุ่มมุมขวาบน <strong className="text-sky-400">การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong className="text-sky-300">การทำให้ใช้งานได้ใหม่ (New Deployment)</strong></li>
                <li>เลือกประเภทเป็น <strong className="text-amber-300 font-mono">Web App</strong>, ตั้งค่า <strong className="text-rose-300 font-mono">Execute as: Me</strong> และ <strong className="text-emerald-300 font-mono">Who has access: Anyone (ทุกคน)</strong></li>
                <li>กด <strong className="text-emerald-400">Deploy</strong> และคัดลอก <strong className="text-amber-300 font-mono">Web App URL</strong> มาวางในช่อง Apps Script URL ของระบบ Admin</li>
              </ol>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-emerald-400" /> ชุดโค้ด Apps Script (Code.gs):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(APPS_SCRIPT_CODE_TEMPLATE);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 3000);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCode ? 'คัดลอกโค้ดเรียบร้อยแล้ว! ✓' : 'คัดลอกชุดโค้ดทั้งหมด'}
                </button>
              </div>

              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                <pre className="p-4 text-[11px] font-mono text-rose-300/90 overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                  {APPS_SCRIPT_CODE_TEMPLATE}
                </pre>
              </div>
            </div>

            {/* Close / Action Button */}
            <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                เข้าใจแล้ว / ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
