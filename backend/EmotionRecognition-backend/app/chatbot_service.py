import os
import uuid

from google.genai import types
from google import genai


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

_CHAT_STORE = {}

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
