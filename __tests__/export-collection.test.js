const fs = require('fs');
const { exportCollection } = require('../scripts/export-collection.js');

jest.mock('fs');

jest.mock('mongoose', () => {
  const toArray = jest.fn().mockResolvedValue([{ _id: '1', name: 'sample' }]);
  const find = jest.fn().mockReturnValue({ toArray });
  const collection = jest.fn().mockReturnValue({ find });
  return {
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    connection: { db: { collection } },
  };
});

describe('exportCollection', () => {
  it('writes documents to specified JSON file', async () => {
    const mockWrite = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    process.env.MONGODB_URI = 'mongodb://example';

    await exportCollection({ collection: 'questions', out: 'questions.json' });

    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining('questions.json'),
      expect.stringContaining('sample'),
      'utf-8'
    );
  });
}); 