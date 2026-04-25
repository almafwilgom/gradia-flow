/**
 * AI Comment Generation System
 * Generates personalized remarks for students based on their performance
 */
import { supabase } from './supabase';

/**
 * Analyze student performance and generate AI comments
 */
export async function generateAIComments(studentId, term, sessionYear, schoolId) {
  try {
    // Fetch student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, profiles(*)')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;
    if (!student) throw new Error('Student not found');

    // Fetch all results for student in this term
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('*, subjects(name, code)')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('session_year', sessionYear);

    if (resultsError) throw resultsError;

    // Fetch attendance summary
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_summary')
      .select('*')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('session_year', sessionYear)
      .single();

    if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;

    // Fetch behaviour evaluation
    const { data: behaviour, error: behaviourError } = await supabase
      .from('behaviour_evaluations')
      .select('*')
      .eq('student_id', studentId)
      .eq('term', term)
      .eq('session_year', sessionYear)
      .single();

    if (behaviourError && behaviourError.code !== 'PGRST116') throw behaviourError;

    const metrics = calculatePerformanceMetrics(results ?? []);

    // Call Edge Function to generate AI comments
    const { data: aiResponse, error: invokeError } = await supabase.functions.invoke('ai-insights', {
      body: {
        student,
        results: results ?? [],
        attendance,
        behaviour,
        metrics,
        school_id: schoolId,
        term,
        session_year: sessionYear,
        mode: 'comments'
      }
    });

    if (invokeError) throw invokeError;

    return aiResponse;
  } catch (error) {
    console.error('AI comment generation error:', error);
    throw error;
  }
}

/**
 * Generate subject-wise insights
 */
export async function generateSubjectInsights(results) {
  const insights = {};

  for (const result of results ?? []) {
    const subject = result.subjects?.name || result.subject || 'Unknown Subject';
    const score = result.total || 0;
    const grade = result.grade;

    let insight = '';

    if (score >= 80) {
      insight = `Excellent performance in ${subject}. Student demonstrates strong mastery and consistently applies concepts.`;
    } else if (score >= 70) {
      insight = `Good understanding of ${subject}. Student grasps key concepts but may benefit from additional practice.`;
    } else if (score >= 60) {
      insight = `Fair performance in ${subject}. Student understands basic concepts but needs improvement in application.`;
    } else if (score >= 50) {
      insight = `Student requires improvement in ${subject}. Focus on foundational concepts is recommended.`;
    } else {
      insight = `${subject} requires significant improvement. Additional support and tutoring is recommended.`;
    }

    insights[subject] = {
      score,
      grade,
      insight,
      recommendation: generateRecommendation(score, subject)
    };
  }

  return insights;
}

/**
 * Generate personalized recommendation
 */
function generateRecommendation(score, subject) {
  if (score >= 75) {
    return `Continue the excellent work in ${subject}. Consider exploring advanced topics.`;
  } else if (score >= 60) {
    return `Regular practice and revision will help improve ${subject} scores.`;
  } else {
    return `Seek additional tutoring in ${subject}. Focus on weaker areas.`;
  }
}

/**
 * Generate form teacher remarks
 */
export async function generateFormTeacherRemarks(studentId, term, sessionYear, schoolId) {
  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('total, grade')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('session_year', sessionYear);

  if (resultsError) throw resultsError;

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance_summary')
    .select('attendance_percentage, days_absent')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('session_year', sessionYear)
    .single();

  if (attendanceError && attendanceError.code !== 'PGRST116') throw attendanceError;

  const { data: behaviour, error: behaviourError } = await supabase
    .from('behaviour_evaluations')
    .select('overall_rating')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('session_year', sessionYear)
    .single();

  if (behaviourError && behaviourError.code !== 'PGRST116') throw behaviourError;

  // Calculate average
  const avgScore = (results?.reduce((sum, r) => sum + (r.total || 0), 0) || 0) / (results?.length || 1);
  const attendancePerc = attendance?.attendance_percentage || 0;
  const behaviorRating = behaviour?.overall_rating || 'average';
  const studentName = await getStudentName(studentId);

  let remark = '';

  // Build remark based on performance
  if (avgScore >= 80 && attendancePerc >= 90 && behaviorRating === 'excellent') {
    remark = `Exceptional performance this term. Excellent academic progress, outstanding attendance, and exemplary conduct. ${studentName} is a role model. Continue the excellent effort.`;
  } else if (avgScore >= 70 && attendancePerc >= 85 && (behaviorRating === 'good' || behaviorRating === 'excellent')) {
    remark = 'Good academic progress with consistent attendance and positive behaviour. Keep up the good work and continue to strive for excellence.';
  } else if (avgScore >= 60) {
    remark = 'Fair performance this term. With increased focus on studies and regular attendance, there is potential for improvement. We encourage more dedication to academic work.';
  } else {
    remark = 'Performance this term needs improvement. Irregular attendance and/or behavioural issues may be affecting academic progress. We recommend increased parental support and focused study effort.';
  }

  if (attendancePerc < 75) {
    remark += ' Attendance is a concern and needs immediate improvement.';
  }

  return remark;
}

