import PolarisService from "./PolarisService";
import {
    IPolarisBranch,
    IPolarisBranchData,
    IPolarisCodeAnalysisEvents, IPolarisCodeAnalysisEventsData,
    IPolarisIssueData,
    IPolarisIssueDataReturn, IPolarisIssueTriage, IPolarisIssueTriageData, IPolarisIssueTriageValue,
    IPolarisIssueUnified,
    IPolarisIssueUnifiedEvent,
    IPolarisRun,
    IPolarisRunData
} from "../model/PolarisAPI";
import {logger} from "../../SIGLogger";
import {DiffMap} from "../../diffmap";

export async function polarisGetRuns(polarisService: PolarisService, projectId: string, branchId: string): Promise <IPolarisRun[]> {
    let complete = false
    let offset = 0
    let limit = 25

    let collected_runs = Array()

    while (!complete) {
        let run_page = await polarisGetRunsPage(polarisService, projectId, branchId, limit, offset)
        collected_runs = collected_runs.concat(run_page.data)
        offset = offset + limit
        if (offset >= run_page.meta.total) {
            complete = true
        }
    }

    return(collected_runs)
}

export async function polarisGetRunsPage(polarisService: PolarisService, projectId: string, branchId: string,
                                         limit: number, offset: number): Promise <IPolarisRunData> {
    let runs_path = `${polarisService.polaris_url}` +
        `/api/common/v0/runs?page[limit]=${limit}` +
        `&page[offset]=${offset}` +
        `&filter[run][project][id][eq]=${projectId}` +
        `&filter[run][revision][branch][id][eq]=${branchId}`

    logger.debug(`Fetch runs from: ${runs_path}`)

    const run_data = await polarisService.get_url(runs_path)

    //logger.debug(`Polaris runs data for projectId ${projectId} and branchId ${branchId}: ${JSON.stringify(run_data.data, null, 2)}`)

    const runs = run_data.data as IPolarisRunData

    return(runs)
}

export async function polarisGetBranches(polarisService: PolarisService, projectId: string): Promise <IPolarisBranch[]> {
    let complete = false
    let offset = 0
    let limit = 25

    let collected_branches = Array()

    while (!complete) {
        let branch_page = await polarisGetBranchesPage(polarisService, projectId, limit, offset)
        collected_branches = collected_branches.concat(branch_page.data)
        offset = offset + limit
        if (offset >= branch_page.meta.total) {
            complete = true
        }
    }

    return(collected_branches)
}
export async function polarisGetBranchesPage(polarisService: PolarisService, projectId: string,
                                         limit: number, offset: number): Promise <IPolarisBranchData> {
    let branches_path = `${polarisService.polaris_url}` +
        `.api/common/v0/branches` +
        `&filter[branch][project][id][$eq]=${projectId}`

    logger.debug(`Fetch branches from: ${branches_path}`)

    const branch_data = await polarisService.get_url(branches_path)

    logger.debug(`Polaris branch data for projectId ${projectId} : ${JSON.stringify(branch_data.data, null, 2)}`)

    const branches = branch_data.data as IPolarisBranchData

    return(branches)
}

