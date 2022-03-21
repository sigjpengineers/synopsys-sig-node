"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sigmaCreateMessageFromIssue = exports.sigmaUuidCommentOf = exports.sigmaIsInDiff = exports.SIGMA_COMMENT_PREFACE = void 0;
var SIGLogger_1 = require("./SIGLogger");
var fs = __importStar(require("fs"));
exports.SIGMA_COMMENT_PREFACE = '<!-- Comment managed by Synopsys, do not modify! -->';
function sigmaIsInDiff(issue, diffMap) {
    //logger.debug(`Look for ${issue.filepath} in diffMap`)
    var diffHunks = diffMap.get(issue.filepath);
    //logger.debug(`diffHunks=${diffHunks}`)
    if (!diffHunks) {
        return false;
    }
    for (var _i = 0, diffHunks_1 = diffHunks; _i < diffHunks_1.length; _i++) {
        var hunk = diffHunks_1[_i];
        if (issue.location.start.line >= hunk.firstLine && issue.location.start.line <= hunk.lastLine) {
            //logger.debug(`found location in diffHunk`)
            return true;
        }
    }
    return false;
    // JC: For some reason the filter statement below is not working for sigma.
    // TODO: Come back to this.
    //return diffHunks.filter(hunk => hunk.firstLine <= issue.location.start.line).some(hunk => issue.location.start.line <= hunk.lastLine)
}
exports.sigmaIsInDiff = sigmaIsInDiff;
function get_line(filename, line_no) {
    var data = fs.readFileSync(filename, 'utf8');
    var lines = data.split('\n');
    if (+line_no > lines.length) {
        throw new Error('File end reached without finding line');
    }
    return lines[+line_no];
}
var sigmaUuidCommentOf = function (issue) { return "<!-- ".concat(issue.uuid, " -->"); };
exports.sigmaUuidCommentOf = sigmaUuidCommentOf;
function sigmaCreateMessageFromIssue(issue) {
    var _a, _b;
    var issueName = issue.summary;
    var checkerNameString = issue.checker_id;
    var impactString = issue.severity ? issue.severity.impact : 'Unknown';
    var cweString = ((_a = issue.taxonomies) === null || _a === void 0 ? void 0 : _a.cwe) ? ", CWE-".concat((_b = issue.taxonomies) === null || _b === void 0 ? void 0 : _b.cwe[0]) : '';
    var description = issue.desc;
    var remediation = issue.remediation ? issue.remediation : 'Not available';
    var remediationString = issue.remediation ? "## How to fix\r\n ".concat(remediation) : '';
    var suggestion = undefined;
    // JC: Assume only one fix for now
    // TODO: Follow up with roadmap plans for fixes
    if (issue.fixes) {
        var fix = issue.fixes[0];
        var path = issue.filepath;
        // TODO: try/catch for get_line in case file doesn't exist
        var current_line = get_line(path, fix.actions[0].location.start.line - 1);
        SIGLogger_1.logger.debug("current_line=".concat(current_line));
        suggestion = current_line.substring(0, fix.actions[0].location.start.column - 1) + fix.actions[0].contents + current_line.substring(fix.actions[0].location.end.column - 1, current_line.length);
        SIGLogger_1.logger.debug("suggestion=".concat(suggestion));
    }
    var suggestionString = suggestion ? '\n```suggestion\n' + suggestion + '\n```' : '';
    SIGLogger_1.logger.debug("suggestionString=".concat(suggestionString));
    return "".concat(exports.SIGMA_COMMENT_PREFACE, "\n").concat((0, exports.sigmaUuidCommentOf)(issue), "\n# :warning: Sigma Issue - ").concat(issueName, "\n").concat(description, "\n\n_").concat(impactString, " Impact").concat(cweString, "_ ").concat(checkerNameString, "\n\n").concat(remediationString, "\n\n").concat(suggestionString, "\n");
}
exports.sigmaCreateMessageFromIssue = sigmaCreateMessageFromIssue;