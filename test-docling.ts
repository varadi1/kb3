import { DoclingScraper } from './src/scrapers/DoclingScraper';

async function testDocling() {
  console.log('Testing DoclingScraper with a simple HTML page first...\n');
  
  const doclingScraper = new DoclingScraper();
  
  // Test with HTML first (Docling can handle HTML too)
  try {
    const result = await doclingScraper.scrape('https://example.com', { timeout: 10000 });
    console.log('Content preview:');
    console.log(result.content.toString().substring(0, 500));
    console.log('\nMIME type:', result.mimeType);
    console.log('Content length:', result.content.length);
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : error);
  }
}

testDocling().catch(console.error);
