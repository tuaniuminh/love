import React, { useState } from 'react';

export default function LogoProposals({ onClose }) {
  const [selectedProposal, setSelectedProposal] = useState(1);

  const proposals = [
    {
      id: 1,
      name: 'Đề xuất 1: Đĩa nhạc tình yêu & Nhịp đập trái tim',
      tagline: 'Love Vinyl & Heartbeat (Đề cử khuyên dùng 🌟)',
      icon: '🎵',
      color: 'linear-gradient(135deg, #f43f5e, #d946ef)',
      badge: 'BẢN DỰNG 3D MOCKUP',
      desc: 'Hai trái tim lồng ghép nghệ thuật dưới dạng hiệu ứng kính mờ (glassmorphism) phát sáng rực rỡ với dải màu gradient ngọt ngào (Hồng Rose, Tím Magenta và Xanh Indigo). Nền đen tối giản tạo chiều sâu huyền ảo.',
      meaning: 'Biểu tượng của sự hòa quyện tâm hồn giữa Linh Tuấn & Ngô Minh. Đồng thời mô phỏng đĩa nhạc kỷ niệm ("Một đời") phát ra những nhịp đập yêu thương.',
      style: 'Premium 3D, Sang trọng, Hiện đại và Đột phá thị giác.',
      hasMockup: true
    },
    {
      id: 2,
      name: 'Đề xuất 2: Chữ viết tắt lồng ghép nghệ thuật',
      tagline: 'Monogram Initials L ❤️ N',
      icon: '✨',
      color: 'linear-gradient(135deg, #eab308, #ca8a04)',
      badge: 'LUXURY GOLD',
      desc: 'Chữ cái đầu của hai bạn L (Linh Tuấn) và N (Ngô Minh) được cách điệu bằng nét vàng gold (vàng kim) thanh mảnh, lồng ghép vào nhau một cách nghệ thuật tạo thành một hình trái tim tối giản ở giữa.',
      meaning: 'Định danh cá nhân độc bản của hai người, thể hiện mối gắn kết khăng khít, sang trọng và bền bỉ mãi mãi theo thời gian.',
      style: 'Luxury, Minimalist, Tinh tế và Đẳng cấp.',
      hasMockup: false
    },
    {
      id: 3,
      name: 'Đề xuất 3: Cặp đôi Chibi Dễ thương',
      tagline: 'Cute Kawaii Couple Under the Moon',
      icon: '🌙',
      color: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
      badge: 'CUTE & WARM',
      desc: 'Hình vẽ minh họa phong cách chibi 2D dễ thương. Hình ảnh bạn nam và bạn nữ đang cầm tay nhau ngồi tựa lưng dưới ánh trăng khuyết hình trái tim màu hồng phấn ấm áp.',
      meaning: 'Mang lại cảm xúc gần gũi, đáng yêu và ấm áp, cực kỳ ăn khớp với tính năng ghi chép sổ tay sức khỏe "em iu" hàng ngày.',
      style: 'Cute, Cartoon, Màu sắc Pastel tươi sáng.',
      hasMockup: false
    },
    {
      id: 4,
      name: 'Đề xuất 4: Khung ảnh Polaroid Kỷ niệm',
      tagline: 'Retro Watercolor Memory Frame',
      icon: '📸',
      color: 'linear-gradient(135deg, #fb923c, #ea580c)',
      badge: 'VINTAGE ART',
      desc: 'Một khung ảnh polaroid cổ điển vẽ bằng chất liệu màu nước loang nhẹ nhàng. Bên trong khung ảnh là hình vẽ line-art (phác thảo nét đen mảnh) của hai bàn tay đang đan chặt ngón vào nhau.',
      meaning: 'Tôn vinh trực tiếp tính năng "Góc Kỷ Niệm" (Memory Corner) - lưu giữ những khoảnh khắc quý giá nhất trong chặng đường chung đôi.',
      style: 'Vintage, Hand-drawn, Nghệ thuật và Ấm cúng.',
      hasMockup: false
    },
    {
      id: 5,
      name: 'Đề xuất 5: Trái tim Che chở & Chăm sóc',
      tagline: 'Care Shield & Heart',
      icon: '🛡️',
      color: 'linear-gradient(135deg, #10b981, #059669)',
      badge: 'MINIMAL FLAT',
      desc: 'Hai bàn tay cách điệu chụm lại ôm thành một chiếc khiên bảo vệ hình trái tim. Bên trong chiếc khiên là một biểu tượng chữ thập y tế nhỏ lồng ghép bông hoa hồng đang nở rộ.',
      meaning: 'Nhấn mạnh tính năng quan tâm sức khỏe và dặn dò y tế của bạn nam dành cho bạn nữ, mang thông điệp chở che, đồng hành vượt qua những ngày ốm mệt.',
      style: 'Clean, Flat Design, Trực quan và Đầy tính nhân văn.',
      hasMockup: false
    }
  ];

  const current = proposals.find(p => p.id === selectedProposal);
  const logoUrl = `${import.meta.env.BASE_URL || '/'}logo_proposal_1.png`;

  return (
    <div className="auth-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="auth-modal glass-panel" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '650px', 
          padding: '2rem', 
          borderRadius: '24px', 
          border: '1px solid rgba(244, 63, 94, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎨</span> 5 Đề xuất Thiết kế Logo
          </h2>
          <button className="modal-close" onClick={onClose} style={{ fontSize: '2rem', lineHeight: '1' }}>
            &times;
          </button>
        </div>

        {/* Tab Buttons */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.75rem', 
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {proposals.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProposal(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.9rem',
                borderRadius: '12px',
                border: '1px solid ' + (selectedProposal === p.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                background: selectedProposal === p.id ? 'rgba(244, 63, 94, 0.08)' : 'transparent',
                color: selectedProposal === p.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{p.icon}</span> Đề xuất {p.id}
            </button>
          ))}
        </div>

        {/* Proposal Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
          {/* Badge & Title */}
          <div>
            <span 
              style={{ 
                background: current.color, 
                color: '#fff', 
                fontSize: '0.7rem', 
                fontWeight: 800, 
                padding: '0.25rem 0.6rem', 
                borderRadius: '6px',
                letterSpacing: '0.05em' 
              }}
            >
              {current.badge}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.6rem', color: 'var(--text-primary)' }}>
              {current.name}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 650, marginTop: '0.2rem' }}>
              {current.tagline}
            </p>
          </div>

          {/* Render Mockup Image for Proposal 1 */}
          {current.hasMockup && (
            <div 
              style={{ 
                background: '#0d0d0f', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1rem'
              }}
            >
              <img 
                src={logoUrl} 
                alt="Mockup Đề xuất 1" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '280px', 
                  objectFit: 'contain',
                  borderRadius: '12px'
                }} 
                onError={(e) => {
                  console.error("Failed to load mockup image from:", logoUrl);
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  const errDiv = document.createElement('div');
                  errDiv.style.padding = '2rem';
                  errDiv.style.color = '#ff4b4b';
                  errDiv.style.textAlign = 'center';
                  errDiv.style.fontWeight = 'bold';
                  errDiv.innerText = '⚠️ Không thể hiển thị ảnh mockup ở chế độ xem cục bộ. Khi đẩy lên GitHub Pages ảnh sẽ tự động hiển thị hoàn hảo!';
                  parent.appendChild(errDiv);
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.75rem', fontStyle: 'italic' }}>
                Bản vẽ dựng phối cảnh 3D hiệu ứng kính mờ phát sáng (Glassmorphic) trên nền đen huyền bí
              </span>
            </div>
          )}

          {/* Detailed Info Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1rem 1.25rem', 
                borderRadius: '14px', 
                borderLeft: '4px solid var(--accent-primary)',
                background: 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                💡 Ý tưởng thiết kế:
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {current.desc}
              </p>
            </div>

            <div 
              className="glass-panel" 
              style={{ 
                padding: '1rem 1.25rem', 
                borderRadius: '14px', 
                borderLeft: '4px solid var(--accent-secondary)',
                background: 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                ❤️ Ý nghĩa sâu sắc:
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {current.meaning}
              </p>
            </div>

            <div 
              className="glass-panel" 
              style={{ 
                padding: '1rem 1.25rem', 
                borderRadius: '14px', 
                borderLeft: '4px solid #a855f7',
                background: 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                🎨 Phong cách hiển thị:
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {current.style}
              </p>
            </div>
          </div>

          {/* Feedback Section */}
          <div 
            style={{ 
              marginTop: '0.5rem',
              padding: '1rem', 
              borderRadius: '14px', 
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(217, 70, 239, 0.08) 100%)',
              border: '1px dashed rgba(244, 63, 94, 0.3)',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', margin: 0 }}>
              💖 Bạn yêu thích Đề xuất nào nhất? Hãy nhắn tin phản hồi cho mình biết để cập nhật thành favicon/icon ứng dụng chính thức nhé!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
