import json

import httpx

from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


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
