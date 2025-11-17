<div align="center">

[Project Logo Placeholder - Recommended size: 200x200px, PNG format, modern icon with AI and book elements]

# AI Novel Assistant

[![GitHub Stars](https://img.shields.io/github/stars/stevendong/ai-novel-assistant?style=social)](https://github.com/yourusername/ai-novel-assistant/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/stevendong/ai-novel-assistant?style=social)](https://github.com/yourusername/ai-novel-assistant/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/stevendong/ai-novel-assistant)](https://github.com/yourusername/ai-novel-assistant/issues)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/stevendong/ai-novel-assistant/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

English | [简体中文](./README.md)

**AI-Powered Intelligent Novel Writing Collaboration Platform**

Let AI be your writing partner, not your replacement

[Live Demo](#) | [Quick Start](#-quick-start) | [Documentation](#) | [Video Tutorials](#)

</div>

## ⚡ Project Overview

AI Novel Assistant is an intelligent writing assistance platform specifically designed for long-form novel creation, helping writers improve efficiency and quality through AI technology.

### 🎯 Core Advantages

1. **Intelligent but Not Intrusive** - AI provides suggestions without replacing creativity, maintaining author's creative control
2. **Full-Process Support** - From outline planning to final draft, covering the complete novel creation lifecycle
3. **Knowledge Management** - Systematically manage complex creative elements like characters, worldbuilding, plot threads
4. **Consistency Assurance** - AI automatically detects and alerts contradictions in character personality, world settings, plot logic, etc.
5. **Professional Editing Experience** - Based on Tiptap Editor, providing IDE-like powerful editing capabilities
6. **Flexible Deployment** - Supports both local and cloud deployment with full data control

### 🎬 Demo Resources

- [Feature Demo Video Placeholder](#) - 5-minute overview of core features
- [Creation Workflow Demo](#) - Complete novel writing workflow showcase
- [Example Project](#) - View sample novel projects created with this tool

> "Traditional writing tools just record text, while AI Novel Assistant is a smart partner that truly understands your creative needs."

---

## 🏗️ System Architecture

### Architecture Diagram

[System Architecture Diagram Placeholder - Recommended size: 800x600px, showing frontend-backend separation, database, AI service integration]

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Vue 3)                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Project   │Character │World     │Chapter   │AI        │  │
│  │Mgmt      │Mgmt      │Settings  │Editor    │Assistant │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/WebSocket
┌───────────────────────┴─────────────────────────────────────┐
│                   API Gateway Layer (Express)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Middleware │ Rate Limit │ CORS │ Logging       │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Project   │Character │Settings  │Chapter   │AI        │  │
│  │Service   │Service   │Service   │Service   │Service   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└───────┬───────────────────────────────────────┬─────────────┘
        │                                       │
┌───────┴──────────┐                  ┌─────────┴────────────┐
│ Data Persistence │                  │  External Services   │
│  ┌────────────┐  │                  │  ┌────────────────┐ │
│  │ Prisma ORM │  │                  │  │  OpenAI API    │ │
│  └─────┬──────┘  │                  │  ├────────────────┤ │
│        │         │                  │  │  Mem0 AI       │ │
│  ┌─────┴──────┐  │                  │  ├────────────────┤ │
│  │SQLite/PG   │  │                  │  │  Cloudflare R2 │ │
│  └────────────┘  │                  │  └────────────────┘ │
└──────────────────┘                  └──────────────────────┘
```

### Core Component Description

| Component | Responsibility | Key Technologies |
|-----------|---------------|------------------|
| **Project Management Engine** | Novel project CRUD, metadata management, progress tracking | Prisma ORM, SQLite/PostgreSQL |
| **Knowledge Base System** | Structured storage and retrieval of character profiles, world settings, plot threads | Relational database design, Full-text search |
| **Smart Editor** | Chapter content editing, multi-tab management, auto-save, version control | Tiptap Editor, WebSocket |
| **AI Collaboration Engine** | Dialogue mode, content enhancement, consistency checking, plot suggestions | OpenAI API, Mem0 AI, Prompt engineering |
| **Export Engine** | Multi-format export (EPUB, TXT), preserving formatting and metadata | epub-gen, Archiver |
| **Authentication System** | User authentication, session management, permission control | JWT, Clerk (optional) |

### Complete Workflow

Here's a typical novel creation workflow:

| Step | Operation | Modules Involved | AI Assistance |
|------|-----------|------------------|---------------|
| 1 | Create novel project, fill in title, synopsis, genre, etc. | Project Management | - |
| 2 | Define main characters including appearance, personality, backstory, relationships | Character Management | AI generates character suggestions, personality analysis |
| 3 | Build worldview, add locations, rules, culture, history, etc. | World Settings | AI helps refine setting logic |
| 4 | Create chapter outlines, plan plot development | Chapter Editor | AI provides plot suggestions and conflict points |
| 5 | Write chapter content, use AI assistant for dialogue and enhancement | Smart Editor + AI Panel | Conversational creation, text polishing, expansion |
| 6 | Run consistency checks, discover and fix contradictions | AI Collaboration Engine | Auto-detect character, setting, plot contradictions |
| 7 | Export finished work, generate EPUB or TXT format | Export Engine | - |

### Project Directory Structure

```
ai-novel-assistant/
├── client/                          # Frontend Application (Vue 3 + TypeScript)
│   ├── public/                      # Static Assets
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/                  # Styles and Resources
│   │   │   ├── base.css            # Base Styles
│   │   │   ├── main.css            # Tailwind CSS Entry
│   │   │   └── logo.svg
│   │   ├── components/              # Reusable Components
│   │   │   ├── layout/             # Layout Components
│   │   │   │   ├── MainLayout.vue  # Main Layout Framework
│   │   │   │   ├── HeaderBar.vue   # Top Navigation Bar
│   │   │   │   ├── Sidebar.vue     # Left Sidebar
│   │   │   │   └── StatusBar.vue   # Bottom Status Bar
│   │   │   ├── project/            # Project-related Components
│   │   │   │   ├── ProjectCard.vue
│   │   │   │   └── ProjectForm.vue
│   │   │   ├── character/          # Character Management Components
│   │   │   │   ├── CharacterList.vue
│   │   │   │   ├── CharacterDetail.vue
│   │   │   │   └── CharacterFormModal.vue
│   │   │   ├── editor/             # Editor Components
│   │   │   │   ├── ChapterEditor.vue
│   │   │   │   ├── MonacoEditor.vue
│   │   │   │   └── EditorToolbar.vue
│   │   │   └── ai/                 # AI Assistant Components
│   │   │       ├── AIAssistantPanel.vue
│   │   │       ├── ChatInterface.vue
│   │   │       └── EnhancementPanel.vue
│   │   ├── views/                   # Page Views
│   │   │   ├── ProjectManagement.vue    # Project Management Page
│   │   │   ├── CharacterManagement.vue  # Character Management Page
│   │   │   ├── WorldSettingManagement.vue # World Settings Page
│   │   │   ├── ChapterEditor.vue        # Chapter Editor Page
│   │   │   └── ProgressStats.vue        # Progress Stats Page
│   │   ├── stores/                  # Pinia State Management
│   │   │   ├── project.ts          # Project State
│   │   │   ├── character.ts        # Character State
│   │   │   ├── chapter.ts          # Chapter State
│   │   │   └── ai.ts               # AI Assistant State
│   │   ├── services/                # API Service Layer
│   │   │   ├── api.ts              # Axios Config
│   │   │   ├── projectApi.ts       # Project API
│   │   │   ├── characterApi.ts     # Character API
│   │   │   └── aiApi.ts            # AI API
│   │   ├── router/                  # Vue Router Config
│   │   │   └── index.ts
│   │   ├── types/                   # TypeScript Type Definitions
│   │   │   └── index.ts
│   │   ├── App.vue                  # Root Component
│   │   └── main.ts                  # Application Entry
│   ├── index.html
│   ├── vite.config.ts              # Vite Config
│   ├── tsconfig.json               # TypeScript Config
│   ├── tailwind.config.js          # Tailwind CSS Config
│   └── package.json
│
├── server/                          # Backend Application (Node.js + Express)
│   ├── routes/                      # API Routes
│   │   ├── novels.js               # Project Routes
│   │   ├── characters.js           # Character Routes
│   │   ├── settings.js             # World Settings Routes
│   │   ├── chapters.js             # Chapter Routes
│   │   ├── ai.js                   # AI Service Routes
│   │   ├── export.js               # Export Routes
│   │   └── auth.js                 # Authentication Routes
│   ├── middleware/                  # Express Middleware
│   │   ├── auth.js                 # Authentication Middleware
│   │   ├── errorHandler.js         # Error Handling
│   │   └── rateLimiter.js          # Rate Limiting
│   ├── services/                    # Business Logic Layer
│   │   ├── aiService.js            # AI Service Integration
│   │   ├── exportService.js        # Export Service
│   │   └── consistencyService.js   # Consistency Checking
│   ├── prisma/                      # Prisma ORM
│   │   ├── schema.prisma           # Database Schema
│   │   ├── migrations/             # Database Migrations
│   │   └── seed.js                 # Seed Data
│   ├── utils/                       # Utility Functions
│   │   ├── logger.js               # Logging Utility
│   │   └── helpers.js
│   ├── config/                      # Configuration Files
│   │   └── database.js
│   ├── index.js                     # Server Entry
│   ├── .env.example                 # Environment Variables Example
│   └── package.json
│
├── scripts/                         # Build and Deployment Scripts
│   ├── setup.sh                    # Automated Setup Script
│   ├── deploy.sh                   # Deployment Script
│   ├── backup.sh                   # Data Backup Script
│   └── pre-deploy-check.sh         # Pre-deployment Check
│
├── docs/                           # Documentation
│   ├── API.md                      # API Documentation
│   ├── DEPLOYMENT.md               # Deployment Guide
│   └── DEVELOPMENT.md              # Development Guide
│
├── .env.example                    # Root Environment Variables Example
├── package.json                    # Root package.json (Monorepo)
├── CLAUDE.md                       # Claude Code Development Guide
├── MONOREPO.md                     # Monorepo Architecture Description
├── LICENSE                         # MIT License
└── README.md                       # Project Documentation
```

---

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

Docker is the fastest and easiest deployment method, no manual environment setup required.

#### Prerequisites
- Docker >= 20.10
- Docker Compose >= 2.0

#### Startup Steps

```bash
# 1. Clone the project
git clone https://github.com/yourusername/ai-novel-assistant.git
cd ai-novel-assistant

# 2. Configure environment variables
cp .env.example .env
# Edit .env file, fill in your OpenAI API Key

# 3. Start services (one-click startup)
docker compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Prisma Studio: http://localhost:5555
```

#### Database Configuration

If using PostgreSQL as production database:

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://noveluser:changeme@localhost:5432/novel_db` |
| `POSTGRES_USER` | Database username | `noveluser` |
| `POSTGRES_PASSWORD` | Database password | `changeme` |
| `POSTGRES_DB` | Database name | `novel_db` |

```bash
# Quick start local PostgreSQL (Docker)
docker compose -f docker-compose.postgres.yml up -d postgres

# Apply database migrations
npm run db:push
```

### Option 2: Source Code Deployment

Suitable for developers and users needing custom configuration.

#### Prerequisites
- Node.js >= 20.19.0
- npm >= 9.0.0
- SQLite 3 (development) or PostgreSQL 14+ (production)

#### Installation Steps

```bash
# 1. Clone the project
git clone https://github.com/yourusername/ai-novel-assistant.git
cd ai-novel-assistant

# 2. Install dependencies (Monorepo unified management)
npm install

# 3. Configure server environment variables
cp server/.env.example server/.env
# Edit server/.env, configure the following required items:
# - OPENAI_API_KEY: Your OpenAI API key
# - DATABASE_URL: Database connection string

# 4. Configure client environment variables
cp client/.env.example client/.env
# Edit client/.env, configure:
# - VITE_API_BASE_URL: Backend API address (default http://localhost:3001)

# 5. Initialize database
npm run db:push

# 6. Start development server (frontend + backend simultaneously)
npm run dev

# Frontend service: http://localhost:5173
# Backend service: http://localhost:3001
```

#### Step-by-Step Startup (Optional)

If you need to start frontend or backend separately:

```bash
# Start frontend only
npm run client:dev

# Start backend only
npm run server:dev

# Open Prisma Studio database management interface
npm run db:studio
```

### Option 3: One-Click Automated Setup

Use the automated script provided by the project:

```bash
# Run auto setup script (will automatically check environment, install dependencies, configure database)
./scripts/setup.sh

# The script will execute:
# - Check Node.js and npm versions
# - Install all dependencies
# - Copy environment variable templates
# - Initialize database
# - Prompt next steps
```

---

## ⚙️ Environment Configuration

### Required Configuration

#### Server Environment Variables (`server/.env`)

```bash
# OpenAI API Configuration (Required)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Database Configuration
DATABASE_URL="file:./prisma/novels.db"  # SQLite (development)
# DATABASE_URL="postgresql://user:password@host:5432/dbname"  # PostgreSQL (production)

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Client Environment Variables (`client/.env`)

```bash
# API Configuration (Required)
VITE_API_BASE_URL=http://localhost:3001
```

### Optional Configuration

#### Clerk Modern Authentication (Recommended for production)

```bash
# Client (client/.env)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# Authentication feature switches
VITE_ALLOW_AUTH_MODE_SWITCH=true      # Allow switching authentication modes
VITE_ENABLE_SOCIAL_LOGIN=true         # Enable social login
VITE_ENABLE_EMAIL_VERIFICATION=true   # Enable email verification
```

#### Cloudflare R2 Object Storage (for file uploads)

```bash
# Server (server/.env)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ai-novel-assistant
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

#### Reverse Proxy and Security Configuration

```bash
# Server (server/.env)
TRUST_PROXY=loopback,linklocal,uniquelocal  # Trusted proxy configuration
RATE_LIMIT_WINDOW_MS=900000                 # Rate limit time window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100                 # Max requests within time window
```

### Obtaining API Keys

<details>
<summary><b>📝 OpenAI API Key Guide</b></summary>

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Login or register an account
3. Click "Create new secret key"
4. Copy the generated key (format: `sk-proj-...`)
5. Fill the key into `server/.env` `OPENAI_API_KEY`

**Important Notes:**
- Key is only shown once, must save it
- Recommend setting usage limits to avoid unexpected charges
- Never commit keys to version control
</details>

<details>
<summary><b>🔐 Clerk Publishable Key Guide</b></summary>

1. Visit [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new app or select existing app
3. Find "Publishable Key" in "API Keys" page
4. Copy key (format: `pk_test_...` or `pk_live_...`)
5. Fill key into `client/.env` `VITE_CLERK_PUBLISHABLE_KEY`

**Configuration Recommendations:**
- Use `pk_test_` key in development
- Use `pk_live_` key in production
- Enable Email and Social Login for better UX
</details>

---

## 🎨 Core Features Explained

### 1. Project Management

[Project Management Interface Screenshot Placeholder - Recommended size: 1200x800px, showing project list, statistics, filtering]

**Feature Highlights:**
- 📂 Multi-project management, each project with independent data space
- 📊 Real-time statistics: total word count, chapter count, character count, completion rate
- 🏷️ Project categorization and tagging system
- 🔍 Quick search and filtering
- 📈 Writing progress visualization

### 2. Character Management System

[Character Management Interface Screenshot Placeholder - Recommended size: 1200x800px, showing character cards, detail panel, relationship graph]

**Feature Highlights:**
- 👤 Detailed character profiles: appearance, personality, background, abilities
- 🕸️ Character relationship network visualization
- 📝 Character growth trajectory recording
- 🤖 AI-assisted character suggestion generation
- 🔗 Chapter reference tracking

**Character Attribute Template:**
```
Basic Info: Name, Age, Gender, Race, Occupation
Appearance: Height, Build, Hair Color, Eye Color, Distinctive Features
Personality: MBTI, Core Traits, Strengths, Weaknesses, Fears
Backstory: Origin, Experiences, Turning Points, Motivation, Goals
Abilities: Skills, Special Powers, Equipment, Power Assessment
Relationships: Family, Friends, Enemies, Romantic Relationships
```

### 3. World Settings Management

[World Settings Interface Screenshot Placeholder - Recommended size: 1200x800px, showing setting categories, detail editing, related tags]

**Feature Highlights:**
- 🌍 Category management: Geography, History, Culture, Rules, Organizations, Technology, etc.
- 🗺️ Location details: Description, maps, related events
- ⚖️ Rule systems: Magic systems, cultivation levels, social institutions
- 📅 Timeline management: Historical events, major milestones
- 🔗 Setting associations and reference tracking

### 4. Smart Chapter Editor

[Editor Interface Screenshot Placeholder - Recommended size: 1400x900px, showing Monaco editor, multi-tabs, toolbar]

**Feature Highlights:**
- ✨ Professional editor: Based on Monaco Editor, providing code-level editing experience
- 📑 Multi-tab management: Open multiple chapters simultaneously, quick switching
- 💾 Auto-save: Real-time draft saving, never lose content
- 📊 Real-time statistics: Word count, paragraph count, estimated reading time
- 🎯 Outline mode: Chapter outlines, plot points, foreshadowing management
- ⌨️ Keyboard shortcuts support: Boost editing efficiency

**Editor Keyboard Shortcuts:**
| Shortcut | Function |
|----------|----------|
| `Ctrl+S` | Save chapter |
| `Ctrl+F` | Find |
| `Ctrl+H` | Replace |
| `Ctrl+/` | Toggle comment |
| `Ctrl+K Ctrl+F` | Format text |
| `Alt+↑/↓` | Move line |

### 5. AI Smart Assistant Panel

[AI Assistant Interface Screenshot Placeholder - Recommended size: 800x1000px, showing dialogue mode, enhancement mode, check mode]

#### 5.1 Dialogue Mode

Have creative discussions with AI, get inspiration and suggestions.

**Use Cases:**
- 💭 Discuss plot development directions
- 🎭 Explore character personality and motivation
- 🌈 Brainstorm creative ideas
- ❓ Consult writing tips and advice

**Example Dialogue:**
```
Author: The protagonist faces betrayal in this chapter, how should I handle their emotional response?
AI: Considering the protagonist's previously established trust and personality traits, you could develop this from several directions...
```

#### 5.2 Content Enhancement Mode

Select text and use AI for intelligent rewriting and optimization.

**Enhancement Functions:**
- 📝 **Text Polishing**: Optimize sentence fluency and literary quality
- 📖 **Content Expansion**: Add details and scene descriptions
- 🎯 **Point Extraction**: Compress redundancy, highlight core
- 🎨 **Style Conversion**: Change narrative style and tone
- 🌟 **Creative Enhancement**: Add rhetoric and imagery

**Operation Flow:**
1. Select text to optimize in the editor
2. Open AI assistant panel, switch to "Enhancement" mode
3. Choose enhancement type (polish/expand/extract/convert)
4. AI generates suggested version
5. Apply with one click or continue adjusting

#### 5.3 Consistency Check Mode

AI automatically scans full text, detects and alerts contradictions.

**Check Items:**
- 👤 Character consistency: Contradictory personality, conflicting ability settings
- 🌍 Setting consistency: World rule violations, geographic description contradictions
- 📖 Plot consistency: Timeline confusion, causality logic issues
- 🗣️ Dialogue consistency: Incorrect titles, information leaks
- 📅 Time consistency: Date calculation errors, seasonal confusion

**Check Report Example:**
```
⚠️ Found 3 potential issues:

1. Character Contradiction (Chapter 12 vs Chapter 18)
   - Zhang San mentioned never going north in Chapter 12
   - Chapter 18 flashback shows him in northern city scenes
   Suggestion: Adjust Chapter 12 phrasing or remove Chapter 18 related flashback

2. Timeline Issue (Chapter 5)
   - Story takes place in winter, but describes blooming lotus flowers
   Suggestion: Modify season or change scenery description

3. Setting Conflict (Chapter 22)
   - Violates magic rules established in Chapter 3: forbidden spells require 24-hour preparation
   Suggestion: Add preparation time description or adjust rule settings
```

### 6. Multi-Format Export

[Export Interface Screenshot Placeholder - Recommended size: 800x600px, showing export options, format selection, preview]

**Supported Formats:**
- 📱 **EPUB**: E-book standard format, supports cover, table of contents, metadata
- 📄 **TXT**: Plain text format, preserves chapter structure
- 📋 **Markdown**: Preserves formatting marks, convenient for further editing
- 🌐 **HTML**: Web format, suitable for online reading

**Export Configuration:**
```
✅ Include metadata (title, author, synopsis)
✅ Generate table of contents navigation
✅ Embed cover image
✅ Preserve chapter hierarchy
✅ Custom fonts and typography
```

---

## 🎓 User Tutorials

### Complete Creation Workflow Example

#### Step 1: Create New Project

```
1. Click "New Project" button
2. Fill in project information:
   - Novel Title: "Star Trek: Unknown Territory"
   - Genre: Science Fiction
   - Synopsis: An adventure story of interstellar explorers...
   - Target Word Count: 200,000
3. Click "Create"
```

#### Step 2: Build Character Library

```
1. Enter "Character Management"
2. Create protagonist:
   - Name: Erin Cole
   - Personality: Rational, decisive, compassionate
   - Background: Former military officer, now expedition captain
   - Use AI assistant to generate more background details
3. Create supporting and antagonist characters
4. Establish character relationship network
```

#### Step 3: Set Worldview

```
1. Enter "World Settings"
2. Add geographic settings:
   - Main planets: Terra, Nova
   - Space station: Dawn Station
3. Add rule settings:
   - Faster-than-light travel principles
   - Alien species characteristics
4. Add organization settings:
   - Interstellar Alliance
   - Explorers Association
```

#### Step 4: Plan Chapter Outlines

```
1. Enter "Chapter Editor"
2. Create chapters:
   - Chapter 1: Departure
   - Outline: Erin accepts mission, assembles team, prepares to depart
   - Plot points: Meet old friend, discover clues, unexpected incident
3. Use AI dialogue mode to discuss plot development
```

#### Step 5: Start Writing

```
1. Open Chapter 1 editor
2. Start writing based on outline
3. When encountering difficulties:
   - Use AI dialogue mode for suggestions
   - Use enhancement mode to polish paragraphs
4. Save regularly (auto-save enabled)
```

#### Step 6: Consistency Check

```
1. After completing several chapters, run consistency check
2. Review AI-generated check report
3. Fix discovered issues one by one
4. Recheck to confirm
```

#### Step 7: Export Finished Work

```
1. Enter "Export" function
2. Select format: EPUB
3. Configure cover and metadata
4. Click "Export"
5. Download generated e-book file
```

### Best Practice Recommendations

#### ✅ Recommended Practices

1. **Plan before creating**: Complete characters and worldview before writing main text
2. **Regular checks**: Run consistency check after every 5-10 chapters
3. **Use outlines wisely**: Use outline function in editor to plan chapter structure
4. **AI assists, not replaces**: Use AI suggestions as reference, maintain your own creative style
5. **Backup data**: Regularly export project data backups

#### ❌ Avoid These

1. **Over-reliance on AI**: Don't let AI directly generate large blocks of content
2. **Ignore consistency**: Don't wait until full book completion to check contradictions
3. **Frequent mode switching**: Focus on current creative task
4. **Ignore metadata**: Record characters and settings promptly, avoid forgetting

---

## 🔧 Advanced Configuration

### Database Migration to PostgreSQL

Production environments recommend using PostgreSQL instead of SQLite.

#### Using Supabase (Recommended)

Supabase provides free PostgreSQL database hosting.

```bash
# 1. Visit https://supabase.com to create project
# 2. Get database connection string

# 3. Update environment variables
# server/.env
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# 4. Apply database schema
cd server
npx prisma generate
npx prisma db push

# 5. Test connection
node test-db-connection.js
```

#### Using Local PostgreSQL

```bash
# 1. Start local PostgreSQL using Docker
docker compose -f docker-compose.postgres.yml up -d postgres

# 2. Configure connection string
DATABASE_URL="postgresql://noveluser:changeme@localhost:5432/novel_db"

# 3. Apply migrations
npm run db:push

# 4. (Optional) Migrate SQLite data
node scripts/migrate-sqlite-to-postgres.js
```

### Custom AI Prompts

Modify AI assistant behavior and style.

#### Configuration File Location

```
server/config/ai-prompts.js
```

#### Customize Dialogue Mode Prompts

```javascript
// server/config/ai-prompts.js
module.exports = {
  dialogue: {
    systemPrompt: `You are an experienced novel writing consultant.
    Your role is to help authors think through plot, character, worldview, and other creative questions.

    Please follow these principles:
    - Provide suggestions rather than directly creating content
    - Encourage authors to develop their own creativity
    - Ask open-ended questions to guide thinking
    - Consider overall consistency of the work

    Current project info:
    - Novel genre: {genre}
    - Target audience: {audience}
    - Existing characters: {characters}
    - World settings: {worldSettings}`,
  },

  enhancement: {
    polish: `Optimize the following text's language expression to make it more fluent and literary while preserving original meaning...`,
    expand: `Expand the following text, add detail descriptions, scene atmosphere, character actions, etc...`,
    condense: `Condense the following text, preserve core information, remove redundancy...`,
  },

  consistency: {
    systemPrompt: `Analyze the following content and detect any contradictions...`,
  }
};
```

### Integrating Other AI Models

Project supports integrating various AI services.

#### Adding Claude API Support

```javascript
// server/services/aiService.js

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

async function chatWithClaude(messages) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: messages,
  });

  return response.content[0].text;
}
```

#### Configure Model Switching

```bash
# server/.env
AI_PROVIDER=openai  # openai | claude | azure | custom
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
```

### Custom Themes and Styles

Modify client interface styles.

#### Tailwind Configuration

```javascript
// client/tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... custom primary colors
          900: '#0c4a6e',
        },
      },
    },
  },
};
```

#### Global Style Variables

```css
/* client/src/assets/base.css */
:root {
  --color-background: #ffffff;
  --color-text: #213547;
  --sidebar-width: 280px;
  --header-height: 64px;
  /* Custom CSS variables */
}
```

---

## 🚢 Deployment Guide

### Deploy to Railway

Railway provides simple full-stack application deployment.

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Add environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set DATABASE_URL=postgresql://...

# 5. Deploy
railway up
```

