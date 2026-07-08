# ShikkhaSathi - AI-Powered Learning Platform for Bangladesh

**Adaptive Learning Platform with Multi-Stakeholder Support**

ShikkhaSathi is an AI-powered adaptive learning platform specifically designed for Bangladesh students (Grades 6-12). The platform provides personalized education experiences with comprehensive dashboards for students, teachers, and parents, featuring offline-first design and gamified learning.

## ✨ Key Features

- **AI Tutor Chat**: Interactive AI-powered tutoring system with voice support
- **Multi-Stakeholder System**: Comprehensive dashboards for students, teachers, and parents
- **Teacher Class Management**: Create and manage classes with student enrollment
- **Adaptive Assessments**: Dynamic quizzes that adjust difficulty based on performance
- **Gamified Learning**: XP system, achievements, streaks, and leaderboards
- **RAG System**: Retrieval-Augmented Generation for contextual learning content
- **Offline-First Design**: Progressive Web App (PWA) with complete offline capabilities
- **Parent Portal**: Progress tracking and notification system for parents
- **Voice Integration**: Speech-to-text and text-to-speech capabilities
- **Cultural Relevance**: Designed specifically for Bangladesh NCTB curriculum

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+** with pip
- **Node.js 16+** with npm
- **Docker & Docker Compose** (for databases)
- **8GB RAM minimum** (16GB recommended)

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/mdhabibullahmahmudncs13/ShikkhaSathi.git
cd ShikkhaSathi
```

2. **Start databases**
```bash
# Start PostgreSQL, MongoDB, and Redis
./start-databases.sh
# or manually: docker-compose up -d
```

3. **Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start backend server
python run.py
```

4. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Access Points
- **Application**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Backend API**: http://localhost:8000

### Default Test Accounts
- **Student**: `student1@example.com` / `password123`
- **Teacher**: `teacher1@example.com` / `password123`
- **Parent**: `parent1@example.com` / `password123`

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18 + TypeScript** for type-safe development
- **Vite** for fast development and building
- **Tailwind CSS** for responsive design
- **PWA** with offline capabilities
- **IndexedDB** for local data storage

### Backend Stack
- **FastAPI** with async support
- **SQLAlchemy + Alembic** for database management
- **JWT Authentication** with role-based access
- **pytest** with property-based testing

### Database Architecture
- **PostgreSQL**: User data, assessments, progress tracking, teacher profiles
- **MongoDB**: Chat history, documents, content storage
- **Redis**: Sessions, caching, real-time features

### AI Integration
- **OpenAI API**: Conversational AI and content generation
- **Pinecone**: Vector database for RAG system
- **LangChain**: AI workflow orchestration
- **ElevenLabs**: Voice synthesis capabilities

## 🎯 User Roles & Features

### For Students
- **AI Tutor Chat**: Voice-enabled conversational learning
- **Adaptive Quizzes**: Personalized difficulty adjustment
- **Gamification**: XP, achievements, streaks, leaderboards
- **Progress Tracking**: Visual learning analytics
- **Offline Learning**: Complete PWA functionality

### For Teachers
- **Class Management**: Create and manage classes with student enrollment
- **Student Monitoring**: Track individual and class performance
- **Assessment Creation**: Custom quizzes and rubrics
- **Analytics Dashboard**: Comprehensive student performance insights
- **Content Management**: Curriculum material organization
- **Teacher Profile**: Automatic profile creation for teacher accounts

### For Parents
- **Child Monitoring**: Track multiple children's progress
- **Performance Analytics**: Detailed learning insights and achievements
- **Communication**: Secure teacher messaging system
- **Progress Reports**: Comprehensive performance analytics
- **Notification System**: Real-time updates on child's activities

## 🛠️ Development & Testing

### Development Commands
```bash
# Start databases only
./start-databases.sh

# Backend development
cd backend
source venv/bin/activate
python run.py

# Frontend development  
cd frontend
npm run dev

# Database migrations
cd backend
alembic upgrade head

# Create admin user
cd backend
python create_admin_user.py

# Fix teacher profiles (if needed)
cd backend
python fix_teacher_profiles.py
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# API testing
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher1@example.com","password":"password123"}'
```

## 🔧 Troubleshooting

### Common Issues

**1. Teacher Class Creation 404 Error**
- **Problem**: Teachers can't create classes due to missing Teacher profile
- **Solution**: Run the teacher profile fix script:
```bash
cd backend
python fix_teacher_profiles.py
```

**2. Authentication Issues**
- **Problem**: Login not redirecting or authentication state not persisting
- **Solution**: Check that:
  - Backend is running on port 8000
  - Frontend API client is configured correctly
  - JWT tokens are being stored properly

**3. Database Connection Issues**
- **Problem**: Backend can't connect to databases
- **Solution**: Ensure Docker containers are running:
```bash
docker-compose ps
./start-databases.sh
```

**4. Frontend Build Errors**
- **Problem**: ES6 import/export errors or React hooks issues
- **Solution**: Check that all imports use ES6 syntax and React hooks are properly imported

### API Endpoints
- **Authentication**: `POST /api/v1/auth/login`
- **User Profile**: `GET /api/v1/auth/me`
- **Teacher Classes**: `POST /api/v1/connect/teacher/create-class`
- **Student Dashboard**: `GET /api/v1/connect/student/dashboard`

