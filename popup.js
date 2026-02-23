document.getElementById('btn-filtrar').addEventListener('click', () => {
    const presupuesto = parseFloat(document.getElementById('presupuesto').value);
    
    if (!presupuesto) {
        document.getElementById('status').innerText = "⚠️ Ingresa un monto válido.";
        document.getElementById('status').style.color = "orange";
        return;
    }

    // Enviamos el mensaje a la pestaña activa
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: "iniciar_filtrado", 
            presupuesto: presupuesto 
        }, (response) => {
            // Manejo de respuesta
            if (chrome.runtime.lastError) {
                document.getElementById('status').innerText = "❌ Error: Recarga la página (F5).";
                document.getElementById('status').style.color = "red";
            } else if (response && response.status) {
                document.getElementById('status').innerText = "✅ " + response.status;
                document.getElementById('status').style.color = "green";
                setTimeout(() => window.close(), 800);
            }
        });
    });
});
