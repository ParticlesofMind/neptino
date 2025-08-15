# 🌊 Neptino Educational Platform
### *An Interactive Learning Experience Platform for Seamless Education Delivery*

---

## 📋 Project Overview

**Neptino** is a sophisticated, modern educational platform designed to provide a comprehensive learning environment for students, teachers, and administrators. Built with cutting-edge web technologies, it offers an interactive course builder with advanced canvas capabilities, robust user management, and a scalable architecture.

### 🎯 Vision
To revolutionize digital education by providing an intuitive, feature-rich platform that enables teachers to create engaging interactive content and students to learn in an immersive environment.

---

## 🏗️ Architecture & Technology Stack

### **Frontend Technologies**
- **HTML5** - Semantic markup and modern web standards
- **TypeScript** - Type-safe JavaScript with enhanced developer experience
- **SCSS (7-1 Architecture)** - Modular, maintainable styling system
- **PixiJS** - High-performance 2D WebGL graphics for interactive canvas
- **Vite** - Lightning-fast build tool and development server

### **Backend & Database**
- **Supabase** - PostgreSQL database with real-time capabilities
- **PostgreSQL 17** - Robust relational database with advanced features
- **Row Level Security (RLS)** - Database-level security policies
- **Real-time subscriptions** - Live data synchronization

### **Development Tools**
- **ESLint & Prettier** - Code quality and formatting
- **Git & GitHub** - Version control and collaboration
- **Local Supabase CLI** - Database management and migrations

---

## 🏛️ Project Structure

```
Neptino/
├── 🎨 Frontend Architecture
│   ├── src/
│   │   ├── assets/           # Static resources (fonts, icons, images)
│   │   ├── pages/            # Multi-role page structure
│   │   │   ├── shared/       # Common pages (auth, pricing)
│   │   │   ├── student/      # Student dashboard & features
│   │   │   └── teacher/      # Teacher tools & interface
│   │   ├── scripts/          # TypeScript application logic
│   │   │   ├── app.ts        # Main application entry point
│   │   │   ├── backend/      # Supabase integration & API calls
│   │   │   ├── coursebuilder/ # Advanced canvas & drawing tools
│   │   │   └── navigation/   # Route handling & UI navigation
│   │   └── scss/             # 7-1 SCSS Architecture
│   │       ├── abstracts/    # Variables, mixins, functions
│   │       ├── base/         # Reset, typography, base styles
│   │       ├── components/   # Reusable UI components
│   │       ├── layout/       # Layout-specific styles
│   │       ├── pages/        # Page-specific styles
│   │       └── themes/       # Theme variations
│
├── 🗄️ Database & Backend
│   └── supabase/
│       ├── config.toml       # Supabase configuration
│       └── migrations/       # Database schema evolution
│           ├── disable_all_rls_for_testing.sql
│           ├── create_basic_tables.sql
│           └── create_templates_table.sql
│
├── 📚 Documentation
│   └── docs/
│       ├── database-schema.md    # Complete database documentation
│       └── supabase-setup.md     # Setup & deployment guide
│
└── 🔧 Configuration
    ├── package.json          # Dependencies & scripts
    ├── vite.config.ts        # Build configuration
    ├── tsconfig.json         # TypeScript configuration
    └── .env (local)          # Environment variables
```

---

## 🎨 Advanced Course Builder

### **Interactive Canvas System**
- **PixiJS-powered drawing engine** - High-performance 2D graphics rendering
- **Multi-tool support** - Pen, highlighter, text, shapes, eraser, selection
- **Real-time color palettes** - Dynamic color selection system
- **Layout management** - Intelligent canvas layout and navigation system

### **Course Building Features**
- **Template-based course creation** - Structured course templates
- **Session-based organization** - Multi-session course planning
- **Canvas navigation** - Table of contents with session tracking
- **Media integration** - Support for images, videos, and interactive content
- **Export capabilities** - Save and share course content

---

## 👥 User Management System

### **Role-Based Architecture**
```typescript
// User Roles with Specific Capabilities
enum UserRole {
  STUDENT = 'student',    // Course enrollment, progress tracking
  TEACHER = 'teacher',    // Course creation, student management
  ADMIN = 'admin'         // Platform administration, user management
}
```

### **Authentication Features**
- **Secure sign-up/sign-in** - Email-based authentication with Supabase Auth
- **Profile management** - Comprehensive user profiles with metadata
- **Session management** - Secure token-based sessions with automatic refresh
- **Password security** - Minimum length requirements with validation

---

## 🗃️ Database Architecture

