"""
SetVariableNode.execute() — o'zgaruvchi interpolation va assignment.
"""
import pytest
from tests.conftest import make_ctx
from app.runtime.nodes.set_variable import SetVariableNode


def node(config: dict) -> SetVariableNode:
    return SetVariableNode("n1", config)


@pytest.mark.asyncio
async def test_simple_assignment():
    n = node({"assignments": [{"variable": "name", "value": "Ali"}]})
    r = await n.execute(make_ctx())
    assert r.variables["name"] == "Ali"

@pytest.mark.asyncio
async def test_interpolation_from_existing_var():
    n = node({"assignments": [{"variable": "greeting", "value": "Salom {{name}}"}]})
    r = await n.execute(make_ctx(variables={"name": "Vali"}))
    assert r.variables["greeting"] == "Salom Vali"

@pytest.mark.asyncio
async def test_multiple_assignments():
    n = node({"assignments": [
        {"variable": "a", "value": "1"},
        {"variable": "b", "value": "2"},
    ]})
    r = await n.execute(make_ctx())
    assert r.variables["a"] == "1"
    assert r.variables["b"] == "2"

@pytest.mark.asyncio
async def test_overwrite_existing():
    n = node({"assignments": [{"variable": "x", "value": "new"}]})
    r = await n.execute(make_ctx(variables={"x": "old"}))
    assert r.variables["x"] == "new"

@pytest.mark.asyncio
async def test_missing_interpolation_kept_as_placeholder():
    n = node({"assignments": [{"variable": "msg", "value": "{{missing}} var"}]})
    r = await n.execute(make_ctx())
    assert r.variables["msg"] == "{{missing}} var"

@pytest.mark.asyncio
async def test_empty_assignments_preserves_vars():
    n = node({"assignments": []})
    r = await n.execute(make_ctx(variables={"x": "keep"}))
    assert r.variables["x"] == "keep"
