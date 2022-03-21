"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.azGetDiffMap = exports.azCreateReviewComment = exports.azUpdateComment = exports.azGetExistingReviewThreads = exports.UNKNOWN_FILE = void 0;
exports.UNKNOWN_FILE = 'Unknown File';
function azGetExistingReviewThreads(git_agent, repo_id, pull_id) {
    return __awaiter(this, void 0, void 0, function () {
        var threads, _i, threads_1, thread, _a, _b, comment;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    threads = [];
                    return [4 /*yield*/, git_agent.getThreads(repo_id, pull_id)];
                case 1:
                    threads = _c.sent();
                    if (threads && threads.length > 0) {
                        for (_i = 0, threads_1 = threads; _i < threads_1.length; _i++) {
                            thread = threads_1[_i];
                            //logger.info(`DEBUG: thread id=${thread.id}`)
                            if (thread.comments) {
                                for (_a = 0, _b = thread.comments; _a < _b.length; _a++) {
                                    comment = _b[_a];
                                    //logger.info(`DEBUG: comment=${comment.content}`)
                                }
                            }
                        }
                    }
                    return [2 /*return*/, threads];
            }
        });
    });
}
exports.azGetExistingReviewThreads = azGetExistingReviewThreads;
function azUpdateComment(git_agent, repo_id, pull_id, thread_id, comment_id, comment_body) {
    return __awaiter(this, void 0, void 0, function () {
        var updated_comment, comment;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updated_comment = {};
                    updated_comment.content = comment_body;
                    return [4 /*yield*/, git_agent.updateComment(updated_comment, repo_id, pull_id, thread_id, comment_id)];
                case 1:
                    comment = _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
exports.azUpdateComment = azUpdateComment;
function azCreateReviewComment(git_agent, repo_id, pull_id, issue, comment_body) {
    return __awaiter(this, void 0, void 0, function () {
        var comment, thread, new_thread;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    comment = {};
                    comment.content = comment_body;
                    comment.parentCommentId = 0;
                    comment.commentType = 1;
                    thread = {};
                    thread.threadContext = {};
                    thread.threadContext.filePath = "/" + issue.filepath;
                    thread.threadContext.rightFileStart = {};
                    thread.threadContext.rightFileStart.line = issue.location.start.line;
                    thread.threadContext.rightFileStart.offset = 1;
                    thread.threadContext.rightFileEnd = {};
                    thread.threadContext.rightFileEnd.line = issue.location.start.line;
                    thread.threadContext.rightFileEnd.offset = 1;
                    thread.status = 1; // Active
                    thread.comments = [comment];
                    return [4 /*yield*/, git_agent.createThread(thread, repo_id, pull_id)];
                case 1:
                    new_thread = _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
exports.azCreateReviewComment = azCreateReviewComment;
function azGetDiffMap(git_agent, repo_id, project_id, pull_id) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var diffMap, path, commits, _i, commits_1, commit, changes, _b, _c, change, diff_criteria, fileDiffParam, diffs, _d, diffs_1, diff, _e, _f, diffBlock;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    diffMap = new Map();
                    path = exports.UNKNOWN_FILE;
                    return [4 /*yield*/, git_agent.getPullRequestCommits(repo_id, pull_id)];
                case 1:
                    commits = _g.sent();
                    if (!commits) return [3 /*break*/, 8];
                    _i = 0, commits_1 = commits;
                    _g.label = 2;
                case 2:
                    if (!(_i < commits_1.length)) return [3 /*break*/, 8];
                    commit = commits_1[_i];
                    if (!commit.commitId) return [3 /*break*/, 7];
                    return [4 /*yield*/, git_agent.getChanges(commit.commitId, repo_id)];
                case 3:
                    changes = _g.sent();
                    if (!(changes && changes.changes)) return [3 /*break*/, 7];
                    _b = 0, _c = changes.changes;
                    _g.label = 4;
                case 4:
                    if (!(_b < _c.length)) return [3 /*break*/, 7];
                    change = _c[_b];
                    if (!(change && change.item)) return [3 /*break*/, 6];
                    diff_criteria = {};
                    diff_criteria.baseVersionCommit = change.item.commitId;
                    diff_criteria.targetVersionCommit = change.item.commitId;
                    fileDiffParam = {};
                    fileDiffParam.path = change.item.path;
                    diff_criteria.fileDiffParams = [fileDiffParam];
                    return [4 /*yield*/, git_agent.getFileDiffs(diff_criteria, project_id, repo_id)];
                case 5:
                    diffs = _g.sent();
                    for (_d = 0, diffs_1 = diffs; _d < diffs_1.length; _d++) {
                        diff = diffs_1[_d];
                        //logger.info(`DEBUG: diff path=${diff.path}`)
                        if (diff.lineDiffBlocks) {
                            for (_e = 0, _f = diff.lineDiffBlocks; _e < _f.length; _e++) {
                                diffBlock = _f[_e];
                                //logger.info(`diff block mlineStart=${diffBlock.modifiedLineNumberStart} mlineCount=${diffBlock.modifiedLinesCount}`)
                                //logger.info(`diff block olineStart=${diffBlock.originalLineNumberStart} olineCount=${diffBlock.originalLinesCount}`)
                                if (change && change.item && change.item.path) {
                                    if (!diffMap.has(change.item.path.substring(1))) {
                                        diffMap.set(change.item.path.substring(1), []);
                                    }
                                    //logger.info(`DEBUG: Added ${change.item.path.substring(1)}: ${diffBlock.modifiedLineNumberStart} to ${diffBlock.modifiedLineNumberStart + diffBlock.modifiedLinesCount}`)
                                    (_a = diffMap.get(change.item.path.substring(1))) === null || _a === void 0 ? void 0 : _a.push({
                                        firstLine: diffBlock.modifiedLineNumberStart,
                                        lastLine: diffBlock.modifiedLineNumberStart ? diffBlock.modifiedLineNumberStart : 0 + (diffBlock.modifiedLinesCount ? diffBlock.modifiedLinesCount : 0)
                                    });
                                }
                            }
                        }
                    }
                    _g.label = 6;
                case 6:
                    _b++;
                    return [3 /*break*/, 4];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [2 /*return*/, diffMap];
            }
        });
    });
}
exports.azGetDiffMap = azGetDiffMap;