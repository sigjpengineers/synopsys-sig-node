import { SigmaIssueOccurrence } from "../models/sigma-schema";
import { DiffMap } from "./diffmap";
export declare const SIGMA_COMMENT_PREFACE = "<!-- Comment managed by Synopsys, do not modify! -->";
export declare function sigmaIsInDiff(issue: SigmaIssueOccurrence, diffMap: DiffMap): boolean;
export declare const sigmaUuidCommentOf: (issue: SigmaIssueOccurrence) => string;
export declare function sigmaCreateMessageFromIssue(issue: SigmaIssueOccurrence): string;