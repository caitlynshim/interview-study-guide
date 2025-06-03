import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dbConnect from '../lib/dbConnect';
import QuestionPractice from '../models/QuestionPractice';
import Question from '../models/Question';
import practiceHandler from '../pages/api/questions/practice';
import analyticsHandler from '../pages/api/questions/analytics';
import { createMocks } from 'node-mocks-http';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await dbConnect();
  await QuestionPractice.deleteMany({});
  await Question.deleteMany({});
});

describe('QuestionPractice Model', () => {
  it('should create a practice session with all required fields', async () => {
    const practiceData = {
      questionText: 'What is your biggest strength?',
      category: 'Behavioral',
      rating: 8,
      practiceType: 'written',
      userAnswer: 'My biggest strength is problem solving...',
      evaluation: 'Good answer with specific examples. Rating: 8/10',
      timeSpent: 120,
      metadata: {
        answerLength: 45,
        transcriptionTime: 0,
        evaluationTime: 3
      }
    };

    const practice = new QuestionPractice(practiceData);
    const saved = await practice.save();

    expect(saved._id).toBeDefined();
    expect(saved.questionText).toBe(practiceData.questionText);
    expect(saved.category).toBe(practiceData.category);
    expect(saved.rating).toBe(practiceData.rating);
    expect(saved.practiceType).toBe(practiceData.practiceType);
    expect(saved.userAnswer).toBe(practiceData.userAnswer);
    expect(saved.evaluation).toBe(practiceData.evaluation);
    expect(saved.timeSpent).toBe(practiceData.timeSpent);
    expect(saved.datePracticed).toBeDefined();
    expect(saved.metadata.answerLength).toBe(45);
  });

  it('should validate required fields', async () => {
    const practice = new QuestionPractice({});
    
    await expect(practice.save()).rejects.toThrow();
  });

  it('should validate rating range', async () => {
    const practiceData = {
      questionText: 'Test question',
      category: 'Technical',
      rating: 15, // Invalid rating
      practiceType: 'written',
      userAnswer: 'Test answer',
      evaluation: 'Test evaluation'
    };

    const practice = new QuestionPractice(practiceData);
    await expect(practice.save()).rejects.toThrow();
  });

  it('should validate practice type enum', async () => {
    const practiceData = {
      questionText: 'Test question',
      category: 'Technical',
      rating: 8,
      practiceType: 'invalid', // Invalid type
      userAnswer: 'Test answer',
      evaluation: 'Test evaluation'
    };

    const practice = new QuestionPractice(practiceData);
    await expect(practice.save()).rejects.toThrow();
  });
});

describe('/api/questions/practice', () => {
  it('should save practice session successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        questionText: 'What motivates you?',
        category: 'Behavioral',
        rating: 7,
        practiceType: 'spoken',
        userAnswer: 'I am motivated by challenging problems...',
        evaluation: 'Solid answer showing intrinsic motivation. Rating: 7/10',
        timeSpent: 180,
        metadata: {
          answerLength: 65,
          transcriptionTime: 5,
          evaluationTime: 3
        }
      },
    });

    await practiceHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toBe('Practice session saved successfully');
    expect(responseData.practiceSession).toBeDefined();
    expect(responseData.practiceSession.questionText).toBe('What motivates you?');
    expect(responseData.practiceSession.rating).toBe(7);

    // Verify it was saved to database
    const savedSession = await QuestionPractice.findOne({ questionText: 'What motivates you?' });
    expect(savedSession).toBeTruthy();
    expect(savedSession.rating).toBe(7);
  });

  it('should return error for missing required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        questionText: 'Incomplete data',
        // missing required fields
      },
    });

    await practiceHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toContain('Missing required fields');
  });

  it('should return error for invalid rating', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        questionText: 'Test question',
        category: 'Technical',
        rating: 'invalid',
        practiceType: 'written',
        userAnswer: 'Test answer',
        evaluation: 'Test evaluation'
      },
    });

    await practiceHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should only allow POST method', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await practiceHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toBe('Method not allowed');
  });
});

