from pydantic import BaseModel


class NodeData(BaseModel):
    id: str
    type: str
    label: str | None = None
    position_x: float = 0
    position_y: float = 0
    config: dict = {}


class EdgeData(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    label: str | None = None
    condition_key: str | None = None


class FlowCreate(BaseModel):
    name: str = "Main Flow"
    chat_type: str = "user"


class FlowSave(BaseModel):
    name: str | None = None
    nodes: list[NodeData] = []
    edges: list[EdgeData] = []


class FlowResponse(BaseModel):
    id: str
    bot_id: str
    name: str
    chat_type: str = "user"
    is_published: bool
    version: int
    nodes: list[NodeData] = []
    edges: list[EdgeData] = []
    created_at: str
    updated_at: str | None
