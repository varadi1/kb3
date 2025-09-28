import { DeepDoctectionScraper } from './src/scrapers/DeepDoctectionScraper';

async function test() {
  const scraper = new DeepDoctectionScraper();
  const result = await scraper.scrape('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', {
    timeout: 30000
  });

  console.log('Content type:', result.mimeType);
  console.log('Content length:', result.content.length);
  
  // Parse JSON content
  const data = JSON.parse(result.content.toString());
  console.log('\nAnalysis Results:');
  console.log('- Success:', data.success);
  console.log('- Document format:', data.document?.format);
  console.log('- Pages:', data.document?.pages);
  console.log('- Text preview:', data.document?.text?.substring(0, 100));
  console.log('- Libraries used:', data.libraries_used);
  console.log('- Tables found:', data.tables?.length || 0);
}

test().catch(console.error);
