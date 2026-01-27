def recommend_learning_path(level: str):
    if level == "Beginner":
        return [
            "Ôn tập khái niệm cơ bản",
            "Ví dụ trực quan",
            "Bài tập mức dễ"
        ]
    elif level == "Intermediate":
        return [
            "Bài tập ứng dụng",
            "Tình huống thực tế",
            "Mini project"
        ]
    else:
        return [
            "Case study nâng cao",
            "Dự án thực tế",
            "Nghiên cứu mở rộng"
        ]

def recommend(level: str):
    """
    Rule-based Adaptive Agent
    Input: learner level
    Output: personalized learning recommendation
    """
    if level == "Beginner":
        return {
            "level": level,
            "focus": "Nền tảng",
            "learning_path": [
                "Ôn tập khái niệm cơ bản",
                "Ví dụ trực quan",
                "Bài tập mức dễ"
            ],
            "content_strategy": [
                "Học từng bước",
                "Lặp lại kiến thức",
                "Feedback ngay"
            ]
        }

    elif level == "Intermediate":
        return {
            "level": level,
            "focus": "Ứng dụng",
            "learning_path": [
                "Bài tập ứng dụng",
                "Tình huống thực tế",
                "Mini project"
            ],
            "content_strategy": [
                "Học qua ví dụ",
                "So sánh – phân tích",
                "Thực hành thường xuyên"
            ]
        }

    return {
        "level": level,
        "focus": "Nâng cao",
        "learning_path": [
            "Case study nâng cao",
            "Dự án thực tế",
            "Nghiên cứu mở rộng"
        ],
        "content_strategy": [
            "Tự nghiên cứu",
            "Làm dự án",
            "Đánh giá phản biện"
        ]
    }
