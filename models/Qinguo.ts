import Provider from "./Provider";
import ProxyIP from "./ProxyIP";
import fetch from "node-fetch";
import ono from "ono";

interface QinguoIPResponse {
  code: string;
  data?: QinguoIPRecord[];
  message?: string;
  request_id: string;
}

interface QinguoIPRecord {
  server: string;
  area: string;
  isp: string;
  deadline: string;
}

const { QINGUO_KEY, QINGUO_PASSWORD } = process.env;

const NAMESPACE = "Qinguo";

export default class Qinguo extends Provider {
  parallels = 5;

  async pull(count: number = 5): Promise<ProxyIP[]> {
    const response: QinguoIPResponse = await fetch(
      `https://share.proxy.qg.net/get?key=${QINGUO_KEY}&num=${count}&area=330100&isp=&format=json&seq=&distinct=0&pool=1`
    ).then((r) => r.json());

    if (response.code !== "SUCCESS") {
      return Promise.reject(
        ono({
          provider: NAMESPACE,
          code: response.code,
          message: response.message,
        })
      );
    }

    const ips =
      response.data?.map(
        (item: QinguoIPRecord) =>
          new ProxyIP({
            address: item.server,
            region: item.area,
            isp: item.isp,
            expires: new Date(item.deadline),
            username: QINGUO_KEY,
            password: QINGUO_PASSWORD,
          })
      ) || [];

    return ips;
  }
}
