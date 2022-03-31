import {Gitlab} from "@gitbeaker/node";
import {logger} from "../SIGLogger";

export async function gitlabGetDiffMap(gitlab_url: string, gitlab_token: string, project_id: string, merge_request_iid: number): Promise<Map<any, any>> {
    const api = new Gitlab({ host: gitlab_url, token: gitlab_token })

    logger.debug(`Getting commits for merge request #${merge_request_iid} in project #${project_id}`)
    let commits = await api.MergeRequests.commits(project_id, merge_request_iid)

    const diffMap = new Map()

    for (const commit of commits) {
        logger.debug(`Commit #${commit.id}: ${commit.title}`)
        let diffs = await api.Commits.diff(project_id, commit.id)
        for (const diff of diffs) {
            logger.debug(`  Diff file: ${diff.new_path} diff: ${diff.diff}`)

            const path = diff.new_path
            diffMap.set(path, [])

            const diff_text = diff.diff
            if (diff_text.startsWith('@@')) {
                let changedLines = diff_text.substring(3)
                changedLines = changedLines.substring(0, changedLines.indexOf(' @@'))

                const linesAddedPosition = changedLines.indexOf('+')
                if (linesAddedPosition > -1) {
                    // We only care about the right side because SI can only analyze what's there, not what used to be
                    const linesAddedString = changedLines.substring(linesAddedPosition + 1)
                    const separatorPosition = linesAddedString.indexOf(',')

                    const startLine = parseInt(linesAddedString.substring(0, separatorPosition))
                    const lineCount = parseInt(linesAddedString.substring(separatorPosition + 1))
                    const endLine = startLine + lineCount - 1

                    if (!diffMap.has(path)) {
                        diffMap.set(path, [])
                    }
                    logger.debug(`Added ${path}: ${startLine} to ${endLine}`)
                    diffMap.get(path)?.push({firstLine: startLine, lastLine: endLine, sha: commit.id})
                }
            }
        }
    }

    return diffMap
}