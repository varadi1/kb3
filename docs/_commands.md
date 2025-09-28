
please think ultrahard about this issue: we have many tests failing! Stick to solid principles! 
Run 'npm test' and Examine and analyze the situation, think of the root cause of this, use driver tree method to find it, and then fix it. DO NOT STOP until you can make ALL TESTS PASS!
1. 

Fix EACH failure one by one, showing the related test passes after each fix.
Do not assume a test is passing or a completed fix is good until you verify it with its test that you can see passing!
Before you want to claim success make sure to run the full suite, run npm run test and wait for the results, if ALL! passes this will prove ALL! tests PASS!
Keep working on this until ALL! tests PASS!, DON'T STOP before or don't move on to anything else
If tests fail, diagnose why and fix them - repeat until successful
You cannot claim success if even one test (any one of them) is failing!!!


---
 why do I have 3 KnowledgeBaseFactory files? I want one that has all the features: KnowledgeBaseFactory.ts,
	integrage and delete KnowledgeBaseFactoryWithFileTracking.ts and KnowledgeBaseFactoryWithTags.ts I want these
	features at all times and they should be in one file!!! Make sure to check all dependencies and correct all
	links in imports of the other two files.
	

---

Please think ultrahard about how you need to add a new text cleaning functinality with libraries to the code
while maintaining solid principles. 
1. I want you to add anitize-html, html-cleaner, readability.js, voca, xss, string.js and remark to the system. 
2. I want to be able to set the parameters for cleaners for each url. I want you to support batch changing settings as well. 
3. I want you to investigate each library we are adding to understand what parameters are possible to set and then provide a means to set those and to store the settings in the metadata of the url and also in the database (tool + exact settings). 
4. Please write or extend unit tests and integration tests to include these new features. 
You can only claim success if 
	- ALL tests, every single test is passing and 
	- if the tests are covering at least 90% of the functionality. 
Be great and fantastic!

---



> how can I use the functionality of the system if I dont't want the demo.ts, because it is demo, but for real
production usecase how could I use the features and functions? what are the options?

---

can you confirm that the scrapers that are available to the system are actually working for real? I don't care
if the documentation is saying it does or if the tests are passing, DO they really work?

---
please update the documentation with all recent changes to reflect reality. keep the entries short and concise! (readme.md, claude.md and components.md)

---
--- <THINK>

---
 why do you claim success when still many of the tests fail? why do you skip the work? how could I ask you to
insist on fixing the problem until it is truly fixed? what is the problem and how can we overcome it? I want
you to analyse the situation and answer me to this question. Don't apologise, just answer.
