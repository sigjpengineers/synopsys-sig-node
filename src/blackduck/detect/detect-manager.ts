import path from 'path'
import {logger} from "../../SIGLogger";

const DETECT_BINARY_REPO_URL = 'https://sig-repo.synopsys.com'
export const TOOL_NAME = 'detect'

const DETECT_LATEST_VERSION="7.11.1"

/*
export async function githubFindOrDownloadDetect(detect_version: string=DETECT_LATEST_VERSION): Promise<string> {
  const jarName = `synopsys-detect-${detect_version}.jar`

  const cachedDetect = find(TOOL_NAME, detect_version)
  if (cachedDetect) {
    return path.resolve(cachedDetect, jarName)
  }

  const detectDownloadUrl = createDetectDownloadUrl()

  return (
    downloadTool(detectDownloadUrl)
      .then(detectDownloadPath => cacheFile(detectDownloadPath, jarName, TOOL_NAME, detect_version))
      //TODO: Jarsigner?
      .then(cachedFolder => path.resolve(cachedFolder, jarName))
  )
}
 */

export async function findOrDownloadDetect(download_dir: string, verbose: boolean=false, detect_version: string=DETECT_LATEST_VERSION): Promise<string> {
  const jarName = `synopsys-detect-${detect_version}.jar`

  const detectDownloadUrl = createDetectDownloadUrl()

  const Downloader = require("nodejs-file-downloader")

  logger.info(`Downloading ${detectDownloadUrl}`)
  const downloader = new Downloader({
    url: detectDownloadUrl,
    directory: download_dir,
    onProgress: function (percentage: any, chunk: any, remainingSize: any) {
      if (verbose) {
        logger.info(`%${percentage} ${remainingSize} bytes remaining`)
      }
    },
  });

  try {
    await downloader.download();
  } catch (error) {
    logger.error(`Unable to download file: ${error}`)
  }

  return(path.resolve(download_dir, jarName))
}


/*
export async function githubRunDetect(detectPath: string, detectArguments: string[]): Promise<number> {
  return exec(`java`, ['-jar', detectPath].concat(detectArguments), { ignoreReturnCode: true })
}
*/

export async function runDetect(detectPath: string, detectArguments: string[]): Promise<number> {
  logger.info(`Step 1`)
  const JavaCaller = require('java-caller');
  logger.info(`Step 2`)

  const JAVA_CALLER_OPTIONS = {
    jar: detectPath
  }
  logger.info(`Step 3`)

  const java = new JavaCaller(JAVA_CALLER_OPTIONS)
  logger.info(`Step 4`)

  const {status, stdout, stderr} = java.run(detectArguments)

  return status
}

export function createDetectDownloadUrl(repoUrl = DETECT_BINARY_REPO_URL, detect_version: string = DETECT_LATEST_VERSION): string {
  return `${repoUrl}/bds-integrations-release/com/synopsys/integration/synopsys-detect/${detect_version}/synopsys-detect-${detect_version}.jar`
}
