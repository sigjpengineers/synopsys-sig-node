import {IssueOccurrence} from "../models/coverity-json-v7-schema";
import {logger} from "./SIGLogger";

export const PRESENT = 'PRESENT'
export const NOT_PRESENT = 'NOT_PRESENT'
export const UNKNOWN_FILE = 'Unknown File'
export const COMMENT_PREFACE = '<!-- Comment managed by coverity-report-output-v7 action, do not modify!'

export function coverityIsPresent(existingMessage: string): boolean {
    const lines = existingMessage.split('\n')
    return lines.length > 3 && lines[2] !== NOT_PRESENT
}

export function coverityCreateNoLongerPresentMessage(existingMessage: string): string {
    const existingMessageLines = existingMessage.split('\n')
    return `${existingMessageLines[0]}
${existingMessageLines[1]}
${NOT_PRESENT}
-->

Coverity issue no longer present as of: ${process.env.GITHUB_SHA}
<details>
<summary>Show issue</summary>

${existingMessageLines.slice(4).join('\n')}
</details>`
}

export function coverityCreateReviewCommentMessage(issue: IssueOccurrence): string {
    const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName
    const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : ''
    const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown'
    const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : ''
    const mainEvent = issue.events.find(event => event.main === true)
    const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
    const remediationEvent = issue.events.find(event => event.remediation === true)
    const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : ''

    return `${COMMENT_PREFACE}
${issue.mergeKey}
${PRESENT}
-->

# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_${checkerNameString}

${remediationString}
`
}

export function coverityCreateIssueCommentMessage(issue: IssueOccurrence): string {
    const message = coverityCreateReviewCommentMessage(issue)
    // TODO: Does this need to be relativized, or can use stripped path?
    // const relativePath = githubRelativizePath(issue.mainEventFilePathname)
    const relativePath = issue.mainEventFilePathname

    return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it at:
[${relativePath}:${issue.mainEventLineNumber}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA}/${relativePath}#L${issue.mainEventLineNumber})
`
}


