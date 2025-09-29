	- [x] scraping
	- [x] cleaning
	- [x] scraped output stored and cleaned output stored
	- [] is data storage and database storage a function or is it more detailed. maybe it should be wrapped like that. 
	- [] new git branch
	- [] 
	- [] frontend
	
	
---

Are python wrappers tested in the test environment?

---

Why do I have 2 SqlUrlRepository files? 
Think ultrahard, can we eliminate one of them? I would prefer one file that has all the features: SqlUrlRepository.ts, so if possible and if you agree integrate and delete SqlUrlRepositoryWithTags.ts  
I would think these features should be in one file.
If you agree with the integration use driver tree to identify all connections to the deleted files. Make sure to check all dependencies and correct all links in imports of the other two files.Check also the tests and update the documentation (claude.md, readme.md and components.md) with the changes.

---
Could you please examine and confirm that the fetched and scraped files are stored in the system in a folder, but also provided with a link to the database that can be used to access them and reference them and that each has a unique ID.
Please also confirm that we store the cleaned documents after processing the same way: we are seperating them from the original files, they have a unique id and the location and link is stored in the database.
In case it is not confirmed, then please think ultrahard and come up with a good plan to implement this keeping the solid principles.

---

⚠️ Remaining Tasks for Full Feature Parity

While significant progress was made, some features still need backend support:

[]. Authority Field: Backend needs to add authority field to URL model
[-]. Advanced Scraper Parameters: UI exists but needs backend API for detailed parameter configuration
[]. Cleaner Result Adjustment: ContentViewer shows content but needs API for re-processing with different
settings
[]. Config Templates: Service supports it but needs backend implementation
[-]. Per-URL Config Override: Frontend ready but needs backend persistence

📋 Remaining Issues to Address

Domain Rate Limiting (Not yet implemented):

- Backend has DomainRateLimiter class ready
- No UI to configure domain-specific rate limits
- Need new "Domain Settings" tab in Configuration menu
- API endpoints for domain configuration needed

Configuration Hierarchy Visualization (Not yet implemented):

- No visual indicators showing config source
- Users don't know if settings come from URL, Domain, or Global
- Need badges/icons in URL table to show config level
- Precedence order not clearly communicated
