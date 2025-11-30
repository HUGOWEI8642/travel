
import React, { useState, useEffect } from 'react';
import { Plus, X, Upload, Calendar, MapPin, UserPlus, Utensils, Camera, DollarSign } from 'lucide-react';
import { TravelRecord, DEFAULT_MEMBERS, ItineraryItem, ActivityType, Activity, Currency, Expense } from '../types';
import { generateDateRange, fileToBase64 } from '../utils';

interface TravelFormProps {
  onSubmit: (record: TravelRecord) => void;
  onCancel: () => void;
}

export const TravelForm: React.FC<TravelFormProps> = ({ onSubmit, onCancel }) => {
  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [isInternational, setIsInternational] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [availableMembers, setAvailableMembers] = useState<string[]>([...DEFAULT_MEMBERS]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['Hugo']);
  const [newMemberName, setNewMemberName] = useState('');
  
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]); // These will be Base64 strings
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isImporting, setIsImporting] = useState(false); // For "Google Excel" simulation

  // Temporary state for adding a new activity
  const [newActivityInputs, setNewActivityInputs] = useState<Record<number, string>>({});
  const [newActivityType, setNewActivityType] = useState<Record<number, ActivityType>>({});

  // Temporary state for adding a new expense
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>('TWD');
  const [exchangeRate, setExchangeRate] = useState<string>('1');

  // Effect: Update itinerary days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const dates = generateDateRange(startDate, endDate);
      setItinerary(prev => {
        // Map existing activities to new dates if possible, or initialize empty
        return dates.map((date, index) => {
          const existing = prev[index];
          return {
            date,
            activities: existing ? existing.activities : []
          };
        });
      });
    }
  }, [startDate, endDate]);

  // Effect: Reset exchange rate to 1 when currency is TWD
  useEffect(() => {
    if (expenseCurrency === 'TWD') {
      setExchangeRate('1');
    }
  }, [expenseCurrency]);

  const handleAddMember = () => {
    if (newMemberName.trim() && !availableMembers.includes(newMemberName)) {
      setAvailableMembers([...availableMembers, newMemberName]);
      setSelectedMembers([...selectedMembers, newMemberName]);
      setNewMemberName('');
    }
  };

  const toggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      setSelectedMembers(selectedMembers.filter(m => m !== member));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Convert all files to Base64
      const base64Promises = files.map(file => fileToBase64(file));
      try {
        const newPhotoBase64s = await Promise.all(base64Promises);
        setPhotos([...photos, ...newPhotoBase64s]);
      } catch (error) {
        console.error("Error converting images", error);
        alert("圖片處理失敗，請重試");
      }
    }
  };

  // Activity Management
  const handleAddActivity = (dayIndex: number) => {
    const title = newActivityInputs[dayIndex]?.trim();
    if (!title) return;

    const type = newActivityType[dayIndex] || 'spot';
    const newActivity: Activity = {
      id: Date.now().toString() + Math.random().toString(),
      type,
      title,
      reviews: []
    };

    const newItinerary = [...itinerary];
    newItinerary[dayIndex].activities.push(newActivity);
    setItinerary(newItinerary);

    // Clear input
    setNewActivityInputs({ ...newActivityInputs, [dayIndex]: '' });
  };

  const handleRemoveActivity = (dayIndex: number, activityId: string) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.filter(a => a.id !== activityId);
    setItinerary(newItinerary);
  };

  const handleInputChange = (dayIndex: number, value: string) => {
    setNewActivityInputs({ ...newActivityInputs, [dayIndex]: value });
  };
  
  const handleTypeChange = (dayIndex: number, type: ActivityType) => {
    setNewActivityType({ ...newActivityType, [dayIndex]: type });
  };

  // Expense Management
  const handleAddExpense = () => {
    if (!expenseItem || !expenseAmount) return;
    
    const newExpense: Expense = {
      id: Date.now().toString() + Math.random(),
      item: expenseItem,
      amount: parseFloat(expenseAmount),
      currency: expenseCurrency,
      exchangeRate: parseFloat(exchangeRate) || 1
    };
    
    setExpenses([...expenses, newExpense]);
    setExpenseItem('');
    setExpenseAmount('');
    // Keep currency and rate as they might add multiple items with same currency
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Simulated Google Excel/Sheet Import
  const handleSimulatedImport = () => {
    // In a real app, this would use Google Sheets API. 
    // Here we just auto-fill some dummy data structure
    const newItinerary = itinerary.map((item, i) => ({
      ...item,
      activities: [
        { id: `import-${i}-1`, type: 'spot' as ActivityType, title: `[匯入] 參觀景點 ${i+1}`, reviews: [] },
        { id: `import-${i}-2`, type: 'food' as ActivityType, title: `[匯入] 知名美食 ${i+1}`, reviews: [] }
      ]
    }));
    setItinerary(newItinerary);
    setIsImporting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;

    const newRecord: TravelRecord = {
      id: '', // Will be generated by Firestore
      title,
      location,
      isInternational,
      startDate,
      endDate,
      members: selectedMembers,
      itinerary,
      photos,
      expenses
    };
    onSubmit(newRecord);
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={onCancel} className="text-slate-500 font-medium">取消</button>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1">
           <span>👨‍🤝‍👨🐕</span> 我們的旅遊記錄
        </h2>
        <button 
          onClick={handleSubmit}
          className="bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-teal-700 transition"
        >
          儲存
        </button>
      </div>

      <form className="p-4 space-y-6 max-w-2xl mx-auto" onSubmit={handleSubmit}>
        
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">旅行名稱</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：11月火車環島快閃"
            className="w-full border-slate-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border"
            required
          />
        </div>

        {/* Location & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">旅行地點</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：花蓮 台東 高雄"
                className="w-full pl-10 border-slate-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">區域</label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${!isInternational ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
                onClick={() => setIsInternational(false)}
              >
                國內
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-md transition ${isInternational ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                onClick={() => setIsInternational(true)}
              >
                國外
              </button>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">開始日期</label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">結束日期</label>
            <div className="relative">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">旅行成員</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {availableMembers.map(member => (
              <button
                key={member}
                type="button"
                onClick={() => toggleMember(member)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  selectedMembers.includes(member) 
                    ? 'bg-teal-600 text-white border-teal-600' 
                    : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400'
                }`}
              >
                {member}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="新增成員..."
              className="flex-1 border-slate-300 rounded-lg p-2 text-sm border focus:ring-teal-500 focus:border-teal-500"
            />
            <button 
              type="button" 
              onClick={handleAddMember}
              className="bg-slate-100 text-slate-600 p-2 rounded-lg hover:bg-slate-200"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>
        
        {/* Expenses Section */}
        <div className="border-t pt-4">
          <label className="block text-lg font-bold text-slate-800 mb-4 flex items-center">
            <DollarSign className="mr-2 text-teal-600" size={20} /> 重大支出紀錄
          </label>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <input 
                  type="text"
                  value={expenseItem}
                  onChange={(e) => setExpenseItem(e.target.value)}
                  placeholder="消費項目 (例如: 住宿費)"
                  className="w-full border-slate-300 rounded-lg text-sm border p-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <input 
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="金額"
                  className="w-full border-slate-300 rounded-lg text-sm border p-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2">
                 <select 
                   value={expenseCurrency} 
                   onChange={(e) => setExpenseCurrency(e.target.value as Currency)}
                   className="border-slate-300 rounded-lg text-sm border p-2 bg-white flex-1"
                 >
                   <option value="TWD">TWD</option>
                   <option value="JPY">JPY</option>
                   <option value="USD">USD</option>
                   <option value="KRW">KRW</option>
                   <option value="EUR">EUR</option>
                 </select>
              </div>
              <div className="col-span-2 flex gap-3 items-center">
                 <div className="flex-1 relative">
                    <label className="absolute -top-2 left-2 bg-slate-50 px-1 text-[10px] text-slate-500">匯率</label>
                    <input 
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      disabled={expenseCurrency === 'TWD'}
                      className={`w-full border-slate-300 rounded-lg text-sm border p-2 ${expenseCurrency === 'TWD' ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                    />
                 </div>
                 <button 
                   type="button"
                   onClick={handleAddExpense}
                   className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 shrink-0"
                 >
                   新增
                 </button>
              </div>
            </div>
            
            {/* Expenses List */}
            {expenses.length > 0 && (
              <div className="mt-4 space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
                    <div>
                      <div className="font-medium text-slate-700">{exp.item}</div>
                      <div className="text-xs text-slate-400">
                        {exp.currency} {exp.amount.toLocaleString()} 
                        {exp.currency !== 'TWD' && ` (匯率: ${exp.exchangeRate})`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-bold text-teal-600">
                         NT$ {Math.round(exp.amount * exp.exchangeRate).toLocaleString()}
                       </span>
                       <button onClick={() => handleRemoveExpense(exp.id)} className="text-slate-400 hover:text-red-500">
                         <X size={16} />
                       </button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-dashed border-slate-300 pt-2 mt-2 flex justify-between items-center px-2">
                  <span className="font-bold text-slate-600">總計</span>
                  <span className="font-bold text-xl text-teal-700">
                    NT$ {Math.round(expenses.reduce((acc, curr) => acc + (curr.amount * curr.exchangeRate), 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Itinerary */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-lg font-bold text-slate-800">
              每日行程
            </label>
            <button 
              type="button"
              onClick={() => setIsImporting(true)}
              className="text-sm text-teal-600 font-medium hover:underline flex items-center"
            >
              <Calendar size={16} className="mr-1"/> 匯入 Google 行程
            </button>
          </div>
          
          {isImporting && (
             <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
               <p className="text-sm text-blue-800 mb-2">模擬從 Google Excel 匯入行程：</p>
               <button 
                 type="button" 
                 onClick={handleSimulatedImport}
                 className="bg-blue-600 text-white text-xs px-3 py-2 rounded shadow hover:bg-blue-700"
               >
                 確認匯入示範資料
               </button>
               <button 
                 type="button"
                 onClick={() => setIsImporting(false)}
                 className="ml-2 text-blue-600 text-xs underline"
               >
                 取消
               </button>
             </div>
          )}

          {itinerary.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-sm">
              請先選擇日期以生成行程表
            </div>
          ) : (
            <div className="space-y-6">
              {itinerary.map((dayItem, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-sm font-bold text-slate-500 mb-3 flex items-center">
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">Day {idx + 1}</span>
                    {dayItem.date}
                  </div>
                  
                  {/* Activity List */}
                  <div className="space-y-2 mb-3">
                    {dayItem.activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                         <div className="flex items-center gap-2">
                           {activity.type === 'food' ? (
                             <span className="text-orange-500 bg-orange-50 p-1 rounded"><Utensils size={14}/></span>
                           ) : (
                             <span className="text-teal-500 bg-teal-50 p-1 rounded"><Camera size={14}/></span>
                           )}
                           <span className="text-sm text-slate-800">{activity.title}</span>
                         </div>
                         <button 
                           type="button"
                           onClick={() => handleRemoveActivity(idx, activity.id)}
                           className="text-slate-400 hover:text-red-500 p-1"
                         >
                           <X size={16} />
                         </button>
                      </div>
                    ))}
                    {dayItem.activities.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-2 border border-dashed rounded-lg">尚無行程</div>
                    )}
                  </div>

                  {/* Add Activity Input */}
                  <div className="flex gap-2">
                    <div className="flex border rounded-lg overflow-hidden bg-white shrink-0">
                      <button 
                         type="button"
                         onClick={() => handleTypeChange(idx, 'spot')}
                         className={`px-3 py-2 transition ${(!newActivityType[idx] || newActivityType[idx] === 'spot') ? 'bg-teal-50 text-teal-600' : 'text-slate-400 hover:bg-slate-50'}`}
                         title="景點"
                      >
                        <Camera size={18} />
                      </button>
                      <div className="w-px bg-slate-200"></div>
                      <button 
                         type="button"
                         onClick={() => handleTypeChange(idx, 'food')}
                         className={`px-3 py-2 transition ${(newActivityType[idx] === 'food') ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-50'}`}
                         title="美食"
                      >
                        <Utensils size={18} />
                      </button>
                    </div>
                    
                    <input 
                      type="text"
                      value={newActivityInputs[idx] || ''}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActivity(idx);
                        }
                      }}
                      placeholder="輸入行程內容..."
                      className="flex-1 border-slate-300 rounded-lg text-sm border focus:ring-teal-500 focus:border-teal-500 px-3"
                    />
                    <button 
                      type="button"
                      onClick={() => handleAddActivity(idx)}
                      className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-900"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="border-t pt-4">
          <label className="block text-lg font-bold text-slate-800 mb-2">
            旅行照片
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map((photo, i) => (
              <div key={i} className="aspect-square relative rounded-lg overflow-hidden group">
                <img src={photo} className="w-full h-full object-cover" alt="preview" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <label className="aspect-square bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition">
              <Upload className="text-slate-400 mb-1" size={24} />
              <span className="text-xs text-slate-500">上傳照片</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-1">* 建議使用照片連結。若直接上傳，為了同步將會降低畫質。</p>
        </div>
      </form>
    </div>
  );
};
