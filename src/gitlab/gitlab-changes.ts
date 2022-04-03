import {Gitlab} from "@gitbeaker/node";
import {logger} from "../SIGLogger";

export async function gitlabGetChangesForMR(gitlab_url: string, gitlab_token: string, project_id: string, merge_request_iid: number): Promise<Array<string>> {
    const api = new Gitlab({ host: gitlab_url, token: gitlab_token })

    logger.debug(`Getting merge request #${merge_request_iid} in project #${project_id}`)
    let merge_request = await api.MergeRequests.show(project_id, merge_request_iid)
    logger.debug(`Merge Request title is ${merge_request.title}`)

    let changed_files: string[] = []
    let changes = await api.MergeRequests.changes(project_id, merge_request_iid)
    if (changes && changes.changes) {
        for (const change of changes.changes) {
            logger.debug(`Change detected to ${change.new_path}`)
            const filename = change.new_path
            changed_files.push(filename)
        }

    }

    return(changed_files)
}
/*

changes = mr.changes()
if debug: print(f"DEBUG: mr.changes()={json.dumps(changes, indent=4)}")

file_changes = dict()
with open(output, "w") as fp:
for change in changes['changes']:
if debug: print(f"DEBUG: change={change}")
filename = change['new_path']
if debug: print(f"DEBUG: filename={filename}")
fp.write(f"{filename}\n")



 */