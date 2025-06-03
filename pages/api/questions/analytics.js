import dbConnect from '../../../lib/dbConnect';
import QuestionPractice from '../../../models/QuestionPractice';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get all practice sessions sorted by date
    const allSessions = await QuestionPractice.find({})
      .sort({ datePracticed: -1 })
      .lean();

    // Rating improvement over time
    const ratingTrends = allSessions
      .reverse() // oldest first for trend calculation
      .map((session, index) => ({
        date: session.datePracticed,
        rating: session.rating,
        sessionNumber: index + 1,
        category: session.category
      }));

    // Category-based performance
    const categoryStats = allSessions.reduce((acc, session) => {
      if (!acc[session.category]) {
        acc[session.category] = {
          category: session.category,
          totalSessions: 0,
          averageRating: 0,
          ratings: [],
          lastPracticed: null
        };
      }
      
      acc[session.category].totalSessions++;
      acc[session.category].ratings.push(session.rating);
      
      if (!acc[session.category].lastPracticed || 
          new Date(session.datePracticed) > new Date(acc[session.category].lastPracticed)) {
        acc[session.category].lastPracticed = session.datePracticed;
      }
      
      return acc;
    }, {});

    // Calculate averages and trends for categories
    Object.keys(categoryStats).forEach(category => {
      const ratings = categoryStats[category].ratings;
      categoryStats[category].averageRating = 
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      // Recent trend (last 5 sessions vs previous 5)
      if (ratings.length >= 2) {
        const recent = ratings.slice(-Math.min(5, Math.floor(ratings.length / 2)));
        const previous = ratings.slice(0, Math.min(5, Math.floor(ratings.length / 2)));
        const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length;
        const previousAvg = previous.reduce((sum, r) => sum + r, 0) / previous.length;
        categoryStats[category].trend = recentAvg - previousAvg;
      } else {
        categoryStats[category].trend = 0;
      }
    });

    // Questions practiced - organize by question text
    const questionStats = allSessions.reduce((acc, session) => {
      if (!acc[session.questionText]) {
        acc[session.questionText] = {
          questionText: session.questionText,
          category: session.category,
          sessions: [],
          averageRating: 0,
          lastPracticed: null
        };
      }
      
      acc[session.questionText].sessions.push({
        rating: session.rating,
        date: session.datePracticed,
        practiceType: session.practiceType
      });
      
      if (!acc[session.questionText].lastPracticed || 
          new Date(session.datePracticed) > new Date(acc[session.questionText].lastPracticed)) {
        acc[session.questionText].lastPracticed = session.datePracticed;
      }
      
      return acc;
    }, {});

    // Calculate question averages and identify different categories
    const questionsNeedingPractice = [];
    const allPracticedQuestions = [];
    
    Object.keys(questionStats).forEach(questionText => {
      const question = questionStats[questionText];
      const ratings = question.sessions.map(s => s.rating);
      question.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      // Add to all practiced questions
      allPracticedQuestions.push(question);
      
      // Add to questions needing practice if average rating < 6
      if (question.averageRating < 6) {
        questionsNeedingPractice.push(question);
      }
    });

    // Sort practiced questions by rating (highest to lowest)
    const topQuestions = [...allPracticedQuestions]
      .sort((a, b) => b.averageRating - a.averageRating);
    
    // Sort practiced questions by rating (lowest to highest)  
    const lowestQuestions = [...allPracticedQuestions]
      .sort((a, b) => a.averageRating - b.averageRating);

    // Sort questions needing practice by lowest rating first
    questionsNeedingPractice.sort((a, b) => a.averageRating - b.averageRating);

    // Time trends (quantity and ratings by day/week)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const recentSessions = allSessions.filter(session => 
      new Date(session.datePracticed) >= thirtyDaysAgo
    );

    const dailyStats = recentSessions.reduce((acc, session) => {
      const dateKey = new Date(session.datePracticed).toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          sessionCount: 0,
          totalRating: 0,
          averageRating: 0
        };
      }
      
      acc[dateKey].sessionCount++;
      acc[dateKey].totalRating += session.rating;
      acc[dateKey].averageRating = acc[dateKey].totalRating / acc[dateKey].sessionCount;
      
      return acc;
    }, {});

    const timeTrends = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));

    // Questions that haven't been practiced yet - FIXED: use q.question instead of q.text
    const allQuestions = await Question.find({}).lean();
    const practicedQuestionTexts = new Set(allSessions.map(s => s.questionText));
    
    const unpracticedQuestions = allQuestions
      .filter(q => !practicedQuestionTexts.has(q.question))
      .map(q => ({
        questionText: q.question, // Fixed: was q.text
        category: q.category,
        difficulty: q.difficulty,
        tags: q.tags || []
      }));

    // Overall summary stats
    const totalSessions = allSessions.length;
    const overallAverageRating = totalSessions > 0 
      ? allSessions.reduce((sum, s) => sum + s.rating, 0) / totalSessions 
      : 0;
    
    const recentRating = allSessions.length > 0 ? allSessions[0].rating : 0;
    const firstRating = allSessions.length > 0 ? allSessions[allSessions.length - 1].rating : 0;
    const overallTrend = totalSessions > 1 ? recentRating - firstRating : 0;

    res.status(200).json({
      summary: {
        totalSessions,
        overallAverageRating: Math.round(overallAverageRating * 10) / 10,
        overallTrend: Math.round(overallTrend * 10) / 10,
        totalCategories: Object.keys(categoryStats).length,
        unpracticedQuestionsCount: unpracticedQuestions.length,
        practicedQuestionsCount: allPracticedQuestions.length
      },
      ratingTrends,
      categoryStats: Object.values(categoryStats),
      questionsNeedingPractice: questionsNeedingPractice.slice(0, 10), // Top 10 worst
      topQuestions: topQuestions.slice(0, 10), // Top 10 best
      lowestQuestions: lowestQuestions.slice(0, 10), // Top 10 worst (same as needing practice but different context)
      allPracticedQuestions: allPracticedQuestions, // All practiced questions for filtering
      timeTrends,
      unpracticedQuestions: unpracticedQuestions.slice(0, 20) // First 20
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 