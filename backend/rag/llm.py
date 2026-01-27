def call_llm(prompt: str):
    # Tạm thời giả lập LLM
    return f"[AI RESPONSE]\n{prompt[:500]}..."

def generate_answer(
    context: str,
    question: str,
    adaptive_recommendation: dict | None = None
):
    system_prompt = "Bạn là trợ lý học tập AI."

    if adaptive_recommendation:
        system_prompt += f"""
        Trình độ: {adaptive_recommendation['level']}
        Trọng tâm: {adaptive_recommendation['focus']}
        """

    prompt = f"""
    {system_prompt}

    Tài liệu:
    {context}

    Câu hỏi:
    {question}
    """

    return call_llm(prompt)
