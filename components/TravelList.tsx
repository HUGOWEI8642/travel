
import React, { useRef } from 'react';
import { Plus, MapPin, Calendar, Users, Download, Upload, RefreshCw, Database } from 'lucide-react';
import { TravelRecord } from '../types';
import { formatDate } from '../utils';

interface TravelListProps {
  records: TravelRecord[];
  onSelect: (record: TravelRecord) => void;
  onCreateNew: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export const TravelList: React.FC<TravelListProps> = ({ 
  records, 
  onSelect, 
  onCreateNew,
  onExport,
  onImport,
  onReset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-6 shadow-sm border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-3xl">👨‍🤝‍👨🐕</span>
            我們的旅遊記錄
          </h1>
          <button 
            onClick={onCreateNew}
            className="bg-teal-600 text-white p-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors"
            aria-label="Add Trip"
          >
            <Plus size={24} />
          </button>
        </div>
        <p className="text-slate-500 text-sm">記錄每一個感動的瞬間</p>
      </div>

      {/* List */}
      <div className="p-4 space-y-4">
        {records.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="mb-4">🧳</div>
            <p>目前沒有紀錄，點擊 + 新增你的第一趟旅程！</p>
          </div>
        ) : (
          records.map(record => (
            <div 
              key={record.id} 
              onClick={() => onSelect(record)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] duration-150"
            >
              <div className="h-40 overflow-hidden relative">
                <img 
                  src={record.coverImage || record.photos[0] || 'https://picsum.photos/600/300'} 
                  alt={record.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${record.isInternational ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {record.isInternational ? '國外' : '國內'}
                  </span>
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

      {/* Data Management Section */}
      <div className="mx-4 mt-8 mb-4 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
          <Database size={14} className="mr-1" /> 設定與資料
        </h3>
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
            className="col-span-2 flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-2 rounded-xl text-xs hover:bg-red-50 hover:text-red-500 transition mt-2"
          >
            <RefreshCw size={12} />
            重置範例資料
          </button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-4">
          資料儲存於本機瀏覽器中
        </p>
      </div>
    </div>
  );
};
