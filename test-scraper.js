const puppeteer = require('puppeteer');

async function testScrape() {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.text()}`);
    });
    
    // Try a well-known user with public ratings
    const url = `https://letterboxd.com/karyn/films/ratings/`;
    console.log(`Testing: ${url}`);
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`Status: ${response.status()}`);
    
    await page.waitForSelector('.poster-list', { timeout: 10000 });
    
    // Quick test to see if we can find ratings
    const hasRatings = await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      let foundRatings = 0;
      
      for (let i = 0; i < Math.min(10, posters.length); i++) {
        const poster = posters[i];
        const text = poster.textContent || '';
        if (text.includes('★') || text.includes('½')) {
          foundRatings++;
        }
      }
      
      return {
        totalPosters: posters.length,
        foundRatings: foundRatings
      };
    });
    
    console.log('Rating test result:', hasRatings);
    
    if (hasRatings.foundRatings > 0) {
      console.log('✅ SUCCESS: Found ratings in the DOM!');
    } else {
      console.log('❌ ISSUE: Still no ratings found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testScrape();