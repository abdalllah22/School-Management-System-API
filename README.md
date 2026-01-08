# School Management System API

A comprehensive RESTful API for managing schools, classrooms, and students with role-based access control built using the Axion template architecture.

## 🎯 TRUE Axion Architecture

This project follows the **authentic Axion pattern**:
- ✅ **Class-based Managers** (not controllers)
- ✅ **Cortex Execution Layer** (handles all HTTP concerns)
- ✅ **Unified Parameter Passing** (with `__` metadata)
- ✅ **Pure Business Logic** (no req/res in managers)
- ✅ **Data Object Returns** (cortex formats HTTP responses)

## 🚀 Features

- **JWT Authentication** with access & refresh tokens
- **Role-Based Access Control** (Superadmin & School Admin)
- **Schools Management** - Full CRUD (Superadmin only)
- **Classrooms Management** - Full CRUD with capacity tracking
- **Students Management** - Enrollment, transfers, lifecycle management
- **School Admin Isolation** - Admins only access their assigned school
- **Automatic Enrollment Management** - Capacity enforcement
- **Transfer History** - Track student movements
- **Rate Limiting** - Prevent abuse
- **Input Validation** - Joi schemas
- **Security** - Helmet, CORS, MongoDB injection prevention


## 🛠️ Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, express-mongo-sanitize
- **Architecture**: Axion template pattern

## 📁 Project Structure (Axion Based)

```
school-Management-System-Api/
├── index.js                      # Entry point
├── app.js                        # Express app setup
├── package.json
├── .env.example
├── config/
│   └── index.js                  # Configuration
├── connect/
│   └── mongo.js                  # Database connection
├── libs/
│   └── cortex.js                 #  Execution layer
├── loaders/
│   └── index.js                  # Mongoose models (User, School, Classroom, Student)
├── mws/
│   └── rateLimiter.js            # Rate limiting middleware
└── managers/                     # MANAGERS
    ├── auth/
    │   ├── Auth.manager.js       # Class-based (no req/res)
    │   ├── auth.validators.js    # Joi schemas
    │   └── auth.routes.js        # Uses cortex.executeManager()
    ├── school/
    │   ├── School.manager.js     
    │   ├── school.validators.js
    │   └── school.routes.js
    ├── classroom/
    │   ├── Classroom.manager.js
    │   ├── classroom.validators.js
    │   └── classroom.routes.js
    └── student/
        ├── Student.manager.js    
        ├── student.validators.js
        └── student.routes.js
```
## 🔑 Key Patterns

### 1. Manager Classes (Not Controllers)
```javascript
// ✅ TRUE AXION
class Auth {
  async register({ __token, email, password, ...data }) {
    // Pure business logic
    return { user, token, message };
  }
}
module.exports = Auth; // Export CLASS

// ❌ NOT AXION
class AuthController {
  async register(req, res) {
    return res.json({...});
  }
}
module.exports = new AuthController(); // Export instance
```

### 2. Cortex Execution
```javascript
// Routes use cortex.executeManager()
router.post('/register',
  cortex.validate(registerSchema),
  cortex.executeManager(AuthManager, 'register')
);
```

### 3. Unified Parameters with __ Metadata
```javascript
async method({ __token, __headers, __device, __ip, ...params }) {
  // __token: { userId, email, role, schoolId }
  // __headers: HTTP headers
  // __device: User agent
  // __ip: Client IP
  // ...params: Body + query + route params merged
}
```

### 4. Return Data Objects
```javascript
// Success
return { user, message: 'Success' };

// Error  
return { error: 'Not found', code: 'NOT_FOUND' };
```

## 🛠️ Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (v5+)
- npm or yarn

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd School-Management-System-API
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

5. **Run the application**
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | User login | Public |
| GET | `/me` | Get current user | Authenticated |
| PUT | `/me` | Update profile | Authenticated |
| PUT | `/change-password` | Change password | Authenticated |

### Schools (`/api/v1/schools`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List all schools | Superadmin |
| GET | `/:id` | Get school details | Superadmin, School Admin (own) |
| POST | `/` | Create school | Superadmin |
| PUT | `/:id` | Update school | Superadmin |
| DELETE | `/:id` | Delete school | Superadmin |

### Classrooms (`/api/v1/classrooms`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List classrooms | School Admin (own school) |
| GET | `/:id` | Get classroom details | School Admin (own school) |
| POST | `/` | Create classroom | School Admin |
| PUT | `/:id` | Update classroom | School Admin (own school) |
| DELETE | `/:id` | Delete classroom | School Admin (own school) |

