
import React, { useState, useEffect } from 'react';
import { Plus, X, Upload, Calendar, MapPin, UserPlus, Utensils, Camera, DollarSign, MessageCircle, Ghost } from 'lucide-react';
import { TravelRecord, DEFAULT_MEMBERS, ItineraryItem, ActivityType, Activity, Currency, Expense, GeneralThought, ExpenseCategory, EXPENSE_CATEGORIES } from '../types';
import { generateDateRange, compressImage } from '../utils';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { BufferedInput } from './BufferedInput';

interface TravelFormProps {
  initialData?: TravelRecord;
  onSubmit: (record: TravelRecord) => Promise<void>;
  onCancel: () => void;
}

export const TravelForm: React.FC<TravelFormProps> = ({ initialData, onSubmit, onCancel }) => {
  // Form State initialized with optional initialData
  const [title, setTitle] = useState(initialData?.title || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [isInternational, setIsInternational] = useState(initialData?.isInternational || false);
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  
  const [availableMembers, setAvailableMembers] = useState<string[]>([...DEFAULT_MEMBERS]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialData?.members || ['Hugo']);
  const [newMemberName, setNewMemberName] = useState('');
  
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(initialData?.itinerary || []);
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []); // Legacy photos or temporary container
  const [newPhotoFiles, setNewPhotoFiles] = useState<string[]>([]); // New photos to be uploaded to collection
  const [expenses, setExpenses] = useState<Expense[]>(initialData?.expenses || []);
  const [generalThoughts, setGeneralThoughts] = useState<GeneralThought[]>(initialData?.generalThoughts || []);

  const [isImporting, setIsImporting] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);

  // Temporary state for adding a new activity
  const [newActivityInputs, setNewActivityInputs] = useState<Record<number, string>>({});
  const [newActivityType, setNewActivityType] = useState<Record<number, ActivityType>>({});

  // Temporary state for adding a new expense
  const [expenseItem, setExpenseItem] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>('TWD');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('food');

  // Temporary state for adding a new thought
  const [newThoughtContent, setNewThoughtContent] = useState('');
  const [newThoughtAuthor, setNewThoughtAuthor] = useState('');

  // Effect: Update itinerary days when dates change, but preserve existing data if overlapping
  useEffect(() => {
    if (startDate && endDate) {
      const dates = generateDateRange(startDate, endDate);
      
      setItinerary(prevItinerary => {
        return dates.map(date => {
          // Check if we already have data for this date in previous state
          const existingDay = prevItinerary.find(item => item.date === date);
          
          // Or if we are loading initialData (first run) and it matches
          const initialDay = initialData?.itinerary?.find(item => item.date === date);
          
          // Use existing, then initial, then empty
          if (existingDay) return existingDay;
          if (initialDay && initialDay.activities.length > 0) return initialDay;
          
          return {
            date,
            activities: []
          };
        });
      });
    }
  }, [startDate, endDate, initialData]);

  // Effect: Reset exchange rate to 1 when currency is TWD
  useEffect(() => {
    if (expenseCurrency === 'TWD') {
      setExchangeRate('1');
    }
  }, [expenseCurrency]);

  // Effect: Set default author for thoughts
  useEffect(() => {
    if (selectedMembers.length > 0 && !newThoughtAuthor) {
      setNewThoughtAuthor(selectedMembers[0]);
    }
  }, [selectedMembers, newThoughtAuthor]);

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
      setIsProcessingPhotos(true);
      const files = Array.from(e.target.files);
      
      // Sequential processing
      for (const file of files) {
        try {
          const base64 = await compressImage(file);
          setNewPhotoFiles(prev => [...prev, base64]);
        } catch (error) {
          console.error("Error converting image", error);
        }
      }
      setIsProcessingPhotos(false);
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
      exchangeRate: parseFloat(exchangeRate) || 1,
      category: expenseCategory
    };
    
    setExpenses([...expenses, newExpense]);
    setExpenseItem('');
    setExpenseAmount('');
    // Keep currency and rate as they might add multiple items with same currency
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Thoughts Management
  const handleAddThought = () => {
    if (!newThoughtContent.trim()) return;
    const newThought: GeneralThought = {
      id: Date.now().toString(),
      author: newThoughtAuthor || 'Unknown',
      content: newThoughtContent,
      createdAt: Date.now()
    };
    setGeneralThoughts([...generalThoughts, newThought]);
    setNewThoughtContent('');
  };

  const handleRemoveThought = (id: string) => {
    setGeneralThoughts(generalThoughts.filter(t => t.id !== id));
  };

  // Simulated Google Excel/Sheet Import
  const handleSimulatedImport = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;
    setIsSubmitting(true);

    try {
      // 1. Prepare raw data
      const rawData: TravelRecord = {
        id: initialData?.id || '', 
        title,
        location,
        isInternational,
        startDate,
        endDate,
        members: selectedMembers,
        itinerary,
        photos: photos, 
        coverImage: initialData?.coverImage, 
        expenses,
        generalThoughts
      };

      // 2. Sanitize data (Remove undefined fields to prevent Firestore errors)
      const sanitizedData = JSON.parse(JSON.stringify(rawData));

      // If creating new record, we need to create it first to get an ID for photos
      if (!initialData?.id) {
         // Create the doc to get ID (Use sanitizedData excluding ID)
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         const { id, ...dataToSave } = sanitizedData;
         
         const docRef = await addDoc(collection(db, 'travel_records'), dataToSave);
         
         // Now upload photos to collection
         if (newPhotoFiles.length > 0) {
            for (const base64 of newPhotoFiles) {
              await addDoc(collection(db, 'travel_photos'), {
                  recordId: docRef.id,
                  base64: base64,
                  createdAt: Date.now()
              });
            }
         }
         
         onCancel(); // Return to list logic handled by parent listener
         return;
      } else {
         // Existing record
         if (newPhotoFiles.length > 0) {
            for (const base64 of newPhotoFiles) {
                await addDoc(collection(db, 'travel_photos'), {
                    recordId: rawData.id,
                    base64: base64,
                    createdAt: Date.now()
                });
            }
         }
         // Use sanitizedData
         await onSubmit(sanitizedData);
      }
    } catch (error) {
        console.error("Error submitting", error);
        alert("儲存失敗: " + (error instanceof Error ? error.message : "未知錯誤"));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={onCancel} className="text-slate-500 font-medium">取消</button>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-1">
           <span>👨‍🤝‍👨🐕</span> {initialData ? '編輯旅遊記錄' : '我們的旅遊記錄'}
        </h2>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || isProcessingPhotos}
          className="bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-teal-700 transition disabled:bg-slate-300"
        >
          {isSubmitting ? '處理中...' : (initialData ? '更新' : '儲存')}
        </button>
      </div>

      <form className="p-4 space-y-6 max-w-2xl mx-auto" onSubmit={(e) => e.preventDefault()}>
        
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
              <div>
                 <select 
                   value={expenseCategory}
                   onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                   className="w-full border-slate-300 rounded-lg text-sm border p-2 bg-white"
                 >
                   {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
                     <option key={key} value={key}>{icon} {label}</option>
                   ))}
                 </select>
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
                    <div className="flex items-start gap-2">
                      <span className="text-lg bg-slate-100 p-1 rounded">
                         {EXPENSE_CATEGORIES[exp.category || 'misc'].icon}
                      </span>
                      <div>
                        <div className="font-medium text-slate-700">{exp.item}</div>
                        <div className="text-xs text-slate-400">
                          {exp.currency} {exp.amount.toLocaleString()} 
                          {exp.currency !== 'TWD' && ` (匯率: ${exp.exchangeRate})`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-bold text-teal-600">
                         NT$ {Math.round(exp.amount * exp.exchangeRate).toLocaleString()}
                       </span>
                       <button type="button" onClick={() => handleRemoveExpense(exp.id)} className="text-slate-400 hover:text-red-500">
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
                           {activity.type === 'regret' ? (
                             <span className="text-purple-500 bg-purple-50 p-1 rounded"><Ghost size={14}/></span>
                           ) : activity.type === 'food' ? (
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
                      <div className="w-px bg-slate-200"></div>
                      <button 
                         type="button"
                         onClick={() => handleTypeChange(idx, 'regret')}
                         className={`px-3 py-2 transition ${(newActivityType[idx] === 'regret') ? 'bg-purple-50 text-purple-600' : 'text-slate-400 hover:bg-slate-50'}`}
                         title="遺珠"
                      >
                        <Ghost size={18} />
                      </button>
                    </div>
                    
                    <BufferedInput 
                      value={newActivityInputs[idx] || ''}
                      onValueChange={(val) => handleInputChange(idx, val)}
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
            {/* Show legacy photos */}
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
            {/* Show new photos to be uploaded */}
            {newPhotoFiles.map((photo, i) => (
              <div key={`new-${i}`} className="aspect-square relative rounded-lg overflow-hidden group border-2 border-teal-400">
                <img src={photo} className="w-full h-full object-cover" alt="new preview" />
                <button
                  type="button"
                  onClick={() => setNewPhotoFiles(newPhotoFiles.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-teal-500 text-white text-[10px] text-center">新照片</div>
              </div>
            ))}
            
            <label className="aspect-square bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition">
              <Upload className="text-slate-400 mb-1" size={24} />
              <span className="text-xs text-slate-500">上傳照片</span>
              {isProcessingPhotos && <span className="text-[10px] text-teal-600 mt-1">處理中...</span>}
              <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isProcessingPhotos} />
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-1">* 系統將自動壓縮圖片，並支援無上限多張上傳</p>
        </div>

        {/* General Thoughts / Regrets Section */}
        <div className="border-t pt-4">
          <label className="block text-lg font-bold text-slate-800 mb-4 flex items-center">
            <MessageCircle className="mr-2 text-teal-600" size={20} /> 旅遊心得/殘念
          </label>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
            <div className="space-y-3">
               <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">我是...</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {selectedMembers.map(member => (
                      <button
                        key={member}
                        type="button"
                        onClick={() => setNewThoughtAuthor(member)}
                        className={`px-3 py-1.5 rounded-md text-sm transition font-medium border ${newThoughtAuthor === member ? 'bg-white text-teal-700 shadow border-teal-200 ring-1 ring-teal-100' : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'}`}
                      >
                        {member}
                      </button>
                    ))}
                    {selectedMembers.length === 0 && <span className="text-xs text-slate-400">請先選擇上方旅行成員</span>}
                  </div>
               </div>
               
               <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">內容</label>
                  <textarea 
                    value={newThoughtContent}
                    onChange={(e) => setNewThoughtContent(e.target.value)}
                    placeholder="寫下這趟旅程的整體心得，或是有什麼遺憾/殘念..."
                    className="w-full border-slate-300 rounded-lg text-sm border p-3 focus:ring-teal-500 min-h-[80px]"
                  />
               </div>

               <div className="flex justify-end">
                 <button 
                   type="button"
                   onClick={handleAddThought}
                   disabled={!newThoughtContent || !newThoughtAuthor}
                   className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed"
                 >
                   新增心得
                 </button>
               </div>
            </div>

            {/* Thoughts List */}
            {generalThoughts.length > 0 && (
              <div className="mt-4 space-y-3">
                {generalThoughts.map((thought) => (
                  <div key={thought.id} className="bg-white p-3 rounded-lg border border-slate-200 relative">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-0.5 rounded-full">
                         {thought.author}
                       </span>
                       <span className="text-[10px] text-slate-400">
                         {new Date(thought.createdAt).toLocaleDateString()}
                       </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{thought.content}</p>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveThought(thought.id)} 
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
};
