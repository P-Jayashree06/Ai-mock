import { init, tx, id } from '@instantdb/react';

const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || '';

// Schema definition
export const schema = {
  interviews: {},      // interview sessions
  questions: {},       // individual questions
  answers: {},         // user answers
  results: {},         // final results per interview
};

export const db = init({ appId: APP_ID });

// Save interview session
export async function createInterview(userId, resumeData) {
  const interviewId = id();
  await db.transact(
    tx.interviews[interviewId].update({
      userId,
      resumeData,
      createdAt: Date.now(),
      status: 'started'
    })
  );
  return interviewId;
}

// Save question + answer + score
export async function saveQuestionResult(interviewId, data) {
  const answerId = id();
  await db.transact(
    tx.answers[answerId].update({
      interviewId,
      ...data,
      createdAt: Date.now()
    })
  );
  return answerId;
}

// Save final results
export async function saveFinalResult(interviewId, results) {
  const resultId = id();
  await db.transact([
    tx.results[resultId].update({
      interviewId,
      ...results,
      createdAt: Date.now()
    }),
    tx.interviews[interviewId].update({
      status: 'completed',
      completedAt: Date.now()
    })
  ]);
  return resultId;
}

// Get user's interview history
export function useInterviewHistory(userId) { 
  return db.useQuery({
    interviews: {
      $: {
        where: { userId }
      }
    }
  });
}

// Get specific interview details
export function useInterviewDetails(interviewId) {
  return db.useQuery({
    interviews: {
      $: {
        where: { id: interviewId }
      }
    },
    answers: {
      $: {
        where: { interviewId }
      }
    },
    results: {
      $: {
        where: { interviewId }
      }
    }
  });
}
