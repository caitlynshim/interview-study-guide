const https = require('https');
const http = require('http');

// Simple script to trigger embedding regeneration via API
async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function fixEmbeddings() {
  try {
    console.log('[Fix Embeddings] Starting...');
    
    // 1. First, get all experiences
    console.log('[Fix Embeddings] Fetching experiences...');
    const listResponse = await makeRequest('/api/experiences/list');
    
    if (listResponse.status !== 200) {
      throw new Error(`Failed to fetch experiences: ${listResponse.status}`);
    }
    
    const experiences = listResponse.data.experiences;
    console.log(`[Fix Embeddings] Found ${experiences.length} experiences`);
    
    // 2. For each experience, save it (which will trigger embedding regeneration via middleware)
    for (let i = 0; i < experiences.length; i++) {
      const experience = experiences[i];
      console.log(`[Fix Embeddings] Processing ${i + 1}/${experiences.length}: "${experience.title}"`);
      
      try {
        // Call the edit API to trigger embedding regeneration
        const updateResponse = await makeRequest(`/api/experiences/edit?id=${experience._id}`, 'PUT', {
          title: experience.title,
          content: experience.content,
          metadata: { category: experience.category }
        });
        
        if (updateResponse.status === 200) {
          console.log(`[Fix Embeddings] ✅ Updated "${experience.title}"`);
        } else {
          console.log(`[Fix Embeddings] ❌ Failed to update "${experience.title}": ${updateResponse.status}`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[Fix Embeddings] ❌ Error updating "${experience.title}":`, error.message);
      }
    }
    
    console.log('[Fix Embeddings] Complete!');
    
    // 3. Test the RAG system
    console.log('[Fix Embeddings] Testing RAG system...');
    const testResponse = await makeRequest('/api/experiences/generate', 'POST', {
      question: 'Tell me about AWS experience'
    });
    
    console.log('[Fix Embeddings] RAG Test Result:');
    console.log(`  - Status: ${testResponse.status}`);
    console.log(`  - Candidates found: ${testResponse.data.debug?.candidatesFound || 'N/A'}`);
    console.log(`  - Relevant results: ${testResponse.data.debug?.relevantResults || 'N/A'}`);
    console.log(`  - Answer contains "don't have": ${testResponse.data.answer?.includes("don't have") || false}`);
    
  } catch (error) {
    console.error('[Fix Embeddings] Fatal error:', error);
    process.exit(1);
  }
}

fixEmbeddings(); 