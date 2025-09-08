import fetch from 'node-fetch';

exports.handler = async function(event, context) {
  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Testo mancante' })
      };
    }

    // Chiamata a OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "Sei un assistente che traduce comandi vocali italiani in JSON azione-elemento-categoria. Rispondi SOLO con JSON valido." },
          { role: "user", content: text }
        ],
        temperature: 0
      })
    });

    const data = await response.json();
    const gptText = data.choices?.[0]?.message?.content || '';

    // Proviamo a fare il parse, ma se fallisce restituiamo testo raw
    let parsed = null;
    try {
      parsed = JSON.parse(gptText);
    } catch (err) {
      console.warn('Parsing JSON fallito, invio testo raw al frontend');
      parsed = { raw: gptText };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};