### Deploy to Render

Render provides free web service hosting.

#### Configuration File

```yaml
# render.yaml
services:
  - type: web
    name: ai-novel-assistant
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
```

#### Deployment Steps

```bash
# 1. Connect GitHub repository to Render
# 2. Create new Web Service
# 3. Select repository and branch
# 4. Configure environment variables
# 5. Click "Create Web Service"
```

### Using Docker Deployment

#### Build Image

```bash
# Build production image
docker build -t ai-novel-assistant:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  -e OPENAI_API_KEY=sk-... \
  -e DATABASE_URL=postgresql://... \
  -v /data/novels:/app/server/prisma \
  --name ai-novel-assistant \
  ai-novel-assistant:latest
```

#### Docker Compose Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      NODE_ENV: production
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - novel-data:/app/server/prisma
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: noveluser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: novel_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  novel-data:
  postgres-data:
```

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/ai-novel-assistant
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🤝 Contributing

We welcome all forms of contributions!

### How to Contribute

- 🐛 **Report Bugs**: [Submit Issue](https://github.com/stevendong/ai-novel-assistant/issues/new?template=bug_report.md)
- 💡 **Feature Suggestions**: [Submit Feature Request](https://github.com/stevendong/ai-novel-assistant/issues/new?template=feature_request.md)
- 📖 **Improve Documentation**: Fix errors, add explanations, translate docs
- 💻 **Contribute Code**: Fix bugs, develop new features

### Development Workflow

```bash
# 1. Fork this repository
# 2. Clone your fork
git clone https://github.com/stevendong/ai-novel-assistant.git
cd ai-novel-assistant

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Develop
# Please follow project code standards (see CLAUDE.md)

