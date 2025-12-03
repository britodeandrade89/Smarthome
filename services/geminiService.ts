import { GoogleGenAI, Modality } from "@google/genai";
import { addReminderToDB } from "./firebase";

const ai = new GoogleGenAI({ apiKey: "gen-lang-client-0108694645" });

// --- CHEF ASSISTANT ---
export const getChefSuggestion = async (userInput: string): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Você é um chef de cozinha assistente num smart display. 
      Responda em Português do Brasil. 
      Seja conciso, criativo e amigável.
      Use formatação Markdown simples se necessário.
      O usuário disse/perguntou: "${userInput}"`,
    });

    return response.text || "Desculpe, não consegui pensar em nada agora.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Houve um erro ao contactar o Chef IA. Verifique sua conexão ou a chave API.";
  }
};

// --- VOICE ASSISTANT & TOOLS ---

// Tool Definition for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "add_reminder",
        description: "Adiciona um novo lembrete à lista do usuário quando ele solicita.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: {
              type: "STRING",
              description: "O conteúdo do lembrete (ex: 'Comprar leite', 'Ir ao dentista')."
            },
            priority: {
              type: "STRING",
              description: "A prioridade ou tipo. Se for urgente, use 'alert'. Se for uma tarefa, use 'action'. Caso contrário 'info'.",
              enum: ["alert", "action", "info"]
            }
          },
          required: ["text"]
        }
      }
    ]
  }
];

export interface VoiceResponse {
  text: string;
  audioData?: string; // Base64 audio
}

export const processVoiceCommand = async (userAudioTranscript: string): Promise<VoiceResponse> => {
  try {
    // 1. Process Text and Check for Tools
    const chatModel = 'gemini-2.5-flash';
    
    const result = await ai.models.generateContent({
      model: chatModel,
      contents: userAudioTranscript,
      config: {
        tools: tools,
        systemInstruction: `Você é o "Smart Home", um assistente doméstico inteligente, educado e prestativo.
        Seu nome é Smart Home.
        Você tem uma personalidade masculina, calma e eficiente.
        Responda sempre em Português do Brasil de forma concisa e natural.
        
        INSTRUÇÕES ESPECÍFICAS:
        - Se o usuário disser "Ok Google" ou "Olá Google", responda normalmente, mas lembre-se que você é o Smart Home.
        - Se o usuário pedir para adicionar um lembrete, USE a ferramenta 'add_reminder'.
        - Mantenha um tom de voz calmo e prestativo.`
      }
    });

    let finalText = result.text || "";
    const toolCalls = result.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);

    // 2. Execute Tools if present
    if (toolCalls && toolCalls.length > 0) {
      for (const part of toolCalls) {
        if (part.functionCall) {
          const { name, args } = part.functionCall;
          if (name === 'add_reminder') {
            const text = args['text'] as string;
            const type = (args['priority'] as 'alert' | 'action' | 'info') || 'info';
            
            await addReminderToDB(text, type);
            finalText = `Entendido. Adicionei "${text}" aos seus lembretes.`;
          }
        }
      }
    }

    if (!finalText) finalText = "Desculpe, não entendi o comando.";

    // 3. Generate Audio for the response (TTS)
    // We use a separate call to the TTS model to voice the final text
    const ttsModel = 'gemini-2.5-flash-preview-tts';
    const audioResponse = await ai.models.generateContent({
      model: ttsModel,
      contents: { parts: [{ text: finalText }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Male voice (Deep/Calm)
          }
        }
      }
    });

    const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    return {
      text: finalText,
      audioData: audioData
    };

  } catch (error) {
    console.error("Assistant Error:", error);
    return { text: "Erro ao processar comando." };
  }
};