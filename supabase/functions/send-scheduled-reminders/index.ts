import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

webpush.setVapidDetails(
  "mailto:tuanminh.edu@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  // Handle CORS Preflight Requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    // Khởi tạo Supabase client với Service Role Key để bỏ qua các chính sách RLS bảo mật khi chạy ngầm
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Lấy ra các lời nhắc hẹn giờ chưa gửi (guest_count = 0) và đã đến hoặc vượt quá giờ hẹn (side <= now)
    const nowIso = new Date().toISOString();
    const { data: reminders, error: reminderError } = await supabase
      .from("tuanminh_wedding_rsvps")
      .select("*")
      .eq("status", "scheduled_reminder")
      .eq("guest_count", 0)
      .lte("side", nowIso);

    if (reminderError) throw reminderError;

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "Không có lời nhắc nào đến giờ gửi." }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 200,
      });
    }

    console.log(`🔔 Đang xử lý ${reminders.length} lời nhắc hẹn giờ...`);

    // 2. Lấy ra tất cả các thiết bị đã đăng ký nhận thông báo đẩy (status = push_subscription)
    const { data: subscriptions, error: subError } = await supabase
      .from("tuanminh_wedding_rsvps")
      .select("*")
      .eq("status", "push_subscription")
      .eq("guest_count", 1); // Trạng thái hoạt động

    if (subError) throw subError;

    let notificationsSent = 0;

    for (const reminder of reminders) {
      const payload = JSON.stringify({
        title: reminder.guest_name,
        body: reminder.wish,
        data: { url: "./" }
      });

      if (subscriptions && subscriptions.length > 0) {
        const sendPromises = subscriptions.map(async (subRecord) => {
          try {
            const subscriptionObj = JSON.parse(subRecord.wish);
            await webpush.sendNotification(subscriptionObj, payload);
            console.log(`✅ Đã gửi thông báo đến endpoint: ${subscriptionObj.endpoint}`);
            notificationsSent++;
          } catch (pushErr) {
            console.error(`❌ Gửi thất bại đến subscription ID ${subRecord.id}:`, pushErr);
            // Nếu trình duyệt báo endpoint này đã hết hạn/bị xóa (404 hoặc 410), tự động xóa bản ghi trong CSDL để dọn dẹp
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              console.log(`🧹 Tự động xóa Subscription đã hết hạn: ${subRecord.id}`);
              await supabase
                .from("tuanminh_wedding_rsvps")
                .delete()
                .eq("id", subRecord.id);
            }
          }
        });

        await Promise.all(sendPromises);
      }

      // 3. Đánh dấu lời nhắc đã được xử lý gửi xong (guest_count = 1)
      await supabase
        .from("tuanminh_wedding_rsvps")
        .update({ guest_count: 1 })
        .eq("id", reminder.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processedReminders: reminders.length, 
      notificationsSent: notificationsSent 
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Lỗi thực thi Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
