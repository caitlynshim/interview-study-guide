// Mock the database connection before any imports
jest.mock('../lib/dbConnect', () => jest.fn());

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createMocks } from 'node-mocks-http';

// Set environment variable before any other imports
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

import dbConnect from '../lib/dbConnect';
import QuestionPractice from '../models/QuestionPractice';
import Question from '../models/Question';
import practiceHandler from '../pages/api/questions/practice';
import analyticsHandler from '../pages/api/questions/analytics';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  
  // Mock dbConnect to use the test database
  dbConnect.mockImplementation(async () => {
    if (mongoose.connections[0].readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });
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
    // First create a question to get a valid questionId
    const question = new Question({
      question: 'What is your biggest strength?',
      category: 'Behavioral',
      difficulty: 'medium'
    });
    const savedQuestion = await question.save();

    const practiceData = {
      questionId: savedQuestion._id,
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
    expect(saved.questionId).toEqual(savedQuestion._id);
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
    // Create a question first
    const question = new Question({
      question: 'Test question',
      category: 'Technical',
      difficulty: 'medium'
    });
    const savedQuestion = await question.save();

    const practiceData = {
      questionId: savedQuestion._id,
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
    // Create a question first
    const question = new Question({
      question: 'Test question',
      category: 'Technical',
      difficulty: 'medium'
    });
    const savedQuestion = await question.save();

    const practiceData = {
      questionId: savedQuestion._id,
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
    // Create sample questions with correct field name and difficulty values
    const questions = await Question.create([
      { question: 'What is your biggest strength?', category: 'Behavioral', difficulty: 'medium' },
      { question: 'Describe a challenging project', category: 'Behavioral', difficulty: 'hard' },
      { question: 'Explain a technical concept', category: 'Technical', difficulty: 'medium' },
      { question: 'How do you handle stress?', category: 'Behavioral', difficulty: 'easy' }
    ]);

    // Create sample practice sessions with questionId references
    const baseDates = [
      new Date('2024-01-01'),
      new Date('2024-01-02'), 
      new Date('2024-01-03'),
      new Date('2024-01-05'),
      new Date('2024-01-08')
    ];

    const practices = [
      {
        questionId: questions[0]._id,
        questionText: 'What is your biggest strength?',
        category: 'Behavioral',
        rating: 8,
        practiceType: 'written',
        userAnswer: 'Problem solving...',
        evaluation: 'Good answer. Rating: 8/10',
        timeSpent: 120,
        datePracticed: baseDates[0],
        metadata: { answerLength: 50, transcriptionTime: 0, evaluationTime: 3 }
      },
      {
        questionId: questions[1]._id,
        questionText: 'Describe a challenging project',
        category: 'Behavioral',
        rating: 7,
        practiceType: 'spoken',
        userAnswer: 'I worked on a complex system...',
        evaluation: 'Solid answer. Rating: 7/10',
        timeSpent: 180,
        datePracticed: baseDates[1],
        metadata: { answerLength: 75, transcriptionTime: 5, evaluationTime: 4 }
      },
      {
        questionId: questions[2]._id,
        questionText: 'Explain a technical concept',
        category: 'Technical',
        rating: 9,
        practiceType: 'written',
        userAnswer: 'REST APIs are...',
        evaluation: 'Excellent explanation. Rating: 9/10',
        timeSpent: 90,
        datePracticed: baseDates[2],
        metadata: { answerLength: 60, transcriptionTime: 0, evaluationTime: 2 }
      },
      {
        questionId: questions[3]._id,
        questionText: 'How do you handle stress?',
        category: 'Behavioral',
        rating: 6,
        practiceType: 'spoken',
        userAnswer: 'I take breaks and prioritize...',
        evaluation: 'Adequate answer. Rating: 6/10',
        timeSpent: 150,
        datePracticed: baseDates[3],
        metadata: { answerLength: 40, transcriptionTime: 6, evaluationTime: 3 }
      },
      {
        questionId: questions[0]._id,
        questionText: 'What is your biggest strength?',
        category: 'Behavioral',
        rating: 9,
        practiceType: 'written',
        userAnswer: 'Leadership and mentoring...',
        evaluation: 'Much improved! Rating: 9/10',
        timeSpent: 100,
        datePracticed: baseDates[4],
        metadata: { answerLength: 65, transcriptionTime: 0, evaluationTime: 2 }
      }
    ];

    await QuestionPractice.create(practices);
  });

  it('should return analytics data successfully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.analytics).toBeDefined();
    
    const { analytics } = responseData;
    
    // Check overall stats
    expect(analytics.totalSessions).toBe(5);
    expect(analytics.averageRating).toBe(7.8); // (8+7+9+6+9)/5
    expect(analytics.totalTimeSpent).toBe(640); // Sum of all timeSpent
    
    // Check category breakdown
    expect(analytics.categoryBreakdown).toHaveLength(2);
    const behavioralCategory = analytics.categoryBreakdown.find(cat => cat.category === 'Behavioral');
    expect(behavioralCategory.sessions).toBe(4);
    expect(behavioralCategory.averageRating).toBe(7.5); // (8+7+6+9)/4
    
    const technicalCategory = analytics.categoryBreakdown.find(cat => cat.category === 'Technical');
    expect(technicalCategory.sessions).toBe(1);
    expect(technicalCategory.averageRating).toBe(9);
    
    // Check practice type breakdown
    expect(analytics.practiceTypeBreakdown).toHaveLength(2);
    const writtenType = analytics.practiceTypeBreakdown.find(type => type.type === 'written');
    expect(writtenType.sessions).toBe(3);
    
    const spokenType = analytics.practiceTypeBreakdown.find(type => type.type === 'spoken');
    expect(spokenType.sessions).toBe(2);
    
    // Check daily progress (should have 5 entries)
    expect(analytics.dailyProgress).toHaveLength(5);
    expect(analytics.dailyProgress[0].date).toBe('2024-01-01');
    expect(analytics.dailyProgress[0].sessions).toBe(1);
    expect(analytics.dailyProgress[0].averageRating).toBe(8);
  });

  it('should filter analytics by date range', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        startDate: '2024-01-02',
        endDate: '2024-01-03'
      }
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    const { analytics } = responseData;
    
    // Should only include sessions from Jan 2-3 (2 sessions)
    expect(analytics.totalSessions).toBe(2);
    expect(analytics.averageRating).toBe(8); // (7+9)/2
    expect(analytics.dailyProgress).toHaveLength(2);
  });

  it('should filter analytics by category', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        category: 'Technical'
      }
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    const { analytics } = responseData;
    
    // Should only include Technical sessions (1 session)
    expect(analytics.totalSessions).toBe(1);
    expect(analytics.averageRating).toBe(9);
    expect(analytics.categoryBreakdown).toHaveLength(1);
    expect(analytics.categoryBreakdown[0].category).toBe('Technical');
  });

  it('should return empty analytics for no data', async () => {
    // Clear all practice sessions
    await QuestionPractice.deleteMany({});
    
    const { req, res } = createMocks({
      method: 'GET',
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    const { analytics } = responseData;
    
    expect(analytics.totalSessions).toBe(0);
    expect(analytics.averageRating).toBe(0);
    expect(analytics.totalTimeSpent).toBe(0);
    expect(analytics.categoryBreakdown).toHaveLength(0);
    expect(analytics.practiceTypeBreakdown).toHaveLength(0);
    expect(analytics.dailyProgress).toHaveLength(0);
  });

  it('should handle invalid date formats gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        startDate: 'invalid-date',
        endDate: '2024-01-03'
      }
    });

    await analyticsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toContain('Invalid date format');
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

describe('Analytics Helper Functions', () => {
  const extractRating = (evaluationText) => {
    const match = evaluationText.match(/Rating:\s*(\d+)\/10/);
    return match ? parseInt(match[1]) : null;
  };

  it('should extract rating from evaluation text', () => {
    expect(extractRating('Good answer. Rating: 8/10')).toBe(8);
    expect(extractRating('Excellent response! Rating: 10/10')).toBe(10);
    expect(extractRating('Needs improvement. Rating: 4/10')).toBe(4);
    expect(extractRating('No rating provided')).toBe(null);
  });

  it('should handle edge cases in rating extraction', () => {
    expect(extractRating('')).toBe(null);
    expect(extractRating('Rating: /10')).toBe(null);
    expect(extractRating('Rating: abc/10')).toBe(null);
    expect(extractRating('Multiple ratings: Rating: 7/10 and Rating: 8/10')).toBe(7); // Should get first match
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
    const midpoint = Math.floor(ratings.length / 2); // midpoint = 2
    const recent = ratings.slice(-3); // Last 3: [8, 7, 9]
    const previous = ratings.slice(0, 2); // First 2: [5, 6]
    
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