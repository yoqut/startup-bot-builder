from dataclasses import dataclass


@dataclass
class AdminUserOut:
    id: str
    email: str
    full_name: str | None
    role: str
    is_active: bool
    plan_id: int | None
    plan_name: str | None
    bot_count: int
    created_at: str


@dataclass
class AdminBotOut:
    id: str
    name: str
    username: str | None
    is_active: bool
    owner_email: str
    owner_id: str
    flow_count: int
    user_count: int
    created_at: str


@dataclass
class AdminStatsOut:
    total_users: int
    total_bots: int
    total_bot_users: int
    total_events: int
    new_users_today: int
    new_bots_today: int
    active_bots: int


@dataclass
class PlanOut:
    id: int
    name: str
    price: float
    max_bots: int
    max_webapps: int
    max_bot_users: int
    has_ads: bool
    multi_lang: bool
    webhook_access: bool
    ai_nodes: bool
    marketplace: bool
    crm_access: bool
    erp_access: bool
    user_count: int


@dataclass
class SettingOut:
    key: str
    value: str | None
    description: str | None


@dataclass
class PatchUserBody:
    is_active: bool | None = None
    role: str | None = None
    plan_id: int | None = None


@dataclass
class PlanBody:
    name: str = ""
    price: float = 0.0
    max_bots: int = 3
    max_webapps: int = 1
    max_bot_users: int = 500_000
    has_ads: bool = True
    multi_lang: bool = False
    webhook_access: bool = False
    ai_nodes: bool = False
    marketplace: bool = False
    crm_access: bool = False
    erp_access: bool = False


@dataclass
class SettingBody:
    value: str = ""
