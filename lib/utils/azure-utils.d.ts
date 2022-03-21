import { IGitApi } from "azure-devops-node-api/GitApi";
import { GitPullRequestCommentThread } from "azure-devops-node-api/interfaces/GitInterfaces";
import { SigmaIssueOccurrence } from "../models/sigma-schema";
export declare const UNKNOWN_FILE = "Unknown File";
export declare function azGetExistingReviewThreads(git_agent: IGitApi, repo_id: string, pull_id: number): Promise<GitPullRequestCommentThread[]>;
export declare function azUpdateComment(git_agent: IGitApi, repo_id: string, pull_id: number, thread_id: number, comment_id: number, comment_body: string): Promise<boolean>;
export declare function azCreateReviewComment(git_agent: IGitApi, repo_id: string, pull_id: number, issue: SigmaIssueOccurrence, comment_body: string): Promise<boolean>;
export declare function azGetDiffMap(git_agent: IGitApi, repo_id: string, project_id: string, pull_id: number): Promise<Map<any, any>>;