import { debug, info, warning } from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { getSha } from './github-context'

export async function createCheck(checkName: string, githubToken: string): Promise<GitHubCheck> {
  const octokit = getOctokit(githubToken)

  const head_sha = getSha()

  info(`Creating ${checkName}...`)
  const response = await octokit.rest.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    name: checkName,
    head_sha
  })

  if (response.status !== 201) {
    warning(`Unexpected status code recieved when creating ${checkName}: ${response.status}`)
    debug(JSON.stringify(response, null, 2))
  } else {
    info(`${checkName} created`)
  }

  return new GitHubCheck(checkName, response.data.id, githubToken)
}

export class GitHubCheck {
  checkName: string
  checkRunId: number
  githubToken: string

  constructor(checkName: string, checkRunId: number, githubToken: string) {
    this.checkName = checkName
    this.checkRunId = checkRunId
    this.githubToken = githubToken
  }

  async passCheck(summary: string, text: string) {
    return this.finishCheck('success', summary, text)
  }

  async failCheck(summary: string, text: string) {
    return this.finishCheck('failure', summary, text)
  }

  async skipCheck() {
    return this.finishCheck('skipped', `${this.checkName} was skipped`, '')
  }

  async cancelCheck() {
    return this.finishCheck('cancelled', `${this.checkName} Check could not be completed`, `Something went wrong and the ${this.checkName} could not be completed. Check your action logs for more details.`)
  }

  private async finishCheck(conclusion: string, summary: string, text: string) {
    const octokit = getOctokit(this.githubToken)

    const response = await octokit.rest.checks.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      check_run_id: this.checkRunId,
      status: 'completed',
      conclusion,
      output: {
        title: this.checkName,
        summary,
        text
      }
    })

    if (response.status !== 200) {
      warning(`Unexpected status code recieved when creating check: ${response.status}`)
      debug(JSON.stringify(response, null, 2))
    } else {
      info(`${this.checkName} updated`)
    }
  }
}
