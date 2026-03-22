from datetime import date

from pydantic import BaseModel, Field, model_validator


class GradeRange(BaseModel):
    min_grade: int | None = Field(default=None, ge=0)
    max_grade: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_range(self) -> "GradeRange":
        if self.min_grade is not None and self.max_grade is not None and self.min_grade > self.max_grade:
            raise ValueError("min_grade must be less than or equal to max_grade")
        return self


class JobLocation(BaseModel):
    city: str | None = None
    region: str | None = None
    country: str | None = None
    remote: bool = False


class PostingDates(BaseModel):
    posted_date: date | None = None
    closes_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "PostingDates":
        if self.posted_date and self.closes_date and self.posted_date > self.closes_date:
            raise ValueError("posted_date must be on or before closes_date")
        return self


class NormalizedJob(BaseModel):
    job_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    company: str = Field(min_length=1)
    location: JobLocation
    grade_range: GradeRange | None = None
    posting_dates: PostingDates | None = None
    source_url: str | None = None