export async function polarisGetIssuesUnified(polarisService: PolarisService, projectId: string, branchId: string,
                                              useBranch: boolean, runId: string,
                                              compareRunId: string): Promise <IPolarisIssueUnified[]> {
    let issues = await polarisGetIssues(polarisService, projectId, useBranch ? branchId : "", runId, compareRunId)

    logger.debug(`There are ${issues.issueData.length} issues for project: ${projectId} and run: ${runId}`)

    let issuesUnified : Array<IPolarisIssueUnified> = new Array()

    for (const issue of issues.issueData) {
        logger.debug(`Issue ${issue.id} has issue key: ${issue.relationships["issue-type"]?.data.id}`)

        let issueEvents = undefined
        try {
            issueEvents = await polarisGetIssueEventsWithSource(polarisService, issue.attributes["finding-key"], runId)
        } catch(error) {
            logger.warn(`Unable to fetch issue events for finding key: ${issue.attributes["finding-key"]} for run: ${runId}`)
        }

        const issueTriage = await polarisGetIssueTriage(polarisService, projectId, issue.attributes["issue-key"])

        let issueUnified = <IPolarisIssueUnified>{}

        let issue_type_id = issue.relationships["issue-type"]?.data.id
        let issue_path_id = issue.relationships.path?.data.id
        let tool_id = issue.relationships.tool?.data.id
        let issue_opened_id = issue.relationships.transitions?.data[0].id
        let issue_severity_id = issue.relationships.severity?.data.id

        issueUnified.key = issue.attributes["issue-key"]
        issueUnified.checkerName = issue.attributes["sub-tool"]

        issueUnified.dismissed = false
        if (issueTriage) {
            let dismissStatus = await polarisGetTriageValue("DISMISS", issueTriage.attributes["triage-current-values"])
            if (dismissStatus && dismissStatus["display-value"] == "Dismissed") {
                issueUnified.dismissed = true
            }
        }

        issueUnified.path = "N/A"
        issueUnified.name = "N/A"
        issueUnified.description = "N/A"
        issueUnified.localEffect = "N/A"
        issueUnified.link = "N/A"
        issueUnified.severity = "N/A"

        for (const included_data of issues.issueIncluded) {
            if (issue_path_id && included_data.type == "path" && included_data.id == issue_path_id) {
                issueUnified.path = included_data.attributes.path ? included_data.attributes.path.join('/') : "N/A"
            }
            if (issue_type_id && included_data.type == "issue-type" && included_data.id == issue_type_id) {
                issueUnified.name = included_data.attributes["name"] ? included_data.attributes["name"] : "N/A"
                issueUnified.description = included_data.attributes["description"] ? included_data.attributes["description"] : "N/A"
                issueUnified.localEffect = included_data.attributes["local-effect"] ? included_data.attributes["local-effect"] : "N/A"
            }
            if (issue_opened_id && included_data.type == "transition" && included_data.id == issue_opened_id) {
                issueUnified.link = `${polarisService.polaris_url}/projects/${projectId}/branches/${branchId}/revisions/` +
                    `${included_data.attributes["revision-id"]}/issues/${issue.attributes["issue-key"]}`
            }
            if (issue_severity_id && included_data.type == "taxon" && included_data.id == issue_severity_id) {
                issueUnified.severity = included_data.attributes.name ? included_data.attributes.name : "N/A"
            }
        }

        issueUnified.cwe = "N/A"
        if (issue.relationships["related-taxa"]) {
            issueUnified.cwe = ""
            for (const taxaData of issue.relationships["related-taxa"].data) {
                if (issueUnified.cwe == "") {
                    issueUnified.cwe = taxaData.id
                } else {
                    issueUnified.cwe += `, ${taxaData.id}`
                }
            }
        }

        issueUnified.mainEvent = "N/A"
        issueUnified.mainEventDescription = "N/A"
        issueUnified.remediationEvent = "N/A"
        issueUnified.remediationEventDescription = "N/A"
        issueUnified.line = 1

        issueUnified.events = new Array()
        if (issueEvents) {
            issueUnified.line = issueEvents[0]["main-event-line-number"]
            for (const event of issueEvents[0].events) {
                if (event["event-type"] == "MAIN") {
                    issueUnified.mainEvent = event["event-tag"]
                    issueUnified.mainEventDescription = event["event-description"]
                }
                if (event["event-tag"] == "remediation") {
                    issueUnified.remediationEvent = event["event-tag"]
                    issueUnified.remediationEventDescription = event["event-description"]
                }

                let issueUnifiedEvent: IPolarisIssueUnifiedEvent = <IPolarisIssueUnifiedEvent>{}
                issueUnifiedEvent.number = event["event-number"]
                issueUnifiedEvent.tag = event["event-tag"]
                issueUnifiedEvent.type = event["event-type"]
                issueUnifiedEvent.description = event["event-description"]
                issueUnifiedEvent["line-number"] = event["line-number"]
                issueUnifiedEvent.filePath = event["filePath"]
                issueUnifiedEvent["source-after"] = event["source-after"]
                issueUnifiedEvent["source-before"] = event["source-before"]

                issueUnified.events.push(issueUnifiedEvent)
            }
        }

        issuesUnified.push(issueUnified)
    }

    return(issuesUnified)
}

export async function polarisGetIssues(polarisService: PolarisService, projectId: string, branchId: string, runId: string,
                                       compareRunId: string): Promise <IPolarisIssueDataReturn> {
    let complete = false
    let offset = 0
    let limit = 25

    let collected_issues = Array()
    let collected_includes = Array()

    while (!complete) {
        let issues_page = await getIssuesPage(polarisService, projectId, branchId, runId, compareRunId, limit, offset)
        collected_issues = collected_issues.concat(issues_page.data)
        collected_includes = collected_includes.concat(issues_page.included)
        offset = offset + limit
        if (offset >= issues_page.meta.total) {
            complete = true
        }
    }

    let issueReturn = <IPolarisIssueDataReturn>{}
    issueReturn.issueData = collected_issues
    issueReturn.issueIncluded = collected_includes
    return(issueReturn)
}

export async function getIssuesPage(polarisService: PolarisService, projectId: string, branchId: string, runId: string,
                                    compareRunId: string,
                                    limit: number, offset: number): Promise <IPolarisIssueData> {
    let issues_path = `${polarisService.polaris_url}` +
        `/api/query/v1/issues?page[limit]=${limit}` +
        `&page[offset]=${offset}` +
        `&project-id=${projectId}` +
        `&include[issue][]=severity` +
        `&include[issue][]=related-taxa`

    if (branchId.length > 0) {
        issues_path += `&branch-id=${branchId}`
    }

    if (runId.length > 0) {
        issues_path += `&run-id[]=${runId}`
    }

    if (compareRunId && compareRunId.length > 0) {
        issues_path += `&compare-run-id[]=${compareRunId}`
    }

    logger.debug(`Fetch issues from: ${issues_path}`)

    const issues_data = await polarisService.get_url(issues_path)

    //logger.debug(`Polaris runs data for projectId ${projectId} and branchId ${branchId} ${JSON.stringify(issues_data.data, null, 2)}`)

    const issues = issues_data.data as IPolarisIssueData

    return(issues)
}

