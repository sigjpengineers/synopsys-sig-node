import {CoverityIssueOccurrence} from "../models/coverity-json-v7-schema";
import {logger} from "../SIGLogger";
import {DiffMap} from "../diffmap";
import {relatavize_path} from "../paths";
import fs from "fs";

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

Coverity issue no longer present as of: ${process.env.CI_COMMIT_SHA}
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
    const mainEvent = issue.events.find(event => event.main)
    const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
    const remediationEvent = issue.events.find(event => event.remediation)
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

export function coverityCreateIssueCommentMessage(issue: CoverityIssueOccurrence, file_link: string): string {
    const message = coverityCreateReviewCommentMessage(issue)
    const relativePath = issue.strippedMainEventFilePathname.startsWith('/') ?
        relatavize_path(process.cwd(), issue.strippedMainEventFilePathname) :
        issue.strippedMainEventFilePathname

    return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it at:
[${relativePath}:${issue.mainEventLineNumber}](${file_link})
`
}

export function coverityIsInDiff(issue: CoverityIssueOccurrence, diffMap: DiffMap): boolean {
    logger.debug(`Look for issue: ${issue.strippedMainEventFilePathname}:${issue.mainEventLineNumber}`)
    /*
    const relativePath = issue.strippedMainEventFilePathname.startsWith('/') ?
        relatavize_path(process.cwd(), issue.strippedMainEventFilePathname) :
        issue.strippedMainEventFilePathname

     */

    const diffHunks = diffMap.get(issue.strippedMainEventFilePathname)
    logger.debug(`diffHunks=${diffHunks}`)

    if (!diffHunks) {
        return false
    }

    for (const hunk of diffHunks) {
        logger.debug(`hunk for ${issue.strippedMainEventFilePathname}: ${hunk.firstLine},${hunk.lastLine}`)
    }

    return diffHunks.filter(hunk => hunk.firstLine <= issue.mainEventLineNumber).some(hunk => issue.mainEventLineNumber <= hunk.lastLine)
}

export function coverityCreateIssueEvidence(issue: CoverityIssueOccurrence) {
    // Will create a map from files to lines to list of events and code snippets
    let event_tree_lines = new Map<string, Map<number, number>>()
    let event_tree_events = new Map<string, Map<number, Array<string>>>()
    let evidence = ''

    // Loop through each event and collect source code artifacts
    for (const event of issue.events) {
        const event_file = event.strippedFilePathname
        const event_line = event.lineNumber

        //logger.info(`Event file=${event_file} line=${event_line} ${event.eventNumber}`)
        if (!event_tree_lines.get(event_file)) {
            event_tree_lines.set(event_file, new Map<number, number>())
            event_tree_events.set(event_file, new Map<number, Array<string>>())
        }

        // Collect +/- 3 lines of code
        let event_line_start = event_line - 3
        if (event_line_start < 0) {
            event_line_start = 0
        }
        let event_line_end = event_line + 3

        for (let i = event_line_start; i < event_line_end; i ++) {
            if (!event_tree_lines.get(event_file)) { logger.debug(`Not set!`) }
            event_tree_lines.get(event_file)?.set(i, 1)
        }

        if (!event_tree_events.get(event_file)?.get(event_line)) {
            event_tree_events.get(event_file)?.set(event_line, [])
        }
        event_tree_events.get(event_file)?.get(event_line)?.push(
            `${event.eventNumber}. ${event.eventTag}: ${event.eventDescription}`)
        //logger.debug(`Push: ${event.eventNumber}. ${event.eventTag}: ${event.eventDescription}`)
    }

    let keys = Array.from( event_tree_lines.keys() );
    for (const filename of keys) {
        evidence += `\n**From ${filename}:**\n\n`
        evidence += "```\n"

        const event_to_lines = event_tree_lines.get(filename)
        if (event_to_lines) {
            let keys = Array.from(event_to_lines.keys())
            for (const i of keys) {
                if (event_tree_events.get(filename)?.has(i)) {
                    let events_and_lines = event_tree_events.get(filename)?.get(i)
                    if (events_and_lines) {
                        for (const event_str of events_and_lines) {
                            evidence += `${event_str}\n`
                        }
                    }
                }

                const code_line = get_line(filename, i)
                const line_string = i.toString().padStart(5, '0')
                evidence += `${line_string} ${code_line}\n`
            }
        }
    }
    evidence += "```\n"

    return evidence
}

function get_line(filename: string, line_no: number): string {
    const data = fs.readFileSync(filename, 'utf8');
    const lines = data.split('\n');

    if (+line_no > lines.length) {
        throw new Error('File end reached without finding line')
    }

    return lines[+line_no]
}

export function coverityCreateIssue(issue: CoverityIssueOccurrence): string {
    const issueName = issue.checkerProperties ? issue.checkerProperties.subcategoryShortDescription : issue.checkerName
    const checkerNameString = issue.checkerProperties ? `\r\n_${issue.checkerName}_` : ''
    const impactString = issue.checkerProperties ? issue.checkerProperties.impact : 'Unknown'
    const cweString = issue.checkerProperties ? `, CWE-${issue.checkerProperties.cweCategory}` : ''
    const mainEvent = issue.events.find(event => event.main)
    const mainEventDescription = mainEvent ? mainEvent.eventDescription : ''
    const remediationEvent = issue.events.find(event => event.remediation)
    const remediationString = remediationEvent ? `## How to fix\r\n ${remediationEvent.eventDescription}` : ''
    const issue_evidence = coverityCreateIssueEvidence(issue)

    return `<!-- Coverity Issue ${issue.mergeKey} -->
# Coverity Issue - ${issueName}
${mainEventDescription}

_${impactString} Impact${cweString}_ ${checkerNameString}

${remediationString}

${issue_evidence}
`
}