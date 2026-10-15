from __future__ import annotations

import re
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Deliberately simple: one "@", no spaces, a dot in the domain. Real
# deliverability is only known once alerts actually send mail.
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_EMAIL_LENGTH = 254
MAX_WATCH_TERMS = 10
MAX_TERM_LENGTH = 80
MAX_COMMENT_LENGTH = 500


class WatchPlacement(StrEnum):
    HOME_TEASER = "home_teaser"
    EMPTY_RESULTS = "empty_results"
    RESULTS = "results"
    DETAIL = "detail"


class SignupSource(StrEnum):
    HOME = "home"
    HOW_IT_WORKS = "how_it_works"


class HeardFrom(StrEnum):
    FRIEND_OR_FAMILY = "friend_or_family"
    SOCIAL_MEDIA = "social_media"
    SEARCH = "search"
    OTHER = "other"


class VisitReason(StrEnum):
    FOOD_AT_HOME = "food_at_home"
    BRAND_I_BUY = "brand_i_buy"
    IN_THE_NEWS = "in_the_news"
    JUST_CURIOUS = "just_curious"


class AlertInterest(StrEnum):
    YES = "yes"
    MAYBE = "maybe"
    NO = "no"


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AlertSignupRequest(_StrictModel):
    email: str = Field(min_length=3, max_length=MAX_EMAIL_LENGTH)
    watch_terms: list[str] = Field(default_factory=list, max_length=MAX_WATCH_TERMS)
    source: SignupSource = SignupSource.HOW_IT_WORKS

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        if not _EMAIL_PATTERN.match(value):
            raise ValueError("Enter a valid email address")
        return value.lower()

    @field_validator("watch_terms")
    @classmethod
    def _clean_terms(cls, values: list[str]) -> list[str]:
        cleaned: list[str] = []
        for value in values:
            term = " ".join(value.split())[:MAX_TERM_LENGTH]
            if term and term.lower() not in {existing.lower() for existing in cleaned}:
                cleaned.append(term)
        return cleaned


class SurveyResponseRequest(_StrictModel):
    heard_from: HeardFrom | None = None
    visit_reason: VisitReason | None = None
    wants_alerts: AlertInterest | None = None
    comment: str | None = Field(default=None, max_length=MAX_COMMENT_LENGTH)

    def is_empty(self) -> bool:
        return not any(
            (self.heard_from, self.visit_reason, self.wants_alerts, self.comment)
        )


class WatchEventRequest(_StrictModel):
    placement: WatchPlacement
