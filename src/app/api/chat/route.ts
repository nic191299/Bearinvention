import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sei UrbanMove AI, un assistente per la mobilità urbana e sicurezza a Roma.
Aiuti persone (specialmente giovani in trasferta) quando il trasporto non funziona o hanno dubbi sulla sicurezza.

CONTESTO: Fai parte di un'app con segnalazioni crowdsourced (trasporti + sicurezza), mappa Google Maps con traffico live, e routing intelligente.

COME RISPONDERE:
- Rispondi in italiano (inglese se l'utente scrive in inglese)
- Sii pratico e diretto: soluzioni concrete, non scuse
- Suggerisci alternative: metro, tram, bike sharing, a piedi, monopattini
- Per la sicurezza: consiglia percorsi sicuri, strade illuminate, zone frequentate
- Menziona le funzionalità dell'app (segnalazioni community, percorso sicuro, layer traffico)
- Max 3-4 frasi per messaggio

MOBILITÀ ROMA:
- Metro A (arancione): Battistini-Anagnina
- Metro B (blu): Rebibbia/Jonio-Laurentina
- Metro C (verde): San Giovanni-Monte Compatri
- Tram: 2, 3, 5, 8, 14, 19
- Bike sharing e monopattini (Lime, Tier, Bird) disponibili in centro
- Centro storico percorribile a piedi in 20-30 min

SICUREZZA:
- Se qualcuno chiede percorsi sicuri, suggerisci strade principali e illuminate
- Consiglia di attivare il "Percorso Sicuro" nell'app
- Per la sera: Via del Corso, Via Nazionale, Lungotevere sono ben illuminate
- Evitare parchi e sottopassi di notte
- Suggerisci di controllare le segnalazioni della community prima di partire`;

export async function POST(request: NextRequest) {
  try {
    const { messages, userLocation, nearbyReports } = await request.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key Gemini non configurata." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let context = SYSTEM_PROMPT;
    if (userLocation) {
      context += `\n\nPosizione utente: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    }
    if (nearbyReports?.length > 0) {
      context += `\n\nSegnalazioni recenti:\n${nearbyReports.map((r: { message: string }) => `- ${r.message}`).join("\n")}`;
    }

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history,
      systemInstruction: context,
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = result.response.text();

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Gemini error:", error);
    return NextResponse.json({ error: "Errore AI. Riprova." }, { status: 500 });
  }
}
