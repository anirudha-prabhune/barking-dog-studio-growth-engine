from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime, timezone
import json


class BaseAgent(ABC):
    """
    Foundational abstraction for future intelligence agents in the Barking Dog Growth Engine.
    
    Subclasses in later passes:
    - DiscoveryAgent (Pass 2+)
    - WebsiteAuditAgent (Pass 2)
    - SignalAgent (Pass 3)
    - ResearchAgent (Pass 3)
    - QualificationAgent (Pass 4)
    - CaseStudyAgent (Pass 4)
    """

    agent_name: str
    version: str = "1.0.0"

    def __init__(self, agent_name: Optional[str] = None):
        if agent_name:
            self.agent_name = agent_name

    @abstractmethod
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute agent intelligence workflow.
        Returns a structured dictionary matching the agent's output schema.
        """
        raise NotImplementedError("Agent implementations will be introduced in subsequent development passes.")

    def serialize_result(self, result: Dict[str, Any]) -> str:
        return json.dumps(result, default=str)
