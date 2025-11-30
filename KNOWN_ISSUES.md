# Known Issues and Notes

## TypeScript Type Errors

### Supabase Insert Type Strictness

The current version of `@supabase/supabase-js` (v2.57.4) has overly strict typing for insert operations that doesn't correctly infer types from the database schema.

**Status**: Fixed with type assertions
**Impact**: None - the code compiles and runs correctly
**Solution Applied**: Using `as unknown as never` type assertions in `supabase-service.ts`

See the code comments in `src/services/supabase-service.ts` for details.

### Previous Lint Warnings (FIXED)

The following issues have been fixed:
- ✅ useEffect dependency warnings - Fixed using useCallback
- ✅ `any` type usage - Replaced with proper types
- ✅ Unused variables - Removed or prefixed with underscore
- ✅ Unnecessary escape characters in regex - Fixed

## Firebase Configuration

### Demo Credentials
The `.env` file contains demo Firebase credentials that won't persist data to a real Firebase project.

**To fix**:
1. Create a Firebase project
2. Follow FIREBASE_SETUP.md
3. Update `.env` with real credentials

### OCR Simulation
Receipt scanning uses simulated OCR with random data.

**For production**:
- Integrate Google Cloud Vision API
- Or use AWS Textract
- Or Tesseract.js for client-side OCR

## Build Warnings

### Chunk Size Warning
```
Some chunks are larger than 500 kB after minification
```

**Status**: Acceptable for MVP
**Impact**: Slightly slower initial load
**Solution**: Implement code splitting with React.lazy() for routes

### Browserslist Outdated
```
caniuse-lite is outdated
```

**Fix**: Run `npx update-browserslist-db@latest`

## Mobile-Specific Issues

### PWA Not Configured
The app is not set up as a Progressive Web App.

**To add**:
- Service worker for offline support
- Web app manifest
- App icons
- Install prompt

### iOS Safe Area
Safe area insets are handled with CSS, but may need testing on actual iOS devices with notches.

### Pull-to-Refresh
Pull-to-refresh is mentioned but not yet implemented. The infrastructure is ready in the UI.

## Feature Limitations

### NLP Parser
- Pattern matching only (not ML-based)
- English language only
- Limited date parsing patterns
- Fixed categorization keywords

**For production**:
- Integrate OpenAI/Anthropic API
- Support Hindi and regional languages
- Learn from user corrections

### Balance Simplification
Current implementation shows net balances but doesn't optimize debt chains (A→B→C could be A→C).

**Algorithm needed**:
- Implement min-cash-flow algorithm
- Graph-based debt simplification
- Handle circular debts

### Real-time Updates
The app doesn't use real-time subscriptions from Supabase or Firebase.

**To add**:
```typescript
supabase
  .channel('expenses')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'expenses'
  }, handleChange)
  .subscribe()
```

## Security Considerations

### Client-Side Validation Only
All validation is client-side. Add database constraints and trigger checks.

### Email Verification Disabled
Supabase email confirmation is disabled for easier testing.

**For production**:
- Enable email confirmation
- Add email verification flow
- Handle unverified user states

### API Keys in Client
Firebase API keys are exposed in client code (this is normal for Firebase, but ensure Firestore/Storage rules are strict).

## Performance Notes

### No Caching Strategy
API calls don't use caching. Consider:
- React Query for server state
- SWR for data fetching
- Service Worker for offline cache

### Image Optimization
Receipt images are uploaded without optimization.

**Add**:
- Client-side compression (browser-image-compression)
- Resize before upload
- WebP conversion
- Lazy loading with blur placeholder

### Database Indexes
While basic indexes exist, query performance could improve with:
- Composite indexes on (group_id, date) for expenses
- Index on (user_id, group_id) for group_members
- Partial indexes for active expenses

## Browser Compatibility

### Tested Browsers
- Chrome 90+
- Safari 14+
- Firefox 88+

### Not Tested
- Internet Explorer (not supported)
- Opera Mini
- UC Browser
- Older iOS Safari (<14)

### Known Issues
- Date input styling varies by browser
- File input looks different on Android vs iOS
- Bottom navigation safe area on notched devices needs testing

## Deployment Notes

### Environment Variables
Must be set in hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- Firebase Hosting: Use .env.production

### CORS Configuration
If deploying API separately, configure CORS:
- Supabase: Automatically configured
- Firebase Storage: May need `cors.json` (see FIREBASE_SETUP.md)

### Database Migrations
Migrations are tracked in Supabase. For production:
1. Test migrations in staging
2. Apply during low-traffic window
3. Keep backup before major schema changes

## Testing Gaps

### No Automated Tests
The project has no test files. Consider adding:
- Unit tests (Jest + React Testing Library)
- Integration tests (Cypress/Playwright)
- E2E tests for critical flows
- API tests for services

### Manual Testing Only
All testing done manually. Create test plan for:
- All expense entry methods
- Balance calculations
- RLS policies
- File uploads
- Error states

## Accessibility

### ARIA Labels Missing
Many interactive elements lack proper ARIA labels for screen readers.

### Keyboard Navigation
Focus management needs improvement for keyboard-only users.

### Color Contrast
While generally good, should be audited with Lighthouse/axe.

## Internationalization

### Hardcoded Strings
All text is hardcoded in English. For i18n:
- Use react-i18next
- Extract strings to translation files
- Support Hindi, Tamil, Telugu

### Number Formatting
Indian number formatting is implemented but not configurable for other locales.

## Documentation

### API Documentation
No API documentation exists. Consider:
- JSDoc comments
- Storybook for components
- OpenAPI spec for services

### Setup Video
A video walkthrough would help new developers.

## Monitoring

### No Error Tracking
Production errors won't be logged. Add:
- Sentry for error tracking
- Google Analytics for usage
- LogRocket for session replay

### No Performance Monitoring
Add performance monitoring:
- Web Vitals tracking
- API response time logging
- Database query performance

## License and Legal

### No License File
Project needs a license (MIT suggested).

### Privacy Policy
If storing user data, need privacy policy for:
- Data collection
- Third-party services (Supabase, Firebase)
- User rights (GDPR if EU users)

### Terms of Service
Should have ToS for production deployment.

---

## Priority Fixes for Production

1. **High Priority**
   - [ ] Configure real Firebase project
   - [ ] Enable email verification
   - [ ] Add error tracking (Sentry)
   - [ ] Implement real OCR API
   - [ ] Add automated tests

2. **Medium Priority**
   - [ ] Code splitting for bundle size
   - [ ] PWA configuration
   - [ ] Real-time subscriptions
   - [ ] Image optimization
   - [ ] Debt simplification algorithm

3. **Low Priority**
   - [ ] Internationalization
   - [ ] Accessibility audit
   - [ ] Performance monitoring
   - [ ] API documentation
   - [ ] License and legal docs

---

**Note**: This document tracks known issues and limitations. Most are typical for an MVP and can be addressed based on production requirements and user feedback.
