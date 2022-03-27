import {IGitApi} from "azure-devops-node-api/GitApi";
import {FileDiffParams, FileDiffsCriteria} from "azure-devops-node-api/interfaces/GitInterfaces";

export async function azGetDiffMap(git_agent: IGitApi, repo_id: string, project_id: string, pull_id: number): Promise<Map<any, any>> {
    const diffMap = new Map()

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
                                                    lastLine: diffBlock.modifiedLineNumberStart ? diffBlock.modifiedLineNumberStart : (diffBlock.modifiedLinesCount ? diffBlock.modifiedLinesCount : 0)
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