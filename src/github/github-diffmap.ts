import {DiffMap} from "../diffmap";

const UNKNOWN_FILE = "Unknown"

export function githubGetDiffMap(rawDiff: string): DiffMap {
    console.info('Gathering diffs...')
    const diffMap = new Map()

    let path = UNKNOWN_FILE
    for (const line of rawDiff.split('\n')) {
        if (line.startsWith('diff --git')) {
            // TODO: Handle spaces in path
            // TODO: Will this continue to work with other GitHub integrations?
            // path = `${process.env.GITHUB_WORKSPACE}/${line.split(' ')[2].substring(2)}`
            path = `${line.split(' ')[2].substring(2)}`

            if (path === undefined) {
                path = UNKNOWN_FILE
            }

            diffMap.set(path, [])
        }

        if (line.startsWith('@@')) {
            let changedLines = line.substring(3)
            changedLines = changedLines.substring(0, changedLines.indexOf(' @@'))

            const linesAddedPosition = changedLines.indexOf('+')
            if (linesAddedPosition > -1) {
                // We only care about the right side because Coverity can only analyze what's there, not what used to be --rotte FEB 2022
                const linesAddedString = changedLines.substring(linesAddedPosition + 1)
                const separatorPosition = linesAddedString.indexOf(',')

                const startLine = parseInt(linesAddedString.substring(0, separatorPosition))
                const lineCount = parseInt(linesAddedString.substring(separatorPosition + 1))
                const endLine = startLine + lineCount - 1

                if (!diffMap.has(path)) {
                    diffMap.set(path, [])
                }
                console.info(`Added ${path}: ${startLine} to ${endLine}`)
                diffMap.get(path)?.push({firstLine: startLine, lastLine: endLine})
            }
        }
    }

    return diffMap
}