import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import ThemeToggle from './components/ThemeToggle';
import Auth from './components/Auth';
import MemoryCorner from './components/MemoryCorner';
import './App.css';

const ALLOWED_COUPLE_EMAILS = import.meta.env.VITE_ALLOWED_COUPLE_EMAILS
  ? import.meta.env.VITE_ALLOWED_COUPLE_EMAILS.split(',').map(email => email.trim())
  : [];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [currentView, setCurrentView] = useState('memory');
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle' | 'checking' | 'latest' | 'available'

  // Đăng ký Service Worker và quản lý cập nhật (PWA)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const swUrl = `${baseUrl}sw.js`;
      
      navigator.serviceWorker.register(swUrl)
        .then(reg => {
          console.log('PWA Service Worker registered successfully!');
          setSwRegistration(reg);

          // Phát hiện có Service Worker mới đang chờ kích hoạt
          if (reg.waiting) {
            setUpdateAvailable(true);
            setUpdateStatus('available');
          }

          // Theo dõi các bản cập nhật mới được tải về
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  setUpdateStatus('available');
                }
              });
            }
          });
        })
        .catch(err => {
          console.warn('PWA Service Worker registration failed:', err);
        });

      // Tự động tải lại trang khi Service Worker mới chính thức hoạt động
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleCheckUpdate = async () => {
    if (!('serviceWorker' in navigator)) {
      alert('Trình duyệt của bạn chưa hỗ trợ ứng dụng PWA!');
      return;
    }
    
    if (swRegistration) {
      try {
        setUpdateStatus('checking');
        console.log('Checking for service worker updates...');
        
        // Simulating artificial delay for smooth visual transition
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await swRegistration.update();
        
        if (swRegistration.waiting) {
          setUpdateAvailable(true);
          setUpdateStatus('available');
        } else {
          setUpdateStatus('latest');
          setTimeout(() => {
            setUpdateStatus('idle');
          }, 3000);
        }
      } catch (err) {
        console.error('Failed to check for PWA update:', err);
        setUpdateStatus('idle');
        alert('Không thể kết nối máy chủ để kiểm tra cập nhật. Vui lòng thử lại sau!');
      }
    } else {
      alert('Ứng dụng đang tải tài nguyên, vui lòng thử lại sau giây lát!');
    }
  };

  const handleApplyUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

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
    setCurrentView('memory');
  };

  const isCouple = user && ALLOWED_COUPLE_EMAILS.includes(user.email);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-text">Linh Tuấn</span>
          <span className="brand-heart">❤️</span>
          <span className="brand-text">Ngô Minh</span>
        </div>
        
        <div className="nav-actions">
          <ThemeToggle />
          
          {user && isCouple && ALLOWED_COUPLE_EMAILS[0] === user.email && (
            <button 
              onClick={() => setCurrentView(prev => prev === 'memory' ? 'admin' : 'memory')} 
              className="btn-logout"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              {currentView === 'memory' ? '📊 Quản lý' : '❤️ Kỷ niệm'}
            </button>
          )}
          
          {user ? (
            <button onClick={handleLogout} className="btn-logout">
              Đăng xuất
            </button>
          ) : (
            <button onClick={() => { setAuthInitialMode('login'); setShowAuthModal(true); }} className="btn btn-primary" style={{ borderRadius: '50px', padding: '0.55rem 1.35rem' }}>
              Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-content">
        {authLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>🔄</div>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang xác thực tài khoản...</p>
          </div>
        ) : user && isCouple ? (
          /* Render Memory Corner directly if logged in as couple */
          <MemoryCorner 
            user={user}
            viewMode={currentView}
            onBack={null}
          />
        ) : (
          /* Otherwise show a beautiful, romantic landing page asking to log in */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem 1rem' }}>
            <div className="glass-panel" style={{ padding: '3.5rem 2.5rem', borderRadius: '28px', maxWidth: '550px', width: '100%', border: '1px solid rgba(244, 63, 94, 0.2)', boxShadow: '0 20px 40px rgba(244, 63, 94, 0.1)' }}>
              <div style={{ fontSize: '4.5rem', animation: 'heartBeat 1.4s infinite', display: 'inline-block', filter: 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.4))', marginBottom: '1.5rem' }}>❤️</div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Linh Tuấn</span>
                <span style={{ fontSize: '1.8rem', animation: 'heartBeat 1.4s infinite', display: 'inline-block' }}>❤️</span>
                <span style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ngô Minh</span>
              </h1>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                Chào mừng bạn đến với Góc Kỷ Niệm Tình Yêu. Vui lòng đăng nhập bằng tài khoản cặp đôi để vào xem nhật ký và đếm ngày yêu thương của hai đứa mình nhé! ❤️
              </p>
              
              {user && !isCouple && (
                <div className="alert alert-danger" style={{ marginBottom: '2rem', textAlign: 'left' }}>
                  ⚠️ Tài khoản <strong>{user.email}</strong> không thuộc danh sách cặp đôi được cấp quyền truy cập. Vui lòng sử dụng tài khoản email phù hợp hoặc liên hệ quản trị viên!
                </div>
              )}
              
              <button 
                onClick={() => { 
                  if (user) {
                    handleLogout();
                  }
                  setAuthInitialMode('login'); 
                  setShowAuthModal(true); 
                }} 
                className="btn btn-primary" 
                style={{ padding: '0.9rem 2.5rem', fontSize: '1.05rem', borderRadius: '50px' }}
              >
                {user ? 'Đăng nhập tài khoản khác 🔄' : 'Đăng nhập vào Góc Kỷ Niệm 🔑'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer>
        <p>© 2026 Linh Tuấn ❤️ Ngô Minh</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Phiên bản v1.3.5 •{' '}
          <button 
            onClick={handleCheckUpdate} 
            className="btn-update-check" 
            disabled={updateStatus === 'checking'}
            title="Kiểm tra xem có bản cập nhật mới hay không"
          >
            {updateStatus === 'idle' && (
              <>
                Kiểm tra cập nhật <span className="pulse-heart" style={{ fontSize: '0.85rem' }}>💖</span>
              </>
            )}
            {updateStatus === 'checking' && (
              <>
                Đang truyền nhịp đập... <span className="pulse-heart" style={{ fontSize: '0.85rem' }}>💓</span>
              </>
            )}
            {updateStatus === 'latest' && (
              <>
                Đã là bản mới nhất! <span className="pulse-heart" style={{ fontSize: '0.85rem' }}>💕</span>
              </>
            )}
            {updateStatus === 'available' && (
              <>
                Đã tìm thấy bản mới! <span style={{ fontSize: '0.85rem' }}>🌟</span>
              </>
            )}
          </button>
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

      {/* PWA Update Toast Notification */}
      {updateAvailable && (
        <div className="pwa-toast-container">
          <div className="pwa-toast">
            <span className="pwa-toast-icon">✨</span>
            <div className="pwa-toast-message">
              Ứng dụng đã có phiên bản mới!
            </div>
            <button className="pwa-toast-btn" onClick={handleApplyUpdate}>
              Cập nhật ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
