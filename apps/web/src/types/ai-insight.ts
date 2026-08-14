export interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  content: string;
  timestamp: string;
  metrics?: {
    label: string;
    value: string;
    trend?: string;
  }[];
}