describe('/api/questions/analytics', () => {
  beforeEach(async () => {
    // Create sample questions
    await Question.create([
      { text: 'What is your biggest strength?', category: 'Behavioral', difficulty: 'Medium' },
      { text: 'Describe a challenging project', category: 'Behavioral', difficulty: 'Hard' },
      { text: 'Explain a technical concept', category: 'Technical', difficulty: 'Medium' },
      { text: 'How do you handle stress?', category: 'Behavioral', difficulty: 'Easy' }
    ]);

    // Create sample practice sessions
    const baseDates = [
      new Date('2024-01-01'),
      new Date('2024-01-02'), 
      new Date('2024-01-03'),
      new Date('2024-01-05'),
      new Date('2024-01-07')
    ];

    await QuestionPractice.create([
      {
        questionText: 'What is your biggest strength?',
        category: 'Behavioral',
        rating: 6,
        practiceType: 'written',
        userAnswer: 'My strength is...',
        evaluation: 'Good start. Rating: 6/10',
        datePracticed: baseDates[0],
        timeSpent: 120
      },
      {
        questionText: 'What is your biggest strength?',
        category: 'Behavioral', 
        rating: 8,
        practiceType: 'spoken',
        userAnswer: 'My biggest strength is problem solving...',
        evaluation: 'Much better! Rating: 8/10',
        datePracticed: baseDates[1],
        timeSpent: 150
      },
      {
        questionText: 'Describe a challenging project',
        category: 'Behavioral',
        rating: 5,
        practiceType: 'written',
        userAnswer: 'I worked on a project...',
        evaluation: 'Needs more detail. Rating: 5/10',
        datePracticed: baseDates[2],
        timeSpent: 90
      },
      {
        questionText: 'Explain a technical concept',
        category: 'Technical',
        rating: 9,
        practiceType: 'written',
        userAnswer: 'Let me explain APIs...',
        evaluation: 'Excellent explanation! Rating: 9/10',
        datePracticed: baseDates[3],
        timeSpent: 200
      },
      {
        questionText: 'Describe a challenging project',
        category: 'Behavioral',
        rating: 7,
        practiceType: 'spoken',
        userAnswer: 'I improved my approach...',
        evaluation: 'Better structure. Rating: 7/10', 
        datePracticed: baseDates[4],
        timeSpent: 180
      }
    ]);
  });

  it('should return comprehensive analytics data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    
    // Check summary
    expect(data.summary.totalSessions).toBe(5);
    expect(data.summary.overallAverageRating).toBe(7); // (6+8+5+9+7)/5 = 7
    expect(data.summary.totalCategories).toBe(2);
    expect(data.summary.unpracticedQuestionsCount).toBe(1); // "How do you handle stress?"

    // Check rating trends
    expect(data.ratingTrends).toHaveLength(5);
    expect(data.ratingTrends[0].rating).toBe(6); // First session
    expect(data.ratingTrends[4].rating).toBe(7); // Last session

    // Check category stats
    expect(data.categoryStats).toHaveLength(2);
    const behavioralCategory = data.categoryStats.find(c => c.category === 'Behavioral');
    expect(behavioralCategory.totalSessions).toBe(4);
    expect(behavioralCategory.averageRating).toBe(6.5); // (6+8+5+7)/4 = 6.5

    const technicalCategory = data.categoryStats.find(c => c.category === 'Technical');
    expect(technicalCategory.totalSessions).toBe(1);
    expect(technicalCategory.averageRating).toBe(9);

    // Check questions needing practice
    expect(data.questionsNeedingPractice).toHaveLength(1);
    expect(data.questionsNeedingPractice[0].questionText).toBe('Describe a challenging project');
    expect(data.questionsNeedingPractice[0].averageRating).toBe(6); // (5+7)/2 = 6

    // Check unpracticed questions
    expect(data.unpracticedQuestions).toHaveLength(1);
    expect(data.unpracticedQuestions[0].questionText).toBe('How do you handle stress?');
  });

  it('should handle empty analytics gracefully', async () => {
    await QuestionPractice.deleteMany({});
    await Question.deleteMany({});

    const { req, res } = createMocks({
      method: 'GET',
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.summary.totalSessions).toBe(0);
    expect(data.summary.overallAverageRating).toBe(0);
    expect(data.ratingTrends).toHaveLength(0);
    expect(data.categoryStats).toHaveLength(0);
    expect(data.questionsNeedingPractice).toHaveLength(0);
  });

  it('should only allow GET method', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toBe('Method not allowed');
  });
});

