
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Calendar, Users, Plane, Train, Camera, X, Upload, Check, Image as ImageIcon, Settings, RefreshCcw, Utensils, Star, MessageSquare, User, DollarSign, Plus, Trash2, ArrowUp, ArrowDown, Edit3 } from 'lucide-react';
import { TravelRecord, Activity, Review, Expense, Currency, PhotoDocument, ItineraryItem } from '../types';
import { formatDate, compressImage } from '../utils';
import { PhotoGallery } from './PhotoGallery';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';

interface TravelDetailProps {
  record: TravelRecord;
  onBack: () => void;
  onUpdate: (updatedRecord: TravelRecord) => void;
}

export const TravelDetail: React.FC<TravelDetailProps> = ({ record, onBack, onUpdate }) => {
  const [isEditingPhotos, setIsEditingPhotos] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ dayIndex: number, activityId: string } | null>(null);
  
  // Itinerary Management State
  const [isManagingItinerary, setIsManagingItinerary] = useState(false);

  // Expenses Edit State
  const [isEditingExpenses, setIsEditingExpenses] = useState(false);
  const [newExpenseItem, setNewExpenseItem] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCurrency, setNewExpenseCurrency] = useState<Currency>('TWD');
  const [newExchangeRate, setNewExchangeRate] = useState('1');

  // Photo Collection State
  const [cloudPhotos, setCloudPhotos] = useState<PhotoDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Fetch photos from 'travel_photos' collection
  useEffect(() => {
    if (!record.id) return;
    const q = query(
      collection(db, 'travel_photos'), 
      where('recordId', '==', record.id),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhotoDocument));
      setCloudPhotos(photos);
    });
    return () => unsubscribe();
  }, [record.id]);

  // Combine legacy photos (in array) with cloud photos
  const legacyPhotos = record.photos || [];
  const displayPhotos = [...legacyPhotos, ...cloudPhotos.map(p => p.base64)];

  // Determine current cover source
  const displayCover = record.coverImage || displayPhotos[0];
  const isCustomCover = !!record.coverImage;

  // Reset exchange rate if currency is TWD
  useEffect(() => {
    if (newExpenseCurrency === 'TWD') {
      setNewExchangeRate('1');
    }
  }, [newExpenseCurrency]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const files = Array.from(e.target.files);
      let successCount = 0;
      
      try {
        // SEQUENTIAL UPLOAD: Process one by one to avoid mobile memory crash
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(`正在處理 ${i + 1} / ${files.length}...`);
          
          try {
            // 1. Compress
            const base64 = await compressImage(files[i]);
            
            // 2. Upload to separate document
            await addDoc(collection(db, 'travel_photos'), {
              recordId: record.id,
              base64: base64,
              createdAt: Date.now()
            });
            
            successCount++;
            
            // If it's the very first photo ever, set as cover automatically
            if (!record.coverImage && displayPhotos.length === 0 && successCount === 1) {
               onUpdate({ ...record, coverImage: base64 });
            }

          } catch (itemError) {
            console.error(`Failed to upload file ${i+1}`, itemError);
            // Continue to next file even if one fails
          }
        }
        
        if (successCount < files.length) {
          alert(`完成，但有 ${files.length - successCount} 張照片上傳失敗。`);
        }
      } catch (error) {
        console.error("Critical upload error", error);
        alert("照片上傳發生錯誤，請檢查網路連線");
      } finally {
        setIsUploading(false);
        setUploadProgress('');
        // Clear input value to allow re-uploading same files if needed
        e.target.value = '';
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        const newCoverBase64 = await compressImage(file);
        onUpdate({ ...record, coverImage: newCoverBase64 });
      } catch (error) {
        console.error("Failed to set cover", error);
        alert("封面設定失敗");
      }
    }
  };

  const handleDeletePhoto = async (indexToDelete: number) => {
    // 1. Basic confirmation
    if (!window.confirm("確定要刪除這張照片嗎？")) return;

    // 2. Password protection
    const password = window.prompt("請輸入管理密碼以確認刪除：");
    if (password !== "0329") {
      alert("密碼錯誤，取消刪除。");
      return;
    }

    try {
      // Determine if it's a legacy photo or cloud photo
      if (indexToDelete < legacyPhotos.length) {
        // It's a legacy photo inside the record array
        const updatedPhotos = record.photos.filter((_, index) => index !== indexToDelete);
        onUpdate({ ...record, photos: updatedPhotos });
      } else {
        // It's a cloud photo
        const cloudIndex = indexToDelete - legacyPhotos.length;
        const photoDoc = cloudPhotos[cloudIndex];
        if (photoDoc) {
          await deleteDoc(doc(db, 'travel_photos', photoDoc.id));
        }
      }
    } catch (e) {
      console.error("Delete photo error", e);
      alert("刪除失敗");
    }
  };

  const handleSetCoverFromAlbum = (photoUrl: string) => {
    onUpdate({ ...record, coverImage: photoUrl });
    setIsEditingPhotos(false);
  };

  const handleResetCover = () => {
    onUpdate({ ...record, coverImage: undefined });
  };

  const isCurrentCover = (photoUrl: string, index: number) => {
    if (isCustomCover) {
      return record.coverImage === photoUrl;
    }
    return index === 0;
  };

  // Itinerary Management Functions
  const handleItineraryChange = (newItinerary: ItineraryItem[]) => {
    onUpdate({ ...record, itinerary: newItinerary });
  };

  const handleUpdateActivity = (dayIndex: number, activityId: string, field: 'title' | 'type', value: string) => {
    const newItinerary = [...record.itinerary];
    const day = newItinerary[dayIndex];
    const activityIndex = day.activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) return;

    // @ts-ignore
    const updatedActivity = { ...day.activities[activityIndex], [field]: value };
    day.activities[activityIndex] = updatedActivity;
    
    handleItineraryChange(newItinerary);
  };

  const handleMoveActivity = (dayIndex: number, activityIndex: number, direction: -1 | 1) => {
    const newItinerary = [...record.itinerary];
    const day = newItinerary[dayIndex];
    const activities = [...day.activities];
    
    const targetIndex = activityIndex + direction;
    if (targetIndex < 0 || targetIndex >= activities.length) return;

    // Swap
    [activities[activityIndex], activities[targetIndex]] = [activities[targetIndex], activities[activityIndex]];
    day.activities = activities;

    handleItineraryChange(newItinerary);
  };

  const handleAddActivity = (dayIndex: number) => {
    const newItinerary = [...record.itinerary];
    const newActivity: Activity = {
      id: Date.now().toString() + Math.random().toString(),
      type: 'spot',
      title: '新行程',
      reviews: []
    };
    newItinerary[dayIndex].activities.push(newActivity);
    handleItineraryChange(newItinerary);
  };

  const handleDeleteActivity = (dayIndex: number, activityId: string) => {
    if (!window.confirm("確定刪除此行程？")) return;
    const newItinerary = [...record.itinerary];
    newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.filter(a => a.id !== activityId);
    handleItineraryChange(newItinerary);
  };

  // Review & Rating Handlers
  const handleSaveReview = (dayIndex: number, activityId: string, reviewData: Review) => {
    const newItinerary = [...record.itinerary];
    const activityIndex = newItinerary[dayIndex].activities.findIndex(a => a.id === activityId);
    
    if (activityIndex > -1) {
      const activity = newItinerary[dayIndex].activities[activityIndex];
      const existingReviewIndex = activity.reviews.findIndex(r => r.reviewer === reviewData.reviewer);
      
      let updatedReviews = [...activity.reviews];
      if (existingReviewIndex > -1) {
        // Update existing review
        updatedReviews[existingReviewIndex] = { ...updatedReviews[existingReviewIndex], ...reviewData };
      } else {
        // Add new review
        updatedReviews.push(reviewData);
      }
      
      newItinerary[dayIndex].activities[activityIndex] = {
        ...activity,
        reviews: updatedReviews
      };
      
      onUpdate({ ...record, itinerary: newItinerary });
    }
  };

  // Expense Handlers
  const handleAddExpense = () => {
    if (!newExpenseItem || !newExpenseAmount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      item: newExpenseItem,
      amount: parseFloat(newExpenseAmount),
      currency: newExpenseCurrency,
      exchangeRate: parseFloat(newExchangeRate) || 1
    };

    const updatedExpenses = [...(record.expenses || []), newExpense];
    onUpdate({ ...record, expenses: updatedExpenses });
    
    // Reset inputs
    setNewExpenseItem('');
    setNewExpenseAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = record.expenses.filter(e => e.id !== id);
    onUpdate({ ...record, expenses: updatedExpenses });
  };

  // Calculate Total Expense
  const totalExpenseTWD = record.expenses?.reduce((total, exp) => total + (exp.amount * exp.exchangeRate), 0) || 0;

  return (
    <div className="min-h-screen bg-white pb-20 animate-fade-in relative">
      {/* Header Image / Cover */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden group bg-slate-200">
        {displayCover ? (
          <img 
            src={displayCover} 
            alt={record.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col">
            <ImageIcon size={48} className="mb-2" />
            <span>暫無封面照片</span>
          </div>
        )}
        
        {/* Cover Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pointer-events-none">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${record.isInternational ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
              {record.isInternational ? '國外 International' : '國內 Domestic'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">{record.title}</h1>
          <div className="flex items-center text-white/90 mt-1 text-sm">
            <MapPin size={16} className="mr-1" />
            {record.location}
          </div>
        </div>

        <button 
          onClick={onBack}
          className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white p-2 rounded-full transition-all z-20"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Edit Toggle Button (Top) */}
        <button
          onClick={() => setIsEditingPhotos(!isEditingPhotos)}
          className={`absolute top-4 right-4 backdrop-blur-md p-2 rounded-full transition-all shadow-lg flex items-center gap-2 px-3 z-20 ${
            isEditingPhotos 
              ? 'bg-teal-500 text-white hover:bg-teal-600' 
              : 'bg-black/30 text-white hover:bg-black/50'
          }`}
        >
          {isEditingPhotos ? <Check size={18} /> : <Settings size={18} />}
          <span className="text-sm font-medium">
            {isEditingPhotos ? '完成' : '編輯封面與相簿'}
          </span>
        </button>

        {/* Cover Edit Controls (Visible when editing) */}
        {isEditingPhotos && (
          <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <label className="bg-white text-slate-800 px-4 py-2 rounded-full font-bold shadow-lg cursor-pointer hover:bg-slate-100 transition flex items-center transform hover:scale-105 active:scale-95">
              <Upload size={18} className="mr-2" />
              上傳封面
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
            
            {isCustomCover && (
              <button 
                onClick={handleResetCover}
                className="bg-slate-800/80 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-black transition flex items-center backdrop-blur-md border border-white/20"
              >
                <RefreshCcw size={18} className="mr-2" />
                恢復預設
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        
        {/* Basic Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-3 border border-slate-100">
            <Calendar className="text-teal-600 mt-1" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">旅行期間</h3>
              <p className="text-slate-800 font-medium mt-1">
                {formatDate(record.startDate)} <br/>
                <span className="text-xs text-slate-400">至</span> <br/>
                {formatDate(record.endDate)}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-3 border border-slate-100">
            <Users className="text-teal-600 mt-1" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">成員</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {record.members.map((m, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary Timeline */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Train className="mr-2 text-teal-600" /> 行程表
            </h2>
            <button
              onClick={() => setIsManagingItinerary(!isManagingItinerary)}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center shadow-sm ${
                isManagingItinerary 
                ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isManagingItinerary ? <Check size={16} className="mr-1"/> : <Edit3 size={16} className="mr-1"/>}
              {isManagingItinerary ? '完成' : '管理行程'}
            </button>
          </div>
          
          <div className="relative border-l-2 border-teal-200 ml-3 space-y-8 pb-4">
            {record.itinerary.map((item, dayIndex) => (
              <div key={dayIndex} className="relative pl-8">
                {/* Timeline Dot */}
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-teal-500 ring-4 ring-white"></span>
                
                <h4 className="text-sm text-teal-600 font-bold mb-3">
                  Day {dayIndex + 1} - {formatDate(item.date)}
                </h4>
                
                <div className="space-y-3">
                   {item.activities.length === 0 && !isManagingItinerary && <p className="text-slate-400 text-sm">無行程</p>}
                   
                   {/* Normal View Mode */}
                   {!isManagingItinerary && item.activities.map((activity) => (
                     <div 
                       key={activity.id}
                       onClick={() => setEditingActivity({ dayIndex, activityId: activity.id })}
                       className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-teal-200 transition group"
                     >
                       <div className="flex items-start justify-between">
                         <div className="flex items-start gap-3 w-full">
                           <div className={`p-2 rounded-lg shrink-0 ${activity.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}>
                             {activity.type === 'food' ? <Utensils size={20} /> : <Camera size={20} />}
                           </div>
                           <div className="w-full">
                             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                               {activity.title}
                               <span className={`text-[10px] px-1.5 py-0.5 rounded border ${activity.type === 'food' ? 'border-orange-200 text-orange-600' : 'border-teal-200 text-teal-600'}`}>
                                 {activity.type === 'food' ? '美食' : '景點'}
                               </span>
                             </h3>
                             
                             {/* Display Summary Rating or Placeholder */}
                             {activity.reviews.length === 0 ? (
                               <div className="text-xs text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 點擊撰寫第一篇評價...
                               </div>
                             ) : (
                               <div className="flex items-center gap-1 mt-1">
                                 <span className="text-xs text-slate-400 font-medium">{activity.reviews.length} 則評論</span>
                               </div>
                             )}
                           </div>
                         </div>
                         <MessageSquare size={16} className={`text-slate-300 mt-1 ${activity.reviews.length > 0 ? 'text-teal-400' : ''}`} />
                       </div>
                       
                       {/* Render Reviews List */}
                       {activity.reviews.length > 0 && (
                         <div className="mt-3 space-y-2">
                           {activity.reviews.map((review) => (
                             <div key={review.id} className="text-sm text-slate-600 bg-slate-50 p-2 rounded relative border border-slate-100">
                               <div className="flex justify-between items-start mb-1">
                                 <div className="flex items-center text-xs font-bold text-slate-700">
                                   <User size={12} className="mr-1" />
                                   {review.reviewer}
                                 </div>
                                 <div className="flex">
                                   {[...Array(5)].map((_, i) => (
                                     <Star key={i} size={10} fill={i < review.rating ? "orange" : "none"} className={i < review.rating ? "text-orange-400" : "text-slate-200"} />
                                   ))}
                                 </div>
                               </div>
                               <div className="text-slate-600 text-xs italic">"{review.comment}"</div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   ))}

                   {/* Management Edit Mode */}
                   {isManagingItinerary && (
                     <div className="space-y-2">
                       {item.activities.map((activity, index) => (
                         <div key={activity.id} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm animate-fade-in">
                            <div className="flex items-center gap-2">
                               {/* Type Toggle */}
                               <button 
                                  onClick={() => handleUpdateActivity(dayIndex, activity.id, 'type', activity.type === 'spot' ? 'food' : 'spot')}
                                  className={`p-2 rounded-md transition ${activity.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}
                                  title="切換類型"
                               >
                                  {activity.type === 'food' ? <Utensils size={16}/> : <Camera size={16}/>}
                               </button>
                               
                               {/* Title Input */}
                               <input 
                                  className="flex-1 border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-teal-500 focus:border-teal-500 border"
                                  value={activity.title}
                                  onChange={(e) => handleUpdateActivity(dayIndex, activity.id, 'title', e.target.value)}
                                  placeholder="行程名稱"
                               />
                            </div>
                            
                            {/* Actions Row */}
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                               <div className="flex gap-1">
                                  <button 
                                     onClick={() => handleMoveActivity(dayIndex, index, -1)} 
                                     disabled={index === 0}
                                     className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                     title="上移"
                                  >
                                     <ArrowUp size={16} />
                                  </button>
                                  <button 
                                     onClick={() => handleMoveActivity(dayIndex, index, 1)}
                                     disabled={index === item.activities.length - 1}
                                     className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                     title="下移"
                                  >
                                     <ArrowDown size={16} />
                                  </button>
                               </div>
                               <div className="flex items-center">
                                  <span className="text-[10px] text-slate-300 mr-2 uppercase font-bold tracking-wider">排序</span>
                                  <div className="h-4 w-px bg-slate-200 mx-2"></div>
                                  <button 
                                     onClick={() => handleDeleteActivity(dayIndex, activity.id)}
                                     className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                     title="刪除"
                                  >
                                     <Trash2 size={16} />
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                       <button 
                         onClick={() => handleAddActivity(dayIndex)} 
                         className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-50 hover:text-teal-600 hover:border-teal-300 transition"
                       >
                           <Plus size={16} className="mr-1"/> 新增行程
                       </button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <DollarSign className="mr-2 text-teal-600" /> 重大支出紀錄
            </h2>
            <button 
              onClick={() => setIsEditingExpenses(!isEditingExpenses)}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center shadow-sm ${
                isEditingExpenses 
                ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isEditingExpenses ? <Check size={16} className="mr-1"/> : <Settings size={16} className="mr-1"/>}
              {isEditingExpenses ? '完成' : '管理支出'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                   <tr>
                     <th className="px-4 py-3">項目</th>
                     <th className="px-4 py-3 text-right">外幣金額</th>
                     <th className="px-4 py-3 text-right">匯率</th>
                     <th className="px-4 py-3 text-right">台幣金額</th>
                     {isEditingExpenses && <th className="px-4 py-3 w-10"></th>}
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {(!record.expenses || record.expenses.length === 0) && !isEditingExpenses && (
                     <tr>
                       <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">無支出紀錄</td>
                     </tr>
                   )}
                   {record.expenses?.map((exp) => (
                     <tr key={exp.id} className="hover:bg-slate-50">
                       <td className="px-4 py-3 font-medium text-slate-700">{exp.item}</td>
                       <td className="px-4 py-3 text-right text-slate-600">
                         {exp.currency} {exp.amount.toLocaleString()}
                       </td>
                       <td className="px-4 py-3 text-right text-slate-400">
                         {exp.currency === 'TWD' ? '-' : exp.exchangeRate}
                       </td>
                       <td className="px-4 py-3 text-right font-bold text-slate-800">
                         NT$ {Math.round(exp.amount * exp.exchangeRate).toLocaleString()}
                       </td>
                       {isEditingExpenses && (
                         <td className="px-4 py-3 text-right">
                           <button 
                             onClick={() => handleDeleteExpense(exp.id)}
                             className="text-slate-400 hover:text-red-500 p-1"
                           >
                             <Trash2 size={16} />
                           </button>
                         </td>
                       )}
                     </tr>
                   ))}
                   
                   {/* Add Expense Row (Edit Mode Only) */}
                   {isEditingExpenses && (
                     <tr className="bg-teal-50/50">
                       <td className="px-4 py-3">
                         <input 
                           type="text"
                           placeholder="項目名稱"
                           value={newExpenseItem}
                           onChange={(e) => setNewExpenseItem(e.target.value)}
                           className="w-full text-sm border-slate-300 rounded px-2 py-1 focus:ring-teal-500 border"
                         />
                       </td>
                       <td className="px-4 py-3">
                         <div className="flex gap-1">
                           <input 
                             type="number"
                             placeholder="金額"
                             value={newExpenseAmount}
                             onChange={(e) => setNewExpenseAmount(e.target.value)}
                             className="w-20 text-sm border-slate-300 rounded px-2 py-1 focus:ring-teal-500 border text-right"
                           />
                           <select 
                              value={newExpenseCurrency}
                              onChange={(e) => setNewExpenseCurrency(e.target.value as Currency)}
                              className="text-xs border-slate-300 rounded focus:ring-teal-500 border"
                           >
                             <option value="TWD">TWD</option>
                             <option value="JPY">JPY</option>
                             <option value="USD">USD</option>
                             <option value="KRW">KRW</option>
                             <option value="EUR">EUR</option>
                           </select>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         <input 
                           type="number"
                           placeholder="匯率"
                           value={newExchangeRate}
                           onChange={(e) => setNewExchangeRate(e.target.value)}
                           disabled={newExpenseCurrency === 'TWD'}
                           className={`w-16 text-sm border-slate-300 rounded px-2 py-1 focus:ring-teal-500 border text-right ${newExpenseCurrency === 'TWD' ? 'bg-slate-100 text-slate-400' : 'bg-white'}`}
                         />
                       </td>
                       <td className="px-4 py-3 text-right">
                         <button 
                           onClick={handleAddExpense}
                           disabled={!newExpenseItem || !newExpenseAmount}
                           className="bg-teal-600 text-white p-1.5 rounded hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                         >
                           <Plus size={16} />
                         </button>
                       </td>
                       <td className="px-4 py-3"></td>
                     </tr>
                   )}
                 </tbody>
                 <tfoot className="bg-teal-50 border-t-2 border-teal-100">
                   <tr>
                     <td colSpan={3} className="px-4 py-3 text-right font-bold text-teal-800 uppercase text-xs">
                       總支出 (Total)
                     </td>
                     <td className="px-4 py-3 text-right font-bold text-teal-700 text-lg">
                       NT$ {Math.round(totalExpenseTWD).toLocaleString()}
                     </td>
                     {isEditingExpenses && <td></td>}
                   </tr>
                 </tfoot>
               </table>
             </div>
          </div>
        </div>

        {/* Photos Section */}
        <div id="album-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Plane className="mr-2 text-teal-600" /> 回憶相簿
            </h2>
            
            <button 
              onClick={() => setIsEditingPhotos(!isEditingPhotos)}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center shadow-sm ${
                isEditingPhotos 
                ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isEditingPhotos ? <Check size={16} className="mr-1"/> : <Camera size={16} className="mr-1"/>}
              {isEditingPhotos ? '完成編輯' : '管理相簿'}
            </button>
          </div>

          {isEditingPhotos ? (
            <div className="animate-fade-in bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3 text-sm text-slate-500">
                 <span className="flex items-center flex-wrap gap-1">
                   <Settings size={14} className="mr-1" />
                   上傳新照片或選擇封面。
                   {isCustomCover && <span className="ml-1 text-teal-600">(目前使用自訂封面)</span>}
                   {!isCustomCover && <span className="ml-1 text-slate-400">(目前預設第一張為封面)</span>}
                 </span>
                 <label className={`bg-teal-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center cursor-pointer hover:bg-teal-700 transition shadow ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                   <Upload size={14} className="mr-1"/> 
                   {isUploading ? (uploadProgress || '處理中') : '新增照片'}
                   <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                 </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {displayPhotos.map((photo, index) => {
                   const isCover = isCurrentCover(photo, index);
                   return (
                    <div key={index} className={`aspect-square relative rounded-lg overflow-hidden group shadow-sm border bg-white ${isCover ? 'ring-4 ring-teal-500 border-transparent' : 'border-slate-200'}`}>
                      <img src={photo} className="w-full h-full object-cover" alt="thumbnail" />
                      
                      <button
                        onClick={() => handleDeletePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 hover:scale-110 transition z-10"
                        title="刪除"
                      >
                        <X size={14} />
                      </button>

                      {isCover ? (
                        <div className="absolute bottom-0 left-0 right-0 bg-teal-600/90 text-white text-xs text-center py-1.5 backdrop-blur-sm font-bold">
                          當前封面
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetCoverFromAlbum(photo)}
                          className="absolute bottom-2 left-2 right-2 bg-white/90 text-slate-700 text-xs font-bold py-1.5 rounded shadow-sm hover:bg-teal-600 hover:text-white transition opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        >
                          設為封面
                        </button>
                      )}
                    </div>
                  );
                })}
                
                <label className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-teal-50 hover:border-teal-400 transition text-slate-400 hover:text-teal-600">
                  <Upload size={24} className="mb-2" />
                  <span className="text-sm font-medium">{isUploading ? '上傳中...' : '點擊上傳'}</span>
                  {isUploading && <span className="text-xs text-teal-600 mt-1">{uploadProgress}</span>}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
              </div>
            </div>
          ) : (
            <PhotoGallery photos={displayPhotos} />
          )}
        </div>
      </div>

      {/* Review Modal */}
      {editingActivity && (
        <ReviewModal 
          activity={record.itinerary[editingActivity.dayIndex].activities.find(a => a.id === editingActivity.activityId)!}
          members={record.members}
          onClose={() => setEditingActivity(null)}
          onSave={(reviewData) => {
            handleSaveReview(editingActivity.dayIndex, editingActivity.activityId, reviewData);
            setEditingActivity(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-component for the Review Modal (No changes needed)
const ReviewModal: React.FC<{
  activity: Activity;
  members: string[];
  onClose: () => void;
  onSave: (reviewData: Review) => void;
}> = ({ activity, members, onClose, onSave }) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>(members[0] || 'Unknown');
  const existingReview = activity.reviews.find(r => r.reviewer === selectedReviewer);

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
  }, [selectedReviewer, existingReview]);

  const handleSave = () => {
    onSave({
      id: existingReview?.id || Date.now().toString(),
      reviewer: selectedReviewer,
      rating,
      comment
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-teal-600 p-4 text-white flex justify-between items-start">
          <div>
            <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded mb-1 inline-block">
               {activity.type === 'food' ? '美食 Food' : '景點 Spot'}
            </span>
            <h3 className="text-xl font-bold">{activity.title}</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">我是...</label>
            <div className="flex gap-2 flex-wrap bg-slate-100 p-2 rounded-lg">
              {members.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedReviewer(m)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm transition font-medium ${selectedReviewer === m ? 'bg-white text-teal-700 shadow ring-1 ring-teal-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m}
                </button>
              ))}
              {members.length === 0 && <span className="text-xs text-slate-400">無成員</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">評價 Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="transition transform active:scale-90 focus:outline-none"
                >
                  <Star 
                    size={32} 
                    fill={star <= rating ? "orange" : "none"} 
                    className={star <= rating ? "text-orange-400" : "text-slate-200"}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">心得 Thoughts</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border-slate-200 rounded-lg p-3 text-sm focus:ring-teal-500 focus:border-teal-500 bg-slate-50 min-h-[100px]"
              placeholder={`分享 ${selectedReviewer} 的回憶...`}
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-200"
          >
            {existingReview ? '更新評價' : '發布評價'}
          </button>
        </div>
      </div>
    </div>
  );
};
