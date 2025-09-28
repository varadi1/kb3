import { HttpScraper } from './src/scrapers/HttpScraper';
import { PlaywrightScraper } from './src/scrapers/PlaywrightScraper';
import { Crawl4AIScraper } from './src/scrapers/Crawl4AIScraper';

async function testContent() {
  console.log('Testing actual content returned by scrapers...\n');
  
  // Test HttpScraper
  console.log('=== HttpScraper ===');
  const httpScraper = new HttpScraper();
  const httpResult = await httpScraper.scrape('https://example.com');
  console.log('Content preview (first 200 chars):');
  console.log(httpResult.content.toString().substring(0, 200));
  console.log('\nContains "Example Domain"?', httpResult.content.toString().includes('Example Domain'));
  
  // Test PlaywrightScraper
  console.log('\n=== PlaywrightScraper ===');
  const playwrightScraper = new PlaywrightScraper();
  const pwResult = await playwrightScraper.scrape('https://example.com');
  console.log('Content preview (first 200 chars):');
  console.log(pwResult.content.toString().substring(0, 200));
  console.log('\nContains "Example Domain"?', pwResult.content.toString().includes('Example Domain'));
  
  // Test Crawl4AIScraper
  console.log('\n=== Crawl4AIScraper ===');
  const crawl4aiScraper = new Crawl4AIScraper();
  const crawlResult = await crawl4aiScraper.scrape('https://example.com');
  console.log('Content preview (first 200 chars):');
  console.log(crawlResult.content.toString().substring(0, 200));
  console.log('\nFull content:');
  console.log(crawlResult.content.toString());
}

testContent().catch(console.error);
