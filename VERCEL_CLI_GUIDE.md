# 📟 VERCEL CLI INSTALLATION & USAGE GUIDE

## ✅ Installation Complete!

**Vercel CLI Version:** 48.2.9

## 🚀 Quick Start

### 1. Login to Vercel
```bash
vercel login
```
This will open browser for authentication or provide email verification.

### 2. Link Project (First Time Only)
```bash
cd /media/d88k/01D9C5CA3CB3C3E0/edo/v0-attendance
vercel link
```
Follow prompts to link to existing project.

## 📊 Viewing Logs

### Real-time Logs (Live)
```bash
# View all logs in real-time
vercel logs --follow

# Filter face recognition logs only
vercel logs --follow | grep "FR-"

# Filter by log level
vercel logs --follow | grep "\[ERROR\]"
vercel logs --follow | grep "\[INFO\]"
vercel logs --follow | grep "\[WARN\]"
```

### Historical Logs
```bash
# View last 100 logs
vercel logs -n 100

# View logs from specific time
vercel logs --since 1h  # Last 1 hour
vercel logs --since 24h # Last 24 hours
vercel logs --since 7d  # Last 7 days

# View logs for specific deployment
vercel logs [deployment-url]
```

### Filter Face Recognition Logs
```bash
# All face recognition logs
vercel logs | grep "FR-"

# Model loading logs
vercel logs | grep "Model Loading"

# Face detection logs
vercel logs | grep "Face Detection"

# Face matching logs
vercel logs | grep "Face Matching"

# Attendance action logs
vercel logs | grep "Attendance"

# Errors only
vercel logs | grep "\[ERROR\].*FR-"

# Critical errors
vercel logs | grep "\[FATAL\].*FR-"
```

## 🔍 Advanced Log Analysis

### Save Logs to File
```bash
# Save last 1000 logs
vercel logs -n 1000 > logs.txt

# Save today's logs
vercel logs --since 24h > today_logs.txt

# Save error logs only
vercel logs | grep "\[ERROR\]" > error_logs.txt
```

### Analyze with grep and awk
```bash
# Count errors by type
vercel logs | grep "\[ERROR\]" | awk '{print $5}' | sort | uniq -c

# Find slow model loading (>5 seconds)
vercel logs | grep "Model Loading.*success" | grep -E "loadTime\":[5-9][0-9]{3}"

# Find low confidence face matches (<70%)
vercel logs | grep "Face Matching.*matched" | grep -E "confidence\":0\.[0-6]"

# Track specific user session
vercel logs | grep "FR-1704894645123-abc"

# Count face detections per hour
vercel logs --since 24h | grep "Face Detection: detected" | awk '{print substr($1,12,2)}' | sort | uniq -c
```

### Pretty Print JSON Logs
```bash
# Install jq if not already installed
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS

# Pretty print JSON metadata
vercel logs | grep "FR-" | awk -F'{' '{print "{"$2}' | jq '.'

# Filter specific fields
vercel logs | grep "Face Matching" | awk -F'{' '{print "{"$2}' | jq '.metadata.confidence'
```

## 🛠️ Deployment Commands

### Deploy to Production
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Deploy specific branch
vercel --build-env BRANCH_NAME=feature-xyz
```

### Environment Variables
```bash
# List all env variables
vercel env ls

# Add new env variable
vercel env add LOG_LEVEL

# Pull env variables to .env.local
vercel env pull .env.local
```

## 📈 Performance Monitoring

### Function Logs
```bash
# View function execution logs
vercel logs --filter=function

# View specific function
vercel logs --filter=function --filter-path=/api/face/identify-status

# View function errors
vercel logs --filter=function | grep "Error"
```

### Check Function Performance
```bash
# View execution times
vercel logs | grep "Duration:" | awk '{print $NF}' | sort -n

# Find slow functions (>3 seconds)
vercel logs | grep "Duration:" | awk '$NF > 3000'
```

## 🎯 Debugging Face Recognition Issues

### Debug Model Loading
```bash
# Check model loading sequence
vercel logs | grep -E "(Starting to load|Model Loading)" | tail -20

