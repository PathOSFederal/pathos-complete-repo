from pydantic import BaseModel, Field


class UserProfileSnapshot(BaseModel):
    user_id: str = Field(min_length=1)
    years_experience: int = Field(ge=0)
    target_roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)
    authorized_to_work: bool = True