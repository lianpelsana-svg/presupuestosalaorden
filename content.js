// --- CONFIGURACIÓN UNIVERSAL DE SITIOS ---
const SITES_DB = {
    // MercadoLibre (Funciona para Argentina, México, Brasil, etc.)
    'mercadolibre': {
        name: "MercadoLibre",
        product: 'li.ui-search-layout__item, div.poly-card',
        price: '.price-tag-fraction, .andes-money-amount__fraction'
    },
    // Amazon (Global)
    'amazon': {
        name: "Amazon",
        product: 'div[data-component-type="s-search-result"], .sg-col-inner',
        price: '.a-price-whole, .a-offscreen'
    },
    // eBay
    'ebay': {
        name: "eBay",
        product: 'li.s-item',
        price: '.s-item__price'
    },
    // AliExpress
    'aliexpress': {
        name: "AliExpress",
        product: '.list-item, .product-card',
        price: '.price-current, .current-price'
    },
    // Tiendas Argentinas (Específicas)
    'coto': {
        name: "Coto",
        product: '.product-item, .productWrapper',
        price: '.price, span[itemprop="price"]'
    },
    'fravega': {
        name: "Frávega",
        product: '.product-card',
        price: '.price-tag-fraction'
    },
    'garbarino': {
        name: "Garbarino",
        product: '.product-item',
        price: '.price'
    }
};

// --- LÓGICA PRINCIPAL ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "iniciar_filtrado") {
        const resultado = procesarSitio(request.presupuesto);
        sendResponse({ status: resultado });
    }
});

function procesarSitio(presupuesto) {
    const hostname = window.location.hostname;
    let config = null;
    let detectedCurrency = '$'; // Default

    // 1. Detectar Configuración del Sitio
    for (const key in SITES_DB) {
        if (hostname.includes(key)) {
            config = SITES_DB[key];
            break;
        }
    }

    // Modo Genérico si no está en la lista
    if (!config) {
        console.log("Super Tool: Sitio desconocido. Modo Genérico.");
        config = {
            name: "Generic Site",
            product: 'div.product, div.item, li.product, article, div[data-price]',
            price: '.price, span[class*="price"], div[class*="price"]'
        };
    }

    // 2. Ejecutar Filtrado
    const items = document.querySelectorAll(config.product);
    if (items.length === 0) return "No products found. Try reloading.";

    let countOk = 0;
    let countNo = 0;

    items.forEach(item => {
        const priceEl = item.querySelector(config.price);
        if (priceEl) {
            // DETECTOR DE MONEDA: Tomamos el símbolo del primer precio encontrado
            if (detectedCurrency === '$' && priceEl.textContent) {
                const match = priceEl.textContent.match(/[^0-9.,\s]/); // Busca primer símbolo no numérico
                if (match) detectedCurrency = match[0];
            }

            const priceValue = parsearPrecioUniversal(priceEl.textContent);

            if (priceValue !== null) {
                if (priceValue <= presupuesto) {
                    countOk++;
                    resaltarProducto(item);
                } else {
                    countNo++;
                    ocultarProducto(item);
                }
            }
        }
    });

    mostrarDashboard(presupuesto, countOk, countNo, detectedCurrency);
    return `${countOk} products found`;
}

// --- FUNCIONES AUXILIARES ---

