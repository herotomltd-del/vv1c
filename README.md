# Markozon Online Betting Casino Platform

A production-ready, self-hosted online casino and betting platform built with React, TypeScript, and Supabase.

## Features

### Core Features
- User registration/login with email authentication
- Referral system with automatic code generation
- Wallet system with main and bonus balances
- Self-hosted casino games (Aviator, Crash, Slots, Roulette, Blackjack, Plinko, Super Ace)
- Cricket betting system (structure ready)
- Deposit and withdrawal management
- Promo code system
- Agent management system
- Comprehensive admin panel
- Real-time game sessions
- Transaction history
- Activity logs and fraud detection

### Casino Games
All games are self-hosted with configurable:
- RTP (Return to Player) percentage
- Min/Max bet amounts
- House edge
- Win/Loss probability

#### Available Games:
1. **Aviator** - Watch the multiplier fly and cash out before it crashes
2. **Crash** - Ride the rocket to big wins
3. **Super Ace** - Classic card game with multipliers
4. **Plinko** - Drop the ball for random wins
5. **Roulette** - Classic European roulette
6. **Blackjack** - Beat the dealer
7. **Slots** - Spin for jackpots

### Admin Panel Features
- Real-time statistics dashboard
- Deposit request approval system
- Withdrawal request management
- User management
- Game configuration
- Platform settings
- Complete audit trail

### Financial System
- Multiple payment methods (bKash, Nagad, Rocket)
- Manual deposit/withdrawal approval
- Automatic transaction logging
- Wallet balance tracking
- Deposit and withdrawal limits

### Security
- Row Level Security (RLS) on all tables
- Authentication required for all operations
- Device fingerprinting
- IP tracking
- Activity logging
- Fraud detection system

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Static hosting compatible

## Database Schema

The platform uses Supabase PostgreSQL with the following main tables:

- `user_profiles` - Extended user information
- `wallets` - User balance management
- `games` - Casino games configuration
- `game_sessions` - Individual game plays
- `bets` - All betting records
- `transactions` - Financial transaction logs
- `deposit_requests` - Deposit management
- `withdrawal_requests` - Withdrawal management
- `referrals` - Referral relationships
- `promo_codes` - Promotional codes
- `agents` - Agent accounts
- `admin_settings` - Platform configuration
- `fraud_logs` - Security logs
- `activity_logs` - Audit trail

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- 6GB RAM, 4 CPU cores, 75GB storage (recommended for production)

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd markozon-casino
npm install
```

### Step 2: Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > API
3. Copy your project URL and anon key
4. The database migration has already been applied (check via Supabase dashboard)

### Step 3: Environment Configuration

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Database Migration

The database schema is automatically created via the migration file. To verify:

1. Go to Supabase Dashboard > SQL Editor
2. Check that all tables exist
3. Verify that games are populated

### Step 5: Create Admin User

1. Register a new user through the application
2. Go to Supabase Dashboard > Table Editor > user_profiles
3. Find your user and set `is_admin` to `true`
4. Refresh the application and you'll see the admin panel

### Step 6: Run Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5173

### Step 7: Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Deployment

### Option 1: Vercel/Netlify (Recommended)

1. Connect your GitHub repository
2. Set environment variables in the hosting platform
3. Deploy automatically on push

### Option 2: Self-Hosted

1. Build the project: `npm run build`
2. Upload the `dist` folder to your web server
3. Configure your web server to serve the index.html for all routes
4. Ensure environment variables are set

### Nginx Configuration Example:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/markozon/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Configuration

### Game Settings

Games can be configured via the admin panel or directly in the database:

```sql
UPDATE games
SET rtp_percentage = 96.0,
    min_bet = 10,
    max_bet = 10000,
    is_active = true
WHERE slug = 'aviator';
```

### Payment Methods

Configure payment methods in the `payment_settings` table:

```sql
UPDATE payment_settings
SET min_deposit = 100,
    max_deposit = 100000,
    min_withdrawal = 500,
    max_withdrawal = 50000
WHERE method = 'bkash';
```

### Referral System

Configure referral settings in the admin panel or database:

```sql
UPDATE referral_settings
SET commission_percentage = 5.0,
    deposit_bonus_percentage = 10.0,
    duration_type = 'lifetime';
```

## API Integration (Future)

The platform is designed to support mobile app integration via REST API. Key endpoints to implement:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /games` - List available games
- `POST /games/{id}/play` - Start game session
- `POST /games/{id}/cashout` - Cash out from game
- `GET /wallet` - Get wallet balance
- `POST /deposit` - Request deposit
- `POST /withdraw` - Request withdrawal

## Referral System

Users can share their referral code in two ways:

### Web URL:
```
https://your-domain.com?ref=USER_CODE
```

### App Deep Link:
```
markozon://ref/USER_CODE
```

When a new user registers with a referral code, the referrer earns:
- Commission on deposits (configurable %)
- Lifetime or time-based earnings

## Admin Panel Access

1. Login with an admin account
2. Click the Settings icon in the header
3. Access all platform controls

### Admin Capabilities:
- Approve/reject deposits and withdrawals
- View platform statistics
- Manage users
- Configure games
- View transaction history
- Monitor fraud logs

## Security Best Practices

1. **Never expose Supabase service role key** - Use anon key in frontend
2. **Keep RLS policies strict** - All sensitive data is protected
3. **Monitor fraud logs** - Regular review of suspicious activity
4. **Backup database** - Regular automated backups via Supabase
5. **Use HTTPS** - Always serve over secure connection
6. **Rate limiting** - Implement at CDN/proxy level

## Troubleshooting

### Build Errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Issues
- Check Supabase dashboard for connection status
- Verify environment variables are correct
- Check RLS policies if queries fail

### Authentication Issues
- Clear browser cache and cookies
- Check Supabase Auth settings
- Verify email confirmation is disabled (default)

## Performance Optimization

For production deployment:

1. **Enable CDN** - Serve static assets via CDN
2. **Optimize images** - Use WebP format and compression
3. **Enable caching** - Configure browser caching headers
4. **Database indexing** - Already optimized with indexes
5. **Connection pooling** - Supabase handles automatically

## Support

For technical support:
- Check the documentation
- Review Supabase logs
- Monitor browser console for errors
- Check network requests

## License

Proprietary - All rights reserved

## Version

1.0.0 - Production Ready

---

Built with React, TypeScript, Supabase, and Tailwind CSS
