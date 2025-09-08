export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body || '{}');

    // Prompt ottimizzato con esempio
    const systemPrompt = `
Sei un assistente che traduce comandi vocali italiani in JSON.
Rispondi ESATTAMENTE con questo formato, senza parole extra:
{
  "azione": "add|edit|delete|check",
  "elemento": "...",
  "categoria": "...",
  "nuovoElemento": "..."
}

Esempio:
Comando: "aggiungi mele alla categoria frutta"
Risposta JSON: {"azione":"add","elemento":"mele","categoria":"frutta","nuovoElemento":""}

Ora traduci questo comando in JSON:
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

    // Pulizia di caratteri strani / newline
    gptText = gptText.trim().replace(/\n/g, '');

    let parsed;
    try {
      parsed = JSON.parse(gptText);

      // Se manca azione o elemento, fallback
      if (!parsed.azione || !parsed.elemento) {
        parsed = { azione: "none", elemento: "", categoria: "", nuovoElemento: "" };
      }
    } catch (err) {
      // fallback sicuro
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