# Pockest Project Master Rules (@RULES.md)

## 1. Project Identity
- **Name:** Pockest (Chrome Extension Side Panel + Web Dashboard)
- **Core Value:** "Pin anywhere, View everywhere."
- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase (Auth/DB/Storage).
- **Future Roadmap:** Will be expanded to Mobile App (Flutter), so API & Data structure must remain standard.

## 2. Design System (Strict)
- **Primary Color:** `#7747B5` (Royal Purple). Use for main CTA buttons and active states.
- **Background:** `bg-white` (Card) on `bg-slate-50` (Page).
- **Typography:** `Pretendard` (Dynamic Subset).
- **Dashboard UI:** "Standard Grid". ALL product cards must enforce a fixed aspect ratio (1:1 Square or 4:3) for uniform alignment.
- **Style Concept:** "Apple-style Minimalist". Rounded corners (`rounded-xl` or `2xl`), subtle borders (`border-slate-100`), clean whitespace.

## 3. ⚠️ Iron Rules (Business Logic)
1.  **Logic Preservation:** NEVER remove existing business logic (Supabase calls, `onClick` handlers, State updates). Only change JSX/CSS structure.
2.  **Auth Flow (Benefit First):**
    - **Welcome Page:** NO login button. Only 3-step guide. Login happens via Extension popup later.
3.  **Monetization Gate (Dashboard):**
    - **Check:** On `/dashboard` entry, check `affiliate_agreed` in `profiles`.
    - **Action:** If `false`, block access with an **Unclosable Backdrop Blur Modal**.
    - **Copy:** "Your price stays the same. Commissions support our server costs."
4.  **Affiliate Link Strategy:**
    - **Storage:** Always save the **Clean Original URL** in DB. NEVER hardcode affiliate tags in the database.
    - **Injection:** Apply tags dynamically via a utility function (`utils/affiliate.ts`) ONLY when the user clicks "Visit Store". (Prepare structure for future ID insertion).

## 4. Image Optimization Strategy (Mobile Ready)
- **Process:** Extension crops image to 1:1/4:3 ratio -> Converts to WebP (Quality 80%, Max 200px) -> Uploads to Supabase Storage (`thumbnails` bucket).
- **Data:** Save the Supabase Storage URL in DB, NOT the external shopping mall URL.
- **UX:** Generate/Save `BlurHash` for instant placeholder loading.

## 5. Design Quality Standards (The "Apple-Style" Polish)
- **Spacing:** Avoid dense layouts. Use ample padding (`p-6`+) and gaps (`gap-6`). Detach content from edges.
- **Depth:** NO heavy shadows. Use `border border-slate-100` + `shadow-sm` (or `shadow-md` on hover).
- **Typography:** Apply `tracking-tight` to headings. NEVER use pure black; use `text-slate-900` (Title) / `text-slate-500` (Body).

## 6. Priority Tasks Sequence
1.  **Bug Fix:** Fix `get is not defined` error.
2.  **Config:** Update Tailwind & Font.
3.  **UI Renewal:** Welcome Page & Extension Side Panel.
4.  **Feature:** Dashboard Monetization Gate & Grid Layout.
5.  **Core Logic:** Implement Image Optimization Pipeline.

## 7. Communication Rules
- **Language:** All feedback and communication must be in **Korean** (Hangul).

## 8. Definition of Done
- **Build Verification:** 
    - Default: Do NOT auto-build after every small change to save time.
    - Protocol: Always **ASK the user** for permission before running `npm run build` or deploying.
    - Exception: If the user explicitly commands "Build it" or "Deploy it".