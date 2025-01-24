# Aloc-scraper
# ALOC Questions Scraper

This is a Node.js-based script that scrapes questions from the ALOC API and stores them in a MongoDB database. It dynamically fetches all subjects and years available in the API and saves the corresponding questions for each category.

## Features
- Dynamically fetches available subjects and years from the ALOC API.
- Scrapes and saves questions, including their metadata, into MongoDB.
- Logs detailed scraping progress and errors to the console.
- Combines all logic in a single JavaScript file for simplicity.

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/aloc-questions-scraper.git
cd aloc-questions-scraper
