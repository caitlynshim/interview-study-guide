# Database Setup Script

This directory contains scripts for setting up and managing the MongoDB database for the interview study guide application.

## MongoDB Setup Script (`setup-database.js`)

A comprehensive script that creates the required MongoDB database, collections and indexes for the application.

### Usage

```bash
# Standard setup (requires MONGODB_URI in .env.local)
npm run setup-database

# Dry run mode (validates connection without making changes)
npm run setup-database-dry

# Direct execution with custom URI
node scripts/setup-database.js --uri=mongodb://localhost:27017/mydb

# Dry run with custom URI
node scripts/setup-database.js --uri=mongodb://localhost:27017/mydb --dry-run
```

### What It Creates

#### Database
- **`interview-study-guide`** (default name, extracted from URI or uses default)
- Automatically detects if database exists or creates it if needed

#### Collections
1. **`questions`** - Interview questions with categories and difficulty levels
2. **`experiences`** - User experiences with vector embeddings for RAG (Retrieval-Augmented Generation)
3. **`questionpractices`** - Practice session tracking with analytics

#### Indexes

**Questions Collection:**
- Text index on `question` field (for search)
- Index on `category` field (for filtering)
- Index on `difficulty` field (for filtering)

**Experiences Collection:**
- Text index on `content` and `title` fields (for keyword search)
- Compound index on `metadata.category` + `title` (for categorized browsing)
- Index on `createdAt` field (for recency sorting)
- ⚠️ **Vector search index** (requires manual setup in MongoDB Atlas)

**QuestionPractices Collection:**
- Compound index on `questionId` + `datePracticed` (desc)
- Compound index on `category` + `datePracticed` (desc)
- Compound index on `rating` + `datePracticed` (desc)
- Index on `datePracticed` field (desc)

### Manual Setup Required

The script automatically creates all indexes except the **vector search index** for the `experiences` collection. This must be created manually in MongoDB Atlas:

1. Go to MongoDB Atlas Dashboard
2. Navigate to Database → Search
3. Create Search Index with these settings:
   - **Index Name:** `vector_search`
   - **Database:** your-database-name
   - **Collection:** `experiences`
   - **Configuration:**
   ```json
   {
     "mappings": {
       "dynamic": false,
       "fields": {
         "embedding": {
           "type": "knnVector",
           "dimensions": 1536,
           "similarity": "cosine"
         }
       }
     }
   }
   ```

### Features

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Dry run mode** - Validate without making changes
- ✅ **Comprehensive error handling**
- ✅ **Detailed logging and progress indicators**
- ✅ **Connection validation**
- ✅ **Full test coverage**

### Environment Variables

The script uses the `MONGODB_URI` environment variable from `.env.local`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Testing

The script includes comprehensive test coverage:

```bash
npm test -- __tests__/setup-database.test.js
```

Tests cover:
- Database connection and error handling
- Collection creation and detection
- Index creation for all collections
- Dry run mode functionality
- Error scenarios and edge cases

### Exit Codes

- `0` - Success
- `1` - Error (connection failed, missing URI, etc.) 