# Find loading errors
vercel logs | grep "Model Loading.*error"

# Check loading times
vercel logs | grep "Model Loading.*success" | grep -o "loadTime\":[0-9]*"
```

### Debug Face Detection
```bash
# Check detection success rate
echo "Success:" && vercel logs --since 1h | grep "Face Detection: detected" | wc -l
echo "No Face:" && vercel logs --since 1h | grep "Face Detection: no_face" | wc -l
echo "Errors:" && vercel logs --since 1h | grep "Face Detection: error" | wc -l

# Find detection confidence distribution
vercel logs | grep "Face Detection: detected" | grep -o "confidence\":[0-9.]*" | cut -d: -f2 | sort -n
```

### Debug Face Matching
```bash
# Check matching accuracy
vercel logs | grep "Face Matching: matched" | grep -o "confidence\":[0-9.]*" | cut -d: -f2 | awk '{sum+=$1; count++} END {print "Average confidence:", sum/count}'

# Find false negatives (no match but should match)
vercel logs | grep "Face Matching: no_match"

# Track specific user matches
vercel logs | grep "Face Matching.*userId\":\"user123\""
```

## 🔧 Troubleshooting

### If logs not showing:
1. Check you're logged in: `vercel whoami`
2. Check project is linked: `vercel project ls`
3. Check deployment status: `vercel ls`

### If authentication fails:
```bash
# Logout and login again
vercel logout
vercel login
```

### If project not linked:
```bash
# Re-link project
vercel link --yes
```

## 📚 Useful Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
# Vercel log shortcuts
alias vlog='vercel logs --follow'
alias vlog-fr='vercel logs --follow | grep "FR-"'
alias vlog-error='vercel logs --follow | grep "\[ERROR\]"'
alias vlog-face='vercel logs --follow | grep -E "(Face Detection|Face Matching|Model Loading)"'
alias vlog-save='vercel logs -n 1000 > vercel_logs_$(date +%Y%m%d_%H%M%S).txt'

# Deployment shortcuts
alias vdeploy='vercel --prod'
alias vpreview='vercel'
alias venv='vercel env pull .env.local'
```

## 📊 Log Dashboard Script

Create `analyze-logs.sh`:

```bash
#!/bin/bash

echo "=== FACE RECOGNITION LOG ANALYSIS ==="
echo "Time Range: Last 24 hours"
echo ""

echo "📊 SUMMARY:"
echo -n "Total Logs: "
vercel logs --since 24h | wc -l

echo -n "Face Detections: "
vercel logs --since 24h | grep "Face Detection: detected" | wc -l

echo -n "Face Matches: "
vercel logs --since 24h | grep "Face Matching: matched" | wc -l

echo -n "Errors: "
vercel logs --since 24h | grep "\[ERROR\]" | wc -l

echo ""
echo "⚠️  RECENT ERRORS (Last 5):"
vercel logs --since 24h | grep "\[ERROR\]" | tail -5

echo ""
echo "⏱️  PERFORMANCE:"
echo "Model Loading Times:"
vercel logs --since 24h | grep "Model Loading.*success" | grep -o "loadTime\":[0-9]*" | tail -5

echo ""
echo "🎯 SUCCESS RATE:"
SUCCESS=$(vercel logs --since 24h | grep "Face Detection: detected" | wc -l)
TOTAL=$(vercel logs --since 24h | grep "Face Detection:" | wc -l)
if [ $TOTAL -gt 0 ]; then
    RATE=$((SUCCESS * 100 / TOTAL))
    echo "Detection Success Rate: ${RATE}%"
fi
```

Make it executable:
```bash
chmod +x analyze-logs.sh
./analyze-logs.sh
```

## 🎉 Ready to Monitor!

Vercel CLI is installed and ready. Start monitoring with:

```bash
# Quick start - watch live logs
vercel logs --follow

# Filter face recognition only
vercel logs --follow | grep "FR-"
```

Happy debugging! 🚀
