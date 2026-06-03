"""
ConditionNode.execute() — barcha operator turlarini tekshiradi.
"""
import pytest
import pytest_asyncio
from tests.conftest import make_ctx
from app.runtime.nodes.condition import ConditionNode


def node(config: dict) -> ConditionNode:
    return ConditionNode("n1", config)


@pytest.mark.asyncio
async def test_equals_true():
    n = node({"variable": "x", "operator": "equals", "value": "5"})
    ctx = make_ctx(variables={"x": "5"})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_equals_false():
    n = node({"variable": "x", "operator": "equals", "value": "5"})
    ctx = make_ctx(variables={"x": "3"})
    r = await n.execute(ctx)
    assert r.handle == "false"

@pytest.mark.asyncio
async def test_not_equals():
    n = node({"variable": "x", "operator": "not_equals", "value": "5"})
    ctx = make_ctx(variables={"x": "3"})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_contains():
    n = node({"variable": "msg", "operator": "contains", "value": "salom"})
    ctx = make_ctx(variables={"msg": "u salom berdi"})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_greater_than():
    n = node({"variable": "age", "operator": "greater_than", "value": "18"})
    ctx = make_ctx(variables={"age": "25"})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_less_than():
    n = node({"variable": "age", "operator": "less_than", "value": "18"})
    ctx = make_ctx(variables={"age": "10"})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_is_empty_true():
    n = node({"variable": "val", "operator": "is_empty", "value": ""})
    ctx = make_ctx(variables={"val": ""})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_is_empty_false():
    n = node({"variable": "val", "operator": "is_empty", "value": ""})
    ctx = make_ctx(variables={"val": "something"})
    r = await n.execute(ctx)
    assert r.handle == "false"

@pytest.mark.asyncio
async def test_missing_variable_treated_as_empty():
    n = node({"variable": "nonexistent", "operator": "equals", "value": ""})
    ctx = make_ctx(variables={})
    r = await n.execute(ctx)
    assert r.handle == "true"

@pytest.mark.asyncio
async def test_invalid_numeric_comparison_returns_false():
    n = node({"variable": "x", "operator": "greater_than", "value": "abc"})
    ctx = make_ctx(variables={"x": "5"})
    r = await n.execute(ctx)
    assert r.handle == "false"

@pytest.mark.asyncio
async def test_unknown_operator_defaults_to_equals():
    n = node({"variable": "x", "operator": "nonexistent", "value": "5"})
    ctx = make_ctx(variables={"x": "5"})
    r = await n.execute(ctx)
    assert r.handle == "true"
