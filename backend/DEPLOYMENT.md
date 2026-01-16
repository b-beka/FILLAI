# Backend Deployment Guide

## Quick Start

### Development Mode (Mock Payments)

1. **Clone and install dependencies:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp env.example .env
# Edit .env file and set:
# - OPENAI_API_KEY
# - DATABASE_URL
# - SECRET_KEY (generate a secure random string)
# Leave CLOUDPAYMENT fields empty for mock mode
```

3. **Run database migrations:**
```bash
alembic upgrade head
```

4. **Start development server:**
```bash
uvicorn app.main:app --reload
```

**✅ Backend will run in MOCK payment mode** (no real payments)

---

## Switching to Real CloudPayments

### Step 1: Get CloudPayment Credentials

1. Sign up at https://cloudpayments.ru/
2. Get your **Public ID** and **API Secret** from dashboard
3. Configure webhook URL in CloudPayment dashboard:
   - URL: `https://yourdomain.com/api/payment/webhook`
   - Events: Pay, Confirm, Fail, Refund

### Step 2: Update .env File

```bash
# Add these to your .env:
CLOUDPAYMENT_PUBLIC_ID=pk_your_public_id_here
CLOUDPAYMENT_API_SECRET=your_api_secret_here

# Set pricing (in RUB):
PREMIUM_MONTHLY_PRICE=990
PREMIUM_YEARLY_PRICE=9900
```

### Step 3: Restart Server

```bash
uvicorn app.main:app --reload
```

**✅ Backend will automatically switch to REAL CloudPayments**

Check status at: `http://localhost:8000/api/payment/info`

---

## Production Deployment

### Environment Configuration

Update your `.env` for production:

```bash
# Environment
ENVIRONMENT=production

# Database (use production PostgreSQL)
DATABASE_URL=postgresql://user:password@prod-host:5432/fillai_prod

# Security
SECRET_KEY=<generate-a-very-long-random-string-min-32-chars>
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CloudPayment (REQUIRED for production)
CLOUDPAYMENT_PUBLIC_ID=pk_your_production_public_id
CLOUDPAYMENT_API_SECRET=your_production_api_secret

# CORS (set your frontend URL)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional: Error tracking
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id

# Email (for verification)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Database Migrations

```bash
# Run migrations on production database
alembic upgrade head
```

### Docker Deployment (Recommended)

```bash
# Build production image
docker build -f Dockerfile.prod -t fillai-backend:latest .

# Run container
docker run -d \
  --name fillai-backend \
  -p 8000:8000 \
  --env-file .env \
  fillai-backend:latest
```

### Manual Deployment

```bash
# Install production server
pip install gunicorn

# Run with gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

---

## Payment System Architecture

### Mock Mode (Development)
- ✅ No CloudPayment credentials needed
- ✅ Frontend can test payment flow
- ✅ Call `/api/payment/mock-success` to simulate payment
- ✅ User gets upgraded to premium
- ⚠️ No real money involved

### Real Mode (Production)
- ✅ CloudPayment widget integration
- ✅ Webhook verification with signatures
- ✅ Real payment processing
- ✅ Automatic subscription management
- ✅ Transaction history tracking

### How It Works

1. **User clicks "Upgrade to Premium"**
   - Frontend calls `/api/payment/create-checkout-session`
   - Backend creates transaction in database
   - Returns CloudPayment widget URL (or mock URL)

2. **User pays via CloudPayment widget**
   - CloudPayment processes payment
   - Sends webhook to `/api/payment/webhook`
   - Backend verifies signature and updates transaction
   - User subscription upgraded automatically

3. **Transaction tracking**
   - All transactions stored in `payment_transactions` table
   - User can view history at `/api/payment/transactions`
   - Includes mock/real indicator

---

## API Endpoints

### Payment Endpoints

- `GET /api/payment/info` - Get payment system status (mock/real)
- `POST /api/payment/create-checkout-session` - Create payment session
- `POST /api/payment/webhook` - CloudPayment webhook (production only)
- `POST /api/payment/mock-success` - Mock payment success (dev only)
- `GET /api/payment/transactions` - User's payment history

### Health Check

- `GET /health` - Health check endpoint
- `GET /` - API information

---

## Troubleshooting

### Issue: "Invalid project in DSN ('xxxxx')"

**Solution:** Remove invalid SENTRY_DSN from .env file:
```bash
# Either leave empty or remove the line
SENTRY_DSN=
```

### Issue: "No 'request' or 'websocket' argument on function"

**Solution:** This was fixed. Update your code from this repo.

### Issue: Backend crashes on startup

**Solution:** Check:
1. Database connection is valid
2. All required ENV variables are set
3. Migrations are up to date: `alembic upgrade head`

### Issue: Payments not working

**Solution:**
1. Check `/api/payment/info` - should show current mode
2. In mock mode: Use `/api/payment/mock-success` from frontend
3. In real mode: Verify CloudPayment credentials and webhook URL

---

## Security Checklist

- ✅ Use strong SECRET_KEY (min 32 chars)
- ✅ Set CORS_ORIGINS to your domain only
- ✅ Never commit .env file to git
- ✅ Use HTTPS in production
- ✅ Configure CloudPayment webhook URL correctly
- ✅ Enable Sentry for error tracking
- ✅ Use PostgreSQL (not SQLite) in production

---

## Monitoring

### Check System Status

```bash
# Health check
curl http://localhost:8000/health

# Payment system info
curl http://localhost:8000/api/payment/info
```

### View Logs

```bash
# Development
# Logs appear in console

# Production (with Sentry)
# Errors automatically sent to Sentry dashboard
```

---

## Migration Path

**Current State → Production:**

1. ✅ Fix .env file (remove invalid SENTRY_DSN)
2. ✅ Run migrations: `alembic upgrade head`
3. ✅ Test in mock mode locally
4. 🔄 Get CloudPayment credentials
5. 🔄 Update .env with real credentials
6. 🔄 Deploy to production server
7. 🔄 Configure CloudPayment webhooks
8. 🔄 Test real payment flow
9. 🔄 Monitor with Sentry

---

## Support

- CloudPayment Docs: https://developers.cloudpayments.ru/
- FastAPI Docs: https://fastapi.tiangolo.com/
- Alembic Docs: https://alembic.sqlalchemy.org/