# 5. Commit changes
git add .
git commit -m "feat: add amazing feature"

# 6. Push to your fork
git push origin feature/amazing-feature

# 7. Create Pull Request
# Visit GitHub page, click "New Pull Request"
```

### Code Standards

Before submitting PR, please ensure:

- ✅ Code passes TypeScript type checking
- ✅ Follows ESLint rules (if configured)
- ✅ Adds necessary comments
- ✅ Updates related documentation
- ✅ Tests functionality works properly
- ✅ Commit messages follow convention (see below)

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
feat: Add new feature
fix: Fix bug
docs: Documentation update
style: Code formatting adjustment (no functionality impact)
refactor: Code refactoring
test: Add tests
chore: Build config or auxiliary tool changes
```

Examples:
```bash
git commit -m "feat: add character relationship visualization"
git commit -m "fix: resolve chapter auto-save issue"
git commit -m "docs: update deployment guide"
```

### Development Environment Setup

For detailed development guide, refer to:
- [CLAUDE.md](./CLAUDE.md) - Claude Code Development Guide
- [MONOREPO.md](./MONOREPO.md) - Monorepo Architecture Description

---

## 📅 Roadmap

### 🎯 Current Version (v1.0.0)

- [x] Core project management features
- [x] Character and world settings system
- [x] Chapter editor (Monaco Editor)
- [x] AI dialogue, enhancement, check modes
- [x] EPUB/TXT export functionality
- [x] Unified authentication system (Clerk + JWT)
- [x] Basic permission management

