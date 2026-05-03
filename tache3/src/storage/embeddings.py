"""
Embeddings module — Ollama removed.
Classification is now handled exclusively by Claude LLM (no local model needed).
This module keeps the same public interface for backward compatibility.
"""


def generate_embedding(text: str) -> list[float]:
    """Disabled — classification is LLM-only now. Returns empty list."""
    return []


async def generate_embedding_async(text: str) -> list[float]:
    """Disabled — classification is LLM-only now. Returns empty list."""
    return []


def build_company_text(
    name: str,
    country: str = "",
    sector: str = "",
    certifs: list[str] | None = None,
) -> str:
    certifs = certifs or []
    parts = [name, "entreprise", country]
    if sector:
        parts.append(f"secteur {sector}")
    if certifs:
        parts.append(f"certifications {' '.join(certifs)}")
    return " ".join(p for p in parts if p)
