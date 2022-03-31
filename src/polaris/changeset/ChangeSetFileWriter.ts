import {Logger} from "winston";
import {logger} from "../../SIGLogger";

var fs = require("fs");
const fse = require('fs-extra');

export default class ChangeSetFileWriter {
    log: Logger;
    constructor(log: Logger) {
        this.log = log;
    }
    async write_change_set_file(file: string, paths: Array<string>) : Promise<number> { //must return something
        await fse.ensureFile(file);

        return new Promise<number>((resolve, reject) => {
            var content = paths.join("\n");
            fs.writeFile(file, content, (err:any) => {
                if (err) {
                    logger.error("Writing change set file failed: " + err)
                    return reject(err);
                } else {
                    logger.info("Created change set file: " + file);
                    return resolve(0);
                }
            });
        });
    }
}