## 🔒 Security & Privacy

- **JWT Authentication**: Secure token-based authentication system
- **Role-based Access Control**: Granular permissions for students, teachers, and parents
- **Data Validation**: Input sanitization and validation on all endpoints
- **HTTPS Support**: Secure communication protocols
- **Database Security**: Encrypted connections and secure credential management
- **Session Management**: Secure session handling with Redis

## 📱 Platform Support

- **Desktop**: Windows, macOS, Linux (all modern browsers)
- **Mobile**: iOS Safari, Android Chrome (responsive design)
- **PWA**: Install as native app on any platform
- **Offline**: Full functionality without internet

## 🌍 Localization

- **Bengali (বাংলা)**: Complete UI and voice support
- **English**: Full interface and voice capabilities
- **NCTB Aligned**: Bangladesh curriculum standards
- **Cultural Context**: Locally relevant content

## 📊 Project Status

**Current Status: Active Development** - Core features implemented and functional:

### ✅ Completed Features
- **Authentication System**: JWT-based login with role-based access control
- **Multi-stakeholder Dashboards**: Separate interfaces for students, teachers, and parents
- **Teacher Class Management**: Create and manage classes with automatic teacher profile creation
- **Student Enrollment**: Students can join classes and track progress
- **API Architecture**: RESTful API with comprehensive endpoint coverage
- **Database Integration**: PostgreSQL, MongoDB, and Redis working seamlessly
- **Frontend-Backend Integration**: React frontend communicating with FastAPI backend
- **Route Protection**: Secure route handling with authentication guards
- **Error Handling**: Comprehensive error handling and user feedback

### 🚧 In Progress
- **AI Tutor Chat**: Voice-enabled conversational learning system
- **Adaptive Quiz System**: Dynamic difficulty adjustment based on performance
- **Gamification Features**: XP system, achievements, and leaderboards
- **RAG System**: Retrieval-Augmented Generation for contextual content
- **Parent Portal**: Complete parent dashboard with child monitoring
- **Offline PWA**: Service worker implementation for offline functionality

### 🔧 Recent Fixes (January 2025)
- **Fixed Teacher Profile Creation**: Automatic Teacher profile creation for teacher users
- **Resolved Authentication Issues**: Fixed login redirect and authentication state management
- **Fixed API Client Configuration**: Resolved double prefix issues in API calls
- **Updated Import Syntax**: Migrated from CommonJS to ES6 imports throughout frontend
- **Enhanced Route Protection**: Improved protected route handling with loading states
- **Database Migration**: Fixed existing teacher users missing Teacher profiles

## 🤝 Contributing

We welcome contributions to ShikkhaSathi! Here's how to get started:

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ShikkhaSathi.git`
3. Create a feature branch: `git checkout -b feature-name`
4. Set up development environment:
   ```bash
   ./start-databases.sh
   cd backend && pip install -r requirements.txt
   cd frontend && npm install
   ```
5. Make your changes and test thoroughly
6. Run tests: `pytest` (backend), `npm test` (frontend)
7. Submit a pull request with detailed description

### Code Standards
- **Backend**: Follow PEP 8 conventions, use type hints, write tests
- **Frontend**: Use TypeScript, follow React best practices, maintain component structure
- **Database**: Use Alembic migrations for schema changes
- **API**: Follow RESTful conventions, document endpoints

### Areas for Contribution
- AI/ML features (RAG system, adaptive learning)
- Frontend components and user experience
- Mobile responsiveness and PWA features
- Testing and quality assurance
- Documentation and tutorials
- Bengali/English localization

## 👥 Team & Contributors

### Project Lead
- **Md. Habibullah Mahmud** - Full-Stack Developer & Project Architect
  - GitHub: [@mdhabibullahmahmudncs13](https://github.com/mdhabibullahmahmudncs13)
  - Role: System architecture, backend development, AI integration
  - Contributions: Core platform development, authentication system, database design

### Core Contributors
*We're building an amazing team! Be the first to contribute and get listed here.*

### How to Join the Team
1. Check out our [Contributing Guidelines](#-contributing)
2. Pick an issue from our GitHub Issues
3. Submit your first pull request
4. Join our development discussions

### Special Recognition
- **Bangladesh Education Community** - For feedback and requirements
- **Open Source Community** - For the incredible tools and libraries that make this possible

*Want to see your name here? We'd love to have you on the team! Check out our open issues and submit a PR.*

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**ShikkhaSathi** - Empowering Bangladesh education through AI-powered adaptive learning 🇧🇩

*Last Updated: January 2025 | Version: 1.0.0-beta | Status: Active Development*

### Quick Links
- 📖 [User Manual](USER_MANUAL.md) - Complete user guide
- 🔧 [Admin Panel Guide](ADMIN_PANEL_GUIDE.md) - Administrative features
- 🚀 [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- 🔗 [Code Connection Summary](CODE_CONNECTION_SUMMARY.md) - Technical architecture

### Support
- 🐛 [Report Issues](https://github.com/mdhabibullahmahmudncs13/ShikkhaSathi/issues)
- 💬 [Discussions](https://github.com/mdhabibullahmahmudncs13/ShikkhaSathi/discussions)
- 📧 Contact: [mdhabibullahmahmuudncs13@gmail.com]
