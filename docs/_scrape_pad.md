# Interaktív demo
npx tsx demo.ts

# Batch feldolgozás
npx tsx demo.ts --batch

# SOLID tesztek futtatása
npm run test:solid

npm run test



Test Commands Available:

Key Commands

# Run main tests (always pass, no skips)
npm test

# Run contract validation
npm run test:contracts

# Run E2E tests (requires Python, optional)
npm run test:e2e

# Run everything including E2E
npm run test:all:python



# Run all tests with coverage
npm run test:all

# Run specific test suites
npm run test:rate-limit
npm run test:error-collector
npm run test:batch
npm run test:solid

# Generate detailed coverage report
npm run test:coverage:detailed

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration


Quick Reference Commands

Here are the most useful commands you can use directly:

# List all URLs (simple)
sqlite3 data/urls.db "SELECT url FROM urls;"

# List with status
sqlite3 data/urls.db "SELECT url, status FROM urls;"

# Show only failed URLs
sqlite3 data/urls.db "SELECT url, error_message FROM urls WHERE status='failed';"

# Count URLs by status
sqlite3 data/urls.db "SELECT status, COUNT(*) as count FROM urls GROUP BY status;"

# Show recent URLs (last 24 hours)
sqlite3 data/urls.db "SELECT url FROM urls WHERE last_checked > strftime('%s', 'now', '-1 day') * 1000;"

# Use the new script
npx tsx list-urls.ts


---

How You Can Direct Me Better

1. Explicit Success Criteria

Instead of "make tests pass", specify:
- "Run npm test and show me it says 'Test Suites: 29 passed, 29 total'"
- "No test suite should fail"
- "Don't claim success until you show this exact output"

2. Verification-First Commands

Structure requests as:
- "First, show me the current test failure count"
- "Fix each failure one by one, showing the test passes after each fix"
- "Finally, run the full suite and prove all tests pass"

3. Lock-In Pattern

Use language like:
- "Keep working on this until ALL tests pass, don't move on to anything else"
- "If tests fail, diagnose why and fix them - repeat until successful"
- "Show me the exact error for each failing test and fix it"


---







Egy tudásbázis alapjait szeretném, hogy elkészítsd nekem. A szoftver alapvető architektúrúrája maximálisan kell, hogy kövesse a SOLID alapelveket, ha a következő minta nem megfelelő, akkor azt javítsd.
Kérlek készítsd el az alábbi minta alapján a tudásbázis alapjait, ami az url-ek típusait skálázhatóan keresi, megállapítja, hogy milyen típusú a fájl. Arra figyelj, hogy néhány url nem adja vissza biztonsággal a kiterjesztését a fájlnak, azt csak megnyitás után láthatod, akkor az ne adjon vissza hibát, hanem intelligensen kezelje.
Készíts kérlek egy claude_sample.md fájlt is, amit a projekthez használandó CLAUDE.md-nek fogunk használni, ha áttekintettem és átnevezem.
Akkor vagy sikeres, ha:
1. minden komponens tekintetében érvényesülnek a SOLID alapelvek, ezt tesztekkel is igazolod.
2. minta url-ek segítségével tesztelhető a rendszer
3. képes vagyok url-t beírni és az feldolgozásra kerül, akár dokumentum, akár html 
4. a kódbázis, amit létrehozol áttekinthető és logikusan szervezett mappákból áll. 
5. elkészül a kódbázis további fejlesztéséhez használható, a megfelelő szabályokat tartalmazó claude_sample.md



import sqlite3
import hashlib
import io
import os
from abc import ABC, abstractmethod
from bs4 import BeautifulSoup
import PyPDF2
import requests
from datetime import datetime

# 1. KnowledgeStore - Tudásbázis metaadatok tárolása
class KnowledgeStore:
	def __init__(self, db='knowledge.db'):
		self.conn = sqlite3.connect(db)
		self.cursor = self.conn.cursor()
		self.cursor.execute('''
			CREATE TABLE IF NOT EXISTS entries (
				url TEXT PRIMARY KEY,
				content_hash TEXT,
				category TEXT,
				authority INTEGER,
				title TEXT,
				last_check DATETIME,
				file_path TEXT
			)
		''')
		self.conn.commit()
		
	def save(self, source, data):  # data = {hash, category, authority, title, file_path}
		now = datetime.now().isoformat()  # Pl. 2025-09-24T14:24:00
		self.cursor.execute('''
			INSERT OR REPLACE INTO entries (url, content_hash, category, authority, title, last_check, file_path)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		''', (source, data['hash'], data['category'], data['authority'], data['title'], now, data['file_path']))
		self.conn.commit()
		
	def get(self, source):
		self.cursor.execute('SELECT content_hash, file_path FROM entries WHERE url = ?', (source,))
		row = self.cursor.fetchone()
		return row[0] if row else (None, None)
	
	def search(self, category=None, min_authority=None):
		sql = 'SELECT url, title, authority FROM entries WHERE 1=1'
		args = []
		if category: sql += ' AND category = ?'; args.append(category)
		if min_authority: sql += ' AND authority >= ?'; args.append(min_authority)
		self.cursor.execute(sql, args)
		return self.cursor.fetchall()
	
