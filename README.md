# VitaBridge - Online Healthcare Consultation Platform

A comprehensive full-stack application that connects patients with qualified doctors for online video consultations, prescription management, and healthcare services.

## 🌟 Features

- **Real-time Video Consultations**: Secure video calls between patients and doctors using Agora SDK
- **Appointment Management**: Easy booking, scheduling, and management of medical appointments
- **Digital Prescriptions**: Doctors can generate and send digital prescriptions to patients
- **Payment Integration**: Secure online payments via AamarPay gateway
- **User Authentication**: JWT-based secure authentication with OTP verification
- **Multi-role Support**: 
  - Patients: Book appointments, view prescriptions, pay bills
  - Doctors: Manage appointments, create prescriptions, track consultations
  - Assistants: Support doctor operations
  - Admins: System management and oversight
- **File Management**: Upload and manage medical documents and profile photos
- **Admin Dashboard**: Comprehensive admin controls and reporting
- **Contact Support**: Direct communication channel for user inquiries
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

### Backend
- **Language**: Java 11+
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL 12+
- **Authentication**: JWT (JSON Web Tokens)
- **Video SDK**: Agora
- **Payment Gateway**: AamarPay
- **Email**: Gmail SMTP
- **Build Tool**: Gradle
- **API**: RESTful Web Services

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS3
- **HTTP Client**: Axios with custom wrapper
- **Real-time Communication**: WebSocket
- **State Management**: React Context API
- **Package Manager**: npm

### DevOps
- **Tunneling**: ngrok (for local development)
- **Version Control**: Git & GitHub

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Java 11 or higher
- Node.js 16+ and npm
- PostgreSQL 12+
- Git
- A code editor (VS Code recommended)

