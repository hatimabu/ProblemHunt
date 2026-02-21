# Feature Roadmap — problemhunt.cc

## Phase 1 (This Sprint — Done ✅)

### Frontend
- [x] Global CSS animations (shimmer, glow, fade, skeleton, typewriter, upvote bounce)
- [x] Shared `Navbar` component with frosted glass, logo glow, wallet chip, user dropdown, mobile hamburger
- [x] Landing page redesign — typewriter hero, trending carousel, how-it-works, builder CTA, animated counters
- [x] Browse problems redesign — skeleton cards, sort dropdown, category pills, hot badge, empty state
- [x] Problem detail redesign — proposals list, tip modal with txHash, submit proposal form
- [x] Builder dashboard — proposals tab with real data, stats row, reputation tier progress bar
- [x] Leaderboard page at `/leaderboard` with period toggle, animated ranks, tier badges

### Backend (Python Azure Functions)
- [x] `GET /api/user/proposals` — fetches all proposals submitted by authenticated user, enriched with problem titles and tip totals
- [x] `GET /api/leaderboard` — ranks builders by reputation score (accepted proposals × 100 + tips × 10 + submitted × 5)
- [x] `POST /api/proposals/{id}/tip` — records tip with txHash, currency, chain
- [x] Router updated with all new routes

### Guides
- [x] `SUPABASE_NEXT_STEPS.md`
- [x] `AZURE_NEXT_STEPS.md`
- [x] `FEATURE_ROADMAP.md`

---

## Phase 2 (Next Sprint)

### Direct Messaging
- Real-time chat between problem posters and builders
- Supabase Realtime channels per problem
- Unread message badge on navbar

### Email Notifications (Supabase Triggers)
- Email when proposal is submitted on your problem
- Email when your proposal gets accepted/rejected
- Weekly digest of trending problems in your categories

### Problem Expiry / Deadline System
- Deadline field already exists in data model
- UI countdown timer on problem detail
- Auto-close problems past deadline
- Azure Functions timer trigger to mark expired problems

### Builder Portfolio Pages
- Public profile at `/builder/:username`
- Showcase accepted proposals
- Display earned badges and reputation tier
- Link to external portfolio / GitHub

### Search Improvements
- Debounced real-time search (already has search endpoint)
- Search history / recent searches
- Search suggestions as you type
- Filter by budget range slider

---

## Phase 3 (Growth)

### Monetization
- Featured problem slots (paid boost to top of browse page)
- Builder verification badges (paid identity verification)
- Premium builder profiles with analytics

### Ecosystem
- API for third-party integrations (read-only problem feed)
- Webhook support for notifications
- Browser extension to post problems from any page

### Community Features
- Problem comments / discussion threads
- Builder teams (co-submit proposals)
- Problem bounty pooling (multiple funders on one problem)
- Community voting on builder proposals

### Mobile App
- React Native app sharing auth and API layer
- Push notifications for proposal updates
- Camera scan for receipt-based tip verification

### Analytics Dashboard (for problem posters)
- Proposal funnel visualization
- Geographic distribution of builders
- Time-to-first-proposal metrics
- Builder quality scoring (acceptance rate history)

### AI Features
- AI-suggested tags when posting a problem (Anthropic API)
- Builder match score — "92% match" based on expertise vs problem tags
- Automated proposal quality scoring
- Problem categorization suggestions

---

## Technical Debt / Improvements

### Performance
- Paginate browse results (currently loads all)
- React Query / SWR for data caching
- Image optimization for avatars
- Bundle size optimization (code splitting per route)

### Security
- Rate limiting on proposal submissions
- Spam detection for problems
- Transaction hash deduplication in tips
- Input sanitization review

### Testing
- Unit tests for Python handlers (pytest)
- Component tests for React (Vitest + Testing Library)
- E2E tests (Playwright)

### DevOps
- GitHub Actions CI/CD pipeline
- Staging environment
- Feature flags (LaunchDarkly or homegrown)
- Error alerting (Sentry already integrated)
