import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

// Selected romantic quotes (bilingual: Chinese - Vietnamese)
const LOVE_QUOTES = [
  {
    cn: "执子之手，与子偕老。",
    vi: "Nắm lấy tay em, cùng đi bên nhau đến đầu bạc răng long."
  },
  {
    cn: "遇上你是我这辈子最大的幸运。",
    vi: "Gặp được em là điều may mắn lớn nhất cuộc đời anh."
  },
  {
    cn: "只要有你陪伴，每天都是晴天。",
    vi: "Chỉ cần có em bên cạnh, ngày nào cũng là ngày nắng ấm."
  },
  {
    cn: "因为是你，所以一切都刚刚好。",
    vi: "Bởi vì đó là em, nên mọi thứ đều trở nên vừa vặn hoàn hảo."
  },
  {
    cn: "只愿君心似我心，定不负相思意。",
    vi: "Chỉ mong lòng em giống lòng anh, quyết không phụ tấm chân tình này."
  },
  {
    cn: "两情若是久长时，又岂在朝朝暮暮。",
    vi: "Tình nếu dài lâu muôn thuở vững, tiếc gì giây phút cận kề nhau."
  },
  {
    cn: "你是我生命中最好的礼物。",
    vi: "Em là món quà tuyệt vời nhất mà cuộc sống đã ban tặng cho anh."
  }
];

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function MemoryCorner({ user, viewMode = 'memory', onBack }) {
  const navigate = useNavigate();
  const [days, setDays] = useState(0);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [hearts, setHearts] = useState([]);
  const [clickHearts, setClickHearts] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchTranslation, setTouchTranslation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [audio] = useState(() => {
    // Permanent local file in the public folder, respecting base path (e.g. /love/)
    const baseUrl = import.meta.env.BASE_URL || '/';
    const audioPath = baseUrl.endsWith('/') ? `${baseUrl}mot-doi.mp3` : `${baseUrl}/mot-doi.mp3`;
    const aud = new Audio(audioPath);
    aud.loop = true;
    return aud;
  });

  // Lấy danh sách email cặp đôi được phép truy cập
  const ALLOWED_COUPLE_EMAILS = import.meta.env.VITE_ALLOWED_COUPLE_EMAILS
    ? import.meta.env.VITE_ALLOWED_COUPLE_EMAILS.split(',').map(email => email.trim())
    : [];

  // Xác định email được quyền Ghi nhận & Xóa lịch sử ốm (Mặc định lấy email đầu tiên trong danh sách, hoặc có thể tùy chỉnh)
  const ADMIN_WRITE_EMAIL = ALLOWED_COUPLE_EMAILS[0] || 'tuanminh.edu@gmail.com';
  const canEdit = user && user.email === ADMIN_WRITE_EMAIL;

  // Sổ Tay Sức Khỏe Em Iu State - Khởi tạo rỗng để tải từ Cloud
  const [sicknessLogs, setSicknessLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [visitLogs, setVisitLogs] = useState([]);

  // Helper to parse user agent for admin view
  const parseDeviceFromUA = (ua) => {
    if (!ua) return 'Không rõ thiết bị';
    let device = 'Máy tính 💻';
    if (/mobile/i.test(ua)) device = 'Điện thoại 📱';
    else if (/tablet/i.test(ua) || /ipad/i.test(ua)) device = 'M.tính bảng 📟';
    
    let browser = 'Trình duyệt';
    if (/chrome/i.test(ua) && !/edge/i.test(ua) && !/opr/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/edge/i.test(ua)) browser = 'Edge';
    
    let os = 'Hệ điều hành';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    
    return `${device} (${browser} - ${os})`;
  };

  // Helper to compute stats for admin view
  const getVisitStats = () => {
    const stats = {};
    
    visitLogs.forEach(log => {
      // ICT time (GMT+7)
      const dateObj = new Date(log.timestamp);
      const ictMs = dateObj.getTime() + (7 * 60 * 60 * 1000);
      const ictDate = new Date(ictMs);
      
      const year = ictDate.getUTCFullYear();
      const month = String(ictDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(ictDate.getUTCDate()).padStart(2, '0');
      
      const monthKey = `${month}/${year}`;
      const dayKey = `${day}/${month}/${year}`;
      
      if (!stats[monthKey]) {
        stats[monthKey] = {
          total: 0,
          days: {}
        };
      }
      
      stats[monthKey].total += 1;
      stats[monthKey].days[dayKey] = (stats[monthKey].days[dayKey] || 0) + 1;
    });
    
    return stats;
  };

  // Tự động ghi nhận lượt truy cập của thành viên khác
  useEffect(() => {
    if (user && ALLOWED_COUPLE_EMAILS.length > 0) {
      const adminEmail = ALLOWED_COUPLE_EMAILS[0];
      const isUserAdmin = user.email === adminEmail;
      
      // Chỉ ghi nhận lượt truy cập của các thành viên còn lại (không phải admin)
      if (!isUserAdmin && ALLOWED_COUPLE_EMAILS.includes(user.email)) {
        const visitLogged = sessionStorage.getItem('tm_visit_logged');
        if (!visitLogged) {
          sessionStorage.setItem('tm_visit_logged', 'true');
          
          supabase.db.saveRSVP('default', {
            guest_name: user.email,
            status: 'member_visit',
            guest_count: 1,
            side: 'both',
            wish: navigator.userAgent || 'Web Browser'
          }).catch(err => {
            console.error('Failed to log visit:', err);
          });
        }
      }
    }
  }, [user, ALLOWED_COUPLE_EMAILS]);

  // Tải dữ liệu từ database Supabase (hoặc localStorage dự phòng) khi tải trang
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Kiểm tra thực tế kết nối tới database nếu cấu hình Supabase đã được nạp
        if (supabase && !supabase.isMock) {
          try {
            const { error: checkError } = await supabase
              .from('tuanminh_wedding_rsvps')
              .select('id')
              .limit(1);
            if (checkError) {
              console.error('Supabase connection check error:', checkError);
              setDbError(checkError.message || JSON.stringify(checkError));
            }
          } catch (e) {
            console.error('Supabase connection exception:', e);
            setDbError(e.message || 'Lỗi kết nối mạng');
          }
        }

        const rsvps = await supabase.db.getRSVPs('default');

        // Lọc các lượt truy cập của thành viên khác
        const visits = rsvps
          .filter(r => r.status === 'member_visit')
          .map(r => ({
            id: r.id,
            email: r.guest_name,
            timestamp: r.created_at || new Date().toISOString(),
            deviceInfo: parseDeviceFromUA(r.wish)
          }));
        setVisitLogs(visits);

        // Lọc các dòng RSVP dùng riêng cho mục đích ghi chép sức khỏe (status = sickness_log)
        const logs = rsvps
          .filter(r => r.status === 'sickness_log')
          .map(r => ({
            id: r.id,
            date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            symptomType: r.guest_name,
            notes: r.wish,
            icon: r.side || '🤒'
          }));

        // Kiểm tra xem đã từng khởi tạo dữ liệu mẫu chưa bằng cách tìm nhãn khởi tạo đặc biệt
        const isInitialized = rsvps.some(r => r.status === 'sickness_log_initialized');

        // Tự động gắn cờ khởi tạo nếu đã có sẵn dữ liệu ốm để tránh re-seed khi xóa sạch sau này
        if (logs.length > 0 && !isInitialized) {
          supabase.db.saveRSVP('default', {
            guest_name: 'Sổ Tay Sức Khỏe',
            status: 'sickness_log_initialized',
            guest_count: 0,
            side: '🩺',
            wish: 'Hệ thống sổ tay sức khỏe đã được tự động gắn cờ khởi tạo.'
          });
        }

        if (logs.length === 0 && !isInitialized) {
          // Lưu cờ khởi tạo hệ thống lên cơ sở dữ liệu để tránh tự nạp lại sau này khi người dùng xóa hết
          await supabase.db.saveRSVP('default', {
            guest_name: 'Sổ Tay Sức Khỏe',
            status: 'sickness_log_initialized',
            guest_count: 0,
            side: '🩺',
            wish: 'Hệ thống sổ tay sức khỏe đã được khởi tạo lần đầu thành công.'
          });

          // Nếu database chưa có dữ liệu nào (ví dụ lần đầu cài đặt), tự động nạp dữ liệu mẫu lên Cloud để đồng bộ
          const defaultLogs = [
            {
              guest_name: 'Sốt đau đầu nhẹ',
              status: 'sickness_log',
              guest_count: 0,
              side: '🌡️',
              wish: 'Thời tiết giao mùa nóng lạnh thất thường dẫn đến sốt đau đầu. Anh đã chuẩn bị sẵn nước gừng ấm rồi đó.',
              created_at: '2026-04-05T00:00:00.000Z'
            },
            {
              guest_name: 'Cảm lạnh đi mưa',
              status: 'sickness_log',
              guest_count: 0,
              side: '🤧',
              wish: 'Đi chơi Valentine dính mưa phùn lạnh mà không chịu mặc thêm áo khoác dày. Phạt bé tự giác giữ ấm nha!',
              created_at: '2026-02-14T00:00:00.000Z'
            },
            {
              guest_name: 'Viêm họng ho khan',
              status: 'sickness_log',
              guest_count: 0,
              side: '😷',
              wish: 'Nói nhiều và uống nước đá lạnh đợt đầu đông quá nha! Lần sau phải uống trà gừng bảo vệ cổ họng nghe chưa.',
              created_at: '2025-11-20T00:00:00.000Z'
            },
            {
              guest_name: 'Kiệt sức mệt mỏi',
              status: 'sickness_log',
              guest_count: 0,
              side: '😴',
              wish: 'Áp lực học tập/công việc nhiều dẫn đến kiệt sức. Anh luôn bên cạnh và ôm bé thật chặt nhé! ❤️',
              created_at: '2025-09-15T00:00:00.000Z'
            }
          ];

          const uploadedLogs = [];
          for (const item of defaultLogs) {
            const res = await supabase.db.saveRSVP('default', item);
            if (res.data) {
              uploadedLogs.push({
                id: res.data.id,
                date: item.created_at.split('T')[0],
                symptomType: res.data.guest_name,
                notes: res.data.wish,
                icon: res.data.side || '🤒'
              });
            }
          }
          uploadedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
          setSicknessLogs(uploadedLogs);
        } else {
          // Tự động nhận diện và dọn dẹp các bản ghi bị trùng lặp (trùng symptom, notes, và date)
          const uniqueLogsMap = new Map();
          const duplicatesToDelete = [];

          logs.forEach(log => {
            const key = `${log.symptomType}-${log.notes}-${log.date}`;
            if (uniqueLogsMap.has(key)) {
              duplicatesToDelete.push(log.id);
            } else {
              uniqueLogsMap.set(key, log);
            }
          });

          const uniqueLogs = Array.from(uniqueLogsMap.values());
          uniqueLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
          setSicknessLogs(uniqueLogs);

          // Thực hiện xóa ngầm các bản ghi trùng lặp trên cơ sở dữ liệu
          if (duplicatesToDelete.length > 0) {
            console.log(`🧹 Phát hiện và tự động dọn dẹp ${duplicatesToDelete.length} bản ghi sức khỏe trùng lặp...`);
            duplicatesToDelete.forEach(id => {
              supabase.db.deleteRSVP(id).catch(err => {
                console.error('Failed to auto-clean duplicate sickness log:', err);
              });
            });
          }
        }
      } catch (err) {
        console.error('Failed to sync sickness logs from database:', err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, []);

  // Năm lọc mặc định (Năm hiện tại hoặc Tất cả)
  const [selectedYear, setSelectedYear] = useState('Tất cả');

  // Các mẫu lời dặn dò ngọt ngào có sẵn để chọn nhanh
  const CARE_TEMPLATES = [
    "Em nhớ uống nhiều nước ấm, ăn cháo nóng và uống thuốc đúng giờ nhé. Anh lo lắm đó! ❤️",
    "Đi ngủ thật sớm nghe chưa em yêu, không được thức khuya làm việc nữa đâu đấy. Phạt tự giác đắp chăn ấm nha! 😠❤️",
    "Lần sau ra ngoài nhớ mang theo áo khoác và đi mưa phải mặc áo mưa nghe chưa em iu. Anh thương em nhiều! 🥺❤️",
    "Cố gắng nghỉ ngơi tĩnh dưỡng, đừng làm việc quá sức nha em. Có anh luôn ở bên cạnh chăm sóc em đây! 🥰❤️",
    "Hạn chế uống nước đá lạnh và ăn đồ cay nóng nha em yêu. Uống mật ong ấm bảo vệ cổ họng nhé! 🍯❤️"
  ];

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logSymptom, setLogSymptom] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const handleAddSickness = async (e) => {
    e.preventDefault();
    if (!canEdit || !logSymptom.trim()) return;

    // Tự động phân tích từ khóa để gán emoji siêu cute phù hợp với triệu chứng tự ghi
    let emoji = '🤒'; // Mặc định
    const symptomLower = logSymptom.toLowerCase();
    if (symptomLower.includes('cảm') || symptomLower.includes('lạnh') || symptomLower.includes('cúm')) emoji = '🤧';
    else if (symptomLower.includes('sốt') || symptomLower.includes('nóng') || symptomLower.includes('nhiệt')) emoji = '🌡️';
    else if (symptomLower.includes('họng') || symptomLower.includes('ho')) emoji = '😷';
    else if (symptomLower.includes('mệt') || symptomLower.includes('oải') || symptomLower.includes('kiệt sức') || symptomLower.includes('yếu') || symptomLower.includes('đuối') || symptomLower.includes('xỉu')) emoji = '😴';
    else if (symptomLower.includes('đau đầu') || symptomLower.includes('nhức đầu') || symptomLower.includes('đầu') || symptomLower.includes('chóng mặt') || symptomLower.includes('choáng')) emoji = '🧠';
    else if (symptomLower.includes('bụng') || symptomLower.includes('dạ dày') || symptomLower.includes('bao tử') || symptomLower.includes('tiêu hóa') || symptomLower.includes('luộm nhuộm')) emoji = '🤢';

    // Tạo một RSVP đặc biệt để lưu đợt ốm đồng bộ lên Supabase
    const newRsvp = {
      guest_name: logSymptom.trim(),
      status: 'sickness_log',
      guest_count: 0,
      side: emoji,
      wish: logNotes.trim() || 'Giữ sức khỏe thật tốt nhé em!',
      // Lưu ngày bị ốm được chọn dưới dạng ISO
      created_at: new Date(logDate + 'T12:00:00').toISOString() 
    };

    try {
      const res = await supabase.db.saveRSVP('default', newRsvp);
      if (res.data) {
        const savedLog = {
          id: res.data.id,
          date: logDate,
          symptomType: res.data.guest_name,
          notes: res.data.wish,
          icon: res.data.side || '🤒'
        };

        const updated = [savedLog, ...sicknessLogs];
        updated.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSicknessLogs(updated);

        // Reset Form
        setIsModalOpen(false);
        setLogDate(new Date().toISOString().split('T')[0]);
        setLogSymptom('');
        setLogNotes('');
      }
    } catch (err) {
      console.error('Failed to save sickness log to Cloud:', err);
      alert(`⚠️ Không thể lưu dữ liệu lên Supabase Cloud!\n\nChi tiết lỗi: ${err.message || JSON.stringify(err)}\n\nVui lòng kiểm tra lại quyền RLS (Row Level Security) trên bảng tuanminh_wedding_rsvps.`);
    }
  };

  const handleDeleteSickness = async (id) => {
    if (!canEdit) return;
    const confirmDelete = window.confirm("Anh có chắc chắn muốn xóa đợt ghi nhận ốm này không? ❤️");
    if (confirmDelete) {
      try {
        await supabase.db.deleteRSVP(id);
        const updated = sicknessLogs.filter(log => log.id !== id);
        setSicknessLogs(updated);
      } catch (err) {
        console.error('Failed to delete sickness log from Cloud:', err);
        alert(`⚠️ Không thể xóa dữ liệu trên Supabase Cloud!\n\nChi tiết lỗi: ${err.message || JSON.stringify(err)}`);
      }
    }
  };

  // Trích xuất danh sách các năm duy nhất từ danh sách đợt ốm để làm bộ lọc
  const uniqueYears = Array.from(new Set(sicknessLogs.map(log => {
    // Đảm bảo lấy đúng năm từ chuỗi ngày YYYY-MM-DD
    return log.date.split('-')[0];
  })));
  uniqueYears.sort((a, b) => b - a); // Sắp xếp năm giảm dần
  const yearOptions = ['Tất cả', ...uniqueYears];

  // Lọc danh sách đợt ốm theo năm được chọn
  const filteredLogs = selectedYear === 'Tất cả'
    ? sicknessLogs
    : sicknessLogs.filter(log => log.date.startsWith(selectedYear));

  // Try to autoplay on mount and set up robust fallback interaction triggers (click, touch, scroll, etc.)
  useEffect(() => {
    const startAudioOnInteraction = () => {
      if (!userPaused && audio.paused) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            removeInteractionListeners();
          })
          .catch(err => {
            console.log("Autoplay interaction trigger failed:", err);
          });
      }
    };

    const removeInteractionListeners = () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('scroll', startAudioOnInteraction, { passive: true });
      window.removeEventListener('wheel', startAudioOnInteraction, { passive: true });
    };

    // Add multiple interaction listeners
    window.addEventListener('click', startAudioOnInteraction);
    window.addEventListener('touchstart', startAudioOnInteraction, { passive: true });
    window.addEventListener('scroll', startAudioOnInteraction, { passive: true });
    window.addEventListener('wheel', startAudioOnInteraction, { passive: true });

    const playAudioImmediate = () => {
      if (!userPaused) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            removeInteractionListeners();
          })
          .catch(err => {
            console.log("Autoplay blocked, waiting for user interaction (click, scroll, touch)...", err);
          });
      }
    };

    const handleError = (err) => {
      console.warn("Audio failed to load:", err);
      setIsPlaying(false);
    };

    audio.addEventListener('error', handleError);
    const playTimeout = setTimeout(playAudioImmediate, 150);

    return () => {
      clearTimeout(playTimeout);
      audio.pause();
      audio.removeEventListener('error', handleError);
      removeInteractionListeners();
    };
  }, [audio, userPaused]);

  // Calculate days in love from 03/09/2025 using accurate server time in Vietnam timezone (GMT+7)
  useEffect(() => {
    // Start date in Vietnam timezone: 2025-09-03 00:00:00 GMT+7 (equals 2025-09-02 17:00:00 UTC)
    const startMs = new Date('2025-09-02T17:00:00Z').getTime();
    const startDayEpoch = Math.floor((startMs + 7 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
    
    const updateDays = async () => {
      let today = new Date();
      
      try {
        // Try to read server Date header from our same-origin response (avoids CORS and works offline)
        const response = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          today = new Date(dateHeader);
        } else {
          // Fallback to worldtimeapi
          const apiRes = await fetch('https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh');
          const apiData = await apiRes.json();
          if (apiData.datetime) {
            today = new Date(apiData.datetime);
          }
        }
      } catch (err) {
        console.warn("Could not fetch server time, using local device time as fallback:", err);
      }

      // Convert current time to Vietnam epoch days
      const currentMs = today.getTime();
      const currentDayEpoch = Math.floor((currentMs + 7 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
      
      // Calculate days count (inclusive of start day)
      const calculatedDays = currentDayEpoch - startDayEpoch + 1;
      setDays(calculatedDays);
    };

    updateDays();
    // Update every hour to ensure accuracy
    const timer = setInterval(updateDays, 3600000);
    return () => clearInterval(timer);
  }, []);

  // Keep nextQuote ref fresh to prevent stale closure in setInterval
  const nextQuoteRef = useRef(null);

  // Automatic quote rotation every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (nextQuoteRef.current) {
        nextQuoteRef.current();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Generate background floating hearts
  useEffect(() => {
    const initialHearts = Array.from({ length: 15 }).map(() => ({
      id: Math.random(),
      left: Math.random() * 100,
      size: Math.random() * 20 + 10,
      delay: Math.random() * 8,
      duration: Math.random() * 6 + 6,
      opacity: Math.random() * 0.5 + 0.3
    }));
    setHearts(initialHearts);

    const interval = setInterval(() => {
      setHearts(prev => [
        ...prev.slice(-14),
        {
          id: Math.random(),
          left: Math.random() * 100,
          size: Math.random() * 20 + 10,
          delay: 0,
          duration: Math.random() * 6 + 6,
          opacity: Math.random() * 0.5 + 0.3
        }
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Handle click on screen to burst hearts
  const handleScreenClick = (e) => {
    const newHeart = {
      id: Math.random(),
      x: e.clientX,
      y: e.clientY,
      size: Math.random() * 25 + 15
    };
    setClickHearts(prev => [...prev, newHeart]);

    // Clean up click heart after animation completes
    setTimeout(() => {
      setClickHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1200);

    // Try to autoplay on first user interaction if not explicitly paused by user
    if (audio && audio.paused && !userPaused && !isPlaying) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.log("Autoplay waiting for user interaction:", err);
        });
    }
  };

  const nextQuote = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass('flip-out-next');
    
    setTimeout(() => {
      setQuoteIdx(prev => (prev + 1) % LOVE_QUOTES.length);
      setAnimClass('flip-in-next');
      
      setTimeout(() => {
        setAnimClass('');
        setIsTransitioning(false);
      }, 250);
    }, 250);
  };

  const prevQuote = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass('flip-out-prev');
    
    setTimeout(() => {
      setQuoteIdx(prev => (prev - 1 + LOVE_QUOTES.length) % LOVE_QUOTES.length);
      setAnimClass('flip-in-prev');
      
      setTimeout(() => {
        setAnimClass('');
        setIsTransitioning(false);
      }, 250);
    }, 250);
  };

  // Sync nextQuote ref
  useEffect(() => {
    nextQuoteRef.current = nextQuote;
  });

  const togglePlay = (e) => {
    e.stopPropagation(); // Avoid spawning click heart
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setUserPaused(true);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setUserPaused(false);
        })
        .catch(err => console.error("Error playing audio:", err));
    }
  };

  // Touch handlers for elastic swiping slogans
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartX;
    // Elastic cap the drag distance
    const cappedDiff = Math.max(-140, Math.min(140, diffX));
    setTouchTranslation(cappedDiff);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    setIsDragging(false);
    
    // Threshold of 65px for a swipe
    if (touchTranslation > 65) {
      prevQuote(); // Swipe Right -> Prev
    } else if (touchTranslation < -65) {
      nextQuote(); // Swipe Left -> Next
    }
    
    setTouchTranslation(0);
    setTouchStartX(null);
  };

  return (
    <div className="memory-page" onClick={handleScreenClick}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&display=swap');

        .memory-page {
          width: 100%;
          min-height: 80vh;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fdf4ff 100%);
          border-radius: 30px;
          box-shadow: var(--glass-shadow);
          transition: var(--theme-transition);
          user-select: none;
        }

        [data-theme='dark'] .memory-page {
          background: linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #4c0519 100%);
        }

        /* Floating background hearts */
        .bg-heart {
          position: absolute;
          bottom: -40px;
          color: rgba(244, 63, 94, 0.4);
          pointer-events: none;
          z-index: 1;
          animation: floatUp linear infinite;
        }

        [data-theme='dark'] .bg-heart {
          color: rgba(244, 63, 94, 0.2);
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: var(--opacity);
          }
          90% {
            opacity: var(--opacity);
          }
          100% {
            transform: translateY(-90vh) rotate(360deg);
            opacity: 0;
          }
        }

        /* Click burst hearts */
        .click-heart {
          position: fixed;
          pointer-events: none;
          color: #f43f5e;
          z-index: 9999;
          animation: burstOut 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
          text-shadow: 0 0 10px rgba(244, 63, 94, 0.5);
        }

        @keyframes burstOut {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -100px) scale(1.4) rotate(15deg);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -160px) scale(0.8) rotate(-15deg);
            opacity: 0;
          }
        }

        .memory-card {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 3rem 2rem;
          border-radius: 28px;
          text-align: center;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(244, 63, 94, 0.1);
          z-index: 5;
          position: relative;
          transition: var(--theme-transition);
        }

        [data-theme='dark'] .memory-card {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .heart-pulsing {
          font-size: 5rem;
          display: inline-block;
          animation: heartBeat 1.4s infinite;
          filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.6));
          cursor: pointer;
        }

        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.12); }
          28% { transform: scale(1); }
          42% { transform: scale(1.12); }
          70% { transform: scale(1); }
        }

        .memory-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .memory-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .days-counter-box {
          margin: 2.5rem 0;
        }

        .days-number {
          font-size: 8rem;
          font-weight: 900;
          line-height: 1.1;
          background: linear-gradient(135deg, #f43f5e, #ec4899, #d946ef, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 8px 20px rgba(244, 63, 94, 0.25));
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          letter-spacing: 0.04em;
          display: inline-block;
        }

        .days-label {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f43f5e;
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .milestone-date {
          display: inline-block;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.15);
          color: #e11d48;
          padding: 0.4rem 1.2rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 3.5rem;
        }

        [data-theme='dark'] .milestone-date {
          background: rgba(244, 63, 94, 0.15);
          color: #fda4af;
        }

        /* Quotes section styles */
        .quote-container {
          position: relative;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1.2rem 2.5rem;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          margin-top: 1rem;
          overflow: hidden;
        }

        /* Cinematic Blur & Scale typography transitions */
        .quote-text-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          will-change: transform, opacity, filter;
        }

        .quote-text-wrapper.flip-out-next {
          animation: cinematicBlurOut 0.25s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .quote-text-wrapper.flip-in-next {
          animation: cinematicBlurIn 0.25s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .quote-text-wrapper.flip-out-prev {
          animation: cinematicBlurOut 0.25s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .quote-text-wrapper.flip-in-prev {
          animation: cinematicBlurIn 0.25s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        @keyframes cinematicBlurOut {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.95); filter: blur(8px); }
        }

        @keyframes cinematicBlurIn {
          0% { opacity: 0; transform: scale(0.95); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        [data-theme='dark'] .quote-container {
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .quote-chinese {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.6rem;
          line-height: 1.4;
          font-style: italic;
        }

        .quote-vietnamese {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          font-weight: 500;
        }

        .quote-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }

        .quote-nav-btn:hover {
          color: #f43f5e;
          transform: translateY(-50%) scale(1.15);
        }

        .quote-nav-btn.prev { left: 0.5rem; }
        .quote-nav-btn.next { right: 0.5rem; }

        .back-home-footer {
          margin-top: 2rem;
          z-index: 5;
        }

        .music-toggle-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #f43f5e;
          font-size: 1.3rem;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
          box-shadow: 0 4px 10px rgba(244, 63, 94, 0.15);
        }
        
        .music-toggle-btn:hover {
          background: rgba(244, 63, 94, 0.2);
          transform: scale(1.1);
        }
        
        .music-toggle-btn.playing {
          animation: rotateDisk 3s linear infinite;
          box-shadow: 0 0 15px rgba(244, 63, 94, 0.4);
          background: rgba(244, 63, 94, 0.15);
        }
        
        @keyframes rotateDisk {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Health Card styling */
        .health-card {
          width: 100%;
          max-width: 580px;
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 30px;
          padding: 2.5rem 2rem;
          margin-top: 2rem;
          box-shadow: var(--glass-shadow);
          z-index: 5;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
        }

        [data-theme='dark'] .health-card {
          background: rgba(30, 27, 75, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Health Cloud Sync Status Badge */
        .health-sync-badge {
          position: absolute;
          top: 1rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        [data-theme='dark'] .health-sync-badge {
          background: rgba(30, 27, 75, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .sync-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .sync-dot.online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: syncPulseGreen 2s infinite alternate;
        }

        .sync-dot.offline {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
          animation: syncPulseOrange 2s infinite alternate;
        }

        .sync-text {
          color: var(--text-primary);
          opacity: 0.85;
        }

        @keyframes syncPulseGreen {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        @keyframes syncPulseOrange {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        .health-sync-badge.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.35);
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        [data-theme='dark'] .health-sync-badge.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .sync-dot.error {
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          animation: syncPulseRed 2s infinite alternate;
        }

        @keyframes syncPulseRed {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        @media (max-width: 480px) {
          .health-sync-badge {
            position: static;
            display: inline-flex;
            margin: 0 auto 0.75rem auto;
            justify-content: center;
          }
        }

        .health-title-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .health-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #e11d48;
          margin: 0;
          text-shadow: 0 2px 10px rgba(225, 29, 72, 0.1);
        }
        
        [data-theme='dark'] .health-title {
          color: #fb7185;
        }

        /* Pulsing Health Indicator */
        .health-summary-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          margin: 2rem 0;
        }

        .health-heart-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%);
          border: 4px solid #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 30px rgba(225, 29, 72, 0.2);
          animation: heartBeatPulse 2.5s infinite ease-in-out;
          transition: all 0.3s ease;
        }

        [data-theme='dark'] .health-heart-circle {
          background: linear-gradient(135deg, #4c0519 0%, #881337 100%);
          border: 4px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 30px rgba(225, 29, 72, 0.4);
        }

        @keyframes heartBeatPulse {
          0% { transform: scale(1); box-shadow: 0 8px 30px rgba(225, 29, 72, 0.2); }
          50% { transform: scale(1.06); box-shadow: 0 8px 45px rgba(225, 29, 72, 0.4); }
          100% { transform: scale(1); box-shadow: 0 8px 30px rgba(225, 29, 72, 0.2); }
        }

        .health-count-num {
          font-family: 'Outfit', sans-serif;
          font-size: 3rem;
          font-weight: 900;
          color: #e11d48;
          line-height: 1;
        }
        
        [data-theme='dark'] .health-count-num {
          color: #fca5a5;
        }

        .health-count-lbl {
          font-size: 0.8rem;
          font-weight: 700;
          color: #be123c;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        [data-theme='dark'] .health-count-lbl {
          color: #fca5a5;
        }

        .health-warning-msg {
          font-size: 1rem;
          line-height: 1.6;
          font-weight: 600;
          color: #4b5563;
          background: rgba(255, 255, 255, 0.6);
          padding: 1.25rem 1.5rem;
          border-radius: 20px;
          border: 1px solid rgba(225, 29, 72, 0.15);
          max-width: 480px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
        }

        [data-theme='dark'] .health-warning-msg {
          color: #e2e8f0;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(251, 113, 133, 0.25);
        }

        .health-warning-msg.green {
          border-color: #10b981;
        }
        .health-warning-msg.yellow {
          border-color: #f59e0b;
        }
        .health-warning-msg.red {
          border-color: #ef4444;
          animation: warningPulse 3s infinite alternate;
        }

        @keyframes warningPulse {
          0% { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.05); }
          100% { box-shadow: 0 4px 25px rgba(239, 68, 68, 0.2); }
        }

        /* Years filter pills */
        .health-years-container {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          padding: 0.35rem;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(225, 29, 72, 0.05);
        }

        [data-theme='dark'] .health-years-container {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .health-year-pill {
          padding: 0.5rem 1.1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.15);
          border: none;
          background: transparent;
          color: var(--text-secondary);
        }

        .health-year-pill:hover {
          color: var(--text-primary);
          background: rgba(0, 0, 0, 0.02);
        }

        .health-year-pill.active {
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: #fff;
          box-shadow: 0 4px 10px rgba(225, 29, 72, 0.15);
        }

        /* Timeline styling */
        .health-timeline-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          text-align: left;
          margin-top: 2rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .health-timeline {
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .health-timeline::-webkit-scrollbar {
          width: 6px;
        }
        .health-timeline::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 10px;
        }
        .health-timeline::-webkit-scrollbar-thumb {
          background: rgba(225, 29, 72, 0.2);
          border-radius: 10px;
        }
        .health-timeline::-webkit-scrollbar-thumb:hover {
          background: rgba(225, 29, 72, 0.4);
        }

        .health-log-item {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          gap: 1rem;
          position: relative;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.01);
        }

        [data-theme='dark'] .health-log-item {
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .health-log-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(225, 29, 72, 0.08);
          background: rgba(255, 255, 255, 0.7);
        }

        [data-theme='dark'] .health-log-item:hover {
          background: rgba(15, 23, 42, 0.45);
          box-shadow: 0 8px 20px rgba(225, 29, 72, 0.15);
        }

        .health-log-icon {
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          flex-shrink: 0;
        }

        [data-theme='dark'] .health-log-icon {
          background: #1e1b4b;
          box-shadow: none;
        }

        .health-log-content {
          flex-grow: 1;
        }

        .health-log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .health-log-date {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .health-log-type {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .health-log-notes {
          font-size: 0.9rem;
          line-height: 1.45;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Delete Button */
        .health-delete-btn {
          background: transparent;
          border: none;
          color: #f43f5e;
          font-size: 1.1rem;
          cursor: pointer;
          opacity: 0.3;
          transition: all 0.2s ease;
          padding: 0.2rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .health-delete-btn:hover {
          opacity: 1;
          background: rgba(244, 63, 94, 0.1);
          transform: scale(1.1);
        }

        /* Romantic Modal */
        .health-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeInModal 0.3s ease;
          padding: 1.5rem 1rem;
          overflow-y: auto; /* Enable scroll at overlay level if viewport is very short */
        }

        .health-modal-content {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          width: 100%;
          max-width: 480px;
          padding: 2.25rem 2rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          animation: scaleInModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          text-align: left;
          max-height: 85vh; /* Responsive height limit to fit inside small phones */
          overflow-y: auto; /* Enable scrolling inside the modal */
        }

        .health-modal-content::-webkit-scrollbar {
          width: 4px;
        }
        .health-modal-content::-webkit-scrollbar-thumb {
          background: rgba(225, 29, 72, 0.15);
          border-radius: 10px;
        }

        [data-theme='dark'] .health-modal-content {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleInModal {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .health-modal-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: #e11d48;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        [data-theme='dark'] .health-modal-title {
          color: #fb7185;
        }

        .health-form-group {
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .health-form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .health-input, .health-select, .health-textarea {
          width: 100%;
          padding: 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(225, 29, 72, 0.15);
          background: rgba(255, 255, 255, 0.7);
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.25s ease;
        }

        [data-theme='dark'] .health-input, 
        [data-theme='dark'] .health-select, 
        [data-theme='dark'] .health-textarea {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .health-input:focus, .health-select:focus, .health-textarea:focus {
          outline: none;
          border-color: #e11d48;
          box-shadow: 0 0 10px rgba(225, 29, 72, 0.15);
          background: #fff;
        }

        [data-theme='dark'] .health-input:focus, 
        [data-theme='dark'] .health-select:focus, 
        [data-theme='dark'] .health-textarea:focus {
          border-color: #fb7185;
          background: #0f172a;
        }

        .health-btn-group {
          display: flex;
          gap: 1rem;
          margin-top: 1.75rem;
        }

        .health-btn {
          flex: 1;
          padding: 0.75rem;
          border-radius: 12px;
          border: none;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .health-btn-secondary {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-primary);
        }

        .health-btn-secondary:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        [data-theme='dark'] .health-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
        }

        [data-theme='dark'] .health-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .health-btn-primary {
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          color: #fff;
          box-shadow: 0 4px 15px rgba(225, 29, 72, 0.2);
        }

        .health-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(225, 29, 72, 0.3);
        }

        /* Responsive */
        @media (max-width: 600px) {
          .memory-page {
            border-radius: 20px;
            padding: 1rem 0.5rem;
          }
          .memory-card {
            padding: 2rem 1.25rem;
          }
          .days-number {
            font-size: 5.5rem;
            letter-spacing: 0.02em;
          }
          .quote-container {
            padding: 1rem 1.8rem;
          }
          .quote-chinese {
            font-size: 1rem;
          }
          .quote-vietnamese {
            font-size: 0.8rem;
          }
          .quote-nav-btn {
            font-size: 1.2rem;
          }
          .health-card {
            border-radius: 20px;
            padding: 1.75rem 1.25rem;
            margin-top: 1.5rem;
          }
          .health-title {
            font-size: 1.4rem;
          }
          .health-heart-circle {
            width: 100px;
            height: 100px;
          }
          .health-count-num {
            font-size: 2.5rem;
          }
          .health-warning-msg {
            font-size: 0.85rem;
            padding: 1rem;
          }
          .health-log-icon {
            font-size: 1.6rem;
            width: 42px;
            height: 42px;
          }
          .health-log-type {
            font-size: 0.85rem;
          }
          .health-log-date {
            font-size: 0.75rem;
          }
          .health-log-notes {
            font-size: 0.8rem;
          }
        }
      `}} />

      {/* Floating background hearts */}
      {hearts.map(heart => (
        <span
          key={heart.id}
          className="bg-heart"
          style={{
            left: `${heart.left}%`,
            fontSize: `${heart.size}px`,
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            '--opacity': heart.opacity
          }}
        >
          ❤️
        </span>
      ))}

      {/* Bursting hearts on screen click */}
      {clickHearts.map(heart => (
        <span
          key={heart.id}
          className="click-heart"
          style={{
            left: heart.x,
            top: heart.y,
            fontSize: `${heart.size}px`
          }}
        >
          💖
        </span>
      ))}

      {viewMode === 'admin' ? (
        /* ADMIN VISIT TRACKING DASHBOARD */
        canEdit && (
          <div className="health-card admin-dashboard" style={{ marginTop: '0', animation: 'fadeIn 0.4s ease' }}>
            {/* Admin Header */}
            <div className="health-title-box" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📊</span>
              <h3 className="health-title">Nhật Ký Truy Cập Của Em Iu</h3>
            </div>

            {/* Member Name */}
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Đang theo dõi: <strong style={{ color: 'var(--accent-primary)' }}>{ALLOWED_COUPLE_EMAILS.filter(email => email !== user.email).join(', ') || 'Chưa cấu hình email em iu'}</strong>
            </p>

            {/* Quick Statistics Grid */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
              <div className="stats-item glass-panel" style={{ padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</span>
                <span className="stats-val" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {visitLogs.length}
                </span>
                <span className="stats-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tổng số lần truy cập</span>
              </div>

              <div className="stats-item glass-panel" style={{ padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗓️</span>
                <span className="stats-val" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {(() => {
                    // Count current month visits (Vietnam local time)
                    const now = new Date();
                    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
                    const stats = getVisitStats();
                    return stats[currentMonthStr]?.total || 0;
                  })()}
                </span>
                <span className="stats-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Truy cập trong tháng</span>
              </div>

              <div className="stats-item glass-panel" style={{ padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☀️</span>
                <span className="stats-val" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {(() => {
                    // Count today's visits (Vietnam local time)
                    const now = new Date();
                    const todayStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
                    const stats = getVisitStats();
                    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
                    return stats[currentMonthStr]?.days[todayStr] || 0;
                  })()}
                </span>
                <span className="stats-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Truy cập hôm nay</span>
              </div>
            </div>

            {/* Grouped Visits Calendar Details */}
            <div className="admin-visits-details" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid var(--accent-primary)', paddingLeft: '0.5rem' }}>Chi tiết lượt truy cập qua các ngày</h4>
              
              {visitLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>Chưa có dữ liệu truy cập nào được ghi nhận 📭</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.entries(getVisitStats()).map(([month, monthData]) => (
                    <div key={month} className="glass-panel" style={{ padding: '1.25rem', borderRadius: '18px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span>📅 Tháng {month}</span>
                        <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.2rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem' }}>{monthData.total} lần</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {Object.entries(monthData.days)
                          .sort((a, b) => {
                            // Sort days in descending order (newest day first)
                            const parseDate = (dStr) => {
                              const [d, m, y] = dStr.split('/').map(Number);
                              return new Date(y, m - 1, d);
                            };
                            return parseDate(b[0]) - parseDate(a[0]);
                          })
                          .map(([day, count]) => (
                            <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 550 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>🗓️ Ngày {day}</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{count} lần</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Timeline of Visits */}
            <div className="admin-visits-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, borderLeft: '4px solid var(--accent-primary)', paddingLeft: '0.5rem' }}>Lịch sử 10 lần truy cập gần nhất</h4>
              
              <div className="health-timeline" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {visitLogs.slice(0, 10).map((log, index) => {
                  const logDate = new Date(log.timestamp);
                  const ictMs = logDate.getTime() + (7 * 60 * 60 * 1000);
                  const ictDate = new Date(ictMs);
                  
                  const timeStr = String(ictDate.getUTCHours()).padStart(2, '0') + ':' + 
                                  String(ictDate.getUTCMinutes()).padStart(2, '0') + ':' + 
                                  String(ictDate.getUTCSeconds()).padStart(2, '0');
                  
                  const dateStr = String(ictDate.getUTCDate()).padStart(2, '0') + '/' + 
                                  String(ictDate.getUTCMonth() + 1).padStart(2, '0') + '/' + 
                                  ictDate.getUTCFullYear();

                  return (
                    <div key={log.id || index} className="health-log-item" style={{ padding: '0.85rem 1rem', marginBottom: '0.75rem', minHeight: 'auto', gap: '0.75rem' }}>
                      <div className="health-log-icon" style={{ width: '38px', height: '38px', fontSize: '1.25rem', padding: 0 }}>
                        {log.deviceInfo.includes('Điện thoại') ? '📱' : '💻'}
                      </div>
                      <div className="health-log-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{dateStr} - {timeStr}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.email}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.deviceInfo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : (
        /* STANDARD VIEW */
        <>
          <div className="memory-card">
        {/* Floating Play/Pause Music Button */}
        <button 
          className={`music-toggle-btn ${isPlaying ? 'playing' : ''}`} 
          onClick={togglePlay} 
          title={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc lãng mạn"}
        >
          {isPlaying ? '🎵' : '🔇'}
        </button>

        <div className="heart-pulsing" title="Click me for a surprise!">💝</div>
        
        <h2 className="memory-title">Kỷ Niệm Tình Yêu</h2>
        <p className="memory-subtitle">Tuấn ❤️ Minh - Hành trình gieo bình yên, hái hạnh phúc</p>
        
        <div className="days-counter-box">
          <div className="days-number">{days}</div>
          <div className="days-label">Ngày Bên Nhau</div>
        </div>

        <div className="milestone-date">
          📅 Cột mốc khởi đầu: 03/09/2025
        </div>

        {/* Quotes Board */}
        <div 
          className="quote-container" 
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          title="Vuốt trái/phải để chuyển câu"
        >
          <button className="quote-nav-btn prev" onClick={prevQuote} disabled={isTransitioning}>‹</button>
          
          <div 
            className={`quote-text-wrapper ${animClass}`}
            style={{
              transform: isDragging ? `translateX(${touchTranslation}px) rotateY(${touchTranslation / 140 * -45}deg)` : 'translateX(0) rotateY(0)',
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease',
              opacity: isDragging ? Math.max(0.2, 1 - Math.abs(touchTranslation) / 180) : 1
            }}
          >
            <div className="quote-chinese">{LOVE_QUOTES[quoteIdx].cn}</div>
            <div className="quote-vietnamese">{LOVE_QUOTES[quoteIdx].vi}</div>
          </div>
          
          <button className="quote-nav-btn next" onClick={nextQuote} disabled={isTransitioning}>›</button>
        </div>
      </div>

      {/* NEW HEALTH TRACKER CARD */}
      <div className="health-card" onClick={(e) => e.stopPropagation()}>
        {/* Trạng thái đồng bộ đám mây */}
        <div className={`health-sync-badge ${dbError ? 'error' : ''}`}>
          {dbError ? (
            <>
              <span className="sync-dot error"></span>
              <span className="sync-text" title={`Lỗi kết nối CSDL Supabase: ${dbError}. Đang lưu cục bộ thiết bị này.`}>Lỗi CSDL: {dbError}</span>
            </>
          ) : supabase && !supabase.isMock ? (
            <>
              <span className="sync-dot online"></span>
              <span className="sync-text">Đồng bộ đám mây (Cloud)</span>
            </>
          ) : (
            <>
              <span className="sync-dot offline"></span>
              <span className="sync-text" title="Supabase chưa cấu hình hoặc bị lỗi, đang lưu trữ trên thiết bị này">Chỉ lưu thiết bị này (Local)</span>
            </>
          )}
        </div>

        <div className="health-title-box">
          <span style={{ fontSize: '1.8rem' }}>🩺</span>
          <h3 className="health-title">Sổ Tay Sức Khỏe Của Em Iu</h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
          Thống kê đợt ốm qua các năm của em iu Ngô Minh và lời dặn dò yêu thương từ anh Tuấn đẹp trai
        </p>

        {/* Bộ lọc năm cực kỳ xinh xắn */}
        <div className="health-years-container" style={{ marginTop: '1.5rem' }}>
          {yearOptions.map(year => (
            <button
              key={year}
              className={`health-year-pill ${selectedYear === year ? 'active' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year === 'Tất cả' ? '📅 Tất cả' : `✨ Năm ${year}`}
            </button>
          ))}
        </div>

        <div className="health-summary-box">
          <div className="health-heart-circle">
            <span className="health-count-lbl" style={{ fontSize: '0.75rem', opacity: 0.9 }}>Tổng</span>
            <span className="health-count-num" style={{ fontSize: '2.6rem', margin: '1px 0' }}>{filteredLogs.length}</span>
            <span className="health-count-lbl" style={{ fontSize: '0.75rem', opacity: 0.9 }}>Lần Ốm</span>
          </div>

          <div className={`health-warning-msg ${
            filteredLogs.length === 0 ? 'green' : filteredLogs.length <= 3 ? 'yellow' : 'red'
          }`}>
            {filteredLogs.length === 0 ? (
              selectedYear === 'Tất cả' ? (
                "Thật tuyệt vời! Em iu chưa từng bị ốm lần nào. Hãy tiếp tục giữ gìn phong độ và ăn ngủ khoa học nhé! 🥰"
              ) : (
                `Thật tuyệt vời! Em iu không bị ốm lần nào trong năm ${selectedYear}. Phong độ giữ sức khỏe quá tốt! 🥰`
              )
            ) : filteredLogs.length <= 3 ? (
              <>
                Em iu đã bị ốm <strong>{filteredLogs.length} lần</strong> {selectedYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedYear}`} rồi đó nha! Hãy ăn uống đầy đủ dinh dưỡng, mặc ấm khi lạnh. Anh xót xa lắm! 🥺
              </>
            ) : (
              <>
                🚨 <strong>Cảnh báo đỏ!</strong> Em iu đã bị ốm <strong>{filteredLogs.length} lần</strong> {selectedYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedYear}`}! Tần suất này quá nhiều. Em không được chủ quan nữa đâu đấy! Hứa với anh là luôn ngủ sớm nghe chưa! 😠❤️
              </>
            )}
          </div>
        </div>

        <div className="health-timeline-title">
          <span>📅 Lịch Sử Các Đợt Ốm {selectedYear === 'Tất cả' ? '(Tất cả)' : `(Năm ${selectedYear})`}</span>
          {canEdit && (
            <button 
              className="btn btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{
                marginLeft: 'auto',
                fontSize: '0.85rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: '0 4px 10px rgba(225, 29, 72, 0.15)'
              }}
            >
              <span>Ghi nhận mới 📝</span>
            </button>
          )}
        </div>

        <div className="health-timeline">
          {loadingLogs ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '2rem 0' }}>
              🔄 Đang đồng bộ hóa dữ liệu đám mây...
            </p>
          ) : filteredLogs.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '2rem 0' }}>
              Chưa có ghi nhận đợt ốm nào {selectedYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedYear}`}. Em iu luôn khỏe mạnh và rạng rỡ! 🌸
            </p>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="health-log-item">
                <div className="health-log-icon">{log.icon || '🤧'}</div>
                <div className="health-log-content">
                  <div className="health-log-header">
                    <span className="health-log-type">{log.symptomType}</span>
                    <span className="health-log-date">{formatDateDMY(log.date)}</span>
                  </div>
                  <p className="health-log-notes">{log.notes}</p>
                </div>
                {canEdit && (
                  <button 
                    className="health-delete-btn" 
                    onClick={() => handleDeleteSickness(log.id)}
                    title="Xóa đợt ghi nhận ốm này"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ROMANTIC MODAL FORM (Only visible to Admin) */}
      {isModalOpen && canEdit && (
        <div className="health-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="health-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4 className="health-modal-title">
              <span>🩺 Ghi Nhận Em Iu Bị Ốm</span>
            </h4>
            
            <form onSubmit={handleAddSickness}>
              <div className="health-form-group">
                <label className="health-form-label">📅 Ngày bị ốm:</label>
                <input 
                  type="date" 
                  className="health-input"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required 
                />
              </div>

              <div className="health-form-group">
                <label className="health-form-label">🤒 Triệu chứng / Đợt ốm (tự ghi):</label>
                <input 
                  type="text" 
                  className="health-input"
                  placeholder="Ví dụ: Cảm sốt đi mưa, Đau họng ho khan, Sốt siêu vi..."
                  value={logSymptom}
                  onChange={(e) => setLogSymptom(e.target.value)}
                  required 
                />
              </div>

              <div className="health-form-group">
                <label className="health-form-label">✍️ Chọn nhanh mẫu lời dặn dặn dò nhanh:</label>
                <div className="health-templates-box">
                  {CARE_TEMPLATES.map((tmpl, idx) => (
                    <div 
                      key={idx} 
                      className="health-template-chip"
                      onClick={() => setLogNotes(tmpl)}
                    >
                      {tmpl}
                    </div>
                  ))}
                </div>

                <label className="health-form-label">✍️ Hoặc tự điền lời dặn dò yêu thương:</label>
                <textarea 
                  className="health-textarea"
                  rows={3}
                  placeholder="Nhập lời dặn dò của bạn tại đây hoặc bấm chọn mẫu nhanh ở trên..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  required 
                />
              </div>

              <div className="health-btn-group">
                <button 
                  type="button" 
                  className="health-btn health-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="health-btn health-btn-primary"
                >
                  Lưu Ghi Nhận ❤️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
