import os
import uuid

from google.genai import types
from google import genai

from app.extensions import db
from app.models.db_models import Message, Session


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

def quickEval(determined_label, emotions_array):
    chat = client.chats.create(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            # system_instruction="You are a helpful mental health tool, trying to provide advice without taking the role of a trained professional."
            system_instruction="""
                Give a short, empathetic message given the users determined emotion and emotion readings.
                """,
            # max_output_tokens=200
        ),
    )
    prompt = (
        f"Determined label: {determined_label}\n"
        f"Emotion readings: {emotions_array}\n\n"
        "Write 1-2 sentences acknowledging the reading and gently checking in."
    )
    response = chat.send_message(prompt)
    return _extract_gemini_text(response)

def createChat():
    chat = client.chats.create(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            # system_instruction="You are a helpful mental health tool, trying to provide advice without taking the role of a trained professional."
            system_instruction="""You are a helpful mental health chatbot, 
                trying to provide advice without taking the role of a trained professional. 
                You want to help users get a better insight on their own emotions. 
                If any topic ever becomes extremely serious that may best be handled by a trained professional, please cease giving professional advice, and instruct user to refer to online and local resources for professional assistance.
                You are a chat-bot, so keep your responses concise but informative.
                """,
            # max_output_tokens=200
        ),
    )
    return chat


def create_chat_session_with_id(user_id):
    chat = createChat()
    session = Session(user_id=user_id)
    db.session.add(session)
    db.session.flush()
    welcome_message = Message(
        session_id=session.id,
        role="assistant",
        textMessage="Tell me what's on your mind?",
    )
    db.session.add(welcome_message)
    db.session.commit()
    session_id = str(session.id)
    return session_id, chat

def create_chat_with_id(session_id):
    chat = createChat()
    return chat

def get_chat_history(session_id, limit=20, before_id=None):
    query = Message.query.filter_by(session_id=session_id)
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
            "session_id": m.session_id,
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
