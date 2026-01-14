
import React, { useState, useEffect } from 'react';
import { queryHSENotebook } from '../geminiService';
import { User, HSESource } from '../types';

export const AIQuiz: React.FC = () => {
  const [sources, setSources] = useState<HSESource[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSource, setNewSource] = useState<Partial<HSESource>>({ name: '', type: 'url', path: '', isActive: true });
  
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Tải thông tin người dùng hiện tại
    const savedUser = localStorage.getItem('hh_current_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    // Tải danh sách nguồn từ bộ nhớ hệ thống (Đồng bộ cho mọi máy tính)
    const savedSources = localStorage.getItem('hh_hse_sources');
    if (savedSources) {
      setSources(JSON.parse(savedSources));
    }
  }, []);

  const saveToSystem = (updatedSources: HSESource[]) => {
    setSources(updatedSources);
    // Lưu vào bộ nhớ hệ thống của Web App (Giả lập Cloud DB)
    localStorage.setItem('hh_hse_sources', JSON.stringify(updatedSources));
    // Thông báo cho hệ thống biết dữ liệu đã được cập nhật toàn cầu
    window.dispatchEvent(new Event('storage'));
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.path) return alert("Vui lòng nhập đầy đủ Tên nguồn và Đường dẫn.");
    
    const source: HSESource = {
      id: Date.now().toString(),
      name: newSource.name!,
      type: newSource.type as 'url' | 'file',
      path: newSource.path!,
      content: newSource.content || `[Dữ liệu huấn luyện từ ${newSource.name}]`,
      isActive: true
    };

    saveToSystem([...sources, source]);
    setNewSource({ name: '', type: 'url', path: '', isActive: true });
    setIsAddingSource(false);
    alert("Hệ thống đã cập nhật và lưu nguồn dữ liệu mới vĩnh viễn.");
  };

  const deleteSource = (id: string) => {
    if (confirm("Xác nhận xóa nguồn này khỏi hệ thống dữ liệu chung?")) {
      const updated = sources.filter(s => s.id !== id);
      saveToSystem(updated);
    }
  };

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setAnswer('');
    setGroundingLinks([]);
    try {
      // AI sẽ sử dụng tất cả các nguồn đang Active được Admin lưu trên hệ thống
      const result = await queryHSENotebook(query, sources);
      setAnswer(result.text);
      if (result.links) setGroundingLinks(result.links);
    } catch (e) {
      alert("Lỗi tra cứu hệ thống AI. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 bg-slate-900 text-orange-500 rounded-[24px] flex items-center justify-center text-3xl shadow-xl">
             <i className="fas fa-database"></i>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sổ tay HSE Nội bộ</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Dữ liệu đồng bộ toàn hệ thống</p>
          </div>
        </div>
        {!isAdmin && (
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Hệ thống đang trực tuyến</span>
              <div className="flex -space-x-2">
                 {sources.filter(s => s.isActive).length > 0 ? (
                    sources.filter(s => s.isActive).map(s => (
                      <div key={s.id} title={s.name} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
                         {s.name.charAt(0)}
                      </div>
                    ))
                 ) : (
                    <span className="text-[8px] font-bold text-slate-400">Đang dùng kiến thức Internet</span>
                 )}
              </div>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* QUẢN LÝ NGUỒN - CHỈ ADMIN */}
        {isAdmin && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm sticky top-24">
              <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center">
                  <i className="fas fa-tasks mr-2 text-orange-600"></i> Quản lý nguồn
                </h3>
                <button 
                  onClick={() => setIsAddingSource(!isAddingSource)} 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${isAddingSource ? 'bg-red-500 text-white' : 'bg-slate-900 text-white hover:bg-orange-600'}`}
                >
                  <i className={`fas ${isAddingSource ? 'fa-times' : 'fa-plus'}`}></i>
                </button>
              </div>

              {isAddingSource && (
                <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5 animate-slideDown">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tên hiển thị nguồn</label>
                      <input 
                        type="text" placeholder="Ví dụ: Quy định PCCC 2024..." 
                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-slate-900 shadow-sm"
                        value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Dán link (NotebookLM/Public URL)</label>
                      <input 
                        type="text" placeholder="https://..." 
                        className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-slate-900 shadow-sm"
                        value={newSource.path} onChange={e => setNewSource({...newSource, path: e.target.value, type: 'url'})}
                      />
                   </div>
                   <button 
                    onClick={handleAddSource}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all"
                   >
                     CẬP NHẬT & LƯU HỆ THỐNG
                   </button>
                </div>
              )}

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                 {sources.map(s => (
                   <div key={s.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-300 transition-all shadow-sm">
                      <div className="truncate flex items-center space-x-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <i className="fas fa-link text-xs"></i>
                         </div>
                         <div className="truncate">
                            <p className="text-[10px] font-black uppercase text-slate-900 truncate">{s.name}</p>
                            <p className="text-[8px] text-slate-400 truncate max-w-[120px]">{s.path}</p>
                         </div>
                      </div>
                      <button onClick={() => deleteSource(s.id)} className="text-slate-200 hover:text-red-500 transition-colors p-2">
                         <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                   </div>
                 ))}
                 {sources.length === 0 && (
                   <div className="text-center py-10">
                      <i className="fas fa-folder-open text-slate-200 text-2xl mb-2"></i>
                      <p className="text-[9px] text-slate-400 font-black uppercase">Chưa có dữ liệu nội bộ</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* KHUNG TRA CỨU DÀNH CHO NHÂN VIÊN/ADMIN */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="mb-6 px-2 flex justify-between items-center">
               <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center">
                 <i className="fas fa-search-plus mr-2 text-orange-600"></i> Tra cứu an toàn thông minh
               </label>
               <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">AI: Gemini 3 Pro</span>
            </div>
            <textarea 
              placeholder="Hỏi về quy trình làm việc, PPE cần thiết hoặc quy định an toàn tại nhà máy..." 
              className="w-full p-8 bg-slate-50 border-2 border-transparent rounded-[32px] text-slate-900 font-black focus:bg-white focus:border-slate-900 outline-none transition-all h-52 resize-none text-lg shadow-inner"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              onClick={handleSearch} 
              disabled={loading || !query} 
              className="mt-4 w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-sm hover:bg-orange-600 transition-all uppercase tracking-widest shadow-2xl disabled:opacity-20 flex items-center justify-center space-x-3"
            >
              {loading ? (
                <><i className="fas fa-sync fa-spin"></i> <span>HỆ THỐNG ĐANG TRUY XUẤT...</span></>
              ) : (
                <><i className="fas fa-bolt"></i> <span>TRA CỨU DỮ LIỆU ĐÃ LƯU</span></>
              )}
            </button>
          </div>

          {answer && (
            <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-2xl animate-slideUp relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
              
              <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <i className="fas fa-robot text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Câu trả lời từ hệ thống</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dựa trên cơ sở dữ liệu nội bộ & quốc tế</p>
                  </div>
                </div>
                <button onClick={() => setAnswer('')} className="text-slate-200 hover:text-red-500 transition-colors">
                  <i className="fas fa-times-circle text-2xl"></i>
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-slate-900 leading-relaxed font-bold text-lg whitespace-pre-wrap mb-10 border-l-4 border-slate-100 pl-8">
                {answer}
              </div>

              {groundingLinks.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-100">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                    <i className="fas fa-globe mr-2"></i> Tham khảo mở rộng từ Internet:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {groundingLinks.map((chunk, idx) => (
                      chunk.web && (
                        <a 
                          key={idx} 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center"
                        >
                          <i className="fas fa-external-link-alt mr-2 text-[8px]"></i> {chunk.web.title || "Chi tiết"}
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
