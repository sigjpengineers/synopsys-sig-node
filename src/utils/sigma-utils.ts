import {SigmaIssueOccurrence} from "../models/sigma-schema"
import {DiffMap} from "./gitlab-utils"
import {logger} from "./SIGLogger"
import * as fs from "fs"

export const COMMENT_PREFACE = '<!-- Comment managed by Synopsys, do not modify! -->'

export function isInDiff(issue: SigmaIssueOccurrence, diffMap: DiffMap): boolean {
    //logger.debug(`Look for ${issue.filepath} in diffMap`)
    const diffHunks = diffMap.get(issue.filepath)

    //logger.debug(`diffHunks=${diffHunks}`)

    if (!diffHunks) {
        return false
    }

    for (const hunk of diffHunks) {
        if (issue.location.start.line >= hunk.firstLine && issue.location.start.line <= hunk.lastLine) {
            //logger.debug(`found location in diffHunk`)
            return true
        }
    }

    return false

    // JC: For some reason the filter statement below is not working for sigma.
    // TODO: Come back to this.
    //return diffHunks.filter(hunk => hunk.firstLine <= issue.location.start.line).some(hunk => issue.location.start.line <= hunk.lastLine)
}

function get_line(filename: string, line_no: number): string {
    var data = fs.readFileSync(filename, 'utf8')
    var lines = data.split('\n')

    if (+line_no > lines.length) {
        throw new Error('File end reached without finding line')
    }

    return lines[+line_no]
}

export const uuidCommentOf = (issue: SigmaIssueOccurrence): string => `<!-- ${issue.uuid} -->`

export function createMessageFromIssue(issue: SigmaIssueOccurrence): string {
    const issueName = issue.summary
    const checkerNameString = issue.checker_id
    const impactString = issue.severity ? issue.severity.impact : 'Unknown'
    const cweString = issue.taxonomies?.cwe ? `, CWE-${issue.taxonomies?.cwe[0]}` : ''
    const description = issue.desc
    const remediation = issue.remediation ? issue.remediation : 'Not available'
    const remediationString = issue.remediation ? `## How to fix\r\n ${remediation}` : ''
    let suggestion = undefined

    // JC: Assume only one fix for now
    // TODO: Follow up with roadmap plans for fixes
    if (issue.fixes) {
        let fix = issue.fixes[0]

        let path = issue.filepath

        // TODO: try/catch for get_line in case file doesn't exist
        let current_line = get_line(path, fix.actions[0].location.start.line - 1)
        logger.debug(`current_line=${current_line}`)

        suggestion = current_line.substring(0, fix.actions[0].location.start.column - 1) + fix.actions[0].contents + current_line.substring(fix.actions[0].location.end.column - 1, current_line.length)

        logger.debug(`suggestion=${suggestion}`)
    }

    const suggestionString = suggestion ? '\n```suggestion\n' + suggestion + '\n```' : ''
    logger.debug(`suggestionString=${suggestionString}`)

    return `${COMMENT_PREFACE}
${uuidCommentOf(issue)}
# :warning: Sigma Issue - ${issueName}
${description}

_${impactString} Impact${cweString}_ ${checkerNameString}

${remediationString}

${suggestionString}
`
}