### Students (`/api/v1/students`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List students | School Admin (own school) |
| GET | `/:id` | Get student details | School Admin (own school) |
| POST | `/` | Enroll student | School Admin |
| PUT | `/:id` | Update student | School Admin (own school) |
| DELETE | `/:id` | Withdraw student | School Admin (own school) |
| POST | `/:id/transfer` | Transfer student | School Admin (own school) |

## 🔐 Authentication

### Register
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "superadmin"
}
```

### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "superadmin"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "Login successful"
}
```

### Using the Token
Include the token in the Authorization header for protected routes:
```bash
Authorization: Bearer <your-access-token>
```
#### Get Current User
```bash
GET /auth/me
Authorization: Bearer <token>
```


### 🏫 School Endpoints (Superadmin Only)
#### Create School
```bash
POST /schools
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Springfield Elementary",
  "contactInfo": {
    "email": "info@springfield.edu",
    "phone": "+1-555-0123"
  },
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA"
  },
  "establishedYear": 1990,
  "principalName": "Seymour Skinner",
  "totalCapacity": 500
}
```
#### List Schools
```bash
GET /schools?page=1&limit=20&search=spring
Authorization: Bearer <token>
```

#### Get School Stats
```bash
GET /schools/:id/stats
Authorization: Bearer <token>
```



### 📚 Classroom Endpoints (School Admin)

#### Create Classroom
```bash
POST /api/v1/classrooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "507f1f77bcf86cd799439011",
  "name": "Grade 5-A",
  "grade": 5,
  "section": "A",
  "capacity": 30,
  "roomNumber": "101",
  "teacher": {
    "name": "Jane Smith",
    "email": "jane.smith@school.com"
  },
  "subjects": ["Math", "Science", "English"]
}
```
#### Get Classroom Students
```bash
GET /classrooms/:id/students
Authorization: Bearer <token>
```


### 👨🏻‍🎓Student Endpoints (School Admin)

#### Enroll Student
```bash
POST /api/v1/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "507f1f77bcf86cd799439011",
  "classroomId": "507f191e810c19729de860ea",
  "firstName": "Emma",
  "lastName": "Johnson",
  "dateOfBirth": "2010-05-15",
  "gender": "female",
  "guardian": {
    "name": "Michael Johnson",
    "relationship": "Father",
    "phone": "+1-555-0790"
  }
}
```

#### Transfer Student
```bash
POST /students/:id/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "newClassroomId": "507f191e810c19729de860eb",
  "reason": "Grade promotion"
}
```

#### Search Students
```bash
GET /students?search=emma&status=active&page=1&limit=20
Authorization: Bearer <token>
```


## 🔐 Authentication & Authorization

### Roles

| Role | Permissions |
|------|------------|
| **Superadmin** | Full system access - manage all schools, view all data |
| **School Admin** | School-specific access - manage only assigned school's classrooms and students |

### Token Structure
```javascript
{
  userId: "user_id",
  email: "user@example.com",
  role: "school_admin",
  schoolId: "school_id" // Only for school_admin
}
```

### Middleware Chain (Axion Pattern)
```javascript
// 1. cortex.authenticate() - Verifies token, adds __token to req
// 2. cortex.validate(schema) - Validates input
// 3. cortex.executeManager(Manager, 'method') - Executes business logic
```

## 🗄️ Database Schema

### Collections

- **Users** - Authentication, roles, school assignment
- **Schools** - School information and configuration
- **Classrooms** - Classroom details, capacity, enrollment tracking
- **Students** - Student profiles, enrollment, transfer history

See models in `loaders/index.js` for detailed schemas.



## 🧪 Testing

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch
```

## 🚀 Deployment

### Deployment Steps ()

This project uses GitHub Actions to automatically deploy to the production server whenever changes are pushed to the main branch.

flowchart TD
    
    A  [Developer] |Push / Merge to main| B[GitHub Repository]
    B -->|Triggers| C[GitHub Actions<br/>Deploy to Production]
    C -->|SSH using Secrets| D[Production Server<br/>DigitalOcean Droplet]
    D --> E[Pull Latest Code<br/>main branch]
    E --> F[Update .env from<br/>GitHub Secrets]
    F --> G[npm install]
    G --> H[npm run build]
    H --> I[PM2 Restart / Start App]
    I --> J[🚀 Application Live]





## 👤 Author

Ahmed Abdallah - Software Engineer


