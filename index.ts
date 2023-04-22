require("dotenv").config();
import { Server } from "proxy-chain";
import ono from "ono";
import Qinguo from "./models/Qinguo";

const provider = new Qinguo();

const PORT = 3004;

const server = new Server({
  port: PORT,
  verbose: true,
  prepareRequestFunction: async (options) => {
    const { request, hostname, port } = options;
    let upstreamProxyUrl;
    try {
      const proxyIp = await provider.getIp(
        request.url ?? `${hostname}:${port}`
      );
      upstreamProxyUrl = proxyIp.toURL();
    } catch (error: any) {
      console.log(ono(error, "获取ip时发生异常，已切换到默认代理"));
    }
    return {
      upstreamProxyUrl,
    };
  },
});

server.listen(() => {
  console.log(`Proxy server is listening on port ${PORT}`);
});

// Emitted when HTTP request fails
server.on("requestFailed", ({ request, error }) => {
  console.log(`Request ${request.url} failed`);
  console.error(error);
});
