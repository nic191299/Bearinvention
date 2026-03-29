import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sei UrbanMove AI, un assistente per la mobilità urbana a Roma.
Il tuo scopo è aiutare persone (specialmente giovani in trasferta) quando il trasporto pubblico non funziona.

CONTESTO: Sei parte di un'app che combina segnalazioni crowdsourced dalla community con suggerimenti AI.
L'utente è probabilmente bloccato a una fermata e il suo mezzo non arriva.

COME RISPONDERE:
- Rispondi sempre in italiano (a meno che l'utente scriva in inglese)
- Sii pratico e diretto: l'utente ha bisogno di soluzioni, non di scuse
- Suggerisci alternative concrete: percorsi a piedi, metro, bike sharing, monopattini
- Se conosci la zona di Roma, dai indicazioni specifiche
- Menziona che può controllare le segnalazioni della community nell'app
- Mantieni un tono amichevole ma efficiente
- Risposte concise (max 3-4 frasi per messaggio)

ALTERNATIVE TIPICHE A ROMA:
- Metro A (arancione): Battistini-Anagnina
- Metro B (blu): Rebibbia/Jonio-Laurentina
- Metro C (verde): San Giovanni-Monte Compatri
- Bike sharing disponibili in centro
- Monopattini elettrici (Lime, Tier, Bird)
- A piedi: il centro storico è percorribile in 20-30 min
- Tram: linee 2, 3, 5, 8, 14, 19

Se l'utente indica la sua posizione e destinazione, calcola mentalmente la migliore alternativa.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, userLocation, nearbyReports } = await request.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key non configurata. Aggiungi GOOGLE_GEMINI_API_KEY nelle variabili d'ambiente." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build context with location and reports
    let contextParts = [SYSTEM_PROMPT];
    if (userLocation) {
      contextParts.push(`\nPosizione utente: lat ${userLocation.lat}, lng ${userLocation.lng}`);
    }
    if (nearbyReports && nearbyReports.length > 0) {
      contextParts.push(`\nSegnalazioni community recenti:\n${nearbyReports.map((r: { message: string }) => `- ${r.message}`).join("\n")}`);
    }

    // Build chat history
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Ciao, sono il sistema. Ecco le tue istruzioni:" }] },
        { role: "model", parts: [{ text: "Ho capito le istruzioni. Sono pronto ad aiutare!" }] },
        ...history,
      ],
      systemInstruction: contextParts.join("\n"),
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = result.response.text();

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: "Errore nella comunicazione con l'AI. Riprova tra poco." },
      { status: 500 }
    );
  }
}
