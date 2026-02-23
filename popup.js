document.getElementById('btn-filtrar').addEventListener('click', () => {
    const presupuesto = parseFloat(document.getElementById('presupuesto').value);
    
    if (!presupuesto) {
        document.getElementById('status').innerText = "⚠️ Enter a valid amount.";
        document.getElementById('status').style.color = "orange";
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: "iniciar_filtrado", 
            presupuesto: presupuesto 
        }, (response) => {
            if (chrome.runtime.lastError) {
                document.getElementById('status').innerText = "❌ Error: Reload page (F5).";
                document.getElementById('status').style.color = "red";
            } else if (response && response.status) {
                document.getElementById('status').innerText = "✅ " + response.status;
                document.getElementById('status').style.color = "green";
                setTimeout(() => window.close(), 800);
            }
        });
    });
});
