import {ExistingIssueComment, ExistingReviewComment, NewReviewComment} from "../_namespaces/github";
import {context, getOctokit} from "@actions/github";
import {githubGetPullRequestNumber} from "./github-context";
import {logger} from "../SIGLogger";

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

    logger.debug(`PR number: ${pullRequestNumber} owner: ${context.repo.owner} repo: ${context.repo.repo} event: ${event}`)
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