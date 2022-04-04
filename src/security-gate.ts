import {logger} from "./SIGLogger";

const CaseInsensitiveMap = require('case-insensitive-map')

export function readSecurityGateFiltersFromString(securityGateString: string): typeof CaseInsensitiveMap {
    const securityGateJson = JSON.parse(securityGateString)
    let securityGateMap = new CaseInsensitiveMap()
    logger.debug(`Reading security gate filters`)

    Object.keys(securityGateJson).forEach(function(key) {
        var values = securityGateJson[key]
        logger.debug(`  ${key}`)
        securityGateMap.set(key, new Array())
        for (const value of values) {
            securityGateMap.get(key)?.push(value)
            logger.debug(`    ${value}`)
        }
    })

    return(securityGateMap)
}

export function isIssueAllowed(securityFilters: typeof CaseInsensitiveMap,
                        severity: string,
                        cwe: string,
                        isNew: boolean = false): boolean {
    if (securityFilters.get("status") && isNew && securityFilters.get("status")?.indexOf("new") >= 0) {
        return(false)
    }

    if (securityFilters.get("severity") && securityFilters.get("severity")?.indexOf(severity) >= 0) {
        return(false)
    }

    if (securityFilters.get("cwe")) {
        const cweValues = cwe.split(', ')
        for (const cweValue of cweValues) {
            for (cwe of securityFilters.get("cwe")) {
                if (cwe == cweValue) {
                    return (false)
                }
            }
        }
    }

    return(true)
}