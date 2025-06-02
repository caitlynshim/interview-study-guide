# Mock Interview Question Generator

A web application to help prepare for technical interviews by providing random interview questions across different categories.

## Features

- Random interview questions from various categories
- Question categories and difficulty levels
- Modern, responsive UI
- Built with Next.js and MongoDB

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd interview-prep
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

4. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3002](http://localhost:3002)

## Question Schema

Questions in the database follow this structure:

- question (String, required)
- category (String, required)
- difficulty (String: 'easy', 'medium', 'hard')
- createdAt (Date, auto-generated)

Example question:
```json
{
  "question": "Tell me about a time you led a major project.",
  "category": "Leadership & People",
  "difficulty": "medium"
}
```

## Contributing

Feel free to open issues or submit pull requests to improve the application. 