import {IGitApi} from "azure-devops-node-api/GitApi"
import {
    GitPullRequestCommentThread,
    Comment,
    CommentThreadContext, CommentPosition, FileDiffsCriteria, FileDiffParams
} from "azure-devops-node-api/interfaces/GitInterfaces"
import {SigmaIssueOccurrence} from "../models/sigma-schema"
import {logger} from "./SIGLogger";
import {DiffMap} from "./diffmap";

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

export async function azGetDiffMap(git_agent: IGitApi, repo_id: string, project_id: string, pull_id: number): Promise<Map<any, any>> {
    const diffMap = new Map()

    let path = UNKNOWN_FILE

    //logger.info(`DEBUG: getDiffMap for repo: ${repo_id} project: ${project_id} pull: ${pull_id}`)

    let commits = await git_agent.getPullRequestCommits(repo_id, pull_id)
    if (commits) {
        for (const commit of commits) {
            if (commit.commitId) {
                let changes = await git_agent.getChanges(commit.commitId, repo_id)
                if (changes && changes.changes) {
                    for (const change of changes.changes) {
                        if (change && change.item) {
                            //logger.info(`DEBUG: change id=${change.changeId} item path=${change.item.path} commitid=${change.item.commitId} url=${change.item.url} content=${change.item.content} type=${change.changeType}`)

                            let diff_criteria: FileDiffsCriteria = <FileDiffsCriteria>{}
                            diff_criteria.baseVersionCommit = change.item.commitId
                            diff_criteria.targetVersionCommit = change.item.commitId

                            let fileDiffParam = <FileDiffParams>{}
                            fileDiffParam.path = change.item.path
                            diff_criteria.fileDiffParams = [ fileDiffParam ]
                            //logger.info(`DEBUG: fileDiffParam len=${diff_criteria.fileDiffParams.length} dd=${diff_criteria.fileDiffParams}`)

                            let diffs = await git_agent.getFileDiffs(diff_criteria, project_id, repo_id)
                            for (const diff of diffs) {
                                //logger.info(`DEBUG: diff path=${diff.path}`)

                                if (diff.lineDiffBlocks) {
                                    for (const diffBlock of diff.lineDiffBlocks) {
                                        //logger.info(`diff block mlineStart=${diffBlock.modifiedLineNumberStart} mlineCount=${diffBlock.modifiedLinesCount}`)
                                        //logger.info(`diff block olineStart=${diffBlock.originalLineNumberStart} olineCount=${diffBlock.originalLinesCount}`)

                                        if (change && change.item && change.item.path) {
                                            if (!diffMap.has(change.item.path.substring(1))) {
                                                diffMap.set(change.item.path.substring(1), [])
                                            }
                                            //logger.info(`DEBUG: Added ${change.item.path.substring(1)}: ${diffBlock.modifiedLineNumberStart} to ${diffBlock.modifiedLineNumberStart + diffBlock.modifiedLinesCount}`)
                                            diffMap.get(change.item.path.substring(1))?.push(
                                                {
                                                    firstLine: diffBlock.modifiedLineNumberStart,
                                                    lastLine: diffBlock.modifiedLineNumberStart ? diffBlock.modifiedLineNumberStart : 0 + (diffBlock.modifiedLinesCount ? diffBlock.modifiedLinesCount : 0)
                                                })

                                        }
                                    }

                                }
                            }
                        }
                    }
                }
            }

        }
    }

    return diffMap
}
