import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const POPULAR_BANKS = [
  "MB Bank (MB)",
  "Vietcombank (VCB)",
  "Techcombank (TCB)",
  "VietinBank (CTG)",
  "BIDV",
  "Agribank (VBA)",
  "ACB",
  "TPBank (TPB)",
  "VPBank (VPB)",
  "Sacombank (STB)",
  "HDBank (HDB)",
  "VIB"
];

const THEMES = [
  { id: 'romantic-pink', name: '🌸 Hồng Lãng Mạn', desc: 'Tone hồng ngọt ngào cổ điển với cánh hoa anh đào bay bổng.' },
  { id: 'luxury-gold', name: '✨ Vàng Hoàng Gia', desc: 'Tone đen & vàng kim quyền quý với tinh tú lấp lánh sang trọng.' },
  { id: 'vintage-floral', name: '🍂 Hoa Cổ Điển', desc: 'Tone kem & cam ấm áp với lá phong trôi lơ lửng cổ kính.' },
  { id: 'modern-indigo', name: '🌌 Indigo Huyền Ảo', desc: 'Tone xanh chàm đậm đà với những đốm sao đêm lấp lánh hiện đại.' }
];

const MUSIC_PRESETS = [
  { name: "🏠 Một Đời (Mặc định)", url: "" },
  { name: "🔗 Nhập liên kết nhạc MP3 tùy chỉnh...", url: "custom" }
];

const PHOTO_SLOTS = [
  { idx: 0, title: "📸 Ảnh Bìa Chính (Polaroid Top)", label: "Ảnh bìa lớn xuất hiện ở đầu thiệp mời" },
  { idx: 1, title: "🌹 Ảnh Thư Ngỏ (Polaroid Story)", label: "Ảnh xuất hiện bên cạnh phần Thư ngỏ/Lời chúc" },
  { idx: 2, title: "⛪ Ảnh Lịch Trình (Polaroid Schedule)", label: "Ảnh cưới nằm trong phần thời gian và địa điểm" },
  { idx: 3, title: "💖 Ảnh Lời Chúc (Polaroid Signature)", label: "Ảnh cưới ở chân trang, cạnh mục chúc phúc & RSVP" }
];

