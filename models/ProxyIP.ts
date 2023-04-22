interface HistoryRecord {
  /** 消费ip的请求地址 */
  href: string;
  /** 消费时间 */
  time: Date;
  /** 用来匹配的key */
  matchKey: string;
}

export default class ProxyIP {
  /** 完整的代理地址：ip + 端口 */
  address: string;
  /** 地区 */
  region?: string;
  /** 运营商 */
  isp?: string;
  /** 过期时间 */
  expires?: Date;
  /** 消费历史 */
  history: HistoryRecord[] = [];
  /** 鉴权用户名 */
  username?: string;
  /** 鉴权密码 */
  password?: string;
  /** 代理协议，默认为http */
  protocol?: string = "http";

  /** ip地址 */
  get ip() {
    return this.address.split(":")[0];
  }
  /** 端口号 */
  get port() {
    return this.address.split(":")[1];
  }
  /** 当前的ip是否有效 */
  get valid() {
    if (!this.expires) return true;
    return new Date().getTime() < this.expires.getTime();
  }

  /** 是否被消费 */
  get occupied() {
    return this.history.length > 0;
  }

  constructor(
    options: Partial<Omit<ProxyIP, "address">> & Pick<ProxyIP, "address">
  ) {
    const { address, ...rest } = options;

    this.address = address;
    Object.assign(this, rest);
  }

  pushHistory(href: string, matchKey: string) {
    const now = new Date();
    const historyItem: HistoryRecord = {
      href,
      time: now,
      matchKey,
    };

    this.history.push(historyItem);
  }

  toURL() {
    const authInfo = [this.username, this.password];
    const authStr = this.username ? authInfo.join(":") + "@" : "";
    return `${this.protocol}://${authStr}${this.address}`;
  }
}
