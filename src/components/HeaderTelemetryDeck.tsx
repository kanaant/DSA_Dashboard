"use client";

import { useState } from "react";
import { McpTelemetryCard } from "./McpTelemetryCard";
import { AgentProfileCard } from "./AgentProfileCard";

interface HeaderTelemetryDeckProps {
  agentUrl: string;
  agentApiKey: string;
}

export function HeaderTelemetryDeck({ agentUrl, agentApiKey }: HeaderTelemetryDeckProps) {
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const toggleMcp = () => {
    setIsMcpOpen((prev) => !prev);
  };

  const toggleAgent = () => {
    setIsAgentOpen((prev) => !prev);
  };

  // Prevent popup cards from overlapping when both are open simultaneously
  // When ALONE: each aligns directly beneath its active circular trigger
  // When BOTH open: MCP popup smoothly slides to the left of the Agent popup (on screens with enough width)
  const bothOpen = isMcpOpen && isAgentOpen;

  const mcpPopupClass = `transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    bothOpen ? "sm:right-[228px] right-0" : "right-0"
  }`;

  const agentPopupClass = "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] right-0";

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
      <McpTelemetryCard 
        isOpen={isMcpOpen} 
        onToggle={toggleMcp} 
        popupClassName={mcpPopupClass}
      />
      <AgentProfileCard 
        agentUrl={agentUrl}
        agentApiKey={agentApiKey}
        isOpen={isAgentOpen}
        onToggle={toggleAgent}
        popupClassName={agentPopupClass}
      />
    </div>
  );
}
