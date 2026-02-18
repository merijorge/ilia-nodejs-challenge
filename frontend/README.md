# Ilia Wallet - Frontend

![Tests](https://img.shields.io/badge/tests-18%20passing-brightgreen)
![React](https://img.shields.io/badge/react-18-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![Vite](https://img.shields.io/badge/vite-7-646CFF)
![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT-orange)

A React + TypeScript frontend for the Ilia Digital Wallet challenge. Consumes the User Service (port 3002) and Wallet Service (port 3001) APIs with JWT authentication, real-time balance updates, and full internationalization support.

## Features

- **Authentication**: Register and login with JWT persistence across sessions
- **Dashboard**: Real-time balance display with recent transaction history
- **Transactions**: Create credit/debit transactions with live cache invalidation
- **i18n**: English and Portuguese with browser language detection and manual toggle
- **Loading States**: Skeleton loaders on all async operations
- **Error States**: Toast notifications for API errors, inline validation for forms
- **Empty States**: Contextual CTAs when no data is present
- **Responsive**: Mobile-first layout, auth panel hidden on small screens
- **Protected Routes**: JWT-guarded routes with automatic redirect on expiry

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v6
- **Data Fetching**: TanStack React Query (stale time 30s, 1 retry)
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS v4 + shadcn/ui (slate theme)
- **i18n**: i18next + react-i18next with browser language detection
- **HTTP**: Axios with JWT interceptor and 401 redirect
- **Notifications**: Sonner toast
- **Testing**: Vitest + @testing-library/react

## Prerequisites

- Node.js 20+ and npm
- User Service running on port 3002
- Wallet Service running on port 3001

See [../docs/LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md) for backend setup instructions.

## Quick Start

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Application available at: **http://localhost:5173**

## Environment Variables

Copy `.env.example` to `.env` and configure:

```dotenv
# User Service URL
VITE_USER_SERVICE_URL=http://localhost:3002

# Wallet Service URL
VITE_WALLET_SERVICE_URL=http://localhost:3001
```

**Note:** Both services must have CORS enabled for `http://localhost:5173`. This is already configured in the backend services.

## Available Scripts

```bash
# Start development server
npm run dev

# Type-check and build for production
npm run build

# Preview production build
npm run preview

# Run tests (single run)
npm run test:run

# Run tests (watch mode)
npm test

# Lint
npm run lint
```

## Running Tests

```bash
cd frontend
npm run test:run
```

**Expected:** 18 tests passing across 3 test suites:

- `authSchemas.test.tsx` - Login and register Zod validation (11 tests)
- `LanguageSwitcher.test.tsx` - Language toggle component (3 tests)
- `useWallet.test.tsx` - Balance and transaction hooks with mocked API (4 tests)

### Test Coverage

| Area                 | Tests | What is covered                                                  |
| -------------------- | ----- | ---------------------------------------------------------------- |
| Auth validation      | 11    | Email format, password strength, name rules, accented characters |
| Language switcher    | 3     | Render, EN→PT toggle, PT→EN toggle                               |
| useBalance hook      | 2     | Success response, error state                                    |
| useTransactions hook | 2     | Transaction array, empty list                                    |

**Note:** Backend E2E tests cover the full integration flow end-to-end. Frontend unit tests focus on validation logic, hook behavior, and component interaction in isolation.

## Project Structure

```
frontend/
├── public/
│   └── wallet.svg              # Favicon
├── src/
│   ├── api/
│   │   ├── axios.ts            # Axios instances + JWT interceptor + 401 redirect
│   │   ├── auth.ts             # register, login, getProfile, updateProfile
│   │   └── wallet.ts           # getBalance, getTransactions, createTransaction
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Navbar + Outlet for authenticated pages
│   │   │   ├── AuthLayout.tsx      # Split-panel layout for login/register
│   │   │   └── LanguageSwitcher.tsx # EN/PT toggle
│   │   └── ui/                     # shadcn/ui components (badge, button, card…)
│   ├── hooks/
│   │   └── useWallet.ts        # useBalance, useTransactions, useCreateTransaction
│   ├── i18n/
│   │   ├── index.ts            # i18next configuration
│   │   └── locales/
│   │       ├── en/common.json  # English strings
│   │       └── pt/common.json  # Portuguese strings
│   ├── lib/
│   │   └── utils.ts # Used by shadcn
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx   # Balance card + recent transactions
│   │   └── transactions/
│   │       └── TransactionsPage.tsx # Create form + full history
│   ├── stores/
│   │   ├── AuthProvider.tsx    # AuthContext provider with localStorage persistence
│   │   └── authStore.ts        # AuthContext definition + useAuth hook
│   ├── test/
│   │   ├── components/
│   │   │   ├── authSchemas.test.tsx
│   │   │   └── LanguageSwitcher.test.tsx
│   │   ├── hooks/
│   │   │   └── useWallet.test.tsx
│   │   ├── i18n-test.ts        # Isolated i18n instance for tests
│   │   └── setup.ts            # @testing-library/jest-dom setup
│   ├── types/
│   │   └── index.ts            # User, Wallet, Transaction, AuthResponse
│   ├── App.tsx                 # Router, providers, route guards
│   ├── index.css               # CSS custom properties + component styles
│   └── main.tsx
├── .env.example
├── .gitignore
├── components.json             # shadcn/ui configuration
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Design Decisions

### Luxury Dark Theme

The UI uses a refined dark aesthetic with gold accents (`#C9A84C`) appropriate for a fintech context. Typography pairs Playfair Display (headings) with Plus Jakarta Sans (body). All design tokens are CSS custom properties in `index.css`, making the theme trivially overridable.

### Split Auth Layout

Login and register use a two-column layout: brand identity on the left, form on the right. The left panel is hidden on mobile. This is a common pattern in fintech products and produces an immediate visual context.

### React Query for Server State

All server state lives in React Query, not component state. `useBalance` and `useTransactions` share query keys with `useCreateTransaction`'s `invalidateQueries` call, creating a balance and transaction list that refreshes automatically on mutation without manual refetching.

### Idempotency Keys Generated Client-Side

`crypto.randomUUID()` generates a fresh UUID v4 idempotency key per transaction request. This matches the backend's header-only requirement and prevents duplicate submissions from network retries while keeping the UI stateless.

### Auth Persistence

JWT and user object are stored in `localStorage` and rehydrated into `AuthProvider` on mount. The Axios interceptor attaches the token automatically and redirects to `/login` on 401. This means a page refresh never logs the user out.

### i18n Approach

i18next with `i18next-browser-languagedetector` automatically picks up the browser language on first visit and persists the manual selection to `localStorage`. All UI strings (including plurals, interpolated values, and arrays) are in locale files. No hardcoded strings exist in components.

### Form Validation

React Hook Form with Zod resolvers. Validation runs on submit and on blur. Password strength (uppercase + lowercase + digit), email format, and name character rules are enforced both client-side and server-side, the frontend schema mirrors the backend DTO rules intentionally.

## Security Considerations

- **JWT stored in localStorage**: Acceptable for this challenge scope. Production apps should use httpOnly cookies to prevent XSS exfiltration.
- **401 redirect**: The Axios response interceptor clears auth state and redirects on any 401, preventing stale token usage.
- **Route guards**: `ProtectedRoute` redirects unauthenticated users to `/login`. `PublicRoute` redirects authenticated users to `/dashboard`, preventing access to auth pages while logged in.
- **No sensitive data in URL**: User IDs and tokens never appear in query parameters or route segments.

## Future Improvements

- Add E2E tests with Playwright covering the full register → login → transaction flow
- Implement refresh token rotation to extend sessions beyond 24h
- Add pagination to the transaction history list
- Implement wallet-to-wallet transfer UI once the backend supports it
- Add PWA manifest for mobile home screen installation
- Replace localStorage JWT storage with httpOnly cookies for production security

## License

This project is part of the Ilia Digital technical challenge.

---

Built with care for Ilia Digital
