
import React, { useState, useEffect } from 'react';
import { TravelForm } from './components/TravelForm';
import { TravelList } from './components/TravelList';
import { TravelDetail } from './components/TravelDetail';
import { TravelRecord, ViewMode } from './types';

// Initial Mock Data based on user request
const INITIAL_DATA: TravelRecord[] = [
  {
    id: 'demo-1',
    title: '11月火車環島快閃',
    location: '台灣 - 花蓮 台東 高雄 台南 嘉義',
    isInternational: false,
    startDate: '2025-11-19',
    endDate: '2025-11-23',
    members: ['Hugo', '仁駿', 'Hiro'],
    photos: [
      'https://picsum.photos/id/1036/800/600', // Train/Nature placeholder
      'https://picsum.photos/id/1043/800/600',
      'https://picsum.photos/id/1015/800/600',
      'https://picsum.photos/id/1040/800/600',
      'https://picsum.photos/id/237/800/600',
    ],
    expenses: [
      { id: 'e1', item: '花蓮民宿住宿費 (2晚)', amount: 4800, currency: 'TWD', exchangeRate: 1 },
      { id: 'e2', item: '台東租車費', amount: 1200, currency: 'TWD', exchangeRate: 1 },
      { id: 'e3', item: '高雄飯店住宿', amount: 3600, currency: 'TWD', exchangeRate: 1 },
      { id: 'e4', item: '環島之星火車票', amount: 9500, currency: 'TWD', exchangeRate: 1 },
    ],
    itinerary: [
      { 
        date: '2025-11-19', 
        activities: [
          { 
            id: 'd1-1', 
            type: 'spot', 
            title: '慶修院', 
            reviews: [
               { id: 'r1-1', reviewer: 'Hugo', rating: 4, comment: '日式風格保存得很好，很清幽。' }
            ] 
          },
          { id: 'd1-2', type: 'spot', title: '鯉魚潭', reviews: [] },
          { id: 'd1-3', type: 'food', title: '依蓮小吃', reviews: [] },
          { id: 'd1-4', type: 'food', title: '厚點甜', reviews: [] },
          { id: 'd1-5', type: 'spot', title: '將軍府1936', reviews: [] },
          { 
            id: 'd1-6', 
            type: 'food', 
            title: '東大門夜市', 
            reviews: [
              { id: 'r1-6', reviewer: '仁駿', rating: 4, comment: '選擇超多，烤玉米必吃！' }
            ]
          }
        ]
      },
      { 
        date: '2025-11-20', 
        activities: [
          { id: 'd2-1', type: 'spot', title: '楓林步道', reviews: [] },
          { id: 'd2-2', type: 'food', title: '柴米Daily Kitchen', reviews: [] },
          { id: 'd2-3', type: 'spot', title: '台東海濱公園', reviews: [] },
          { id: 'd2-4', type: 'food', title: '海特咖啡', reviews: [] },
          { 
            id: 'd2-5', 
            type: 'spot', 
            title: '鐵花村', 
            reviews: [
               { id: 'r2-5-1', reviewer: 'Hiro', rating: 5, comment: '晚上的熱氣球燈籠很美，氣氛很棒。' }
            ] 
          },
          { id: 'd2-6', type: 'food', title: '榕樹下米苔目', reviews: [] },
          { id: 'd2-7', type: 'food', title: '藍蜻蜓速食', reviews: [] }
        ]
      },
      { 
        date: '2025-11-21', 
        activities: [
          { id: 'd3-1', type: 'food', title: '麵店（待確認）', reviews: [] },
          { id: 'd3-2', type: 'spot', title: '衛武營都會公園', reviews: [] },
          { 
            id: 'd3-3', 
            type: 'spot', 
            title: '高雄港區(Twice應援）', 
            reviews: [
               { id: 'r3-3-1', reviewer: 'Hugo', rating: 5, comment: '太感動了！滿滿的應援！' }
            ] 
          },
          { id: 'd3-4', type: 'food', title: '老江紅茶牛奶', reviews: [] },
          { id: 'd3-5', type: 'food', title: '鍾家綠豆湯大王', reviews: [] }
        ]
      },
      { 
        date: '2025-11-22', 
        activities: [
          { id: 'd4-1', type: 'food', title: '陳賣賣手做飯糰', reviews: [] },
          { id: 'd4-2', type: 'spot', title: '台南公園', reviews: [] },
          { id: 'd4-3', type: 'food', title: 'TUGU荼谷', reviews: [] },
          { id: 'd4-4', type: 'food', title: '老吳冰室', reviews: [] },
          { id: 'd4-5', type: 'food', title: '厚奶的我們', reviews: [] },
          { id: 'd4-6', type: 'spot', title: '水交社文化園區', reviews: [] },
          { 
            id: 'd4-7', 
            type: 'spot', 
            title: '漁光島', 
            reviews: [
               { id: 'r4-7-1', reviewer: 'Hiro', rating: 5, comment: '夕陽超級美，適合散步。' }
            ] 
          },
          { id: 'd4-8', type: 'food', title: '今鶴餐酒館', reviews: [] },
          { id: 'd4-9', type: 'food', title: '悅津鹹粥', reviews: [] }
        ]
      },
      { 
        date: '2025-11-23', 
        activities: [
          { 
            id: 'd5-1', 
            type: 'food', 
            title: '西羅殿牛肉湯', 
            reviews: [
               { id: 'r5-1-1', reviewer: 'Hugo', rating: 5, comment: '湯頭鮮甜，肉質嫩，台南必吃。' }
            ] 
          },
          { id: 'd5-2', type: 'food', title: '一味品碗粿', reviews: [] },
          { id: 'd5-3', type: 'food', title: '木匠手烘咖啡', reviews: [] },
          { id: 'd5-4', type: 'spot', title: '水仙宮', reviews: [] },
          { id: 'd5-5', type: 'food', title: '桃城三禾雞肉飯', reviews: [] },
          { id: 'd5-6', type: 'spot', title: '嘉義公園', reviews: [] },
          { 
            id: 'd5-7', 
            type: 'food', 
            title: '大同火雞肉飯', 
            reviews: [
              { id: 'r5-7-1', reviewer: '仁駿', rating: 5, comment: '火雞肉飯還是要在嘉義吃才對味！' }
            ]
          },
          { id: 'd5-8', type: 'food', title: '榮興茶行', reviews: [] }
        ]
      },
    ]
  }
];

