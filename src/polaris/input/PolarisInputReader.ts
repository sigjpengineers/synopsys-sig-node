import { PolarisTaskInputs } from "../model/PolarisTaskInput";
import PolarisProxyInfo from "../model/PolarisProxyInfo";
import proxy from "proxy-agent";
import PolarisConnection from "../model/PolarisConnection";

export default class PolarisInputReader {
    getPolarisInputs(polaris_url: string, polaris_token: string,
                     proxy_url: string, proxy_username: string, proxy_password: string,
                     build_command: string,
                     should_wait_for_issues: boolean,
                     should_changeset: boolean,
                     should_changeset_fail: boolean): PolarisTaskInputs {
        var polaris_proxy_info: PolarisProxyInfo | undefined = undefined;

        polaris_proxy_info = new PolarisProxyInfo(proxy_url, proxy_username, proxy_password);

        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            polaris_url = polaris_url.slice(0, -1);
        }

        return {
            polaris_connection: new PolarisConnection(polaris_url, polaris_token, polaris_proxy_info),
            build_command: build_command,
            should_wait_for_issues: should_wait_for_issues,
            should_empty_changeset_fail: should_changeset_fail,
            should_populate_changeset: should_changeset
        }
    }
}
