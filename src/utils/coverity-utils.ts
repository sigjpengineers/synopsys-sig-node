import {CoverityIssueOccurrence} from "../models/coverity-json-v7-schema";
import {logger} from "./SIGLogger";
import {githubRelativizePath} from "./github-utils";
import {DiffMap} from "./diffmap";
import {relatavize_path} from "./misc-utils";

export const COVERITY_PRESENT = 'PRESENT'
export const COVERITY_NOT_PRESENT = 'NOT_PRESENT'
export const COVERITY_UNKNOWN_FILE = 'Unknown File'
export const COVERITY_COMMENT_PREFACE = '<!-- Comment managed by coverity-report-output-v7, do not modify!'

export function coverityIsPresent(existingMessage: string): boolean {
    const lines = existingMessage.split('\n')
    return lines.length > 3 && lines[2] !== COVERITY_NOT_PRESENT
}

export function coverityCreateNoLongerPresentMessage(existingMessage: string): string {
    const existingMessageLines = existingMessage.split('\n')
    return `${existingMessageLines[0]}
${existingMessageLines[1]}
${COVERITY_NOT_PRESENT}
-->

Coverity issue no longer present as of: ${process.env.GITHUB_SHA}
<details>
<summary>Show issue</summary>

${existingMessageLines.slice(4).join('\n')}
</details>`
}

export function coverityCreateReviewCommentMessage(issue: CoverityIssueOccurrence): string {
    const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName
    const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : ''
    const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown'
    const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : ''
    const mainEvent = issue.events.find(event => event.main === true)
    const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
    const remediationEvent = issue.events.find(event => event.remediation === true)
    const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : ''

    return `${COVERITY_COMMENT_PREFACE}
${issue.mergeKey}
${COVERITY_PRESENT}
-->

# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_${checkerNameString}

${remediationString}
`
}

export function coverityCreateIssueCommentMessage(issue: CoverityIssueOccurrence): string {
    const message = coverityCreateReviewCommentMessage(issue)
    const relativePath = relatavize_path(process.cwd(), issue.strippedMainEventFilePathname)

    return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it at:
[${relativePath}:${issue.mainEventLineNumber}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA}/${relativePath}#L${issue.mainEventLineNumber})
`
}

export function coverityIsInDiff(issue: CoverityIssueOccurrence, diffMap: DiffMap): boolean {
    const relativePath = relatavize_path(process.cwd(), issue.strippedMainEventFilePathname)
    logger.info(`is ${relativePath}:${issue.mainEventLineNumber} (was ${issue.strippedMainEventFilePathname}) in diff?`)

    const diffHunks = diffMap.get(relativePath)

    if (!diffHunks) {
        return false
    }

    return diffHunks.filter(hunk => hunk.firstLine <= issue.mainEventLineNumber).some(hunk => issue.mainEventLineNumber <= hunk.lastLine)
}

