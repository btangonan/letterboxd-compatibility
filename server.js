const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/compare', async (req, res) => {
  try {
    const { username1, username2 } = req.body;
    
    if (!username1 || !username2) {
      return res.status(400).json({ error: 'Both usernames are required' });
    }

    console.log(`🚀 Starting comparison: ${username1} vs ${username2}`);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 60 seconds')), 60000);
    });
    
    const comparisonPromise = (async () => {
      const user1Films = await scrapeUserFilms(username1);
      const user2Films = await scrapeUserFilms(username2);
      
      const compatibility = calculateCompatibility(user1Films, user2Films);
      
      return {
        success: true,
        compatibility,
        user1: username1,
        user2: username2
      };
    })();
    
    const result = await Promise.race([comparisonPromise, timeoutPromise]);
    
    console.log(`✅ Comparison completed: ${username1} vs ${username2}`);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to compare users: ' + error.message });
  }
});

async function scrapeUserFilms(username) {
  let browser;
  try {
    console.log(`🔍 Starting scrape for ${username}...`);
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Use the main films page which shows ratings
    const url = `https://letterboxd.com/${username}/films/`;
    console.log(`📄 Loading ${url}...`);
    
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    if (response.status() === 404) {
      throw new Error(`User ${username} not found`);
    }
    
    console.log(`⏳ Waiting for content...`);
    await page.waitForSelector('.poster-list', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`🎬 Extracting films for ${username}...`);
    
    const films = await page.evaluate(() => {
      const filmElements = document.querySelectorAll('.poster-list .poster');
      const ratingElements = document.querySelectorAll('.rating');
      
      const films = [];
      
      // Extract all ratings first
      const allRatings = Array.from(ratingElements).map(el => {
        const ratingMatch = el.className.match(/rated-(\d+)/);
        return ratingMatch ? parseInt(ratingMatch[1]) / 2 : null; // Convert from x/10 to x/5
      }).filter(rating => rating !== null);
      
      // Match films to ratings by position
      filmElements.forEach((element, index) => {
        const img = element.querySelector('img');
        const title = img ? img.alt : null;
        
        if (title && index < allRatings.length) {
          films.push({
            title: title.trim(),
            rating: allRatings[index]
          });
        }
      });
      
      return films;
    });
    
    if (films.length === 0) {
      throw new Error(`No rated films found for user ${username}. User may not exist or have no public ratings.`);
    }
    
    console.log(`✅ Successfully extracted ${films.length} films for ${username}`);
    return films;
    
  } catch (error) {
    console.error(`❌ Error scraping ${username}: ${error.message}`);
    if (error.name === 'TimeoutError') {
      throw new Error(`Request timeout when fetching ${username}'s profile`);
    }
    throw new Error(`Failed to scrape user ${username}: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log(`🔒 Browser closed for ${username}`);
      } catch (e) {
        console.error(`Error closing browser: ${e.message}`);
      }
    }
  }
}

function calculateCompatibility(user1Films, user2Films) {
  const user1Map = new Map();
  const user2Map = new Map();
  
  user1Films.forEach(film => user1Map.set(film.title, film.rating));
  user2Films.forEach(film => user2Map.set(film.title, film.rating));
  
  const closeMatches = [];
  const biggestDifferences = [];
  let totalRatingDifference = 0;
  
  for (const [title, rating1] of user1Map) {
    if (user2Map.has(title)) {
      const rating2 = user2Map.get(title);
      const difference = Math.abs(rating1 - rating2);
      
      const filmData = {
        title,
        user1Rating: rating1,
        user2Rating: rating2,
        difference
      };
      
      // Include films with rating difference ≤ 1 star for compatibility calculation
      if (difference <= 1) {
        closeMatches.push(filmData);
        totalRatingDifference += difference;
      }
      
      // Also collect films with bigger differences (> 1 star) for the differences section
      if (difference > 1) {
        biggestDifferences.push(filmData);
      }
    }
  }
  
  if (closeMatches.length === 0) {
    return {
      compatibilityScore: 0,
      sharedFilmsCount: 0,
      closeMatches: [],
      biggestDifferences: biggestDifferences.sort((a, b) => b.difference - a.difference).slice(0, 10),
      averageRatingDifference: 0
    };
  }
  
  const averageRatingDifference = totalRatingDifference / closeMatches.length;
  const maxPossibleDifference = 5; // Updated for 5-star scale
  const compatibilityScore = Math.round((1 - (averageRatingDifference / maxPossibleDifference)) * 100);
  
  closeMatches.sort((a, b) => a.difference - b.difference);
  biggestDifferences.sort((a, b) => b.difference - a.difference);
  
  return {
    compatibilityScore: Math.max(0, compatibilityScore),
    sharedFilmsCount: closeMatches.length,
    closeMatches: closeMatches.slice(0, 10),
    biggestDifferences: biggestDifferences.slice(0, 10),
    averageRatingDifference: parseFloat(averageRatingDifference.toFixed(1))
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});