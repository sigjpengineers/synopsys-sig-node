import {
    BlackduckApiService,
    IComponentVersion,
    IComponentVulnerability, IRapidScanLicense,
    IRapidScanResults, IRapidScanVulnerability, IRecommendedVersion,
    IUpgradeGuidance
} from "./blackduck-api";
import {logger} from "../SIGLogger";

export const TABLE_HEADER = '| Policies Violated | Dependency | License(s) | Vulnerabilities | Short Term Recommended Upgrade | Long Term Recommended Upgrade |\r\n' + '|-|-|-|-|-|-|\r\n'

export async function createRapidScanReportString(blackduck_url: string, blackduck_api_token: string, policyViolations: IRapidScanResults[], policyCheckWillFail: boolean): Promise<string> {
    let message = ''
    if (policyViolations.length == 0) {
        message = message.concat('# :white_check_mark: None of your dependencies violate policy!')
    } else {
        const violationSymbol = policyCheckWillFail ? ':x:' : ':warning:'
        message = message.concat(`# ${violationSymbol} Found dependencies violating policy!\r\n\r\n`)

        const componentReports = await createRapidScanReport(blackduck_url, blackduck_api_token, policyViolations)
        const tableBody = componentReports.map(componentReport => createComponentRow(componentReport)).join('\r\n')
        const reportTable = TABLE_HEADER.concat(tableBody)
        message = message.concat(reportTable)
    }

    return message
}

function createComponentRow(component: IComponentReport): string {
    const violatedPolicies = component.violatedPolicies.join('<br/>')
    const componentInViolation = component?.href ? `[${component.name}](${component.href})` : component.name
    const componentLicenses = component.licenses.map(license => `${license.violatesPolicy ? ':x: &nbsp; ' : ''}[${license.name}](${license.href})`).join('<br/>')
    const vulnerabilities = component.vulnerabilities.map(vulnerability => `${vulnerability.violatesPolicy ? ':x: &nbsp; ' : ''}[${vulnerability.name}](${vulnerability.href})${vulnerability.cvssScore && vulnerability.severity ? ` ${vulnerability.severity}: CVSS ${vulnerability.cvssScore}` : ''}`).join('<br/>')
    const shortTermString = component.shortTermUpgrade ? `[${component.shortTermUpgrade.name}](${component.shortTermUpgrade.href}) (${component.shortTermUpgrade.vulnerabilityCount} known vulnerabilities)` : ''
    const longTermString = component.longTermUpgrade ? `[${component.longTermUpgrade.name}](${component.longTermUpgrade.href}) (${component.longTermUpgrade.vulnerabilityCount} known vulnerabilities)` : ''

    return `| ${violatedPolicies} | ${componentInViolation} | ${componentLicenses} | ${vulnerabilities} | ${shortTermString} | ${longTermString} |`
}

export async function createRapidScanReport(blackduck_url: string, blackduck_api_token: string, policyViolations: IRapidScanResults[], blackduckApiService?: BlackduckApiService): Promise<IComponentReport[]> {
    const rapidScanReport: IComponentReport[] = []

    if (blackduckApiService === undefined) {
        blackduckApiService = new BlackduckApiService(blackduck_url, blackduck_api_token)
    }

    const bearerToken = await blackduckApiService.getBearerToken()

    for (const policyViolation of policyViolations) {
        const componentIdentifier = policyViolation.componentIdentifier
        const componentVersion = await blackduckApiService.getComponentVersionMatching(bearerToken, componentIdentifier)

        let upgradeGuidance = undefined
        let vulnerabilities = undefined
        if (componentVersion !== null) {
            upgradeGuidance = await blackduckApiService
                .getUpgradeGuidanceFor(bearerToken, componentVersion)
                .then(response => {
                    if (response.result === null) {
                        logger.warn(`Could not get upgrade guidance for ${componentIdentifier}: The upgrade guidance result was empty`)
                        return undefined
                    }

                    return response.result
                })
                .catch(reason => {
                    logger.warn(`Could not get upgrade guidance for ${componentIdentifier}: ${reason}`)
                    return undefined
                })

            const vulnerabilityResponse = await blackduckApiService.getComponentVulnerabilties(bearerToken, componentVersion)
            vulnerabilities = vulnerabilityResponse?.result?.items
        }

        const componentVersionOrUndefined = componentVersion === null ? undefined : componentVersion
        const componentReport = createComponentReport(policyViolation, componentVersionOrUndefined, upgradeGuidance, vulnerabilities)
        rapidScanReport.push(componentReport)
    }

    return rapidScanReport
}
export interface IComponentReport {
    violatedPolicies: string[]
    name: string
    href?: string
    licenses: ILicenseReport[]
    vulnerabilities: IVulnerabilityReport[]
    shortTermUpgrade?: IUpgradeReport
    longTermUpgrade?: IUpgradeReport
}

