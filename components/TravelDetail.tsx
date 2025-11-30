
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Calendar, Users, Plane, Train, Camera, X, Upload, Check, Image as ImageIcon, Settings, RefreshCcw, Utensils, Star, MessageSquare, User, DollarSign, Plus, Trash2, ArrowUp, ArrowDown, Edit3, MessageCircle, Send, PieChart, Pencil } from 'lucide-react';
import { TravelRecord, Activity, Review, Expense, Currency, PhotoDocument, ItineraryItem, GeneralThought, ExpenseCategory, EXPENSE_CATEGORIES } from '../types';
import { formatDate, compressImage } from '../utils';
import { PhotoGallery } from './PhotoGallery';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

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
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpenseItem, setNewExpenseItem] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCurrency, setNewExpenseCurrency] = useState<Currency>('TWD');
  const [newExchangeRate, setNewExchangeRate] = useState('1');
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('food');

  // Thoughts Edit State
  const [isEditingThoughts, setIsEditingThoughts] = useState(false);
  const [newThoughtContent, setNewThoughtContent] = useState('');
  const [newThoughtAuthor, setNewThoughtAuthor] = useState('');

  // Photo Collection State
  const [cloudPhotos, setCloudPhotos] = useState<PhotoDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Fetch photos from 'travel_photos' collection
  useEffect(() => {
    if (!record.id) return;
    
    // REMOVED orderBy to prevent "Missing Index" errors on Firestore
    // We will sort them on the client side instead
    const q = query(
      collection(db, 'travel_photos'), 
      where('recordId', '==', record.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhotoDocument));
      // Client-side sort: Oldest first
      photos.sort((a, b) => a.createdAt - b.createdAt);
      setCloudPhotos(photos);
    }, (error) => {
      console.error("Photo fetch error:", error);
      // alert("照片載入失敗：請檢查網路或資料庫權限");
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

  // Auto-select first member for thought author if not set
  useEffect(() => {
    if (isEditingThoughts && record.members.length > 0 && !newThoughtAuthor) {
      setNewThoughtAuthor(record.members[0]);
    }
  }, [isEditingThoughts, record.members, newThoughtAuthor]);

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
            // 1. Compress (Now using optimized URL.createObjectURL)
            const base64 = await compressImage(files[i]);
            
            // Check size safety (Firestore doc limit is 1MB, we aim for < 800KB)
            if (base64.length > 900000) {
               console.warn("File might be too large even after compression, skipping");
               continue;
            }

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
            alert(`第 ${i+1} 張照片上傳失敗，可能是檔案損毀或網路不穩。`);
          }
        }
        
        if (successCount === 0) {
           // Alert only if total failure
           // alert("上傳失敗。請確認照片格式，或嘗試單張上傳。");
        } 
      } catch (error) {
        console.error("Critical upload error", error);
        alert("照片上傳發生嚴重錯誤，請檢查網路連線");
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
  const handleSaveExpense = () => {
    if (!newExpenseItem || !newExpenseAmount) return;

    if (editingExpenseId) {
       // Update existing expense
       const updatedExpenses = (record.expenses || []).map(exp => {
         if (exp.id === editingExpenseId) {
            return {
              ...exp,
              item: newExpenseItem,
              amount: parseFloat(newExpenseAmount),
              currency: newExpenseCurrency,
              exchangeRate: parseFloat(newExchangeRate) || 1,
              category: newExpenseCategory
            };
         }
         return exp;
       });
       onUpdate({ ...record, expenses: updatedExpenses });
       setEditingExpenseId(null);
    } else {
       // Add new expense
       const newExpense: Expense = {
         id: Date.now().toString(),
         item: newExpenseItem,
         amount: parseFloat(newExpenseAmount),
         currency: newExpenseCurrency,
         exchangeRate: parseFloat(newExchangeRate) || 1,
         category: newExpenseCategory
       };
   
       const updatedExpenses = [...(record.expenses || []), newExpense];
       onUpdate({ ...record, expenses: updatedExpenses });
    }
    
    // Reset inputs
    setNewExpenseItem('');
    setNewExpenseAmount('');
    setNewExpenseCategory('food');
  };

  const handleEditExpenseClick = (exp: Expense) => {
    setNewExpenseItem(exp.item);
    setNewExpenseAmount(exp.amount.toString());
    setNewExpenseCurrency(exp.currency);
    setNewExchangeRate(exp.exchangeRate.toString());
    setNewExpenseCategory(exp.category);
    setEditingExpenseId(exp.id);
  };

  const handleCancelEditExpense = () => {
    setNewExpenseItem('');
    setNewExpenseAmount('');
    setEditingExpenseId(null);
    setNewExpenseCategory('food');
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm("確定刪除此支出項目？")) return;
    const updatedExpenses = record.expenses.filter(e => e.id !== id);
    onUpdate({ ...record, expenses: updatedExpenses });
    if (editingExpenseId === id) {
       handleCancelEditExpense();
    }
  };

  // General Thoughts Handlers
  const handleAddThought = () => {
    if (!newThoughtContent.trim()) return;
    const newThought: GeneralThought = {
      id: Date.now().toString(),
      author: newThoughtAuthor || 'Unknown',
      content: newThoughtContent,
      createdAt: Date.now()
    };
    const updatedThoughts = [...(record.generalThoughts || []), newThought];
    onUpdate({ ...record, generalThoughts: updatedThoughts });
    setNewThoughtContent('');
  };

  const handleDeleteThought = (id: string) => {
    if (!window.confirm("確定刪除這則心得？")) return;
    const updatedThoughts = record.generalThoughts.filter(t => t.id !== id);
    onUpdate({ ...record, generalThoughts: updatedThoughts });
  };

  // Calculate Total Expense
  const totalExpenseTWD = record.expenses?.reduce((total, exp) => total + (exp.amount * exp.exchangeRate), 0) || 0;

  // Prepare Chart Data
  const getExpenseChartData = () => {
    const expenses = record.expenses || [];
    if (expenses.length === 0) return [];
    
    const summary: Record<string, number> = {
      transport: 0,
      accommodation: 0,
      food: 0,
      misc: 0
    };

    expenses.forEach(exp => {
      const category = exp.category || 'misc';
      const amountTWD = exp.amount * exp.exchangeRate;
      if (summary[category] !== undefined) {
        summary[category] += amountTWD;
      } else {
        summary['misc'] += amountTWD;
      }
    });

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    let currentAngle = 0;
    return Object.entries(summary).map(([key, value]) => {
      if (value === 0) return null;
      const percentage = (value / total) * 100;
      const angle = (value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        category: key as ExpenseCategory,
        value,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: EXPENSE_CATEGORIES[key as ExpenseCategory].color,
        label: EXPENSE_CATEGORIES[key as ExpenseCategory].label
      };
    }).filter(Boolean);
  };

  const chartData = getExpenseChartData();

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
                           <div className="flex-1">
                             <h5 className="font-bold text-slate-800">{activity.title}</h5>
                             
                             {/* Display Reviewers Summary */}
                             {activity.reviews.length > 0 && (
                               <div className="flex flex-wrap gap-1 mt-1">
                                 {activity.reviews.map(r => (
                                   <div key={r.id} className="inline-flex items-center text-xs bg-slate-50 px-2 py-0.5 rounded text-slate-500">
                                      <Star size={10} className="text-yellow-400 fill-yellow-400 mr-1"/>
                                      {r.rating} 
                                      <span className="mx-1 text-slate-300">|</span>
                                      {r.reviewer}
                                   </div>
                                 ))}
                               </div>
                             )}
                             {/* Display first review comment preview if any */}
                             {activity.reviews.length > 0 && activity.reviews[0].comment && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                                  "{activity.reviews[0].comment}"
                                </p>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}

                   {/* Itinerary Management Mode */}
                   {isManagingItinerary && (
                     <div className="space-y-2">
                       {item.activities.map((activity, actIndex) => (
                         <div key={activity.id} className="bg-slate-50 p-2 rounded-lg border border-teal-200 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => handleUpdateActivity(dayIndex, activity.id, 'type', activity.type === 'spot' ? 'food' : 'spot')}
                                 className={`p-1.5 rounded-md ${activity.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}
                               >
                                 {activity.type === 'food' ? <Utensils size={16} /> : <Camera size={16} />}
                               </button>
                               <input 
                                 type="text"
                                 value={activity.title}
                                 onChange={(e) => handleUpdateActivity(dayIndex, activity.id, 'title', e.target.value)}
                                 className="flex-1 text-sm border-slate-300 rounded px-2 py-1"
                               />
                               <div className="flex gap-1">
                                 <button 
                                   onClick={() => handleMoveActivity(dayIndex, actIndex, -1)}
                                   disabled={actIndex === 0}
                                   className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-30"
                                 >
                                   <ArrowUp size={16} />
                                 </button>
                                 <button 
                                   onClick={() => handleMoveActivity(dayIndex, actIndex, 1)}
                                   disabled={actIndex === item.activities.length - 1}
                                   className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-30"
                                 >
                                   <ArrowDown size={16} />
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteActivity(dayIndex, activity.id)}
                                   className="p-1 text-slate-400 hover:text-red-500 ml-1"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                            </div>
                         </div>
                       ))}
                       <button 
                         onClick={() => handleAddActivity(dayIndex)}
                         className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:border-teal-300 hover:text-teal-600 transition flex items-center justify-center gap-1"
                       >
                         <Plus size={14} /> 新增行程
                       </button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="border-t border-slate-200 pt-8">
           <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <DollarSign className="mr-2 text-teal-600" /> 重大支出紀錄
            </h2>
            <button
              onClick={() => {
                setIsEditingExpenses(!isEditingExpenses);
                handleCancelEditExpense(); // Reset edit state when toggling mode
              }}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center shadow-sm ${
                isEditingExpenses 
                ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isEditingExpenses ? <Check size={16} className="mr-1"/> : <Edit3 size={16} className="mr-1"/>}
              {isEditingExpenses ? '完成' : '管理支出'}
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             {/* Add New Expense Form */}
             {isEditingExpenses && (
               <div className="mb-4 p-3 bg-white rounded-lg border border-teal-100 shadow-sm transition-all duration-300">
                  <h3 className="text-xs font-bold text-teal-600 mb-2 uppercase tracking-wide">
                    {editingExpenseId ? '修改項目' : '新增項目'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="col-span-2">
                      <input 
                        placeholder="項目名稱" 
                        value={newExpenseItem}
                        onChange={e => setNewExpenseItem(e.target.value)}
                        className="w-full border p-2 rounded text-sm"
                      />
                    </div>
                    <input 
                      placeholder="金額" 
                      type="number"
                      value={newExpenseAmount}
                      onChange={e => setNewExpenseAmount(e.target.value)}
                      className="border p-2 rounded text-sm"
                    />
                    <select 
                      value={newExpenseCategory}
                      onChange={e => setNewExpenseCategory(e.target.value as ExpenseCategory)}
                      className="border p-2 rounded text-sm bg-white"
                    >
                      {Object.entries(EXPENSE_CATEGORIES).map(([key, { label, icon }]) => (
                        <option key={key} value={key}>{icon} {label}</option>
                      ))}
                    </select>
                    <select 
                      value={newExpenseCurrency}
                      onChange={e => setNewExpenseCurrency(e.target.value as Currency)}
                      className="border p-2 rounded text-sm"
                    >
                      <option value="TWD">TWD</option>
                      <option value="JPY">JPY</option>
                      <option value="USD">USD</option>
                      <option value="KRW">KRW</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <input 
                      placeholder="匯率" 
                      type="number"
                      value={newExchangeRate}
                      onChange={e => setNewExchangeRate(e.target.value)}
                      disabled={newExpenseCurrency === 'TWD'}
                      className={`border p-2 rounded text-sm ${newExpenseCurrency === 'TWD' ? 'bg-slate-100' : ''}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveExpense} className="flex-1 bg-slate-800 text-white py-2 rounded text-sm hover:bg-slate-900 transition">
                       {editingExpenseId ? '更新儲存' : '新增'}
                    </button>
                    {editingExpenseId && (
                       <button onClick={handleCancelEditExpense} className="px-4 py-2 bg-slate-200 text-slate-600 rounded text-sm hover:bg-slate-300">
                         取消
                       </button>
                    )}
                  </div>
               </div>
             )}

             <div className="space-y-2">
               {record.expenses && record.expenses.length > 0 ? (
                 record.expenses.map((exp) => (
                   <div key={exp.id} className={`flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border ${editingExpenseId === exp.id ? 'border-teal-400 ring-1 ring-teal-100' : 'border-transparent'}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg bg-slate-100 p-1 rounded h-fit">
                           {EXPENSE_CATEGORIES[exp.category || 'misc'].icon}
                        </span>
                        <div>
                          <div className="font-bold text-slate-700">{exp.item}</div>
                          <div className="text-xs text-slate-400">
                            {exp.currency} {exp.amount.toLocaleString()} 
                            {exp.currency !== 'TWD' && ` (匯率: ${exp.exchangeRate})`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-teal-600">
                           NT$ {Math.round(exp.amount * exp.exchangeRate).toLocaleString()}
                        </span>
                        {isEditingExpenses && (
                          <div className="flex gap-1">
                             <button onClick={() => handleEditExpenseClick(exp)} className="p-1.5 text-slate-400 hover:text-teal-600 bg-slate-50 hover:bg-teal-50 rounded transition">
                                <Pencil size={16} />
                             </button>
                             <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded transition">
                                <X size={16} />
                             </button>
                          </div>
                        )}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center text-slate-400 py-4 text-sm">尚無支出紀錄</div>
               )}
               
               {record.expenses && record.expenses.length > 0 && (
                 <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200 px-2">
                    <span className="font-bold text-slate-600">總計 (TWD)</span>
                    <span className="text-xl font-extrabold text-teal-700">
                      ${Math.round(totalExpenseTWD).toLocaleString()}
                    </span>
                 </div>
               )}
             </div>

             {/* Pie Chart Analysis */}
             {chartData && chartData.length > 0 && (
               <div className="mt-8 border-t border-slate-200 pt-6">
                 <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-1">
                    <PieChart size={16} /> 花費分佈分析
                 </h3>
                 <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    {/* The Chart (CSS Conic Gradient) */}
                    <div 
                       className="w-32 h-32 rounded-full shadow-inner relative"
                       style={{
                         background: `conic-gradient(${chartData.map(d => `${d?.color} ${d?.startAngle}deg ${d?.endAngle}deg`).join(', ')})`
                       }}
                    >
                       {/* Donut Hole */}
                       <div className="absolute inset-4 bg-slate-50 rounded-full shadow-sm flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-400">NT$</span>
                       </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                       {chartData.map((data, idx) => (
                         data && (
                           <div key={idx} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></span>
                              <div className="text-xs">
                                 <span className="text-slate-600 font-bold mr-1">{data.label}</span>
                                 <span className="text-slate-400">{Math.round(data.percentage)}%</span>
                                 <div className="text-[10px] text-slate-400">NT$ {Math.round(data.value).toLocaleString()}</div>
                              </div>
                           </div>
                         )
                       ))}
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* Recollection Album */}
        <div className="border-t border-slate-200 pt-8">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-slate-800 flex items-center">
               <Camera className="mr-2 text-teal-600" /> 回憶相簿
             </h2>
             
             {/* Edit / Done Button */}
             <button 
               onClick={() => setIsEditingPhotos(!isEditingPhotos)}
               className={`px-3 py-1.5 rounded-full text-sm font-medium transition shadow-sm ${
                 isEditingPhotos 
                   ? 'bg-teal-600 text-white hover:bg-teal-700' 
                   : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
               }`}
             >
               {isEditingPhotos ? '完成編輯' : '編輯相簿'}
             </button>
          </div>

          {/* Photo Edit Controls */}
          {isEditingPhotos && (
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-teal-100">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="text-sm text-slate-500">
                  <p className="font-bold text-slate-700 mb-1">編輯模式</p>
                  <ul className="list-disc list-inside space-y-1">
                     <li>點擊照片右上角的 <X size={12} className="inline bg-red-500 text-white rounded-full p-0.5"/> 刪除照片</li>
                     <li>點擊照片下方的「設為封面」按鈕更換封面</li>
                     <li>第一張照片將自動成為預設封面 (若未指定)</li>
                  </ul>
                </div>
                
                <label className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 shadow-sm transition">
                  <Upload size={18} />
                  <span>新增照片 (可多選)</span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload} 
                    disabled={isUploading}
                  />
                </label>
              </div>
              {isUploading && (
                <div className="mt-3 bg-white p-2 rounded border border-teal-200">
                  <p className="text-teal-600 text-sm font-medium text-center animate-pulse">
                     {uploadProgress || '正在處理照片，請稍候...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {displayPhotos.map((photo, index) => (
               <div key={index} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm bg-slate-100">
                 <img 
                   src={photo} 
                   alt={`Memory ${index}`} 
                   className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                   onClick={() => !isEditingPhotos && document.getElementById(`lightbox-${index}`)?.click()} 
                 />
                 
                 {/* Cover Indicator */}
                 {isCurrentCover(photo, index) && (
                   <div className="absolute top-2 left-2 bg-teal-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-bold">
                     封面
                   </div>
                 )}

                 {/* Edit Overlays */}
                 {isEditingPhotos && (
                   <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => handleSetCoverFromAlbum(photo)}
                        className="bg-white text-slate-800 text-xs px-3 py-1.5 rounded-full mb-2 hover:bg-teal-50 font-medium"
                      >
                        設為封面
                      </button>
                      <button 
                        onClick={() => handleDeletePhoto(index)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                 )}
               </div>
             ))}
             
             {/* Empty State / Add Button when not editing */}
             {!isEditingPhotos && (
                <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition group">
                   <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition">
                      <Camera className="text-slate-400 group-hover:text-teal-500" size={24} />
                   </div>
                   <span className="text-xs text-slate-400 font-medium">新增照片</span>
                   <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
             )}
          </div>
          
          {/* Using the separate PhotoGallery component for lightbox functionality */}
          <div className="hidden">
             <PhotoGallery photos={displayPhotos} />
          </div>
        </div>

        {/* General Thoughts / Regrets Section */}
        <div className="border-t border-slate-200 pt-8">
           <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <MessageCircle className="mr-2 text-teal-600" /> 旅遊心得/殘念
            </h2>
            <button
              onClick={() => setIsEditingThoughts(!isEditingThoughts)}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition flex items-center shadow-sm ${
                isEditingThoughts 
                ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isEditingThoughts ? <Check size={16} className="mr-1"/> : <Edit3 size={16} className="mr-1"/>}
              {isEditingThoughts ? '完成' : '撰寫心得'}
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
             {/* Add New Thought Form */}
             {isEditingThoughts && (
               <div className="mb-4 p-3 bg-white rounded-lg border border-teal-100 shadow-sm animate-fade-in">
                  <div className="mb-2">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">發文者</label>
                    <div className="flex gap-2 flex-wrap">
                      {record.members.map(member => (
                        <button
                          key={member}
                          onClick={() => setNewThoughtAuthor(member)}
                          className={`px-3 py-1 rounded-full text-xs transition border ${newThoughtAuthor === member ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {member}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    <textarea 
                      placeholder="寫下這趟旅程的整體心得，或是有什麼遺憾/殘念..." 
                      value={newThoughtContent}
                      onChange={e => setNewThoughtContent(e.target.value)}
                      className="w-full border p-2 rounded text-sm min-h-[80px] focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex justify-end">
                     <button 
                       onClick={handleAddThought} 
                       disabled={!newThoughtContent || !newThoughtAuthor}
                       className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-black disabled:bg-slate-300"
                     >
                       <Send size={14} /> 發佈
                     </button>
                  </div>
               </div>
             )}

             <div className="space-y-3">
               {record.generalThoughts && record.generalThoughts.length > 0 ? (
                 record.generalThoughts.map((thought) => (
                   <div key={thought.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 relative group">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                           <User size={10} className="mr-1"/>
                           {thought.author}
                         </span>
                         <span className="text-[10px] text-slate-400">
                           {new Date(thought.createdAt).toLocaleDateString()}
                         </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{thought.content}</p>
                      
                      {isEditingThoughts && (
                        <button 
                          onClick={() => handleDeleteThought(thought.id)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={16} />
                        </button>
                      )}
                   </div>
                 ))
               ) : (
                 <div className="text-center text-slate-400 py-6 text-sm">尚無心得分享</div>
               )}
             </div>
          </div>
        </div>

      </div>

      {/* Review Modal */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setEditingActivity(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">撰寫評價</h3>
            <p className="text-sm text-slate-500 mb-4">
              {record.itinerary[editingActivity.dayIndex].activities.find(a => a.id === editingActivity.activityId)?.title}
            </p>

            <ReviewForm 
              members={record.members}
              onSave={(review) => {
                handleSaveReview(editingActivity.dayIndex, editingActivity.activityId, review);
                setEditingActivity(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for Review Form
const ReviewForm: React.FC<{ members: string[], onSave: (review: Review) => void }> = ({ members, onSave }) => {
  const [reviewer, setReviewer] = useState(members[0] || 'Unknown');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    onSave({
      id: Date.now().toString(),
      reviewer,
      rating,
      comment,
      date: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">評論者</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m}
              onClick={() => setReviewer(m)}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                reviewer === m 
                  ? 'bg-teal-600 text-white border-teal-600' 
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">評分</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="text-2xl focus:outline-none transition transform hover:scale-110"
            >
              {star <= rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">心得</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          rows={3}
          placeholder="分享你的看法..."
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition mt-2"
      >
        儲存評價
      </button>
    </div>
  );
};
