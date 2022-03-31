import PolarisService from "../service/PolarisService";

const fs = require('fs');
const json_path = require('jsonpath');
import PolarisJobService from '../service/PolarisJobService';
import {logger} from "../../SIGLogger";

export default class PolarisIssueWaiter {
    log: any;
    constructor(log:any) {
        this.log = log;
    }

    async wait_for_issues(scan_cli_json_path: String, polaris_service: PolarisService): Promise<number | null> {
        var scan_json_text = fs.readFileSync(scan_cli_json_path);
        var scan_json = JSON.parse(scan_json_text);

        var issue_counts = json_path.query(scan_json, "$.issueSummary.total");
        //if (issue_counts.length == 0) {
        if (true) {
            this.log.info("No issues found in scan json, will go to Polaris Software Integrity Platform server.")

            var job_status_urls = json_path.query(scan_json, "$.tools[*].jobStatusUrl");
            if (job_status_urls.length > 0) {
                this.log.info("Waiting for jobs: " + job_status_urls.length)
                var polaris_job_service = new PolarisJobService(this.log, polaris_service);
                await polaris_job_service.waitForJobsToEnd(job_status_urls);
            } else {
                this.log.info("No jobs were found to wait for.")
            }

            var project_id = json_path.query(scan_json, "$.projectInfo.projectId")
            var branch_id = json_path.query(scan_json, "$.projectInfo.branchId")
            var revision_id = json_path.query(scan_json, "$.projectInfo.revisionId")

            logger.info(`Connect to Polaris: ${polaris_service.polaris_url} and fetch issues for project=${project_id} and branch=${branch_id}`)

            let issue_details_url = polaris_service.polaris_url +
                "/api/query/v1/issues?project-id=" + project_id +
                "&branch-id=" + branch_id + "&compare-run-id\%5B%5D=earlier&page%5Boffset%5D=0&page%5Blimit%5D=1000"

            var issue_details = await polaris_service.fetch_issue_data(issue_details_url)
            logger.info(`ISSUE DETAILS JSON: ${issue_details.data}`)

            // response.result as ICoverityIssuesSearchResponse

            var issue_api_url = json_path.query(scan_json, "$.scanInfo.issueApiUrl");
            if (issue_api_url.length > 0) {
                this.log.info("Getting issues from Polaris Software Integrity Platform server.")
                var issue_response =  await polaris_service.fetch_issue_data(issue_api_url[0]);
                issue_counts = json_path.query(issue_response.data, "$.data..attributes.value");
            }
        } else {
            this.log.info("Issue count was found in polaris scan json, will use found counts.")
        }

        if (issue_counts.length != 0) {
            var total_count = issue_counts.reduce((a:any, b:any) => a + b, 0)
            this.log.info("Total issues: " + total_count)
            return total_count;
        } else {
            this.log.info("Did not find any issue counts.")
            return null;
        }
    }
}

