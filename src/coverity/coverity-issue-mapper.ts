import {CoverityApiService,
    ICoverityResponseCell,
    KEY_ACTION, KEY_CID, KEY_CLASSIFICATION, KEY_FIRST_SNAPSHOT_ID, KEY_LAST_SNAPSHOT_ID, KEY_MERGE_KEY
} from './coverity-api'
import {logger} from "../SIGLogger";

const PAGE_SIZE = 500

export class CoverityProjectIssue {
    cid: string
    mergeKey: string | null
    action: string
    classification: string
    firstSnapshotId: string
    lastSnapshotId: string

    constructor(cid: string, mergeKey: string | null, action: string, classification: string, firstSnapshotId: string, lastSnapshotId: string) {
        this.cid = cid
        this.mergeKey = mergeKey
        this.action = action
        this.classification = classification
        this.firstSnapshotId = firstSnapshotId
        this.lastSnapshotId = lastSnapshotId
    }
}

// FIXME This is very inefficient for projects with lots of issues. When filtering by mergeKey is fixed, we should use that instead.
export async function coverityMapMatchingMergeKeys(coverity_url: string,
                                           coverity_username: string,
                                           coverity_passphrase: string,
                                           coverity_project_name: string,
                                           relevantMergeKeys: Set<string>): Promise<Map<string, CoverityProjectIssue>> {
    logger.info('Checking Coverity server for existing issues...')
    const apiService = new CoverityApiService(coverity_url, coverity_username, coverity_passphrase)

    let totalRows = 0
    let offset = 0

    const mergeKeyToProjectIssue = new Map<string, CoverityProjectIssue>()

    while (offset <= totalRows && mergeKeyToProjectIssue.size < relevantMergeKeys.size) {
        try {
            const covProjectIssues = await apiService.findIssues(coverity_project_name, offset, PAGE_SIZE)
            totalRows = covProjectIssues.totalRows
            logger.debug(`Found ${covProjectIssues?.rows.length} potentially matching issues on the server`)

            covProjectIssues.rows
                .map(row => toProjectIssue(row))
                .filter(projectIssue => projectIssue.mergeKey != null)
                .filter(projectIssue => relevantMergeKeys.has(projectIssue.mergeKey as string))
                .forEach(projectIssue => mergeKeyToProjectIssue.set(projectIssue.mergeKey as string, projectIssue))
        } catch (error: any) {
            return Promise.reject(error)
        }
        offset += PAGE_SIZE
    }

    logger.info(`Found ${mergeKeyToProjectIssue.size} existing issues`)
    return mergeKeyToProjectIssue
}

function toProjectIssue(issueRows: ICoverityResponseCell[]): CoverityProjectIssue {
    let cid = ''
    let mergeKey = null
    let action = ''
    let classification = ''
    let firstSnapshotId = ''
    let lastSnapshotId = ''
    for (const issueCol of issueRows) {
        if (issueCol.key == KEY_CID) {
            cid = issueCol.value
        } else if (issueCol.key == KEY_MERGE_KEY) {
            mergeKey = issueCol.value
        } else if (issueCol.key == KEY_ACTION) {
            action = issueCol.value
        } else if (issueCol.key == KEY_CLASSIFICATION) {
            classification = issueCol.value
        } else if (issueCol.key == KEY_FIRST_SNAPSHOT_ID) {
            firstSnapshotId = issueCol.value
        } else if (issueCol.key == KEY_LAST_SNAPSHOT_ID) {
            lastSnapshotId = issueCol.value
        }
    }
    return new CoverityProjectIssue(cid, mergeKey, action, classification, firstSnapshotId, lastSnapshotId)
}
