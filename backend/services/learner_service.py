from sqlalchemy.orm import Session
from db import crud

def process_assessment(db: Session, user_id: int, score_percent: float):
    """
    score_percent: giá trị từ 0 đến 100
    """

    # 1. Lưu kết quả đánh giá
    crud.save_assessment_result(db, user_id, score_percent)

    # 2. Xác định level
    if score_percent < 40:
        level = "Beginner"
    elif score_percent < 70:
        level = "Intermediate"
    else:
        level = "Advanced"

    # 3. Cập nhật hồ sơ học viên
    crud.create_or_update_profile(db, user_id, level)

    # 4. Ghi learning history
    crud.log_learning_action(
        db,
        user_id,
        f"Assessment score {score_percent}% → Level {level}"
    )

    return level
