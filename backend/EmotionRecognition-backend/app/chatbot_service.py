import os
import uuid

from google.genai import types
from google import genai

from app.extensions import db
from app.models.db_models import Message


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
CHAT_MODEL = "gemini-2.5-flash"
CHAT_SYSTEM_INSTRUCTION = """You are a helpful mental health chatbot,
    trying to provide advice without taking the role of a trained professional.
    You want to help users get a better insight on their own emotions.
    If any topic ever becomes extremely serious that may best be handled by a trained professional, please cease giving professional advice, and instruct user to refer to online and local resources for professional assistance.
    You are a chat-bot, so keep your responses concise but informative.
    """

def _extract_gemini_text(response):
    candidates = getattr(response, "candidates", None) or []
    combined_parts = []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                combined_parts.append(part_text)

    if combined_parts:
        return "".join(combined_parts)

    text = getattr(response, "text", None)
    if text:
        return text

    return ""

def _format_scores_for_prompt(emotion_scores):
    if emotion_scores is None:
        return "No score data provided."

    if isinstance(emotion_scores, dict):
        pairs = []
        for label, value in emotion_scores.items():
            try:
                score = float(value)
            except (TypeError, ValueError):
                continue
            # Scores from model are usually [0,1]. Convert to percentages for readability.
            percent = score * 100.0 if score <= 1.0 else score
            pairs.append((label, percent))
        if not pairs:
            return "No numeric score data provided."
        return ", ".join(f"{label}: {percent:.1f}%" for label, percent in pairs)

    if isinstance(emotion_scores, (list, tuple)):
        pairs = []
        for item in emotion_scores:
            if not isinstance(item, dict):
                continue
            label = item.get("label")
            value = item.get("probability")
            if label is None or value is None:
                continue
            try:
                score = float(value)
            except (TypeError, ValueError):
                continue
            percent = score * 100.0 if score <= 1.0 else score
            pairs.append((label, percent))
        if pairs:
            return ", ".join(f"{label}: {percent:.1f}%" for label, percent in pairs)

    return str(emotion_scores)


def quickEval(determined_label, emotion_scores):
    formatted_scores = _format_scores_for_prompt(emotion_scores)
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction="""
                You write one short, empathetic mental-health check-in message.
                Mention the likely feeling and suggest one gentle next step.
                Keep it to 1 sentence and under 25 words.
                """,
        ),
    )
    prompt = (
        f"Determined label: {determined_label}\n"
        f"Emotion percentages by label: {formatted_scores}\n\n"
        "Return only the short suggestion message."
    )
    try:
        response = chat.send_message(prompt)
        text = _extract_gemini_text(response).strip()
        if text:
            return text
    except Exception:
        pass
    return f"You seem {determined_label.lower()}. Try one small calming activity and check in with yourself again soon."

def _chat_config():
    return types.GenerateContentConfig(
        system_instruction=CHAT_SYSTEM_INSTRUCTION,
    )


def _build_gemini_history(user_id, limit=10):
    rows = (
        Message.query.filter_by(user_id=int(user_id))
        .order_by(Message.id.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()

    role_map = {
        "user": "user",
        "assistant": "model",
    }
    history = []
    for row in rows:
        text = (row.textMessage or "").strip()
        mapped_role = role_map.get(row.role)
        if not text or not mapped_role:
            continue
        history.append(
            {
                "role": mapped_role,
                "parts": [{"text": text}],
            }
        )
    return history


def createChat(history=None):
    chat = client.chats.create(
        model=CHAT_MODEL,
        config=_chat_config(),
        history=history or [],
    )
    return chat


# def create_chat_session_with_id(user_id):
#     session = Session(user_id=user_id)
#     db.session.add(session)
#     db.session.flush()
#     welcome_message = Message(
#         session_id=session.id,
#         role="assistant",
#         textMessage="Tell me what's on your mind?",
#     )
#     db.session.add(welcome_message)
#     db.session.commit()
#     chat = create_chat_with_id(session.id)
#     return session, chat

def create_chat_with_id(user_id):
    history = _build_gemini_history(user_id=user_id, limit=10)
    chat = createChat(history=history)
    return chat

def get_chat_history(user_id, limit=20, before_id=None):
    query = Message.query.filter_by(user_id=user_id)
    if before_id is not None:
        query = query.filter(Message.id < before_id)
    rows = (
        query.order_by(Message.id.desc())
        .limit(limit)
        .all()
    )
    messages = [
        {
            "id": m.id,
            "user_id": m.user_id,
            "role": m.role,
            "textMessage": m.textMessage,
            "emotionLabel": m.emotion_label,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        }
        for m in rows
    ]
    messages.reverse()
    has_more = len(rows) == limit
    next_before_id = rows[-1].id if rows else None
    return {
        "messages": messages,
        "has_more": has_more,
        "next_before_id": next_before_id,
    }

def statistic_analysis(statistics):
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction="""
                You are a mental health chatbot please write a short
                analysis given the statistics and trends of the user
                data. And provide any advice or solutions to help the
                user feel their best.
                """,
        ),
    )
    prompt = (
        f"Statistics: {statistics}"
    )
    try:
        response = chat.send_message(prompt)
        text = _extract_gemini_text(response).strip()
        if text:
            return text
    except Exception:
        pass
    return f"You seem. Try one small calming activity and check in with yourself again soon."