const STORAGE_KEY = 'OUR_TRAVEL_LOG_DATA_V1';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Load initial state from localStorage or fallback to INITIAL_DATA
  const [records, setRecords] = useState<TravelRecord[]>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage', error);
    }
    return INITIAL_DATA;
  });

  const [selectedRecord, setSelectedRecord] = useState<TravelRecord | null>(null);

  // Auto-save to localStorage whenever records change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save data to localStorage', error);
    }
  }, [records]);

  const handleCreate = (newRecord: TravelRecord) => {
    setRecords([newRecord, ...records]);
    setViewMode('list');
  };

  const handleSelect = (record: TravelRecord) => {
    setSelectedRecord(record);
    setViewMode('detail');
  };

  const handleUpdateRecord = (updatedRecord: TravelRecord) => {
    // Update local list
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    // Update currently viewing record
    setSelectedRecord(updatedRecord);
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
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsedData = JSON.parse(json);
        if (Array.isArray(parsedData)) {
          // Simple validation check
          if (window.confirm('確定要匯入備份資料嗎？這將會覆蓋目前的行程記錄。')) {
            setRecords(parsedData);
            alert('匯入成功！');
          }
        } else {
          alert('匯入失敗：檔案格式不正確');
        }
      } catch (error) {
        alert('匯入失敗：無法讀取檔案');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleResetData = () => {
    if (window.confirm('確定要重置所有資料嗎？所有的自訂行程都將消失並恢復成預設範例。')) {
      setRecords(INITIAL_DATA);
      localStorage.removeItem(STORAGE_KEY);
      alert('已恢復預設資料。');
    }
  };

  return (
    <div className="antialiased text-slate-900 bg-slate-50 min-h-screen font-sans">
      {viewMode === 'list' && (
        <TravelList 
          records={records} 
          onSelect={handleSelect} 
          onCreateNew={() => setViewMode('create')} 
          onExport={handleExportData}
          onImport={handleImportData}
          onReset={handleResetData}
        />
      )}

      {viewMode === 'create' && (
        <TravelForm 
          onSubmit={handleCreate} 
          onCancel={() => setViewMode('list')} 
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