export default function WeddingInvitationCreator({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'rsvp'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error'
  const [copySuccess, setCopySuccess] = useState(false);

  // Settings Form States
  const [formData, setFormData] = useState({
    groom_name: '',
    bride_name: '',
    groom_parents: '',
    bride_parents: '',
    wedding_date: '',
    ceremony_address: '',
    banquet_address: '',
    ceremony_maps_url: '',
    banquet_maps_url: '',
    groom_bank: 'MB Bank',
    groom_account_number: '',
    groom_account_name: '',
    bride_bank: 'Vietcombank',
    bride_account_number: '',
    bride_account_name: '',
    theme: 'romantic-pink',
    invitation_message: '',
    music_url: '',
    wedding_photos: ['', '', '', '']
  });

  // RSVP lists
  const [rsvps, setRsvps] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'going', 'cannot_attend'
  const [filterSide, setFilterSide] = useState('all'); // 'all', 'groom', 'bride', 'both'

  // Unique Wedding ID is scoped by the user's unique ID!
  const weddingId = user?.id || 'default';
  const shareableUrl = `${window.location.origin}/thiep-cuoi/${weddingId}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        const config = await supabase.db.getWeddingConfig(weddingId);
        
        let formattedDate = '';
        if (config.wedding_date) {
          formattedDate = new Date(config.wedding_date).toISOString().slice(0, 16);
        }
        
        // Ensure wedding_photos array is present and has exactly 4 elements
        let photos = ['', '', '', ''];
        if (config.wedding_photos && Array.isArray(config.wedding_photos)) {
          photos = [...config.wedding_photos];
          while (photos.length < 4) photos.push('');
        } else if (config.wedding_photo) {
          // Backward compatibility migration
          photos[0] = config.wedding_photo;
        }

        let musicUrl = config.music_url || '';
        if (musicUrl === '/mot-nha.mp3') {
          musicUrl = '';
        }

        setFormData({
          ...config,
          music_url: musicUrl,
          wedding_date: formattedDate,
          wedding_photos: photos
        });

        const rsvpList = await supabase.db.getRSVPs(weddingId);
        setRsvps(rsvpList);
      } catch (err) {
        console.error('Failed to load invitation builder data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [weddingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMusicPresetChange = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setFormData(prev => ({ ...prev, music_url: "https://" }));
    } else {
      setFormData(prev => ({ ...prev, music_url: value }));
    }
  };

  const handlePhotoUrlChange = (idx, value) => {
    setFormData(prev => {
      const updatedPhotos = [...prev.wedding_photos];
      updatedPhotos[idx] = value;
      return { ...prev, wedding_photos: updatedPhotos };
    });
  };

  const handleImageUpload = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Tệp ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas client-side
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => {
          const updatedPhotos = [...prev.wedding_photos];
          updatedPhotos[idx] = compressedBase64;
          return { ...prev, wedding_photos: updatedPhotos };
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const dataToSave = {
        ...formData,
        id: weddingId,
        wedding_date: new Date(formData.wedding_date).toISOString()
      };
      
      const res = await supabase.db.saveWeddingConfig(weddingId, dataToSave);
      if (res.error) throw res.error;
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error('Failed to save wedding config:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(err => {
        console.error('Link copy failed:', err);
        alert('Có lỗi xảy ra khi sao chép liên kết.');
      });
  };

  const handleCopyExcel = () => {
    if (filteredRsvps.length === 0) {
      alert("Không có khách mời nào để sao chép!");
      return;
    }
    
    let text = "STT\tHọ và tên khách\tTrạng thái\tSố người\tKhách của ai\tLời chúc\tThời gian xác nhận\n";
    filteredRsvps.forEach((r, idx) => {
      const statusText = r.status === 'going' ? 'Tham gia' : r.status === 'cannot_attend' ? 'Không tham gia' : 'Chỉ chúc mừng';
      const sideText = r.side === 'groom' ? 'Nhà trai' : r.side === 'bride' ? 'Nhà gái' : 'Cả hai';
      const dateText = new Date(r.created_at).toLocaleString('vi-VN');
      text += `${idx + 1}\t${r.guest_name}\t${statusText}\t${r.guest_count || 0}\t${sideText}\t${r.wish || ''}\t${dateText}\n`;
    });

    navigator.clipboard.writeText(text)
      .then(() => alert("🎉 Đã sao chép danh sách định dạng Excel! Bạn có thể dán (Ctrl+V) trực tiếp vào file Excel."))
      .catch(err => {
        console.error('Copy failed:', err);
        alert("Lỗi sao chép, vui lòng copy thủ công bảng danh sách.");
      });
  };

  const filteredRsvps = rsvps.filter(r => {
    const matchSearch = r.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (r.wish && r.wish.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSide = filterSide === 'all' || r.side === filterSide;
    return matchSearch && matchStatus && matchSide;
  });

  const totalAttendingGuests = rsvps
    .filter(r => r.status === 'going')
    .reduce((sum, r) => sum + (r.guest_count || 1), 0);

  const totalAttendingForms = rsvps.filter(r => r.status === 'going').length;
  const totalCannotAttend = rsvps.filter(r => r.status === 'cannot_attend').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>💒</div>
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang tải công cụ thiết lập thiệp cưới...</p>
      </div>
    );
  }

  return (
    <div className="wedding-creator-container">
      
      {/* Top Banner */}
      <header className="creator-header glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="creator-title">💒 Thiết Kế Thiệp Cưới Của Riêng Bạn</h1>
            <p className="creator-subtitle">Quản lý bưu thiếp cưới điện tử lãng mạn &amp; Bảng theo dõi RSVP của riêng bạn.</p>
          </div>
          
          <button className="btn btn-secondary" onClick={onBack}>
            ← Quay về Trang chủ
          </button>
        </div>

        {/* Shareable Link Card */}
        <div className="shareable-link-card">
          <div className="share-info">
            <span className="share-label">🔗 Liên kết chia sẻ thiệp của bạn:</span>
            <input 
              type="text" 
              readOnly 
              value={shareableUrl} 
              className="share-url-input" 
              onClick={(e) => e.target.select()}
            />
          </div>
          
          <div className="share-actions">
            <button 
              type="button" 
              onClick={handleCopyLink} 
              className={`btn ${copySuccess ? 'btn-success' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
            >
              {copySuccess ? '🎉 Đã sao chép!' : '📋 Sao Chép Liên Kết'}
            </button>
            <a 
              href={`/thiep-cuoi/${weddingId}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1.5px solid var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 'bold' }}
            >
              👁️ Xem Thiệp Mời
            </a>
          </div>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Thiết lập Thiệp Cưới
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rsvp' ? 'active' : ''}`}
            onClick={() => setActiveTab('rsvp')}
          >
            📊 Quản lý Khách mời ({rsvps.length})
          </button>
        </div>
      </header>

      {/* Settings Panel Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="creator-main-form">
          
          {/* Main Info Columns */}
          <div className="form-grid">
            
            {/* Column 1: Core couple details */}
            <div className="form-card glass-panel">
              <h3 className="card-sec-title">🌸 Thông Tin Cặp Đôi &amp; Cha Mẹ</h3>
              
              <div className="form-group">
                <label>Họ &amp; Tên Chú Rể: *</label>
                <input 
                  type="text" 
                  name="groom_name" 
                  value={formData.groom_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Tên bố mẹ chú rể (Nhà Trai):</label>
                <input 
                  type="text" 
                  name="groom_parents" 
                  placeholder="Ví dụ: Ông Lê Văn A & Bà Nguyễn Thị B" 
                  value={formData.groom_parents} 
                  onChange={handleChange} 
                />
              </div>

              <hr className="form-divider" />

              <div className="form-group">
                <label>Họ &amp; Tên Cô Dâu: *</label>
                <input 
                  type="text" 
                  name="bride_name" 
                  value={formData.bride_name} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Tên bố mẹ cô dâu (Nhà Gái):</label>
                <input 
                  type="text" 
                  name="bride_parents" 
                  placeholder="Ví dụ: Ông Hoàng Văn C & Bà Trần Thị D" 
                  value={formData.bride_parents} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            {/* Column 2: Date & Location */}
            <div className="form-card glass-panel">
              <h3 className="card-sec-title">📅 Thời Gian &amp; Địa Điểm Lễ Thành Hôn</h3>
              
              <div className="form-group">
                <label>Thời gian tổ chức lễ cưới: *</label>
                <input 
                  type="datetime-local" 
                  name="wedding_date" 
                  value={formData.wedding_date} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Địa điểm Lễ Vu Quy (Nhà Gái / Nhà Trai):</label>
                <textarea 
                  name="ceremony_address" 
                  rows={2} 
                  placeholder="Địa chỉ tổ chức nghi lễ chính thức..."
                  value={formData.ceremony_address} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">
                <label>Đường dẫn Google Maps Lễ Vu Quy:</label>
                <input 
                  type="url" 
                  name="ceremony_maps_url" 
                  placeholder="Dán link Google Maps chia sẻ địa điểm..." 
                  value={formData.ceremony_maps_url} 
                  onChange={handleChange} 
                />
              </div>

              <hr className="form-divider" />

              <div className="form-group">
                <label>Địa điểm Tiệc Cưới: *</label>
                <textarea 
                  name="banquet_address" 
                  rows={2} 
                  placeholder="Địa điểm đãi khách, nhà hàng tiệc cưới..."
                  value={formData.banquet_address} 
                  onChange={handleChange} 
                  required
                />
              </div>

              <div className="form-group">
                <label>Đường dẫn Google Maps Nhà hàng Tiệc cưới:</label>
                <input 
                  type="url" 
                  name="banquet_maps_url" 
                  placeholder="Dán link Google Maps tiệc cưới..." 
                  value={formData.banquet_maps_url} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            {/* Column 3: Custom bank details (VietQR standard generation) */}
            <div className="form-card glass-panel">
              <h3 className="card-sec-title">🎁 Hộp Mừng Cưới (VietQR Tự Động)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                Hệ thống tự động sinh mã VietQR chất lượng cao cho phong bì mừng cưới online.
              </p>

              <div className="bank-section-flex">
                <div className="bank-block">
                  <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>💰 Chú Rể</h4>
                  <div className="form-group">
                    <label>Ngân hàng:</label>
                    <select name="groom_bank" value={formData.groom_bank} onChange={handleChange}>
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Số tài khoản:</label>
                    <input type="text" name="groom_account_number" value={formData.groom_account_number} onChange={handleChange} placeholder="STK ngân hàng..." />
                  </div>
                  <div className="form-group">
                    <label>Tên tài khoản (Không dấu):</label>
                    <input type="text" name="groom_account_name" value={formData.groom_account_name} onChange={handleChange} placeholder="LE ANH TUAN" />
                  </div>
                </div>

                <div className="bank-block">
                  <h4 style={{ color: '#ec4899', fontSize: '0.9rem', marginBottom: '0.5rem' }}>💰 Cô Dâu</h4>
                  <div className="form-group">
                    <label>Ngân hàng:</label>
                    <select name="bride_bank" value={formData.bride_bank} onChange={handleChange}>
                      {POPULAR_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Số tài khoản:</label>
                    <input type="text" name="bride_account_number" value={formData.bride_account_number} onChange={handleChange} placeholder="STK ngân hàng..." />
                  </div>
                  <div className="form-group">
                    <label>Tên tài khoản (Không dấu):</label>
                    <input type="text" name="bride_account_name" value={formData.bride_account_name} onChange={handleChange} placeholder="HOANG HOAI MINH" />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 4: Themes & Custom Music */}
            <div className="form-card glass-panel">
              <h3 className="card-sec-title">🎨 Tùy chọn Giao diện &amp; Lời mời</h3>
              
              <div className="form-group">
                <label>Lời mời gửi khách (Thư ngỏ):</label>
                <textarea 
                  name="invitation_message" 
                  rows={4} 
                  value={formData.invitation_message} 
                  onChange={handleChange} 
                  placeholder="Viết thư mời ngỏ gửi đến quý vị quan khách..."
                />
              </div>

              <div className="form-group">
                <label>🎵 Chọn nhạc nền phát khi mở thiệp:</label>
                <select 
                  value={MUSIC_PRESETS.some(p => p.url === formData.music_url && p.url !== "custom") ? formData.music_url : "custom"} 
                  onChange={handleMusicPresetChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: (!MUSIC_PRESETS.some(p => p.url === formData.music_url && p.url !== "custom")) ? '0.75rem' : '0'
                  }}
                >
                  {MUSIC_PRESETS.map((preset, idx) => (
                    <option key={idx} value={preset.url}>
                      {preset.name}
                    </option>
                  ))}
                </select>

                {(!MUSIC_PRESETS.some(p => p.url === formData.music_url && p.url !== "custom")) && (
                  <input 
                    type="url" 
                    name="music_url" 
                    value={formData.music_url} 
                    onChange={handleChange} 
                    placeholder="Nhập liên kết nhạc MP3 (https://...) của riêng bạn..." 
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Chọn Theme phong cách trang trí:</label>
                <div className="theme-grid">
                  {THEMES.map(theme => (
                    <div 
                      key={theme.id}
                      className={`theme-card ${formData.theme === theme.id ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
                    >
                      <div className="theme-card-header">{theme.name}</div>
                      <div className="theme-card-desc">{theme.desc}</div>
                      {formData.theme === theme.id && <span className="theme-badge-check">✓ Đang Chọn</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Section 5: Album ảnh cưới phân bổ hài hòa (Tải lên nhiều ảnh) */}
          <div className="form-card glass-panel" style={{ width: '100%', marginTop: '1rem' }}>
            <h3 className="card-sec-title">📸 Album Ảnh Cưới Của Hai Bạn (Tối đa 4 ảnh phân bổ hài hòa)</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
              Hãy tải lên 4 bức ảnh cưới đẹp nhất của hai bạn. Hệ thống sẽ tự động nén kích thước nhỏ gọn và sắp xếp chúng ở các vị trí có bố cục nghệ thuật, hài hòa trên trang thiệp cưới mời khách.
            </p>

            <div className="photos-upload-grid">
              {PHOTO_SLOTS.map((slot) => {
                const photoSrc = formData.wedding_photos[slot.idx] || '';
                return (
                  <div key={slot.idx} className="photo-upload-card">
                    <h4 className="photo-card-title">{slot.title}</h4>
                    <p className="photo-card-label">{slot.label}</p>
                    
                    <div className="photo-actions-flex">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id={`uploader-${slot.idx}`}
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageUpload(slot.idx, e)}
                      />
                      <label 
                        htmlFor={`uploader-${slot.idx}`} 
                        className="btn btn-secondary"
                        style={{ 
                          cursor: 'pointer', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.3rem', 
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          padding: '0.5rem 0.8rem',
                          borderRadius: '8px',
                          border: '1px solid var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          margin: 0
                        }}
                      >
                        📸 Chọn Ảnh
                      </label>
                      {photoSrc && (
                        <button 
                          type="button" 
                          className="btn btn-danger" 
                          style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px', height: '32px' }}
                          onClick={() => handlePhotoUrlChange(slot.idx, '')}
                        >
                          🗑️ Xóa
                        </button>
                      )}
                    </div>

                    <input 
                      type="url" 
                      placeholder="Hoặc dán liên kết ảnh cưới online..." 
                      value={photoSrc.startsWith('data:image') ? '' : photoSrc}
                      onChange={(e) => handlePhotoUrlChange(slot.idx, e.target.value)}
                      style={{ fontSize: '0.78rem', padding: '0.5rem', marginTop: '0.5rem', width: '100%' }}
                    />

                    {/* Preview slot */}
                    {photoSrc ? (
                      <div className="photo-upload-preview">
                        <img src={photoSrc} alt={`Preview slot ${slot.idx + 1}`} />
                      </div>
                    ) : (
                      <div className="photo-upload-empty">
                        <span>Chưa có ảnh ở slot này</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="creator-footer-bar glass-panel">
            {saveStatus === 'success' && <span className="save-status-msg success">🎉 Đã lưu cấu hình thiệp cưới thành công!</span>}
            {saveStatus === 'error' && <span className="save-status-msg error">❌ Lỗi lưu dữ liệu. Vui lòng thử lại.</span>}
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ minWidth: '180px', fontSize: '1rem', padding: '0.8rem 2rem' }}
            >
              {saving ? '⏳ Đang lưu...' : '💾 Lưu Thiết Lập Thiệp Cưới'}
            </button>
          </div>

        </form>
      )}

      {/* RSVP Manager Panel Tab */}
      {activeTab === 'rsvp' && (
        <div className="rsvp-manager-panel">
          
          {/* Quick Metrics */}
          <div className="metrics-grid">
            <div className="metric-card glass-panel border-rose">
              <span className="metric-icon">💚</span>
              <div className="metric-data">
                <span className="metric-value">{totalAttendingGuests} người</span>
                <span className="metric-label">Tổng khách sẽ đến tiệc</span>
              </div>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-icon">💌</span>
              <div className="metric-data">
                <span className="metric-value">{totalAttendingForms} thiệp</span>
                <span className="metric-label">Xác nhận có mặt</span>
              </div>
            </div>
            <div className="metric-card glass-panel">
              <span className="metric-icon">💔</span>
              <div className="metric-data">
                <span className="metric-value">{totalCannotAttend} người</span>
                <span className="metric-label">Tiếc nuối vắng mặt</span>
              </div>
            </div>
          </div>

          {/* Filters Area */}
          <div className="rsvp-filters-bar glass-panel">
            <div className="form-group flex-1">
              <label>Tìm kiếm khách mời:</label>
              <input 
                type="text" 
                placeholder="Nhập họ tên hoặc lời chúc cần tìm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="form-group width-160">
              <label>Bộ lọc tham gia:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="going">Sẽ đến tiệc 🥳</option>
                <option value="cannot_attend">Tiếc vắng mặt 🥺</option>
                <option value="wish_only">Chỉ chúc mừng 💖</option>
              </select>
            </div>

            <div className="form-group width-160">
              <label>Khách của ai:</label>
              <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)}>
                <option value="all">Tất cả khách mời</option>
                <option value="groom">Chú rể</option>
                <option value="bride">Cô dâu</option>
                <option value="both">Khách chung cả hai</option>
              </select>
            </div>

            <button 
              className="btn btn-secondary btn-copy-excel"
              onClick={handleCopyExcel}
              title="Sao chép toàn bộ danh sách để paste trực tiếp vào Excel"
            >
              📋 Xuất Excel
            </button>
          </div>

          {/* RSVPs Table list */}
          <div className="table-responsive glass-panel">
            {filteredRsvps.length === 0 ? (
              <p className="no-data-msg">Không có khách mời nào khớp với tiêu chí tìm kiếm của bạn. 🔍</p>
            ) : (
              <table className="rsvp-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ &amp; Tên Khách</th>
                    <th>Trạng Thái</th>
                    <th>Khách đi cùng</th>
                    <th>Khách của ai</th>
                    <th style={{ width: '40%' }}>Lời Chúc Phúc</th>
                    <th>Thời gian gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRsvps.map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold' }}>{r.guest_name}</td>
                      <td>
                        {r.status === 'going' ? (
                          <span className="rsvp-badge badge-success">Sẽ đến 🥳</span>
                        ) : r.status === 'cannot_attend' ? (
                          <span className="rsvp-badge badge-danger">Vắng mặt 🥺</span>
                        ) : (
                          <span className="rsvp-badge badge-info">Chỉ chúc mừng 💖</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {r.status === 'going' ? `${r.guest_count} người` : '-'}
                      </td>
                      <td>
                        {r.side === 'groom' ? (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Nhà trai</span>
                        ) : r.side === 'bride' ? (
                          <span style={{ color: '#ec4899', fontWeight: 500 }}>Nhà gái</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Cả hai</span>
                        )}
                      </td>
                      <td className="wish-cell" title={r.wish}>
                        {r.wish ? `“ ${r.wish} ”` : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Không có lời chúc</span>}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString('vi-VN')} {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Styled sheets specific for creators dashboard */}
      <style dangerouslySetInnerHTML={{__html: `
        .wedding-creator-container {
          padding: 1.5rem 0.5rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .creator-header {
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .creator-title {
          font-size: 1.6rem;
          font-weight: 800;
          margin-bottom: 0.3rem;
          background: linear-gradient(135deg, var(--accent-primary) 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .creator-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        /* Shareable Link Card */
        .shareable-link-card {
          background: rgba(244, 63, 94, 0.05);
          border: 1px dashed rgba(244, 63, 94, 0.3);
          border-radius: 16px;
          padding: 1.2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .share-info {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
          min-width: 280px;
        }

        .share-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--accent-primary);
        }

        .share-url-input {
          background: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(244, 63, 94, 0.2) !important;
          border-radius: 8px !important;
          padding: 0.5rem 0.75rem !important;
          font-family: monospace !important;
          font-size: 0.85rem !important;
          color: #be123c !important;
          font-weight: 600;
          width: 100%;
        }
        
        [data-theme='dark'] .share-url-input {
          background: rgba(15, 23, 42, 0.7) !important;
          color: #f43f5e !important;
        }

        .share-actions {
          display: flex;
          gap: 0.5rem;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
        }

        .tab-btn {
          background: transparent;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          font-weight: 700;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(244, 63, 94, 0.05);
          color: var(--accent-primary);
        }

        .tab-btn.active {
          background: var(--accent-primary);
          color: white;
        }

        .creator-main-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-card {
          padding: 1.75rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .card-sec-title {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          border-left: 4px solid var(--accent-primary);
          padding-left: 0.6rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.7rem 0.9rem;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
        }

        .form-divider {
          border: none;
          border-top: 1px dashed var(--border-color);
          margin: 0.5rem 0;
        }

        /* Bank Block styles */
        .bank-section-flex {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .bank-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Themes selection */
        .theme-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .theme-card {
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          background: rgba(255, 255, 255, 0.01);
        }

        .theme-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          background: rgba(244, 63, 94, 0.02);
        }

        .theme-card.selected {
          border-color: var(--accent-primary);
          background: rgba(244, 63, 94, 0.05);
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.06);
        }

        .theme-card-header {
          font-weight: 700;
          font-size: 0.9rem;
          margin-bottom: 0.3rem;
        }

        .theme-card-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .theme-badge-check {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          font-size: 0.75rem;
          color: var(--accent-primary);
          font-weight: 700;
          background: rgba(244, 63, 94, 0.1);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }

        /* Photos upload list */
        .photos-upload-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }

        .photo-upload-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
        }

        .photo-card-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 0.2rem;
        }

        .photo-card-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          line-height: 1.3;
          margin-bottom: 0.8rem;
          min-height: 32px;
        }

        .photo-actions-flex {
          display: flex;
          gap: 0.4rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .photo-upload-preview {
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: 10px;
          overflow: hidden;
          margin-top: 0.6rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .photo-upload-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-upload-empty {
          width: 100%;
          aspect-ratio: 4 / 3;
          border: 2px dashed var(--border-color);
          border-radius: 10px;
          margin-top: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          color: var(--text-muted);
          text-align: center;
          padding: 0.5rem;
        }

        /* Save bar footer */
        .creator-footer-bar {
          padding: 1.2rem;
          border-radius: 20px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1.5rem;
          position: sticky;
          bottom: 1rem;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .save-status-msg {
          font-size: 0.9rem;
          font-weight: 700;
        }

        .save-status-msg.success { color: #10b981; }
        .save-status-msg.error { color: #f43f5e; }

        /* RSVP dashboard */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .metric-card {
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          transition: all 0.3s;
        }
        
        .metric-card.border-rose {
          border: 1px solid rgba(244, 63, 94, 0.3);
          background: rgba(244, 63, 94, 0.02);
        }

        .metric-card:hover {
          transform: translateY(-3px);
        }

        .metric-icon {
          font-size: 2rem;
        }

        .metric-data {
          display: flex;
          flex-direction: column;
        }

        .metric-value {
          font-size: 1.35rem;
          font-weight: 800;
        }

        .metric-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .rsvp-filters-bar {
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .flex-1 { flex: 1; min-width: 200px; }
        .width-160 { width: 160px; }

        .btn-copy-excel {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
          font-weight: 700;
          padding: 0.7rem 1.25rem;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-copy-excel:hover {
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.35) !important;
          transform: translateY(-1px);
        }

        /* RSVPs Table */
        .table-responsive {
          border-radius: 16px;
          padding: 1rem;
          overflow-x: auto;
        }

        .rsvp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .rsvp-table th,
        .rsvp-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .rsvp-table th {
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .rsvp-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.015);
        }

        .rsvp-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }

        .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .badge-danger { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
        .badge-info { background: rgba(129, 140, 248, 0.1); color: #818cf8; }

        .wish-cell {
          max-width: 320px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-style: italic;
        }

        .no-data-msg {
          text-align: center;
          padding: 3rem;
          color: var(--text-muted);
          font-style: italic;
        }

        /* Responsive */
        @media (max-width: 1000px) {
          .photos-upload-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 900px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .rsvp-filters-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .width-160 { width: 100%; }
        }

        @media (max-width: 768px) {
          .bank-section-flex {
            grid-template-columns: 1fr; /* Stack Groom & Bride bank accounts vertically on mobile */
            gap: 1.25rem;
          }
          .theme-grid {
            grid-template-columns: 1fr; /* Stack Theme selection cards vertically */
            gap: 0.8rem;
          }
          .creator-footer-bar {
            position: static; /* Unstick footer bar on mobile to allow natural scroll */
            flex-direction: column-reverse;
            align-items: stretch;
            text-align: center;
            padding: 1.2rem 1rem;
            gap: 0.8rem;
          }
          .tab-navigation {
            flex-wrap: wrap; /* Wrap tabs cleanly on mobile */
            gap: 0.4rem;
          }
          .tab-btn {
            flex: 1;
            min-width: 130px;
            text-align: center;
            padding: 0.6rem 0.8rem;
            font-size: 0.82rem;
          }
        }

        @media (max-width: 600px) {
          .photos-upload-grid {
            grid-template-columns: 1fr;
          }
          .shareable-link-card {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
          }
          .share-info {
            min-width: 100%;
          }
          .share-actions {
            flex-direction: column;
            width: 100%;
          }
          .share-actions .btn {
            width: 100%;
            justify-content: center;
          }
          .creator-header {
            padding: 1rem;
            border-radius: 12px;
          }
          .form-card {
            padding: 1.2rem;
            border-radius: 12px;
          }
          .creator-title {
            font-size: 1.3rem;
            text-align: center;
          }
          .creator-subtitle {
            font-size: 0.82rem;
            text-align: center;
            margin-bottom: 0.5rem;
          }
          .creator-header button.btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }
      `}} />

    </div>
  );
}
