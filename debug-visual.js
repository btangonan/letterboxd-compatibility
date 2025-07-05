const puppeteer = require('puppeteer');

async function debugVisual(username = 'btangonan') {
  let browser;
  try {
    console.log('🚀 Starting visual debugging session...');
    
    // Launch browser in non-headless mode so we can see what's happening
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true, // Open devtools automatically
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--start-maximized'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Capture all console logs
    page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('response', (response) => {
      console.log(`[NETWORK] ${response.status()} ${response.url()}`);
    });
    
    const url = `https://letterboxd.com/${username}/films/`;
    console.log(`📍 Navigating to: ${url}`);
    
    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`📄 Page loaded with status: ${response.status()}`);
    console.log(`📋 Page title: ${await page.title()}`);
    
    await page.waitForSelector('.poster-list', { timeout: 10000 });
    console.log('✅ Found .poster-list element');
    
    // Wait for content to load
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-step1-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-step1-initial.png');
    
    // Check what we have so far
    const initialCheck = await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      const results = {
        posterCount: posters.length,
        samplePosterHTML: posters[0] ? posters[0].outerHTML.substring(0, 500) : 'No posters found',
        allTextContent: document.body.textContent.substring(0, 1000),
        starCharacters: (document.body.textContent.match(/[★⭐½]/g) || []).length
      };
      
      console.log('Initial check results:', results);
      return results;
    });
    
    console.log('🔍 Initial analysis:', initialCheck);
    
    // Scroll to trigger any lazy loading
    console.log('📜 Scrolling to trigger lazy loading...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot after scrolling
    await page.screenshot({ path: 'debug-step2-after-scroll.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-step2-after-scroll.png');
    
    // Hover over elements to trigger any hover effects
    console.log('🖱️ Hovering over poster elements...');
    await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      posters.forEach((poster, index) => {
        if (index < 10) {
          poster.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          poster.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot after hovering
    await page.screenshot({ path: 'debug-step3-after-hover.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-step3-after-hover.png');
    
    // Detailed analysis
    const detailedAnalysis = await page.evaluate(() => {
      const posters = document.querySelectorAll('.poster-list .poster');
      const analysis = {
        totalPosters: posters.length,
        postersWithRatings: 0,
        sampleElements: []
      };
      
      for (let i = 0; i < Math.min(5, posters.length); i++) {
        const poster = posters[i];
        const img = poster.querySelector('img');
        const title = img ? img.alt : 'No title';
        
        // Look for any elements that might contain ratings
        const allElements = poster.querySelectorAll('*');
        const ratingCandidates = [];
        
        allElements.forEach(el => {
          const text = el.textContent || '';
          const className = el.className || '';
          
          if (text.includes('★') || text.includes('⭐') || text.includes('½') ||
              className.includes('rating') || className.includes('star')) {
            ratingCandidates.push({
              tagName: el.tagName,
              className: className,
              textContent: text.substring(0, 50),
              innerHTML: el.innerHTML.substring(0, 100)
            });
          }
        });
        
        analysis.sampleElements.push({
          index: i,
          title: title,
          outerHTML: poster.outerHTML.substring(0, 800),
          ratingCandidates: ratingCandidates,
          fullText: poster.textContent.substring(0, 200)
        });
        
        if (ratingCandidates.length > 0) {
          analysis.postersWithRatings++;
        }
      }
      
      return analysis;
    });
    
    console.log('🔬 Detailed analysis:');
    console.log('Total posters:', detailedAnalysis.totalPosters);
    console.log('Posters with rating candidates:', detailedAnalysis.postersWithRatings);
    
    detailedAnalysis.sampleElements.forEach((element, i) => {
      console.log(`\n--- Poster ${i}: ${element.title} ---`);
      console.log('Rating candidates:', element.ratingCandidates.length);
      if (element.ratingCandidates.length > 0) {
        element.ratingCandidates.forEach((candidate, j) => {
          console.log(`  Candidate ${j}:`, candidate);
        });
      }
      console.log('Full text:', element.fullText);
      console.log('HTML snippet:', element.outerHTML.substring(0, 300));
    });
    
    // Check the entire page for rating-related content
    const pageAnalysis = await page.evaluate(() => {
      const allText = document.body.textContent;
      const starMatches = allText.match(/[★⭐½]/g);
      const ratingElements = document.querySelectorAll('[class*="rating"], [class*="star"], [data-rating]');
      
      return {
        pageTextLength: allText.length,
        starCharacters: starMatches ? starMatches.length : 0,
        ratingElementsFound: ratingElements.length,
        ratingElementsDetails: Array.from(ratingElements).slice(0, 5).map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent.substring(0, 50)
        }))
      };
    });
    
    console.log('\n🌐 Full page analysis:', pageAnalysis);
    
    // Save the full HTML for inspection
    const fullHTML = await page.content();
    require('fs').writeFileSync('debug-full-page.html', fullHTML);
    console.log('💾 Full HTML saved to: debug-full-page.html');
    
    console.log('\n🎯 Summary:');
    console.log(`- Found ${detailedAnalysis.totalPosters} poster elements`);
    console.log(`- Found ${detailedAnalysis.postersWithRatings} posters with rating candidates`);
    console.log(`- Found ${pageAnalysis.starCharacters} star characters in page`);
    console.log(`- Found ${pageAnalysis.ratingElementsFound} elements with rating-related classes`);
    
    if (detailedAnalysis.postersWithRatings === 0 && pageAnalysis.starCharacters === 0) {
      console.log('\n❌ NO RATINGS FOUND - Possible causes:');
      console.log('1. Ratings require user authentication');
      console.log('2. Ratings are loaded via separate AJAX calls');
      console.log('3. User has no public ratings');
      console.log('4. Page structure has changed');
    } else {
      console.log('\n✅ SOME RATING DATA FOUND - Need to improve extraction logic');
    }
    
    console.log('\n🔧 Files created for debugging:');
    console.log('- debug-step1-initial.png (initial page load)');
    console.log('- debug-step2-after-scroll.png (after scrolling)');
    console.log('- debug-step3-after-hover.png (after hovering)');
    console.log('- debug-full-page.html (complete HTML source)');
    
    console.log('\n⏸️ Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep the browser open for manual inspection
    process.on('SIGINT', async () => {
      console.log('\n👋 Closing browser...');
      if (browser) {
        await browser.close();
      }
      process.exit(0);
    });
    
    // Keep the process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  } finally {
    // Browser will be closed by SIGINT handler
  }
}

// Run with command line argument for username
const username = process.argv[2] || 'btangonan';
console.log(`🎬 Debugging Letterboxd scraping for user: ${username}`);
debugVisual(username);