### External Services (Required)
- [Agora Console Account](https://console.agora.io) - for video conferencing
- [AamarPay Merchant Account](https://www.aamarpay.com) - for payment processing
- Gmail Account - for SMTP email service

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/VitaBridge.git
cd VitaBridge
```

### 2. Backend Setup

```bash
cd backend
```

#### Configure Environment Variables

Create a `.env` file or set environment variables in `src/main/resources/application.properties`:

```properties
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/VitaBridge
SPRING_DATASOURCE_USERNAME=your_db_user
SPRING_DATASOURCE_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_secret_key_here

# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# AamarPay Configuration
AAMARPAY_STORE_ID=your_store_id
AAMARPAY_SIGNATURE_KEY=your_signature_key

# Email Configuration
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
ADMIN_EMAIL=admin@example.com

# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Server Configuration
APP_CALLBACK_HOST=localhost
```

#### Build and Run

```bash
# Build the project
./gradlew build

# Run the application
./gradlew bootRun

# Run tests
./gradlew test
```

The backend will start at `http://localhost:8080`

### 3. Frontend Setup

```bash
cd ../frontend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

Create a `.env.local` file in the frontend directory (optional for local dev):

```env
VITE_API_BASE_URL=http://localhost:8080
```

#### Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
VitaBridge/
├── backend/                    # Spring Boot REST API
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/vitabridge/
│   │   │   │   ├── controller/    # REST Endpoints
│   │   │   │   ├── service/       # Business Logic
│   │   │   │   ├── model/         # Entity Classes
│   │   │   │   ├── repository/    # Data Access
│   │   │   │   ├── security/      # JWT & Security
│   │   │   │   └── util/          # Utility Classes
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── build.gradle            # Dependencies
│   ├── gradlew                 # Gradle Wrapper
│   └── settings.gradle
│
├── frontend/                   # React + Vite Application
│   ├── src/
│   │   ├── components/         # React Components
│   │   │   ├── admin/
│   │   │   ├── doctor/
│   │   │   ├── patient/
│   │   │   ├── assistant/
│   │   │   ├── authentication/
│   │   │   ├── consultation/
│   │   │   └── common/
│   │   ├── api/                # API Client Modules
│   │   ├── context/            # React Context
│   │   ├── utils/              # Utility Functions
│   │   ├── assets/             # Images & Icons
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── index.html
│
├── README.md
└── .gitignore
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Patients
- `GET /api/patients/profile` - Get patient profile
- `PUT /api/patients/profile` - Update profile
- `GET /api/patients/consultations` - View past consultations
- `GET /api/patients/appointments` - View appointments

### Doctors
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/{id}` - Get doctor profile
- `GET /api/doctors/{id}/schedule` - Get doctor's schedule

### Consultations
- `POST /api/consultations` - Start consultation
- `GET /api/consultations/{id}` - Get consultation details
- `POST /api/consultations/{id}/prescription` - Add prescription

### Payments
- `POST /api/payments/aamarpay/initiate` - Initiate payment
- `GET /api/payments/aamarpay/success` - Payment success callback
- `GET /api/payments/aamarpay/fail` - Payment failure callback

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/reports` - System reports
- `POST /api/admin/doctors` - Add new doctor
- `DELETE /api/admin/users/{id}` - Remove user

## 🔐 Configuration Details

### JWT Configuration
- **Expiration**: 24 hours (86400000 ms)
- **Secret**: Use environment variable `JWT_SECRET`

### Database
- **Type**: PostgreSQL
- **Auto-DDL**: Update (creates/updates tables automatically)
- **Connection Pool**: HikariCP

### File Uploads
- **Max File Size**: 20MB
- **Max Request Size**: 25MB
- **Storage Location**: `uploads/` directory

### Email Service
- **Provider**: Gmail SMTP
- **Port**: 587 (TLS)
- **Requires**: App Password (not regular password)
- **Note**: [Generate Gmail App Password](https://myaccount.google.com/apppasswords)

## 🧪 Testing

### Backend Tests
```bash
cd backend
./gradlew test
```

Test results are generated in `backend/build/reports/tests/test/`

### Frontend Tests (when configured)
```bash
cd frontend
npm test
```

## 📝 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit regularly
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** on GitHub

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Check database credentials in `application.properties`
- Create database if not exists: 
  ```sql
  CREATE DATABASE "VitaBridge";
  ```

### Port Already in Use
- **Backend**: Change `server.port` in `application.properties`
- **Frontend**: Run `npm run dev -- --port 5174`

### SMTP/Email Issues
- Use Gmail App Password, not your regular password
- Enable "Less secure app access" if needed
- Verify `MAIL_USERNAME` and `MAIL_PASSWORD` are set correctly
- Test connection with: `./gradlew test --tests "*EmailTest*"`

### Video Call Issues
- Verify Agora App ID and Certificate are correct
- Check firewall allows WebRTC communication
- Ensure both users have stable internet connection
- Test with [Agora Diagnostic Tool](https://testrtc.agora.io/)

### CORS Issues
- Frontend and backend must be on same origin for cookies
- Update `app.cors.allowed-origin-patterns` in `application.properties` if needed
- Uncomment CORS settings if required

## 🚀 Deployment

### Backend Deployment (Docker)
```dockerfile
FROM eclipse-temurin:11-jre-jammy
WORKDIR /app
COPY build/libs/vitabridge-*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
```

### Frontend Deployment (Nginx)
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://backend:8080;
    }
}
```

## 📚 Documentation

- Backend API: See `backend/src/main/java/com/vitabridge/` for detailed code documentation
- Frontend Components: Each component file includes JSDoc comments
- Database Schema: Auto-generated from JPA entities
- Configuration: Detailed in `application.properties`

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes with clear messages
4. Push to the branch
5. Open a Pull Request

### Code Style Guidelines
- **Backend**: Follow Google Java Style Guide
- **Frontend**: Follow Airbnb JavaScript Style Guide
- Write meaningful commit messages
- Add comments for complex logic
- Update tests with new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors & Contributors

- **Emam Hassan** - Lead Developer

## 📞 Support & Contact

- **Email**: hassanchowdhury204573@gmail.com
- **Report Issues**: [GitHub Issues](https://github.com/yourusername/VitaBridge/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/VitaBridge/discussions)

## 🙏 Acknowledgments

- [Agora SDK](https://www.agora.io/) - Real-time video communication
- [AamarPay](https://www.aamarpay.com/) - Payment gateway
- [Spring Boot](https://spring.io/projects/spring-boot) - Backend framework
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool and module bundler

---

**Last Updated**: March 2026  
**Version**: 1.0.0

🚀 Ready to contribute? [Sign up to get started!](CONTRIBUTING.md)
