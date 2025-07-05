# Letterboxd Compatibility Checker

A simple web application that compares film compatibility between two Letterboxd users.

## Features

- Compare film ratings between two Letterboxd users
- Calculate compatibility score based on shared films and rating differences
- Display shared films with individual ratings
- Clean, responsive web interface
- Error handling for invalid users and edge cases

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

## How it works

1. Enter two Letterboxd usernames
2. The app scrapes their public film ratings
3. Calculates compatibility based on:
   - Number of shared films
   - Average rating difference for shared films
   - Converts to a percentage score

## Technical Details

- Backend: Node.js with Express
- Web scraping: Axios + Cheerio
- Frontend: Vanilla HTML/CSS/JavaScript
- Rate limiting: 1 second delay between requests
- Error handling for timeouts, 404s, and invalid responses

## Limitations

- Only works with public Letterboxd profiles
- Limited to films on the first page of user's rated films
- Basic rate limiting (consider more sophisticated approaches for production)
- No caching (each request scrapes fresh data)

## Development

Run with nodemon for development:
```bash
npm run dev
```