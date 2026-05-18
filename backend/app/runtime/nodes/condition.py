from app.runtime.nodes.base import BaseNode, ExecutionContext, ExecutionResult

OPERATORS = {
    "equals": lambda a, b: str(a) == str(b),
    "not_equals": lambda a, b: str(a) != str(b),
    "contains": lambda a, b: str(b).lower() in str(a).lower(),
    "greater_than": lambda a, b: float(a) > float(b),
    "less_than": lambda a, b: float(a) < float(b),
    "is_empty": lambda a, _: not bool(a),
}


class ConditionNode(BaseNode):
    async def execute(self, ctx: ExecutionContext) -> ExecutionResult:
        variable = self.config.get("variable", "")
        operator = self.config.get("operator", "equals")
        value = self.config.get("value", "")
        true_node = self.config.get("true_node_id")
        false_node = self.config.get("false_node_id")

        actual = ctx.variables.get(variable, "")
        fn = OPERATORS.get(operator, OPERATORS["equals"])

        try:
            result = fn(actual, value)
        except ValueError, TypeError:
            result = False

        return ExecutionResult(
            next_node_id=true_node if result else false_node,
            variables=ctx.variables,
            handle="true" if result else "false",
        )
