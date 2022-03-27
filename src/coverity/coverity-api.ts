import {debug} from '@actions/core'
import {IRequestQueryParams} from 'typed-rest-client/Interfaces'
import {BasicCredentialHandler} from 'typed-rest-client/Handlers'
import {RestClient} from 'typed-rest-client/RestClient'

export const KEY_CID = 'cid'
export const KEY_MERGE_KEY = 'mergeKey'
export const KEY_ACTION = 'action'
export const KEY_CLASSIFICATION = 'classification'
export const KEY_FIRST_SNAPSHOT_ID = 'firstSnapshotId'
export const KEY_LAST_SNAPSHOT_ID = 'lastDetectedId'

export interface ICoverityIssuesSearchResponse {
    offset: number
    totalRows: number
    columns: string[]
    rows: ICoverityResponseCell[][]
}

export interface ICoverityResponseCell {
    key: string
    value: string
}

interface ICoverityIssueOccurrenceRequest {
    filters: ICoverityRequestFilter[]
    snapshotScope?: ICoveritySnapshotScopeFilter
    columns: string[]
}

interface ICoverityRequestFilter {
    columnKey: string
    matchMode: string
    matchers: ICoverityRequestFilterMatcher[]
}

interface ICoverityRequestFilterMatcher {
    type: string
    id?: string
    class?: string
    key?: string
    name?: string
    date?: string
}

interface ICoveritySnapshotScopeFilter {
    show?: ICoveritySnapshotScope
    compareTo?: ICoveritySnapshotScope
}

interface ICoveritySnapshotScope {
    scope: string
    includeOutdatedSnapshots: boolean
}

export class CoverityApiService {
    coverityUrl: string
    restClient: RestClient

    constructor(coverityUrl: string, coverityUsername: string, coverityPassword: string,
                client_name: string="Generic Coverity REST API Client") {
        this.coverityUrl = cleanUrl(coverityUrl)

        const authHandler = new BasicCredentialHandler(coverityUsername, coverityPassword, true)
        this.restClient = new RestClient(client_name, this.coverityUrl, [authHandler], {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })
    }

    async findIssues(projectName: string, offset: number, limit: number): Promise<ICoverityIssuesSearchResponse> {
        const requestBody: ICoverityIssueOccurrenceRequest = {
            filters: [
                {
                    columnKey: 'project',
                    matchMode: 'oneOrMoreMatch',
                    matchers: [
                        {
                            class: 'Project',
                            name: projectName,
                            type: 'nameMatcher'
                        }
                    ]
                }
            ],
            columns: [KEY_CID, KEY_MERGE_KEY, KEY_ACTION, KEY_CLASSIFICATION, KEY_FIRST_SNAPSHOT_ID, KEY_LAST_SNAPSHOT_ID]
        }
        const queryParameters: IRequestQueryParams = {
            params: {
                locale: 'en_us',
                offset,
                rowCount: limit,
                includeColumnLabels: 'true',
                queryType: 'bySnapshot',
                sortOrder: 'asc'
            }
        }
        const response = await this.restClient.create<ICoverityIssuesSearchResponse>('/api/v2/issues/search', requestBody, {queryParameters})
        if (response.statusCode < 200 || response.statusCode >= 300) {
            debug(`Coverity response error: ${response.result}`)
            return Promise.reject(`Failed to retrieve issues from Coverity for project '${projectName}': ${response.statusCode}`)
        }
        return Promise.resolve(response.result as ICoverityIssuesSearchResponse)
    }
}

export function cleanUrl(url: string): string {
    if (url && url.endsWith('/')) {
        return url.slice(0, url.length - 1)
    }
    return url
}