/**
 * Generate principal remarks
 */
export async function generatePrincipalRemarks(studentId, term, sessionYear, schoolId) {
  const { data: results, error: resultsError } = await supabase
    .from('results')
    .select('total, grade')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('session_year', sessionYear);

  if (resultsError) throw resultsError;

  const avgScore = (results?.reduce((sum, r) => sum + (r.total || 0), 0) || 0) / (results?.length || 1);

  let remark = '';

  if (avgScore >= 80) {
    remark = 'Congratulations on the excellent academic achievement. Your dedication to excellence is commendable. We are proud of your progress.';
  } else if (avgScore >= 70) {
    remark = 'Well done on the good academic performance. Continue to maintain this standard and strive for further improvement.';
  } else if (avgScore >= 60) {
    remark = 'Your academic performance this term shows potential. With sustained effort and commitment, you can achieve better results next term.';
  } else {
    remark = 'Your academic performance requires urgent attention. Please meet with the school counselor and your parents to develop an improvement plan.';
  }

  return remark;
}

/**
 * Helper to get student name
 */
async function getStudentName(studentId) {
  const { data: student, error } = await supabase
    .from('students')
    .select('first_name, last_name')
    .eq('id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() || 'The student';
}

/**
 * Calculate performance metrics
 */
export function calculatePerformanceMetrics(results) {
  if (!results || results.length === 0) {
    return {
      totalSubjects: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      aGrades: 0,
      bGrades: 0,
      cGrades: 0,
      dGrades: 0,
      eGrades: 0,
      fGrades: 0
    };
  }

  const scores = results.map((r) => r.total || 0);
  const grades = results.map((r) => r.grade);

  return {
    totalSubjects: results.length,
    averageScore: Number((scores.reduce((a, b) => a + b, 0) / results.length).toFixed(2)),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    aGrades: grades.filter((g) => g === 'A').length,
    bGrades: grades.filter((g) => g === 'B').length,
    cGrades: grades.filter((g) => g === 'C').length,
    dGrades: grades.filter((g) => g === 'D').length,
    eGrades: grades.filter((g) => g === 'E').length,
    fGrades: grades.filter((g) => g === 'F').length
  };
}

/**
 * Generate overall assessment
 */
export function generateOverallAssessment(metrics, attendance, behaviour) {
  const averageScore = Number(metrics?.averageScore || 0);
  const attendancePerc = attendance?.attendance_percentage || 0;
  const behaviorRating = behaviour?.overall_rating || 'average';

  let assessment = '';

  if (averageScore >= 80 && attendancePerc >= 90 && behaviorRating !== 'poor') {
    assessment = 'Outstanding';
  } else if (averageScore >= 70 && attendancePerc >= 85) {
    assessment = 'Excellent';
  } else if (averageScore >= 60 && attendancePerc >= 80) {
    assessment = 'Good';
  } else if (averageScore >= 50 && attendancePerc >= 75) {
    assessment = 'Satisfactory';
  } else if (averageScore >= 40) {
    assessment = 'Needs Improvement';
  } else {
    assessment = 'Critical';
  }

  return assessment;
}

export default {
  generateAIComments,
  generateSubjectInsights,
  generateFormTeacherRemarks,
  generatePrincipalRemarks,
  calculatePerformanceMetrics,
  generateOverallAssessment
};