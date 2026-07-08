# Barber Booking System

A complete SaaS web application for barber shop management with client booking features and admin dashboard.

## Tech Stack

### Backend
- **Framework**: Laravel 11
- **Authentication**: Laravel Passport
- **Database**: MySQL
- **API**: RESTful API with versioning (v1)

### Frontend
- **Framework**: Angular 17
- **Mobile Support**: Progressive Web App (PWA)
- **Styling**: Custom CSS with modern design
- **HTTP**: Angular HttpClient with interceptors

## Features

### Client Features
- User registration and login (client, barber, admin roles)
- Browse barber shops
- View shop details (barbers, services, ratings)
- Book appointments
- View and manage appointments
- Cancel appointments
- Write reviews for barbers

### Barber/Owner Features
- Manage shop profile
- Manage barbers
- Manage services and prices
- View appointments calendar
- Track revenue
- Manage working schedules

### Admin Features
- Admin dashboard
- Manage all shops
- System-wide statistics
- User management

## Project Structure

```
barbe/
├── barber-booking-api/          # Laravel Backend
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/
│   │   │   ├── AuthController.php
│   │   │   ├── ShopController.php
│   │   │   ├── BarberController.php
│   │   │   ├── ServiceController.php
│   │   │   ├── AppointmentController.php
│   │   │   └── ReviewController.php
│   │   └── Models/
│   │       ├── User.php
│   │       ├── Shop.php
│   │       ├── Barber.php
│   │       ├── Service.php
│   │       ├── Appointment.php
│   │       ├── WorkingSchedule.php
│   │       └── Review.php
│   ├── database/migrations/
│   ├── routes/api.php
│   └── .env
│
└── barber-booking-web/          # Angular Frontend
    ├── src/app/
    │   ├── core/
    │   │   ├── services/
    │   │   │   ├── auth.service.ts
    │   │   │   ├── shop.service.ts
    │   │   │   └── appointment.service.ts
    │   │   ├── interceptors/
    │   │   │   └── auth.interceptor.ts
    │   │   └── guards/
    │   │       └── auth.guard.ts
    │   ├── features/
    │   │   ├── auth/
    │   │   │   ├── login/
    │   │   │   └── register/
    │   │   ├── home/
    │   │   ├── shops/
    │   │   │   ├── shop-list/
    │   │   │   └── shop-detail/
    │   │   ├── appointments/
    │   │   │   ├── appointment-list/
    │   │   │   └── appointment-create/
    │   │   └── admin/
    │   │       └── admin-dashboard/
    │   ├── app.module.ts
    │   ├── app-routing.module.ts
    │   └── app.component.ts
    ├── package.json
    └── angular.json
```

## Database Schema

### Tables
- **users**: User accounts with roles (client, barber, admin)
- **shops**: Barber shop information
- **barbers**: Barber profiles linked to users and shops
- **services**: Services offered by shops
- **appointments**: Booking records
- **working_schedules**: Barber availability schedules
- **reviews**: Customer reviews for barbers
- **service_barber**: Pivot table for service-barber relationships with custom pricing

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user

### Shops
- `GET /api/v1/shops` - List all shops
- `POST /api/v1/shops` - Create shop
- `GET /api/v1/shops/{id}` - Get shop details
- `PUT /api/v1/shops/{id}` - Update shop
- `DELETE /api/v1/shops/{id}` - Delete shop

### Barbers
- `GET /api/v1/barbers` - List barbers
- `POST /api/v1/barbers` - Create barber
- `GET /api/v1/barbers/{id}` - Get barber details
- `PUT /api/v1/barbers/{id}` - Update barber
- `DELETE /api/v1/barbers/{id}` - Delete barber

### Services
- `GET /api/v1/services` - List services
- `POST /api/v1/services` - Create service
- `GET /api/v1/services/{id}` - Get service details
- `PUT /api/v1/services/{id}` - Update service
- `DELETE /api/v1/services/{id}` - Delete service

### Appointments
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/my-appointments` - Get user's appointments
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments/{id}` - Get appointment details
- `PUT /api/v1/appointments/{id}` - Update appointment
- `DELETE /api/v1/appointments/{id}` - Delete appointment

### Reviews
- `GET /api/v1/reviews` - List reviews
- `POST /api/v1/reviews` - Create review
- `GET /api/v1/reviews/{id}` - Get review details
- `PUT /api/v1/reviews/{id}` - Update review
- `DELETE /api/v1/reviews/{id}` - Delete review

## Setup Instructions

### Backend Setup (Laravel)

1. **Navigate to backend directory**
   ```bash
   cd barber-booking-api
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Configure database in `.env`**
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=barber_booking
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

5. **Run migrations**
   ```bash
   php artisan migrate
   ```

6. **Install Laravel Passport**
   ```bash
   php artisan passport:install
   ```

7. **Start development server**
   ```bash
   php artisan serve
   ```
   API will be available at `http://localhost:8000`

### Frontend Setup (Angular)

1. **Navigate to frontend directory**
   ```bash
   cd barber-booking-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL**
   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8000/api/v1'
   };
   ```

4. **Start development server**
   ```bash
   npm start
   ```
   Application will be available at `http://localhost:4200`

5. **Build for production**
   ```bash
   npm run build
   ```

## PWA Configuration

The application is configured as a Progressive Web App. To enable PWA features:

1. Add PWA support (Angular CLI):
   ```bash
   ng add @angular/pwa
   ```

2. The manifest file is already configured at `src/manifest.webmanifest`

3. Service worker will be automatically configured by Angular PWA

## Development Notes

### Authentication Flow
1. User registers/logs in via API
2. Server returns JWT token (Laravel Passport)
3. Token stored in localStorage
4. HTTP interceptor adds token to all API requests
5. Auth guard protects protected routes

### Role-Based Access
- **Client**: Can book appointments, view shops, write reviews
- **Barber**: Can manage their schedule, view appointments
- **Admin**: Full access to admin dashboard

### Testing
- Backend: Use Postman or similar tool to test API endpoints
- Frontend: Use Angular DevTools for debugging
- Integration: Test full user flows from registration to booking

## Deployment

### Backend (Laravel)
- Deploy to Render, Railway, or similar Laravel hosting
- Set environment variables in production
- Run `php artisan passport:install` in production
- Configure CORS for frontend domain

### Frontend (Angular)
- Deploy to Vercel, Netlify, or similar Angular hosting
- Update production API URL in `environment.prod.ts`
- Build with `npm run build --prod`
- Upload `dist/barber-booking-web` folder

## Future Enhancements

- Real-time notifications (WebSocket)
- Payment integration (Stripe)
- Email notifications
- Advanced reporting and analytics
- Multi-language support
- Image upload for shop logos and barber photos
- Calendar view for appointments
- SMS reminders for appointments

## License

This project is for educational purposes.
