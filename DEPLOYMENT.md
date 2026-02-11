# Deployment Guide - Markozon Casino Platform

Complete step-by-step deployment guide for production hosting.

## Server Requirements

### Minimum Requirements (Small Scale)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 40GB SSD
- **Bandwidth**: 1TB/month
- **OS**: Ubuntu 20.04+ or similar

### Recommended Requirements (Production Scale)
- **CPU**: 4 cores
- **RAM**: 6GB
- **Storage**: 75GB NVMe SSD
- **Bandwidth**: Unlimited or 5TB+
- **OS**: Ubuntu 22.04 LTS

## Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database migration applied
- [ ] Admin user created
- [ ] Environment variables ready
- [ ] Domain name configured
- [ ] SSL certificate ready
- [ ] Payment gateway details (optional for manual deposits)

## Deployment Options

### Option 1: Vercel (Easiest, Recommended for MVP)

#### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

#### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Click "New Project"
3. Import your Git repository
4. Configure environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click "Deploy"

#### Step 3: Configure Custom Domain (Optional)
1. Go to Project Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed

**Pros**: Automatic deployments, CDN, SSL, zero config
**Cons**: No server-side control, vendor lock-in

---

### Option 2: Netlify

#### Step 1: Build Configuration
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy
1. Go to https://netlify.com
2. Click "New site from Git"
3. Connect repository
4. Set environment variables
5. Deploy

**Pros**: Similar to Vercel, good performance
**Cons**: Similar limitations

---

### Option 3: Self-Hosted VPS (Full Control)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 (optional, for serving)
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Clone and Build

```bash
# Create app directory
sudo mkdir -p /var/www/markozon
sudo chown $USER:$USER /var/www/markozon

# Clone repository
cd /var/www/markozon
git clone <your-repo-url> .

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
EOF

# Build
npm run build
```

#### Step 3: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/markozon
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/markozon/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

#### Step 4: Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/markozon /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 5: Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts to complete SSL setup.

#### Step 6: Automatic Updates (Optional)

Create deployment script:
```bash
nano /var/www/markozon/deploy.sh
```

Add:
```bash
#!/bin/bash
cd /var/www/markozon
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
echo "Deployment completed at $(date)"
```

Make executable:
```bash
chmod +x /var/www/markozon/deploy.sh
```

**Pros**: Full control, no vendor lock-in, cost-effective
**Cons**: Requires server management knowledge

---

### Option 4: Docker Deployment

#### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Step 2: Create nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml+rss text/javascript;
}
```

#### Step 3: Build and Run

```bash
# Build image
docker build -t markozon-casino .

# Run container
docker run -d \
  --name markozon \
  -p 80:80 \
  -e VITE_SUPABASE_URL=your_url \
  -e VITE_SUPABASE_ANON_KEY=your_key \
  --restart unless-stopped \
  markozon-casino
```

**Pros**: Consistent environment, easy scaling
**Cons**: Requires Docker knowledge

---

## Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check if site is accessible
curl -I https://your-domain.com

# Check for errors in browser console
# Open developer tools > Console
```

### 2. Create First Admin User

1. Register through the application
2. Go to Supabase Dashboard
3. Navigate to: Table Editor > user_profiles
4. Find your user record
5. Set `is_admin` to `true`
6. Refresh the application

### 3. Configure Payment Methods

Via Supabase Dashboard SQL Editor:

```sql
-- Update payment method limits
UPDATE payment_settings
SET
  min_deposit = 100,
  max_deposit = 100000,
  min_withdrawal = 500,
  max_withdrawal = 50000,
  is_active = true
WHERE method = 'bkash';

-- Repeat for other methods
```

### 4. Test Core Features

- [ ] User registration
- [ ] User login
- [ ] Wallet display
- [ ] Game loading
- [ ] Bet placement
- [ ] Deposit request
- [ ] Withdrawal request
- [ ] Admin panel access
- [ ] Deposit approval
- [ ] Withdrawal approval

### 5. Setup Monitoring

#### Uptime Monitoring
- Use UptimeRobot or similar service
- Monitor main domain
- Check every 5 minutes

#### Error Tracking
- Monitor Supabase logs
- Check browser console in production
- Review error patterns

#### Performance Monitoring
- Use Lighthouse for performance checks
- Monitor page load times
- Check database query performance

### 6. Backup Strategy

Supabase provides automatic backups, but you should also:

```bash
# Manual database backup
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql

# Automate with cron
0 2 * * * /path/to/backup-script.sh
```

### 7. Security Hardening

```bash
# Enable firewall (if self-hosted)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Keep system updated
sudo apt update && sudo apt upgrade -y
```

---

## Scaling Considerations

### When to Scale

Monitor these metrics:
- **CPU usage** consistently over 70%
- **Memory usage** over 80%
- **Response times** increasing
- **Database connections** near limit

### Horizontal Scaling

1. **Add CDN**: CloudFlare or similar
2. **Database**: Upgrade Supabase plan for more connections
3. **Caching**: Implement Redis for session management
4. **Load Balancer**: Distribute traffic across multiple instances

### Vertical Scaling

1. **Upgrade VPS**: More CPU/RAM
2. **Database**: Larger Supabase instance
3. **Storage**: Add more disk space

---

## Troubleshooting

### Site Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Database Connection Issues

1. Verify environment variables
2. Check Supabase project status
3. Test connection from server:
```bash
curl -I https://your-project.supabase.co
```

### Build Failures

```bash
# Clear cache and rebuild
rm -rf node_modules dist package-lock.json
npm install
npm run build
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Review fraud detection alerts
- Check pending deposits/withdrawals

**Weekly**:
- Review platform statistics
- Analyze user behavior
- Check database performance

**Monthly**:
- Update dependencies: `npm update`
- Review and optimize database queries
- Backup verification
- Security audit

### Update Procedure

```bash
cd /var/www/markozon
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Nginx Docs**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

## Emergency Procedures

### Site Down

1. Check server status
2. Verify Nginx is running
3. Check DNS propagation
4. Review recent changes
5. Restore from backup if needed

### Database Issues

1. Check Supabase dashboard
2. Review connection limits
3. Check for long-running queries
4. Contact Supabase support if needed

### Security Breach

1. Change all credentials immediately
2. Review access logs
3. Check fraud_logs table
4. Notify affected users
5. Update security measures

---

**Deployment Version**: 1.0.0
**Last Updated**: 2024

For production support, maintain this document and update as needed.