### 🚀 Next Version (v1.1.0) - Planned

- [ ] **Version Control System**
  - Chapter history version management
  - Diff comparison and rollback functionality
  - Multi-version branch support

- [ ] **Collaboration Features**
  - Multi-user real-time collaborative editing
  - Comment and annotation system
  - Team permission management

- [ ] **Smart Analysis**
  - Writing style analysis
  - Readability scoring
  - Emotional curve visualization

- [ ] **Mobile Support**
  - Responsive interface optimization
  - Mobile-specific editor
  - PWA support

### 🔮 Future Plans (v2.0.0+)

- [ ] **Multi-AI Model Support**
  - Claude, Gemini, domestic LLM integration
  - Custom model switching
  - Local model deployment support

- [ ] **Advanced Export Features**
  - PDF with formatting export
  - Word DOCX format
  - Custom template system
  - Publisher format presets

- [ ] **Plugin System**
  - Open plugin API
  - Community plugin marketplace
  - Custom AI prompt plugins

- [ ] **Desktop Application**
  - Electron packaging
  - Offline mode support
  - Local AI model integration

- [ ] **Data Analytics**
  - Writing habit analysis
  - Productivity statistics
  - Creation heatmap

- [ ] **Community Features**
  - Work sharing platform
  - Community comments and likes
  - Creation tutorials and template library

