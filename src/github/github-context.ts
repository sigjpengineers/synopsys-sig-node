import { context } from '@actions/github'
import { PullRequest } from '../_namespaces/Github'

const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment']

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
