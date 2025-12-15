import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Send, TrendingUp, PiggyBank, Target, Lightbulb } from "lucide-react";

const suggestedPrompts = [
  {
    icon: TrendingUp,
    text: "Analyse mes performances des 6 derniers mois et donne-moi 3 recommandations.",
  },
  {
    icon: PiggyBank,
    text: "Comment puis-je réduire mes dépenses tout en maintenant la qualité de service ?",
  },
  {
    icon: Target,
    text: "Quels types de prestations sont les plus rentables pour moi ?",
  },
  {
    icon: Lightbulb,
    text: "Propose-moi une stratégie pour augmenter mon chiffre d'affaires de 20%.",
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Assistant() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant stratégique IA. J'analyse les performances de votre entreprise pour vous proposer des recommandations concrètes. Je n'ai pas accès aux données personnelles de vos clients, uniquement aux métriques agrégées (revenus, dépenses, activités). Comment puis-je vous aider à améliorer votre rentabilité ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), { role: 'user', content: userMessage }]
              .map(m => ({ role: m.role, content: m.content }))
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error("Error calling AI:", error);
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      toast.error(errorMessage);
      
      // Remove empty assistant message if error
      if (assistantContent === "") {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const renderMessageContent = (content: string) => {
    // Parse markdown-like formatting
    return content.split('\n').map((line, lineIndex) => {
      // Handle headers
      if (line.startsWith('## ')) {
        return <h3 key={lineIndex} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith('### ')) {
        return <h4 key={lineIndex} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
      }
      
      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const bulletContent = line.slice(2);
        return (
          <div key={lineIndex} className="flex items-start gap-2 my-0.5">
            <span className="text-primary">•</span>
            <span>{renderInlineFormatting(bulletContent)}</span>
          </div>
        );
      }
      
      // Handle numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
      if (numberedMatch) {
        return (
          <div key={lineIndex} className="flex items-start gap-2 my-0.5">
            <span className="text-primary font-medium">{numberedMatch[1]}.</span>
            <span>{renderInlineFormatting(numberedMatch[2])}</span>
          </div>
        );
      }

      // Regular paragraph
      if (line.trim()) {
        return <p key={lineIndex} className="my-1">{renderInlineFormatting(line)}</p>;
      }
      
      return <br key={lineIndex} />;
    });
  };

  const renderInlineFormatting = (text: string) => {
    // Handle **bold** text
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-up">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Assistant Stratégique IA</h1>
              <p className="text-muted-foreground">Analysez vos performances et obtenez des recommandations</p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <GlassCard className="flex-1 flex flex-col overflow-hidden p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="text-sm">
                    {message.role === 'assistant' 
                      ? renderMessageContent(message.content)
                      : message.content
                    }
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested prompts */}
          {messages.length <= 1 && (
            <div className="px-6 pb-4">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Suggestions</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt.text)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-left transition-colors group"
                  >
                    <prompt.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question stratégique..."
                className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                disabled={isLoading}
              />
              <GlassButton
                type="submit"
                variant="primary"
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
