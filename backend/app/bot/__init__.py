"""Shared AsyncTeleBot cache keyed by decrypted token.

Using one bot instance per token avoids spawning a new aiohttp.ClientSession
on every node execution. The cache is process-local; number of entries is
bounded by the number of active bots on this worker.
"""
import telebot.async_telebot as _telebot

_bots: dict[str, _telebot.AsyncTeleBot] = {}


def get_bot(token: str) -> _telebot.AsyncTeleBot:
    if token not in _bots:
        _bots[token] = _telebot.AsyncTeleBot(token)
    return _bots[token]
