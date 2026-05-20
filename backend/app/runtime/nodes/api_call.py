import ipaddress
import json
import socket
from urllib.parse import urlparse

import httpx

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

# Private/reserved ranges that bot owners must not reach
_BLOCKED_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local / AWS metadata
    ipaddress.ip_network("100.64.0.0/10"),   # shared address space
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def _is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname or ""
        if not host:
            return False
        # Resolve to IP(s) and reject any private address
        addr_infos = socket.getaddrinfo(host, None)
        for info in addr_infos:
            try:
                ip = ipaddress.ip_address(info[4][0])
                for net in _BLOCKED_NETS:
                    if ip in net:
                        return False
            except ValueError:
                return False
        return True
    except Exception:
        return False


def _render_dict(d: dict, variables: dict) -> dict:
    text = json.dumps(d)
    for k, v in variables.items():
        text = text.replace(f"{{{{{k}}}}}", str(v))
    return json.loads(text)


class ApiCallNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        url = self._render(self.config.get("url", ""), ctx.variables)
        method = self.config.get("method", "GET").upper()
        headers = _render_dict(self.config.get("headers", {}), ctx.variables)
        body = _render_dict(self.config.get("body", {}), ctx.variables)
        response_var = self.config.get("response_variable", "api_result")

        if not _is_safe_url(url):
            result: dict = {"error": "URL not allowed (private/internal addresses blocked)"}
            variables = {**ctx.variables, response_var: result}
            return ExecutionResult(
                next_node_id=self.config.get("next_node_id"),
                variables=variables,
            )

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.request(
                    method, url, headers=headers, json=body or None
                )
                result = resp.json()
        except Exception as e:
            result = {"error": str(e)}

        variables = {**ctx.variables, response_var: result}
        return ExecutionResult(
            next_node_id=self.config.get("next_node_id"),
            variables=variables,
        )
