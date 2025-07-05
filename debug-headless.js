const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugHeadless(username = 'btangonan') {
  let browser;
  try {
    console.log('🚀 Starting headless debugging session...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', (msg) => {
      const log = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(log);
      console.log(log);
    });
    
    // Capture network requests
    const networkLogs = [];
    page.on('response', (response) => {
      const log = `${response.status()} ${response.url()}`;
      networkLogs.push(log);
      if (response.url().includes('letterboxd.com')) {
        console.log(`[NETWORK] ${log}`);
      }
    });
    
    const url = `https://letterboxd.com/${username}/films/`;
    console.log(`📍 Navigating to: ${url}`);
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`📄 Page loaded with status: ${response.status()}`);
    
    // Step 1: Initial page state
    console.log('\n=== STEP 1: INITIAL PAGE STATE ===');
    await page.waitForSelector('.poster-list', { timeout: 10000 });
    
    const step1 = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        posterCount: document.querySelectorAll('.poster-list .poster').length,
        bodyTextLength: document.body.textContent.length,
        hasStars: document.body.textContent.includes('★'),
        hasHalfStars: document.body.textContent.includes('½'),
        starCount: (document.body.textContent.match(/★/g) || []).length,
        halfStarCount: (document.body.textContent.match(/½/g) || []).length
      };
    });
    
    console.log('Initial state:', step1);
    
    // Take screenshot
    await page.screenshot({ 
      path: `debug-${username}-step1.png`,
      fullPage: true 
    });
    console.log(`📸 Screenshot: debug-${username}-step1.png`);
    
    // Step 2: Wait and check for dynamic content
    console.log('\n=== STEP 2: WAITING FOR DYNAMIC CONTENT ===');
    console.log('Waiting 10 seconds for any dynamic content...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const step2 = await page.evaluate(() => {
      return {
        posterCount: document.querySelectorAll('.poster-list .poster').length,
        starCount: (document.body.textContent.match(/★/g) || []).length,
        halfStarCount: (document.body.textContent.match(/½/g) || []).length
      };
    });
    
    console.log('After waiting:', step2);
    
    await page.screenshot({ 
      path: `debug-${username}-step2.png`,
      fullPage: true 
    });
    console.log(`📸 Screenshot: debug-${username}-step2.png`);
    
    // Step 3: Analyze poster structure in detail
    console.log('\n=== STEP 3: DETAILED POSTER ANALYSIS ===');
    const posterAnalysis = await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      const analysis = [];
      
      for (let i = 0; i < Math.min(3, posters.length); i++) {
        const poster = posters[i];
        const img = poster.querySelector('img');
        
        analysis.push({
          index: i,
          title: img ? img.alt : 'No title',
          innerHTML: poster.innerHTML,
          textContent: poster.textContent,
          classes: poster.className,
          dataAttributes: Object.fromEntries(
            Array.from(poster.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => [attr.name, attr.value])
          )
        });
      }
      
      return analysis;
    });
    
    console.log('\nDetailed poster analysis:');
    posterAnalysis.forEach((poster, i) => {
      console.log(`\n--- POSTER ${i}: ${poster.title} ---`);
      console.log('Classes:', poster.classes);
      console.log('Text content:', poster.textContent.replace(/\s+/g, ' ').trim());
      console.log('Data attributes:', poster.dataAttributes);
      console.log('HTML length:', poster.innerHTML.length);
    });
    
    // Step 4: Check for different rating indicators
    console.log('\n=== STEP 4: RATING INDICATOR SEARCH ===');
    const ratingSearch = await page.evaluate(() => {
      const indicators = {
        starChars: document.body.textContent.match(/[★⭐]/g),
        halfStarChars: document.body.textContent.match(/[½]/g),
        ratingClasses: document.querySelectorAll('[class*="rating"]'),
        starClasses: document.querySelectorAll('[class*="star"]'),
        dataRating: document.querySelectorAll('[data-rating]'),
        ariaLabel: document.querySelectorAll('[aria-label*="star"], [aria-label*="rating"]')
      };
      
      return {
        starChars: indicators.starChars ? indicators.starChars.length : 0,
        halfStarChars: indicators.halfStarChars ? indicators.halfStarChars.length : 0,
        ratingClasses: indicators.ratingClasses.length,
        starClasses: indicators.starClasses.length,
        dataRating: indicators.dataRating.length,
        ariaLabel: indicators.ariaLabel.length,
        // Sample elements
        sampleRatingElements: Array.from(indicators.ratingClasses).slice(0, 3).map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent.substring(0, 50)
        }))
      };
    });
    
    console.log('Rating indicators found:', ratingSearch);
    
    // Step 5: Save full page source
    console.log('\n=== STEP 5: SAVING DEBUG FILES ===');
    const fullHTML = await page.content();
    fs.writeFileSync(`debug-${username}-full.html`, fullHTML);
    console.log(`💾 Full HTML: debug-${username}-full.html`);
    
    // Create debug report
    const report = {
      username,
      url,
      timestamp: new Date().toISOString(),
      steps: { step1, step2 },
      posterAnalysis,
      ratingSearch,
      consoleLogs,
      networkLogs: networkLogs.filter(log => log.includes('letterboxd.com'))
    };
    
    fs.writeFileSync(`debug-${username}-report.json`, JSON.stringify(report, null, 2));
    console.log(`📊 Debug report: debug-${username}-report.json`);
    
    // Final analysis
    console.log('\n🎯 FINAL ANALYSIS:');
    console.log(`- Found ${step2.posterCount} poster elements`);
    console.log(`- Found ${step2.starCount} star characters (★)`);
    console.log(`- Found ${step2.halfStarCount} half-star characters (½)`);
    console.log(`- Found ${ratingSearch.ratingClasses} elements with "rating" class`);
    console.log(`- Found ${ratingSearch.starClasses} elements with "star" class`);
    
    if (step2.starCount === 0 && ratingSearch.ratingClasses === 0) {
      console.log('\n❌ NO RATING DATA FOUND');
      console.log('Possible solutions to investigate:');
      console.log('1. Check if user profile requires authentication');
      console.log('2. Try different URL patterns (e.g., /films/ratings/, /films/by/rating/)');
      console.log('3. Look for AJAX endpoints that load rating data');
      console.log('4. Check if ratings are in CSS pseudo-elements or background images');
      console.log('5. Verify the user actually has public ratings');
    } else {
      console.log('\n✅ SOME RATING DATA FOUND');
      console.log('Next steps:');
      console.log('1. Improve extraction logic based on found elements');
      console.log('2. Look at the HTML structure in the saved files');
    }
    
    console.log('\n📁 Debug files created:');
    console.log(`- debug-${username}-step1.png`);
    console.log(`- debug-${username}-step2.png`);
    console.log(`- debug-${username}-full.html`);
    console.log(`- debug-${username}-report.json`);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run with command line argument for username
const username = process.argv[2] || 'btangonan';
console.log(`🎬 Debugging Letterboxd scraping for user: ${username}`);
debugHeadless(username);