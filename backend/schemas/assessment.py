from pydantic import BaseModel, Field

# Chuẩn hóa dữ liệu gửi lên khi nộp bài đánh giá đảm bảo score hợp lệ từ 0 đến 100
class AssessmentSubmit(BaseModel):
    score_percent: float = Field(
        ...,
        ge=0,
        le=100,
        description="Assessment score in percentage (0–100)"
    )
