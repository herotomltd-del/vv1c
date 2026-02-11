# API Integration Guide - Markozon Casino Platform

Guide for integrating mobile apps or third-party services with the Markozon platform via Supabase.

## Authentication

All API calls require authentication using Supabase JWT tokens.

### Register User

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Then create profile
const { error: profileError } = await supabase
  .from('user_profiles')
  .insert({
    id: data.user.id,
    email: 'user@example.com',
    full_name: 'John Doe',
    referral_code: generateReferralCode(),
    referred_by: referrerId || null
  });

// Create wallet
await supabase.from('wallets').insert({
  user_id: data.user.id
});
```

### Login

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Token is automatically stored by Supabase client
const token = data.session.access_token;
```

### Get Current User

```javascript
const { data: { user } } = await supabase.auth.getUser();
```

### Logout

```javascript
const { error } = await supabase.auth.signOut();
```

---

## User Profile

### Get Profile

```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

### Update Profile

```javascript
const { error } = await supabase
  .from('user_profiles')
  .update({
    full_name: 'New Name',
    phone: '01234567890'
  })
  .eq('id', userId);
```

---

## Wallet Operations

### Get Wallet Balance

```javascript
const { data, error } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', userId)
  .single();

// Returns:
// {
//   main_balance: 1000.00,
//   bonus_balance: 50.00,
//   total_deposited: 5000.00,
//   total_withdrawn: 2000.00,
//   total_wagered: 15000.00,
//   total_won: 8000.00
// }
```

### Get Transaction History

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## Games

### Get Available Games

```javascript
const { data, error } = await supabase
  .from('games')
  .select('*')
  .eq('is_active', true)
  .order('name');

// Returns array of games with:
// {
//   id, name, slug, type,
//   min_bet, max_bet, rtp_percentage,
//   description, thumbnail_url
// }
```

### Get Game by Slug

```javascript
const { data, error } = await supabase
  .from('games')
  .select('*')
  .eq('slug', 'aviator')
  .single();
```

### Start Game Session

```javascript
// 1. Create game session
const { data: session, error } = await supabase
  .from('game_sessions')
  .insert({
    user_id: userId,
    game_id: gameId,
    bet_amount: betAmount,
    result: 'pending'
  })
  .select()
  .single();

// 2. Create bet record
await supabase.from('bets').insert({
  user_id: userId,
  game_id: gameId,
  session_id: session.id,
  bet_type: 'casino',
  bet_amount: betAmount,
  status: 'pending'
});

// 3. Deduct from wallet
const { data: wallet } = await supabase
  .from('wallets')
  .select('main_balance, total_wagered')
  .eq('user_id', userId)
  .single();

await supabase
  .from('wallets')
  .update({
    main_balance: wallet.main_balance - betAmount,
    total_wagered: wallet.total_wagered + betAmount
  })
  .eq('user_id', userId);

// 4. Log transaction
await supabase.from('transactions').insert({
  user_id: userId,
  type: 'bet',
  amount: -betAmount,
  balance_type: 'main',
  status: 'completed',
  description: `Bet on ${gameName}`
});
```

### Cash Out / End Session

```javascript
// 1. Update game session
await supabase
  .from('game_sessions')
  .update({
    result: 'win', // or 'loss'
    payout_amount: payoutAmount,
    multiplier: multiplier
  })
  .eq('id', sessionId);

// 2. Update bet
await supabase
  .from('bets')
  .update({
    status: 'won', // or 'lost'
    actual_payout: payoutAmount
  })
  .eq('session_id', sessionId);

