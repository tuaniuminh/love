import React, { useState } from 'react';
import supabase from '../supabaseClient';

export default function Auth({ onAuthSuccess, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getHeaderTitle = () => {
    if (mode === 'signup') return 'Đăng Ký Tài Khoản';
    if (mode === 'forgot') return 'Khôi Phục Mật Khẩu';
    if (mode === 'reset') return 'Đặt Lại Mật Khẩu';
    return 'Đăng Nhập';
  };

  const getSubmitButtonText = () => {
    if (loading) return 'Đang xử lý...';
    if (mode === 'signup') return 'Đăng Ký';
    if (mode === 'forgot') return 'Gửi Link Khôi Phục';
    if (mode === 'reset') return 'Cập Nhật Mật Khẩu';
    return 'Đăng Nhập';
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email!');
      return;
    }

    setLoading(true);

    try {
      if (supabase.isMock) {
        const mockUsers = JSON.parse(localStorage.getItem('tm_mock_users') || '[]');
        const user = mockUsers.find(u => u.email === email);
        if (!user) {
          throw new Error('Email này chưa được đăng ký trong hệ thống!');
        }
        
        setSuccessMsg(`[MOCK MODE] Tìm thấy tài khoản! Mật khẩu hiện tại của bạn là: "${user.password}". Hệ thống giả lập tự động đưa bạn đến trang Đặt Lại Mật Khẩu.`);
        setTimeout(() => {
          setMode('reset');
          setSuccessMsg('');
        }, 3000);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/'}`
        });

        if (error) throw error;
        setSuccessMsg('Đã gửi link khôi phục mật khẩu vào Email của bạn! Vui lòng kiểm tra hộp thư (cả thư rác/spam).');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi yêu cầu khôi phục mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin mật khẩu mới!');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    // Password strength check
    const strengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!strengthRegex.test(password)) {
      setErrorMsg('Mật khẩu chưa đủ mạnh! Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất: 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.');
      return;
    }

    setLoading(true);

    try {
      if (supabase.isMock) {
        const mockUsers = JSON.parse(localStorage.getItem('tm_mock_users') || '[]');
        const userIdx = mockUsers.findIndex(u => u.email === email);
        if (userIdx >= 0) {
          mockUsers[userIdx].password = password;
          localStorage.setItem('tm_mock_users', JSON.stringify(mockUsers));
          
          const sessionUser = JSON.parse(localStorage.getItem('tm_session_user') || 'null');
          if (sessionUser && sessionUser.email === email) {
            sessionUser.password = password;
            localStorage.setItem('tm_session_user', JSON.stringify(sessionUser));
          }
        }
        setSuccessMsg('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccessMsg('');
        }, 2000);
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        
        setSuccessMsg('Đặt lại mật khẩu thành công! Hãy đăng nhập lại bằng mật khẩu mới.');
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đặt lại mật khẩu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'forgot') {
      return handleForgotPassword(e);
    }
    if (mode === 'reset') {
      return handleResetPassword(e);
    }

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu!');
      return;
    }

    const isSignUp = mode === 'signup';

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp!');
        return;
      }
      const strengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
      if (!strengthRegex.test(password)) {
        setErrorMsg('Mật khẩu chưa đủ mạnh! Mật khẩu phải có ít nhất 6 ký tự, bao gồm ít nhất: 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt.');
        return;
      }
    } else {
      if (password.length < 6) {
        setErrorMsg('Mật khẩu phải dài ít nhất 6 ký tự!');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'Học viên'
            }
          }
        });

        if (error) throw error;
        
        if (supabase.isMock) {
          setSuccessMsg('Đăng ký tài khoản thành công! Bạn đã tự động đăng nhập.');
          setTimeout(() => {
            onAuthSuccess(data.user);
            if (onClose) onClose();
          }, 1500);
        } else if (!data.session) {
          setSuccessMsg('Đăng ký thành công! Một email xác nhận đã được gửi đến hòm thư của bạn. Vui lòng kiểm tra email (bao gồm cả thư rác/Spam) và nhấp vào liên kết xác nhận để kích hoạt tài khoản.');
          setPassword('');
          setConfirmPassword('');
        } else {
          setSuccessMsg('Đăng ký tài khoản thành công! Bạn đã tự động đăng nhập.');
          setTimeout(() => {
            onAuthSuccess(data.user);
            if (onClose) onClose();
          }, 1500);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          onAuthSuccess(data.user);
          if (onClose) onClose();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình xác thực!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {getHeaderTitle()}
          </h2>
          {onClose && (
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <span>✅</span>
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleAuth}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Họ và Tên</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={mode === 'signup'}
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="form-group">
              <label className="form-label">Địa chỉ Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">
                Mật khẩu mới {mode === 'signup' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Hoa, thường, số, ký tự đặc biệt)</span>}
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-input"
                placeholder="******"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={mode === 'signup' || mode === 'reset'}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
            disabled={loading}
          >
            {getSubmitButtonText()}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          {mode === 'login' && (
            <>
              <div style={{ color: 'var(--text-secondary)' }}>
                Chưa có tài khoản?{' '}
                <button
                  className="btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    padding: '0 0.2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Đăng ký ngay
                </button>
              </div>
              <button
                className="btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => {
                  setMode('forgot');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Quên mật khẩu? 🤔
              </button>
            </>
          )}

          {mode === 'signup' && (
            <div style={{ color: 'var(--text-secondary)' }}>
              Đã có tài khoản?{' '}
              <button
                className="btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  padding: '0 0.2rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Đăng nhập ngay
              </button>
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              className="btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              ⬅ Quay lại Đăng Nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