function parsearPrecioUniversal(texto) {
    // Limpia espacios y caracteres raros
    let limpio = texto.trim();
    
    // Caso 1: Formato 1.000,50 (Europa/Latam) o 1,000.50 (USA)
    // Estrategia simple: Quitamos todo lo que no sea numero, coma o punto.
    // Luego decidimos si el ultimo separador es decimal.
    
    // Eliminamos símbolos de moneda ($, €, R$, etc)
    limpio = limpio.replace(/[^0-9.,]/g, '');

    if (!limpio) return null;

    // Si tiene ambos separadores, determinamos cuál es el decimal
    const tienePunto = limpio.lastIndexOf('.') !== -1;
    const tieneComa = limpio.lastIndexOf(',') !== -1;

    if (tienePunto && tieneComa) {
        // Si el punto está después de la coma: 1.000,50 -> Europeo
        if (limpio.lastIndexOf('.') > limpio.lastIndexOf(',')) {
            // Formato USA: 1,000.50 -> Quitamos comas, punto es decimal
            limpio = limpio.replace(/,/g, '');
        } else {
            // Formato EU: 1.000,50 -> Quitamos puntos, coma es decimal
            limpio = limpio.replace(/\./g, '').replace(',', '.');
        }
    } else if (tieneComa && !tienePunto) {
        // Puede ser 1000,50 (decimal) o 1,000 (miles). 
        // Asumiremos que si tiene 2 decimales al final es decimal.
        const parts = limpio.split(',');
        if (parts.length > 1 && parts[1].length <= 2) {
             limpio = limpio.replace(',', '.');
        } else {
             limpio = limpio.replace(',', ''); // Es separador de miles
        }
    } else if (tienePunto && !tieneComa) {
        // Puede ser 1000.50 (decimal) o 1.000 (miles - sin coma).
        // Lógica similar
        const parts = limpio.split('.');
        if (parts.length > 1 && parts[1].length > 2) {
            // Probablemente separador de miles (ej: 12.000)
            limpio = limpio.replace(/\./g, '');
        }
        // Si tiene 2 decimales, dejamos el punto (formato USA)
    }
    
    // Quitamos cualquier coma o punto restante que sea de miles (seguridad extra para enteros grandes)
    // Nota: Esto es arriesgado. La forma más segura para enteros es:
    const soloNumeros = limpio.replace(/[^0-9]/g, '');
    
    // Para esta app de presupuestos, trabajaremos con ENTEROS principalmente.
    // Si el presupuesto es 1500 y el precio es 1500.50, probablemente no entre.
    // Convertimos a entero redondeado.
    
    const numeroFinal = parseInt(soloNumeros);
    return isNaN(numeroFinal) ? null : numeroFinal;
}

function resaltarProducto(item) {
    item.style.opacity = "1";
    item.style.display = "";
    item.style.border = "2px solid #10b981";
    item.style.backgroundColor = "#ecfdf5";
    
    // Badge
    if (!item.querySelector('.super-tool-badge')) {
        const badge = document.createElement('div');
        badge.className = 'super-tool-badge';
        badge.innerText = "✅ OK";
        badge.style.cssText = "position:absolute; top:5px; right:5px; background:#10b981; color:white; padding:2px 6px; font-size:10px; border-radius:3px; z-index:9999; font-family:sans-serif;";
        if (window.getComputedStyle(item).position === 'static') item.style.position = 'relative';
        item.appendChild(badge);
    }
}

function ocultarProducto(item) {
    item.style.opacity = "0.2";
    item.style.border = "none";
    item.style.backgroundColor = "";
}

function mostrarDashboard(presupuesto, ok, no, currency) {
    const old = document.getElementById('super-tool-dashboard');
    if (old) old.remove();

    const dash = document.createElement('div');
    dash.id = 'super-tool-dashboard';
    // Usamos la moneda detectada
    dash.innerHTML = `
        <div style="font-weight:bold; margin-bottom:8px;">🛒 Budget Active</div>
        <div>Limit: <b>${currency}${presupuesto.toLocaleString()}</b></div>
        <div style="color:green; margin-top:5px;">Affordable: <b>${ok}</b></div>
        <div style="color:red; opacity:0.8;">Too expensive: <b>${no}</b></div>
        <div style="font-size:9px; margin-top:8px; cursor:pointer; color:#666;" id="close-dash">Click to reset</div>
    `;

    dash.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: white; padding: 15px; border-radius: 8px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 999999;
        font-family: sans-serif; font-size: 13px;
        border: 1px solid #ccc;
    `;

    document.body.appendChild(dash);
    document.getElementById('close-dash').addEventListener('click', () => location.reload());
}
