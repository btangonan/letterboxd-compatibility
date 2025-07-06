# Letterboxd Film Compatibility Web App

## Project Overview
A web application that compares two Letterboxd users' film ratings to calculate compatibility and show matches/mismatches.

## Quick Start
- **Start server**: `/Users/bradleytangonan/letterboxd_compatibility/start.sh`
- **Server port**: 3000
- **Access**: http://localhost:3000
- **Test API**: `curl -X POST http://localhost:3000/compare -H "Content-Type: application/json" -d '{"username1":"btangonan","username2":"jgoresy"}'`

## Test Users (for debugging)
- **btangonan**: Light profile (~152 films) - Works ✅
- **jgoresy**: Heavy profile (~500+ films) - Now works ✅ 
- **sarmiento**: Has films but private ratings - Clear error message ✅

## Architecture
- **Frontend**: HTML/CSS/JS with Tailwind CSS and Inter font family
- **Backend**: Node.js with Express
- **Scraping**: Puppeteer for Letterboxd data extraction
- **Deployment**: Fly.io with GitHub Actions auto-deploy from master branch

## Key Technical Learnings

### Puppeteer Scraping Optimizations
**Problem**: Heavy profiles (jgoresy) failed with "Navigating frame was detached" errors
**Solution**: Simplified Puppeteer config and faster loading strategy

```javascript
// WORKING CONFIG - Keep this simple
browser = await puppeteer.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

// FAST LOADING - Use domcontentloaded not networkidle2
await page.goto(url, { 
  waitUntil: 'domcontentloaded',  // NOT networkidle2
  timeout: 15000  // Short timeout works fine
});
```

### User Profile Types & Error Handling
1. **Normal users**: Have films with public ratings → Works normally
2. **Heavy profiles**: Many films, needs faster loading → Use domcontentloaded
3. **Private ratings**: Films visible but no rating elements → Specific error message

### Scraping Logic
- Scrapes max 5 pages (~360 films) which is plenty for comparison
- Matches films to ratings by array position
- Only includes films that have ratings (compatibility needs both users' ratings)
- Debug logging shows: `filmElements.length` vs `ratingElements.length` vs `validRatings.length`

### Design Implementation
- **Current version**: Figma-exact design with 70% scaling
- **Colors**: Cream background (#fbf9f5), yellow compatibility card (#ffe250)
- **Fonts**: Inter family with large typography (150px numbers, 100px titles)
- **Layout**: Centered with `scale-[0.7]` CSS transform
- **Cards**: Bold black borders (3px solid #141414) with rounded corners

## Common Issues & Solutions

### "No rated films found" Error
- **Check**: Does user exist and have public profile?
- **Check**: Are their ratings set to public in privacy settings?
- **Debug**: Look at console logs for film vs rating element counts

### Timeout Issues
- **Don't use**: `networkidle2` (too slow for heavy profiles)
- **Use**: `domcontentloaded` + brief timeout for content rendering
- **Don't**: Add excessive browser args (causes frame detachment)

### Performance
- 5 pages = ~360 films is sufficient for good compatibility calculation
- btangonan: ~152 films (3 pages)  
- jgoresy: ~500+ films (need all 5 pages for good sample)

## Deployment
- **Platform**: Fly.io
- **Auto-deploy**: GitHub Actions triggered on push to master
- **Environment**: Production timeouts are longer (120s vs 90s local)

## Development Workflow
1. Make changes locally
2. Test with all 3 user types (btangonan, jgoresy, sarmiento)
3. Commit with descriptive message
4. Push to master → Auto-deploys to Fly.io

## Files Structure
- `server.js` - Main backend with scraping logic
- `public/index.html` - Frontend with Figma design
- `start.sh` - Server startup script
- `CLAUDE.md` - This documentation (keep updated!)

## Never Break These Working Patterns
1. **Simple Puppeteer config** - Don't add excessive browser args
2. **domcontentloaded loading** - Don't revert to networkidle2 for "safety"
3. **5-page limit** - Don't increase thinking "more is better"
4. **Current error handling** - Distinguishes between no films vs private ratings