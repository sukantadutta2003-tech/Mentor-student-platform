# 🎓 MentorConnect – Real-Time Mentorship Platform

A full-stack real-time mentorship platform where mentors and students connect through **live video calls**, **collaborative code editing**, and **instant messaging**.

## 🚀 Live Demo
- 🌐 Frontend: https://mentor-student-platform.vercel.app/
> The frontend communicates with the deployed backend API automatically.
### ⚠️ Important Note
- The backend is hosted on a free-tier cloud service. After a period of inactivity, the server may enter a sleep state.
- The first request can take 30–60 seconds while the service wakes up. Subsequent requests are processed normally.
### 📝 Demo Instructions
- Open the frontend application.
- If this is the first request after inactivity, please wait a few moments for the backend to initialize.
- Once the server is active, the application will function normally.

## ✨ Features

- **🔐 JWT Authentication** — Secure registration/login with role-based access (Mentor/Student)
- **📋 Session Management** — Create, join, and manage mentoring sessions with unique IDs
- **💬 Real-Time Chat** — Instant messaging within sessions using WebSocket (STOMP)
- **💻 Collaborative Code Editor** — Monaco Editor with live sync across participants
- **🎥 Video Calling** — Peer-to-peer video via WebRTC with STUN servers
- **🎨 Premium Dark UI** — Modern glassmorphism design with smooth animations

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Monaco Editor |
| **Backend** | Spring Boot 3.5, Spring Security, Spring WebSocket |
| **Database** | PostgreSQL |
| **Auth** | JWT (jjwt) |
| **Real-Time** | STOMP over SockJS, WebRTC |
| **Build** | Maven, Docker |

## 📁 Project Structure

```
Mentor-Student-Platform/
├── backend/                      # Spring Boot API
│   ├── src/main/java/com/mentor/platform/
│   │   ├── config/               # WebSocket config
│   │   ├── controller/           # REST + WebSocket controllers
│   │   ├── dto/                  # Request/Response DTOs
│   │   ├── entity/               # JPA Entities
│   │   ├── repository/           # Data access
│   │   ├── security/             # JWT + Spring Security
│   │   └── service/              # Business logic
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                     # Next.js App
│   ├── app/
│   │   ├── components/           # Navbar, VideoCall
│   │   ├── context/              # AuthContext
│   │   ├── hooks/                # useWebRTC
│   │   ├── lib/                  # API client
│   │   ├── login/                # Login page
│   │   ├── register/             # Register page
│   │   ├── dashboard/            # Dashboard page
│   │   └── session/[id]/         # Session room
│   └── package.json
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- PostgreSQL 16+

### Backend Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE mentorplatform;"

# Run backend
cd backend
./mvnw spring-boot:run
```
Backend runs on `http://localhost:8080`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

### Environment Variables (Production)
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `jdbc:postgresql://localhost:5432/mentorplatform` |
| `DB_USERNAME` | Database username | `primus` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_SSLMODE` | SSL mode for DB connection | `disable` |
| `DB_SCHEMA` | Database schema name | `mentorplatform` |
| `JWT_SECRET` | JWT signing secret (Base64) | (built-in dev key) |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `PORT` | Server port | `8080` |

> **Note:** Change the DB_USERNAME and DB_PASSWORD variables to your local PostgreSQL username and password:
> ```bash
> DB_USERNAME=your_username DB_PASSWORD=your_password ./mvnw spring-boot:run
> ```

## 🐳 Docker

### 1. Build the image
```bash
cd backend
docker build -t mentorconnect-api .
```

### 2. Run the container
To run the container locally and connect to a PostgreSQL database on your host machine:

**On Windows / macOS:**
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/mentorplatform \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  mentorconnect-api
```

**On Linux:**
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL=jdbc:postgresql://172.17.0.1:5432/mentorplatform \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  mentorconnect-api
```
*(Note: Replace `172.17.0.1` with your gateway IP address from `ip addr show docker0`)*

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (username, email, password, role) |
| POST | `/api/auth/login` | Login (email, password) → JWT |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/create` | Mentor creates session |
| POST | `/api/sessions/join` | Student joins session |
| POST | `/api/sessions/{id}/end` | End a session |
| GET | `/api/sessions/{id}` | Get session details |
| GET | `/api/sessions/my` | Get user's sessions |
| GET | `/api/sessions/{id}/messages` | Get chat history |

### WebSocket (STOMP)
| Destination | Description |
|-------------|-------------|
| `/app/chat/{sessionId}` | Send chat message |
| `/app/code/{sessionId}` | Send code update |
| `/app/signal/{sessionId}` | WebRTC signaling |
| `/topic/session/{sessionId}` | Chat messages broadcast |
| `/topic/session/{sessionId}/code` | Code sync broadcast |
| `/topic/session/{sessionId}/signal` | WebRTC signals broadcast |

## 👨‍💻 Author

Built by **Sukanta Dutta**
