// Mock the dependencies before any imports
jest.mock('../lib/dbConnect', () => jest.fn());
jest.mock('../models/Experience', () => ({
  find: jest.fn(),
}));
jest.mock('../lib/openai', () => ({
  generateCategory: jest.fn(),
}));

// Mock console to capture output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Phase 8: Category Migration Script', () => {
  let mockDbConnect;
  let mockExperience;
  let generateCategory;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset modules
    jest.resetModules();
    
    // Get fresh mocks
    mockDbConnect = require('../lib/dbConnect');
    mockExperience = require('../models/Experience');
    generateCategory = require('../lib/openai').generateCategory;
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit to prevent test termination
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exit called with code ${code}`);
    });
    
    // Setup default mocks
    mockDbConnect.mockResolvedValue();
    mockExperience.find.mockResolvedValue([]);
    generateCategory.mockResolvedValue('Default Category');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  // Test function that replicates the migration script logic
  async function runMigrationLogic(writeMode = false) {
    const DRY_RUN = !writeMode;
    
    await mockDbConnect();
    const exps = await mockExperience.find({});
    let updated = 0;
    
    for (const exp of exps) {
      const oldCat = exp.metadata?.category || '';
      if (oldCat && oldCat !== 'Uncategorized') {
        console.log(`[SKIP] ${exp.title} already has category: ${oldCat}`);
        continue;
      }
      const newCat = await generateCategory({ title: exp.title, content: exp.content });
      console.log(`[UPDATE] ${exp.title}: '${oldCat}' -> '${newCat}'`);
      if (!DRY_RUN) {
        exp.metadata = { ...exp.metadata, category: newCat };
        await exp.save();
        updated++;
      }
    }
    console.log(`Done. ${updated} experiences updated.`);
    return updated;
  }

  describe('Dry Run Mode (Default behavior)', () => {
    test('should show proposed updates without actually updating documents', async () => {
      // Mock experiences with mixed categories
      const mockExperiences = [
        {
          _id: 'exp1',
          title: 'Leading a Team Through Crisis',
          content: 'During a production outage...',
          metadata: { category: 'Uncategorized' },
          save: jest.fn()
        },
        {
          _id: 'exp2', 
          title: 'Improving System Performance',
          content: 'I identified bottlenecks...',
          metadata: { category: 'Technical Leadership' },
          save: jest.fn()
        },
        {
          _id: 'exp3',
          title: 'Building Team Culture',
          content: 'I focused on creating psychological safety...',
          metadata: {},
          save: jest.fn()
        }
      ];
      
      mockExperience.find.mockResolvedValue(mockExperiences);
      generateCategory.mockResolvedValue('Leadership & People Management');

      // Run migration in dry-run mode
      const updated = await runMigrationLogic(false);

      // Verify database operations
      expect(mockDbConnect).toHaveBeenCalledTimes(1);
      expect(mockExperience.find).toHaveBeenCalledWith({});

      // Check console output
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      
      // Should show SKIP for already categorized experience
      expect(logCalls.some(log => 
        log.includes('[SKIP] Improving System Performance already has category: Technical Leadership')
      )).toBe(true);
      
      // Should show UPDATE for uncategorized experiences
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Leading a Team Through Crisis')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Building Team Culture')
      )).toBe(true);
      
      // Should not actually save any documents in dry run
      mockExperiences.forEach(exp => {
        expect(exp.save).not.toHaveBeenCalled();
      });
      
      // Should show 0 updated in dry run
      expect(updated).toBe(0);
      expect(logCalls.some(log => 
        log.includes('Done. 0 experiences updated.')
      )).toBe(true);
    });

    test('should handle experiences with no metadata gracefully', async () => {
      const mockExperiences = [
        {
          _id: 'exp1',
          title: 'Experience without metadata',
          content: 'Some content...',
          // No metadata property at all
          save: jest.fn()
        }
      ];
      
      mockExperience.find.mockResolvedValue(mockExperiences);
      generateCategory.mockResolvedValue('Technical Trade-offs & Architecture');

      await runMigrationLogic(false);

      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Experience without metadata')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes("'' -> 'Technical Trade-offs & Architecture'")
      )).toBe(true);
    });

    test('should handle empty database gracefully', async () => {
      mockExperience.find.mockResolvedValue([]);

      const updated = await runMigrationLogic(false);

      expect(updated).toBe(0);
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('Done. 0 experiences updated.')
      )).toBe(true);
    });
  });

  describe('Write Mode (--write flag)', () => {
    test('should actually update documents when write mode is enabled', async () => {
      const mockExperiences = [
        {
          _id: 'exp1',
          title: 'Building Scalable Systems',
          content: 'I designed a microservices architecture...',
          metadata: { category: 'Uncategorized' },
          save: jest.fn().mockResolvedValue()
        },
        {
          _id: 'exp2',
          title: 'Managing Technical Debt',
          content: 'I prioritized refactoring efforts...',
          metadata: {},
          save: jest.fn().mockResolvedValue()
        }
      ];
      
      mockExperience.find.mockResolvedValue(mockExperiences);
      generateCategory
        .mockResolvedValueOnce('Technical Trade-offs & Architecture')
        .mockResolvedValueOnce('Technical Trade-offs & Architecture');

      const updated = await runMigrationLogic(true);

      // Should update both experiences
      expect(mockExperiences[0].save).toHaveBeenCalledTimes(1);
      expect(mockExperiences[1].save).toHaveBeenCalledTimes(1);
      
      // Should update metadata with new category
      expect(mockExperiences[0].metadata.category).toBe('Technical Trade-offs & Architecture');
      expect(mockExperiences[1].metadata.category).toBe('Technical Trade-offs & Architecture');

      expect(updated).toBe(2);

      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      
      // Should show actual updates
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Building Scalable Systems')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Managing Technical Debt')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes('Done. 2 experiences updated.')
      )).toBe(true);
    });

    test('should preserve existing metadata when updating category', async () => {
      const mockExperienceDoc = {
        _id: 'exp1',
        title: 'Complex Project Management',
        content: 'I managed multiple stakeholders...',
        metadata: { 
          category: 'Uncategorized',
          difficulty: 'hard',
          tags: ['management', 'stakeholders']
        },
        save: jest.fn().mockResolvedValue()
      };
      
      mockExperience.find.mockResolvedValue([mockExperienceDoc]);
      generateCategory.mockResolvedValue('Project Management & Delivery');

      await runMigrationLogic(true);
      
      // Should preserve existing metadata
      expect(mockExperienceDoc.metadata.difficulty).toBe('hard');
      expect(mockExperienceDoc.metadata.tags).toEqual(['management', 'stakeholders']);
      expect(mockExperienceDoc.metadata.category).toBe('Project Management & Delivery');
    });

    test('should skip experiences that already have valid categories', async () => {
      const mockExperiences = [
        {
          _id: 'exp1',
          title: 'Already Categorized Experience',
          content: 'This has a category...',
          metadata: { category: 'Leadership & People Management' },
          save: jest.fn()
        },
        {
          _id: 'exp2',
          title: 'Needs Categorization',
          content: 'This needs a category...',
          metadata: { category: 'Uncategorized' },
          save: jest.fn().mockResolvedValue()
        }
      ];
      
      mockExperience.find.mockResolvedValue(mockExperiences);
      generateCategory.mockResolvedValue('Technical Trade-offs & Architecture');

      const updated = await runMigrationLogic(true);

      // Should skip already categorized
      expect(mockExperiences[0].save).not.toHaveBeenCalled();
      
      // Should update uncategorized
      expect(mockExperiences[1].save).toHaveBeenCalledTimes(1);

      expect(updated).toBe(1);

      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('[SKIP] Already Categorized Experience already has category: Leadership & People Management')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes('[UPDATE] Needs Categorization')
      )).toBe(true);
      expect(logCalls.some(log => 
        log.includes('Done. 1 experiences updated.')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      mockDbConnect.mockRejectedValue(new Error('Database connection failed'));

      await expect(runMigrationLogic(false)).rejects.toThrow('Database connection failed');
    });

    test('should handle OpenAI API errors during category generation', async () => {
      const mockExperienceDoc = {
        _id: 'exp1',
        title: 'Test Experience',
        content: 'Test content...',
        metadata: {},
        save: jest.fn()
      };
      
      mockExperience.find.mockResolvedValue([mockExperienceDoc]);
      generateCategory.mockRejectedValue(new Error('OpenAI API rate limit exceeded'));

      await expect(runMigrationLogic(false)).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    test('should handle experience save errors in write mode', async () => {
      const mockExperienceDoc = {
        _id: 'exp1',
        title: 'Test Experience',
        content: 'Test content...',
        metadata: {},
        save: jest.fn().mockRejectedValue(new Error('Database save failed'))
      };
      
      mockExperience.find.mockResolvedValue([mockExperienceDoc]);
      generateCategory.mockResolvedValue('Technical Trade-offs & Architecture');

      await expect(runMigrationLogic(true)).rejects.toThrow('Database save failed');
    });
  });

  describe('Command Line Flag Logic', () => {
    test('should demonstrate dry-run mode behavior (default)', async () => {
      const mockExperienceDoc = {
        _id: 'exp1',
        title: 'Test Experience',
        content: 'Test content...',
        metadata: {},
        save: jest.fn().mockResolvedValue()
      };
      
      mockExperience.find.mockResolvedValue([mockExperienceDoc]);
      generateCategory.mockResolvedValue('Technical Trade-offs & Architecture');

      const updated = await runMigrationLogic(false); // Simulating no --write flag

      // Should not save in dry-run mode
      expect(mockExperienceDoc.save).not.toHaveBeenCalled();
      expect(updated).toBe(0);
      
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('Done. 0 experiences updated.')
      )).toBe(true);
    });

    test('should demonstrate write mode behavior (--write flag)', async () => {
      const mockExperienceDoc = {
        _id: 'exp1',
        title: 'Test Experience', 
        content: 'Test content...',
        metadata: {},
        save: jest.fn().mockResolvedValue()
      };
      
      mockExperience.find.mockResolvedValue([mockExperienceDoc]);
      generateCategory.mockResolvedValue('Technical Trade-offs & Architecture');

      const updated = await runMigrationLogic(true); // Simulating --write flag

      // Should save in write mode
      expect(mockExperienceDoc.save).toHaveBeenCalledTimes(1);
      expect(updated).toBe(1);
      
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('Done. 1 experiences updated.')
      )).toBe(true);
    });

    test('should handle category determination logic correctly', async () => {
      const mockExperiences = [
        {
          title: 'Empty category',
          metadata: { category: '' },
          save: jest.fn()
        },
        {
          title: 'Uncategorized',
          metadata: { category: 'Uncategorized' },
          save: jest.fn()
        },
        {
          title: 'No metadata',
          save: jest.fn()
        },
        {
          title: 'Already categorized',
          metadata: { category: 'Leadership & People Management' },
          save: jest.fn()
        }
      ];
      
      mockExperience.find.mockResolvedValue(mockExperiences);
      generateCategory.mockResolvedValue('Generated Category');

      await runMigrationLogic(false);

      // Should call generateCategory 3 times (empty, uncategorized, no metadata)
      expect(generateCategory).toHaveBeenCalledTimes(3);
      
      // Should skip the already categorized one
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(logCalls.some(log => 
        log.includes('[SKIP] Already categorized already has category: Leadership & People Management')
      )).toBe(true);
    });
  });
}); 