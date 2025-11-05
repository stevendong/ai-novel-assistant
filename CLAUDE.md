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

**Client Environment Variables** (client/.env)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Clerk Authentication (optional - for modern auth system)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
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

### Authentication System

The project features a **unified authentication system** that supports seamless switching between two authentication methods:

1. **Clerk Authentication (Modern)**:
   - Third-party authentication service with advanced features
   - Built-in social login (Google, GitHub, etc.)
   - Automatic email verification and user management
   - Professional user profile management
   - Enhanced security and compliance

2. **Legacy Authentication (Traditional)**:
   - Custom JWT-based authentication system
   - Traditional email/password login
   - Full control over authentication flow
   - Custom user profile management

### Authentication Features

- **Dynamic Switching**: Users can switch between authentication modes at runtime
- **Auto-Detection**: System automatically selects the best available authentication method
- **Unified Interface**: Single API for all authentication operations regardless of mode
- **Persistent Preferences**: User's authentication mode choice is remembered
- **Development Tools**: Built-in debugging and testing tools for development

### Configuration

Enable Clerk authentication by setting the publishable key:
```bash
# Enable Clerk mode
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# Optional configurations
VITE_ALLOW_AUTH_MODE_SWITCH=true
VITE_ENABLE_SOCIAL_LOGIN=true
VITE_ENABLE_EMAIL_VERIFICATION=true
```

### Development Tools

In development mode, access `/dev/auth` for:
- Real-time authentication status monitoring
- One-click mode switching
- System diagnostics and debugging
- Configuration testing and validation

### Known Issues

- **Tailwind CSS**: Must use `@import` statements, not `@tailwind` directives in main.css
- **Build Performance**: Tailwind processing increases build time significantly
- **Header Styling**: Current white text may have contrast issues on light backgrounds

# Development Guidelines

## Philosophy

### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Process

### 1. Planning & Staging

Break complex work into 3-5 stages. Document in `IMPLEMENTATION_PLAN.md`:

\`\`\`markdown
## Stage N: [Name]
**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]
\`\`\`
- Update status as you progress
- Remove file when all stages are done

### 2. Implementation Flow

1. **Understand** - Study existing patterns in codebase
2. **Test** - Write test first (red)
3. **Implement** - Minimal code to pass (green)
4. **Refactor** - Clean up with tests passing
5. **Commit** - With clear message linking to plan

### 3. When Stuck (After 3 Attempts)

**CRITICAL**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
    - What you tried
    - Specific error messages
    - Why you think it failed

2. **Research alternatives**:
    - Find 2-3 similar implementations
    - Note different approaches used

3. **Question fundamentals**:
    - Is this the right abstraction level?
    - Can this be split into smaller problems?
    - Is there a simpler approach entirely?

4. **Try different angle**:
    - Different library/framework feature?
    - Different architectural pattern?
    - Remove abstraction instead of adding?

## Technical Standards

### Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-driven when possible** - Never disable tests, fix them

### Code Quality

- **Every commit must**:
    - Compile successfully
    - Pass all existing tests
    - Include tests for new functionality
    - Follow project formatting/linting

- **Before committing**:
    - Run formatters/linters
    - Self-review changes
    - Ensure commit message explains "why"

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Project Integration

### Learning the Codebase

- Find 3 similar features/components
- Identify common patterns and conventions
- Use same libraries/utilities when possible
- Follow existing test patterns

### Tooling

- Use project's existing build system
- Use project's test framework
- Use project's formatter/linter settings
- Don't introduce new tools without strong justification

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

## Important Reminders

**NEVER**:
- Use `--no-verify` to bypass commit hooks
- Disable tests instead of fixing them
- Commit code that doesn't compile
- Make assumptions - verify with existing code
- Nerver write comments and documents

**ALWAYS**:
- Commit working code incrementally
- Update plan documentation as you go
- Learn from existing implementations
- Stop after 3 failed attempts and reassess
