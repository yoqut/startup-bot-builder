"""
BaseNode._render() — o'zgaruvchi interpolation.
"""
import pytest
from app.runtime.nodes.set_variable import SetVariableNode  # concrete subclass


def node():
    return SetVariableNode("n", {})


def test_render_simple():
    n = node()
    assert n._render("Salom {{name}}", {"name": "Ali"}) == "Salom Ali"

def test_render_multiple():
    n = node()
    result = n._render("{{a}} va {{b}}", {"a": "x", "b": "y"})
    assert result == "x va y"

def test_render_missing_var_kept():
    n = node()
    result = n._render("{{noma'lum}}", {})
    assert "{{noma'lum}}" in result

def test_render_no_vars():
    n = node()
    assert n._render("oddiy matn", {}) == "oddiy matn"

def test_render_numeric_value():
    n = node()
    assert n._render("Yosh: {{age}}", {"age": 25}) == "Yosh: 25"

def test_render_empty_string():
    n = node()
    assert n._render("", {"x": "y"}) == ""

def test_render_adjacent_vars():
    n = node()
    result = n._render("{{first}}{{last}}", {"first": "Ali", "last": "Vali"})
    assert result == "AliVali"