// 3. If win, add to wallet
if (payoutAmount > 0) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('main_balance, total_won')
    .eq('user_id', userId)
    .single();

  await supabase
    .from('wallets')
    .update({
      main_balance: wallet.main_balance + payoutAmount,
      total_won: wallet.total_won + payoutAmount
    })
    .eq('user_id', userId);

  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'win',
    amount: payoutAmount,
    balance_type: 'main',
    status: 'completed',
    description: `Won ${multiplier}x on ${gameName}`
  });
}
```

### Get Game History

```javascript
const { data, error } = await supabase
  .from('game_sessions')
  .select('*, games(name, slug)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## Deposits

### Get Payment Methods

```javascript
const { data, error } = await supabase
  .from('payment_settings')
  .select('*')
  .eq('is_active', true);
```

### Request Deposit

```javascript
const { error } = await supabase
  .from('deposit_requests')
  .insert({
    user_id: userId,
    amount: amount,
    payment_method: 'bkash', // or 'nagad', 'rocket'
    transaction_id: 'TXN123456',
    status: 'pending'
  });

// Log activity
await supabase.from('activity_logs').insert({
  user_id: userId,
  action: 'deposit_requested',
  entity_type: 'deposit',
  description: `Requested deposit of ${amount}`
});
```

### Get Deposit History

```javascript
const { data, error } = await supabase
  .from('deposit_requests')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

---

## Withdrawals

### Request Withdrawal

```javascript
// 1. Check balance first
const { data: wallet } = await supabase
  .from('wallets')
  .select('main_balance')
  .eq('user_id', userId)
  .single();

if (wallet.main_balance < amount) {
  throw new Error('Insufficient balance');
}

// 2. Create withdrawal request
const { error } = await supabase
  .from('withdrawal_requests')
  .insert({
    user_id: userId,
    amount: amount,
    payment_method: 'bkash',
    account_details: {
      account_number: '01712345678',
      account_name: 'John Doe'
    },
    status: 'pending'
  });

// 3. Log activity
await supabase.from('activity_logs').insert({
  user_id: userId,
  action: 'withdrawal_requested',
  entity_type: 'withdrawal',
  description: `Requested withdrawal of ${amount}`
});
```

### Get Withdrawal History

```javascript
const { data, error } = await supabase
  .from('withdrawal_requests')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

---

## Referrals

### Get Referral Code

```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('referral_code')
  .eq('id', userId)
  .single();

// Share as: https://yourapp.com?ref=ABCD1234
// Or deep link: markozon://ref/ABCD1234
```

### Get Referral Stats

```javascript
const { data: referrals, error } = await supabase
  .from('referrals')
  .select('*, user_profiles!referrals_referred_id_fkey(full_name, email)')
  .eq('referrer_id', userId);

// Calculate total earnings
const totalEarnings = referrals.reduce((sum, ref) => sum + ref.total_earned, 0);
```

### Get Referral Settings

```javascript
const { data, error } = await supabase
  .from('referral_settings')
  .select('*')
  .single();
```

---

## Promo Codes

### Apply Promo Code

```javascript
// 1. Get promo code
const { data: promo, error } = await supabase
  .from('promo_codes')
  .select('*')
  .eq('code', promoCode)
  .eq('is_active', true)
  .single();

if (!promo) throw new Error('Invalid promo code');
if (promo.usage_count >= promo.max_usage) {
  throw new Error('Promo code usage limit reached');
}

// 2. Check if user already used this code
const { data: existing } = await supabase
  .from('promo_usage')
  .select('id')
  .eq('promo_code_id', promo.id)
  .eq('user_id', userId)
  .single();

if (existing) throw new Error('You already used this promo code');

// 3. Apply discount (typically on deposit)
const discountAmount = (depositAmount * promo.discount_percentage) / 100;

// 4. Record usage
await supabase.from('promo_usage').insert({
  promo_code_id: promo.id,
  user_id: userId,
  discount_amount: discountAmount,
  referrer_earnings: (discountAmount * promo.referrer_percentage) / 100
});

// 5. Update promo code usage count
await supabase
  .from('promo_codes')
  .update({ usage_count: promo.usage_count + 1 })
  .eq('id', promo.id);
```

### Create Promo Code (if enabled)

```javascript
// Check if user can create promo codes
const { data: settings } = await supabase
  .from('promo_settings')
  .select('*')
  .single();

if (!settings.user_creation_enabled) {
  throw new Error('Promo code creation is disabled');
}

// Check user's promo code count
const { count } = await supabase
  .from('promo_codes')
  .select('id', { count: 'exact' })
  .eq('created_by', userId);

if (count >= settings.max_codes_per_user) {
  throw new Error('Maximum promo codes reached');
}

// Create promo code
const { error } = await supabase
  .from('promo_codes')
  .insert({
    code: 'MYPROMO123',
    created_by: userId,
    type: 'user',
    discount_percentage: settings.default_discount_percentage,
    referrer_percentage: settings.default_referrer_percentage,
    max_usage: 100,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
```

---

## Real-time Subscriptions

### Subscribe to Wallet Changes

```javascript
const channel = supabase
  .channel('wallet_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'wallets',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Wallet updated:', payload.new);
      // Update UI with new balance
    }
  )
  .subscribe();

// Unsubscribe when done
channel.unsubscribe();
```

### Subscribe to Deposit Approval

```javascript
const channel = supabase
  .channel('deposit_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'deposit_requests',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      if (payload.new.status === 'approved') {
        console.log('Deposit approved!');
        // Refresh wallet
      }
    }
  )
  .subscribe();
```

---

## Error Handling

Always handle errors appropriately:

```javascript
try {
  const { data, error } = await supabase
    .from('games')
    .select('*');

  if (error) throw error;

  // Success
  return data;
} catch (error) {
  console.error('Error:', error.message);

  // Log to fraud detection if suspicious
  if (error.code === 'PGRST116') {
    // RLS violation - possible attack
    await supabase.from('fraud_logs').insert({
      user_id: userId,
      event_type: 'rls_violation',
      severity: 'high',
      description: error.message
    });
  }

  throw error;
}
```

---

## Rate Limiting

Implement client-side rate limiting to prevent abuse:

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async execute(fn) {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    this.requests.push(now);
    return await fn();
  }
}

