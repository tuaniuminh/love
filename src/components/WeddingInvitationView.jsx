import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../supabaseClient';

const BANK_CODES = {
  "Vietcombank": "VCB",
  "MB Bank": "MB",
  "Techcombank": "TCB",
  "VietinBank": "CTG",
  "BIDV": "BIDV",
  "Agribank": "VBA",
  "ACB": "ACB",
  "TPBank": "TPB",
  "VPBank": "VPB",
  "Sacombank": "STB",
  "HDBank": "HDB",
  "VIB": "VIB"
};

const getBankCode = (bankName) => {
  if (!bankName) return "MB";
  const name = bankName.toLowerCase();
  for (const [key, val] of Object.entries(BANK_CODES)) {
    if (name.includes(key.toLowerCase()) || name.includes(val.toLowerCase())) {
      return val;
    }
  }
  return bankName.toUpperCase().replace(/\s+/g, '');
};

export default function WeddingInvitationView() {
  const { id } = useParams();
  const weddingId = id || 'default';

  const [config, setConfig] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // RSVP Form States
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState('going'); // 'going', 'cannot_attend'
  const [guestCount, setGuestCount] = useState(1);
  const [side, setSide] = useState('both'); // 'groom', 'bride', 'both'
  const [wish, setWish] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Smart VietQR States
  const [senderName, setSenderName] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [senderMemo, setSenderMemo] = useState('');
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);

  // Load specific wedding config and wishes scoped by weddingId
  useEffect(() => {
    const fetchData = async () => {
      try {
        const conf = await supabase.db.getWeddingConfig(weddingId);
        setConfig(conf);
        
        const wishList = await supabase.db.getWishes(weddingId);
        setWishes(wishList);
      } catch (err) {
        console.error('Failed to load wedding details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weddingId]);

  // Countdown timer logic
  useEffect(() => {
    if (!config?.wedding_date) return;
    
    const calculateTime = () => {
      const difference = +new Date(config.wedding_date) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };
    
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config?.wedding_date]);

  // Particle Animation based on theme
  useEffect(() => {
    if (!config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let particles = [];
    const maxParticles = 16;

    // Track mouse cursor for wind/repulsion
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 120
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Spawns explosive particles on click/touch
    const spawnBurst = (x, y) => {
      const theme = config.theme || 'romantic-pink';
      const burstCount = 10;
      for (let i = 0; i < burstCount; i++) {
        const p = new Particle();
        p.x = x;
        p.y = y;
        p.isBurst = true;
        p.opacity = 1.0;
        p.size = Math.random() * 10 + 6;
        // Explode outward in all directions
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        p.speedX = Math.cos(angle) * speed;
        p.speedY = Math.sin(angle) * speed - 1.5; // push slightly upwards
        p.spinSpeed = Math.random() * 6 - 3;
        
        if (theme === 'romantic-pink') {
          p.type = 'heart';
          p.color = `rgba(244, ${Math.floor(Math.random() * 40 + 60)}, ${Math.floor(Math.random() * 50 + 100)}, 1.0)`;
        } else if (theme === 'luxury-gold') {
          p.type = 'sparkle';
          p.color = `rgba(${Math.floor(Math.random() * 30 + 225)}, ${Math.floor(Math.random() * 30 + 200)}, 50, 1.0)`;
        } else if (theme === 'vintage-floral') {
          p.type = 'leaf';
          p.color = `rgba(${Math.floor(Math.random() * 50 + 190)}, ${Math.floor(Math.random() * 40 + 100)}, 50, 1.0)`;
        } else {
          p.type = 'star';
          p.color = `rgba(129, 140, 248, 1.0)`;
        }
        particles.push(p);
      }
    };

    const handleWindowClick = (e) => {
      // Avoid spawning bursts when clicking on form inputs/buttons
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.closest('.gift-qr-container') || e.target.closest('.rsvp-form') || e.target.closest('.vinyl-music-toggle') || e.target.closest('.smart-qr-box')) {
        return;
      }
      spawnBurst(e.clientX, e.clientY);
    };

    const handleWindowTouch = (e) => {
      if (e.touches && e.touches[0]) {
        const touch = e.touches[0];
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.closest('.gift-qr-container') || e.target.closest('.rsvp-form') || e.target.closest('.vinyl-music-toggle') || e.target.closest('.smart-qr-box')) {
          return;
        }
        spawnBurst(touch.clientX, touch.clientY);
      }
    };
    
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('touchstart', handleWindowTouch, { passive: true });
    
    resizeCanvas();
    
    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
        this.isBurst = false;
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.size = Math.random() * 8 + 5;
        this.speedY = Math.random() * 0.8 + 0.4;
        this.speedX = Math.random() * 0.6 - 0.3;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.angle = Math.random() * 360;
        this.spinSpeed = Math.random() * 2 - 1;
        this.isBurst = false;
        
        const theme = config.theme || 'romantic-pink';
        if (theme === 'romantic-pink') {
          this.color = `rgba(244, ${Math.floor(Math.random() * 40 + 100)}, ${Math.floor(Math.random() * 50 + 140)}, ${this.opacity})`;
          this.type = 'petal';
        } else if (theme === 'luxury-gold') {
          this.color = `rgba(${Math.floor(Math.random() * 30 + 225)}, ${Math.floor(Math.random() * 40 + 180)}, ${Math.floor(Math.random() * 30 + 50)}, ${this.opacity})`;
          this.type = 'sparkle';
        } else if (theme === 'vintage-floral') {
          this.color = `rgba(${Math.floor(Math.random() * 50 + 200)}, ${Math.floor(Math.random() * 40 + 110)}, 90, ${this.opacity})`;
          this.type = 'leaf';
        } else {
          this.color = `rgba(224, 231, 255, ${this.opacity})`;
          this.type = 'star';
        }
      }
      
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.angle += this.spinSpeed;

        // Repulsion from mouse cursor (wind effect)
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const forceX = (dx / distance) * force * 5;
          const forceY = (dy / distance) * force * 5;
          this.x += forceX;
          this.y += forceY;
        }
        
        if (this.isBurst) {
          this.opacity -= 0.015; // fade out burst particles
          this.speedX *= 0.96; // drag
          this.speedY *= 0.96;
          if (this.opacity <= 0) {
            return false; // delete burst particle
          }
        } else {
          if (this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20) {
            this.reset();
          }
        }
        return true;
      }
      
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        
        if (this.type === 'petal') {
          ctx.beginPath();
          ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
          ctx.fillStyle = this.isBurst ? this.color : this.color.replace(/[^,)]+\)$/, `${this.opacity})`);
          ctx.fill();
        } else if (this.type === 'heart') {
          // Draw standard romantic heart shape
          ctx.beginPath();
          ctx.moveTo(0, -this.size / 2);
          ctx.bezierCurveTo(-this.size / 2, -this.size, -this.size, -this.size / 2, -this.size, 0);
          ctx.bezierCurveTo(-this.size, this.size / 2, -this.size / 4, this.size, 0, this.size * 1.2);
          ctx.bezierCurveTo(this.size / 4, this.size, this.size, this.size / 2, this.size, 0);
          ctx.bezierCurveTo(this.size, -this.size / 2, this.size / 2, -this.size, 0, -this.size / 2);
          ctx.fillStyle = this.color.replace(/[^,)]+\)$/, `${this.opacity})`);
          ctx.fill();
        } else if (this.type === 'sparkle') {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            ctx.lineTo(0, -this.size);
            ctx.lineTo(this.size / 4, -this.size / 4);
            ctx.rotate(Math.PI / 2);
          }
          ctx.closePath();
          ctx.fillStyle = this.isBurst ? this.color : this.color.replace(/[^,)]+\)$/, `${this.opacity})`);
          ctx.shadowBlur = this.isBurst ? 15 : 10;
          ctx.shadowColor = 'rgba(253, 224, 71, 0.6)';
          ctx.fill();
        } else if (this.type === 'leaf') {
          // Beautiful falling leaf shape
          ctx.beginPath();
          ctx.moveTo(0, -this.size);
          ctx.quadraticCurveTo(-this.size / 2, 0, 0, this.size);
          ctx.quadraticCurveTo(this.size / 2, 0, 0, -this.size);
          ctx.fillStyle = this.isBurst ? this.color : this.color.replace(/[^,)]+\)$/, `${this.opacity})`);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 3, 0, 2 * Math.PI);
          ctx.fillStyle = this.isBurst ? this.color : this.color.replace(/[^,)]+\)$/, `${this.opacity})`);
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#e0e7ff';
          ctx.fill();
        }
        ctx.restore();
      }
    }
    
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter(p => {
        const keep = p.update();
        if (keep) {
          p.draw();
        }
        return keep;
      });

      // Maintain baseline regular particle count
      const regularCount = particles.filter(p => !p.isBurst).length;
      if (regularCount < maxParticles) {
        particles.push(new Particle());
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('touchstart', handleWindowTouch);
      cancelAnimationFrame(animationFrameId);
    };
  }, [config, loading]);

  // Audio initialize & Autoplay
  useEffect(() => {
    if (!config) return;
    
    let defaultSrc = config.music_url || '/mot-doi.mp3';
    if (defaultSrc === '/mot-nha.mp3') {
      defaultSrc = '/mot-doi.mp3';
    }
    const audio = new Audio(defaultSrc);
    audio.loop = true;
    audioRef.current = audio;
    
    audio.onerror = () => {
      console.warn(`Could not load wedding music (${defaultSrc}).`);
      setIsPlaying(false);
    };

    const handleFirstInteraction = () => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log("Autoplay waiting for click interaction.", err));
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    
    return () => {
      audio.pause();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [config]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Play error:", err));
    }
  };

  const handleSubmitRSVP = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await supabase.db.saveRSVP(weddingId, {
        guest_name: guestName,
        status,
        guest_count: status === 'going' ? guestCount : 0,
        side,
        wish
      });
      
      if (res.error) throw res.error;
      
      const wishList = await supabase.db.getWishes(weddingId);
      setWishes(wishList);
      
      setSubmitSuccess(true);
      setSenderName(guestName); // Đồng bộ tự động tên sang Hộp Mừng Cưới
      setGuestName('');
      setWish('');
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Có lỗi xảy ra khi gửi xác nhận. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="wedding-loading">
        <div className="wedding-spinner">❤️</div>
        <p>Đang trải thảm đỏ đón chào khách quý...</p>
      </div>
    );
  }

  const themeClass = config?.theme || 'romantic-pink';
  
  const weddingDateObj = new Date(config.wedding_date);
  const formattedDayOfWeek = weddingDateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
  const formattedDate = weddingDateObj.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = weddingDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const getAmount = () => {
    if (selectedAmount === 'custom') {
      return parseInt(customAmount.replace(/\D/g, '')) || 0;
    }
    return selectedAmount || 0;
  };

  const getMemo = () => {
    // Chuẩn hóa không dấu để tránh lỗi quét mã trên app ngân hàng Việt Nam
    const cleanName = senderName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9\s]/g, "");
    const cleanMemo = senderMemo.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9\s]/g, "");
    
    let text = "Mung cuoi";
    if (cleanName) text += ` ${cleanName}`;
    if (cleanMemo) text += ` ${cleanMemo}`;
    return text.substring(0, 50); // Giới hạn ký tự ngân hàng
  };

  const groomQR = `https://img.vietqr.io/image/${getBankCode(config.groom_bank)}-${config.groom_account_number}-compact2.png?amount=${getAmount()}&addInfo=${encodeURIComponent(getMemo())}&accountName=${encodeURIComponent(config.groom_account_name)}`;
  const brideQR = `https://img.vietqr.io/image/${getBankCode(config.bride_bank)}-${config.bride_account_number}-compact2.png?amount=${getAmount()}&addInfo=${encodeURIComponent(getMemo())}&accountName=${encodeURIComponent(config.bride_account_name)}`;

  // Multi photos retrieve
  const photos = config.wedding_photos || ['', '', '', ''];
  const photo1 = photos[0] || config.wedding_photo || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800';
  const photo2 = photos[1] || '';
  const photo3 = photos[2] || '';
  const photo4 = photos[3] || '';

  return (
    <div className={`wedding-invitation-page ${themeClass}`}>
      <canvas ref={canvasRef} className="falling-canvas" />

      {/* Floating play/pause vinyl */}
      <button 
        className={`vinyl-music-toggle ${isPlaying ? 'playing' : ''}`}
        onClick={togglePlay}
        title={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền lãng mạn"}
      >
        <div className="vinyl-disk">
          <div className="vinyl-center">❤️</div>
        </div>
      </button>

      {/* Hero Welcome banner */}
      <section className="invitation-hero">
        <div className="hearts-cluster">💖 ✨ 💖</div>
        <p className="couple-badge">WEDDING INVITATION</p>
        <h1 className="couple-title-main">
          {config.groom_name} <br />
          <span className="and-symbol">&amp;</span> <br />
          {config.bride_name}
        </h1>
        <p className="hero-announcement">
          Trân trọng kính mời quý khách tới tham dự lễ thành hôn của chúng mình!
        </p>
        
        <div className="countdown-container">
          <p className="countdown-title">🔔 Đếm ngược ngày vui chung đôi</p>
          <div className="countdown-grid">
            <div className="countdown-card">
              <span className="count-num">{timeLeft.days}</span>
              <span className="count-unit">Ngày</span>
            </div>
            <div className="countdown-card">
              <span className="count-num">{timeLeft.hours}</span>
              <span className="count-unit">Giờ</span>
            </div>
            <div className="countdown-card">
              <span className="count-num">{timeLeft.minutes}</span>
              <span className="count-unit">Phút</span>
            </div>
            <div className="countdown-card">
              <span className="count-num">{timeLeft.seconds}</span>
              <span className="count-unit">Giây</span>
            </div>
          </div>
        </div>
      </section>

      {/* Invitation Card Body */}
      <div className="invitation-body-container">
        
        {/* PHOTO POSITION 1: Centered Polaroid Cover Photo */}
        {photo1 && (
          <div className="polaroid-photo-frame">
            <div className="polaroid-wrapper">
              <img src={photo1} alt="Wedding Cover" className="polaroid-img" />
              <div className="polaroid-shimmer" />
            </div>
            <div className="polaroid-caption">
              {config.groom_name} ❤️ {config.bride_name} <br />
              <span className="polaroid-subcaption">Hành trình gieo bình yên, hái hạnh phúc</span>
            </div>
          </div>
        )}

        {/* Section 1: Parents info */}
        <section className="invitation-section card-item glass-panel-wed">
          <div className="section-heart-divider">🌹</div>
          <div className="parents-grid">
            <div className="parents-column">
              <h3 className="family-title">Nhà Trai</h3>
              <p className="parents-names">{config.groom_parents}</p>
              <p className="spouse-label">Chú rể</p>
              <h4 className="spouse-name">{config.groom_name}</h4>
            </div>
            <div className="parents-column">
              <h3 className="family-title">Nhà Gái</h3>
              <p className="parents-names">{config.bride_parents}</p>
              <p className="spouse-label">Cô dâu</p>
              <h4 className="spouse-name">{config.bride_name}</h4>
            </div>
          </div>
        </section>

        {/* PHOTO POSITION 2: Story / Love Message side-by-side Polaroid */}
        <section className="invitation-section card-item glass-panel-wed message-section">
          <div className="section-heart-divider">✨</div>
          <h2 className="section-title">Thư Ngỏ</h2>
          
          <div className="story-split-container">
            <div className="story-text-column">
              <p className="love-quote">
                "Hai người cùng bước đi, cùng chia sẻ mỗi khoảnh khắc tốt đẹp lẫn gian khó, kiến tạo nên mái ấm gia đình đong đầy sự yêu thương và bình yên."
              </p>
              <p className="invitation-text">{config.invitation_message}</p>
            </div>
            {photo2 && (
              <div className="story-photo-column">
                <div className="polaroid-photo-frame nested-photo">
                  <div className="polaroid-wrapper">
                    <img src={photo2} alt="Wedding Couple Story" className="polaroid-img" />
                  </div>
                  <div className="polaroid-caption mini">
                    Tình yêu đong đầy
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Wedding Schedule */}
        <section className="invitation-section card-item glass-panel-wed">
          <div className="section-heart-divider">💒</div>
          <h2 className="section-title">Thời Gian &amp; Địa Điểm</h2>
          
          <div className="schedule-date-box">
            <p className="week-day">{formattedDayOfWeek.toUpperCase()}</p>
            <p className="main-date">{formattedDate}</p>
            <p className="main-time">Vào lúc {formattedTime}</p>
          </div>

          <div className="schedule-grid">
            <div className="schedule-card">
              <span className="icon">🏡</span>
              <h4>Lễ Vu Quy &amp; Lễ Thành Hôn</h4>
              <p className="address-text">{config.ceremony_address}</p>
              {config.ceremony_maps_url && (
                <a href={config.ceremony_maps_url} target="_blank" rel="noopener noreferrer" className="btn btn-maps">📍 Google Maps</a>
              )}
            </div>

            <div className="schedule-card">
              <span className="icon">🥂</span>
              <h4>Tiệc Mừng Hạnh Phúc</h4>
              <p className="address-text">{config.banquet_address}</p>
              {config.banquet_maps_url && (
                <a href={config.banquet_maps_url} target="_blank" rel="noopener noreferrer" className="btn btn-maps">📍 Google Maps</a>
              )}
            </div>
          </div>

          {/* PHOTO POSITION 3: Schedule Section elegant spacer photo */}
          {photo3 && (
            <div className="schedule-photo-divider" style={{ marginTop: '2rem' }}>
              <div className="polaroid-photo-frame nested-photo wide-style">
                <div className="polaroid-wrapper">
                  <img src={photo3} alt="Wedding Ceremony Space" className="polaroid-img" />
                </div>
                <div className="polaroid-caption mini">Đường về chung lối</div>
              </div>
            </div>
          )}
        </section>

        {/* Section 4: RSVP Form & PHOTO POSITION 4 side-by-side */}
        <section className="invitation-section card-item glass-panel-wed">
          <div className="section-heart-divider">✍️</div>
          <h2 className="section-title">Xác Nhận Tham Dự</h2>
          <p className="section-subtitle">Sự hiện diện của bạn là niềm hạnh phúc lớn nhất của chúng mình!</p>
          
          <div className="rsvp-split-container">
            {photo4 && (
              <div className="rsvp-photo-column">
                <div className="polaroid-photo-frame nested-photo tilt-left">
                  <div className="polaroid-wrapper">
                    <img src={photo4} alt="We are waiting for you" className="polaroid-img" />
                  </div>
                  <div className="polaroid-caption mini">
                    Hẹn gặp bạn nhé! ❤️
                  </div>
                </div>
              </div>
            )}
            
            <div className="rsvp-form-column">
              {submitSuccess ? (
                <div className="rsvp-success-banner">
                  <h4>🎉 Gửi thành công!</h4>
                  <p>Xin chân thành cảm ơn bạn đã gửi lời xác nhận và những lời chúc phúc ngọt ngào nhất!</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRSVP} className="rsvp-form">
                  <div className="form-group-wed">
                    <label>Họ và tên của bạn: *</label>
                    <input 
                      type="text" 
                      placeholder="Nhập họ tên..." 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-wed flex-row-wed">
                    <label className="checkbox-label">
                      <input type="radio" name="status" value="going" checked={status === 'going'} onChange={() => setStatus('going')} />
                      <span>Sẽ đến vui 🥳</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="radio" name="status" value="cannot_attend" checked={status === 'cannot_attend'} onChange={() => setStatus('cannot_attend')} />
                      <span>Tiếc quá 🥺</span>
                    </label>
                  </div>

                  {status === 'going' && (
                    <div className="form-group-wed">
                      <label>Số người đi cùng (gồm cả bạn):</label>
                      <select value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))}>
                        <option value={1}>1 người (Chỉ bạn)</option>
                        <option value={2}>2 người</option>
                        <option value={3}>3 người</option>
                        <option value={4}>4 người</option>
                        <option value={5}>Nhiều hơn 4 người</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group-wed">
                    <label>Bạn là khách mời của ai?</label>
                    <select value={side} onChange={(e) => setSide(e.target.value)}>
                      <option value="both">Khách mời chung cả hai</option>
                      <option value="groom">Nhà trai</option>
                      <option value="bride">Nhà gái</option>
                    </select>
                  </div>

                  <div className="form-group-wed">
                    <label>Lời chúc phúc gửi cặp đôi:</label>
                    <textarea 
                      rows={3} 
                      placeholder="Viết lời chúc của bạn..." 
                      value={wish}
                      onChange={(e) => setWish(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-rsvp-submit" disabled={submitting}>
                    {submitting ? 'Đang gửi...' : '❤️ Gửi Xác Nhận Ngay'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Wishes Board */}
        <section className="invitation-section card-item glass-panel-wed">
          <div className="section-heart-divider">💬</div>
          <h2 className="section-title">Bức Tường Chúc Phúc</h2>
          <p className="section-subtitle">Lời nhắn nhủ đong đầy yêu thương từ bạn bè quý khách</p>
          
          {wishes.length === 0 ? (
            <p className="no-wishes">Hãy là người đầu tiên gửi những lời chúc ngọt ngào nhất! ✨</p>
          ) : (
            <div className="wishes-board-container">
              <div className="wishes-track">
                {wishes.map((w, idx) => (
                  <div key={w.id || idx} className="wish-sticky-note">
                    <p className="wish-text">“ {w.content} ”</p>
                    <div className="wish-meta">
                      <span className="wish-author">{w.guest_name}</span>
                      <span className="wish-date">
                        {new Date(w.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 6: Gift Box */}
        <section className="invitation-section card-item glass-panel-wed">
          <div className="section-heart-divider">🎁</div>
          <h2 className="section-title">Hộp Mừng Cưới Online</h2>
          <p className="section-subtitle">Dành cho bạn bè ở xa có mong muốn gửi quà mừng chúc phúc</p>

          {/* Công cụ tạo mã VietQR động */}
          <div className="smart-qr-box glass-panel-wed" style={{
            padding: '1.75rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            background: 'var(--wed-card-bg)',
            border: '1px solid var(--wed-card-border)',
            width: '100%',
            maxWidth: '680px',
            margin: '1.5rem auto 2.5rem',
            zIndex: 10,
            position: 'relative'
          }}>
            <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--wed-accent)', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
              <span>✨</span> Cấu Hình VietQR Tự Động
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
              
              {/* Tên khách */}
              <div className="form-group-wed" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wed-text-sec)' }}>Họ và tên (Ghi trên giao dịch):</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên của bạn (không dấu)..." 
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--wed-card-border)',
                    background: 'rgba(255, 255, 255, 0.4)',
                    color: 'var(--wed-text)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>

              {/* Lựa chọn số tiền */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wed-text-sec)' }}>Chọn nhanh số tiền mừng cưới:</label>
                <div className="amount-presets-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.65rem'
                }}>
                  {[
                    { val: null, label: "Tùy tâm" },
                    { val: 200000, label: "200.000đ" },
                    { val: 500000, label: "500.000đ" },
                    { val: 1000000, label: "1.000.000đ" },
                    { val: 'custom', label: "Nhập số khác" }
                  ].map((preset, idx) => {
                    const isAct = selectedAmount === preset.val;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAmount(preset.val)}
                        className={`amount-preset-btn ${isAct ? 'active' : ''}`}
                        style={{
                          padding: '0.65rem 0.5rem',
                          borderRadius: '8px',
                          border: isAct ? '2px solid var(--wed-accent)' : '1px solid var(--wed-card-border)',
                          background: isAct ? 'var(--wed-accent)' : 'rgba(255, 255, 255, 0.25)',
                          color: isAct ? 'white' : 'var(--wed-text)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          boxShadow: isAct ? '0 4px 10px rgba(244, 63, 94, 0.25)' : 'none'
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhập số tiền tùy ý */}
              {selectedAmount === 'custom' && (
                <div className="form-group-wed" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', animation: 'fadeIn 0.25s' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wed-text-sec)' }}>Số tiền tùy chọn (VNĐ):</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: 300,000..." 
                    value={customAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setCustomAmount(raw ? Number(raw).toLocaleString('vi-VN') : '');
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--wed-card-border)',
                      background: 'rgba(255, 255, 255, 0.4)',
                      color: 'var(--wed-text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              )}

              {/* Lời chúc giao dịch */}
              <div className="form-group-wed" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wed-text-sec)' }}>Lời chúc ngắn đi kèm:</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: tram nam hanh phuc..." 
                  value={senderMemo}
                  onChange={(e) => setSenderMemo(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--wed-card-border)',
                    background: 'rgba(255, 255, 255, 0.4)',
                    color: 'var(--wed-text)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>

            </div>
          </div>

          <div className="gift-qr-container">
            <div className="gift-card">
              <h4 className="gift-heading">Mừng cưới Chú rể</h4>
              <div className="qr-wrapper">
                <img src={groomQR} alt="QR Chú rể" className="qr-img" onError={(e) => e.target.style.display = 'none'} />
              </div>
              <p className="bank-detail-text">
                <strong>{config.groom_bank}</strong><br />
                STK: <code>{config.groom_account_number}</code><br />
                CTK: {config.groom_account_name}
              </p>
            </div>

            <div className="gift-card">
              <h4 className="gift-heading">Mừng cưới Cô dâu</h4>
              <div className="qr-wrapper">
                <img src={brideQR} alt="QR Cô dâu" className="qr-img" onError={(e) => e.target.style.display = 'none'} />
              </div>
              <p className="bank-detail-text">
                <strong>{config.bride_bank}</strong><br />
                STK: <code>{config.bride_account_number}</code><br />
                CTK: {config.bride_account_name}
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Dynamic Styling directly inside component to prevent global leakage */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');

        /* Color Palettes */
        .wedding-invitation-page.romantic-pink {
          --wed-bg: linear-gradient(180deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%);
          --wed-accent: #f43f5e;
          --wed-accent-hover: #e11d48;
          --wed-card-bg: rgba(255, 255, 255, 0.7);
          --wed-card-border: rgba(251, 113, 133, 0.35);
          --wed-text: #4c0519;
          --wed-text-sec: #881337;
          --wed-font-title: 'Great Vibes', cursive;
        }

        .wedding-invitation-page.luxury-gold {
          --wed-bg: linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          --wed-accent: #fbbf24;
          --wed-accent-hover: #f59e0b;
          --wed-card-bg: rgba(30, 41, 59, 0.7);
          --wed-card-border: rgba(251, 191, 36, 0.3);
          --wed-text: #f8fafc;
          --wed-text-sec: #cbd5e1;
          --wed-font-title: 'Playfair Display', serif;
        }

        .wedding-invitation-page.vintage-floral {
          --wed-bg: linear-gradient(180deg, #fafaf9 0%, #f5f5f4 50%, #e7e5e4 100%);
          --wed-accent: #c2410c;
          --wed-accent-hover: #ea580c;
          --wed-card-bg: rgba(255, 255, 255, 0.8);
          --wed-card-border: rgba(194, 65, 12, 0.25);
          --wed-text: #431407;
          --wed-text-sec: #7c2d12;
          --wed-font-title: 'Playfair Display', serif;
        }

        .wedding-invitation-page.modern-indigo {
          --wed-bg: linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #030712 100%);
          --wed-accent: #818cf8;
          --wed-accent-hover: #6366f1;
          --wed-card-bg: rgba(17, 24, 39, 0.75);
          --wed-card-border: rgba(129, 140, 248, 0.35);
          --wed-text: #f9fafb;
          --wed-text-sec: #d1d5db;
          --wed-font-title: 'Outfit', sans-serif;
        }

        .wedding-invitation-page {
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          background: var(--wed-bg);
          color: var(--wed-text);
          position: relative;
          overflow-x: hidden;
          padding-bottom: 5rem;
        }

        .falling-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999;
          pointer-events: none;
        }

        .wedding-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fff1f2;
          gap: 1rem;
        }

        .wedding-spinner {
          font-size: 3rem;
          animation: heartPulse 1.2s infinite alternate ease-in-out;
        }

        @keyframes heartPulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.3); }
        }

        /* Vinyl disk */
        .vinyl-music-toggle {
          position: fixed;
          top: 5.5rem;
          right: 1.5rem;
          width: 60px;
          height: 60px;
          background: transparent;
          border: none;
          cursor: pointer;
          z-index: 20;
        }

        .vinyl-disk {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle, #334155 0%, #0f172a 40%, #000000 70%);
          border: 2px solid var(--wed-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          position: relative;
        }

        .vinyl-disk::before {
          content: '';
          position: absolute;
          width: 80%;
          height: 80%;
          border-radius: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.15);
        }

        .vinyl-center {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .vinyl-music-toggle.playing .vinyl-disk {
          animation: spinVinyl 3.5s linear infinite;
        }

        @keyframes spinVinyl {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Hero */
        .invitation-hero {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8rem 1rem 4rem 1rem;
        }

        .hearts-cluster {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          animation: floatHearts 3s ease-in-out infinite alternate;
        }

        @keyframes floatHearts {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }

        .couple-badge {
          font-size: 0.85rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--wed-accent);
          margin-bottom: 1rem;
        }

        .couple-title-main {
          font-family: var(--wed-font-title);
          font-size: 4.8rem;
          line-height: 1;
          color: var(--wed-text);
          margin: 0.5rem 0 1.5rem 0;
          text-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }
        
        .romantic-pink .couple-title-main {
          color: #be123c;
        }

        .and-symbol {
          font-family: 'Great Vibes', cursive;
          font-size: 3.2rem;
          color: var(--wed-accent);
          display: inline-block;
          margin: 0.4rem 0;
        }

        .hero-announcement {
          font-size: 1.15rem;
          font-weight: 500;
          color: var(--wed-text-sec);
          max-width: 600px;
          line-height: 1.6;
        }

        /* Countdown */
        .countdown-container {
          margin-top: 3rem;
          width: 100%;
          max-width: 480px;
        }

        .countdown-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--wed-text-sec);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .countdown-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .countdown-card {
          background: var(--wed-card-bg);
          border: 1px solid var(--wed-card-border);
          border-radius: 16px;
          padding: 0.8rem 0.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          transition: all 0.3s;
        }
        
        .countdown-card:hover {
          transform: translateY(-4px);
        }

        .count-num {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--wed-accent);
        }

        .count-unit {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--wed-text-sec);
          opacity: 0.8;
          margin-top: 0.2rem;
        }

        /* Polaroid Photo Frame Layouts */
        .polaroid-photo-frame {
          padding: 1.25rem !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: white !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.07) !important;
          transform: rotate(-1deg);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-radius: 4px !important;
          width: 100%;
        }
        
        .polaroid-photo-frame:hover {
          transform: rotate(1deg) scale(1.02);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.12) !important;
        }

        .polaroid-wrapper {
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          position: relative;
          background: #f1f5f9;
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 2px;
        }

        .polaroid-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }
        
        .polaroid-photo-frame:hover .polaroid-img {
          transform: scale(1.05);
        }

        .polaroid-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.35) 30%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          animation: polaroidGlow 6s infinite;
        }

        @keyframes polaroidGlow {
          0% { left: -100%; }
          30% { left: 200%; }
          100% { left: 200%; }
        }

        .polaroid-caption {
          font-family: 'Great Vibes', cursive;
          font-size: 2.2rem;
          color: #1e293b !important;
          margin-top: 1.2rem;
          margin-bottom: 0.2rem;
          text-align: center;
          line-height: 1.1;
        }

        .polaroid-caption.mini {
          font-size: 1.6rem;
          margin-top: 0.8rem;
          margin-bottom: 0;
        }

        .polaroid-subcaption {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b !important;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          display: inline-block;
          margin-top: 0.4rem;
        }

        .nested-photo {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05) !important;
        }

        .nested-photo.wide-style {
          transform: rotate(0.5deg);
        }
        
        .nested-photo.tilt-left {
          transform: rotate(-1.5deg);
        }

        /* Split layouts */
        .story-split-container, .rsvp-split-container {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 2rem;
          align-items: center;
          text-align: left;
        }

        .rsvp-split-container {
          grid-template-columns: 0.8fr 1.2fr;
        }

        /* Invitation body elements */
        .invitation-body-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .card-item {
          background: var(--wed-card-bg);
          border: 1px solid var(--wed-card-border);
          border-radius: 30px;
          padding: 3rem 2rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          transition: all 0.3s;
        }

        .section-heart-divider {
          font-size: 1.5rem;
          text-align: center;
          margin-bottom: 1.5rem;
          opacity: 0.85;
          animation: heartbeat 1.5s infinite alternate ease-in-out;
        }
        
        @keyframes heartbeat {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }

        .parents-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.5rem;
          text-align: center;
        }

        .parents-column {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .family-title {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--wed-accent);
          font-weight: 700;
          margin-bottom: 0.6rem;
        }

        .parents-names {
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--wed-text-sec);
          margin-bottom: 1.5rem;
          font-weight: 500;
          min-height: 48px;
        }

        .spouse-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--wed-text-sec);
          opacity: 0.6;
        }

        .spouse-name {
          font-size: 1.6rem;
          font-weight: 700;
          margin-top: 0.3rem;
        }
        
        .romantic-pink .spouse-name {
          color: #be123c;
        }

        /* Message Section */
        .message-section {
          text-align: center;
        }

        .section-title {
          font-family: var(--wed-font-title);
          font-size: 2.8rem;
          margin-bottom: 1rem;
          font-weight: 700;
          text-align: center;
        }
        
        .romantic-pink .section-title {
          color: #be123c;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: var(--wed-text-sec);
          margin-top: -0.5rem;
          margin-bottom: 2rem;
          font-weight: 500;
          text-align: center;
        }

        .love-quote {
          font-size: 1rem;
          font-style: italic;
          font-weight: 500;
          color: var(--wed-text-sec);
          opacity: 0.9;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          border-left: 2px solid var(--wed-accent);
          border-right: 2px solid var(--wed-accent);
          padding: 0 1rem;
        }

        .invitation-text {
          font-size: 1.02rem;
          line-height: 1.8;
          color: var(--wed-text);
          font-weight: 400;
        }

        /* Schedule */
        .schedule-date-box {
          border-top: 1px dashed var(--wed-card-border);
          border-bottom: 1px dashed var(--wed-card-border);
          padding: 1.5rem 0;
          text-align: center;
          margin-bottom: 2rem;
        }

        .week-day {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--wed-accent);
          letter-spacing: 0.25em;
          margin-bottom: 0.4rem;
        }

        .main-date {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.2rem;
        }

        .main-time {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--wed-text-sec);
        }

        .schedule-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .schedule-card {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid var(--wed-card-border);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .luxury-gold .schedule-card {
          background: rgba(255, 255, 255, 0.03);
        }

        .schedule-card .icon {
          font-size: 2.2rem;
          margin-bottom: 0.8rem;
        }

        .schedule-card h4 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
        }

        .address-text {
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--wed-text-sec);
          margin-bottom: 1.2rem;
          min-height: 54px;
        }

        .btn-maps {
          background: transparent;
          border: 1.5px solid var(--wed-accent);
          color: var(--wed-accent);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-maps:hover {
          background: var(--wed-accent);
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        }

        /* RSVP Form */
        .rsvp-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          width: 100%;
        }

        .form-group-wed {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group-wed.flex-row-wed {
          flex-direction: row;
          justify-content: space-around;
          gap: 1rem;
          margin: 0.5rem 0;
        }

        .form-group-wed label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--wed-text-sec);
        }

        .form-group-wed input[type="text"],
        .form-group-wed select,
        .form-group-wed textarea {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid var(--wed-card-border);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          color: var(--wed-text);
          font-family: inherit;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        
        .luxury-gold .form-group-wed input[type="text"],
        .luxury-gold .form-group-wed select,
        .luxury-gold .form-group-wed textarea {
          background: rgba(15, 23, 42, 0.4);
        }

        .form-group-wed input[type="text"]:focus,
        .form-group-wed select:focus,
        .form-group-wed textarea:focus {
          outline: none;
          border-color: var(--wed-accent);
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem !important;
          font-weight: 500 !important;
        }

        .btn-rsvp-submit {
          margin-top: 0.5rem;
          background: var(--wed-accent);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          padding: 0.9rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
        }

        .btn-rsvp-submit:hover {
          background: var(--wed-accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.45);
        }

        .rsvp-success-banner {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          color: #065f46;
          width: 100%;
        }
        
        .luxury-gold .rsvp-success-banner {
          color: #34d399;
        }

        .rsvp-success-banner h4 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 0.4rem;
        }

        .rsvp-success-banner p {
          font-size: 0.9rem;
          line-height: 1.5;
        }

        /* Wishes Wall */
        .wishes-board-container {
          overflow-x: auto;
          padding: 0.5rem 0 1.5rem 0;
          scroll-snap-type: x mandatory;
        }

        .wishes-track {
          display: flex;
          gap: 1.25rem;
          width: max-content;
        }

        .wish-sticky-note {
          scroll-snap-align: start;
          width: 240px;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid var(--wed-card-border);
          border-radius: 20px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          transition: all 0.3s;
        }
        
        .luxury-gold .wish-sticky-note {
          background: rgba(30, 41, 59, 0.4);
        }

        .wish-sticky-note:hover {
          transform: translateY(-5px) rotate(1deg);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
        }

        .wish-text {
          font-size: 0.85rem;
          font-style: italic;
          line-height: 1.6;
          color: var(--wed-text);
          margin-bottom: 1rem;
        }

        .wish-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--wed-card-border);
          padding-top: 0.6rem;
          font-size: 0.75rem;
        }

        .wish-author {
          font-weight: 700;
          color: var(--wed-accent);
        }

        .wish-date {
          color: var(--wed-text-sec);
          opacity: 0.7;
        }

        .no-wishes {
          text-align: center;
          font-size: 0.9rem;
          font-style: italic;
          color: var(--wed-text-sec);
          opacity: 0.8;
          padding: 1.5rem;
        }

        /* Gift Box */
        .gift-qr-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .gift-card {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid var(--wed-card-border);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.3s ease;
        }
        
        .gift-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }

        .amount-preset-btn:hover {
          transform: translateY(-2px);
          background: var(--wed-accent-hover) !important;
          color: white !important;
          border-color: var(--wed-accent-hover) !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .luxury-gold .gift-card {
          background: rgba(255, 255, 255, 0.02);
        }

        .gift-heading {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--wed-accent);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .qr-wrapper {
          width: 160px;
          height: 160px;
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .bank-detail-text {
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--wed-text-sec);
        }

        .bank-detail-text code {
          background: rgba(255, 255, 255, 0.45);
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-weight: 700;
          color: var(--wed-accent);
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .story-split-container, .rsvp-split-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .rsvp-split-container {
            flex-direction: column-reverse;
            display: flex;
          }

          .nested-photo {
            max-width: 320px;
            margin: 0 auto;
          }
        }

        @media (max-width: 680px) {
          .couple-title-main {
            font-size: 3.2rem;
          }
          
          .parents-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .parents-names {
            min-height: auto;
            margin-bottom: 0.8rem;
          }

          .schedule-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .gift-qr-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .card-item {
            padding: 2rem 1.25rem;
          }
          
          .invitation-hero {
            padding-top: 6rem;
          }
        }
      `}} />
    </div>
  );
}
