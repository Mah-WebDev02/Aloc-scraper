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

        // Axios instance for consistent API calls
        this.api = axios.create({
            baseURL: 'https://questions.aloc.com.ng/api/v2',
            headers: {
                'Authorization': `Bearer ${process.env.ALOC_API_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        // MongoDB connection
        this.mongoUri = process.env.MONGODB_CONNECTION_STRING;
    }

    async connectMongoDB() {
        try {
            await mongoose.connect(this.mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('Connected to MongoDB successfully');
        } catch (error) {
            console.error('MongoDB Connection Error:', error);
            process.exit(1);
        }
    }

    async createDynamicModel(year, subject) {
        // Create a dynamic schema for each year and subject
        const questionSchema = new mongoose.Schema({
            question: String,
            options: [String],
            answer: String,
            year: Number,
            subject: String,
            type: String,
            explanation: String
        });

        // Use a dynamic model name
        const modelName = `Question_${year}_${subject}`;
        
        // Check if model already exists to prevent recompiling
        if (mongoose.models[modelName]) {
            return mongoose.models[modelName];
        }

        return mongoose.model(modelName, questionSchema);
    }

    async scrapeQuestions(subject, year, type) {
        try {
            const response = await this.api.get('/m', {
                params: { subject, year, type }
            });

            return response.data;
        } catch (error) {
            console.error(`Error scraping ${subject} ${year} ${type}:`, error.message);
            return [];
        }
    }

    async saveQuestions(questions, year, subject) {
        const QuestionModel = await this.createDynamicModel(year, subject);
        
        const bulkOps = questions.map(q => ({
            updateOne: {
                filter: { 
                    question: q.question, 
                    year, 
                    subject 
                },
                update: q,
                upsert: true
            }
        }));

        try {
            const result = await QuestionModel.bulkWrite(bulkOps);
            console.log(`Saved ${result.upsertedCount} new questions for ${subject} ${year}`);
        } catch (error) {
            console.error(`Error saving questions for ${subject} ${year}:`, error);
        }
    }

    async runFullScrape() {
        await this.connectMongoDB();

        for (const subject of this.subjects) {
            for (const year of this.years) {
                for (const type of this.types) {
                    console.log(`Scraping: ${subject} - ${year} - ${type}`);
                    
                    const questions = await this.scrapeQuestions(subject, year, type);
                    
                    if (questions && questions.length > 0) {
                        await this.saveQuestions(
                            questions.map(q => ({
                                ...q,
                                year,
                                subject,
                                type
                            })), 
                            year, 
                            subject
                        );
                    }

                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        console.log('Full scrape completed');
        mongoose.connection.close();
    }
}

// Run the scraper
const scraper = new ALOCScraper();
scraper.runFullScrape().catch(console.error);