export async function polarisGetIssueTriage(polarisService: PolarisService, projectId: string, issueKey: string): Promise <IPolarisIssueTriage> {
    let triage_path = `${polarisService.polaris_url}` +
        `/api/triage-query/v1/triage-current/project-id%3A${projectId}` +
        `%3Aissue-key%3A${issueKey}`

    logger.debug(`Fetch issue triage from: ${triage_path}`)

    const triage_data = await polarisService.get_url(triage_path)

    //logger.debug(`Polaris triage data for projectId ${projectId} and issueKey ${issueKey} ${JSON.stringify(triage_data.data, null, 2)}`)

    const triage = triage_data.data as IPolarisIssueTriageData

    return(triage.data)
}

export async function polarisGetIssueEvents(polarisService: PolarisService,
                                            findingKey: string, runId: string): Promise <IPolarisCodeAnalysisEvents[]> {
    let events_path = `${polarisService.polaris_url}` +
        `/api/code-analysis/v0/events?finding-key=${findingKey}` +
        `&run-id=${runId}`

    logger.debug(`Fetch issue events from: ${events_path}`)

    const events_data = await polarisService.get_url(events_path)

    //logger.debug(`Polaris events data for findingKey ${findingKey} and runId ${runId}: ${JSON.stringify(events_data.data, null, 2)}`)

    const events = events_data.data as IPolarisCodeAnalysisEventsData

    return(events.data)
}

export async function polarisGetIssueEventsWithSource(polarisService: PolarisService,
                                                      findingKey: string, runId: string): Promise <IPolarisCodeAnalysisEvents[]> {
    let events_with_source_path = `${polarisService.polaris_url}` +
        `/api/code-analysis/v0/events-with-source?finding-key=${findingKey}` +
        `&run-id=${runId}` +
        `&occurrence-number=1` +
        `&max-depth=10`

    logger.debug(`Fetch issue events with source from: ${events_with_source_path}`)

    const events_with_source_data = await polarisService.get_url(events_with_source_path)

    //.debug(`Polaris events with source data for findingKey ${findingKey} and runId ${runId}: ${JSON.stringify(events_with_source_data.data, null, 2)}`)

    const events = events_with_source_data.data as IPolarisCodeAnalysisEventsData

    return(events.data)
}



/*
    let issue_events_url = polaris_service.polaris_url +
        "/api/code-analysis/v0/events?finding-key=" + issue.attributes["finding-key"] +
        "&run-id=" + this_run_id

 */

/*
export function polarisCreateReviewCommentMessage(issue: IPolarisIssue, events: IPolarisCodeAnalysisEvents): string {
    const issueTypeId = issue.relationships["issue-type"]?.data.id
    const issueName = issue.
    if (issue.attributes)
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

 */

export const POLARIS_PRESENT = 'PRESENT'
export const POLARIS_NOT_PRESENT = 'NOT_PRESENT'
export const POLARIS_UNKNOWN_FILE = 'Unknown File'
export const POLARIS_COMMENT_PREFACE = '<!-- Comment managed by Synopsys Polaris, do not modify!'

export function polarisCreateReviewCommentMessage(issue: IPolarisIssueUnified): string {
    return `${POLARIS_COMMENT_PREFACE}
${issue.key}
${POLARIS_PRESENT}
-->

# Polaris Issue - ${issue.name}
${issue.mainEventDescription} ${issue.localEffect} 

_${issue.severity} Impact, CWE ${issue.cwe} ${issue.checkerName}_

${issue.remediationEventDescription}

[View the issue in Polaris](${issue.link})
`
}

export function polarisCreateIssueCommentMessage(issue: IPolarisIssueUnified): string {
    const message = polarisCreateReviewCommentMessage(issue)

    return `${message}
## Issue location
This issue was discovered outside the diff for this Pull Request. You can find it in Polaris.
`
}

export function polarisIsInDiff(issue: IPolarisIssueUnified, diffMap: DiffMap): boolean {
    const diffHunks = diffMap.get(issue.path)

    if (!diffHunks) {
        return false
    }

    return diffHunks.filter(hunk => hunk.firstLine <= issue.line).some(hunk => issue.line <= hunk.lastLine)
}

export async function polarisGetTriageValue(attribute_name: string, triage_values: IPolarisIssueTriageValue[]):
    Promise<IPolarisIssueTriageValue> {
    for (const value of triage_values) {
        if (attribute_name == value["attribute-semantic-id"]) {
            return value
        }
    }
    return Promise.reject()
}