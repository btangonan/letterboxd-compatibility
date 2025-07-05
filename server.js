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

    const user1Films = await scrapeUserFilms(username1);
    const user2Films = await scrapeUserFilms(username2);
    
    const compatibility = calculateCompatibility(user1Films, user2Films);
    
    res.json({
      success: true,
      compatibility,
      user1: username1,
      user2: username2
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to compare users: ' + error.message });
  }
});

async function scrapeUserFilms(username) {
  let browser;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Capture console logs from the browser
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.text()}`);
    });
    
    // Use the main films page which shows ratings
    const url = `https://letterboxd.com/${username}/films/`;
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    if (response.status() === 404) {
      throw new Error(`User ${username} not found`);
    }
    
    await page.waitForSelector('.poster-list', { timeout: 10000 });
    
    // Wait for the page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Trigger any lazy loading by hovering over elements
    await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      posters.forEach((poster, index) => {
        if (index < 20) { // Hover over first 20 elements
          poster.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      });
    });
    
    // Wait longer for React components to fully render ratings
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Try multiple strategies to wait for ratings to appear
    console.log('Waiting for ratings to load...');
    
    for (let attempt = 0; attempt < 5; attempt++) {
      console.log(`Attempt ${attempt + 1} to find ratings...`);
      
      const hasRatings = await page.evaluate(() => {
        const posters = document.querySelectorAll('.poster-list .poster');
        let ratingCount = 0;
        
        for (const poster of posters) {
          const text = poster.textContent || '';
          if (text.includes('★') || text.includes('½') || text.includes('⭐')) {
            ratingCount++;
          }
          
          // Also check for rating classes
          const ratingElements = poster.querySelectorAll('[class*="rating"], [class*="star"]');
          if (ratingElements.length > 0) {
            ratingCount++;
          }
        }
        
        return ratingCount;
      });
      
      console.log(`Found ${hasRatings} potential ratings`);
      
      if (hasRatings > 0) {
        console.log('✅ Found ratings, proceeding with extraction');
        break;
      }
      
      if (attempt < 4) {
        console.log('Waiting longer for ratings to load...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const films = await page.evaluate(() => {
      const filmElements = document.querySelectorAll('.poster-list .poster');
      const ratingElements = document.querySelectorAll('.rating');
      
      console.log(`Found ${filmElements.length} poster elements`);
      console.log(`Found ${ratingElements.length} rating elements`);
      
      const films = [];
      
      // First, try to match ratings to posters by position/order
      filmElements.forEach((element, index) => {
        const img = element.querySelector('img');
        const title = img ? img.alt : null;
        
        if (title && index < ratingElements.length) {
          const ratingElement = ratingElements[index];
          
          if (ratingElement) {
            // Extract rating from class name (e.g., "rated-8" means 8/10)
            const ratingClasses = ratingElement.className;
            const ratingMatch = ratingClasses.match(/rated-(\d+)/);
            
            if (ratingMatch) {
              const rating = parseInt(ratingMatch[1]);
              films.push({
                title: title.trim(),
                rating: rating
              });
              
              // Debug log for first few successful extractions
              if (films.length <= 5) {
                console.log(`✅ Extracted: ${title} - ${rating}/10`);
              }
            }
          }
        }
      });
      
      // If that didn't work, try alternative approaches
      if (films.length === 0) {
        console.log('Position matching failed, trying alternative approaches...');
        
        // Look for ratings in the entire document and try to associate them
        const allRatings = Array.from(ratingElements).map(el => {
          const ratingMatch = el.className.match(/rated-(\d+)/);
          return ratingMatch ? parseInt(ratingMatch[1]) : null;
        }).filter(rating => rating !== null);
        
        console.log(`Found ${allRatings.length} valid ratings: ${allRatings.slice(0, 10)}`);
        
        // If we have ratings and films, pair them up
        if (allRatings.length > 0) {
          filmElements.forEach((element, index) => {
            const img = element.querySelector('img');
            const title = img ? img.alt : null;
            
            if (title && index < allRatings.length) {
              films.push({
                title: title.trim(),
                rating: allRatings[index]
              });
              
              if (films.length <= 5) {
                console.log(`✅ Alternative match: ${title} - ${allRatings[index]}/10`);
              }
            }
          });
        }
      }
      
      console.log(`Successfully extracted ${films.length} films with ratings`);
      return films;
    });
    
    if (films.length === 0) {
      // Take a final screenshot to debug
      await page.screenshot({ path: `debug-${username}.png` });
      console.log(`Screenshot saved as debug-${username}.png`);
      
      // Get the full page HTML for debugging
      const pageHTML = await page.content();
      console.log('Page HTML length:', pageHTML.length);
      
      // Look for any star characters in the entire page
      const starMatches = pageHTML.match(/[★⭐½]/g);
      console.log('Star characters found in full HTML:', starMatches ? starMatches.length : 0);
      
      throw new Error(`No rated films found for user ${username}. Check debug-${username}.png for page state.`);
    }
    
    return films;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Request timeout when fetching ${username}'s profile`);
    }
    throw new Error(`Failed to scrape user ${username}: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function calculateCompatibility(user1Films, user2Films) {
  const user1Map = new Map();
  const user2Map = new Map();
  
  user1Films.forEach(film => user1Map.set(film.title, film.rating));
  user2Films.forEach(film => user2Map.set(film.title, film.rating));
  
  const sharedFilms = [];
  let totalRatingDifference = 0;
  
  for (const [title, rating1] of user1Map) {
    if (user2Map.has(title)) {
      const rating2 = user2Map.get(title);
      const difference = Math.abs(rating1 - rating2);
      
      sharedFilms.push({
        title,
        user1Rating: rating1,
        user2Rating: rating2,
        difference
      });
      
      totalRatingDifference += difference;
    }
  }
  
  if (sharedFilms.length === 0) {
    return {
      compatibilityScore: 0,
      sharedFilmsCount: 0,
      sharedFilms: [],
      averageRatingDifference: 0
    };
  }
  
  const averageRatingDifference = totalRatingDifference / sharedFilms.length;
  const maxPossibleDifference = 10;
  const compatibilityScore = Math.round((1 - (averageRatingDifference / maxPossibleDifference)) * 100);
  
  sharedFilms.sort((a, b) => a.difference - b.difference);
  
  return {
    compatibilityScore: Math.max(0, compatibilityScore),
    sharedFilmsCount: sharedFilms.length,
    sharedFilms: sharedFilms.slice(0, 10),
    averageRatingDifference: parseFloat(averageRatingDifference.toFixed(1))
  };
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});