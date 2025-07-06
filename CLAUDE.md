# Letterboxd Film Compatibility Web App

## Project Overview
A web application that compares two Letterboxd users' film ratings to calculate compatibility and show matches/mismatches.

## Running the Application
- Start server: `/Users/bradleytangonan/letterboxd_compatibility/start.sh`
- Server runs on port 3000
- Access at: http://localhost:3000

## Testing
- Light profile (works): btangonan (~151 films)
- Heavy profile (fails): sarmiento (~500+ films)

## Current Issues
- Scraping fails for users with large film collections due to timeouts
- Works fine for users with smaller collections
- Need to optimize for heavy profiles without breaking light ones

## Architecture
- Frontend: HTML/CSS/JS with Tailwind CSS and Inter font
- Backend: Node.js with Express
- Scraping: Puppeteer for Letterboxd data extraction
- Deployment: Fly.io with GitHub Actions auto-deploy

## Key Features
- Real-time compatibility scoring
- Film matches and mismatches display
- Figma-based design implementation
- Responsive layout with 70% scaling