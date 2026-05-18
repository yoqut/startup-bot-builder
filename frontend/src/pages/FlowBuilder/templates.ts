export interface FlowTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  nodes: any[]
  edges: any[]
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'welcome',
    name: "Salom-xayr boti",
    description: "/start buyrug'iga salom xabari va tugmalar bilan javob beradi",
    icon: '👋',
    category: 'Asosiy',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 100, y: 100 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 100, y: 240 }, data: { config: { message_type: 'text', text: 'Salom, {{user_name}}! 👋\n\nMen botman. Nima qilishim kerak?', buttons: [{ label: 'Yordam', action: 'next' }, { label: "Haqida", action: 'next' }], button_layout: 'reply' } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
    ],
  },
  {
    id: 'faq',
    name: 'FAQ Boti',
    description: "Ko'p so'raladigan savollarga avtomatik javob beradi",
    icon: '❓',
    category: 'Xizmat',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 200, y: 50 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 200, y: 190 }, data: { config: { message_type: 'text', text: 'Salom! Qanday savol bor? 🤔', buttons: [{ label: 'Narxlar' }, { label: "Ish vaqti" }, { label: "Manzil" }], button_layout: 'reply' } } },
      { id: 'm2', type: 'message', position: { x: 50, y: 380 }, data: { config: { message_type: 'text', text: '💰 Narxlar:\n- Oddiy: 50,000 so\'m\n- Premium: 150,000 so\'m' } } },
      { id: 'm3', type: 'message', position: { x: 220, y: 380 }, data: { config: { message_type: 'text', text: "🕐 Ish vaqtimiz:\nDushanba - Juma: 9:00 - 18:00\nShanba: 10:00 - 15:00" } } },
      { id: 'm4', type: 'message', position: { x: 390, y: 380 }, data: { config: { message_type: 'text', text: '📍 Manzil:\nToshkent sh., Mirzo Ulugbek ko\'chasi, 15-uy' } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
      { id: 'e2', source: 'm1', target: 'm2', sourceHandle: 'btn_0' },
      { id: 'e3', source: 'm1', target: 'm3', sourceHandle: 'btn_1' },
      { id: 'e4', source: 'm1', target: 'm4', sourceHandle: 'btn_2' },
    ],
  },
  {
    id: 'feedback',
    name: 'Fikr to\'plash',
    description: "Foydalanuvchidan fikr-mulohaza oladi va saqlaydi",
    icon: '⭐',
    category: 'Marketing',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 200, y: 50 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 200, y: 190 }, data: { config: { message_type: 'text', text: "Xizmatimizni qanday baholaysiz? ⭐", buttons: [{ label: '⭐⭐⭐⭐⭐ A\'lo' }, { label: '⭐⭐⭐⭐ Yaxshi' }, { label: '⭐⭐⭐ O\'rtacha' }], button_layout: 'reply' } } },
      { id: 'i1', type: 'input', position: { x: 200, y: 380 }, data: { config: { prompt: "Izoh qoldiring (ixtiyoriy):", variable: 'feedback_text' } } },
      { id: 'm2', type: 'message', position: { x: 200, y: 540 }, data: { config: { message_type: 'text', text: "Rahmat! Fikringiz qabul qilindi ✅\n\nBaholash: {{user_rating}}\nIzoh: {{feedback_text}}" } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
      { id: 'e2', source: 'm1', target: 'i1', sourceHandle: 'btn_0' },
      { id: 'e3', source: 'm1', target: 'i1', sourceHandle: 'btn_1' },
      { id: 'e4', source: 'm1', target: 'i1', sourceHandle: 'btn_2' },
      { id: 'e5', source: 'i1', target: 'm2', sourceHandle: 'default' },
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz / Test',
    description: "Ko'p tanlovli test o'tkazadi va natijani ko'rsatadi",
    icon: '🧠',
    category: 'O\'yin',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 200, y: 50 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 200, y: 190 }, data: { config: { message_type: 'text', text: "Quiz boshlandi! 🧠\n\n1-savol: O'zbekiston poytaxti qaysi shahar?", buttons: [{ label: 'A) Samarqand' }, { label: 'B) Toshkent' }, { label: 'C) Buxoro' }], button_layout: 'inline' } } },
      { id: 'm2', type: 'message', position: { x: 50, y: 420 }, data: { config: { message_type: 'text', text: "❌ Noto'g'ri! To'g'ri javob: Toshkent" } } },
      { id: 'm3', type: 'message', position: { x: 220, y: 420 }, data: { config: { message_type: 'text', text: "✅ To'g'ri! Toshkent - O'zbekiston poytaxti" } } },
      { id: 'm4', type: 'message', position: { x: 390, y: 420 }, data: { config: { message_type: 'text', text: "❌ Noto'g'ri! To'g'ri javob: Toshkent" } } },
      { id: 'end', type: 'end', position: { x: 200, y: 580 }, data: { config: { label: 'Tugash' } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
      { id: 'e2', source: 'm1', target: 'm2', sourceHandle: 'btn_0' },
      { id: 'e3', source: 'm1', target: 'm3', sourceHandle: 'btn_1' },
      { id: 'e4', source: 'm1', target: 'm4', sourceHandle: 'btn_2' },
      { id: 'e5', source: 'm2', target: 'end', sourceHandle: 'default' },
      { id: 'e6', source: 'm3', target: 'end', sourceHandle: 'default' },
      { id: 'e7', source: 'm4', target: 'end', sourceHandle: 'default' },
    ],
  },
  {
    id: 'lead',
    name: "Mijoz ma'lumotlari",
    description: "Foydalanuvchi ism va telefon raqamini oladi",
    icon: '📋',
    category: 'CRM',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 200, y: 50 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 200, y: 190 }, data: { config: { message_type: 'text', text: "Salom! Konsultatsiya uchun ro'yxatdan o'ting 📋" } } },
      { id: 'i1', type: 'input', position: { x: 200, y: 330 }, data: { config: { prompt: 'Ismingizni kiriting:', variable: 'client_name' } } },
      { id: 'i2', type: 'input', position: { x: 200, y: 480 }, data: { config: { prompt: 'Telefon raqamingizni kiriting:', variable: 'client_phone', input_type: 'contact' } } },
      { id: 'm2', type: 'message', position: { x: 200, y: 630 }, data: { config: { message_type: 'text', text: "✅ Rahmat, {{client_name}}!\n\nSizning ma'lumotlaringiz:\n📛 Ism: {{client_name}}\n📞 Tel: {{client_phone}}\n\nTez orada siz bilan bog'lanamiz!" } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
      { id: 'e2', source: 'm1', target: 'i1', sourceHandle: 'default' },
      { id: 'e3', source: 'i1', target: 'i2', sourceHandle: 'default' },
      { id: 'e4', source: 'i2', target: 'm2', sourceHandle: 'default' },
    ],
  },
  {
    id: 'channel_check',
    name: "Kanal obunasi tekshiruvi",
    description: "Kanalga a'zolikni tekshirib, keyin xizmat ko'rsatadi",
    icon: '📢',
    category: 'Guruh/Kanal',
    nodes: [
      { id: 'h1', type: 'command', position: { x: 200, y: 50 }, data: { config: { command: '/start', label: '/start' } } },
      { id: 'm1', type: 'message', position: { x: 200, y: 190 }, data: { config: { message_type: 'text', text: "Xizmatdan foydalanish uchun kanalimizga a'zo bo'ling! 📢\n\n@yourchannel", buttons: [{ label: "A'zo bo'ldim ✅" }], button_layout: 'inline' } } },
      { id: 'm2', type: 'message', position: { x: 200, y: 400 }, data: { config: { message_type: 'text', text: "✅ Rahmat! Endi barcha imkoniyatlardan foydalanishingiz mumkin.\n\nBoshlash uchun /menu ni bosing." } } },
    ],
    edges: [
      { id: 'e1', source: 'h1', target: 'm1', sourceHandle: 'default' },
      { id: 'e2', source: 'm1', target: 'm2', sourceHandle: 'btn_0' },
    ],
  },
]
