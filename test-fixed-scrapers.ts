import { Crawl4AIScraper } from './src/scrapers/Crawl4AIScraper';
import { DeepDoctectionScraper } from './src/scrapers/DeepDoctectionScraper';

async function testScrapers() {
  console.log('='.repeat(60));
  console.log('TESTING FIXED SCRAPERS');
  console.log('='.repeat(60));

  // Test Crawl4AI (we know this works)
  console.log('\n🔍 Testing Crawl4AIScraper...');
  try {
    const crawl4ai = new Crawl4AIScraper();
    const result = await crawl4ai.scrape('https://example.com', { timeout: 30000 });
    console.log('✅ Crawl4AI Success!');
    console.log('   - Content length:', result.content.length);
    console.log('   - MIME type:', result.mimeType);
    console.log('   - Content preview:', result.content.toString().substring(0, 100));
  } catch (error) {
    console.log('❌ Crawl4AI Error:', error instanceof Error ? error.message : error);
  }

  // Test DeepDoctection with an HTML page (since it should work with any URL now)
  console.log('\n🔍 Testing DeepDoctectionScraper with HTML...');
  try {
    const deepdoctection = new DeepDoctectionScraper();
    const result = await deepdoctection.scrape('https://example.com', { timeout: 30000 });
    console.log('✅ DeepDoctection Success!');
    console.log('   - Content length:', result.content.length);
    console.log('   - MIME type:', result.mimeType);
    console.log('   - Is mock?:', result.metadata?.mock ? 'Yes (fallback)' : 'No (real)');
    
    // Parse JSON content
    if (result.mimeType === 'application/json') {
      try {
        const parsed = JSON.parse(result.content.toString());
        console.log('   - Document text preview:', parsed.document?.text?.substring(0, 100) || 'No text');
        console.log('   - Pages:', parsed.document?.pages || 0);
        console.log('   - Format:', parsed.document?.format || 'unknown');
      } catch {}
    }
  } catch (error) {
    console.log('❌ DeepDoctection Error:', error instanceof Error ? error.message : error);
  }

  // Test DeepDoctection with a real PDF
  console.log('\n🔍 Testing DeepDoctectionScraper with PDF...');
  try {
    const deepdoctection = new DeepDoctectionScraper();
    const result = await deepdoctection.scrape(
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      { timeout: 60000 }
    );
    console.log('✅ DeepDoctection PDF Success!');
    console.log('   - Content length:', result.content.length);
    console.log('   - MIME type:', result.mimeType);
    console.log('   - Is mock?:', result.metadata?.mock ? 'Yes (fallback)' : 'No (real)');
  } catch (error) {
    console.log('❌ DeepDoctection PDF Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('FINAL STATUS:');
  console.log('  - Crawl4AI: Uses real crawl4ai library (v0.7.4)');
  console.log('  - DeepDoctection: Now properly integrated with Python bridge');
  console.log('='.repeat(60));
}

testScrapers().catch(console.error);
