// Stage 2 database contract. UI integration follows in Stage 3.
// Protected fields must never be sent by a client insert/update.
export type CommunityState = "open" | "testing" | "solved" | "closed";
export type CommunityVisibility = "draft" | "public";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AttemptedTest {
  test: string;
  observation: string;
  verification_method?: string;
}

export interface CommunityDomain {
  id: string;
  slug: "cloud-devops" | "professional-av";
  name: string;
}

export interface CommunityCategory {
  id: string;
  domain_id: string;
  slug: string;
  name: string;
}

export interface CommunityProblemInput {
  category_id: string;
  title: string;
  symptom?: string;
  environment?: { [key: string]: JsonValue };
  product?: string;
  product_version?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  attempted_tests?: AttemptedTest[];
  observations?: string;
  verification_method?: string;
  tags?: string[];
  visibility?: CommunityVisibility;
}

export interface CommunityProblem extends Required<CommunityProblemInput> {
  id: string;
  author_id: string;
  state: CommunityState;
  accepted_solution_id: string | null;
  resolution_observation: string | null;
  resolution_verification: string | null;
  solved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunitySolutionInput {
  problem_id: string;
  diagnosis: string;
  steps: string[];
  reasoning: string;
  verification_method: string;
  observations?: string;
  sources?: string[];
}

export interface CommunitySolution extends Required<CommunitySolutionInput> {
  id: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityCommentInput {
  solution_id: string;
  kind?: "clarification" | "test_result";
  body: string;
  attempted_test?: string;
  observation?: string;
  verification_method?: string;
}

export interface CommunityComment extends Required<CommunityCommentInput> {
  id: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export type CommunityReportInput = { reason: string; details?: string } & (
  | { problem_id: string; solution_id?: never; comment_id?: never }
  | { problem_id?: never; solution_id: string; comment_id?: never }
  | { problem_id?: never; solution_id?: never; comment_id: string }
);

export interface CommunityAcceptanceInput {
  p_problem_id: string;
  p_solution_id: string;
  p_observation: string;
  p_verification: string;
}
