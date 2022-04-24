import {logger} from "../../lib";
import {IssueSchema} from "@gitbeaker/core/dist/types/resources/Issues";
import {Gitlab} from "@gitbeaker/node";

export async function gitlabGetIssues(gitlab_url: string, gitlab_token: string, project_id: string,
                                      title_search: string): Promise<Array<IssueSchema>> {
    const api = new Gitlab({host: gitlab_url, token: gitlab_token})
    // GitBeaker returns a relatively awkward data structure, so we will return a more convenient one
    let return_issues = Array()

    let issues = await api.Issues.all({
        projectId: project_id,
        options: {
            search: title_search
        }
    })

    for (const issue of issues) {
        // TODO: The title search does not seem to work above, implement here
        let title = issue.title as string
        if (title.includes(title_search)) {
            logger.debug(`GitLab Issue with title: ${issue.title} description: ${issue.description}`)
            return_issues.push(issue)
        }
    }

    return return_issues
}

export async function gitlabCreateIssue(gitlab_url: string, gitlab_token: string, project_id: string, title: string,
                                        description: string): Promise<number> {
    const api = new Gitlab({host: gitlab_url, token: gitlab_token})

    let new_issue = await api.Issues.create(project_id, {
        title: title,
        description: description,
        issue_type: "issue"
    })

    return new_issue.iid
}

export async function gitlabCloseIssue(gitlab_url: string, gitlab_token: string, project_id: string,
                                       issue_id: number): Promise<void> {
    const api = new Gitlab({host: gitlab_url, token: gitlab_token})

    await api.Issues.edit(project_id, issue_id, {
        state_event: "close"
    })

    return
}