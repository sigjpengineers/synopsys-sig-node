import {context, getOctokit} from "@actions/github";
import {githubGetPullRequestNumber} from "./github-context";

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