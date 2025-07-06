const puppeteer = require('puppeteer');

async function debugSelectors() {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    const page = await browser.newPage();
    
    console.log('Loading sarmiento films page with ratings...');
    await page.goto('https://letterboxd.com/sarmiento/films/by/rating/', { 
      waitUntil: 'networkidle2',
      timeout: 20000 
    });
    
    console.log('Page loaded, analyzing structure...');
    
    // Check for various possible selectors
    const selectors = [
      '.poster-list',
      '.poster-list .poster', 
      '.film-poster',
      '.poster',
      '.poster-container',
      '.film-details',
      '.rating',
      '[class*="rated-"]',
      '.film-title-wrapper',
      '.really-lazy-load',
      '.film-poster-list',
      '.films-board',
      '.film-poster-link'
    ];
    
    for (const selector of selectors) {
      try {
        const count = await page.$$eval(selector, els => els.length);
        console.log(`${selector}: ${count} elements found`);
        
        if (count > 0 && count < 5) {
          const sample = await page.$eval(selector, el => el.outerHTML);
          console.log(`Sample HTML for ${selector}:`, sample.substring(0, 300));
        }
      } catch (e) {
        console.log(`${selector}: 0 elements found`);
      }
    }
    
    // Let's examine a specific poster element to see its structure
    console.log('\n=== Examining first poster structure ===');
    const firstPoster = await page.$eval('.poster-container', el => el.outerHTML);
    console.log(firstPoster.substring(0, 1000));
    
    // Check if there are any data attributes that might contain rating info
    console.log('\n=== Checking for rating-related attributes ===');
    const ratingAttributes = await page.$$eval('.poster', (elements) => {
      return elements.slice(0, 5).map(el => {
        const attrs = {};
        for (const attr of el.attributes) {
          if (attr.name.includes('rating') || attr.name.includes('star') || attr.value.includes('rating') || attr.value.includes('star')) {
            attrs[attr.name] = attr.value;
          }
        }
        return attrs;
      });
    });
    console.log('Rating attributes found:', ratingAttributes);
    
    // Wait a bit more and check if ratings appear
    console.log('\n=== Waiting for React components to load ratings ===');
    await page.waitForTimeout(3000);
    
    // Check again for rating elements
    const ratingCheck2 = await page.$$eval('[class*="rated-"]', els => els.length).catch(() => 0);
    console.log('Rated elements after waiting:', ratingCheck2);
    
    // Check for star elements
    const starCheck = await page.$$eval('[class*="star"]', els => els.length).catch(() => 0);
    console.log('Star elements after waiting:', starCheck);
    
    // Check for any elements with rating data
    const ratingData = await page.$$eval('.poster', (elements) => {
      return elements.slice(0, 3).map(el => {
        // Check all child elements for rating info
        const ratingElement = el.querySelector('[class*="rating"]') || el.querySelector('[class*="rated-"]') || el.querySelector('[class*="star"]');
        if (ratingElement) {
          return {
            found: true,
            class: ratingElement.className,
            html: ratingElement.outerHTML.substring(0, 200)
          };
        }
        return { found: false };
      });
    });
    console.log('Rating data in posters:', ratingData);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugSelectors();