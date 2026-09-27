// Curated, approved affiliate marketing resource library. All copy is grounded
// in genuine FADS features only — no invented features, no income guarantees,
// no spammy language. School copy uses "Parent" (not Parent/Guardian). Church
// copy never describes voluntary giving as debt and avoids aggressive sales.
//
// These are static, code-maintained resources (the simplest reuse of the
// existing content architecture). Admin-managed Canva graphics reuse the
// existing CanvaTemplate entity + AdminTemplateManager.

export const AUDIENCES = [
  { key: "business", label: "Business", desc: "Small businesses, sole traders, freelancers" },
  { key: "school", label: "School", desc: "Schools, administrators, parents" },
  { key: "church", label: "Church", desc: "Churches, ministries, faith communities" },
  { key: "general", label: "General FADS", desc: "Anyone who runs an organisation" },
];

export const CHANNELS = [
  { key: "social", label: "Social Post", icon: "Share2" },
  { key: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { key: "dm", label: "DM", icon: "UserCheck" },
  { key: "email", label: "Email", icon: "Mail" },
];

export const SOCIAL_TYPES = [
  { key: "short_post", label: "Short Post" },
  { key: "long_post", label: "Long Post" },
  { key: "story", label: "Story" },
  { key: "reel_idea", label: "Reel Idea" },
  { key: "educational", label: "Educational Post" },
  { key: "problem_solution", label: "Problem/Solution Post" },
  { key: "launch_offer", label: "Launch/Offer Post" },
];

export const GETTING_STARTED_STEPS = [
  { title: "Choose who you're talking to", desc: "Business, School or Church — FADS tailors the words to fit." },
  { title: "Choose a ready-made message", desc: "Pick a social post, WhatsApp, DM or email from the library." },
  { title: "Personalise it if you want", desc: "Tell FADS who you're speaking to and it adapts the words for you." },
  { title: "Add your affiliate link", desc: "One tap inserts your genuine referral link." },
  { title: "Share it", desc: "Copy and paste wherever you're talking to people." },
];

export const COMPLIANCE_POINTS = [
  "Describe FADS accurately — don't invent features that don't exist.",
  "Don't guarantee income, earnings or results.",
  "Don't pretend to be official FADS staff unless you've been authorised.",
  "Disclose your affiliate/referral relationship where it's required.",
  "Don't spam — share FADS where it's genuinely useful.",
  "Respect people's privacy and preferences.",
];

// The affiliate link placeholder that gets replaced with the real link.
export const LINK_PLACEHOLDER = "[MY FADS LINK]";

// ---- Talking-to messages (short intros per audience) ----
export const TALKING_TO = {
  business: {
    intro:
      "FADS gives small businesses access to the kind of Finance, HR, CRM, admin and AI support that normally takes several systems or a larger team.",
    short:
      "I've found a business platform I think you'd like. FADS brings Finance, HR, CRM, content and everyday admin together, with an AI assistant that helps you figure out what needs attention and what to do next.",
    social:
      "Running a small business usually means juggling five different apps and a spreadsheet that's always behind. FADS puts Finance, HR, CRM, content and everyday admin in one place — with an AI assistant that tells you what needs attention today. If you know a business owner who's drowning in admin, this is worth a look.",
    whatsapp:
      "Hey! I thought of you — I've been using FADS for my business admin. It brings Finance, HR, CRM and content together in one place, and the AI assistant helps me see what needs doing next. No pressure, but here's my link if you want a look: [MY FADS LINK]",
    dm:
      "Hi! I use FADS to run my business admin — Finance, HR, CRM and content in one place with an AI assistant. Thought it might be useful for you too. Here's my link if you'd like to explore: [MY FADS LINK]",
    email: {
      subject: "An easier way to run the business admin?",
      body:
        "Hi {name},\n\nI've been using FADS to run my business admin and thought of you. It brings Finance, HR, CRM, content and everyday organisation into one place — with an AI assistant that helps you see what needs attention and what to do next.\n\nIf you're curious, you can explore it here: [MY FADS LINK]\n\nNo pressure at all — just thought it might be useful.\n\nBest,\n{your_name}",
      cta: "Explore FADS",
    },
  },
  school: {
    intro:
      "FADS helps schools keep students, Parents, fees, staff, enquiries and everyday administration together in one place, with AI helping the team see what needs attention next.",
    short:
      "FADS helps schools keep students, Parents, fees, staff, enquiries and everyday admin together in one place — with AI helping the team see what needs attention next.",
    social:
      "Schools juggle students, Parents, fees, staff, enquiries and announcements across too many tools. FADS brings it all into one place — with an AI assistant that flags what needs attention next. If you know a school administrator who's stretched thin, this could help.",
    whatsapp:
      "Hi! I use FADS and thought of your school. It keeps students, Parents, fees, staff and enquiries together in one place, with AI helping the team see what needs attention. Here's my link if you'd like a look: [MY FADS LINK]",
    dm:
      "Hi! I thought FADS might be useful for your school — it brings students, Parents, fees, staff and admin together in one place with an AI assistant. Here's my link: [MY FADS LINK]",
    email: {
      subject: "Keeping students, Parents and fees in one place",
      body:
        "Hi {name},\n\nI thought FADS might be useful for your school. It brings students, Parents, fees, staff, enquiries and everyday admin together in one place — with an AI assistant that helps your team see what needs attention next.\n\nIf you'd like to explore it: [MY FADS LINK]\n\nHappy to answer any questions.\n\nBest,\n{your_name}",
      cta: "Explore FADS for Schools",
    },
    admin_intro:
      "FADS helps school administrators spend less time chasing spreadsheets by bringing students, Parents, fees, staff and everyday admin into one simple system — with AI that surfaces what needs attention next.",
  },
  church: {
    intro:
      "FADS helps churches spend less time managing back-office administration by bringing people, events, communications, Finance and everyday organisation into one simple system.",
    short:
      "FADS helps churches spend less time on back-office admin by bringing people, events, communications, Finance and everyday organisation into one simple system.",
    social:
      "Churches do a lot of people work and a lot of admin behind it. FADS brings people, events, communications, Finance and everyday organisation into one simple system — so the team can spend more time on the community and less on the spreadsheets.",
    whatsapp:
      "Hi! I thought of your church — FADS brings people, events, communications, Finance and everyday admin into one simple system. Here's my link if you'd like a look: [MY FADS LINK]",
    dm:
      "Hi! I thought FADS might help your church — it brings people, events, communications and Finance into one place so you spend less time on admin. Here's my link: [MY FADS LINK]",
    email: {
      subject: "Less admin, more community",
      body:
        "Hi {name},\n\nI thought FADS might be useful for your church. It brings people, events, communications, Finance and everyday organisation into one simple system — so your team can spend less time on admin and more time on the community.\n\nIf you'd like to explore it: [MY FADS LINK]\n\nHappy to chat if you have questions.\n\nBest,\n{your_name}",
      cta: "Explore FADS",
    },
    starter:
      "I use a platform called FADS that helps with the behind-the-scenes admin — people, events, communications and Finance in one place. Would you be open to a quick look?",
  },
};

// ---- Social media post library ----
export const SOCIAL_POSTS = [
  // Business
  { audience: "business", type: "short_post", title: "Big businesses have departments. Small businesses have FADS.",
    body: "Big businesses have departments. Small businesses have FADS.\n\nFinance, HR, CRM, content and everyday admin — in one place, with an AI assistant that tells you what needs attention today.\n\n[MY FADS LINK]" },
  { audience: "business", type: "long_post", title: "Your AI Business Back Office",
    body: "I used to run my business across 5 apps and a spreadsheet that was always behind.\n\nNow I use FADS — one place for Finance, HR, CRM, content and everyday admin. The AI assistant looks at everything and tells me what needs attention today: an overdue invoice, a follow-up I forgot, a fee reminder that should go out.\n\nIt's like having a back office without hiring a back office.\n\nIf you run a small business, have a look: [MY FADS LINK]" },
  { audience: "business", type: "problem_solution", title: "Drowning in admin?",
    body: "Problem: you're juggling finance, staff, customers and content across too many tools.\n\nSolution: FADS puts it all in one place — and the AI assistant tells you what needs doing next.\n\n[MY FADS LINK]" },
  { audience: "business", type: "educational", title: "What is an AI business suite?",
    body: "An AI business suite isn't another spreadsheet. It's one place for your Finance, HR, CRM and content — with an AI assistant that reads what's going on and tells you what to do next.\n\nThat's FADS. [MY FADS LINK]" },
  // School
  { audience: "school", type: "short_post", title: "Students, Parents and fees in one place",
    body: "Students, Parents, fees, staff, enquiries and announcements — all in one place.\n\nFADS helps schools see what needs attention next. [MY FADS LINK]" },
  { audience: "school", type: "long_post", title: "For the school administrator who's stretched thin",
    body: "If you're running a school, you're juggling students, Parents, fees, staff, enquiries and announcements — usually across too many tools.\n\nFADS brings it all into one place, and the AI assistant helps you see what needs attention next: a fee reminder, a follow-up, an announcement that should go out.\n\nIf you know a school administrator who's stretched thin, share this: [MY FADS LINK]" },
  { audience: "school", type: "educational", title: "Fee reminders without the chase",
    body: "Chasing fees is the worst part of school admin. FADS tracks who owes what and helps you send a polite, personalised reminder in a couple of taps.\n\n[MY FADS LINK]" },
  // Church
  { audience: "church", type: "short_post", title: "Less admin, more community",
    body: "FADS helps churches spend less time on back-office admin — people, events, communications and Finance in one simple system.\n\n[MY FADS LINK]" },
  { audience: "church", type: "long_post", title: "For churches doing a lot with a small team",
    body: "Churches do a huge amount of people work — and a lot of admin behind it. Members, visitors, volunteers, events, communications, Finance.\n\nFADS brings it into one simple system so your team spends less time on spreadsheets and more time on the community.\n\n[MY FADS LINK]" },
  { audience: "church", type: "educational", title: "What is FADS?",
    body: "FADS is a simple system that helps churches with people, events, communications and everyday Finance — so the back office doesn't eat your week.\n\n[MY FADS LINK]" },
  // General
  { audience: "general", type: "short_post", title: "Your AI Business Back Office",
    body: "Your AI Business Back Office.\n\nFinance, HR, CRM, content and everyday admin — in one place, with an AI assistant that tells you what needs attention today.\n\n[MY FADS LINK]" },
  { audience: "general", type: "reel_idea", title: "Reel idea: 'What if one app ran your whole back office?'",
    body: "Reel idea: Open with 'What if one app ran your whole back office?' Quick cuts of Finance, HR, CRM, Content screens. End with the FADS assistant saying 'Here's what needs your attention today.' CTA: [MY FADS LINK]" },
  { audience: "general", type: "launch_offer", title: "New to FADS? Start here",
    body: "New to FADS? It's one place for Finance, HR, CRM, content and everyday admin — with an AI assistant that tells you what needs attention today.\n\nStart here: [MY FADS LINK]" },
];

// ---- Email library ----
export const EMAILS = [
  { id: "email_business_intro", audience: "business", title: "Introducing FADS to a Business",
    subject: "An easier way to run the business admin?",
    body: "Hi {name},\n\nI've been using FADS to run my business admin and thought of you. It brings Finance, HR, CRM, content and everyday organisation into one place — with an AI assistant that helps you see what needs attention and what to do next.\n\nIf you're curious, you can explore it here: [MY FADS LINK]\n\nNo pressure at all — just thought it might be useful.\n\nBest,\n{your_name}",
    cta: "Explore FADS" },
  { id: "email_school_intro", audience: "school", title: "Introducing FADS to a School",
    subject: "Keeping students, Parents and fees in one place",
    body: "Hi {name},\n\nI thought FADS might be useful for your school. It brings students, Parents, fees, staff, enquiries and everyday admin together in one place — with an AI assistant that helps your team see what needs attention next.\n\nIf you'd like to explore it: [MY FADS LINK]\n\nHappy to answer any questions.\n\nBest,\n{your_name}",
    cta: "Explore FADS for Schools" },
  { id: "email_church_intro", audience: "church", title: "Introducing FADS to a Church",
    subject: "Less admin, more community",
    body: "Hi {name},\n\nI thought FADS might be useful for your church. It brings people, events, communications, Finance and everyday organisation into one simple system — so your team can spend less time on admin and more time on the community.\n\nIf you'd like to explore it: [MY FADS LINK]\n\nHappy to chat if you have questions.\n\nBest,\n{your_name}",
    cta: "Explore FADS" },
  { id: "email_followup", audience: "general", title: "Follow-Up Email",
    subject: "Just checking in — FADS",
    body: "Hi {name},\n\nI shared FADS with you recently and wanted to check in. It's one place for Finance, HR, CRM, content and everyday admin — with an AI assistant that tells you what needs attention today.\n\nWhenever you're ready, here's the link: [MY FADS LINK]\n\nHappy to answer any questions.\n\nBest,\n{your_name}",
    cta: "Explore FADS" },
  { id: "email_quick_look", audience: "general", title: "Here's a quick look at FADS",
    subject: "Here's a quick look at FADS",
    body: "Hi {name},\n\nA few people asked what FADS actually does — so here's the short version:\n\n• Finance — transactions, invoices, who owes you, receipts, reports\n• HR — staff, leave, attendance, documents\n• CRM — contacts, pipeline, follow-ups\n• Content Centre — posts, emails, messages, Canva templates\n• AI Assistant — tells you what needs attention today\n\nAll in one place. Here's the link: [MY FADS LINK]\n\nBest,\n{your_name}",
    cta: "Explore FADS" },
  { id: "email_how_it_works", audience: "general", title: "Want to see how FADS works?",
    subject: "Want to see how FADS works?",
    body: "Hi {name},\n\nIf you've been curious about FADS, the easiest way is to try it. You can explore Finance, HR, CRM and the AI assistant, and see what needs attention today.\n\nStart here: [MY FADS LINK]\n\nBest,\n{your_name}",
    cta: "Explore FADS" },
];

// ---- WhatsApp + DM library (short, conversational) ----
export const MESSAGES = [
  // Business
  { audience: "business", type: "first_message", title: "First Message — Business",
    body: "Hey! I use FADS for my business admin — Finance, HR, CRM and content in one place with an AI assistant. Thought it might be useful for you too. No pressure — here's my link if you want a look: [MY FADS LINK]" },
  { audience: "business", type: "follow_up", title: "Follow-Up — Business",
    body: "Hey {name}, just following up on FADS — the business admin platform I mentioned. Whenever you're ready, here's the link: [MY FADS LINK]" },
  { audience: "business", type: "someone_asked", title: "Someone Asked What FADS Is",
    body: "Good question! FADS is one place for Finance, HR, CRM, content and everyday admin — with an AI assistant that tells you what needs attention today. Here's the link: [MY FADS LINK]" },
  { audience: "business", type: "wants_info", title: "Someone Wants More Information",
    body: "Happy to share more! FADS brings Finance, HR, CRM, content and admin into one place, and the AI assistant helps you see what needs doing next. You can explore it here: [MY FADS LINK]" },
  // School
  { audience: "school", type: "first_message", title: "First Message — School",
    body: "Hi! I thought of your school — FADS keeps students, Parents, fees, staff and enquiries together in one place, with AI helping the team see what needs attention. Here's my link: [MY FADS LINK]" },
  { audience: "school", type: "follow_up", title: "Follow-Up — School",
    body: "Hi {name}, just following up on FADS — it could help your school with students, Parents, fees and everyday admin. Here's the link: [MY FADS LINK]" },
  { audience: "school", type: "someone_asked", title: "Someone Asked What FADS Is",
    body: "FADS is one place for students, Parents, fees, staff, enquiries and everyday admin — with an AI assistant that helps the team see what needs attention. Here's the link: [MY FADS LINK]" },
  { audience: "school", type: "wants_info", title: "Someone Wants More Information",
    body: "Of course! FADS brings students, Parents, fees, staff and admin into one place, and the AI assistant helps your team see what needs doing next. Explore it here: [MY FADS LINK]" },
  // Church
  { audience: "church", type: "first_message", title: "First Message — Church",
    body: "Hi! I thought of your church — FADS brings people, events, communications and Finance into one simple system so you spend less time on admin. Here's my link: [MY FADS LINK]" },
  { audience: "church", type: "follow_up", title: "Follow-Up — Church",
    body: "Hi {name}, just following up on FADS — it could help your church with people, events, communications and everyday Finance. Here's the link: [MY FADS LINK]" },
  { audience: "church", type: "someone_asked", title: "Someone Asked What FADS Is",
    body: "FADS is a simple system that helps churches with people, events, communications and everyday Finance — so the back office doesn't eat your week. Here's the link: [MY FADS LINK]" },
  { audience: "church", type: "wants_info", title: "Someone Wants More Information",
    body: "Happy to share more! FADS brings people, events, communications and Finance into one place for churches. Explore it here: [MY FADS LINK]" },
  { audience: "general", type: "share_demo", title: "Share Demo",
    body: "If you want to see how FADS works without committing anything, you can try a demo first — Finance, HR, CRM and the AI assistant with sample data. Here's the link: [MY FADS LINK]" },
];

// ---- Featured This Week ----
export const FEATURED = [
  { audience: "business", title: "This week's Business post", body: SOCIAL_POSTS[0].body },
  { audience: "school", title: "This week's School post", body: SOCIAL_POSTS[4].body },
  { audience: "church", title: "This week's Church post", body: SOCIAL_POSTS[7].body },
];

// Insert the affiliate's real link into a piece of copy.
export function insertLink(text, link) {
  if (!link) return text;
  return text.split(LINK_PLACEHOLDER).join(link);
}