export function createComponentReport(violation: IRapidScanResults, componentVersion?: IComponentVersion, upgradeGuidance?: IUpgradeGuidance, vulnerabilities?: IComponentVulnerability[]): IComponentReport {
    return {
        violatedPolicies: violation.violatingPolicyNames,
        name: `${violation.componentName} ${violation.versionName}`,
        href: componentVersion?._meta.href,
        licenses: createComponentLicenseReports(violation.policyViolationLicenses, componentVersion),
        vulnerabilities: createComponentVulnerabilityReports(violation.policyViolationVulnerabilities, vulnerabilities),
        shortTermUpgrade: createUpgradeReport(upgradeGuidance?.shortTerm),
        longTermUpgrade: createUpgradeReport(upgradeGuidance?.longTerm)
    }
}

export function createComponentLicenseReports(policyViolatingLicenses: IRapidScanLicense[], componentVersion?: IComponentVersion): ILicenseReport[] {
    let licenseReport = []
    if (componentVersion === undefined) {
        licenseReport = policyViolatingLicenses.map(license => createLicenseReport(license.licenseName, license._meta.href, true))
    } else {
        const violatingPolicyLicenseNames = policyViolatingLicenses.map(license => license.licenseName)
        licenseReport = componentVersion.license.licenses.map(license => createLicenseReport(license.name, license.license, violatingPolicyLicenseNames.includes(license.name)))
    }

    return licenseReport
}

export function createComponentVulnerabilityReports(policyViolatingVulnerabilities: IRapidScanVulnerability[], componentVulnerabilities?: IComponentVulnerability[]): IVulnerabilityReport[] {
    let vulnerabilityReport = []
    if (componentVulnerabilities === undefined) {
        vulnerabilityReport = policyViolatingVulnerabilities.map(vulnerability => createVulnerabilityReport(vulnerability.name, true))
    } else {
        const violatingPolicyVulnerabilityNames = policyViolatingVulnerabilities.map(vulnerability => vulnerability.name)
        vulnerabilityReport = componentVulnerabilities.map(vulnerability => {
            const compVulnBaseScore = vulnerability.useCvss3 ? vulnerability.cvss3.baseScore : vulnerability.cvss2.baseScore
            return createVulnerabilityReport(vulnerability.name, violatingPolicyVulnerabilityNames.includes(vulnerability.name), vulnerability._meta.href, compVulnBaseScore, vulnerability.severity)
        })
    }

    return vulnerabilityReport
}

export interface ILicenseReport {
    name: string
    href: string
    violatesPolicy: boolean
}

export function createLicenseReport(name: string, href: string, violatesPolicy: boolean): ILicenseReport {
    return {
        name: name,
        href: href,
        violatesPolicy: violatesPolicy
    }
}

export interface IVulnerabilityReport {
    name: string
    violatesPolicy: boolean
    href?: string
    cvssScore?: number
    severity?: string
}

export function createVulnerabilityReport(name: string, violatesPolicy: boolean, href?: string, cvssScore?: number, severity?: string): IVulnerabilityReport {
    return {
        name: name,
        violatesPolicy: violatesPolicy,
        href: href,
        cvssScore: cvssScore,
        severity: severity
    }
}

export interface IUpgradeReport {
    name: string
    href: string
    vulnerabilityCount: number
}

export function createUpgradeReport(recommendedVersion?: IRecommendedVersion): IUpgradeReport | undefined {
    if (recommendedVersion === undefined) {
        return undefined
    }

    return {
        name: recommendedVersion.versionName,
        href: recommendedVersion.version,
        vulnerabilityCount: Object.values(recommendedVersion.vulnerabilityRisk).reduce((accumulatedValues, value) => accumulatedValues + value, 0)
    }
}