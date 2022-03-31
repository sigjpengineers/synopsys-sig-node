import { Gitlab } from '@gitbeaker/node'
import { ProjectSchema } from '@gitbeaker/core/dist/types/resources/Projects'
import { DiscussionSchema } from '@gitbeaker/core/dist/types/templates/ResourceDiscussions'
import { logger } from "../SIGLogger"

export async function gitlabGetProject(gitlab_url: string, gitlab_token: string, project_id: string): Promise<ProjectSchema> {
    const api = new Gitlab({ host: gitlab_url, token: gitlab_token })

    logger.debug(`Getting project ${project_id}`)

    let project = await api.Projects.show(project_id)

    logger.debug(`Project name is ${project.name}`)

    return project
}
