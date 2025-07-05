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
    
    // Handle user not found errors more cleanly
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to compare users: ' + error.message });
    }
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
    
    let allFilms = [];
    let currentPage = 1;
    const maxPages = 5; // Limit to first 5 pages to avoid timeout
    
    while (currentPage <= maxPages) {
      console.log(`📄 Processing page ${currentPage} for ${username}...`);
      
      // Navigate to the specific page
      if (currentPage > 1) {
        const pageUrl = `https://letterboxd.com/${username}/films/page/${currentPage}/`;
        await page.goto(pageUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        await page.waitForSelector('.poster-list', { timeout: 5000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const pageFilms = await page.evaluate(() => {
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
          const link = element.querySelector('a');
          const title = img ? img.alt : null;
          const url = link ? link.href : null;
          
          if (title && index < allRatings.length) {
            films.push({
              title: title.trim(),
              rating: allRatings[index],
              url: url
            });
          }
        });
        
        return films;
      });
      
      if (pageFilms.length === 0) {
        console.log(`📄 No more films found on page ${currentPage}, stopping...`);
        break;
      }
      
      allFilms = allFilms.concat(pageFilms);
      console.log(`📄 Found ${pageFilms.length} films on page ${currentPage} (total: ${allFilms.length})`);
      
      currentPage++;
    }
    
    const films = allFilms;
    
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
  const allSharedFilms = [];
  let totalRatingDifference = 0;
  let totalRatingUnits = 0;
  let totalDiscrepancyUnits = 0;
  
  for (const [title, rating1] of user1Map) {
    if (user2Map.has(title)) {
      const rating2 = user2Map.get(title);
      const difference = Math.abs(rating1 - rating2);
      
      const filmData = {
        title,
        user1Rating: rating1,
        user2Rating: rating2,
        difference,
        url: user1Films.find(f => f.title === title)?.url || user2Films.find(f => f.title === title)?.url
      };
      
      // Track all shared films for sample size
      allSharedFilms.push(filmData);
      
      // For compatibility calculation: sum all rating units and discrepancy units
      totalRatingUnits += rating1 + rating2;
      totalDiscrepancyUnits += difference;
      
      // Include films with rating difference ≤ 0.5 stars for compatibility calculation
      if (difference <= 0.5) {
        closeMatches.push(filmData);
        totalRatingDifference += difference;
      }
      
      // Also collect films with bigger differences (>= 1.5 stars) for the differences section
      if (difference >= 1.5) {
        biggestDifferences.push(filmData);
      }
    }
  }
  
  // Calculate compatibility score using linear scale from 36% (2.25 stars) to 100% (perfect)
  let compatibilityScore = 0;
  if (allSharedFilms.length > 0) {
    const averageDiscrepancy = totalDiscrepancyUnits / allSharedFilms.length;
    // Linear scale: 100% at 0 stars, 36% at 2.25 stars
    // Formula: 100 - (avg_discrepancy / 2.25) * 64
    if (averageDiscrepancy <= 2.25) {
      compatibilityScore = Math.round(100 - (averageDiscrepancy / 2.25) * 64);
    } else {
      // Beyond 2.25 stars, continue linear decline to 0% at 3.5 stars
      compatibilityScore = Math.round(36 - ((averageDiscrepancy - 2.25) / 1.25) * 36);
    }
    compatibilityScore = Math.max(0, compatibilityScore); // Ensure it doesn't go below 0
  }
  
  // Debug logging
  console.log(`🧮 Compatibility Calculation Debug:`);
  console.log(`   Total shared films: ${allSharedFilms.length}`);
  console.log(`   Total discrepancy units: ${totalDiscrepancyUnits}`);
  console.log(`   Avg discrepancy per film: ${(totalDiscrepancyUnits / allSharedFilms.length).toFixed(2)}`);
  console.log(`   Compatibility score: ${compatibilityScore}%`);
  console.log(`   Formula: 100 - (${(totalDiscrepancyUnits / allSharedFilms.length).toFixed(2)} / 2.25) * 64`);
  
  // Calculate average rating difference for display purposes
  const averageRatingDifference = allSharedFilms.length > 0 ? 
    (totalDiscrepancyUnits / allSharedFilms.length) : 0;
  
  if (allSharedFilms.length === 0) {
    return {
      compatibilityScore: 0,
      sharedFilmsCount: 0,
      totalSharedFilms: 0,
      closeMatches: [],
      biggestDifferences: [],
      averageRatingDifference: 0
    };
  }
  
  // Sort close matches from best to worst (lowest difference first = most compatible)
  closeMatches.sort((a, b) => a.difference - b.difference);
  
  // Sort biggest differences from worst to best (highest difference first = most incompatible)
  biggestDifferences.sort((a, b) => b.difference - a.difference);
  
  return {
    compatibilityScore: Math.max(0, compatibilityScore),
    sharedFilmsCount: closeMatches.length,
    totalSharedFilms: allSharedFilms.length,
    closeMatches: closeMatches.slice(0, 10),
    biggestDifferences: biggestDifferences.slice(0, 10),
    averageRatingDifference: parseFloat(averageRatingDifference.toFixed(1))
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});