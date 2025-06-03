import { createMocks } from 'node-mocks-http';

// Mock mongoose and models to avoid database connection issues
jest.mock('mongoose', () => ({
  Schema: class Schema {
    constructor() {}
  },
  model: jest.fn(),
  connect: jest.fn(),
  connection: {
    readyState: 1
  }
}));

jest.mock('../models/QuestionPractice', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../models/Question', () => ({
  find: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../lib/dbConnect', () => jest.fn());

describe('Practice Tracking - API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rating Extraction Logic', () => {
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

  describe('Practice API - Input Validation', () => {
    it('should validate required fields for practice session', async () => {
      const practiceHandler = require('../pages/api/questions/practice').default;
      
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          questionText: 'Test question',
          // missing other required fields
        },
      });

      await practiceHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('Missing required fields');
    });

    it('should only allow POST method', async () => {
      const practiceHandler = require('../pages/api/questions/practice').default;
      
      const { req, res } = createMocks({
        method: 'GET',
      });

      await practiceHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Method not allowed');
    });
  });

  describe('Analytics Data Processing Logic', () => {
    it('should calculate category trends correctly', () => {
      const ratings = [5, 6, 8, 7, 9];
      const midpoint = Math.floor(ratings.length / 2);
      const recent = ratings.slice(-Math.min(3, midpoint || 1));
      const previous = ratings.slice(0, Math.min(3, midpoint || 1));
      
      const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
      const previousAvg = previous.reduce((sum, r) => sum + r, 0) / previous.length;
      const trend = recentAvg - previousAvg;
      
      expect(recent).toEqual([7, 9]); // Last 2 since midpoint is 2
      expect(previous).toEqual([5, 6]); // First 2
      expect(recentAvg).toBe(8); // (7+9)/2 = 8
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

    it('should calculate summary statistics correctly', () => {
      const sessions = [
        { rating: 6, datePracticed: new Date('2024-01-01') },
        { rating: 8, datePracticed: new Date('2024-01-02') },
        { rating: 5, datePracticed: new Date('2024-01-03') },
        { rating: 9, datePracticed: new Date('2024-01-04') },
        { rating: 7, datePracticed: new Date('2024-01-05') }
      ];

      const totalSessions = sessions.length;
      const overallAverageRating = sessions.reduce((sum, s) => sum + s.rating, 0) / totalSessions;
      const recentRating = sessions[sessions.length - 1].rating;
      const firstRating = sessions[0].rating;
      const overallTrend = recentRating - firstRating;

      expect(totalSessions).toBe(5);
      expect(overallAverageRating).toBe(7); // (6+8+5+9+7)/5 = 7
      expect(overallTrend).toBe(1); // 7 - 6 = 1
    });
  });

  describe('QuestionPractice Model Validation Logic', () => {
    it('should validate rating range', () => {
      const isValidRating = (rating) => {
        return typeof rating === 'number' && rating >= 1 && rating <= 10;
      };

      expect(isValidRating(5)).toBe(true);
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(10)).toBe(true);
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(11)).toBe(false);
      expect(isValidRating('5')).toBe(false);
      expect(isValidRating(null)).toBe(false);
    });

    it('should validate practice type enum', () => {
      const validPracticeTypes = ['written', 'spoken'];
      const isValidPracticeType = (type) => {
        return validPracticeTypes.includes(type);
      };

      expect(isValidPracticeType('written')).toBe(true);
      expect(isValidPracticeType('spoken')).toBe(true);
      expect(isValidPracticeType('invalid')).toBe(false);
      expect(isValidPracticeType('')).toBe(false);
      expect(isValidPracticeType(null)).toBe(false);
    });
  });

  describe('UI State Management Logic', () => {
    it('should determine practice type correctly', () => {
      const determinePracticeType = (transcript, writeInAnswer) => {
        return transcript ? 'spoken' : 'written';
      };

      expect(determinePracticeType('transcribed text', '')).toBe('spoken');
      expect(determinePracticeType('', 'written answer')).toBe('written');
      expect(determinePracticeType(null, 'written answer')).toBe('written');
      expect(determinePracticeType('transcribed text', 'written answer')).toBe('spoken');
    });

    it('should calculate time spent correctly', () => {
      const calculateTimeSpent = (startTime) => {
        if (!startTime) return 0;
        return Math.round((Date.now() - startTime) / 1000);
      };

      const now = Date.now();
      const fiveSecondsAgo = now - 5000;
      
      expect(calculateTimeSpent(null)).toBe(0);
      expect(calculateTimeSpent(now)).toBe(0);
      
      // Mock Date.now for consistent testing
      const mockNow = now + 5000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      expect(calculateTimeSpent(fiveSecondsAgo)).toBe(10);
      
      Date.now.mockRestore();
    });
  });
});

describe('Progress Tracking - Helper Functions', () => {
  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const formatDate = (dateString) => {
        // Use UTC to avoid timezone issues in tests
        const date = new Date(dateString + 'T12:00:00.000Z');
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        });
      };

      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
      expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
    });
  });

  describe('Trend Icons', () => {
    it('should return correct trend icons', () => {
      const getTrendIcon = (trend) => {
        if (trend > 0.5) return '📈';
        if (trend < -0.5) return '📉';
        return '➡️';
      };

      expect(getTrendIcon(1.0)).toBe('📈');
      expect(getTrendIcon(0.6)).toBe('📈');
      expect(getTrendIcon(0.5)).toBe('➡️');
      expect(getTrendIcon(0.0)).toBe('➡️');
      expect(getTrendIcon(-0.5)).toBe('➡️');
      expect(getTrendIcon(-0.6)).toBe('📉');
      expect(getTrendIcon(-1.0)).toBe('📉');
    });
  });

  describe('Rating Colors', () => {
    it('should return correct rating colors', () => {
      const getRatingColor = (rating) => {
        if (rating >= 8) return '#4caf50'; // Green
        if (rating >= 6) return '#ff9800'; // Orange
        return '#f44336'; // Red
      };

      expect(getRatingColor(10)).toBe('#4caf50');
      expect(getRatingColor(8)).toBe('#4caf50');
      expect(getRatingColor(7)).toBe('#ff9800');
      expect(getRatingColor(6)).toBe('#ff9800');
      expect(getRatingColor(5)).toBe('#f44336');
      expect(getRatingColor(1)).toBe('#f44336');
    });
  });
}); 