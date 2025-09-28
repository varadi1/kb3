	- [x] scraping
	- [x] cleaning
	- [] scraped output stored and cleaned output stored
	
	
	- [x] 3 orchestrator
	- [] 2 storage
	
	- [] have one single database
	
	
---

Are python wrappers tested in the test environment?

---

Why do I have 3 KnowledgeBaseOrchestrator files? 
Think ultrahard, I want one file that has all the features: KnowledgeBaseOrchestrator.ts, integrate and delete KnowledgeBaseOrchestratorWithFileTracking.ts and KnowledgeBaseOrchestratorWithTags.ts I want these features at all times and they should be in one file!!! 
Use driver tree to identify all connections to the deleted files. Make sure to check all dependencies and correct all links in imports of the other two files.
Check also the tests and update the documentation (claude.md, readme.md and components.md) with the changes.

---
Could you please examine and confirm that the fetched and scraped files are stored in the system in a folder, but also provided with a link to the database that can be used to access them and reference them and that each has a unique ID.
Please also confirm that we store the cleaned documents after processing the same way: we are seperating them from the original files, they have a unique id and the location and link is stored in the database.
In case it is not confirmed, then please think ultrahard and come up with a good plan to implement this keeping the solid principles.