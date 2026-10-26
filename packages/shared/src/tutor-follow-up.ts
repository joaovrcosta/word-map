/** Limite de UX / best-effort no servidor (cliente pode contornar; cota é a proteção real). */
export const MAX_FOLLOW_UPS_PER_EXPLANATION = 2;

export const MAX_FOLLOW_UP_SPAN = 200;
export const MAX_FOLLOW_UP_SENTENCE = 400;
export const MAX_FOLLOW_UP_EXPLANATION = 600;
export const MAX_FOLLOW_UP_QUESTION = 200;
export const MAX_FOLLOW_UP_ANSWER = 400;

export type TutorFollowUpTurn = {
  question: string;
  answer: string;
};

export type TutorFollowUpRequest = {
  span: string;
  sentence: string;
  explanation: string;
  question: string;
  previousTurns?: TutorFollowUpTurn[];
};

export type TutorFollowUpResponse = {
  answer: string;
};
