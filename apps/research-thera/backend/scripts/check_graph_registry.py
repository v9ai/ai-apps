"""CI: assert app.py's _GRAPH_PATHS matches langgraph.json's graphs."""
import json, sys, ast, pathlib
backend = pathlib.Path(__file__).parent.parent
lj = json.loads((backend/"langgraph.json").read_text())["graphs"]
src = (backend/"app.py").read_text()
tree = ast.parse(src)
paths = None
for node in ast.walk(tree):
    # Plain assignment: `_GRAPH_PATHS = {...}`
    if isinstance(node, ast.Assign) and any(
        isinstance(t, ast.Name) and t.id == "_GRAPH_PATHS" for t in node.targets
    ):
        paths = ast.literal_eval(node.value)
        break
    # Annotated assignment: `_GRAPH_PATHS: dict[str, str] = {...}`
    if (
        isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.target.id == "_GRAPH_PATHS"
        and node.value is not None
    ):
        paths = ast.literal_eval(node.value)
        break
if paths is None:
    sys.exit("could not locate _GRAPH_PATHS assignment in app.py")
if set(paths.keys()) != set(lj.keys()):
    diff_a = set(paths.keys()) - set(lj.keys())
    diff_b = set(lj.keys()) - set(paths.keys())
    sys.exit(f"GRAPH REGISTRY DRIFT: app.py only={diff_a}, langgraph.json only={diff_b}")
print(f"ok: {len(paths)} graphs, registries match")
