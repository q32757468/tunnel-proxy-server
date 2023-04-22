import ProxyIP from "./ProxyIP";

type IPMatchUrlMode = keyof Pick<URL, "host" | "hostname" | "href" | "origin">;
type IPMatchBaseMode = "";
type IPMatchFunc = (url: URL) => string;
interface GetIPOptions {
  /** 匹配之前消费国的ip，仅http请求时有效 */
  matcher?: IPMatchUrlMode | IPMatchFunc | IPMatchBaseMode;
  /** 反匹配消费过的ip，详情见 matcher */
  matchReverse?: boolean;
}

export default abstract class Provider {
  /** 已经提取的ip池 */
  pool: ProxyIP[] = [];
  /** 通道数，最大的同时可用的ip数量 */
  abstract parallels: number;
  /** 一次拉取ip的数量，默认为2 */
  pullCount = 1;
  /** 当前的ip使用映射关系 */
  pullingMap = new Map<string, Promise<ProxyIP> | undefined>();

  /** 有效ip的ip池 */
  get validPool() {
    return this.pool.filter((ip) => ip.valid);
  }

  /** 从IP池中取出一个可用的IP */
  async getIp(url: string, options?: GetIPOptions) {
    const { matcher: ipMatcher } = options ?? {};

    let target: ProxyIP;
    const fullUrl = new URL(url.startsWith("http") ? url : `http://${url}`);
    const getMatchKey = () => {
      /** 为空则表示不使用任何匹配规则，也即全部ip共用 */
      if (!ipMatcher) {
        return "";
      }

      /** 函数匹配模式 */
      if (typeof ipMatcher === "function") {
        return ipMatcher(fullUrl);
      }

      /** 字符串匹配模式，根据特定模式来进行匹配 */
      if (typeof ipMatcher === "string") {
        return fullUrl[ipMatcher];
      }

      return "";
    };
    const matchKey = getMatchKey();

    const matches = this.validPool.filter((ip) =>
      ip.history.some((h) => h.matchKey === matchKey)
    );

    /** 如果有匹配结果则使用第一个匹配到的ip */
    target = matches[0] ?? this.validPool[0];

    const getPullTarget = async () => {
      /** 如果没有正在使用中的ip则从请求中获取 */
      const pulling = this.pullingMap.get(matchKey);
      const request =
        pulling ?? this.pullToPool(this.pullCount).then((ips) => ips[0]);
      this.pullingMap.set(matchKey, request);
      const ip = await request;
      this.pullingMap.set(matchKey, undefined);

      return ip;
    };

    target = target ?? (await getPullTarget());

    target.pushHistory(fullUrl.href, matchKey);

    return target;
  }

  /**
   * 从远程拉取可用的ip
   */
  abstract pull(count?: number): Promise<ProxyIP[]>;

  pushToPool(...args: ProxyIP[]) {
    this.pool.push(...args);
    /** 每次添加ip进来后过滤掉不可用的ip */
    this.pool = this.pool.filter((ip) => ip.valid);
  }

  async pullToPool(...args: Parameters<typeof this.pull>) {
    const ips = await this.pull(...args);
    this.pushToPool(...ips);
    return ips;
  }
}
