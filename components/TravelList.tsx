
import React, { useRef, useState } from 'react';
import { Plus, MapPin, Calendar, Users, Download, Upload, RefreshCw, Database, Trash2, Edit, ChevronDown, ChevronUp, Save, X, LogOut } from 'lucide-react';
import { TravelRecord, AppSettings } from '../types';
import { formatDate } from '../utils';

interface TravelListProps {
  records: TravelRecord[];
  onSelect: (record: TravelRecord) => void;
  onCreateNew: () => void;
  onEdit: (record: TravelRecord) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onDelete: (id: string) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (settings: AppSettings) => void;
  onLogout?: () => void;
}

export const TravelList: React.FC<TravelListProps> = ({ 
  records, 
  onSelect, 
  onCreateNew,
  onEdit,
  onExport,
  onImport,
  onReset,
  onDelete,
  appSettings,
  onUpdateAppSettings,
  onLogout
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Header editing state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [tempTitle, setTempTitle] = useState(appSettings.title);
  const [tempSubtitle, setTempSubtitle] = useState(appSettings.subtitle);

  const handleSaveHeader = () => {
    onUpdateAppSettings({ title: tempTitle, subtitle: tempSubtitle });
    setIsEditingHeader(false);
  };

  const handleCancelHeader = () => {
    setTempTitle(appSettings.title);
    setTempSubtitle(appSettings.subtitle);
    setIsEditingHeader(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-6 shadow-sm border-b sticky top-0 z-10 transition-all">
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1">
             {isEditingHeader ? (
               <div className="space-y-2 mb-2">
                 <input 
                   type="text" 
                   value={tempTitle}
                   onChange={(e) => setTempTitle(e.target.value)}
                   className="w-full text-2xl font-extrabold text-slate-800 border-b border-teal-500 focus:outline-none"
                   placeholder="輸入主標題"
                 />
                 <input 
                   type="text" 
                   value={tempSubtitle}
                   onChange={(e) => setTempSubtitle(e.target.value)}
                   className="w-full text-sm text-slate-500 border-b border-teal-300 focus:outline-none"
                   placeholder="輸入副標題"
                 />
                 <div className="flex gap-2 mt-2">
                   <button onClick={handleSaveHeader} className="bg-teal-600 text-white p-1 rounded hover:bg-teal-700"><Save size={16}/></button>
                   <button onClick={handleCancelHeader} className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300"><X size={16}/></button>
                 </div>
               </div>
             ) : (
               <>
                 <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="text-3xl">👨‍🤝‍👨🐕</span>
                    {appSettings.title}
                    <button onClick={() => setIsEditingHeader(true)} className="text-slate-300 hover:text-slate-500 transition ml-2">
                      <Edit size={16} />
                    </button>
                 </h1>
                 <p className="text-slate-500 text-sm mt-1">{appSettings.subtitle}</p>
               </>
             )}
          </div>

          <button 
            onClick={onCreateNew}
            className="bg-teal-600 text-white p-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors ml-4 shrink-0"
            aria-label="Add Trip"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-4">
        {records.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="mb-4">🧳</div>
            <p>目前沒有紀錄，點擊 + 新增你的第一趟旅程！</p>
            <p className="text-xs mt-2">或在下方匯入範例資料</p>
          </div>
        ) : (
          records.map(record => (
            <div 
              key={record.id} 
              onClick={() => onSelect(record)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] duration-150 relative group"
            >
              <div className="h-40 overflow-hidden relative">
                <img 
                  src={record.coverImage || record.photos[0] || 'https://picsum.photos/600/300'} 
                  alt={record.title}
                  className="w-full h-full object-cover transition-transform duration-300 origin-center"
                  style={{
                    objectPosition: record.coverPosition || '50% 50%',
                    transform: `scale(${record.coverScale || 1})`
                  }}
                  onError={(e) => {
                     (e.target as HTMLImageElement).src = 'https://picsum.photos/600/300';
                  }}
                />
                
                {/* Badges and Actions Overlay */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm backdrop-blur-sm ${record.isInternational ? 'bg-blue-100/90 text-blue-800' : 'bg-green-100/90 text-green-800'}`}>
                    {record.isInternational ? '國外' : '國內'}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(record);
                    }}
                    className="bg-white/90 hover:bg-teal-50 text-slate-600 p-1 rounded-md shadow-sm backdrop-blur-sm transition-colors"
                    title="編輯行程"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(record.id);
                    }}
                    className="bg-red-500/90 hover:bg-red-600 text-white p-1 rounded-md shadow-sm backdrop-blur-sm transition-colors"
                    title="刪除行程"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate">{record.title}</h3>
                
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2 text-teal-500" />
                    {formatDate(record.startDate)} - {formatDate(record.endDate)}
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2 text-teal-500" />
                    <span className="truncate">{record.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Users size={14} className="mr-2 text-teal-500" />
                    <span className="truncate">{record.members.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Collapsible Data Management Section */}
      <div className="mx-4 mt-8 mb-4 border-t border-slate-200 pt-6">
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="w-full flex items-center justify-between text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 hover:text-slate-600 transition"
        >
          <span className="flex items-center"><Database size={14} className="mr-1" /> 設定與資料</span>
          {isSettingsOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
        
        {isSettingsOpen && (
          <div className="animate-fade-in space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onExport}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                <Download size={16} />
                匯出備份
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              >
                <Upload size={16} />
                匯入資料
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={onImport}
                  accept=".json"
                  className="hidden"
                />
              </button>
              
              <button 
                onClick={onReset}
                className="col-span-2 flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-2 rounded-xl text-xs hover:bg-teal-50 hover:text-teal-600 transition mt-2 font-bold"
              >
                <RefreshCw size={12} />
                匯入範例行程 (11月環島)
              </button>
            </div>

            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl text-sm font-medium hover:bg-black transition mt-4"
              >
                <LogOut size={16} />
                登出 (鎖定日誌)
              </button>
            )}

            <p className="text-center text-xs text-slate-300 mt-4">
              資料將同步至雲端 Firebase
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
