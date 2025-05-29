# MongoDB Interview Prep

A web application to help prepare for MongoDB interviews by providing random interview questions.

## Features

- Random MongoDB interview questions
- Question categories and difficulty levels
- Modern, responsive UI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mongodb-interview-prep
```

2. Install dependencies:
```bash
npm install
```

3. Set up your MongoDB connection:
- Create a `.env.local` file in the root directory
- Add your MongoDB URI:
```
MONGODB_URI=your_mongodb_uri_here
```
- If using local MongoDB, the default URI is: `mongodb://localhost:27017/interview-prep`

4. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3001](http://localhost:3001)

## Adding Questions

You can add questions to the database using the MongoDB shell or a MongoDB GUI tool. The question schema includes:

- question (String, required)
- category (String, required)
- difficulty (String: 'easy', 'medium', 'hard')
- createdAt (Date, auto-generated)

Example question document:
```json
{
  "question": "What is sharding in MongoDB?",
  "category": "Architecture",
  "difficulty": "medium"
}
```

## Contributing

Feel free to open issues or submit pull requests to improve the application. 