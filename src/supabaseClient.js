import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are set
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL';

let supabase = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// If real Supabase is not available, we use a fully functional mock client backed by localStorage
if (!supabase) {
  console.log('⚠️ Supabase credentials not found. Using localStorage fallback.');
  
  const getMockUsers = () => JSON.parse(localStorage.getItem('tm_mock_users') || '[]');
  const setMockUsers = (users) => localStorage.setItem('tm_mock_users', JSON.stringify(users));
  
  const getSessionUser = () => JSON.parse(localStorage.getItem('tm_session_user') || 'null');
  const setSessionUser = (user) => localStorage.setItem('tm_session_user', JSON.stringify(user));

  supabase = {
    isMock: true,
    auth: {
      signUp: async ({ email, password, options }) => {
        const users = getMockUsers();
        if (users.find(u => u.email === email)) {
          return { data: { user: null }, error: { message: 'Email này đã được đăng ký tài khoản!' } };
        }
        
        const newUser = {
          id: Math.random().toString(36).substring(2, 15),
          email,
          user_metadata: options?.data || {}
        };
        
        users.push({ ...newUser, password });
        setMockUsers(users);
        setSessionUser(newUser);
        
        return { data: { user: newUser, session: { user: newUser } }, error: null };
      },
      
      signInWithPassword: async ({ email, password }) => {
        const users = getMockUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
          return { data: { user: null }, error: { message: 'Email hoặc mật khẩu không chính xác!' } };
        }
        
        const sessionUser = { id: user.id, email: user.email, user_metadata: user.user_metadata };
        setSessionUser(sessionUser);
        
        return { data: { user: sessionUser, session: { user: sessionUser } }, error: null };
      },
      
      signOut: async () => {
        localStorage.removeItem('tm_session_user');
        return { error: null };
      },
      
      getUser: async () => {
        const user = getSessionUser();
        return { data: { user }, error: null };
      },
      
      onAuthStateChange: (callback) => {
        const handleStorageChange = () => {
          const user = getSessionUser();
          callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
        };
        window.addEventListener('storage', handleStorageChange);
        const user = getSessionUser();
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
        
        return {
          data: {
            subscription: {
              unsubscribe: () => window.removeEventListener('storage', handleStorageChange)
            }
          }
        };
      }
    },
    
    db: {
      incrementVisits: async () => {
        let visits = parseInt(localStorage.getItem('tm_total_visits') || '0');
        visits += 1;
        localStorage.setItem('tm_total_visits', visits.toString());
        return visits;
      },

      getSystemStats: async () => {
        const users = JSON.parse(localStorage.getItem('tm_mock_users') || '[]');
        let visits = parseInt(localStorage.getItem('tm_total_visits') || '0');
        return {
          totalUsers: users.length,
          totalVisits: visits
        };
      },

      getWeddingConfig: async (id) => {
        const configId = id || 'default';
        const key = `tm_wedding_config_${configId}`;
        const config = localStorage.getItem(key);
        if (config) return JSON.parse(config);
        return {
          id: configId,
          groom_name: "Linh Tuấn",
          bride_name: "Ngô Minh",
          groom_parents: "Ông Lê Anh Tuấn (Bố) & Bà Nguyễn Thị Minh (Mẹ)",
          bride_parents: "Ông Hoàng Văn Tuấn (Bố) & Bà Trần Thị Minh (Mẹ)",
          wedding_date: "2026-10-18T10:00:00",
          ceremony_address: "Tổ chức tại Nhà Trai: Số 12, ngõ 34, đường ABC, Hà Nội",
          banquet_address: "Trung tâm tiệc cưới Romance, 123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
          ceremony_maps_url: "https://maps.google.com",
          banquet_maps_url: "https://maps.google.com",
          groom_bank: "MB Bank",
          groom_account_number: "0987654321",
          groom_account_name: "LE ANH TUAN",
          bride_bank: "Vietcombank",
          bride_account_number: "0123456789",
          bride_account_name: "HOANG HOAI MINH",
          theme: "romantic-pink",
          invitation_message: "Chào mừng bạn đến với ngày vui trọng đại của chúng mình! Sự hiện diện của bạn là niềm vinh hạnh lớn lao nhất đối với hai đứa mình.",
          music_url: "",
          wedding_photos: [
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=800"
          ]
        };
      },

      saveWeddingConfig: async (id, config) => {
        const configId = id || 'default';
        const key = `tm_wedding_config_${configId}`;
        localStorage.setItem(key, JSON.stringify(config));
        return { error: null };
      },

      getRSVPs: async (weddingId) => {
        const all = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        return all.filter(r => r.wedding_id === (weddingId || 'default'));
      },

      saveRSVP: async (weddingId, rsvp) => {
        const rsvps = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        const existingIdx = rsvp.id ? rsvps.findIndex(r => r.id === rsvp.id) : -1;
        const newRsvp = {
          id: rsvp.id || Math.random().toString(36).substring(2, 10),
          wedding_id: weddingId || 'default',
          guest_name: rsvp.guest_name,
          status: rsvp.status,
          guest_count: parseInt(rsvp.guest_count || 1),
          side: rsvp.side || "both",
          wish: rsvp.wish || "",
          created_at: rsvp.created_at || new Date().toISOString()
        };
        if (existingIdx >= 0) {
          rsvps[existingIdx] = newRsvp;
        } else {
          rsvps.unshift(newRsvp);
        }
        localStorage.setItem('tm_wedding_rsvps', JSON.stringify(rsvps));
        return { data: newRsvp, error: null };
      },

      deleteRSVP: async (id) => {
        const rsvps = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        const updated = rsvps.filter(r => r.id !== id);
        localStorage.setItem('tm_wedding_rsvps', JSON.stringify(updated));
        return { error: null };
      },

      getWishes: async (weddingId) => {
        const wishes = JSON.parse(localStorage.getItem('tm_wedding_wishes') || '[]');
        const localWishes = wishes.filter(w => w.wedding_id === (weddingId || 'default'));
        const rsvps = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        const rsvpWishes = rsvps
          .filter(r => r.wedding_id === (weddingId || 'default') && r.wish && r.wish.trim() !== '')
          .map(r => ({ guest_name: r.guest_name, content: r.wish, created_at: r.created_at }));
        const allWishes = [...localWishes, ...rsvpWishes];
        allWishes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return allWishes;
      },

      saveWish: async (weddingId, wish) => {
        const wishes = JSON.parse(localStorage.getItem('tm_wedding_wishes') || '[]');
        const newWish = {
          id: Math.random().toString(36).substring(2, 10),
          wedding_id: weddingId || 'default',
          guest_name: wish.guest_name,
          content: wish.content,
          created_at: new Date().toISOString()
        };
        wishes.unshift(newWish);
        localStorage.setItem('tm_wedding_wishes', JSON.stringify(wishes));
        return { data: newWish, error: null };
      }
    }
  };
} else {
  supabase.isMock = false;
  supabase.db = {
    incrementVisits: async () => {
      try {
        const { data, error } = await supabase
          .from('tuanminh_stats')
          .select('visits_count')
          .eq('id', 'global_stats')
          .single();
          
        if (!error && data) {
          const newCount = data.visits_count + 1;
          await supabase
            .from('tuanminh_stats')
            .update({ visits_count: newCount })
            .eq('id', 'global_stats');
          return newCount;
        }
      } catch (err) {
        console.error('Error incrementing visits on Supabase:', err);
      }
      return null;
    },

    getSystemStats: async () => {
      try {
        const { count, error: userError } = await supabase
          .from('tuanminh_wedding_rsvps')
          .select('*', { count: 'exact', head: true });
          
        const { data: statsData, error: statsError } = await supabase
          .from('tuanminh_stats')
          .select('visits_count')
          .eq('id', 'global_stats')
          .single();
          
        let visits = 0;
        if (!statsError && statsData) {
          visits = statsData.visits_count;
        }

        return { 
          totalUsers: count || 0,
          totalVisits: visits
        };
      } catch (err) {
        console.error('System stats failed:', err);
        return { totalUsers: 0, totalVisits: 0 };
      }
    },

    getWeddingConfig: async (id) => {
      const configId = id || 'default';
      try {
        const { data, error } = await supabase
          .from('tuanminh_wedding_config')
          .select('*')
          .eq('id', configId)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase getWeddingConfig failed, falling back to localStorage:', err);
        const key = `tm_wedding_config_${configId}`;
        const config = localStorage.getItem(key);
        if (config) return JSON.parse(config);
        return {
          id: configId,
          groom_name: "Linh Tuấn",
          bride_name: "Ngô Minh",
          groom_parents: "Ông Lê Anh Tuấn (Bố) & Bà Nguyễn Thị Minh (Mẹ)",
          bride_parents: "Ông Hoàng Văn Tuấn (Bố) & Bà Trần Thị Minh (Mẹ)",
          wedding_date: "2026-10-18T10:00:00",
          ceremony_address: "Tổ chức tại Nhà Trai: Số 12, ngõ 34, đường ABC, Hà Nội",
          banquet_address: "Trung tâm tiệc cưới Romance, 123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
          ceremony_maps_url: "https://maps.google.com",
          banquet_maps_url: "https://maps.google.com",
          groom_bank: "MB Bank",
          groom_account_number: "0987654321",
          groom_account_name: "LE ANH TUAN",
          bride_bank: "Vietcombank",
          bride_account_number: "0123456789",
          bride_account_name: "HOANG HOAI MINH",
          theme: "romantic-pink",
          invitation_message: "Chào mừng bạn đến với ngày vui trọng đại của chúng mình! Sự hiện diện của bạn là niềm vinh hạnh lớn lao nhất đối với hai đứa mình.",
          music_url: "",
          wedding_photos: [
            "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=800"
          ]
        };
      }
    },

    saveWeddingConfig: async (id, config) => {
      const configId = id || 'default';
      try {
        const { error } = await supabase
          .from('tuanminh_wedding_config')
          .upsert({ id: configId, ...config });
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.warn('Supabase saveWeddingConfig failed, falling back to localStorage:', err);
        const key = `tm_wedding_config_${configId}`;
        localStorage.setItem(key, JSON.stringify(config));
        return { error: null };
      }
    },

    getRSVPs: async (weddingId) => {
      const configId = weddingId || 'default';
      try {
        const { data, error } = await supabase
          .from('tuanminh_wedding_rsvps')
          .select('*')
          .eq('wedding_id', configId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase getRSVPs failed, falling back to localStorage:', err);
        const all = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        return all.filter(r => r.wedding_id === configId);
      }
    },

    saveRSVP: async (weddingId, rsvp) => {
      const configId = weddingId || 'default';
      const newRsvp = {
        wedding_id: configId,
        guest_name: rsvp.guest_name,
        status: rsvp.status,
        guest_count: parseInt(rsvp.guest_count || 1),
        side: rsvp.side || "both",
        wish: rsvp.wish || "",
        created_at: rsvp.created_at || new Date().toISOString()
      };
      if (rsvp.id) {
        newRsvp.id = rsvp.id;
      }
      try {
        const { data, error } = await supabase
          .from('tuanminh_wedding_rsvps')
          .upsert(newRsvp)
          .select()
          .single();
        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('Supabase saveRSVP failed:', err);
        throw err;
      }
    },

    deleteRSVP: async (id) => {
      try {
        const { error } = await supabase
          .from('tuanminh_wedding_rsvps')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { error: null };
      } catch (err) {
        console.error('Supabase deleteRSVP failed:', err);
        throw err;
      }
    },

    getWishes: async (weddingId) => {
      const configId = weddingId || 'default';
      try {
        const { data, error } = await supabase
          .from('tuanminh_wedding_rsvps')
          .select('guest_name, wish, created_at')
          .eq('wedding_id', configId)
          .neq('wish', '')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(item => ({
          guest_name: item.guest_name,
          content: item.wish,
          created_at: item.created_at
        }));
      } catch (err) {
        console.warn('Supabase getWishes failed, falling back to localStorage:', err);
        const wishesFromLocal = JSON.parse(localStorage.getItem('tm_wedding_wishes') || '[]');
        const scopedWishesLocal = wishesFromLocal.filter(w => w.wedding_id === configId);
        
        const rsvpsFromLocal = JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
        const wishesFromRsvps = rsvpsFromLocal
          .filter(r => r.wedding_id === configId && r.wish && r.wish.trim() !== '')
          .map(r => ({ guest_name: r.guest_name, content: r.wish, created_at: r.created_at }));
        
        const allWishes = [...scopedWishesLocal, ...wishesFromRsvps];
        allWishes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return allWishes;
      }
    },

    saveWish: async (weddingId, wish) => {
      const configId = weddingId || 'default';
      const newWish = {
        wedding_id: configId,
        guest_name: wish.guest_name,
        content: wish.content,
        created_at: new Date().toISOString()
      };
      try {
        const { data, error } = await supabase
          .from('tuanminh_wedding_rsvps')
          .insert({
            wedding_id: configId,
            guest_name: wish.guest_name,
            status: 'wish_only',
            guest_count: 0,
            wish: wish.content,
            created_at: newWish.created_at
          })
          .select()
          .single();
        if (error) throw error;
        return { data: newWish, error: null };
      } catch (err) {
        console.warn('Supabase saveWish failed, falling back to localStorage:', err);
        const wishes = JSON.parse(localStorage.getItem('tm_wedding_wishes') || '[]');
        const mockWish = { id: Math.random().toString(36).substring(2, 10), ...newWish };
        wishes.unshift(mockWish);
        localStorage.setItem('tm_wedding_wishes', JSON.stringify(wishes));
        return { data: mockWish, error: null };
      }
    }
  }
}

export default supabase;
export { isSupabaseConfigured };
