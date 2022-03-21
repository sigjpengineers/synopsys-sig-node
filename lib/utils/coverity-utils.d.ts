import { CoverityIssueOccurrence } from "../models/coverity-json-v7-schema";
export declare function coverityIsPresent(existingMessage: string): boolean;
export declare function coverityCreateNoLongerPresentMessage(existingMessage: string): string;
export declare function coverityCreateReviewCommentMessage(issue: CoverityIssueOccurrence): string;
export declare function coverityCreateIssueCommentMessage(issue: CoverityIssueOccurrence): string;
