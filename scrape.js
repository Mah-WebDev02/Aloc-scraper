const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');

// Load environment variables
dotenv.config();

// MongoDB connection
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB.');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
}

// Question schema and model
const QuestionSchema = new mongoose.Schema(
    {
        question: String,
        options: [String],
        answer: String,
        year: Number,
        subject: String,
        type: String,
    },
    { timestamps: true }
);
const Question = mongoose.model('Question', QuestionSchema);

// API client
const apiClient = axios.create({
    baseURL: 'https://questions.aloc.com.ng/api/v2',
    headers: {
        Authorization: `Bearer ${process.env.ALOC_API_TOKEN}`,
    },
});

        const subjects = [
            'mathematics', 'english', 'physics', 'chemistry', 
            'biology', 'commerce', 'accounting', 'economics', 
            'government', 'literature', 'geography'
        ],

        years = Array.from({length: 35}, (_, i) => 1990 + i),
        types = ['utme', 'wassce', 'post-utme'];


// Fetch questions for a specific subject and year
async function fetchQuestions(subject, year, type) {
    try {
        const response = await apiClient.get('/m', { params: { subject, year } });
        console.log(`📥 Fetched ${response.data.length} questions for ${subject} (${year}).`);
        return response.data;
    } catch (error) {
        console.error(`❌ Failed to fetch questions for ${subject} (${year}):`, error.message);
        return [];
    }
}

// Save questions to MongoDB
async function saveQuestions(questions) {
    if (questions.length === 0) return;
    try {
        await Question.insertMany(questions, { ordered: false });
        console.log(`💾 Saved ${questions.length} questions to MongoDB.`);
    } catch (error) {
        console.error('❌ Error saving questions:', error.message);
    }
}

// Main function to scrape all questions
async function scrapeAll() {
    console.log('🚀 Starting ALOC Questions Scraper...');

    for (const subject of subjects) {
      for (const type of types) {
        for (const year of years) {
            const questions = await fetchQuestions(subject, year);
            if (questions.length > 0) {
                await saveQuestions(
                    questions.map((q) => ({
                        ...q,
                        subject,
                        year,
                    }))
                );
            }
          }
        }
    }
}

// Main execution
(async function main() {
    await connectToDatabase();

    try {
        await scrapeAll();
        console.log('🏁 Scraping completed successfully.');
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔗 MongoDB connection closed.');
    }
})();
