import {ExistingIssueComment, ExistingReviewComment, NewReviewComment, PullRequest} from '../_namespaces/github'
import {context, getOctokit} from '@actions/github'
import {DiffMap} from "./diffmap";
import {logger} from "./SIGLogger";

const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment']

export const UNKNOWN_FILE = 'Unknown File'

export function githubIsPullRequest(): boolean {
    return prEvents.includes(context.eventName)
}

export function githubGetSha(): string {
    let sha = context.sha
    if (githubIsPullRequest()) {
        const pull = context.payload.pull_request as PullRequest
        if (pull?.head.sha) {
            sha = pull?.head.sha
        }
    }

    return sha
}

export function githubGetPullRequestNumber(): number | undefined {
    let pr_number = undefined
    if (githubIsPullRequest()) {
        const pull = context.payload.pull_request as PullRequest
        if (pull?.number) {
            pr_number = pull.number
        }
    }

    return pr_number
}

export function githubRelativizePath(path: string): string {
    let length = process.env.GITHUB_WORKSPACE?.length
    if (!length) {
        length = 'undefined'.length
    }

    return path.substring(length + 1)
}



export async function githubGetPullRequestDiff(github_token: string): Promise<string> {
    const octokit = getOctokit(github_token)

    const pullRequestNumber = githubGetPullRequestNumber()

    if (!pullRequestNumber) {
        return Promise.reject(Error('Could not get Pull Request Diff: Action was not running on a Pull Request'))
    }

    const response = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber,
        mediaType: {
            format: 'diff'
        }
    })

    return response.data as unknown as string
}

export async function githubGetExistingReviewComments(github_token: string): Promise<ExistingReviewComment[]> {
    const octokit = getOctokit(github_token)

    const pullRequestNumber = githubGetPullRequestNumber()
    if (!pullRequestNumber) {
        return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'))
    }

    const reviewCommentsResponse = await octokit.rest.pulls.listReviewComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber
    })

    return reviewCommentsResponse.data
}

export async function githubUpdateExistingReviewComment(github_token: string, commentId: number, body: string): Promise<void> {
    const octokit = getOctokit(github_token)

    octokit.rest.pulls.updateReviewComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: commentId,
        body
    })
}

export async function githubCreateReview(github_token: string, comments: NewReviewComment[], event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT'): Promise<void> {
    const octokit = getOctokit(github_token)

    const pullRequestNumber = githubGetPullRequestNumber()
    if (!pullRequestNumber) {
        return Promise.reject(Error('Could not create Pull Request Review Comment: Action was not running on a Pull Request'))
    }

    octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequestNumber,
        event,
        comments
    })
}

export async function githubGetExistingIssueComments(github_token: string): Promise<ExistingIssueComment[]> {
    const octokit = getOctokit(github_token)

    const {data: existingComments} = await octokit.rest.issues.listComments({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo
    })

    return existingComments
}

export async function githubUpdateExistingIssueComment(github_token: string, commentId: number, body: string): Promise<void> {
    const octokit = getOctokit(github_token)

    octokit.rest.issues.updateComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: commentId,
        body
    })
}

export async function githubCreateIssueComment(github_token: string, body: string): Promise<void> {
    const octokit = getOctokit(github_token)

    octokit.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body
    })
}

export function githubGetDiffMap(rawDiff: string): DiffMap {
    console.info('Gathering diffs...')
    const diffMap = new Map()

    let path = UNKNOWN_FILE
    for (const line of rawDiff.split('\n')) {
        if (line.startsWith('diff --git')) {
            // TODO: Handle spaces in path
            path = `${process.env.GITHUB_WORKSPACE}/${line.split(' ')[2].substring(2)}`
            if (path === undefined) {
                path = UNKNOWN_FILE
            }

            diffMap.set(path, [])
        }

        if (line.startsWith('@@')) {
            let changedLines = line.substring(3)
            changedLines = changedLines.substring(0, changedLines.indexOf(' @@'))

            const linesAddedPosition = changedLines.indexOf('+')
            if (linesAddedPosition > -1) {
                // We only care about the right side because Coverity can only analyze what's there, not what used to be --rotte FEB 2022
                const linesAddedString = changedLines.substring(linesAddedPosition + 1)
                const separatorPosition = linesAddedString.indexOf(',')

                const startLine = parseInt(linesAddedString.substring(0, separatorPosition))
                const lineCount = parseInt(linesAddedString.substring(separatorPosition + 1))
                const endLine = startLine + lineCount - 1

                if (!diffMap.has(path)) {
                    diffMap.set(path, [])
                }
                console.info(`Added ${path}: ${startLine} to ${endLine}`)
                diffMap.get(path)?.push({firstLine: startLine, lastLine: endLine})
            }
        }
    }

    return diffMap
}

export async function githubCommentOnPR(github_token: string, comment_preface: string, report: string): Promise<void> {
    const octokit = getOctokit(github_token)

    const message = comment_preface.concat('\r\n', report)

    const contextIssue = context.issue.number
    const contextOwner = context.repo.owner
    const contextRepo = context.repo.repo

    logger.debug('Gathering existing comments...')
    const { data: existingComments } = await octokit.rest.issues.listComments({
        issue_number: contextIssue,
        owner: contextOwner,
        repo: contextRepo
    })

    for (const comment of existingComments) {
        const firstLine = comment.body?.split('\r\n')[0]
        if (firstLine === comment_preface) {
            logger.debug(`Existing comment found. Attempting to delete it...`)
            octokit.rest.issues.deleteComment({
                comment_id: comment.id,
                owner: contextOwner,
                repo: contextRepo
            })
        }
    }

    logger.debug('Creating a new comment...')
    octokit.rest.issues.createComment({
        issue_number: contextIssue,
        owner: contextOwner,
        repo: contextRepo,
        body: message
    })
    logger.debug('Successfully created a new comment!')
}
