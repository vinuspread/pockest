# Pockest Project Context Document v1.0
> **Single Source of Truth** for Development Continuity  
> Last Updated: 2024-12-24

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Current Status Analysis](#2-current-status-analysis)
3. [Database & Environment](#3-database--environment)
4. [Feature Audit](#4-feature-audit)
5. [New Specifications](#5-new-specifications)
6. [Todo List](#6-todo-list)
7. [Technical Debt](#7-technical-debt)

---

## 1. Project Overview

### Identity
- **Name:** Pockest (포케스트)
- **Type:** Chrome Extension (Manifest V3) + Web Dashboard SPA
- **Purpose:** Shopping Wishlist Management with Price Comparison
- **Target Scale:** 100k+ Users

### Tech Stack
| Category | Technology |
|----------|-----------|
| **Frontend** | React 18 + TypeScript (Strict Mode) + Vite |
| **Styling** | Tailwind CSS + **Pretendard Variable Font** |
| **State** | Zustand (Minimized re-renders) |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Extension** | @crxjs/vite-plugin (Manifest V3) |
| **i18n** | react-i18next (Auto-detect: ko, en, ja, zh) |
| **Hosting** | Vercel (CI/CD) |

### Project Structure
```
/src
  /assets           # Static files (icons)
  /background       # Service Worker (index.ts)
  /components       # UI Components
    /layout         # Header, Sidebar
    /ui             # Atomic components (Button, Card, Input, Toast)
    PocketItem.tsx  # Folder list item
  /hooks            # Business Logic Hooks
    useAuth.ts      # Auth state & actions
    useItems.ts     # Items CRUD
    usePockets.ts   # Folders management
  /locales          # i18n JSON files (ko, en, ja, zh)
  /pages
    /content        # Content Script (Product Parser)
    /popup          # Side Panel UI (600px)
    /dashboard      # Web Dashboard (Full Page)
    /welcome        # First-time Guide
  /services
    /supabase       # Supabase client
    /storage        # Chrome Storage wrapper
  /store            # Zustand Stores
    useAuthStore.ts # Auth global state
    usePocketStore.ts # Pockets & Items state
  /styles
    global.css      # Pretendard Font + TailwindCSS
  /types            # TypeScript definitions
  /utils            # Utility functions
    parser.ts       # Product scraping engine v2.0
    navigation.ts   # Tab reuse logic
    format.ts       # Price, Date formatting
```

---

## 2. Current Status Analysis

### 2.1 Authentication Flow ✅ **FULLY IMPLEMENTED**

#### Supabase Auth Integration
- **Email/Password:** `useAuthStore.signInWithEmail()`, `signUpWithEmail()`
- **Google OAuth:** `signInWithGoogle()` via Chrome Identity API
  - Flow: PKCE (Code Exchange) + Implicit (Token)
  - Redirect URL: `chrome.identity.getRedirectURL()`
- **Session Persistence:** Zustand `persist` middleware + localStorage
- **Auto-Reconnect:** `initialize()` on app mount (Popup & Dashboard)

#### User Profile Schema
```typescript
interface User {
  id: string;          // Supabase Auth User ID
  email: string;
  tier: 'free' | 'premium';
}
```

**Source Files:**
- `src/store/useAuthStore.ts` (182 lines)
- `src/hooks/useAuth.ts` (60 lines)
- `src/services/supabase/client.ts` (PKCE flow config)

---

### 2.2 Extension Architecture ✅ **FULLY IMPLEMENTED**

#### Side Panel Popup (600px)
**Location:** `src/pages/popup/Popup.tsx` (1005 lines)

**Features:**
1. **Product Auto-Detection:**
   - Real-time scraping on tab change (`chrome.tabs.onActivated`)
   - Content Script message: `{ type: 'SCRAPE_PRODUCT' }`
   - Display: Thumbnail Carousel (multi-image support)

2. **Manual Editing:**
   - **Title Edit:** Click "edit" button → inline input → Enter to save
   - **Price Edit:** Click pencil icon → live comma formatting → Enter to save
   - **Image Selector:** Carousel with prev/next buttons (max 10 images)

3. **Folder Selection:**
   - Tab 1: **Pocket** - All folders with search filter
   - Tab 2: **Today** - Items saved within 24h (DB logic: `NOW() - 24h`)
   - "담기" button appears on hover
   - Save success → Green banner with "Undo" button

4. **Folder Creation:**
   - Bottom fixed button → Inline input → Enter to create
   - Auto-refresh pocket list

**Source Files:**
- `src/pages/popup/Popup.tsx`
- `src/pages/popup/index.html`
- `src/pages/popup/main.tsx`

#### Content Script
**Location:** `src/pages/content/index.tsx` (148 lines)

**Product Parser v2.0** (`src/utils/parser.ts` - 585 lines):
- **Strategy:**
  1. Meta Tags (`og:image`, `og:title`, `product:price`)
  2. JSON-LD Structured Data (`@type: Product`)
  3. DOM Analysis (Largest images > 300px)
  4. Mall-specific selectors (Naver, Coupang, 11st, etc.)

- **Output:**
```typescript
interface ProductData {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string;        // Primary image
  imageUrls: string[];     // Max 10 candidates
  mallName: string;
  url: string;
}
```

- **Supported Malls:** (Customized Selectors)
  - 네이버 스마트스토어, 쿠팡, 11번가, G마켓, 옥션, SSG, 롯데온
  - 무신사, 29cm, W컨셉
  - Amazon, AliExpress

**Source Files:**
- `src/utils/parser.ts` (Product extraction logic)
- `src/pages/content/index.tsx` (Message handler)

#### Background Worker
**Location:** `src/background/index.ts` (132 lines)

**Functions:**
- Side Panel auto-open on extension icon click
- Message relay between Popup ↔ Content Script
- Auth state broadcast to all tabs

---

### 2.3 Dashboard Architecture ✅ **FULLY IMPLEMENTED**

#### Main Layout
**Location:** `src/pages/dashboard/Dashboard.tsx` (453 lines)

**Components:**
- **Header** (`src/components/layout/Header.tsx` - 79 lines):
  - Logo + Global Search (Enter to trigger)
  - Bell icon (future: notifications)
  - User icon (future: dropdown menu)

- **Sidebar** (`src/components/layout/Sidebar.tsx` - 189 lines):
  - **Fixed Views:**
    - 🏠 All Items (`currentView='all'`)
    - 🕐 Today Saved (`currentView='today'`, DB: 24h filter)
    - ⭐ Favorites (`currentView='pinned'`)
  - **Folders Section:**
    - Dynamic pocket list with item count
    - "+" button to create new folder
    - Click → Fetch items by pocket ID
  - **Trash:**
    - 🗑️ Soft-deleted items (`deleted_at IS NOT NULL`)
    - Restore or Permanent Delete actions
  - **Account Management:**
    - Click → Open Settings page in new tab

#### Item Grid View
**Features:**
- Masonry Grid (4 columns: xl, 3: lg, 2: sm, 1: mobile)
- **Card Actions:**
  - ⭐ **Pin Toggle:** Zero-latency optimistic update
    - If unpinned in "Favorites" view → Remove from list instantly
  - 🗑️ **Move to Trash:** Soft delete (set `deleted_at`)
  - 🌐 **Visit:** Open product URL in new tab
- **Trash View Actions:**
  - ♻️ **Restore:** Clear `deleted_at` field
  - 💀 **Permanent Delete:** Hard delete (non-recoverable)

**Source Files:**
- `src/pages/dashboard/Dashboard.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`

#### Settings Page
**Location:** `src/pages/dashboard/Settings.tsx` (62 lines)

**Features:**
- Profile Card (avatar + email)
- **Logout Button:** Clear session → Redirect to login
- **Withdraw Button:** ⚠️ Delete account + all data (confirmation prompt)

---

### 2.4 State Management ✅ **FULLY IMPLEMENTED**

#### Zustand Stores

**1. Auth Store** (`src/store/useAuthStore.ts` - 271 lines)
- **State:** `user`, `status` ('loading' | 'authenticated' | 'unauthenticated'), `error`
- **Actions:**
  - `initialize()` - Restore session from Supabase
  - `signInWithEmail()`, `signUpWithEmail()`, `signInWithGoogle()`
  - `signOut()`, `clearError()`
- **Persistence:** localStorage (`pockest-auth` key)

**2. Pocket Store** (`src/store/usePocketStore.ts` - 578 lines)
- **State:**
  - `pockets: PocketWithCount[]` (with `item_count`, `recent_thumbnails`)
  - `items: Item[]`
  - `selectedPocketId: string | null`
  - `filters: ItemFilters` (UI state only, NOT used in queries)

- **Key Pattern: "Silo Architecture"** (Zero Cross-Contamination)
  - Each fetch function is **completely independent**
  - No shared filter logic between queries
  - State reset before every fetch: `resetItemsState()`

- **Fetch Functions (Pure):**
  - `fetchAllItems()` - All active items
  - `fetchItemsByPocket(pocketId)` - Single folder
  - `fetchPinnedItems()` - Favorites only
  - `fetchTodayItems()` - Last 24h (client-side: `NOW() - 24h`)
  - `fetchTrashItems()` - Soft-deleted items
  - `searchItems(query)` - Global search (title ILIKE)

- **CRUD Actions:**
  - `addItem()` - Insert + Real-time sidebar count sync (+1)
  - `moveToTrash()` - Set `deleted_at` + Optimistic UI update + Count sync (-1)
  - `restoreFromTrash()` - Clear `deleted_at` + Count sync (+1)
  - `permanentDelete()` - Hard delete
  - `togglePin()` - Zero-latency toggle + Rollback on error

**Performance Strategy:**
- **Optimistic Updates:** UI updates before server response
- **Silent Network Calls:** No loading spinners for pin/trash actions
- **Rollback Logic:** Restore state on failure

---

### 2.5 UI Component Library ✅ **IMPLEMENTED**

#### Atomic Components (`src/components/ui/`)
- **Button** (`Button.tsx` - 88 lines):
  - Variants: `primary`, `secondary`, `ghost`, `danger`
  - Sizes: `sm`, `md`, `lg`
  - Loading state with spinner
  - Left/Right icon support

- **Card** (`Card.tsx`):
  - Container with border + shadow
  - `CardContent` subcomponent

- **Input** (`Input.tsx`):
  - Email, Password, Search types
  - Left icon support
  - Error state styling

- **Toast** (`Toast.tsx`):
  - Types: `success`, `error`, `warning`, `info`
  - Auto-dismiss after 3s
  - Custom hook: `useToast()`

- **Tooltip** (`Tooltip.tsx`):
  - Hover-triggered tooltip
  - Used for long product titles (line-clamp-3)

- **ItemCard** (`ItemCard.tsx`):
  - Product display card
  - Thumbnail + Title + Price + Actions

#### Layout Components (`src/components/layout/`)
- **Header** (Search bar + Logo + User actions)
- **Sidebar** (Navigation + Folders + Trash)

#### Specialized Components
- **PocketItem** (`src/components/PocketItem.tsx` - 131 lines):
  - Dual-mode: Popup (Save button) vs Sidebar (Navigation)
  - Thumbnail preview (first of `recent_thumbnails`)
  - Click handler:
    - Popup mode → Open Dashboard tab (reuse if exists)
    - Sidebar mode → Fetch items by pocket ID

---

### 2.6 Internationalization (i18n) ✅ **FULLY IMPLEMENTED**

**Setup:** `src/i18n.ts` (86 lines)
- **Library:** i18next + react-i18next + LanguageDetector
- **Detection Order:** localStorage → Browser Language → HTML lang attr
- **Supported Languages:** `ko`, `en`, `ja`, `zh`
- **Fallback:** English

**Translation Files:** (`src/locales/`)
- `ko.json` (92 lines) - Korean (Primary)
- `en.json` - English
- `ja.json` - Japanese
- `zh.json` - Chinese (Simplified)

**Coverage:**
- Welcome page (3-step guide)
- Auth pages (Login/Signup)
- Popup (Folder selection, Save, Today tab)
- Dashboard (All views, Actions)
- Error messages

**API:**
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <p>{t('welcome.title')}</p>;
```

**Language Selector:**
- Available on Welcome page (top-right dropdown)
- Persisted to localStorage (`pockest-language` key)

---

### 2.7 Welcome Page ✅ **FULLY IMPLEMENTED**

**Location:** `src/pages/welcome/Welcome.tsx` (131 lines)

**Design:**
- Gradient background (violet-50 → white → purple-50)
- 3-step guide cards with icons:
  1. 📌 **Pin Extension:** Find in browser toolbar
  2. 🪟 **Open Side Panel:** Click icon during shopping
  3. 🛒 **Save Products:** Store to folders

**Features:**
- Language selector (top-right, globe icon)
- Tips section (gradient box):
  - Auto product detection
  - Folder organization
  - Today tab for recent items
- **CTA Button:** "Start" → Navigate to `/dashboard`
  - If unauthenticated → Login page
  - If authenticated → Dashboard home

**Trigger:**
- Extension install event → Open Welcome page automatically

---

## 3. Database & Environment

### 3.1 Supabase Setup ✅ **CONFIRMED OPERATIONAL**

**Status:** ✅ **Tables exist, .env configured, Connection working**

**Evidence:**
- TypeScript types auto-generated from DB schema (`src/types/database.ts` - 246 lines)
- User tested features successfully (Login, Save, Fetch)
- `.env` file exists locally (excluded from git via `.gitignore`)

**Connection Config:** (`src/services/supabase/client.ts`)
```typescript
export const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // CRITICAL for Extension
      storage: localStorage,
      flowType: 'pkce',
    },
  }
);
```

### 3.2 Database Schema

#### Tables

**1. profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. pockets** (Folders)
```sql
CREATE TABLE pockets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pockets_user_id ON pockets(user_id);
```

**3. items** (Products)
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pocket_id UUID REFERENCES pockets(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  site_name TEXT,
  price NUMERIC(10, 2),
  currency TEXT DEFAULT 'KRW',
  is_pinned BOOLEAN DEFAULT FALSE,
  memo TEXT,
  deleted_at TIMESTAMPTZ, -- NULL = Active, NOT NULL = Trashed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_pocket_id ON items(pocket_id);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_deleted_at ON items(deleted_at);
```

#### Views (Optional - for future optimization)
- `active_items`: Items where `deleted_at IS NULL`
- `trash_items`: Items where `deleted_at IS NOT NULL`

#### RPC Functions (Database-side logic)
- `get_today_items(p_user_id UUID)` - Returns items from last 24h
- `move_item_to_trash(p_item_id UUID, p_user_id UUID)` - Soft delete
- `restore_item_from_trash(p_item_id UUID, p_user_id UUID)` - Restore
- `empty_trash_older_than(days INT)` - Auto-cleanup

### 3.3 Environment Variables

**Required:** `.env` (Git-ignored, must be created manually)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# App Configuration
VITE_APP_NAME=Pockest
VITE_APP_VERSION=1.0.0
```

**How to Get:**
1. Supabase Dashboard → Your Project
2. Settings → API
3. Copy "Project URL" and "anon public" key

**Template:** `env.example` (Committed to repo)

---

## 4. Feature Audit

### 4.1 Completed Features (Production-Ready)

#### Chrome Extension
- ✅ Side Panel UI (600px fixed width)
- ✅ Product auto-detection (OG tags + JSON-LD + DOM)
- ✅ Multi-image extraction (max 10, with carousel)
- ✅ Manual title/price editing
- ✅ Folder selection with search
- ✅ Today tab (24h filter)
- ✅ Folder creation (inline input)
- ✅ Save with undo button
- ✅ Tab change detection → Auto-refresh product

#### Web Dashboard
- ✅ Grid view (responsive masonry)
- ✅ Sidebar navigation (All, Today, Favorites, Folders, Trash)
- ✅ Global search (Enter to trigger)
- ✅ Pin toggle (zero-latency)
- ✅ Trash system (soft delete + restore + permanent delete)
- ✅ Settings page (Logout, Withdraw)

#### Data Layer
- ✅ Supabase Auth (Email + Google OAuth)
- ✅ Real-time sync (Popup ↔ Dashboard)
- ✅ Optimistic updates (Pin, Trash)
- ✅ Sidebar count auto-sync (no extra fetches)

#### UX/UI
- ✅ Pretendard Variable font (Korean + English + Japanese)
- ✅ Multi-language support (ko, en, ja, zh)
- ✅ Welcome page (3-step guide)
- ✅ Toast notifications
- ✅ Loading states
- ✅ Error handling with user-friendly messages

### 4.2 Known Limitations
- ❌ **Image Upload:** Products are NOT stored in Supabase Storage (only URLs)
  - **Implication:** External images may break if source site removes them
  - **Future:** Client-side resize + Upload to Storage

- ❌ **Affiliate Logic:** Not implemented yet (see Section 5.3)

- ❌ **Price History:** Price changes are not tracked

- ❌ **Notifications:** Bell icon in Header is non-functional

- ❌ **User Dropdown:** User icon in Header is non-functional

- ❌ **Memo Field:** Item memo is in DB schema but not exposed in UI

---

## 5. New Specifications

### 5.1 Global Design Change: Font Migration

**Current:** Inter font (generic sans-serif)  
**Target:** **Pretendard Variable** (Variable font with KR/EN/JP unified appearance)

**Status:** ✅ **ALREADY IMPLEMENTED**

**Evidence:**
- `src/styles/global.css` - Line 2: `@import url("...pretendardvariable.min.css")`
- Font stack includes Japanese fallbacks (Hiragino, Meiryo)
- Applied globally in `<html>` tag

**No action needed.**

---

### 5.2 Welcome Page Renewal: Apple-Style Guide

**Current State:** ✅ Already Apple-inspired
- Gradient background
- 3-step cards with icons
- Smooth transitions
- Language selector

**Requested Changes:** (If needed)
- Remove "Start" button → Make it purely informational guide
- Auto-dismiss after 3 seconds
- No login gate

**Decision:** **Keep current design** (User can skip via "Start" button)

---

### 5.3 Monetization Logic: Affiliate System

**Philosophy:** "Benefit First, Consent Later"

**User Flow:**
1. **Extension:** User saves products freely (no gate, no consent prompt)
2. **Extension Popup:** Product cards show "Buy" button
3. **Click "Buy":**
   - Check: `localStorage.getItem('affiliate_agreed')`
   - If `false` or `null` → Redirect to Dashboard + Show modal
   - If `true` → Direct to product URL (with affiliate params)
4. **Dashboard:** If `affiliate_agreed === false`:
   - Show **Mandatory, Un-closable Modal** (overlay blocks all interaction)
   - Content:
     - "💡 How Pockest Works"
     - "We earn a small commission when you buy through our links"
     - "Your price stays the same, you support free development"
   - Buttons:
     - ✅ **"I Understand & Continue"** (Primary)
       - Set `affiliate_agreed = true` in localStorage
       - Close modal
     - ❌ **"Not Interested"** (Secondary, small)
       - Set `affiliate_agreed = 'declined'` in localStorage
       - Disable "Buy" buttons (show "Visit directly" instead)
       - Close modal

**Technical Implementation:**

#### Step 1: Add to Auth Store
```typescript
// src/store/useAuthStore.ts
interface AuthState {
  // ...existing
  affiliateAgreed: boolean | null; // null = not asked, true = yes, false = declined
  setAffiliateConsent: (agreed: boolean) => void;
}

// Persist to localStorage
partialize: (state) => ({
  user: state.user,
  affiliateAgreed: state.affiliateAgreed,
});
```

#### Step 2: Dashboard Modal Component
```typescript
// src/components/AffiliateModal.tsx
export function AffiliateModal() {
  const { affiliateAgreed, setAffiliateConsent } = useAuthStore();
  
  if (affiliateAgreed !== null) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md">
        {/* Modal content */}
      </div>
    </div>
  );
}
```

#### Step 3: Inject Modal in Dashboard
```typescript
// src/pages/dashboard/Dashboard.tsx
import { AffiliateModal } from '@/components/AffiliateModal';

return (
  <>
    <AffiliateModal />
    {/* Rest of dashboard */}
  </>
);
```

#### Step 4: "Buy" Button Logic in Popup
```typescript
// src/pages/popup/Popup.tsx
const handleBuyClick = () => {
  const agreed = localStorage.getItem('affiliate_agreed');
  
  if (agreed === 'true') {
    // Open with affiliate params
    window.open(affiliateUrl, '_blank');
  } else {
    // Redirect to dashboard to show modal
    openDashboard();
  }
};
```

---

## 6. Todo List

### Priority 1: Critical (Before v1.0 Launch)
- [ ] **Implement Affiliate Modal Logic**
  - [ ] Create `AffiliateModal.tsx` component
  - [ ] Add `affiliateAgreed` state to AuthStore
  - [ ] Add "Buy" button to Popup product cards
  - [ ] Integrate modal in Dashboard
  - [ ] Test: Consent flow (Yes/No/Skip)

- [ ] **Test Extension in Production**
  - [ ] Build: `npm run build:extension`
  - [ ] Load unpacked in Chrome
  - [ ] Test: Install → Welcome page
  - [ ] Test: Save product → Popup → Dashboard sync
  - [ ] Test: Trash → Restore → Permanent delete

- [ ] **Database Schema Documentation**
  - [ ] Export current schema from Supabase SQL Editor
  - [ ] Save to `database/schema.sql` (for backup & version control)
  - [ ] Include RPC functions (get_today_items, etc.)

### Priority 2: High (Post-Launch v1.1)
- [ ] **Fix Google OAuth Login Flash Error** (UX Improvement)
  - **Issue:** Brief error message appears during login before success
  - **Impact:** User sees error flash but login succeeds anyway
  - **Root Cause:** OAuth redirect process has temporary session check failure
  - **Solution:** Add error suppression during redirect flow OR improve retry logic
  - **Priority:** Medium (functional but poor UX)
  - **File:** `src/store/useAuthStore.ts:182-245`

- [ ] **UI/UX Redesign** (Figma → Builder.io → React)
  - **Scope:** Extension Sidebar + Dashboard
  - **Design Tool:** Figma (user will design)
  - **Export Tool:** Builder.io
  - **Format:** React + TypeScript (Tailwind CSS)
  - **Integration Steps:**
    1. Figma design completion
    2. Builder.io export to React components
    3. Replace existing components in `src/components/`
    4. Reconnect state management (Zustand hooks)
    5. Add i18n support (useTranslation)
    6. Test responsive behavior
  - **Files to Replace:**
    - `src/components/layout/Sidebar.tsx`
    - `src/components/layout/Header.tsx`
    - `src/components/ui/*.tsx`
    - `src/pages/popup/Popup.tsx` (partial)
  - **Keep Unchanged:**
    - Business logic (`src/store/`, `src/hooks/`)
    - Types (`src/types/`)
    - Utils (`src/utils/`)

- [ ] **Client-Side Image Resize & Upload**
  - [ ] Implement: Canvas API resize to 200px width
  - [ ] Compress: JPEG 60% quality
  - [ ] Upload: Supabase Storage (`/users/{user_id}/items/{item_id}.jpg`)
  - [ ] Fallback: If upload fails, keep original URL

- [ ] **Price History Tracking**
  - [ ] New table: `price_history` (item_id, price, currency, recorded_at)
  - [ ] Daily cron job: Re-scrape prices for active items
  - [ ] UI: Line chart in item detail modal

- [ ] **Folder Management UI**
  - [ ] Edit folder name (inline edit)
  - [ ] Delete folder (move items to default folder)
  - [ ] Reorder folders (drag & drop)

### Priority 3: Medium (v1.2+)
- [ ] **Memo Field Exposure**
  - [ ] Add memo textarea in item detail modal
  - [ ] Auto-save on blur

- [ ] **Notifications System**
  - [ ] Price drop alerts (if tracked)
  - [ ] Item limit warnings (Free tier: 100 items)

- [ ] **Premium Tier Features**
  - [ ] Unlimited items (Free: 100, Premium: ∞)
  - [ ] Unlimited folders (Free: 2, Premium: ∞)
  - [ ] Price history access
  - [ ] Stripe integration for payments

### Priority 4: Low (Future)
- [ ] **Social Features**
  - [ ] Share pocket (public link)
  - [ ] Collaborative folders

- [ ] **Browser Compatibility**
  - [ ] Edge (Chromium-based, should work)
  - [ ] Firefox (requires Manifest V3 → V2 conversion)

---

## 7. Technical Debt

### Recently Fixed ✅
- ✅ **Pocket Item Count Bug** (Fixed: 2024-12-24)
  - **Issue:** Sidebar showed incorrect item count (included soft-deleted items)
  - **Example:** "Axe" folder displayed 5 items when all were deleted
  - **Root Cause:** `fetchPockets()` query did not filter `deleted_at != null`
  - **Solution:** Client-side filtering to count only active items
  - **File:** `src/store/usePocketStore.ts:71-108`
  - **Commit:** `546f66e`

### Code Quality
- ⚠️ **Settings Page:** Hardcoded Korean text (not i18n-ready)
  - Fix: Add translations to `locales/*.json`

- ⚠️ **Error Handling:** Some async functions lack try/catch
  - Audit: All `supabase.*` calls

- ⚠️ **Type Safety:** `any` types in some legacy code
  - Replace with proper interfaces

### Performance
- ⚠️ **Large Bundle Size:** Check with `npm run build` + analyze
  - Consider: Code splitting for Dashboard pages

- ⚠️ **Unoptimized Images:** No lazy loading in grid
  - Add: `loading="lazy"` attribute to `<img>` tags

### Documentation
- ⚠️ **Missing JSDoc:** Most functions lack comments
  - Add: Function purpose, params, return values

- ⚠️ **No README for Services:** Supabase setup not documented
  - Create: `src/services/README.md`

---

## 8. Development Commands

```bash
# Install dependencies
npm install

# Web Dashboard (Dev server)
npm run dev

# Extension (Watch mode)
npm run dev:extension

# Build for Production
npm run build              # All (Dashboard + Extension)
npm run build:extension    # Extension only

# Load Extension in Chrome
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select /dist folder
```

---

## 9. Git Workflow

### Branching Strategy
- `main` - Production-ready code
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes

### Commit Guidelines
```
feat: Add affiliate consent modal
fix: Side panel not opening on first install
docs: Update PROJECT_CONTEXT.md with schema
refactor: Extract duplicate code in usePocketStore
```

### Before Committing
1. Run linter: `npm run lint`
2. Check TypeScript: `tsc --noEmit`
3. Test in Extension: Load unpacked + manual QA

---

## 10. Future Sessions Checklist

When resuming work (new PC or new AI session):

- [ ] Read this `PROJECT_CONTEXT.md` from top to bottom
- [ ] Verify `.env` file exists (if not, create from `env.example`)
- [ ] Run `npm install`
- [ ] Test Extension build: `npm run dev:extension`
- [ ] Check Supabase connection: Login via Dashboard
- [ ] Review open todos in Section 6
- [ ] Ask user: "What feature should we work on today?"

---

**End of Document**  
**Version:** 1.0  
**Maintained by:** Lead Developer  
**Contact:** GitHub Issues

---

## Appendix: Key File Paths

| Feature | File Path | Lines |
|---------|-----------|-------|
| **Auth Logic** | `src/store/useAuthStore.ts` | 271 |
| **Popup UI** | `src/pages/popup/Popup.tsx` | 1005 |
| **Dashboard** | `src/pages/dashboard/Dashboard.tsx` | 453 |
| **Product Parser** | `src/utils/parser.ts` | 585 |
| **Pocket Store** | `src/store/usePocketStore.ts` | 578 |
| **Content Script** | `src/pages/content/index.tsx` | 148 |
| **Sidebar** | `src/components/layout/Sidebar.tsx` | 189 |
| **Welcome Page** | `src/pages/welcome/Welcome.tsx` | 131 |
| **i18n Config** | `src/i18n.ts` | 86 |
| **Global Styles** | `src/styles/global.css` | 89 |
| **DB Types** | `src/types/database.ts` | 246 |

**Total Codebase:** ~10,000 lines (excluding node_modules)

