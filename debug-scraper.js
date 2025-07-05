const puppeteer = require('puppeteer');

async function debugScrape(username) {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const url = `https://letterboxd.com/${username}/films/`;
    console.log(`Navigating to: ${url}`);
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`Page status: ${response.status()}`);
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('Screenshot saved as debug-screenshot.png');
    
    // Get all text content to see what's on the page
    const pageText = await page.evaluate(() => {
      return document.body.textContent.substring(0, 500);
    });
    
    console.log('\nPage text content (first 500 chars):');
    console.log(pageText);
    
    // Check for specific elements
    const elementChecks = await page.evaluate(() => {
      const results = {};
      
      // Check for various selectors
      results.posterList = document.querySelector('.poster-list') ? 'found' : 'not found';
      results.posters = document.querySelectorAll('.poster').length;
      results.films = document.querySelectorAll('[class*="film"]').length;
      results.ratings = document.querySelectorAll('[class*="rating"]').length;
      results.stars = document.querySelectorAll('*').length;
      
      // Check for h2 or h3 elements that might indicate content structure
      const headers = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim());
      results.headers = headers;
      
      return results;
    });
    
    console.log('\nElement checks:', elementChecks);
    
    // Debug the actual structure
    const structureDebug = await page.evaluate(() => {
      const filmElements = document.querySelectorAll('.poster-list .poster');
      const debugInfo = [];
      
      for (let i = 0; i < Math.min(5, filmElements.length); i++) {
        const element = filmElements[i];
        const img = element.querySelector('img');
        const allRatingElements = element.querySelectorAll('*');
        const ratingElements = [];
        
        allRatingElements.forEach(el => {
          if (el.className && el.className.includes('rating')) {
            ratingElements.push({
              className: el.className,
              textContent: el.textContent,
              innerHTML: el.innerHTML
            });
          }
        });
        
        debugInfo.push({
          index: i,
          title: img ? img.alt : 'NO IMG',
          ratingElements: ratingElements,
          outerHTML: element.outerHTML.substring(0, 500)
        });
      }
      
      return debugInfo;
    });
    
    console.log('\nStructure debug:');
    structureDebug.forEach((info, i) => {
      console.log(`\nPoster ${i}:`);
      console.log('Title:', info.title);
      console.log('Rating elements:', info.ratingElements);
      console.log('HTML snippet:', info.outerHTML);
    });
    
    // Now let's try to extract films with updated logic
    const films = await page.evaluate(() => {
      const filmElements = document.querySelectorAll('.poster-list .poster');
      const films = [];
      
      filmElements.forEach((element, index) => {
        const img = element.querySelector('img');
        const title = img ? img.alt : null;
        
        // Look for rating elements more broadly
        const ratingElements = element.querySelectorAll('*');
        let foundRating = false;
        
        ratingElements.forEach(ratingEl => {
          if (foundRating) return;
          
          if (ratingEl.className && ratingEl.className.includes('rating')) {
            const ratingClasses = ratingEl.className;
            const ratingMatch = ratingClasses.match(/rated-(\d+)/);
            
            if (ratingMatch) {
              const rating = parseInt(ratingMatch[1]);
              films.push({
                title: title.trim(),
                rating: rating,
                method: 'class-match'
              });
              foundRating = true;
            } else {
              // Try star counting method
              const starText = ratingEl.textContent || '';
              const fullStars = (starText.match(/★/g) || []).length;
              const halfStars = (starText.match(/½/g) || []).length;
              const totalRating = fullStars + (halfStars * 0.5);
              
              if (totalRating > 0) {
                films.push({
                  title: title.trim(),
                  rating: totalRating * 2,
                  method: 'star-count'
                });
                foundRating = true;
              }
            }
          }
        });
      });
      
      return films;
    });
    
    console.log(`\nExtracted ${films.length} films with ratings`);
    console.log('First 5 films:', films.slice(0, 5));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Test with a known working username first
console.log('Testing with username: btangonan');
debugScrape('btangonan');