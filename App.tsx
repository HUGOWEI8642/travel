
import React, { useState, useEffect } from 'react';
import { TravelForm } from './components/TravelForm';
import { TravelList } from './components/TravelList';
import { TravelDetail } from './components/TravelDetail';
import { LoginGate } from './components/LoginGate';
import { TravelRecord, ViewMode, AppSettings } from './types';
import { db } from './firebaseConfig';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc, setDoc, where, getDocs } from 'firebase/firestore';

// Detailed Data for the November Train Trip - CLEARED REVIEWS AND EXPENSES
const NOVEMBER_TRIP: Omit<TravelRecord, 'id'> = {
  title: "11月火車環島快閃",
  location: "台灣-花蓮 台東 高雄 台南 嘉義",
  isInternational: false,
  startDate: "2025-11-19",
  endDate: "2025-11-23",
  members: ["Hugo", "仁駿", "Hiro"],
  photos: [
    "https://images.unsplash.com/photo-1552993873-0dd1110e025f?q=80&w=1000&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1594396656731-9556a3df54f5?q=80&w=1000&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1508248742801-71f98d407357?q=80&w=1000&auto=format&fit=crop"
  ],
  expenses: [],
  generalThoughts: [],
  itinerary: [
    {
      date: "2025-11-19",
      activities: [
        { id: "d1-1", type: "spot", title: "花蓮 - 慶修院", reviews: [] },
        { id: "d1-2", type: "spot", title: "花蓮 - 鯉魚潭", reviews: [] },
        { id: "d1-3", type: "food", title: "花蓮 - 依蓮小吃", reviews: [] },
        { id: "d1-4", type: "food", title: "花蓮 - 厚點甜", reviews: [] },
        { id: "d1-5", type: "spot", title: "花蓮 - 將軍府1936", reviews: [] },
        { id: "d1-6", type: "food", title: "花蓮 - 東大門夜市", reviews: [] }
      ]
    },
    {
      date: "2025-11-20",
      activities: [
        { id: "d2-1", type: "spot", title: "花蓮 - 楓林步道", reviews: [] },
        { id: "d2-2", type: "food", title: "台東 - 柴米Daily Kitchen", reviews: [] },
        { id: "d2-3", type: "spot", title: "台東 - 台東海濱公園", reviews: [] },
        { id: "d2-4", type: "food", title: "台東 - 海特咖啡", reviews: [] },
        { id: "d2-5", type: "spot", title: "台東 - 鐵花村", reviews: [] },
        { id: "d2-6", type: "food", title: "台東 - 榕樹下米苔目", reviews: [] },
        { id: "d2-7", type: "food", title: "台東 - 藍蜻蜓速食", reviews: [] }
      ]
    },
    {
      date: "2025-11-21",
      activities: [
        { id: "d3-1", type: "food", title: "高雄 - 麵店（待確認）", reviews: [] },
        { id: "d3-2", type: "spot", title: "高雄 - 衛武營都會公園", reviews: [] },
        { id: "d3-3", type: "spot", title: "高雄 - 高雄港區(Twice應援）", reviews: [] },
        { id: "d3-4", type: "food", title: "高雄 - 老江紅茶牛奶", reviews: [] },
        { id: "d3-5", type: "food", title: "高雄 - 鍾家綠豆湯大王", reviews: [] }
      ]
    },
    {
      date: "2025-11-22",
      activities: [
        { id: "d4-1", type: "food", title: "高雄 - 陳賣賣手做飯糰", reviews: [] },
        { id: "d4-2", type: "spot", title: "台南 - 台南公園", reviews: [] },
        { id: "d4-3", type: "food", title: "台南 - TUGU荼谷", reviews: [] },
        { id: "d4-4", type: "food", title: "台南 - 老吳冰室", reviews: [] },
        { id: "d4-5", type: "food", title: "台南 - 厚奶的我們", reviews: [] },
        { id: "d4-6", type: "spot", title: "台南 - 水交社文化園區", reviews: [] },
        { id: "d4-7", type: "spot", title: "台南 - 漁光島", reviews: [] },
        { id: "d4-8", type: "food", title: "台南 - 今鶴餐酒館", reviews: [] },
        { id: "d4-9", type: "food", title: "台南 - 悅津鹹粥", reviews: [] }
      ]
    },
    {
      date: "2025-11-23",
      activities: [
        { id: "d5-1", type: "food", title: "台南 - 西羅殿牛肉湯", reviews: [] },
        { id: "d5-2", type: "food", title: "台南 - 一味品碗粿", reviews: [] },
        { id: "d5-3", type: "food", title: "台南 - 木匠手烘咖啡", reviews: [] },
        { id: "d5-4", type: "spot", title: "台南 - 水仙宮", reviews: [] },
        { id: "d5-5", type: "food", title: "嘉義 - 桃城三禾雞肉飯", reviews: [] },
        { id: "d5-6", type: "spot", title: "嘉義 - 嘉義公園", reviews: [] },
        { id: "d5-7", type: "food", title: "嘉義 - 大同火雞肉飯", reviews: [] },
        { id: "d5-8", type: "food", title: "嘉義 - 榮興茶行", reviews: [] }
      ]
    }
  ]
};

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TravelRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>({ title: "我們的旅遊記錄", subtitle: "紀錄每一個感動的瞬間" });

  // Check session storage on mount
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('travel_log_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('travel_log_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('travel_log_auth');
  };

  // 1. Real-time listener for Travel Records
  useEffect(() => {
    if (!isAuthenticated) return; // Do not fetch data if not logged in

    try {
      const q = query(collection(db, 'travel_records'), orderBy('startDate', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRecords: TravelRecord[] = snapshot.docs.map(doc => ({
          ...(doc.data() as Omit<TravelRecord, 'id'>),
          id: doc.id
        }));
        setRecords(fetchedRecords);
        setLoading(false);
        
        if (selectedRecord) {
          const updatedSelected = fetchedRecords.find(r => r.id === selectedRecord.id);
          if (updatedSelected) {
            setSelectedRecord(updatedSelected);
          }
        }
      }, (error) => {
        console.error("Firebase fetch error:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up listener:", err);
      setLoading(false);
    }
  }, [isAuthenticated, selectedRecord?.id]);

  // 2. Real-time listener for App Settings
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const settingsDocRef = doc(db, 'app_settings', 'header');
      const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setAppSettings(docSnap.data() as AppSettings);
        } else {
          // Initialize if missing
          setDoc(settingsDocRef, { title: "我們的旅遊記錄", subtitle: "紀錄每一個感動的瞬間" });
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Settings listener error", e);
    }
  }, [isAuthenticated]);

  const handleUpdateAppSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'app_settings', 'header'), newSettings);
    } catch (e) {
      console.error("Failed to update settings", e);
      alert("標題更新失敗");
    }
  };

  const handleSaveForm = async (recordData: TravelRecord) => {
    try {
      if (recordData.id) {
        // Update existing
        const docRef = doc(db, 'travel_records', recordData.id);
        await updateDoc(docRef, { ...recordData });
      } else {
        // Create new
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...data } = recordData;
        const docRef = await addDoc(collection(db, 'travel_records'), data);
        
        // If the form helper temporarily stored photos in 'photos' array,
        // we might want to move them to the collection now to ensure consistency,
        // but TravelForm handles this by uploading to collection if ID exists, 
        // or passing them here. 
        // NOTE: For simplicity, TravelForm below handles separate uploads.
      }
      setViewMode('list');
      setSelectedRecord(null);
    } catch (e) {
      console.error("Error saving document: ", e);
      alert("儲存失敗，請檢查網路連線");
    }
  };

  const handleSelect = (record: TravelRecord) => {
    setSelectedRecord(record);
    setViewMode('detail');
  };

  const handleEdit = (record: TravelRecord) => {
    setSelectedRecord(record);
    setViewMode('edit');
  };

  const handleUpdateRecord = async (updatedRecord: TravelRecord) => {
    try {
      if (!updatedRecord.id) return;
      const docRef = doc(db, 'travel_records', updatedRecord.id);
      await updateDoc(docRef, { ...updatedRecord });
      setSelectedRecord(updatedRecord);
    } catch (e) {
      console.error("Error updating document: ", e);
      alert("更新失敗");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("確定要刪除這筆旅遊紀錄嗎？刪除後無法復原。")) return;

    const password = window.prompt("請輸入管理密碼以確認刪除：");
    if (password !== "0329") {
      alert("密碼錯誤，取消刪除。");
      return;
    }

    try {
      // 1. Delete the record
      await deleteDoc(doc(db, 'travel_records', id));

      // 2. Delete associated photos in 'travel_photos' collection
      const photosQuery = query(collection(db, 'travel_photos'), where('recordId', '==', id));
      const photosSnapshot = await getDocs(photosQuery);
      const deletePromises = photosSnapshot.docs.map(photoDoc => deleteDoc(photoDoc.ref));
      await Promise.all(deletePromises);

      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
        setViewMode('list');
      }
      alert("刪除成功");
    } catch (e) {
      console.error("Error deleting document: ", e);
      alert("刪除失敗");
    }
  };

  // Data Management Functions
  const handleExportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel_records_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const parsedData = JSON.parse(json);
        if (Array.isArray(parsedData)) {
          if (window.confirm('確定要將備份資料匯入雲端資料庫嗎？這將會逐筆新增至 Firebase。')) {
             for (const rec of parsedData) {
               // eslint-disable-next-line @typescript-eslint/no-unused-vars
               const { id, ...data } = rec;
               await addDoc(collection(db, 'travel_records'), data);
             }
             alert('匯入雲端成功！');
          }
        }
      } catch (error) {
        alert('匯入失敗');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportExampleTrip = async () => {
    if (window.confirm("確定要將「11月火車環島快閃」範例行程加入到您的雲端資料庫嗎？(將匯入空白評論與支出版本)")) {
      try {
        await addDoc(collection(db, 'travel_records'), NOVEMBER_TRIP);
        alert("匯入成功！");
      } catch (e) {
        console.error("Error adding example doc: ", e);
        alert("匯入失敗，請檢查 Firebase 設定或網路連線。");
      }
    }
  };

  // If not authenticated, show Login Gate
  if (!isAuthenticated) {
    return <LoginGate onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p>正在連線至雲端資料庫...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased text-slate-900 bg-slate-50 min-h-screen font-sans">
      {viewMode === 'list' && (
        <TravelList 
          records={records} 
          onSelect={handleSelect} 
          onCreateNew={() => {
            setSelectedRecord(null);
            setViewMode('create');
          }} 
          onEdit={handleEdit}
          onExport={handleExportData}
          onImport={handleImportData}
          onReset={handleImportExampleTrip}
          onDelete={handleDeleteRecord}
          appSettings={appSettings}
          onUpdateAppSettings={handleUpdateAppSettings}
          onLogout={handleLogout}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <TravelForm 
          initialData={viewMode === 'edit' && selectedRecord ? selectedRecord : undefined}
          onSubmit={handleSaveForm} 
          onCancel={() => {
            setSelectedRecord(null);
            setViewMode('list');
          }} 
        />
      )}

      {viewMode === 'detail' && selectedRecord && (
        <TravelDetail 
          record={selectedRecord} 
          onBack={() => setViewMode('list')} 
          onUpdate={handleUpdateRecord}
        />
      )}
    </div>
  );
};

export default App;