### 💬 Feature Requests

Welcome to propose your feature requests and suggestions in [Discussions](https://github.com/stevendong/ai-novel-assistant/discussions)!

---

## ⚠️ Disclaimer

1. **AI-Generated Content**: This tool uses third-party AI services (OpenAI, etc.). Content quality and accuracy are the responsibility of the AI service providers. Do not rely entirely on AI-generated content; human review is essential.

2. **Data Privacy**:
   - When using cloud AI services, your novel content will be sent to AI service provider servers
   - Do not include real personal sensitive information in novels
   - Self-hosted deployment recommended for better privacy protection

3. **Copyright Statement**:
   - Copyright of novels created using this tool belongs to the author
   - AI-assisted generated content may have copyright disputes; use with caution
   - Prohibited to use this tool to create infringing content

4. **Service Availability**:
   - This project depends on third-party AI services and may become unavailable due to service provider issues
   - Please regularly backup your novel data
   - Developers are not responsible for data loss

5. **Usage Restrictions**:
   - Please comply with local laws and regulations
   - Prohibited to use this tool to create illegal or inappropriate content
   - AI API calls incur costs; please control expenses

---

## 📄 Open Source License

This project uses [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025 AI Novel Assistant Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🙏 Acknowledgments

### Technology Stack

Thanks to the following open source projects and services:

- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Ant Design Vue](https://antdv.com/) - Enterprise-class UI component library
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [Prisma](https://www.prisma.io/) - Modern TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

### Contributors

Thanks to all developers who contributed to this project!

[Contributors Avatar Wall Placeholder - Auto-generated using GitHub Contributors]

<a href="https://github.com/stevendong/ai-novel-assistant/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=stevendong/ai-novel-assistant" />
</a>

### Sponsors

[Sponsor Logo Placeholder Area]

If this project helped you, welcome to [sponsor and support](https://github.com/sponsors/stevendong) project development!

---

## 📞 Contact Us

- 📧 **Email**: support@ai-novel-assistant.com
- 💬 **Discussions**: [GitHub Discussions](https://github.com/stevendong/ai-novel-assistant/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/stevendong/ai-novel-assistant/issues)
- 📱 **Social Media**: [Twitter](https://twitter.com/yourhandle)

---

## 📊 Project Statistics

![GitHub Stars](https://img.shields.io/github/stars/stevendong/ai-novel-assistant?style=for-the-badge)
![GitHub Forks](https://img.shields.io/github/forks/stevendong/ai-novel-assistant?style=for-the-badge)
![GitHub Issues](https://img.shields.io/github/issues/stevendong/ai-novel-assistant?style=for-the-badge)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/stevendong/ai-novel-assistant?style=for-the-badge)
![GitHub Last Commit](https://img.shields.io/github/last-commit/stevendong/ai-novel-assistant?style=for-the-badge)
![GitHub Contributors](https://img.shields.io/github/contributors/stevendong/ai-novel-assistant?style=for-the-badge)

---

<div align="center">

**⭐ If this project helped you, please give us a Star! ⭐**

Made with ❤️ by the AI Novel Assistant Team

[Back to Top](#ai-novel-assistant)

</div>
