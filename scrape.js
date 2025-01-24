const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

class ALOCScraper {
    constructor() {
        // Subjects available in the ALOC API
        this.subjects = [
            'mathematics', 'english', 'physics', 'chemistry', 
            'biology', 'commerce', 'accounting', 'economics', 
            'government', 'literature', 'geography', 'christian-religious-studies'
        ];

        // Years to scrape (adjust as needed)
        this.years = Array.from({length: 20}, (_, i) => 2000 + i);

        // Exam types
        this.types = ['utme', 'wassce', 'post-utme'];

        // Tracking variables
        this.totalQuestionsProcessed = 0;
        this.startTime = Date.now();

        // Axios instance for consistent API calls
        this.api = axios.create({
            baseURL: 'https://questions.aloc.com.ng/api/v2',
            headers: {
                'Authorization': `Bearer ${process.env.ALOC_API_TOKEN}`,
                'Accept': 'application/json'
            },
            timeout: 30000 // 30 seconds timeout
        });
    }

    logProgress(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const uptime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
        
        const logLevels = {
            'info': '\x1b[32m[INFO]\x1b[0m',   // Green
            'warn': '\x1b[33m[WARN]\x1b[0m',   // Yellow
            'error': '\x1b[31m[ERROR]\x1b[0m', // Red
            'debug': '\x1b[34m[DEBUG]\x1b[0m' // Blue
        };

        console.log(`${logLevels[level]} ${timestamp} | Uptime: ${uptime} mins | ${message}`);
        
        // Optional: Log to a file for persistent record
        // You could implement file logging here
    }

    async connectMongoDB() {
        try {
            this.logProgress('Attempting to connect to MongoDB...');
            await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            this.logProgress('Connected to MongoDB successfully', 'info');
        } catch (error) {
            this.logProgress(`MongoDB Connection Error: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    async scrapeQuestions(subject, year, type) {
        try {
            this.logProgress(`Fetching questions: Subject=${subject}, Year=${year}, Type=${type}`, 'debug');
            
            const response = await this.api.get('/m', {
                params: { subject, year, type }
            });

            const questionCount = response.data ? response.data.length : 0;
            this.totalQuestionsProcessed += questionCount;

            this.logProgress(`Fetched ${questionCount} questions for ${subject} (${year} ${type})`, 'info');
            return response.data || [];
        } catch (error) {
            this.logProgress(`Error scraping ${subject} ${year} ${type}: ${error.message}`, 'warn');
            return [];
        }
    }

    async runFullScrape() {
        this.logProgress('Starting FULL ALOC Questions Database Scrape', 'info');
        
        await this.connectMongoDB();

        const totalSubjects = this.subjects.length;
        const totalYears = this.years.length;
        const totalTypes = this.types.length;

        let processedCount = 0;
        const totalCombinations = totalSubjects * totalYears * totalTypes;

        this.logProgress(`Total scrape combinations: ${totalCombinations}`, 'info');

        for (const subject of this.subjects) {
            for (const year of this.years) {
                for (const type of this.types) {
                    processedCount++;
                    const percentComplete = ((processedCount / totalCombinations) * 100).toFixed(2);

                    this.logProgress(`Progress: ${percentComplete}% (${processedCount}/${totalCombinations}) | Current: ${subject} - ${year} - ${type}`, 'info');

                    const questions = await this.scrapeQuestions(subject, year, type);
                    
                    // Optional: Add more detailed processing logic here
                    
                    // Small delay to prevent overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        this.logProgress(`Scrape Complete. Total Questions Processed: ${this.totalQuestionsProcessed}`, 'info');
        
        const totalRuntime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
        this.logProgress(`Total Runtime: ${totalRuntime} minutes`, 'info');

        mongoose.connection.close();
    }
}

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down from SIGINT (Ctrl+C)');
    process.exit();
});

// Run the scraper
const scraper = new ALOCScraper();
scraper.runFullScrape().catch(error => {
    console.error('Unhandled error in scraper:', error);
    process.exit(1);
});
