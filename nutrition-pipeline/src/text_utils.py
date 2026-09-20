"""Normalización de texto: nombres de búsqueda y detección de estado del
alimento (crudo/cocido/...) por palabras clave en el propio nombre.

La detección de estado es una heurística sobre el nombre existente, no un
dato inventado: si el nombre no da pistas, el estado se deja vacío.
"""
import re
import unicodedata


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn")


def normalize_search_text(value: str) -> str:
    """minúsculas, sin tildes, sin puntuación, espacios simples."""
    if not value:
        return ""
    text = strip_accents(str(value)).lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(value: str) -> list[str]:
    normalized = normalize_search_text(value)
    if not normalized:
        return []
    return [t for t in normalized.split(" ") if len(t) > 1]


def detect_state(name: str, state_keywords: dict[str, list[str]]) -> str | None:
    """Coincidencia por palabra completa (con límites de palabra), para que
    "asado" no encuentre falsos positivos dentro de "pasado por agua"."""
    normalized = normalize_search_text(name)
    if not normalized:
        return None
    for state, keywords in state_keywords.items():
        for kw in keywords:
            kw_normalized = normalize_search_text(kw)
            if kw_normalized and re.search(rf"\b{re.escape(kw_normalized)}\b", normalized):
                return state
    return None


def build_search_tokens(*names: str) -> str:
    tokens: list[str] = []
    for name in names:
        for t in tokenize(name):
            if t not in tokens:
                tokens.append(t)
    return " ".join(tokens)
