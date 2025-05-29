import { generateEmbedding } from '../lib/openai';

describe('OpenAI Integration Tests', () => {
  it('should generate embeddings for a given text', async () => {
    const text = 'This is a test experience for embedding generation';
    
    const embedding = await generateEmbedding(text);
    
    // Verify the embedding structure
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(typeof embedding[0]).toBe('number');
    expect(embedding.every(n => !isNaN(n))).toBe(true);
  }, 10000); // Increase timeout for API call

  it('should handle rate limits with exponential backoff', async () => {
    const texts = Array(10).fill('Test text for rate limit handling');
    
    // Generate embeddings for multiple texts in parallel
    const results = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    
    // Verify all embeddings were generated
    expect(results.length).toBe(texts.length);
    results.forEach(embedding => {
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
    });
  }, 30000); // Longer timeout for multiple API calls

  it('should handle various text inputs', async () => {
    // Test with empty text (OpenAI handles this gracefully)
    const emptyEmbedding = await generateEmbedding('');
    expect(Array.isArray(emptyEmbedding)).toBe(true);
    
    // Test with special characters
    const specialChars = '!@#$%^&*()_+ <>\n\t';
    const specialEmbedding = await generateEmbedding(specialChars);
    expect(Array.isArray(specialEmbedding)).toBe(true);
    
    // Test with very long text
    const longText = 'a'.repeat(10000);
    const longEmbedding = await generateEmbedding(longText);
    expect(Array.isArray(longEmbedding)).toBe(true);
    
    // Test with multilingual text
    const multilingualText = 'Hello 你好 Bonjour مرحبا';
    const multilingualEmbedding = await generateEmbedding(multilingualText);
    expect(Array.isArray(multilingualEmbedding)).toBe(true);
  }, 20000);
}); 