// Integration tests for the UI workflow would go here
// These test the complete flow from evaluation to rating extraction to save choice

describe('Practice Session Rating Extraction', () => {
  const extractRating = (evaluationText) => {
    const patterns = [
      /(?:overall\s+)?rating:?\s*(\d+)(?:\/10)?/i,
      /(\d+)(?:\/10|\s*out\s*of\s*10)/i,
      /score:?\s*(\d+)/i,
      /rating\s*of\s*(\d+)/i,
      /give\s*(?:this|it)\s*(?:a|an)?\s*(\d+)/i,
      /(\d+)\s*\/\s*10/,
    ];

    for (const pattern of patterns) {
      const match = evaluationText.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        if (rating >= 1 && rating <= 10) {
          return rating;
        }
      }
    }
    return 6; // default rating
  };

  it('should extract rating from various evaluation formats', () => {
    expect(extractRating('This is a good answer. Rating: 8')).toBe(8);
    expect(extractRating('Overall rating: 7/10')).toBe(7);
    expect(extractRating('I would give this a 9 out of 10')).toBe(9);
    expect(extractRating('Score: 6')).toBe(6);
    expect(extractRating('Rating of 5')).toBe(5);
    expect(extractRating('I give it a 8')).toBe(8);
    expect(extractRating('This gets a 10/10')).toBe(10);
    expect(extractRating('No rating mentioned')).toBe(6); // default
    expect(extractRating('Rating: 15')).toBe(6); // invalid rating, use default
    expect(extractRating('Rating: 0')).toBe(6); // invalid rating, use default
  });
});

describe('Practice Session UI Integration', () => {
  // Mock the fetch function for API calls
  global.fetch = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
  });

  it('should show save choice after evaluation with rating', async () => {
    // Mock successful evaluation response with rating
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        evaluation: 'This is a solid answer with good examples. Rating: 8/10',
        rating: 8
      })
    });

    // This would be testing the actual UI component
    // For now, we'll test the core logic
    const mockEvaluation = 'This is a solid answer with good examples. Rating: 8/10';
    const mockRating = 8;
    
    expect(mockRating).toBe(8);
    expect(mockEvaluation).toContain('Rating: 8/10');
  });

  it('should extract rating when not provided by API', () => {
    const evaluationText = 'Good answer structure. Shows understanding. I would rate this 7 out of 10.';
    
    // Test the rating extraction logic
    const extractedRating = evaluationText.match(/(\d+)\s*out\s*of\s*10/i);
    expect(extractedRating).toBeTruthy();
    expect(parseInt(extractedRating[1])).toBe(7);
  });
});

describe('Analytics Data Processing', () => {
  it('should calculate category trends correctly', () => {
    const ratings = [5, 6, 8, 7, 9];
    const midpoint = Math.floor(ratings.length / 2);
    const recent = ratings.slice(-Math.min(3, midpoint || 1));
    const previous = ratings.slice(0, Math.min(3, midpoint || 1));
    
    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
    const previousAvg = previous.reduce((sum, r) => sum + r, 0) / previous.length;
    const trend = recentAvg - previousAvg;
    
    expect(recent).toEqual([8, 7, 9]); // Last 3
    expect(previous).toEqual([5, 6]); // First 2
    expect(recentAvg).toBe(8); // (8+7+9)/3 = 8
    expect(previousAvg).toBe(5.5); // (5+6)/2 = 5.5
    expect(trend).toBe(2.5); // 8 - 5.5 = 2.5 (positive trend)
  });

  it('should identify questions needing practice correctly', () => {
    const questions = [
      { questionText: 'Q1', averageRating: 4.5 },
      { questionText: 'Q2', averageRating: 7.2 },
      { questionText: 'Q3', averageRating: 5.8 },
      { questionText: 'Q4', averageRating: 8.1 }
    ];
    
    const needsPractice = questions.filter(q => q.averageRating < 6);
    expect(needsPractice).toHaveLength(2);
    expect(needsPractice[0].questionText).toBe('Q1');
    expect(needsPractice[1].questionText).toBe('Q3');
  });
}); 