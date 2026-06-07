import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import supabase from './supabaseClient';
import ThemeToggle from './components/ThemeToggle';
import Auth from './components/Auth';
import MemoryCorner from './components/MemoryCorner';
import WeddingInvitationView from './components/WeddingInvitationView';
import WeddingInvitationCreator from './components/WeddingInvitationCreator';
import './App.css';

const ALLOWED_COUPLE_EMAILS = import.meta.env.VITE_ALLOWED_COUPLE_EMAILS
  ? import.meta.env.VITE_ALLOWED_COUPLE_EMAILS.split(',').map(email => email.trim())
  : [];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
      }
      setAuthLoading(false);
    }).catch(err => {
      console.error('Auth verification error:', err);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthInitialMode('reset');
        setShowAuthModal(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const isCouple = user && ALLOWED_COUPLE_EMAILS.includes(user.email);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="navbar glass-panel">
        <div className="brand" onClick={() => navigate('/')}>
          ❤️ Linh Tuấn & Ngô Minh
        </div>
        
        <div className="nav-actions">
          <ThemeToggle />
          
          <button 
            onClick={() => {
              if (!user) {
                setAuthInitialMode('login');
                setShowAuthModal(true);
              } else {
                navigate('/tao-thiep');
              }
            }} 
            className="btn btn-secondary"
            style={{ fontWeight: 700, border: '1px solid #db2777', color: '#db2777' }}
          >
            💒 Tạo Thiệp Cưới
          </button>
          
          {user ? (
            <>
              {isCouple && (
                <button 
                  onClick={() => navigate('/ky-niem')} 
                  className="btn btn-secondary"
                  style={{ fontWeight: 700, border: '1px dashed #f43f5e', color: '#f43f5e' }}
                >
                  ❤️ Góc kỷ niệm
                </button>
              )}
              <button onClick={handleLogout} className="btn btn-outline" style={{ fontWeight: 700 }}>
                Đăng xuất
              </button>
            </>
          ) : (
            <button onClick={() => { setAuthInitialMode('login'); setShowAuthModal(true); }} className="btn btn-primary">
              Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-content">
        <Routes>
          {/* LANDING VIEW */}
          <Route path="/" element={
            <div>
              <header className="hero-section">
                <h1 className="hero-title">
                  Chào mừng bạn đến với <br />
                  <span>Không Gian Tình Yêu</span>
                </h1>
                <p className="hero-subtitle">
                  Nơi lưu giữ những khoảnh khắc ngọt ngào nhất của chúng mình và hệ thống tự tay thiết kế thiệp cưới trực tuyến đầy lãng mạn.
                </p>
                {!user && (
                  <button onClick={() => { setAuthInitialMode('signup'); setShowAuthModal(true); }} className="btn btn-primary" style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem' }}>
                    Tạo tài khoản ngay 🚀
                  </button>
                )}
              </header>

              <div className="course-grid">
                {/* Memory Corner Card */}
                <div 
                  className="course-card glass-panel" 
                  onClick={() => {
                    if (!user) {
                      setAuthInitialMode('login');
                      setShowAuthModal(true);
                    } else if (isCouple) {
                      navigate('/ky-niem');
                    } else {
                      alert('Góc kỷ niệm chỉ dành riêng cho cặp đôi được cấp quyền! ❤️');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <h3 className="course-title">❤️ Góc Kỷ Niệm Cặp Đôi</h3>
                  <p className="course-desc">
                    Lưu trữ hành trình tình yêu, đếm số ngày yêu nhau lãng mạn, ghi chép sức khỏe em yêu hàng ngày và phát những bản nhạc ngọt ngào.
                  </p>
                  <div className="course-meta">
                    <span className="course-badge badge-active">Chỉ dành cho Cặp đôi</span>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Truy cập</button>
                  </div>
                </div>

                {/* Wedding Invitation Card */}
                <div 
                  className="course-card glass-panel" 
                  onClick={() => {
                    if (!user) {
                      setAuthInitialMode('login');
                      setShowAuthModal(true);
                    } else {
                      navigate('/tao-thiep');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <h3 className="course-title">💒 Thiệp Cưới & RSVP</h3>
                  <p className="course-desc">
                    Hệ thống tự tạo thiệp cưới online cao cấp với nhạc nền lãng mạn, đếm ngược ngày cưới, xác nhận tham dự (RSVP) trực tuyến và tạo mã VietQR mừng cưới thông minh.
                  </p>
                  <div className="course-meta">
                    <span className="course-badge badge-active" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>Mở rộng rãi</span>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Truy cập</button>
                  </div>
                </div>
              </div>
            </div>
          } />

          {/* LOVE ANNIVERSARY VIEW */}
          <Route path="/ky-niem" element={
            authLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
                <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>🔄</div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang xác thực quyền truy cập...</p>
              </div>
            ) : isCouple ? (
              <MemoryCorner 
                user={user}
                onBack={() => navigate('/')}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />

          {/* WEDDING INVITATION PUBLIC VIEW */}
          <Route path="/thiep-cuoi" element={
            <WeddingInvitationView />
          } />
          <Route path="/thiep-cuoi/:id" element={
            <WeddingInvitationView />
          } />

          {/* WEDDING INVITATION CREATOR */}
          <Route path="/tao-thiep" element={
            authLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
                <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>🔄</div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang xác thực tài khoản...</p>
              </div>
            ) : user ? (
              <WeddingInvitationCreator 
                user={user}
                onBack={() => navigate('/')}
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer>
        <p>© 2026 Linh Tuấn & Ngô Minh. Thiết kế với trọn vẹn yêu thương ❤️</p>
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Hệ thống chạy trên nền tảng Serverless Netlify & Supabase Cloud
        </p>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <Auth 
          initialMode={authInitialMode}
          onAuthSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setShowAuthModal(false);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
