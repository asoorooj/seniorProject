import os
import uuid

from google.genai import types
from google import genai


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_CHAT_STORE = {}

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
            max_output_tokens=200
        ),
    )
    return chat


def create_chat_with_id():
    chat = createChat()
    chat_id = str(uuid.uuid4())
    _CHAT_STORE[chat_id] = chat
    return chat_id, chat


def get_chat(chat_id):
    return _CHAT_STORE.get(chat_id)
