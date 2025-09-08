export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body || '{}');

    // Prompt ottimizzato per OpenAI
    const systemPrompt = `
Sei un assistente che traduce comandi vocali italiani in JSON. 
Rispondi **solo** con JSON valido, senza testo extra, senza spiegazioni.
Il JSON deve sempre avere queste proprietà: 
{
  "azione": "add|edit|delete|check|none",
  "elemento": "...",
  "categoria": "...",
  "nuovoElemento": "..."
}
Regole:
- "add" = aggiungere elemento
- "edit" = modificare elemento
- "delete" = eliminare elemento
- "check" = segnare elemento completato/non completato
- "none" = nessuna azione valida rilevata
- Se il comando non è chiaro o mancano informazioni, usa "" per i campi vuoti e azione "none"
- Sempre minuscolo
- Esempio: input: "aggiungi banane alla categoria cipolle" → 
{"azione":"add","elemento":"banane","categoria":"cipolle","nuovoElemento":""}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    let gptText = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(gptText);
      if (!parsed.azione || !parsed.elemento) {
        parsed = { azione: "none", elemento: "", categoria: "", nuovoElemento: "" };
      }
    } catch (err) {
      parsed = { azione: "none", elemento: "", categoria: "", nuovoElemento: "" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ azione: "none", elemento: "", categoria: "", nuovoElemento: "" })
    };
  }
}