// Usage
const limiter = new RateLimiter(10, 60000); // 10 requests per minute

await limiter.execute(async () => {
  return await supabase.from('games').select('*');
});
```

---

## Security Best Practices

1. **Never expose service role key** - Only use anon key in client apps
2. **Validate all inputs** - Never trust client data
3. **Use RLS policies** - All sensitive operations are protected
4. **Log suspicious activity** - Use fraud_logs table
5. **Implement device fingerprinting** - Track device info
6. **Rate limit requests** - Prevent abuse
7. **Validate wallet operations** - Always check balances before transactions

---

## Mobile App Deep Linking

### iOS (Swift)

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    if url.scheme == "markozon" && url.host == "ref" {
        let referralCode = url.lastPathComponent
        // Store referral code for registration
        UserDefaults.standard.set(referralCode, forKey: "referralCode")
    }
    return true
}
```

### Android (Kotlin)

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val data: Uri? = intent?.data
    if (data != null && data.scheme == "markozon" && data.host == "ref") {
        val referralCode = data.lastPathSegment
        // Store referral code for registration
        prefs.edit().putString("referralCode", referralCode).apply()
    }
}
```

---

## Testing

### Test Environment Setup

```javascript
// Use separate Supabase project for testing
const testSupabase = createClient(
  'https://test-project.supabase.co',
  'test-anon-key'
);

// Create test users
const testUsers = [
  { email: 'test1@example.com', password: 'test123' },
  { email: 'test2@example.com', password: 'test123' }
];
```

### Integration Tests

```javascript
describe('Game Flow', () => {
  it('should place bet and win', async () => {
    // 1. Login
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123'
    });

    // 2. Get initial balance
    const { data: wallet1 } = await supabase
      .from('wallets')
      .select('main_balance')
      .eq('user_id', auth.user.id)
      .single();

    // 3. Place bet
    const betAmount = 100;
    // ... place bet logic

    // 4. Win
    const payout = 200;
    // ... win logic

    // 5. Verify final balance
    const { data: wallet2 } = await supabase
      .from('wallets')
      .select('main_balance')
      .eq('user_id', auth.user.id)
      .single();

    expect(wallet2.main_balance).toBe(wallet1.main_balance - betAmount + payout);
  });
});
```

---

## Support

For API questions or issues:
- Check Supabase documentation
- Review database schema
- Test queries in Supabase SQL Editor
- Monitor error logs

**API Version**: 1.0.0
**Last Updated**: 2024
