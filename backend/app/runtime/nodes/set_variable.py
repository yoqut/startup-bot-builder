from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult


class SetVariableNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        assignments = self.config.get("assignments", [])
        variables = dict(ctx.variables)

        for a in assignments:
            var = a.get("variable", "").strip()
            val = a.get("value", "")
            if var:
                # Simple {{other_var}} interpolation in value
                variables[var] = self._render(str(val), variables)

        next_node_id = self.config.get("next_node_id")
        return ExecutionResult(next_node_id=next_node_id, variables=variables)
