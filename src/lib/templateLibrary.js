// FADS Template Centre — starter library.
//
// HOW TO ADD YOUR CANVA TEMPLATES LATER (no rebuild needed):
//   1. Find a Canva template below (type: "canva").
//   2. Paste your Canva share/template link into `canva_url` (replace "").
//   3. Optionally paste a thumbnail image URL into `preview_url`.
// The "Open in Canva" button will then open your link in a new tab automatically.
//
// HOW TO ADD A NEW TEMPLATE:
//   Copy an existing entry and change the fields.
//     - type: "text"  → shows "Copy Text" + "Use Template" (opens a preview).
//     - type: "canva" → shows "Open in Canva" (uses canva_url) + "Use Template".
//
// Placeholders like {business_name}, {customer_name} are hints for the user
// to customise after copying.

export const TEMPLATE_CATEGORIES = [
  { key: "all", label: "All Templates" },
  { key: "social_media", label: "Social Media" },
  { key: "canva", label: "Canva Templates" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "promotions", label: "Promotions & Offers" },
  { key: "customer_communication", label: "Customer Communication" },
  { key: "business_documents", label: "Business Documents" },
];

export const TEMPLATES = [
  // ────────────────────────── SOCIAL MEDIA ──────────────────────────
  {
    id: "sm_1",
    category: "social_media",
    type: "text",
    title: "New Product Announcement",
    description: "Build excitement around a new product or service launch.",
    body: `🎉 Big news from {business_name}!

We've just launched {product_name} — {short_description}.

Come and see why everyone's talking about it. Available now.

#SupportLocal #SmallBusiness`,
  },
  {
    id: "sm_2",
    category: "social_media",
    type: "text",
    title: "Customer Testimonial Post",
    description: "Turn a happy customer's words into a trust-building post.",
    body: `⭐ "{testimonial_quote}"
— {customer_name}, happy customer.

Thank you for trusting {business_name}! Want the same great experience? Visit us today.`,
  },
  {
    id: "sm_3",
    category: "social_media",
    type: "text",
    title: "Special Offer Post",
    description: "Promote a limited-time offer or discount.",
    body: `🔥 Special Offer!

For a limited time, get {offer_detail} at {business_name}.

Don't miss out — offer ends {end_date}.

Tag someone who needs to see this!`,
  },
  {
    id: "sm_4",
    category: "social_media",
    type: "text",
    title: "Business Introduction Post",
    description: "Introduce your business to new followers.",
    body: `👋 Hello! We're {business_name}.

We help {target_audience} with {what_you_do}.

Follow us for tips, offers and updates. We'd love to serve you!`,
  },
  {
    id: "sm_5",
    category: "social_media",
    type: "text",
    title: "Thank You Customer Post",
    description: "Show appreciation to your customers.",
    body: `💚 Thank you!

To every customer who chooses {business_name} — we appreciate you.

Your support keeps us going. Here's to many more great moments together.`,
  },

  // ────────────────────────── WHATSAPP ──────────────────────────
  {
    id: "wa_1",
    category: "whatsapp",
    type: "text",
    title: "New Customer Welcome",
    description: "Warmly welcome a new customer over WhatsApp.",
    body: `Hi {customer_name} 👋

Welcome to {business_name}! We're so glad to have you.

If you ever need help, just reply to this message. We're here for you.`,
  },
  {
    id: "wa_2",
    category: "whatsapp",
    type: "text",
    title: "Appointment Reminder",
    description: "Remind a customer of an upcoming appointment.",
    body: `Hi {customer_name},

This is a friendly reminder about your appointment with {business_name} on {date} at {time}.

Reply to confirm or reschedule. See you soon!`,
  },
  {
    id: "wa_3",
    category: "whatsapp",
    type: "text",
    title: "Payment Reminder",
    description: "Gently remind a customer of an outstanding payment.",
    body: `Hi {customer_name},

A gentle reminder that your payment of {amount} for {invoice_or_service} is due on {due_date}.

Thank you for your business! — {business_name}`,
  },
  {
    id: "wa_4",
    category: "whatsapp",
    type: "text",
    title: "Special Offer Message",
    description: "Send a personal offer directly to a customer.",
    body: `Hi {customer_name}!

Just for you: {offer_detail} at {business_name}.

Available until {end_date}. Reply to claim or ask any questions. 😊`,
  },
  {
    id: "wa_5",
    category: "whatsapp",
    type: "text",
    title: "Customer Follow-Up",
    description: "Check in with a customer after a service or purchase.",
    body: `Hi {customer_name},

It was great serving you at {business_name}. How was your experience?

We'd love your feedback — just reply here. It only takes a minute.`,
  },

  // ────────────────────────── EMAIL ──────────────────────────
  {
    id: "em_1",
    category: "email",
    type: "text",
    title: "Welcome Email",
    description: "Welcome a new customer or subscriber by email.",
    body: `Subject: Welcome to {business_name}!

Hi {customer_name},

Welcome to the {business_name} family! We're thrilled to have you.

Here's what you can expect from us:
• {benefit_1}
• {benefit_2}
• {benefit_3}

If you have any questions, just reply to this email.

Cheers,
{business_name}`,
  },
  {
    id: "em_2",
    category: "email",
    type: "text",
    title: "Customer Follow-Up",
    description: "Follow up after a purchase or service to gather feedback.",
    body: `Subject: How did we do, {customer_name}?

Hi {customer_name},

Thank you for choosing {business_name}. We'd love to hear about your experience.

Your feedback helps us serve you better. Reply anytime — we read every message.

Best,
{business_name}`,
  },
  {
    id: "em_3",
    category: "email",
    type: "text",
    title: "Invoice Reminder",
    description: "Politely remind a customer about an unpaid invoice.",
    body: `Subject: Friendly reminder: Invoice {invoice_number}

Hi {customer_name},

A quick reminder that invoice {invoice_number} for {amount} is due on {due_date}.

You can pay via {payment_method_or_link}.

Thank you! — {business_name}`,
  },
  {
    id: "em_4",
    category: "email",
    type: "text",
    title: "Promotion Email",
    description: "Announce a promotion or sale to your email list.",
    body: `Subject: {offer_title} — just for you

Hi {customer_name},

We thought you'd like to know about {offer_title}.

{offer_detail}

Available until {end_date}. {call_to_action_link}

Enjoy! — {business_name}`,
  },
  {
    id: "em_5",
    category: "email",
    type: "text",
    title: "Thank You Email",
    description: "Send a heartfelt thank-you to a valued customer.",
    body: `Subject: Thank you, {customer_name}

Hi {customer_name},

Thank you for being part of {business_name}. Your trust means the world to us.

We look forward to serving you again soon.

Warm regards,
{business_name}`,
  },

  // ────────────────────────── CANVA (placeholders) ──────────────────────────
  // Paste your Canva share/template links into `canva_url` below to activate
  // the "Open in Canva" button. Add a `preview_url` image to show a thumbnail.
  {
    id: "cv_1",
    category: "canva",
    type: "canva",
    title: "Instagram Post Template",
    description: "A ready-made Instagram post layout. Add your Canva link to edit.",
    canva_url: "",
    preview_url: "",
  },
  {
    id: "cv_2",
    category: "canva",
    type: "canva",
    title: "Promotional Flyer",
    description: "A bold flyer for promotions and events.",
    canva_url: "",
    preview_url: "",
  },
  {
    id: "cv_3",
    category: "canva",
    type: "canva",
    title: "Business Announcement",
    description: "Announce news or updates with a clean, professional graphic.",
    canva_url: "",
    preview_url: "",
  },
  {
    id: "cv_4",
    category: "canva",
    type: "canva",
    title: "Testimonial Graphic",
    description: "Turn customer praise into a shareable testimonial image.",
    canva_url: "",
    preview_url: "",
  },
  {
    id: "cv_5",
    category: "canva",
    type: "canva",
    title: "Special Offer Graphic",
    description: "A striking offer graphic for sales and discounts.",
    canva_url: "",
    preview_url: "",
  },

  // ────────────────────────── BUSINESS DOCUMENTS ──────────────────────────
  {
    id: "biz_1",
    category: "business_documents",
    type: "text",
    title: "New Customer Welcome",
    description: "Warmly welcome a new customer in writing.",
    body: `Dear {customer_name},

Welcome to {business_name}! We are so happy to have you.

Thank you for choosing us. We are here to give you the best service every time you visit.

If you have any questions, please call us on {phone_number} or send a message anytime. We are always happy to help.

Warm regards,
{business_name}`,
  },
  {
    id: "biz_2",
    category: "business_documents",
    type: "text",
    title: "Customer Follow-Up",
    description: "Check in with a customer after a purchase or service.",
    body: `Dear {customer_name},

Thank you for visiting {business_name} recently. We hope you are happy with your {product_service}.

We just wanted to check in and make sure everything is okay. If you have any questions or need any help, please let us know.

We would love to see you again soon!

Best,
{business_name}`,
  },
  {
    id: "biz_3",
    category: "business_documents",
    type: "text",
    title: "Payment Reminder",
    description: "Gently remind a customer of an outstanding payment.",
    body: `Dear {customer_name},

We hope you are well.

This is a friendly reminder that your payment of {amount} for {product_service} is due on {payment_date}.

You can pay by cash, transfer, or any method that works for you. If you have already paid, please ignore this message — thank you!

Thank you for your business.
{business_name}`,
  },
  {
    id: "biz_4",
    category: "business_documents",
    type: "text",
    title: "Invoice Follow-Up",
    description: "Politely follow up on an unpaid invoice.",
    body: `Dear {customer_name},

We hope this message meets you well.

We are following up on invoice {invoice_number} for {amount}, which was due on {due_date}.

If you have already made the payment, thank you so much — please disregard this reminder. If not, you can settle it at your earliest convenience.

If you have any questions about this invoice, please reach out to us on {phone_number}. We are happy to help.

Thank you for your continued business.
{business_name}`,
  },
  {
    id: "biz_5",
    category: "business_documents",
    type: "text",
    title: "Thank You for Your Purchase",
    description: "Show appreciation after a customer buys from you.",
    body: `Dear {customer_name},

Thank you so much for your purchase of {product_service} from {business_name}.

We truly appreciate your trust in us. If you are happy with your experience, we would be grateful if you could tell a friend or family member about us.

We look forward to serving you again soon!

Warm regards,
{business_name}`,
  },

  // ──────────────── ADDITIONAL SOCIAL MEDIA ────────────────
  {
    id: "sm_6",
    category: "social_media",
    type: "text",
    title: "Behind the Scenes",
    description: "Give followers a peek at how your business works.",
    body: `🎬 Behind the scenes at {business_name}!

Here's a little look at how we prepare {product_service} for you every day. Every detail matters to us, because you deserve the best.

Drop a 💚 if you love seeing how the magic happens!

#SmallBusiness #BehindTheScenes #SupportLocal`,
  },
  {
    id: "sm_7",
    category: "social_media",
    type: "text",
    title: "Educational Business Tip",
    description: "Share a simple, useful tip your customers will value.",
    body: `💡 Business Tip from {business_name}:

{tip_subject} — here's a simple tip that can help you today:

{tip_body}

Small steps make a big difference. Save this post so you can come back to it later!

#BusinessTips #SmallBusinessTips #GrowYourBusiness`,
  },

  // ──────────────── ADDITIONAL EMAIL ────────────────
  {
    id: "em_6",
    category: "email",
    type: "text",
    title: "Payment Reminder Email",
    description: "A gentle, general payment reminder by email.",
    body: `Subject: Friendly payment reminder — {business_name}

Hi {customer_name},

We hope you're doing well.

This is a gentle reminder that your payment of {amount} for {product_service} is due on {payment_date}.

If you have already paid, please ignore this email — thank you! If not, you can settle it whenever it's convenient for you.

If you have any questions, just reply to this email or call us on {phone_number}. We're always happy to help.

Thank you for your business.
{business_name}`,
  },
  {
    id: "em_7",
    category: "email",
    type: "text",
    title: "Product/Service Announcement Email",
    description: "Announce a new product or service to your email list.",
    body: `Subject: Introducing {product_service} from {business_name}

Hi {customer_name},

We're excited to share something new with you!

We've just launched {product_service} — {short_description}.

It's available now, and we'd love for you to be one of the first to try it.

Reply to this email or call us on {phone_number} to learn more or place an order.

Best,
{business_name}`,
  },

  // ────────────────────────── PROMOTIONS & OFFERS ──────────────────────────
  {
    id: "prom_1",
    category: "promotions",
    type: "text",
    title: "Limited-Time Offer",
    description: "Create urgency around a short-term offer.",
    body: `⏰ Limited-Time Offer from {business_name}!

For a short time only, enjoy {offer}.

This offer ends on {expiry_date} — so don't wait!

Come in, message us, or call {phone_number} to take advantage today.

#SpecialOffer #LimitedTime #SupportLocal`,
  },
  {
    id: "prom_2",
    category: "promotions",
    type: "text",
    title: "New Customer Offer",
    description: "Welcome first-time customers with a special offer.",
    body: `🎁 Welcome offer for new customers!

New to {business_name}? We'd love to welcome you with {offer}.

Simply mention this offer when you visit or message us to claim it.

We can't wait to serve you!

#NewCustomerOffer #Welcome #SmallBusiness`,
  },
  {
    id: "prom_3",
    category: "promotions",
    type: "text",
    title: "Existing Customer Offer",
    description: "Reward loyal customers with a thank-you offer.",
    body: `💚 A special thank you from {business_name}!

Because you've been with us, we want to give back. Enjoy {offer} — just for you, our valued customer.

Mention this offer next time you visit or message us to claim it.

Thank you for your continued support!

#CustomerLove #ThankYou #SupportLocal`,
  },

  // ────────────────────────── CUSTOMER COMMUNICATION ──────────────────────────
  {
    id: "cc_1",
    category: "customer_communication",
    type: "text",
    title: "Customer Check-In",
    description: "Reach out to a customer you haven't seen in a while.",
    body: `Hi {customer_name},

It's been a little while since we last saw you at {business_name}. We just wanted to check in and see how you're doing.

If there's anything we can help you with — {product_service} or anything else — please let us know. We'd love to welcome you back soon!

Best,
{business_name}`,
  },
  {
    id: "cc_2",
    category: "customer_communication",
    type: "text",
    title: "Service Update",
    description: "Let customers know about a change to your service.",
    body: `Dear {customer_name},

We wanted to let you know about a quick update from {business_name}.

{update_details}

This change is to help us serve you better. If you have any questions, please reach out to us on {phone_number}.

Thank you for your continued trust.
{business_name}`,
  },
  {
    id: "cc_3",
    category: "customer_communication",
    type: "text",
    title: "Apology / Service Issue",
    description: "Sincerely apologise when something goes wrong.",
    body: `Dear {customer_name},

We are very sorry for the issue you experienced with {product_service}. This is not the standard we hold ourselves to at {business_name}.

We would love the chance to make it right. Please reach out to us on {phone_number} or reply to this message, and we will sort it out as quickly as possible.

Thank you for your patience and understanding.

Sincerely,
{business_name}`,
  },
  {
    id: "cc_4",
    category: "customer_communication",
    type: "text",
    title: "Review Request",
    description: "Ask a happy customer to leave a review.",
    body: `Hi {customer_name},

We hope you loved your experience with {business_name}!

If you have a spare minute, we would be so grateful if you could leave us a quick review. Your words help other people find us and help us keep improving.

{review_link_or_instruction}

Thank you so much for your support — it truly means a lot to us.

{business_name}`,
  },
  {
    id: "cc_5",
    category: "customer_communication",
    type: "text",
    title: "Re-engagement Message",
    description: "Win back a customer who hasn't returned in a while.",
    body: `Hi {customer_name},

We miss you at {business_name}!

It's been a while, and we'd love to welcome you back. To make it worth your while, we're offering {offer} — available until {expiry_date}.

Come see what's new, or message us to find out more. We can't wait to serve you again!

Best,
{business_name}`,
  },
];