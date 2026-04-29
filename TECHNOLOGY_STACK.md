# PUPSJ RMS Prototype - Complete Technology Stack Documentation

## **Core Framework & Runtime**

### **Next.js 16.1.6** (React 19.2.3)
- **Architecture**: App Router (modern Next.js routing)
- **Runtime**: Node.js server-side rendering
- **Build Tool**: Next.js built-in bundler with Turbopack
- **Development**: Hot Module Replacement (HMR) with development server

### **Package Management**
- **Manager**: pnpm (evidenced by `.pnpm-store` directory)
- **Scripts**: Custom scripts for database management, hot folder watching, and development workflows

---

## **Database & Persistence Layer**

### **SQLite with sql.js** (v1.13.0)
- **Implementation**: In-process SQLite database using WebAssembly
- **Location**: `.local/db.sqlite` (configurable via `LOCAL_DATA_DIR`)
- **Connection Management**: Global singleton pattern for HMR persistence
- **Features**: Full foreign key support, migrations, audit trails

### **Database Schema**
- Tables: `staff`, `students`, `documents`, `document_requests`, `courses`, `sections`, `audit_logs`, `settings`
- Repository Pattern: Dedicated `*Repo.js` files for data access abstraction

---

## **UI Framework & Styling**

### **Tailwind CSS v4** (Modern)
- **Configuration**: CSS-based configuration using `@theme` tokens
- **Custom Design System**: PUP brand colors (`pup-maroon`, `pup-darkMaroon`)
- **Typography**: Self-hosted Inter font (300-700 weights)
- **Responsive**: Mobile-first responsive design

### **Component Architecture**
- **Base**: shadcn/ui components (v4.1.0) with custom theming
- **UI Library**: Custom component library in `/src/components/ui/`
  - Dialog, Button, Input, Card, Table, Skeleton, etc.
- **Icons**: Phosphor icon set (duotone, bold variants)
- **Animations**: `tw-animate-css` for Tailwind animations

### **Design Tokens**
```css
--color-pup-maroon: #800000;
--color-pup-darkMaroon: #5a0000;
--radius-brand: 8px;
```

---

## **Authentication & Security**

### **JWT-based Session Management**
- **Library**: `jose` (v5.2.4) - Modern JWT implementation
- **Algorithm**: HS256 signing
- **Storage**: HTTP-only session cookies (`pup_session`)
- **Session**: No explicit expiration (browser session-based)

### **Two-Factor Authentication (TOTP)**
- **Library**: `speakeasy` (v2.0.0) for TOTP generation/verification
- **QR Codes**: `qrcode` (v1.5.4) for authenticator app setup
- **Encryption**: AES-256-CBC for TOTP secret storage
- **Implementation**: Custom TOTP challenge modal system

### **Role-based Access Control**
- Roles: Admin, Staff
- Middleware: Route-level protection with `AuthGuard` components
- API Security: Session verification on all protected endpoints

---

## **File Processing & OCR**

### **OCR Pipeline**
- **Engine**: Tesseract.js (v5.1.0) - Client-side OCR
- **Language Model**: `wink-eng-lite-web-model` for NLP processing
- **NLP**: `wink-nlp` (v2.4.0) for name normalization
- **PDF Processing**: `pdfjs-dist` (v4.10.38) for PDF text extraction

### **File Management**
- **Hot Folder**: Automated file watching with `chokidar` (v4.0.3)
- **Archive**: `adm-zip` (v0.5.16) for backup/restore operations
- **PDF Generation**: `jspdf` (v4.2.1) for document creation

---

## **API Architecture**

### **Next.js API Routes**
- **Pattern**: RESTful API under `/api/*`
- **Authentication**: JWT middleware for protected routes
- **Response Format**: Consistent `{ ok: true/false, data/error }` structure

### **Key API Endpoints**
- `/api/auth/*` - Authentication, TOTP
- `/api/staff/*` - Staff management
- `/api/students/*` - Student records
- `/api/documents/*` - Document management
- `/api/ingest/*` - Hot folder ingestion
- `/api/system/*` - Admin operations

---

## **Real-time Features**

### **Socket.io** (v4.8.3)
- **Implementation**: Real-time updates for hot folder processing
- **Client**: `socket.io-client` for browser connections
- **Use Cases**: File processing status, live notifications

---

## **Data Visualization**

### **Charts & Analytics**
- **Library**: `recharts` (v3.8.1) for dashboard charts
- **Types**: Line charts, bar charts, analytics visualizations

---

## **Development Tools**

### **Code Quality**
- **Linting**: ESLint with Next.js configuration
- **Package Manager**: pnpm for efficient dependency management

### **Build & Deployment**
- **Build**: `next build` for production optimization
- **Start**: `next start` for production server
- **Environment**: dotenv for environment variable management

---

## **Specialized Features**

### **Hot Folder System**
- **Watcher**: File system monitoring with `chokidar`
- **Processing**: Automated OCR and metadata extraction
- **Workflow**: INBOUND → PROCESSING → DONE/FAILED folders

### **Storage Layout Management**
- **Coordinate System**: Normalized 0..1 rectangles for physical storage mapping
- **Visualization**: 2D room/cabinet/drawer layout system
- **Validation**: Prevents deletion of locations with assigned records

### **Audit Logging**
- **Comprehensive**: All major actions logged with actor, timestamp, details
- **Search**: Full-text search with filtering capabilities
- **Personal**: "My Activity" views for individual users

---

## **Environment Configuration**

### **Required Environment Variables**
- `JWT_SECRET` - JWT signing key
- `LOCAL_DATA_DIR` - Override for `.local/` directory (optional)
- `HOT_FOLDER_*` - Hot folder configuration (optional)

### **Development Setup**
- Hot reload with concurrent Next.js and hot folder watcher
- Database seeding with sample data
- Admin account creation utilities

---

## **Complete Dependencies List**

### **Production Dependencies**
```json
{
  "@base-ui/react": "^1.3.0",
  "adm-zip": "^0.5.16",
  "chokidar": "^4.0.3",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "jose": "^5.2.4",
  "jspdf": "^4.2.1",
  "lucide-react": "^1.7.0",
  "next": "16.1.6",
  "next-themes": "^0.4.6",
  "otpauth": "^9.2.2",
  "pdfjs-dist": "^4.10.38",
  "qrcode": "^1.5.4",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "recharts": "^3.8.1",
  "shadcn": "^4.1.0",
  "socket.io": "^4.8.3",
  "socket.io-client": "^4.8.3",
  "sonner": "^2.0.7",
  "speakeasy": "^2.0.0",
  "sql.js": "^1.13.0",
  "tailwind-merge": "^3.5.0",
  "tesseract.js": "^5.1.0",
  "tw-animate-css": "^1.4.0",
  "wink-eng-lite-web-model": "^1.8.1",
  "wink-nlp": "^2.4.0"
}
```

### **Development Dependencies**
```json
{
  "@tailwindcss/postcss": "^4",
  "concurrently": "^9.1.2",
  "dotenv": "^16.4.7",
  "eslint": "^9",
  "eslint-config-next": "16.1.6",
  "tailwindcss": "^4",
  "wait-on": "^8.0.1"
}
```

---

This technology stack provides a modern, full-stack web application with offline capabilities, real-time features, and comprehensive document management functionality specifically designed for educational record management.
