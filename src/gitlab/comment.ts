import {logger} from "../SIGLogger";
import {Gitlab} from '@gitbeaker/node'
import {CommentSchema} from '@gitbeaker/core/dist/types/resources/Commits'

export async function gitlabGetExistingReviewComment(gitlab_url: string, gitlab_token: string, project_id: string,
                                                     commit_sha: string): Promise<CommentSchema[]> {
    const api = new Gitlab({host: gitlab_url, token: gitlab_token})
    let res = await api.Commits.comments(project_id, commit_sha)
    if (res[0].note === undefined || res[0].note === '') {
        const err_message = 'Could not get the existing review comment. Project: ' + project_id + ' Sha: ' + commit_sha
        logger.debug(err_message)
        throw new Error(err_message)       
    }
    return Promise.resolve(res)
}

export async function gitlabUpdateExistingReviewComment(gitlab_url: string, gitlab_token: string, project_id: string,
                                                        commit_sha: string, comment: string): Promise<CommentSchema> {
    const api = new Gitlab({host: gitlab_url, token: gitlab_token})
    const res = await api.Commits.createComment(project_id, commit_sha, comment)
    if (res.note === undefined || res.note === '') {
        const err_message = 'Could not update the existing review comment. Project: ' + project_id + ' Sha: ' + commit_sha
        logger.debug(err_message)
        throw new Error(err_message)        
    }
    return Promise.resolve(res)
}
