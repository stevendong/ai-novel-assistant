# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Project
```bash
# Start full-stack development (client + server)
npm run dev

# Build client for production  
npm run build

# Start production server
npm start

# Database operations
npm run db:push    # Apply schema changes to database
npm run db:studio  # Open Prisma Studio GUI
```

### Client (Vue 3 Frontend)
```bash
cd client

# Development server (hot reload at http://localhost:5173)
npm run dev

# Build with type checking
npm run build

# Build without type checking (faster)
npm run build-only

# Type check only
npm run type-check

# Preview production build
npm run preview
```

### Server (Node.js Backend)
```bash
cd server

# Development with auto-reload
npm run dev

# Production mode
npm start

# Database operations
npm run db:push     # Apply schema changes
npm run db:studio   # Open Prisma Studio
npm run db:migrate  # Create and apply migration
```

## Architecture Overview

This is an AI-powered novel writing collaboration tool built as a monorepo with separate client and server applications.

### Technology Stack

**Frontend (client/)**
- Vue 3 + TypeScript
- Ant Design Vue (UI components)
- Tailwind CSS (utility-first styling)
- Monaco Editor (chapter editing)
- Pinia (state management)
- Vite (build tool)

**Backend (server/)**
- Node.js + Express
- Prisma ORM + SQLite
- OpenAI API integration
- Multer (file uploads)
- epub-gen (export functionality)

### Database Schema

Core entities in the Prisma schema:
- `Novel`: Main project entity with metadata and status
- `Character`: Character definitions with relationships and background
- `WorldSetting`: World-building elements (locations, rules, culture)
- `Chapter`: Chapter content with outline, plot points, and status
- `AIConstraint`: Content rating and AI behavior rules
- `ConsistencyCheck`: AI-generated consistency issue tracking

### Client Architecture

The Vue application uses a single-layout architecture with five main areas:

1. **Header**: App branding and current project info
2. **Left Sidebar**: Collapsible navigation (280px → 60px)
3. **Content Area**: Dynamic component rendering based on navigation
4. **AI Assistant Panel**: Collapsible right panel (384px) with multiple AI modes
5. **Status Bar**: Project status, word count, AI connection indicators

### Key Components

**Layout System**
- `MainLayout.vue`: Application shell with navigation and layout management

**Core Features**
- `ProjectManagement.vue`: Novel project CRUD with statistics
- `ChapterEditor.vue`: Multi-tab editing with Monaco Editor integration
- `CharacterManagement.vue`: Character library with detailed editing forms
- `WorldSettingManagement.vue`: World building with categorized settings
- `AIAssistantPanel.vue`: Multi-modal AI interface (dialogue/enhance/check modes)
- `ProgressStats.vue`: Writing progress tracking and visualization

### API Structure

REST API endpoints organized by feature:
- `/api/novels` - Project management
- `/api/characters` - Character operations
- `/api/settings` - World setting operations
- `/api/chapters` - Chapter content operations
- `/api/ai` - AI assistance features
- `/api/export` - Export functionality (EPUB, TXT)

### State Management

Uses Pinia with composition-style stores:
```typescript
export const useStore = defineStore('name', () => {
  const state = ref(value)
  const getter = computed(() => state.value * 2) 
  const action = () => { state.value++ }
  return { state, getter, action }
})
```

### Configuration Requirements

**Environment Variables** (server/.env)
```bash
DATABASE_URL="file:./prisma/novels.db"
PORT=3001
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**CSS Configuration** (client/src/assets/main.css)
```css
@import './base.css';
@import 'tailwindcss/base';
@import 'tailwindcss/components'; 
@import 'tailwindcss/utilities';
```

### Development Notes

- The project uses a monorepo structure with separate package.json files
- Client runs on port 5173, server on port 3001
- Database is SQLite with Prisma ORM
- AI features require OpenAI API key configuration
- Frontend uses composition API style for all Vue components
- Backend follows Express.js patterns with route separation
- never never never change vite dev server port and sever port config 
- 如果要启动服务测试服务直接用配置的端口上的服务检查就好了，服务都有自动重启机制，不要额外启动服务端口

### Known Issues

- **Tailwind CSS**: Must use `@import` statements, not `@tailwind` directives in main.css
- **Build Performance**: Tailwind processing increases build time significantly
- **Header Styling**: Current white text may have contrast issues on light backgrounds