### **Core Tables**
```sql
-- User Profiles (extends Supabase auth.users)
users {
  id: uuid (Primary Key)
  email: text (Unique)
  first_name: text
  last_name: text
  role: enum('student', 'teacher', 'admin')
  institution: text
  language: text
  created_at: timestamptz
  updated_at: timestamptz
}

-- Course Management
courses {
  id: uuid (Primary Key)
  course_name: text
  course_description: text
  teacher_id: uuid (Foreign Key)
  classification_data: jsonb
  template_settings: jsonb
  schedule_settings: jsonb
  curriculum_data: jsonb
  course_settings: jsonb
  course_sessions: integer
  created_at: timestamptz
  updated_at: timestamptz
}

-- Student Enrollments
enrollments {
  id: uuid (Primary Key)
  student_id: uuid (Foreign Key)
  course_id: uuid (Foreign Key)
  enrolled_at: timestamptz
  status: enum('active', 'completed', 'dropped')
}

-- Course Templates
templates {
  id: uuid (Primary Key)
  name: text
  description: text
  category: text
  template_data: jsonb
  is_public: boolean
  created_by: uuid (Foreign Key)
  created_at: timestamptz
  updated_at: timestamptz
}
```

### **Advanced Features**
- **JSON-based flexible data storage** - Course metadata, settings, and content
- **Automatic timestamps** - Created/updated tracking with triggers
- **Referential integrity** - Foreign key constraints ensure data consistency
- **Full-text search capabilities** - PostgreSQL search features

---

## 🎯 Key Features by User Role

### **🎓 For Students**
- **Interactive Dashboard** - Course overview, progress tracking
- **Course Enrollment** - Browse and join available courses
- **Learning Progress** - Track completion and achievements
- **Responsive Design** - Optimized for desktop and mobile learning

### **👨‍🏫 For Teachers**
- **Advanced Course Builder** - Create interactive courses with drawing tools
- **Student Management** - Track enrollment and progress
- **Template System** - Reusable course templates and structures
- **Real-time Collaboration** - Live course creation and editing

### **⚙️ For Administrators**
- **User Management** - Manage students, teachers, and permissions
- **Platform Analytics** - Usage statistics and performance metrics
- **Institution Management** - Multi-institution support
- **System Configuration** - Platform-wide settings and customization

---

## 🚀 Development Workflow

### **Getting Started**
```bash
# Clone the repository
git clone https://github.com/ParticlesofMind/neptino.git
cd neptino

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start Supabase local development
supabase start

# Start the development server
npm run dev
```

### **Available Scripts**
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint for code quality
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

---

## 🔧 Configuration & Environment

### **Supabase Configuration**
- **Local Development**: Complete local Supabase stack
- **Database**: PostgreSQL 17 with full feature set
- **Authentication**: Email-based auth with role management
- **Storage**: File upload capabilities for course materials
- **Real-time**: Live data synchronization across clients

### **Build Configuration**
- **Vite**: Modern, fast build tool with HMR
- **TypeScript**: Strict type checking and modern JavaScript features
- **SCSS**: Modular styling with 7-1 architecture
- **ESLint + Prettier**: Consistent code quality and formatting

---

## 🔒 Security & Performance

### **Security Measures**
- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Client and server-side validation
- **Environment Variables** - Secure credential management

### **Performance Optimizations**
- **PixiJS WebGL Rendering** - Hardware-accelerated graphics
- **Code Splitting** - Optimized bundle loading
- **Lazy Loading** - Dynamic imports for better performance
- **CSS Architecture** - Maintainable and scalable styling

---

## 📈 Scalability & Future Plans

### **Current Capabilities**
- ✅ Multi-role user management
- ✅ Interactive course builder with advanced drawing tools
- ✅ Real-time database synchronization
- ✅ Responsive design for all devices
- ✅ Modular, maintainable codebase

### **Roadmap Features**
- 🔄 **Real-time Collaboration** - Multiple users editing simultaneously
- 📱 **Mobile App** - Native iOS/Android applications
- 🎥 **Video Integration** - Built-in video recording and playback
- 🤖 **AI-Powered Assistance** - Smart content suggestions
- 📊 **Advanced Analytics** - Detailed learning analytics and insights
- 🌍 **Multi-language Support** - Internationalization and localization

---

## 👨‍💻 Development Team

**Author**: Benjamin Jack Laubacher  
**License**: MIT  
**Repository**: [https://github.com/ParticlesofMind/neptino](https://github.com/ParticlesofMind/neptino)

---

## 📞 Support & Contribution

### **Getting Help**
- 📖 **Documentation**: Comprehensive setup and API documentation
- 🐛 **Issues**: Report bugs and request features on GitHub
- 💬 **Discussions**: Community support and feature discussions

### **Contributing**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

*Built with ❤️ for the future of education*