# 2. FileStorage - Letöltött tartalom mentése
class FileStorage:
	def __init__(self, base_dir='stored_files'):
		self.base_dir = base_dir
		if not os.path.exists(base_dir):
			os.makedirs(base_dir)
			
	def save(self, source, content):
		filename = hashlib.md5(source.encode()).hexdigest() + os.path.splitext(source)[1][:4]
		file_path = os.path.join(self.base_dir, filename)
		with open(file_path, 'wb') as f:
			f.write(content)
		return file_path
	
# 3. ContentFetcher - Absztrakt bázis és implementációk
class ContentFetcher(ABC):
	@abstractmethod
	def fetch(self, source):
		pass
		
class HttpFetcher(ContentFetcher):
	def fetch(self, url):
		response = requests.get(url)
		response.raise_for_status()
		return response.content
	
class LocalFetcher(ContentFetcher):
	def fetch(self, path):
		with open(path, 'rb') as f:
			return f.read()
		
# 4. ContentProcessor - Feldolgozás metaadatokkal
class ContentProcessor(ABC):
	@abstractmethod
	def process(self, file_path) -> dict:
		pass
		
class HtmlProcessor(ContentProcessor):
	def process(self, file_path):
		with open(file_path, 'rb') as f:
			soup = BeautifulSoup(f.read(), 'html.parser')
			text = soup.get_text()
		hash_value = hashlib.md5(text.encode()).hexdigest()
		title = soup.title.string if soup.title else 'Cím nélkül'
		category = 'jogi' if 'törvény' in text.lower() or 'rendelkezés' in text.lower() else 'általános'
		authority = 9 if 'rendelkezés' in text.lower() else 5
		return {'hash': hash_value, 'category': category, 'authority': authority, 'title': title}
	
class PdfProcessor(ContentProcessor):
	def process(self, file_path):
		with open(file_path, 'rb') as f:
			reader = PyPDF2.PdfReader(io.BytesIO(f.read()))
			text = ''.join(page.extract_text() for page in reader.pages)
		hash_value = hashlib.md5(text.encode()).hexdigest()
		title = 'PDF Dokumentum'
		category = 'jogi' if 'szerződés' in text.lower() else 'dokumentum'
		authority = 8 if 'aláírt' in text.lower() else 5
		return {'hash': hash_value, 'category': category, 'authority': authority, 'title': title}
	
# 5. KnowledgeWatcher - Koordinátor értesítéssel
class KnowledgeWatcher:
	def __init__(self, fetcher_type='http'):
		self.store = KnowledgeStore()
		self.file_store = FileStorage()
		self.fetcher = HttpFetcher() if fetcher_type == 'http' else LocalFetcher()
		self.processors = {
			'html': HtmlProcessor(),
			'pdf': PdfProcessor()
		}
		
	def check(self, source):
		ext = source.split('.')[-1].lower()
		if ext not in self.processors:
			raise ValueError(f"Nincs feldolgozó .{ext} fájlokhoz")
		content = self.fetcher.fetch(source)
		file_path = self.file_store.save(source, content)
		result = self.processors[ext].process(file_path)
		result['file_path'] = file_path
		old_hash, old_path = self.store.get(source)
		if old_hash != result['hash']:
			print(f"Változás! {source} - Kategória: {result['category']}, Hatóság: {result['authority']}")
			self.store.save(source, result)
			self._notify_change(source, result)  # Értesítés
			return True
		print("Nincs változás.")
		return False
	
	def _notify_change(self, source, data):
		print(f"ÉRTESÍTÉS {datetime.now().isoformat()}: {source} frissült, hatóság: {data['authority']}")
		
	def search_knowledge(self, category=None, min_authority=None):
		return self.store.search(category, min_authority)
	
# Használati példa
if __name__ == '__main__':
	# HTTP példa
	watcher = KnowledgeWatcher(fetcher_type='http')
	url = 'https://example.com/jogi.html'  # Cseréld valódi URL-re
	watcher.check(url)
	
	# Helyi fájl példa
	watcher_local = KnowledgeWatcher(fetcher_type='local')
	local_path = 'example.pdf'  # Helyezd el egy PDF-et itt
	watcher_local.check(local_path)
	
	# Keresés példa
	results = watcher.search_knowledge(category='jogi', min_authority=8)
	for url, title, auth in results:
		print(f"URL: {url}, Cím: {title}, Hatóság: {auth}")