/** The How it works questionnaire; answer values match the backend enums. */
export type SurveyQuestion = {
  name: "heard_from" | "visit_reason" | "wants_alerts";
  legend: string;
  options: [string, string][];
};

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    name: "heard_from",
    legend: "How did you hear about ReCall?",
    options: [
      ["friend_or_family", "A friend or family member"],
      ["social_media", "Social media"],
      ["search", "A search engine"],
      ["other", "Somewhere else"],
    ],
  },
  {
    name: "visit_reason",
    legend: "What did you come to check?",
    options: [
      ["food_at_home", "Food I have at home"],
      ["brand_i_buy", "A brand I buy often"],
      ["in_the_news", "A recall I heard about in the news"],
      ["just_curious", "Nothing specific, just curious"],
    ],
  },
  {
    name: "wants_alerts",
    legend: "Would you use email alerts for foods you watch?",
    options: [
      ["yes", "Yes"],
      ["maybe", "Maybe"],
      ["no", "No"],
    ],
  },
];

/** The readable label for a stored answer, e.g. "social_media" → "Social media". */
export function surveyAnswerLabel(
  name: SurveyQuestion["name"],
  value: string,
): string {
  const question = SURVEY_QUESTIONS.find((item) => item.name === name);
  return question?.options.find(([key]) => key === value)?.[1] ?? value;
}
