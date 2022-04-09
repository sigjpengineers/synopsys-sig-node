import {IGitApi} from "azure-devops-node-api/GitApi";
import {
    Comment, CommentPosition,
    CommentThreadContext,
    GitPullRequestCommentThread
} from "azure-devops-node-api/interfaces/GitInterfaces";
import {SigmaIssueOccurrence} from "../models/sigma-schema";

export const UNKNOWN_FILE = 'Unknown File'

export async function azGetExistingReviewThreads(git_agent: IGitApi, repo_id: string, pull_id: number): Promise<GitPullRequestCommentThread[]> {
    let threads: GitPullRequestCommentThread[] = []

    threads = await git_agent.getThreads(repo_id, pull_id)
    if (threads && threads.length > 0) {
        for (const thread of threads) {
            //logger.info(`DEBUG: thread id=${thread.id}`)
            if (thread.comments) {
                for (const comment of thread.comments) {
                    //logger.info(`DEBUG: comment=${comment.content}`)
                }
            }
        }
    }

    return threads
}

export async function azUpdateComment(git_agent: IGitApi, repo_id: string, pull_id: number, thread_id: number,
                                      comment_id: number, comment_body: string): Promise<boolean> {
    let updated_comment: Comment = <Comment>{}
    updated_comment.content = comment_body

    let comment = await git_agent.updateComment(updated_comment, repo_id, pull_id, thread_id, comment_id)

    return true
}
export async function azCreateReviewComment(git_agent: IGitApi, repo_id: string, pull_id: number,
                                                 path: string, line: number,
                                                 comment_body: string): Promise<boolean> {
    let comment: Comment = <Comment>{}
    comment.content = comment_body
    comment.parentCommentId = 0
    comment.commentType = 1

    let thread: GitPullRequestCommentThread = <GitPullRequestCommentThread>{}
    thread.threadContext = <CommentThreadContext>{}
    thread.threadContext.filePath = path
    thread.threadContext.rightFileStart = <CommentPosition>{}
    thread.threadContext.rightFileStart.line = line
    thread.threadContext.rightFileStart.offset = 1
    thread.threadContext.rightFileEnd = <CommentPosition>{}
    thread.threadContext.rightFileEnd.line = line
    thread.threadContext.rightFileEnd.offset = 1
    thread.status = 1 // Active

    thread.comments = [ comment ]

    let new_thread = await git_agent.createThread(thread, repo_id, pull_id)

    return true
}

export async function azCreateSigmaReviewComment(git_agent: IGitApi, repo_id: string, pull_id: number,
                                            issue: SigmaIssueOccurrence, comment_body: string): Promise<boolean> {
    let comment: Comment = <Comment>{}
    comment.content = comment_body
    comment.parentCommentId = 0
    comment.commentType = 1

    let thread: GitPullRequestCommentThread = <GitPullRequestCommentThread>{}
    thread.threadContext = <CommentThreadContext>{}
    thread.threadContext.filePath = "/" + issue.filepath
    thread.threadContext.rightFileStart = <CommentPosition>{}
    thread.threadContext.rightFileStart.line = issue.location.start.line
    thread.threadContext.rightFileStart.offset = 1
    thread.threadContext.rightFileEnd = <CommentPosition>{}
    thread.threadContext.rightFileEnd.line = issue.location.start.line
    thread.threadContext.rightFileEnd.offset = 1
    thread.status = 1 // Active

    thread.comments = [ comment ]

    let new_thread = await git_agent.createThread(thread, repo_id, pull_id)

    return true
}